import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { isUuid } from "@/lib/presentations/form";
import { wrap, card, hint } from "../../../ui";
import { Waiting } from "./waiting";

export const dynamic = "force-dynamic";

/**
 * Návratová stránka po platbě.
 *
 * ZÁSADNÍ: tahle stránka NIC neodemyká. To, že se sem prohlížeč vrátil, nic
 * nedokazuje — adresu si může kdokoli napsat sám. Stránka jen PŘEČTE stav
 * prezentace z databáze. Zveřejnit ji mohl jedině webhook (nebo serverové
 * ověření přímo u Stripu přes tlačítko „Ověřit platbu").
 */
export default async function PublishDonePage({
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

  const { data: p } = await supabase
    .from("presentations")
    .select("id, slug, status, title, street, city")
    .eq("id", id)
    .maybeSingle();

  if (!p) redirect("/presentations");

  const nazev = p.title || [p.street, p.city].filter(Boolean).join(", ") || "Prezentace";
  const published = p.status === "published";

  return (
    <main style={wrap}>
      <div style={card}>
        <h1 style={{ fontSize: "1.7rem", fontWeight: 700 }}>
          {published ? "Hotovo — prezentace je venku 🎉" : "Děkujeme za platbu"}
        </h1>
        <p style={{ color: "var(--muted)" }}>{nazev}</p>

        {published ? (
          <div
            style={{
              border: "1px solid rgba(34,197,94,0.3)",
              background: "rgba(34,197,94,0.06)",
              borderRadius: "12px",
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <p>Tohle je veřejný odkaz — pošli ho zájemcům:</p>
            <Link
              href={`/listing/${p.slug}`}
              target="_blank"
              style={{ color: "var(--accent)", fontWeight: 600, wordBreak: "break-all" }}
            >
              /listing/{p.slug} ↗
            </Link>
            <p style={hint}>
              Prezentaci můžeš dál upravovat, změny se projeví hned a znovu se neplatí.
              Účtenku ti poslal Stripe e-mailem.
            </p>
          </div>
        ) : (
          <Waiting presentationId={p.id} />
        )}

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <Link href="/presentations" style={{ color: "var(--muted)" }}>
            ← Moje prezentace
          </Link>
          <Link href={`/presentations/${p.id}/publish`} style={{ color: "var(--muted)" }}>
            Zpět na zveřejnění
          </Link>
        </div>
      </div>
    </main>
  );
}
