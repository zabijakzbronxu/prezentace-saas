"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { text, isUuid, MAX, parseContactFields } from "@/lib/presentations/form";

/**
 * Krok 3 průvodce: uloží texty prezentace (titulek, popis/příběh,
 * lokalita a okolí, vybavení a přednosti) a kontakt prodávajícího.
 * Serverová validace délek a formátů — délky hlídá i DB (CHECK omezení).
 */
export async function updateTexts(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) redirect("/presentations");

  const back = (query: string): never => {
    redirect(`/presentations/${id}/texts?${query}`);
  };

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
      back(
        `error=${encodeURIComponent(
          `Text v poli „${popis}" je moc dlouhý (max ${max} znaků).`,
        )}`,
      );
    }
  }

  const contact = parseContactFields(formData);
  if (!contact.ok) {
    redirect(`/presentations/${id}/texts?error=${encodeURIComponent(contact.message)}`);
  }

  const { data, error } = await supabase
    .from("presentations")
    .update({ title, description, location_text, features_text, ...contact.values })
    .eq("id", id)
    .select("id")
    .single();

  if (error || !data) {
    console.error("[presentations/texts] uložení selhalo:", error?.message);
    back(
      `error=${encodeURIComponent("Uložení textů se nepovedlo, zkus to prosím znovu.")}`,
    );
  }

  revalidatePath("/presentations");
  revalidatePath(`/presentations/${id}/texts`);
  back("saved=1");
}
