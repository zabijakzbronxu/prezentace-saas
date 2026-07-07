"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify, randomSuffix } from "@/lib/slug";
import { parseBasicFields, type FormState } from "@/lib/presentations/form";

/**
 * Krok 1 průvodce: založí novou prezentaci ve stavu "draft" (koncept).
 * Respektuje RLS — owner_id musí být přihlášený uživatel.
 * Chyby vrací jako stav formuláře (useActionState) — vyplněné hodnoty
 * ve formuláři zůstávají, nic se neztrácí přesměrováním.
 */
export async function createPresentation(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = parseBasicFields(formData);
  if (!parsed.ok) return { error: parsed.message };
  const values = parsed.values;

  // Základ slugu z adresy (nebo z titulku), + náhodná přípona pro unikátnost.
  const base =
    slugify([values.street, values.city].filter(Boolean).join(" ")) ||
    slugify(values.title ?? "") ||
    "prezentace";

  // Vlož; při kolizi slugu (velmi nepravděpodobné) to párkrát zkus znovu.
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = `${base}-${randomSuffix()}`;
    const { data, error } = await supabase
      .from("presentations")
      .insert({
        owner_id: user.id,
        status: "draft",
        slug,
        ...values,
      })
      .select("id")
      .single();

    if (!error && data) {
      revalidatePath("/presentations");
      // Pokračuj v průvodci na krok 2 (fotky) — tlačítko slibuje „Uložit a pokračovat".
      redirect(`/presentations/${data.id}/photos?created=1`);
    }

    // 23505 = porušení unikátnosti (slug) → zkusit jiný slug.
    // Jinou chybu zaloguj; uživateli patří česká hláška, ne syrová z databáze.
    if (error && error.code !== "23505") {
      console.error("[presentations/new] založení selhalo:", error.message);
      break;
    }
  }

  return { error: "Uložení se nepovedlo, zkus to prosím znovu." };
}
