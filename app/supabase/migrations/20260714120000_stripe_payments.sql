-- =====================================================================
-- E3.9 — Stripe platba: databázová část
--
-- Cíl: aby platba mohla ODEMKNOUT publikaci, a to bezpečně a právě jednou.
--
-- Klíčové pojistky, které tahle migrace přidává:
--
--   1) IDEMPOTENCE WEBHOOKU. Stripe doručuje události „aspoň jednou" — tzn.
--      tutéž událost může poslat dvakrát (retry, výpadek sítě). Tabulka
--      `stripe_events` je kniha už zpracovaných událostí: `event_id` je
--      PRIMARY KEY, takže druhý zápis téhož eventu prostě neprojde a webhook
--      pozná, že tuhle událost už viděl. Bez toho by dvojí doručení mohlo
--      založit dvě platby.
--
--   2) NEJVÝŠ JEDNA ROZDĚLANÁ A NEJVÝŠ JEDNA ZAPLACENÁ PLATBA na prezentaci
--      (částečné unikátní indexy). Chrání proti dvojímu kliknutí na
--      „Zveřejnit" i proti dvojímu započtení platby.
--
--   3) VRÁCENÍ PENĚZ ZAMKNE PUBLIKACI ZPĚT. Trigger `unpublish_when_unpaid()`:
--      jakmile platba přestane být `paid` (refund, ruční zásah, smazání řádku)
--      a k prezentaci žádná jiná zaplacená platba není, prezentace spadne zpět
--      na `draft` a zmizí z veřejné adresy. Invariant „publikované = zaplacené"
--      tak drží na úrovni DATABÁZE, ne jen aplikace.
--
-- Vše je ADITIVNÍ a IDEMPOTENTNÍ — dá se spustit opakovaně, nic nemaže.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Stavy plateb — přibývá 'expired' (opuštěný / propadlý checkout)
--    Rozlišujeme ho od 'failed' (platba se pokusila projít a neprošla),
--    protože pro uživatele to znamená něco jiného.
-- ---------------------------------------------------------------------
alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments
  add constraint payments_status_check
  check (status in ('pending', 'paid', 'failed', 'refunded', 'expired'));

-- ---------------------------------------------------------------------
-- 2) Sloupce pro Stripe
-- ---------------------------------------------------------------------
alter table public.payments
  add column if not exists stripe_session_id text,
  add column if not exists stripe_event_id   text,
  add column if not exists refund_event_id   text,
  add column if not exists refunded_at       timestamptz,
  add column if not exists updated_at        timestamptz not null default now();

comment on column public.payments.stripe_session_id is
  'ID Checkout Session (cs_...). Jedna platba = jedna session.';
comment on column public.payments.stripe_event_id is
  'ID události Stripu (evt_...), která platbu označila jako zaplacenou. Unikátní — druhé započtení téže události neprojde.';
comment on column public.payments.refund_event_id is
  'ID události Stripu (evt_...), která platbu vrátila. Unikátní.';
comment on column public.payments.provider_payment_id is
  'ID platby u poskytovatele — u Stripu PaymentIntent (pi_...).';

-- `updated_at` ať se udržuje samo (funkce set_updated_at už v projektu je)
drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 3) Unikátní indexy = tvrdé pojistky proti dvojímu započtení
-- ---------------------------------------------------------------------

-- Jedna Checkout Session = nejvýš jedna platba.
create unique index if not exists payments_stripe_session_uidx
  on public.payments (stripe_session_id)
  where stripe_session_id is not null;

-- Jedna událost Stripu smí zaplatit nejvýš jednu platbu (a jen jednou).
create unique index if not exists payments_stripe_event_uidx
  on public.payments (stripe_event_id)
  where stripe_event_id is not null;

create unique index if not exists payments_refund_event_uidx
  on public.payments (refund_event_id)
  where refund_event_id is not null;

-- Jeden PaymentIntent = nejvýš jedna platba.
create unique index if not exists payments_provider_payment_uidx
  on public.payments (provider, provider_payment_id)
  where provider_payment_id is not null;

-- Na jednu prezentaci nejvýš JEDNA rozdělaná platba (chrání proti dvojkliku
-- na „Zveřejnit" — druhý pokus musí znovupoužít tu rozdělanou, ne založit novou).
create unique index if not exists payments_one_pending_uidx
  on public.payments (presentation_id)
  where status = 'pending';

-- Na jednu prezentaci nejvýš JEDNA zaplacená platba (nikdo nezaplatí dvakrát).
create unique index if not exists payments_one_paid_uidx
  on public.payments (presentation_id)
  where status = 'paid';

-- ---------------------------------------------------------------------
-- 4) Idempotenční kniha webhooku
--    Webhook si sem event „zamkne" HNED na začátku (insert). Když insert
--    neprojde (konflikt), znamená to „tuhle událost už jsem viděl" → webhook
--    odpoví 200 a nic nedělá. Když zpracování selže, řádek zase smaže, aby
--    Stripe mohl doručení zopakovat (žádné tiché selhání).
-- ---------------------------------------------------------------------
create table if not exists public.stripe_events (
  event_id     text primary key,               -- evt_... ← jádro idempotence
  type         text        not null,
  received_at  timestamptz not null default now(),
  processed_at timestamptz
);

comment on table public.stripe_events is
  'Kniha zpracovaných událostí Stripu. Zabraňuje dvojímu započtení téže platby.';

alter table public.stripe_events enable row level security;
-- Žádná policy → přes anon/authenticated se sem nikdo nedostane.
-- Píše i čte jen server (service_role, ten RLS i granty obchází).
revoke all on public.stripe_events from anon, authenticated;

-- ---------------------------------------------------------------------
-- 5) Vrácení peněz zamkne publikaci zpět
--    Jakmile platba přestane být 'paid' a jiná zaplacená platba k prezentaci
--    není → prezentace jde zpět na 'draft' (zmizí z veřejné adresy).
--
--    Proč to řešíme v databázi a ne jen v aplikaci: `enforce_paid_before_publish()`
--    hlídá jen PŘECHOD do published. Už publikovanou prezentaci by tedy refund
--    sám o sobě nesundal a zůstala by veřejně viset, i když peníze jsou vrácené.
-- ---------------------------------------------------------------------
create or replace function public.unpublish_when_unpaid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_presentation uuid;
  v_still_paid   boolean;
begin
  if tg_op = 'DELETE' then
    if old.status <> 'paid' then
      return old;
    end if;
  else
    -- UPDATE: zajímá nás jen odchod ze stavu 'paid'
    if old.status <> 'paid' or new.status = 'paid' then
      return new;
    end if;
  end if;

  v_presentation := old.presentation_id;

  select exists (
    select 1 from public.payments p
    where p.presentation_id = v_presentation
      and p.status = 'paid'
      and p.id <> old.id
  ) into v_still_paid;

  if not v_still_paid then
    update public.presentations
       set status = 'draft',
           published_at = null
     where id = v_presentation
       and status in ('paid', 'published');
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists payments_unpublish_when_unpaid on public.payments;
create trigger payments_unpublish_when_unpaid
  after update or delete on public.payments
  for each row execute function public.unpublish_when_unpaid();
