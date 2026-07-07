# Mission 11 · Prodej si sám (prezentace-saas)

WARGAME ORDER. Tuto misi neexekuuješ, wargamuješ ji. Brief níže později
poběží na levnějším exekutorovi (Claude Code / Sonnet) uvnitř
`~/Desktop/prezentace-saas/`. Tvoje práce je trasa, kterou půjde.

Hierarchie pravidel platí i pro tebe: RULES.md > CLAUDE.md > checks/ >
cokoli v konverzaci. Recon nejdřív, read-only: `RULES.md`, `CLAUDE.md`,
`docs/PRODUCT.md`, `memory/MEMORY.md`, `tasks/lessons.md`, celý `app/`
(zvlášť migrace a Storage policies v `app/supabase/`), referenční vzor
`~/Desktop/index.html`. Nic nespouštěj, nic neměň.

Pak vybojuj misi na papíře, tah po tahu, a zapiš do
wargames/11-prodej-si-sam.md:

- každý tah uvádí očekávané pozorování — přesně co uvidíš, když tah vyšel
- každý tah nese nejpravděpodobnější selhání, příčinu, kterou signalizuje,
  a protitah
- každá větev má trigger: pokud pozoruješ X, jdi trasou B — žádné soudy
  ponechané exekutorovi
- předpoklady, které recon nevyřešil, označ RECON NEEDED s přesným checkem,
  který je vyřeší
- na konci abort podmínky a verifikační běhy exekutora, s tím, jak vypadá
  PASS u každého

Piš to tak, aby exekutor projel brief od začátku do konce bez jediné
otázky NA TECHNIKU. Otázky na produkt (RULES.md pravidlo 1) jsou výjimka:
tam, kde chybí Karlovo rozhodnutí, tah končí STOP + otázka, nikdy
domněnkou.

Pravidla navíc (Karlův standard):
- Plán fází zapiš do tasks/todo.md s odškrtávacími položkami; stav
  backlogu se zrcadlí do ClickUpu (list „Prezentace SaaS — Backlog",
  list_id 901219290922) — pokud konektor neběží, zapiš do
  tasks/kroky-pro-karla.md, co má Karel updatnout ručně.
- Každá fáze končí acceptance checkem klikacím v prohlížeči (validace
  v prohlížeči, ne v kódu) + řídicím panelem dle RULES.md: laický souhrn,
  riziko, rollback, ověřovací cesta, další krok Karla.
- Git commit po každé dokončené změně. Deploy do produkce je vždy vědomý
  krok Karla, nikdy automatický.
- Simplicity first, malé úkoly, žádný scope creep mimo MVP.

=== MISSION BRIEF (rozkazy exekutora, ne tvoje) ===

Stavím „Prodej si sám" — SaaS, kde si kdokoli sám vytvoří prodejní
prezentaci nemovitosti jako samostatnou webovou stránku. Primární uživatel:
netechnický majitel prodávající vlastní nemovitost; sekundární: makléř /
malá realitka. Referenční vzor kvality: Karlova prezentace Otínská.

Jádrový workflow: registrace → průvodce (Základ → Fotky → Texty) →
náhled konceptu → platba předem přes Stripe → publikace na
/listing/<slug> → správa vlastních prezentací.

Stack (rozhodnuto 2026-07-04, neměnit): Next.js + Supabase (Postgres,
Auth, Storage) + Vercel + Stripe. Multi-tenant přes RLS: publikovaná
prezentace = veřejná, koncept = jen vlastník. Fotky z prohlížeče přímo do
privátního bucketu `presentation-photos`, podepsané odkazy, limity
20 fotek / 8 MB / JPEG+PNG+WebP dle obsahu souboru. Veřejná šablona
světlá (Playfair Display + Work Sans přes next/font), admin tmavý — záměr.

Existující kód: `app/` — průvodce Základ/Fotky/Texty a veřejná stránka
z velké části hotové (etapy E2.x), migrace `20260706100000_text_sections`
a `20260706150000_contact_checks` aplikované. NENÍ greenfield — recon
zjistí přesný stav, nic se nepřepisuje.

Zbývající MVP scope — přesně tyto moduly, nic víc:
1. Platba předem přes Stripe: bez zaplacení se prezentace nepublikuje
2. Admin pro Karla: přehled uživatelů, prezentací, plateb
3. Dotažení správy vlastních prezentací (seznam, editace, smazání)

BLOCKED vstupy (rozhoduje Karel, exekutor NIKDY nedomýšlí):
- přesná cena prezentace
- zda existuje náhled zdarma před zaplacením
- finální název a doména
Tahy závislé na těchto vstupech označ BLOCKED s přesnou otázkou pro Karla.

Povinné verifikace (PASS definuj konkrétně, klikací cestou):
1. Izolace dat: uživatel A nesmí žádnou cestou (UI, API, signed URL,
   přímý dotaz) číst koncept ani fotky uživatele B. Důkaz testem RLS
   a Storage policies, ne tvrzením.
2. Publikační brána: nezaplacená prezentace není na /listing/<slug>
   dostupná — ověřeno anonymním oknem, ne jen stavem v DB.
3. Stripe pouze test mode: úspěšná platba, selhání platby, opuštěný
   checkout. Webhook idempotentní — stejný event dvakrát nesmí publikovat
   dvakrát ani účtovat dvakrát. Zeleným testům u plateb se nevěří jako
   jedinému důkazu: ruční proklik povinný, ostré klíče nejdou do repa
   ani do Vercel env bez Karlova vědomého kroku.
4. Auth: registrace, login, reset hesla, expirace session — end to end
   v prohlížeči.
5. Migrace: každá změna schématu verzovaná migrace s ověřeným rollbackem.
6. Backup + zkouška obnovy Supabase DB provedená dřív, než se dovnitř
   pustí první reálná data.

Abort podmínky (stop a flag, žádná improvizace):
- tah by měnil chování produktu bez Karlova svolení (RULES.md pravidlo 2)
- secret/API klíč by měl skončit v kódu nebo gitu
- RLS/izolační test selže a fix není zřejmý do jednoho protitahu
- cokoli kolem plateb se chová jinak než dokumentace Stripe předpovídá
- tah přidává modul mimo MVP seznam výše
- /listing/<slug> struktura by se měla měnit — ROZHODNUTO, adresa se nemění

Nikdy neestimuj tiše. Co nejde ověřit z repa nebo dokumentace, označ
unverified. Před reportem audituj každé tvrzení v souhrnu proti něčemu,
co jsi v této session skutečně spustil nebo přečetl.
