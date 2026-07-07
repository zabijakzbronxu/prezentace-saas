-- =====================================================================
-- Zpřísnění pojistek po křížové revizi (2026-07-07)
--
-- 1) Stav „paid" (zaplaceno) si dosud mohl vlastník nastavit přímým
--    voláním API bez platby (trigger hlídal jen 'published'). Publikaci
--    to neobcházelo, ale štítek „Zaplaceno" by lhal a budoucí logika
--    věřící stavu 'paid' by byla zranitelná. Nově vyžaduje zaplacenou
--    platbu KAŽDÝ přechod do 'paid' i 'published'.
--    (Stripe flow v E3.9 napřed zapíše platbu, pak přepne stav — projde.)
--
-- 2) Slug dosud neměl žádné omezení tvaru — přímým updatem šel nastavit
--    libovolně dlouhý/nevalidní text. Nově CHECK na tvar a délku.
--
-- Additivní a idempotentní (CREATE OR REPLACE / guard přes pg_constraint).
-- =====================================================================

create or replace function public.enforce_paid_before_publish()
returns trigger
language plpgsql
as $$
begin
  -- Hlídáme každý PŘECHOD do stavu 'paid' nebo 'published'
  -- (opakované uložení už nastaveného stavu neblokujeme).
  if new.status in ('paid', 'published')
     and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    if not exists (
      select 1 from public.payments pay
      where pay.presentation_id = new.id
        and pay.status = 'paid'
    ) then
      raise exception
        'Zamítnuto: k prezentaci % neexistuje zaplacená platba (payments.status=''paid'').',
        new.id
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

-- Trigger presentations_enforce_paid_before_publish už na funkci ukazuje
-- (migrace 20260705150000) — CREATE OR REPLACE stačí, netřeba ho sahat.

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'presentations_slug_format') then
    alter table public.presentations
      add constraint presentations_slug_format
      check (slug ~ '^[a-z0-9][a-z0-9-]{0,79}$') not valid;
  end if;
end $$;
