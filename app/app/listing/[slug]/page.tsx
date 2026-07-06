import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { PHOTOS_BUCKET } from "@/lib/photos";
import { formatPrice, formatArea, formatAddress } from "@/lib/format";

// Veřejná stránka prezentace pro zájemce.
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
  const name =
    p.title || formatAddress(p) || "Prezentace nemovitosti";
  return {
    title: `${name} · Prodej si sám`,
    description:
      [p.disposition, p.property_type, p.city, formatPrice(p.price_czk)]
        .filter(Boolean)
        .join(" · ") || undefined,
  };
}

const sectionTitle: React.CSSProperties = {
  fontSize: "1.35rem",
  fontWeight: 700,
  marginBottom: "0.75rem",
};

const proseText: React.CSSProperties = {
  whiteSpace: "pre-line",
  lineHeight: 1.7,
  color: "var(--foreground)",
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
            border: "1px dashed #334155",
            borderRadius: "10px",
            padding: "1.25rem",
            color: "var(--muted)",
          }}
        >
          Tahle sekce je zatím prázdná — na veřejné stránce se nezobrazí.{" "}
          <Link href={fillHref} style={{ color: "var(--accent)" }}>
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
        <h1 style={{ fontSize: "1.6rem", fontWeight: 700 }}>Prezentace nemovitosti</h1>
        <p style={{ color: "var(--muted)" }}>Zobrazení zatím není zapnuté (chybí napojení na Supabase).</p>
        <Link href="/" style={{ color: "var(--accent)" }}>← zpět na úvod</Link>
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
  const chips = [p.disposition, p.property_type].filter(Boolean) as string[];

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
    <main style={{ minHeight: "100vh", paddingBottom: "3rem" }}>
      {isPreview ? (
        <div
          style={{
            background: "rgba(56,189,248,0.12)",
            borderBottom: "1px solid rgba(56,189,248,0.35)",
            color: "var(--accent)",
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

      {/* HERO — hlavní fotka, titulek, adresa, cena */}
      <header style={{ position: "relative" }}>
        <div
          style={{
            height: heroUrl ? "min(65vh, 34rem)" : "auto",
            minHeight: heroUrl ? undefined : "14rem",
            background: heroUrl
              ? "#0f172a"
              : "linear-gradient(160deg, #0f172a 0%, #1e293b 60%, #0b1120 100%)",
            overflow: "hidden",
          }}
        >
          {heroUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- podepsané URL jsou dočasné, next/image je neumí kešovat
            <img
              src={heroUrl}
              alt={displayTitle}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : null}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to top, rgba(11,17,32,0.95) 0%, rgba(11,17,32,0.35) 45%, rgba(11,17,32,0.15) 100%)",
            }}
          />
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: "1.5rem",
          }}
        >
          <div style={{ maxWidth: "60rem", margin: "0 auto", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {chips.length > 0 ? (
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {chips.map((chip) => (
                  <span
                    key={chip}
                    style={{
                      fontSize: "0.8rem",
                      border: "1px solid rgba(148,163,184,0.5)",
                      borderRadius: "999px",
                      padding: "0.2rem 0.75rem",
                      background: "rgba(11,17,32,0.6)",
                    }}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            ) : null}
            <h1 style={{ fontSize: "clamp(1.6rem, 5vw, 2.6rem)", fontWeight: 800, lineHeight: 1.15 }}>
              {displayTitle}
            </h1>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "baseline" }}>
              {address ? <span style={{ color: "var(--muted)" }}>{address}</span> : null}
              <span style={{ fontSize: "clamp(1.2rem, 4vw, 1.7rem)", fontWeight: 800, color: "var(--accent)" }}>
                {formatPrice(p.price_czk)}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div
        style={{
          maxWidth: "60rem",
          margin: "0 auto",
          padding: "2rem 1.5rem 0",
          display: "flex",
          flexDirection: "column",
          gap: "2.5rem",
        }}
      >
        {!heroUrl && isPreview ? (
          <div
            style={{
              border: "1px dashed #334155",
              borderRadius: "10px",
              padding: "1.25rem",
              color: "var(--muted)",
            }}
          >
            {photos.length > 0
              ? "Náhledy fotek se nepodařilo načíst — zkontroluj, že je zapnuté úložiště (bucket) podle kroků pro Karla."
              : "Prezentace zatím nemá žádné fotky — hlavní fotka prodává nejvíc."}{" "}
            <Link href={`/presentations/${p.id}/photos`} style={{ color: "var(--accent)" }}>
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
                gridTemplateColumns: "repeat(auto-fill, minmax(min(220px, 100%), 1fr))",
                gap: "0.75rem",
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
                      background: "#0f172a",
                      borderRadius: "10px",
                      overflow: "hidden",
                      border: "1px solid #1e293b",
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
                          color: "var(--muted)",
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
                gridTemplateColumns: "repeat(auto-fit, minmax(min(160px, 100%), 1fr))",
                gap: "0.75rem",
              }}
            >
              {parameters.map((param) => (
                <div
                  key={param.label}
                  style={{
                    border: "1px solid #1e293b",
                    borderRadius: "10px",
                    padding: "0.85rem 1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.25rem",
                  }}
                >
                  <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{param.label}</span>
                  <span style={{ fontWeight: 700 }}>{param.value}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* KONTAKT / CTA */}
        {hasContact || isPreview ? (
          <section>
            <h2 style={sectionTitle}>Kontakt</h2>
            {hasContact ? (
              <div
                style={{
                  border: "1px solid #1e293b",
                  borderRadius: "12px",
                  padding: "1.5rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                <p>
                  Nemovitost prodává{" "}
                  <strong>{p.contact_name || "majitel"}</strong> — bez realitky, napřímo.
                </p>
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  {p.contact_phone ? (
                    <a
                      href={`tel:${p.contact_phone.replace(/\s/g, "")}`}
                      style={{
                        padding: "0.75rem 1.4rem",
                        borderRadius: "8px",
                        background: "var(--accent)",
                        color: "#04263a",
                        fontWeight: 700,
                      }}
                    >
                      Zavolat: {p.contact_phone}
                    </a>
                  ) : null}
                  {p.contact_email ? (
                    <a
                      href={`mailto:${p.contact_email}`}
                      style={{
                        padding: "0.75rem 1.4rem",
                        borderRadius: "8px",
                        border: "1px solid var(--accent)",
                        color: "var(--accent)",
                        fontWeight: 700,
                      }}
                    >
                      Napsat e-mail
                    </a>
                  ) : null}
                </div>
              </div>
            ) : (
              <div
                style={{
                  border: "1px dashed #334155",
                  borderRadius: "10px",
                  padding: "1.25rem",
                  color: "var(--muted)",
                }}
              >
                Kontakt na tebe tu zatím chybí — formulář pro kontaktní údaje přijde
                v dalším kroku vývoje. Bez něj se zájemci nemají jak ozvat.
              </div>
            )}
          </section>
        ) : null}

        <footer
          style={{
            borderTop: "1px solid #1e293b",
            paddingTop: "1.25rem",
            display: "flex",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
            color: "var(--muted)",
            fontSize: "0.85rem",
          }}
        >
          <span>Prodává majitel napřímo.</span>
          <Link href="/" style={{ color: "var(--muted)" }}>
            Vytvořeno v <strong style={{ color: "var(--accent)" }}>Prodej si sám</strong>
          </Link>
        </footer>
      </div>
    </main>
  );
}
