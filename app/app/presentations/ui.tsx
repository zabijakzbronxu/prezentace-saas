// Sdílené UI kousky pro průvodce prezentací (založení + editace + fotky + texty),
// aby všechny kroky vypadaly stejně a styly žily na jednom místě.

import Link from "next/link";

export const wrap: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "3rem 1.5rem",
};

export const card: React.CSSProperties = {
  width: "38rem",
  maxWidth: "100%",
  display: "flex",
  flexDirection: "column",
  gap: "1.25rem",
};

export const label: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.35rem",
  fontSize: "0.95rem",
};

export const hint: React.CSSProperties = { color: "var(--muted)", fontSize: "0.8rem" };

export const input: React.CSSProperties = {
  padding: "0.65rem 0.85rem",
  borderRadius: "8px",
  border: "1px solid #334155",
  background: "#0f172a",
  color: "var(--foreground)",
  fontSize: "1rem",
};

export const textarea: React.CSSProperties = {
  ...input,
  minHeight: "9rem",
  resize: "vertical",
  fontFamily: "inherit",
  lineHeight: 1.5,
};

export const row: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "1rem",
};

export const primaryBtn: React.CSSProperties = {
  padding: "0.75rem 1.4rem",
  borderRadius: "8px",
  border: "none",
  background: "var(--accent)",
  color: "#04263a",
  fontWeight: 700,
  fontSize: "1rem",
  cursor: "pointer",
};

export const smallBtn: React.CSSProperties = {
  padding: "0.35rem 0.7rem",
  borderRadius: "6px",
  border: "1px solid #334155",
  background: "transparent",
  color: "var(--foreground)",
  fontSize: "0.8rem",
  cursor: "pointer",
};

/** Červený rámeček s chybovou hláškou (např. z serverové validace). */
export function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        color: "#fca5a5",
        background: "rgba(248,113,113,0.1)",
        border: "1px solid rgba(248,113,113,0.3)",
        borderRadius: "8px",
        padding: "0.7rem 0.9rem",
      }}
    >
      {children}
    </p>
  );
}

/** Zelený rámeček s potvrzením („uloženo"). */
export function SuccessBox({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        color: "#86efac",
        background: "rgba(34,197,94,0.1)",
        border: "1px solid rgba(34,197,94,0.3)",
        borderRadius: "8px",
        padding: "0.7rem 0.9rem",
      }}
    >
      {children}
    </p>
  );
}

/** Odkaz „Náhled" — otevře veřejnou stránku prezentace v nové záložce.
 *  U konceptu ji vidí jen vlastník (hlídá RLS), takže je bezpečný v každém kroku. */
export function PreviewLink({ slug }: { slug: string }) {
  return (
    <Link
      href={`/listing/${slug}`}
      target="_blank"
      style={{
        fontSize: "0.85rem",
        fontWeight: 600,
        color: "var(--accent)",
        border: "1px solid var(--accent)",
        borderRadius: "8px",
        padding: "0.35rem 0.8rem",
        whiteSpace: "nowrap",
      }}
    >
      Náhled ↗
    </Link>
  );
}

const STEPS = [
  { key: "edit", n: 1, title: "Základ" },
  { key: "photos", n: 2, title: "Fotky" },
  { key: "texts", n: 3, title: "Texty" },
] as const;

export type WizardStep = (typeof STEPS)[number]["key"];

/**
 * Navigace průvodce: Základ → Fotky → Texty.
 * Všechny kroky jsou klikací (uložená prezentace už existuje), aktuální je zvýrazněný.
 */
export function WizardNav({
  presentationId,
  current,
}: {
  presentationId: string;
  current: WizardStep;
}) {
  return (
    <nav
      aria-label="Kroky průvodce"
      style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}
    >
      {STEPS.map((step, i) => {
        const active = step.key === current;
        return (
          <span key={step.key} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {i > 0 ? <span style={{ color: "var(--muted)" }}>→</span> : null}
            <Link
              href={`/presentations/${presentationId}/${step.key}`}
              aria-current={active ? "step" : undefined}
              style={{
                padding: "0.3rem 0.8rem",
                borderRadius: "999px",
                border: active ? "1px solid var(--accent)" : "1px solid #334155",
                color: active ? "var(--accent)" : "var(--muted)",
                fontWeight: active ? 700 : 400,
                fontSize: "0.85rem",
                whiteSpace: "nowrap",
              }}
            >
              {step.n}. {step.title}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
