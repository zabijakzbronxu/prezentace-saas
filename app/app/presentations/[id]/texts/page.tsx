import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { isUuid } from "@/lib/presentations/form";
import { isMissingSchemaError } from "@/lib/db-errors";
import { SchemaErrorScreen } from "../../../schema-error";
import { wrap, card, SuccessBox, WizardNav, PreviewLink } from "../../ui";
import { TextsForm } from "./form";

export const dynamic = "force-dynamic";

export default async function PresentationTextsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;

  if (!isSupabaseConfigured()) redirect("/presentations");
  if (!isUuid(id)) redirect("/presentations");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: p, error: loadError } = await supabase
    .from("presentations")
    .select(
      "id, slug, title, street, city, description, location_text, features_text, contact_name, contact_email, contact_phone",
    )
    .eq("id", id)
    .maybeSingle();

  if (loadError) {
    console.error("[presentations/texts] načtení selhalo:", loadError.message);
    // Chybějící sloupec (např. location_text) NENÍ „prezentace nenalezena".
    // Řekni to nahlas, ať uživatel neluští prázdnou stránku.
    if (isMissingSchemaError(loadError)) {
      return <SchemaErrorScreen detail={loadError.message} />;
    }
  }
  if (!p) {
    return (
      <main style={{ ...wrap, justifyContent: "center", textAlign: "center", gap: "1rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 700 }}>Prezentace nenalezena</h1>
        <p style={{ color: "var(--muted)", maxWidth: "28rem" }}>
          Buď neexistuje, nebo nepatří k tvému účtu.
        </p>
        <Link href="/presentations" style={{ color: "var(--accent)" }}>
          ← zpět na Moje prezentace
        </Link>
      </main>
    );
  }

  // Předvyplnění kontaktu z profilu (jen když je kontakt prezentace celý prázdný).
  // Nic se neukládá samo — uživatel to vidí ve formuláři a ukládá tlačítkem.
  let contactDefaults = {
    contact_name: p.contact_name ?? "",
    contact_phone: p.contact_phone ?? "",
    contact_email: p.contact_email ?? "",
  };
  let contactPrefilled = false;
  if (!p.contact_name && !p.contact_phone && !p.contact_email) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.full_name || profile?.phone || user.email) {
      contactDefaults = {
        contact_name: profile?.full_name ?? "",
        contact_phone: profile?.phone ?? "",
        contact_email: user.email ?? "",
      };
      contactPrefilled = true;
    }
  }

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
            <WizardNav presentationId={p.id} current="texts" />
            <PreviewLink slug={p.slug} />
          </div>
          <h1 style={{ fontSize: "1.7rem", fontWeight: 700 }}>
            {p.title || [p.street, p.city].filter(Boolean).join(", ") || "Prezentace"}
          </h1>
          <p style={{ color: "var(--muted)" }}>
            Krok 3 · Texty a kontakt. Piš, jako bys o bydlení vyprávěl(a) známým — co
            se vám tu žilo dobře, co je kolem, co kupující ocení. Všechno je nepovinné
            a jde kdykoli doplnit.
          </p>
        </div>

        {saved ? <SuccessBox>Texty uloženy. ✅</SuccessBox> : null}

        <TextsForm
          presentationId={p.id}
          contactPrefilled={contactPrefilled}
          defaults={{
            title: p.title ?? "",
            description: p.description ?? "",
            location_text: p.location_text ?? "",
            features_text: p.features_text ?? "",
            ...contactDefaults,
          }}
        />
      </div>
    </main>
  );
}
