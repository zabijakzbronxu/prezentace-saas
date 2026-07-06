-- =====================================================================
-- E2.6 — Texty prezentace: dvě nové textové sekce
--   location_text — „Lokalita a okolí" (co je kolem, doprava, služby)
--   features_text — „Vybavení a přednosti" (co v domě/bytě je a proč je to fajn)
-- Hlavní popis/příběh žije v existujícím sloupci `description`.
--
-- Additivní a idempotentní: ADD COLUMN IF NOT EXISTS, constraint přes guard.
-- CHECK je NOT VALID (nová/upravená data se hlídají, stará nic neshodí) —
-- stejný přístup jako u migrace 20260705150000.
-- =====================================================================

alter table public.presentations
  add column if not exists location_text text;

alter table public.presentations
  add column if not exists features_text text;

comment on column public.presentations.location_text is
  'Textová sekce „Lokalita a okolí" (max 5000 znaků).';
comment on column public.presentations.features_text is
  'Textová sekce „Vybavení a přednosti" (max 5000 znaků).';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'presentations_section_text_lengths') then
    alter table public.presentations
      add constraint presentations_section_text_lengths
      check (
        (location_text is null or char_length(location_text) <= 5000) and
        (features_text is null or char_length(features_text) <= 5000)
      ) not valid;
  end if;
end $$;
