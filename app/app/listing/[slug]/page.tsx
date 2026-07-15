import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { PHOTOS_BUCKET } from "@/lib/photos";
import { DOCUMENTS_BUCKET, formatFileSize } from "@/lib/documents";
import { MEDIA_BUCKET } from "@/lib/media";
import { formatPrice, formatArea, formatAddress } from "@/lib/format";
import { isMissingSchemaError } from "@/lib/db-errors";
import {
  DEFAULT_SECTION_SEEDS,
  isSectionKind,
  isReadyKind,
  readTextContent,
  readMapContent,
  readContactContent,
  readGalleryContent,
  readBenefitsContent,
  readValuationContent,
  readConditionContent,
  readPoiContent,
  readSocialContent,
  readNewsContent,
  readAnalyticMapsContent,
  readPanoramaContent,
  readFloorplansContent,
  readVideoContent,
  readInvestmentCalcContent,
  parseVideoUrl,
  safeExternalUrl,
  ENERGY_CLASSES,
  ENERGY_LABEL,
  ENERGY_COLOR,
  isEnergyClass,
  CONDITION_LABEL,
  type SectionKind,
} from "@/lib/presentations/sections";
import { SchemaErrorScreen, QueryErrorScreen } from "../../schema-error";
import { Gallery, type GalleryImage } from "./gallery";
import { StickyBar } from "./sticky-bar";
import { MapTabs, FloorplansView, InvestmentCalcView } from "./listing-sections";

// Veřejná stránka prezentace — světlá prezentační šablona (Playfair + Work Sans).
// Renderuje ZAPNUTÉ sekce v uloženém pořadí (ne natvrdo bloky). Sekce, které
// zatím neumíme vykreslit, se na publikované stránce PŘESKOČÍ (návštěvník nesmí
// vidět „přijde příště"); v náhledu vlastníka se ukáže vlídný placeholder.

export const dynamic = "force-dynamic";

const INK = "#1c1917";
const MUTED = "#646463";
const BORDER = "#e7e5e4";
const PAPER_ALT = "#faf9f7";
const DISPLAY = "var(--font-display), Georgia, serif";

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

const sectionTitle: React.CSSProperties = {
  fontFamily: DISPLAY,
  fontSize: "clamp(1.5rem, 3.5vw, 1.9rem)",
  fontWeight: 600,
  marginBottom: "1rem",
  color: INK,
};

const proseText: React.CSSProperties = {
  whiteSpace: "pre-line",
  lineHeight: 1.8,
  color: "#3a3835",
  fontSize: "1.05rem",
  maxWidth: "42rem",
};

const band = (index: number): React.CSSProperties => ({
  background: index % 2 === 0 ? "#ffffff" : PAPER_ALT,
  padding: "clamp(2rem, 5vw, 3rem) 1.5rem",
});
const inner: React.CSSProperties = { maxWidth: "60rem", margin: "0 auto" };

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

  let bandIndex = 0;

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

  // ------------------------------------------------------------------
  //  Renderery jednotlivých sekcí (closure nad daty výše)
  // ------------------------------------------------------------------
  function renderSection(section: Ordered): React.ReactNode {
    const { kind, content } = section;

    // Sekce, které zatím neumíme: publikovaně přeskočit, v náhledu placeholder.
    if (!isReadyKind(kind)) {
      if (!isPreview) return null;
      return (
        <section style={band(bandIndex++)}>
          <div style={{ ...inner, border: `1px dashed ${BORDER}`, borderRadius: "10px", padding: "1.25rem", color: MUTED, background: PAPER_ALT }}>
            🔜 Sekce &bdquo;{kind}&ldquo; — připravujeme, na veřejné stránce se zatím neukáže.
          </div>
        </section>
      );
    }

    switch (kind) {
      case "hero":
        return renderHero(content);
      case "gallery":
        return renderGallery(content);
      case "text":
        return renderText(content);
      case "parameters":
        return renderParameters();
      case "map":
        return renderMap(content);
      case "benefits":
        return renderBenefits(content);
      case "documents":
        return renderDocuments(content);
      case "valuation":
        return renderValuation(content);
      case "technicalCondition":
        return renderCondition(content);
      case "contact":
        return renderContact(content);
      case "poi":
        return renderPoi(content);
      case "socialProof":
        return renderSocial(content);
      case "news":
        return renderNews(content);
      case "analyticMaps":
        return renderAnalyticMaps(content);
      case "panorama":
        return renderPanorama(content);
      case "floorplans":
        return renderFloorplans(content);
      case "video":
        return renderVideo(content);
      case "investmentCalc":
        return renderInvestmentCalc(content);
      default:
        return null;
    }
  }

  function renderHero(content: unknown): React.ReactNode {
    const showPrice = (content as { show_price?: boolean })?.show_price !== false;
    const kicker = [p!.disposition, p!.property_type, p!.city].filter(Boolean).join("  ·  ");

    if (heroUrl) {
      return (
        <section style={{ position: "relative", height: "min(78vh, 46rem)", overflow: "hidden", background: PAPER_ALT }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- podepsané URL jsou dočasné */}
          <img src={heroUrl} alt={displayTitle} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0.1) 100%)" }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "clamp(1.5rem, 5vw, 3rem)", color: "#fff" }}>
            <div style={{ maxWidth: "60rem", margin: "0 auto", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {kicker ? <p style={{ textTransform: "uppercase", letterSpacing: "0.18em", fontSize: "0.78rem", opacity: 0.9 }}>{kicker}</p> : null}
              <h1 style={{ fontFamily: DISPLAY, fontSize: "clamp(2rem, 6vw, 3.4rem)", fontWeight: 600, lineHeight: 1.1 }}>{displayTitle}</h1>
              {p!.subtitle ? <p style={{ fontSize: "clamp(1rem, 2.5vw, 1.3rem)", opacity: 0.95, maxWidth: "40rem" }}>{p!.subtitle}</p> : null}
              <div style={{ display: "flex", gap: "0.5rem 2rem", flexWrap: "wrap", alignItems: "baseline", marginTop: "0.3rem" }}>
                {address ? <span style={{ fontSize: "1.05rem", opacity: 0.95 }}>{address}</span> : null}
                {showPrice ? <span style={{ fontFamily: DISPLAY, fontSize: "clamp(1.4rem, 4vw, 2rem)", fontWeight: 700 }}>{formatPrice(p!.price_czk)}</span> : null}
              </div>
            </div>
          </div>
        </section>
      );
    }

    // Bez fotky: textová hlavička.
    return (
      <header style={{ maxWidth: "60rem", margin: "0 auto", padding: "clamp(2.5rem, 6vw, 3.5rem) 1.5rem", display: "flex", flexDirection: "column", gap: "0.9rem", borderBottom: `1px solid ${BORDER}` }}>
        {kicker ? <p style={{ textTransform: "uppercase", letterSpacing: "0.18em", fontSize: "0.78rem", color: MUTED }}>{kicker}</p> : null}
        <h1 style={{ fontFamily: DISPLAY, fontSize: "clamp(2rem, 6vw, 3.2rem)", fontWeight: 600, lineHeight: 1.12, color: INK }}>{displayTitle}</h1>
        {p!.subtitle ? <p style={{ fontSize: "1.2rem", color: MUTED }}>{p!.subtitle}</p> : null}
        <div style={{ display: "flex", gap: "0.5rem 2rem", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between" }}>
          {address ? <span style={{ color: MUTED, fontSize: "1.05rem" }}>{address}</span> : null}
          {showPrice ? <span style={{ fontFamily: DISPLAY, fontSize: "clamp(1.4rem, 4vw, 1.9rem)", fontWeight: 700, color: INK }}>{formatPrice(p!.price_czk)}</span> : null}
        </div>
        {isPreview && photos.length === 0 ? (
          <div style={{ border: `1px dashed ${BORDER}`, borderRadius: "10px", padding: "1rem", color: MUTED, background: PAPER_ALT, marginTop: "0.5rem" }}>
            Prezentace zatím nemá žádné fotky — hlavní fotka prodává nejvíc.{" "}
            <Link href={`/presentations/${p!.id}/photos`} style={{ color: INK, textDecoration: "underline" }}>Přidat fotky →</Link>
          </div>
        ) : null}
      </header>
    );
  }

  function renderGallery(content: unknown): React.ReactNode {
    const heading = readGalleryContent(content).heading;
    if (galleryImages.filter((g) => g.url).length === 0) {
      if (!isPreview) return null;
      return (
        <section style={band(bandIndex++)}>
          <div style={inner}>
            <h2 style={sectionTitle}>{heading || "Galerie"}</h2>
            <div style={{ border: `1px dashed ${BORDER}`, borderRadius: "10px", padding: "1.25rem", color: MUTED, background: PAPER_ALT }}>
              Galerie zatím nemá fotky.{" "}
              <Link href={`/presentations/${p!.id}/photos`} style={{ color: INK, textDecoration: "underline" }}>Přidat fotky →</Link>
            </div>
          </div>
        </section>
      );
    }
    return (
      <section style={band(bandIndex++)}>
        <div style={inner}>
          <h2 style={sectionTitle}>{heading || "Galerie"}</h2>
          <Gallery images={galleryImages} />
        </div>
      </section>
    );
  }

  function renderText(content: unknown): React.ReactNode {
    const t = readTextContent(content);
    const body = t.source ? p![t.source] : t.body;
    const value = typeof body === "string" && body.trim().length > 0 ? body : null;
    const heading = t.heading || "Popis";
    if (!value && !isPreview) return null;
    return (
      <section style={band(bandIndex++)}>
        <div style={inner}>
          <h2 style={sectionTitle}>{heading}</h2>
          {value ? (
            <p style={proseText}>{value}</p>
          ) : (
            <div style={{ border: `1px dashed ${BORDER}`, borderRadius: "10px", padding: "1.25rem", color: MUTED, background: PAPER_ALT }}>
              Tahle sekce je zatím prázdná — na veřejné stránce se nezobrazí.{" "}
              <Link href={`/presentations/${p!.id}/texts`} style={{ color: INK, textDecoration: "underline" }}>Doplnit v kroku Texty →</Link>
            </div>
          )}
        </div>
      </section>
    );
  }

  function renderParameters(): React.ReactNode {
    const params: { label: string; value: string }[] = [];
    const push = (label: string, value: string | null) => {
      if (value) params.push({ label, value });
    };
    push("Typ nemovitosti", p!.property_type);
    push("Dispozice", p!.disposition);
    push("Užitná plocha", formatArea(p!.floor_area_m2));
    push("Zastavěná plocha", formatArea(p!.built_area_m2));
    push("Plocha pozemku", formatArea(p!.land_area_m2));
    push("Rozměry stavby", p!.building_dimensions);
    push("Rok stavby", p!.year_built ? String(p!.year_built) : null);
    push("Počet podlaží", p!.floors ? String(p!.floors) : null);
    push("Stav", p!.condition);
    push("Vlastnictví", p!.ownership);
    push("Provozní náklady", p!.monthly_costs_czk ? `${formatPrice(p!.monthly_costs_czk)} / měsíc` : null);

    const hasPenb = isEnergyClass(p!.energy_class);
    if (params.length === 0 && !hasPenb) {
      if (!isPreview) return null;
    }
    return (
      <section style={band(bandIndex++)}>
        <div style={inner}>
          <h2 style={sectionTitle}>Parametry</h2>
          {params.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(170px, 100%), 1fr))", gap: "0.9rem", marginBottom: hasPenb ? "1.5rem" : 0 }}>
              {params.map((param) => (
                <div key={param.label} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "1rem 1.1rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  <span style={{ color: MUTED, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>{param.label}</span>
                  <span style={{ fontWeight: 600, fontSize: "1.05rem", color: INK }}>{param.value}</span>
                </div>
              ))}
            </div>
          ) : null}
          {hasPenb ? <PenbScale value={p!.energy_class as string} /> : null}
        </div>
      </section>
    );
  }

  function renderMap(content: unknown): React.ReactNode {
    const m = readMapContent(content);
    const heading = m.heading || "Kde to je";
    if (p!.lat === null || p!.lng === null) {
      if (!isPreview) return null;
      return (
        <section style={band(bandIndex++)}>
          <div style={inner}>
            <h2 style={sectionTitle}>{heading}</h2>
            <div style={{ border: `1px dashed ${BORDER}`, borderRadius: "10px", padding: "1.25rem", color: MUTED, background: PAPER_ALT }}>
              Mapa zatím nemá souřadnice.{" "}
              <Link href={`/presentations/${p!.id}/sections`} style={{ color: INK, textDecoration: "underline" }}>Doplnit v kroku Sekce →</Link>
            </div>
          </div>
        </section>
      );
    }
    const lat = p!.lat;
    const lng = p!.lng;
    const d = 0.008;
    const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
    const osm = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat},${lng}`;
    const mapy = `https://mapy.cz/zakladni?q=${lat},${lng}`;
    return (
      <section style={band(bandIndex++)}>
        <div style={inner}>
          <h2 style={sectionTitle}>{heading}</h2>
          <div style={{ borderRadius: "12px", overflow: "hidden", border: `1px solid ${BORDER}` }}>
            <iframe title="Mapa" src={osm} style={{ width: "100%", height: "360px", border: "none", display: "block" }} loading="lazy" />
          </div>
          <p style={{ marginTop: "0.75rem" }}>
            <a href={mapy} target="_blank" rel="noreferrer" style={{ color: INK, textDecoration: "underline" }}>Otevřít v Mapy.cz ↗</a>
            {address ? <span style={{ color: MUTED }}>{"  ·  "}{address}</span> : null}
          </p>
        </div>
      </section>
    );
  }

  function renderBenefits(content: unknown): React.ReactNode {
    const b = readBenefitsContent(content);
    if (b.items.length === 0) {
      if (!isPreview) return null;
      return placeholderSection(b.heading || "Přednosti", "Zatím žádné přednosti — doplň je v kroku Sekce.");
    }
    return (
      <section style={band(bandIndex++)}>
        <div style={inner}>
          <h2 style={sectionTitle}>{b.heading || "Přednosti"}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", gap: "0.9rem" }}>
            {b.items.map((item, i) => (
              <div key={i} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: "12px", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {item.icon ? <span style={{ fontSize: "1.6rem" }}>{item.icon}</span> : null}
                <strong style={{ fontSize: "1.05rem", color: INK }}>{item.heading}</strong>
                {item.body ? <span style={{ color: MUTED, lineHeight: 1.6 }}>{item.body}</span> : null}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  function renderDocuments(content: unknown): React.ReactNode {
    const heading = readGalleryContent(content).heading || "Dokumenty ke stažení";
    if (documents.length === 0) {
      if (!isPreview) return null;
      return placeholderSection(heading, "Zatím žádné dokumenty — nahraj je v kroku Sekce.");
    }
    return (
      <section style={band(bandIndex++)}>
        <div style={inner}>
          <h2 style={sectionTitle}>{heading}</h2>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {documents.map((doc) => (
              <li key={doc.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: "#fff", border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "0.85rem 1rem" }}>
                <span style={{ fontSize: "1.3rem" }}>📄</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: INK }}>{doc.name}</div>
                  <div style={{ fontSize: "0.78rem", color: MUTED }}>{[doc.category, formatFileSize(doc.file_size_bytes)].filter(Boolean).join(" · ")}</div>
                </div>
                {doc.url ? (
                  <a href={doc.url} target="_blank" rel="noreferrer" style={{ padding: "0.5rem 1rem", borderRadius: "999px", border: `1px solid ${INK}`, color: INK, fontWeight: 600, fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                    Stáhnout
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  function renderValuation(content: unknown): React.ReactNode {
    const v = readValuationContent(content);
    if (v.items.length === 0) {
      if (!isPreview) return null;
      return placeholderSection(v.heading || "Porovnání cen", "Zatím žádné odhady — doplň je v kroku Sekce.");
    }
    return (
      <section style={band(bandIndex++)}>
        <div style={inner}>
          <h2 style={sectionTitle}>{v.heading || "Porovnání cen a odhady"}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))", gap: "0.9rem" }}>
            {v.items.map((item, i) => {
              const range = item.min_czk != null && item.max_czk != null
                ? `${formatPrice(item.min_czk)} – ${formatPrice(item.max_czk)}`
                : null;
              const main = item.estimate_czk != null ? formatPrice(item.estimate_czk) : range;
              return (
                <div key={i} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: "12px", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <span style={{ color: MUTED, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>{item.source}</span>
                  {main ? <strong style={{ fontFamily: DISPLAY, fontSize: "1.3rem", color: INK }}>{main}</strong> : null}
                  {item.estimate_czk != null && range ? <span style={{ color: MUTED, fontSize: "0.85rem" }}>rozpětí {range}</span> : null}
                  {item.note ? <span style={{ color: MUTED, fontSize: "0.85rem" }}>{item.note}</span> : null}
                  {/* URL už je zneškodněná v readeru; sanitizace i tady u samotného href (belt-and-suspenders). */}
                  {safeExternalUrl(item.url) ? <a href={safeExternalUrl(item.url)} target="_blank" rel="noreferrer" style={{ color: INK, textDecoration: "underline", fontSize: "0.85rem" }}>zdroj ↗</a> : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  function renderCondition(content: unknown): React.ReactNode {
    const c = readConditionContent(content);
    if (c.items.length === 0) {
      if (!isPreview) return null;
      return placeholderSection(c.heading || "Technický stav", "Zatím žádné položky — doplň je v kroku Sekce.");
    }
    const badgeColor: Record<string, string> = {
      new: "#1a9850",
      "very-good": "#66bd63",
      good: "#a6d96a",
      fair: "#fdae61",
    };
    return (
      <section style={band(bandIndex++)}>
        <div style={inner}>
          <h2 style={sectionTitle}>{c.heading || "Technický stav"}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {c.items.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: "0.9rem", alignItems: "baseline", background: "#fff", border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "0.85rem 1rem", flexWrap: "wrap" }}>
                <strong style={{ color: INK, minWidth: "8rem" }}>{item.category}</strong>
                {item.condition ? (
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#fff", background: badgeColor[item.condition] ?? MUTED, borderRadius: "999px", padding: "0.15rem 0.7rem" }}>
                    {CONDITION_LABEL[item.condition]}
                  </span>
                ) : null}
                {item.description ? <span style={{ color: MUTED, flex: 1 }}>{item.description}</span> : null}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  function renderContact(content: unknown): React.ReactNode {
    const cta = readContactContent(content).cta_text;
    if (!hasContact && !isPreview) return null;
    return (
      <section style={band(bandIndex++)}>
        <div style={inner}>
          {hasContact ? (
            <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: "14px", padding: "clamp(1.75rem, 5vw, 2.75rem)", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.1rem", textAlign: "center" }}>
              <h2 style={{ ...sectionTitle, marginBottom: 0 }}>Zaujalo vás to tu?</h2>
              <p style={{ color: MUTED, maxWidth: "34rem", lineHeight: 1.7 }}>
                {cta || (
                  <>
                    Nemovitost prodává <strong style={{ color: INK }}>{p!.contact_name || "majitel"}</strong> — napřímo, bez realitky. Ozvěte se, rád(a) vám ji ukáže.
                  </>
                )}
              </p>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
                {p!.contact_phone ? (
                  <a href={`tel:${p!.contact_phone.replace(/\s/g, "")}`} style={{ padding: "0.85rem 1.6rem", borderRadius: "999px", background: INK, color: "#fff", fontWeight: 600 }}>
                    Zavolat: {p!.contact_phone}
                  </a>
                ) : null}
                {p!.contact_email ? (
                  <a href={`mailto:${p!.contact_email}`} style={{ padding: "0.85rem 1.6rem", borderRadius: "999px", border: `1px solid ${INK}`, color: INK, fontWeight: 600 }}>
                    Napsat e-mail
                  </a>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              <h2 style={sectionTitle}>Kontakt</h2>
              <div style={{ border: `1px dashed ${BORDER}`, borderRadius: "10px", padding: "1.25rem", color: MUTED, background: PAPER_ALT }}>
                Kontakt na tebe tu zatím chybí — bez něj se zájemci nemají jak ozvat.{" "}
                <Link href={`/presentations/${p!.id}/texts`} style={{ color: INK, textDecoration: "underline" }}>Doplnit v kroku Texty →</Link>
              </div>
            </>
          )}
        </div>
      </section>
    );
  }

  function renderPoi(content: unknown): React.ReactNode {
    const c = readPoiContent(content);
    if (c.items.length === 0) {
      if (!isPreview) return null;
      return placeholderSection(c.heading || "Body zájmu", "Zatím žádná místa — doplň je v kroku Sekce.");
    }
    return (
      <section style={band(bandIndex++)}>
        <div style={inner}>
          <h2 style={sectionTitle}>{c.heading || "Co máte v okolí"}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", gap: "0.75rem" }}>
            {c.items.map((it, i) => (
              <div key={i} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "0.9rem 1rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                {it.category ? <span style={{ color: MUTED, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.07em" }}>{it.category}</span> : null}
                <strong style={{ color: INK }}>{it.name}</strong>
                {it.distance ? <span style={{ color: INK, fontSize: "0.9rem" }}>{it.distance}</span> : null}
                {it.note ? <span style={{ color: MUTED, fontSize: "0.85rem" }}>{it.note}</span> : null}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  function renderSocial(content: unknown): React.ReactNode {
    const c = readSocialContent(content);
    if (c.items.length === 0) {
      if (!isPreview) return null;
      return placeholderSection(c.heading || "Reference", "Zatím žádné reference — doplň je v kroku Sekce.");
    }
    return (
      <section style={band(bandIndex++)}>
        <div style={inner}>
          <h2 style={sectionTitle}>{c.heading || "Co říkají ostatní"}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))", gap: "0.9rem" }}>
            {c.items.map((it, i) => (
              <div key={i} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: "12px", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {it.rating ? (
                  <span style={{ color: "#f5a623", letterSpacing: "0.1em" }} aria-label={`${it.rating} z 5`}>
                    {"★".repeat(it.rating)}
                    <span style={{ color: BORDER }}>{"★".repeat(5 - it.rating)}</span>
                  </span>
                ) : null}
                {it.text ? <p style={{ color: "#3a3835", lineHeight: 1.65, fontStyle: "italic" }}>{it.text}</p> : null}
                <span style={{ color: INK, fontWeight: 600 }}>{it.author}</span>
                {it.source ? <span style={{ color: MUTED, fontSize: "0.8rem" }}>{it.source}</span> : null}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  function renderNews(content: unknown): React.ReactNode {
    const c = readNewsContent(content);
    if (c.items.length === 0) {
      if (!isPreview) return null;
      return placeholderSection(c.heading || "Novinky", "Zatím žádné zápisy — doplň je v kroku Sekce.");
    }
    return (
      <section style={band(bandIndex++)}>
        <div style={inner}>
          <h2 style={sectionTitle}>{c.heading || "Novinky a aktuality"}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            {c.items.map((it, i) => (
              <div key={i} style={{ display: "flex", gap: "1rem", borderLeft: `3px solid ${INK}`, paddingLeft: "1rem" }}>
                {it.date ? <span style={{ color: MUTED, fontSize: "0.85rem", minWidth: "7rem", flexShrink: 0 }}>{it.date}</span> : null}
                <div>
                  <strong style={{ color: INK }}>{it.headline}</strong>
                  {it.text ? <p style={{ color: MUTED, marginTop: "0.2rem", lineHeight: 1.6 }}>{it.text}</p> : null}
                  {/* URL už je zneškodněná v readeru; sanitizace i tady u samotného href (belt-and-suspenders). */}
                  {safeExternalUrl(it.url) ? <a href={safeExternalUrl(it.url)} target="_blank" rel="noreferrer" style={{ color: INK, textDecoration: "underline", fontSize: "0.85rem" }}>více ↗</a> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  function renderAnalyticMaps(content: unknown): React.ReactNode {
    const c = readAnalyticMapsContent(content);
    const maps = c.items.map((it) => ({
      title: it.title ?? "",
      caption: it.caption,
      group: it.group,
      why: it.why,
      url: it.image_path ? signedUrls.get(it.image_path) : undefined,
    }));
    const shown = maps.filter((m) => m.url || m.title);
    if (shown.length === 0) {
      if (!isPreview) return null;
      return placeholderSection(c.heading || "Analytické mapy", "Zatím žádné mapy — nahraj je v kroku Sekce.");
    }
    return (
      <section style={band(bandIndex++)}>
        <div style={inner}>
          <h2 style={sectionTitle}>{c.heading || "Analýza okolí"}</h2>
          <MapTabs maps={shown} />
        </div>
      </section>
    );
  }

  function renderPanorama(content: unknown): React.ReactNode {
    const c = readPanoramaContent(content);
    const url = c.image_path ? signedUrls.get(c.image_path) : undefined;
    if (!url) {
      if (!isPreview) return null;
      return placeholderSection(c.heading || "Panorama", "Zatím žádné panorama — nahraj ho v kroku Sekce.");
    }
    return (
      <section style={band(bandIndex++)}>
        <div style={inner}>
          <h2 style={sectionTitle}>{c.heading || "Virtuální prohlídka"}</h2>
          <div style={{ borderRadius: "12px", overflow: "hidden", border: `1px solid ${BORDER}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- podepsané URL jsou dočasné */}
            <img src={url} alt={c.caption || "Panorama"} style={{ width: "100%", display: "block" }} />
          </div>
          <p style={{ color: MUTED, marginTop: "0.6rem", fontSize: "0.9rem" }}>
            {c.caption ? `${c.caption} · ` : ""}Interaktivní 360° otáčení připravujeme.
          </p>
        </div>
      </section>
    );
  }

  function renderFloorplans(content: unknown): React.ReactNode {
    const c = readFloorplansContent(content);
    const floors = c.floors.map((f) => ({
      label: f.label,
      url: f.image_path ? signedUrls.get(f.image_path) : undefined,
      rooms: f.rooms.map((r) => ({
        name: r.name,
        area: r.area,
        description: r.description,
        url: r.image_path ? signedUrls.get(r.image_path) : undefined,
      })),
    }));
    if (floors.length === 0) {
      if (!isPreview) return null;
      return placeholderSection(c.heading || "Půdorysy", "Zatím žádná patra — přidej je v kroku Sekce.");
    }
    return (
      <section style={band(bandIndex++)}>
        <div style={inner}>
          <h2 style={sectionTitle}>{c.heading || "Půdorysy"}</h2>
          <FloorplansView floors={floors} />
        </div>
      </section>
    );
  }

  function renderVideo(content: unknown): React.ReactNode {
    const v = readVideoContent(content);
    const heading = v.heading || "Video";
    const embed = parseVideoUrl(v.url);

    // Bez odkazu: v náhledu placeholder, publikovaně skryté.
    if (!v.url) {
      if (!isPreview) return null;
      return placeholderSection(heading, "Zatím žádné video — vlož odkaz na YouTube nebo Vimeo v kroku Sekce.");
    }

    // Odkaz je, ale neumíme ho přehrát: srozumitelná hláška (ne prázdno, ne pád).
    if (!embed) {
      return (
        <section style={band(bandIndex++)}>
          <div style={inner}>
            <h2 style={sectionTitle}>{heading}</h2>
            <div style={{ border: `1px dashed ${BORDER}`, borderRadius: "10px", padding: "1.25rem", color: MUTED, background: PAPER_ALT }}>
              {isPreview ? (
                <>
                  Tenhle odkaz na video neumíme přehrát — podporujeme YouTube a Vimeo.{" "}
                  <Link href={`/presentations/${p!.id}/sections`} style={{ color: INK, textDecoration: "underline" }}>
                    Upravit odkaz →
                  </Link>
                </>
              ) : (
                "Video se nepodařilo načíst."
              )}
            </div>
          </div>
        </section>
      );
    }

    return (
      <section style={band(bandIndex++)}>
        <div style={inner}>
          <h2 style={sectionTitle}>{heading}</h2>
          <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", borderRadius: "12px", overflow: "hidden", border: `1px solid ${BORDER}`, background: "#000" }}>
            <iframe
              src={embed.embedUrl}
              title={heading}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
          {v.caption ? <p style={{ color: MUTED, marginTop: "0.6rem", fontSize: "0.9rem" }}>{v.caption}</p> : null}
        </div>
      </section>
    );
  }

  function renderInvestmentCalc(content: unknown): React.ReactNode {
    const c = readInvestmentCalcContent(content);
    const heading = c.heading || "Investiční kalkulačka";
    const empty =
      c.price_czk == null && c.area_m2 == null && c.monthly_rent_czk == null && c.annual_costs_czk == null;
    if (empty) {
      if (!isPreview) return null;
      return placeholderSection(heading, "Zatím žádné vstupy — doplň cenu a plochu v kroku Sekce.");
    }
    return (
      <section style={band(bandIndex++)}>
        <div style={inner}>
          <h2 style={sectionTitle}>{heading}</h2>
          <InvestmentCalcView
            price={c.price_czk ?? null}
            area={c.area_m2 ?? null}
            rent={c.monthly_rent_czk ?? null}
            costs={c.annual_costs_czk ?? null}
          />
          <p style={{ color: MUTED, marginTop: "0.75rem", fontSize: "0.8rem" }}>
            Orientační propočet z ceny a nájmu, ne investiční doporučení.
          </p>
        </div>
      </section>
    );
  }

  function placeholderSection(heading: string, note: string): React.ReactNode {
    return (
      <section style={band(bandIndex++)}>
        <div style={inner}>
          <h2 style={sectionTitle}>{heading}</h2>
          <div style={{ border: `1px dashed ${BORDER}`, borderRadius: "10px", padding: "1.25rem", color: MUTED, background: PAPER_ALT }}>
            {note}{" "}
            <Link href={`/presentations/${p!.id}/sections`} style={{ color: INK, textDecoration: "underline" }}>Otevřít sekce →</Link>
          </div>
        </div>
      </section>
    );
  }
}

// PENB barevná stupnice A–G — aktivní třída je zvýrazněná a popsaná.
function PenbScale({ value }: { value: string }) {
  const active = isEnergyClass(value) ? value : null;
  return (
    <div>
      <p style={{ color: MUTED, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
        Energetická náročnost (PENB)
      </p>
      <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", alignItems: "center" }}>
        {ENERGY_CLASSES.map((c) => {
          const isActive = c === active;
          return (
            <span
              key={c}
              style={{
                width: isActive ? "3rem" : "2.2rem",
                height: isActive ? "3rem" : "2.2rem",
                borderRadius: "8px",
                background: ENERGY_COLOR[c],
                color: "#fff",
                fontWeight: 700,
                fontSize: isActive ? "1.2rem" : "0.9rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: isActive ? "3px solid #1c1917" : "none",
                boxShadow: isActive ? "0 2px 8px rgba(0,0,0,0.25)" : "none",
              }}
            >
              {c}
            </span>
          );
        })}
        {active ? (
          <span style={{ marginLeft: "0.75rem", color: INK, fontWeight: 600 }}>
            Třída {active} — {ENERGY_LABEL[active]}
          </span>
        ) : null}
      </div>
    </div>
  );
}
