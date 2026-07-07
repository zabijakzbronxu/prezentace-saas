import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Úvodní stránka produktu. Přihlášeného posílá rovnou do jeho prezentací,
// nepřihlášeného na registraci.

const STEPS = [
  {
    n: "1",
    title: "Vyplň základ",
    text: "Adresa, cena, dispozice. Zabere to pár minut a všechno jde kdykoli upravit.",
  },
  {
    n: "2",
    title: "Nahraj fotky a napiš příběh",
    text: "Průvodce tě provede fotkami i texty — co je kolem, co v domě zůstává, proč se tu dobře žije.",
  },
  {
    n: "3",
    title: "Zkontroluj náhled a zveřejni",
    text: "Uvidíš stránku přesně tak, jak ji uvidí zájemci. Zveřejňuje se až po zaplacení — žádné předplatné.",
  },
] as const;

export default async function Home() {
  let ctaHref = "/login";
  let ctaLabel = "Začít — je to zdarma na vyzkoušení";

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      ctaHref = "/presentations";
      ctaLabel = "Moje prezentace →";
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "clamp(3rem, 10vh, 6rem) 1.5rem 3rem",
        gap: "clamp(3rem, 8vh, 5rem)",
      }}
    >
      {/* HERO */}
      <section
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: "1.25rem",
          maxWidth: "44rem",
        }}
      >
        <p
          style={{
            color: "var(--accent)",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontSize: "0.85rem",
          }}
        >
          Prodej si sám
        </p>
        <h1 style={{ fontSize: "clamp(2rem, 6vw, 3rem)", fontWeight: 800, lineHeight: 1.15 }}>
          Prodejní stránka tvé nemovitosti.
          <br />
          Bez realitky, bez programátora.
        </h1>
        <p style={{ color: "var(--muted)", maxWidth: "36rem", fontSize: "1.1rem", lineHeight: 1.7 }}>
          Vyplníš průvodce, nahraješ fotky, napíšeš pár vět — a máš profesionální
          stránku s galerií, parametry a kontaktem, kterou pošleš zájemcům nebo
          přidáš do inzerátu.
        </p>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
          <Link
            href={ctaHref}
            style={{
              padding: "0.85rem 1.6rem",
              borderRadius: "8px",
              background: "var(--accent)",
              color: "#04263a",
              fontWeight: 700,
              fontSize: "1.05rem",
            }}
          >
            {ctaLabel}
          </Link>
        </div>
      </section>

      {/* JAK TO FUNGUJE */}
      <section style={{ maxWidth: "56rem", width: "100%" }}>
        <h2 style={{ textAlign: "center", fontSize: "1.4rem", fontWeight: 700, marginBottom: "1.5rem" }}>
          Jak to funguje
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(15rem, 100%), 1fr))",
            gap: "1rem",
          }}
        >
          {STEPS.map((step) => (
            <div
              key={step.n}
              style={{
                border: "1px solid #1e293b",
                borderRadius: "12px",
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
              }}
            >
              <span
                style={{
                  width: "2rem",
                  height: "2rem",
                  borderRadius: "999px",
                  background: "rgba(56,189,248,0.15)",
                  color: "var(--accent)",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {step.n}
              </span>
              <h3 style={{ fontWeight: 700 }}>{step.title}</h3>
              <p style={{ color: "var(--muted)", fontSize: "0.95rem", lineHeight: 1.6 }}>{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ color: "var(--muted)", fontSize: "0.85rem", textAlign: "center" }}>
        Platí se jednorázově, až když prezentaci zveřejňuješ. Koncept je zdarma.
      </footer>
    </main>
  );
}
