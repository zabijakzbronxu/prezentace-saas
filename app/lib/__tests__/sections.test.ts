import { describe, it, expect } from "vitest";
import {
  SECTION_KINDS,
  SECTION_CATALOG,
  isSectionKind,
  isSingletonKind,
  isReadyKind,
  canAddKind,
  addableKinds,
  sectionLabel,
  readTextContent,
  readBenefitsContent,
  readValuationContent,
  readConditionContent,
  readMapContent,
  readPoiContent,
  readSocialContent,
  readNewsContent,
  readAnalyticMapsContent,
  readPanoramaContent,
  readFloorplansContent,
  readVideoContent,
  readInvestmentCalcContent,
  parseVideoUrl,
  computeInvestment,
  isEnergyClass,
  isConditionState,
  isTextSource,
  ENERGY_CLASSES,
  ENERGY_LABEL,
  ENERGY_COLOR,
  DEFAULT_SECTION_SEEDS,
  type SectionKind,
} from "../presentations/sections";

// Registr kind musí přesně sedět s CHECK omezením v migraci
// (app/supabase/migrations/20260715120000_otinska_sections.sql).
const KINDS_IN_MIGRATION = [
  "hero", "text", "parameters", "gallery", "map", "benefits", "documents",
  "valuation", "technicalCondition", "contact", "video", "floorplans",
  "analyticMaps", "poi", "panorama", "socialProof", "news", "investmentCalc",
  "chatbot",
];

describe("registr sekcí", () => {
  it("SECTION_KINDS sedí s výčtem v migraci (DB CHECK)", () => {
    expect([...SECTION_KINDS].sort()).toEqual([...KINDS_IN_MIGRATION].sort());
  });

  it("katalog pokrývá každý kind právě jednou", () => {
    const kinds = SECTION_CATALOG.map((m) => m.kind).sort();
    expect(kinds).toEqual([...SECTION_KINDS].sort());
    expect(new Set(kinds).size).toBe(kinds.length);
  });

  it("isSectionKind pozná platný a odmítne neplatný typ", () => {
    expect(isSectionKind("hero")).toBe(true);
    expect(isSectionKind("benefits")).toBe(true);
    expect(isSectionKind("neexistuje")).toBe(false);
    expect(isSectionKind(42)).toBe(false);
    expect(isSectionKind(null)).toBe(false);
  });

  it("singletony a opakovatelné sekce jsou správně označené", () => {
    for (const k of [
      "hero", "parameters", "contact", "map", "gallery", "documents",
      "floorplans", "panorama", "analyticMaps", "poi", "socialProof", "news",
      "video", "investmentCalc",
    ] as SectionKind[]) {
      expect(isSingletonKind(k)).toBe(true);
    }
    for (const k of ["text", "benefits", "valuation", "technicalCondition"] as SectionKind[]) {
      expect(isSingletonKind(k)).toBe(false);
    }
  });

  it("ready = sekce, které umíme (kolo 1–4); jen chatbot ještě ne", () => {
    for (const k of [
      "hero", "documents", "floorplans", "analyticMaps", "poi", "panorama",
      "socialProof", "news", "video", "investmentCalc",
    ] as SectionKind[]) {
      expect(isReadyKind(k)).toBe(true);
    }
    for (const k of ["chatbot"] as SectionKind[]) {
      expect(isReadyKind(k)).toBe(false);
    }
  });

  it("sectionLabel vrací lidský název", () => {
    expect(sectionLabel("hero")).toContain("Úvodní");
    expect(sectionLabel("benefits")).toBeTruthy();
  });
});

describe("pravidla přidávání sekcí (canAddKind)", () => {
  it("singleton nelze přidat, když už existuje", () => {
    expect(canAddKind("hero", []).ok).toBe(true);
    expect(canAddKind("hero", ["hero"]).ok).toBe(false);
    expect(canAddKind("hero", ["hero"]).reason).toBeTruthy();
  });

  it("opakovatelnou sekci lze přidat i opakovaně", () => {
    expect(canAddKind("text", ["text", "text"]).ok).toBe(true);
  });

  it("nedodělanou (ne-ready) sekci nelze přidat", () => {
    expect(canAddKind("chatbot", []).ok).toBe(false);
  });

  it("kolo 2/3 sekce už přidat lze", () => {
    expect(canAddKind("floorplans", []).ok).toBe(true);
    expect(canAddKind("analyticMaps", []).ok).toBe(true);
    expect(canAddKind("panorama", []).ok).toBe(true);
    expect(canAddKind("floorplans", ["floorplans"]).ok).toBe(false); // singleton
  });

  it("kolo 4 (video, investiční kalkulačka) už přidat lze", () => {
    expect(canAddKind("video", []).ok).toBe(true);
    expect(canAddKind("investmentCalc", []).ok).toBe(true);
    expect(canAddKind("video", ["video"]).ok).toBe(false); // singleton
    expect(canAddKind("investmentCalc", ["investmentCalc"]).ok).toBe(false); // singleton
  });

  it("addableKinds skryje singletony, které už existují, a všechny ne-ready", () => {
    const existing: SectionKind[] = ["hero", "contact"];
    const addable = addableKinds(existing).map((m) => m.kind);
    expect(addable).not.toContain("hero"); // singleton už je
    expect(addable).not.toContain("contact"); // singleton už je
    expect(addable).not.toContain("chatbot"); // ne-ready
    expect(addable).toContain("text"); // opakovatelná
    expect(addable).toContain("video"); // kolo 4, singleton, ještě není
    expect(addable).toContain("investmentCalc"); // kolo 4, singleton, ještě není
    expect(addable).toContain("floorplans"); // kolo 2, singleton, ještě není
    expect(addable).toContain("poi"); // kolo 3
    // žádná ne-ready sekce se nesmí objevit v nabídce
    for (const m of addableKinds(existing)) expect(m.ready).toBe(true);
  });
});

describe("čtení obsahu sekcí (JSONB → typy)", () => {
  it("readTextContent přečte nadpis, zdroj i vlastní text", () => {
    expect(readTextContent({ heading: "Příběh", source: "description" })).toEqual({
      heading: "Příběh",
      source: "description",
      body: undefined,
    });
    const custom = readTextContent({ heading: "Vlastní", body: "text" });
    expect(custom.source).toBeUndefined();
    expect(custom.body).toBe("text");
  });

  it("readTextContent zahodí neplatný source", () => {
    expect(readTextContent({ source: "nesmysl" }).source).toBeUndefined();
  });

  it("readBenefitsContent zahodí položky bez nadpisu", () => {
    const c = readBenefitsContent({
      heading: "Přednosti",
      items: [
        { heading: "Zahrada", body: "velká" },
        { body: "bez nadpisu" },
        { heading: "" },
        "nesmysl",
      ],
    });
    expect(c.items).toHaveLength(1);
    expect(c.items[0].heading).toBe("Zahrada");
  });

  it("readBenefitsContent zvládne úplně chybný vstup", () => {
    expect(readBenefitsContent(null).items).toEqual([]);
    expect(readBenefitsContent({ items: "ne" }).items).toEqual([]);
    expect(readBenefitsContent(undefined).items).toEqual([]);
  });

  it("readValuationContent parsuje čísla a vyžaduje zdroj", () => {
    const c = readValuationContent({
      items: [
        { source: "Reas", estimate_czk: 8900000, min_czk: 8500000, max_czk: 9300000 },
        { estimate_czk: 1000 }, // bez zdroje → vypadne
      ],
    });
    expect(c.items).toHaveLength(1);
    expect(c.items[0].source).toBe("Reas");
    expect(c.items[0].estimate_czk).toBe(8900000);
  });

  it("readConditionContent zahodí neplatný stav, ponechá platný", () => {
    const c = readConditionContent({
      items: [
        { category: "Střecha", condition: "new" },
        { category: "Okna", condition: "vymyšleno" },
      ],
    });
    expect(c.items).toHaveLength(2);
    expect(c.items[0].condition).toBe("new");
    expect(c.items[1].condition).toBeUndefined();
  });

  it("readMapContent přečte přiblížení jen jako číslo", () => {
    expect(readMapContent({ zoom: 15 }).zoom).toBe(15);
    expect(readMapContent({ zoom: "15" }).zoom).toBeUndefined();
  });
});

describe("typové stráže", () => {
  it("isEnergyClass", () => {
    expect(isEnergyClass("A")).toBe(true);
    expect(isEnergyClass("G")).toBe(true);
    expect(isEnergyClass("H")).toBe(false);
    expect(isEnergyClass("a")).toBe(false);
  });
  it("isConditionState", () => {
    expect(isConditionState("very-good")).toBe(true);
    expect(isConditionState("great")).toBe(false);
  });
  it("isTextSource", () => {
    expect(isTextSource("location_text")).toBe(true);
    expect(isTextSource("foo")).toBe(false);
  });
});

describe("PENB stupnice", () => {
  it("má 7 tříd A–G", () => {
    expect(ENERGY_CLASSES).toEqual(["A", "B", "C", "D", "E", "F", "G"]);
  });
  it("každá třída má popis i barvu", () => {
    for (const c of ENERGY_CLASSES) {
      expect(ENERGY_LABEL[c]).toBeTruthy();
      expect(ENERGY_COLOR[c]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe("výchozí sada sekcí (backfill / dopočet)", () => {
  it("odpovídá pořadí z backfillu migrace", () => {
    expect(DEFAULT_SECTION_SEEDS.map((s) => s.kind)).toEqual([
      "hero", "gallery", "text", "text", "text", "parameters", "contact",
    ]);
  });
  it("textové sekce odkazují na sloupce prezentace (žádná duplicita dat)", () => {
    const sources = DEFAULT_SECTION_SEEDS.filter((s) => s.kind === "text").map(
      (s) => (s.content as { source?: string }).source,
    );
    expect(sources).toEqual(["description", "location_text", "features_text"]);
  });
  it("všechny výchozí sekce jsou platné a ready", () => {
    for (const seed of DEFAULT_SECTION_SEEDS) {
      expect(isSectionKind(seed.kind)).toBe(true);
      expect(isReadyKind(seed.kind)).toBe(true);
    }
  });
});

describe("čtení obsahu — kolo 2/3", () => {
  it("readPoiContent vyžaduje název", () => {
    const c = readPoiContent({
      heading: "Okolí",
      items: [
        { name: "Škola", category: "Vzdělávání", distance: "5 min" },
        { category: "bez názvu" },
      ],
    });
    expect(c.items).toHaveLength(1);
    expect(c.items[0].name).toBe("Škola");
  });

  it("readSocialContent vyžaduje autora a ořeže hodnocení na 1–5", () => {
    const c = readSocialContent({
      items: [
        { author: "Novák", rating: 9, text: "super" },
        { author: "Malá", rating: 0 },
        { text: "bez autora" },
      ],
    });
    expect(c.items).toHaveLength(2);
    expect(c.items[0].rating).toBe(5); // 9 → strop 5
    expect(c.items[1].rating).toBe(1); // 0 → dolní mez 1
  });

  it("readNewsContent vyžaduje nadpis", () => {
    const c = readNewsContent({
      items: [
        { date: "2026", headline: "Novinka", text: "text" },
        { text: "bez nadpisu" },
      ],
    });
    expect(c.items).toHaveLength(1);
    expect(c.items[0].headline).toBe("Novinka");
  });

  it("readAnalyticMapsContent zahodí mapu bez obrázku i bez titulku", () => {
    const c = readAnalyticMapsContent({
      items: [
        { title: "Hluk", image_path: "u/p/a.jpg", why: "ticho" },
        { title: "Jen titulek" },
        { caption: "nic víc" },
      ],
    });
    expect(c.items).toHaveLength(2);
    expect(c.items[0].image_path).toBe("u/p/a.jpg");
  });

  it("readPanoramaContent přečte obrázek a popis", () => {
    const c = readPanoramaContent({ heading: "360", caption: "obývák", image_path: "u/p/x.jpg" });
    expect(c.image_path).toBe("u/p/x.jpg");
    expect(c.caption).toBe("obývák");
  });

  it("readFloorplansContent poskládá patra a místnosti, zahodí prázdné", () => {
    const c = readFloorplansContent({
      heading: "Půdorysy",
      floors: [
        {
          label: "Přízemí",
          image_path: "u/p/f1.jpg",
          rooms: [
            { name: "Kuchyně", area: "18 m²", description: "nová" },
            { area: "bez názvu" },
          ],
        },
        { rooms: [] }, // bez názvu i bez plánu → vypadne
      ],
    });
    expect(c.floors).toHaveLength(1);
    expect(c.floors[0].label).toBe("Přízemí");
    expect(c.floors[0].rooms).toHaveLength(1);
    expect(c.floors[0].rooms[0].name).toBe("Kuchyně");
  });

  it("readery zvládnou úplně chybný vstup", () => {
    expect(readPoiContent(null).items).toEqual([]);
    expect(readSocialContent(undefined).items).toEqual([]);
    expect(readNewsContent("ne").items).toEqual([]);
    expect(readAnalyticMapsContent({ items: "x" }).items).toEqual([]);
    expect(readFloorplansContent({ floors: "x" }).floors).toEqual([]);
    expect(readPanoramaContent(null).image_path).toBeUndefined();
  });
});

// =====================================================================
//  KOLO 4 — Video (parser odkazů) + Investiční kalkulačka (výpočty)
// =====================================================================

describe("parseVideoUrl — YouTube", () => {
  const EMBED = "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ";

  it("standardní watch?v=", () => {
    expect(parseVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")?.embedUrl).toBe(EMBED);
  });
  it("zkrácené youtu.be/", () => {
    expect(parseVideoUrl("https://youtu.be/dQw4w9WgXcQ")?.embedUrl).toBe(EMBED);
  });
  it("mobilní m.youtube.com", () => {
    expect(parseVideoUrl("https://m.youtube.com/watch?v=dQw4w9WgXcQ")?.embedUrl).toBe(EMBED);
  });
  it("watch?v= s dalšími parametry (list, čas) — na pořadí nezáleží", () => {
    expect(parseVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLxyz&t=30s")?.embedUrl).toBe(EMBED);
    expect(parseVideoUrl("https://www.youtube.com/watch?list=PLxyz&v=dQw4w9WgXcQ")?.embedUrl).toBe(EMBED);
  });
  it("embed / shorts / live / v cesty", () => {
    expect(parseVideoUrl("https://www.youtube.com/embed/dQw4w9WgXcQ")?.embedUrl).toBe(EMBED);
    expect(parseVideoUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ")?.embedUrl).toBe(EMBED);
    expect(parseVideoUrl("https://www.youtube.com/live/dQw4w9WgXcQ")?.embedUrl).toBe(EMBED);
    expect(parseVideoUrl("https://www.youtube.com/v/dQw4w9WgXcQ")?.embedUrl).toBe(EMBED);
  });
  it("už zadaná nocookie embed URL projde beze změny", () => {
    expect(parseVideoUrl("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ")?.embedUrl).toBe(EMBED);
  });
  it("provider je youtube a ID je vytažené správně", () => {
    const v = parseVideoUrl("https://youtu.be/dQw4w9WgXcQ");
    expect(v?.provider).toBe("youtube");
    expect(v?.id).toBe("dQw4w9WgXcQ");
  });
});

describe("parseVideoUrl — Vimeo", () => {
  it("základní vimeo.com/ID", () => {
    expect(parseVideoUrl("https://vimeo.com/123456789")?.embedUrl).toBe(
      "https://player.vimeo.com/video/123456789",
    );
  });
  it("player.vimeo.com/video/ID", () => {
    expect(parseVideoUrl("https://player.vimeo.com/video/123456789")?.embedUrl).toBe(
      "https://player.vimeo.com/video/123456789",
    );
  });
  it("neveřejné video s hashem v cestě (vimeo.com/ID/HASH)", () => {
    expect(parseVideoUrl("https://vimeo.com/123456789/abc123def4")?.embedUrl).toBe(
      "https://player.vimeo.com/video/123456789?h=abc123def4",
    );
  });
  it("hash v ?h= parametru", () => {
    expect(parseVideoUrl("https://player.vimeo.com/video/123456789?h=abc123def4")?.embedUrl).toBe(
      "https://player.vimeo.com/video/123456789?h=abc123def4",
    );
  });
  it("channels / groups cesty", () => {
    expect(parseVideoUrl("https://vimeo.com/channels/staffpicks/123456789")?.embedUrl).toBe(
      "https://player.vimeo.com/video/123456789",
    );
    expect(parseVideoUrl("https://vimeo.com/groups/nazev/videos/123456789")?.embedUrl).toBe(
      "https://player.vimeo.com/video/123456789",
    );
  });
  it("provider je vimeo", () => {
    expect(parseVideoUrl("https://vimeo.com/123456789")?.provider).toBe("vimeo");
  });
});

describe("parseVideoUrl — neplatné a nepodporované (nesmí spadnout)", () => {
  it("prázdné a nesmyslné vstupy → null", () => {
    expect(parseVideoUrl("")).toBeNull();
    expect(parseVideoUrl("   ")).toBeNull();
    expect(parseVideoUrl(null)).toBeNull();
    expect(parseVideoUrl(undefined)).toBeNull();
    expect(parseVideoUrl(42)).toBeNull();
    expect(parseVideoUrl("ngg")).toBeNull();
  });
  it("nepodporovaný poskytovatel (Dailymotion) → null", () => {
    expect(parseVideoUrl("https://www.dailymotion.com/video/x7tgad0")).toBeNull();
  });
  it("cizí odkaz s ?v= se nevydává za YouTube (jen povolené domény)", () => {
    expect(parseVideoUrl("https://example.com/watch?v=dQw4w9WgXcQ")).toBeNull();
  });
  it("YouTube odkaz s příliš krátkým ID → null", () => {
    expect(parseVideoUrl("https://www.youtube.com/watch?v=short")).toBeNull();
  });
});

describe("computeInvestment", () => {
  it("cena za m² z ceny a plochy", () => {
    expect(computeInvestment({ price: 9000000, area: 90 }).pricePerM2).toBe(100000);
  });
  it("hrubý výnos = (nájem×12)/cena×100 a roční nájem", () => {
    const r = computeInvestment({ price: 9000000, area: 90, rent: 18000 });
    expect(r.annualRent).toBe(216000);
    expect(r.grossYieldPct).toBeCloseTo(2.4, 6);
  });
  it("čistý výnos odečte roční náklady", () => {
    const r = computeInvestment({ price: 9000000, area: 90, rent: 18000, costs: 36000 });
    expect(r.netYieldPct).toBeCloseTo(2.0, 6);
  });
  it("čistý výnos je null, když náklady nejsou zadané", () => {
    expect(computeInvestment({ price: 9000000, area: 90, rent: 18000 }).netYieldPct).toBeNull();
  });
  it("náklady 0 → čistý výnos = hrubý výnos", () => {
    const r = computeInvestment({ price: 9000000, area: 90, rent: 18000, costs: 0 });
    expect(r.netYieldPct).toBeCloseTo(r.grossYieldPct as number, 6);
  });
  it("dělení nulou (cena 0) → cena/m² i výnosy null, nikdy Infinity", () => {
    const r = computeInvestment({ price: 0, area: 90, rent: 18000 });
    expect(r.pricePerM2).toBeNull();
    expect(r.grossYieldPct).toBeNull();
  });
  it("plocha 0 → cena/m² null (nikdy Infinity)", () => {
    expect(computeInvestment({ price: 9000000, area: 0 }).pricePerM2).toBeNull();
  });
  it("prázdné vstupy → vše null", () => {
    expect(computeInvestment({})).toEqual({
      pricePerM2: null,
      annualRent: null,
      grossYieldPct: null,
      netYieldPct: null,
    });
  });
  it("záporná / NaN / Infinity cena → null (žádný nesmysl)", () => {
    expect(computeInvestment({ price: -1, area: 90 }).pricePerM2).toBeNull();
    expect(computeInvestment({ price: Number.NaN, area: 90 }).pricePerM2).toBeNull();
    expect(computeInvestment({ price: Number.POSITIVE_INFINITY, area: 90 }).pricePerM2).toBeNull();
  });
  it("nájem bez ceny → roční nájem se spočítá, ale hrubý výnos je null", () => {
    const r = computeInvestment({ rent: 18000 });
    expect(r.annualRent).toBe(216000);
    expect(r.grossYieldPct).toBeNull();
  });
  it("záporné náklady se ignorují (čistý výnos null)", () => {
    expect(
      computeInvestment({ price: 9000000, area: 90, rent: 18000, costs: -5 }).netYieldPct,
    ).toBeNull();
  });
});

describe("čtení obsahu — kolo 4 (video, kalkulačka)", () => {
  it("readVideoContent přečte url, nadpis, popisek", () => {
    const c = readVideoContent({ url: "https://youtu.be/dQw4w9WgXcQ", heading: "Prohlídka", caption: "obývák" });
    expect(c.url).toBe("https://youtu.be/dQw4w9WgXcQ");
    expect(c.heading).toBe("Prohlídka");
    expect(c.caption).toBe("obývák");
  });
  it("readVideoContent zvládne chybný vstup", () => {
    expect(readVideoContent(null).url).toBeUndefined();
    expect(readVideoContent({ url: 42 }).url).toBeUndefined();
    const empty = readVideoContent(undefined);
    expect(empty.url).toBeUndefined();
    expect(empty.heading).toBeUndefined();
  });
  it("readInvestmentCalcContent přečte čísla, nezadané → null", () => {
    const c = readInvestmentCalcContent({ price_czk: 9000000, area_m2: 90, monthly_rent_czk: 18000 });
    expect(c.price_czk).toBe(9000000);
    expect(c.area_m2).toBe(90);
    expect(c.monthly_rent_czk).toBe(18000);
    expect(c.annual_costs_czk).toBeNull();
  });
  it("readInvestmentCalcContent zahodí nečíselné vstupy", () => {
    const c = readInvestmentCalcContent({ price_czk: "hodně", area_m2: null });
    expect(c.price_czk).toBeNull();
    expect(c.area_m2).toBeNull();
  });
});
