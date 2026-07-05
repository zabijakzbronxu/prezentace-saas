"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify, randomSuffix } from "@/lib/slug";

/** Pomůcka: vezme hodnotu z formuláře, ořízne, prázdné → null. */
function text(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

/** Číslo z formuláře (povolí mezery a čárku), nebo null. */
function num(formData: FormData, key: string): number | null {
  const raw = text(formData, key);
  if (raw === null) return null;
  const cleaned = raw.replace(/\s/g, "").replace(",", ".").replace(/[^\d.]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function backWithError(message: string): never {
  redirect(`/presentations/new?error=${encodeURIComponent(message)}`);
}

/**
 * Krok 1 průvodce: založí novou prezentaci ve stavu "draft" (koncept).
 * Respektuje RLS — owner_id musí být přihlášený uživatel.
 */
export async function createPresentation(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const street = text(formData, "street");
  const city = text(formData, "city");
  const postal_code = text(formData, "postal_code");
  const property_type = text(formData, "property_type");
  const disposition = text(formData, "disposition");
  const energy_class = text(formData, "energy_class");
  const title = text(formData, "title");
  const price_czk = num(formData, "price_czk");
  const floor_area_m2 = num(formData, "floor_area_m2");
  const land_area_m2 = num(formData, "land_area_m2");

  // POVINNÉ: adresa (aspoň ulice nebo město) + platná cena
  if (!street && !city) {
    backWithError("Vyplň prosím adresu — aspoň ulici nebo město.");
  }
  if (price_czk === null || price_czk <= 0) {
    backWithError("Vyplň prosím platnou cenu v Kč.");
  }

  // Základ slugu z adresy (nebo z titulku), + náhodná přípona pro unikátnost.
  const base =
    slugify([street, city].filter(Boolean).join(" ")) ||
    slugify(title ?? "") ||
    "prezentace";

  // Vlož; při kolizi slugu (velmi nepravděpodobné) to párkrát zkus znovu.
  let lastMessage = "Uložení se nepovedlo, zkus to prosím znovu.";
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = `${base}-${randomSuffix()}`;
    const { data, error } = await supabase
      .from("presentations")
      .insert({
        owner_id: user.id,
        status: "draft",
        slug,
        title,
        property_type,
        street,
        city,
        postal_code,
        price_czk,
        disposition,
        floor_area_m2,
        land_area_m2,
        energy_class,
      })
      .select("id")
      .single();

    if (!error && data) {
      revalidatePath("/presentations");
      redirect(`/presentations?created=1`);
    }

    // 23505 = porušení unikátnosti (slug) → zkusit jiný slug
    if (error && error.code !== "23505") {
      lastMessage = error.message;
      break;
    }
    if (error) lastMessage = error.message;
  }

  backWithError(lastMessage);
}
