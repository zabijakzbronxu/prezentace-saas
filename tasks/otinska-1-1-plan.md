# Otínská 1:1 — plán přestavby na sekce

*Verze 1 · 2026-07-15 · Autor: AI asistent · Stav: **NÁVRH KE SCHVÁLENÍ — v kódu ani v DB zatím NIC nezměněno.***

---

## 0. Laický souhrn (přečti jako první)

Dnešní SaaS umí vykreslit natvrdo 3 textové bloky v pevném pořadí. Otínská je postavená jinak:
je to **stavebnice sekcí**, kterou si majitel **přeskládá, zapne a vypne**. Cíl tohoto plánu: dát
SaaS stejnou páteř — volný počet sekcí, řazení, zapínání — a k tomu první sadu sekcí, které
vypadají draze a přitom se vyplní rychle.

**Tenhle dokument je plán, ne hotová práce.** Než začnu stavět, potřebuju od tebe:
1. odsouhlasit model a rozdělení do kol (níž jsou **Otevřené otázky pro Karla**, sekce 9),
2. vědět, jestli jde znovu nastartovat sandbox (viz **Blokátor** níž) — bez něj neověřím migraci ani build.

> **Blokátor (důležité):** Linux sandbox je mimo provoz — „No space left on device". Nemůžu spustit
> `pglast` (kontrola migrace), `npm test`, `typecheck`, `build` ani `git commit`. Tenhle plán je
> napsaný jen čtením souborů. Kód budu psát až po tvém svolení; jestli sandbox nepojede, kód dodám
> označený **HOTOVÉ-NEOVĚŘENÉ** + přesné příkazy pro tebe (dle `tasks/lessons.md`, bod 7).

---

## 1. Kompletní seznam sekcí Otínské (závazná spec z `index.txt`)

Otínská drží pořadí a zapnutí přímo v datech:

- **`defaultOrder`** (katalog všech typů, 15): `hero, district, street, specs, benefits, propertyGallery, gallery, propertyIntro, video, technicalCondition, documents, investmentCalc, valuation, cta, chatbot`
- **`savedOrder`** (co je reálně poskládané, 11): `hero, district, street, propertyIntro, specs, propertyGallery, video, technicalCondition, documents, valuation, cta`
- **`enabledSections`** (mapa zapnuto/vypnuto): zapnuto vše z pořadí; vypnuto `benefits`, `investmentCalc`, `chatbot`.

Tohle je přesně to, co dnešní SaaS neumí a co je jádro přestavby.

| # | Sekce (Otínská) | Co obsahuje (zkráceně) | Náročnost |
|---|---|---|---|
| 1 | **hero** | Fotka přes celou obrazovku, H1 + podnadpis, cena; navíc polygon pozemku a čára stezky kreslené přes fotku (`heroPlot`, `heroPath`, oboje v %) | střední (text levný, kreslení polygonu těžké) |
| 2 | **district** (Radotín) | Nadpis + odstavce + dlaždice „highlights"; k tomu **360° panorama** s ~34 hotspoty (Google Places) a přepínač Děti/Dospělí/Starší | text levný; panorama + POI těžké |
| 3 | **street** (Otínská) | Nadpis + odstavce + highlights + galerie lesa (2 fotky jsou panoramata) | text levný; panoramata těžké |
| 4 | **environment** (vnořené pod okolím) | 4 skupiny analytických map (Slunce/Ticho/Vzduch/Doprava) jako obrázky s pinem + „Proč je to důležité?" + body zájmu z Google Places | těžké |
| 5 | **propertyIntro** | Nadpis + rich-text odstavce (stav objektu) | levné |
| 6 | **specs** | `footprint_m2, plot_m2, layout, building_dimensions, floors, year_built, condition, ownership`; cena 0 → „na vyžádání" | levné |
| 7 | **propertyGallery** | **Klikací půdorysy:** 6 pater, každé má SVG + místnosti jako polygony (barva, plocha) + fotky na místnost | velmi těžké |
| 8 | **video** | MP4 + poster (bere z `listing.video`) | levné |
| 9 | **technicalCondition** | 7 položek: kategorie, stav (`new/very-good/good/fair`), popis, fotky, navázané dokumenty | střední |
| 10 | **documents** | Soubory ke stažení: název, kategorie, popis, cesta, typ, velikost, rok | střední |
| 11 | **valuation** | 4 nezávislé odhady: zdroj, url, odhad, min, max, screenshot, datum, poznámka | střední |
| 12 | **benefits** (vypnuto) | Dlaždice: nadpis + popis | levné |
| 13 | **cta / contact** | Text + kontakt (jméno, telefon, mail, avatar, WhatsApp) | levné |
| 14 | **investmentCalc** (vypnuto) | Jen klíč, v datech žádný obsah | — |
| 15 | **chatbot** (vypnuto) | `systemPrompt`, uvítání, cesta k dokumentům (RAG) | velmi těžké |
| — | **socialProof** (průřezové) | Vložené sociální posty s `placement` a `relatedEnvironmentGroup` | střední |
| — | **newsSnippets** (průřezové) | ~14 novinových kartiček, kotvené k benefitům/skupinám | střední |
| — | **targetBuyer** (skryté) | Persona kupce + motivace (řídí tón textů) | levné |

Detailní pole každé sekce (přesné názvy, typy, příklady) jsou vytažené z `index.txt` a slouží jako
podklad k DDL níže. Pozor na past z payloadu: `specs.footprint_m2/floors/year_built` jsou **texty**,
ale `plot_m2` je **číslo**; souřadnice `x/y` jsou u hero/map v **procentech**, ale u místností
půdorysu v **centimetrech**. Naklikané polygony a `hotSpots` (velké S) jdou nejlíp do JSONB.

---

## 2. Mapa: sekce → datový model

Zvolený přístup je **hybrid** (přesně jak zadání říká „JSON obsah **nebo** vazby dle typu"):
- **Páteř** (`presentation_sections`) drží u každé sekce jen *pořadí, zapnutí a typ* + malý JSON obsah.
- **Jádrová data nemovitosti** (titulek, cena, plochy, kontakt, PENB…) zůstávají jako sloupce na
  `presentations` — nerozbíjíme, co funguje, jen doplníme chybějící sloupce.
- **Seznamová data s vlastní identitou a soubory** (dokumenty, odhady, položky stavu, benefity,
  patra/místnosti, mapy, POI, panoramata, posty, novinky) dostanou **vlastní tabulky**.

| Sekce (`kind`) | Pořadí/zapnutí | Kde bydlí obsah |
|---|---|---|
| `hero` | řádek v `presentation_sections` | `presentations` (title, subtitle, price_czk, disposition) + hero foto + `content` JSONB `{heroPlot, heroPath, imageView}` |
| `text` (propertyIntro, district-text, street-text, popis, lokalita, přednosti) | řádek | `content` JSONB `{heading, body, paragraphs[], highlights[]}` |
| `parameters` (= specs + PENB) | řádek | `presentations` (property_type, disposition, floor_area_m2, land_area_m2, **built_area_m2, building_dimensions, floors, year_built, condition, ownership, energy_class, monthly_costs_czk**) |
| `gallery` | řádek | `presentation_photos` (+ nové `caption`, `category`), `content` `{heading}` |
| `map` (GPS pin — levná verze) | řádek | `presentations` (**lat, lng**) + `content` `{zoom}` |
| `benefits` | řádek | **`presentation_benefits`** (icon, heading, body, sort_order) |
| `documents` | řádek | **`presentation_documents`** (name, category, description, storage_path, file_type, file_size_bytes, sort_order) + nový bucket |
| `valuation` | řádek | **`presentation_valuations`** (source, url, estimated_price_czk, price_min_czk, price_max_czk, screenshot_path, valued_on, note, sort_order) |
| `technicalCondition` | řádek | **`presentation_condition_items`** (category, condition enum, description, images jsonb, document_id, sort_order) |
| `contact` (cta) | řádek | `presentations` (contact_name/email/phone) + `content` `{cta_text, whatsapp}` |
| `video` | řádek | `content` `{video_url, video_poster_path, tour_url}` |
| `floorplans` (propertyGallery) | řádek | **`presentation_floors`** + **`presentation_rooms`** + `presentation_photos.room_id` |
| `analyticMaps` (environment) | řádek | **`presentation_maps`** (title, caption, storage_path, group, marker jsonb, zoom, offset jsonb, sort_order) + `content` `{groups, whyMatters}` |
| `poi` (places) | řádek | **`presentation_places`** (name, type, place_id, gps jsonb, rating, review_count, image, distance, description, super_category, reviews jsonb, sort_order) |
| `panorama` | řádek | **`presentation_panoramas`** (storage_path, config jsonb, hotspots jsonb, sort_order) |
| `socialProof` | řádek | **`presentation_social`** (platform, author jsonb, content, posted_on, reactions jsonb, source, placement, related_group, sort_order) |
| `news` | řádek | **`presentation_news`** (headline, excerpt, source jsonb, related_group, image_path, placement, sort_order) |
| `investmentCalc` | řádek | `content` JSONB (zatím prázdné) |
| `chatbot` | řádek | `content` `{systemPrompt, welcomeMessage}` (vypnuto) |
| skrytá persona | — | `presentations.target_persona` JSONB |

---

## 3. Návrh schématu (jedna migrace pokryje VŠECHNY sekce)

> Níže je čitelná podoba návrhu. Při realizaci ji přepíšu do **idempotentního** stylu projektu
> (`create table if not exists`, `add column if not exists`, checky přes `pg_constraint`, rizikové
> kroky v `do $$ … exception … end $$;`) a **stejný obsah vložím i do `APLIKUJ_VSE.sql`** + přidám
> kontrolní řádek `✅/❌` na konec (dle `tasks/lessons.md`, bod 1 a 3). Ruční psaná
> `lib/database.types.ts` se doplní o nové tabulky (bod 6 mapy z průzkumu).

### 3.1 Páteř — `presentation_sections`

```sql
create table presentation_sections (
  id              uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references presentations(id) on delete cascade,
  kind            text not null,          -- viz registr povolených typů níž (CHECK)
  position        integer not null default 0,
  enabled         boolean not null default true,
  content         jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint presentation_sections_kind_ck check (kind in (
    'hero','text','parameters','gallery','map','benefits','documents','valuation',
    'technicalCondition','contact','video','floorplans','analyticMaps','poi',
    'panorama','socialProof','news','investmentCalc','chatbot'
  ))
);
create index presentation_sections_presentation_idx on presentation_sections(presentation_id);
create index presentation_sections_order_idx on presentation_sections(presentation_id, position);
```

- **Bez unikátního indexu na `position`** (stejně jako `presentation_photos.sort_order`) — řazení
  řeší DB funkce pod zámkem, ne aplikace (lesson: dvě záložky = duplicitní pořadí).
- Singleton typy (`hero, parameters, contact, map, video, chatbot, investmentCalc, floorplans, panorama`)
  smí být max 1× na prezentaci; opakovatelné (`text, gallery, benefits, documents, valuation,
  technicalCondition, analyticMaps, poi, socialProof, news`) víckrát. Pravidlo hlídá `add_*` funkce.

### 3.2 Rozšíření `presentations` (chybějící pole nemovitosti)

```sql
alter table presentations
  add column lat               numeric(9,6),
  add column lng               numeric(9,6),
  add column year_built        integer,
  add column floors            smallint,
  add column built_area_m2     numeric(10,2),      -- zastavěná plocha (footprint_m2)
  add column building_dimensions text,             -- „9.5 x 9.5 m"
  add column condition         text,               -- volný stav („velmi dobrý")
  add column ownership         text,               -- „osobní"
  add column monthly_costs_czk integer,            -- provozní náklady/měsíc
  add column subtitle          text,               -- podnadpis přes hero
  add column target_persona    jsonb;              -- {persona, motivations[]}
```

### 3.3 Fotky — popisky, kategorie, vazba na místnost

```sql
alter table presentation_photos
  add column caption   text,     -- prodejní popisek (alt_text zůstává technický)
  add column category  text,     -- exterier | interier | zahrada | okoli
  add column room_id   uuid references presentation_rooms(id) on delete set null;
-- limit fotek 20 → 60 (v register_presentation_photo)
```

### 3.4 Seznamové tabulky (vytvořit teď, i když se část renderuje až později)

```sql
create table presentation_benefits (
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references presentations(id) on delete cascade,
  icon text, heading text not null, body text,
  sort_order int not null default 0);

create table presentation_documents (
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references presentations(id) on delete cascade,
  name text not null, category text, description text,
  storage_path text not null, file_type text, file_size_bytes bigint,
  sort_order int not null default 0);

create table presentation_valuations (
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references presentations(id) on delete cascade,
  source text not null, url text,
  estimated_price_czk bigint, price_min_czk bigint, price_max_czk bigint,
  screenshot_path text, valued_on date, note text,
  sort_order int not null default 0);

create table presentation_condition_items (
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references presentations(id) on delete cascade,
  category text not null,
  condition text check (condition in ('new','very-good','good','fair')),
  description text, images jsonb not null default '[]'::jsonb,
  document_id uuid references presentation_documents(id) on delete set null,
  sort_order int not null default 0);

create table presentation_floors (          -- model teď, editor v Kole 2
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references presentations(id) on delete cascade,
  label text not null, floorplan_path text,
  plan_data jsonb, scale jsonb, image_view jsonb,
  sort_order int not null default 0);

create table presentation_rooms (
  id uuid primary key default gen_random_uuid(),
  floor_id uuid not null references presentation_floors(id) on delete cascade,
  name text not null, area_m2 numeric(6,2), color text,
  polygon jsonb not null default '{}'::jsonb,
  sort_order int not null default 0);

create table presentation_maps (            -- analytické mapy, render v Kole 3
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references presentations(id) on delete cascade,
  title text, caption text, storage_path text,
  map_group text, marker jsonb, zoom numeric, offset_xy jsonb,
  sort_order int not null default 0);

create table presentation_places (          -- POI z Google Places, render v Kole 3
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references presentations(id) on delete cascade,
  name text not null, place_type text, place_id text, gps jsonb,
  rating numeric, review_count int, image text, distance text,
  description text, super_category text, reviews jsonb not null default '[]'::jsonb,
  sort_order int not null default 0);

create table presentation_panoramas (       -- 360°, render v Kole 3
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references presentations(id) on delete cascade,
  storage_path text, config jsonb, hotspots jsonb not null default '[]'::jsonb,
  sort_order int not null default 0);

create table presentation_social (          -- sociální posty, render v Kole 3
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references presentations(id) on delete cascade,
  platform text, author jsonb, content text, posted_on text,
  reactions jsonb, source text, placement text, related_group text,
  sort_order int not null default 0);

create table presentation_news (            -- novinky, render v Kole 3
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references presentations(id) on delete cascade,
  headline text not null, excerpt text, source jsonb,
  related_group text, image_path text, placement text,
  sort_order int not null default 0);
```

### 3.5 RLS (na každé nové tabulce, stejně přísně jako dnes)

Vzor beze změny oproti `presentation_photos`:

```sql
alter table <tabulka> enable row level security;

create policy "<t> owner all" on <tabulka> for all
  using    (exists (select 1 from presentations p where p.id = presentation_id and p.owner_id = auth.uid()))
  with check(exists (select 1 from presentations p where p.id = presentation_id and p.owner_id = auth.uid()));

create policy "<t> public read published" on <tabulka> for select
  using    (exists (select 1 from presentations p where p.id = presentation_id and p.status = 'published'));
```

`presentation_rooms` jde přes `presentation_floors` na prezentaci (dvojitý join). Žádné tiché
selhání: každý nový `select` na veřejné stránce projde `isMissingSchemaError()` a při chybějícím
schématu ukáže `<SchemaErrorScreen>`, ne prázdno.

### 3.6 Storage bucket pro dokumenty

Nový **privátní** bucket `presentation-documents` (signed URL), politiky podle vzoru
`presentation-photos` (cesta `owner/presentation/uuid.pdf|png…`). Vytvoření obalené do
`do $$ … exception … end $$;` (některé projekty nesmí sahat na `storage.*` z SQL editoru → fallback
do `storage-setup.md`).

### 3.7 DB funkce pro řazení a zapínání (pod `pg_advisory_xact_lock`, `security invoker`)

- `add_presentation_section(p_presentation_id uuid, p_kind text) returns uuid` — ověří `kind`
  a pravidlo singletonu, vloží na konec (`position = max+1`).
- `move_presentation_section(p_section_id uuid, p_direction text)` — prohodí `position` se sousedem
  (přesně jako `swap_photo_order`; šipky ↑/↓).
- `reorder_presentation_sections(p_presentation_id uuid, p_ordered_ids uuid[])` — přijme celé
  pořadí naráz (příprava na drag & drop v budoucnu; teď nepovinné).
- `set_presentation_section_enabled(p_section_id uuid, p_enabled boolean)`.
- `delete_presentation_section(p_section_id uuid)` — smaže (děti přes `on delete cascade`).

### 3.8 Backfill + pojistka „nikdy prázdno"

- **Backfill v migraci:** pro každou prezentaci bez sekcí založ výchozí sadu:
  `hero, gallery, text(popis), text(lokalita), text(přednosti), parameters, contact` v tomto pořadí,
  texty naplněné ze stávajících `description/location_text/features_text`. Idempotentní (jen když
  sekce chybí). **Staré sloupce NEMAZAT** (dual-write, čtení má fallback).
- **Pojistka na veřejné stránce:** když prezentace nemá žádné řádky v `presentation_sections`,
  stránka si výchozí pořadí **dopočítá za běhu** ze sloupců. Výkladní skříň se nikdy nerozbije,
  i kdyby backfill něco minul.

---

## 4. Editor přestavěný na sekce

Nový krok průvodce **„Sekce"** (mezi „Fotky" a „Zveřejnit", nebo jako samostatná stránka
`presentations/[id]/sections`). Obsahuje:

1. **Seznam sekcí** dané prezentace: název, přepínač *zapnuto/vypnuto*, šipky *↑/↓* pro pořadí,
   tlačítko *odebrat*. (Drag & drop záměrně NE — v projektu není žádná DnD knihovna a přidávat ji je
   scope navíc; zadání šipky výslovně povoluje. DnD půjde doplnit později přes hotovou
   `reorder_*` funkci.)
2. **„Přidat sekci"** — nabídka z katalogu (jen typy povolené v tomto kole; singletony zmizí, když
   už existují).
3. **Editační formulář podle typu** (`kind`). Vše přes Server Actions + `useActionState` (chyby na
   místě, redirect jen při úspěchu — lesson 4). Přes URL jen kódy chyb (lesson 6).

**V TOMTO KOLE zprovoznit editaci těchto sekcí** (levné, vysoký dopad):

| Sekce | Formulář (pole) |
|---|---|
| `hero` | titulek (H1), podnadpis, výběr hero fotky, cena, dispozice (většina už je v „Základ") |
| `gallery` | nadpis + u fotek **popisek** a **kategorie** (rozšíření kroku „Fotky") |
| `map` | adresa → automatické geokódování → `lat/lng`, majitel jen potvrdí pin |
| `benefits` | dlaždice: ikona, nadpis, popis (přidat/odebrat/seřadit) |
| `parameters` | rok stavby, podlaží, zastavěná plocha, rozměry, stav, vlastnictví, provozní náklady + stávající plochy/typ |
| `PENB` | výběr třídy A–G (renderuje se jako barevná stupnice uvnitř `parameters`) |
| `documents` | nahrání souboru + název, kategorie, popis (nový bucket) |
| `valuation` | zdroj, url, odhad, min, max, screenshot, datum, poznámka + odkazy na Reas/Bezrealitky/Odhad-zdarma |
| `technicalCondition` | položky: kategorie, stav (štítek), popis, fotky, navázaný dokument |
| `contact` | jméno, telefon, mail, WhatsApp, text CTA (většina už je v „Texty") |

Typy `video, floorplans, panorama, analyticMaps, poi, socialProof, news, chatbot, investmentCalc`
budou v katalogu vidět jako **„připraveno v modelu — editor přijde v dalším kole"** (nepůjdou zatím
přidat, nebo půjdou přidat jen jako vypnutý placeholder — viz Otevřená otázka O5).

---

## 5. Veřejná šablona `/listing/[slug]` — render sekcí v pořadí

Přepis dnešního natvrdo poskládaného `page.tsx` na **smyčku přes zapnuté sekce v uloženém pořadí**
(`enabled = true`, řazeno dle `position`), `switch` podle `kind` → komponenta sekce. Zachovat:
světlé téma (`INK/MUTED/BORDER/PAPER_ALT`, Playfair + Work Sans), `dynamic="force-dynamic"`,
chování `TextSection` (na veřejné stránce se prázdná sekce skryje, v náhledu ukáže „doplň mě").

**Vizuál v duchu Otínské (v tomto kole):**
- **Hero s textovým overlayem** přes fotku (H1 + podnadpis + adresa + cena, tmavý gradient odspodu).
- **Lightbox v galerii** (full-screen overlay se šipkami místo nové záložky), popisky, seskupení dle kategorie.
- **OG obrázek** pro sdílení (hero fotka; privátní bucket → `/api/og/[slug]` nebo signed URL s dlouhým TTL).
- **Sticky lišta** s cenou + „Zavolat" při scrollu.
- **PENB barevná stupnice A–G** místo holého písmene.
- **Mapa** s pinem z `lat/lng` (Leaflet + Mapy.cz dlaždice nebo statický obrázek).
- Rytmus stránky: střídání bílé a `#faf9f7`, benefity jako dlaždice, dokumenty jako seznam ke stažení,
  odhady jako karty se screenshoty, technický stav se štítky.

**Sekce bez editoru v tomto kole** (`floorplans, panorama, analyticMaps, poi, socialProof, news,
chatbot, investmentCalc`): renderovat jako **jasně označený placeholder** „🔜 Přijde v dalším kole"
— jen pokud jsou zapnuté; jinak nic. Model je pro ně připravený, takže příště se dodělá jen UI.

---

## 6. Rozdělení do kol

| Kolo | Náplň | Migrace | Ověřitelné bez sandboxu? |
|---|---|---|---|
| **1A** | Migrace: páteř `presentation_sections` + všechny nové sloupce a tabulky + RLS + funkce řazení + backfill + bucket. Fold do `APLIKUJ_VSE.sql`. Typy do `database.types.ts`. | 1 velká | migrace jen `pglast` (sandbox) → jinak NEOVĚŘENÉ + příkaz pro Karla |
| **1B** | Editor: krok „Sekce" (řazení/zapínání/přidat/odebrat) + formuláře 10 sekcí z bodu 4. | — | `typecheck`/`test` (sandbox) |
| **1C** | Veřejná stránka: render sekcí v pořadí + hero overlay, lightbox, OG, sticky, PENB, mapa + placeholdery. | — | vizuálně v prohlížeči (Karel) |
| **2** | `floorplans` — klikací půdorysy: editor (nahraj plán → obtáhni místnosti → přiřaď fotky) + render. | 0 (model už je) | částečně |
| **3** | „Wow, ale drahé": `analyticMaps`, `poi` (Google Places), `panorama` (Pannellum), `socialProof`, `news`. | 0 (model už je) | částečně |
| **4** | `hero` polygon pozemku (kreslení přes fotku), `video` embed, `investmentCalc`, persona-driven AI texty. | 0–1 | částečně |
| **5 (dlouhý ocas)** | `chatbot` (RAG nad dokumenty). Zvážit jako prémiový balíček. | vektory | ne |

**Doporučené pořadí realizace tohoto kola:** 1A (po tvém schválení + oživení sandboxu) → 1B → 1C,
po každé hotové sekci malý commit pod tebou (NEPUSHOVAT).

> Poznámka k rozsahu: „Kolo 1" (A+B+C) je pořád velký kus (migrace + přestavba editoru + přepis
> výkladní skříně). Dle `RULES.md` („malé úkoly") navrhuju stavět a předávat **po částech 1A → 1B →
> 1C**, ať to můžeš průběžně proklikat, ne až na konci vše najednou.

---

## 7. Testy a ověření

- **Jednotkové testy (vitest, čistá logika):** registr `kind` (povolené/singletony), logika prohození
  pořadí, přepínač `enabled`, dopočet výchozích sekcí za běhu, mapování PENB na stupnici, formát cen
  u odhadů. Tyhle jdou spustit u Karla (`npm test`).
- **RLS kontrakt:** napíšu SQL/manuální checklist (owner vidí své, cizí nevidí draft, veřejně jen
  `published`) — **vyžaduje živou DB**, sandboxem neověřím; dodám jako postup pro Karla.
- **Migrace:** `pglast` parser — jen když pojede sandbox. Jinak NEOVĚŘENÉ + přesný `pbcopy` + „Run".
- **Build/lint/typecheck:** `npm run build`, `eslint`, `tsc --noEmit` — u Karla (sandbox mimo).
- **Vizuál:** ověřovací klikací cesta na `/listing/<slug>` (výkladní skříň se nesmí rozbít).

---

## 8. Rizika a rollback

- **Riziko:** přepis veřejné stránky rozbije zobrazení existující prezentace.
  **Pojistka:** dopočet výchozích sekcí za běhu (bod 3.8) + staré sloupce se nemažou.
  **Rollback:** vrátit `page.tsx` z gitu; data v nových tabulkách nevadí, stará cesta čte staré sloupce.
- **Riziko:** migrace spadne půlkou v jedné transakci SQL editoru.
  **Pojistka:** idempotentní styl + `do $$ … exception … end $$;` + kontrolní SELECT na konci.
  **Rollback:** tabulky jsou aditivní; smazat nové objekty nezmění staré chování.
- **Riziko:** duplicitní pořadí/hero při dvou záložkách. **Pojistka:** řazení jen přes DB funkci pod zámkem.
- **Neměnit** platební/publikační invarianty (`enforce_paid_before_publish`, `unpublish_when_unpaid`).
  Sekce se editují i u `published` bez nové platby (vlastník má `for all`), status se nemění mimo platbu.

---

## 9. Otevřené otázky pro Karla (potřebuju před stavbou)

- **O1 — Rozsah kola:** stavět celé Kolo 1 (A+B+C) v jednom, nebo předávat po částech 1A→1B→1C? *(doporučuju po částech.)*
- **O2 — Sandbox:** jde restartovat session/uvolnit místo, abych ověřil migraci a build? Jinak dodám vše NEOVĚŘENÉ.
- **O3 — Mapa:** stačí levný pin z adresy (Mapy.cz/Leaflet), nebo chceš rovnou analytické mapy jako Otínská (to je Kolo 3)?
- **O4 — Benefity:** vlastní tabulka (navrženo), nebo stačí JSONB v sekci? *(tabulka = konzistentní s dokumenty/odhady.)*
- **O5 — Placeholdery:** nedodělané sekce (panorama…) v katalogu úplně skrýt, nebo ukázat jako „přijde příště" placeholder?
- **O6 — Limit fotek:** zvednout z 20 na 60 (Otínská má ~55). OK?
- **O7 — Kroky průvodce:** přidat 5. krok „Sekce", nebo řazení/zapínání zabudovat do stávajících kroků?

---

## 10. Řídicí panel (dle RULES.md, pravidlo 3)

- **Laický souhrn:** dnešní 3 natvrdo bloky nahradíme stavebnicí sekcí (řazení, zapínání) + první
  sadou sekcí (hero s textem, galerie s popisky, mapa, benefity, parametry, PENB, dokumenty, odhady,
  technický stav, kontakt). Model se navrhne tak, aby unesl i budoucí sekce.
- **Riziko:** velká změna výkladní skříně a editoru; hlavní riziko je rozbité zobrazení — kryté pojistkou „nikdy prázdno" a nemazáním starých sloupců.
- **Rollback:** aditivní migrace + návrat souborů z gitu; stará cesta funguje dál.
- **Ověřovací cesta:** po realizaci — otevři editor → krok „Sekce" → přeskládej/zapni → otevři
  `/listing/<slug>` a zkontroluj, že sekce jsou ve zvoleném pořadí a stránka se nerozbila.
- **Další krok Karla (teď):** schválit model + zodpovědět O1–O7 a (ideálně) oživit sandbox. Pak stavím 1A.

---

## Checklist tohoto kola

- [x] Přečíst podklady (analýza, schéma, paměť, review, lessons)
- [x] Vytáhnout kompletní datový model Otínské z `index.txt` (závazná spec)
- [x] Zmapovat současný stav (editor, veřejná stránka, schéma, RLS, funkce)
- [x] Napsat tento plán (`tasks/otinska-1-1-plan.md`)
- [ ] **← STOP: schválení plánu Karlem (O1–O7) + rozhodnutí o sandboxu**
- [ ] 1A — migrace + `APLIKUJ_VSE.sql` + typy (po schválení)
- [ ] 1B — editor sekcí + 10 formulářů
- [ ] 1C — veřejný render sekcí + hero/lightbox/OG/sticky/PENB/mapa
- [ ] Testy logiky + RLS checklist + předání příkazů Karlovi
