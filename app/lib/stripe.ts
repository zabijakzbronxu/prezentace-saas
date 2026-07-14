import "server-only";
import Stripe from "stripe";

// Stripe klient. `server-only` nahoře je pojistka: kdyby někdo tenhle soubor
// omylem importoval do komponenty běžící v prohlížeči, build spadne — tajný
// klíč se tak nikdy nemůže dostat do kódu, který si stáhne návštěvník.
//
// `apiVersion` schválně NEUVÁDÍME: knihovna použije verzi, se kterou byla
// vydaná, a verze balíčku je v package.json zamčená. Kdybychom ji psali
// natvrdo, každý upgrade knihovny by shodil typovou kontrolu.

let cached: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function isWebhookConfigured(): boolean {
  return Boolean(process.env.STRIPE_WEBHOOK_SECRET);
}

/** Vrátí Stripe klienta. Když chybí klíč, spadne hned a nahlas (žádné tiché selhání). */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "Chybí STRIPE_SECRET_KEY. Platby nejsou nastavené — doplň proměnnou prostředí.",
    );
  }
  if (!cached) cached = new Stripe(key);
  return cached;
}

export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error(
      "Chybí STRIPE_WEBHOOK_SECRET. Bez něj nejde ověřit, že webhook opravdu poslal Stripe.",
    );
  }
  return secret;
}
