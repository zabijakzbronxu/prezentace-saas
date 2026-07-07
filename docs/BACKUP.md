# Plán zálohování a obnovy — NÁVRH ke schválení (2026-07-07)

> Stav: **návrh od AI, čeká na schválení Karla.** Podle backlogu má být hotový
> dřív, než v produkci budou reálná data uživatelů. Zatím nic nespouštíme.

## Co všechno tvoří data projektu (a kde bydlí)

| Data | Kde bydlí | Jak se ztratí |
|---|---|---|
| Kód aplikace | git (lokálně + GitHub po pushi) | smazání složky bez pushe |
| Databáze (uživatelé, prezentace, platby) | Supabase Postgres | omyl v SQL, smazání projektu, chyba migrace |
| Fotky | Supabase Storage (bucket `presentation-photos`) | smazání bucketu/projektu |
| Nastavení (Auth, Storage policies, env klíče) | Supabase dashboard + `.env` u Karla | znovunastavování zpaměti |

## Navržený plán (minimální, bez nové infrastruktury)

1. **Kód:** po každé odsouhlasené dávce `git push` na GitHub (už děláme).
   GitHub je tím pádem záloha kódu — nic dalšího netřeba.
2. **Databáze:** Supabase dělá **denní automatické zálohy** na placeném tarifu
   (Pro). Na free tarifu automatické zálohy NEJSOU → dokud jsme na free:
   jednou týdně (a vždy před větší migrací) ruční export:
   SQL Editor → spustit `pg_dump` přes dashboard **Database → Backups →
   Download**, případně tabulky exportovat přes Table Editor → CSV.
   Soubor uložit do složky `zalohy/` mimo git (obsahuje osobní údaje!).
3. **Fotky:** na free tarifu stáhnout obsah bucketu ručně (Storage →
   presentation-photos → vybrat vše → Download) při týdenní záloze DB.
   Později (až bude víc dat) skript přes service_role klíč.
4. **Nastavení:** všechny kroky nastavení držíme v repu jako návody
   (`app/supabase/README.md`, `storage-setup.md`, migrace) — projekt jde
   z nich postavit znovu. Env klíče má Karel v `.env` (mimo git) —
   doporučení: uložit kopii do správce hesel.

## Zkouška obnovy (pravidlo z RULES.md: zálohám bez zkoušky obnovy se nevěří)

Jednou za měsíc (nebo po první reálné platbě — co nastane dřív):
1. Založit v Supabase **druhý, testovací projekt**.
2. Spustit do něj všechny migrace z `app/supabase/migrations/` (v pořadí).
3. Nahrát poslední zálohu DB a namátkou zkontrolovat: uživatelé, prezentace,
   fotky (cesty sedí na stažené soubory).
4. Zapsat výsledek zkoušky do `tasks/todo.md` (datum + prošlo/neprošlo).

## Kdy plán povýšit

- Jakmile bude první platící uživatel → přejít na Supabase Pro (automatické
  denní zálohy + point-in-time recovery) a týdenní ruční kolečko zrušit.
- Jakmile fotek bude víc než ~1 GB → skript na zálohu Storage.

## Co teď potřebuju od Karla

1. Schválit/upravit tenhle plán (klidně slovně, já ho zapracuju).
2. Říct, jestli už teď platí Supabase Pro, nebo jsme na free tarifu —
   podle toho platí bod 2 (ruční vs. automatické zálohy).
