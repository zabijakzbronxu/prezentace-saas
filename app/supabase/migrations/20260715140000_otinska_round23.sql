-- =====================================================================
--  20260715140000  otinska_round23
--  Kolo 2 (půdorysy) + Kolo 3 (analytické mapy, POI, reference, novinky,
--  panorama). Obsah sekcí bydlí v JSONB (jako v kole 1); obrázky (plány pater,
--  fotky místností, mapy, panorama) jdou do JEDNOHO privátního bucketu
--  `presentation-media`. Žádné nové tabulky — jen bucket + rozšíření whitelistu
--  ve funkci add_presentation_section o nově odemčené typy.
--
--  Idempotentní. Stejný obsah je i v APLIKUJ_VSE.sql (Karel pouští ten).
-- =====================================================================

-- 1) Rozšíření povolených a singleton typů v add_presentation_section
--    (odemyká floorplans, analyticMaps, poi, panorama, socialProof, news).
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
    'documents','valuation','technicalCondition','contact',
    'floorplans','analyticMaps','poi','panorama','socialProof','news'
  ) then
    raise exception 'SECTION_KIND_NOT_ALLOWED' using errcode = 'check_violation';
  end if;

  perform pg_advisory_xact_lock(hashtext('sections:' || p_presentation_id::text));

  v_singleton := p_kind in (
    'hero','parameters','contact','map','gallery','documents',
    'floorplans','analyticMaps','poi','panorama','socialProof','news'
  );
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

-- 2) STORAGE — sdílený bucket pro obrázky sekcí (plány, místnosti, mapy, panorama)
--    Veřejné čtení je GENERICKÉ přes cestu: soubor smí číst kdokoli, jen když
--    prezentace (2. složka v cestě) je published a 1. složka sedí na vlastníka.
--    Žádný per-tabulkový join → funguje pro jakýkoli typ obrázku sekce.
do $$
begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('presentation-media', 'presentation-media', false, 15728640,
          array['image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do update
    set public = false,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;
exception when insufficient_privilege or undefined_table then
  raise notice 'BUCKET presentation-media přeskočen (chybí práva na storage.*) — založ ho ručně.';
end $$;

do $$
begin
  execute $p$drop policy if exists "media owner upload" on storage.objects$p$;
  execute $p$
    create policy "media owner upload" on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'presentation-media'
        and (storage.foldername(name))[1] = auth.uid()::text
        and array_length(storage.foldername(name), 1) = 2
        and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and name ~* '\.(jpg|png|webp)$'
        and exists (
          select 1 from public.presentations p
          where p.id = ((storage.foldername(name))[2])::uuid
            and p.owner_id = auth.uid()
        )
      )
  $p$;

  execute $p$drop policy if exists "media owner read" on storage.objects$p$;
  execute $p$
    create policy "media owner read" on storage.objects
      for select to authenticated
      using (
        bucket_id = 'presentation-media'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
  $p$;

  execute $p$drop policy if exists "media owner delete" on storage.objects$p$;
  execute $p$
    create policy "media owner delete" on storage.objects
      for delete to authenticated
      using (
        bucket_id = 'presentation-media'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
  $p$;

  execute $p$drop policy if exists "media public read published" on storage.objects$p$;
  execute $p$
    create policy "media public read published" on storage.objects
      for select to anon, authenticated
      using (
        bucket_id = 'presentation-media'
        and exists (
          select 1 from public.presentations p
          where p.id::text = (storage.foldername(name))[2]
            and p.status = 'published'
            and (storage.foldername(name))[1] = p.owner_id::text
        )
      )
  $p$;
exception when insufficient_privilege or undefined_table then
  raise notice 'POLITIKY STORAGE pro media přeskočeny (chybí práva) — naklikej je ručně.';
end $$;
