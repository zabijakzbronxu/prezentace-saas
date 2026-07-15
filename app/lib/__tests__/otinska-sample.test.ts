import { describe, it, expect } from "vitest";
import {
  OTINSKA_PRESENTATION_FIELDS,
  OTINSKA_SECTION_SEEDS,
  isSeedAllowed,
  ownsPresentation,
} from "../presentations/otinska-sample";
import {
  isSectionKind,
  isReadyKind,
  isSingletonKind,
  isTextSource,
  isConditionState,
  isEnergyClass,
  safeExternalUrl,
  readTextContent,
  readBenefitsContent,
  readValuationContent,
  readConditionContent,
  readPoiContent,
  readSocialContent,
  readNewsContent,
  readInvestmentCalcContent,
  type SectionKind,
} from "../presentations/sections";

// Typy, které DB trigger `guard_presentation_section_kind` povoluje při zápisu
// (= ready:true sada). Musí sedět s whitelistem v migraci a v add_presentation_section.
const DB_WRITE_WHITELIST: SectionKind[] = [
  "hero", "text", "parameters", "gallery", "map", "benefits",
  "documents", "valuation", "technicalCondition", "contact",
  "floorplans", "analyticMaps", "poi", "panorama", "socialProof", "news",
  "video", "investmentCalc",
];

// Sekce závislé na nahraných obrázcích — ukázka je NESMÍ plnit (rozbité náhledy).
const IMAGE_DEPENDENT: SectionKind[] = [
  "gallery", "floorplans", "analyticMaps", "panorama", "documents", "map", "video",
];

const kinds = OTINSKA_SECTION_SEEDS.map((s) => s.kind);
function seed(kind: SectionKind) {
  return OTINSKA_SECTION_SEEDS.find((s) => s.kind === kind)?.content ?? {};
}

describe("seed Otínská — brána idempotence a vlastnictví", () => {
  it("isSeedAllowed: plní jen úplně prázdnou prezentaci", () => {
    expect(isSeedAllowed(0)).toBe(true);
    expect(isSeedAllowed(1)).toBe(false);
    expect(isSeedAllowed(7)).toBe(false);
  });

  it("ownsPresentation: jen shoda owner_id == user.id (cizí/prázdné odmítne)", () => {
    expect(ownsPresentation("u-1", "u-1")).toBe(true);
    expect(ownsPresentation("u-1", "u-2")).toBe(false);
    expect(ownsPresentation(null, "u-1")).toBe(false);
    expect(ownsPresentation(undefined, "u-1")).toBe(false);
    expect(ownsPresentation("", "u-1")).toBe(false);
  });
});

describe("seed Otínská — správné typy sekcí", () => {
  it("každá sekce je platný a ready typ", () => {
    for (const k of kinds) {
      expect(isSectionKind(k)).toBe(true);
      expect(isReadyKind(k)).toBe(true);
    }
  });

  it("plní jen typy povolené DB triggerem při zápisu", () => {
    for (const k of kinds) expect(DB_WRITE_WHITELIST).toContain(k);
  });

  it("NEPLNÍ žádnou sekci závislou na nahraných obrázcích", () => {
    for (const k of IMAGE_DEPENDENT) expect(kinds).not.toContain(k);
  });

  it("žádný singleton se neopakuje (jinak by ho odmítl unikátní index)", () => {
    const singletonCounts = new Map<SectionKind, number>();
    for (const k of kinds) {
      if (isSingletonKind(k)) singletonCounts.set(k, (singletonCounts.get(k) ?? 0) + 1);
    }
    for (const [k, count] of singletonCounts) {
      expect(count, `singleton ${k} je vícekrát`).toBe(1);
    }
  });

  it("obsahuje očekávanou páteř (hero, texty, parametry, kontakt) i prodejní sekce", () => {
    for (const k of [
      "hero", "parameters", "contact", "benefits", "technicalCondition",
      "valuation", "poi", "socialProof", "news", "investmentCalc",
    ] as SectionKind[]) {
      expect(kinds).toContain(k);
    }
    expect(kinds.filter((k) => k === "text")).toHaveLength(2);
  });
});

describe("seed Otínská — obsah sekcí projde readery (žádné prázdno)", () => {
  it("hero skrývá cenu (Otínská je na vyžádání)", () => {
    expect((seed("hero") as { show_price?: boolean }).show_price).toBe(false);
  });

  it("textové sekce míří na platné sloupce prezentace", () => {
    const sources = OTINSKA_SECTION_SEEDS
      .filter((s) => s.kind === "text")
      .map((s) => readTextContent(s.content).source);
    expect(sources).toEqual(["description", "location_text"]);
    for (const src of sources) expect(isTextSource(src)).toBe(true);
  });

  it("přednosti: 6 dlaždic, každá s nadpisem", () => {
    const b = readBenefitsContent(seed("benefits"));
    expect(b.items).toHaveLength(6);
    for (const it of b.items) expect(it.heading.length).toBeGreaterThan(0);
  });

  it("technický stav: 7 položek s platným stavem", () => {
    const c = readConditionContent(seed("technicalCondition"));
    expect(c.items).toHaveLength(7);
    for (const it of c.items) {
      expect(it.category.length).toBeGreaterThan(0);
      expect(isConditionState(it.condition)).toBe(true);
    }
    // pokrývá celou škálu stavů
    const states = new Set(c.items.map((it) => it.condition));
    expect(states.has("new")).toBe(true);
    expect(states.has("fair")).toBe(true);
  });

  it("cenové odhady: 4 zdroje, http(s) URL, čísla", () => {
    const v = readValuationContent(seed("valuation"));
    expect(v.items).toHaveLength(4);
    for (const it of v.items) {
      expect(it.source.length).toBeGreaterThan(0);
      // URL musí přežít sanitizaci při renderu (jinak by se zahodila)
      expect(safeExternalUrl(it.url)).toBeTruthy();
      expect(typeof it.estimate_czk).toBe("number");
    }
  });

  it("body zájmu: neprázdný seznam, každý s názvem", () => {
    const poi = readPoiContent(seed("poi"));
    expect(poi.items.length).toBeGreaterThanOrEqual(10);
    for (const it of poi.items) expect(it.name.length).toBeGreaterThan(0);
  });

  it("reference: 4 posty, každý s autorem", () => {
    const s = readSocialContent(seed("socialProof"));
    expect(s.items).toHaveLength(4);
    for (const it of s.items) expect(it.author.length).toBeGreaterThan(0);
  });

  it("novinky: neprázdný seznam, každá s nadpisem", () => {
    const n = readNewsContent(seed("news"));
    expect(n.items.length).toBeGreaterThanOrEqual(6);
    for (const it of n.items) expect(it.headline.length).toBeGreaterThan(0);
  });

  it("investiční kalkulačka: reálná cena i plocha", () => {
    const calc = readInvestmentCalcContent(seed("investmentCalc"));
    expect(calc.price_czk).toBe(18450000);
    expect(calc.area_m2).toBe(305);
  });
});

describe("seed Otínská — pole prezentace v mezích DB CHECKů", () => {
  const f = OTINSKA_PRESENTATION_FIELDS;

  it("cena je na vyžádání (null) — v souladu s hero show_price:false", () => {
    expect(f.price_czk).toBeNull();
  });

  it("energetická třída je prázdná nebo platná A–G", () => {
    expect(f.energy_class === null || isEnergyClass(f.energy_class)).toBe(true);
  });

  it("krátké texty drží délkové limity migrace", () => {
    expect(f.title.length).toBeLessThanOrEqual(200);
    expect(f.subtitle.length).toBeLessThanOrEqual(300);
    expect(f.building_dimensions.length).toBeLessThanOrEqual(60);
    expect(f.condition.length).toBeLessThanOrEqual(60);
    expect(f.ownership.length).toBeLessThanOrEqual(60);
  });

  it("dlouhé texty drží limit 5000 znaků", () => {
    expect(f.description.length).toBeLessThanOrEqual(5000);
    expect(f.location_text.length).toBeLessThanOrEqual(5000);
    expect(f.description.length).toBeGreaterThan(0);
    expect(f.location_text.length).toBeGreaterThan(0);
  });

  it("čísla jsou v povolených rozsazích", () => {
    expect(f.year_built).toBeGreaterThanOrEqual(1500);
    expect(f.year_built).toBeLessThanOrEqual(2100);
    expect(f.floors).toBeGreaterThanOrEqual(0);
    expect(f.floors).toBeLessThanOrEqual(300);
    for (const area of [f.floor_area_m2, f.land_area_m2, f.built_area_m2]) {
      if (area !== null) {
        expect(area).toBeGreaterThanOrEqual(0);
        expect(area).toBeLessThanOrEqual(1_000_000);
      }
    }
    expect(f.lat).toBeGreaterThanOrEqual(-90);
    expect(f.lat).toBeLessThanOrEqual(90);
    expect(f.lng).toBeGreaterThanOrEqual(-180);
    expect(f.lng).toBeLessThanOrEqual(180);
  });

  it("kontakt má platný tvar e-mailu a telefonu", () => {
    expect(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.contact_email)).toBe(true);
    expect(f.contact_phone.replace(/\D/g, "").length).toBeGreaterThanOrEqual(6);
  });
});
