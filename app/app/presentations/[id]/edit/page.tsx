import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { isUuid } from "@/lib/presentations/form";
import { isMissingSchemaError } from "@/lib/db-errors";
import { SchemaErrorScreen } from "../../../schema-error";
import { updatePresentation } from "./actions";
import { wrap, card, SuccessBox, WizardNav, PreviewLink } from "../../ui";
import { BasicFieldsForm } from "../../basic-form";

export const dynamic = "force-dynamic";

export default async function EditPresentationPage({
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

  // RLS: vrátí jen vlastní prezentaci. Cizí/neexistující → data null.
  const { data: p, error: loadError } = await supabase
    .from("presentations")
    .select(
      "id, slug, title, street, city, postal_code, property_type, disposition, price_czk, floor_area_m2, land_area_m2, energy_class, status",
    )
    .eq("id", id)
    .maybeSingle();

  if (loadError) {
    console.error("[presentations/edit] načtení selhalo:", loadError.message);
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
            <WizardNav presentationId={p.id} current="edit" />
            <PreviewLink slug={p.slug} />
          </div>
          <h1 style={{ fontSize: "1.7rem", fontWeight: 700 }}>
            {p.title || [p.street, p.city].filter(Boolean).join(", ") || "Prezentace"}
          </h1>
          <p style={{ color: "var(--muted)" }}>
            Krok 1 · Základní údaje. Povinné jsou jen <strong>adresa</strong> a{" "}
            <strong>cena</strong>.
          </p>
        </div>

        {saved ? <SuccessBox>Změny uloženy. ✅</SuccessBox> : null}

        <BasicFieldsForm
          action={updatePresentation}
          hiddenId={p.id}
          defaults={p}
          submitLabel="Uložit změny"
          titleHint="Nepovinné — krátký poutavý název. Podrobněji ho vyladíš v kroku 3 (Texty)."
          footer={
            <>
              <Link href={`/presentations/${p.id}/photos`} style={{ color: "var(--accent)" }}>
                Pokračovat na fotky →
              </Link>
              <Link href="/presentations" style={{ color: "var(--muted)" }}>
                Zpět na seznam
              </Link>
            </>
          }
        />
      </div>
    </main>
  );
}
