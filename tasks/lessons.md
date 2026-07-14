# lessons.md — poučení z chyb

Po každé korekci od Karla sem zapiš vzorec chyby a pravidlo, které ji příště nedovolí (a doplň ho do RULES.md).

## 2026-07-14 — migrace se aplikují ručně → databáze se rozejde s kódem
Vzorec 1: **projekt nemá `supabase link`**, migrace Karel kopíruje do SQL Editoru ručně. Jednu přeskočí a aplikace padá na `column … does not exist`. Nic mu neřeklo, KTERÁ migrace chybí.
Pravidlo: držet v repu **`app/supabase/APLIKUJ_VSE.sql`** — konsolidovaný, idempotentní skript se všemi migracemi + Storage. Při každé nové migraci ho aktualizovat. Karel má jednu instrukci: „vlož a spusť", ne „najdi, co ti chybí".

Vzorec 2: **tichá chyba místo hlasité.** Stránky logovaly chybu do konzole a pak ukázaly „Prezentace nenalezena" / prázdný seznam. Chybějící sloupec tak vypadal jako chybějící data — a poslal hledat úplně jinam.
Pravidlo: `data === null` **není** totéž co „chyba dotazu". Chybu vždy rozlišit a u chybějícího schématu (kódy 42703 / 42P01 / 42883 / PGRST202 / PGRST204) ukázat konkrétní hlášku s návodem. Viz `lib/db-errors.ts` + `app/schema-error.tsx`.

Vzorec 3: **Supabase SQL Editor jede celý skript v JEDNÉ transakci.** Jediný `create unique index`, který spadne na duplicitě v datech, rollbackne úplně všechno — a Karel nevidí žádný efekt, jen kryptickou hlášku.
Pravidlo: v konsolidovaném skriptu obalit rizikové kroky (unikátní indexy, sahání na `storage.*`) do `do $$ … exception when … raise notice … end $$;` a na konec dát **kontrolní SELECT**, který vypíše, co existuje a co ne. Nikdy nespoléhat na to, že skript buď projde celý, nebo je vidět proč ne.

## 2026-07-05 — git zámky v Cowork sandboxu (technické, ne korekce od Karla)
Vzorec: na mountu Desktopu jde soubory v `.git` vytvořit, ale ne smazat (`rm` → „Operation not permitted"). Každý git příkaz proto nechá stale `index.lock` / `HEAD.lock` / `next-index-*.lock`, který zablokuje ten další.
Pravidlo pro příště:
- Zámky NEmazat přes `rm` (nejde) — přesouvat stranou souborovým nástrojem (`move` na `*.stale`), viz MEMORY.md.
- Před KAŽDÝM git příkazem odklidit všechny `.git/*.lock`.
- Commit dělat jedním příkazem `git commit <cesta> -m …`, ne `git add` + `git commit` (dvojnásobek zámků).
- Po dokončení odklidit poslední `index.lock`, aby Karlův `git push` na jeho stroji neselhal.

## 2026-07-07 — nálezy křížové revize (technické vzorce, ne korekce od Karla)
Vzorec 1: formuláře validované „redirect s chybou v URL" zahazovaly rozepsaný text (formulář se předvyplnil starými hodnotami z DB).
Pravidlo: chybu formuláře vracet NA MÍSTĚ (useActionState), přesměrovávat jen při úspěchu. U dlouhých textů zásadní.
Vzorec 2: „přečti a pak zapiš" (počet fotek, další pořadí, hero) bez zámku → dvě záložky umí vyrobit duplicitní pořadí / dvě hero.
Pravidlo: vícekrokové zápisy dělat v DB funkci v jedné transakci pod zámkem (pg_advisory_xact_lock), ne v aplikaci.
Vzorec 3: volný text chyby v URL (?error=...) umí kdokoli podvrhnout odkazem — vypadá pak jako hláška aplikace.
Pravidlo: přes URL posílat jen KÓD chyby, texty drží stránka.

## 2026-07-13 — revize průvodce E2.x (vzorce, potvrzené i Codexem)
Vzorec 1: **bezpečnostní hranice žijící jen v ručním návodu** (Storage bucket +
policies v `storage-setup.md`, ne v migraci) → celá ochrana stojí a padá na tom,
jestli to Karel v dashboardu naklikal správně. Nic to neověří.
Pravidlo: co je bezpečnostní hranice, vynucuj **v SQL** (bucket přes
`insert into storage.buckets … on conflict do update`, ne jen políčka v UI)
a přidej **ověřovací dotaz** do `checks/`. Kde SQL na `storage.*` neprojde, aspoň
verifikace musí existovat.
Vzorec 2: **validace jen v prohlížeči** (velikost, typ podle magic bytes) u přímého
uploadu do Storage → obejitelné devtools. Serverová akce ověřovala jen tvar cesty,
ne obsah.
Pravidlo: u „klient → přímo do úložiště" je jediná reálná obrana **na úrovni
bucketu** (`allowed_mime_types`, `file_size_limit`) + policy vázaná na vlastnictví;
klientská kontrola je jen UX, nikdy se na ni nespoléhat.
Vzorec 3: **komentář slibující „pojistku přímo v DB", která tam není** (tvar cesty
hlídala jen funkce, ne tabulka). Nebezpečné: falešný pocit bezpečí.
Pravidlo: když komentář tvrdí „vynuceno v DB", musí to být constraint/trigger na
tabulce, ne jen kontrola uvnitř jedné funkce, kterou lze obejít přímým PostgREST.
Vzorec 4 (proces): křížová revize Codexu našla skoro totéž co paralelní subagenti →
**víc nezávislých očí se vyplácí**, ale klasifikace se liší (DoS: já Medium, Codex
High). Brát přísnější klasifikaci vážně a nechat rozhodnout dopad, ne ego.

## 2026-07-14 — málem jsem vykázal zelenou, kterou jsem neviděl (korekce od Karla)
Vzorec: rozepsal jsem si plán do `tasks/todo.md` a v něm rovnou odškrtl
„✅ 47 testů zelených, build prošel" — **jako plán, ne jako fakt**. Testy přitom
neproběhly (sandboxu došlo místo na disku a nešel nastartovat). Kdyby si to Karel
nepřečetl pozorně, dostal by falešnou jistotu — u PLATEB to je ta nejhorší možná
lež, jakou může dokumentace obsahovat.
Pravidlo (přidat do RULES.md):
- **Do dokumentace se výsledek zapisuje AŽ PO tom, co ho vidím na obrazovce.**
  Nikdy dopředu, ani „jako plán". Plán se píše v budoucím čase a bez ✅.
- Když ověření nejde spustit, napsat to **nahoru a tučně** a označit práci jako
  **HOTOVÉ-NEOVĚŘENÉ**, ne jako hotové.
- Nikdy neuvádět konkrétní číslo („47 testů"), které jsem nenaměřil.
Vzorec 2 (proces): když padne nástroj (sandbox), správná reakce je **zastavit,
přeplánovat a říct to hned** — ne to obcházet a doufat. Karel to musel navrhnout
sám; měl jsem to udělat dřív.

## 2026-07-14 (2) — české uvozovky uvnitř JS/TS řetězců (opakovaný vzorec, už podruhé)
Vzorec: v kódu píšu česky, včetně typografických uvozovek `„…"`. Jenže **zavírací
uvozovka `"` je v těchhle souborech obyčejný ASCII znak**, ne typografický `"`.
Uvnitř řetězce v dvojitých uvozovkách proto string předčasně ukončí:
`it("„completed" u nezaplacené…")` → `Expected ")" but found "u"`. Celý test/build
padne na syntaxi. Stalo se to už v CRM, teď znovu tady (2 výskyty:
`payments.test.ts:328`, `waiting.tsx:54`) — takže to NENÍ náhoda, ale můj návyk.
Pravidlo pro příště:
- **Do řetězce v dvojitých uvozovkách nikdy nepsat `„ " ‚ '`.** Když text potřebuje
  české uvozovky, obal řetězec **apostrofy** (`'„Ověřit platbu" …'`) nebo použij
  backtick. Prettier si toho všimne a apostrofy nechá.
- V **komentářích, JSX textu a template literálech** `„…"` nevadí — problém je jen
  uvnitř `"…"`. Nepřepisovat je zbytečně.
- Než něco odevzdám, projet repo: `rg '„[\p{L}0-9 ,.@]*"' --glob '*.{ts,tsx,js,jsx}'`
  a u každého výskytu se zeptat: je to uvnitř `"…"`? Pak je to rozbité.
- Pozor i na obrácený případ: ASCII `'` (apostrof) uvnitř `'…'` — táž třída chyby.

Vzorec 2 (opakuje se z dnešního rána, viz výš): sandbox znovu **nenastartoval**
(hostiteli došlo místo, `useradd: No space left on device`) → `npm test`,
`typecheck`, `lint`, `build` ani `npm audit` NEBĚŽELY.
Pravidlo (platí bez výjimky): **ověření, které neproběhlo, se neodškrtává.** Ani
v todo.md, ani ve shrnutí, ani „jako plán". Když nástroj nejde spustit, řeknu to
rovnou nahoře, práci označím **HOTOVÉ-NEOVĚŘENÉ** a dodám Karlovi příkazy, aby si
to spustil sám. Žádná čísla, která jsem neviděl na obrazovce.

## 2026-07-14 (3) — `next lint` v Next 16 neexistuje (nález od Karla)
Vzorec: skript `"lint": "next lint"` v Next 16 padá s `Invalid project directory
provided, no such directory: …/app/lint` — příkaz byl odstraněn, takže Next bere
slovo „lint" jako název adresáře. Chyba vypadá jako rozbitá cesta, ale je to
zrušený příkaz. Navíc v repu **vůbec nebyl eslint** (ani balíček, ani konfigurace)
— `next lint` si to dřív řešil sám, takže tu chyběl tichý kus kontroly.
Pravidlo: lint spouštět přímo `eslint` + flat config `eslint.config.mjs` a
`eslint` / `eslint-config-next` (verze = verze `next`) mít v devDependencies.
Když už stejný problém někde v mých projektech vyřešený je (tady `stavby-crm`),
**podívat se tam a zkopírovat to**, ne vymýšlet vlastní variantu.

## 2026-07-05 — npm na mountu neumí atomické operace
Vzorec: `npm ci`/`npm install` na mountu padá na `rename`/`unlink` („ENOTEMPTY", „Operation not permitted"), node_modules zůstane rozbité.
Pravidlo: build ověřovat v čisté kopii mimo mount (`rsync` do `/tmp`, tam `npm ci` + `npm run build`). Reálnou instalaci `node_modules` udělá Karel u sebe (`npm ci`) — na jeho nativním systému problém není.
