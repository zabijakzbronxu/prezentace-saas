import { describe, it, expect } from "vitest";
import {
  groupByGalleryCategory,
  galleryCategoryLabel,
  GALLERY_OTHER_LABEL,
} from "../presentations/sections";

describe("galleryCategoryLabel", () => {
  it("mapuje známé kategorie na české názvy", () => {
    expect(galleryCategoryLabel("exterier")).toBe("Exteriér");
    expect(galleryCategoryLabel("interier")).toBe("Interiér");
    expect(galleryCategoryLabel("zahrada")).toBe("Zahrada");
    expect(galleryCategoryLabel("okoli")).toBe("Okolí");
  });
  it("prázdná/neznámá → Ostatní resp. syrová hodnota", () => {
    expect(galleryCategoryLabel("")).toBe(GALLERY_OTHER_LABEL);
    expect(galleryCategoryLabel(null)).toBe(GALLERY_OTHER_LABEL);
    expect(galleryCategoryLabel(undefined)).toBe(GALLERY_OTHER_LABEL);
    expect(galleryCategoryLabel("balkon")).toBe("balkon");
  });
});

describe("groupByGalleryCategory", () => {
  it("bez kategorií vrátí jedinou skupinu s klíčem \"\"", () => {
    const groups = groupByGalleryCategory([{ id: "a" }, { id: "b" }] as { id: string; category?: string }[]);
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe("");
    expect(groups[0].items.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("seskupí a zachová pořadí fotek uvnitř skupiny", () => {
    const groups = groupByGalleryCategory([
      { id: "1", category: "interier" },
      { id: "2", category: "exterier" },
      { id: "3", category: "interier" },
    ]);
    const ext = groups.find((g) => g.key === "exterier")!;
    const intr = groups.find((g) => g.key === "interier")!;
    expect(intr.items.map((i) => i.id)).toEqual(["1", "3"]);
    expect(ext.items.map((i) => i.id)).toEqual(["2"]);
  });

  it("řadí známé kategorie napřed, ostatní dle výskytu, Ostatní nakonec", () => {
    const groups = groupByGalleryCategory([
      { id: "1", category: "" },
      { id: "2", category: "balkon" },
      { id: "3", category: "zahrada" },
      { id: "4", category: "exterier" },
    ]);
    expect(groups.map((g) => g.key)).toEqual(["exterier", "zahrada", "balkon", ""]);
    expect(groups[groups.length - 1].label).toBe(GALLERY_OTHER_LABEL);
  });

  it("prázdný vstup → žádné skupiny", () => {
    expect(groupByGalleryCategory([])).toEqual([]);
  });
});
