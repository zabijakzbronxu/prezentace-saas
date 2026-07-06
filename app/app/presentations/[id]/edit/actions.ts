"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseBasicFields, isUuid } from "@/lib/presentations/form";

/**
 * Uloží změny základních údajů existující prezentace.
 * RLS pouští update jen vlastníkovi; cizí/neexistující ID skončí hláškou, ne pádem.
 * Validace je stejná jako při založení (lib/presentations/form.ts).
 */
export async function updatePresentation(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) redirect("/presentations");

  const parsed = parseBasicFields(formData);
  if (!parsed.ok) {
    redirect(`/presentations/${id}/edit?error=${encodeURIComponent(parsed.message)}`);
  }

  const { data, error } = await supabase
    .from("presentations")
    .update(parsed.values)
    .eq("id", id)
    .select("id")
    .single();

  if (error || !data) {
    console.error("[presentations/edit] uložení selhalo:", error?.message);
    redirect(
      `/presentations/${id}/edit?error=${encodeURIComponent(
        "Uložení se nepovedlo. Zkontroluj vyplněné údaje a zkus to znovu.",
      )}`,
    );
  }

  revalidatePath("/presentations");
  revalidatePath(`/presentations/${id}/edit`);
  redirect(`/presentations/${id}/edit?saved=1`);
}
