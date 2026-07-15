# Kroky pro Karla — po session 2026-07-06 (editace + fotky + texty + veřejný náhled)

Co je nového v kódu (zatím jen u tebe na disku, NEpushnuto):
prezentace jde **upravit** (krok 1 — Základ), přibyl krok **2 — Fotky**
(nahrávání, pořadí, hlavní fotka, mazání) a krok **3 — Texty** (titulek,
popis/příběh, lokalita, vybavení). Všechno drží pohromadě průvodce
Základ → Fotky → Texty a odkaz „Upravit" v Moje prezentace.

Navíc přibyla **veřejná stránka prezentace** na adrese `/listing/<slug>` —
to, co uvidí zájemce: hlavní fotka s cenou a adresou, galerie, texty,
parametry a kontakt. Veřejně je dostupná **jen publikovaná** prezentace;
koncept vidíš jen ty po přihlášení, přes tlačítko **„Náhled ↗"** v každém
kroku průvodce (nahoře vpravo).

Udělej to v tomhle pořadí:

## 1. Oprava závislostí u tebe (2 minuty)

`node_modules` v `app/` je po dřívějších pokusech rozbité (chybí kusy balíčků).
V terminálu:

```
cd ~/Desktop/prezentace-saas/app
npm ci
npm run build
```

`npm run build` musí skončit bez chyby (my jsme ho ověřili v čisté kopii —
u tebe po `npm ci` projde taky).

## 2. Spustit pět nových migrací databáze (5 minut)

Přibyly: textové sekce, pojistky délek (kontakt, profil), a po křížové revizi
také ochrana proti souběhům u fotek a zpřísnění stavů/adres prezentací.

1. `supabase.com/dashboard` → tvůj projekt → **SQL Editor** → **New query**
2. Postupně zkopíruj a spusť (**Run**) obsah těchto souborů, v tomhle pořadí:
   - `app/supabase/migrations/20260706100000_text_sections.sql`
   - `app/supabase/migrations/20260706150000_contact_checks.sql`
   - `app/supabase/migrations/20260707090000_profile_checks.sql`
   - `app/supabase/migrations/20260707120000_photos_integrity.sql`
   - `app/supabase/migrations/20260707121000_status_slug_guard.sql`
3. Všechny musí skončit **Success**. Jdou spustit i dvakrát, nic se nerozbije.
4. **Pozor:** bez posledních dvou migrací nepůjde nahrávat/řadit fotky
   (aplikace teď volá databázové funkce z nich).

## 3. Zapnout úložiště fotek (5 minut)

Podle návodu `app/supabase/storage-setup.md`:
bucket `presentation-photos` (privátní, **povinně** limit 8 MB + jen obrázky)
+ 4 bezpečnostní pravidla. Bez tohohle kroku fotky nepůjdou nahrát
(aplikace to řekne hláškou).

> Pokud jsi pravidla nastavoval už dřív podle starší verze návodu, spusť SQL
> blok z návodu ZNOVU — po křížové revizi je pravidlo pro nahrávání přísnější
> (hlídá i tvar cesty a příponu). Skript si staré verze sám nahradí.

## 4. Ověřit v prohlížeči (5 minut)

1. `npm run dev` (pokud neběží) a přihlas se.
2. **Moje prezentace** → u prezentace klikni **Upravit** → změň třeba cenu →
   **Uložit změny** → uvidíš „Změny uloženy ✅" a nahoře kroky
   **1. Základ → 2. Fotky → 3. Texty**.
3. Krok **Fotky**: nahraj 2–3 fotky → objeví se náhledy, první má štítek
   **Hlavní fotka**. Vyzkoušej šipky (pořadí), „Jako hlavní" a „Smazat".
4. Krok **Texty**: vyplň popis → **Uložit texty** → „Texty uloženy ✅",
   po obnovení stránky texty zůstávají.
5. Založ i novou prezentaci („+ Vytvořit novou") — po uložení tě to nově
   vezme rovnou na krok Fotky (dřív na seznam).
6. **Náhled:** v kterémkoli kroku průvodce klikni vpravo nahoře na
   **Náhled ↗** — otevře se stránka, jak ji uvidí zájemce, s modrým pruhem
   „Náhled konceptu — tuhle stránku vidíš jen ty". Prázdné sekce mají
   v náhledu odkaz „Doplnit…"; na veřejné stránce se prostě nezobrazí.
   Stránka je nově **světlá** (bílé pozadí, serifové nadpisy) — průvodce
   a účet zůstávají tmavé, to je záměr.
7. **Kontakt:** v kroku **3. Texty** dole vyplň jméno, telefon a e-mail →
   ulož → v Náhledu se dole objeví karta „Zaujalo vás to tu?" s tlačítky
   **Zavolat** a **Napsat e-mail** (tlačítka zkus — musí otevřít volání /
   nový e-mail). Když kontakt smažeš, sekce ze stránky zmizí.
8. **Nový přehled Moje prezentace:** u každé prezentace je miniatura hlavní
   fotky, stav a tlačítka Upravit / Fotky / Texty / Náhled ↗ / **Smazat**
   (s potvrzením; smaže i fotky — vyzkoušej na testovací prezentaci).
9. **Nová úvodní stránka** (`/`): hero + „Jak to funguje" + tlačítko;
   přihlášenému nabídne rovnou Moje prezentace. Zkontroluj texty — hlavně
   větu o platbě („platí se jednorázově při zveřejnění, koncept zdarma").
10. **Testy:** v terminálu `npm test` v `app/` — musí proběhnout
    „34 passed". (Základ úkolu E4.12 — testy validací, slugů, fotek.)
11. **Plán zálohování:** přečti `docs/BACKUP.md` (návrh) a schval/uprav.
12. **Profil na účtu:** na `/account` vyplň jméno a telefon → ulož →
    „Profil uložen ✅". Pak založ novou prezentaci a dojdi do kroku
    **3. Texty** — kontakt dole bude předvyplněný z profilu (včetně
    e-mailu účtu); nic se neukládá samo, dokud nedáš Uložit.
7. **Kontrola soukromí konceptu:** zkopíruj adresu náhledu
   (`/listing/…`) a otevři ji v anonymním okně — musí se ukázat
   „Prezentace není dostupná". Koncept bez přihlášení nikdo neuvidí.

## 5. Poslat na GitHub

Až budeš spokojený: `git push` (klidně přes `PUSH_GITHUB.command`).

## 6. ClickUp — HOTOVO, jen mrkni

Konektor v průběhu práce naskočil, takže backlog už je aktualizovaný za tebe:
**E2.5 Fotky**, **E2.6 Texty**, **E2.7 Šablona veřejné prezentace**
i **E2.8 Náhled + publikace** jsou na „in progress" a u každého úkolu je
komentář, co přesně je hotové a co v něm ještě zbývá (zmenšování fotek,
kontakt v průvodci, doladění šablony podle Otínské, tlačítko Publikovat).

## Co se může pokazit a jak to vrátit

- **Riziko:** nahrávání fotek závisí na správném nastavení bucketu a pravidel —
  když se pravidla nenastaví, nahrání selže se srozumitelnou hláškou (nic
  neuteče ven; bucket je privátní).
- **Rollback kódu:** `git log --oneline` a `git revert <číslo commitu>` — každý
  kousek je samostatný commit. Nebo mi napiš, vrátím to já.
- **Rollback migrace:** sloupce jde odstranit
  (`alter table public.presentations drop column location_text, drop column features_text;`),
  ale přijdeš o data v nich — kdyžtak se nejdřív poradíme.

## Čeká na tvoje rozhodnutí (návrhová rozhodnutí, zvolil jsem rozumné defaulty)

1. **Textové sekce v kroku 3:** titulek + popis/příběh + „Lokalita a okolí"
   + „Vybavení a přednosti". Sedí ti tahle čtveřice, nebo chceš jiné sekce?
2. **Limity fotek:** max 20 fotek na prezentaci, každá do 8 MB. OK?
3. **První nahraná fotka se automaticky stane hlavní** (jde kdykoli změnit). OK?
4. **Po založení prezentace pokračuje průvodce rovnou na Fotky** (dřív skočil
   na seznam). OK?
5. ~~Adresa veřejné stránky~~ — **rozhodnuto 2026-07-06: zůstává
   `/listing/<slug>`.**
6. ~~Kontakt na veřejné stránce~~ — **hotovo 2026-07-06:** kontakt se
   vyplňuje v kroku 3 (Texty), na veřejné stránce dělá tlačítka
   Zavolat / Napsat e-mail.
7. **Vzhled veřejné šablony:** světlá, serifové nadpisy (Playfair Display
   + Work Sans, podle referenční Otínské). Mrkni na Náhled — kdyby ti barvy
   či písmo neseděly, řekni a doladíme.
8. **Limity kontaktu:** jméno max 120, e-mail max 200, telefon max 30 znaků,
   telefon musí mít aspoň 6 číslic. OK?
9. **Mazání prezentací** (nové, 2026-07-07): jde smazat kterákoli vlastní
   prezentace včetně publikované (s potvrzovací otázkou; smaže i fotky).
   Nechat i pro publikované, nebo publikované chránit?
10. **Texty úvodní stránky** — psal jsem je podle rozhodnutí „platba předem,
    koncept zdarma". Konkrétní cena nikde není (ta se teprve určí). Zkontroluj
    formulace, ať nic neslibuje něco, co nechceš.
11. **Plán zálohování** (`docs/BACKUP.md`) — schválit + říct, jestli je
    Supabase na free nebo Pro tarifu.

---

# Doplněk 2026-07-07 — Wargame Mise 11 (ClickUp byl mimo provoz)

Proběhla **wargame** (plánování na papíře, nic se v produktu neměnilo) pro
zbytek MVP: platby Stripe, admin a dotažení správy prezentací. Výsledná
trasa pro exekutora je v `wargames/11-prodej-si-sam.md`, plán fází
v `tasks/todo.md`.

**ClickUp konektor při zápisu nefungoval (chyba 500).** Až pojede, přenes
(nebo řeknu a přenesu já) do listu „Prezentace SaaS — Backlog":

1. Nový úkol: **„Mise 11 — exekuce: Stripe platby + admin + správa"**
   (status to do) s popisem: trasa `wargames/11-prodej-si-sam.md`; fáze:
   0 Zajištění stavu → 1 Bezpečnostní základ → 2 Stripe → 3 Auth+správa →
   4 Admin → uzávěrka se 6 verifikacemi.
2. Komentář k úkolu E3.9 (Stripe): naplánováno wargame — checkout + webhook
   s pojistkou proti dvojímu započtení platby; čeká na cenu a Stripe účet.
3. Komentář k úkolu E3.11/admin (pokud existuje): zvolena varianta bez
   zásahu do databáze (admin se pozná podle nastavení na serveru), jen ke čtení.

**Co bude exekutor na startu mise potřebovat od tebe** (podrobně a přesně
se zeptá sám — tady jen ať víš, co přijde): cena prezentace · jestli má
zůstat náhled zdarma před zaplacením · název na účtence · co po zaplacení
(zveřejnit samo vs. tlačítko) · smí se mazat zaplacené prezentace ·
souhlas s dostavbou „Zapomenutého hesla" (dnes neexistuje!) · tvůj admin
e-mail · schválení BACKUP.md + tarif Supabase · souhlas s instalací
Stripe CLI · a hlavně kroky 1–3 a 5 výše (npm ci, migrace, bucket, push),
bez kterých se mise nerozjede.

---

# Doplněk 2026-07-13 — Revize průvodce (E2.x) + oprava nálezů

Proběhla **nezávislá revize** celého průvodce a veřejné stránky (poprvé — dosud
ji nikdo nezkontroloval) + křížová revize Codexem. Plné výsledky v `REVIEW_2026_07.md`.
**Dobrá zpráva:** nikdo cizí nemůže číst/měnit tvoje data ani publikovat bez
zaplacení — hlavní hráze drží. Opravil jsem 8 nálezů (2 vážnější + 2 střední +
4 drobné). Většina se týkala **úložiště fotek**.

## Stav nasazení (co běží a co ne) — přečti nejdřív

Nevidím do tvého živého Supabase, takže tohle je podle toho, co je v projektu.
**Ověř si a doplň, co ještě neběží:**

- **Migrace v projektu: 10 souborů.** Prvních 5 (init, property_type, backfill,
  checks_and_publish_guard, — ta „stará" várka) jsi spouštěl dřív. Dalších 5
  (`text_sections`, `contact_checks`, `profile_checks`, `photos_integrity`,
  `status_slug_guard`) byl krok „2." z tohoto dokumentu výše — **pokud jsi je
  ještě nespustil, spusť je teď.** Bez posledních dvou nefungují fotky.
- **NOVÁ migrace z revize:** `20260713220000_review_2026_07_hardening.sql` —
  **ještě není aplikovaná** (vznikla teď). Spustit (viz níže).
- **Storage bucket `presentation-photos`:** pokud jsi ho ještě nezaložil podle
  `storage-setup.md`, fotky nejdou nahrát. Návod na bucket jsem po revizi
  **zpřísnil** — spusť SQL blok znovu (viz níže).
- **Platby:** viz „Blokující díra" na konci — Stripe tok zatím vůbec neexistuje.

## Udělej v tomhle pořadí (~10 minut)

### 1. Spustit novou migraci
`supabase.com/dashboard` → tvůj projekt → **SQL Editor** → **New query** → zkopíruj
a spusť obsah `app/supabase/migrations/20260713220000_review_2026_07_hardening.sql`.
Musí skončit **Success**. (Jde spustit i opakovaně. Přidává DB pojistku tvaru cesty
k fotce, zafixuje `search_path` a tvrdě zakáže zápis do plateb běžným uživatelům.)

### 2. Znovu spustit SQL pro úložiště (zpřísněné)
V SQL Editoru spusť **znovu** celý blok z `app/supabase/storage-setup.md` (cesta A).
Po revizi navíc: (a) sám nastaví bucketu limit velikosti a povolené typy (ať to
nezávisí jen na klikání), (b) upload pravidlo nově dovolí nahrát **jen do vlastní,
existující prezentace**. Skript staré verze sám nahradí.

### 3. Ověřit v prohlížeči (že nahrávání pořád funguje)
`npm run dev` → přihlas se → **Moje prezentace** → prezentace → **2. Fotky** →
nahraj 2–3 JPEG/PNG. Musí projít (náhledy, první = hlavní). Zkus smazat a posunout
šipkami. Když nahrání hlásí chybu s cestou/prezentací, napiš mi — doladíme policy.

### 4. Rychlá kontrola bezpečí (nepovinné, ale doporučené)
V SQL Editoru spusť dva dotazy z `checks/security-check.md` (sekce „Ověření nasazení
úložiště"). Bucket musí být `public = false`, `file_size_limit = 8388608`,
typy `{image/jpeg,image/png,image/webp}`, a musí existovat všechna 4 pravidla.

### 5. Testy a build (u tebe)
`cd ~/Desktop/prezentace-saas/app && npm ci && npm test && npm run build` — testy
**35 passed**, build bez chyby. (Já ověřil: 35/35 testů zelené, typová kontrola
čistá, build projde — v mém prostředí padal jen na stažení Google Fonts, což u tebe
funguje.)

### 6. Push
Až budeš spokojený: `git push` (klidně přes `PUSH_GITHUB.command`).
**Já jsem commitnul, ale NEpushnul** — push je tvůj vědomý krok.

## ⚠ Blokující díra — SaaS zatím NEMŮŽE vydělávat (nález M3 / Codex Medium 4)

Databázová brzda „bez zaplacení nezveřejníš" **funguje a drží**. ALE v kódu
**vůbec neexistuje platební tok**: žádná Stripe závislost, žádné checkout tlačítko,
žádná webhook route, nic nikdy nevytvoří zaplacenou platbu. Prakticky:
**nikdo nemůže zaplatit, tím pádem nikdo nemůže publikovat → produkt nevydělává.**

Tohle je záměrně **neopravené** (je to celý úkol E3.9 Stripe, ne drobnost). Až se
do něj pustíme, musí: bezpečně a **idempotentně** vytvořit `payments.status='paid'`,
ověřit **podpis** webhooku, a cenu brát ze serveru (nikdy z prohlížeče). Do backlogu
patří jako **blokující pro spuštění**. Přidej k úkolu E3.9 (nebo mi řekni a přidám
konektorem, až pojede).

> **AKTUALIZACE 2026-07-14: díra je zalátaná — platební tok je postavený.**
> Viz nová sekce níž.

---

# 2026-07-14 — STRIPE PLATBY (E3.9). Co udělat, ať se dá zaplatit

## Nejdřív poctivé přiznání

**Nespustil jsem testy ani build.** Linuxovému prostředí, ve kterém příkazy pouštím,
došlo v půlce práce místo na disku a už se vůbec nenastartovalo. Nešly proto ani
git commity.

Takže: **kód je hotový a napsaný na disk, ale strojově NEOVĚŘENÝ.** Nebudu ti
tvrdit, že je zeleno, když jsem to neviděl. Prošel jsem si to znovu čtením a našel
a opravil 5 věcí, ale to není náhrada za testy. **První krok níž je proto ověření
u tebe** — a než projde, ber E3.9 jako „hotové, neověřené".

## 0. Ověření a commit (musíš spustit ty) — 5 minut

Otevři Terminál a vlož postupně:

```
cd ~/Desktop/prezentace-saas/app
npm install
npm test
npm run typecheck
npm run lint
npm run build
```

- `npm install` — doinstaluje dvě nové knihovny (`stripe`, `server-only`) a přepíše
  `package-lock.json`. Bez toho nic dalšího nepojede.
- `npm test` — mělo by být **55 passed** (35 původních + 20 nových na platby,
  hlavně na idempotenci webhooku). **Pokud to nesedí nebo něco spadne, pošli mi
  celý výpis — opravím to.**
- `npm run typecheck` a `npm run lint` a `npm run build` — musí projít bez chyby.

Až bude všechno zelené, ulož práci do gitu (já jsem nemohl):

```
cd ~/Desktop/prezentace-saas
git add -A
git commit -m "E3.9: Stripe Checkout + idempotentní webhook, publikace jen po zaplacení"
```

**NEPUSHUJ**, dokud si to neproklikáš (krok 6). Push je pořád tvůj vědomý krok.

## 1. Založ si Stripe účet — 10 minut

1. Jdi na `stripe.com` → **Start now / Sign up**, založ účet na svůj e-mail.
2. Účet se rovnou otevře v **testovacím režimu** (Stripe mu dnes říká „sandbox").
   V testovacím režimu se **nepohnou žádné skutečné peníze** — přesně to teď chceme.
3. Ostrý režim (skutečné platby) vyžaduje vyplnit údaje o firmě, bankovní účet a
   ověření totožnosti. **Tohle zatím NEDĚLEJ** — nejdřív si celý nákup vyzkoušíme
   nanečisto. Ostrý režim zapneme, až bude jisté, že to funguje.

## 2. Vezmi si klíče — 3 minuty

1. Ve Stripu vlevo dole **Developers** → **API keys**
   (přímý odkaz: `dashboard.stripe.com/test/apikeys`).
2. Zkontroluj, že jsi v **testovacím režimu** (přepínač nahoře).
3. Zkopíruj **Secret key** — začíná `sk_test_…` (klikni „Reveal test key").

> **Klíč nikomu neposílej a nedávej do žádného souboru, který jde do gitu.**
> Patří jen do `.env.local` (ten je v `.gitignore`) a do nastavení Vercelu.
> Kdyby ti někdy unikl, ve Stripu ho jde jedním kliknutím zneplatnit („Roll key").

Ostrý klíč (`sk_live_…`) je na stejné stránce po přepnutí do ostrého režimu —
ten budeš potřebovat až na konci, při spuštění naostro.

## 3. Vezmi si ze Supabase servisní klíč — 2 minuty

Platbu do databáze zapisuje server, ne prohlížeč — a k tomu potřebuje zvláštní klíč.

1. `supabase.com/dashboard` → tvůj projekt → **Project Settings** → **API Keys**
2. Zkopíruj **`service_role`** klíč (bude schovaný pod „Reveal").

> Tenhle klíč **obchází veškerá bezpečnostní pravidla databáze**. Je z celého
> projektu ten nejcitlivější. Nikdy ho nedávej nikam do prohlížeče, do kódu ani
> do gitu — jen do `.env.local` a do Vercelu.

## 4. Spusť novou migraci databáze — 3 minuty

`supabase.com/dashboard` → tvůj projekt → **SQL Editor** → **New query** → zkopíruj
a spusť (**Run**) celý obsah souboru:

```
app/supabase/migrations/20260714120000_stripe_payments.sql
```

Musí skončit **Success**. (Jde spustit i opakovaně, nic nerozbije.)

Co ta migrace dělá, laicky:
- přidá k platbám kolonky pro Stripe,
- **zaručí, že jedna platba nemůže být započtená dvakrát** (i kdyby Stripe poslal
  tutéž zprávu dvakrát — což dělá běžně),
- **zaručí, že na jednu prezentaci může běžet jen jeden nákup** (ochrana proti
  dvojkliku),
- a přidá pravidlo: **když se peníze vrátí, prezentace se zase schová** (viz níž).

## 5. Vyplň si to lokálně — 5 minut

V souboru `app/.env.local` (pokud neexistuje, zkopíruj `app/.env.local.example`
a přejmenuj na `.env.local`) doplň:

```
SUPABASE_SERVICE_ROLE_KEY=  ← ze Supabase (krok 3)
STRIPE_SECRET_KEY=sk_test_…  ← ze Stripu (krok 2)
STRIPE_WEBHOOK_SECRET=whsec_…  ← dostaneš v kroku 6
PUBLISH_PRICE_CZK=490
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`NEXT_PUBLIC_SUPABASE_URL` a `NEXT_PUBLIC_SUPABASE_ANON_KEY` už tam z dřívějška máš.

## 6. Vyzkoušej si nákup nanečisto — 15 minut

Tohle je ta nejdůležitější část. **Potřebuješ Stripe CLI** — malý program, který
při vývoji doručuje zprávy ze Stripu na tvůj počítač.

**a) Nainstaluj Stripe CLI** (jednorázově):

```
brew install stripe/stripe-cli/stripe
stripe login
```

`stripe login` otevře prohlížeč a poprosí o potvrzení. Odsouhlas.

**b) Pusť tři věci, každou ve VLASTNÍM okně terminálu:**

Okno 1 — aplikace:
```
cd ~/Desktop/prezentace-saas/app
npm run dev
```

Okno 2 — doručovatel zpráv ze Stripu:
```
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
Vypíše řádek `Your webhook signing secret is whsec_…` — **tenhle `whsec_…` zkopíruj
do `app/.env.local`** jako `STRIPE_WEBHOOK_SECRET` a **v okně 1 restartuj** `npm run dev`
(Ctrl+C a znovu). Okno 2 nech běžet.

**c) Nakup:**

1. V prohlížeči `http://localhost:3000` → přihlas se → **Moje prezentace**
2. U prezentace klikni **Zveřejnit** (nově je to **4. krok** průvodce)
3. Uvidíš cenu 490 Kč → klikni **Zveřejnit a zaplatit 490 Kč**
4. Přesměruje tě to na platební stránku Stripu (bude česky). Vyplň:
   - **číslo karty: `4242 4242 4242 4242`** (testovací karta „vždy projde")
   - datum expirace: cokoli v budoucnu (např. `12/30`)
   - CVC: cokoli trojmístné (např. `123`)
   - jméno a PSČ: cokoli
5. Zaplať → vrátí tě to zpět na stránku **„Platba se zpracovává…"**
6. **Do pár vteřin se sama přepne na „Hotovo — prezentace je venku 🎉"** a ukáže
   veřejný odkaz.

**Co si u toho ověř:**
- V okně 2 (`stripe listen`) proběhne řádek `checkout.session.completed … [200]`
- Prezentace má v „Moje prezentace" štítek **Publikováno**
- Veřejný odkaz `/listing/<slug>` **otevřeš i v anonymním okně** (bez přihlášení) —
  a uvidíš ho. To dřív nešlo.

**d) Vyzkoušej i to, co se může pokazit:**

- **Zrušení platby:** klikni Zveřejnit → na Stripu klikni šipku zpět → vrátí tě to
  s hláškou „Platbu jsi nedokončil(a) — nic jsme ti neúčtovali". Prezentace zůstává
  konceptem. ✔
- **Zamítnutá karta:** zkus kartu `4000 0000 0000 0002` → platba neprojde,
  nic se nezveřejní. ✔
- **Dvojklik:** klikni na „Zveřejnit a zaplatit" a hned znovu → nesmí vzniknout dvě
  platby (tlačítko se samo vypne a v databázi to hlídá pojistka).

## 7. Nastav to na ostro (Vercel + Stripe webhook) — 15 minut

Tohle dělej, **až budeš spokojený s testem** a až budeš mít ostré Stripe klíče.

**a) Proměnné ve Vercelu:**

Vercel → tvůj projekt → **Settings** → **Environment Variables** → přidej
(prostředí: **Production**, případně i Preview):

| Název | Hodnota |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | servisní klíč ze Supabase |
| `STRIPE_SECRET_KEY` | `sk_live_…` (nebo `sk_test_…`, pokud chceš i na webu zatím nanečisto) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` z bodu b) níž |
| `PUBLISH_PRICE_CZK` | `490` |
| `PUBLISH_PRODUCT_NAME` | `Zveřejnění prezentace nemovitosti` |
| `NEXT_PUBLIC_SITE_URL` | tvoje skutečná adresa, např. `https://prodej-si-sam.vercel.app` |

`NEXT_PUBLIC_SUPABASE_URL` a `NEXT_PUBLIC_SUPABASE_ANON_KEY` už tam máš.

> `NEXT_PUBLIC_SITE_URL` je na ostro **povinná**. Bez ní by se dala návratová
> adresa po platbě podvrhnout na cizí web.

**b) Webhook endpoint ve Stripu:**

1. Stripe dashboard → **Developers** → **Webhooks**
   (`dashboard.stripe.com/webhooks`)
2. **Add endpoint** (dnes se to může jmenovat „Create an event destination")
3. **Endpoint URL:** `https://TVOJE-ADRESA/api/stripe/webhook`
4. **Vyber události** — přesně těchhle pět:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `checkout.session.expired`
   - `refund.created`
5. Ulož → u endpointu klikni na **Signing secret** → **Reveal** → zkopíruj `whsec_…`
   → vlož do Vercelu jako `STRIPE_WEBHOOK_SECRET` → **znovu nasaď** (Redeploy).

> **Tohle je nejdůležitější krok celého nastavení.** Bez správně nastaveného
> webhooku zákazník zaplatí, ale prezentace se nezveřejní. (Máme sice záchrannou
> brzdu — tlačítko „Ověřit platbu" na návratové stránce, které se zeptá Stripu
> přímo — ale spoléhat se na ni nechceme.)

**c) Zkontroluj, že webhook chodí:** ve Stripu u endpointu je záložka
**Event deliveries** — po prvním nákupu tam musí být zelené `200`.

---

## Jak to celé funguje (laicky, ať víš, čemu věříme)

Uživatel klikne **Zveřejnit** → my u Stripu založíme platbu a pošleme ho na jeho
platební stránku → zaplatí → vrátí se k nám.

**Ale:** to, že se prohlížeč vrátil, pro nás **neznamená vůbec nic** — takovou adresu
si může kdokoli napsat sám a publikovat bez placení. Proto návratová stránka jenom
řekne „platba se zpracovává" a čeká.

Zveřejnit smí jedině **zpráva od Stripu poslaná přímo na náš server** (webhook),
která nese **podpis** — a ten umí vyrobit jen Stripe, protože zná tajný klíč.
Bez platného podpisu zprávu zahodíme.

A protože Stripe tutéž zprávu občas pošle dvakrát, vedeme si **knihu už zpracovaných
zpráv**. Druhé doručení té samé zprávy prostě přeskočíme — nikdo nezaplatí dvakrát.

## Co jsem rozhodl za tebe (a proč) — řekni, jestli souhlasíš

1. **Cena 490 Kč** — jen výchozí hodnota, ať se dá vůbec testovat. Není nikde v kódu,
   je to nastavení (`PUBLISH_PRICE_CZK`). **Změníš ji sám, bez programátora.**
   Minimum je 15 Kč (pod to Stripe neúčtuje).
2. **Po zaplacení se prezentace zveřejní sama** (žádné další tlačítko). Vyplývá to
   z toho, jak jsi to popsal: „klikne Zveřejnit → zaplatí → vrátí se". Kdybys chtěl,
   ať po zaplacení ještě čeká na potvrzení, řekni — je to malá změna.
3. **Vrácení peněz = prezentace se schová zpět do konceptu.** ← **Tohle je
   nejdůležitější rozhodnutí, potvrď ho.**
   *Proč:* zaplaceno = zveřejněno je celý náš obchodní model. Kdyby po vrácení peněz
   zůstala prezentace veřejně viset, dal by se produkt používat zdarma (zaplatit,
   nechat zveřejnit, požádat o vrácení peněz, inzerát běží dál). Zamkl jsem to
   **přímo v databázi**, ne jen v aplikaci — takže to drží, i kdyby se v kódu něco
   pokazilo. Peníze uživateli vracíš ty, ručně, ze Stripe dashboardu; prezentace
   zmizí z veřejné adresy sama do pár vteřin. Data se **nemažou** — zůstane koncept
   a jde ho znovu zveřejnit novou platbou.
   *Kdybys chtěl jinak* (např. „vracím peníze, ale inzerát nechávám doběhnout"),
   řekni — jde to změnit.
4. **„Zveřejnit" je nový 4. krok průvodce** (Základ → Fotky → Texty → **Zveřejnit**)
   a přibyl i jako tlačítko v „Moje prezentace" u nepublikovaných. Sedí?
5. **Zveřejnit jde i prezentaci bez fotek** — jen na to slušně upozorníme.
   Nebránil jsem v tom. Chceš to zakázat?
6. **Opuštěný nákup propadne po hodině** a uživatel může zkusit znovu.

## Co se může pokazit a jak to poznáš

- **Zákazník zaplatí a nic se nezveřejní** → skoro jistě špatně nastavený webhook
  (krok 7b). Poznáš to ve Stripu: **Developers → Webhooks → Event deliveries** budou
  červené. Zákazník má záchranu: tlačítko **„Ověřit platbu"** na návratové stránce
  se zeptá Stripu přímo a zveřejní to.
- **Nejde spustit platba** („Platby zatím nejsou nastavené") → chybí některý klíč
  v prostředí. Zkontroluj `STRIPE_SECRET_KEY` a `SUPABASE_SERVICE_ROLE_KEY`.
- **Rollback kódu:** `git log --oneline` a `git revert <číslo commitu>`.
- **Rollback migrace:** nová migrace jen *přidává* pojistky, nic nemaže. Kdyby vadila,
  poradíme se — ruční mazání unikátních indexů dělat nechceš.

## ⚠ Co jsem NEudělal

- **Neověřil jsem to strojově** (testy/build/lint) — viz krok 0. To je na tobě.
- **Neproklikal jsem to v prohlížeči** — nemám tvoje Stripe klíče ani databázi.
  Skutečné „hotovo" je až po kroku 6.
- **Necommitnul jsem** — příkaz je v kroku 0.
- **Nepushnul jsem.**

---

# 2026-07-15 — OTÍNSKÁ: stavebnice sekcí (kolo 1) + kolo 2/3 (půdorysy, mapy, POI, reference, novinky, panorama)

## Poctivé přiznání (jako minule)

**Nespustil jsem testy, build ani migrace** — prostředí, kde příkazy pouštím, bylo
mimo provoz (došlé místo). **Kód je hotový a na disku, ale strojově NEOVĚŘENÝ.**
Neříkám, že je zeleno, když jsem to neviděl. Prošel jsem to dvěma nezávislými
revizemi (čtením) a opravil nálezy — ale to není náhrada za testy. První krok je
proto ověření u tebe. Do té doby ber celou věc jako **hotové-neověřené**.

## Co je nového (laicky)

Prezentace už není 3 napevno bloky, ale **stavebnice sekcí**: v průvodci přibyl
**krok „Sekce"** (nově Základ → Fotky → Texty → **Sekce** → Zveřejnit), kde sekce
přeskládáš, zapneš/vypneš, přidáš a vyplníš. Umí se těchto **16 typů** sekcí:
úvodní blok (hero), text, parametry+PENB, galerie s popisky, mapa, přednosti,
dokumenty ke stažení, porovnání cen/odhady, technický stav, kontakt (kolo 1) —
a nově **půdorysy pater, analytické mapy, body zájmu, reference, novinky, panorama**
(kolo 2/3). Ještě zamčené (přijde později): video, investiční kalkulačka, chatbot.

Veřejná stránka `/listing/<slug>` renderuje **jen zapnuté sekce ve tvém pořadí**.
Nedodělané sekce se návštěvníkovi nezobrazí.

## Udělej v tomhle pořadí

### 1. Migrace databáze
`supabase.com/dashboard` → SQL Editor → New query → vlož a **Run** celý obsah
**`app/supabase/APLIKUJ_VSE.sql`** (idempotentní — jde spustit i opakovaně; obsahuje
kolo 1 i 2/3 najednou). Dole musí být v kontrolní tabulce ve sloupci `stav`
**všude ✅ je**. Kde je ❌ (hlavně buckety `presentation-documents` a
`presentation-media`, kdyby Supabase nepustil `storage.*` z editoru), napiš mi.

Na Macu si obsah zkopíruješ do schránky takhle:
```
cat "~/Desktop/prezentace-saas/app/supabase/APLIKUJ_VSE.sql" | pbcopy
```

### 2. Ověření kódu (u tebe)
```
cd ~/Desktop/prezentace-saas/app
npm test && npm run typecheck && npm run lint && npm run build
```
Testy jsem **nespouštěl** — neuvádím číslo. Když něco spadne, pošli mi výpis, opravím.

### 3. Klik v prohlížeči
`npm run dev` → přihlas se → prezentace → krok **Sekce**. Přidej pár sekcí
(např. Půdorysy, Analytické mapy, Body zájmu), vyplň je, u obrázkových sekcí nahraj
obrázky, přeskládej šipkami, něco vypni. Pak **Náhled ↗** a zkontroluj, že se
sekce zobrazují ve zvoleném pořadí a nic se nerozbilo.

### 4. Commity (rozdělené) — z kořene repa
Přesné příkazy jsou ve zprávě v chatu (rozdělené na 1A/1B/1C a kolo 2/3). Kvůli
hranatým závorkám v cestách používej `GIT_LITERAL_PATHSPECS=1 git add '…'`.

## ⚠ Co vyžaduje TVŮJ klíč nebo službu (zatím NEHOTOVO — schválně)

Nic z toho jsem **nefejkoval**. Postavené je jen to, co jde bez cizí služby.

1. **Body zájmu (POI) — automatické načítání z Google Places** = BUDOUCNOST.
   Teď funguje **ruční** zadávání míst (název, kategorie, vzdálenost) — to stačí a
   nic nestojí. Živé napojení na mapy (aby se místa v okolí načetla sama) vyžaduje
   **Google Maps / Places API klíč** a je **placené** (podle počtu dotazů).
   - *Co zařídit, až budeš chtít:* v Google Cloud Console založit projekt, zapnout
     **Places API**, vygenerovat API klíč, dát ho do prostředí (např.
     `GOOGLE_PLACES_API_KEY` ve Vercelu). Pak doděláme tlačítko „načíst okolí".
   - Do té doby zůstává ruční zadávání — je plně funkční.

2. **360° panorama — interaktivní otáčení** = BUDOUCNOST.
   Teď: nahraješ panorama fotku a na veřejné stránce se ukáže jako **velký obrázek**
   s poznámkou „interaktivní 360° otáčení připravujeme". Skutečné otáčení potřebuje
   3D knihovnu (např. Pannellum / Three.js) — nechtěl jsem ji přidávat naslepo bez
   možnosti to u sebe ověřit, a hlavně **nefejkovat** interaktivitu, která nefunguje.
   - *Co zařídit:* nic od tebe (žádný klíč). Je to čistě práce na příště — až bude
     jak ověřit, přidám lehký prohlížeč panoramat.

3. **Analytické mapy** — tady **žádný klíč netřeba**. Obrázky map (screenshoty
   z hlukových / oslunění / dopravních map) **nahráváš ty** a k nim napíšeš „proč
   je to důležité". Na veřejné stránce se ukážou v tabech. Hotové a plné.

## Nový bucket úložiště

Kolo 2/3 přidalo privátní bucket **`presentation-media`** (obrázky půdorysů, fotek
místností, analytických map a panoramat; max 15 MB, jen JPEG/PNG/WebP). Zakládá ho
`APLIKUJ_VSE.sql` sám. Veřejně jsou tyhle obrázky čitelné **jen u publikované**
prezentace (stejná logika jako u fotek).

## Rizika / rollback

- **Riziko:** velká změna editoru i veřejné stránky. Pojistka „nikdy prázdno"
  (když nejsou sekce, dopočítají se výchozí) + staré sloupce se nemažou.
- **Rollback:** migrace je aditivní (nové tabulky/bucket/funkce); kód přes
  `git revert`. Stará cesta funguje dál.
- **Neověřeno strojově** — viz krok 2. Skutečné „hotovo" je až po tvém testu + kliku.
