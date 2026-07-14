// Hlasitá chyba místo tiché: když dotaz spadne kvůli chybějícímu sloupci /
// tabulce / funkci, uživatel místo prázdné stránky (nebo lživého „prezentace
// nenalezena") uvidí, CO se stalo a CO s tím.
//
// Používají to všechny stránky, které čtou prezentaci z databáze.

import Link from "next/link";
import { MISSING_SCHEMA_MESSAGE, MISSING_SCHEMA_FIX } from "@/lib/db-errors";

export function SchemaErrorScreen({
  detail,
  backHref = "/presentations",
  backLabel = "← zpět na Moje prezentace",
}: {
  /** Původní hláška z databáze — technický detail pro Karla / vývojáře. */
  detail?: string | null;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1.5rem",
        gap: "1.25rem",
      }}
    >
      <div
        style={{
          width: "38rem",
          maxWidth: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          border: "1px solid rgba(248,113,113,0.35)",
          background: "rgba(248,113,113,0.08)",
          borderRadius: "12px",
          padding: "1.5rem",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#fca5a5" }}>
          Stránka se nenačetla — databáze není dorovnaná
        </h1>

        <p style={{ lineHeight: 1.6 }}>{MISSING_SCHEMA_MESSAGE}</p>

        <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
          <strong style={{ color: "var(--foreground)" }}>Co s tím:</strong> {MISSING_SCHEMA_FIX}
        </p>

        {detail ? (
          <p
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: "0.8rem",
              color: "var(--muted)",
              background: "rgba(0,0,0,0.25)",
              border: "1px solid #334155",
              borderRadius: "8px",
              padding: "0.6rem 0.8rem",
              overflowWrap: "anywhere",
            }}
          >
            {detail}
          </p>
        ) : null}

        <Link href={backHref} style={{ color: "var(--accent)" }}>
          {backLabel}
        </Link>
      </div>
    </main>
  );
}
