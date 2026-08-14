import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { isUuid } from "@/lib/presentations/form";
import { isMissingSchemaError } from "@/lib/db-errors";
import { SchemaErrorScreen } from "../../../schema-error";
import { wrap, card } from "../../ui";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("cs-CZ", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function InquiriesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isSupabaseConfigured()) redirect("/presentations");
  if (!isUuid(id)) redirect("/presentations");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: p, error: loadError } = await supabase
    .from("presentations")
    .select("id, title, street, city")
    .eq("id", id)
    .maybeSingle();

  if (loadError) {
    console.error("[inquiries] načtení prezentace selhalo:", loadError.message);
    if (isMissingSchemaError(loadError)) return <SchemaErrorScreen detail={loadError.message} />;
  }
  if (!p) {
    return (
      <main style={{ ...wrap, justifyContent: "center", textAlign: "center", gap: "1rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 700 }}>Prezentace nenalezena</h1>
        <Link href="/presentations" style={{ color: "var(--accent)" }}>
          ← zpět na Moje prezentace
        </Link>
      </main>
    );
  }

  const { data: rows, error: inqError } = await supabase
    .from("presentation_inquiries")
    .select("id, name, email, phone, message, created_at")
    .eq("presentation_id", p.id)
    .order("created_at", { ascending: false });

  if (inqError) {
    console.error("[inquiries] načtení poptávek selhalo:", inqError.message);
    if (isMissingSchemaError(inqError)) return <SchemaErrorScreen detail={inqError.message} />;
  }
  const inquiries = rows ?? [];
  const nazev = p.title || [p.street, p.city].filter(Boolean).join(", ") || "Prezentace";

  return (
    <main style={wrap}>
      <div style={{ ...card, width: "42rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <p style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
            <Link href={`/presentations/${p.id}/sections`} style={{ color: "var(--muted)" }}>
              Sekce
            </Link>{" "}
            / {nazev}
          </p>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700 }}>📨 Poptávky z formuláře</h1>
          <p style={{ color: "var(--muted)" }}>
            Zprávy, které vám lidé poslali přes kontaktní formulář na veřejné stránce.
            {inquiries.length > 0 ? ` Celkem: ${inquiries.length}.` : ""}
          </p>
        </div>

        {inquiries.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>
            Zatím žádné poptávky. Až někdo vyplní formulář na zveřejněné stránce, objeví se tady.
          </p>
        ) : (
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {inquiries.map((q) => (
              <li
                key={q.id}
                style={{
                  border: "1px solid #1e293b",
                  borderRadius: "10px",
                  padding: "0.9rem 1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.45rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                  <strong>{q.name}</strong>
                  <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                    {q.created_at ? dateFmt.format(new Date(q.created_at)) : ""}
                  </span>
                </div>
                <div style={{ fontSize: "0.85rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  {q.email ? (
                    <a href={`mailto:${q.email}`} style={{ color: "var(--accent)" }}>
                      {q.email}
                    </a>
                  ) : null}
                  {q.phone ? (
                    <a href={`tel:${q.phone.replace(/\s/g, "")}`} style={{ color: "var(--accent)" }}>
                      {q.phone}
                    </a>
                  ) : null}
                </div>
                <p style={{ whiteSpace: "pre-line", lineHeight: 1.6, margin: 0 }}>{q.message}</p>
              </li>
            ))}
          </ul>
        )}

        <div style={{ marginTop: "0.5rem" }}>
          <Link href={`/presentations/${p.id}/sections`} style={{ color: "var(--muted)" }}>
            ← zpět na sekce
          </Link>
        </div>
      </div>
    </main>
  );
}
