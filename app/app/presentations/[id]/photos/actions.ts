"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/presentations/form";
import {
  PHOTOS_BUCKET,
  MAX_PHOTOS_PER_PRESENTATION,
  isValidPhotoPath,
} from "@/lib/photos";

/**
 * Zapíše do DB fotku, kterou prohlížeč právě nahrál do Storage.
 * (Soubor jde z prohlížeče rovnou do Supabase Storage — přes server by nás
 * limitoval hosting na ~4,5 MB na požadavek.)
 *
 * Vrací { ok, message } místo redirectu — volá ji client component.
 * Pojistky: cesta musí patřit přihlášenému uživateli a téhle prezentaci
 * (nikdo si nemůže „přivlastnit" cizí soubor), limit počtu fotek.
 */
export async function registerPhoto(
  presentationId: string,
  storagePath: string,
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Nejsi přihlášený/á." };

  if (!isUuid(presentationId) || !isValidPhotoPath(storagePath, user.id, presentationId)) {
    return { ok: false, message: "Neplatná fotka, zkus ji nahrát znovu." };
  }

  // Uklidí soubor ze Storage, když se zápis do DB nepovede (ať tam neleží sirotci).
  const cleanupStorage = async () => {
    const { error } = await supabase.storage.from(PHOTOS_BUCKET).remove([storagePath]);
    if (error) console.error("[photos] úklid souboru selhal:", error.message);
  };

  // RLS: vrátí jen vlastní prezentaci.
  const { data: presentation } = await supabase
    .from("presentations")
    .select("id")
    .eq("id", presentationId)
    .maybeSingle();
  if (!presentation) {
    await cleanupStorage();
    return { ok: false, message: "Prezentace nenalezena." };
  }

  const { data: photos, error: photosError } = await supabase
    .from("presentation_photos")
    .select("id, sort_order, is_hero")
    .eq("presentation_id", presentationId);
  if (photosError) {
    console.error("[photos] načtení fotek selhalo:", photosError.message);
    await cleanupStorage();
    return { ok: false, message: "Uložení fotky se nepovedlo, zkus to znovu." };
  }

  if ((photos?.length ?? 0) >= MAX_PHOTOS_PER_PRESENTATION) {
    await cleanupStorage();
    return {
      ok: false,
      message: `Prezentace už má nejvyšší povolený počet fotek (${MAX_PHOTOS_PER_PRESENTATION}).`,
    };
  }

  const nextSortOrder =
    (photos ?? []).reduce((max, p) => Math.max(max, p.sort_order), 0) + 1;
  const hasHero = (photos ?? []).some((p) => p.is_hero);

  const { error: insertError } = await supabase.from("presentation_photos").insert({
    presentation_id: presentationId,
    storage_path: storagePath,
    sort_order: nextSortOrder,
    is_hero: !hasHero, // první fotka prezentace se stane hlavní (hero)
  });

  if (insertError) {
    console.error("[photos] zápis fotky selhal:", insertError.message);
    await cleanupStorage();
    return { ok: false, message: "Uložení fotky se nepovedlo, zkus to znovu." };
  }

  revalidatePath(`/presentations/${presentationId}/photos`);
  return { ok: true };
}

/** Načte fotku přihlášeného uživatele (RLS), nebo null. */
async function loadOwnPhoto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  photoId: string,
) {
  if (!isUuid(photoId)) return null;
  const { data } = await supabase
    .from("presentation_photos")
    .select("id, presentation_id, storage_path, is_hero, sort_order")
    .eq("id", photoId)
    .maybeSingle();
  return data;
}

function backToPhotos(presentationId: string, query?: string): never {
  redirect(`/presentations/${presentationId}/photos${query ? `?${query}` : ""}`);
}

/**
 * Smaže fotku: napřed záznam v DB, pak soubor ve Storage.
 * Když byla hlavní (hero), povýší se první zbývající fotka v pořadí.
 */
export async function deletePhoto(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const photo = await loadOwnPhoto(supabase, String(formData.get("photo_id") ?? ""));
  if (!photo) redirect("/presentations");

  const { error: deleteError } = await supabase
    .from("presentation_photos")
    .delete()
    .eq("id", photo.id);
  if (deleteError) {
    console.error("[photos] smazání záznamu selhalo:", deleteError.message);
    backToPhotos(
      photo.presentation_id,
      `error=${encodeURIComponent("Smazání fotky se nepovedlo, zkus to znovu.")}`,
    );
  }

  // Soubor ve Storage: když se nepovede smazat, jen zalogovat — záznam už je pryč,
  // osiřelý soubor v privátním bucketu nikomu neškodí.
  const { error: removeError } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .remove([photo.storage_path]);
  if (removeError) {
    console.error("[photos] smazání souboru selhalo:", removeError.message);
  }

  if (photo.is_hero) {
    const { data: first } = await supabase
      .from("presentation_photos")
      .select("id")
      .eq("presentation_id", photo.presentation_id)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (first) {
      const { error: heroError } = await supabase
        .from("presentation_photos")
        .update({ is_hero: true })
        .eq("id", first.id);
      if (heroError) console.error("[photos] povýšení hero selhalo:", heroError.message);
    }
  }

  revalidatePath(`/presentations/${photo.presentation_id}/photos`);
  backToPhotos(photo.presentation_id);
}

/** Posune fotku v pořadí galerie nahoru/dolů (prohodí sort_order se sousedem). */
export async function movePhoto(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const direction = String(formData.get("direction") ?? "");
  const photo = await loadOwnPhoto(supabase, String(formData.get("photo_id") ?? ""));
  if (!photo || (direction !== "up" && direction !== "down")) redirect("/presentations");

  const { data: neighbor } = await supabase
    .from("presentation_photos")
    .select("id, sort_order")
    .eq("presentation_id", photo.presentation_id)
    .filter("sort_order", direction === "up" ? "lt" : "gt", photo.sort_order)
    .order("sort_order", { ascending: direction === "down" })
    .limit(1)
    .maybeSingle();

  // Na kraji galerie není s čím prohodit — v pořádku, jen se nic nestane.
  if (neighbor) {
    const [a, b] = await Promise.all([
      supabase
        .from("presentation_photos")
        .update({ sort_order: neighbor.sort_order })
        .eq("id", photo.id),
      supabase
        .from("presentation_photos")
        .update({ sort_order: photo.sort_order })
        .eq("id", neighbor.id),
    ]);
    if (a.error || b.error) {
      console.error(
        "[photos] změna pořadí selhala:",
        a.error?.message ?? b.error?.message,
      );
      backToPhotos(
        photo.presentation_id,
        `error=${encodeURIComponent("Změna pořadí se nepovedla, zkus to znovu.")}`,
      );
    }
  }

  revalidatePath(`/presentations/${photo.presentation_id}/photos`);
  backToPhotos(photo.presentation_id);
}

/** Nastaví fotku jako hlavní (hero). Původní hlavní se vrátí do galerie. */
export async function setHeroPhoto(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const photo = await loadOwnPhoto(supabase, String(formData.get("photo_id") ?? ""));
  if (!photo) redirect("/presentations");

  if (!photo.is_hero) {
    // Napřed sundat současnou hero (unikátní index dovolí jen jednu), pak nastavit novou.
    const { error: unsetError } = await supabase
      .from("presentation_photos")
      .update({ is_hero: false })
      .eq("presentation_id", photo.presentation_id)
      .eq("is_hero", true);
    const { error: setError } = unsetError
      ? { error: unsetError }
      : await supabase
          .from("presentation_photos")
          .update({ is_hero: true })
          .eq("id", photo.id);

    if (unsetError || setError) {
      console.error(
        "[photos] nastavení hero selhalo:",
        unsetError?.message ?? setError?.message,
      );
      backToPhotos(
        photo.presentation_id,
        `error=${encodeURIComponent("Nastavení hlavní fotky se nepovedlo, zkus to znovu.")}`,
      );
    }
  }

  revalidatePath(`/presentations/${photo.presentation_id}/photos`);
  backToPhotos(photo.presentation_id);
}
