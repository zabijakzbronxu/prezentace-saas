import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { isUuid } from "@/lib/presentations/form";
import { formatPrice } from "@/lib/format";
import { resolvePriceConfig } from "@/lib/payments/config";
import { isMissingSchemaError } from "@/lib/db-errors";
import { SchemaErrorScreen } from "../../../schema-error";
import { wrap, card, hint, ErrorBox, SuccessBox, WizardNav, PreviewLink } from "../../ui";
import { PublishForm } from "./publish-form";

export const dynamic = "force-dynamic";

export default async function PublishPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ stav?: string }>;
}) {
  const { id } = await params;
  const { stav } = await searchParams;

  if (!isSupabaseConfigured()) redirect("/presentations");
  if (!isUuid(id)) redirect("/presentations");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: p, error: loadError } = await supabase
    .from("presentations")
    .select("id, slug, status, title, street, city, price_czk")
    .eq("id", id)
    .maybeSingle();

  if (loadError) {
    console.error("[publish] načtení prezentace selhalo:", loadError.message);
    if (isMissingSchemaError(loadError)) {
      return <SchemaErrorScreen detail={loadError.message} />;
    }
  }
  if (!p) {
    return (
      <main style={{ ...wrap, justifyContent: "center", textAlign: "center", gap: "1rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 700 }}>Prezentace nenalezena</h1>
        <p style={{ color: "var(--muted)" }}>Buď neexistuje, nebo nepatří k tvému účtu.</p>
        <Link href="/presentations" style={{ color: "var(--accent)" }}>
          ← zpět na Moje prezentace
        </Link>
      </main>
    );
  }

  const nazev = p.title || [p.street, p.city].filter(Boolean).join(", ") || "Prezentace";
  const price = resolvePriceConfig(process.env);
  const isPublished = p.status === "published";

  // Kolik má fotek — bez fotek vypadá prezentace smutně, ale nebráníme v tom.
  const { count: photoCount } = await supabase
    .from("presentation_photos")
    .select("id", { count: "exact", head: true })
    .eq("presentation_id", id);

  return (
    <main style={wrap}>
      <div style={card}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <WizardNav presentationId={p.id} current="publish" />
            <PreviewLink slug={p.slug} />
          </div>
          <h1 style={{ fontSize: "1.7rem", fontWeight: 700 }}>{nazev}</h1>
          <p style={{ color: "var(--muted)" }}>
            Krok 4 · Zveřejnění. Zaplatíš jednorázově a prezentace se objeví na veřejné
            adrese, kterou můžeš poslat zájemcům. Do té doby ji vidíš jen ty.
          </p>
        </div>

        {stav === "zruseno" ? (
          <ErrorBox>
            Platbu jsi nedokončil(a) — nic jsme ti neúčtovali. Prezentace zůstává
            konceptem a můžeš to kdykoli zkusit znovu.
          </ErrorBox>
        ) : null}
        {stav === "uz-publikovano" ? (
          <SuccessBox>Tahle prezentace už je zveřejněná. ✅</SuccessBox>
        ) : null}

        {isPublished ? (
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
            <strong style={{ color: "#86efac", fontSize: "1.1rem" }}>
              Zveřejněno ✅
            </strong>
            <p style={{ color: "var(--muted)" }}>
              Prezentace je veřejně dostupná. Tohle je odkaz, který můžeš poslat
              zájemcům:
            </p>
            <Link
              href={`/listing/${p.slug}`}
              target="_blank"
              style={{ color: "var(--accent)", fontWeight: 600, wordBreak: "break-all" }}
            >
              /listing/{p.slug} ↗
            </Link>
            <p style={hint}>
              Upravovat ji můžeš dál — změny se na veřejné stránce projeví hned a
              znovu se za to neplatí.
            </p>
          </div>
        ) : (
          <>
            <div
              style={{
                border: "1px solid #1e293b",
                borderRadius: "12px",
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <span>Zveřejnění prezentace</span>
                <strong style={{ whiteSpace: "nowrap" }}>
                  {price.ok ? formatPrice(price.config.amountCzk) : "—"}
                </strong>
              </div>
              <p style={hint}>
                Jednorázově, včetně DPH. Platí se kartou přes Stripe — my se k číslu
                tvé karty vůbec nedostaneme. Po zaplacení se prezentace zveřejní sama.
              </p>
              <p style={hint}>
                Prezentace: <strong>{nazev}</strong>
                {p.price_czk ? ` · cena nemovitosti ${formatPrice(p.price_czk)}` : ""}
                {` · ${photoCount ?? 0} ${fotekLabel(photoCount ?? 0)}`}
              </p>
            </div>

            {(photoCount ?? 0) === 0 ? (
              <p
                style={{
                  ...hint,
                  border: "1px dashed #334155",
                  borderRadius: "8px",
                  padding: "0.7rem 0.9rem",
                }}
              >
                Zatím nemáš žádné fotky. Zveřejnit to jde, ale prezentace bez fotek
                zájemce moc nezaujme —{" "}
                <Link href={`/presentations/${p.id}/photos`} style={{ color: "var(--accent)" }}>
                  doplnit fotky
                </Link>
                .
              </p>
            ) : null}

            {price.ok ? (
              <PublishForm
                presentationId={p.id}
                priceLabel={formatPrice(price.config.amountCzk)}
              />
            ) : (
              <ErrorBox>
                Cena za zveřejnění není správně nastavená, platbu teď nejde spustit.
                Napiš prosím správci.
              </ErrorBox>
            )}
          </>
        )}

        <Link href={`/presentations/${p.id}/texts`} style={{ color: "var(--muted)" }}>
          ← zpět na texty
        </Link>
      </div>
    </main>
  );
}

function fotekLabel(n: number): string {
  if (n === 1) return "fotka";
  if (n >= 2 && n <= 4) return "fotky";
  return "fotek";
}
