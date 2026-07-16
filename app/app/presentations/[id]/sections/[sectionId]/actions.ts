"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/database.types";
import { text, num, isUuid, MAX, type FormState } from "@/lib/presentations/form";
import { isMissingSchemaError } from "@/lib/db-errors";
import {
  DOCUMENTS_BUCKET,
  MAX_DOCUMENTS_PER_PRESENTATION,
  isValidDocumentPath,
} from "@/lib/documents";
import { isValidMediaPath, MAX_MEDIA_PER_PRESENTATION } from "@/lib/media";
import {
  isEnergyClass,
  isConditionState,
  isTextSource,
  readTextContent,
  safeExternalUrl,
  clampFloorPercent,
  normalizeCompassDeg,
  readRoomPolygon,
  type SectionKind,
} from "@/lib/presentations/sections";

// Editor jednoho typu sekce. Jedna akce saveSection() se přepíná podle
// SKUTEČNÉHO typu sekce v DB (ne podle formuláře — ten by šlo podvrhnout).
// Chyby vrací jako stav formuláře (useActionState) → rozepsané hodnoty
// ve formuláři zůstanou, nic se neztratí přesměrováním.

const SCHEMA_ERROR =
  "Databáze není dorovnaná — spusť v Supabase → SQL Editor soubor app/supabase/APLIKUJ_VSE.sql.";

/** Bezpečně přečte JSON z hidden pole (repeatable editor). */
function parseJsonArray(formData: FormData, key: string): unknown[] {
  const raw = formData.get(key);
  if (typeof raw !== "string" || raw.trim().length === 0) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function clamp(value: string | null, max: number): string | null {
  if (value === null) return null;
  return value.length > max ? value.slice(0, max) : value;
}

/** Z libovolné hodnoty (JSONB) udělá oříznutý neprázdný řetězec, nebo undefined. */
function strField(v: unknown, max: number): string | undefined {
  return typeof v === "string" && v.trim().length > 0 ? v.trim().slice(0, max) : undefined;
}

/** Číslo z libovolné hodnoty (string i number), nebo null. */
function numField(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim().length > 0) {
    const n = Number(v.replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

type LoadedSection = {
  id: string;
  presentation_id: string;
  kind: SectionKind;
  content: Record<string, unknown>;
};

/**
 * Uloží obsah jedné sekce. Vždy nejdřív načte sekci z DB (RLS = jen vlastník),
 * a podle jejího typu zpracuje příslušná pole.
 */
export async function saveSection(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sectionId = String(formData.get("section_id") ?? "");
  if (!isUuid(sectionId)) redirect("/presentations");

  const { data: section, error: loadError } = await supabase
    .from("presentation_sections")
    .select("id, presentation_id, kind, content")
    .eq("id", sectionId)
    .maybeSingle();

  if (loadError) {
    console.error("[sections/edit] načtení sekce selhalo:", loadError.message);
    if (isMissingSchemaError(loadError)) return { error: SCHEMA_ERROR };
    return { error: "Načtení sekce se nepovedlo, zkus to prosím znovu." };
  }
  if (!section) return { error: "Sekce nenalezena, nebo nepatří k tvému účtu." };

  const s: LoadedSection = {
    id: section.id,
    presentation_id: section.presentation_id,
    kind: section.kind as SectionKind,
    content: (section.content ?? {}) as Record<string, unknown>,
  };

  const result = await applyKind(supabase, s, formData, user.id);
  if (!result.ok) return { error: result.message };

  revalidatePath(`/presentations/${s.presentation_id}/sections`);
  revalidatePath(`/presentations/${s.presentation_id}/sections/${s.id}`);
  redirect(`/presentations/${s.presentation_id}/sections/${s.id}?saved=1`);
}

type ApplyResult = { ok: true } | { ok: false; message: string };

async function applyKind(
  supabase: Awaited<ReturnType<typeof createClient>>,
  s: LoadedSection,
  formData: FormData,
  userId: string,
): Promise<ApplyResult> {
  switch (s.kind) {
    case "hero":
      return saveHero(supabase, s, formData);
    case "text":
      return saveText(supabase, s, formData);
    case "parameters":
      return saveParameters(supabase, s, formData);
    case "map":
      return saveMap(supabase, s, formData);
    case "contact":
      return saveContact(supabase, s, formData);
    case "gallery":
      return saveGallery(supabase, s, formData);
    case "benefits":
      return saveBenefits(supabase, s, formData);
    case "valuation":
      return saveValuation(supabase, s, formData);
    case "technicalCondition":
      return saveCondition(supabase, s, formData);
    case "poi":
      return savePoi(supabase, s, formData);
    case "socialProof":
      return saveSocial(supabase, s, formData);
    case "news":
      return saveNews(supabase, s, formData);
    case "analyticMaps":
      return saveAnalyticMaps(supabase, s, formData, userId);
    case "panorama":
      return savePanorama(supabase, s, formData, userId);
    case "floorplans":
      return saveFloorplans(supabase, s, formData, userId);
    case "video":
      return saveVideo(supabase, s, formData);
    case "investmentCalc":
      return saveInvestmentCalc(supabase, s, formData);
    case "documents": {
      // Soubory se nahrávají/mažou samostatně (uploader + tlačítko smazat);
      // formulářem se ukládá jen nadpis sekce.
      const heading = clamp(text(formData, "heading"), 200);
      return writeContent(supabase, s.id, { heading: heading ?? undefined });
    }
    default:
      return { ok: false, message: "Tenhle typ sekce zatím upravit nejde." };
  }
}

/** Zapíše nový obsah sekce a přeloží chybu na laickou hlášku. */
async function writeContent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sectionId: string,
  content: Record<string, unknown>,
): Promise<ApplyResult> {
  const { error } = await supabase
    .from("presentation_sections")
    .update({ content: content as unknown as Json })
    .eq("id", sectionId);
  if (error) {
    console.error("[sections/edit] uložení obsahu selhalo:", error.message);
    if (isMissingSchemaError(error)) return { ok: false, message: SCHEMA_ERROR };
    return { ok: false, message: "Uložení sekce se nepovedlo, zkus to prosím znovu." };
  }
  return { ok: true };
}

// ---- hero -----------------------------------------------------------
async function saveHero(
  supabase: Awaited<ReturnType<typeof createClient>>,
  s: LoadedSection,
  formData: FormData,
): Promise<ApplyResult> {
  const subtitle = clamp(text(formData, "subtitle"), 300);
  const showPrice = formData.get("show_price") === "on";

  const { error } = await supabase
    .from("presentations")
    .update({ subtitle })
    .eq("id", s.presentation_id);
  if (error) {
    console.error("[sections/edit] hero: uložení podnadpisu selhalo:", error.message);
    if (isMissingSchemaError(error)) return { ok: false, message: SCHEMA_ERROR };
    return { ok: false, message: "Uložení se nepovedlo, zkus to prosím znovu." };
  }
  return writeContent(supabase, s.id, { show_price: showPrice });
}

// ---- text -----------------------------------------------------------
async function saveText(
  supabase: Awaited<ReturnType<typeof createClient>>,
  s: LoadedSection,
  formData: FormData,
): Promise<ApplyResult> {
  const prev = readTextContent(s.content);
  const heading = clamp(text(formData, "heading"), 200);

  if (heading && heading.length > 200) {
    return { ok: false, message: "Nadpis je moc dlouhý (max 200 znaků)." };
  }

  // Sekce navázaná na sloupec (příběh/lokalita/přednosti): tělo se edituje
  // v kroku Texty, tady měníme jen nadpis a zachováme vazbu (source).
  if (prev.source && isTextSource(prev.source)) {
    return writeContent(supabase, s.id, { heading: heading ?? undefined, source: prev.source });
  }

  // Vlastní textová sekce: nadpis + tělo přímo v obsahu sekce.
  const body = text(formData, "body");
  if (body && body.length > MAX.description) {
    return { ok: false, message: `Text je moc dlouhý (max ${MAX.description} znaků).` };
  }
  return writeContent(supabase, s.id, {
    heading: heading ?? undefined,
    body: body ?? undefined,
  });
}

// ---- parameters (+ PENB) --------------------------------------------
async function saveParameters(
  supabase: Awaited<ReturnType<typeof createClient>>,
  s: LoadedSection,
  formData: FormData,
): Promise<ApplyResult> {
  const property_type = clamp(text(formData, "property_type"), MAX.property_type);
  const disposition = clamp(text(formData, "disposition"), MAX.disposition);
  const building_dimensions = clamp(text(formData, "building_dimensions"), 60);
  const condition = clamp(text(formData, "condition"), 60);
  const ownership = clamp(text(formData, "ownership"), 60);

  const floor_area_m2 = num(formData, "floor_area_m2");
  const land_area_m2 = num(formData, "land_area_m2");
  const built_area_m2 = num(formData, "built_area_m2");
  const year_built = num(formData, "year_built");
  const floors = num(formData, "floors");
  const monthly_costs_czk = num(formData, "monthly_costs_czk");

  let energy_class = text(formData, "energy_class");
  if (energy_class) {
    energy_class = energy_class.toUpperCase();
    if (!isEnergyClass(energy_class)) {
      return { ok: false, message: "Energetická třída musí být A až G (nebo nech prázdné)." };
    }
  }

  for (const [val, label] of [
    [floor_area_m2, "užitná plocha"],
    [land_area_m2, "plocha pozemku"],
    [built_area_m2, "zastavěná plocha"],
  ] as [number | null, string][]) {
    if (val !== null && (val < 0 || val > MAX.area_m2)) {
      return { ok: false, message: `Hodnota v poli „${label}" je mimo rozsah (0 až 1 000 000 m²).` };
    }
  }
  if (year_built !== null && (year_built < 1500 || year_built > 2100)) {
    return { ok: false, message: "Rok stavby je mimo rozsah (1500 až 2100)." };
  }
  if (floors !== null && (floors < 0 || floors > 300)) {
    return { ok: false, message: "Počet podlaží je mimo rozsah (0 až 300)." };
  }
  if (monthly_costs_czk !== null && (monthly_costs_czk < 0 || monthly_costs_czk > 1_000_000_000)) {
    return { ok: false, message: "Provozní náklady jsou mimo rozsah." };
  }

  const { error } = await supabase
    .from("presentations")
    .update({
      property_type,
      disposition,
      floor_area_m2,
      land_area_m2,
      built_area_m2,
      building_dimensions,
      year_built: year_built === null ? null : Math.round(year_built),
      floors: floors === null ? null : Math.round(floors),
      condition,
      ownership,
      monthly_costs_czk: monthly_costs_czk === null ? null : Math.round(monthly_costs_czk),
      energy_class,
    })
    .eq("id", s.presentation_id);
  if (error) {
    console.error("[sections/edit] parametry: uložení selhalo:", error.message);
    if (isMissingSchemaError(error)) return { ok: false, message: SCHEMA_ERROR };
    return { ok: false, message: "Uložení parametrů se nepovedlo, zkus to prosím znovu." };
  }
  return { ok: true };
}

// ---- map ------------------------------------------------------------
async function saveMap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  s: LoadedSection,
  formData: FormData,
): Promise<ApplyResult> {
  const heading = clamp(text(formData, "heading"), 200);
  const lat = num(formData, "lat");
  const lng = num(formData, "lng");
  const zoom = num(formData, "zoom");

  const hasLat = lat !== null;
  const hasLng = lng !== null;
  if (hasLat !== hasLng) {
    return { ok: false, message: "Vyplň prosím obě souřadnice (šířku i délku), nebo obě nech prázdné." };
  }
  if (hasLat && (lat! < -90 || lat! > 90)) {
    return { ok: false, message: "Zeměpisná šířka musí být mezi -90 a 90." };
  }
  if (hasLng && (lng! < -180 || lng! > 180)) {
    return { ok: false, message: "Zeměpisná délka musí být mezi -180 a 180." };
  }

  const { error } = await supabase
    .from("presentations")
    .update({ lat, lng })
    .eq("id", s.presentation_id);
  if (error) {
    console.error("[sections/edit] mapa: uložení souřadnic selhalo:", error.message);
    if (isMissingSchemaError(error)) return { ok: false, message: SCHEMA_ERROR };
    return { ok: false, message: "Uložení mapy se nepovedlo, zkus to prosím znovu." };
  }
  return writeContent(supabase, s.id, {
    heading: heading ?? undefined,
    zoom: zoom !== null && zoom >= 1 && zoom <= 20 ? Math.round(zoom) : undefined,
  });
}

// ---- contact --------------------------------------------------------
async function saveContact(
  supabase: Awaited<ReturnType<typeof createClient>>,
  s: LoadedSection,
  formData: FormData,
): Promise<ApplyResult> {
  const cta_text = clamp(text(formData, "cta_text"), 300);
  return writeContent(supabase, s.id, { cta_text: cta_text ?? undefined });
}

// ---- gallery (nadpis + popisky fotek) -------------------------------
async function saveGallery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  s: LoadedSection,
  formData: FormData,
): Promise<ApplyResult> {
  const heading = clamp(text(formData, "heading"), 200);

  const idsRaw = String(formData.get("photo_ids") ?? "");
  const photoIds = idsRaw.split(",").map((x) => x.trim()).filter((x) => isUuid(x));

  for (const photoId of photoIds) {
    const caption = clamp(text(formData, `caption_${photoId}`), 300);
    const category = clamp(text(formData, `category_${photoId}`), 40);
    const { error } = await supabase
      .from("presentation_photos")
      .update({ caption, category })
      .eq("id", photoId)
      .eq("presentation_id", s.presentation_id);
    if (error) {
      console.error("[sections/edit] galerie: uložení popisku selhalo:", error.message);
      if (isMissingSchemaError(error)) return { ok: false, message: SCHEMA_ERROR };
      return { ok: false, message: "Uložení popisků se nepovedlo, zkus to prosím znovu." };
    }
  }

  return writeContent(supabase, s.id, { heading: heading ?? undefined });
}

// ---- benefits -------------------------------------------------------
async function saveBenefits(
  supabase: Awaited<ReturnType<typeof createClient>>,
  s: LoadedSection,
  formData: FormData,
): Promise<ApplyResult> {
  const heading = clamp(text(formData, "heading"), 200);
  const items = parseJsonArray(formData, "items_json")
    .map((raw) => {
      const it = (raw ?? {}) as Record<string, unknown>;
      const h = typeof it.heading === "string" ? it.heading.trim() : "";
      if (!h) return null;
      return {
        icon: typeof it.icon === "string" ? it.icon.trim().slice(0, 40) || undefined : undefined,
        heading: h.slice(0, 120),
        body: typeof it.body === "string" ? it.body.trim().slice(0, 600) || undefined : undefined,
      };
    })
    .filter((x): x is { icon: string | undefined; heading: string; body: string | undefined } => x !== null)
    .slice(0, 30);

  return writeContent(supabase, s.id, { heading: heading ?? undefined, items });
}

// ---- valuation ------------------------------------------------------
async function saveValuation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  s: LoadedSection,
  formData: FormData,
): Promise<ApplyResult> {
  const heading = clamp(text(formData, "heading"), 200);
  const items = parseJsonArray(formData, "items_json")
    .map((raw) => {
      const it = (raw ?? {}) as Record<string, unknown>;
      const src = typeof it.source === "string" ? it.source.trim() : "";
      if (!src) return null;
      const toNum = (v: unknown): number | null => {
        if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
        if (typeof v === "string" && v.trim()) {
          const n = Number(v.replace(/\s/g, "").replace(",", "."));
          return Number.isFinite(n) ? Math.round(n) : null;
        }
        return null;
      };
      return {
        source: src.slice(0, 120),
        // Jen http/https (sdílená hráz se stránkou); `javascript:` apod. se zahodí.
        url: safeExternalUrl(it.url)?.slice(0, 500),
        estimate_czk: toNum(it.estimate_czk),
        min_czk: toNum(it.min_czk),
        max_czk: toNum(it.max_czk),
        note: typeof it.note === "string" ? it.note.trim().slice(0, 300) || undefined : undefined,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .slice(0, 20);

  return writeContent(supabase, s.id, { heading: heading ?? undefined, items });
}

// ---- technicalCondition ---------------------------------------------
async function saveCondition(
  supabase: Awaited<ReturnType<typeof createClient>>,
  s: LoadedSection,
  formData: FormData,
): Promise<ApplyResult> {
  const heading = clamp(text(formData, "heading"), 200);
  const items = parseJsonArray(formData, "items_json")
    .map((raw) => {
      const it = (raw ?? {}) as Record<string, unknown>;
      const cat = typeof it.category === "string" ? it.category.trim() : "";
      if (!cat) return null;
      return {
        category: cat.slice(0, 120),
        condition: isConditionState(it.condition) ? it.condition : undefined,
        description:
          typeof it.description === "string" ? it.description.trim().slice(0, 600) || undefined : undefined,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .slice(0, 30);

  return writeContent(supabase, s.id, { heading: heading ?? undefined, items });
}

// ---- poi (body zájmu) -----------------------------------------------
async function savePoi(
  supabase: Awaited<ReturnType<typeof createClient>>,
  s: LoadedSection,
  formData: FormData,
): Promise<ApplyResult> {
  const heading = clamp(text(formData, "heading"), 200);
  const items = parseJsonArray(formData, "items_json")
    .map((raw) => {
      const it = (raw ?? {}) as Record<string, unknown>;
      const name = strField(it.name, 120);
      if (!name) return null;
      return {
        name,
        category: strField(it.category, 60),
        distance: strField(it.distance, 60),
        note: strField(it.note, 300),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .slice(0, 60);
  return writeContent(supabase, s.id, { heading: heading ?? undefined, items });
}

// ---- socialProof (reference a recenze) ------------------------------
async function saveSocial(
  supabase: Awaited<ReturnType<typeof createClient>>,
  s: LoadedSection,
  formData: FormData,
): Promise<ApplyResult> {
  const heading = clamp(text(formData, "heading"), 200);
  const items = parseJsonArray(formData, "items_json")
    .map((raw) => {
      const it = (raw ?? {}) as Record<string, unknown>;
      const author = strField(it.author, 120);
      if (!author) return null;
      const r = numField(it.rating);
      return {
        author,
        rating: r === null ? undefined : Math.min(5, Math.max(1, Math.round(r))),
        text: strField(it.text, 800),
        source: strField(it.source, 120),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .slice(0, 40);
  return writeContent(supabase, s.id, { heading: heading ?? undefined, items });
}

// ---- news (novinky a aktuality) -------------------------------------
async function saveNews(
  supabase: Awaited<ReturnType<typeof createClient>>,
  s: LoadedSection,
  formData: FormData,
): Promise<ApplyResult> {
  const heading = clamp(text(formData, "heading"), 200);
  const items = parseJsonArray(formData, "items_json")
    .map((raw) => {
      const it = (raw ?? {}) as Record<string, unknown>;
      const headline = strField(it.headline, 200);
      if (!headline) return null;
      return {
        date: strField(it.date, 40),
        headline,
        text: strField(it.text, 1000),
        // Jen http/https (sdílená hráz se stránkou); `javascript:` apod. se zahodí.
        url: safeExternalUrl(it.url)?.slice(0, 500),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .slice(0, 40);
  return writeContent(supabase, s.id, { heading: heading ?? undefined, items });
}

// ---- analyticMaps (obrázkové mapy v tabech) -------------------------
async function saveAnalyticMaps(
  supabase: Awaited<ReturnType<typeof createClient>>,
  s: LoadedSection,
  formData: FormData,
  userId: string,
): Promise<ApplyResult> {
  const heading = clamp(text(formData, "heading"), 200);
  const items = parseJsonArray(formData, "items_json")
    .map((raw) => {
      const it = (raw ?? {}) as Record<string, unknown>;
      const image_path = keepMediaPath(it.image_path, userId, s.presentation_id);
      const title = strField(it.title, 120);
      if (!image_path && !title) return null;
      return {
        title,
        caption: strField(it.caption, 300),
        group: strField(it.group, 60),
        why: strField(it.why, 600),
        image_path,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .slice(0, 20);

  const paths = items
    .map((it) => it.image_path)
    .filter((x): x is string => typeof x === "string" && x.length > 0);
  const sync = await syncMedia(supabase, s.presentation_id, s.id, paths);
  if (!sync.ok) return sync;

  return writeContent(supabase, s.id, { heading: heading ?? undefined, items });
}

// ---- panorama (jeden obrázek + poznámka) ----------------------------
async function savePanorama(
  supabase: Awaited<ReturnType<typeof createClient>>,
  s: LoadedSection,
  formData: FormData,
  userId: string,
): Promise<ApplyResult> {
  const heading = clamp(text(formData, "heading"), 200);
  const caption = clamp(text(formData, "caption"), 300);
  const image_path = keepMediaPath(formData.get("image_path"), userId, s.presentation_id);

  const sync = await syncMedia(supabase, s.presentation_id, s.id, image_path ? [image_path] : []);
  if (!sync.ok) return sync;

  return writeContent(supabase, s.id, {
    heading: heading ?? undefined,
    caption: caption ?? undefined,
    image_path,
  });
}

// ---- floorplans (patra + místnosti) ---------------------------------
async function saveFloorplans(
  supabase: Awaited<ReturnType<typeof createClient>>,
  s: LoadedSection,
  formData: FormData,
  userId: string,
): Promise<ApplyResult> {
  const heading = clamp(text(formData, "heading"), 200);
  const floors = parseJsonArray(formData, "floors_json")
    .map((raw) => {
      const f = (raw ?? {}) as Record<string, unknown>;
      const label = strField(f.label, 80);
      const image_path = keepMediaPath(f.image_path, userId, s.presentation_id);
      if (!label && !image_path) return null;
      // Natočení severu (0–360). undefined = kompas u patra nenastaven.
      const compass = normalizeCompassDeg(f.compass);
      const rooms = (Array.isArray(f.rooms) ? f.rooms : [])
        .map((rr) => {
          const r = (rr ?? {}) as Record<string, unknown>;
          const name = strField(r.name, 80);
          if (!name) return null;
          // Špendlík v % (0–100). Platí jen s oběma souřadnicemi, jinak jen v seznamu.
          const px = clampFloorPercent(r.x);
          const py = clampFloorPercent(r.y);
          const hasPin = px !== undefined && py !== undefined;
          // Varianta B (obrys) — jen se uchová, editor ji zatím nekreslí.
          const polygon = readRoomPolygon(r.polygon);
          return {
            name,
            area: strField(r.area, 40),
            description: strField(r.description, 400),
            image_path: keepMediaPath(r.image_path, userId, s.presentation_id),
            ...(hasPin ? { x: px, y: py } : {}),
            ...(polygon ? { polygon } : {}),
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .slice(0, 40);
      return { label: label ?? "Patro", image_path, ...(compass !== undefined ? { compass } : {}), rooms };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .slice(0, 20);

  const paths: string[] = [];
  for (const f of floors) {
    if (f.image_path) paths.push(f.image_path);
    for (const r of f.rooms) if (r.image_path) paths.push(r.image_path);
  }
  const sync = await syncMedia(supabase, s.presentation_id, s.id, paths);
  if (!sync.ok) return sync;

  return writeContent(supabase, s.id, { heading: heading ?? undefined, floors });
}

// ---- video (vložené YouTube/Vimeo) ----------------------------------
// Ukládáme syrový odkaz + nadpis/popisek. Bezpečnou embed URL sestaví až
// veřejná stránka z ověřeného ID; neplatný odkaz tam ukáže hlášku (ne pád).
async function saveVideo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  s: LoadedSection,
  formData: FormData,
): Promise<ApplyResult> {
  const url = clamp(text(formData, "video_url"), 500);
  const heading = clamp(text(formData, "heading"), 200);
  const caption = clamp(text(formData, "caption"), 500);
  return writeContent(supabase, s.id, {
    url: url ?? undefined,
    heading: heading ?? undefined,
    caption: caption ?? undefined,
  });
}

// ---- investmentCalc (vstupy pro klientský výpočet) ------------------
// Jen uložení vstupů do JSONB. Samotný výpočet běží v prohlížeči (žádná
// externí služba); prázdné/nesmyslné hodnoty ošetří renderer pomlčkou.
async function saveInvestmentCalc(
  supabase: Awaited<ReturnType<typeof createClient>>,
  s: LoadedSection,
  formData: FormData,
): Promise<ApplyResult> {
  const heading = clamp(text(formData, "heading"), 200);
  const price = num(formData, "price_czk");
  const area = num(formData, "area_m2");
  const rent = num(formData, "monthly_rent_czk");
  const costs = num(formData, "annual_costs_czk");

  const MAX_CZK = 100_000_000_000; // 100 mld Kč — horní rozumná mez
  for (const [val, labelText] of [
    [price, "kupní cena"],
    [rent, "měsíční nájem"],
    [costs, "roční náklady"],
  ] as [number | null, string][]) {
    if (val !== null && (val < 0 || val > MAX_CZK)) {
      return { ok: false, message: `Hodnota v poli „${labelText}" je mimo rozsah.` };
    }
  }
  if (area !== null && (area < 0 || area > 1_000_000)) {
    return { ok: false, message: "Plocha je mimo rozsah (0 až 1 000 000 m²)." };
  }

  return writeContent(supabase, s.id, {
    heading: heading ?? undefined,
    price_czk: price === null ? null : Math.round(price),
    area_m2: area,
    monthly_rent_czk: rent === null ? null : Math.round(rent),
    annual_costs_czk: costs === null ? null : Math.round(costs),
  });
}

/** Ponechá cestu k obrázku, jen když má správný tvar a patří uživateli+prezentaci. */
function keepMediaPath(v: unknown, userId: string, presentationId: string): string | undefined {
  if (typeof v !== "string") return undefined;
  const p = v.trim();
  return p && isValidMediaPath(p, userId, presentationId) ? p : undefined;
}

/**
 * Zaregistruje obrázky sekce do `presentation_media` (DB řádek na každý obrázek).
 * Na tuhle registraci je navázané VEŘEJNÉ čtení souborů z bucketu presentation-media
 * (jinak by šly stáhnout osiřelé / z vypnuté sekce vyřazené obrázky — viz H3/H4).
 * Limit počtu vynucuje DB, ne UI. Voláno PŘED zápisem obsahu: když se limit
 * překročí, obsah se neuloží a uživatel dostane hlášku.
 */
async function syncMedia(
  supabase: Awaited<ReturnType<typeof createClient>>,
  presentationId: string,
  sectionId: string,
  paths: string[],
): Promise<ApplyResult> {
  const { error } = await supabase.rpc("sync_presentation_media", {
    p_presentation_id: presentationId,
    p_section_id: sectionId,
    p_paths: paths,
  });
  if (!error) return { ok: true };

  console.error("[sections/edit] registrace obrázků selhala:", error.message);
  if (error.message.includes("MEDIA_LIMIT")) {
    return {
      ok: false,
      message: `Sekce má moc obrázků — na jednu prezentaci je limit ${MAX_MEDIA_PER_PRESENTATION}. Nějaké odeber a zkus to znovu.`,
    };
  }
  if (isMissingSchemaError(error)) {
    return {
      ok: false,
      message:
        "Databáze není dorovnaná — chybí registrace obrázků. Spusť app/supabase/APLIKUJ_VSE.sql.",
    };
  }
  // MEDIA_BAD_PATH / MEDIA_NOT_OWNER: cesty už filtruje keepMediaPath, sem by to nemělo dojít.
  return { ok: false, message: "Uložení obrázků se nepovedlo, zkus to prosím znovu." };
}

// =====================================================================
//  DOKUMENTY — nahrání (RPC) a smazání (stejný vzor jako fotky)
// =====================================================================

/** Zapíše do DB dokument, který prohlížeč právě nahrál do Storage. */
export async function registerDocument(
  presentationId: string,
  storagePath: string,
  meta: { name: string; category: string | null; description: string | null; fileType: string | null; fileSize: number | null },
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Nejsi přihlášený/á." };

  if (!isUuid(presentationId) || !isValidDocumentPath(storagePath, user.id, presentationId)) {
    return { ok: false, message: "Neplatný soubor, zkus ho nahrát znovu." };
  }
  const name = meta.name.trim();
  if (!name) return { ok: false, message: "Vyplň prosím název dokumentu." };

  const { error } = await supabase.rpc("register_presentation_document", {
    p_presentation_id: presentationId,
    p_storage_path: storagePath,
    p_name: name.slice(0, 200),
    p_category: meta.category,
    p_description: meta.description,
    p_file_type: meta.fileType,
    p_file_size: meta.fileSize,
  });

  if (error) {
    console.error("[documents] registrace selhala:", error.message);
    // Sirotčí soubor ve Storage ukliď.
    const { error: cleanupError } = await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
    if (cleanupError) console.error("[documents] úklid souboru selhal:", cleanupError.message);

    if (error.message.includes("DOCUMENT_LIMIT")) {
      return {
        ok: false,
        message: `Prezentace už má nejvyšší povolený počet dokumentů (${MAX_DOCUMENTS_PER_PRESENTATION}).`,
      };
    }
    if (isMissingSchemaError(error)) {
      return {
        ok: false,
        message:
          "Databáze není dorovnaná — chybí funkce pro ukládání dokumentů. Spusť app/supabase/APLIKUJ_VSE.sql.",
      };
    }
    return { ok: false, message: "Uložení dokumentu se nepovedlo, zkus to znovu." };
  }

  revalidatePath(`/presentations/${presentationId}/sections`);
  return { ok: true };
}

/** Smaže dokument: záznam v DB (RPC) + soubor ve Storage. */
export async function deleteDocument(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const documentId = String(formData.get("document_id") ?? "");
  const sectionId = String(formData.get("section_id") ?? "");
  const presentationId = String(formData.get("presentation_id") ?? "");
  const back = isUuid(presentationId) && isUuid(sectionId)
    ? `/presentations/${presentationId}/sections/${sectionId}`
    : "/presentations";
  if (!isUuid(documentId)) redirect(back);

  const { data: removedPath, error } = await supabase.rpc("delete_presentation_document", {
    p_document_id: documentId,
  });
  if (error) {
    console.error("[documents] smazání selhalo:", error.message);
    redirect(`${back}?error=doc-delete`);
  }
  if (removedPath) {
    const { error: removeError } = await supabase.storage.from(DOCUMENTS_BUCKET).remove([removedPath]);
    if (removeError) console.error("[documents] smazání souboru selhalo:", removeError.message);
  }

  revalidatePath(back);
  redirect(back);
}
