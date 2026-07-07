-- =====================================================================
-- Fotky — integrita a souběhy (nálezy křížové revize 2026-07-07)
--
-- Problém: registrace fotky, prohození pořadí, výměna hero i mazání
-- byly „přečti a pak zapiš" bez zámku. Dvě záložky najednou uměly vyrobit
-- duplicitní pořadí, dvě hero (pád na indexu), nebo prezentaci bez hero.
--
-- Řešení: databázové funkce, které celou operaci udělají v JEDNÉ transakci
-- pod zámkem na prezentaci (pg_advisory_xact_lock). Funkce jsou SECURITY
-- INVOKER — všechny čtení/zápisy uvnitř jdou přes RLS volajícího, takže
-- kdo nevlastní prezentaci, nic nepřečte ani nezmění.
--
-- Navíc: unikátní index na storage_path (jeden soubor = jeden záznam).
--
-- Additivní a idempotentní (IF NOT EXISTS / CREATE OR REPLACE).
-- =====================================================================

-- Jeden soubor ve Storage smí mít nejvýš jeden záznam.
create unique index if not exists presentation_photos_storage_path_key
  on public.presentation_photos (storage_path);

-- ---------------------------------------------------------------------
-- Registrace nahrané fotky: pořadí, hero a limit počtu atomicky.
-- Cestu k souboru navíc přiváže k volajícímu uživateli a prezentaci
-- (nezávisle na aplikaci — pojistka přímo v DB).
-- ---------------------------------------------------------------------
create or replace function public.register_presentation_photo(
  p_presentation_id uuid,
  p_storage_path text
)
returns uuid
language plpgsql
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

  -- Zámek na prezentaci: souběžná nahrání se seřadí za sebe.
  perform pg_advisory_xact_lock(hashtext('photos:' || p_presentation_id::text));

  select count(*), coalesce(bool_or(is_hero), false)
    into v_count, v_has_hero
    from public.presentation_photos
   where presentation_id = p_presentation_id;

  if v_count >= 20 then
    raise exception 'PHOTO_LIMIT' using errcode = 'check_violation';
  end if;

  -- INSERT jde přes RLS volajícího — cizí prezentace tu spadne na policy.
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

-- ---------------------------------------------------------------------
-- Prohození pořadí dvou fotek téže prezentace (třífázově, pod zámkem).
-- ---------------------------------------------------------------------
create or replace function public.swap_photo_order(
  p_photo_a uuid,
  p_photo_b uuid
)
returns void
language plpgsql
as $$
declare
  v_presentation uuid;
  v_order_a integer;
  v_order_b integer;
begin
  -- RLS: cizí fotku select nevrátí → skončíme chybou, nic se nezmění.
  select presentation_id into v_presentation
    from public.presentation_photos where id = p_photo_a;
  if v_presentation is null then
    raise exception 'PHOTO_NOT_FOUND' using errcode = 'check_violation';
  end if;

  perform pg_advisory_xact_lock(hashtext('photos:' || v_presentation::text));

  -- Čerstvé hodnoty až POD zámkem.
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

-- ---------------------------------------------------------------------
-- Nastavení hlavní (hero) fotky: sundat starou a nasadit novou v jedné
-- transakci — prezentace nikdy nezůstane bez hero.
-- ---------------------------------------------------------------------
create or replace function public.set_hero_photo(p_photo_id uuid)
returns void
language plpgsql
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

-- ---------------------------------------------------------------------
-- Smazání fotky + případné povýšení nové hero v jedné transakci.
-- Vrací cestu k souboru (aplikace pak uklidí Storage), null když
-- fotka neexistuje / nepatří volajícímu.
-- ---------------------------------------------------------------------
create or replace function public.delete_presentation_photo(p_photo_id uuid)
returns text
language plpgsql
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
