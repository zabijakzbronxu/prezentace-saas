import { describe, it, expect } from "vitest";
import { readValuationContent, readConditionContent } from "../presentations/sections";

const UUID = "11111111-2222-3333-4444-555555555555";

describe("readValuationContent — screenshot", () => {
  it("přečte image_path u odhadu", () => {
    const v = readValuationContent({
      items: [{ source: "Reas", estimate_czk: 8_900_000, image_path: "u/p/x.jpg" }],
    });
    expect(v.items[0].image_path).toBe("u/p/x.jpg");
  });
  it("chybějící image_path → undefined", () => {
    const v = readValuationContent({ items: [{ source: "Reas" }] });
    expect(v.items[0].image_path).toBeUndefined();
  });
});

describe("readConditionContent — foto + dokument", () => {
  it("přečte image_path a platné document_id (uuid)", () => {
    const c = readConditionContent({
      items: [{ category: "Střecha", condition: "new", image_path: "u/p/y.png", document_id: UUID }],
    });
    expect(c.items[0].image_path).toBe("u/p/y.png");
    expect(c.items[0].document_id).toBe(UUID);
  });

  it("neplatné document_id (ne-uuid) se zahodí", () => {
    const c = readConditionContent({
      items: [{ category: "Střecha", document_id: "nejsem-uuid" }],
    });
    expect(c.items[0].document_id).toBeUndefined();
  });

  it("bez foto/dokumentu položka dál funguje", () => {
    const c = readConditionContent({ items: [{ category: "Fasáda", condition: "good" }] });
    expect(c.items[0].category).toBe("Fasáda");
    expect(c.items[0].image_path).toBeUndefined();
    expect(c.items[0].document_id).toBeUndefined();
  });
});
