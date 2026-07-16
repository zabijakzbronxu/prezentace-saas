# Půdorysy — klikací špendlíky + kompas (plán session)

*2026-07-15 · Kolo 2 upgrade. Stavím NA stávající sekci „Půdorysy pater", nestavím od nuly.*

> **STROJOVĚ NEOVĚŘENO.** Sandbox je mimo (no space) → `npm test / typecheck / lint / build`
> NEBĚŽELY. Práce je **HOTOVÉ-NEOVĚŘENÉ**; příkazy k ověření a commitu jsou na konci session
> ve zprávě pro Karla. Nic si neodškrtávám jako zelené, co jsem neviděl.

## 0. Laický souhrn
Dnes sekce „Půdorysy" umí: patra + obrázek plánu + **seznam** místností (název, plocha, popis, fotka),
veřejně jako taby + modal po kliknutí na řádek. Přidávám dvě věci z Otínské:

1. **Kompas u patra** — nastavíš, kterým směrem je sever (0–360°), a na veřejné stránce se v rohu
   plánu ukáže kompasová růžice natočená stejně.
2. **Klikací špendlíky na plánu** — místo (nebo vedle) seznamu klikneš přímo do obrázku plánu a
   položíš špendlík = místnost. Špendlík má název, fotku a popis. Na veřejné stránce jsou špendlíky
   přímo na plánu; klik otevře fotku + popis (stejný modal jako dnes).

Cíl: klient, který má jen **naskenovaný/vyfocený plán**, z něj udělá interaktivní půdorys bez kreslení.

## 1. Zdroj pravdy (Otínská)
`~/Desktop/index.html` a `index.txt` na disku **nejsou** (byly zpracované v dřívějším běhu; repo-ukázka
`app/lib/presentations/otinska-sample.ts` je bez obrázkových sekcí). Kompas proto stavím podle Karlovy
specifikace (0–360°, ovladač + číslo, růžice) + klasické růžice, ne pixel-kopií. Chování špendlíků a
modalu 1:1 navazuje na dnešní `FloorplansView`.

## 2. Datový model (JSONB, zpětně kompatibilní — BEZ migrace)
Rozšíření tvaru `content` sekce `floorplans` (v `lib/presentations/sections.ts`):

```
floor  = { label, image_path?, compass?, rooms[] }
room   = { name, area?, description?, image_path?, x?, y?, polygon? }
```

- `compass` = stupně 0–360 (natočení severu), volitelné.
- `x`, `y` = pozice špendlíku v **procentech** (0–100) → sedí při každé velikosti obrázku. Volitelné.
- `polygon` = **varianta B** (viz níž): pole bodů `{x,y}` v %, jen se čte/uloží, zatím se NEkreslí.
- **Zpětná kompatibilita:** stará místnost bez `x/y` → není špendlík → zobrazí se v seznamu (jako dnes).
  Staré patro bez `compass` → žádná růžice. Nic nespadne.

Čisté (testovatelné) helpery: `normalizeCompassDeg` (mod 360), `clampFloorPercent` (0–100).

## 3. Kde co měním
| Soubor | Změna |
|---|---|
| `app/lib/presentations/sections.ts` | typy `FloorRoom`/`FloorItem`, helpery, reader (zpětně kompat) |
| `app/app/listing/[slug]/compass.tsx` (NOVÝ) | čistá SVG růžice `CompassRose(deg,size)` — bez knihovny |
| `app/app/presentations/[id]/sections/[sectionId]/media-editors.tsx` | editor: ovladač kompasu + klikací/tažitelné špendlíky nad plánem + nápověda |
| `app/app/presentations/[id]/sections/[sectionId]/editor.tsx` | typ `floorsData` (compass + x/y) |
| `app/app/presentations/[id]/sections/[sectionId]/page.tsx` | naplnit defaults (compass + x/y) |
| `app/app/presentations/[id]/sections/[sectionId]/actions.ts` | `saveFloorplans`: parsovat compass + x/y + polygon (clamp) |
| `app/app/listing/[slug]/listing-sections.tsx` | `FloorplansView`: špendlíky na plánu + růžice + číslovaný seznam + modal |
| `app/app/listing/[slug]/render.tsx` | předat `compass` + `x/y` do `FloorplansView` |
| `app/lib/__tests__/sections.test.ts` | testy helperů, kompasu, špendlíků, zpětné kompat, polygonu |

**Nesahám:** edit-shell/design (Upravit už routuje na `/sections/[id]?from=design` = tenhle editor),
bezpečnostní registrace médií (`sync_presentation_media`), ostatní sekce, DB (žádná migrace).

## 4. Bez cizí knihovny
Klikání i kompas = React + SVG + CSS transform, pozice v %. Žádná DnD/mapová knihovna, žádný API klíč.

## 5. Varianta B (jen připravit, NEIMPLEMENTOVAT teď)
Obtahování obrysu místnosti **polygonem**. Model už polygon unese (`room.polygon`), takže se přidá bez
migrace. Kreslicí UI se teď NEDĚLÁ. Detail v `tasks/pudorysy-varianta-B.md`.

## 6. Testy / ověření
- Vitest (čistá logika): `normalizeCompassDeg` (0/360/450/-90/„180"/nesmysl), `clampFloorPercent`
  (rozsah, řetězec, nesmysl), reader — zpětná kompat (stará místnost bez x/y), kompas na patře,
  polygon (≥3 body jinak zahodit). Autorizace vlastníka drží RLS + `saveSection` (načte sekci pod RLS).
- Sandbox mimo → `npm test/typecheck/lint/build` spustí Karel. Vizuál proklikat v prohlížeči.

## 7. Řídicí panel (RULES.md)
- **Riziko:** úprava editoru a veřejného renderu půdorysů. Hlavní riziko = rozbité zobrazení. Kryté
  zpětnou kompatibilitou (bez x/y = dnešní seznam) a tím, že prázdné patro se chová jako dnes.
- **Rollback:** aditivní; `git revert <hash>` / vrátit dotčené soubory z gitu. DB beze změny.
- **Ověřovací cesta:** editor sekce Půdorysy → nahraj plán → nastav kompas → klikni do plánu (přidá
  špendlík) → vyplň název/fotku/popis → ulož → `/listing/<slug>` → špendlíky na plánu, klik = fotka+popis,
  růžice natočená dle kompasu; stará prezentace bez špendlíků vypadá jako dřív.
- **Další krok Karla:** `npm test && npm run typecheck && npm run lint && npm run build`, proklikat, commit.

## 8. Stav po dokončení (HOTOVÉ-NEOVĚŘENÉ)
Hotovo v kódu (sandbox mimo → NEspuštěno `test/typecheck/lint/build`, nic neodškrtávám jako zelené):
- `sections.ts`: helpery `clampFloorPercent`, `normalizeCompassDeg`, `readRoomPolygon`; `FloorRoom` (+x/y/polygon),
  `FloorItem` (+compass); `readFloorplansContent` zpětně kompatibilní.
- `compass.tsx` (NOVÝ): čistá SVG růžice `CompassRose`.
- `media-editors.tsx`: editor s kompasem + klikacími/tažitelnými špendlíky + nápovědou; `MediaUploader`
  vrací i blob náhled (klikání hned po nahrání). Nový podkomponent `PlanPinboard`.
- `editor.tsx`, `page.tsx`, `actions.ts`: napojení defaults + `saveFloorplans` (compass/x/y/polygon, clamp).
- `listing-sections.tsx` + `render.tsx`: veřejné špendlíky + růžice + číslovaný seznam + modal; zpětná kompat.
- `sections.test.ts`: +cca 20 testů (kompas rozsah, clamp %, zpětná kompat, polygon).
- Varianta B: `tasks/pudorysy-varianta-B.md`.

Křížová revize (čerstvý nezávislý agent, čtením kódu — sandbox mimo): **žádné blokátory**
(uvozovky, importy, cesty, typy null/undefined, zápis přes `writeContent`+`Json`, zpětná kompat,
React hooky/klíče, logika drag-vs-klik). Nity kosmetické (index jako key = stávající vzor v repu;
kompas 360→0 je sémanticky správně). Migrace NENÍ potřeba (vše JSONB).
