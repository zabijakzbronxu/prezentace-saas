import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { signIn, signUp } from "./actions";

export const dynamic = "force-dynamic";

const wrap: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "2rem",
  gap: "1rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.7rem 0.9rem",
  borderRadius: "8px",
  border: "1px solid #334155",
  background: "#0f172a",
  color: "var(--foreground)",
  fontSize: "1rem",
};

const btn: React.CSSProperties = {
  padding: "0.7rem 1rem",
  borderRadius: "8px",
  border: "none",
  fontWeight: 600,
  fontSize: "1rem",
  cursor: "pointer",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <main style={wrap}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 700 }}>Přihlášení</h1>
        <p style={{ color: "var(--muted)", maxWidth: "28rem", textAlign: "center" }}>
          Přihlašování zatím není zapnuté — chybí napojení na Supabase. Jakmile
          budou vyplněné klíče v <code>.env.local</code>, tahle stránka začne
          fungovat. Postup je v <code>app/README.md</code>.
        </p>
        <Link href="/" style={{ color: "var(--accent)" }}>
          ← zpět na úvod
        </Link>
      </main>
    );
  }

  return (
    <main style={wrap}>
      <h1 style={{ fontSize: "1.6rem", fontWeight: 700 }}>Přihlášení / Registrace</h1>

      {error ? (
        <p style={{ color: "#f87171", maxWidth: "24rem", textAlign: "center" }}>{error}</p>
      ) : null}
      {message ? (
        <p style={{ color: "var(--accent)", maxWidth: "24rem", textAlign: "center" }}>
          {message}
        </p>
      ) : null}

      <form style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "22rem", maxWidth: "100%" }}>
        <input style={inputStyle} type="email" name="email" placeholder="E-mail" required autoComplete="email" />
        <input style={inputStyle} type="password" name="password" placeholder="Heslo" required autoComplete="current-password" minLength={6} />
        <button style={{ ...btn, background: "var(--accent)", color: "#04263a" }} formAction={signIn}>
          Přihlásit se
        </button>
        <button style={{ ...btn, background: "transparent", color: "var(--foreground)", border: "1px solid #334155" }} formAction={signUp}>
          Zaregistrovat se
        </button>
      </form>

      <Link href="/" style={{ color: "var(--muted)" }}>
        ← zpět na úvod
      </Link>
    </main>
  );
}
