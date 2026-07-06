# todo.md — pracovní plán

(Primární evidence bude v ClickUpu po připojení konektoru; tohle je pracovní plán aktuální fáze.)

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

## Session 2026-07-06 — editace + E2.5 fotky + E2.6 texty
- [x] Sdílená validace formuláře (založení i editace hlídají totéž) — `lib/presentations/form.ts`
- [x] Editace prezentace: `/presentations/[id]/edit` (RLS jen vlastní), odkaz „Upravit" ze seznamu
- [x] E2.5 fotky: `/presentations/[id]/photos` — nahrávání z prohlížeče rovnou do Storage (privátní bucket `presentation-photos`), hero, pořadí, mazání, limity (8 MB, JPEG/PNG/WebP, max 20)
- [x] E2.6 texty: `/presentations/[id]/texts` — titulek, popis/příběh, lokalita, vybavení; migrace `20260706100000_text_sections.sql` (ověřena parserem)
- [x] Průvodce: kroky Základ → Fotky → Texty, po založení se pokračuje na Fotky
- [x] Veřejná stránka prezentace `/listing/[slug]` (hero, galerie, texty, parametry, kontakt/CTA) — publikovaná veřejně, koncept jen vlastníkovi přes „Náhled ↗" v průvodci; RLS beze změn
- [x] `npm run build` ověřen v čisté kopii (na mountu je rozbité node_modules → Karel spustí `npm ci`)
- [ ] Karel: kroky dle `tasks/kroky-pro-karla.md` (npm ci, migrace, bucket, ověření, push)
- [ ] ClickUp: konektor v session nedostupný — E2.5/E2.6 přepnout ručně (viz kroky pro Karla)
- NEpushnuto (push je vědomý krok Karla).

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
