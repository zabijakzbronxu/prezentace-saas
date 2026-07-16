import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { isUuid } from "@/lib/presentations/form";
import { formatAddress, formatPrice } from "@/lib/format";
import { isMissingSchemaError } from "@/lib/db-errors";
import { PHOTOS_BUCKET } from "@/lib/photos";
import { DOCUMENTS_BUCKET } from "@/lib/documents";
import { MEDIA_BUCKET } from "@/lib/media";
import { ownsPresentation } from "@/lib/presentations/otinska-sample";
import { designPath } from "@/lib/presentations/design";
import {
  DEFAULT_SECTION_SEEDS,
  isSectionKind,
  addableKinds,
  readAnalyticMapsContent,
  readPanoramaContent,
  readFloorplansContent,
  type SectionKind,
  type SectionMeta,
} from "@/lib/presentations/sections";
import { SchemaErrorScreen, QueryErrorScreen } from "../../../schema-error";
import type { GalleryImage } from "../../../listing/[slug]/gallery";
import { createSectionRenderer } from "../../../listing/[slug]/render";
import { addSection } from "../sections/actions";
import { SectionFrame } from "./section-frame";
import { InlineCaptions, type CaptionPhoto } from "./inline-captions";

// Vizuální edit-mode „na stránce" pro VLASTNÍKA prezentace. Renderuje prezentaci
// STEJNĚ jako veřejná stránka (sdílený `createSectionRenderer`), ale kolem sekcí
// přidá editační vrstvu: lišta u sekce (↑/↓, zap/vyp, Upravit, Odebrat), inline
// popisky fotek v galerii a „+ Přidat sekci". Přepínač Náhled ↔ Úpravy je nahoře.
//
// Přístup jen pro přihlášeného vlastníka (published prezentace je veřejně čitelná,
// takže vlastnictví ověřujeme explicitně přes owner_id). Anonym se sem nedostane a
// veřejná stránka `/listing/[slug]` zůstává bez jakéhokoli editačního prvku.

export const dynamic = "force-dynamic";

// Chyby z akcí sekcí chodí jako KÓD; texty drží tahle stránka (nešizovatelné URL).
const DESIGN_ERROR_TEXT: Record<string, string> = {
  "add-failed": "Přidání sekce se nepovedlo, zkus to znovu.",
  "move-failed": "Změna pořadí se nepovedla, zkus to znovu.",
  "toggle-failed": "Zapnutí/vypnutí sekce se nepovedlo, zkus to znovu.",
  "delete-failed": "Smazání sekce se nepovedlo, zkus to znovu.",
  singleton: "Tahle sekce už v prezentaci je — smí být jen jednou.",
  kind: "Tenhle typ sekce zatím přidat nejde.",
  schema:
    "Databáze není dorovnaná — spusť v Supabase → SQL Editor soubor app/supabase/APLIKUJ_VSE.sql.",
};

const PRESENTATION_COLUMNS =
  "id, owner_id, status, slug, title, subtitle, property_type, street, city, postal_code, price_czk, disposition, floor_area_m2, land_area_m2, built_area_m2, building_dimensions, year_built, floors, condition, ownership, monthly_costs_czk, energy_class, description, location_text, features_text, contact_name, contact_email, contact_phone, lat, lng";

export default async function DesignPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string; error?: string; saved?: string }>;
}) {
  const { id } = await params;
  const { mode, error, saved } = await searchParams;

  if (!isSupabaseConfigured()) redirect("/presentations");
  if (!isUuid(id)) redirect("/presentations");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: p, error: loadError } = await supabase
    .from("presentations")
    .select(PRESENTATION_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (loadError) {
    // Skutečná chyba dotazu se NESMÍ tvářit jako „prezentace nenalezena" (tichý
    // redirect). Schéma pozadu → návod, jiná chyba → hlasitá hláška (lesson M3).
    console.error("[design] načtení prezentace selhalo:", loadError.message);
    if (isMissingSchemaError(loadError)) return <SchemaErrorScreen detail={loadError.message} />;
    return <QueryErrorScreen detail={loadError.message} />;
  }
  // Vlastnictví: published prezentace je veřejně čitelná → sám SELECT nestačí.
  // (Neexistující řádek i cizí prezentace → tichý redirect, ať neprozradíme existenci.)
  if (!p || !ownsPresentation(p.owner_id, user.id)) {
    redirect("/presentations");
  }

  const isDraft = p.status !== "published";
  const previewMode = mode === "preview";
  const returnTo = designPath(p.id);

  // --- SEKCE (vlastník vidí i vypnuté; RLS `sections owner all`). ---
  const { data: sectionsData, error: sectionsError } = await supabase
    .from("presentation_sections")
    .select("id, kind, position, enabled, content")
    .eq("presentation_id", p.id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (sectionsError) {
    console.error("[design] načtení sekcí selhalo:", sectionsError.message);
    if (isMissingSchemaError(sectionsError)) return <SchemaErrorScreen detail={sectionsError.message} />;
    return <QueryErrorScreen detail={sectionsError.message} />;
  }
  const sectionRows = (sectionsData ?? [])
    .filter((r) => isSectionKind(r.kind))
    .map((r) => ({
      id: r.id,
      kind: r.kind as SectionKind,
      enabled: Boolean(r.enabled),
      content: r.content as unknown,
    }));

  // --- FOTKY ---
  const { data: photosData, error: photosError } = await supabase
    .from("presentation_photos")
    .select("id, storage_path, is_hero, sort_order, caption, category")
    .eq("presentation_id", p.id)
    .order("sort_order", { ascending: true });
  if (photosError) {
    console.error("[design] načtení fotek selhalo:", photosError.message);
    if (isMissingSchemaError(photosError)) return <SchemaErrorScreen detail={photosError.message} />;
    return <QueryErrorScreen detail={photosError.message} />;
  }
  const photos = photosData ?? [];

  // --- DOKUMENTY (načti, když existuje sekce dokumentů — i vypnutá, ať ji vlastník vidí) ---
  type DocRow = {
    id: string;
    name: string;
    category: string | null;
    storage_path: string;
    file_size_bytes: number | null;
    url?: string;
  };
  let documents: DocRow[] = [];
  if (sectionRows.some((s) => s.kind === "documents")) {
    const { data: docsData, error: docsError } = await supabase
      .from("presentation_documents")
      .select("id, name, category, storage_path, file_size_bytes, sort_order")
      .eq("presentation_id", p.id)
      .order("sort_order", { ascending: true });
    if (docsError) {
      console.error("[design] načtení dokumentů selhalo:", docsError.message);
      if (isMissingSchemaError(docsError)) return <SchemaErrorScreen detail={docsError.message} />;
      return <QueryErrorScreen detail={docsError.message} />;
    }
    documents = (docsData ?? []).map((d) => ({ ...d }));
  }

  // --- PODEPSANÉ ODKAZY (fotky + dokumenty + média sekcí) ---
  const signedTtlSeconds = 60 * 60;
  const signedUrls = new Map<string, string>();
  const photoPaths = photos.map((ph) => ph.storage_path);
  if (photoPaths.length > 0) {
    const { data: signed, error: signError } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .createSignedUrls(photoPaths, signedTtlSeconds);
    if (signError || !signed) console.error("[design] podpisy fotek selhaly:", signError?.message);
    else for (const it of signed) if (it.signedUrl && it.path) signedUrls.set(it.path, it.signedUrl);
  }
  if (documents.length > 0) {
    const { data: signedDocs, error: signDocsError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrls(documents.map((d) => d.storage_path), signedTtlSeconds);
    if (signDocsError) console.error("[design] podpisy dokumentů selhaly:", signDocsError.message);
    for (const it of signedDocs ?? []) if (it.signedUrl && it.path) signedUrls.set(it.path, it.signedUrl);
    documents = documents.map((d) => ({ ...d, url: signedUrls.get(d.storage_path) }));
  }
  // Obrázky sekcí (analytické mapy / panorama / půdorysy) — ze VŠECH sekcí, ať je
  // vlastník vidí i u vypnutých.
  const mediaPaths: string[] = [];
  for (const s of sectionRows) {
    if (s.kind === "analyticMaps") {
      for (const it of readAnalyticMapsContent(s.content).items) if (it.image_path) mediaPaths.push(it.image_path);
    } else if (s.kind === "panorama") {
      const ip = readPanoramaContent(s.content).image_path;
      if (ip) mediaPaths.push(ip);
    } else if (s.kind === "floorplans") {
      for (const f of readFloorplansContent(s.content).floors) {
        if (f.image_path) mediaPaths.push(f.image_path);
        for (const r of f.rooms) if (r.image_path) mediaPaths.push(r.image_path);
      }
    }
  }
  if (mediaPaths.length > 0) {
    const { data: signedMedia } = await supabase.storage
      .from(MEDIA_BUCKET)
      .createSignedUrls(mediaPaths, signedTtlSeconds);
    for (const it of signedMedia ?? []) if (it.signedUrl && it.path) signedUrls.set(it.path, it.signedUrl);
  }

  const heroPhoto = photos.find((ph) => ph.is_hero) ?? photos[0] ?? null;
  const heroUrl = heroPhoto ? signedUrls.get(heroPhoto.storage_path) : undefined;
  const galleryImages: GalleryImage[] = photos
    .filter((ph) => ph.id !== heroPhoto?.id)
    .map((ph) => ({ id: ph.id, url: signedUrls.get(ph.storage_path), caption: ph.caption ?? undefined }));
  const captionPhotos: CaptionPhoto[] = photos
    .filter((ph) => ph.id !== heroPhoto?.id)
    .map((ph) => ({ id: ph.id, url: signedUrls.get(ph.storage_path), caption: ph.caption ?? "" }));

  const displayTitle = p.title || formatAddress(p) || "Prezentace nemovitosti";
  const address = formatAddress(p);
  const hasContact = Boolean(p.contact_name || p.contact_email || p.contact_phone);

  const baseCtx = {
    p,
    heroUrl,
    displayTitle,
    address,
    hasContact,
    galleryImages,
    documents,
    signedUrls,
    photos,
  };

  const existingKinds = sectionRows.map((s) => s.kind);
  const toAdd = addableKinds(existingKinds);

  // ===================== NÁHLED (bez editačních prvků) =====================
  if (previewMode) {
    const renderSection = createSectionRenderer({ ...baseCtx, isPreview: isDraft });
    const previewOrdered =
      sectionRows.length === 0
        ? DEFAULT_SECTION_SEEDS.map((s, i) => ({ key: `seed-${i}`, kind: s.kind, content: s.content }))
        : sectionRows.filter((s) => s.enabled).map((s) => ({ key: s.id, kind: s.kind, content: s.content }));
    return (
      <main style={{ paddingBottom: "4rem" }}>
        <DesignTopBar presentationId={p.id} slug={p.slug} mode="preview" />
        {previewOrdered.map((section) => {
          const node = renderSection(section);
          return node ? <div key={section.key}>{node}</div> : null;
        })}
      </main>
    );
  }

  // ========================= REŽIM ÚPRAV =========================
  const renderSection = createSectionRenderer({ ...baseCtx, isPreview: true });
  return (
    <main style={{ paddingBottom: "5rem" }}>
      <DesignTopBar
        presentationId={p.id}
        slug={p.slug}
        mode="edit"
        title={displayTitle}
        price={formatPrice(p.price_czk)}
      />

      {error ? (
        <DesignBanner tone="error">
          {DESIGN_ERROR_TEXT[error] ?? "Něco se nepovedlo, zkus to prosím znovu."}
        </DesignBanner>
      ) : null}
      {saved ? <DesignBanner tone="ok">Uloženo. ✅</DesignBanner> : null}

      {sectionRows.length === 0 ? (
        <DesignBanner tone="info">
          Tahle prezentace zatím nemá sekce v databázi. Otevři{" "}
          <Link href={`/presentations/${p.id}/sections`} style={{ textDecoration: "underline", fontWeight: 700 }}>
            krok Sekce
          </Link>{" "}
          a přidej je (nebo naplň ukázkovým obsahem) — pak je půjde upravovat rovnou tady.
        </DesignBanner>
      ) : (
        sectionRows.map((section, index) => (
          <SectionFrame
            key={section.id}
            presentationId={p.id}
            returnTo={returnTo}
            section={{ id: section.id, kind: section.kind, enabled: section.enabled }}
            index={index}
            count={sectionRows.length}
          >
            {section.kind === "gallery" ? (
              <section style={{ background: "#faf9f7", padding: "clamp(2rem, 5vw, 3rem) 1.5rem" }}>
                <div style={{ maxWidth: "60rem", margin: "0 auto" }}>
                  <p style={{ color: "#646463", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                    Galerie — u každé fotky napiš popisek a ulož. (Nadpis galerie a kategorie fotek
                    upravíš přes tlačítko &bdquo;Upravit&ldquo;.)
                  </p>
                  <InlineCaptions presentationId={p.id} photos={captionPhotos} />
                </div>
              </section>
            ) : (
              renderSection({ key: section.id, kind: section.kind, content: section.content })
            )}
          </SectionFrame>
        ))
      )}

      {sectionRows.length > 0 ? (
        <div style={{ maxWidth: "60rem", margin: "1.5rem auto 0", padding: "0 1.5rem" }}>
          <AddSectionBar presentationId={p.id} returnTo={returnTo} toAdd={toAdd} />
        </div>
      ) : null}
    </main>
  );
}

// --------------------------------------------------------------------------
//  Drobné prezentační kousky edit-modu (jen tady; render sekcí je sdílený)
// --------------------------------------------------------------------------

function DesignTopBar({
  presentationId,
  slug,
  mode,
  title,
  price,
}: {
  presentationId: string;
  slug: string;
  mode: "edit" | "preview";
  title?: string;
  price?: string;
}) {
  const bar: React.CSSProperties = {
    position: "sticky",
    top: 0,
    zIndex: 50,
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    flexWrap: "wrap",
    background: "#0b1120",
    color: "#f8fafc",
    padding: "0.55rem 1rem",
    borderBottom: "1px solid #1e293b",
    minHeight: "2.6rem",
  };
  const link: React.CSSProperties = {
    color: "#f8fafc",
    textDecoration: "none",
    fontSize: "0.85rem",
    border: "1px solid rgba(255,255,255,0.25)",
    borderRadius: "999px",
    padding: "0.3rem 0.8rem",
    whiteSpace: "nowrap",
  };
  const primary: React.CSSProperties = {
    ...link,
    background: "#22d3ee",
    color: "#04263a",
    fontWeight: 700,
    border: "1px solid #22d3ee",
  };

  if (mode === "preview") {
    return (
      <div style={bar}>
        <strong style={{ fontSize: "0.9rem" }}>Náhled</strong>
        <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Takhle prezentaci uvidí návštěvník.</span>
        <div style={{ display: "flex", gap: "0.5rem", marginLeft: "auto", flexWrap: "wrap" }}>
          <Link href={`/presentations/${presentationId}/design`} style={primary}>
            ← Zpět do úprav
          </Link>
          <Link href={`/listing/${slug}`} target="_blank" style={link}>
            Veřejná stránka ↗
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={bar}>
      <strong style={{ fontSize: "0.9rem" }}>Režim úprav</strong>
      {title ? (
        <span
          style={{
            fontSize: "0.8rem",
            color: "#94a3b8",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "16rem",
          }}
        >
          {title}
          {price ? ` · ${price}` : ""}
        </span>
      ) : null}
      <div style={{ display: "flex", gap: "0.5rem", marginLeft: "auto", flexWrap: "wrap" }}>
        <Link href={`/presentations/${presentationId}/design?mode=preview`} style={primary}>
          Náhled
        </Link>
        <Link href={`/listing/${slug}`} target="_blank" style={link}>
          Veřejná stránka ↗
        </Link>
        <Link href={`/presentations/${presentationId}/sections`} style={link}>
          Seznam sekcí
        </Link>
        <Link href="/presentations" style={link}>
          Moje prezentace
        </Link>
      </div>
    </div>
  );
}

function DesignBanner({
  tone,
  children,
}: {
  tone: "error" | "ok" | "info";
  children: React.ReactNode;
}) {
  const palette = {
    error: { bg: "#fef2f2", border: "#fecaca", color: "#b91c1c" },
    ok: { bg: "#f0fdf4", border: "#bbf7d0", color: "#15803d" },
    info: { bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8" },
  }[tone];
  return (
    <div
      style={{
        maxWidth: "60rem",
        margin: "1rem auto 0",
        padding: "0.7rem 1rem",
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        color: palette.color,
        borderRadius: "10px",
        fontSize: "0.9rem",
      }}
    >
      {children}
    </div>
  );
}

function AddSectionBar({
  presentationId,
  returnTo,
  toAdd,
}: {
  presentationId: string;
  returnTo: string;
  toAdd: readonly SectionMeta[];
}) {
  if (toAdd.length === 0) {
    return (
      <p style={{ color: "#646463", fontSize: "0.9rem" }}>
        Všechny dostupné typy sekcí už v prezentaci máš.
      </p>
    );
  }
  return (
    <div style={{ borderTop: "1px solid #e7e5e4", paddingTop: "1.25rem" }}>
      <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.75rem", color: "#1c1917" }}>
        Přidat sekci
      </h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {toAdd.map((meta) => (
          <form action={addSection} key={meta.kind}>
            <input type="hidden" name="presentation_id" value={presentationId} />
            <input type="hidden" name="kind" value={meta.kind} />
            <input type="hidden" name="return_to" value={returnTo} />
            <button
              type="submit"
              title={meta.description}
              style={{
                padding: "0.5rem 0.85rem",
                borderRadius: "8px",
                border: "1px solid #d6d3d1",
                background: "#fff",
                color: "#1c1917",
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              + {meta.label}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
