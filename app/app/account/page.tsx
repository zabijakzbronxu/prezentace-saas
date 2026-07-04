import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { signOut } from "../login/actions";

export const dynamic = "force-dynamic";

const wrap: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "2rem",
  gap: "1rem",
  textAlign: "center",
};

export default async function AccountPage() {
  if (!isSupabaseConfigured()) {
    return (
      <main style={wrap}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 700 }}>Můj účet</h1>
        <p style={{ color: "var(--muted)", maxWidth: "28rem" }}>
          Přihlašování zatím není zapnuté (chybí napojení na Supabase).
        </p>
        <Link href="/" style={{ color: "var(--accent)" }}>← zpět na úvod</Link>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main style={wrap}>
      <h1 style={{ fontSize: "1.6rem", fontWeight: 700 }}>Můj účet</h1>
      <p style={{ color: "var(--muted)" }}>
        Přihlášen jako <strong style={{ color: "var(--foreground)" }}>{user.email}</strong>
      </p>
      <form action={signOut}>
        <button
          style={{
            padding: "0.6rem 1.2rem",
            borderRadius: "8px",
            border: "1px solid #334155",
            background: "transparent",
            color: "var(--foreground)",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Odhlásit se
        </button>
      </form>
      <Link href="/" style={{ color: "var(--muted)" }}>← zpět na úvod</Link>
    </main>
  );
}
