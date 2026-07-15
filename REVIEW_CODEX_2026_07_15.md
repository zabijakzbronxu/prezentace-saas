# REVIEW_CODEX_2026_07_15 — oprava bezpečnostních nálezů (Otínská, kola 1–4)

**Datum:** 2026-07-15
**Rozsah:** dnešní práce — stavebnice sekcí a kola 1–4 (migrace `20260715120000`,
`20260715140000`, `20260715160000`), veřejná stránka `/listing/[slug]`,
editor sekcí, uploadery médií a dokumentů, `lib/presentations/sections.ts`.
**Podnět:** nezávislá revize (OpenAI Codex) — 5× High, 3× Medium.
**Metoda:** každý nález nejdřív **ověřen řádek po řádku v kódu** (potvrzeno/vyvráceno),
teprve pak opraven. Cíl: hráze musí držet i proti **přímému volání Supabase
REST/Storage API**, ne jen v UI.

> ⚠️ **STROJOVĚ NEOVĚŘENO.** Sandbox v této session je bez místa na disku, takže
> `npm test`, `typecheck`, `lint` ani `build` **neběžely**. Práce je
> **HOTOVÁ-NEOVĚŘENÁ** — příkazy k ověření jsou dole (sekce „Kroky pro Karla“).
> Žádné číslo testů, které jsem sám neviděl, tu není.

---

## Laický souhrn pro Karla

Codex našel na dnešní práci díry, které by po spuštění mezi lidi z internetu
vadily. Nejdůležitější: (1) **vypnuté sekce a jejich dokumenty/obrázky šly stáhnout
oklikou** (mimo web, přímým dotazem do databáze), i když je na stránce nevidíš;
(2) **majitel si mohl do své vlastní prezentace propašovat nebezpečný odkaz**
(`javascript:…`), který by pak škodil návštěvníkům jeho stránky. Obojí je opravené
tak, aby to drželo i „zezadu“, ne jen na oko.

Co musíš udělat ty: spustit jednu SQL migraci (`APLIKUJ_VSE.sql`) a pak nechat
projít kontroly (`npm test`, `build`). Přesné příkazy jsou dole.

---

## Přehled nálezů

| # | Třída | Oblast | Ověření | Stav |
|---|---|---|---|---|
| H1 | High | RLS `presentation_sections` pouští veřejně i vypnuté sekce | **potvrzeno** | opraveno |
| H2 | High | Dokumenty veřejné bez ohledu na zapnutí sekce | **potvrzeno** | opraveno |
| H3 | High | `presentation-media` veřejné jen podle cesty | **potvrzeno** | opraveno |
| H4 | High | Média bez DB registrace ani limitu (flooding) | **potvrzeno** | opraveno |
| H5 | High | Stored XSS: `valuation`/`news` URL do `<a href>` | **potvrzeno** (render); zápis už hlídán | opraveno |
| M1 | Medium | Whitelist `add_presentation_section()` obejitelný přímým insertem | **potvrzeno** | opraveno |
| M2 | Medium | Validace typu/velikosti souboru hlavně klientská | **potvrzeno částečně** (bucket limity už jsou) | zpevněno |
| M3 | Medium | Tichá selhání na veřejné stránce | **potvrzeno** | opraveno |

---

## HIGH

### H1 — RLS `presentation_sections` pouští veřejně i VYPNUTÉ sekce
**Ověření (potvrzeno).** Migrace `20260715120000_otinska_sections.sql:289–293`:
politika `sections public read published` má `using (exists … p.status = 'published')`
— **nekontroluje `enabled`**. Anon tak přes PostgREST (`/rest/v1/presentation_sections?...`)
přečte i sekce s `enabled=false` včetně jejich `content` JSONB. Ve `page.tsx:186–188`
se sice vypnuté sekce filtrují (`r.enabled`), ale to je jen UI — API je nechráněné.

**Oprava.** Anon SELECT politika nově vyžaduje `enabled = true` **A** `p.status='published'`.
Vlastník má dál `sections owner all` (vidí a mění vše, i vypnuté). Vynuceno v DB
(nová migrace + `APLIKUJ_VSE.sql`).

### H2 — Dokumenty veřejné bez ohledu na zapnutí sekce
**Ověření (potvrzeno).** DB politika `documents public read published`
(`…_otinska_sections.sql:303–307`) i Storage politika (`:804–819`) váží veřejné čtení
jen na `p.status='published'` + tvar cesty, **ne na to, že je sekce `documents`
zapnutá**. `page.tsx:204` sice dokumenty načítá jen když je sekce zapnutá, ale přes
API jdou vytáhnout řádky i podepsané/veřejné soubory z vypnuté sekce.

**Oprava.** Veřejné čtení dokumentů (DB řádek i Storage objekt) nově vyžaduje
**existující zapnutou (`enabled=true`) sekci `documents`** publikované prezentace.
Vlastník beze změny.

### H3 — `presentation-media` veřejné jen podle cesty + published
**Ověření (potvrzeno).** Storage politika `media public read published`
(`20260715140000_otinska_round23.sql:120–133`) pouští čtení podle **cesty** (2. složka =
published prezentace, 1. složka = vlastník). Žádná vazba na DB řádek ani na to, že
obrázek patří **zapnuté** sekci. Osiřelé nebo z vypnuté sekce vyřazené obrázky
v prefixu jsou tak veřejné. Navíc **pro média neexistuje žádná tabulka** — cesty
bydlí jen v JSONB `content` sekce.

**Oprava.** Zavedena tabulka `presentation_media` (DB řádek na každý registrovaný
obrázek, `section_id` s `on delete cascade`). Veřejné čtení média (Storage i řádek)
nově přes **EXISTS join na `presentation_media` → zapnutá sekce → published**
prezentace (vzor `presentation-photos`). Smazání/vypnutí sekce ⇒ obrázky přestanou
být veřejné.

### H4 — Upload flooding: média bez DB registrace ani limitu
**Ověření (potvrzeno).** `media-editors.tsx:58–62` nahraje obrázek přímo do bucketu,
cesta se uloží jen do JSONB — **žádný DB řádek, žádný limit**. Upload politika
(`round23:84–98`) hlídá jen tvar cesty + vlastnictví prezentace. Přihlášený uživatel
tak skriptem zaplaví vlastní prefixy. U dokumentů limit (30) existuje, ale kontroluje
se **až v registraci po uploadu** (`…_otinska_sections.sql:594`).

**Oprava.** Média mají stejný registrační mechanismus jako fotky/dokumenty:
DB řádek (`presentation_media`) + RPC `sync_presentation_media(...)` s **limitem na
prezentaci vynuceným v DB** (`MAX_MEDIA_PER_PRESENTATION`). Veřejné čtení (H3) je
navázané na tuhle registraci. Registrace probíhá server-side při uložení sekce
(`saveSection`), takže odpovídá skutečně použitým cestám (žádné sirotčí řádky).
Poznámka k paritě: syrové nahrání objektů do vlastního prefixu (bez registrace)
zůstává možné stejně jako u fotek — takové objekty ale **nejsou veřejné** (chybí
řádek) a registrací je zastropovaný počet veřejně servírovaných médií.

### H5 — Stored XSS: `valuation` a `news` renderují `item.url` do `<a href>`
**Ověření (potvrzeno na renderu).** `page.tsx:620` (`valuation`) a `:779` (`news`)
dávají `item.url`/`it.url` přímo do `href`. Zápis přes server action **už je hlídán**
(`actions.ts:431` a `:536` pouští jen `^https?://`), ALE to jde obejít přímým
PostgREST PATCH na `presentation_sections.content` (vlastník smí měnit svůj JSONB) →
`javascript:` URL se dostane do DB a na **veřejné stránce** zasáhne návštěvníky.
Takže render je skutečná díra, zápis jen pojistka.
- `contact` (`:682` `tel:`, `:687` `mailto:`) — **ověřeno bezpečné**: schéma je pevná
  předpona, uživatel ho nezmění na `javascript:`.
- `poi` (`renderPoi`) — **ověřeno**: nerenderuje žádné `href` (model nemá URL).
- `video` — už bezpečné (`parseVideoUrl` staví embed z ověřeného ID).

**Oprava (belt-and-suspenders).** (a) Nová funkce `safeExternalUrl()` v `sections.ts`
povolí jen `http:`/`https:` (staví na `new URL`, takže chytí i obfuskaci
`java\tscript:` — parser tab/newline odstraní stejně jako prohlížeč). Použita v
`readValuationContent`/`readNewsContent` → **každá uživatelská URL je při čtení pro
render zneškodněná**, ať se do DB dostala jakkoli. (b) Validace při zápisu zůstává.

---

## MEDIUM

### M1 — Whitelist `add_presentation_section()` obejitelný přímým insertem
**Ověření (potvrzeno).** RLS `sections owner all` (`…_otinska_sections.sql:283–288`)
pustí vlastníka přímo `INSERT` do `presentation_sections` mimo RPC. CHECK
`presentation_sections_kind_ck` povoluje všech 19 typů (včetně `chatbot`, který RPC
zakazuje) a **žádný unikátní index na singletony neexistuje** → přímým insertem jdou
udělat duplicitní hero/gallery/…, sekce `chatbot`, libovolné pozice.

**Oprava (v DB).** (1) **Unikátní parciální index** `(presentation_id, kind)` na
singleton typy — dvě hero/gallery/… atomicky nejdou. (2) **Trigger** `BEFORE INSERT`,
který pustí jen typy z whitelistu (= „ready“ typy jako v RPC; `chatbot` a jiné
nedodělané odmítne). Integritu tak drží DB, ne jen RPC.

### M2 — Validace typu/velikosti souboru hlavně klientská
**Ověření (potvrzeno částečně — hlavní hráz už existuje).** Klient kontroluje
velikost a magic bytes (`media-editors.tsx:45–56`, `documents-uploader.tsx:56–68`),
server jen tvar cesty (`actions.ts:704`, `keepMediaPath`). ALE hlavní serverová hráz —
**`allowed_mime_types` + `file_size_limit` na bucketu** — **už nastavená je pro OBA
buckety**: `presentation-documents` (`…_otinska_sections.sql:753–759`) i
`presentation-media` (`round23:69–75`). Ověřeno.

**Oprava/zpevnění.** Bucketové limity potvrzené a ponechané (jsou v migraci i
v `APLIKUJ_VSE.sql`, kontrolní SELECT je hlídá). Registrace média nově ověřuje tvar
cesty i v DB (RPC `sync_presentation_media`), stejně jako fotky/dokumenty. Klientská
kontrola zůstává jen jako UX. (Čtení skutečného MIME objektu ze SQL je nespolehlivé,
proto se spoléhá na bucketový `allowed_mime_types` jako hlavní hráz — viz lesson
2026-07-13.)

### M3 — Tichá selhání na veřejné stránce
**Ověření (potvrzeno).** `page.tsx:168` (sekce) i `:198` (fotky) při **skutečné** chybě
dotazu jen `console.error` a pokračují: sekce spadnou na `seeds` (ukáže se výchozí
rozvržení, jako by šlo o data), fotky na prázdno. `:182` bere `data ?? []` (null z chyby
= „prázdno“). To v produkci „vypadá zeleně“, i když dotaz selhal.

**Oprava.** Rozlišena **chyba dotazu** od **prázdna**: u sekcí/fotek/dokumentů se při
skutečné (ne-schema, ne-prázdné) chybě ukáže **hlasitá hláška** (nový
`QueryErrorScreen`, vzor `SchemaErrorScreen`), ne tichý fallback. Chybějící schéma
dál vede na `SchemaErrorScreen`; úspěšné-ale-prázdno dál na výchozí sadu.

---

## Křížová revize (čerstvý nezávislý agent)

Výsledek zkontroloval nezávislý agent s čistým kontextem (čtením kódu, protože
sandbox nejede). **Žádný blokátor**: build se nerozbije (žádné české uvozovky
v `"…"`, žádné nepoužité importy, typy sedí), všech 8 nálezů drží fail-closed
i proti přímému REST/Storage, SQL je idempotentní a správně seřazené (last-wins).
Doporučení: commitnout.

## Vedlejší změna chování (ke schválení Karlem)

H1 má jeden vedlejší efekt: publikovaná prezentace, kde majitel vypne **úplně
všechny** sekce, teď návštěvníkovi ukáže **výchozí sadu sekcí** (hero, galerie,
text, parametry, kontakt) místo prázdné stránky. Proč: anon po opravě nevidí
vypnuté sekce, takže dotaz vrátí „nula sekcí“ — a to je stejný stav jako u úplně
nové prezentace, kde výchozí sada je **záměrná pojistka „nikdy prázdno“**. Není to
únik (výchozí sekce čtou jen veřejná pole prezentace, ne obsah vypnutých sekcí).
Vypnutí JEDNÉ sekce (např. kontaktu) funguje dál správně — skryje se. Týká se to
jen degenerativního případu „vypnu všechno“. Kdyby to Karel chtěl jinak (vypnu
všechno → prázdno), je to úprava jedné podmínky v `page.tsx`; řekni a udělám.

## Řídicí panel (dle RULES)

- **Riziko:** migraci je nutné u Karla **spustit spolu s nasazením kódu**
  (`APLIKUJ_VSE.sql`), jinak platí staré, děravé chování; navíc dokud SQL neběží,
  ukládání sekcí s obrázky (mapy/panorama/půdorysy) skončí jasnou hláškou „databáze
  není dorovnaná“. Existující publikované prezentace se nerozbijí — obrázky doplní
  **backfill** v migraci.
- **Rollback:** vše je aditivní, jeden commit (`git revert <hash>`). Politiky se
  vrátí přehráním předchozích verzí z gitu; tabulka `presentation_media` se dá
  `drop`nout. Nic se z dat nemaže.
- **Ověřovací cesta:** kontroly `checks/security-check.md` (nová SQL sekce) +
  `npm test` (nové testy sanitizace URL a integrity sekcí). Klik: publikuj
  prezentaci, vypni sekci dokumentů → dokument nesmí jít stáhnout ani přes přímý
  odkaz; do „porovnání cen“ zkus přes API vložit `javascript:` odkaz → na veřejné
  stránce se nesmí vykreslit jako odkaz.
- **Další krok Karla:** spustit migraci + kontroly + commit (příkazy dole).

## Kroky pro Karla

> ⚠️ Ověření (`npm test`, `build`) i migrace jsem **NESPOUŠTĚL** (sandbox bez místa).
> Spusť je prosím ty. Nic si neodškrtávám jako zelené.

**1) Databáze (Supabase → SQL Editor):**

```
cat app/supabase/APLIKUJ_VSE.sql | pbcopy
```
Vlož do SQL Editoru a dej **Run**. Pak spusť ověřovací SQL ze
`checks/security-check.md` (sekce „Ověření oprav Codex revize“) — ve sloupci `stav`
musí být všude `✅`.

**2) Kontrola kódu (v adresáři `app/`):**

```
cd app && npm test && npm run typecheck && npm run lint && npm run build
```

**3) Commit (až po zelených kontrolách; jeden commit):**

```
cd ~/Desktop/prezentace-saas
git add 'app/lib/presentations/sections.ts' \
        'app/app/listing/[slug]/page.tsx' \
        'app/app/schema-error.tsx' \
        'app/app/presentations/[id]/sections/[sectionId]/actions.ts' \
        'app/lib/media.ts' \
        'app/lib/database.types.ts' \
        'app/lib/__tests__/security-hardening.test.ts' \
        'app/supabase/migrations/20260715180000_codex_security_hardening.sql' \
        'app/supabase/APLIKUJ_VSE.sql' \
        'checks/security-check.md' \
        'REVIEW_CODEX_2026_07_15.md' 'tasks/todo.md' 'tasks/lessons.md' 'memory/MEMORY.md'
git commit -m "bezpecnost: oprava Codex nalezu H1-H5, M1-M3 nad Otinskou (RLS sekci/dokumentu/medii, XSS URL, integrita sekci, hlasite chyby)"
```

Push je tvůj vědomý krok (`git push`), až budeš chtít.
