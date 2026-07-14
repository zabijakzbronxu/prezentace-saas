# todo.md — pracovní plán

(Primární evidence bude v ClickUpu po připojení konektoru; tohle je pracovní plán aktuální fáze.)

## Session 2026-07-14 (3) — první reálný běh ESLintu: 6 nálezů

**Stav: HOTOVÉ-NEOVĚŘENÉ.** Sandbox znovu nenastartoval („No space left on device"),
takže `npm run lint`, `npm test`, `npm run typecheck` ani `npm run build` NEBĚŽELY.
Nic z toho si neodškrtávám — ověření spustí Karel u sebe (příkazy dole).

**Proč:** lint v projektu nikdy neběžel (viz lessons 2026-07-14 (3)), teď poprvé
reálně proběhl a našel 6 problémů — 4 errory a 2 warningy.

**Opraveno (6/6 nahlášených):**
- [x] `react/no-unescaped-entities` (4 errory, 3 soubory): ASCII `"` v holém JSX textu
      nahrazeno entitami `&bdquo;` / `&ldquo;` — `listing/[slug]/not-found.tsx:32`,
      `presentations/[id]/photos/page.tsx:133`, `presentations/[id]/texts/form.tsx:106` (2×).
      Uvozovky ze zobrazeného textu NEZMIZELY. Jediná změna vzhledu: zavírací uvozovka
      byla rovná (`"`), teď je správná česká (`"`) — viz „Změna vzhledu" níž.
- [x] `no-unused-vars` (2 warningy): smazán mrtvý import `type FormState`
      (`account/profile-form.tsx:7`, `presentations/[id]/texts/form.tsx:8`).
      Diagnóza: typ se odvodí ze signatury akce (`updateProfile`/`updateTexts` vrací
      `Promise<FormState>`), import byl zbytečný. Žádný `eslint-disable`.

**Změna vzhledu (1 znak, ke schválení):** v těch třech textech byla zavírací uvozovka
rovná `"` (typograficky špatná čeština). Entita `&ldquo;` vykreslí správnou českou `"`.
Kdyby to Karel chtěl přesně jako dřív (rovná uvozovka), stačí `&ldquo;` → `&quot;`.

**Prohledán zbytek repa (staticky, subagent — eslint nešel spustit):** `app/src` v projektu
NEEXISTUJE (kód je v `app/app` a `app/lib`). Prošlo 33 souborů, další pravděpodobné nálezy
= žádné. 4× `<img>` už má platný `eslint-disable`, `_prevState` se nehlásí
(default `args: "after-used"`), žádné `any`, žádný `var`, jediný `useEffect` má úplné deps.
K sledování: `eslint-plugin-react-hooks@7` přináší nová React Compiler pravidla — na
`publish/hotovo/waiting.tsx` nikdy neběžela.

**Riziko:** velmi nízké. Změna se dotýká jen zobrazeného textu a jednoho importu, žádná logika.
**Rollback:** `git revert <hash>` (commit dělá Karel, viz níž).

## Session 2026-07-14 — E3.9 Stripe platba (odemknutí publikace)

**Proč:** DB brzda `enforce_paid_before_publish()` drží, ale neexistuje cesta, jak zaplatit
→ nikdo nemůže publikovat → produkt nevydělává. Jediná blokující díra před spuštěním.

**Návrh (spec):**
- [x] Cena a měna v konfiguraci: `PUBLISH_PRICE_CZK` (default 490 Kč), `PUBLISH_PRODUCT_NAME`; měna CZK napevno (dvoudecimální, min. 15 Kč — limit Stripu)
- [x] Migrace `20260714120000_stripe_payments.sql`:
      sloupce `stripe_session_id`, `stripe_event_id`, `refund_event_id`, `refunded_at`, `updated_at`;
      stav `expired` navíc; **unikátní indexy** (session, event, refund event, max 1 pending a max 1 paid na prezentaci);
      **idempotenční kniha `stripe_events`** (event_id = primární klíč);
      trigger `unpublish_when_unpaid()` — když platba přestane být `paid`, prezentace spadne zpět na `draft`
- [x] `lib/supabase/admin.ts` — service_role klient (jediný, kdo smí psát do `payments`)
- [x] `lib/payments/*` — čistá logika (config, fulfill) oddělená od Stripu i Supabase (porty) → testovatelná bez sítě
- [x] Server action „Zveřejnit" → Stripe Checkout (hosted, česky, CZK); dvojklik chrání unikátní index na jedné rozdělané platbě + znovupoužití otevřené session
- [x] `/api/stripe/webhook` — ověřený podpis, idempotence přes `stripe_events`, na chybu 500 + uvolnění zámku (Stripe zopakuje)
- [x] Návratová stránka `/presentations/[id]/publish/hotovo` — jen „platba se zpracovává"; publikaci NIKDY neodemyká podle URL
- [x] Testy vitest vč. idempotence webhooku (`lib/__tests__/payments.test.ts`, 20 nových případů)
- [x] Nezávislá bezpečnostní revize čerstvým agentem (čtením kódu)
- ⚠️ **NEOVĚŘENO STROJOVĚ:** Linuxovému sandboxu v Cowork došlo místo na disku → v této session
      NEŠLO spustit `npm install`, `npm test`, `tsc --noEmit`, `next build` ani `git commit`.
      Kód je zapsaný na disk, ale **zelené testy a build musí spustit Karel** (příkazy v `tasks/kroky-pro-karla.md`).
      Dokud neproběhnou, považuj E3.9 za HOTOVÉ-NEOVĚŘENÉ.
- [ ] **Karel — spustit ověření:** `npm install && npm test && npm run typecheck && npm run build`
- [ ] **Karel — commity:** v této session je NEŠLO udělat (viz výše); příkazy jsou v `tasks/kroky-pro-karla.md`
- [ ] **Karel:** Stripe účet, klíče, webhook endpoint, proměnné ve Vercelu, testovací nákup
- [ ] **Karel — rozhodnutí:** cena (default 490 Kč), refund → odpublikovat (implementováno), 4. krok průvodce „Zveřejnit"
- NEpushnuto (push je vědomý krok Karla).

## Fáze 0 — založení systému
- [x] Složka, git, struktura
- [x] CLAUDE.md + RULES.md (ústava)
- [x] 3 checky + mega check + dobrou noc
- [x] PRODUCT.md (vize)
- [x] Připojit ClickUp konektor — backlog žije v seznamu „Prezentace SaaS — Backlog"
- [ ] Karel schválí ústavu a vizi

## Fáze 1 — příprava vývoje
- [x] Cenový model: platba předem (rozhodnuto 2026-07-04)
- [x] Tech stack: varianta A — Next.js + Supabase + Vercel + Stripe
- [x] Pracovní název: „Prodej si sám"
- [x] Rozpad MVP na 13 úkolů (E1.1–E4.13) → ClickUp
- [ ] Sepsat plán zálohování a obnovy (v ClickUpu, před produkčními daty)
- [ ] Finální název + doména (v ClickUpu, před spuštěním)

## Fáze 2 — vývoj MVP
- [ ] Začít úkolem E1.1 (založení aplikace + Vercel) v ČISTÉ konverzaci

## Session 2026-07-07 (odpoledne) — Wargame Mise 11 „Prodej si sám"

- [x] Wargame provedena (rozkaz `tasks/wargame-11.md`): read-only recon celého repa (6 agentů), adversariální plánování 4 modulů, křížová revize 3 nezávislými revizory — 20 nálezů zapracováno (žádný kritický)
- [x] Trasa exekutora: `wargames/11-prodej-si-sam.md` — tah po tahu, s očekáváními, selháními, protitahy, větvemi, BLOCKED/STOP/RECON NEEDED, abort podmínkami a definicí PASS všech 6 povinných verifikací
- [x] Klíčová zjištění reconu: reset hesla v aplikaci NEEXISTUJE; 5 migrací + zpřísněné Storage policies čekají na Karla (živá DB možná pozadu za repem); main je 39 commitů před GitHubem; `app/.env.local` neexistuje; Stripe CLI a pg_dump na stroji chybí (Docker je)
- ⚠️ **2026-07-08 — PREMORTEM PRODUKTU (docs/premortem-report-2026-07-08.html): doporučeno POZASTAVIT exekuci mise (stavbu plateb a adminu), dokud neproběhnou 3 validační testy trhu (předprodej 30 samoprodejcům · distribuční test Sreality/Bezrealitky · falešné dveře + cena akvizice). Rozhodovací brána: 2×PASS ze 3 → stavět dál; jinak pivot/stop — rozhoduje Karel.**
- Plán fází mise (odškrtává exekutor při exekuci — AŽ PO průchodu branou z premortemu):
  - [ ] Otázky K1–K10 + prosby P1–P3 položeny Karlovi jednou zprávou (viz sekce 2 trasy)
  - [ ] FÁZE 0 — Zajištění stavu: V1 soulad živé DB s repem + git push · V6 metodika migrací s ověřeným rollbackem · V7 backup + zkouška obnovy · 0.5 uzávěrka
  - [ ] FÁZE 1 — Bezpečnostní základ: M1 prostředí+účty · M2 audit správy · V2 izolace dat (verifikace 1) · V3a publikační brána negativně · M4 mazání
  - [ ] FÁZE 2 — Stripe platba předem: S2–S15 (S13 publikace po odpovědi K4; verifikace 2+3)
  - [ ] FÁZE 3 — Auth + dotažení správy: M5 auth e2e · M6+M7 reset hesla (po K6) · M8 expirace session · M9 hlášky (po K9, nadstandard) · M10 (verifikace 4)
  - [ ] FÁZE 4 — Admin pro Karla: A1–A7 (bez migrace: ADMIN_USER_ID + service_role jen na serveru; A6 = povinná izolační regrese)
  - [ ] Uzávěrka mise: všech 6 verifikací PASS + doporučit Karlovi povel „security check"
- [ ] ClickUp zrcadlo listu 901219290922 (stav viz níže / tasks/kroky-pro-karla.md)
- NEpushnuto (push je vědomý krok Karla).

## Session 2026-07-06 — editace + E2.5 fotky + E2.6 texty
- [x] Sdílená validace formuláře (založení i editace hlídají totéž) — `lib/presentations/form.ts`
- [x] Editace prezentace: `/presentations/[id]/edit` (RLS jen vlastní), odkaz „Upravit" ze seznamu
- [x] E2.5 fotky: `/presentations/[id]/photos` — nahrávání z prohlížeče rovnou do Storage (privátní bucket `presentation-photos`), hero, pořadí, mazání, limity (8 MB, JPEG/PNG/WebP, max 20)
- [x] E2.6 texty: `/presentations/[id]/texts` — titulek, popis/příběh, lokalita, vybavení; migrace `20260706100000_text_sections.sql` (ověřena parserem)
- [x] Průvodce: kroky Základ → Fotky → Texty, po založení se pokračuje na Fotky
- [x] Veřejná stránka prezentace `/listing/[slug]` (hero, galerie, texty, parametry, kontakt/CTA) — publikovaná veřejně, koncept jen vlastníkovi přes „Náhled ↗" v průvodci; RLS beze změn
- [x] Kontakt v průvodci (dokončení E2.6): jméno/telefon/e-mail v kroku 3, validace formátů, migrace `20260706150000_contact_checks.sql` (ověřena parserem), CTA Zavolat / Napsat e-mail na veřejné stránce
- [x] E2.7 světlá šablona veřejné stránky: Playfair Display + Work Sans (next/font), bílé pozadí, vzdušná typografie dle Otínské; adresa `/listing/<slug>` potvrzena jako finální
- [x] `npm run build` ověřen v čisté kopii (na mountu je rozbité node_modules → Karel spustí `npm ci`)
- [ ] Karel: kroky dle `tasks/kroky-pro-karla.md` (npm ci, migrace, bucket, ověření, push)
- [x] ClickUp aktualizován (konektor naskočil v průběhu session): E2.5, E2.6, E2.7 i E2.8 na „in progress" + komentáře co je hotové a co zbývá
- [x] ClickUp: komentáře k dokončení E2.6/E2.7 doplněny 2026-07-07 ráno (výpadek 503 pominul); zároveň E3.10 a E4.12 na „in progress" + komentáře, návrh záloh okomentován u příslušného úkolu
- NEpushnuto (push je vědomý krok Karla).

## Session 2026-07-07 (noční dávka 2) — profil, křížová revize a opravy
- [x] Účet: editace profilu (jméno, telefon) + předvyplnění kontaktu v kroku 3 z profilu; migrace `20260707090000_profile_checks.sql`
- [x] Křížová revize čerstvým agentem (diff celé dávky): ŽÁDNÝ HIGH nález, RLS/Storage/publikační pojistka drží; 3 MEDIUM + 8 LOW
- [x] Opraveno po revizi: formuláře neztrácejí rozepsaný text (chyby na místě přes useActionState); atomické operace fotek v DB funkcích pod zámkem (migrace `20260707120000_photos_integrity.sql` — souběhy, unikátní storage_path, hero vždy dorovnaná); přechod na „paid" nově vyžaduje platbu + CHECK tvaru slugu (migrace `20260707121000_status_slug_guard.sql`); chyby v URL jen jako kódy (nejde podvrhnout text); povinné limity bucketu + přísnější upload policy (storage-setup.md); česká množná čísla a počítadlo v uploaderu; miniatura v přehledu má fallback na první fotku; žádná syrová DB hláška uživateli
- [x] Nezapracované drobnosti z revize (vědomě): required město v UI vs. tolerantnější server (neškodné), middleware→proxy deprecation (počká na Next 17), legacy lowercase energy_class (žádná data)
- [x] Build + 34 testů zelené v čisté kopii; migrace ověřeny parserem
- [ ] Codex (OpenAI) revize: CLI je na stroji přihlášené, ale účet narazil na usage limit („try again Aug 4th 2026" / potřeba ChatGPT Plus). Náhradou proběhla revize čerstvým Claude agentem (viz výše). Až bude Plus: pomocná větev `codex-review-base` je připravená, postup v memory/MEMORY.md. → rozhodnutí Karla, jestli Plus pořídit.
- NEpushnuto.

## Session 2026-07-07 (noční dávka) — přehled, úvod, testy, zálohy
- [x] E3.10 přehled Moje prezentace: miniatury hero fotek, stav, rychlé odkazy (Upravit/Fotky/Texty/Náhled), mazání prezentace s potvrzením (DB kaskáda + úklid Storage)
- [x] Úvodní stránka místo „Ahoj světe": hero, Jak to funguje (3 kroky), CTA podle přihlášení; texty odpovídají modelu „platba předem, koncept zdarma" (cena záměrně neuvedena)
- [x] E4.12 základ testů: vitest, 34 testů na lib/ (slug, validace základů i kontaktu, magic bytes fotek, cesty souborů, formátování) — vše zelené v čisté kopii
- [x] docs/BACKUP.md — NÁVRH plánu zálohování a obnovy, čeká na schválení Karla
- [x] `npm run build` + `npm test` ověřeny v čisté kopii
- [ ] Karel: ověření v prohlížeči dle `tasks/kroky-pro-karla.md` (body 8–11), schválení BACKUP.md, `git push`
- NEpushnuto.

## Křížová revize (Codex) — oprava nálezů (2026-07-05)
- [x] HIGH: open redirect v `auth/confirm` — jen interní cesty, fallback `/account`
- [x] HIGH: DB pojistka „bez zaplacení nezveřejníš" — trigger `enforce_paid_before_publish`
- [x] MEDIUM: serverová validace formuláře prezentace (délky, energy A–G, rozsahy, parsování čísel)
- [x] MEDIUM: DB CHECK omezení (cena, plochy, energy, délky) — nová migrace
- [x] MEDIUM: seznam prezentací nezahazuje `error` — log + bezpečná hláška
- [x] MEDIUM: sjednocení Next 16.2.10 — build ověřen v čisté kopii
- [x] LOW: `*.tsbuildinfo` do `.gitignore`
- 5 commitů pod autorem Karel, NEpushnuto. Migraci a `npm ci` spustí Karel (viz shrnutí v chatu).

## Review — fáze 0 a 1 (2026-07-04)
Systém založen dle 6 pilířů, ověřen nezávislým agentem (bez rozporů). ClickUp připojen, backlog naplněn. Všechna rozhodnutí v memory/MEMORY.md. Poznámka: git v Cowork sandboxu nechává stale lock soubory — workaround v MEMORY.md.
