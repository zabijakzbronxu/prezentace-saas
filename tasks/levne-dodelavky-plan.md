# Levné dodělávky před finální Codex revizí — plán

*Zdroj: `tasks/OTINSKA-gap-1-1.md` sekce A (levné, vysoký dopad). Žádné placené klíče (Google Places, chatbot).*

## Cíl
Posunout SaaS blíž Otínské čtyřmi levnými prvky. Bez rozbití `REVIEW_CODEX_2026_07_15.md` (RLS sekcí/dokumentů/médií, XSS URL, integrita sekcí, hlasité chyby).

## Klíčová zjištění z kódu (zdroj pravdy)
- **Média sekcí** (`presentation-media`) jsou veřejná jen přes registraci `presentation_media` (řádek u ZAPNUTÉ sekce PUBLISHED prezentace) — viz Codex H3/H4. Registrace přes RPC `sync_presentation_media(presentation_id, section_id, paths[])`. **Vazba na sekci je generická** (`s.id = m.section_id`, kontroluje `s.enabled`) → tentýž mechanismus jde použít pro screenshoty odhadů i fotky tech. stavu, **bez změny schématu**.
- **Dokumenty** (`presentation-documents`) jsou veřejné jen když je zapnutá sekce `documents` (Codex H2). Není per-dokument vazba na jinou sekci.
- Galerie: `page.tsx` už `category` z DB **načítá**, ale `GalleryImage` ho zahazuje. Editor kategorii **umí nastavit** (`GalleryFields` + `saveGallery`).
- Editor obrázkových sekcí: vzor `AnalyticMapsFields` (per-item `MediaUploader`, hidden `items_json`, `mediaUrls` pro náhledy). `keepMediaPath` + `syncMedia` v `actions.ts`.

## Rozhodnutí (a proč)
1. **Screenshoty u odhadů** — `ValuationItem.image_path` do JSONB. Reuse `MediaUploader` + `syncMedia`. Bez migrace. Render: náhled + lightbox.
2. **Seskupení galerie** — `GalleryImage.category`, seskupit v `gallery.tsx`; bez kategorie → „Ostatní". Bez migrace, bez změny editoru (kategorie už existuje).
3. **Foto + dokument u tech. stavu** —
   - **Foto**: `ConditionItem.image_path` → reuse `MediaUploader` + `syncMedia` (media RLS je generická vůči sekci). Bez migrace.
   - **Dokument**: `ConditionItem.document_id` = odkaz na **existující** `presentation_documents` (výběr z už nahraných dokumentů). **Nezasahuje do Codex H2 RLS ani schématu.** Důsledek (dokumentovat Karlovi): odkaz na dokument se veřejně ukáže, jen když je zapnutá sekce **Dokumenty** (RLS H2). To je vědomý kompromis, aby se neměnila zabezpečená RLS. Alternativu (per-dokument `section_id` + rozšíření RLS) NEDĚLÁM bez svolení — je to změna Codex hráze (RULES pravidlo 1+2).
4. **Kontaktní formulář** — repo nemá žádný mailer → poptávky do DB tabulky `presentation_inquiries`.
   - RLS: **INSERT kdokoliv, ale jen na PUBLISHED prezentaci** (anti-abuse: nejde spamovat koncepty); **SELECT jen vlastník** prezentace.
   - Anti-spam: honeypot pole `company` (když vyplněné → tváříme se OK, neukládáme). Validace e-mailu (regex jako `form.ts`). Aspoň jedno z e-mail/telefon.
   - Žádné tiché selhání: `useActionState` → hláška úspěch/chyba na místě.
   - Vlastník vidí poptávky na `/presentations/[id]/inquiries` (odkaz ze sekcí).
   - **Migrace nutná** (pre-schváleno v zadání). Idempotentně + do `APLIKUJ_VSE.sql`.

## Soubory
- `lib/presentations/sections.ts` — modely + readery (F1, F3).
- `app/listing/[slug]/gallery.tsx`, `page.tsx`, `render.tsx` — render (F1, F2, F3, F4).
- `app/listing/[slug]/media-thumb.tsx` (nový) — náhled+lightbox jednoho obrázku.
- `app/listing/[slug]/contact-form.tsx` (nový) + `inquiry-actions.ts` (nový) — F4 klient + akce.
- editor: `media-editors.tsx` (ValuationFields, ConditionFields), `editor.tsx`, `sections/[sectionId]/page.tsx`, `sections/[sectionId]/actions.ts`.
- `app/presentations/[id]/inquiries/page.tsx` (nový) + odkaz v `sections/page.tsx`.
- DB: `supabase/migrations/20260814120000_kontaktni_poptavky.sql` (nový) + `APLIKUJ_VSE.sql` + `lib/database.types.ts`.
- Testy: `lib/__tests__/*` (galerie, readery, inquiry validace).

## Sandbox
Nejspíš mimo → jen file tooly, NEspouštím, NEcommituju. Vrátím Karlovi příkazy + SQL.

## Review (hotovo 2026-08-14)
Postaveno všech 5 částí (F1, F2, F3-foto, F3-dokument, F4). Sandbox ověření:
`tsc --noEmit` ✅, `eslint` ✅, `vitest` ✅ **230 testů** (21 nových). `next build` v sandboxu
nešel (zamčený `.next` + Turbopack odmítá cross-mount symlink node_modules) → musí Karel.
Nezávislá křížová revize (čerstvý podagent): **žádný blokátor**; Codex H1–H5 RLS netknuté
(diff APLIKUJ_VSE.sql = jen +37 řádků), RLS poptávek fail-closed, registrace médií maže jen
řádky vlastní sekce. Opraven 1 nález revize: `/design` náhled teď podepisuje i obrázky
valuation/technicalCondition (parita s veřejnou stránkou).
Otevřená doporučení (ne blokátor): rate-limit/mazání poptávek proti spamu (jen honeypot);
document u tech. stavu se veřejně ukáže jen se zapnutou sekcí Dokumenty (vědomý kompromis,
aby se neměnila Codex H2 RLS).

## Ověřovací cesta (do řídicího panelu)
- Odhady: přidej screenshot → náhled v editoru → publikuj → na kartě odhadu náhled, klik zvětší.
- Galerie: nastav fotkám kategorie → publikuj → sekce galerie rozdělená nadpisy kategorií.
- Tech. stav: přidej fotku k položce → náhled veřejně; přidej dokument (musí být zapnutá sekce Dokumenty) → odkaz.
- Formulář: na publikované stránce vyplň → hláška o odeslání; poptávka v `/inquiries`; honeypot test; koncept → formulář neodešle (RLS).
