-- =====================================================================
-- E1.3 — Základní datový model: uživatel → prezentace → fotky → platba
-- =====================================================================
-- Pravidlo produktu: "bez zaplacení se nezveřejní".
-- Prezentace má stav: 'draft' (koncept) → 'paid' (zaplaceno) → 'published' (publikováno).
--
-- Model: 1 uživatel : N prezentací (víc prezentací na účet).
-- Bezpečnost: RLS zapnuté všude. Každý vidí/edituje jen SVÉ.
--            Publikovaná prezentace (a její fotky) je čitelná i bez přihlášení.
--
-- Skript je idempotentní tam, kde to jde (IF NOT EXISTS / CREATE OR REPLACE),
-- aby šel bezpečně spustit i opakovaně.
-- =====================================================================

create extension if not exists pgcrypto;  -- kvůli gen_random_uuid()

-- ---------------------------------------------------------------------
-- 1) PROFILES — profil uživatele, navázaný 1:1 na auth.users
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  phone       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is 'Profil uživatele (1:1 k auth.users). Zakládá se automaticky při registraci.';

-- ---------------------------------------------------------------------
-- 2) PRESENTATIONS — prodejní prezentace nemovitosti
-- ---------------------------------------------------------------------
create table if not exists public.presentations (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles (id) on delete cascade,

  -- stav dle pravidla "bez zaplacení se nezveřejní"
  status        text not null default 'draft'
                check (status in ('draft', 'paid', 'published')),

  -- veřejná adresa (slug) pro URL typu /p/<slug>
  slug          text not null unique,

  -- základní údaje
  title         text,

  -- adresa nemovitosti
  street        text,
  city          text,
  postal_code   text,

  -- parametry nemovitosti
  price_czk     bigint,             -- cena v celých Kč
  disposition   text,               -- např. "3+kk"
  floor_area_m2 numeric(10,2),      -- užitná plocha
  land_area_m2  numeric(10,2),      -- plocha pozemku
  energy_class  text,               -- PENB: A–G
  description   text,               -- popisný text

  -- kontakt zobrazený na veřejné prezentaci
  contact_name  text,
  contact_email text,
  contact_phone text,

  published_at  timestamptz,        -- kdy byla publikována
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.presentations is 'Prezentace nemovitosti. 1 uživatel : N prezentací. Stav draft→paid→published.';
comment on column public.presentations.status is 'draft = koncept, paid = zaplaceno, published = veřejně publikováno.';

create index if not exists presentations_owner_idx  on public.presentations (owner_id);
create index if not exists presentations_status_idx on public.presentations (status);

-- ---------------------------------------------------------------------
-- 3) PRESENTATION_PHOTOS — fotky prezentace (hero + galerie)
-- ---------------------------------------------------------------------
create table if not exists public.presentation_photos (
  id              uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references public.presentations (id) on delete cascade,
  storage_path    text not null,               -- cesta v Supabase Storage
  is_hero         boolean not null default false,
  sort_order      integer not null default 0,  -- pořadí v galerii
  alt_text        text,
  created_at      timestamptz not null default now()
);

comment on table public.presentation_photos is 'Fotky prezentace. Nejvýš jedna hero fotka na prezentaci.';

create index if not exists presentation_photos_presentation_idx
  on public.presentation_photos (presentation_id);

-- nejvýš jedna hero fotka na prezentaci
create unique index if not exists presentation_photos_one_hero
  on public.presentation_photos (presentation_id) where is_hero;

-- ---------------------------------------------------------------------
-- 4) PAYMENTS — platba za prezentaci (zatím jen struktura, žádný Stripe)
-- ---------------------------------------------------------------------
create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  presentation_id     uuid not null references public.presentations (id) on delete cascade,
  amount_czk          bigint,
  currency            text not null default 'czk',
  status              text not null default 'pending'
                      check (status in ('pending', 'paid', 'failed', 'refunded')),
  provider            text,          -- později "stripe"
  provider_payment_id text,          -- ID platby u poskytovatele
  paid_at             timestamptz,
  created_at          timestamptz not null default now()
);

comment on table public.payments is 'Platba za prezentaci. Zatím jen struktura; napojení na Stripe přijde v E3.9.';

create index if not exists payments_presentation_idx on public.payments (presentation_id);
create index if not exists payments_status_idx       on public.payments (status);

-- ---------------------------------------------------------------------
-- 5) TRIGGERY
-- ---------------------------------------------------------------------

-- 5a) Automatické udržování updated_at
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

-- 5b) Založení profilu automaticky při registraci uživatele
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

-- ---------------------------------------------------------------------
-- 6) ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.presentations       enable row level security;
alter table public.presentation_photos enable row level security;
alter table public.payments            enable row level security;

-- PROFILES: uživatel vidí a spravuje jen svůj profil
drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- PRESENTATIONS: vlastník má plný přístup ke svým
drop policy if exists "presentations owner all" on public.presentations;
create policy "presentations owner all" on public.presentations
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- PRESENTATIONS: kdokoli (i nepřihlášený) smí ČÍST publikované
drop policy if exists "presentations public read published" on public.presentations;
create policy "presentations public read published" on public.presentations
  for select using (status = 'published');

-- PHOTOS: vlastník mateřské prezentace má plný přístup
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

-- PHOTOS: kdokoli smí ČÍST fotky publikované prezentace
drop policy if exists "photos public read published" on public.presentation_photos;
create policy "photos public read published" on public.presentation_photos
  for select using (exists (
    select 1 from public.presentations p
    where p.id = presentation_id and p.status = 'published'
  ));

-- PAYMENTS: vlastník smí jen ČÍST své platby.
-- Zápisy (vytvoření/aktualizace) půjdou přes server (service_role, obchází RLS) —
-- to zařídí Stripe webhook v úkolu E3.9. Proto tu záměrně NENÍ insert/update policy.
drop policy if exists "payments owner read" on public.payments;
create policy "payments owner read" on public.payments
  for select using (exists (
    select 1 from public.presentations p
    where p.id = presentation_id and p.owner_id = auth.uid()
  ));

-- =====================================================================
-- POZNÁMKA k pravidlu "bez zaplacení se nezveřejní":
-- Tvrdé vynucení (že status='published' jde nastavit jen když existuje
-- zaplacená platba) přidáme až s napojením Stripe (E3.9), aby teď šlo
-- publikaci testovat i bez reálné platby. Do té doby ho hlídá aplikace.
-- =====================================================================
