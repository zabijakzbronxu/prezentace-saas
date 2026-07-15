# security check

Jsi specialista na bezpečnost. Projdi celý projekt z pohledu bezpečnosti dat a zneužití. Platí společná pravidla z `checks/README.md`.

## Na co se díváš

1. **Izolace dat uživatelů** — nemůže nikdo vidět/upravit cizí prezentaci, fotky nebo fakturační údaje? Zkontroluj každý endpoint a dotaz: filtruje podle přihlášeného uživatele?
2. **Vstupy od uživatelů** — všechno, co uživatel posílá dovnitř (texty, fotky, odkazy), je validované a ošetřené? Nejde tím aplikaci rozbít (injection, XSS, upload škodlivého souboru, příliš velký soubor)?
3. **Tajné klíče** — žádný API klíč, heslo ani token v kódu nebo v gitu. Vše v `.env`.
4. **Přihlašování a session** — hesla hashovaná, session bezpečné, ochrana proti brute-force, reset hesla bezpečný.
5. **Platby (Stripe)** — webhooky ověřují podpis, ceny se berou ze serveru (nikdy z frontendu), nejde získat placenou věc bez zaplacení.
6. **Zneužití AI promptů** — pokud kamkoli teče uživatelský obsah do AI, je filtrovaný? Nejde promptem injektovat instrukce?
7. **Veřejné prezentace** — veřejná stránka prezentace neprozrazuje nic navíc (jiné prezentace, e-maily, interní ID, skryté nemovitosti).

## Ověření nasazení úložiště (revize 2026-07)

Bezpečnost fotek stojí na nastavení bucketu a pravidel, které se dělají RUČNĚ
v Supabase (viz `app/supabase/storage-setup.md`) — v kódu je vynutit nejde.
Proto po každém zásahu do Storage spusť v **SQL Editoru** tuhle kontrolu a ověř
výsledky:

```sql
-- 1) Bucket musí být PRIVÁTNÍ a mít limity (jinak jdou nahrát velké/cizí soubory).
select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id = 'presentation-photos';
--   public = false
--   file_size_limit = 8388608  (8 MB)
--   allowed_mime_types = {image/jpeg,image/png,image/webp}

-- 2) Musí existovat všechna 4 pravidla (upload/read/delete/public-read).
select policyname from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and policyname like 'photos %';
--   photos owner upload, photos owner read, photos owner delete, photos public read published
```

Když `public` = true, nebo chybí limit/MIME typy, nebo některé pravidlo chybí →
**vysoké riziko** (mohou unikat cizí fotky nebo jít nahrát nebezpečný soubor);
oprav podle `storage-setup.md` a spusť znovu.

## Ověření oprav Codex revize (2026-07-15) — RLS kontrakt sekcí/dokumentů/médií

Po spuštění `app/supabase/APLIKUJ_VSE.sql` (nebo migrace
`20260715180000_codex_security_hardening.sql`) spusť v **SQL Editoru** tuhle
kontrolu. Ve sloupci `stav` musí být VŠUDE „✅". Detail viz `REVIEW_CODEX_2026_07_15.md`.

```sql
-- Hlídá, že veřejné čtení je navázané na zapnutí sekce / registraci média, ne jen na published.
select 'H1 · sekce jen enabled+published' as kontrola,
  case when qual ilike '%enabled%' and qual ilike '%published%' then '✅' else '❌' end as stav
from pg_policies
where schemaname = 'public' and tablename = 'presentation_sections'
  and policyname = 'sections public read published'
union all
select 'H2 · dokumenty (DB) jen zapnutá sekce',
  case when qual ilike '%documents%' and qual ilike '%enabled%' then '✅' else '❌' end
from pg_policies
where schemaname = 'public' and tablename = 'presentation_documents'
  and policyname = 'documents public read published'
union all
select 'H2 · dokumenty (Storage) jen zapnutá sekce',
  case when qual ilike '%presentation_sections%' and qual ilike '%enabled%' then '✅' else '❌' end
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and policyname = 'documents public read published'
union all
select 'H3 · media (Storage) přes registraci + enabled',
  case when qual ilike '%presentation_media%' and qual ilike '%enabled%' then '✅' else '❌' end
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and policyname = 'media public read published'
union all
select 'H3 · tabulka presentation_media',
  case when to_regclass('public.presentation_media') is not null then '✅' else '❌' end
union all
select 'H3 · media rows public read policy',
  case when exists (select 1 from pg_policies where schemaname = 'public'
    and tablename = 'presentation_media' and policyname = 'media rows public read')
    then '✅' else '❌' end
union all
select 'H4 · RPC sync_presentation_media',
  case when to_regprocedure('public.sync_presentation_media(uuid, uuid, text[])') is not null
    then '✅' else '❌' end
union all
select 'M1 · unikátní index na singletony',
  case when exists (select 1 from pg_indexes where schemaname = 'public'
    and indexname = 'presentation_sections_singleton_key') then '✅' else '❌' end
union all
select 'M1 · trigger whitelistu typů sekce',
  case when exists (select 1 from pg_trigger where tgname = 'presentation_sections_guard_kind'
    and not tgisinternal) then '✅' else '❌' end
order by 1;

-- M2 · limity bucketů (oba PRIVÁTNÍ, s velikostí i MIME whitelistem)
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id in ('presentation-documents', 'presentation-media');
--   presentation-documents: public=false, 20971520, {application/pdf,image/jpeg,image/png,image/webp}
--   presentation-media:     public=false, 15728640, {image/jpeg,image/png,image/webp}
```

**Tvrdý důkaz RLS (volitelné, ale nejsilnější):** ověř přímo jako role `anon`, že
vypnuté sekce publikovaných prezentací nejsou vidět. Běží v transakci s `rollback`,
takže nic nemění:

```sql
begin;
  set local role anon;
  -- Kolik VYPNUTÝCH sekcí publikovaných prezentací vidí anon? MUSÍ být 0.
  select count(*) as vypnute_sekce_videne_anonem
  from public.presentation_sections s
  join public.presentations p on p.id = s.presentation_id
  where p.status = 'published' and s.enabled = false;
rollback;
-- Výsledek MUSÍ být 0. (Stejný vzor jde použít i na presentation_documents
--  a presentation_media — anon nesmí vidět řádky z vypnutých sekcí.)
```

Když kterýkoli řádek ukáže „❌", nebo tvrdý důkaz vrátí víc než 0 → **vysoké riziko**
(oklikou přes API by šly číst vypnuté sekce / dokumenty / obrázky); spusť
`APLIKUJ_VSE.sql` znovu a ověř.

## Výstup

Nálezy laicky (k čemu to slouží · co je problém · co s tím), seřazené od nejpalčivějšího, s odhadem rizika a času. Drobnosti oprav, změny chování navrhni jako task. Když je čisto, vypiš, co jsi kontroloval a nenašel.
