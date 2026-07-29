# Polygony — plán (plan-first)

*Cíl: dva „těžké" vizuální kusy Otínské bez placeného klíče, sdílející jednu techniku
(obtažení polygonu nad obrázkem). Vše bez cizí knihovny, čistě SVG + %.*

> Kontext repa: na disku jsou NEZACOMMITOVANÉ změny z panorama sekce (jiná session).
> Nesahám na ně, `git reset` nedělám, přidávám na stávající stav. Commit NEDĚLÁM —
> příkazy vrátím Karlovi.

## Co stavím

1. **Sdílený nástroj `ImagePolygonEditor`** (nový client komponent
   `app/app/presentations/[id]/sections/[sectionId]/polygon-editor.tsx`):
   - klikáním do obrázku přidávám vrcholy; pozice ukládám v **procentech (0–100)** vůči
     obrázku → sedí na mobilu i velké obrazovce (stejný princip jako špendlíky/hotspoty),
   - vrcholy jde **přetáhnout** (myš i prst, `pointer` eventy + `touch-action:none`),
   - **dvojklik nebo tlačítko „Hotovo" uzavře obrys** (lokální UI stav `closed`; do dat
     se ukládá jen pole bodů — polygon je uzavřený implicitně, když má 3+ body),
   - tlačítka: „Zpět (smazat poslední bod)", „Vymazat obrys", „Upravit / Hotovo",
   - kreslí `<svg viewBox="0 0 100 100" preserveAspectRatio="none">` přes obrázek:
     rozpracované body jako `<polyline>`, 3+ bodů jako `<polygon>` s poloprůhlednou výplní;
     vrcholy jako tažitelné body.
   - **Controlled**: rodič drží `points`, dostane `onChange(points)`. Editor si drží jen
     UI stav (drag, closed).

2. **Polygonové půdorysy** — model `FloorRoom.polygon` UŽ existuje (kolo 2, varianta B),
   `readRoomPolygon` ho čte/validuje, `saveFloorplans` ho uchová. Chybí jen UI:
   - **Editor (`media-editors.tsx`, `FloorplansFields`)**: u místnosti tlačítko
     „Obtáhnout obrys". Aktivní obtahování přepne plochu plánu z `PlanPinboard` (špendlíky)
     na `ImagePolygonEditor` vázaný na `room.polygon` té místnosti (jedna interaktivní
     plocha, žádné překrývání). Banner „Obtahuješ: {místnost}" + „Hotovo".
   - **Veřejný render (`render.tsx` → `FloorplansView` v `listing-sections.tsx`)**:
     místnost s polygonem = **klikací barevné pole** (poloprůhledná výplň + obrys, hover
     zvýrazní), klik → stejný modal (foto+popis) jako špendlík. Místnost jen se špendlíkem
     funguje dál jako teď. Číslování je společné pro „umístěné" místnosti (polygon i pin).

3. **Hranice pozemku přes hero** — nový drobný kousek modelu v `HeroContent`:
   - `land_polygon?: RoomPolygonPoint[]` (reuse `readRoomPolygon`), přidán `readHeroContent`,
   - **Editor (`editor.tsx` `HeroFields`)**: nad hlavní fotkou `ImagePolygonEditor`
     na hranici pozemku; skryté pole `land_polygon_json`. Potřebuje **URL hlavní fotky** —
     dotáhnu v `sections/[sectionId]/page.tsx` (podepsané PHOTOS_BUCKET URL).
   - **Save (`actions.ts` `saveHero`)**: přečte `land_polygon_json`, validuje `readRoomPolygon`,
     uloží do `content.land_polygon` vedle `show_price`.
   - **Render (`render.tsx` `renderHero`)**: je-li polygon + hero fotka, vykreslí přes fotku
     **poloprůhledný obrys/výplň** (SVG, server, bez interakce), pod gradientem s textem.
     Bez polygonu hero vypadá jako dnes.

## Datový model (bez migrace — vše v JSONB `content`)

- `HeroContent = { show_price?: boolean; land_polygon?: RoomPolygonPoint[] }`.
- `FloorRoom.polygon?: RoomPolygonPoint[]` (už existuje).
- `RoomPolygonPoint = { x: number; y: number }` v % (0–100), validní od 3 bodů výš.
- KIND se nemění → **žádná změna DB CHECK, žádná migrace, žádný zásah do APLIKUJ_VSE.sql.**

## Zpětná kompatibilita (klíčové)

- Hero bez `land_polygon` → beze změny (dnešní vzhled).
- Místnost jen se špendlíkem (bez polygonu) → renderuje se jako špendlík jako teď.
- Místnost s polygonem → renderuje se jako pole; pokud má i špendlík, špendlík se u ní
  neduplikuje (pole je jediný klikací cíl).
- Vše čte přes tolerantní readery (nesmysl → prvek se přeskočí, nikdy pád).

## Bezpečnost / pravidla repa

- `content` do DB `as unknown as Json` (import `Json`) — dodrženo přes stávající `writeContent`.
- Obrázky přes stávající bucket + RLS + `sync_presentation_media` — polygony jsou jen
  souřadnice, NEregistrují médium, takže `REVIEW_CODEX_2026_07_15.md` zůstává nedotčen.
- V JSX žádné holé uvozovky (`&bdquo;`/`&ldquo;`), žádné nepoužité importy.
- Napojení na `/design`: „Upravit" u sekce vede na tenhle editor (beze změny).

## Testy (logika)

- `readHeroContent`: čte `show_price` i `land_polygon` (3+ bodů), <3 body → undefined, ořez 0–100.
- Zpětná kompatibilita: hero bez polygonu → `land_polygon` undefined; místnost jen se
  špendlíkem projde beze změny; místnost s polygonem se přečte (už pokryto).
- Round-trip: polygon přežije `readFloorplansContent`.
- Autorizace: beze změny — jde přes stávající `saveSection` (RLS = jen vlastník); nové
  logice nepřidávám nový vstupní bod do DB.

## Verifikace

- `npm test && npm run typecheck && npm run lint && npm run build` (spustí Karel — sandbox
  mimo, commit nedělám).
- Křížová revize čerstvým podagentem (blokátory opravit).

## Hotovo (review)

Postaveno vše z plánu:
- `polygon-editor.tsx` — sdílený `ImagePolygonEditor` (klik = vrchol v %, drag myš+dotyk,
  dvojklik/tlačítko uzavře, zpět/vymazat; čisté SVG, bez knihovny).
- Půdorysy: v editoru u místnosti „Obtáhnout obrys" (přepne plochu plánu na kreslení),
  na veřejné stránce klikací barevná pole (hover zvýrazní) → modal jako u špendlíku.
- Hero: v editoru obtažení hranice pozemku nad hlavní fotkou, na veřejné stránce
  průsvitný obrys přes hero (jantár. barva). Volitelné.
- `sections.ts`: `HeroContent.land_polygon` + `readHeroContent` (reuse `readRoomPolygon`).
- Testy: `readHeroContent` (default, ořez, <3 body, zpětná kompatibilita) + doplněn test
  „místnost jen se špendlíkem projde beze změny".
- **Bez migrace** (jen JSONB), APLIKUJ_VSE.sql beze změny, media bucket/RLS nedotčeno.

Křížová revize (čerstvý podagent): **žádné blokátory.** Typecheck/lint/build ověří Karel
(sandbox v této session neběží kvůli commitu — viz kroky pro Karla).
