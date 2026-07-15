"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/database.types";
import { isUuid } from "@/lib/presentations/form";
import { isMissingSchemaError } from "@/lib/db-errors";
import { isReadyKind, isSectionKind } from "@/lib/presentations/sections";
import {
  OTINSKA_PRESENTATION_FIELDS,
  OTINSKA_SECTION_SEEDS,
  isSeedAllowed,
  ownsPresentation,
} from "@/lib/presentations/otinska-sample";

// Řazení/zapínání/přidávání sekcí běží v DB funkcích (migrace 20260715120000):
// celá změna proběhne v jedné transakci pod zámkem na prezentaci, takže dvě
// záložky najednou nevyrobí duplicitní pořadí. Funkce jsou SECURITY INVOKER —
// RLS volajícího platí i uvnitř (cizí prezentaci needituje).
//
// Chyby do stránky posíláme jako KÓD (ne volný text) — stránka si kód přeloží
// na pevnou českou hlášku. Přes URL tak nikdo nepodvrhne vlastní text.

export type SectionsErrorCode =
  | "add-failed"
  | "move-failed"
  | "toggle-failed"
  | "delete-failed"
  | "singleton"
  | "kind"
  | "seed-not-empty"
  | "seed-failed"
  | "schema";

function backToSections(presentationId: string, errorCode?: SectionsErrorCode): never {
  redirect(
    `/presentations/${presentationId}/sections${errorCode ? `?error=${errorCode}` : ""}`,
  );
}

function targetId(formData: FormData): string | null {
  const id = String(formData.get("presentation_id") ?? "");
  return isUuid(id) ? id : null;
}

/** Nedorovnaná databáze (chybí funkce/tabulka sekcí) → hlasitě, ne potichu. */
function bailOnMissingSchema(
  error: { code?: string | null; message?: string | null } | null,
  presentationId: string | null,
): void {
  if (!error || !isMissingSchemaError(error)) return;
  console.error("[sections] databáze není dorovnaná:", error.message);
  if (presentationId) backToSections(presentationId, "schema");
  redirect("/presentations");
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return supabase;
}

/** Přidá novou sekci daného typu na konec seznamu. */
export async function addSection(formData: FormData) {
  const supabase = await requireUser();

  const presentationId = targetId(formData);
  const kind = String(formData.get("kind") ?? "");
  if (!presentationId) redirect("/presentations");
  if (!isSectionKind(kind) || !isReadyKind(kind)) {
    backToSections(presentationId, "kind");
  }

  const { error } = await supabase.rpc("add_presentation_section", {
    p_presentation_id: presentationId,
    p_kind: kind,
  });

  if (error) {
    console.error("[sections] přidání sekce selhalo:", error.message);
    bailOnMissingSchema(error, presentationId);
    if (error.message.includes("SECTION_SINGLETON")) {
      backToSections(presentationId, "singleton");
    }
    if (error.message.includes("SECTION_KIND_NOT_ALLOWED")) {
      backToSections(presentationId, "kind");
    }
    backToSections(presentationId, "add-failed");
  }

  revalidatePath(`/presentations/${presentationId}/sections`);
  backToSections(presentationId);
}

/** Posune sekci v pořadí nahoru/dolů. */
export async function moveSection(formData: FormData) {
  const supabase = await requireUser();

  const presentationId = targetId(formData);
  const sectionId = String(formData.get("section_id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (!presentationId) redirect("/presentations");
  if (!isUuid(sectionId) || (direction !== "up" && direction !== "down")) {
    backToSections(presentationId, "move-failed");
  }

  const { error } = await supabase.rpc("move_presentation_section", {
    p_section_id: sectionId,
    p_direction: direction,
  });

  if (error) {
    console.error("[sections] změna pořadí selhala:", error.message);
    bailOnMissingSchema(error, presentationId);
    backToSections(presentationId, "move-failed");
  }

  revalidatePath(`/presentations/${presentationId}/sections`);
  backToSections(presentationId);
}

/** Zapne/vypne sekci. */
export async function toggleSection(formData: FormData) {
  const supabase = await requireUser();

  const presentationId = targetId(formData);
  const sectionId = String(formData.get("section_id") ?? "");
  const enabled = String(formData.get("enabled") ?? "") === "true";
  if (!presentationId) redirect("/presentations");
  if (!isUuid(sectionId)) backToSections(presentationId, "toggle-failed");

  const { error } = await supabase.rpc("set_presentation_section_enabled", {
    p_section_id: sectionId,
    p_enabled: enabled,
  });

  if (error) {
    console.error("[sections] přepnutí sekce selhalo:", error.message);
    bailOnMissingSchema(error, presentationId);
    backToSections(presentationId, "toggle-failed");
  }

  revalidatePath(`/presentations/${presentationId}/sections`);
  backToSections(presentationId);
}

/** Smaže sekci (obsah v JSONB jde s ní; navázané tabulky mají cascade). */
export async function deleteSection(formData: FormData) {
  const supabase = await requireUser();

  const presentationId = targetId(formData);
  const sectionId = String(formData.get("section_id") ?? "");
  if (!presentationId) redirect("/presentations");
  if (!isUuid(sectionId)) backToSections(presentationId, "delete-failed");

  const { error } = await supabase.rpc("delete_presentation_section", {
    p_section_id: sectionId,
  });

  if (error) {
    console.error("[sections] smazání sekce selhalo:", error.message);
    bailOnMissingSchema(error, presentationId);
    backToSections(presentationId, "delete-failed");
  }

  revalidatePath(`/presentations/${presentationId}/sections`);
  backToSections(presentationId);
}

/**
 * Naplní PRÁZDNOU prezentaci přihlášeného uživatele ukázkovým obsahem Otínská.
 * - Vlastnictví: RLS + explicitní kontrola `owner_id == user.id` (published cizí
 *   prezentace jde přečíst veřejně → sám SELECT by nestačil).
 * - Idempotence: plní JEN prezentaci bez jediné sekce; jinak odmítne (nepřepíše práci).
 * - Nejdřív pole prezentace (hero/parametry/kontakt/texty), pak sekce přímým insertem
 *   (integritu jistí DB trigger whitelistu + unikátní index na singletony).
 * - Žádné tiché selhání: chyba → kód do URL, stránka ukáže hlášku.
 */
export async function seedOtinska(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const presentationId = targetId(formData);
  if (!presentationId) redirect("/presentations");

  // Vlastnictví (druhá vrstva k RLS).
  const { data: pres, error: loadError } = await supabase
    .from("presentations")
    .select("id, owner_id")
    .eq("id", presentationId)
    .maybeSingle();
  if (loadError) {
    console.error("[sections] seed: načtení prezentace selhalo:", loadError.message);
    bailOnMissingSchema(loadError, presentationId);
    backToSections(presentationId, "seed-failed");
  }
  if (!pres || !ownsPresentation(pres.owner_id, user.id)) {
    redirect("/presentations");
  }

  // Idempotence: jen úplně prázdná prezentace (žádná sekce).
  const { data: existing, error: countError } = await supabase
    .from("presentation_sections")
    .select("id")
    .eq("presentation_id", presentationId)
    .limit(1);
  if (countError) {
    console.error("[sections] seed: kontrola sekcí selhala:", countError.message);
    bailOnMissingSchema(countError, presentationId);
    backToSections(presentationId, "seed-failed");
  }
  if (!isSeedAllowed(existing?.length ?? 0)) {
    backToSections(presentationId, "seed-not-empty");
  }

  // 1) Pole na řádku prezentace (hero, parametry, kontakt, texty, GPS).
  const { error: fieldsError } = await supabase
    .from("presentations")
    .update(OTINSKA_PRESENTATION_FIELDS)
    .eq("id", presentationId);
  if (fieldsError) {
    console.error("[sections] seed: uložení údajů prezentace selhalo:", fieldsError.message);
    bailOnMissingSchema(fieldsError, presentationId);
    backToSections(presentationId, "seed-failed");
  }

  // 2) Sekce v pořadí. Přímý insert — DB trigger/index odmítne cokoli nepovoleného.
  const rows = OTINSKA_SECTION_SEEDS.map((seed, index) => ({
    presentation_id: presentationId,
    kind: seed.kind,
    position: index,
    enabled: true,
    content: seed.content as unknown as Json,
  }));
  const { error: insertError } = await supabase.from("presentation_sections").insert(rows);
  if (insertError) {
    console.error("[sections] seed: vložení sekcí selhalo:", insertError.message);
    bailOnMissingSchema(insertError, presentationId);
    backToSections(presentationId, "seed-failed");
  }

  revalidatePath(`/presentations/${presentationId}/sections`);
  redirect(`/presentations/${presentationId}/sections?seeded=1`);
}
