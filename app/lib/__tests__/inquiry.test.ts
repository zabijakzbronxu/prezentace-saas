import { describe, it, expect } from "vitest";
import { validateInquiry } from "../presentations/inquiry";

describe("validateInquiry", () => {
  const ok = { name: "Jan Novák", email: "jan@example.com", message: "Mám zájem o prohlídku." };

  it("platná poptávka projde", () => {
    const r = validateInquiry(ok);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.spam).toBe(false);
      expect(r.values).toEqual({
        name: "Jan Novák",
        email: "jan@example.com",
        phone: null,
        message: "Mám zájem o prohlídku.",
      });
    }
  });

  it("honeypot vyplněný → ok+spam (neukládat)", () => {
    const r = validateInquiry({ ...ok, honeypot: "bot inc." });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.spam).toBe(true);
  });

  it("chybí jméno → chyba", () => {
    const r = validateInquiry({ ...ok, name: "   " });
    expect(r.ok).toBe(false);
  });

  it("chybí zpráva → chyba", () => {
    const r = validateInquiry({ ...ok, message: "" });
    expect(r.ok).toBe(false);
  });

  it("chybí e-mail i telefon → chyba", () => {
    const r = validateInquiry({ name: "Jan", message: "Zpráva" });
    expect(r.ok).toBe(false);
  });

  it("stačí telefon (bez e-mailu)", () => {
    const r = validateInquiry({ name: "Jan", phone: "+420 601 123 456", message: "Zpráva" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.values.phone).toBe("+420 601 123 456");
  });

  it("špatný tvar e-mailu → chyba", () => {
    const r = validateInquiry({ name: "Jan", email: "neni-email", message: "Zpráva" });
    expect(r.ok).toBe(false);
  });

  it("krátký telefon → chyba", () => {
    const r = validateInquiry({ name: "Jan", phone: "123", message: "Zpráva" });
    expect(r.ok).toBe(false);
  });

  it("moc dlouhá zpráva → chyba", () => {
    const r = validateInquiry({ name: "Jan", email: "j@e.cz", message: "x".repeat(2001) });
    expect(r.ok).toBe(false);
  });

  it("ořízne mezery kolem hodnot", () => {
    const r = validateInquiry({ name: "  Jan  ", email: "  j@e.cz ", message: "  ahoj  " });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.values.name).toBe("Jan");
      expect(r.values.email).toBe("j@e.cz");
      expect(r.values.message).toBe("ahoj");
    }
  });
});
