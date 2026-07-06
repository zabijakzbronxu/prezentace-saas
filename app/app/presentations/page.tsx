import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "Koncept",
  paid: "Zaplaceno",
  published: "Publikováno",
};

const wrap: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "3rem 1.5rem",
};

const container: React.CSSProperties = {
  width: "42rem",
  maxWidth: "100%",
  display: "flex",
  flexDirection: "column",
  gap: "1.5rem",
};

const primaryBtn: React.CSSProperties = {
  padding: "0.7rem 1.3rem",
  borderRadius: "8px",
  background: "var(--accent)",
  color: "#04263a",
  fontWeight: 700,
  fontSize: "1rem",
  border: "none",
  display: "inline-block",
};

export default async function PresentationsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const { created } = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <main style={{ ...wrap, justifyContent: "center", textAlign: "center", gap: "1rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 700 }}>Moje prezentace</h1>
        <p style={{ color: "var(--muted)" }}>Zatím není zapnuté napojení na Supabase.</p>
        <Link href="/" style={{ color: "var(--accent)" }}>← zpět na úvod</Link>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: presentations, error: loadError } = await supabase
    .from("presentations")
    .select("id, title, street, city, price_czk, status, created_at")
    .order("created_at", { ascending: false });

  // Chybu NEZAHAZUJEME: prázdný seznam ≠ chyba. Kdyby se to spolklo, maskovalo by to
  // rozbité RLS/migraci/chybějící profil. Zaloguj na server a ukaž bezpečnou hlášku.
  if (loadError) {
    console.error("[presentations] načtení selhalo:", loadError.message);
    return (
      <main style={{ ...wrap, justifyContent: "center", textAlign: "center", gap: "1rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 700 }}>Moje prezentace</h1>
        <p style={{ color: "#fca5a5", maxWidth: "28rem" }}>
          Nepodařilo se načíst prezentace. Zkus to prosím za chvíli znovu.
        </p>
        <Link href="/account" style={{ color: "var(--muted)" }}>← zpět na účet</Link>
      </main>
    );
  }

  const list = presentations ?? [];

  return (
    <main style={wrap}>
      <div style={container}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <h1 style={{ fontSize: "1.7rem", fontWeight: 700 }}>Moje prezentace</h1>
          <Link href="/presentations/new" style={primaryBtn}>
            + Vytvořit novou
          </Link>
        </div>

        {created ? (
          <p
            style={{
              color: "#86efac",
              background: "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.3)",
              borderRadius: "8px",
              padding: "0.7rem 0.9rem",
            }}
          >
            Prezentace uložena jako koncept. ✅
          </p>
        ) : null}

        {list.length === 0 ? (
          <div
            style={{
              border: "1px dashed #334155",
              borderRadius: "12px",
              padding: "2.5rem 1.5rem",
              textAlign: "center",
              color: "var(--muted)",
            }}
          >
            <p style={{ marginBottom: "1rem" }}>
              Zatím tu nic není. Založ svou první prezentaci nemovitosti.
            </p>
            <Link href="/presentations/new" style={primaryBtn}>
              + Vytvořit první prezentaci
            </Link>
          </div>
        ) : (
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {list.map((p) => (
              <li
                key={p.id}
                style={{
                  border: "1px solid #1e293b",
                  borderRadius: "10px",
                  padding: "1rem 1.2rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "1rem",
                }}
              >
                <div>
                  <Link href={`/presentations/${p.id}/edit`} style={{ fontWeight: 600 }}>
                    {p.title || [p.street, p.city].filter(Boolean).join(", ") || "Bez názvu"}
                  </Link>
                  <div style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: "0.2rem" }}>
                    {[p.street, p.city].filter(Boolean).join(", ") || "adresa neuvedena"} · {formatPrice(p.price_czk)}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--accent)",
                      border: "1px solid #334155",
                      borderRadius: "999px",
                      padding: "0.2rem 0.7rem",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                  <Link
                    href={`/presentations/${p.id}/edit`}
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--foreground)",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                      padding: "0.35rem 0.8rem",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Upravit
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}

        <Link href="/account" style={{ color: "var(--muted)" }}>← zpět na účet</Link>
      </div>
    </main>
  );
}
