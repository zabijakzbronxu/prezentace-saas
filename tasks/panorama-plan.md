# Plán — skutečný interaktivní 360° prohlížeč (nahrazuje statickou panorama sekci)

Stav sandboxu: **bash mimo (no space)** → jen file tooly, nic nespouštím, NEcommituju.
Práci označím **HOTOVÉ-NEOVĚŘENÉ**, ověření + commit dělá Karel (příkazy v `kroky-pro-karla.md`).

## Cíl
Statickou „panorama = velký obrázek + připravujeme" sekci nahradit **skutečným
interaktivním 360° prohlížečem**: otáčení tažením (myš i prst), zoom, klikací
hotspoty s info oknem, víc scén (místo/patro). Bez placeného klíče, bez cizí služby.

## Volba řešení: zero-dependency WebGL (žádný npm balík)
- Zvažoval jsem `pannellum` (MIT) i Three.js kouli. **Nevybírám je**, protože:
  - nemůžu tady ověřit build/bundle (sandbox mimo) → přidat balík naslepo = riziko
    bílé stránky / spadlého buildu, které Karel (neprogramátor) neodladí;
  - RULES: nefejkovat, ale ani neriskovat neověřený cizí kód v produktu.
- **Vlastní minimální WebGL equirektangulární prohlížeč** (koule + textura):
  - **žádný `npm install`** (velká výhoda — nic nového se nemůže rozbít v bundleru),
  - žádné CDN / cizí skript (respektuje bezpečnostní pozici repa, žádné CSP starosti),
  - plná kontrola nad dotykem/myší/zoomem/hotspoty,
  - **fallback**: když WebGL/textura selže (starý prohlížeč, CORS), ukáže se statický
    obrázek — nikdy „prázdno"/pád.
- Klientská komponenta (`"use client"`), veškerá práce s `window/canvas` až v
  `useEffect` → SSR bezpečné (stejný osvědčený vzor jako `FloorplansView`).

## Datový model (JSONB `content`, zpětně kompatibilní)
```
PanoramaHotspot = { id, yaw(-180..180), pitch(-90..90), title, description?, image_path?, target_scene? }
PanoramaScene   = { id, title?, image_path, hotspots: PanoramaHotspot[] }
PanoramaContent = { heading?, caption?, image_path?(LEGACY), scenes?: PanoramaScene[] }
```
- **Zpětná kompatibilita:** stará data mají jen `image_path` (bez `scenes`).
  - Render: jsou-li `scenes` → interaktivní prohlížeč; jinak (jen legacy `image_path`)
    → **statický obrázek jako dřív** (neriskujeme otáčení ploché fotky).
  - Editor: při otevření staré sekce se `image_path` nabídne jako **Scéna 1**
    (majitel jen doplní hotspoty a uloží → stane se interaktivní).
- **Umístění hotspotu bez 3D editoru:** majitel klikne do **ploché** 360 fotky
  (equirektangulární). Pro equirektangulární projekci platí přesně:
  `yaw = x% /100*360 - 180`, `pitch = 90 - y% /100*180`. Klik → yaw/pitch (uloží se),
  špendlík zpět = inverzní převod. Stejný osvědčený vzor jako špendlíky u půdorysů.
- **Google Places (auto-body/recenze)** = jen připravit `target_scene`/model, NEDĚLAT
  (placený klíč). Popsat do `kroky-pro-karla.md`.

## Čistá logika (do `sections.ts`, testovatelné vitestem)
- `readPanoramaContent` rozšířit o `scenes` (validace, zpětná kompatibilita).
- `panoXyToYawPitch`, `panoYawPitchToXy`, `clampYaw`, `clampPitch`.
- `projectHotspot(yaw,pitch, camYaw,camPitch, fovDeg, aspect)` → `{xPct,yPct,visible}`
  (stejné matice jako shader → konzistence pinů s texturou z principu).

## Dotčené soubory
- `lib/presentations/sections.ts` — model + čisté funkce + reader.
- `app/listing/[slug]/panorama-viewer.tsx` (NOVÝ) — WebGL prohlížeč, `"use client"`.
- `app/listing/[slug]/render.tsx` — `renderPanorama`: scény → prohlížeč, jinak fallback.
- `app/listing/[slug]/page.tsx` + `sections/[sectionId]/page.tsx` — sběr media cest
  (scény + hotspoty) pro podepsané URL.
- `sections/[sectionId]/media-editors.tsx` — nový `PanoramaFields` (scény + hotspoty).
- `sections/[sectionId]/editor.tsx` — předání dat.
- `sections/[sectionId]/actions.ts` — `savePanorama`: validace scén/hotspotů + sync
  VŠECH media cest.
- `lib/presentations/sections.ts` katalog — popis sekce bez „připravujeme".
- `lib/__tests__/sections.test.ts` — nové testy.

## Migrace
**Není potřeba** — `content` je JSONB, `panorama` už je v CHECK whitelistu a `ready`.
Registrace obrázků jede stávající RPC `sync_presentation_media` (jen víc cest).

## Ověření (pouští Karel)
`npm test && npm run typecheck && npm run lint && npm run build`, pak klik v Náhledu.
Křížová revize: čerstvý podagent (typecheck rizika, JSX uvozovky, zpětná kompatibilita,
bezpečnost signed-URL, konzistence editor↔render).
