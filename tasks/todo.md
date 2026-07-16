# todo.md — pracovní plán

(Primární evidence bude v ClickUpu po připojení konektoru; tohle je pracovní plán aktuální fáze.)

## Session 2026-07-15 (7) — vizuální edit-mode „na stránce" (design mode)

**Proč:** Karel chtěl editovat prezentaci rovnou na té vizuální stránce (přesouvat sekce,
otevírat jejich editor, psát popisky k fotkám), ne v odděleném seznamu `/sections`.
Plán: `tasks/design-mode-plan.md`. Rozsah tohoto běhu = inline edit-shell (přepínač
Náhled↔Úpravy, u sekce ↑/↓ · zap/vyp · Upravit · Odebrat, „+ Přidat sekci", inline
popisky fotek). **Půdorysy schválně NEpřestavuju** — „Upravit" u nich jen otevře stávající
editor (obecné napojení, ať jde vnitřek vyměnit v samostatném běhu po mně).

Rozhodnutí architektury (nízké riziko):
- Render sekcí VYTAŽEN z `listing/[slug]/page.tsx` do sdíleného `listing/[slug]/render.tsx`
  (`createSectionRenderer`) → veřejná stránka i edit-mode kreslí TÝMŽ kódem (vzhled 1:1,
  žádná duplicitní logika). Veřejná `page.tsx` jen volá renderer; render je čistě
  prezentační (žádné edit prvky → anonym je nikdy nevidí, hlídá i test).
- Řazení/zapnutí/přidání/smazání jede přes UŽ EXISTUJÍCÍ akce sekcí — přidán jen volitelný
  `return_to` (zpět na edit-mode), tvrdě validovaný (`isSafeDesignReturnTo`, jen interní
  `/presentations/<uuid>/design`) → žádný open-redirect. Formuláře bez `return_to` se chovají
  jako dřív (návrat na /sections).
- Edit-mode `/presentations/[id]/design` jen pro přihlášeného VLASTNÍKA (explicitní
  `owner_id == user.id`, published je veřejně čitelná → sám SELECT nestačí).
- Popisky fotek inline: nová malá akce `savePhotoCaption` (jen sloupec `caption`, ownership),
  `useActionState` → chyba na místě, hodnota zůstane. Žádná migrace (persistence přes
  existující akce/sloupce) → `APLIKUJ_VSE.sql` nesahám.

Postaveno (NESPUŠTĚNO — ověří Karel):
- [x] `listing/[slug]/render.tsx` (sdílený render) + `page.tsx` na něj přepojen (veřejný výstup 1:1)
- [x] `presentations/[id]/design/` — `page.tsx` (edit + náhled), `section-frame.tsx` (lišta),
      `inline-captions.tsx` (popisky), `actions.ts` (`savePhotoCaption`)
- [x] `lib/presentations/design.ts` — čisté helpery (`isSafeDesignReturnTo`, `canMoveSection`, `designPath`)
- [x] `sections/actions.ts` — volitelný `return_to` (zpětně kompatibilní)
- [x] Vstupní body: odkaz „🎨 Vizuální úpravy" v kroku Sekce; „← Zpět na vizuální úpravy" v editoru sekce (`?from=design`)
- [x] Testy `lib/__tests__/design.test.ts` (return_to, řazení, strukturální pojistka „veřejný render nemá edit prvky")
- [x] Křížová revize čerstvým podagentem → **žádný blokátor** (viz Review)

### Review — Session 2026-07-15 (7)

**Stav: HOTOVÉ-NEOVĚŘENÉ.** Sandbox mimo (no space) → `npm test`, `typecheck`, `lint`
ani `build` NEBĚŽELY. Nic si neodškrtávám jako zelené — spustí Karel (příkazy v shrnutí chatu).

Křížová revize (čerstvý podagent, čistý kontext, čtením kódu): **žádný blokátor.** Ověřeno:
extrakce renderu 1:1 (všech 10 polí kontextu předáno správně, `bandIndex` sekvenční),
žádné nepoužité importy, žádné české uvozovky uvnitř `"…"`, `content` zápis se netýká
(popisek je sloupec), edit-mode tvrdě omezený na vlastníka, `savePhotoCaption` ověřuje
UUID i vlastnictví, `return_to` odolný proti open-redirectu, importní cesty i TS typy sedí.
Po revizi doplněno: hlasitá `QueryErrorScreen` u skutečné chyby načtení na `/design` (lesson M3).

Drobnosti na druhé kolo (neblokující): drag&drop místo šipek; plně inline WYSIWYG texty
(teď „Upravit" otevře editor); po uložení sekce donést `?from=design` zpátky; přestavba
půdorysů (samostatný běh). Střídání pruhů v EDIT-modu se u galerie neposune (kosmetika
jen v editoru, veřejná stránka bez dopadu).

**Riziko:** nízké/střední — jediný citlivý bod je přepojení veřejné `page.tsx` na sdílený
render; výstup ale zůstává 1:1 (mechanický přesun, ověřeno revizí). **Rollback:** `git revert <hash>`
(žádná migrace, z DB se nic nemaže). **Ověřovací cesta:** viz shrnutí v chatu.

- [ ] **Karel — ověřit + commit** (příkazy v shrnutí chatu)

## Session 2026-07-15 (6) — tlačítko „Naplnit ukázkovým obsahem Otínská"

**Proč:** Karlova výtka „je to holá kostra". Po nasazení má u prázdné prezentace vidět hned
plný reálný obsah, ne prázdný editor. Řešení: jedno tlačítko, které prázdnou prezentaci naplní
reálným obsahem z Otínské (texty + čísla).

**Rozsah (úzký, bez migrace):** čistý datový modul + jedna server action + tlačítko v kroku Sekce.
Nesahám na bezpečnostní věci z dnešní Codex opravy (jen je respektuji). Sandbox mimo (no space) →
NESPOUŠTÍM nic; testy jako soubory; ověření + commit předám Karlovi. NEODŠKRTÁVÁM, co jsem neviděl.

**Rozhodnutí architektury (nízké riziko):**
- Obsah Otínské = čistý modul `app/lib/presentations/otinska-sample.ts` (pole prezentace + seedy sekcí).
  Testovatelný bez DB. Žádná nová tabulka, žádná migrace, žádná změna `APLIKUJ_VSE.sql`.
- Action `seedOtinska` v `sections/actions.ts`: přihlášený uživatel, přes RLS jen VLASTNÍ prezentace,
  navíc explicitní kontrola `owner_id == user.id` (aby published cizí prezentace neskončila tichým no-opem).
- **Idempotence:** plní JEN prezentaci bez jediné sekce; jinak odmítne (kód `seed-not-empty`).
- Sekce se vkládají přímým `insert` (DB trigger whitelistu + unikátní index na singletony to jistí).
- Hero a Parametry čtou ze SLOUPCŮ prezentace → action je zapisuje (title, subtitle, popis, lokalita,
  parametry, kontakt, GPS). Cena Otínské = „na vyžádání" → `price_czk = null`, hero `show_price:false`.
- **Obrázkové sekce NEplní** (nejsou ve Storage → rozbité náhledy): galerie, hero foto, půdorysy,
  analytické mapy, panorama, dokumenty, mapa. Video Otínské je MP4 (ne YouTube/Vimeo) → sekci video vynechávám.
- Přepis polí prezentace je vědomý (potvrzovací dotaz u tlačítka) a tlačítko je jen u PRÁZDNÉ prezentace.

**Co se naplní (13 sekcí):** hero · text Příběh (description) · text Lokalita (location_text) ·
přednosti (benefits) · parametry+PENB · technický stav (7 položek) · body zájmu (POI) ·
cenové odhady (4) · reference (social) · novinky · investiční kalkulačka · kontakt.

Plán (budoucí čas — odškrtne Karel po ověření na obrazovce):
- [ ] `app/lib/presentations/otinska-sample.ts` — reálná data + `isSeedAllowed()` + `ownsPresentation()`
- [ ] `seedOtinska()` v `sections/actions.ts` (+ kódy `seed-not-empty` / `seed-failed`, `?seeded=1`)
- [ ] Tlačítko v `sections/page.tsx` — jen u prázdné prezentace, s potvrzením; hláška o výsledku
- [ ] Testy `app/lib/__tests__/otinska-sample.test.ts` (správné typy, idempotence, vlastník, validní obsah)
- [ ] Křížová revize čerstvým podagentem, oprava blokátorů (nepoužité importy, české uvozovky v `"…"`)
- [ ] Kroky pro Karla: `npm test && npm run typecheck && npm run lint && npm run build` + commit

### Review — Session 2026-07-15 (6)

**Stav: HOTOVÉ-NEOVĚŘENÉ.** Sandbox mimo (no space) → `npm test`, `typecheck`, `lint`
ani `build` NEBĚŽELY. Nic si neodškrtávám jako zelené — spustí Karel (příkazy v shrnutí chatu).

Co přibylo:
- `app/lib/presentations/otinska-sample.ts` — reálná data Otínské (pole prezentace + 12 sekcí)
  + čisté brány `isSeedAllowed` (jen prázdná prezentace) a `ownsPresentation` (jen vlastník).
- `seedOtinska` v `sections/actions.ts` — přihlášený vlastník, jen prázdná prezentace, přímý
  insert sekcí (jistí DB trigger whitelistu + unikátní index singletonů), žádné tiché selhání.
- Tlačítko v `sections/page.tsx` (jen v prázdném stavu, s potvrzením) + hlášky + `?seeded=1`.
- Testy `otinska-sample.test.ts` (typy sekcí, idempotence, vlastník, obsah přes readery, limity polí).

Bez migrace, bez změny `APLIKUJ_VSE.sql`, bez doteku bezpečnostních věcí z dnešní Codex opravy.

Křížová revize čerstvým podagentem (čistý kontext): **žádný blokátor** — importy čisté, žádné
české uvozovky v `"…"`, typy sedí (25 sloupců existuje; `content` stejný vzor jako `writeContent`),
react/no-unescaped-entities čisté, bezpečnost i idempotence OK. Drobnost (neblokující): kontrola
prázdnosti a insert nejsou v jedné transakci → při souběžném dvojkliku druhý pokus bezpečně padne
na unikátním indexu singletonů (`seed-failed`), data se nerozbijí.

Rozhodnutí k pozdější revizi Karlem:
- Seed přepíše popisná pole TÉTO prezentace (titulek, podnadpis, popis, parametry, kontakt) obsahem
  Otínské — vědomé, kryté potvrzovacím dotazem a jen u prázdné prezentace. Alternativa „plnit jen
  prázdná pole" = změna pár řádků.
- Kontakt je reálný z Otínské (Jakub Skala / telefon / e-mail). Když nechceš reálné číslo v ukázce,
  řekni — dám neutrální.

**Riziko:** nízké. Aditivní, existující sekce/akce nedotčené. **Rollback:** `git revert <hash>`
(žádná migrace, z DB se nic nemaže).

- [ ] **Karel — ověřit + commit** (příkazy v shrnutí chatu)

## Session 2026-07-15 (5) — oprava Codex nálezů nad Otínskou (bezpečnost před spuštěním)

**Rozsah:** 5× High + 3× Medium z nezávislé revize (Codex) nad dnešní prací. Každý nález
nejdřív OVĚŘEN v kódu (viz `REVIEW_CODEX_2026_07_15.md`), pak opraven. Hráze musí držet
i proti přímému volání Supabase REST/Storage API. Sandbox mimo (no space) → NESPOUŠTÍM
nic; testy jako soubory; ověření + commit předám Karlovi. NEODŠKRTÁVÁM ověření, které jsem neviděl.

Plán (budoucí čas — odškrtává se AŽ po ověření na obrazovce):
- [ ] H1 — RLS sekcí: veřejně jen `enabled=true` + published (owner vidí vše)
- [ ] H2 — dokumenty (DB řádek + Storage) veřejné jen když je sekce `documents` zapnutá
- [ ] H3 — `presentation-media` veřejně jen přes registrovaný řádek zapnuté sekce published prezentace
- [ ] H4 — tabulka `presentation_media` + RPC `sync_presentation_media` s limitem v DB + backfill
- [ ] H5 — `safeExternalUrl()` v sections.ts, sanitizace při renderu (valuation, news) + validace při zápisu
- [ ] M1 — unikátní index na singletony + trigger whitelistu typů (integrita v DB, ne jen RPC)
- [ ] M2 — potvrzeny bucket limity (oba buckety); registrace média hlídá tvar cesty v DB
- [ ] M3 — hlasitá hláška místo tichého fallbacku (sekce/fotky/dokumenty)
- [ ] Migrace: nový soubor + idempotentně do `APLIKUJ_VSE.sql` (+ kontrolní SELECT)
- [ ] Testy: URL sanitizace, whitelist/singleton, limity, RLS kontrakt
- [ ] Křížová revize čerstvým podagentem, oprava blokátorů
- [ ] Kroky pro Karla (migrace + test/typecheck/lint/build + commit)

### Review — Session 2026-07-15 (5)

**Stav: NAPSÁNO + křížově zrevidováno (žádný blokátor), ale STROJOVĚ NEOVĚŘENÉ.**
Sandbox bez místa → migrace, `npm test`, `typecheck`, `lint`, `build` NEBĚŽELY.
Checkboxy výše nechávám prázdné schválně — odškrtne je Karel po ověření na obrazovce.

Co je hotové (v kódu):
- **H1** RLS sekcí: anon jen `enabled=true`+published. **H2** dokumenty (DB řádek
  i Storage) jen když je sekce `documents` zapnutá. **H3/H4** nová tabulka
  `presentation_media` + RPC `sync_presentation_media` (limit v DB) + Storage policy
  přes registraci; backfill existujících obrázků. **M1** unikátní index na singletony +
  trigger whitelistu typů. **M2** limity obou bucketů znovu vynuceny; registrace média
  hlídá tvar cesty v DB.
- **H5** `safeExternalUrl()` v `sections.ts` — jen http/https; sanitizace při renderu
  (valuation, news) i při zápisu. Prošel jsem všechna místa s user URL na veřejné stránce
  (kontakt tel/mailto s pevnou předponou a video přes `parseVideoUrl` jsou bezpečné).
- **M3** `QueryErrorScreen` — sekce/fotky/dokumenty rozlišují chybu dotazu od prázdna.
- Migrace `20260715180000_codex_security_hardening.sql` + idempotentně do `APLIKUJ_VSE.sql`
  (blok „6e“ před KONTROLOU, KONTROLA rozšířena). Testy `security-hardening.test.ts` +
  SQL kontrakt v `checks/security-check.md`. Detaily a příkazy pro Karla v
  `REVIEW_CODEX_2026_07_15.md`.

Vedlejší efekt H1 (ke schválení): published prezentace s vypnutými VŠEMI sekcemi ukáže
výchozí sadu (ne prázdno) — není únik, viz REVIEW. Rollback: `git revert` (jeden commit),
`presentation_media` lze dropnout, nic se z dat nemaže.

- [ ] **Karel — ověřit + commit** (příkazy v `REVIEW_CODEX_2026_07_15.md`)

## Session 2026-07-15 (4) — dvě nové sekce: Video + Investiční kalkulačka

**Rozsah:** úzký. Přidat DVA nové typy sekcí přesně podle stávajícího vzoru (JSONB obsah,
žádná nová tabulka). NEsahat na existující sekce mimo nutné zapojení. Sandbox mimo →
NESPOUŠTÍM nic; ověření předám Karlovi. NEODŠKRTÁVÁM ověření, které jsem neviděl.

Rozhodnutí (v mezích spec, nízké riziko):
- Obsah obou sekcí = JSONB na řádku sekce (jako ostatní bezsouborové sekce). Žádná tabulka.
- Video: parser staví embed URL z ověřeného ID → src je VŽDY jen na povolené doméně
  (youtube-nocookie.com / player.vimeo.com). Nikdy neprochází syrový vstup, nikdy `<script>`.
  Neplatný/nepodporovaný odkaz: v náhledu srozumitelná hláška „umíme YouTube a Vimeo",
  publikovaně vlídná hláška místo prázdna (žádné tiché selhání), nikdy pád.
- Kalkulačka: vlastní vstupy v JSONB (cena, plocha, volitelně nájem a roční náklady).
  Výpočet čistě klientský (klientská komponenta volá čistou funkci `computeInvestment`).
  Dělení nulou/prázdné vstupy → pomlčka, nepočítá se. Žádná externí služba.
- Zapojení do `add_presentation_section` VYŽADUJE migraci (rozšíření whitelistu + singleton
  listu), stejně jako kolo 2/3 → přidávám migraci a foldnu do APLIKUJ_VSE.sql.

Plán (postaveno — NESPUŠTĚNO, ověří Karel):
- [x] Registr `sections.ts`: video+investmentCalc ready:true; typy + readery; `parseVideoUrl`; `computeInvestment`
- [x] Editor: `VideoFields` + `InvestmentCalcFields`; načtení defaults v page.tsx; `saveVideo`+`saveInvestmentCalc` v actions.ts
- [x] Veřejná stránka: `renderVideo` (iframe embed) + `renderInvestmentCalc`; klientská `InvestmentCalcView`
- [x] Migrace `20260715160000_video_investmentcalc.sql` + fold do `APLIKUJ_VSE.sql` (idempotentně, obě kopie funkce shodné)
- [x] Testy `sections.test.ts` rozšířeny (parser video URL vč. hraničních tvarů; výpočty vč. dělení nulou/prázdna/NaN) — NESPUŠTĚNO
- [x] Křížová revize čerstvým podagentem → ŽÁDNÝ blokátor (importy čisté, žádné české uvozovky v `"…"`, video embed jen povolené domény, výpočet ošetřuje dělení nulou, obě SQL kopie shodné). Opravena 1 drobnost (zastaralý komentář).
- [ ] **Karel — ověřit + commit** (viz Review níž)

### Review — Session 2026-07-15 (4)

**Stav: HOTOVÉ-NEOVĚŘENÉ.** Sandbox mimo → NESPUSTIL jsem migraci, `npm test`,
`typecheck`, `lint` ani `build`. Nic si neodškrtávám jako „zelené" — spustí Karel.

Co přibylo: dvě samostatné sekce podle stávajícího vzoru (JSONB obsah, žádná nová
tabulka). **Video** — majitel vloží odkaz YouTube/Vimeo, veřejná stránka vykreslí
privacy-friendly `<iframe>` (youtube-nocookie / player.vimeo); embed URL se skládá
z ověřeného ID, takže src vždy míří jen na povolenou doménu; neplatný odkaz ukáže
hlášku (ne prázdno, ne pád). **Investiční kalkulačka** — majitel zadá cenu, plochu,
volitelně nájem a roční náklady; výpočet (cena/m², hrubý a čistý výnos) běží čistě
v prohlížeči; dělení nulou a prázdné vstupy → pomlčka.

Migrace: **ANO** (jako u kola 2/3) — rozšířen whitelist + singleton list ve funkci
`add_presentation_section`. Bez ní by šly typy vidět v katalogu, ale nešlo je přidat.

Rozhodnutí k pozdější revizi Karlem (nízké riziko):
- Neplatný odkaz na video se na PUBLIKOVANÉ stránce zobrazí jako vlídná hláška
  „Video se nepodařilo načíst." (dle spec „ne prázdno, žádné tiché selhání").
  Kdyby Karel chtěl u návštěvníka sekci raději úplně skrýt, je to změna jednoho
  řádku v `renderVideo` (`return null` místo hlášky pro `!isPreview`).
- Kalkulačka má vlastní vstupy (nebere cenu/plochu z „Parametrů") — dle spec.

**Riziko:** nízké. Aditivní změna, existující sekce nedotčené (jen registr + 2 switch
větve navíc). **Rollback:** `git revert <hash>` + funkce `add_presentation_section`
se `create or replace` vrátí spuštěním staršího APLIKUJ_VSE (nebo prostě neškodí —
whitelist je jen širší). **Ověřovací cesta:** viz „Kroky pro Karla" v shrnutí chatu.

## Session 2026-07-15 (3) — Otínská KOLO 2 + 3 POSTAVENO (HOTOVÉ-NEOVĚŘENÉ)

**Stav: kolo 2 (půdorysy) + kolo 3 (analytické mapy, POI, reference, novinky, panorama)
napsáno. Sandbox mimo → NESPUŠTĚNO (migrace/test/build). NEODŠKRTÁVÁM ověření.**

Rozhodnutí architektury: obsah nových sekcí je v JSONB (jako kolo 1); obrázky (plány
pater, fotky místností, analytické mapy, panorama) jdou do JEDNOHO privátního bucketu
`presentation-media` s GENERICKÝM veřejným čtením přes cestu (published + owner). Žádné
nové tabulky — jen bucket + rozšíření whitelistu ve `add_presentation_section`.

- [x] Registr: 6 kindů odemčeno (ready+singleton) + readery obsahu; `lib/media.ts`
- [x] Migrace `20260715140000_otinska_round23.sql` (media bucket + policies + rozšíření funkce) → fold do APLIKUJ_VSE (6c + kontrola)
- [x] Editory bez souborů: POI, reference (hvězdičky), novinky (RepeatableItems, JSONB)
- [x] Editory s obrázky: sdílený MediaUploader; analytické mapy (taby + „proč"), panorama (obrázek + poznámka), půdorysy (patra + plán + místnosti s fotkou/popisem)
- [x] Veřejné renderery: mapy v tabech, půdorysy v tabech + modal místnosti, POI karty, reference, novinky, panorama (statické + „interaktivní připravujeme")
- [x] Testy: rozšířen `sections.test.ts` (ready set, nové readery), nový `media.test.ts`
- [x] `tasks/kroky-pro-karla.md`: co vyžaduje klíč/službu (Google Places = budoucnost, panorama interaktivita = budoucnost, media bucket)

Křížová revize (2 nezávislí agenti):
- SQL/registr: bez blokátorů (whitelist 16 a singleton 12 sedí SQL↔katalog; media policy nevytéká drafty). Robustnost: media public-read porovnává cestu jako text (ne cast na uuid) — **upraveno**.
- Editor/stránka: 1 blokátor — duplicitní klíč `floors` v typu `SectionDefaults` (parametry string vs. půdorysy pole) → TS2300 → **opraveno** (přejmenováno na `floorsData`). Náhled v MediaUploaderu po přeřazení — **opraveno**.
- Známé omezení (neblokující): při výměně/odebrání obrázku zůstává starý soubor v bucketu (sirotek v privátním úložišti). Úklid na příště.

- [ ] **Karel — ověřit:** APLIKUJ_VSE.sql → `npm test && npm run build` → klik → commit.

## Session 2026-07-15 (2) — Otínská 1A→1B→1C POSTAVENO (HOTOVÉ-NEOVĚŘENÉ)

**Stav: kód 1A+1B+1C napsán dle `tasks/otinska-1-1-plan.md`. Sandbox byl mimo provoz →
NESPUSTIL jsem migraci, `npm test`, `tsc`, `eslint` ani `build`. NEODŠKRTÁVÁM ověření — spustí Karel.**

1A datový model:
- [x] Migrace `app/supabase/migrations/20260715120000_otinska_sections.sql` + 1:1 vloženo do `APLIKUJ_VSE.sql` (sekce „6b" + rozšířená kontrola)
- [x] Páteř `presentation_sections` (typ/pořadí/zapnuto/JSON) + RLS + RPC řazení/zapínání pod zámkem
- [x] `presentations` +11 polí nemovitosti (GPS, rok, podlaží, PENB už bylo…); `presentation_photos` +popisky/kategorie/room_id
- [x] `presentation_documents` (tabulka) + bucket + policies; model floors/rooms/maps/places/panoramas pro další kola
- [x] Backfill + runtime dopočet („nikdy prázdno"); limit fotek 20→60; `database.types.ts` rozšířeno

1B editor:
- [x] Krok „Sekce" (5 kroků průvodce): přidat/odebrat/šipky/zapnout-vypnout + editor obsahu pro 10 typů + uploader dokumentů + katalog „připravujeme"

1C veřejná stránka:
- [x] `/listing/[slug]` renderuje ZAPNUTÉ sekce v pořadí; hero overlay, sticky cena, lightbox, PENB stupnice, mapa, benefity/dokumenty/odhady/tech.stav/kontakt; neumělé sekce publikovaně přeskočeny; OG obrázek

Testy: [x] `lib/__tests__/sections.test.ts` + `documents.test.ts` (NESPUŠTĚNO)

Křížová revize (2 nezávislí agenti, čerstvý kontext):
- 1A: bez blokátorů (shoda SQL↔typy↔registr, RLS neoslabeno, veřejné čtení jen published).
- 1B/1C: 1 blokátor (nepoužitý import `formatPrice`) → **opraveno**; jinak importy/logika/uvozovky OK.

- [ ] **Karel — ověřit:** migrace (APLIKUJ_VSE.sql) → `npm test && npm run build` → klik v prohlížeči → commity 1A/1B/1C (příkazy v chatu)

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
