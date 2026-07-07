import { describe, it, expect } from "vitest";
import { slugify, randomSuffix } from "../slug";

describe("slugify", () => {
  it("odstraní diakritiku a udělá pomlčky", () => {
    expect(slugify("Otínská 123, Praha — Radotín")).toBe("otinska-123-praha-radotin");
  });

  it("zvládne prázdný vstup", () => {
    expect(slugify("")).toBe("");
    expect(slugify("   ")).toBe("");
  });

  it("ořízne na 60 znaků", () => {
    expect(slugify("a".repeat(100)).length).toBeLessThanOrEqual(60);
  });

  it("neobsahuje nic než a-z, 0-9 a pomlčku", () => {
    expect(slugify("Ulice č. 5/12 (přízemí)!")).toMatch(/^[a-z0-9-]*$/);
  });
});

describe("randomSuffix", () => {
  it("má výchozí délku 6 a jen povolené znaky", () => {
    const s = randomSuffix();
    expect(s).toHaveLength(6);
    expect(s).toMatch(/^[a-z0-9]+$/);
  });

  it("respektuje zadanou délku", () => {
    expect(randomSuffix(10)).toHaveLength(10);
  });
});
