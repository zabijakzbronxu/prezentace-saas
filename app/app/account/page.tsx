import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { MAX } from "@/lib/presentations/form";
import { signOut } from "../login/actions";
import { updateProfile } from "./actions";
import { label, hint, input, primaryBtn, ErrorBox, SuccessBox } from "../presentations/ui";

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
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { error, saved } = await searchParams;

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

        {error ? <ErrorBox>{error}</ErrorBox> : null}
        {saved ? <SuccessBox>Profil uložen. ✅</SuccessBox> : null}

        <form
          action={updateProfile}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            borderTop: "1px solid #1e293b",
            paddingTop: "1.25rem",
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Profil</h2>
            <p style={{ ...hint, marginTop: "0.25rem" }}>
              Jméno a telefon použijeme jako předvyplnění kontaktu u nových
              prezentací. Obojí je nepovinné.
            </p>
          </div>

          <label style={label}>
            Jméno
            <input
              style={input}
              type="text"
              name="full_name"
              maxLength={MAX.contact_name}
              placeholder="např. Karel Novák"
              defaultValue={profile?.full_name ?? ""}
            />
          </label>

          <label style={label}>
            Telefon
            <input
              style={input}
              type="tel"
              name="phone"
              maxLength={MAX.contact_phone}
              placeholder="např. +420 777 123 456"
              inputMode="tel"
              defaultValue={profile?.phone ?? ""}
            />
          </label>

          <button type="submit" style={{ ...primaryBtn, alignSelf: "flex-start" }}>
            Uložit profil
          </button>
        </form>

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
