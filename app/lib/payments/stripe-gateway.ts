import "server-only";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import type {
  CheckoutSessionInfo,
  PaymentsGateway,
  SessionPaymentStatus,
  SessionStatus,
} from "./fulfill";
import type { PriceConfig } from "./config";

// Napojení na Stripe. Překládá „stripovské" objekty na náš jednoduchý tvar
// (`CheckoutSessionInfo`), aby zbytek aplikace o Stripu nemusel nic vědět.

/** Náš klíč v metadatech session — přes něj se platba páruje s prezentací. */
export const META_PRESENTATION_ID = "presentationId";

export function toSessionInfo(s: Stripe.Checkout.Session): CheckoutSessionInfo {
  const paymentIntentId =
    typeof s.payment_intent === "string"
      ? s.payment_intent
      : (s.payment_intent?.id ?? null);

  return {
    id: s.id,
    status: (s.status ?? "open") as SessionStatus,
    paymentStatus: s.payment_status as SessionPaymentStatus,
    presentationId:
      s.metadata?.[META_PRESENTATION_ID] ?? s.client_reference_id ?? null,
    paymentIntentId,
    amountTotal: s.amount_total,
    currency: s.currency,
    url: s.url,
  };
}

export function createStripeGateway(): PaymentsGateway {
  return {
    async retrieveSession(sessionId: string) {
      const stripe = getStripe();
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        return toSessionInfo(session);
      } catch (err) {
        // Neznámé ID session není chyba serveru — je to „tuhle platbu neznám".
        if (
          typeof err === "object" &&
          err !== null &&
          (err as { code?: string }).code === "resource_missing"
        ) {
          return null;
        }
        throw err;
      }
    },
  };
}

/**
 * Založí hostovanou platební stránku (Stripe Checkout).
 *
 * Cena jde VÝHRADNĚ ze serverové konfigurace (`priceConfig`) — z prohlížeče
 * přijde jen ID prezentace, které navíc ověřujeme proti přihlášenému uživateli.
 *
 * `idempotencyKey` je pojistka proti dvojímu kliknutí na „Zveřejnit":
 * dva stejné požadavky během chvilky vrátí tutéž session, ne dvě.
 */
export async function createCheckoutSession(input: {
  presentationId: string;
  priceConfig: PriceConfig;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string | null;
  idempotencyKey: string;
}): Promise<CheckoutSessionInfo> {
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      locale: "cs",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.priceConfig.currency,
            unit_amount: input.priceConfig.unitAmount, // v haléřích
            product_data: { name: input.priceConfig.productName },
          },
        },
      ],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      // Obojí schválně: `client_reference_id` je vidět a hledatelné v dashboardu,
      // `metadata` čteme zpátky ve webhooku.
      client_reference_id: input.presentationId,
      metadata: { [META_PRESENTATION_ID]: input.presentationId },
      payment_intent_data: {
        // Metadata i na platbě — události o vrácení peněz nesou platbu, ne session.
        metadata: { [META_PRESENTATION_ID]: input.presentationId },
        description: input.priceConfig.productName,
      },
      ...(input.customerEmail ? { customer_email: input.customerEmail } : {}),
      // Nedokončený checkout propadne za hodinu → rozdělaná platba se uvolní a
      // uživatel může zkusit znovu. (Stripe povoluje 30 min až 24 h; 30 min
      // schválně nedáváme — je to přesně na hraně a mohlo by to spadnout na
      // zaokrouhlení času.)
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
    },
    { idempotencyKey: input.idempotencyKey },
  );

  return toSessionInfo(session);
}
