-- =====================================================================
-- Oprava po křížové revizi — DB pojistky
--   (4) CHECK omezení na presentations
--   (2) tvrdé vynucení pravidla „bez zaplacení se nezveřejní"
-- =====================================================================
-- Additivní a bezpečné. Idempotentní (guard přes pg_constraint / CREATE OR REPLACE),
-- lze spustit i opakovaně. Nic nemaže a nemění existující data.
--
-- CHECK omezení přidáváme jako NOT VALID: nové/upravované řádky se hlídají,
-- ale případná stará data migrace neshodí. Po ověření lze později doplnit
-- `validate constraint`.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) CHECK omezení na presentations
--    (NULL vždy projde — hlídáme jen vyplněné hodnoty)
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'presentations_price_positive') then
    alter table public.presentations
      add constraint presentations_price_positive
      check (price_czk is null or price_czk > 0) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'presentations_floor_area_nonneg') then
    alter table public.presentations
      add constraint presentations_floor_area_nonneg
      check (floor_area_m2 is null or floor_area_m2 >= 0) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'presentations_land_area_nonneg') then
    alter table public.presentations
      add constraint presentations_land_area_nonneg
      check (land_area_m2 is null or land_area_m2 >= 0) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'presentations_energy_class_valid') then
    alter table public.presentations
      add constraint presentations_energy_class_valid
      check (energy_class is null or energy_class in ('A','B','C','D','E','F','G')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'presentations_text_lengths') then
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
end $$;

-- ---------------------------------------------------------------------
-- 2) POJISTKA „bez zaplacení se nezveřejní"
--    Trigger NEDOVOLÍ nastavit status 'published', pokud k prezentaci
--    neexistuje zaplacená platba (payments.status = 'paid').
--    Platí i pro přímý update z klienta s anon klíčem — RLS to neřeší.
--    Publikace má jít přes kontrolovanou server akci / RPC (service_role),
--    ne přímým updatem z klienta; tenhle trigger je poslední pojistka v DB.
-- ---------------------------------------------------------------------
create or replace function public.enforce_paid_before_publish()
returns trigger
language plpgsql
as $$
begin
  -- Kontrolujeme jen PŘECHOD do 'published' (ne opakované uložení už publikované).
  if new.status = 'published'
     and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    if not exists (
      select 1 from public.payments pay
      where pay.presentation_id = new.id
        and pay.status = 'paid'
    ) then
      raise exception
        'Publikace zamítnuta: k prezentaci % neexistuje zaplacená platba (payments.status=''paid'').',
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
