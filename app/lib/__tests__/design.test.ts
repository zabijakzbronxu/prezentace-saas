import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { designPath, isSafeDesignReturnTo, canMoveSection } from "../presentations/design";

// Testy vizuálního edit-modu:
//  1) čistá logika návratového cíle a řazení (bez DB),
//  2) strukturální pojistka: sdílený render a veřejná stránka NEsmí obsahovat
//     žádné editační ovládání → anonym nikdy nevidí edit-mode.

const UUID = "11111111-1111-1111-1111-111111111111";
const UUID2 = "abcdefab-cdef-abcd-efab-cdefabcdefab";

describe("designPath", () => {
  it("složí cestu edit-modu z ID prezentace", () => {
    expect(designPath(UUID)).toBe(`/presentations/${UUID}/design`);
  });
});

describe("isSafeDesignReturnTo", () => {
  it("pustí jen přesnou interní cestu edit-modu", () => {
    expect(isSafeDesignReturnTo(`/presentations/${UUID}/design`)).toBe(true);
    expect(isSafeDesignReturnTo(`/presentations/${UUID2}/design`)).toBe(true);
  });

  it("odmítne cizí a podvržené cíle (žádný open-redirect)", () => {
    // absolutní / protokol-relativní URL ven
    expect(isSafeDesignReturnTo(`https://evil.example/presentations/${UUID}/design`)).toBe(false);
    expect(isSafeDesignReturnTo(`//evil.example`)).toBe(false);
    expect(isSafeDesignReturnTo(`http://localhost/presentations/${UUID}/design`)).toBe(false);
    // jiná interní cesta než design
    expect(isSafeDesignReturnTo(`/presentations/${UUID}/sections`)).toBe(false);
    expect(isSafeDesignReturnTo(`/presentations/${UUID}/edit`)).toBe(false);
    // něco navíc za design (query/hash/segment)
    expect(isSafeDesignReturnTo(`/presentations/${UUID}/design?x=1`)).toBe(false);
    expect(isSafeDesignReturnTo(`/presentations/${UUID}/design#a`)).toBe(false);
    expect(isSafeDesignReturnTo(`/presentations/${UUID}/design/extra`)).toBe(false);
    // neplatné UUID
    expect(isSafeDesignReturnTo(`/presentations/not-a-uuid/design`)).toBe(false);
    // velikost/tvar
    expect(isSafeDesignReturnTo(`/PRESENTATIONS/${UUID}/design`)).toBe(false);
    expect(isSafeDesignReturnTo(` /presentations/${UUID}/design`)).toBe(false);
    // ne-řetězce a prázdno
    expect(isSafeDesignReturnTo("")).toBe(false);
    expect(isSafeDesignReturnTo(null)).toBe(false);
    expect(isSafeDesignReturnTo(undefined)).toBe(false);
    expect(isSafeDesignReturnTo(42)).toBe(false);
    expect(isSafeDesignReturnTo({ toString: () => `/presentations/${UUID}/design` })).toBe(false);
  });
});

describe("canMoveSection", () => {
  it("nahoru nejde z první sekce, dolů nejde z poslední", () => {
    expect(canMoveSection(0, 3, "up")).toBe(false);
    expect(canMoveSection(0, 3, "down")).toBe(true);
    expect(canMoveSection(1, 3, "up")).toBe(true);
    expect(canMoveSection(1, 3, "down")).toBe(true);
    expect(canMoveSection(2, 3, "up")).toBe(true);
    expect(canMoveSection(2, 3, "down")).toBe(false);
  });

  it("jediná sekce se nehýbe nikam", () => {
    expect(canMoveSection(0, 1, "up")).toBe(false);
    expect(canMoveSection(0, 1, "down")).toBe(false);
  });

  it("mimo rozsah je vždy false (pojistka)", () => {
    expect(canMoveSection(-1, 3, "up")).toBe(false);
    expect(canMoveSection(5, 3, "down")).toBe(false);
    expect(canMoveSection(3, 3, "up")).toBe(false);
  });
});

// --- strukturální pojistka: veřejný render bez editačního ovládání ---
const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, "../../"); // …/app
const read = (rel: string) => readFileSync(resolve(appRoot, rel), "utf8");

// Identifikátory editačních komponent/akcí, které patří JEN do edit-modu (/design),
// nikdy do veřejného renderu. (Zmínku „/design" v komentáři schválně nehlídáme —
// důkazem „žádné úpravy" jsou wired komponenty a akce níž, ne text v komentáři.)
const EDIT_MARKERS = [
  "SectionFrame",
  "InlineCaptions",
  "savePhotoCaption",
  "moveSection",
  "toggleSection",
  "deleteSection",
  "return_to",
  "section-frame",
];

describe("sdílený render nemá editační ovládání (anonym nevidí edit-mode)", () => {
  it("render.tsx je čistě prezentační", () => {
    const src = read("app/listing/[slug]/render.tsx");
    // sanity: čteme opravdu ten render
    expect(src).toContain("createSectionRenderer");
    for (const marker of EDIT_MARKERS) {
      expect(src, `render.tsx nesmí obsahovat „${marker}"`).not.toContain(marker);
    }
  });

  it("veřejná stránka /listing/[slug] neimportuje edit-mode", () => {
    const src = read("app/listing/[slug]/page.tsx");
    // používá sdílený render…
    expect(src).toContain("createSectionRenderer");
    // …ale žádné editační prvky ani odkaz na /design
    for (const marker of EDIT_MARKERS) {
      expect(src, `listing/page.tsx nesmí obsahovat „${marker}"`).not.toContain(marker);
    }
  });
});
