import { describe, it, expect } from "vitest";
import { formatPrice, formatArea, formatAddress } from "../format";

// Intl pro cs-CZ odděluje tisíce nezlomitelnou mezerou (U+00A0).
const NBSP = " ";

describe("formatPrice", () => {
  it("formátuje celé Kč s českými oddělovači", () => {
    expect(formatPrice(8_900_000)).toBe(`8${NBSP}900${NBSP}000 Kč`);
  });

  it("null vrací záložní text", () => {
    expect(formatPrice(null)).toBe("cena neuvedena");
    expect(formatPrice(null, "—")).toBe("—");
  });
});

describe("formatArea", () => {
  it("formátuje m² s nejvýš jedním desetinným místem", () => {
    expect(formatArea(82.5)).toBe(`82,5 m²`);
    expect(formatArea(1250)).toBe(`1${NBSP}250 m²`);
  });

  it("null vrací null (sekce se nezobrazí)", () => {
    expect(formatArea(null)).toBeNull();
  });
});

describe("formatAddress", () => {
  it("složí ulici a město", () => {
    expect(formatAddress({ street: "Otínská 123", city: "Praha" })).toBe("Otínská 123, Praha");
  });

  it("zvládne chybějící kousky", () => {
    expect(formatAddress({ street: null, city: "Praha" })).toBe("Praha");
    expect(formatAddress({ street: null, city: null })).toBeNull();
  });
});
