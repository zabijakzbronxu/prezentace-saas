import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createPresentation } from "./actions";
import { wrap, card, hint } from "../ui";
import { BasicFieldsForm } from "../basic-form";

export const dynamic = "force-dynamic";

export default async function NewPresentationPage() {
  if (!isSupabaseConfigured()) {
    return (
      <main style={{ ...wrap, justifyContent: "center", textAlign: "center", gap: "1rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 700 }}>Nová prezentace</h1>
        <p style={{ color: "var(--muted)", maxWidth: "28rem" }}>
          Tvorba prezentací zatím není zapnutá (chybí napojení na Supabase).
        </p>
        <Link href="/" style={{ color: "var(--accent)" }}>← zpět na úvod</Link>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main style={wrap}>
      <div style={card}>
        <div>
          <p style={{ ...hint, marginBottom: "0.25rem" }}>Krok 1 z 3 · Základní údaje</p>
          <h1 style={{ fontSize: "1.7rem", fontWeight: 700 }}>Nová prezentace nemovitosti</h1>
          <p style={{ color: "var(--muted)", marginTop: "0.5rem" }}>
            Vyplň, co víš. Povinné jsou jen <strong>adresa</strong> a{" "}
            <strong>cena</strong> — zbytek můžeš doplnit později.
          </p>
        </div>

        <BasicFieldsForm
          action={createPresentation}
          submitLabel="Uložit a pokračovat"
          titleHint="Nepovinné — krátký poutavý název. Když ho necháš prázdný, doplníme později."
          footer={
            <Link href="/presentations" style={{ color: "var(--muted)" }}>
              Zrušit
            </Link>
          }
        />
      </div>
    </main>
  );
}
