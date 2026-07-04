import Link from "next/link";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <p
        style={{
          color: "var(--accent)",
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontSize: "0.85rem",
          marginBottom: "1rem",
        }}
      >
        Prodej si sám
      </p>
      <h1 style={{ fontSize: "2.5rem", fontWeight: 700, maxWidth: "42rem" }}>
        Ahoj světe 👋
      </h1>
      <p
        style={{
          color: "var(--muted)",
          maxWidth: "32rem",
          marginTop: "1rem",
          fontSize: "1.1rem",
        }}
      >
        Základní aplikace běží. Tady vznikne SaaS, kde si každý sám vytvoří
        prodejní prezentaci své nemovitosti.
      </p>
      <Link
        href="/login"
        style={{
          marginTop: "2rem",
          color: "var(--accent)",
          fontWeight: 600,
        }}
      >
        Přihlášení / Registrace →
      </Link>
    </main>
  );
}
