-- =====================================================================
-- Zpřísnění po nezávislé revizi (2026-07-13) — průvodce E2.x
--
-- Revize NEnašla způsob, jak obejít platbu ani jak číst/měnit cizí data
-- (RLS i platební trigger drží). Tahle migrace jen DOTAHUJE obranu do
-- hloubky na třech místech, kde bezpečnost dosud stála na jediné vrstvě:
--
--   1) Cesta k fotce (storage_path) se dosud hlídala jen UVNITŘ funkce
--      register_presentation_photo. Kdo obešel funkci a zapsal řádek
--      napřímo (PostgREST), mohl si k SVÉ prezentaci uložit odkaz na cestu
--      do CIZÍ složky. Sám soubor tím nezíská (brání Storage policy), ale
--      komentář „pojistka přímo v DB" tím nebyl pravdivý. Nově tvar cesty
--      vynutí i trigger přímo na tabulce — pro každý zápis, ne jen přes funkci.
--
--   2) Bezpečnostní funkce neměly zafixovaný search_path. U SECURITY INVOKER
--      je riziko malé, přesto ho best-practice fixuje (ať chování nezávisí
--      na session nastavení volajícího).
--
--   3) Do tabulky `payments` nesmí zapisovat nikdo kromě serveru (Stripe
--      webhook poběží jako service_role, který granty i RLS obchází).
--      Dosud to drželo jen tím, že chybí write-policy; přidáváme ještě
--      tvrdý REVOKE práv pro role anon/authenticated (opasek i kšandy).
--
-- Vše je ADITIVNÍ a IDEMPOTENTNÍ (dá se spustit i opakovaně, nic nemaže,
-- nemění existující data ani chování pro běžného uživatele). Pracuje jen
-- se schématem `public` — nesahá na `storage.*`, takže projde i na
-- projektech, kde SQL na Storage neprojde.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) DB pojistka tvaru cesty k fotce (nezávislá na aplikaci i na RPC)
--    Cesta MUSÍ být: <auth.uid()>/<presentation_id>/<uuid>.(jpg|png|webp)
--    Stejné pravidlo jako v register_presentation_photo — teď vynucené
--    na úrovni tabulky pro KAŽDÝ insert/změnu cesty.
-- ---------------------------------------------------------------------
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

-- Fire jen když se cesta/prezentace skutečně zapisuje nebo mění.
-- (swap pořadí = mění sort_order, hero = mění is_hero → sem nespadnou.)
drop trigger if exists presentation_photos_enforce_path on public.presentation_photos;
create trigger presentation_photos_enforce_path
  before insert or update of storage_path, presentation_id
  on public.presentation_photos
  for each row execute function public.enforce_photo_path();

-- ---------------------------------------------------------------------
-- 2) Zafixovat search_path bezpečnostních funkcí (nemění jejich tělo).
--    Každou měníme jen když už existuje — migrace tak projde i kdyby se
--    spustila dřív než ta, co funkci zakládá (nespadne, nic nerozbije).
-- ---------------------------------------------------------------------
do $$
declare
  fn text;
  sigs text[] := array[
    'public.register_presentation_photo(uuid, text)',
    'public.swap_photo_order(uuid, uuid)',
    'public.set_hero_photo(uuid)',
    'public.delete_presentation_photo(uuid)',
    'public.enforce_paid_before_publish()'
  ];
begin
  foreach fn in array sigs loop
    if to_regprocedure(fn) is not null then
      execute 'alter function ' || fn || ' set search_path = public';
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 3) Tvrdě zakázat zápis do payments rolím anon/authenticated
--    (RLS už zápis blokuje absencí policy; tohle je druhá vrstva.)
--    Stripe webhook běží jako service_role → granty i RLS obchází,
--    téhle změny se nedotkne. Kdyby v budoucnu měl do payments psát
--    přihlášený uživatel, bude potřeba grant znovu zvážit.
-- ---------------------------------------------------------------------
revoke insert, update, delete on public.payments from anon, authenticated;
