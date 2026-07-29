# OTÍNSKÁ — poctivý gap audit „jak daleko od 1:1"

*2026-07-28 · Autor: AI asistent · **NIC v aplikaci ani v DB nebylo změněno** — jen čtení a porovnání.*

> **Oprava dřívějšího tvrzení.** Dřív jsem tvrdil, že SaaS prezentace je „1:1" jako Otínská. **To bylo špatně.**
> Karel má pravdu: 1:1 to není, ani zdaleka. Tento dokument říká, jak daleko to reálně je, podložené kódem.

## Zdroje pravdy (a co je ověřené vs. ne)

- **Strana SaaS (současný stav)** — ověřeno **přímo v kódu** aktuálního repa:
  `app/app/listing/[slug]/{page,render,listing-sections,gallery,sticky-bar,compass}.tsx`,
  `app/lib/presentations/{sections,otinska-sample,design}.ts`, editor v `app/app/presentations/[id]/…`.
  Konkrétní tvrzení níže jsou z těchto souborů.
- **Strana Otínská (referenční)** — čerpáno z `~/Desktop/otinska-vs-saas-analyza.md` (detailní rozbor sekcí
  z původního `index.txt`). **Neověřoval jsem to znovu proti syrovému `index.txt`/`index.html`** — beru
  analýzu jako věrný popis. Kde na tom závisí verdikt, je to označeno „(dle analýzy, neověřeno proti syrovému buildu)".
- Živá Otínská (`conhecer-ang.com/otinska/`) neběží → vizuál jsem neviděl na vlastní oči; jedu z popisu.

**Důležitý kontext:** repo se od 14. 7. (kdy vznikla analýza) hodně posunulo. Analýza popisuje SaaS jako
„holou kostru, 17 polí" — **to už neplatí.** Dnes existuje páteř sekcí (řazení/zapínání/design mode) a 19 typů
sekcí. Proto níž porovnávám Otínskou proti **dnešnímu** kódu, ne proti té staré analýze SaaS.

---

## Tabulka: sekce Otínské → stav v SaaS → co chybí

Stav: **1:1** = prakticky shodné · **zjednodušené** = existuje, ale chudší · **placeholder** = jen náznak/„připravujeme" · **chybí** = není.

| # | Sekce Otínské | Stav v SaaS | Co konkrétně chybí / je jinak |
|---|---|---|---|
| 1 | **Hero** (dronová fotka + H1 + **polygon hranice pozemku** přes fotku) | **zjednodušené** | Text přes fotku (H1, kicker, podtitul, adresa, cena, gradient) je **1:1 hotový**. **Polygon pozemku přes hero CHYBÍ úplně** — v `render.tsx` není žádný `<polygon>`/overlay. Tím padá efekt „hned vidím, co se prodává". |
| 2 | **District / okolí** — 360° panorama (Pannellum, autorotace) + ~34 **hotspotů napojených na Google Places** (foto, hvězdy, počet recenzí, vzdálenost, reálné texty recenzí), přepínač 🧒/🍽️, **graf kriminality** | **placeholder / chybí** | Nejsilnější „wow" Otínské a v SaaS nejchudší. `panorama` = **statický obrázek** + text „Interaktivní 360° otáčení připravujeme". `poi` = ruční seznam {name, category, distance, note} — **žádné Google Places, žádné recenze/hvězdy, žádný přepínač publika, žádný graf kriminality**. |
| 3 | **Street / analytické mapy** — 7 map jako obrázky v tabech (☀️🔇💨🚗) + 6 pollution metrik + blok „Proč je to důležité?" + les (galerie + 2 panoramata + polyline cesty) | **zjednodušené** | Sekce `analyticMaps` **strukturu má dobře**: taby (`group`), `caption`, i **„Proč je to důležité?" (`why`)**. A pozor — u Otínské to byly (dle analýzy) taky **statické PNG**, ne živé vrstvy, takže tady jsme překvapivě blízko. Chybí: **pollution metriky jako strukturovaná data**, **polyline lesní cesty** přes foto, panoramata uvnitř lesa. |
| 4 | **Property intro** — rich-text odstavce | **zjednodušené** | `text` sekce funguje (heading + volný text / napojení na description). Ale **jen plain text — žádný rich text, žádné odrážky**. |
| 5 | **Specs / parametry** | **1:1 (nebo lepší)** | `parameters` pokrývá 12 sloupců: typ, dispozice, plochy, zastavěná plocha, rozměry, rok, podlaží, stav, vlastnictví, náklady/měsíc, PENB, + „cena na vyžádání". Tady žádná mezera. |
| 6 | **Property gallery — klikací půdorysy** — SVG plán + místnosti jako **barevné klikací polygony** (plocha, barva) → klik otevře fotky místnosti; měřítko, per-foto výřez, 3D viz | **zjednodušené** | Funkčně blízko: patra v tabech + obrázek plánu + **místnosti jako číslované špendlíky** + **kompas** → klik otevře modal s fotkou + popisem. Ale: **místo barevných polygonů jsou špendlíky** (`x`/`y` v %), pole `polygon` v modelu je, ale **kreslicí UI neexistuje** (v kódu potvrzeno: „jen se přečte a uchová"). Chybí barevné místnosti, měřítko, per-foto výřez, 3D. |
| 7 | **Video** — `dum-otinska-fast.mp4` + poster | **zjednodušené** | `video` sekce umí **jen YouTube/Vimeo embed**. **MP4 upload nepodporuje** (proto ho ani seed nenaplní). |
| 8 | **Technical condition** — 7 položek: stav + popis + **fotka** + **připojené dokumenty** | **zjednodušené** | `technicalCondition` = {category, condition (barevný štítek), description}. **Chybí fotka u položky a vazba na dokument.** |
| 9 | **Documents** — soubory ke stažení | **1:1** | `documents` = upload PDF/obrázků + {name, category, description} + download link. Sedí. |
| 10 | **Valuation — porovnání odhadů se SCREENSHOTY** (4 nezávislé kalkulačky jako důkaz) | **zjednodušené** | `valuation` = karty {source, url, estimate, min, max, note}. **Screenshoty CHYBÍ** — a to byl psychologicky nejchytřejší prvek celé Otínské („cenu obhajují cizí kalkulačky"). Textově odhady jsou, důkaz obrázkem ne. |
| 11 | **CTA / kontakt** — jméno, telefon, mail, **avatar**, **WhatsApp**, „žádný makléř" | **zjednodušené** | `contact` = cta_text + `tel:` + `mailto:`. **Chybí WhatsApp, avatar a kontaktní formulář** (`mailto:` na mobilu často nikam nevede). Sticky lišta s cenou + „Zavolat" ale **je** (to Otínská řešila taky). |
| 12 | **Chatbot** (RAG, nakonfigurovaný ale vypnutý) | **par (stub)** | V SaaS existuje jako jediný `ready:false` typ, nelze zapnout. U Otínské byl taky vypnutý → remíza. |

### Průřezové prvky Otínské

| Prvek | Stav v SaaS | Co chybí |
|---|---|---|
| **socialProof** — vložené **reálné** sociální posty s `placement` + `relatedEnvironmentGroup` (vyjedou přesně u mapy/argumentu, který podporují) | **zjednodušené / jiné** | `socialProof` je samostatná sekce recenzí {author, rating, text, source}. **Žádné reálné embedy postů a hlavně žádné kotvení k argumentu/mapě.** |
| **newsSnippets** — 11 kartiček kotvených k benefitům | **zjednodušené** | `news` = samostatná sekce {date, headline, text, url}. **Kotvení k argumentům chybí.** |
| **targetBuyer** — persona + motivace, podle které je psaný text | **částečně** | Sloupec `target_persona` (text) existuje, ale neřídí nic automaticky. |
| **Typografie** — Playfair Display + Work Sans, pastelová paleta | **1:1** | Fonty i barvy sedí; vizuální základ je správně. |
| **Interaktivita / animace** — 360 rotace, autorotace, hotspoty | **zjednodušené** | SaaS má lightbox, taby, modaly, sticky lištu, investiční kalkulačku. Ale **žádné scroll-animace a žádné 360°**. |

### Co má SaaS navíc (férově)
Živá **OSM mapa s pinem** (Otínská žádnou živou mapu neměla), **investiční kalkulačka** (Otínská ji měla vypnutou),
**design mode** (edit na stránce), tlačítko **„Naplnit ukázkovým obsahem Otínská"**, limit fotek zvednutý **20 → 60**.

---

## Verdikt: jak daleko od 1:1

Záleží, co měříš — proto dvě čísla, aby to nebylo zavádějící:

- **Páteř + pokrytí typů sekcí: ~75–80 %.** Skoro každá sekce Otínské má v SaaS svůj protějšek, plus řazení/zapínání/design mode. Tady se od 14. 7. odvedlo hodně práce — proto „holá kostra" už neplatí.
- **Věrnost „wow" prvků + reálný dojem hotové stránky: ~40–50 %.** To, co dělalo Otínskou působivou — polygon pozemku, 360° panorama s Google recenzemi, barevné klikací půdorysy, screenshoty odhadů, kotvené posty — je **zjednodušené, placeholder, nebo chybí**.

**Poctivá jednovětá odpověď:** *Není to 1:1 a Karel má pravdu. Struktura a většina sekcí existují, ale 4–5 vlajkových prvků, které dělaly Otínskou působivou, jsou ošizené nebo chybí — realistický výstup je zhruba **polovina dojmu** Otínské, ne 1:1. Blíž pravdě než „1:1" je „solidní kostra se správnými fonty a většinou sekcí, ale bez těch věcí, kvůli kterým si Otínskou pamatuješ".*

### Druhá, tvrdší past: redakce
I kdyby všechny prvky existovaly, **běžný klient Otínskou nevyrobí.** Bohatý inzerát = **200–300+ hodnot** k vyplnění
+ nahrát ~55 fotek + přiřadit je k místnostem + sehnat odhady. Navíc **seed „Otínská" záměrně neplní obrázky**
(panorama, mapy, půdorysy, galerie zůstanou prázdné) → i po kliknutí na ukázku to vypadá **poloprázdně**, dokud
někdo ručně nenahraje desítky obrázků. Rozdíl SaaS vs. Otínská proto **není jen technický, je redakční**.

---

## Priorizovaný seznam — co dodělat (dle poměru dopad/úsilí)

### A) Levné a vysoký dopad (udělat první)
1. **Screenshoty u odhadů** (`valuation`) — přidat pole na upload obrázku ke kartě. Malá práce, vrací nejsilnější psychologický prvek Otínské (důkaz cizí kalkulačkou).
2. **Polygon / obrys pozemku přes hero** — jednoduchý naklikací overlay + uložení bodů (pole/JSONB), vykreslit `<polygon>` přes hero. Vrací efekt „hned vidím, co se prodává".
3. **Seskupení galerie podle kategorie** — **skoro zadarmo:** `category` se už z DB načítá, ale `Gallery` ho zahazuje. Stačí propojit → záložky exteriér/interiér/zahrada.
4. **Foto + dokument u položek technického stavu** — rozšířit `technicalCondition` o `photo_path` a vazbu na dokument.
5. **WhatsApp + kontaktní formulář (+ avatar)** v `contact` — `mailto:` na mobilu často selže; formulář → e-mail majiteli.
6. **Rich text / odrážky** v `text` sekcích.

### B) Střední (jádro „provázanosti" Otínské)
7. **Kotvení `news`/`socialProof` k sekci/argumentu** (`placement` / `relatedGroup`) — aby posty a novinky vyjely u mapy/benefitu, který podporují. Tohle dělalo Otínskou argumentačně provázanou.
8. **Pollution metriky jako data** u analytických map (hodnoty pod tabem), ne jen obrázek.
9. **MP4 upload** ve `video` (dnes jen YouTube/Vimeo) — jinak vlastní dronové video nenahraješ.
10. **Barevné klikací místnosti (polygony)** v půdorysech — model `polygon` už existuje, chybí kreslicí UI. (Nebo nechat špendlíky jako „basic" a polygon jako prémii/placenou službu „obtáhneme za vás".)

### C) Těžké / dlouhý ocas (jen jako prémiový balíček)
11. **360° panorama viewer** (Pannellum) + **hotspoty napojené na Google Places** (foto/hvězdy/recenze) + přepínač publika. Největší „wow", ale nejvyšší práce a nejnižší škálovatelnost.
12. **Graf kriminality**, živé analytické vrstvy, RAG chatbot.

### D) Průřezově (redakční past — bez toho zůstane i hotová šablona prázdná)
13. **Nechat SaaS udělat práci za klienta:** autogeokódování adresy (už je pin), návrhy textů AI, přednahrané „proč je to důležité" texty, ideálně i **seed s ukázkovými obrázky** (dnes se obrázky neseedují → ukázka působí poloprázdně).

---

## Shrnutí jednou tabulkou

| Vrstva | Kde jsme |
|---|---|
| Fonty, barvy, sticky lišta, hero text, lightbox | ✅ hotové, blízko Otínské |
| Páteř sekcí (řazení, zapínání, design mode), parametry, dokumenty, mapa | ✅ solidní, místy lepší než Otínská |
| Analytické mapy, technický stav, odhady, půdorysy, video, kontakt | 🟡 zjednodušené — kostra ano, „důkaz"/bohatost ne |
| Hero polygon, screenshoty odhadů, kotvení postů/novinek | 🟠 chybí, ale relativně levné dodělat |
| 360° panorama + Google Places hotspoty, barevné polygonové půdorysy, graf kriminality | 🔴 placeholder/chybí, drahé |
| Reálné naplnění běžným klientem | 🔴 redakční past — samo se to na úroveň Otínské nedostane |
