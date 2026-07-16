"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/presentations/form";
import { isMissingSchemaError } from "@/lib/db-errors";
import { ownsPresentation } from "@/lib/presentations/otinska-sample";
import { designPath } from "@/lib/presentations/design";

// Inline uložení popisku JEDNÉ fotky přímo z vizuálního edit-modu galerie.
// Chybu vrací jako STAV (useActionState) → ukáže se u fotky a rozepsaný popisek
// zůstane (bez přesměrování; lesson 2026-07-07). Píše jen sloupec `caption`
// (žádné JSONB), stejný tvar zápisu jako `saveGallery` v sekčním editoru.

export type CaptionState = { ok?: boolean; error?: string };

/** Nejvýš tolik znaků popisku (shodně se `saveGallery`). */
const MAX_CAPTION = 300;

export async function savePhotoCaption(
  _prev: CaptionState,
  formData: FormData,
): Promise<CaptionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const presentationId = String(formData.get("presentation_id") ?? "");
  const photoId = String(formData.get("photo_id") ?? "");
  if (!isUuid(presentationId) || !isUuid(photoId)) {
    return { error: "Neplatná fotka — načti stránku prosím znovu." };
  }

  const rawCaption = String(formData.get("caption") ?? "").trim();
  const caption = rawCaption.length > 0 ? rawCaption.slice(0, MAX_CAPTION) : null;

  // Vlastnictví (druhá vrstva k RLS: published prezentace je veřejně čitelná,
  // takže sám SELECT nestačí — ověř owner_id explicitně, vzor seedOtinska).
  const { data: pres, error: loadError } = await supabase
    .from("presentations")
    .select("id, owner_id")
    .eq("id", presentationId)
    .maybeSingle();
  if (loadError) {
    console.error("[design] popisek: načtení prezentace selhalo:", loadError.message);
    if (isMissingSchemaError(loadError)) {
      return { error: "Databáze není dorovnaná — spusť app/supabase/APLIKUJ_VSE.sql." };
    }
    return { error: "Uložení popisku se nepovedlo, zkus to prosím znovu." };
  }
  if (!pres || !ownsPresentation(pres.owner_id, user.id)) {
    redirect("/presentations");
  }

  const { error } = await supabase
    .from("presentation_photos")
    .update({ caption })
    .eq("id", photoId)
    .eq("presentation_id", presentationId);
  if (error) {
    console.error("[design] popisek: uložení selhalo:", error.message);
    if (isMissingSchemaError(error)) {
      return { error: "Databáze není dorovnaná — spusť app/supabase/APLIKUJ_VSE.sql." };
    }
    return { error: "Uložení popisku se nepovedlo, zkus to prosím znovu." };
  }

  // Ať se po přepnutí do náhledu / refreshi ukáže nový popisek.
  revalidatePath(designPath(presentationId));
  return { ok: true };
}
