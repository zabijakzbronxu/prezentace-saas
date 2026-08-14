-- =====================================================================
--  20260814120000  kontaktni_poptavky
--  Kontaktní formulář na veřejné stránce → poptávky do DB.
--
--  Bezpečnost (RLS):
--   - INSERT smí KDOKOLIV (i anonym), ale JEN na PUBLISHED prezentaci
--     (nejde spamovat cizí koncepty; každá poptávka patří reálné veřejné stránce).
--   - SELECT smí JEN vlastník prezentace (owner_id = auth.uid()).
--   - UPDATE/DELETE nemá nikdo (žádná politika) → poptávky jsou jen ke čtení.
--
--  Aditivní, idempotentní (create if not exists, drop policy if exists/create).
--  Stejný obsah je i v APLIKUJ_VSE.sql (Karel pouští ten).
-- =====================================================================

create extension if not exists pgcrypto;

create table if not exists public.presentation_inquiries (
  id              uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references public.presentations (id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 120),
  email           text check (email is null or char_length(email) <= 200),
  phone           text check (phone is null or char_length(phone) <= 30),
  message         text not null check (char_length(message) between 1 and 2000),
  created_at      timestamptz not null default now()
);
comment on table public.presentation_inquiries is
  'Poptávky z kontaktního formuláře veřejné stránky. Insert smí kdokoliv na PUBLISHED prezentaci; čte jen vlastník.';

create index if not exists presentation_inquiries_presentation_idx
  on public.presentation_inquiries (presentation_id, created_at desc);

alter table public.presentation_inquiries enable row level security;

-- Čte jen vlastník prezentace.
drop policy if exists "inquiries owner read" on public.presentation_inquiries;
create policy "inquiries owner read" on public.presentation_inquiries
  for select
  using (exists (
    select 1 from public.presentations p
    where p.id = presentation_id and p.owner_id = auth.uid()
  ));

-- Vloží kdokoliv (anon i přihlášený), ale JEN na PUBLISHED prezentaci.
drop policy if exists "inquiries public insert published" on public.presentation_inquiries;
create policy "inquiries public insert published" on public.presentation_inquiries
  for insert to anon, authenticated
  with check (exists (
    select 1 from public.presentations p
    where p.id = presentation_id and p.status = 'published'
  ));
