import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { PHOTOS_BUCKET } from "@/lib/photos";
import { formatPrice, formatArea, formatAddress } from "@/lib/format";

// Veřejná stránka prezentace pro zájemce — světlá prezentační šablona
// (serifové nadpisy, vzdušná typografie; fonty řeší listing/layout.tsx).
// Kdo ji uvidí, řeší RLS v databázi — žádná logika navíc tady není potřeba:
//   - PUBLIKOVANOU prezentaci (a její fotky) přečte kdokoli, i nepřihlášený;
//   - KONCEPT přečte jen přihlášený vlastník (tlačítko „Náhled" v editaci);
//   - cizí koncept dotaz prostě nevrátí → 404.

export const dynamic = "force-dynamic";

const ENERGY_LABEL: Record<string, string> = {
  A: "mimořádně úsporná",
  B: "velmi úsporná",
  C: "úsporná",
  D: "méně úsporná",
  E: "nehospodárná",
  F: "velmi nehospodárná",
  G: "mimořádně nehospodárná",
};

// Světlá paleta šablony (podle referenční Otínské: bílá, tmavý text, teplá šedá)
const INK = "#1c1917"; // hlavní text
const MUTED = "#646463"; // tlumený text
const BORDER = "#e7e5e4"; // linky a rámečky
const PAPER_ALT = "#faf9f7"; // jemné podbarvení karet
const DISPLAY = "var(--font-display), Georgia, serif"; // serifové nadpisy

type ListingParams = { slug: string };

async function loadListing(slug: string) {
  const supabase = await createClient();
  const { data: p, error } = await supabase
    .from("presentations")
    .select(
      "id, owner_id, status, slug, title, property_type, street, city, postal_code, price_czk, disposition, floor_area_m2, land_area_m2, energy_class, description, location_text, features_text, contact_name, contact_email, contact_phone",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    console.error("[listing] načtení selhalo:", error.message);
  }
  return { supabase, presentation: p ?? null };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<ListingParams>;
}): Promise<Metadata> {
  if (!isSupabaseConfigured()) return { title: "Prodej si sám" };
  const { slug } = await params;
  const { presentation: p } = await loadListing(slug);
  if (!p) return { title: "Prezentace nenalezena · Prodej si sám" };
  const name = p.title || formatAddress(p) || "Prezentace nemovitosti";
  return {
    title: `${name} · Prodej si sám`,
    description:
      [p.disposition, p.property_type, p.city, formatPrice(p.price_czk)]
        .filter(Boolean)
        .join(" · ") || undefined,
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

/** Sekce s nadpisem. Když obsah chybí: v náhledu ukáže vlídný prázdný stav
 *  s odkazem na příslušný krok průvodce, na veřejné stránce se celá vynechá. */
function TextSection({
  title,
  value,
  isPreview,
  fillHref,
  fillLabel,
}: {
  title: string;
  value: string | null;
  isPreview: boolean;
  fillHref: string;
  fillLabel: string;
}) {
  if (!value && !isPreview) return null;
  return (
    <section>
      <h2 style={sectionTitle}>{title}</h2>
      {value ? (
        <p style={proseText}>{value}</p>
      ) : (
        <div
          style={{
            border: `1px dashed ${BORDER}`,
            borderRadius: "10px",
            padding: "1.25rem",
            color: MUTED,
            background: PAPER_ALT,
          }}
        >
          Tahle sekce je zatím prázdná — na veřejné stránce se nezobrazí.{" "}
          <Link href={fillHref} style={{ color: INK, textDecoration: "underline" }}>
            {fillLabel} →
          </Link>
        </div>
      )}
    </section>
  );
}

export default async function ListingPage({
  params,
}: {
  params: Promise<ListingParams>;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontFamily: DISPLAY, fontSize: "1.8rem", fontWeight: 600 }}>
          Prezentace nemovitosti
        </h1>
        <p style={{ color: MUTED }}>Zobrazení zatím není zapnuté (chybí napojení na Supabase).</p>
        <Link href="/" style={{ color: INK, textDecoration: "underline" }}>← zpět na úvod</Link>
      </main>
    );
  }

  const { slug } = await params;
  const { supabase, presentation: p } = await loadListing(slug);
  if (!p) notFound();

  const isPreview = p.status !== "published";

  const { data: photosData, error: photosError } = await supabase
    .from("presentation_photos")
    .select("id, storage_path, is_hero, sort_order")
    .eq("presentation_id", p.id)
    .order("sort_order", { ascending: true });
  if (photosError) {
    console.error("[listing] načtení fotek selhalo:", photosError.message);
  }
  const photos = photosData ?? [];

  // Podepsané odkazy fungují pro vlastníka (koncept) i pro veřejnost
  // (publikovaná) — rozhodují Storage policies.
  const signedUrls = new Map<string, string>();
  if (photos.length > 0) {
    const { data: signed, error: signError } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .createSignedUrls(
        photos.map((ph) => ph.storage_path),
        60 * 60,
      );
    if (signError || !signed) {
      console.error("[listing] podepsané odkazy selhaly:", signError?.message);
    } else {
      for (const item of signed) {
        if (item.signedUrl && item.path) signedUrls.set(item.path, item.signedUrl);
      }
    }
  }

  const heroPhoto = photos.find((ph) => ph.is_hero) ?? photos[0] ?? null;
  const heroUrl = heroPhoto ? signedUrls.get(heroPhoto.storage_path) : undefined;
  const galleryPhotos = photos.filter((ph) => ph.id !== heroPhoto?.id);

  const displayTitle = p.title || formatAddress(p) || "Prezentace nemovitosti";
  const address = formatAddress(p);
  const kicker = [p.disposition, p.property_type, p.city]
    .filter(Boolean)
    .join("  ·  ");

  const parameters: { label: string; value: string }[] = [];
  if (p.property_type) parameters.push({ label: "Typ nemovitosti", value: p.property_type });
  if (p.disposition) parameters.push({ label: "Dispozice", value: p.disposition });
  const floorArea = formatArea(p.floor_area_m2);
  if (floorArea) parameters.push({ label: "Užitná plocha", value: floorArea });
  const landArea = formatArea(p.land_area_m2);
  if (landArea) parameters.push({ label: "Plocha pozemku", value: landArea });
  if (p.energy_class) {
    parameters.push({
      label: "Energetická třída (PENB)",
      value: `${p.energy_class} — ${ENERGY_LABEL[p.energy_class] ?? ""}`.trim(),
    });
  }

  const hasContact = Boolean(p.contact_name || p.contact_email || p.contact_phone);

  return (
    <main style={{ paddingBottom: "4rem" }}>
      {isPreview ? (
        <div
          style={{
            background: "#eff6ff",
            borderBottom: "1px solid #bfdbfe",
            color: "#1d4ed8",
            padding: "0.6rem 1rem",
            textAlign: "center",
            fontSize: "0.9rem",
          }}
        >
          Náhled konceptu — tuhle stránku vidíš jen ty. Zveřejní se až po zaplacení.{" "}
          <Link
            href={`/presentations/${p.id}/edit`}
            style={{ fontWeight: 700, textDecoration: "underline" }}
          >
            Zpět do editace
          </Link>
        </div>
      ) : null}

      {/* HERO — velká fotka na celou šířku */}
      {heroUrl ? (
        <div style={{ height: "min(72vh, 42rem)", overflow: "hidden", background: PAPER_ALT }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- podepsané URL jsou dočasné, next/image je neumí kešovat */}
          <img
            src={heroUrl}
            alt={displayTitle}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </div>
      ) : null}

      {/* HLAVIČKA — titulek, adresa, cena (pod fotkou, vzdušně) */}
      <header
        style={{
          maxWidth: "60rem",
          margin: "0 auto",
          padding: "clamp(2rem, 6vw, 3.5rem) 1.5rem clamp(1.5rem, 4vw, 2.5rem)",
          display: "flex",
          flexDirection: "column",
          gap: "0.9rem",
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        {kicker ? (
          <p
            style={{
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              fontSize: "0.78rem",
              color: MUTED,
            }}
          >
            {kicker}
          </p>
        ) : null}
        <h1
          style={{
            fontFamily: DISPLAY,
            fontSize: "clamp(2rem, 6vw, 3.2rem)",
            fontWeight: 600,
            lineHeight: 1.12,
            color: INK,
          }}
        >
          {displayTitle}
        </h1>
        <div
          style={{
            display: "flex",
            gap: "0.5rem 2rem",
            flexWrap: "wrap",
            alignItems: "baseline",
            justifyContent: "space-between",
          }}
        >
          {address ? <span style={{ color: MUTED, fontSize: "1.05rem" }}>{address}</span> : null}
          <span
            style={{
              fontFamily: DISPLAY,
              fontSize: "clamp(1.4rem, 4vw, 1.9rem)",
              fontWeight: 700,
              color: INK,
            }}
          >
            {formatPrice(p.price_czk)}
          </span>
        </div>
      </header>

      <div
        style={{
          maxWidth: "60rem",
          margin: "0 auto",
          padding: "clamp(2rem, 5vw, 3rem) 1.5rem 0",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(2.5rem, 6vw, 3.5rem)",
        }}
      >
        {!heroUrl && isPreview ? (
          <div
            style={{
              border: `1px dashed ${BORDER}`,
              borderRadius: "10px",
              padding: "1.25rem",
              color: MUTED,
              background: PAPER_ALT,
            }}
          >
            {photos.length > 0
              ? "Náhledy fotek se nepodařilo načíst — zkontroluj, že je zapnuté úložiště (bucket) podle kroků pro Karla."
              : "Prezentace zatím nemá žádné fotky — hlavní fotka prodává nejvíc."}{" "}
            <Link
              href={`/presentations/${p.id}/photos`}
              style={{ color: INK, textDecoration: "underline" }}
            >
              Přidat fotky →
            </Link>
          </div>
        ) : null}

        {/* GALERIE */}
        {galleryPhotos.length > 0 ? (
          <section>
            <h2 style={sectionTitle}>Galerie</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(240px, 100%), 1fr))",
                gap: "0.9rem",
              }}
            >
              {galleryPhotos.map((photo, i) => {
                const url = signedUrls.get(photo.storage_path);
                return (
                  <a
                    key={photo.id}
                    href={url ?? "#"}
                    target={url ? "_blank" : undefined}
                    rel="noreferrer"
                    style={{
                      display: "block",
                      aspectRatio: "4 / 3",
                      background: PAPER_ALT,
                      borderRadius: "8px",
                      overflow: "hidden",
                      border: `1px solid ${BORDER}`,
                    }}
                  >
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- podepsané URL jsou dočasné
                      <img
                        src={url}
                        alt={`Fotka ${i + 2}`}
                        loading="lazy"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    ) : (
                      <span
                        style={{
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: MUTED,
                          fontSize: "0.8rem",
                        }}
                      >
                        náhled nedostupný
                      </span>
                    )}
                  </a>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* TEXTY */}
        <TextSection
          title="Příběh nemovitosti"
          value={p.description}
          isPreview={isPreview}
          fillHref={`/presentations/${p.id}/texts`}
          fillLabel="Doplnit v kroku Texty"
        />
        <TextSection
          title="Lokalita a okolí"
          value={p.location_text}
          isPreview={isPreview}
          fillHref={`/presentations/${p.id}/texts`}
          fillLabel="Doplnit v kroku Texty"
        />
        <TextSection
          title="Vybavení a přednosti"
          value={p.features_text}
          isPreview={isPreview}
          fillHref={`/presentations/${p.id}/texts`}
          fillLabel="Doplnit v kroku Texty"
        />

        {/* PARAMETRY */}
        {parameters.length > 0 ? (
          <section>
            <h2 style={sectionTitle}>Parametry</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(170px, 100%), 1fr))",
                gap: "0.9rem",
              }}
            >
              {parameters.map((param) => (
                <div
                  key={param.label}
                  style={{
                    background: PAPER_ALT,
                    border: `1px solid ${BORDER}`,
                    borderRadius: "10px",
                    padding: "1rem 1.1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.3rem",
                  }}
                >
                  <span
                    style={{
                      color: MUTED,
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {param.label}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: "1.05rem", color: INK }}>
                    {param.value}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* KONTAKT / CTA */}
        {hasContact || isPreview ? (
          <section>
            {hasContact ? (
              <div
                style={{
                  background: PAPER_ALT,
                  border: `1px solid ${BORDER}`,
                  borderRadius: "14px",
                  padding: "clamp(1.75rem, 5vw, 2.75rem)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "1.1rem",
                  textAlign: "center",
                }}
              >
                <h2 style={{ ...sectionTitle, marginBottom: 0 }}>Zaujalo vás to tu?</h2>
                <p style={{ color: MUTED, maxWidth: "32rem", lineHeight: 1.7 }}>
                  Nemovitost prodává <strong style={{ color: INK }}>{p.contact_name || "majitel"}</strong>{" "}
                  — napřímo, bez realitky. Ozvěte se, rád(a) vám ji ukáže.
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    flexWrap: "wrap",
                    justifyContent: "center",
                  }}
                >
                  {p.contact_phone ? (
                    <a
                      href={`tel:${p.contact_phone.replace(/\s/g, "")}`}
                      style={{
                        padding: "0.85rem 1.6rem",
                        borderRadius: "999px",
                        background: INK,
                        color: "#ffffff",
                        fontWeight: 600,
                      }}
                    >
                      Zavolat: {p.contact_phone}
                    </a>
                  ) : null}
                  {p.contact_email ? (
                    <a
                      href={`mailto:${p.contact_email}`}
                      style={{
                        padding: "0.85rem 1.6rem",
                        borderRadius: "999px",
                        border: `1px solid ${INK}`,
                        color: INK,
                        fontWeight: 600,
                      }}
                    >
                      Napsat e-mail
                    </a>
                  ) : null}
                </div>
              </div>
            ) : (
              <>
                <h2 style={sectionTitle}>Kontakt</h2>
                <div
                  style={{
                    border: `1px dashed ${BORDER}`,
                    borderRadius: "10px",
                    padding: "1.25rem",
                    color: MUTED,
                    background: PAPER_ALT,
                  }}
                >
                  Kontakt na tebe tu zatím chybí — bez něj se zájemci nemají jak ozvat.{" "}
                  <Link
                    href={`/presentations/${p.id}/texts`}
                    style={{ color: INK, textDecoration: "underline" }}
                  >
                    Doplnit v kroku Texty →
                  </Link>
                </div>
              </>
            )}
          </section>
        ) : null}

        <footer
          style={{
            borderTop: `1px solid ${BORDER}`,
            paddingTop: "1.5rem",
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
      </div>
    </main>
  );
}
