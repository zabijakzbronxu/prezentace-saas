-- =====================================================================
-- E2.6 (dokončení) — kontakt prodávajícího: CHECK omezení délek
-- Sloupce contact_name / contact_email / contact_phone existují od init
-- migrace; tady jen doplňujeme pojistku délek (stejné limity hlídá server).
-- Formát e-mailu/telefonu hlídá aplikace — DB drží jen délky, aby
-- případná změna pravidel formátu nevyžadovala migraci.
--
-- Additivní a idempotentní: constraint přes guard, NOT VALID (stará data
-- nic neshodí) — stejný přístup jako migrace 20260705150000.
-- =====================================================================

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'presentations_contact_lengths') then
    alter table public.presentations
      add constraint presentations_contact_lengths
      check (
        (contact_name  is null or char_length(contact_name)  <= 120) and
        (contact_email is null or char_length(contact_email) <= 200) and
        (contact_phone is null or char_length(contact_phone) <= 30)
      ) not valid;
  end if;
end $$;
