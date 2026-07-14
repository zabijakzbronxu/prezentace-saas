"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { isUuid, type FormState } from "@/lib/presentations/form";
import { resolvePriceConfig } from "@/lib/payments/config";
import {
  createCheckoutSession,
  createStripeGateway,
} from "@/lib/payments/stripe-gateway";
import { createPaymentsStore } from "@/lib/payments/store";
import { fulfillSession } from "@/lib/payments/fulfill";
import { getSiteUrl } from "@/lib/payments/site-url";
import { isStripeConfigured } from "@/lib/stripe";

/**
 * Krok 4 průvodce: „Zveřejnit" → hostovaná platební stránka Stripu.
 *
 * Co se tu hlídá:
 *  • prezentaci vlastní přihlášený uživatel (RLS + kontrola níž),
 *  • cena přichází ZE SERVERU, nikdy z prohlížeče,
 *  • dvojklik nezaloží dvě platby (unikátní index „jedna rozdělaná platba
 *    na prezentaci" + znovupoužití už otevřené platební stránky).
 *
 * Publikaci tahle akce NEODEMYKÁ. To umí jen webhook (nebo serverové ověření
 * u Stripu) — viz `verifyPayment` níž.
 */
export async function startCheckout(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) redirect("/presentations");

  if (!isStripeConfigured() || !isAdminConfigured()) {
    return {
      error:
        "Platby zatím nejsou nastavené (chybí klíče na serveru). Napiš správci, ať doplní nastavení.",
    };
  }

  // Prezentace musí patřit přihlášenému (RLS by cizí ani nevrátila).
  const { data: presentation, error: loadError } = await supabase
    .from("presentations")
    .select("id, slug, status")
    .eq("id", id)
    .maybeSingle();

  if (loadError) {
    console.error("[publish] načtení prezentace selhalo:", loadError.message);
    return { error: "Prezentaci se nepodařilo načíst, zkus to prosím znovu." };
  }
  if (!presentation) redirect("/presentations");

  if (presentation.status === "published") {
    redirect(`/presentations/${id}/publish?stav=uz-publikovano`);
  }

  const price = resolvePriceConfig(process.env);
  if (!price.ok) {
    console.error("[publish] špatná cenová konfigurace:", price.message);
    return {
      error: "Cena za zveřejnění není správně nastavená. Napiš prosím správci.",
    };
  }

  const gateway = createStripeGateway();
  const store = createPaymentsStore();
  const admin = createAdminClient();
  const siteUrl = await getSiteUrl();

  // ---- 1) Není už rozdělaná platba? (dvojklik, návrat zpátky tlačítkem) ----
  const { data: pending, error: pendingError } = await supabase
    .from("payments")
    .select("id, stripe_session_id")
    .eq("presentation_id", id)
    .eq("status", "pending")
    .maybeSingle();

  if (pendingError) {
    console.error("[publish] načtení rozdělané platby selhalo:", pendingError.message);
    return { error: "Platbu se nepodařilo připravit, zkus to prosím znovu." };
  }

  let paymentId = pending?.id ?? null;
  let reuseUrl: string | null = null;
  let alreadyPaid = false;

  if (pending?.stripe_session_id) {
    try {
      const existing = await gateway.retrieveSession(pending.stripe_session_id);

      if (existing?.status === "open" && existing.url) {
        // Platební stránka je pořád otevřená → pošli ho na ni znovu.
        // (Tohle je hlavní obrana proti dvojkliku: žádná druhá platba nevznikne.)
        reuseUrl = existing.url;
      } else if (existing && existing.paymentStatus !== "unpaid") {
        // Mezitím se zaplatilo a webhook to ještě nestihl → dorovnej to hned.
        await fulfillSession({ gateway, store }, { sessionId: existing.id });
        alreadyPaid = true;
      } else {
        // Session propadla (nebo ji Stripe nezná) → uvolni ji a založ novou.
        await store.markSessionStatus(pending.stripe_session_id, "expired");
        paymentId = null;
      }
    } catch (err) {
      console.error(
        "[publish] kontrola rozdělané platby selhala:",
        err instanceof Error ? err.message : err,
      );
      return {
        error: "Nepodařilo se ověřit rozdělanou platbu. Zkus to prosím za chvíli znovu.",
      };
    }
  }

  // Přesměrování až tady — `redirect()` uvnitř try/catch by se spolklo jako chyba.
  if (reuseUrl) redirect(reuseUrl);
  if (alreadyPaid) {
    revalidatePath("/presentations");
    revalidatePath(`/presentations/${id}/publish`);
    redirect(`/presentations/${id}/publish/hotovo`);
  }

  // ---- 2) Založ rozdělanou platbu (dřív než session — kvůli idempotenci) ----
  if (!paymentId) {
    const { data: created, error: insertError } = await admin
      .from("payments")
      .insert({
        presentation_id: id,
        status: "pending",
        provider: "stripe",
        amount_czk: price.config.amountCzk,
        currency: price.config.currency,
      })
      .select("id")
      .single();

    if (insertError || !created) {
      // Souběh (dvojklik): rozdělanou platbu právě založil druhý požadavek.
      // Unikátní index nás podržel — prostě ji použijeme.
      const { data: raced } = await supabase
        .from("payments")
        .select("id")
        .eq("presentation_id", id)
        .eq("status", "pending")
        .maybeSingle();

      if (!raced) {
        console.error("[publish] založení platby selhalo:", insertError?.message);
        return { error: "Platbu se nepodařilo připravit, zkus to prosím znovu." };
      }
      paymentId = raced.id;
    } else {
      paymentId = created.id;
    }
  }

  // ---- 3) Platební stránka Stripu -----------------------------------------
  // `idempotencyKey` = ID naší rozdělané platby. Dva stejné požadavky (dvojklik)
  // tak dostanou od Stripu TUTÉŽ platební stránku, ne dvě.
  let checkoutUrl: string | null = null;
  try {
    const session = await createCheckoutSession({
      presentationId: id,
      priceConfig: price.config,
      successUrl: `${siteUrl}/presentations/${id}/publish/hotovo`,
      cancelUrl: `${siteUrl}/presentations/${id}/publish?stav=zruseno`,
      customerEmail: user.email ?? null,
      idempotencyKey: `checkout:${paymentId}`,
    });

    const { error: linkError } = await admin
      .from("payments")
      .update({ stripe_session_id: session.id })
      .eq("id", paymentId);

    if (linkError) {
      // Session existuje, jen jsme si ji nezapsali. Není to ztráta: příští pokus
      // použije stejný idempotencyKey a Stripe vrátí tutéž session.
      console.error("[publish] zápis session k platbě selhal:", linkError.message);
      throw new Error(linkError.message);
    }

    checkoutUrl = session.url;
  } catch (err) {
    console.error(
      "[publish] založení platební stránky selhalo:",
      err instanceof Error ? err.message : err,
    );
    return {
      error: "Platební stránku se nepodařilo otevřít. Zkus to prosím za chvíli znovu.",
    };
  }

  if (!checkoutUrl) {
    return { error: "Stripe nevrátil adresu platební stránky. Zkus to prosím znovu." };
  }

  redirect(checkoutUrl);
}

/**
 * Ruční „Ověřit platbu" na návratové stránce.
 *
 * DŮLEŽITÉ: neposlouchá prohlížeč. Z prohlížeče bere jen ID prezentace (a to
 * ověří proti přihlášenému uživateli); jestli je zaplaceno, se ptá PŘÍMO STRIPU
 * serverovým voláním. Používá úplně stejnou funkci jako webhook.
 *
 * Je to záchranná brzda pro případ, že webhook nedorazí (výpadek, špatně
 * nastavený endpoint) — aby zaplacený zákazník nezůstal viset.
 */
export async function verifyPayment(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) redirect("/presentations");

  // Vlastnictví: RLS vrátí jen vlastní prezentaci.
  const { data: presentation } = await supabase
    .from("presentations")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (!presentation) redirect("/presentations");
  if (presentation.status === "published") {
    redirect(`/presentations/${id}/publish/hotovo`);
  }

  // Poslední platba k téhle prezentaci (RLS: zase jen vlastní).
  const { data: payment } = await supabase
    .from("payments")
    .select("stripe_session_id, status")
    .eq("presentation_id", id)
    .not("stripe_session_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!payment?.stripe_session_id) {
    return { error: "K téhle prezentaci zatím žádná platba není." };
  }

  const result = await fulfillSession(
    { gateway: createStripeGateway(), store: createPaymentsStore() },
    { sessionId: payment.stripe_session_id },
  );

  if (!result.ok) {
    if (result.reason === "unpaid") {
      return {
        error:
          "Stripe zatím platbu nepotvrdil. U bankovního převodu to může trvat i pár dní.",
      };
    }
    console.error("[publish] ověření platby selhalo:", result.message);
    return { error: "Platbu se nepodařilo ověřit. Zkus to prosím za chvíli znovu." };
  }

  revalidatePath("/presentations");
  revalidatePath(`/presentations/${id}/publish/hotovo`);
  redirect(`/presentations/${id}/publish/hotovo`);
}
