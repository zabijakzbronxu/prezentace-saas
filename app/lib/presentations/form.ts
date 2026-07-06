// Sdílená serverová validace formuláře prezentace (krok 1 — základní údaje).
// Používá ji založení (presentations/new) i editace (presentations/[id]/edit),
// aby obě cesty hlídaly úplně stejná pravidla. Drží se DB CHECK omezení.

/** Pomůcka: vezme hodnotu z formuláře, ořízne, prázdné → null. */
export function text(formData: FormData, key: string): string | null {
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
export function num(formData: FormData, key: string): number | null {
  const raw = text(formData, key);
  if (raw === null) return null;
  const normalized = raw.replace(/\s/g, "").replace(",", ".");
  // Povolený tvar: volitelné znaménko, číslice, nejvýš jedna desetinná tečka.
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

// Serverové limity (poslední pojistka; UI je jen pohodlí). Drží se DB CHECK omezení.
export const MAX = {
  street: 200,
  city: 120,
  postal_code: 20,
  property_type: 60,
  disposition: 60,
  title: 200,
  description: 5000,
  location_text: 5000,
  features_text: 5000,
  price_czk: 10_000_000_000, // 10 mld Kč — horní rozumná mez
  area_m2: 1_000_000, // m²
} as const;

export const ENERGY_CLASSES = new Set(["A", "B", "C", "D", "E", "F", "G"]);

/** Hodnoty základních údajů po validaci (krok 1 průvodce). */
export type BasicFields = {
  street: string | null;
  city: string | null;
  postal_code: string | null;
  property_type: string | null;
  disposition: string | null;
  energy_class: string | null;
  title: string | null;
  price_czk: number; // celé Kč, povinné
  floor_area_m2: number | null;
  land_area_m2: number | null;
};

export type ParseResult<T> =
  | { ok: true; values: T }
  | { ok: false; message: string };

/**
 * Přečte a zvaliduje základní údaje prezentace z formuláře.
 * Vrací buď hodnoty připravené k uložení, nebo českou chybovou hlášku.
 */
export function parseBasicFields(formData: FormData): ParseResult<BasicFields> {
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
    return { ok: false, message: "Vyplň prosím adresu — aspoň ulici nebo město." };
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
      return {
        ok: false,
        message: `Text v poli „${popis}" je moc dlouhý (max ${max} znaků).`,
      };
    }
  }

  // Energetická třída: jen A–G (nebo prázdné). Normalizuj na velké písmeno.
  let energy_class_norm = energy_class;
  if (energy_class_norm) {
    energy_class_norm = energy_class_norm.toUpperCase();
    if (!ENERGY_CLASSES.has(energy_class_norm)) {
      return { ok: false, message: "Energetická třída musí být A až G (nebo nech prázdné)." };
    }
  }

  // Cena: povinná, kladná, rozumný horní strop; ukládáme v celých Kč.
  if (price_czk === null || price_czk <= 0) {
    return { ok: false, message: "Vyplň prosím platnou cenu v Kč (kladné číslo)." };
  }
  if (price_czk > MAX.price_czk) {
    return { ok: false, message: "Cena je nereálně vysoká, zkontroluj ji prosím." };
  }

  // Plochy: nezáporné, rozumný horní strop.
  if (floor_area_m2 !== null && (floor_area_m2 < 0 || floor_area_m2 > MAX.area_m2)) {
    return { ok: false, message: "Užitná plocha musí být mezi 0 a 1 000 000 m²." };
  }
  if (land_area_m2 !== null && (land_area_m2 < 0 || land_area_m2 > MAX.area_m2)) {
    return { ok: false, message: "Plocha pozemku musí být mezi 0 a 1 000 000 m²." };
  }

  return {
    ok: true,
    values: {
      street,
      city,
      postal_code,
      property_type,
      disposition,
      energy_class: energy_class_norm,
      title,
      price_czk: Math.round(price_czk),
      floor_area_m2,
      land_area_m2,
    },
  };
}

/** Je řetězec platné UUID? (pojistka, než s ID půjdeme do DB nebo do URL) */
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
