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

## Rozhodnutí (2026-07-14, E3.9 Stripe platby) — defaulty zvolené AI, čekají na potvrzení Karla

- **Cena je konfigurace, ne kód:** `PUBLISH_PRICE_CZK` (výchozí 490 Kč), `PUBLISH_PRODUCT_NAME`.
  Měna CZK napevno — je **dvoudecimální** (490 Kč = `unit_amount: 49000` haléřů) a
  Stripe neúčtuje míň než **15 Kč**. Cena se bere VÝHRADNĚ ze serveru.
- **Publikace se odemyká JEN webhookem** (`/api/stripe/webhook`), nikdy podle návratové
  URL z prohlížeče (dá se podvrhnout). Návratová stránka jen čeká a čte stav z DB.
  Záchranná brzda: tlačítko „Ověřit platbu" → serverový dotaz PŘÍMO Stripu (ne prohlížeči),
  používá stejnou funkci `fulfillSession` jako webhook.
- **Idempotence** stojí na tabulce `stripe_events` (`event_id` = PRIMARY KEY): webhook si
  událost na začátku „zamkne"; při selhání zámek UVOLNÍ (jinak by Stripe retry přeskočil
  a platba by se tiše ztratila). Druhá vrstva: partial unique indexy na `payments`
  (jedna session, jedna rozdělaná a jedna zaplacená platba na prezentaci).
- **Refund → prezentace zpět na `draft`** (trigger `unpublish_when_unpaid` v DB, ne jen
  v aplikaci). Důvod: „zaplaceno = zveřejněno" je obchodní model; jinak by šlo zaplatit,
  nechat zveřejnit a požádat o vrácení peněz → inzerát zdarma. Data se nemažou.
- **Průvodce má nově 4. krok „Zveřejnit"** (Základ → Fotky → Texty → Zveřejnit).
- Poslouchané události: `checkout.session.completed`, `…async_payment_succeeded`,
  `…async_payment_failed`, `…expired`, `refund.created`. POZOR: `completed` sám o sobě
  NEZNAMENÁ zaplaceno — u odložených metod přijde s `payment_status: unpaid`.
- Nové env proměnné: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `NEXT_PUBLIC_SITE_URL` (na produkci POVINNÁ — jinak jde podvrhnout návratovou adresu),
  `PUBLISH_PRICE_CZK`, `PUBLISH_PRODUCT_NAME`.
- Do `payments` smí zapisovat **jen service_role** (`lib/supabase/admin.ts`) — RLS + REVOKE.
- stripe-node: verze **zamčená v package.json**, `apiVersion` se schválně NEUVÁDÍ
  (typ je zúžený na literál nejnovější verze → hardcode by shodil typovou kontrolu při upgradu).
- ⚠️ **Stav 2026-07-14: kód napsaný, ale STROJOVĚ NEOVĚŘENÝ** (sandboxu došlo místo na disku
  → nešly testy, build ani commit). Ověření a commit jsou na Karlovi, viz `tasks/kroky-pro-karla.md`.

## Rozhodnutí (2026-07-15, oprava Codex nálezů nad Otínskou) — kód napsán, STROJOVĚ NEOVĚŘENO

- **Veřejné čtení = vždy navázané na „zapnuto + published“, ne jen „published“.** Anon
  SELECT policy na `presentation_sections` vyžaduje `enabled=true` A published (H1).
  Dokumenty (DB řádek i Storage objekt) veřejné jen když je sekce `documents` zapnutá (H2).
- **Média mají teď vlastní registrační tabulku `presentation_media`** (řádek = jeden
  obrázek sekce, `section_id` s `on delete cascade`). Veřejné čtení objektu z bucketu
  `presentation-media` stojí na EXISTENCI toho řádku u zapnuté sekce published prezentace
  (H3) — vzor jako `presentation-photos`. Registruje ji server-side RPC
  `sync_presentation_media` volaná při uložení sekce (analyticMaps/panorama/floorplans);
  **limit `MAX_MEDIA_PER_PRESENTATION=1000` je vynucený v DB** (H4). Backfill v migraci
  zaregistruje existující obrázky, aby se publikované prezentace nerozbily.
- **XSS hráz na URL: `safeExternalUrl()` v `lib/presentations/sections.ts`** — povolí jen
  `http/https` (staví na `new URL`, chytí i `java\tscript:`). Čtou ji readery obsahu
  (render) i validace při zápisu. `mailto:`/`tel:` se skládají zvlášť s pevnou předponou.
- **Integrita sekcí drží DB, ne jen RPC** (M1): unikátní parciální index na singleton
  typy + trigger `guard_presentation_section_kind` (whitelist = ready typy; `chatbot`
  a nedodělané se přímým insertem nepustí).
- **Veřejná stránka: chyba dotazu ≠ prázdno** (M3). Nový `QueryErrorScreen` (vedle
  `SchemaErrorScreen`) — skutečná chyba sekcí/fotek/dokumentů ukáže hlasitou hlášku,
  ne tichý fallback.
- ⚠️ **Vedlejší efekt H1 (ke schválení Karlem):** publikovaná prezentace s VYPNUTÝMI VŠEMI
  sekcemi ukáže výchozí sadu sekcí (ne prázdno) — není únik, viz `REVIEW_CODEX_2026_07_15.md`.
- ⚠️ **Stav: kód napsaný, křížově zrevidovaný (žádný blokátor), ale STROJOVĚ NEOVĚŘENÝ**
  (sandbox bez místa) → migrace + `npm test/typecheck/lint/build` + commit jsou na Karlovi
  (příkazy v `REVIEW_CODEX_2026_07_15.md`).

## Technická poznámka (prostředí Cowork)

- Sandbox v Cowork neumí mazat gitové `.lock` soubory na Desktopu → po každé git operaci zůstane stale `index.lock`. Řešení: přesunout ho stranou souborovým nástrojem (move na `*.stale`) před další git operací. V Claude Code (nativně) tento problém nebude.
