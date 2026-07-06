import Link from "next/link";

// Zobrazí se, když prezentace neexistuje, není publikovaná,
// nebo nepatří přihlášenému uživateli (RLS ji nevrátí).
// Drží světlý styl veřejné šablony (listing/layout.tsx).

export default function ListingNotFound() {
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
      <h1
        style={{
          fontFamily: "var(--font-display), Georgia, serif",
          fontSize: "2rem",
          fontWeight: 600,
        }}
      >
        Prezentace není dostupná
      </h1>
      <p style={{ color: "#646463", maxWidth: "28rem", lineHeight: 1.7 }}>
        Buď neexistuje, nebo ještě nebyla zveřejněna. Pokud je to tvoje prezentace,
        přihlas se a otevři ji přes „Náhled" v editaci.
      </p>
      <Link href="/" style={{ color: "#1c1917", textDecoration: "underline" }}>
        ← na úvodní stránku
      </Link>
    </main>
  );
}
