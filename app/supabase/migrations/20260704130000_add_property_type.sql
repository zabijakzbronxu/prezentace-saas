-- =====================================================================
-- E2.4 — doplnění pole "typ nemovitosti" do prezentací.
-- Additivní a bezpečné: přidává jen nový NEPOVINNÝ sloupec.
-- Nic nemaže, jde spustit i opakovaně.
-- =====================================================================

alter table public.presentations
  add column if not exists property_type text;

comment on column public.presentations.property_type is
  'Typ nemovitosti (byt, dům, pozemek, chata, …) — volný text s nabídkou.';
