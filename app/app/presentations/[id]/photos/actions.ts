"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/presentations/form";
import { isMissingSchemaError } from "@/lib/db-errors";
import {
  PHOTOS_BUCKET,
  MAX_PHOTOS_PER_PRESENTATION,
  isValidPhotoPath,
} from "@/lib/photos";

// Operace nad fotkami běží v DB funkcích (migrace 20260707120000): celá změna
// pořadí/hero/limitu proběhne v jedné transakci pod zámkem na prezentaci,
// takže dvě záložky najednou nic nerozbijí. Funkce jsou SECURITY INVOKER —
// RLS volajícího platí i uvnitř (cizí data nejdou číst ani měnit).
//
// Chyby do stránky posíláme jako KÓD (ne volný text) — stránka si kód přeloží
// na pevnou českou hlášku. Nikdo tak nemůže podvrhnout vlastní text přes URL.

/**
 * Zapíše do DB fotku, kterou prohlížeč právě nahrál do Storage.
 * (Soubor jde z prohlížeče rovnou do Supabase Storage — přes server by nás
 * limitoval hosting na ~4,5 MB na požadavek.)
 * Vrací { ok, message } — volá ji client component (hlášky zobrazuje sám).
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

  const { error } = await supabase.rpc("register_presentation_photo", {
    p_presentation_id: presentationId,
    p_storage_path: storagePath,
  });

  if (error) {
    console.error("[photos] registrace fotky selhala:", error.message);
    // Zápis nedopadl → ukliď soubor ze Storage, ať tam neleží sirotek.
    const { error: cleanupError } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .remove([storagePath]);
    if (cleanupError) {
      console.error("[photos] úklid souboru selhal:", cleanupError.message);
    }

    if (error.message.includes("PHOTO_LIMIT")) {
      return {
        ok: false,
        message: `Prezentace už má nejvyšší povolený počet fotek (${MAX_PHOTOS_PER_PRESENTATION}).`,
      };
    }

    // HLASITĚ, ne potichu: chybějící DB funkce register_presentation_photo
    // (migrace 20260707120000) vypadala dřív jako obyčejné „nepovedlo se,
    // zkus to znovu" — a opakovaný pokus samozřejmě selhal taky.
    if (isMissingSchemaError(error)) {
      return {
        ok: false,
        message:
          "Databáze není dorovnaná — chybí v ní funkce pro ukládání fotek. " +
          "Spusť v Supabase → SQL Editor soubor app/supabase/APLIKUJ_VSE.sql.",
      };
    }

    return { ok: false, message: "Uložení fotky se nepovedlo, zkus to znovu." };
  }

  revalidatePath(`/presentations/${presentationId}/photos`);
  return { ok: true };
}

/**
 * Načte fotku přihlášeného uživatele (RLS).
 * Vrací i chybu — prázdný výsledek („fotka není moje") NENÍ totéž co rozbitý
 * dotaz (chybějící tabulka). Bez toho by nedorovnaná databáze uživatele jen
 * tiše vykopla na seznam prezentací.
 */
async function loadOwnPhoto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  photoId: string,
) {
  if (!isUuid(photoId)) return { photo: null, error: null };
  const { data, error } = await supabase
    .from("presentation_photos")
    .select("id, presentation_id, storage_path, is_hero, sort_order")
    .eq("id", photoId)
    .maybeSingle();
  return { photo: data, error };
}

/** Kódy chyb pro stránku fotek — texty drží photos/page.tsx. */
export type PhotosErrorCode = "delete-failed" | "move-failed" | "hero-failed" | "schema";

function backToPhotos(presentationId: string, errorCode?: PhotosErrorCode): never {
  redirect(
    `/presentations/${presentationId}/photos${errorCode ? `?error=${errorCode}` : ""}`,
  );
}

/** Prezentace, na kterou se máme vrátit — formuláře ji posílají skrytým polem. */
function backTarget(formData: FormData): string | null {
  const id = String(formData.get("presentation_id") ?? "");
  return isUuid(id) ? id : null;
}

/**
 * Nedorovnaná databáze (chybí tabulka/funkce pro fotky) → hlasitá hláška.
 * Když chybu pozná, přesměruje (redirect vyhazuje, takže se dál nepokračuje).
 * Jinak se nic nestane a kód běží dál.
 */
function bailOnMissingSchema(
  error: { code?: string | null; message?: string | null } | null,
  presentationId: string | null,
): void {
  if (!error || !isMissingSchemaError(error)) return;
  console.error("[photos] databáze není dorovnaná:", error.message);
  if (presentationId) backToPhotos(presentationId, "schema");
  redirect("/presentations");
}

/**
 * Smaže fotku: záznam v DB (atomicky vč. povýšení nové hero), pak soubor
 * ve Storage. Když se soubor nepovede smazat, jen se zaloguje — záznam už
 * je pryč a osiřelý soubor v privátním bucketu nikomu neškodí.
 */
export async function deletePhoto(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const back = backTarget(formData);
  const { photo, error: photoError } = await loadOwnPhoto(
    supabase,
    String(formData.get("photo_id") ?? ""),
  );
  bailOnMissingSchema(photoError, back);
  if (!photo) redirect("/presentations");

  const { data: removedPath, error } = await supabase.rpc("delete_presentation_photo", {
    p_photo_id: photo.id,
  });

  if (error) {
    console.error("[photos] smazání selhalo:", error.message);
    bailOnMissingSchema(error, photo.presentation_id);
    backToPhotos(photo.presentation_id, "delete-failed");
  }

  if (removedPath) {
    const { error: removeError } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .remove([removedPath]);
    if (removeError) {
      console.error("[photos] smazání souboru selhalo:", removeError.message);
    }
  }

  revalidatePath(`/presentations/${photo.presentation_id}/photos`);
  backToPhotos(photo.presentation_id);
}

/** Posune fotku v pořadí galerie nahoru/dolů (prohodí pořadí se sousedem). */
export async function movePhoto(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const back = backTarget(formData);
  const direction = String(formData.get("direction") ?? "");
  const { photo, error: photoError } = await loadOwnPhoto(
    supabase,
    String(formData.get("photo_id") ?? ""),
  );
  bailOnMissingSchema(photoError, back);
  if (!photo || (direction !== "up" && direction !== "down")) redirect("/presentations");

  const { data: neighbor, error: neighborError } = await supabase
    .from("presentation_photos")
    .select("id")
    .eq("presentation_id", photo.presentation_id)
    .filter("sort_order", direction === "up" ? "lt" : "gt", photo.sort_order)
    .order("sort_order", { ascending: direction === "down" })
    .limit(1)
    .maybeSingle();

  // Skutečná chyba dotazu NENÍ totéž co „na kraji galerie" (kde je neighbor
  // prázdný záměrně). Bez téhle větve by se chyba tvářila jako úspěch.
  if (neighborError) {
    console.error("[photos] hledání sousední fotky selhalo:", neighborError.message);
    bailOnMissingSchema(neighborError, photo.presentation_id);
    backToPhotos(photo.presentation_id, "move-failed");
  }

  // Na kraji galerie není s čím prohodit — v pořádku, jen se nic nestane.
  if (neighbor) {
    const { error } = await supabase.rpc("swap_photo_order", {
      p_photo_a: photo.id,
      p_photo_b: neighbor.id,
    });
    if (error) {
      console.error("[photos] změna pořadí selhala:", error.message);
      bailOnMissingSchema(error, photo.presentation_id);
      backToPhotos(photo.presentation_id, "move-failed");
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

  const back = backTarget(formData);
  const { photo, error: photoError } = await loadOwnPhoto(
    supabase,
    String(formData.get("photo_id") ?? ""),
  );
  bailOnMissingSchema(photoError, back);
  if (!photo) redirect("/presentations");

  if (!photo.is_hero) {
    const { error } = await supabase.rpc("set_hero_photo", { p_photo_id: photo.id });
    if (error) {
      console.error("[photos] nastavení hero selhalo:", error.message);
      bailOnMissingSchema(error, photo.presentation_id);
      backToPhotos(photo.presentation_id, "hero-failed");
    }
  }

  revalidatePath(`/presentations/${photo.presentation_id}/photos`);
  backToPhotos(photo.presentation_id);
}
