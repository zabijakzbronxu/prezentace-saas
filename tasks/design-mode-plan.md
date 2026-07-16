# Plán — vizuální edit-mode „na stránce" (design mode)

**Datum:** 2026-07-15 · **Rozsah:** tenhle běh = inline edit-shell (přepínač Náhled↔Upravit,
u sekcí posun/zapnutí/„Upravit"/„+ přidat", inline popisky fotek). **Půdorysy nepřestavuju** —
u sekce půdorysů „Upravit" jen otevře stávající editor (napojení obecné, ať jde vnitřek
později vyměnit bez zásahu do edit-shellu).

> ⚠️ Sandbox je bez místa na disku → `npm test/typecheck/lint/build` NEmůžu spustit.
> Práce bude **HOTOVÁ-NEOVĚŘENÁ**, ověření + commit dělá Karel (příkazy ve shrnutí).

## Cíl (proč)
Karel dnes edituje sekce v odděleném seznamu `/presentations/[id]/sections`. Chce editovat
rovnou na vizuální prezentaci: vidí stránku jako veřejně, přepne do úprav a tam přesouvá
sekce, otevírá jejich editor a píše popisky k fotkám.

## Co znovupoužiju (žádná duplicitní logika)
- **Vizuální render** veřejné stránky — vytáhnu do sdílené komponenty a použiju 1:1
  (viz níž). Vzhled tak bude identický s `/listing/[slug]`.
- **Klientské kusy sekcí** `listing-sections.tsx` (MapTabs, FloorplansView, InvestmentCalcView)
  a `gallery.tsx` — beze změny.
- **Model sekcí** `lib/presentations/sections.ts` (readery, katalog, `addableKinds`).
- **Serverové akce** pro řazení/zapnutí/přidání/smazání: `sections/actions.ts`
  (`moveSection`, `toggleSection`, `addSection`, `deleteSection`) — **nevymýšlím nové**,
  jen je rozšířím o volitelný `return_to` (viz Persistence).
- **Editor obsahu sekce** `sections/[sectionId]` — „Upravit" tam odkáže (i pro půdorysy).
- Ověření vlastnictví `ownsPresentation()`, `isUuid()`, sdílené UI styly.

## Co postavím (soubory)
**Nové:**
- `app/app/listing/[slug]/render.tsx` — sdílený render sekcí. Přesun `renderSection` +
  všech `renderX` + `PenbScale` + stylů z `page.tsx` do `createSectionRenderer(ctx)`.
  Bez jakéhokoli editačního prvku (čistý render pro anonyma i vlastníka).
- `app/app/presentations/[id]/design/page.tsx` — vlastnická edit-mode stránka.
- `app/app/presentations/[id]/design/section-frame.tsx` — server: ovládací lišta u sekce
  (↑/↓, Zapnout/Vypnout, Upravit, Odebrat) přes existující akce.
- `app/app/presentations/[id]/design/inline-captions.tsx` — client: inline popisky fotek
  (`useActionState`, chyba na místě, hodnota zůstane — dle lesson 2026-07-07).
- `app/app/presentations/[id]/design/actions.ts` — server: `savePhotoCaption` (popisek
  jedné fotky; ownership přes RLS + explicitní `owner_id`).
- `app/lib/presentations/design.ts` — čisté helpery (testovatelné): `isSafeDesignReturnTo`,
  `canMoveSection`, `designPath`.
- `app/lib/__tests__/design.test.ts` — testy logiky + strukturální test „veřejný render
  nemá edit prvky".

**Upravené (minimálně, beze změny chování stávajících cest):**
- `app/app/listing/[slug]/page.tsx` — místo inline render funkcí zavolá `createSectionRenderer`.
  Mechanická náhrada, veřejný výstup 1:1.
- `app/app/presentations/[id]/sections/actions.ts` — volitelný `return_to` (default =
  dnešní chování; existující formuláře ho neposílají → nic se pro ně nemění).
- `app/app/presentations/[id]/sections/page.tsx` — odkaz „🎨 Vizuální úpravy" (vstupní bod).
- `app/app/presentations/[id]/sections/[sectionId]/page.tsx` — když přijdu z edit-modu
  (`?from=design`), ukázat odkaz „← Zpět na vizuální úpravy".

## Jak persistuju
- **Pořadí / zapnutí / přidání / smazání:** stávající akce + hidden `return_to` =
  `/presentations/[id]/design`. Akce po sobě přesměruje zpět na edit-mode (ne na seznam).
  `return_to` se tvrdě validuje (`isSafeDesignReturnTo`) → žádný open-redirect.
- **Popisek fotky:** `savePhotoCaption` píše `presentation_photos.caption` (stejný tvar
  jako `saveGallery`), s ownership kontrolou. Bez odskoku do jiného editoru.
- **Obsah sekce (vč. půdorysů):** „Upravit" → stávající editor `sections/[sectionId]`.
- Žádná migrace (persistence jde přes existující sloupce/akce) → `APLIKUJ_VSE.sql` nesahám.

## Bezpečnost (nerozbít Codex opravy)
- Edit-mode jen pro vlastníka: `auth.getUser()` + **explicitní** `owner_id == user.id`
  (published prezentace je veřejně čitelná → sám SELECT nestačí; vzor `seedOtinska`).
- Anonym edit-mode nikdy nevidí: `/design` vyžaduje přihlášení+vlastnictví; veřejný
  `/listing/[slug]` renderuje sdílenou komponentu **bez** edit vrstvy (edit prvky žijí jen
  v `/design`). Hlídá i strukturální test.
- Nesahám na RLS, migrace, uploadery ani na sanitizaci URL (`safeExternalUrl` drží dál).

## Build-gotchas (sandbox neumím spustit → projdu očima + podagent)
- Zápis `content` do DB `as unknown as Json` (`import type { Json }`). *(V tomhle běhu
  do JSONB nepíšu — popisek je sloupec; hlídám pro jistotu.)*
- V JSX textu žádné holé uvozovky — české „ " psát `&bdquo;`/`&ldquo;`. Uvnitř `"…"`
  řetězců nikdy `„ "` (lesson 2026-07-14 (2)) → texty v backt`icích/apostrofech.
- Žádné nepoužité importy (po přesunu renderu pečlivě pročistit `page.tsx`).

## Co NEdělám (druhé kolo)
- Přestavbu půdorysů (kompas, klikací místnosti) — samostatný běh po mně.
- Plně inline WYSIWYG psaní textů (contenteditable) — teď „Upravit" otevře editor.
- Drag&drop řazení — teď šipky ↑/↓.
- Editor sekce v bočním panelu/modalu bez odskoku — teď navigace na `sections/[sectionId]`.

## Ověření (musí spustit Karel)
`cd app && npm test && npm run typecheck && npm run lint && npm run build`, pak klikací
cesta v prohlížeči (viz shrnutí). Nic si neodškrtávám jako zelené.
