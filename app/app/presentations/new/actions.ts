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

/**
 * Číslo z formuláře. Povolí mezery jako oddělovač tisíců a čárku jako des. tečku.
 * Vrací null když prázdné. Vrací null i pro nesmyslný tvar ("1.2.3", "abc") —
 * nezahazujeme potichu zbytek jako dřív. Znaménko zachováváme (záporné se NEmění
 * potichu na kladné); rozsahy pak hlídá validace níž.
 */
function num(formData: FormData, key: string): number | null {
  const raw = text(formData, key);
  if (raw === null) return null;
  const normalized = raw.replace(/\s/g, "").replace(",", ".");
  // Povolený tvar: volitelné znaménko, číslice, nejvýš jedna desetinná tečka.
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

// Serverové limity (poslední pojistka; UI je jen pohodlí). Drží se DB CHECK omezení.
const MAX = {
  street: 200,
  city: 120,
  postal_code: 20,
  property_type: 60,
  disposition: 60,
  title: 200,
  price_czk: 10_000_000_000, // 10 mld Kč — horní rozumná mez
  area_m2: 1_000_000, // m²
} as const;

const ENERGY_CLASSES = new Set(["A", "B", "C", "D", "E", "F", "G"]);

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

  // Délky textů (serverová pojistka proti nekonečným vstupům)
  const lengthChecks: [string | null, number, string][] = [
    [street, MAX.street, "ulice"],
    [city, MAX.city, "město"],
    [postal_code, MAX.postal_code, "PSČ"],
    [property_type, MAX.property_type, "typ nemovitosti"],
    [disposition, MAX.disposition, "dispozice"],
    [title, MAX.title, "titulek"],
  ];
  for (const [val, max, popis] of lengthChecks) {
    if (val && val.length > max) {
      backWithError(`Text v poli „${popis}" je moc dlouhý (max ${max} znaků).`);
    }
  }

  // Energetická třída: jen A–G (nebo prázdné). Normalizuj na velké písmeno.
  let energy_class_norm = energy_class;
  if (energy_class_norm) {
    energy_class_norm = energy_class_norm.toUpperCase();
    if (!ENERGY_CLASSES.has(energy_class_norm)) {
      backWithError("Energetická třída musí být A až G (nebo nech prázdné).");
    }
  }

  // Cena: povinná, kladná, rozumný horní strop; ukládáme v celých Kč.
  if (price_czk === null || price_czk <= 0) {
    backWithError("Vyplň prosím platnou cenu v Kč (kladné číslo).");
  }
  if (price_czk > MAX.price_czk) {
    backWithError("Cena je nereálně vysoká, zkontroluj ji prosím.");
  }
  const price_czk_int = Math.round(price_czk);

  // Plochy: nezáporné, rozumný horní strop.
  if (floor_area_m2 !== null && (floor_area_m2 < 0 || floor_area_m2 > MAX.area_m2)) {
    backWithError("Užitná plocha musí být mezi 0 a 1 000 000 m².");
  }
  if (land_area_m2 !== null && (land_area_m2 < 0 || land_area_m2 > MAX.area_m2)) {
    backWithError("Plocha pozemku musí být mezi 0 a 1 000 000 m².");
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
        price_czk: price_czk_int,
        disposition,
        floor_area_m2,
        land_area_m2,
        energy_class: energy_class_norm,
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
