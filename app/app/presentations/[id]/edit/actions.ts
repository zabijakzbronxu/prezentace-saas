"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseBasicFields, isUuid, type FormState } from "@/lib/presentations/form";

/**
 * Uloží změny základních údajů existující prezentace.
 * RLS pouští update jen vlastníkovi; cizí/neexistující ID skončí hláškou, ne pádem.
 * Chyby vrací jako stav formuláře (useActionState) — vyplněné hodnoty zůstávají.
 */
export async function updatePresentation(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) redirect("/presentations");

  const parsed = parseBasicFields(formData);
  if (!parsed.ok) return { error: parsed.message };

  const { data, error } = await supabase
    .from("presentations")
    .update(parsed.values)
    .eq("id", id)
    .select("id")
    .single();

  if (error || !data) {
    console.error("[presentations/edit] uložení selhalo:", error?.message);
    return { error: "Uložení se nepovedlo. Zkontroluj vyplněné údaje a zkus to znovu." };
  }

  revalidatePath("/presentations");
  revalidatePath(`/presentations/${id}/edit`);
  redirect(`/presentations/${id}/edit?saved=1`);
}
