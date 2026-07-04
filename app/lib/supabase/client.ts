import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase klient pro prohlížeč (client components).
 * Používá veřejné env proměnné NEXT_PUBLIC_SUPABASE_URL a _ANON_KEY.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
