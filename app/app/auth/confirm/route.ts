import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Bezpečná normalizace cílové cesty po potvrzení e-mailu.
 * Povolí JEN interní relativní cestu (začíná jedním "/").
 * Zablokuje absolutní URL i "//evil.com" a "/\evil.com" (chrání před open redirectem
 * na cizí web = phishing). Cokoli nevyhovujícího → fallback na "/account".
 */
function safeNextPath(raw: string | null): string {
  if (!raw) return "/account";
  if (!raw.startsWith("/")) return "/account"; // absolutní URL nebo relativní bez lomítka
  if (raw.startsWith("//") || raw.startsWith("/\\")) return "/account"; // protocol-relative / obcházení
  return raw;
}

/**
 * Zpracování odkazu z potvrzovacího e-mailu (Supabase Auth).
 * Uživatel klikne na odkaz v e-mailu → sem → ověření → přesměrování.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(searchParams.get("next"));

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      redirect(next);
    }
  }

  redirect("/login?error=" + encodeURIComponent("Odkaz je neplatný nebo vypršel."));
}
