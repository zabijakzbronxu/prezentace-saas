"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  text,
  isUuid,
  MAX,
  parseContactFields,
  type FormState,
} from "@/lib/presentations/form";

/**
 * Krok 3 průvodce: uloží texty prezentace (titulek, popis/příběh,
 * lokalita a okolí, vybavení a přednosti) a kontakt prodávajícího.
 * Serverová validace délek a formátů — délky hlídá i DB (CHECK omezení).
 * Chyby vrací jako stav formuláře (useActionState) — rozepsané texty
 * ve formuláři zůstávají, nic se neztrácí přesměrováním.
 */
export async function updateTexts(
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

  const title = text(formData, "title");
  const description = text(formData, "description");
  const location_text = text(formData, "location_text");
  const features_text = text(formData, "features_text");

  const lengthChecks: [string | null, number, string][] = [
    [title, MAX.title, "titulek"],
    [description, MAX.description, "popis a příběh"],
    [location_text, MAX.location_text, "lokalita a okolí"],
    [features_text, MAX.features_text, "vybavení a přednosti"],
  ];
  for (const [val, max, popis] of lengthChecks) {
    if (val && val.length > max) {
      return { error: `Text v poli „${popis}" je moc dlouhý (max ${max} znaků).` };
    }
  }

  const contact = parseContactFields(formData);
  if (!contact.ok) return { error: contact.message };

  const { data, error } = await supabase
    .from("presentations")
    .update({ title, description, location_text, features_text, ...contact.values })
    .eq("id", id)
    .select("id")
    .single();

  if (error || !data) {
    console.error("[presentations/texts] uložení selhalo:", error?.message);
    return { error: "Uložení textů se nepovedlo, zkus to prosím znovu." };
  }

  revalidatePath("/presentations");
  revalidatePath(`/presentations/${id}/texts`);
  redirect(`/presentations/${id}/texts?saved=1`);
}
