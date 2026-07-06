# Kroky pro Karla — po session 2026-07-06 (editace + fotky + texty)

Co je nového v kódu (zatím jen u tebe na disku, NEpushnuto):
prezentace jde **upravit** (krok 1 — Základ), přibyl krok **2 — Fotky**
(nahrávání, pořadí, hlavní fotka, mazání) a krok **3 — Texty** (titulek,
popis/příběh, lokalita, vybavení). Všechno drží pohromadě průvodce
Základ → Fotky → Texty a odkaz „Upravit" v Moje prezentace.

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

## 2. Spustit novou migraci databáze (2 minuty)

Přibyly dva textové sloupce („Lokalita a okolí", „Vybavení a přednosti").

1. `supabase.com/dashboard` → tvůj projekt → **SQL Editor** → **New query**
2. Zkopíruj celý obsah souboru
   `app/supabase/migrations/20260706100000_text_sections.sql` a spusť (**Run**).
3. Musí skončit **Success**. Jde spustit i dvakrát, nic se nerozbije.

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

## 5. Poslat na GitHub

Až budeš spokojený: `git push` (klidně přes `PUSH_GITHUB.command`).

## 6. ClickUp

V téhle session nebyl ClickUp konektor dostupný, takže backlog aktualizuj ručně
(nebo to nech na příští session s konektorem):
- **E2.4** (formulář/editace prezentace) → hotovo/urči stav dle svého
- **E2.5 Fotky** → „in progress" (kód hotový, čeká na bucket + tvoje ověření)
- **E2.6 Texty** → „in progress" (kód hotový, čeká na migraci + tvoje ověření)

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
