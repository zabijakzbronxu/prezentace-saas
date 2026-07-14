import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Servisní (admin) klient Supabase — JEDINÝ, kdo smí zapisovat do tabulky
// `payments` a do knihy `stripe_events`. Obchází RLS, takže se používá VÝHRADNĚ
// tam, kde o přístupu rozhoduje server, ne uživatel: ve Stripe webhooku a při
// serverovém ověření platby.
//
// `server-only` je pojistka proti tomu, aby se servisní klíč omylem dostal do
// kódu běžícího v prohlížeči (build by spadl).
//
// NIKDY nepředávej tenhle klient do kódu, kde o datech rozhoduje vstup uživatele
// bez vlastní kontroly vlastnictví.

let cached: ReturnType<typeof createSupabaseClient<Database>> | null = null;

export function isAdminConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Chybí SUPABASE_SERVICE_ROLE_KEY (nebo NEXT_PUBLIC_SUPABASE_URL). " +
        "Bez servisního klíče nejde zapsat platbu — platby nebudou fungovat.",
    );
  }

  if (!cached) {
    cached = createSupabaseClient<Database>(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
