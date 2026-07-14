// Cena a měna za zveřejnění prezentace.
//
// PRAVIDLO: cena NIKDY nepřichází z prohlížeče a není zadrátovaná v kódu.
// Bere se výhradně ze serverové konfigurace (proměnné prostředí), takže ji
// Karel může změnit bez zásahu programátora — a nikdo si ji nemůže podvrhnout.
//
// Čistá funkce bez závislostí → jde otestovat bez sítě i bez env.

/** Měna. Stripe chce malá písmena. CZK je dvoudecimální (490 Kč = 49 000 haléřů). */
export const CURRENCY = "czk" as const;

/** Stripe neúčtuje míň než 15 Kč — pod to platbu odmítne. */
export const STRIPE_MIN_CZK = 15;

/** Rozumný strop, ať překlep v konfiguraci nezpůsobí nesmyslnou částku. */
export const MAX_PRICE_CZK = 100_000;

export const DEFAULT_PRICE_CZK = 490;
export const DEFAULT_PRODUCT_NAME = "Zveřejnění prezentace nemovitosti";

export type PriceConfig = {
  /** Cena v celých korunách (pro zobrazení a pro sloupec `payments.amount_czk`). */
  amountCzk: number;
  /** Cena v haléřích (to, co chce Stripe v `unit_amount`). */
  unitAmount: number;
  currency: typeof CURRENCY;
  /** Název položky, který uvidí zákazník na Stripu i na účtence. */
  productName: string;
};

export type PriceConfigResult =
  | { ok: true; config: PriceConfig }
  | { ok: false; message: string };

/**
 * Přečte cenu z proměnných prostředí a ověří ji.
 * Chybu vrací jako hlášku (nikdy nespadne) — volající se rozhodne, co s ní.
 */
export function resolvePriceConfig(
  env: Record<string, string | undefined>,
): PriceConfigResult {
  const raw = env.PUBLISH_PRICE_CZK?.trim();

  let amountCzk: number;
  if (!raw) {
    amountCzk = DEFAULT_PRICE_CZK;
  } else if (!/^\d+$/.test(raw)) {
    return {
      ok: false,
      message: `Cena v nastavení (PUBLISH_PRICE_CZK) není celé číslo: „${raw}".`,
    };
  } else {
    amountCzk = Number(raw);
  }

  if (amountCzk < STRIPE_MIN_CZK) {
    return {
      ok: false,
      message: `Cena musí být aspoň ${STRIPE_MIN_CZK} Kč (nižší částku Stripe neúčtuje).`,
    };
  }
  if (amountCzk > MAX_PRICE_CZK) {
    return {
      ok: false,
      message: `Cena je podezřele vysoká (${amountCzk} Kč). Zkontroluj PUBLISH_PRICE_CZK.`,
    };
  }

  const productName = env.PUBLISH_PRODUCT_NAME?.trim() || DEFAULT_PRODUCT_NAME;

  return {
    ok: true,
    config: {
      amountCzk,
      unitAmount: amountCzk * 100, // CZK je dvoudecimální → haléře
      currency: CURRENCY,
      productName,
    },
  };
}
