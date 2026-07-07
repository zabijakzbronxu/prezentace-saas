import { describe, it, expect } from "vitest";
import {
  num,
  text,
  isUuid,
  parseBasicFields,
  parseContactFields,
} from "../presentations/form";

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

describe("text", () => {
  it("ořízne mezery a prázdné vrací jako null", () => {
    expect(text(fd({ a: "  ahoj  " }), "a")).toBe("ahoj");
    expect(text(fd({ a: "   " }), "a")).toBeNull();
    expect(text(fd({}), "chybi")).toBeNull();
  });
});

describe("num", () => {
  it("parsuje česká čísla (mezery, čárka)", () => {
    expect(num(fd({ n: "8 900 000" }), "n")).toBe(8_900_000);
    expect(num(fd({ n: "82,5" }), "n")).toBe(82.5);
  });

  it("nesmyslný tvar vrací null (nezahazuje potichu zbytek)", () => {
    expect(num(fd({ n: "1.2.3" }), "n")).toBeNull();
    expect(num(fd({ n: "abc" }), "n")).toBeNull();
    expect(num(fd({ n: "12abc" }), "n")).toBeNull();
  });

  it("zachovává znaménko (záporné nechá validaci rozsahů)", () => {
    expect(num(fd({ n: "-5" }), "n")).toBe(-5);
  });
});

describe("parseBasicFields", () => {
  const valid = {
    city: "Praha",
    price_czk: "8 900 000",
  };

  it("projde s minimem (město + cena) a zaokrouhlí cenu na celé Kč", () => {
    const r = parseBasicFields(fd({ ...valid, price_czk: "8900000,60" }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.values.price_czk).toBe(8_900_001);
  });

  it("odmítne chybějící adresu", () => {
    const r = parseBasicFields(fd({ price_czk: "100" }));
    expect(r.ok).toBe(false);
  });

  it("odmítne chybějící/zápornou cenu", () => {
    expect(parseBasicFields(fd({ city: "Praha" })).ok).toBe(false);
    expect(parseBasicFields(fd({ city: "Praha", price_czk: "-5" })).ok).toBe(false);
  });

  it("normalizuje energetickou třídu na velké písmeno a odmítne neplatnou", () => {
    const r = parseBasicFields(fd({ ...valid, energy_class: "b" }));
    expect(r.ok && r.values.energy_class === "B").toBe(true);
    expect(parseBasicFields(fd({ ...valid, energy_class: "X" })).ok).toBe(false);
  });

  it("hlídá délky textů a rozsahy ploch", () => {
    expect(parseBasicFields(fd({ ...valid, title: "x".repeat(201) })).ok).toBe(false);
    expect(parseBasicFields(fd({ ...valid, floor_area_m2: "1000001" })).ok).toBe(false);
  });
});

describe("parseContactFields", () => {
  it("všechno prázdné je v pořádku (kontakt je volitelný)", () => {
    const r = parseContactFields(fd({}));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.values).toEqual({ contact_name: null, contact_email: null, contact_phone: null });
  });

  it("projde s rozumným kontaktem", () => {
    const r = parseContactFields(
      fd({ contact_name: "Karel Novák", contact_email: "karel@email.cz", contact_phone: "+420 777 123 456" }),
    );
    expect(r.ok).toBe(true);
  });

  it("odmítne e-mail bez zavináče nebo domény", () => {
    expect(parseContactFields(fd({ contact_email: "karel" })).ok).toBe(false);
    expect(parseContactFields(fd({ contact_email: "karel@email" })).ok).toBe(false);
  });

  it("odmítne telefon s písmeny nebo málo číslicemi", () => {
    expect(parseContactFields(fd({ contact_phone: "zavolej mi" })).ok).toBe(false);
    expect(parseContactFields(fd({ contact_phone: "123" })).ok).toBe(false);
  });

  it("hlídá délky", () => {
    expect(parseContactFields(fd({ contact_name: "x".repeat(121) })).ok).toBe(false);
  });
});

describe("isUuid", () => {
  it("pozná platné UUID a odmítne zbytek", () => {
    expect(isUuid("123e4567-e89b-12d3-a456-426614174000")).toBe(true);
    expect(isUuid("neco-jineho")).toBe(false);
    expect(isUuid("")).toBe(false);
  });
});
