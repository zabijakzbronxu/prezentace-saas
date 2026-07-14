import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  resolvePriceConfig,
  DEFAULT_PRICE_CZK,
  DEFAULT_PRODUCT_NAME,
  STRIPE_MIN_CZK,
} from "../payments/config";
import {
  fulfillSession,
  halereToCzk,
  type CheckoutSessionInfo,
  type PaymentsGateway,
  type PaymentsStore,
} from "../payments/fulfill";
import {
  handleStripeEvent,
  type EventLedger,
  type WebhookEvent,
} from "../payments/webhook";

// ---------------------------------------------------------------------------
// Falešná databáze — napodobuje to podstatné z opravdové: platba se páruje
// s platební session a JEDNA session může být zaplacená jen JEDNOU
// (v ostré DB to hlídá unikátní index).
// ---------------------------------------------------------------------------
type Row = {
  sessionId: string;
  presentationId: string;
  status: "pending" | "paid" | "failed" | "refunded" | "expired";
  paymentIntentId: string | null;
  amountCzk: number | null;
  eventId: string | null;
};

class FakeStore implements PaymentsStore {
  rows: Row[] = [];
  published = new Set<string>();
  publishCalls = 0;
  markPaidWrites = 0; // kolikrát se OPRAVDU zapsala nová platba

  seedPending(sessionId: string, presentationId: string) {
    this.rows.push({
      sessionId,
      presentationId,
      status: "pending",
      paymentIntentId: null,
      amountCzk: null,
      eventId: null,
    });
  }

  async markPaid(input: {
    sessionId: string;
    presentationId: string;
    paymentIntentId: string | null;
    amountCzk: number | null;
    currency: string | null;
    eventId: string | null;
  }) {
    const existing = this.rows.find((r) => r.sessionId === input.sessionId);
    if (existing?.status === "paid") return { already: true };

    this.markPaidWrites += 1;
    if (existing) {
      existing.status = "paid";
      existing.paymentIntentId = input.paymentIntentId;
      existing.amountCzk = input.amountCzk;
      existing.eventId = input.eventId;
    } else {
      this.rows.push({
        sessionId: input.sessionId,
        presentationId: input.presentationId,
        status: "paid",
        paymentIntentId: input.paymentIntentId,
        amountCzk: input.amountCzk,
        eventId: input.eventId,
      });
    }
    return { already: false };
  }

  async publishPresentation(presentationId: string) {
    this.publishCalls += 1;
    this.published.add(presentationId);
  }

  async markSessionStatus(sessionId: string, status: "failed" | "expired") {
    const row = this.rows.find((r) => r.sessionId === sessionId);
    if (row && row.status === "pending") row.status = status;
  }

  async markRefunded({
    paymentIntentId,
    eventId,
  }: {
    paymentIntentId: string;
    eventId: string | null;
  }) {
    const row = this.rows.find((r) => r.paymentIntentId === paymentIntentId);
    if (!row) return { presentationId: null, already: false };
    if (row.status === "refunded") {
      return { presentationId: row.presentationId, already: true };
    }
    row.status = "refunded";
    row.eventId = eventId;
    return { presentationId: row.presentationId, already: false };
  }

  async unpublishPresentation(presentationId: string) {
    this.published.delete(presentationId);
  }
}

/** Falešná kniha událostí — `event_id` jako primární klíč, stejně jako v DB. */
class FakeLedger implements EventLedger {
  seen = new Set<string>();
  processed = new Set<string>();
  releases: string[] = [];

  async claim(eventId: string) {
    if (this.seen.has(eventId)) return false;
    this.seen.add(eventId);
    return true;
  }
  async markProcessed(eventId: string) {
    this.processed.add(eventId);
  }
  async release(eventId: string) {
    this.seen.delete(eventId);
    this.releases.push(eventId);
  }
}

function session(over: Partial<CheckoutSessionInfo> = {}): CheckoutSessionInfo {
  return {
    id: "cs_test_1",
    status: "complete",
    paymentStatus: "paid",
    presentationId: "p-1",
    paymentIntentId: "pi_1",
    amountTotal: 49000, // 490 Kč v haléřích
    currency: "czk",
    url: null,
    ...over,
  };
}

function gatewayFor(s: CheckoutSessionInfo | null): PaymentsGateway {
  return { retrieveSession: async () => s };
}

const evt = (over: Partial<WebhookEvent> = {}): WebhookEvent => ({
  id: "evt_1",
  type: "checkout.session.completed",
  sessionId: "cs_test_1",
  paymentIntentId: null,
  ...over,
});

// ===========================================================================
// Cena a měna — ze serveru, nikdy z prohlížeče
// ===========================================================================
describe("resolvePriceConfig", () => {
  it("bez nastavení použije výchozí cenu a název", () => {
    const r = resolvePriceConfig({});
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.config.amountCzk).toBe(DEFAULT_PRICE_CZK);
      expect(r.config.productName).toBe(DEFAULT_PRODUCT_NAME);
      expect(r.config.currency).toBe("czk");
    }
  });

  it("přepočítá koruny na haléře (CZK je dvoudecimální)", () => {
    const r = resolvePriceConfig({ PUBLISH_PRICE_CZK: "490" });
    expect(r.ok && r.config.unitAmount).toBe(49_000);
  });

  it("vezme vlastní cenu i název položky", () => {
    const r = resolvePriceConfig({
      PUBLISH_PRICE_CZK: "1290",
      PUBLISH_PRODUCT_NAME: "Zveřejnění inzerátu",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.config.amountCzk).toBe(1290);
      expect(r.config.unitAmount).toBe(129_000);
      expect(r.config.productName).toBe("Zveřejnění inzerátu");
    }
  });

  it("odmítne nesmyslnou cenu (text, desetinné číslo, záporné)", () => {
    expect(resolvePriceConfig({ PUBLISH_PRICE_CZK: "hodně" }).ok).toBe(false);
    expect(resolvePriceConfig({ PUBLISH_PRICE_CZK: "49,9" }).ok).toBe(false);
    expect(resolvePriceConfig({ PUBLISH_PRICE_CZK: "-100" }).ok).toBe(false);
  });

  it(`odmítne cenu pod minimem Stripu (${STRIPE_MIN_CZK} Kč) i nesmyslně vysokou`, () => {
    expect(resolvePriceConfig({ PUBLISH_PRICE_CZK: "5" }).ok).toBe(false);
    expect(resolvePriceConfig({ PUBLISH_PRICE_CZK: "999999" }).ok).toBe(false);
  });
});

describe("halereToCzk", () => {
  it("převede haléře na celé koruny", () => {
    expect(halereToCzk(49_000)).toBe(490);
    expect(halereToCzk(null)).toBeNull();
  });
});

// ===========================================================================
// Zaplaceno → publikováno (a nikdy naopak)
// ===========================================================================
describe("fulfillSession", () => {
  let store: FakeStore;
  beforeEach(() => {
    store = new FakeStore();
  });

  it("zaplacenou session zapíše a prezentaci publikuje", async () => {
    store.seedPending("cs_test_1", "p-1");
    const r = await fulfillSession(
      { gateway: gatewayFor(session()), store },
      { sessionId: "cs_test_1", eventId: "evt_1" },
    );

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.presentationId).toBe("p-1");
    expect(store.published.has("p-1")).toBe(true);
    expect(store.rows[0].status).toBe("paid");
    expect(store.rows[0].amountCzk).toBe(490);
  });

  it("NEPUBLIKUJE, dokud nejsou peníze (odložená platba → payment_status: unpaid)", async () => {
    store.seedPending("cs_test_1", "p-1");
    const r = await fulfillSession(
      { gateway: gatewayFor(session({ paymentStatus: "unpaid" })), store },
      { sessionId: "cs_test_1" },
    );

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("unpaid");
    expect(store.published.size).toBe(0);
    expect(store.markPaidWrites).toBe(0);
  });

  it("neznámou session odmítne (a nic nepublikuje)", async () => {
    const r = await fulfillSession(
      { gateway: gatewayFor(null), store },
      { sessionId: "cs_neexistuje" },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("unknown-session");
    expect(store.published.size).toBe(0);
  });

  it("session bez naší prezentace v metadatech nic nepublikuje", async () => {
    const r = await fulfillSession(
      { gateway: gatewayFor(session({ presentationId: null })), store },
      { sessionId: "cs_test_1" },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("no-presentation");
    expect(store.published.size).toBe(0);
  });

  it("opakované volání nezaplatí dvakrát (ale publikaci dorovná)", async () => {
    store.seedPending("cs_test_1", "p-1");
    const deps = { gateway: gatewayFor(session()), store };

    const first = await fulfillSession(deps, { sessionId: "cs_test_1" });
    const second = await fulfillSession(deps, { sessionId: "cs_test_1" });

    expect(first.ok && first.already).toBe(false);
    expect(second.ok && second.already).toBe(true);
    expect(store.markPaidWrites).toBe(1); // zapsáno JEN JEDNOU
    expect(store.rows.filter((r) => r.status === "paid")).toHaveLength(1);
  });
});

// ===========================================================================
// WEBHOOK — idempotence je tu to nejdůležitější
// ===========================================================================
describe("handleStripeEvent", () => {
  let store: FakeStore;
  let ledger: FakeLedger;

  beforeEach(() => {
    store = new FakeStore();
    ledger = new FakeLedger();
    store.seedPending("cs_test_1", "p-1");
  });

  const deps = () => ({ gateway: gatewayFor(session()), store, ledger });

  it("zaplacení publikuje prezentaci", async () => {
    const out = await handleStripeEvent(deps(), evt());
    expect(out.status).toBe("handled");
    expect(store.published.has("p-1")).toBe(true);
    expect(ledger.processed.has("evt_1")).toBe(true);
  });

  it("IDEMPOTENCE: tentýž event doručený dvakrát zaplatí jen jednou", async () => {
    const d = deps();
    const first = await handleStripeEvent(d, evt());
    const second = await handleStripeEvent(d, evt()); // Stripe doručuje „aspoň jednou"

    expect(first.status).toBe("handled");
    expect(second.status).toBe("duplicate");
    expect(store.markPaidWrites).toBe(1);
    expect(store.publishCalls).toBe(1); // podruhé se nesáhlo vůbec na nic
    expect(store.rows.filter((r) => r.status === "paid")).toHaveLength(1);
  });

  it("IDEMPOTENCE: dva RŮZNÉ eventy o téže session zaplatí taky jen jednou", async () => {
    // Tohle se reálně stává u odložených plateb: completed i async_payment_succeeded.
    const d = deps();
    await handleStripeEvent(d, evt({ id: "evt_1", type: "checkout.session.completed" }));
    await handleStripeEvent(
      d,
      evt({ id: "evt_2", type: "checkout.session.async_payment_succeeded" }),
    );

    expect(store.markPaidWrites).toBe(1);
    expect(store.rows.filter((r) => r.status === "paid")).toHaveLength(1);
  });

  it('„completed" u nezaplacené odložené platby NEPUBLIKUJE', async () => {
    const out = await handleStripeEvent(
      { gateway: gatewayFor(session({ paymentStatus: "unpaid" })), store, ledger },
      evt(),
    );
    expect(out.status).toBe("handled");
    expect(store.published.size).toBe(0);
    expect(store.markPaidWrites).toBe(0);
  });

  it("propadlý checkout uvolní rozdělanou platbu (jde zkusit znovu)", async () => {
    await handleStripeEvent(deps(), evt({ type: "checkout.session.expired" }));
    expect(store.rows[0].status).toBe("expired");
    expect(store.published.size).toBe(0);
  });

  it("neúspěšná odložená platba nechá prezentaci konceptem", async () => {
    await handleStripeEvent(deps(), evt({ type: "checkout.session.async_payment_failed" }));
    expect(store.rows[0].status).toBe("failed");
    expect(store.published.size).toBe(0);
  });

  it("vrácení peněz sundá prezentaci z veřejné adresy", async () => {
    const d = deps();
    await handleStripeEvent(d, evt()); // nejdřív zaplaceno
    expect(store.published.has("p-1")).toBe(true);

    await handleStripeEvent(
      d,
      evt({ id: "evt_refund", type: "refund.created", paymentIntentId: "pi_1" }),
    );

    expect(store.rows[0].status).toBe("refunded");
    expect(store.published.has("p-1")).toBe(false);
  });

  it("vrácení peněz je taky idempotentní", async () => {
    const d = deps();
    await handleStripeEvent(d, evt());
    await handleStripeEvent(
      d,
      evt({ id: "evt_r1", type: "refund.created", paymentIntentId: "pi_1" }),
    );
    const again = await handleStripeEvent(
      d,
      evt({ id: "evt_r1", type: "refund.created", paymentIntentId: "pi_1" }),
    );
    expect(again.status).toBe("duplicate");
    expect(store.published.has("p-1")).toBe(false);
  });

  it("událost, která nás nezajímá, jen zaznamená a nic nedělá", async () => {
    const out = await handleStripeEvent(deps(), evt({ type: "customer.created" }));
    expect(out.status).toBe("ignored");
    expect(store.published.size).toBe(0);
    expect(store.markPaidWrites).toBe(0);
  });

  it("ŽÁDNÉ TICHÉ SELHÁNÍ: když zpracování spadne, zámek se uvolní a chyba probublá", async () => {
    const rozbityStore = new FakeStore();
    rozbityStore.seedPending("cs_test_1", "p-1");
    rozbityStore.publishPresentation = vi.fn(async () => {
      throw new Error("databáze je dole");
    });

    const d = { gateway: gatewayFor(session()), store: rozbityStore, ledger };

    await expect(handleStripeEvent(d, evt())).rejects.toThrow("databáze je dole");
    // Zámek MUSÍ být uvolněný, jinak by Stripe opakované doručení přeskočil
    // jako „už zpracované" a platba by se tiše ztratila.
    expect(ledger.releases).toContain("evt_1");
    expect(ledger.seen.has("evt_1")).toBe(false);
  });

  it("po selhání a uvolnění zámku projde opakované doručení v pořádku", async () => {
    const flaky = new FakeStore();
    flaky.seedPending("cs_test_1", "p-1");
    const original = flaky.publishPresentation.bind(flaky);
    let spadni = true;
    flaky.publishPresentation = async (id: string) => {
      if (spadni) {
        spadni = false;
        throw new Error("chvilkový výpadek");
      }
      return original(id);
    };

    const d = { gateway: gatewayFor(session()), store: flaky, ledger };

    await expect(handleStripeEvent(d, evt())).rejects.toThrow("chvilkový výpadek");
    const retry = await handleStripeEvent(d, evt()); // Stripe to zkusí znovu

    expect(retry.status).toBe("handled");
    expect(flaky.published.has("p-1")).toBe(true);
    expect(flaky.rows.filter((r) => r.status === "paid")).toHaveLength(1);
  });
});
