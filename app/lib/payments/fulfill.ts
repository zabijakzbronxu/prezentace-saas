// Jádro platebního toku: „co se má stát, když Stripe řekne, že je zaplaceno".
//
// Tenhle soubor SCHVÁLNĚ neimportuje ani Stripe, ani Supabase — mluví jen přes
// rozhraní (porty) níž. Díky tomu jde celá logika (včetně idempotence) otestovat
// bez sítě a bez databáze, a zároveň ji používá jak webhook, tak ruční ověření
// platby. Jedna logika, jedno místo, kde se může stát chyba.
//
// ŽELEZNÉ PRAVIDLO: pravda o zaplacení pochází VŽDY od Stripu (dotaz na server),
// NIKDY z návratové URL v prohlížeči — tu si může kdokoli vymyslet.

export type SessionPaymentStatus = "paid" | "unpaid" | "no_payment_required";
export type SessionStatus = "open" | "complete" | "expired";

/** To, co o Checkout Session potřebujeme vědět — očištěné od typů Stripu. */
export type CheckoutSessionInfo = {
  id: string;
  status: SessionStatus;
  paymentStatus: SessionPaymentStatus;
  /** Naše ID prezentace (posíláme ho do Stripu v metadatech). */
  presentationId: string | null;
  /** PaymentIntent (pi_…) — potřebujeme ho kvůli spárování refundu. */
  paymentIntentId: string | null;
  /** Zaplacená částka v haléřích. */
  amountTotal: number | null;
  currency: string | null;
  /** Adresa hostované platební stránky (dokud je session otevřená). */
  url: string | null;
};

/** Port k platební bráně (implementuje `stripe-gateway.ts`). */
export interface PaymentsGateway {
  retrieveSession(sessionId: string): Promise<CheckoutSessionInfo | null>;
}

/** Port k databázi (implementuje `store.ts`). Píše se service_role klientem. */
export interface PaymentsStore {
  /**
   * Označí platbu jako zaplacenou. MUSÍ být idempotentní:
   * druhé volání se stejnou session nesmí založit druhou platbu.
   * Vrací `already: true`, pokud už zaplacená byla.
   */
  markPaid(input: {
    sessionId: string;
    presentationId: string;
    paymentIntentId: string | null;
    amountCzk: number | null;
    currency: string | null;
    eventId: string | null;
  }): Promise<{ already: boolean }>;

  /** Publikuje prezentaci. Idempotentní (už publikovanou nechá být). */
  publishPresentation(presentationId: string): Promise<void>;

  /** Přepne rozdělanou platbu do koncového stavu (propadlá / neúspěšná). */
  markSessionStatus(
    sessionId: string,
    status: "failed" | "expired",
  ): Promise<void>;

  /** Vrácení peněz: platba → `refunded`. Prezentaci pak odpublikuje DB trigger. */
  markRefunded(input: {
    paymentIntentId: string;
    eventId: string | null;
  }): Promise<{ presentationId: string | null; already: boolean }>;

  /** Pojistka k triggeru — publikaci sundá i aplikace, ne jen databáze. */
  unpublishPresentation(presentationId: string): Promise<void>;
}

export type FulfillDeps = {
  gateway: PaymentsGateway;
  store: PaymentsStore;
};

export type FulfillResult =
  | { ok: true; presentationId: string; already: boolean }
  | {
      ok: false;
      reason: "unknown-session" | "unpaid" | "no-presentation";
      message: string;
    };

/**
 * Zaplaceno → zapiš platbu → publikuj. V tomhle pořadí (databázová brzda
 * `enforce_paid_before_publish` jiné pořadí ani nedovolí).
 *
 * Volá se z webhooku a z ručního „Ověřit platbu". Opakované volání je bezpečné.
 */
export async function fulfillSession(
  deps: FulfillDeps,
  input: { sessionId: string; eventId?: string | null },
): Promise<FulfillResult> {
  const session = await deps.gateway.retrieveSession(input.sessionId);

  if (!session) {
    return {
      ok: false,
      reason: "unknown-session",
      message: `Stripe nezná platební session ${input.sessionId}.`,
    };
  }

  // POZOR: `checkout.session.completed` sám o sobě NEZNAMENÁ zaplaceno.
  // U odložených metod (bankovní převod) dorazí completed s `payment_status: unpaid`
  // a peníze přijdou (nebo nepřijdou) až později. Publikovat smíme až tady.
  if (session.paymentStatus === "unpaid") {
    return {
      ok: false,
      reason: "unpaid",
      message: "Platba zatím není zaplacená (čeká se na peníze).",
    };
  }

  const presentationId = session.presentationId;
  if (!presentationId) {
    return {
      ok: false,
      reason: "no-presentation",
      message: `Platební session ${session.id} nemá v metadatech prezentaci.`,
    };
  }

  const { already } = await deps.store.markPaid({
    sessionId: session.id,
    presentationId,
    paymentIntentId: session.paymentIntentId,
    amountCzk: halereToCzk(session.amountTotal),
    currency: session.currency,
    eventId: input.eventId ?? null,
  });

  // Publikujeme i když už platba zaplacená byla — kdyby minule spadlo publikování,
  // opakované doručení eventu (nebo klik na „Ověřit platbu") to dorovná.
  await deps.store.publishPresentation(presentationId);

  return { ok: true, presentationId, already };
}

/** Haléře → celé koruny (sloupec `payments.amount_czk` je v korunách). */
export function halereToCzk(amountTotal: number | null): number | null {
  if (amountTotal === null || !Number.isFinite(amountTotal)) return null;
  return Math.round(amountTotal / 100);
}
