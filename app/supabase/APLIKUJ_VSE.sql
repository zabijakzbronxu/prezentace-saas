-- =====================================================================
--  APLIKUJ_VSE.sql — všechny migrace v jednom, k jednomu spuštění
-- =====================================================================
--  PRO KARLA:
--    1) Zkopíruj CELÝ obsah tohoto souboru.
--    2) Supabase → SQL Editor → New query → vlož → Run.
--    3) Dole se objeví TABULKA S KONTROLOU. Ve sloupci `stav` musí být
--       všude „✅ je". Kde je „❌ CHYBÍ", tam něco neprošlo — pošli mi to.
--
--  CO TO DĚLÁ: dorovná databázi do stavu, který dnešní aplikace očekává.
--  Spojuje 11 migrací (viz seznam níže) + zapnutí úložiště fotek.
--
--  BEZPEČNOST:
--    - Skript NIC NEMAŽE. Žádné DROP TABLE, DROP COLUMN ani TRUNCATE.
--      (Používá jen DROP POLICY/TRIGGER/CONSTRAINT — a hned je zakládá znovu.)
--      Jediné slovo „delete" najdeš uvnitř DEFINICE funkce delete_presentation_photo
--      (to je funkce pro mazání fotky v aplikaci) — při spuštění skriptu se
--      nic nesmaže, jen se ta funkce založí.
--    - Je IDEMPOTENTNÍ: dá se pustit na databázi, kde už část migrací proběhla,
--      i opakovaně. Co existuje, přeskočí; co chybí, doplní.
--    - Vše nepovinné je nullable → doplnění sloupců nerozbije existující řádky.
--
--  SPOJENÉ MIGRACE (chronologicky):
--    20260704120000  init_data_model          — tabulky, RLS, triggery
--    20260704130000  add_property_type        — presentations.property_type
--    20260705143500  backfill_profiles        — profily pro staré účty
--    20260705150000  checks_and_publish_guard — CHECKy + „bez platby nepublikuješ"
--    20260706100000  text_sections            — presentations.location_text/features_text
--    20260706150000  contact_checks           — délky kontaktu
--    20260707090000  profile_checks           — délky profilu
--    20260707120000  photos_integrity         — DB funkce pro fotky (RPC)
--    20260707121000  status_slug_guard        — tvrdší platební pojistka + tvar slugu
--    20260713220000  review_2026_07_hardening — trigger na tvar cesty k fotce
--    20260714120000  stripe_payments          — Stripe sloupce, idempotence webhooku
--    + storage-setup.md                       — bucket `presentation-photos` + policies
-- =====================================================================


-- =====================================================================
-- 0) ROZŠÍŘENÍ
-- =====================================================================
create extension if not exists pgcrypto;   -- gen_random_uuid()


-- =====================================================================
-- 1) TABULKY
--    `create table if not exists` založí chybějící tabulku.
--    `add column if not exists` níže dorovná tabulku, která už existuje,
--    ale přišla o sloupce z pozdějších migrací (Karlův případ:
--    presentations.location_text).
-- =====================================================================

-- 1a) PROFILES ---------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  phone       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles
  add column if not exists full_name  text,
  add column if not exists phone      text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

comment on table public.profiles is
  'Profil uživatele (1:1 k auth.users). Zakládá se automaticky při registraci.';

-- 1b) PRESENTATIONS ----------------------------------------------------
create table if not exists public.presentations (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles (id) on delete cascade,
  status        text not null default 'draft'
                check (status in ('draft', 'paid', 'published')),
  slug          text not null unique,
  title         text,
  street        text,
  city          text,
  postal_code   text,
  price_czk     bigint,
  disposition   text,
  floor_area_m2 numeric(10,2),
  land_area_m2  numeric(10,2),
  energy_class  text,
  description   text,
  contact_name  text,
  contact_email text,
  contact_phone text,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Všechny NEPOVINNÉ sloupce, které kód dnes čte — vč. těch z pozdějších migrací.
-- Tohle je řádek, který opraví chybu „column presentations.location_text does not exist".
alter table public.presentations
  add column if not exists title         text,
  add column if not exists street        text,
  add column if not exists city          text,
  add column if not exists postal_code   text,
  add column if not exists price_czk     bigint,
  add column if not exists disposition   text,
  add column if not exists floor_area_m2 numeric(10,2),
  add column if not exists land_area_m2  numeric(10,2),
  add column if not exists energy_class  text,
  add column if not exists description   text,
  add column if not exists property_type text,   -- 20260704130000
  add column if not exists location_text text,   -- 20260706100000  ← Karlova chyba č. 1
  add column if not exists features_text text,   -- 20260706100000
  add column if not exists contact_name  text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists published_at  timestamptz,
  add column if not exists created_at    timestamptz not null default now(),
  add column if not exists updated_at    timestamptz not null default now();

comment on table public.presentations is
  'Prezentace nemovitosti. 1 uživatel : N prezentací. Stav draft→paid→published.';
comment on column public.presentations.status is
  'draft = koncept, paid = zaplaceno, published = veřejně publikováno.';
comment on column public.presentations.property_type is
  'Typ nemovitosti (byt, dům, pozemek, chata, …) — volný text s nabídkou.';
comment on column public.presentations.location_text is
  'Textová sekce „Lokalita a okolí" (max 5000 znaků).';
comment on column public.presentations.features_text is
  'Textová sekce „Vybavení a přednosti" (max 5000 znaků).';

create index if not exists presentations_owner_idx  on public.presentations (owner_id);
create index if not exists presentations_status_idx on public.presentations (status);

-- 1c) PRESENTATION_PHOTOS ----------------------------------------------
create table if not exists public.presentation_photos (
  id              uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references public.presentations (id) on delete cascade,
  storage_path    text not null,
  is_hero         boolean not null default false,
  sort_order      integer not null default 0,
  alt_text        text,
  created_at      timestamptz not null default now()
);

alter table public.presentation_photos
  add column if not exists alt_text   text,
  add column if not exists created_at timestamptz not null default now();

comment on table public.presentation_photos is
  'Fotky prezentace. Nejvýš jedna hero fotka na prezentaci.';

create index if not exists presentation_photos_presentation_idx
  on public.presentation_photos (presentation_id);

-- UNIKÁTNÍ indexy zakládáme v ochranném bloku: kdyby v datech byla duplicita
-- (dvě hero fotky u jedné prezentace apod.), holý `create unique index` by
-- shodil CELÝ skript (SQL Editor jede vše v jedné transakci). Takhle se jen
-- vypíše poznámka a v kontrole dole uvidíš ❌ — data zůstanou nedotčená.
do $$
begin
  -- nejvýš jedna hero fotka na prezentaci
  create unique index if not exists presentation_photos_one_hero
    on public.presentation_photos (presentation_id) where is_hero;
exception when unique_violation then
  raise notice 'INDEX presentation_photos_one_hero neprošel: u některé prezentace jsou DVĚ hlavní fotky. Data jsem nechal být — napiš mi to.';
end $$;

do $$
begin
  -- jeden soubor ve Storage = nejvýš jeden záznam  (20260707120000)
  create unique index if not exists presentation_photos_storage_path_key
    on public.presentation_photos (storage_path);
exception when unique_violation then
  raise notice 'INDEX presentation_photos_storage_path_key neprošel: dva záznamy ukazují na stejný soubor. Data jsem nechal být — napiš mi to.';
end $$;

-- 1d) PAYMENTS ---------------------------------------------------------
create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  presentation_id     uuid not null references public.presentations (id) on delete cascade,
  amount_czk          bigint,
  currency            text not null default 'czk',
  status              text not null default 'pending',
  provider            text,
  provider_payment_id text,
  paid_at             timestamptz,
  created_at          timestamptz not null default now()
);

-- Sloupce pro Stripe  (20260714120000)
alter table public.payments
  add column if not exists amount_czk          bigint,
  add column if not exists provider            text,
  add column if not exists provider_payment_id text,
  add column if not exists paid_at             timestamptz,
  add column if not exists created_at          timestamptz not null default now(),
  add column if not exists stripe_session_id   text,
  add column if not exists stripe_event_id     text,
  add column if not exists refund_event_id     text,
  add column if not exists refunded_at         timestamptz,
  add column if not exists updated_at          timestamptz not null default now();

comment on table public.payments is 'Platba za prezentaci (Stripe).';
comment on column public.payments.stripe_session_id is
  'ID Checkout Session (cs_...). Jedna platba = jedna session.';
comment on column public.payments.stripe_event_id is
  'ID události Stripu (evt_...), která platbu označila jako zaplacenou. Unikátní.';
comment on column public.payments.refund_event_id is
  'ID události Stripu (evt_...), která platbu vrátila. Unikátní.';
comment on column public.payments.provider_payment_id is
  'ID platby u poskytovatele — u Stripu PaymentIntent (pi_...).';

-- Stavy plateb: init měl 4, Stripe migrace přidala 'expired'.
-- Drop+create je tu jediná bezpečná cesta (rozšíření CHECKu), data se nedotkne.
-- NOT VALID = hlídá nové/měněné řádky, staré neskenuje (kdyby v datech byl
-- ručně zapsaný nesmyslný stav, skript kvůli němu nespadne).
alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments
  add constraint payments_status_check
  check (status in ('pending', 'paid', 'failed', 'refunded', 'expired')) not valid;

create index if not exists payments_presentation_idx on public.payments (presentation_id);
create index if not exists payments_status_idx       on public.payments (status);

-- Tvrdé pojistky proti dvojímu započtení  (20260714120000)
-- Opět v ochranném bloku — duplicita v datech nesmí shodit celý skript.
do $$
begin
  create unique index if not exists payments_stripe_session_uidx
    on public.payments (stripe_session_id) where stripe_session_id is not null;

  create unique index if not exists payments_stripe_event_uidx
    on public.payments (stripe_event_id) where stripe_event_id is not null;

  create unique index if not exists payments_refund_event_uidx
    on public.payments (refund_event_id) where refund_event_id is not null;

  create unique index if not exists payments_provider_payment_uidx
    on public.payments (provider, provider_payment_id) where provider_payment_id is not null;

  create unique index if not exists payments_one_pending_uidx
    on public.payments (presentation_id) where status = 'pending';

  create unique index if not exists payments_one_paid_uidx
    on public.payments (presentation_id) where status = 'paid';
exception when unique_violation then
  raise notice 'UNIKÁTNÍ INDEXY na payments neprošly: v tabulce plateb jsou duplicity (např. dvě rozdělané platby k jedné prezentaci). Data jsem nechal být — napiš mi to.';
end $$;

-- 1e) STRIPE_EVENTS — kniha zpracovaných událostí (idempotence webhooku)
create table if not exists public.stripe_events (
  event_id     text primary key,
  type         text        not null,
  received_at  timestamptz not null default now(),
  processed_at timestamptz
);

comment on table public.stripe_events is
  'Kniha zpracovaných událostí Stripu. Zabraňuje dvojímu započtení téže platby.';


-- =====================================================================
-- 2) CHECK OMEZENÍ  (20260705150000, 20260706100000, 20260706150000,
--                    20260707090000, 20260707121000)
--    Zakládají se jako NOT VALID: hlídají nová/upravovaná data, stará
--    nic neshodí. Guard přes pg_constraint → jde spustit opakovaně.
-- =====================================================================
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'presentations_price_positive'
      and conrelid = 'public.presentations'::regclass
  ) then
    alter table public.presentations
      add constraint presentations_price_positive
      check (price_czk is null or price_czk > 0) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'presentations_floor_area_nonneg'
      and conrelid = 'public.presentations'::regclass
  ) then
    alter table public.presentations
      add constraint presentations_floor_area_nonneg
      check (floor_area_m2 is null or floor_area_m2 >= 0) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'presentations_land_area_nonneg'
      and conrelid = 'public.presentations'::regclass
  ) then
    alter table public.presentations
      add constraint presentations_land_area_nonneg
      check (land_area_m2 is null or land_area_m2 >= 0) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'presentations_energy_class_valid'
      and conrelid = 'public.presentations'::regclass
  ) then
    alter table public.presentations
      add constraint presentations_energy_class_valid
      check (energy_class is null or energy_class in ('A','B','C','D','E','F','G')) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'presentations_text_lengths'
      and conrelid = 'public.presentations'::regclass
  ) then
    alter table public.presentations
      add constraint presentations_text_lengths
      check (
        (title         is null or char_length(title)         <= 200)  and
        (street        is null or char_length(street)        <= 200)  and
        (city          is null or char_length(city)          <= 120)  and
        (postal_code   is null or char_length(postal_code)   <= 20)   and
        (property_type is null or char_length(property_type) <= 60)   and
        (disposition   is null or char_length(disposition)   <= 60)   and
        (description   is null or char_length(description)   <= 5000)
      ) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'presentations_section_text_lengths'
      and conrelid = 'public.presentations'::regclass
  ) then
    alter table public.presentations
      add constraint presentations_section_text_lengths
      check (
        (location_text is null or char_length(location_text) <= 5000) and
        (features_text is null or char_length(features_text) <= 5000)
      ) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'presentations_contact_lengths'
      and conrelid = 'public.presentations'::regclass
  ) then
    alter table public.presentations
      add constraint presentations_contact_lengths
      check (
        (contact_name  is null or char_length(contact_name)  <= 120) and
        (contact_email is null or char_length(contact_email) <= 200) and
        (contact_phone is null or char_length(contact_phone) <= 30)
      ) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'presentations_slug_format'
      and conrelid = 'public.presentations'::regclass
  ) then
    alter table public.presentations
      add constraint presentations_slug_format
      check (slug ~ '^[a-z0-9][a-z0-9-]{0,79}$') not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_field_lengths'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_field_lengths
      check (
        (full_name is null or char_length(full_name) <= 120) and
        (phone     is null or char_length(phone)     <= 30)
      ) not valid;
  end if;
end $$;


-- =====================================================================
-- 3) FUNKCE A TRIGGERY  (create or replace → idempotentní)
-- =====================================================================

-- 3a) updated_at se udržuje sám
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists presentations_set_updated_at on public.presentations;
create trigger presentations_set_updated_at
  before update on public.presentations
  for each row execute function public.set_updated_at();

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- 3b) Profil se založí sám při registraci
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3c) „Bez zaplacení se nezveřejní" — finální verze (20260707121000):
--     zaplacenou platbu vyžaduje KAŽDÝ přechod do 'paid' i 'published'.
create or replace function public.enforce_paid_before_publish()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status in ('paid', 'published')
     and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    if not exists (
      select 1 from public.payments pay
      where pay.presentation_id = new.id
        and pay.status = 'paid'
    ) then
      raise exception
        'Zamítnuto: k prezentaci % neexistuje zaplacená platba (payments.status=''paid'').',
        new.id
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists presentations_enforce_paid_before_publish on public.presentations;
create trigger presentations_enforce_paid_before_publish
  before insert or update on public.presentations
  for each row execute function public.enforce_paid_before_publish();

-- 3d) Vrácení peněz zamkne publikaci zpět  (20260714120000)
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

-- 3e) Tvar cesty k fotce vynucený přímo na tabulce  (20260713220000)
create or replace function public.enforce_photo_path()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null
     or new.storage_path !~* ('^' || auth.uid()::text || '/' || new.presentation_id::text
        || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$') then
    raise exception 'PHOTO_BAD_PATH' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists presentation_photos_enforce_path on public.presentation_photos;
create trigger presentation_photos_enforce_path
  before insert or update of storage_path, presentation_id
  on public.presentation_photos
  for each row execute function public.enforce_photo_path();

-- 3f) DB funkce pro fotky (RPC)  (20260707120000)
--     BEZ NICH NEJDE NAHRÁT FOTKA — aplikace je volá přes supabase.rpc().
--     SECURITY INVOKER: uvnitř platí RLS volajícího (cizí data nepřečte).

create or replace function public.register_presentation_photo(
  p_presentation_id uuid,
  p_storage_path text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_count integer;
  v_has_hero boolean;
begin
  -- Tvar cesty: <auth.uid()>/<prezentace>/<uuid>.(jpg|png|webp)
  if auth.uid() is null
     or p_storage_path !~* ('^' || auth.uid()::text || '/' || p_presentation_id::text
        || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$') then
    raise exception 'PHOTO_BAD_PATH' using errcode = 'check_violation';
  end if;

  perform pg_advisory_xact_lock(hashtext('photos:' || p_presentation_id::text));

  select count(*), coalesce(bool_or(is_hero), false)
    into v_count, v_has_hero
    from public.presentation_photos
   where presentation_id = p_presentation_id;

  if v_count >= 20 then
    raise exception 'PHOTO_LIMIT' using errcode = 'check_violation';
  end if;

  insert into public.presentation_photos (presentation_id, storage_path, sort_order, is_hero)
  values (
    p_presentation_id,
    p_storage_path,
    coalesce((select max(sort_order) from public.presentation_photos
               where presentation_id = p_presentation_id), 0) + 1,
    not v_has_hero
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.swap_photo_order(
  p_photo_a uuid,
  p_photo_b uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_presentation uuid;
  v_order_a integer;
  v_order_b integer;
begin
  select presentation_id into v_presentation
    from public.presentation_photos where id = p_photo_a;
  if v_presentation is null then
    raise exception 'PHOTO_NOT_FOUND' using errcode = 'check_violation';
  end if;

  perform pg_advisory_xact_lock(hashtext('photos:' || v_presentation::text));

  select sort_order into v_order_a
    from public.presentation_photos where id = p_photo_a;
  select sort_order into v_order_b
    from public.presentation_photos
   where id = p_photo_b and presentation_id = v_presentation;
  if v_order_a is null or v_order_b is null then
    raise exception 'PHOTO_NOT_FOUND' using errcode = 'check_violation';
  end if;

  update public.presentation_photos set sort_order = -1        where id = p_photo_a;
  update public.presentation_photos set sort_order = v_order_a where id = p_photo_b;
  update public.presentation_photos set sort_order = v_order_b where id = p_photo_a;
end;
$$;

create or replace function public.set_hero_photo(p_photo_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_presentation uuid;
begin
  select presentation_id into v_presentation
    from public.presentation_photos where id = p_photo_id;
  if v_presentation is null then
    raise exception 'PHOTO_NOT_FOUND' using errcode = 'check_violation';
  end if;

  perform pg_advisory_xact_lock(hashtext('photos:' || v_presentation::text));

  update public.presentation_photos
     set is_hero = false
   where presentation_id = v_presentation and is_hero and id <> p_photo_id;
  update public.presentation_photos
     set is_hero = true
   where id = p_photo_id;
end;
$$;

create or replace function public.delete_presentation_photo(p_photo_id uuid)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_presentation uuid;
  v_path text;
  v_was_hero boolean;
  v_next uuid;
begin
  select presentation_id, storage_path, is_hero
    into v_presentation, v_path, v_was_hero
    from public.presentation_photos where id = p_photo_id;
  if v_presentation is null then
    return null;
  end if;

  perform pg_advisory_xact_lock(hashtext('photos:' || v_presentation::text));

  delete from public.presentation_photos where id = p_photo_id;

  if v_was_hero then
    select id into v_next
      from public.presentation_photos
     where presentation_id = v_presentation
     order by sort_order asc
     limit 1;
    if v_next is not null then
      update public.presentation_photos set is_hero = true where id = v_next;
    end if;
  end if;

  return v_path;
end;
$$;


-- =====================================================================
-- 4) ROW LEVEL SECURITY + POLITIKY  (kdo co smí v tabulkách)
-- =====================================================================
alter table public.profiles            enable row level security;
alter table public.presentations       enable row level security;
alter table public.presentation_photos enable row level security;
alter table public.payments            enable row level security;
alter table public.stripe_events       enable row level security;

-- PROFILES: každý jen svůj
drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- PRESENTATIONS: vlastník plný přístup; publikované čte kdokoli
drop policy if exists "presentations owner all" on public.presentations;
create policy "presentations owner all" on public.presentations
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "presentations public read published" on public.presentations;
create policy "presentations public read published" on public.presentations
  for select using (status = 'published');

-- PHOTOS: vlastník mateřské prezentace; fotky publikované čte kdokoli
drop policy if exists "photos owner all" on public.presentation_photos;
create policy "photos owner all" on public.presentation_photos
  for all
  using (exists (
    select 1 from public.presentations p
    where p.id = presentation_id and p.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.presentations p
    where p.id = presentation_id and p.owner_id = auth.uid()
  ));

drop policy if exists "photos public read published" on public.presentation_photos;
create policy "photos public read published" on public.presentation_photos
  for select using (exists (
    select 1 from public.presentations p
    where p.id = presentation_id and p.status = 'published'
  ));

-- PAYMENTS: vlastník smí jen ČÍST. Zápis dělá server (service_role).
drop policy if exists "payments owner read" on public.payments;
create policy "payments owner read" on public.payments
  for select using (exists (
    select 1 from public.presentations p
    where p.id = presentation_id and p.owner_id = auth.uid()
  ));

-- Druhá vrstva: zápis do payments tvrdě zakázán rolím anon/authenticated.
revoke insert, update, delete on public.payments from anon, authenticated;

-- STRIPE_EVENTS: žádná policy → přes anon/authenticated se sem nikdo nedostane.
revoke all on public.stripe_events from anon, authenticated;


-- =====================================================================
-- 5) ÚLOŽIŠTĚ FOTEK (Storage) — bucket + bezpečnostní pravidla
--    Dřív se dělalo ručně podle supabase/storage-setup.md. Teď je to tady,
--    ať se na to nedá zapomenout. BEZ TÉHLE ČÁSTI NEJDE NAHRÁT FOTKA.
--
--    Pozn.: na některých projektech Supabase nedovolí sahat na storage.*
--    z SQL Editoru („must be owner of table objects"). Proto je celá část
--    v ochranném bloku: když neprojde, skript NESPADNE — jen dole v kontrole
--    uvidíš u bucketu/politik „❌ CHYBÍ" a naklikáš je ručně (cesta B
--    v supabase/storage-setup.md).
-- =====================================================================

-- 5a) Bucket + jeho limity (max 8 MB, jen JPEG/PNG/WebP, PRIVÁTNÍ)
do $$
begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('presentation-photos', 'presentation-photos', false, 8388608,
          array['image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do update
    set public = false,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;
exception when insufficient_privilege or undefined_table then
  raise notice 'BUCKET přeskočen (chybí práva na storage.*) — založ ho ručně dle storage-setup.md.';
end $$;

-- 5b) Politiky nad soubory
--     Cesta souboru: <id_vlastníka>/<id_prezentace>/<náhodné_uuid>.jpg|png|webp
do $$
begin
  -- Nahrávat: jen přihlášený, jen do SVÉ složky, jen k prezentaci, která
  -- existuje a patří jemu.
  execute $p$drop policy if exists "photos owner upload" on storage.objects$p$;
  execute $p$
    create policy "photos owner upload" on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'presentation-photos'
        and (storage.foldername(name))[1] = auth.uid()::text
        and array_length(storage.foldername(name), 1) = 2
        and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and name ~* '\.(jpg|png|webp)$'
        and exists (
          select 1 from public.presentations p
          where p.id = ((storage.foldername(name))[2])::uuid
            and p.owner_id = auth.uid()
        )
      )
  $p$;

  -- Číst: vlastník svoje soubory (náhledy v editaci).
  execute $p$drop policy if exists "photos owner read" on storage.objects$p$;
  execute $p$
    create policy "photos owner read" on storage.objects
      for select to authenticated
      using (
        bucket_id = 'presentation-photos'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
  $p$;

  -- Mazat: vlastník svoje soubory.
  execute $p$drop policy if exists "photos owner delete" on storage.objects$p$;
  execute $p$
    create policy "photos owner delete" on storage.objects
      for delete to authenticated
      using (
        bucket_id = 'presentation-photos'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
  $p$;

  -- Veřejné čtení: jen fotky PUBLIKOVANÉ prezentace, a jen když složka
  -- souboru sedí na vlastníka té prezentace.
  execute $p$drop policy if exists "photos public read published" on storage.objects$p$;
  execute $p$
    create policy "photos public read published" on storage.objects
      for select to anon, authenticated
      using (
        bucket_id = 'presentation-photos'
        and exists (
          select 1
          from public.presentation_photos ph
          join public.presentations p on p.id = ph.presentation_id
          where ph.storage_path = name
            and p.status = 'published'
            and (storage.foldername(name))[1] = p.owner_id::text
        )
      )
  $p$;

  -- ÚMYSLNĚ tu není pravidlo pro přepis (UPDATE) — aplikace soubory nikdy
  -- nepřepisuje, každá fotka má nové náhodné jméno.
exception when insufficient_privilege or undefined_table then
  raise notice 'POLITIKY STORAGE přeskočeny (chybí práva na storage.objects) — naklikej je ručně dle storage-setup.md, cesta B.';
end $$;


-- =====================================================================
-- 6) DOROVNÁNÍ DAT — profily pro účty registrované před datovým modelem
--    (bez profilu spadne ukládání prezentace na cizí klíč)
--    Nic nemaže, jen DOPLŇUJE chybějící řádky.
-- =====================================================================
insert into public.profiles (id, full_name)
select u.id, u.raw_user_meta_data ->> 'full_name'
from auth.users as u
on conflict (id) do nothing;


-- =====================================================================
-- 7) KONTROLA — co má existovat, existuje?
--    Ve sloupci `stav` musí být VŠUDE „✅ je".
-- =====================================================================
select 'tabulka' as co, t.name as nazev,
       case when to_regclass('public.' || t.name) is not null
            then '✅ je' else '❌ CHYBÍ' end as stav
from (values
  ('profiles'), ('presentations'), ('presentation_photos'),
  ('payments'), ('stripe_events')
) as t(name)

union all
select 'sloupec', c.tbl || '.' || c.col,
       case when exists (
         select 1 from information_schema.columns ic
         where ic.table_schema = 'public'
           and ic.table_name = c.tbl
           and ic.column_name = c.col
       ) then '✅ je' else '❌ CHYBÍ' end
from (values
  -- co dnes čte kód (presentations)
  ('presentations','owner_id'), ('presentations','status'), ('presentations','slug'),
  ('presentations','title'), ('presentations','street'), ('presentations','city'),
  ('presentations','postal_code'), ('presentations','price_czk'),
  ('presentations','disposition'), ('presentations','floor_area_m2'),
  ('presentations','land_area_m2'), ('presentations','energy_class'),
  ('presentations','description'), ('presentations','property_type'),
  ('presentations','location_text'), ('presentations','features_text'),
  ('presentations','contact_name'), ('presentations','contact_email'),
  ('presentations','contact_phone'), ('presentations','published_at'),
  -- profil
  ('profiles','full_name'), ('profiles','phone'),
  -- fotky
  ('presentation_photos','presentation_id'), ('presentation_photos','storage_path'),
  ('presentation_photos','is_hero'), ('presentation_photos','sort_order'),
  -- platby
  ('payments','presentation_id'), ('payments','status'), ('payments','provider'),
  ('payments','provider_payment_id'), ('payments','stripe_session_id'),
  ('payments','stripe_event_id'), ('payments','refund_event_id'),
  ('payments','refunded_at'), ('payments','paid_at'), ('payments','updated_at')
) as c(tbl, col)

union all
select 'funkce (RPC)', f.sig,
       case when to_regprocedure(f.sig) is not null
            then '✅ je' else '❌ CHYBÍ' end
from (values
  ('public.register_presentation_photo(uuid, text)'),
  ('public.swap_photo_order(uuid, uuid)'),
  ('public.set_hero_photo(uuid)'),
  ('public.delete_presentation_photo(uuid)'),
  ('public.enforce_paid_before_publish()'),
  ('public.unpublish_when_unpaid()'),
  ('public.enforce_photo_path()'),
  ('public.handle_new_user()'),
  ('public.set_updated_at()')
) as f(sig)

union all
select 'trigger', tg.tbl || ' · ' || tg.name,
       case when exists (
         select 1 from pg_trigger t
         where t.tgname = tg.name
           and t.tgrelid = to_regclass(tg.tbl)   -- to_regclass (ne ::regclass):
           and not t.tgisinternal                -- u chybějící tabulky vrátí NULL,
       ) then '✅ je' else '❌ CHYBÍ' end         -- místo aby shodil celou kontrolu
from (values
  ('auth.users',                'on_auth_user_created'),
  ('public.presentations',      'presentations_enforce_paid_before_publish'),
  ('public.presentation_photos','presentation_photos_enforce_path'),
  ('public.payments',           'payments_unpublish_when_unpaid')
) as tg(tbl, name)

union all
select 'politika (RLS)', p.tbl || ' · ' || p.pol,
       case when exists (
         select 1 from pg_policies pg
         where pg.schemaname = 'public'
           and pg.tablename = p.tbl
           and pg.policyname = p.pol
       ) then '✅ je' else '❌ CHYBÍ' end
from (values
  ('profiles','profiles select own'),
  ('profiles','profiles insert own'),
  ('profiles','profiles update own'),
  ('presentations','presentations owner all'),
  ('presentations','presentations public read published'),
  ('presentation_photos','photos owner all'),
  ('presentation_photos','photos public read published'),
  ('payments','payments owner read')
) as p(tbl, pol)

union all
select 'úložiště', 'bucket presentation-photos',
       case when exists (
         select 1 from storage.buckets where id = 'presentation-photos'
       ) then '✅ je' else '❌ CHYBÍ' end

union all
select 'úložiště', 'policy · ' || s.pol,
       case when exists (
         select 1 from pg_policies pg
         where pg.schemaname = 'storage'
           and pg.tablename = 'objects'
           and pg.policyname = s.pol
       ) then '✅ je' else '❌ CHYBÍ' end
from (values
  ('photos owner upload'),
  ('photos owner read'),
  ('photos owner delete'),
  ('photos public read published')
) as s(pol)

order by 1, 2;
