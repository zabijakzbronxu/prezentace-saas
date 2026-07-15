// Ukázkový obsah „Otínská" — reálná data z referenční prezentace domu v Praze-Radotíně
// (Otínská 1120/31). Slouží tlačítku „Naplnit ukázkovým obsahem Otínská" v editoru:
// prázdná prezentace se jedním kliknutím promění v hotově vypadající ukázku, ne holou kostru.
//
// Čistá data + čistá logika (žádná závislost na Next/Supabase) → jde importovat na serveru
// i v testu (vitest). Zápis do DB řeší server action `seedOtinska` v sections/actions.ts.
//
// POZOR (uvozovky): tenhle soubor je plný české typografie „…". Zavírací „ " je v TS obyčejný
// ASCII znak, který by řetězec v dvojitých uvozovkách předčasně ukončil (lessons 2026-07-14 (2)).
// Proto jsou VŠECHNY texty v backtick řetězcích `…` — tam „…" i apostrof nevadí.
//
// OBRÁZKY SE NESEEDUJÍ: fotky/půdorysy/mapy/panorama nejsou ve Storage → seedovat je by dělalo
// rozbité náhledy. Plníme jen textové a číselné sekce. Video Otínské je MP4 (ne YouTube/Vimeo),
// takže sekci video vynecháváme úplně (parser umí jen YouTube/Vimeo).

import type { DefaultSectionSeed } from "./sections";

// =====================================================================
//  1) POLE NA ŘÁDKU `presentations`
//     Hero (titulek, podnadpis, cena) i Parametry (typ, plochy, rok…) a Kontakt
//     se na veřejné stránce čtou z těchto SLOUPCŮ, ne z obsahu sekce — proto je
//     ukázka musí nastavit. Cena Otínské je „na vyžádání" → price_czk = null.
// =====================================================================

export type OtinskaPresentationFields = {
  title: string;
  subtitle: string;
  price_czk: number | null;
  street: string;
  city: string;
  postal_code: string;
  property_type: string;
  disposition: string;
  floor_area_m2: number | null;
  land_area_m2: number | null;
  built_area_m2: number | null;
  building_dimensions: string;
  year_built: number;
  floors: number;
  condition: string;
  ownership: string;
  energy_class: string | null;
  description: string;
  location_text: string;
  features_text: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  lat: number;
  lng: number;
};

export const OTINSKA_PRESENTATION_FIELDS: OtinskaPresentationFields = {
  title: `Dům v Praze, kde je les Vaším nejbližším sousedem`,
  subtitle: `Rodinný dům na klidném zalesněném kopci s fantastickým výhledem na údolí Berounky.`,
  // Otínská se prodává „na vyžádání" (v datech cena = 0) → necháme prázdné a v hero cenu skryjeme.
  price_czk: null,
  street: `Otínská 1120/31`,
  city: `Praha-Radotín`,
  postal_code: `153 00`,
  property_type: `Rodinný dům`,
  disposition: `4+1`,
  floor_area_m2: 305,
  land_area_m2: 330,
  built_area_m2: 89,
  building_dimensions: `9,5 × 9,5 m`,
  year_built: 1970,
  floors: 2,
  condition: `velmi dobrý`,
  ownership: `osobní`,
  // PENB v podkladu není → necháváme prázdné (radši nic než vymyšlená třída).
  energy_class: null,
  description: `Dům je aktuálně koncipován jako dvě samostatné jednotky 2+1 a 2kk ve dvou podlažích. Prošel několika rekonstrukcemi různého rozsahu a spojuje výhodu okamžitého nastěhování s prostorem pro budoucí realizaci vlastních představ. Zejména v posledních dvou letech jsem jako majitel investoval značné úsilí i prostředky do jeho bezproblémového chodu — o jednotlivých úpravách se víc dozvíte v sekci technický stav.

Dům má svůj věk i charakterové vlastnosti odpovídající roku 1970; dokonale rovné stěny a detaily roku 2026 od něj nečekejte. Vybavení je plně funkční, ale nejde o dnešní standard. Některé zamýšlené úpravy jsem už nestihl dokončit a zůstanou na novém majiteli.

V současné době v domě probíhá úklid, je ale už připraven na prohlídky.`,
  location_text: `Radotín považuji za jednu z nejlépe vybavených a strategicky umístěných čtvrtí Prahy. Spojuje komfort hlavního města s přirozeným klidem v údolí Berounky. V centru Prahy jste během pár minut, ale s vlastní radnicí, školami, zdravotním střediskem, sportovišti, bazénem i unikátním přírodním biotopem nemusíte denně nikam dojíždět a ztrácet čas.

Radotín navíc dlouhodobě roste na hodnotě: v centru čtvrti vzniká nová obchodní a rezidenční čtvrť TRIO a v bezprostředním okolí se připravuje příměstský park Soutok — jeden z největších parků ve střední Evropě, který Radotín propojí s rozsáhlou rekreační zónou a jezery.

Otínská ulice je velmi klidná — provoz je minimální a sousedé jsou převážně starší generace vyhledávající klid. Přímo sousedící les zaručuje odclonění hluku i ochranu před budoucí zástavbou. Procházka lesem začíná přímo u vaší branky.`,
  // Vybavení a přednosti pokrývá sekce „Přednosti" a technický stav → samostatný text neplníme.
  features_text: null,
  contact_name: `Jakub Skala`,
  contact_email: `jakubskala@email.cz`,
  contact_phone: `+420 773 657 883`,
  lat: 49.9829,
  lng: 14.352,
};

// =====================================================================
//  2) SEKCE (řádky `presentation_sections`)
//     Pořadí v poli = pořadí sekcí (position). Všechny se zakládají jako `enabled`.
//     Jen „ready" a bezobrázkové typy (obrázkové sekce vynecháváme — viz hlavička).
//     Obsah odpovídá readerům v sections.ts (readBenefitsContent, readValuationContent…).
// =====================================================================

export const OTINSKA_SECTION_SEEDS: readonly DefaultSectionSeed[] = [
  // Hero: titulek/cena čte ze sloupců prezentace; cena je „na vyžádání" → skrýváme ji.
  { kind: "hero", content: { show_price: false } },

  // Textové sekce vázané na sloupce prezentace (tělo se edituje v kroku Texty).
  { kind: "text", content: { heading: `Příběh nemovitosti`, source: `description` } },
  { kind: "text", content: { heading: `Lokalita a okolí`, source: `location_text` } },

  // Přednosti (dlaždice) — self-contained obsah.
  {
    kind: "benefits",
    content: {
      heading: `Proč právě tady`,
      items: [
        {
          icon: `🌲`,
          heading: `Les začíná za vaší brankou`,
          body: `Otevřete branku a jste v lese. Žádné auto, žádné dojíždění na výlet — ráno běh, odpoledne procházka s dětmi přímo z domu.`,
        },
        {
          icon: `🏞️`,
          heading: `Výhled na údolí Berounky`,
          body: `Dům stojí na kopci s panoramatickým výhledem na údolí. Ráno káva s výhledem, večer západ slunce. Tohle z okna žádného bytu neuvidíte.`,
        },
        {
          icon: `🌳`,
          heading: `Zahrada, kde si děti hrají celý den`,
          body: `330 m² pozemku — prostor pro trampolínu, pískoviště i grilování. Děti nebudou sedět v bytě, ale venku na čerstvém vzduchu.`,
        },
        {
          icon: `🏙️`,
          heading: `Praha, ale bez hluku a stresu`,
          body: `Pražská adresa, pražské školy, pražská práce. A přitom žijete v klidu, v zeleni a v prostoru, který si většina Pražanů může jen přát.`,
        },
        {
          icon: `🚆`,
          heading: `18 minut na Václavák`,
          body: `Vlakem na Smíchovské nádraží za 9 minut, na Hlavní nádraží za 18 minut.`,
        },
        {
          icon: `⚽`,
          heading: `Sport a příroda za rohem`,
          body: `Radotín pulzuje sportem — víc sportovišť než kterákoli jiná část Prahy. A příroda v údolí Berounky je nádherná.`,
        },
      ],
    },
  },

  // Parametry + PENB: čte ze sloupců prezentace, obsah sekce zůstává prázdný.
  { kind: "parameters", content: {} },

  // Technický stav — 7 položek se štítkem stavu.
  {
    kind: "technicalCondition",
    content: {
      heading: `Technický stav domu`,
      items: [
        {
          category: `Okna — plastová trojskla + nová střešní okna VELUX (2025)`,
          condition: `new`,
          description: `Všechna okna byla zhruba před 10 lety vyměněna za plastová s trojsklem. V roce 2025 při zateplování střechy a podkroví proběhla výměna všech střešních oken za nejnovější model VELUX.`,
        },
        {
          category: `Rozvody vody`,
          condition: `very-good`,
          description: `Kompletní rozvody vody i odpady byly v rámci několika rekonstrukcí za posledních cca 15 let průběžně vyměněny za plastové potrubí.`,
        },
        {
          category: `Elektroinstalace`,
          condition: `good`,
          description: `Elektroinstalace v 1. patře byla kompletně vyměněna v roce 2025, v suterénu při napojení tepelného čerpadla zhruba před 10 lety, stejně jako hlavní přívod. V celém domě jsou nové jističe, zásuvky, vypínače a úsporné LED osvětlení; menší část domu má ještě původní rozvody.`,
        },
        {
          category: `Tepelné čerpadlo NIBE`,
          condition: `very-good`,
          description: `Špičkové švédské tepelné čerpadlo vzduch–voda NIBE F2040-16 (16 kW) s vnitřní jednotkou VVM 310, ovládané přes Wi-Fi z mobilu odkudkoli. Žádné starosti s cenou plynu ani emisními povolenkami.`,
        },
        {
          category: `Zateplení střechy a podkroví — Izocell (2025)`,
          condition: `new`,
          description: `V roce 2025 proběhlo kompletní zateplení střechy a podkroví foukanou celulózou Izocell v tloušťce 30–60 cm. Řešení bez tepelných mostů a výrazně nižší účet za vytápění.`,
        },
        {
          category: `Zařízení a interiér`,
          condition: `good`,
          description: `Vyměněné interiérové dveře v přízemí i 1. patře, čerstvě vymalováno (Primalex Plus), nové PVC podlahy a koberce, LED osvětlení ve všech místnostech. Nově natřený plot, vrata i plechy, vyklizená zahrada a pancéřové vstupní dveře.`,
        },
        {
          category: `Střecha`,
          condition: `fair`,
          description: `Asfaltové šindele na celoplošném bednění s odvětráním, zateplení celého „áčka" 14 cm skelnou vatou s reflexní fólií a nafoukanou celulózou 30–40 cm. Okapy a plechové díly v horních částech budou do budoucna chtít natřít.`,
        },
      ],
    },
  },

  // Body zájmu v okolí (POI) — ručně zadaná místa se vzdáleností.
  {
    kind: "poi",
    content: {
      heading: `Co máte v okolí`,
      items: [
        { name: `ZUŠ Klementa Slavického`, category: `Škola`, distance: `200 m` },
        { name: `Kulturně komunitní centrum Koruna`, category: `Kultura`, distance: `350 m` },
        { name: `Poliklinika Radotín`, category: `Zdraví`, distance: `350 m` },
        { name: `Mateřská škola Radotín`, category: `Školka`, distance: `400 m` },
        { name: `Sportovní hala Radotín`, category: `Sport`, distance: `400 m` },
        { name: `Fotbalový stadion SC Olympia`, category: `Sport`, distance: `500 m` },
        { name: `Albert`, category: `Obchod`, distance: `550 m` },
        { name: `Plavecký bazén Radotín`, category: `Sport`, distance: `600 m` },
        { name: `Základní škola Praha-Radotín`, category: `Škola`, distance: `600 m` },
        { name: `Veselý Králíček – kavárna s hernou`, category: `Kavárna`, distance: `600 m` },
        { name: `Biotop Radotín`, category: `Sport a koupání`, distance: `650 m` },
        { name: `Místní knihovna Radotín`, category: `Kultura`, distance: `700 m` },
        { name: `Pivovar Horymír`, category: `Restaurace`, distance: `700 m` },
        { name: `Vlakové nádraží Praha-Radotín`, category: `Doprava`, distance: `900 m` },
        { name: `BILLA`, category: `Obchod`, distance: `1,0 km` },
        { name: `Cyklotrasa kolem Berounky`, category: `Příroda`, distance: `1,4 km` },
        { name: `Přírodní park Radotínsko-Chuchelský háj`, category: `Příroda`, distance: `1,6 km` },
      ],
    },
  },

  // Cenové odhady — 4 nezávislé zdroje (psychologicky nejsilnější sekce Otínské).
  {
    kind: "valuation",
    content: {
      heading: `Kolik tenhle dům stojí?`,
      items: [
        {
          source: `Bezrealitky.cz / Valuo`,
          url: `https://www.bezrealitky.cz/centrum-sluzeb/odhad-ceny-nemovitosti`,
          estimate_czk: 19492176,
          min_czk: 18466272,
          max_czk: 20518080,
          note: `květen 2026 · odborný odhad ve spolupráci s Valuo`,
        },
        {
          source: `Reas.cz`,
          url: `https://www.reas.cz`,
          estimate_czk: 18450000,
          min_czk: 14300000,
          max_czk: 22600000,
          note: `květen 2026 · automatický model podle parametrů`,
        },
        {
          source: `Odhad-zdarma.cz`,
          url: `https://www.odhad-zdarma.cz`,
          estimate_czk: 17746600,
          note: `4. 5. 2026 · online kalkulačka, dům 4+1, 305 m²`,
        },
        {
          source: `Hypox.cz`,
          url: `https://www.hypox.cz`,
          estimate_czk: 20359899,
          note: `květen 2026 · model z historických transakcí, meziroční růst +8,5 %`,
        },
      ],
    },
  },

  // Reference / sociální posty (bez hvězdiček — jde o veřejné FB posty).
  {
    kind: "socialProof",
    content: {
      heading: `Co se o lokalitě říká`,
      items: [
        {
          author: `MČ Praha-Radotín`,
          text: `Radotínské lesy prošly revitalizací — nové naučné stezky, odpočívadla a výhledy na údolí. Ideální pro rodinné procházky i sportovce.`,
          source: `Facebook · MČ Praha-Radotín`,
        },
        {
          author: `Petr Novák`,
          text: `Právě jsem doběhl z domu přes les na Kopaninu a zpět — 8 km, nádherné výhledy a ani jednou jsem nepřeběhl silnici. Přesně proto jsme se sem nastěhovali.`,
          source: `Facebook · Běhej Radotínem`,
        },
        {
          author: `Praha 16 – Radotín`,
          text: `Nová stezka lesem přímo z ulice Otínská do radotínských lesů.`,
          source: `Facebook · Praha 16`,
        },
        {
          author: `Praha 16 – Radotín`,
          text: `Zákaz vjezdu do ulic Otínská a Zderazská v ranní špičce — úprava dopravního režimu pro snížení tranzitní dopravy.`,
          source: `Facebook · Praha 16`,
        },
      ],
    },
  },

  // Novinky a souvislosti (kurátorované kartičky).
  {
    kind: "news",
    content: {
      heading: `Novinky a souvislosti`,
      items: [
        {
          date: `18. 3. 2026`,
          headline: `Ceny nemovitostí v Praze rostou nejrychleji za 3 roky`,
          text: `Průměrná cena rodinného domu v Praze vzrostla meziročně o 8,2 %. Analytici očekávají další růst kvůli omezené nabídce a silné poptávce (Novinky.cz).`,
        },
        {
          headline: `Na soutoku vznikne park 13× větší než Stromovka`,
          text: `Praha plánuje na soutoku Vltavy a Berounky rozsáhlý příměstský park Soutok — přímo v dosahu Radotína, s revitalizací Berounky a moderními protipovodňovými opatřeními.`,
        },
        {
          headline: `Emisní povolenky na rekordních 95 €`,
          text: `Cena emisních povolenek překonala 95 € za tunu CO₂. Analytici varují před dalším zdražením plynu pro domácnosti — domu s tepelným čerpadlem se to netýká.`,
        },
        {
          headline: `Studie: blízkost přírody zvyšuje hodnotu nemovitosti až o 15 %`,
          text: `Nemovitosti do 200 metrů od lesa nebo parku mají podle studie o 12–15 % vyšší tržní hodnotu než srovnatelné domy bez přístupu k zeleni.`,
        },
        {
          headline: `Nové srdce Radotína: projekt TRIO — přes 60 % prodáno`,
          text: `Projekt TRIO Radotín prodal přes 60 % z 205 bytů a 14 obchodních jednotek. Výstavba se plánuje na přelom let 2026 a 2027.`,
        },
        {
          headline: `Přírodní rezervace Radotínské údolí`,
          text: `Jedna z nejcennějších pražských rezervací — přes 600 druhů rostlin a historie sahající až ke středověkým mlýnům. Z Otínské se sem dostanete pěšky.`,
        },
        {
          headline: `Život u rušné silnice zvyšuje riziko rakoviny až o 10 %`,
          text: `Mezinárodní studie potvrzuje vyšší riziko nádorových onemocnění u lidí bydlících u dopravních tahů. Klíčové jsou jemné prachové částice a oxidy dusíku.`,
        },
        {
          headline: `Noční hluk z dopravy zatěžuje srdce a cévy`,
          text: `Dlouhodobé vystavení nočnímu dopravnímu hluku zhoršuje spánek a zvyšuje riziko kardiovaskulárních onemocnění. Klidná ulice je investice do zdraví.`,
        },
      ],
    },
  },

  // Investiční kalkulačka — vstupy pro klientský výpočet. Cena = orientační tržní
  // odhad (Reas), plocha reálná; nájem/náklady necháváme prázdné (spočítá se cena/m²).
  {
    kind: "investmentCalc",
    content: {
      heading: `Investiční kalkulačka`,
      price_czk: 18450000,
      area_m2: 305,
      monthly_rent_czk: null,
      annual_costs_czk: null,
    },
  },

  // Kontakt: jméno/telefon/mail čte ze sloupců prezentace; tady jen text CTA.
  {
    kind: "contact",
    content: {
      cta_text: `Žádný makléř, žádná provize. Jednáte přímo se mnou jako majitelem.`,
    },
  },
];

// =====================================================================
//  3) ČISTÁ LOGIKA (testovatelná bez DB)
// =====================================================================

/**
 * Smí se ukázka nasypat? JEN do úplně prázdné prezentace (bez jediné sekce),
 * ať uživateli nepřepíšeme rozdělanou práci. Idempotentní brána: po naplnění už
 * sekce existují, takže druhé kliknutí neprojde.
 */
export function isSeedAllowed(existingSectionCount: number): boolean {
  return existingSectionCount === 0;
}

/**
 * Patří prezentace přihlášenému uživateli? Druhá vrstva k RLS: published prezentace
 * jde přečíst i cizímu (veřejné čtení), takže vlastnictví ověřujeme i explicitně,
 * ať cizí prezentaci nikdy nenaplníme (ani tichým no-opem).
 */
export function ownsPresentation(ownerId: string | null | undefined, userId: string): boolean {
  return typeof ownerId === "string" && ownerId.length > 0 && ownerId === userId;
}
