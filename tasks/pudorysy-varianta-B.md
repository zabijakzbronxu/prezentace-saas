# Půdorysy — varianta B: obtahování obrysu místnosti polygonem (na příště)

*Stav: NEIMPLEMENTOVÁNO. Model je připravený, kreslicí UI se v tomto kole záměrně nedělalo.*

## Co to je
Vedle špendlíku (varianta A, hotová) druhý způsob označení místnosti: uživatel v editoru **obtáhne
obrys** místnosti přímo na plánu (klikáním rohů → uzavřený mnohoúhelník). Na veřejné stránce se obrys
zvýrazní (poloprůhledná výplň) a klik do plochy otevře fotku + popis, stejně jako špendlík.

## Proč je model už teď připravený (žádná migrace na příště)
Místnost má volitelné pole `polygon` = pole bodů `{x, y}` v procentech plánu (0–100):

- Typ `FloorRoom.polygon?: { x: number; y: number }[]` v `app/lib/presentations/sections.ts`.
- Reader `readRoomPolygon()` už polygon čte a validuje (3+ bodů, ořez do 0–100), jinak `undefined`.
- Server action `saveFloorplans` polygon **uchová**, když dorazí (přes `readRoomPolygon`).
- Editor polygon **nese beze změny** (`Room.polygon?` v `media-editors.tsx`), takže se při uložení
  neztratí — jen zatím nekreslí.

Protože je vše v JSONB `content` sekce, přidání varianty B nevyžaduje SQL migraci.

## Co dodělat příště (jen UI, bez zásahu do DB)
1. **Editor (`media-editors.tsx`):** režim „obtáhnout obrys" — klikáním do plánu přidávat body do
   `room.polygon`, vykreslovat rozpracovaný `<polygon>`/`<polyline>` v SVG přes obrázek; tlačítka
   „uzavřít obrys", „smazat poslední bod", „vymazat obrys". Přepínač špendlík ↔ obrys u místnosti.
2. **Veřejný render (`listing-sections.tsx`, `FloorplansView`):** když má místnost `polygon`, vykreslit
   ho jako klikatelný `<polygon>` v SVG vrstvě nad plánem (poloprůhledná výplň, hover zvýraznění),
   klik → stejný modal jako špendlík. Priorita: má-li místnost polygon i x/y, rozhodnout, co ukázat
   (návrh: obrys jako plocha + volitelně špendlík v těžišti).
3. **Test:** čtení/oříznutí polygonu už pokryté v `sections.test.ts` (blok „readRoomPolygon");
   doplnit test výběru zobrazení (polygon vs. špendlík).

## Pozn.
Špendlíky (varianta A) pokrývají potřebu netechnických klientů teď. Polygon je „hezčí, ale dražší"
a hodí se, až bude čas na přesné obrysy. Držet bez knihovny (SVG + %).
