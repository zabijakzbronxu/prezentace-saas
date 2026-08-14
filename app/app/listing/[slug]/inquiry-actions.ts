"use server";

// Server action pro kontaktní formulář na veřejné stránce. Kdokoliv (i anonym)
// smí vložit poptávku, ale RLS pustí insert JEN na PUBLISHED prezentaci a číst ji
// smí jen vlastník (viz migrace presentation_inquiries). Nikdy tiché selhání —
// vrací stav pro useActionState, formulář ho ukáže na místě.

import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/presentations/form";
import { isMissingSchemaError } from "@/lib/db-errors";
import { validateInquiry } from "@/lib/presentations/inquiry";

export type InquiryState = { ok?: boolean; error?: string };

function str(v: FormDataEntryValue | null): string | undefined {
  return typeof v === "string" ? v : undefined;
}

export async function submitInquiry(
  _prevState: InquiryState,
  formData: FormData,
): Promise<InquiryState> {
  const presentationId = String(formData.get("presentation_id") ?? "");
  if (!isUuid(presentationId)) {
    return { error: "Něco se pokazilo, zkuste to prosím znovu." };
  }

  const result = validateInquiry({
    name: str(formData.get("name")),
    email: str(formData.get("email")),
    phone: str(formData.get("phone")),
    message: str(formData.get("message")),
    honeypot: str(formData.get("company")),
  });
  if (!result.ok) return { error: result.message };
  // Honeypot chytil bota: tváříme se úspěšně, ale nic neukládáme.
  if (result.spam) return { ok: true };

  const supabase = await createClient();
  const { error } = await supabase.from("presentation_inquiries").insert({
    presentation_id: presentationId,
    name: result.values.name,
    email: result.values.email,
    phone: result.values.phone,
    message: result.values.message,
  });

  if (error) {
    console.error("[inquiry] uložení poptávky selhalo:", error.message);
    if (isMissingSchemaError(error)) {
      return {
        error:
          "Formulář zatím není zapnutý (chybí databáze). Zkuste to prosím později, nebo použijte telefon/e-mail výše.",
      };
    }
    // RLS odmítne insert na nepublikovanou prezentaci → sem spadne i náhled.
    return {
      error:
        "Zprávu se nepodařilo odeslat. Zkuste to prosím znovu, nebo použijte telefon/e-mail výše.",
    };
  }

  return { ok: true };
}
