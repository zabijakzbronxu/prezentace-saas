import Link from "next/link";

// Zobrazí se, když prezentace neexistuje, není publikovaná,
// nebo nepatří přihlášenému uživateli (RLS ji nevrátí).

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
      <h1 style={{ fontSize: "1.6rem", fontWeight: 700 }}>Prezentace není dostupná</h1>
      <p style={{ color: "var(--muted)", maxWidth: "28rem" }}>
        Buď neexistuje, nebo ještě nebyla zveřejněna. Pokud je to tvoje prezentace,
        přihlas se a otevři ji přes „Náhled" v editaci.
      </p>
      <Link href="/" style={{ color: "var(--accent)" }}>← na úvodní stránku</Link>
    </main>
  );
}
