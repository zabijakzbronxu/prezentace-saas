// Rozhodovací logika webhooku — co udělat s kterou událostí Stripu.
//
// Opět bez importu Stripu i Supabase (jen porty), aby šla otestovat naostro:
// hlavně IDEMPOTENCE — tatáž událost doručená dvakrát nesmí zaplatit dvakrát.
//
// Jak idempotence funguje:
//   1. Událost si na začátku „zamkneme" zápisem do knihy `stripe_events`
//      (event_id = primární klíč). Když zápis neprojde, už jsme ji viděli → konec.
//   2. Když zpracování selže, zámek zase UVOLNÍME a vrátíme chybu (500), aby
//      Stripe doručení zopakoval. Žádné tiché selhání.

import { fulfillSession, type FulfillDeps } from "./fulfill";

/** Kniha zpracovaných událostí (implementuje `store.ts`). */
export interface EventLedger {
  /** Zamkne si událost. `false` = tuhle událost už jsme zpracovali. */
  claim(eventId: string, type: string): Promise<boolean>;
  /** Označí událost za dokončenou. */
  markProcessed(eventId: string): Promise<void>;
  /** Uvolní zámek po selhání, aby šlo doručení zopakovat. */
  release(eventId: string): Promise<void>;
}

export type WebhookDeps = FulfillDeps & { ledger: EventLedger };

/** Událost Stripu očištěná od typů Stripu (převod dělá route handler). */
export type WebhookEvent = {
  id: string;
  type: string;
  /** Checkout Session (cs_…) — u událostí `checkout.session.*`. */
  sessionId: string | null;
  /** PaymentIntent (pi_…) — u událostí o vrácení peněz. */
  paymentIntentId: string | null;
};

export type WebhookOutcome =
  /** Tuhle událost už jsme zpracovali dřív — nic se nestalo (a to je správně). */
  | { status: "duplicate"; eventId: string }
  /** Událost, která nás nezajímá (Stripe jich posílá spoustu). */
  | { status: "ignored"; eventId: string; type: string }
  | { status: "handled"; eventId: string; type: string; detail: string };

export const HANDLED_EVENT_TYPES = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
  "refund.created",
] as const;

export async function handleStripeEvent(
  deps: WebhookDeps,
  event: WebhookEvent,
): Promise<WebhookOutcome> {
  // ---- IDEMPOTENCE: zamkni si událost ----------------------------------
  const claimed = await deps.ledger.claim(event.id, event.type);
  if (!claimed) {
    return { status: "duplicate", eventId: event.id };
  }

  try {
    const outcome = await dispatch(deps, event);
    await deps.ledger.markProcessed(event.id);
    return outcome;
  } catch (err) {
    // Selhalo zpracování → zámek pryč, ať to Stripe zkusí znovu.
    // (Kdybychom zámek nechali, druhý pokus by událost přeskočil jako
    //  „už zpracovanou" a platba by se tiše ztratila.)
    await deps.ledger.release(event.id);
    throw err;
  }
}

async function dispatch(
  deps: WebhookDeps,
  event: WebhookEvent,
): Promise<WebhookOutcome> {
  const handled = (detail: string): WebhookOutcome => ({
    status: "handled",
    eventId: event.id,
    type: event.type,
    detail,
  });

  switch (event.type) {
    // Zákazník dokončil checkout, případně dorazily peníze u odložené metody.
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      if (!event.sessionId) throw new Error("Událost nemá ID platební session.");
      const result = await fulfillSession(deps, {
        sessionId: event.sessionId,
        eventId: event.id,
      });
      if (!result.ok) {
        if (result.reason === "unpaid") {
          // Není chyba: u bankovního převodu peníze teprve poputují.
          // Publikace počká na `async_payment_succeeded`.
          return handled("čeká se na peníze (odložená platba) — nepublikuji");
        }
        throw new Error(result.message);
      }
      return handled(
        result.already
          ? `platba už byla započtená, prezentace ${result.presentationId} publikovaná`
          : `zaplaceno, prezentace ${result.presentationId} publikovaná`,
      );
    }

    // Odložená platba neprošla.
    case "checkout.session.async_payment_failed": {
      if (!event.sessionId) throw new Error("Událost nemá ID platební session.");
      await deps.store.markSessionStatus(event.sessionId, "failed");
      return handled("platba selhala — prezentace zůstává konceptem");
    }

    // Zákazník checkout opustil a session propadla (default 30 min).
    // Uvolníme rozdělanou platbu, ať může zkusit znovu.
    case "checkout.session.expired": {
      if (!event.sessionId) throw new Error("Událost nemá ID platební session.");
      await deps.store.markSessionStatus(event.sessionId, "expired");
      return handled("checkout propadl — uvolněno pro nový pokus");
    }

    // Vrácení peněz → platba přestává platit → prezentace zpět na koncept.
    // (Sundá ji i DB trigger `unpublish_when_unpaid`; tady je to i v aplikaci,
    //  ať se to nespoléhá na jedinou vrstvu.)
    case "refund.created": {
      if (!event.paymentIntentId) {
        throw new Error("Událost o vrácení peněz nemá ID platby (PaymentIntent).");
      }
      const { presentationId, already } = await deps.store.markRefunded({
        paymentIntentId: event.paymentIntentId,
        eventId: event.id,
      });
      if (!presentationId) {
        return handled("k vrácené platbě se nenašla naše platba — nic neměním");
      }
      await deps.store.unpublishPresentation(presentationId);
      return handled(
        already
          ? `platba už byla vrácená, prezentace ${presentationId} je koncept`
          : `peníze vráceny, prezentace ${presentationId} sundána z veřejné adresy`,
      );
    }

    default:
      return { status: "ignored", eventId: event.id, type: event.type };
  }
}
