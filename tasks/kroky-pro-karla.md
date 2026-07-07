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

## 2. Spustit tři nové migrace databáze (4 minuty)

Přibyly dva textové sloupce („Lokalita a okolí", „Vybavení a přednosti"),
pojistka délek u kontaktních údajů a pojistka délek u profilu.

1. `supabase.com/dashboard` → tvůj projekt → **SQL Editor** → **New query**
2. Postupně zkopíruj a spusť (**Run**) obsah těchto tří souborů, v pořadí:
   - `app/supabase/migrations/20260706100000_text_sections.sql`
   - `app/supabase/migrations/20260706150000_contact_checks.sql`
   - `app/supabase/migrations/20260707090000_profile_checks.sql`
3. Všechny musí skončit **Success**. Jdou spustit i dvakrát, nic se nerozbije.

## 3. Zapnout úložiště fotek (5 minut)

Podle návodu `app/supabase/storage-setup.md`:
bucket `presentation-photos` (privátní, 8 MB, JPEG/PNG/WebP) + 4 bezpečnostní
pravidla. Bez tohohle kroku fotky nepůjdou nahrát (aplikace to řekne hláškou).

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
