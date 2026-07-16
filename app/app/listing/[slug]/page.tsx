import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { PHOTOS_BUCKET } from "@/lib/photos";
import { DOCUMENTS_BUCKET } from "@/lib/documents";
import { MEDIA_BUCKET } from "@/lib/media";
import { formatPrice, formatAddress } from "@/lib/format";
import { isMissingSchemaError } from "@/lib/db-errors";
import {
  DEFAULT_SECTION_SEEDS,
  isSectionKind,
  readAnalyticMapsContent,
  readPanoramaContent,
  readFloorplansContent,
  type SectionKind,
} from "@/lib/presentations/sections";
import { SchemaErrorScreen, QueryErrorScreen } from "../../schema-error";
import type { GalleryImage } from "./gallery";
import { StickyBar } from "./sticky-bar";
import { createSectionRenderer, INK, MUTED, BORDER, DISPLAY } from "./render";

// Veřejná stránka prezentace — světlá prezentační šablona (Playfair + Work Sans).
// Renderuje ZAPNUTÉ sekce v uloženém pořadí (ne natvrdo bloky). Sekce, které
// zatím neumíme vykreslit, se na publikované stránce PŘESKOČÍ (návštěvník nesmí
// vidět „přijde příště"); v náhledu vlastníka se ukáže vlídný placeholder.
//
// Samotný render sekcí žije ve sdíleném `./render` (createSectionRenderer) — stejný
// kód pohání i vlastnický vizuální edit-mode `/presentations/[id]/design`, takže obě
// stránky vypadají 1:1. Tady zůstává jen načtení dat a stránkový obal (hlavička,
// patička, sticky lišta).

export const dynamic = "force-dynamic";

type ListingParams = { slug: string };

const PRESENTATION_COLUMNS =
  "id, owner_id, status, slug, title, subtitle, property_type, street, city, postal_code, price_czk, disposition, floor_area_m2, land_area_m2, built_area_m2, building_dimensions, year_built, floors, condition, ownership, monthly_costs_czk, energy_class, description, location_text, features_text, contact_name, contact_email, contact_phone, lat, lng";

async function loadListing(slug: string) {
  const supabase = await createClient();
  const { data: p, error } = await supabase
    .from("presentations")
    .select(PRESENTATION_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) console.error("[listing] načtení selhalo:", error.message);
  return { supabase, presentation: p ?? null, loadError: error ?? null };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<ListingParams>;
}): Promise<Metadata> {
  if (!isSupabaseConfigured()) return { title: "Prodej si sám" };
  const { slug } = await params;
  const { supabase, presentation: p } = await loadListing(slug);
  if (!p) return { title: "Prezentace nenalezena · Prodej si sám" };

  const name = p.title || formatAddress(p) || "Prezentace nemovitosti";
  const description =
    [p.disposition, p.property_type, p.city, formatPrice(p.price_czk)]
      .filter(Boolean)
      .join(" · ") || undefined;

  // OG obrázek pro sdílení: hlavní fotka (privátní bucket → dlouhý podpis).
  let ogImage: string | undefined;
  const { data: hero } = await supabase
    .from("presentation_photos")
    .select("storage_path, is_hero, sort_order")
    .eq("presentation_id", p.id)
    .order("is_hero", { ascending: false })
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (hero?.storage_path) {
    const { data: signed } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .createSignedUrl(hero.storage_path, 60 * 60 * 24 * 7);
    ogImage = signed?.signedUrl;
  }

  return {
    title: `${name} · Prodej si sám`,
    description,
    openGraph: ogImage
      ? { title: name, description, images: [{ url: ogImage }] }
      : { title: name, description },
  };
}

export default async function ListingPage({
  params,
}: {
  params: Promise<ListingParams>;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", padding: "2rem", textAlign: "center" }}>
        <h1 style={{ fontFamily: DISPLAY, fontSize: "1.8rem", fontWeight: 600 }}>Prezentace nemovitosti</h1>
        <p style={{ color: MUTED }}>Zobrazení zatím není zapnuté (chybí napojení na Supabase).</p>
        <Link href="/" style={{ color: INK, textDecoration: "underline" }}>← zpět na úvod</Link>
      </main>
    );
  }

  const { slug } = await params;
  const { supabase, presentation: p, loadError } = await loadListing(slug);

  if (loadError && isMissingSchemaError(loadError)) {
    return <SchemaErrorScreen detail={loadError.message} backHref="/" backLabel="← zpět na úvod" />;
  }
  if (!p) notFound();

  const isPreview = p.status !== "published";

  // --- SEKCE: zapnuté, v pořadí. Když žádné (nebo chybí tabulka), dopočítej
  // výchozí pořadí za běhu — výkladní skříň se nikdy nerozbije. ---
  const { data: sectionsData, error: sectionsError } = await supabase
    .from("presentation_sections")
    .select("id, kind, position, enabled, content")
    .eq("presentation_id", p.id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  // Chybu dotazu odlišit od „prázdno": skutečná chyba se NESMÍ tvářit jako
  // „žádné sekce" (tichý fallback na výchozí rozvržení by v produkci vypadal
  // zeleně, i když dotaz selhal). Schéma pozadu → hláška „dorovnej DB",
  // jiná chyba → obecná hlasitá hláška.
  if (sectionsError) {
    console.error("[listing] načtení sekcí selhalo:", sectionsError.message);
    if (isMissingSchemaError(sectionsError)) {
      return <SchemaErrorScreen detail={sectionsError.message} backHref="/" backLabel="← zpět na úvod" />;
    }
    return <QueryErrorScreen detail={sectionsError.message} />;
  }

  type Ordered = { key: string; kind: SectionKind; content: unknown };
  const seeds: Ordered[] = DEFAULT_SECTION_SEEDS.map((s, i) => ({
    key: `seed-${i}`,
    kind: s.kind,
    content: s.content,
  }));
  const rows = sectionsData ?? [];
  // Úspěšný dotaz, ale prázdno (nová prezentace / backfill minul) → dopočet
  // výchozí sady. To je legitimní „prázdno", ne chyba.
  const ordered: Ordered[] =
    rows.length === 0
      ? seeds
      : rows
          .filter((r) => r.enabled && isSectionKind(r.kind))
          .map((r) => ({ key: r.id, kind: r.kind as SectionKind, content: r.content }));

  // --- FOTKY ---
  const { data: photosData, error: photosError } = await supabase
    .from("presentation_photos")
    .select("id, storage_path, is_hero, sort_order, caption, category")
    .eq("presentation_id", p.id)
    .order("sort_order", { ascending: true });
  // Skutečná chyba dotazu na fotky NESMÍ tiše zmizet (hero i galerie by prostě
  // chyběly a stránka by vypadala v pořádku). Rozlišit schéma vs. obecnou chybu.
  if (photosError) {
    console.error("[listing] načtení fotek selhalo:", photosError.message);
    if (isMissingSchemaError(photosError)) {
      return <SchemaErrorScreen detail={photosError.message} backHref="/" backLabel="← zpět na úvod" />;
    }
    return <QueryErrorScreen detail={photosError.message} />;
  }
  const photos = photosData ?? [];

  // --- DOKUMENTY (jen když je sekce zapnutá) ---
  type DocRow = { id: string; name: string; category: string | null; storage_path: string; file_size_bytes: number | null; url?: string };
  let documents: DocRow[] = [];
  if (ordered.some((s) => s.kind === "documents")) {
    const { data: docsData, error: docsError } = await supabase
      .from("presentation_documents")
      .select("id, name, category, storage_path, file_size_bytes, sort_order")
      .eq("presentation_id", p.id)
      .order("sort_order", { ascending: true });
    // Sekce dokumentů je zapnutá → chyba dotazu není „prázdno". Hlasitě.
    if (docsError) {
      console.error("[listing] načtení dokumentů selhalo:", docsError.message);
      if (isMissingSchemaError(docsError)) {
        return <SchemaErrorScreen detail={docsError.message} backHref="/" backLabel="← zpět na úvod" />;
      }
      return <QueryErrorScreen detail={docsError.message} />;
    }
    documents = (docsData ?? []).map((d) => ({ ...d }));
  }

  // --- PODEPSANÉ ODKAZY (fotky + dokumenty) ---
  const signedTtlSeconds = isPreview ? 5 * 60 : 60 * 60;
  const signedUrls = new Map<string, string>();
  const photoPaths = photos.map((ph) => ph.storage_path);
  if (photoPaths.length > 0) {
    const { data: signed, error: signError } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .createSignedUrls(photoPaths, signedTtlSeconds);
    if (signError || !signed) console.error("[listing] podpisy fotek selhaly:", signError?.message);
    else for (const it of signed) if (it.signedUrl && it.path) signedUrls.set(it.path, it.signedUrl);
  }
  if (documents.length > 0) {
    const { data: signedDocs, error: signDocsError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrls(documents.map((d) => d.storage_path), signedTtlSeconds);
    // Podpis dokumentů může selhat i přechodně; stránku kvůli tomu neshazujeme
    // (u dokumentu bez URL se prostě neukáže „Stáhnout"), ale chybu nahlas zalogujeme.
    if (signDocsError) console.error("[listing] podpisy dokumentů selhaly:", signDocsError.message);
    for (const it of signedDocs ?? []) if (it.signedUrl && it.path) signedUrls.set(it.path, it.signedUrl);
    documents = documents.map((d) => ({ ...d, url: signedUrls.get(d.storage_path) }));
  }

  // Obrázky sekcí kola 2/3 (media bucket): analytické mapy, panorama, půdorysy.
  const mediaPaths: string[] = [];
  for (const s of ordered) {
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

  const displayTitle = p.title || formatAddress(p) || "Prezentace nemovitosti";
  const address = formatAddress(p);
  const hasContact = Boolean(p.contact_name || p.contact_email || p.contact_phone);

  // Render sekcí je sdílený s edit-modem — stejný vzhled, jeden zdroj pravdy.
  const renderSection = createSectionRenderer({
    p,
    isPreview,
    heroUrl,
    displayTitle,
    address,
    hasContact,
    galleryImages,
    documents,
    signedUrls,
    photos,
  });

  return (
    <main style={{ paddingBottom: "5rem" }}>
      {isPreview ? (
        <div style={{ background: "#eff6ff", borderBottom: "1px solid #bfdbfe", color: "#1d4ed8", padding: "0.6rem 1rem", textAlign: "center", fontSize: "0.9rem" }}>
          Náhled konceptu — tuhle stránku vidíš jen ty. Zveřejní se až po zaplacení.{" "}
          <Link href={`/presentations/${p.id}/edit`} style={{ fontWeight: 700, textDecoration: "underline" }}>
            Zpět do editace
          </Link>
        </div>
      ) : null}

      {ordered.map((section) => {
        const node = renderSection(section);
        return node ? <div key={section.key}>{node}</div> : null;
      })}

      <footer
        style={{
          maxWidth: "60rem",
          margin: "0 auto",
          padding: "2rem 1.5rem 0",
          borderTop: `1px solid ${BORDER}`,
          display: "flex",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
          color: MUTED,
          fontSize: "0.85rem",
        }}
      >
        <span>Prodává majitel napřímo.</span>
        <Link href="/" style={{ color: MUTED }}>
          Vytvořeno v <strong style={{ color: INK }}>Prodej si sám</strong>
        </Link>
      </footer>

      <StickyBar title={displayTitle} price={formatPrice(p.price_czk)} phone={p.contact_phone} />
    </main>
  );
}
