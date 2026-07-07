# MEMORY.md — trvalá paměť projektu

Fakta a rozhodnutí, která musí přežít mezi konverzacemi. Co tu není zapsané, zítra neexistuje.

## Rozhodnutí (2026-07-04, založení projektu)

- Systém práce kopírujeme 1:1 podle článku M. Uďana (6 pilířů: pravidla, zadávání, kontroly, záchranné sítě, bezpečná půda, provoz a paměť).
- Úkoly a backlog: **ClickUp** (proč: 1:1 kopie článku, Karlova volba). Připojeno 2026-07-04, seznam „Prezentace SaaS — Backlog" (list_id 901219290922). `tasks/todo.md` zůstává jen jako pracovní plán session.
- Platební brána: **Stripe** (proč: nejlepší dokumentace a nejsnazší integrace pro AI vývoj, funguje v ČR).
- **Tech stack (2026-07-04): Varianta A — Next.js + Supabase + Vercel + Stripe** (proč: spolehlivost jako služba, žádná vlastní správa serveru, AI stack zná nejlíp).
- **Pracovní název produktu: „Prodej si sám"** (finální název + doména před spuštěním).
- **Cenový model: platba předem** — prezentace se nezveřejní bez zaplacení (Karel, 2026-07-04).
- Křížová kontrola: zatím **čerstvý Claude agent** jako nezávislý revizor (proč: Karel zatím nemá OpenAI předplatné); Codex doplníme později.
- **Codex CLI je nainstalovaný a přihlášený** (`codex` v0.142.5, homebrew) — ale účet je na free limitu: pokus o revizi 2026-07-07 skončil „usage limit, try again Aug 4th 2026 / start Plus trial". Pro Codex revize dřív je potřeba ChatGPT Plus. Pomocná větev `codex-review-base` (commit 903d911) je připravená — revizi pak spustit: `codex exec -s read-only "…zadání…" < /dev/null`.
- Projekt žije v `~/Desktop/prezentace-saas/`, git od první minuty.
- Referenční vzor výsledné prezentace: Otínská (`~/Desktop/index.html`, podklady dle `~/Desktop/OTINSKA_podklady_cesty.md`).
- Start se 3 checky (security, performance, ux), ne 15 — rostou s produktem.

## Rozhodnutí (2026-07-06, editace + fotky + texty) — defaulty zvolené AI, čekají na potvrzení Karla

- Fotky se nahrávají **z prohlížeče přímo do Supabase Storage** (přes server by Vercel limitoval ~4,5 MB na požadavek). Bucket `presentation-photos` je **privátní**; náhledy přes podepsané odkazy; veřejné čtení jen u publikovaných (Storage policies v `app/supabase/storage-setup.md`).
- Limity fotek: max 20 na prezentaci, 8 MB na soubor, jen JPEG/PNG/WebP (typ se pozná podle obsahu, ne přípony). První nahraná fotka se stane hlavní (hero).
- Textové sekce prezentace: titulek, popis/příběh (`description`), „Lokalita a okolí" (`location_text`), „Vybavení a přednosti" (`features_text`) — migrace `20260706100000_text_sections.sql`.
- Průvodce: Základ → Fotky → Texty; po založení prezentace se pokračuje rovnou na Fotky.
- Veřejná stránka prezentace: **`/listing/<slug>` — ROZHODNUTO (Karel, 2026-07-06), adresa se už nemění.** Přístup řeší čistě RLS: publikovaná = veřejná, koncept = jen vlastník („Náhled ↗" v průvodci). Prázdné sekce: v náhledu vlídný prázdný stav s odkazem, na veřejné stránce se vynechají.
- Vzhled veřejné šablony (E2.7): **světlá** — bílé pozadí, serifové nadpisy Playfair Display + text Work Sans (dle referenční Otínské), fonty přes next/font (balí se při buildu, žádné stahování za běhu). Admin/průvodce zůstává tmavý — záměr, dvě různé identity.
- Kontakt prodávajícího (dokončení E2.6): vyplňuje se v kroku 3 (Texty), volitelný; validace: e-mail základní tvar, telefon ≥ 6 číslic, délky 120/200/30 (+ DB CHECK `20260706150000_contact_checks.sql`). Na veřejné stránce karta s CTA Zavolat / Napsat e-mail; bez kontaktu se sekce skryje.
- ClickUp konektor nebyl v session 2026-07-06 dostupný → stav E2.5/E2.6 v backlogu aktualizuje Karel ručně (viz `tasks/kroky-pro-karla.md`).

## Technická poznámka (prostředí Cowork)

- Sandbox v Cowork neumí mazat gitové `.lock` soubory na Desktopu → po každé git operaci zůstane stale `index.lock`. Řešení: přesunout ho stranou souborovým nástrojem (move na `*.stale`) před další git operací. V Claude Code (nativně) tento problém nebude.
