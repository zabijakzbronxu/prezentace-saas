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
