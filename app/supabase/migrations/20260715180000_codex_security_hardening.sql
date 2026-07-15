-- =====================================================================
--  20260715180000  codex_security_hardening
--  Oprava bezpečnostních nálezů nezávislé revize (Codex) nad Otínskou
--  (kola 1–4). Vše ADITIVNÍ, nic se nemaže z dat. Hráze drží i proti
--  přímému volání Supabase REST/Storage API, ne jen v UI.
--
--  H1  veřejné čtení sekcí   → jen enabled=true A published (ne jen published)
--  H2  veřejné dokumenty     → navíc jen když je sekce `documents` zapnutá
--  H3  veřejné media         → jen přes registrovaný řádek zapnuté sekce published
--  H4  media registrace+limit→ tabulka presentation_media + RPC sync_… (limit v DB)
--  M1  integrita sekcí       → unikátní index na singletony + trigger whitelistu typů
--  M2  bucket limity          → znovu vynuceny allowed_mime_types + file_size_limit (oba)
--
--  Idempotentní: drop policy if exists/create, create table/index if not exists,
--  create or replace function, rizikové kroky (unikátní index, storage.*) v
--  ochranném bloku. Stejný obsah je i v APLIKUJ_VSE.sql (Karel pouští ten).
-- =====================================================================

create extension if not exists pgcrypto;

-- =====================================================================
-- H1) SEKCE — veřejně jen ZAPNUTÉ sekce publikované prezentace
--     Vlastník má dál `sections owner all` (vidí i vypnuté). Anon/cizí ale
--     nesmí přes API číst content vypnutých sekcí.
-- =====================================================================
drop policy if exists "sections public read published" on public.presentation_sections;
create policy "sections public read published" on public.presentation_sections
  for select
  using (
    enabled = true
    and exists (
      select 1 from public.presentations p
      where p.id = presentation_id and p.status = 'published'
    )
  );

-- =====================================================================
-- H2) DOKUMENTY — veřejně jen když je sekce `documents` ZAPNUTÁ
--     (DB řádek i Storage objekt). Vlastník beze změny.
-- =====================================================================
drop policy if exists "documents public read published" on public.presentation_documents;
create policy "documents public read published" on public.presentation_documents
  for select
  using (
    exists (
      select 1 from public.presentations p
      where p.id = presentation_id and p.status = 'published'
    )
    and exists (
      select 1 from public.presentation_sections s
      where s.presentation_id = presentation_documents.presentation_id
        and s.kind = 'documents'
        and s.enabled = true
    )
  );

-- =====================================================================
-- H3+H4) MEDIA — registrace do DB + veřejné čtení přes ni + limit v DB
-- =====================================================================

-- Tabulka: jeden řádek = jeden registrovaný obrázek sekce (analytické mapy,
-- panorama, půdorysy). Soubor bydlí v bucketu presentation-media; tady je jen
-- cesta + vazba na sekci. Vazba na sekci (on delete cascade) → smazání/odebrání
-- sekce vezme registraci s sebou a obrázek přestane být veřejný.
create table if not exists public.presentation_media (
  id              uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references public.presentations (id) on delete cascade,
  section_id      uuid not null references public.presentation_sections (id) on delete cascade,
  storage_path    text not null,
  created_at      timestamptz not null default now()
);
comment on table public.presentation_media is
  'Registrace obrázků sekcí (mapy, panorama, půdorysy). Veřejné čtení objektu v bucketu presentation-media stojí na EXISTENCI tohoto řádku u ZAPNUTÉ sekce PUBLISHED prezentace (H3/H4).';

create index if not exists presentation_media_presentation_idx
  on public.presentation_media (presentation_id);
create index if not exists presentation_media_section_idx
  on public.presentation_media (section_id);

-- jeden soubor = nejvýš jeden registrační řádek
do $$
begin
  create unique index if not exists presentation_media_storage_path_key
    on public.presentation_media (storage_path);
exception when unique_violation then
  raise notice 'INDEX presentation_media_storage_path_key neprošel: dva řádky míří na stejný soubor. Data jsem nechal být.';
end $$;

alter table public.presentation_media enable row level security;

drop policy if exists "media rows owner all" on public.presentation_media;
create policy "media rows owner all" on public.presentation_media
  for all
  using (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.owner_id = auth.uid()));

-- Veřejné čtení řádku (potřebuje ho i Storage policy níž): jen když patří
-- ZAPNUTÉ sekci PUBLISHED prezentace.
drop policy if exists "media rows public read" on public.presentation_media;
create policy "media rows public read" on public.presentation_media
  for select
  using (exists (
    select 1
    from public.presentation_sections s
    join public.presentations p on p.id = s.presentation_id
    where s.id = section_id
      and s.enabled = true
      and p.status = 'published'
  ));

-- RPC: sesynchronizuj registrované obrázky JEDNÉ sekce s cestami v jejím obsahu.
-- Volá ji server action saveSection po uložení sekce s obrázky. Vynucuje:
--   - vlastnictví (sekce patří prezentaci a ta uživateli),
--   - tvar cesty (<uid>/<presentation_id>/<uuid>.jpg|png|webp),
--   - LIMIT na prezentaci (v DB, ne jen v UI),
--   - odregistruje obrázky, které z obsahu zmizely (žádní sirotci v tabulce).
-- SECURITY INVOKER → platí RLS volajícího; vícekrok pod pg_advisory_xact_lock.
create or replace function public.sync_presentation_media(
  p_presentation_id uuid,
  p_section_id uuid,
  p_paths text[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uuid   constant text := '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
  v_limit  constant integer := 1000;  -- hard cap; praktický strop drží slicy v UI (viz lib/media.ts)
  v_paths  text[] := coalesce(p_paths, '{}');
  v_other  integer;
  v_new    integer;
  v_path   text;
begin
  if auth.uid() is null then
    raise exception 'MEDIA_NOT_OWNER' using errcode = 'check_violation';
  end if;

  -- Sekce musí patřit dané prezentaci a ta přihlášenému vlastníkovi.
  if not exists (
    select 1
    from public.presentation_sections s
    join public.presentations p on p.id = s.presentation_id
    where s.id = p_section_id
      and s.presentation_id = p_presentation_id
      and p.owner_id = auth.uid()
  ) then
    raise exception 'MEDIA_NOT_OWNER' using errcode = 'check_violation';
  end if;

  perform pg_advisory_xact_lock(hashtext('media:' || p_presentation_id::text));

  -- Očisti vstup: jen neprázdné a unikátní cesty (žádné NULL/prázdno → přesný delete i limit).
  v_paths := array(select distinct t from unnest(v_paths) as t where t is not null and t <> '');

  -- Limit na prezentaci: řádky JINÝCH sekcí + počet nových.
  select count(*) into v_other
    from public.presentation_media
   where presentation_id = p_presentation_id
     and section_id <> p_section_id;

  v_new := coalesce(array_length(v_paths, 1), 0);

  if v_other + v_new > v_limit then
    raise exception 'MEDIA_LIMIT' using errcode = 'check_violation';
  end if;

  -- Odregistruj obrázky této sekce, které v obsahu už nejsou.
  delete from public.presentation_media
   where section_id = p_section_id
     and not (storage_path = any (v_paths));

  -- Zaregistruj cesty z obsahu (ověř tvar; přiřaď k této sekci).
  foreach v_path in array v_paths loop
    if v_path !~* ('^' || auth.uid()::text || '/' || p_presentation_id::text
        || '/' || v_uuid || '\.(jpg|png|webp)$') then
      raise exception 'MEDIA_BAD_PATH' using errcode = 'check_violation';
    end if;
    insert into public.presentation_media (presentation_id, section_id, storage_path)
    values (p_presentation_id, p_section_id, v_path)
    on conflict (storage_path) do update set section_id = excluded.section_id;
  end loop;
end;
$$;

-- BACKFILL: zaregistruj obrázky, které už bydlí v obsahu sekcí (aby se po
-- nasazení nerozbily existující publikované prezentace). Idempotentní přes
-- on conflict do nothing. Kdyby něco minulo, majitel to dorovná uložením sekce.
insert into public.presentation_media (presentation_id, section_id, storage_path)
select s.presentation_id, s.id, s.content->>'image_path'
from public.presentation_sections s
where s.kind = 'panorama'
  and coalesce(s.content->>'image_path', '') <> ''
on conflict (storage_path) do nothing;

insert into public.presentation_media (presentation_id, section_id, storage_path)
select s.presentation_id, s.id, item->>'image_path'
from public.presentation_sections s
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(s.content->'items') = 'array' then s.content->'items' else '[]'::jsonb end
) as item
where s.kind = 'analyticMaps'
  and coalesce(item->>'image_path', '') <> ''
on conflict (storage_path) do nothing;

insert into public.presentation_media (presentation_id, section_id, storage_path)
select s.presentation_id, s.id, fl->>'image_path'
from public.presentation_sections s
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(s.content->'floors') = 'array' then s.content->'floors' else '[]'::jsonb end
) as fl
where s.kind = 'floorplans'
  and coalesce(fl->>'image_path', '') <> ''
on conflict (storage_path) do nothing;

insert into public.presentation_media (presentation_id, section_id, storage_path)
select s.presentation_id, s.id, room->>'image_path'
from public.presentation_sections s
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(s.content->'floors') = 'array' then s.content->'floors' else '[]'::jsonb end
) as fl
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(fl->'rooms') = 'array' then fl->'rooms' else '[]'::jsonb end
) as room
where s.kind = 'floorplans'
  and coalesce(room->>'image_path', '') <> ''
on conflict (storage_path) do nothing;

-- =====================================================================
-- M1) INTEGRITA SEKCÍ V DB — nejen v RPC
--     (1) unikátní index na singleton typy: dvě hero/gallery/… atomicky nejdou
--     (2) trigger whitelistu: přímý insert cizího/nedodělaného typu (chatbot…) se odmítne
-- =====================================================================
do $$
begin
  create unique index if not exists presentation_sections_singleton_key
    on public.presentation_sections (presentation_id, kind)
    where kind in (
      'hero','parameters','contact','map','gallery','documents',
      'floorplans','analyticMaps','poi','panorama','socialProof','news',
      'video','investmentCalc','chatbot'
    );
exception when unique_violation then
  raise notice 'INDEX presentation_sections_singleton_key neprošel: prezentace má duplicitní singleton sekci. Data jsem nechal být — přebytek smaž ručně a spusť znovu.';
end $$;

-- Whitelist povolených typů PŘI ZÁPISU (= „ready" typy jako v add_presentation_section).
-- ⚠ SYNC: tenhle seznam musí odpovídat whitelistu v add_presentation_section
-- a `ready:true` sadě v lib/presentations/sections.ts.
create or replace function public.guard_presentation_section_kind()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.kind not in (
    'hero','text','parameters','gallery','map','benefits',
    'documents','valuation','technicalCondition','contact',
    'floorplans','analyticMaps','poi','panorama','socialProof','news',
    'video','investmentCalc'
  ) then
    raise exception 'SECTION_KIND_NOT_ALLOWED' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists presentation_sections_guard_kind on public.presentation_sections;
create trigger presentation_sections_guard_kind
  before insert or update of kind on public.presentation_sections
  for each row execute function public.guard_presentation_section_kind();

-- =====================================================================
-- M2) BUCKETY — znovu vynuť limity (allowed_mime_types + file_size_limit)
--     pro OBA buckety. Hlavní serverová hráz proti podvrženému obsahu.
--     (Buckety už zakládají dřívější migrace; tady jen jistota, že limity sedí.)
-- =====================================================================
do $$
begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('presentation-documents', 'presentation-documents', false, 20971520,
          array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do update
    set public = false,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('presentation-media', 'presentation-media', false, 15728640,
          array['image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do update
    set public = false,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;
exception when insufficient_privilege or undefined_table then
  raise notice 'BUCKETY: limity nešly nastavit (chybí práva na storage.*) — srovnej je ručně v dashboardu.';
end $$;

-- =====================================================================
-- H2 + H3) STORAGE POLICIES — dokumenty a media veřejně jen přes DB vazbu
-- =====================================================================
do $$
begin
  -- Dokumenty: veřejně jen soubor patřící published prezentaci, jejíž sekce
  -- `documents` je ZAPNUTÁ (H2).
  execute $p$drop policy if exists "documents public read published" on storage.objects$p$;
  execute $p$
    create policy "documents public read published" on storage.objects
      for select to anon, authenticated
      using (
        bucket_id = 'presentation-documents'
        and exists (
          select 1
          from public.presentation_documents d
          join public.presentations p on p.id = d.presentation_id
          where d.storage_path = name
            and p.status = 'published'
            and (storage.foldername(name))[1] = p.owner_id::text
            and exists (
              select 1 from public.presentation_sections s
              where s.presentation_id = d.presentation_id
                and s.kind = 'documents'
                and s.enabled = true
            )
        )
      )
  $p$;

  -- Media: veřejně jen soubor s REGISTROVANÝM řádkem (presentation_media)
  -- patřícím ZAPNUTÉ sekci PUBLISHED prezentace (H3). Ne jen podle cesty.
  execute $p$drop policy if exists "media public read published" on storage.objects$p$;
  execute $p$
    create policy "media public read published" on storage.objects
      for select to anon, authenticated
      using (
        bucket_id = 'presentation-media'
        and exists (
          select 1
          from public.presentation_media m
          join public.presentation_sections s on s.id = m.section_id
          join public.presentations p on p.id = m.presentation_id
          where m.storage_path = name
            and s.enabled = true
            and p.status = 'published'
            and (storage.foldername(name))[1] = p.owner_id::text
        )
      )
  $p$;
exception when insufficient_privilege or undefined_table then
  raise notice 'POLITIKY STORAGE (dokumenty/media) nešly přehrát (chybí práva) — naklikej je ručně dle app/supabase/APLIKUJ_VSE.sql.';
end $$;
