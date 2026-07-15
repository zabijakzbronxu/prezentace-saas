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
--    20260715120000  otinska_sections         — stavebnice sekcí + pole nemovitosti + dokumenty
--    20260715140000  otinska_round23          — kolo 2/3: media bucket + odemčení 6 typů sekcí
--    20260715160000  video_investmentcalc     — kolo 4: odemčení sekcí Video + Investiční kalkulačka (JSONB, bez tabulky)
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
-- 6b) OTÍNSKÁ — STAVEBNICE SEKCÍ  (migrace 20260715120000_otinska_sections)
--     Přestavba prezentace na sekce: páteř + pole nemovitosti + dokumenty +
--     model půdorysů/map/panoramat + RLS + RPC řazení/zapínání + backfill +
--     limit fotek 60 + bucket dokumentů. Vše ADITIVNÍ, idempotentní.
-- =====================================================================

-- 6b-1) PÁTEŘ — presentation_sections
create table if not exists public.presentation_sections (
  id              uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references public.presentations (id) on delete cascade,
  kind            text not null,
  position        integer not null default 0,
  enabled         boolean not null default true,
  content         jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint presentation_sections_kind_ck check (kind in (
    'hero','text','parameters','gallery','map','benefits','documents','valuation',
    'technicalCondition','contact','video','floorplans','analyticMaps','poi',
    'panorama','socialProof','news','investmentCalc','chatbot'
  ))
);
comment on table public.presentation_sections is
  'Sekce prezentace (stavebnice). Jeden řádek = jedna sekce: typ, pořadí, zapnuto, JSON obsah.';
create index if not exists presentation_sections_presentation_idx
  on public.presentation_sections (presentation_id);
create index if not exists presentation_sections_order_idx
  on public.presentation_sections (presentation_id, position);
drop trigger if exists presentation_sections_set_updated_at on public.presentation_sections;
create trigger presentation_sections_set_updated_at
  before update on public.presentation_sections
  for each row execute function public.set_updated_at();

-- 6b-2) PRESENTATIONS — chybějící pole nemovitosti
alter table public.presentations
  add column if not exists subtitle            text,
  add column if not exists year_built          integer,
  add column if not exists floors              smallint,
  add column if not exists built_area_m2       numeric(10,2),
  add column if not exists building_dimensions text,
  add column if not exists condition           text,
  add column if not exists ownership           text,
  add column if not exists monthly_costs_czk   integer,
  add column if not exists lat                 numeric(9,6),
  add column if not exists lng                 numeric(9,6),
  add column if not exists target_persona      jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint
    where conname = 'presentations_year_built_valid'
      and conrelid = 'public.presentations'::regclass) then
    alter table public.presentations add constraint presentations_year_built_valid
      check (year_built is null or (year_built between 1500 and 2100)) not valid;
  end if;
  if not exists (select 1 from pg_constraint
    where conname = 'presentations_floors_valid'
      and conrelid = 'public.presentations'::regclass) then
    alter table public.presentations add constraint presentations_floors_valid
      check (floors is null or (floors between 0 and 300)) not valid;
  end if;
  if not exists (select 1 from pg_constraint
    where conname = 'presentations_built_area_nonneg'
      and conrelid = 'public.presentations'::regclass) then
    alter table public.presentations add constraint presentations_built_area_nonneg
      check (built_area_m2 is null or (built_area_m2 >= 0 and built_area_m2 <= 1000000)) not valid;
  end if;
  if not exists (select 1 from pg_constraint
    where conname = 'presentations_monthly_costs_nonneg'
      and conrelid = 'public.presentations'::regclass) then
    alter table public.presentations add constraint presentations_monthly_costs_nonneg
      check (monthly_costs_czk is null or (monthly_costs_czk >= 0 and monthly_costs_czk <= 1000000000)) not valid;
  end if;
  if not exists (select 1 from pg_constraint
    where conname = 'presentations_lat_valid'
      and conrelid = 'public.presentations'::regclass) then
    alter table public.presentations add constraint presentations_lat_valid
      check (lat is null or (lat between -90 and 90)) not valid;
  end if;
  if not exists (select 1 from pg_constraint
    where conname = 'presentations_lng_valid'
      and conrelid = 'public.presentations'::regclass) then
    alter table public.presentations add constraint presentations_lng_valid
      check (lng is null or (lng between -180 and 180)) not valid;
  end if;
  if not exists (select 1 from pg_constraint
    where conname = 'presentations_extra_text_lengths'
      and conrelid = 'public.presentations'::regclass) then
    alter table public.presentations add constraint presentations_extra_text_lengths
      check (
        (subtitle            is null or char_length(subtitle)            <= 300) and
        (building_dimensions is null or char_length(building_dimensions) <= 60)  and
        (condition           is null or char_length(condition)           <= 60)  and
        (ownership           is null or char_length(ownership)           <= 60)
      ) not valid;
  end if;
end $$;

-- 6b-3) MODEL PŮDORYSŮ (render Kolo 2) — musí být PŘED presentation_photos.room_id
create table if not exists public.presentation_floors (
  id              uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references public.presentations (id) on delete cascade,
  label           text not null,
  floorplan_path  text,
  plan_data       jsonb,
  scale           jsonb,
  image_view      jsonb,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists presentation_floors_presentation_idx
  on public.presentation_floors (presentation_id);

create table if not exists public.presentation_rooms (
  id         uuid primary key default gen_random_uuid(),
  floor_id   uuid not null references public.presentation_floors (id) on delete cascade,
  name       text not null,
  area_m2    numeric(6,2),
  color      text,
  polygon    jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists presentation_rooms_floor_idx
  on public.presentation_rooms (floor_id);

-- 6b-4) PRESENTATION_PHOTOS — popisky, kategorie, vazba na místnost
alter table public.presentation_photos
  add column if not exists caption  text,
  add column if not exists category text,
  add column if not exists room_id  uuid references public.presentation_rooms (id) on delete set null;

do $$
begin
  if not exists (select 1 from pg_constraint
    where conname = 'presentation_photos_caption_len'
      and conrelid = 'public.presentation_photos'::regclass) then
    alter table public.presentation_photos add constraint presentation_photos_caption_len
      check (
        (caption  is null or char_length(caption)  <= 300) and
        (category is null or char_length(category) <= 40)
      ) not valid;
  end if;
end $$;

-- 6b-5) DOKUMENTY KE STAŽENÍ (vlastní tabulka — soubory = vlastní identita)
create table if not exists public.presentation_documents (
  id              uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references public.presentations (id) on delete cascade,
  name            text not null,
  category        text,
  description     text,
  storage_path    text not null,
  file_type       text,
  file_size_bytes bigint,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);
comment on table public.presentation_documents is
  'Soubory ke stažení k prezentaci. Soubor bydlí ve Storage (bucket presentation-documents), tady je jen cesta.';
create index if not exists presentation_documents_presentation_idx
  on public.presentation_documents (presentation_id);
do $$
begin
  create unique index if not exists presentation_documents_storage_path_key
    on public.presentation_documents (storage_path);
exception when unique_violation then
  raise notice 'INDEX presentation_documents_storage_path_key neprošel: dva záznamy míří na stejný soubor. Data jsem nechal být.';
end $$;

-- 6b-6) MODEL MAP / POI / PANORAMAT (render Kolo 3)
create table if not exists public.presentation_maps (
  id              uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references public.presentations (id) on delete cascade,
  title           text,
  caption         text,
  storage_path    text,
  map_group       text,
  marker          jsonb,
  zoom            numeric,
  offset_xy       jsonb,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists presentation_maps_presentation_idx
  on public.presentation_maps (presentation_id);

create table if not exists public.presentation_places (
  id              uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references public.presentations (id) on delete cascade,
  name            text not null,
  place_type      text,
  place_id        text,
  gps             jsonb,
  rating          numeric,
  review_count    integer,
  image           text,
  distance        text,
  description     text,
  super_category  text,
  reviews         jsonb not null default '[]'::jsonb,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists presentation_places_presentation_idx
  on public.presentation_places (presentation_id);

create table if not exists public.presentation_panoramas (
  id              uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references public.presentations (id) on delete cascade,
  storage_path    text,
  config          jsonb,
  hotspots        jsonb not null default '[]'::jsonb,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists presentation_panoramas_presentation_idx
  on public.presentation_panoramas (presentation_id);

-- 6b-7) RLS na nových tabulkách (vzor: owner přes vazbu; veřejně jen published)
alter table public.presentation_sections  enable row level security;
alter table public.presentation_documents enable row level security;
alter table public.presentation_floors    enable row level security;
alter table public.presentation_rooms     enable row level security;
alter table public.presentation_maps      enable row level security;
alter table public.presentation_places    enable row level security;
alter table public.presentation_panoramas enable row level security;

drop policy if exists "sections owner all" on public.presentation_sections;
create policy "sections owner all" on public.presentation_sections
  for all
  using (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.owner_id = auth.uid()));
drop policy if exists "sections public read published" on public.presentation_sections;
create policy "sections public read published" on public.presentation_sections
  for select
  using (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.status = 'published'));

drop policy if exists "documents owner all" on public.presentation_documents;
create policy "documents owner all" on public.presentation_documents
  for all
  using (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.owner_id = auth.uid()));
drop policy if exists "documents public read published" on public.presentation_documents;
create policy "documents public read published" on public.presentation_documents
  for select
  using (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.status = 'published'));

drop policy if exists "floors owner all" on public.presentation_floors;
create policy "floors owner all" on public.presentation_floors
  for all
  using (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.owner_id = auth.uid()));
drop policy if exists "floors public read published" on public.presentation_floors;
create policy "floors public read published" on public.presentation_floors
  for select
  using (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.status = 'published'));

drop policy if exists "rooms owner all" on public.presentation_rooms;
create policy "rooms owner all" on public.presentation_rooms
  for all
  using (exists (select 1 from public.presentation_floors f
                 join public.presentations p on p.id = f.presentation_id
                 where f.id = floor_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.presentation_floors f
                 join public.presentations p on p.id = f.presentation_id
                 where f.id = floor_id and p.owner_id = auth.uid()));
drop policy if exists "rooms public read published" on public.presentation_rooms;
create policy "rooms public read published" on public.presentation_rooms
  for select
  using (exists (select 1 from public.presentation_floors f
                 join public.presentations p on p.id = f.presentation_id
                 where f.id = floor_id and p.status = 'published'));

drop policy if exists "maps owner all" on public.presentation_maps;
create policy "maps owner all" on public.presentation_maps
  for all
  using (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.owner_id = auth.uid()));
drop policy if exists "maps public read published" on public.presentation_maps;
create policy "maps public read published" on public.presentation_maps
  for select
  using (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.status = 'published'));

drop policy if exists "places owner all" on public.presentation_places;
create policy "places owner all" on public.presentation_places
  for all
  using (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.owner_id = auth.uid()));
drop policy if exists "places public read published" on public.presentation_places;
create policy "places public read published" on public.presentation_places
  for select
  using (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.status = 'published'));

drop policy if exists "panoramas owner all" on public.presentation_panoramas;
create policy "panoramas owner all" on public.presentation_panoramas
  for all
  using (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.owner_id = auth.uid()));
drop policy if exists "panoramas public read published" on public.presentation_panoramas;
create policy "panoramas public read published" on public.presentation_panoramas
  for select
  using (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.status = 'published'));

-- 6b-8) RPC — řazení a zapínání sekcí (SECURITY INVOKER, pod advisory zámkem)
create or replace function public.add_presentation_section(
  p_presentation_id uuid,
  p_kind text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_singleton boolean;
begin
  if p_kind not in (
    'hero','text','parameters','gallery','map','benefits',
    'documents','valuation','technicalCondition','contact',
    'floorplans','analyticMaps','poi','panorama','socialProof','news',
    'video','investmentCalc'
  ) then
    raise exception 'SECTION_KIND_NOT_ALLOWED' using errcode = 'check_violation';
  end if;

  perform pg_advisory_xact_lock(hashtext('sections:' || p_presentation_id::text));

  v_singleton := p_kind in (
    'hero','parameters','contact','map','gallery','documents',
    'floorplans','analyticMaps','poi','panorama','socialProof','news',
    'video','investmentCalc'
  );
  if v_singleton and exists (
    select 1 from public.presentation_sections
    where presentation_id = p_presentation_id and kind = p_kind
  ) then
    raise exception 'SECTION_SINGLETON' using errcode = 'check_violation';
  end if;

  insert into public.presentation_sections (presentation_id, kind, position, enabled, content)
  values (
    p_presentation_id,
    p_kind,
    coalesce((select max(position) + 1 from public.presentation_sections
              where presentation_id = p_presentation_id), 0),
    true,
    '{}'::jsonb
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.move_presentation_section(
  p_section_id uuid,
  p_direction text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_presentation uuid;
  v_pos integer;
  v_neighbor uuid;
  v_neighbor_pos integer;
begin
  if p_direction not in ('up', 'down') then
    raise exception 'SECTION_BAD_DIRECTION' using errcode = 'check_violation';
  end if;

  select presentation_id, position into v_presentation, v_pos
    from public.presentation_sections where id = p_section_id;
  if v_presentation is null then
    raise exception 'SECTION_NOT_FOUND' using errcode = 'check_violation';
  end if;

  perform pg_advisory_xact_lock(hashtext('sections:' || v_presentation::text));

  select position into v_pos
    from public.presentation_sections where id = p_section_id;

  if p_direction = 'up' then
    select id, position into v_neighbor, v_neighbor_pos
      from public.presentation_sections
     where presentation_id = v_presentation and position < v_pos
     order by position desc limit 1;
  else
    select id, position into v_neighbor, v_neighbor_pos
      from public.presentation_sections
     where presentation_id = v_presentation and position > v_pos
     order by position asc limit 1;
  end if;

  if v_neighbor is null then
    return;
  end if;

  update public.presentation_sections set position = -1            where id = p_section_id;
  update public.presentation_sections set position = v_pos         where id = v_neighbor;
  update public.presentation_sections set position = v_neighbor_pos where id = p_section_id;
end;
$$;

create or replace function public.set_presentation_section_enabled(
  p_section_id uuid,
  p_enabled boolean
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_presentation uuid;
begin
  select presentation_id into v_presentation
    from public.presentation_sections where id = p_section_id;
  if v_presentation is null then
    raise exception 'SECTION_NOT_FOUND' using errcode = 'check_violation';
  end if;

  perform pg_advisory_xact_lock(hashtext('sections:' || v_presentation::text));
  update public.presentation_sections set enabled = p_enabled where id = p_section_id;
end;
$$;

create or replace function public.delete_presentation_section(p_section_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_presentation uuid;
begin
  select presentation_id into v_presentation
    from public.presentation_sections where id = p_section_id;
  if v_presentation is null then
    return;
  end if;

  perform pg_advisory_xact_lock(hashtext('sections:' || v_presentation::text));
  delete from public.presentation_sections where id = p_section_id;
end;
$$;

create or replace function public.reorder_presentation_sections(
  p_presentation_id uuid,
  p_ordered_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_pos integer := 0;
begin
  perform pg_advisory_xact_lock(hashtext('sections:' || p_presentation_id::text));
  foreach v_id in array p_ordered_ids loop
    update public.presentation_sections
       set position = v_pos
     where id = v_id and presentation_id = p_presentation_id;
    v_pos := v_pos + 1;
  end loop;
end;
$$;

-- 6b-9) RPC — dokumenty (stejný vzor jako fotky)
create or replace function public.register_presentation_document(
  p_presentation_id uuid,
  p_storage_path text,
  p_name text,
  p_category text,
  p_description text,
  p_file_type text,
  p_file_size bigint
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_count integer;
begin
  if auth.uid() is null
     or p_storage_path !~* ('^' || auth.uid()::text || '/' || p_presentation_id::text
        || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg|png|webp)$') then
    raise exception 'DOCUMENT_BAD_PATH' using errcode = 'check_violation';
  end if;
  if p_name is null or char_length(btrim(p_name)) = 0 then
    raise exception 'DOCUMENT_NO_NAME' using errcode = 'check_violation';
  end if;

  perform pg_advisory_xact_lock(hashtext('documents:' || p_presentation_id::text));

  select count(*) into v_count
    from public.presentation_documents where presentation_id = p_presentation_id;
  if v_count >= 30 then
    raise exception 'DOCUMENT_LIMIT' using errcode = 'check_violation';
  end if;

  insert into public.presentation_documents
    (presentation_id, name, category, description, storage_path, file_type, file_size_bytes, sort_order)
  values (
    p_presentation_id, left(btrim(p_name), 200), p_category, p_description,
    p_storage_path, p_file_type, p_file_size,
    coalesce((select max(sort_order) + 1 from public.presentation_documents
              where presentation_id = p_presentation_id), 0)
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.delete_presentation_document(p_document_id uuid)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_presentation uuid;
  v_path text;
begin
  select presentation_id, storage_path into v_presentation, v_path
    from public.presentation_documents where id = p_document_id;
  if v_presentation is null then
    return null;
  end if;

  perform pg_advisory_xact_lock(hashtext('documents:' || v_presentation::text));
  delete from public.presentation_documents where id = p_document_id;
  return v_path;
end;
$$;

create or replace function public.swap_document_order(
  p_doc_a uuid,
  p_doc_b uuid
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
    from public.presentation_documents where id = p_doc_a;
  if v_presentation is null then
    raise exception 'DOCUMENT_NOT_FOUND' using errcode = 'check_violation';
  end if;

  perform pg_advisory_xact_lock(hashtext('documents:' || v_presentation::text));

  select sort_order into v_order_a
    from public.presentation_documents where id = p_doc_a;
  select sort_order into v_order_b
    from public.presentation_documents
   where id = p_doc_b and presentation_id = v_presentation;
  if v_order_a is null or v_order_b is null then
    raise exception 'DOCUMENT_NOT_FOUND' using errcode = 'check_violation';
  end if;

  update public.presentation_documents set sort_order = -1        where id = p_doc_a;
  update public.presentation_documents set sort_order = v_order_a where id = p_doc_b;
  update public.presentation_documents set sort_order = v_order_b where id = p_doc_a;
end;
$$;

-- 6b-10) LIMIT FOTEK 20 → 60 (přepis register_presentation_photo, jinak beze změny)
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

  if v_count >= 60 then
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

-- 6b-11) BACKFILL — každé prezentaci bez sekcí založ výchozí sadu
insert into public.presentation_sections (presentation_id, kind, position, enabled, content)
select p.id, seed.kind, seed.position, true, seed.content
from public.presentations p
cross join (values
  (0, 'hero',       '{}'::jsonb),
  (1, 'gallery',    '{"heading":"Galerie"}'::jsonb),
  (2, 'text',       '{"heading":"Příběh nemovitosti","source":"description"}'::jsonb),
  (3, 'text',       '{"heading":"Lokalita a okolí","source":"location_text"}'::jsonb),
  (4, 'text',       '{"heading":"Vybavení a přednosti","source":"features_text"}'::jsonb),
  (5, 'parameters', '{}'::jsonb),
  (6, 'contact',    '{}'::jsonb)
) as seed(position, kind, content)
where not exists (
  select 1 from public.presentation_sections s where s.presentation_id = p.id
);

-- 6b-12) STORAGE — bucket dokumentů (privátní) + policies (v ochranném bloku)
do $$
begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('presentation-documents', 'presentation-documents', false, 20971520,
          array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do update
    set public = false,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;
exception when insufficient_privilege or undefined_table then
  raise notice 'BUCKET presentation-documents přeskočen (chybí práva na storage.*) — založ ho ručně.';
end $$;

do $$
begin
  execute $p$drop policy if exists "documents owner upload" on storage.objects$p$;
  execute $p$
    create policy "documents owner upload" on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'presentation-documents'
        and (storage.foldername(name))[1] = auth.uid()::text
        and array_length(storage.foldername(name), 1) = 2
        and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and name ~* '\.(pdf|jpg|png|webp)$'
        and exists (
          select 1 from public.presentations p
          where p.id = ((storage.foldername(name))[2])::uuid
            and p.owner_id = auth.uid()
        )
      )
  $p$;
  execute $p$drop policy if exists "documents owner read" on storage.objects$p$;
  execute $p$
    create policy "documents owner read" on storage.objects
      for select to authenticated
      using (
        bucket_id = 'presentation-documents'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
  $p$;
  execute $p$drop policy if exists "documents owner delete" on storage.objects$p$;
  execute $p$
    create policy "documents owner delete" on storage.objects
      for delete to authenticated
      using (
        bucket_id = 'presentation-documents'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
  $p$;
  execute $p$drop policy if exists "documents public read published" on storage.objects$p$;
  execute $p$
    create policy "documents public read published" on storage.objects
      for select to anon, authenticated
      using (
        bucket_id = 'presentation-documents'
        and exists (
          select 1
          from public.presentation_documents d
          join public.presentations p on p.id = d.presentation_id
          where d.storage_path = name
            and p.status = 'published'
            and (storage.foldername(name))[1] = p.owner_id::text
        )
      )
  $p$;
exception when insufficient_privilege or undefined_table then
  raise notice 'POLITIKY STORAGE pro dokumenty přeskočeny (chybí práva) — naklikej je ručně.';
end $$;


-- =====================================================================
-- 6c) OTÍNSKÁ — KOLO 2/3: media bucket pro obrázky sekcí
--     (migrace 20260715140000_otinska_round23) — půdorysy, fotky místností,
--     analytické mapy, panorama. Veřejné čtení GENERICKY přes cestu (2. složka =
--     prezentace musí být published, 1. složka = vlastník). add_presentation_section
--     výše už má rozšířený whitelist o floorplans/analyticMaps/poi/panorama/
--     socialProof/news.
-- =====================================================================
do $$
begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('presentation-media', 'presentation-media', false, 15728640,
          array['image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do update
    set public = false,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;
exception when insufficient_privilege or undefined_table then
  raise notice 'BUCKET presentation-media přeskočen (chybí práva na storage.*) — založ ho ručně.';
end $$;

do $$
begin
  execute $p$drop policy if exists "media owner upload" on storage.objects$p$;
  execute $p$
    create policy "media owner upload" on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'presentation-media'
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
  execute $p$drop policy if exists "media owner read" on storage.objects$p$;
  execute $p$
    create policy "media owner read" on storage.objects
      for select to authenticated
      using (
        bucket_id = 'presentation-media'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
  $p$;
  execute $p$drop policy if exists "media owner delete" on storage.objects$p$;
  execute $p$
    create policy "media owner delete" on storage.objects
      for delete to authenticated
      using (
        bucket_id = 'presentation-media'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
  $p$;
  execute $p$drop policy if exists "media public read published" on storage.objects$p$;
  execute $p$
    create policy "media public read published" on storage.objects
      for select to anon, authenticated
      using (
        bucket_id = 'presentation-media'
        and exists (
          select 1 from public.presentations p
          where p.id::text = (storage.foldername(name))[2]
            and p.status = 'published'
            and (storage.foldername(name))[1] = p.owner_id::text
        )
      )
  $p$;
exception when insufficient_privilege or undefined_table then
  raise notice 'POLITIKY STORAGE pro media přeskočeny (chybí práva) — naklikej je ručně.';
end $$;


-- =====================================================================
-- 6e) BEZPEČNOSTNÍ DOROVNÁNÍ — Codex revize 2026-07-15 (H1–H5 část v SQL, M1–M2)
--     Přehrává dřívější (děravé) definice poslední verzí (last-wins). Aditivní,
--     nic se nemaže z dat. Detail viz REVIEW_CODEX_2026_07_15.md + migrace
--     20260715180000_codex_security_hardening.sql (shodný obsah).
-- =====================================================================

-- H1) sekce: veřejně jen ZAPNUTÉ sekce publikované prezentace (owner vidí vše)
drop policy if exists "sections public read published" on public.presentation_sections;
create policy "sections public read published" on public.presentation_sections
  for select
  using (
    enabled = true
    and exists (
      select 1 from public.presentations p
      where p.id = presentation_id and p.status = 'published'
    )
  );

-- H2) dokumenty (DB řádek): veřejně jen když je sekce `documents` ZAPNUTÁ
drop policy if exists "documents public read published" on public.presentation_documents;
create policy "documents public read published" on public.presentation_documents
  for select
  using (
    exists (
      select 1 from public.presentations p
      where p.id = presentation_id and p.status = 'published'
    )
    and exists (
      select 1 from public.presentation_sections s
      where s.presentation_id = presentation_documents.presentation_id
        and s.kind = 'documents'
        and s.enabled = true
    )
  );

-- H3+H4) MEDIA — registrace do DB + veřejné čtení přes ni + limit v DB
create table if not exists public.presentation_media (
  id              uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references public.presentations (id) on delete cascade,
  section_id      uuid not null references public.presentation_sections (id) on delete cascade,
  storage_path    text not null,
  created_at      timestamptz not null default now()
);
comment on table public.presentation_media is
  'Registrace obrázků sekcí (mapy, panorama, půdorysy). Veřejné čtení objektu v bucketu presentation-media stojí na EXISTENCI tohoto řádku u ZAPNUTÉ sekce PUBLISHED prezentace (H3/H4).';
create index if not exists presentation_media_presentation_idx
  on public.presentation_media (presentation_id);
create index if not exists presentation_media_section_idx
  on public.presentation_media (section_id);
do $$
begin
  create unique index if not exists presentation_media_storage_path_key
    on public.presentation_media (storage_path);
exception when unique_violation then
  raise notice 'INDEX presentation_media_storage_path_key neprošel: dva řádky míří na stejný soubor. Data jsem nechal být.';
end $$;

alter table public.presentation_media enable row level security;
drop policy if exists "media rows owner all" on public.presentation_media;
create policy "media rows owner all" on public.presentation_media
  for all
  using (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.owner_id = auth.uid()));
drop policy if exists "media rows public read" on public.presentation_media;
create policy "media rows public read" on public.presentation_media
  for select
  using (exists (
    select 1
    from public.presentation_sections s
    join public.presentations p on p.id = s.presentation_id
    where s.id = section_id
      and s.enabled = true
      and p.status = 'published'
  ));

create or replace function public.sync_presentation_media(
  p_presentation_id uuid,
  p_section_id uuid,
  p_paths text[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uuid   constant text := '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
  v_limit  constant integer := 1000;  -- hard cap; praktický strop drží slicy v UI (lib/media.ts)
  v_paths  text[] := coalesce(p_paths, '{}');
  v_other  integer;
  v_new    integer;
  v_path   text;
begin
  if auth.uid() is null then
    raise exception 'MEDIA_NOT_OWNER' using errcode = 'check_violation';
  end if;
  if not exists (
    select 1
    from public.presentation_sections s
    join public.presentations p on p.id = s.presentation_id
    where s.id = p_section_id
      and s.presentation_id = p_presentation_id
      and p.owner_id = auth.uid()
  ) then
    raise exception 'MEDIA_NOT_OWNER' using errcode = 'check_violation';
  end if;

  perform pg_advisory_xact_lock(hashtext('media:' || p_presentation_id::text));

  -- Očisti vstup: jen neprázdné a unikátní cesty (žádné NULL/prázdno → přesný delete i limit).
  v_paths := array(select distinct t from unnest(v_paths) as t where t is not null and t <> '');

  select count(*) into v_other
    from public.presentation_media
   where presentation_id = p_presentation_id
     and section_id <> p_section_id;
  v_new := coalesce(array_length(v_paths, 1), 0);
  if v_other + v_new > v_limit then
    raise exception 'MEDIA_LIMIT' using errcode = 'check_violation';
  end if;

  delete from public.presentation_media
   where section_id = p_section_id
     and not (storage_path = any (v_paths));

  foreach v_path in array v_paths loop
    if v_path !~* ('^' || auth.uid()::text || '/' || p_presentation_id::text
        || '/' || v_uuid || '\.(jpg|png|webp)$') then
      raise exception 'MEDIA_BAD_PATH' using errcode = 'check_violation';
    end if;
    insert into public.presentation_media (presentation_id, section_id, storage_path)
    values (p_presentation_id, p_section_id, v_path)
    on conflict (storage_path) do update set section_id = excluded.section_id;
  end loop;
end;
$$;

-- BACKFILL registrace z obsahu sekcí (idempotentní), ať se publikované nerozbijí.
insert into public.presentation_media (presentation_id, section_id, storage_path)
select s.presentation_id, s.id, s.content->>'image_path'
from public.presentation_sections s
where s.kind = 'panorama' and coalesce(s.content->>'image_path', '') <> ''
on conflict (storage_path) do nothing;

insert into public.presentation_media (presentation_id, section_id, storage_path)
select s.presentation_id, s.id, item->>'image_path'
from public.presentation_sections s
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(s.content->'items') = 'array' then s.content->'items' else '[]'::jsonb end
) as item
where s.kind = 'analyticMaps' and coalesce(item->>'image_path', '') <> ''
on conflict (storage_path) do nothing;

insert into public.presentation_media (presentation_id, section_id, storage_path)
select s.presentation_id, s.id, fl->>'image_path'
from public.presentation_sections s
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(s.content->'floors') = 'array' then s.content->'floors' else '[]'::jsonb end
) as fl
where s.kind = 'floorplans' and coalesce(fl->>'image_path', '') <> ''
on conflict (storage_path) do nothing;

insert into public.presentation_media (presentation_id, section_id, storage_path)
select s.presentation_id, s.id, room->>'image_path'
from public.presentation_sections s
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(s.content->'floors') = 'array' then s.content->'floors' else '[]'::jsonb end
) as fl
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(fl->'rooms') = 'array' then fl->'rooms' else '[]'::jsonb end
) as room
where s.kind = 'floorplans' and coalesce(room->>'image_path', '') <> ''
on conflict (storage_path) do nothing;

-- M1) integrita sekcí v DB: unikátní index na singletony + trigger whitelistu typů
do $$
begin
  create unique index if not exists presentation_sections_singleton_key
    on public.presentation_sections (presentation_id, kind)
    where kind in (
      'hero','parameters','contact','map','gallery','documents',
      'floorplans','analyticMaps','poi','panorama','socialProof','news',
      'video','investmentCalc','chatbot'
    );
exception when unique_violation then
  raise notice 'INDEX presentation_sections_singleton_key neprošel: duplicitní singleton sekce. Data jsem nechal být — přebytek smaž ručně.';
end $$;

create or replace function public.guard_presentation_section_kind()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.kind not in (
    'hero','text','parameters','gallery','map','benefits',
    'documents','valuation','technicalCondition','contact',
    'floorplans','analyticMaps','poi','panorama','socialProof','news',
    'video','investmentCalc'
  ) then
    raise exception 'SECTION_KIND_NOT_ALLOWED' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
drop trigger if exists presentation_sections_guard_kind on public.presentation_sections;
create trigger presentation_sections_guard_kind
  before insert or update of kind on public.presentation_sections
  for each row execute function public.guard_presentation_section_kind();

-- M2) buckety: znovu vynuť limity (allowed_mime_types + file_size_limit) — oba
do $$
begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('presentation-documents', 'presentation-documents', false, 20971520,
          array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do update
    set public = false, file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('presentation-media', 'presentation-media', false, 15728640,
          array['image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do update
    set public = false, file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;
exception when insufficient_privilege or undefined_table then
  raise notice 'BUCKETY: limity nešly nastavit (chybí práva na storage.*) — srovnej ručně.';
end $$;

-- H2+H3) Storage policies: dokumenty a media veřejně jen přes DB vazbu
do $$
begin
  execute $p$drop policy if exists "documents public read published" on storage.objects$p$;
  execute $p$
    create policy "documents public read published" on storage.objects
      for select to anon, authenticated
      using (
        bucket_id = 'presentation-documents'
        and exists (
          select 1
          from public.presentation_documents d
          join public.presentations p on p.id = d.presentation_id
          where d.storage_path = name
            and p.status = 'published'
            and (storage.foldername(name))[1] = p.owner_id::text
            and exists (
              select 1 from public.presentation_sections s
              where s.presentation_id = d.presentation_id
                and s.kind = 'documents'
                and s.enabled = true
            )
        )
      )
  $p$;

  execute $p$drop policy if exists "media public read published" on storage.objects$p$;
  execute $p$
    create policy "media public read published" on storage.objects
      for select to anon, authenticated
      using (
        bucket_id = 'presentation-media'
        and exists (
          select 1
          from public.presentation_media m
          join public.presentation_sections s on s.id = m.section_id
          join public.presentations p on p.id = m.presentation_id
          where m.storage_path = name
            and s.enabled = true
            and p.status = 'published'
            and (storage.foldername(name))[1] = p.owner_id::text
        )
      )
  $p$;
exception when insufficient_privilege or undefined_table then
  raise notice 'POLITIKY STORAGE (dokumenty/media) nešly přehrát (chybí práva) — naklikej ručně.';
end $$;

-- =====================================================================
-- 7) KONTROLA — co má existovat, existuje?
--    Ve sloupci `stav` musí být VŠUDE „✅ je".
-- =====================================================================
select 'tabulka' as co, t.name as nazev,
       case when to_regclass('public.' || t.name) is not null
            then '✅ je' else '❌ CHYBÍ' end as stav
from (values
  ('profiles'), ('presentations'), ('presentation_photos'),
  ('payments'), ('stripe_events'),
  -- Otínská — sekce a doprovodné tabulky
  ('presentation_sections'), ('presentation_documents'),
  ('presentation_floors'), ('presentation_rooms'),
  ('presentation_maps'), ('presentation_places'), ('presentation_panoramas'),
  -- Codex 2026-07-15 — registrace médií
  ('presentation_media')
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
  -- Otínská — nová pole nemovitosti
  ('presentations','subtitle'), ('presentations','year_built'),
  ('presentations','floors'), ('presentations','built_area_m2'),
  ('presentations','building_dimensions'), ('presentations','condition'),
  ('presentations','ownership'), ('presentations','monthly_costs_czk'),
  ('presentations','lat'), ('presentations','lng'), ('presentations','target_persona'),
  -- profil
  ('profiles','full_name'), ('profiles','phone'),
  -- fotky
  ('presentation_photos','presentation_id'), ('presentation_photos','storage_path'),
  ('presentation_photos','is_hero'), ('presentation_photos','sort_order'),
  ('presentation_photos','caption'), ('presentation_photos','category'),
  ('presentation_photos','room_id'),
  -- sekce + dokumenty
  ('presentation_sections','presentation_id'), ('presentation_sections','kind'),
  ('presentation_sections','position'), ('presentation_sections','enabled'),
  ('presentation_sections','content'),
  ('presentation_documents','presentation_id'), ('presentation_documents','name'),
  ('presentation_documents','storage_path'), ('presentation_documents','sort_order'),
  -- Codex 2026-07-15 — registrace médií
  ('presentation_media','presentation_id'), ('presentation_media','section_id'),
  ('presentation_media','storage_path'),
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
  ('public.set_updated_at()'),
  -- Otínská — sekce
  ('public.add_presentation_section(uuid, text)'),
  ('public.move_presentation_section(uuid, text)'),
  ('public.set_presentation_section_enabled(uuid, boolean)'),
  ('public.delete_presentation_section(uuid)'),
  ('public.reorder_presentation_sections(uuid, uuid[])'),
  -- Otínská — dokumenty
  ('public.register_presentation_document(uuid, text, text, text, text, text, bigint)'),
  ('public.delete_presentation_document(uuid)'),
  ('public.swap_document_order(uuid, uuid)'),
  -- Codex 2026-07-15 — registrace médií + strážce typu sekce
  ('public.sync_presentation_media(uuid, uuid, text[])'),
  ('public.guard_presentation_section_kind()')
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
  ('public.payments',           'payments_unpublish_when_unpaid'),
  -- Codex 2026-07-15 — strážce povolených typů sekcí
  ('public.presentation_sections','presentation_sections_guard_kind')
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
  ('payments','payments owner read'),
  -- Otínská — sekce a doprovodné tabulky
  ('presentation_sections','sections owner all'),
  ('presentation_sections','sections public read published'),
  ('presentation_documents','documents owner all'),
  ('presentation_documents','documents public read published'),
  ('presentation_floors','floors owner all'),
  ('presentation_floors','floors public read published'),
  ('presentation_rooms','rooms owner all'),
  ('presentation_rooms','rooms public read published'),
  ('presentation_maps','maps owner all'),
  ('presentation_maps','maps public read published'),
  ('presentation_places','places owner all'),
  ('presentation_places','places public read published'),
  ('presentation_panoramas','panoramas owner all'),
  ('presentation_panoramas','panoramas public read published'),
  -- Codex 2026-07-15 — registrace médií
  ('presentation_media','media rows owner all'),
  ('presentation_media','media rows public read')
) as p(tbl, pol)

union all
select 'úložiště', 'bucket presentation-photos',
       case when exists (
         select 1 from storage.buckets where id = 'presentation-photos'
       ) then '✅ je' else '❌ CHYBÍ' end

union all
select 'úložiště', 'bucket presentation-documents',
       case when exists (
         select 1 from storage.buckets where id = 'presentation-documents'
       ) then '✅ je' else '❌ CHYBÍ' end

union all
select 'úložiště', 'bucket presentation-media',
       case when exists (
         select 1 from storage.buckets where id = 'presentation-media'
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
  ('photos public read published'),
  ('documents owner upload'),
  ('documents owner read'),
  ('documents owner delete'),
  ('documents public read published'),
  ('media owner upload'),
  ('media owner read'),
  ('media owner delete'),
  ('media public read published')
) as s(pol)

order by 1, 2;
