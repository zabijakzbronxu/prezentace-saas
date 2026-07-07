"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/presentations/form";
import { PHOTOS_BUCKET } from "@/lib/photos";

/**
 * Smaže celou prezentaci včetně fotek.
 * RLS pustí smazání jen vlastníkovi. Pořadí: napřed si vezmeme seznam cest
 * k souborům, pak smažeme řádek v DB (fotky a platby odstraní kaskáda),
 * nakonec uklidíme soubory ve Storage — když se úklid nepovede, jen se
 * zaloguje (osiřelý soubor v privátním bucketu nikomu neškodí).
 */
export async function deletePresentation(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) redirect("/presentations");

  const { data: photos } = await supabase
    .from("presentation_photos")
    .select("storage_path")
    .eq("presentation_id", id);

  const { data: deleted, error } = await supabase
    .from("presentations")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !deleted) {
    console.error("[presentations] smazání selhalo:", error?.message);
    redirect(
      `/presentations?error=${encodeURIComponent(
        "Smazání prezentace se nepovedlo, zkus to prosím znovu.",
      )}`,
    );
  }

  if (photos && photos.length > 0) {
    const { error: removeError } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .remove(photos.map((p) => p.storage_path));
    if (removeError) {
      console.error("[presentations] úklid fotek ve Storage selhal:", removeError.message);
    }
  }

  revalidatePath("/presentations");
  redirect("/presentations?deleted=1");
}
