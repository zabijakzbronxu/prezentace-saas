-- =====================================================================
-- FIX — chybějící profily pro účty registrované PŘED nasazením datového modelu
-- =====================================================================
-- Problém: ukládání prezentace padá na
--   'presentations_owner_id_fkey' (insert/update violates foreign key constraint).
--
-- Proč: presentations.owner_id  ->  profiles.id  ->  auth.users.id.
-- Trigger auth.users -> profiles (handle_new_user) vznikl až v migraci
-- 20260704120000. Uživatelé zaregistrovaní DŘÍVE tedy nemají řádek v profiles,
-- a proto FK při ukládání jejich prezentace selže.
--
-- Poznámka ke schématu: tabulka public.profiles NEMÁ sloupec email.
-- Jediný povinný sloupec bez defaultu je id. full_name/phone jsou nepovinné,
-- created_at/updated_at mají default now(). Proto backfill plní jen id
-- (+ volitelně full_name z metadat), žádný email se nekopíruje.
--
-- Skript je idempotentní — lze ho spustit opakovaně bez škody.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) BACKFILL — doplň chybějící profily pro všechny existující auth.users
-- ---------------------------------------------------------------------
insert into public.profiles (id, full_name)
select
  u.id,
  u.raw_user_meta_data ->> 'full_name'
from auth.users as u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 2) ZAJISTI TRIGGER — nové účty ať automaticky dostanou profil
--    (CREATE OR REPLACE + drop/create = bezpečně přepíše i případnou
--     starší verzi funkce/triggeru)
-- ---------------------------------------------------------------------
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
