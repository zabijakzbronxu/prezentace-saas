-- =====================================================================
--  20260715120000  otinska_sections
--  Přestavba prezentace na STAVEBNICI SEKCÍ (páteř Otínské).
--
--  Co přidává (vše ADITIVNÍ — nic nemaže, nemění chování starých sloupců):
--    - presentation_sections .......... páteř: pořadí, zapnutí, typ, JSON obsah
--    - presentations .................. chybějící pole nemovitosti (GPS, rok…)
--    - presentation_photos ............ popisky fotek + kategorie + vazba na místnost
--    - presentation_documents ......... dokumenty ke stažení (vlastní tabulka + bucket)
--    - presentation_floors/rooms ...... model půdorysů (render až v Kole 2)
--    - presentation_maps/places/panoramas  model map/POI/panoramat (Kolo 3)
--    - RLS na všech nových tabulkách (owner přes vazbu; veřejně jen published)
--    - RPC funkce pro řazení/zapínání sekcí a pro dokumenty (pod zámkem)
--    - backfill: každé prezentaci bez sekcí založí výchozí sadu
--    - limit fotek 20 → 60
--    - bucket `presentation-documents` (privátní) + policies
--
--  Idempotentní: `create table/column if not exists`, guard přes pg_constraint,
--  `drop policy if exists`, rizikové kroky (storage) v ochranném bloku.
--  Stejný obsah je i v APLIKUJ_VSE.sql (Karel pouští ten).
-- =====================================================================

create extension if not exists pgcrypto;

-- =====================================================================
-- 1) PÁTEŘ — presentation_sections
-- =====================================================================
create table if not exists public.presentation_sections (
  id              uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references public.presentations (id) on delete cascade,
  kind            text not null,
  position        integer not null default 0,
  enabled         boolean not null default true,
  content         jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint presentation_sections_kind_ck check (kind in (
    'hero','text','parameters','gallery','map','benefits','documents','valuation',
    'technicalCondition','contact','video','floorplans','analyticMaps','poi',
    'panorama','socialProof','news','investmentCalc','chatbot'
  ))
);

comment on table public.presentation_sections is
  'Sekce prezentace (stavebnice). Jeden řádek = jedna sekce: typ (kind), pořadí (position), zapnuto (enabled) a malý JSON obsah (content).';

create index if not exists presentation_sections_presentation_idx
  on public.presentation_sections (presentation_id);
create index if not exists presentation_sections_order_idx
  on public.presentation_sections (presentation_id, position);

drop trigger if exists presentation_sections_set_updated_at on public.presentation_sections;
create trigger presentation_sections_set_updated_at
  before update on public.presentation_sections
  for each row execute function public.set_updated_at();

-- =====================================================================
-- 2) PRESENTATIONS — chybějící pole nemovitosti
-- =====================================================================
alter table public.presentations
  add column if not exists subtitle            text,       -- podnadpis přes hero
  add column if not exists year_built          integer,    -- rok stavby / kolaudace
  add column if not exists floors              smallint,   -- počet podlaží
  add column if not exists built_area_m2       numeric(10,2), -- zastavěná plocha (footprint)
  add column if not exists building_dimensions text,       -- „9,5 × 9,5 m"
  add column if not exists condition           text,       -- stav („velmi dobrý")
  add column if not exists ownership           text,       -- vlastnictví („osobní")
  add column if not exists monthly_costs_czk   integer,    -- provozní náklady / měsíc
  add column if not exists lat                 numeric(9,6), -- GPS
  add column if not exists lng                 numeric(9,6),
  add column if not exists target_persona      jsonb;      -- skrytá persona kupce

comment on column public.presentations.built_area_m2 is 'Zastavěná plocha v m² (footprint).';
comment on column public.presentations.lat is 'Zeměpisná šířka pinu na mapě.';
comment on column public.presentations.lng is 'Zeměpisná délka pinu na mapě.';

-- CHECK omezení nových polí (NOT VALID: hlídá nová/měněná data, stará neshodí).
do $$
begin
  if not exists (select 1 from pg_constraint
    where conname = 'presentations_year_built_valid'
      and conrelid = 'public.presentations'::regclass) then
    alter table public.presentations add constraint presentations_year_built_valid
      check (year_built is null or (year_built between 1500 and 2100)) not valid;
  end if;

  if not exists (select 1 from pg_constraint
    where conname = 'presentations_floors_valid'
      and conrelid = 'public.presentations'::regclass) then
    alter table public.presentations add constraint presentations_floors_valid
      check (floors is null or (floors between 0 and 300)) not valid;
  end if;

  if not exists (select 1 from pg_constraint
    where conname = 'presentations_built_area_nonneg'
      and conrelid = 'public.presentations'::regclass) then
    alter table public.presentations add constraint presentations_built_area_nonneg
      check (built_area_m2 is null or (built_area_m2 >= 0 and built_area_m2 <= 1000000)) not valid;
  end if;

  if not exists (select 1 from pg_constraint
    where conname = 'presentations_monthly_costs_nonneg'
      and conrelid = 'public.presentations'::regclass) then
    alter table public.presentations add constraint presentations_monthly_costs_nonneg
      check (monthly_costs_czk is null or (monthly_costs_czk >= 0 and monthly_costs_czk <= 1000000000)) not valid;
  end if;

  if not exists (select 1 from pg_constraint
    where conname = 'presentations_lat_valid'
      and conrelid = 'public.presentations'::regclass) then
    alter table public.presentations add constraint presentations_lat_valid
      check (lat is null or (lat between -90 and 90)) not valid;
  end if;

  if not exists (select 1 from pg_constraint
    where conname = 'presentations_lng_valid'
      and conrelid = 'public.presentations'::regclass) then
    alter table public.presentations add constraint presentations_lng_valid
      check (lng is null or (lng between -180 and 180)) not valid;
  end if;

  if not exists (select 1 from pg_constraint
    where conname = 'presentations_extra_text_lengths'
      and conrelid = 'public.presentations'::regclass) then
    alter table public.presentations add constraint presentations_extra_text_lengths
      check (
        (subtitle            is null or char_length(subtitle)            <= 300) and
        (building_dimensions is null or char_length(building_dimensions) <= 60)  and
        (condition           is null or char_length(condition)           <= 60)  and
        (ownership           is null or char_length(ownership)           <= 60)
      ) not valid;
  end if;
end $$;

-- =====================================================================
-- 3) BUDOUCÍ MODEL — půdorysy (render Kolo 2)
--    Vytvořeno teď, ať jsou další kola jen UI. Musí být PŘED presentation_photos
--    (kvůli cizímu klíči room_id).
-- =====================================================================
create table if not exists public.presentation_floors (
  id              uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references public.presentations (id) on delete cascade,
  label           text not null,
  floorplan_path  text,
  plan_data       jsonb,
  scale           jsonb,
  image_view      jsonb,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists presentation_floors_presentation_idx
  on public.presentation_floors (presentation_id);

create table if not exists public.presentation_rooms (
  id         uuid primary key default gen_random_uuid(),
  floor_id   uuid not null references public.presentation_floors (id) on delete cascade,
  name       text not null,
  area_m2    numeric(6,2),
  color      text,
  polygon    jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists presentation_rooms_floor_idx
  on public.presentation_rooms (floor_id);

-- =====================================================================
-- 4) PRESENTATION_PHOTOS — popisky, kategorie, vazba na místnost
-- =====================================================================
alter table public.presentation_photos
  add column if not exists caption  text,   -- prodejní popisek (alt_text zůstává technický)
  add column if not exists category text,   -- exterier | interier | zahrada | okoli
  add column if not exists room_id  uuid references public.presentation_rooms (id) on delete set null;

do $$
begin
  if not exists (select 1 from pg_constraint
    where conname = 'presentation_photos_caption_len'
      and conrelid = 'public.presentation_photos'::regclass) then
    alter table public.presentation_photos add constraint presentation_photos_caption_len
      check (
        (caption  is null or char_length(caption)  <= 300) and
        (category is null or char_length(category) <= 40)
      ) not valid;
  end if;
end $$;

-- =====================================================================
-- 5) DOKUMENTY KE STAŽENÍ — vlastní tabulka (soubory = vlastní identita)
-- =====================================================================
create table if not exists public.presentation_documents (
  id              uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references public.presentations (id) on delete cascade,
  name            text not null,
  category        text,
  description     text,
  storage_path    text not null,
  file_type       text,
  file_size_bytes bigint,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);
comment on table public.presentation_documents is
  'Soubory ke stažení k prezentaci (PENB, půdorys, PDF…). Soubor bydlí ve Storage bucketu presentation-documents, tady je jen cesta.';
create index if not exists presentation_documents_presentation_idx
  on public.presentation_documents (presentation_id);

-- jeden soubor = nejvýš jeden záznam
do $$
begin
  create unique index if not exists presentation_documents_storage_path_key
    on public.presentation_documents (storage_path);
exception when unique_violation then
  raise notice 'INDEX presentation_documents_storage_path_key neprošel: dva záznamy míří na stejný soubor. Data jsem nechal být.';
end $$;

-- =====================================================================
-- 6) BUDOUCÍ MODEL — mapy, POI, panoramata (render Kolo 3)
-- =====================================================================
create table if not exists public.presentation_maps (
  id              uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references public.presentations (id) on delete cascade,
  title           text,
  caption         text,
  storage_path    text,
  map_group       text,
  marker          jsonb,
  zoom            numeric,
  offset_xy       jsonb,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists presentation_maps_presentation_idx
  on public.presentation_maps (presentation_id);

create table if not exists public.presentation_places (
  id              uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references public.presentations (id) on delete cascade,
  name            text not null,
  place_type      text,
  place_id        text,
  gps             jsonb,
  rating          numeric,
  review_count    integer,
  image           text,
  distance        text,
  description     text,
  super_category  text,
  reviews         jsonb not null default '[]'::jsonb,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists presentation_places_presentation_idx
  on public.presentation_places (presentation_id);

create table if not exists public.presentation_panoramas (
  id              uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references public.presentations (id) on delete cascade,
  storage_path    text,
  config          jsonb,
  hotspots        jsonb not null default '[]'::jsonb,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists presentation_panoramas_presentation_idx
  on public.presentation_panoramas (presentation_id);

-- =====================================================================
-- 7) ŘÁDKOVÁ BEZPEČNOST (RLS) — nové tabulky
--    Vzor beze změny oproti presentation_photos:
--      owner (přes vazbu na prezentaci) smí vše; veřejně čte jen published.
-- =====================================================================
alter table public.presentation_sections  enable row level security;
alter table public.presentation_documents enable row level security;
alter table public.presentation_floors    enable row level security;
alter table public.presentation_rooms     enable row level security;
alter table public.presentation_maps      enable row level security;
alter table public.presentation_places    enable row level security;
alter table public.presentation_panoramas enable row level security;

-- presentation_sections
drop policy if exists "sections owner all" on public.presentation_sections;
create policy "sections owner all" on public.presentation_sections
  for all
  using (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.owner_id = auth.uid()));
drop policy if exists "sections public read published" on public.presentation_sections;
create policy "sections public read published" on public.presentation_sections
  for select
  using (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.status = 'published'));

-- presentation_documents
drop policy if exists "documents owner all" on public.presentation_documents;
create policy "documents owner all" on public.presentation_documents
  for all
  using (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.owner_id = auth.uid()));
drop policy if exists "documents public read published" on public.presentation_documents;
create policy "documents public read published" on public.presentation_documents
  for select
  using (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.status = 'published'));

-- presentation_floors
drop policy if exists "floors owner all" on public.presentation_floors;
create policy "floors owner all" on public.presentation_floors
  for all
  using (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.owner_id = auth.uid()));
drop policy if exists "floors public read published" on public.presentation_floors;
create policy "floors public read published" on public.presentation_floors
  for select
  using (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.status = 'published'));

-- presentation_rooms (přes floors na prezentaci — dvojitý join)
drop policy if exists "rooms owner all" on public.presentation_rooms;
create policy "rooms owner all" on public.presentation_rooms
  for all
  using (exists (select 1 from public.presentation_floors f
                 join public.presentations p on p.id = f.presentation_id
                 where f.id = floor_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.presentation_floors f
                 join public.presentations p on p.id = f.presentation_id
                 where f.id = floor_id and p.owner_id = auth.uid()));
drop policy if exists "rooms public read published" on public.presentation_rooms;
create policy "rooms public read published" on public.presentation_rooms
  for select
  using (exists (select 1 from public.presentation_floors f
                 join public.presentations p on p.id = f.presentation_id
                 where f.id = floor_id and p.status = 'published'));

-- presentation_maps
drop policy if exists "maps owner all" on public.presentation_maps;
create policy "maps owner all" on public.presentation_maps
  for all
  using (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.owner_id = auth.uid()));
drop policy if exists "maps public read published" on public.presentation_maps;
create policy "maps public read published" on public.presentation_maps
  for select
  using (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.status = 'published'));

-- presentation_places
drop policy if exists "places owner all" on public.presentation_places;
create policy "places owner all" on public.presentation_places
  for all
  using (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.owner_id = auth.uid()));
drop policy if exists "places public read published" on public.presentation_places;
create policy "places public read published" on public.presentation_places
  for select
  using (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.status = 'published'));

-- presentation_panoramas
drop policy if exists "panoramas owner all" on public.presentation_panoramas;
create policy "panoramas owner all" on public.presentation_panoramas
  for all
  using (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.owner_id = auth.uid()));
drop policy if exists "panoramas public read published" on public.presentation_panoramas;
create policy "panoramas public read published" on public.presentation_panoramas
  for select
  using (exists (select 1 from public.presentations p
                 where p.id = presentation_id and p.status = 'published'));

-- =====================================================================
-- 8) RPC FUNKCE — řazení a zapínání sekcí
--    SECURITY INVOKER (platí RLS volajícího), vícekrokové zápisy pod
--    pg_advisory_xact_lock (dvě záložky nevyrobí duplicitní pořadí).
--    Chyby přes errcode → aplikace je přeloží na pevnou českou hlášku.
-- =====================================================================

-- Přidá sekci na konec. Ověří, že typ smíme přidat (jen „ready" typy) a
-- singleton pravidlo. Vrací id nové sekce.
create or replace function public.add_presentation_section(
  p_presentation_id uuid,
  p_kind text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_singleton boolean;
begin
  if p_kind not in (
    'hero','text','parameters','gallery','map','benefits',
    'documents','valuation','technicalCondition','contact'
  ) then
    raise exception 'SECTION_KIND_NOT_ALLOWED' using errcode = 'check_violation';
  end if;

  perform pg_advisory_xact_lock(hashtext('sections:' || p_presentation_id::text));

  v_singleton := p_kind in ('hero','parameters','contact','map','gallery','documents');
  if v_singleton and exists (
    select 1 from public.presentation_sections
    where presentation_id = p_presentation_id and kind = p_kind
  ) then
    raise exception 'SECTION_SINGLETON' using errcode = 'check_violation';
  end if;

  insert into public.presentation_sections (presentation_id, kind, position, enabled, content)
  values (
    p_presentation_id,
    p_kind,
    coalesce((select max(position) + 1 from public.presentation_sections
              where presentation_id = p_presentation_id), 0),
    true,
    '{}'::jsonb
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Posune sekci nahoru/dolů (prohodí position se sousedem). Na kraji nic nedělá.
create or replace function public.move_presentation_section(
  p_section_id uuid,
  p_direction text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_presentation uuid;
  v_pos integer;
  v_neighbor uuid;
  v_neighbor_pos integer;
begin
  if p_direction not in ('up', 'down') then
    raise exception 'SECTION_BAD_DIRECTION' using errcode = 'check_violation';
  end if;

  select presentation_id, position into v_presentation, v_pos
    from public.presentation_sections where id = p_section_id;
  if v_presentation is null then
    raise exception 'SECTION_NOT_FOUND' using errcode = 'check_violation';
  end if;

  perform pg_advisory_xact_lock(hashtext('sections:' || v_presentation::text));

  -- pod zámkem znovu přečti pozici (mezitím se mohla změnit)
  select position into v_pos
    from public.presentation_sections where id = p_section_id;

  if p_direction = 'up' then
    select id, position into v_neighbor, v_neighbor_pos
      from public.presentation_sections
     where presentation_id = v_presentation and position < v_pos
     order by position desc limit 1;
  else
    select id, position into v_neighbor, v_neighbor_pos
      from public.presentation_sections
     where presentation_id = v_presentation and position > v_pos
     order by position asc limit 1;
  end if;

  -- na kraji seznamu není s čím prohodit — v pořádku, jen se nic nestane
  if v_neighbor is null then
    return;
  end if;

  update public.presentation_sections set position = -1            where id = p_section_id;
  update public.presentation_sections set position = v_pos         where id = v_neighbor;
  update public.presentation_sections set position = v_neighbor_pos where id = p_section_id;
end;
$$;

-- Zapne/vypne sekci.
create or replace function public.set_presentation_section_enabled(
  p_section_id uuid,
  p_enabled boolean
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_presentation uuid;
begin
  select presentation_id into v_presentation
    from public.presentation_sections where id = p_section_id;
  if v_presentation is null then
    raise exception 'SECTION_NOT_FOUND' using errcode = 'check_violation';
  end if;

  perform pg_advisory_xact_lock(hashtext('sections:' || v_presentation::text));
  update public.presentation_sections set enabled = p_enabled where id = p_section_id;
end;
$$;

-- Smaže sekci.
create or replace function public.delete_presentation_section(p_section_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_presentation uuid;
begin
  select presentation_id into v_presentation
    from public.presentation_sections where id = p_section_id;
  if v_presentation is null then
    return; -- už neexistuje → nic k dělání
  end if;

  perform pg_advisory_xact_lock(hashtext('sections:' || v_presentation::text));
  delete from public.presentation_sections where id = p_section_id;
end;
$$;

-- Nastaví celé pořadí naráz (příprava na drag & drop). Přeřadí jen sekce,
-- které patří dané prezentaci; ostatní ID v poli ignoruje.
create or replace function public.reorder_presentation_sections(
  p_presentation_id uuid,
  p_ordered_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_pos integer := 0;
begin
  perform pg_advisory_xact_lock(hashtext('sections:' || p_presentation_id::text));
  foreach v_id in array p_ordered_ids loop
    update public.presentation_sections
       set position = v_pos
     where id = v_id and presentation_id = p_presentation_id;
    v_pos := v_pos + 1;
  end loop;
end;
$$;

-- =====================================================================
-- 9) RPC FUNKCE — dokumenty (stejný vzor jako fotky)
-- =====================================================================
create or replace function public.register_presentation_document(
  p_presentation_id uuid,
  p_storage_path text,
  p_name text,
  p_category text,
  p_description text,
  p_file_type text,
  p_file_size bigint
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_count integer;
begin
  -- Tvar cesty: <auth.uid()>/<prezentace>/<uuid>.(pdf|jpg|png|webp)
  if auth.uid() is null
     or p_storage_path !~* ('^' || auth.uid()::text || '/' || p_presentation_id::text
        || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg|png|webp)$') then
    raise exception 'DOCUMENT_BAD_PATH' using errcode = 'check_violation';
  end if;
  if p_name is null or char_length(btrim(p_name)) = 0 then
    raise exception 'DOCUMENT_NO_NAME' using errcode = 'check_violation';
  end if;

  perform pg_advisory_xact_lock(hashtext('documents:' || p_presentation_id::text));

  select count(*) into v_count
    from public.presentation_documents where presentation_id = p_presentation_id;
  if v_count >= 30 then
    raise exception 'DOCUMENT_LIMIT' using errcode = 'check_violation';
  end if;

  insert into public.presentation_documents
    (presentation_id, name, category, description, storage_path, file_type, file_size_bytes, sort_order)
  values (
    p_presentation_id, left(btrim(p_name), 200), p_category, p_description,
    p_storage_path, p_file_type, p_file_size,
    coalesce((select max(sort_order) + 1 from public.presentation_documents
              where presentation_id = p_presentation_id), 0)
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.delete_presentation_document(p_document_id uuid)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_presentation uuid;
  v_path text;
begin
  select presentation_id, storage_path into v_presentation, v_path
    from public.presentation_documents where id = p_document_id;
  if v_presentation is null then
    return null;
  end if;

  perform pg_advisory_xact_lock(hashtext('documents:' || v_presentation::text));
  delete from public.presentation_documents where id = p_document_id;
  return v_path;
end;
$$;

create or replace function public.swap_document_order(
  p_doc_a uuid,
  p_doc_b uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_presentation uuid;
  v_order_a integer;
  v_order_b integer;
begin
  select presentation_id into v_presentation
    from public.presentation_documents where id = p_doc_a;
  if v_presentation is null then
    raise exception 'DOCUMENT_NOT_FOUND' using errcode = 'check_violation';
  end if;

  perform pg_advisory_xact_lock(hashtext('documents:' || v_presentation::text));

  select sort_order into v_order_a
    from public.presentation_documents where id = p_doc_a;
  select sort_order into v_order_b
    from public.presentation_documents
   where id = p_doc_b and presentation_id = v_presentation;
  if v_order_a is null or v_order_b is null then
    raise exception 'DOCUMENT_NOT_FOUND' using errcode = 'check_violation';
  end if;

  update public.presentation_documents set sort_order = -1        where id = p_doc_a;
  update public.presentation_documents set sort_order = v_order_a where id = p_doc_b;
  update public.presentation_documents set sort_order = v_order_b where id = p_doc_a;
end;
$$;

-- =====================================================================
-- 10) LIMIT FOTEK 20 → 60  (přepis register_presentation_photo)
--     Beze změny tvaru cesty a hero logiky — jen zvednutý strop.
-- =====================================================================
create or replace function public.register_presentation_photo(
  p_presentation_id uuid,
  p_storage_path text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_count integer;
  v_has_hero boolean;
begin
  if auth.uid() is null
     or p_storage_path !~* ('^' || auth.uid()::text || '/' || p_presentation_id::text
        || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$') then
    raise exception 'PHOTO_BAD_PATH' using errcode = 'check_violation';
  end if;

  perform pg_advisory_xact_lock(hashtext('photos:' || p_presentation_id::text));

  select count(*), coalesce(bool_or(is_hero), false)
    into v_count, v_has_hero
    from public.presentation_photos
   where presentation_id = p_presentation_id;

  if v_count >= 60 then
    raise exception 'PHOTO_LIMIT' using errcode = 'check_violation';
  end if;

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

-- =====================================================================
-- 11) BACKFILL — každé prezentaci bez sekcí založ výchozí sadu
--     Pořadí: hero, gallery, text(příběh), text(lokalita), text(přednosti),
--     parameters, contact. Idempotentní (jen když prezentace nemá žádnou sekci).
--     Staré sloupce se NEMAŽOU — textové sekce jen odkazují na sloupec (source),
--     tělo textu se dál edituje v kroku Texty (žádná duplicita dat).
-- =====================================================================
insert into public.presentation_sections (presentation_id, kind, position, enabled, content)
select p.id, seed.kind, seed.position, true, seed.content
from public.presentations p
cross join (values
  (0, 'hero',       '{}'::jsonb),
  (1, 'gallery',    '{"heading":"Galerie"}'::jsonb),
  (2, 'text',       '{"heading":"Příběh nemovitosti","source":"description"}'::jsonb),
  (3, 'text',       '{"heading":"Lokalita a okolí","source":"location_text"}'::jsonb),
  (4, 'text',       '{"heading":"Vybavení a přednosti","source":"features_text"}'::jsonb),
  (5, 'parameters', '{}'::jsonb),
  (6, 'contact',    '{}'::jsonb)
) as seed(position, kind, content)
where not exists (
  select 1 from public.presentation_sections s where s.presentation_id = p.id
);

-- =====================================================================
-- 12) STORAGE — bucket pro dokumenty (privátní) + policies
--     Bezpečnostní hranice patří do SQL (lesson 2026-07-13), ne jen do UI.
--     Když projekt nedovolí sahat na storage.* z SQL Editoru, blok NESPADNE —
--     jen se v kontrole objeví ❌ a Karel bucket založí ručně.
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
exception when insufficient_privilege or undefined_table then
  raise notice 'BUCKET presentation-documents přeskočen (chybí práva na storage.*) — založ ho ručně.';
end $$;

do $$
begin
  execute $p$drop policy if exists "documents owner upload" on storage.objects$p$;
  execute $p$
    create policy "documents owner upload" on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'presentation-documents'
        and (storage.foldername(name))[1] = auth.uid()::text
        and array_length(storage.foldername(name), 1) = 2
        and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and name ~* '\.(pdf|jpg|png|webp)$'
        and exists (
          select 1 from public.presentations p
          where p.id = ((storage.foldername(name))[2])::uuid
            and p.owner_id = auth.uid()
        )
      )
  $p$;

  execute $p$drop policy if exists "documents owner read" on storage.objects$p$;
  execute $p$
    create policy "documents owner read" on storage.objects
      for select to authenticated
      using (
        bucket_id = 'presentation-documents'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
  $p$;

  execute $p$drop policy if exists "documents owner delete" on storage.objects$p$;
  execute $p$
    create policy "documents owner delete" on storage.objects
      for delete to authenticated
      using (
        bucket_id = 'presentation-documents'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
  $p$;

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
        )
      )
  $p$;
exception when insufficient_privilege or undefined_table then
  raise notice 'POLITIKY STORAGE pro dokumenty přeskočeny (chybí práva) — naklikej je ručně.';
end $$;
