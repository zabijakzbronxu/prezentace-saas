import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { signOut } from "../login/actions";
import { ProfileForm } from "./profile-form";
import { primaryBtn, SuccessBox } from "../presentations/ui";

export const dynamic = "force-dynamic";

const wrap: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "3rem 1.5rem",
};

const card: React.CSSProperties = {
  width: "28rem",
  maxWidth: "100%",
  display: "flex",
  flexDirection: "column",
  gap: "1.25rem",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <main style={{ ...wrap, justifyContent: "center", textAlign: "center", gap: "1rem" }}>
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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    console.error("[account] načtení profilu selhalo:", profileError.message);
  }

  return (
    <main style={wrap}>
      <div style={card}>
        <div>
          <h1 style={{ fontSize: "1.7rem", fontWeight: 700 }}>Můj účet</h1>
          <p style={{ color: "var(--muted)", marginTop: "0.4rem" }}>
            Přihlášen jako{" "}
            <strong style={{ color: "var(--foreground)" }}>{user.email}</strong>
          </p>
        </div>

        <Link
          href="/presentations"
          style={{ ...primaryBtn, textAlign: "center" }}
        >
          Moje prezentace →
        </Link>

        {saved ? <SuccessBox>Profil uložen. ✅</SuccessBox> : null}

        <ProfileForm
          defaults={{
            full_name: profile?.full_name ?? "",
            phone: profile?.phone ?? "",
          }}
        />

        <div style={{ display: "flex", gap: "1rem", alignItems: "center", borderTop: "1px solid #1e293b", paddingTop: "1.25rem" }}>
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
        </div>
      </div>
    </main>
  );
}
