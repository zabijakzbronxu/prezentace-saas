// Registr sekcí prezentace — JEDINÝ zdroj pravdy o typech sekcí.
// Sdílí ho migrace (výčet povolených `kind` v CHECK), editor (katalog „Přidat
// sekci", pravidla singletonů, formuláře) i veřejná stránka (co umí vykreslit).
// Když se něco o sekcích mění, mění se to TADY a nikde jinde — ať se DB, editor
// a výkladní skříň nerozejdou.
//
// Čistá logika bez závislostí na Next/Reactu → jde importovat na serveru,
// v client komponentě i v testu (vitest).

/** Všechny typy sekcí (musí přesně sedět s CHECK omezením v migraci). */
export const SECTION_KINDS = [
  "hero",
  "text",
  "parameters",
  "gallery",
  "map",
  "benefits",
  "documents",
  "valuation",
  "technicalCondition",
  "contact",
  // Připraveno v modelu, editor/render až v dalších kolech:
  "video",
  "floorplans",
  "analyticMaps",
  "poi",
  "panorama",
  "socialProof",
  "news",
  "investmentCalc",
  "chatbot",
] as const;

export type SectionKind = (typeof SECTION_KINDS)[number];

export function isSectionKind(value: unknown): value is SectionKind {
  return typeof value === "string" && (SECTION_KINDS as readonly string[]).includes(value);
}

/** Popis jednoho typu sekce pro katalog v editoru. */
export type SectionMeta = {
  kind: SectionKind;
  /** Název v editoru (laicky, česky). */
  label: string;
  /** Krátký popis, co sekce dělá. */
  description: string;
  /** Smí být na prezentaci nejvýš jednou? */
  singleton: boolean;
  /** Umíme ji už teď editovat i vykreslit? (false = „připravujeme"). */
  ready: boolean;
};

// Pořadí v tomto poli = pořadí v nabídce „Přidat sekci".
//
// ⚠ SYNC: `ready:true` a `singleton:true` sady tady musí ručně odpovídat dvěma
// seznamům ve funkci `add_presentation_section` (v migraci i v APLIKUJ_VSE.sql):
//   - whitelist povolených typů  = všechny ready:true kindy
//   - `v_singleton := p_kind in (...)` = ready:true ∩ singleton:true kindy
// Když tu něco odemkneš (ready:false → true), dopiš to i do OBOU SQL souborů.
export const SECTION_CATALOG: readonly SectionMeta[] = [
  {
    kind: "hero",
    label: "Úvodní blok (hero)",
    description: "Velká fotka přes celou šířku s titulkem, podnadpisem a cenou.",
    singleton: true,
    ready: true,
  },
  {
    kind: "text",
    label: "Textová sekce",
    description: "Nadpis a odstavec — příběh nemovitosti, lokalita, přednosti…",
    singleton: false,
    ready: true,
  },
  {
    kind: "gallery",
    label: "Galerie fotek",
    description: "Mřížka fotek s popisky. Fotky se spravují v kroku Fotky.",
    singleton: true,
    ready: true,
  },
  {
    kind: "parameters",
    label: "Parametry a PENB",
    description: "Dlaždice s parametry (plochy, rok stavby, dispozice…) a energetická třída.",
    singleton: true,
    ready: true,
  },
  {
    kind: "benefits",
    label: "Přednosti (dlaždice)",
    description: "Výčet předností jako dlaždice s nadpisem a popisem.",
    singleton: false,
    ready: true,
  },
  {
    kind: "map",
    label: "Mapa polohy",
    description: "Pin z GPS souřadnic + odkaz do Mapy.cz. Bez analytických map.",
    singleton: true,
    ready: true,
  },
  {
    kind: "documents",
    label: "Dokumenty ke stažení",
    description: "Soubory ke stažení — PENB, půdorys, smlouvy… (nahrání souboru).",
    singleton: true,
    ready: true,
  },
  {
    kind: "valuation",
    label: "Porovnání cen / odhady",
    description: "Nezávislé odhady ceny se zdrojem a rozpětím.",
    singleton: false,
    ready: true,
  },
  {
    kind: "technicalCondition",
    label: "Technický stav",
    description: "Položky se štítkem stavu (nové / velmi dobré / dobré / ucházející).",
    singleton: false,
    ready: true,
  },
  {
    kind: "contact",
    label: "Kontakt",
    description: "Kontakt na prodávajícího s tlačítky Zavolat a Napsat e-mail.",
    singleton: true,
    ready: true,
  },
  // ----- připravujeme (model hotový, editor/render přijde v dalším kole) -----
  {
    kind: "video",
    label: "Video",
    description: "Vložené video z YouTube nebo Vimeo — video prohlídka nemovitosti.",
    singleton: true,
    ready: true,
  },
  {
    kind: "floorplans",
    label: "Půdorysy pater",
    description: "Patra s obrázkem půdorysu a seznamem místností (fotka + popis).",
    singleton: true,
    ready: true,
  },
  {
    kind: "analyticMaps",
    label: "Analytické mapy okolí",
    description: "Mapy (hluk, oslunění, doprava…) v tabech s odůvodněním. Obrázky nahraješ ty.",
    singleton: true,
    ready: true,
  },
  {
    kind: "poi",
    label: "Body zájmu v okolí",
    description: "Ručně zadaná místa poblíž (škola, obchod, MHD…) se vzdáleností.",
    singleton: true,
    ready: true,
  },
  {
    kind: "panorama",
    label: "360° panorama",
    description: "Nahraješ panorama fotku. Interaktivní prohlídku připravujeme.",
    singleton: true,
    ready: true,
  },
  {
    kind: "socialProof",
    label: "Reference a recenze",
    description: "Ručně zadané ohlasy (jméno, hvězdičky, text).",
    singleton: true,
    ready: true,
  },
  {
    kind: "news",
    label: "Novinky a aktuality",
    description: "Datované zápisy k nemovitosti nebo lokalitě.",
    singleton: true,
    ready: true,
  },
  {
    kind: "investmentCalc",
    label: "Investiční kalkulačka",
    description: "Cena za m² a výnos z pronájmu pro investory — počítá se v prohlížeči.",
    singleton: true,
    ready: true,
  },
  {
    kind: "chatbot",
    label: "Chatbot k nemovitosti",
    description: "Automatické odpovědi na dotazy zájemců.",
    singleton: true,
    ready: false,
  },
];

const CATALOG_BY_KIND: Record<SectionKind, SectionMeta> = Object.fromEntries(
  SECTION_CATALOG.map((m) => [m.kind, m]),
) as Record<SectionKind, SectionMeta>;

export function sectionMeta(kind: SectionKind): SectionMeta {
  return CATALOG_BY_KIND[kind];
}

export function sectionLabel(kind: SectionKind): string {
  return CATALOG_BY_KIND[kind]?.label ?? kind;
}

export function isSingletonKind(kind: SectionKind): boolean {
  return CATALOG_BY_KIND[kind]?.singleton ?? false;
}

/** Umíme sekci v tomto kole editovat i vykreslit? */
export function isReadyKind(kind: SectionKind): boolean {
  return CATALOG_BY_KIND[kind]?.ready ?? false;
}

/**
 * Smí se tento typ teď přidat na prezentaci?
 * - jen „ready" typy (nedodělané se přidat nedají),
 * - singleton nesmí už existovat.
 * Vrací i důvod (pro UI), když nesmí.
 */
export function canAddKind(
  kind: SectionKind,
  existingKinds: readonly SectionKind[],
): { ok: boolean; reason?: string } {
  const meta = CATALOG_BY_KIND[kind];
  if (!meta) return { ok: false, reason: "Neznámý typ sekce." };
  if (!meta.ready) return { ok: false, reason: "Tuhle sekci zatím připravujeme." };
  if (meta.singleton && existingKinds.includes(kind)) {
    return { ok: false, reason: "Tahle sekce už v prezentaci je (smí být jen jednou)." };
  }
  return { ok: true };
}

/** Typy, které jde právě teď nabídnout k přidání (respektuje singletony). */
export function addableKinds(existingKinds: readonly SectionKind[]): SectionMeta[] {
  return SECTION_CATALOG.filter(
    (m) => m.ready && !(m.singleton && existingKinds.includes(m.kind)),
  );
}

// =====================================================================
//  OBSAH SEKCÍ (JSONB `content`)
//  Ploché, sekci vlastní seznamy (přednosti, odhady, technický stav) bydlí
//  přímo tady v JSONB — sekce je pak atomická (přeřazení/smazání ji vezme
//  s sebou, žádný join ani sirotek). Soubory (dokumenty) a relační data
//  (půdorysy, mapy) mají vlastní tabulky.
// =====================================================================

/** Zdroj textu pro sekci `text`: buď odkaz na sloupec prezentace, nebo vlastní. */
export type TextSource = "description" | "location_text" | "features_text";
export const TEXT_SOURCES: readonly TextSource[] = [
  "description",
  "location_text",
  "features_text",
];
export function isTextSource(v: unknown): v is TextSource {
  return typeof v === "string" && (TEXT_SOURCES as readonly string[]).includes(v);
}

export type TextContent = {
  heading?: string;
  /** Když je vyplněný, tělo se bere ze sloupce prezentace (edituje se v kroku Texty). */
  source?: TextSource;
  /** Vlastní text (pro nově přidané textové sekce bez vazby na sloupec). */
  body?: string;
};

export type BenefitItem = { icon?: string; heading: string; body?: string };
export type BenefitsContent = { heading?: string; items: BenefitItem[] };

export type ValuationItem = {
  source: string;
  url?: string;
  estimate_czk?: number | null;
  min_czk?: number | null;
  max_czk?: number | null;
  note?: string;
};
export type ValuationContent = { heading?: string; items: ValuationItem[] };

export const CONDITION_STATES = ["new", "very-good", "good", "fair"] as const;
export type ConditionState = (typeof CONDITION_STATES)[number];
export function isConditionState(v: unknown): v is ConditionState {
  return typeof v === "string" && (CONDITION_STATES as readonly string[]).includes(v);
}
export const CONDITION_LABEL: Record<ConditionState, string> = {
  new: "nové",
  "very-good": "velmi dobré",
  good: "dobré",
  fair: "ucházející",
};
export type ConditionItem = {
  category: string;
  condition?: ConditionState;
  description?: string;
};
export type ConditionContent = { heading?: string; items: ConditionItem[] };

export type GalleryContent = { heading?: string };
export type MapContent = { heading?: string; zoom?: number };
export type ContactContent = { cta_text?: string };
export type HeroContent = { show_price?: boolean };

// ---- bezpečné čtení JSONB (obsah může být cokoliv) -------------------

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}
function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim().length > 0 ? v : undefined;
}
function asNumberOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * Zneškodní uživatelskou URL pro vložení do `href`. Povolí JEN `http:`/`https:`;
 * cokoli jiného (`javascript:`, `data:`, `vbscript:`, `file:` …) zahodí (vrátí
 * `undefined`). Sdílí ji čtení obsahu (render veřejné stránky) i validace při zápisu.
 *
 * Staví na `new URL`, takže odolá i obfuskaci vloženým tabem/newlinem
 * (`java\tscript:`): parser tyhle znaky odstraní stejně jako prohlížeč, NEŽ rozezná
 * schéma — proto se `javascript:` nedá „rozbít mezerou". `mailto:`/`tel:` se na
 * stránce skládají zvlášť s pevnou předponou, tady je schválně nepovolujeme.
 */
export function safeExternalUrl(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const raw = v.trim();
  if (!raw) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return undefined; // relativní/rozbitá URL sem nepatří (čekáme absolutní zdroj)
  }
  const scheme = parsed.protocol.toLowerCase();
  return scheme === "http:" || scheme === "https:" ? parsed.href : undefined;
}

/** Vytáhne popisky z libovolného JSONB do typovaného obsahu podle druhu sekce. */
export function readTextContent(content: unknown): TextContent {
  const c = (content ?? {}) as Record<string, unknown>;
  const source = isTextSource(c.source) ? c.source : undefined;
  return { heading: asString(c.heading), source, body: asString(c.body) };
}

export function readBenefitsContent(content: unknown): BenefitsContent {
  const c = (content ?? {}) as Record<string, unknown>;
  const items = asArray(c.items)
    .map((raw): BenefitItem | null => {
      const it = (raw ?? {}) as Record<string, unknown>;
      const heading = asString(it.heading);
      if (!heading) return null;
      return { icon: asString(it.icon), heading, body: asString(it.body) };
    })
    .filter((x): x is BenefitItem => x !== null);
  return { heading: asString(c.heading), items };
}

export function readValuationContent(content: unknown): ValuationContent {
  const c = (content ?? {}) as Record<string, unknown>;
  const items = asArray(c.items)
    .map((raw): ValuationItem | null => {
      const it = (raw ?? {}) as Record<string, unknown>;
      const source = asString(it.source);
      if (!source) return null;
      return {
        source,
        url: safeExternalUrl(it.url),
        estimate_czk: asNumberOrNull(it.estimate_czk),
        min_czk: asNumberOrNull(it.min_czk),
        max_czk: asNumberOrNull(it.max_czk),
        note: asString(it.note),
      };
    })
    .filter((x): x is ValuationItem => x !== null);
  return { heading: asString(c.heading), items };
}

export function readConditionContent(content: unknown): ConditionContent {
  const c = (content ?? {}) as Record<string, unknown>;
  const items = asArray(c.items)
    .map((raw): ConditionItem | null => {
      const it = (raw ?? {}) as Record<string, unknown>;
      const category = asString(it.category);
      if (!category) return null;
      return {
        category,
        condition: isConditionState(it.condition) ? it.condition : undefined,
        description: asString(it.description),
      };
    })
    .filter((x): x is ConditionItem => x !== null);
  return { heading: asString(c.heading), items };
}

export function readGalleryContent(content: unknown): GalleryContent {
  const c = (content ?? {}) as Record<string, unknown>;
  return { heading: asString(c.heading) };
}

export function readMapContent(content: unknown): MapContent {
  const c = (content ?? {}) as Record<string, unknown>;
  const zoom = asNumberOrNull(c.zoom);
  return { heading: asString(c.heading), zoom: zoom ?? undefined };
}

export function readContactContent(content: unknown): ContactContent {
  const c = (content ?? {}) as Record<string, unknown>;
  return { cta_text: asString(c.cta_text) };
}

// ---- Kolo 3: body zájmu (POI) — ručně zadaná místa v okolí ----------
export type PoiItem = { name: string; category?: string; distance?: string; note?: string };
export type PoiContent = { heading?: string; items: PoiItem[] };
export function readPoiContent(content: unknown): PoiContent {
  const c = (content ?? {}) as Record<string, unknown>;
  const items = asArray(c.items)
    .map((raw): PoiItem | null => {
      const it = (raw ?? {}) as Record<string, unknown>;
      const name = asString(it.name);
      if (!name) return null;
      return {
        name,
        category: asString(it.category),
        distance: asString(it.distance),
        note: asString(it.note),
      };
    })
    .filter((x): x is PoiItem => x !== null);
  return { heading: asString(c.heading), items };
}

// ---- Kolo 3: reference a recenze -----------------------------------
export type ReviewItem = { author: string; rating?: number; text?: string; source?: string };
export type SocialContent = { heading?: string; items: ReviewItem[] };
export function readSocialContent(content: unknown): SocialContent {
  const c = (content ?? {}) as Record<string, unknown>;
  const items = asArray(c.items)
    .map((raw): ReviewItem | null => {
      const it = (raw ?? {}) as Record<string, unknown>;
      const author = asString(it.author);
      if (!author) return null;
      const r = asNumberOrNull(it.rating);
      const rating = r === null ? undefined : Math.min(5, Math.max(1, Math.round(r)));
      return { author, rating, text: asString(it.text), source: asString(it.source) };
    })
    .filter((x): x is ReviewItem => x !== null);
  return { heading: asString(c.heading), items };
}

// ---- Kolo 3: novinky a aktuality -----------------------------------
export type NewsItem = { date?: string; headline: string; text?: string; url?: string };
export type NewsContent = { heading?: string; items: NewsItem[] };
export function readNewsContent(content: unknown): NewsContent {
  const c = (content ?? {}) as Record<string, unknown>;
  const items = asArray(c.items)
    .map((raw): NewsItem | null => {
      const it = (raw ?? {}) as Record<string, unknown>;
      const headline = asString(it.headline);
      if (!headline) return null;
      return {
        date: asString(it.date),
        headline,
        text: asString(it.text),
        url: safeExternalUrl(it.url),
      };
    })
    .filter((x): x is NewsItem => x !== null);
  return { heading: asString(c.heading), items };
}

// ---- Kolo 3: analytické mapy (obrázky v tabech) --------------------
export type AnalyticMapItem = {
  title?: string;
  caption?: string;
  group?: string;
  why?: string;
  image_path?: string;
};
export type AnalyticMapsContent = { heading?: string; items: AnalyticMapItem[] };
export function readAnalyticMapsContent(content: unknown): AnalyticMapsContent {
  const c = (content ?? {}) as Record<string, unknown>;
  const items = asArray(c.items)
    .map((raw): AnalyticMapItem | null => {
      const it = (raw ?? {}) as Record<string, unknown>;
      const image_path = asString(it.image_path);
      const title = asString(it.title);
      // Mapa bez obrázku i bez titulku nemá co ukázat → vypadne.
      if (!image_path && !title) return null;
      return {
        title,
        caption: asString(it.caption),
        group: asString(it.group),
        why: asString(it.why),
        image_path,
      };
    })
    .filter((x): x is AnalyticMapItem => x !== null);
  return { heading: asString(c.heading), items };
}

// ---- Kolo 3: 360° panorama (statický obrázek + poznámka) -----------
export type PanoramaContent = { heading?: string; caption?: string; image_path?: string };
export function readPanoramaContent(content: unknown): PanoramaContent {
  const c = (content ?? {}) as Record<string, unknown>;
  return {
    heading: asString(c.heading),
    caption: asString(c.caption),
    image_path: asString(c.image_path),
  };
}

// ---- Kolo 2: půdorysy pater ----------------------------------------
export type FloorRoom = { name: string; area?: string; description?: string; image_path?: string };
export type FloorItem = { label: string; image_path?: string; rooms: FloorRoom[] };
export type FloorplansContent = { heading?: string; floors: FloorItem[] };
export function readFloorplansContent(content: unknown): FloorplansContent {
  const c = (content ?? {}) as Record<string, unknown>;
  const floors = asArray(c.floors)
    .map((raw): FloorItem | null => {
      const f = (raw ?? {}) as Record<string, unknown>;
      const label = asString(f.label);
      const image_path = asString(f.image_path);
      // Patro bez názvu i bez plánu je prázdné → vypadne.
      if (!label && !image_path) return null;
      const rooms = asArray(f.rooms)
        .map((rr): FloorRoom | null => {
          const r = (rr ?? {}) as Record<string, unknown>;
          const name = asString(r.name);
          if (!name) return null;
          return {
            name,
            area: asString(r.area),
            description: asString(r.description),
            image_path: asString(r.image_path),
          };
        })
        .filter((x): x is FloorRoom => x !== null);
      return { label: label ?? "Patro", image_path, rooms };
    })
    .filter((x): x is FloorItem => x !== null);
  return { heading: asString(c.heading), floors };
}

// ---- Kolo 4: Video (vložené YouTube/Vimeo) --------------------------
// Obsah je jen odkaz + nadpis/popisek. Přehrávatelný embed staví veřejná
// stránka z OVĚŘENÉHO ID (parser níž), nikdy ze syrového odkazu — src iframu
// tak vždy míří jen na povolenou doménu.
export type VideoContent = { url?: string; heading?: string; caption?: string };
export function readVideoContent(content: unknown): VideoContent {
  const c = (content ?? {}) as Record<string, unknown>;
  return {
    url: asString(c.url),
    heading: asString(c.heading),
    caption: asString(c.caption),
  };
}

export type VideoProvider = "youtube" | "vimeo";
/** Výsledek parseru: poskytovatel, čisté ID a hotová privacy-friendly embed URL. */
export type VideoEmbed = { provider: VideoProvider; id: string; embedUrl: string };

/** Vytáhne 11znakové YouTube ID z běžných tvarů (youtu.be, watch?v=, embed, shorts…). */
function extractYouTubeId(url: string): string | null {
  // Brána: ID vytahujeme jen z odkazů, které jsou opravdu z YouTube domény,
  // ať `?v=` z cizí adresy nespleteme za YouTube.
  if (!/(?:youtube\.com|youtu\.be|youtube-nocookie\.com)/i.test(url)) return null;
  const patterns: RegExp[] = [
    /youtu\.be\/([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])/i,
    /\/embed\/([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])/i,
    /\/shorts\/([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])/i,
    /\/live\/([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])/i,
    /\/v\/([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])/i,
    /[?&]v=([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])/i,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

/** Vytáhne číselné Vimeo ID (+ případný hash u neveřejných videí). */
function extractVimeo(url: string): { id: string; hash?: string } | null {
  if (!/vimeo\.com/i.test(url)) return null;
  const queryHash = (): string | undefined => {
    const q = url.match(/[?&]h=([A-Za-z0-9]+)/i);
    return q ? q[1] : undefined;
  };
  // player.vimeo.com/video/ID (hash bývá v ?h=…)
  let m = url.match(/player\.vimeo\.com\/video\/(\d+)/i);
  if (m) return { id: m[1], hash: queryHash() };
  // vimeo.com/[channels/x/ | groups/x/videos/ | album/x/video/]ID[/HASH]
  m = url.match(
    /vimeo\.com\/(?:channels\/[A-Za-z0-9_-]+\/|groups\/[A-Za-z0-9_-]+\/videos\/|album\/\d+\/video\/)?(\d+)(?:\/([A-Za-z0-9]+))?/i,
  );
  if (m) return { id: m[1], hash: m[2] || queryHash() };
  return null;
}

/**
 * Z odkazu na YouTube/Vimeo udělá bezpečnou embed URL. Vrací null, když odkaz
 * neumíme — veřejná stránka pak ukáže srozumitelnou hlášku (ne prázdno, ne pád).
 * Embed URL se skládá z ověřeného ID → src iframu je vždy jen povolená doména.
 */
export function parseVideoUrl(input: unknown): VideoEmbed | null {
  if (typeof input !== "string") return null;
  const raw = input.trim();
  if (!raw) return null;

  const yt = extractYouTubeId(raw);
  if (yt) {
    return {
      provider: "youtube",
      id: yt,
      embedUrl: `https://www.youtube-nocookie.com/embed/${yt}`,
    };
  }

  const vm = extractVimeo(raw);
  if (vm) {
    return {
      provider: "vimeo",
      id: vm.id,
      embedUrl: vm.hash
        ? `https://player.vimeo.com/video/${vm.id}?h=${vm.hash}`
        : `https://player.vimeo.com/video/${vm.id}`,
    };
  }

  return null;
}

// ---- Kolo 4: Investiční kalkulačka ---------------------------------
// Vstupy zadá majitel, výpočet běží v prohlížeči (žádná externí služba).
export type InvestmentCalcContent = {
  heading?: string;
  price_czk?: number | null;
  area_m2?: number | null;
  monthly_rent_czk?: number | null;
  annual_costs_czk?: number | null;
};
export function readInvestmentCalcContent(content: unknown): InvestmentCalcContent {
  const c = (content ?? {}) as Record<string, unknown>;
  return {
    heading: asString(c.heading),
    price_czk: asNumberOrNull(c.price_czk),
    area_m2: asNumberOrNull(c.area_m2),
    monthly_rent_czk: asNumberOrNull(c.monthly_rent_czk),
    annual_costs_czk: asNumberOrNull(c.annual_costs_czk),
  };
}

export type InvestmentInputs = {
  price?: number | null; // kupní cena (Kč)
  area?: number | null; // plocha (m²)
  rent?: number | null; // měsíční nájem (Kč)
  costs?: number | null; // roční náklady (Kč)
};
export type InvestmentResults = {
  pricePerM2: number | null; // cena za m²
  annualRent: number | null; // roční nájem (nájem × 12)
  grossYieldPct: number | null; // hrubý roční výnos %
  netYieldPct: number | null; // čistý roční výnos % (po nákladech)
};

/** Kladné konečné číslo, jinak null (chrání před dělením nulou i prázdnem). */
function posFinite(v: number | null | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
}
/** Nezáporné konečné číslo, jinak null (náklady smí být i 0). */
function nonNegFinite(v: number | null | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
}

/**
 * Spočítá cenu za m² a výnosy. Cokoli nespočitatelného (chybí vstup, dělení
 * nulou) vrací null → zobrazí se pomlčka, nikdy NaN/Infinity.
 * - cena/m² potřebuje cenu i plochu (obojí > 0),
 * - hrubý výnos potřebuje cenu (> 0) a nájem (> 0),
 * - čistý výnos navíc potřebuje zadané roční náklady (>= 0).
 */
export function computeInvestment(inp: InvestmentInputs): InvestmentResults {
  const price = posFinite(inp.price);
  const area = posFinite(inp.area);
  const rent = posFinite(inp.rent);
  const costs = nonNegFinite(inp.costs);

  const pricePerM2 = price !== null && area !== null ? price / area : null;
  const annualRent = rent !== null ? rent * 12 : null;
  const grossYieldPct =
    price !== null && annualRent !== null ? (annualRent / price) * 100 : null;
  const netYieldPct =
    price !== null && annualRent !== null && costs !== null
      ? ((annualRent - costs) / price) * 100
      : null;

  return { pricePerM2, annualRent, grossYieldPct, netYieldPct };
}

// =====================================================================
//  PENB — barevná stupnice A–G (sdílí veřejná stránka i test)
// =====================================================================

export type EnergyClass = "A" | "B" | "C" | "D" | "E" | "F" | "G";
export const ENERGY_CLASSES: readonly EnergyClass[] = ["A", "B", "C", "D", "E", "F", "G"];

export const ENERGY_LABEL: Record<EnergyClass, string> = {
  A: "mimořádně úsporná",
  B: "velmi úsporná",
  C: "úsporná",
  D: "méně úsporná",
  E: "nehospodárná",
  F: "velmi nehospodárná",
  G: "mimořádně nehospodárná",
};

/** Barvy standardní PENB stupnice (zelená A → červená G). */
export const ENERGY_COLOR: Record<EnergyClass, string> = {
  A: "#1a9850",
  B: "#66bd63",
  C: "#a6d96a",
  D: "#fee08b",
  E: "#fdae61",
  F: "#f46d43",
  G: "#d73027",
};

export function isEnergyClass(v: unknown): v is EnergyClass {
  return typeof v === "string" && (ENERGY_CLASSES as readonly string[]).includes(v);
}

// =====================================================================
//  Výchozí pořadí sekcí (pojistka „nikdy prázdno")
//  Když prezentace nemá v DB žádné řádky sekcí (backfill ji minul), veřejná
//  stránka i editor si výchozí sadu dopočítají za běhu z existujících sloupců.
//  Stejné pořadí zakládá i backfill v migraci.
// =====================================================================

export type DefaultSectionSeed = { kind: SectionKind; content: Record<string, unknown> };

export const DEFAULT_SECTION_SEEDS: readonly DefaultSectionSeed[] = [
  { kind: "hero", content: {} },
  { kind: "gallery", content: { heading: "Galerie" } },
  { kind: "text", content: { heading: "Příběh nemovitosti", source: "description" } },
  { kind: "text", content: { heading: "Lokalita a okolí", source: "location_text" } },
  { kind: "text", content: { heading: "Vybavení a přednosti", source: "features_text" } },
  { kind: "parameters", content: {} },
  { kind: "contact", content: {} },
];
