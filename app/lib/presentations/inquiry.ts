// Validace kontaktní poptávky z veřejné stránky. Čistá logika (bez Next/DB),
// aby ji šlo sdílet mezi serverovou akcí a testem (vitest).
//
// Anti-spam: honeypot pole `company` — skrytý input, který normální člověk
// nevyplní. Když je vyplněný, tváříme se úspěšně (spam:true), ale NEUKLÁDÁME.

export type InquiryInput = {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  /** Honeypot (skryté pole). Vyplněné = bot. */
  honeypot?: string;
};

export type InquiryValues = {
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
};

export type InquiryValidation =
  | { ok: true; spam: boolean; values: InquiryValues }
  | { ok: false; message: string };

/** Limity (drží se DB CHECK omezení v migraci). */
export const INQUIRY_MAX = {
  name: 120,
  email: 200,
  phone: 30,
  message: 2000,
} as const;

// Základní tvar e-mailu (stejně mírný jako u kontaktu prodávajícího). Přísnější
// kontrola víc škodí než pomáhá.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Zvaliduje poptávku. Vrací buď hodnoty k uložení, nebo českou hlášku.
 * `spam:true` = honeypot chytil bota → volající se má tvářit úspěšně a NEUKLÁDAT.
 */
export function validateInquiry(input: InquiryInput): InquiryValidation {
  if (typeof input.honeypot === "string" && input.honeypot.trim().length > 0) {
    return { ok: true, spam: true, values: { name: "", email: null, phone: null, message: "" } };
  }

  const name = (input.name ?? "").trim();
  const email = (input.email ?? "").trim();
  const phone = (input.phone ?? "").trim();
  const message = (input.message ?? "").trim();

  if (!name) return { ok: false, message: "Vyplňte prosím jméno." };
  if (name.length > INQUIRY_MAX.name) {
    return { ok: false, message: `Jméno je moc dlouhé (max ${INQUIRY_MAX.name} znaků).` };
  }
  if (!message) return { ok: false, message: "Napište prosím krátkou zprávu." };
  if (message.length > INQUIRY_MAX.message) {
    return { ok: false, message: `Zpráva je moc dlouhá (max ${INQUIRY_MAX.message} znaků).` };
  }
  if (!email && !phone) {
    return { ok: false, message: "Nechte prosím kontakt — e-mail nebo telefon." };
  }
  if (email) {
    if (email.length > INQUIRY_MAX.email) {
      return { ok: false, message: `E-mail je moc dlouhý (max ${INQUIRY_MAX.email} znaků).` };
    }
    if (!EMAIL_RE.test(email)) {
      return { ok: false, message: "E-mail nevypadá správně — zkontrolujte ho prosím." };
    }
  }
  if (phone) {
    if (phone.length > INQUIRY_MAX.phone) {
      return { ok: false, message: `Telefon je moc dlouhý (max ${INQUIRY_MAX.phone} znaků).` };
    }
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 6) {
      return { ok: false, message: "Telefon nevypadá správně — použijte číslice, případně +420." };
    }
  }

  return {
    ok: true,
    spam: false,
    values: { name, email: email || null, phone: phone || null, message },
  };
}
