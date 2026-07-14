import type Stripe from "stripe";
import {
  getStripe,
  getWebhookSecret,
  isStripeConfigured,
  isWebhookConfigured,
} from "@/lib/stripe";
import { isAdminConfigured } from "@/lib/supabase/admin";
import { createStripeGateway } from "@/lib/payments/stripe-gateway";
import { createPaymentsStore } from "@/lib/payments/store";
import { handleStripeEvent, type WebhookEvent } from "@/lib/payments/webhook";

// Webhook Stripu — JEDINÁ automatická cesta, kterou se prezentace publikuje.
//
// Proč ne podle návratové adresy z prohlížeče: tu si může kdokoli napsat sám
// (stačí trefit URL). Tomuhle endpointu naopak věříme jen proto, že každý
// požadavek nese PODPIS, který umí vyrobit pouze Stripe (klíčem STRIPE_WEBHOOK_SECRET).
//
// Chování:
//   • špatný / chybějící podpis  → 400, nic se nestane
//   • událost už jednou viděná   → 200, nic se nestane (idempotence)
//   • zpracování selže           → 500 + uvolnění zámku → Stripe to zopakuje
//
// POZOR: musí běžet na Node (ne Edge) — potřebujeme přesné syrové tělo požadavku.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  // Chybějící klíče = chyba NA NAŠÍ STRANĚ → 500, ne 400.
  // Rozdíl je zásadní: po 400 Stripe doručení VZDÁ (myslí si, že je vadné) a
  // platba zákazníka by se ztratila. Po 500 to bude 3 dny zkoušet znovu — takže
  // až Karel klíč doplní, událost dorazí a prezentace se zveřejní sama.
  if (!isStripeConfigured() || !isWebhookConfigured() || !isAdminConfigured()) {
    console.error(
      "[stripe/webhook] chybí klíče na serveru (STRIPE_SECRET_KEY / " +
        "STRIPE_WEBHOOK_SECRET / SUPABASE_SERVICE_ROLE_KEY) — událost NEZPRACOVÁNA.",
    );
    return new Response("Platby nejsou na serveru nastavené.", { status: 500 });
  }

  // Syrové tělo — bez jediného bajtu navíc, jinak podpis nesedí.
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Chybí podpis Stripu.", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      getWebhookSecret(),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "neznámá chyba";
    console.error("[stripe/webhook] neplatný podpis:", message);
    // Tady 400 správně JE: podpis nesedí → požadavek neposlal Stripe (nebo je
    // špatný STRIPE_WEBHOOK_SECRET). Nic takového zpracovávat nechceme.
    return new Response(`Podpis neplatný: ${message}`, { status: 400 });
  }

  const store = createPaymentsStore(); // umí obojí: platby i knihu událostí
  const deps = { gateway: createStripeGateway(), store, ledger: store };

  try {
    const outcome = await handleStripeEvent(deps, toWebhookEvent(event));

    if (outcome.status === "duplicate") {
      console.log(`[stripe/webhook] ${event.id} už zpracováno dřív — přeskakuji.`);
    } else if (outcome.status === "handled") {
      console.log(`[stripe/webhook] ${event.type} (${event.id}): ${outcome.detail}`);
    }

    return Response.json({ received: true, status: outcome.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "neznámá chyba";
    // Žádné tiché selhání: nahlas do logu a 500 → Stripe doručení zopakuje
    // (a v dashboardu to Karel uvidí jako neúspěšné doručení).
    console.error(
      `[stripe/webhook] zpracování ${event.type} (${event.id}) SELHALO:`,
      message,
    );
    return new Response(`Zpracování selhalo: ${message}`, { status: 500 });
  }
}

/** Převod události Stripu na náš jednoduchý tvar (typy Stripu zůstávají tady). */
function toWebhookEvent(event: Stripe.Event): WebhookEvent {
  let sessionId: string | null = null;
  let paymentIntentId: string | null = null;

  if (event.type.startsWith("checkout.session.")) {
    const session = event.data.object as Stripe.Checkout.Session;
    sessionId = session.id;
    paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent?.id ?? null);
  } else if (event.type.startsWith("refund.")) {
    const refund = event.data.object as Stripe.Refund;
    paymentIntentId =
      typeof refund.payment_intent === "string"
        ? refund.payment_intent
        : (refund.payment_intent?.id ?? null);
  }

  return { id: event.id, type: event.type, sessionId, paymentIntentId };
}
