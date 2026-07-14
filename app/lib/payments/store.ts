import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PaymentsStore } from "./fulfill";
import type { EventLedger } from "./webhook";

// Zápisy do plateb. Běží pod servisním klíčem (service_role) — do tabulky
// `payments` totiž běžný uživatel zapisovat NESMÍ (RLS + REVOKE v migraci
// 20260713220000). Proto sem nikdy nesmí přijít neověřený vstup z prohlížeče:
// volající (webhook / server action) už musí mít jasno, kdo a co dělá.

/** Postgres: porušení unikátního indexu. */
const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(err: { code?: string } | null): boolean {
  return err?.code === UNIQUE_VIOLATION;
}

export function createPaymentsStore(): PaymentsStore & EventLedger {
  return {
    // ---------------- platby ------------------------------------------

    async markPaid({
      sessionId,
      presentationId,
      paymentIntentId,
      amountCzk,
      currency,
      eventId,
    }) {
      const db = createAdminClient();
      const now = new Date().toISOString();

      // 1) Rozdělaná platba k téhle session → přepni na zaplacenou.
      //    `.neq("status", "paid")` zajistí, že už zaplacenou platbu
      //    NEPŘEPÍŠEME (dvojí doručení eventu tudy neprojde).
      const { data: updated, error: updateError } = await db
        .from("payments")
        .update({
          status: "paid",
          paid_at: now,
          provider: "stripe",
          provider_payment_id: paymentIntentId,
          amount_czk: amountCzk,
          currency: currency ?? "czk",
          stripe_event_id: eventId,
        })
        .eq("stripe_session_id", sessionId)
        .neq("status", "paid")
        .select("id");

      if (updateError && !isUniqueViolation(updateError)) {
        throw new Error(
          `Zápis platby selhal (session ${sessionId}): ${updateError.message}`,
        );
      }
      if (updated && updated.length > 0) return { already: false };

      // 2) Nic se neaktualizovalo → buď už zaplacená je, nebo řádek chybí.
      const existing = await findBySession(db, sessionId);
      if (existing?.status === "paid") return { already: true };

      // 3) Řádek chybí (např. checkout se do DB nestihl zapsat, ale zákazník
      //    zaplatil). Peníze jsou na cestě — platbu tedy dozaloží webhook.
      const { error: insertError } = await db.from("payments").insert({
        presentation_id: presentationId,
        status: "paid",
        paid_at: now,
        provider: "stripe",
        provider_payment_id: paymentIntentId,
        amount_czk: amountCzk,
        currency: currency ?? "czk",
        stripe_session_id: sessionId,
        stripe_event_id: eventId,
      });

      if (insertError) {
        if (isUniqueViolation(insertError)) {
          // a) Souběh na téže session — mezitím ji založil druhý požadavek.
          const raced = await findBySession(db, sessionId);
          if (raced?.status === "paid") return { already: true };

          // b) K prezentaci UŽ JE jiná zaplacená platba (index payments_one_paid_uidx).
          //    Znamená to, že zákazník omylem zaplatil dvakrát. Publikace je v pořádku,
          //    ale PENÍZE SE MUSÍ VRÁTIT — a Karel se to musí dozvědět. Nezhazujeme
          //    kvůli tomu webhook (Stripe by ho 3 dny opakoval a nic by to nespravilo).
          const { data: paidJinou } = await db
            .from("payments")
            .select("id, stripe_session_id")
            .eq("presentation_id", presentationId)
            .eq("status", "paid")
            .maybeSingle();

          if (paidJinou) {
            console.error(
              `[stripe] POZOR — DVOJÍ PLATBA: prezentace ${presentationId} má už ` +
                `zaplacenou platbu ${paidJinou.id} (session ${paidJinou.stripe_session_id}), ` +
                `ale přišla další platba (session ${sessionId}). ` +
                `Peníze za druhou platbu je potřeba VRÁTIT ve Stripe dashboardu.`,
            );
            return { already: true };
          }
        }
        throw new Error(
          `Založení platby selhalo (session ${sessionId}): ${insertError.message}`,
        );
      }

      return { already: false };
    },

    async markSessionStatus(sessionId, status) {
      const db = createAdminClient();
      // Jen rozdělanou platbu — zaplacenou nikdy nepřepisujeme.
      const { error } = await db
        .from("payments")
        .update({ status })
        .eq("stripe_session_id", sessionId)
        .eq("status", "pending");

      if (error) {
        throw new Error(
          `Změna stavu platby na „${status}" selhala (session ${sessionId}): ${error.message}`,
        );
      }
    },

    async markRefunded({ paymentIntentId, eventId }) {
      const db = createAdminClient();

      const { data: row, error: findError } = await db
        .from("payments")
        .select("id, presentation_id, status")
        .eq("provider_payment_id", paymentIntentId)
        .maybeSingle();

      if (findError) {
        throw new Error(
          `Hledání platby k vrácení selhalo (${paymentIntentId}): ${findError.message}`,
        );
      }
      if (!row) return { presentationId: null, already: false };
      if (row.status === "refunded") {
        return { presentationId: row.presentation_id, already: true };
      }

      const { error: updateError } = await db
        .from("payments")
        .update({
          status: "refunded",
          refunded_at: new Date().toISOString(),
          refund_event_id: eventId,
        })
        .eq("id", row.id)
        .neq("status", "refunded");

      if (updateError) {
        throw new Error(
          `Zápis vrácení peněz selhal (${paymentIntentId}): ${updateError.message}`,
        );
      }

      return { presentationId: row.presentation_id, already: false };
    },

    // ---------------- prezentace --------------------------------------

    async publishPresentation(presentationId) {
      const db = createAdminClient();
      // Databázová brzda `enforce_paid_before_publish` tenhle zápis pustí jen
      // tehdy, když k prezentaci OPRAVDU existuje zaplacená platba. Kdyby ji
      // někdo obešel v aplikaci, DB ho zastaví.
      const { error } = await db
        .from("presentations")
        .update({ status: "published", published_at: new Date().toISOString() })
        .eq("id", presentationId)
        .neq("status", "published");

      if (error) {
        throw new Error(
          `Publikace prezentace ${presentationId} selhala: ${error.message}`,
        );
      }
    },

    async unpublishPresentation(presentationId) {
      const db = createAdminClient();
      const { error } = await db
        .from("presentations")
        .update({ status: "draft", published_at: null })
        .eq("id", presentationId)
        .in("status", ["paid", "published"]);

      if (error) {
        throw new Error(
          `Sundání prezentace ${presentationId} z veřejné adresy selhalo: ${error.message}`,
        );
      }
    },

    // ---------------- kniha událostí (idempotence) ---------------------

    async claim(eventId, type) {
      const db = createAdminClient();
      const { error } = await db
        .from("stripe_events")
        .insert({ event_id: eventId, type });

      if (!error) return true;
      // Už tam je → tuhle událost jsme viděli. To NENÍ chyba.
      if (isUniqueViolation(error)) return false;

      throw new Error(
        `Nepodařilo se zapsat událost ${eventId} do knihy: ${error.message}`,
      );
    },

    async markProcessed(eventId) {
      const db = createAdminClient();
      const { error } = await db
        .from("stripe_events")
        .update({ processed_at: new Date().toISOString() })
        .eq("event_id", eventId);

      if (error) {
        // Zpracované to je, jen se to nepodařilo poznamenat. Nahlas to,
        // ale nezhazuj kvůli tomu celý webhook (Stripe by to opakoval zbytečně).
        console.error(
          `[stripe] událost ${eventId} zpracována, ale zápis processed_at selhal:`,
          error.message,
        );
      }
    },

    async release(eventId) {
      const db = createAdminClient();
      const { error } = await db
        .from("stripe_events")
        .delete()
        .eq("event_id", eventId);

      if (error) {
        // Tohle je zlé: zámek zůstal a Stripe by opakované doručení přeskočil.
        // Musí to být vidět v logu.
        console.error(
          `[stripe] KRITICKÉ: nepodařilo se uvolnit zámek události ${eventId} ` +
            `— opakované doručení by se přeskočilo. Smaž řádek ručně z tabulky stripe_events.`,
          error.message,
        );
      }
    },
  };
}

async function findBySession(
  db: ReturnType<typeof createAdminClient>,
  sessionId: string,
) {
  const { data, error } = await db
    .from("payments")
    .select("id, status, presentation_id")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Načtení platby selhalo (session ${sessionId}): ${error.message}`);
  }
  return data;
}
