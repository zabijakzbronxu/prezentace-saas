-- =====================================================================
--  20260715160000  video_investmentcalc
--  Kolo 4 — dvě samostatné sekce: Video (vložené YouTube/Vimeo) a
--  Investiční kalkulačka. Obsah OBOU bydlí v JSONB na řádku sekce (jako
--  ostatní bezsouborové sekce) — ŽÁDNÁ nová tabulka, ŽÁDNÝ nový sloupec,
--  ŽÁDNÝ bucket. `presentation_sections.kind` CHECK oba typy povoluje už
--  od kola 1 (migrace 20260715120000). Jediná potřebná změna schématu:
--  rozšířit whitelist a singleton list ve funkci add_presentation_section,
--  aby oba typy šly přidat/zapnout/přeřadit jako ostatní.
--
--  Idempotentní (create or replace). Stejný obsah je i v APLIKUJ_VSE.sql
--  (Karel pouští ten).
-- =====================================================================

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
    'floorplans','analyticMaps','poi','panorama','socialProof','news',
    'video','investmentCalc'
  ) then
    raise exception 'SECTION_KIND_NOT_ALLOWED' using errcode = 'check_violation';
  end if;

  perform pg_advisory_xact_lock(hashtext('sections:' || p_presentation_id::text));

  v_singleton := p_kind in (
    'hero','parameters','contact','map','gallery','documents',
    'floorplans','analyticMaps','poi','panorama','socialProof','news',
    'video','investmentCalc'
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
