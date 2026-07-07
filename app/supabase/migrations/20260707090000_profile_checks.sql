-- =====================================================================
-- Profil uživatele — CHECK omezení délek (jméno, telefon)
-- Stejné limity jako u kontaktu prezentace (120 / 30), hlídá je i server.
-- Additivní a idempotentní: constraint přes guard, NOT VALID (stará data
-- nic neshodí) — stejný přístup jako předchozí migrace.
-- =====================================================================

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_field_lengths') then
    alter table public.profiles
      add constraint profiles_field_lengths
      check (
        (full_name is null or char_length(full_name) <= 120) and
        (phone     is null or char_length(phone)     <= 30)
      ) not valid;
  end if;
end $$;
