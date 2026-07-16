"use client";

// Editor obsahu jedné sekce. Podle typu (kind) vykreslí příslušná pole.
// Přes useActionState: chyba se ukáže na místě a rozepsané hodnoty zůstanou.

import Link from "next/link";
import { useActionState } from "react";
import { label, hint, input, textarea, primaryBtn, ErrorBox } from "../../../ui";
import {
  ENERGY_CLASSES,
  CONDITION_STATES,
  CONDITION_LABEL,
  sectionLabel,
  type SectionKind,
} from "@/lib/presentations/sections";
import { saveSection } from "./actions";
import { RepeatableItems } from "./repeatable";
import { AnalyticMapsFields, PanoramaFields, FloorplansFields } from "./media-editors";

export type GalleryPhoto = {
  id: string;
  url?: string;
  caption: string;
  category: string;
};

export type SectionDefaults = {
  // hero
  subtitle?: string;
  showPrice?: boolean;
  // text
  textHeading?: string;
  textSource?: string | null;
  textBody?: string;
  // parameters
  property_type?: string;
  disposition?: string;
  floor_area_m2?: string;
  land_area_m2?: string;
  built_area_m2?: string;
  building_dimensions?: string;
  year_built?: string;
  floors?: string;
  condition?: string;
  ownership?: string;
  monthly_costs_czk?: string;
  energy_class?: string;
  // map
  mapHeading?: string;
  lat?: string;
  lng?: string;
  zoom?: string;
  address?: string;
  // contact
  ctaText?: string;
  contactSummary?: string;
  // gallery
  galleryHeading?: string;
  photos?: GalleryPhoto[];
  // documents
  documentsHeading?: string;
  // repeatable (benefits/valuation/condition/poi/social/news)
  heading?: string;
  items?: Record<string, string>[];
  // obrázkové sekce (kolo 2/3)
  mapsItems?: { title: string; caption: string; group: string; why: string; image_path: string }[];
  panorama?: { heading: string; caption: string; image_path: string };
  // floorsData (ne „floors" — to je string u parametrů, kolidovalo by v tomto typu)
  floorsData?: {
    label: string;
    image_path: string;
    compass: number | null;
    rooms: {
      name: string;
      area: string;
      description: string;
      image_path: string;
      x: number | null;
      y: number | null;
      polygon?: { x: number; y: number }[];
    }[];
  }[];
  mediaUrls?: Record<string, string>;
  // video
  videoUrl?: string;
  videoHeading?: string;
  videoCaption?: string;
  // investmentCalc
  calcHeading?: string;
  calcPrice?: string;
  calcArea?: string;
  calcRent?: string;
  calcCosts?: string;
};

const CATEGORY_OPTIONS = [
  { value: "exterier", label: "Exteriér" },
  { value: "interier", label: "Interiér" },
  { value: "zahrada", label: "Zahrada" },
  { value: "okoli", label: "Okolí" },
];

export function SectionEditor({
  presentationId,
  sectionId,
  userId,
  kind,
  defaults,
}: {
  presentationId: string;
  sectionId: string;
  userId: string;
  kind: SectionKind;
  defaults: SectionDefaults;
}) {
  const [state, formAction, pending] = useActionState(saveSection, {});

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
      {state.error ? <ErrorBox>{state.error}</ErrorBox> : null}
      <input type="hidden" name="section_id" value={sectionId} />

      {kind === "hero" ? <HeroFields presentationId={presentationId} defaults={defaults} /> : null}
      {kind === "text" ? <TextFields presentationId={presentationId} defaults={defaults} /> : null}
      {kind === "parameters" ? <ParameterFields defaults={defaults} /> : null}
      {kind === "map" ? <MapFields defaults={defaults} /> : null}
      {kind === "contact" ? <ContactFields presentationId={presentationId} defaults={defaults} /> : null}
      {kind === "gallery" ? <GalleryFields presentationId={presentationId} defaults={defaults} /> : null}
      {kind === "benefits" ? <BenefitsFields defaults={defaults} /> : null}
      {kind === "valuation" ? <ValuationFields defaults={defaults} /> : null}
      {kind === "technicalCondition" ? <ConditionFields defaults={defaults} /> : null}
      {kind === "poi" ? <PoiFields defaults={defaults} /> : null}
      {kind === "socialProof" ? <SocialFields defaults={defaults} /> : null}
      {kind === "news" ? <NewsFields defaults={defaults} /> : null}
      {kind === "video" ? <VideoFields defaults={defaults} /> : null}
      {kind === "investmentCalc" ? <InvestmentCalcFields defaults={defaults} /> : null}
      {kind === "analyticMaps" ? (
        <AnalyticMapsFields
          presentationId={presentationId}
          userId={userId}
          heading={defaults.heading ?? ""}
          initialItems={defaults.mapsItems ?? []}
          mediaUrls={defaults.mediaUrls ?? {}}
        />
      ) : null}
      {kind === "panorama" ? (
        <PanoramaFields
          presentationId={presentationId}
          userId={userId}
          heading={defaults.panorama?.heading ?? ""}
          caption={defaults.panorama?.caption ?? ""}
          imagePath={defaults.panorama?.image_path ?? ""}
          currentUrl={defaults.panorama?.image_path ? defaults.mediaUrls?.[defaults.panorama.image_path] : undefined}
        />
      ) : null}
      {kind === "floorplans" ? (
        <FloorplansFields
          presentationId={presentationId}
          userId={userId}
          heading={defaults.heading ?? ""}
          initialFloors={defaults.floorsData ?? []}
          mediaUrls={defaults.mediaUrls ?? {}}
        />
      ) : null}
      {kind === "documents" ? (
        <label style={label}>
          Nadpis sekce
          <input
            style={input}
            type="text"
            name="heading"
            maxLength={200}
            placeholder="např. Dokumenty ke stažení"
            defaultValue={defaults.documentsHeading ?? ""}
          />
        </label>
      ) : null}

      <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginTop: "0.25rem" }}>
        <button
          type="submit"
          disabled={pending}
          style={{ ...primaryBtn, opacity: pending ? 0.6 : 1, cursor: pending ? "wait" : "pointer" }}
        >
          {pending ? "Ukládám…" : `Uložit sekci ${sectionLabel(kind).toLowerCase()}`}
        </button>
        <Link href={`/presentations/${presentationId}/sections`} style={{ color: "var(--muted)" }}>
          ← zpět na seznam sekcí
        </Link>
      </div>
    </form>
  );
}

function HeroFields({ presentationId, defaults }: { presentationId: string; defaults: SectionDefaults }) {
  return (
    <>
      <label style={label}>
        Podnadpis (přes fotku, pod titulkem)
        <input
          style={input}
          type="text"
          name="subtitle"
          maxLength={300}
          placeholder="např. Rodinný dům se zahradou v klidné ulici"
          defaultValue={defaults.subtitle ?? ""}
        />
        <span style={hint}>
          Titulek, cena a dispozice se berou z kroku Základ. Hlavní fotku vybereš v kroku Fotky.
        </span>
      </label>
      <label style={{ ...label, flexDirection: "row", alignItems: "center", gap: "0.6rem" }}>
        <input type="checkbox" name="show_price" defaultChecked={defaults.showPrice ?? true} />
        Zobrazit cenu v úvodním bloku
      </label>
      <p style={hint}>
        <Link href={`/presentations/${presentationId}/edit`} style={{ color: "var(--accent)" }}>
          Upravit titulek a cenu (Základ)
        </Link>
        {" · "}
        <Link href={`/presentations/${presentationId}/photos`} style={{ color: "var(--accent)" }}>
          Vybrat hlavní fotku (Fotky)
        </Link>
      </p>
    </>
  );
}

function TextFields({ presentationId, defaults }: { presentationId: string; defaults: SectionDefaults }) {
  const isSourceBacked = Boolean(defaults.textSource);
  return (
    <>
      <label style={label}>
        Nadpis sekce
        <input
          style={input}
          type="text"
          name="heading"
          maxLength={200}
          placeholder="např. Příběh nemovitosti"
          defaultValue={defaults.textHeading ?? ""}
        />
      </label>
      {isSourceBacked ? (
        <p style={hint}>
          Text téhle sekce se edituje v kroku{" "}
          <Link href={`/presentations/${presentationId}/texts`} style={{ color: "var(--accent)" }}>
            Texty
          </Link>
          . Tady měníš jen nadpis a pořadí/zapnutí. (Je to napojené na původní textové pole, ať se
          nic needituje na dvou místech.)
        </p>
      ) : (
        <label style={label}>
          Text
          <textarea
            style={textarea}
            name="body"
            maxLength={5000}
            placeholder="Napiš text téhle sekce…"
            defaultValue={defaults.textBody ?? ""}
          />
        </label>
      )}
    </>
  );
}

function ParameterFields({ defaults }: { defaults: SectionDefaults }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
      <p style={hint}>Vyplň, co dává smysl — prázdná pole se na veřejné stránce nezobrazí.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label style={label}>
          Typ nemovitosti
          <input style={input} type="text" name="property_type" maxLength={60} placeholder="např. rodinný dům" defaultValue={defaults.property_type ?? ""} />
        </label>
        <label style={label}>
          Dispozice
          <input style={input} type="text" name="disposition" maxLength={60} placeholder="např. 5+kk" defaultValue={defaults.disposition ?? ""} />
        </label>
        <label style={label}>
          Užitná plocha (m²)
          <input style={input} type="text" name="floor_area_m2" inputMode="decimal" placeholder="např. 120" defaultValue={defaults.floor_area_m2 ?? ""} />
        </label>
        <label style={label}>
          Plocha pozemku (m²)
          <input style={input} type="text" name="land_area_m2" inputMode="decimal" placeholder="např. 640" defaultValue={defaults.land_area_m2 ?? ""} />
        </label>
        <label style={label}>
          Zastavěná plocha (m²)
          <input style={input} type="text" name="built_area_m2" inputMode="decimal" placeholder="např. 90" defaultValue={defaults.built_area_m2 ?? ""} />
        </label>
        <label style={label}>
          Rozměry stavby
          <input style={input} type="text" name="building_dimensions" maxLength={60} placeholder="např. 9,5 × 9,5 m" defaultValue={defaults.building_dimensions ?? ""} />
        </label>
        <label style={label}>
          Rok stavby
          <input style={input} type="text" name="year_built" inputMode="numeric" placeholder="např. 1998" defaultValue={defaults.year_built ?? ""} />
        </label>
        <label style={label}>
          Počet podlaží
          <input style={input} type="text" name="floors" inputMode="numeric" placeholder="např. 2" defaultValue={defaults.floors ?? ""} />
        </label>
        <label style={label}>
          Stav
          <input style={input} type="text" name="condition" maxLength={60} placeholder="např. velmi dobrý" defaultValue={defaults.condition ?? ""} />
        </label>
        <label style={label}>
          Vlastnictví
          <input style={input} type="text" name="ownership" maxLength={60} placeholder="např. osobní" defaultValue={defaults.ownership ?? ""} />
        </label>
        <label style={label}>
          Provozní náklady (Kč/měsíc)
          <input style={input} type="text" name="monthly_costs_czk" inputMode="numeric" placeholder="např. 4500" defaultValue={defaults.monthly_costs_czk ?? ""} />
        </label>
        <label style={label}>
          Energetická třída (PENB)
          <select style={input} name="energy_class" defaultValue={defaults.energy_class ?? ""}>
            <option value="">—</option>
            {ENERGY_CLASSES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

function MapFields({ defaults }: { defaults: SectionDefaults }) {
  return (
    <>
      <label style={label}>
        Nadpis sekce
        <input style={input} type="text" name="heading" maxLength={200} placeholder="např. Kde to je" defaultValue={defaults.mapHeading ?? ""} />
      </label>
      <p style={hint}>
        Zadej GPS souřadnice pinu. Najdeš je snadno na{" "}
        <a
          href={`https://mapy.cz/zakladni?q=${encodeURIComponent(defaults.address ?? "")}`}
          target="_blank"
          rel="noreferrer"
          style={{ color: "var(--accent)" }}
        >
          Mapy.cz
        </a>{" "}
        — klikni pravým na místo → Souřadnice.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label style={label}>
          Zeměpisná šířka (lat)
          <input style={input} type="text" name="lat" inputMode="decimal" placeholder="např. 50.0412" defaultValue={defaults.lat ?? ""} />
        </label>
        <label style={label}>
          Zeměpisná délka (lng)
          <input style={input} type="text" name="lng" inputMode="decimal" placeholder="např. 14.3821" defaultValue={defaults.lng ?? ""} />
        </label>
      </div>
      <label style={label}>
        Přiblížení (1–20, nepovinné)
        <input style={input} type="text" name="zoom" inputMode="numeric" placeholder="např. 15" defaultValue={defaults.zoom ?? ""} />
      </label>
    </>
  );
}

function ContactFields({ presentationId, defaults }: { presentationId: string; defaults: SectionDefaults }) {
  return (
    <>
      <label style={label}>
        Text nad kontaktem (výzva)
        <textarea
          style={{ ...textarea, minHeight: "5rem" }}
          name="cta_text"
          maxLength={300}
          placeholder="např. Zaujalo vás bydlení? Ozvěte se, rád vám ho ukážu."
          defaultValue={defaults.ctaText ?? ""}
        />
      </label>
      <p style={hint}>
        {defaults.contactSummary
          ? `Kontakt: ${defaults.contactSummary}. `
          : "Kontakt (jméno, telefon, e-mail) zatím chybí. "}
        <Link href={`/presentations/${presentationId}/texts`} style={{ color: "var(--accent)" }}>
          Upravit kontakt v kroku Texty
        </Link>
      </p>
    </>
  );
}

function GalleryFields({ presentationId, defaults }: { presentationId: string; defaults: SectionDefaults }) {
  const photos = defaults.photos ?? [];
  return (
    <>
      <label style={label}>
        Nadpis galerie
        <input style={input} type="text" name="heading" maxLength={200} placeholder="např. Galerie" defaultValue={defaults.galleryHeading ?? ""} />
      </label>
      <input type="hidden" name="photo_ids" value={photos.map((p) => p.id).join(",")} />
      {photos.length === 0 ? (
        <p style={hint}>
          Galerie zatím nemá fotky.{" "}
          <Link href={`/presentations/${presentationId}/photos`} style={{ color: "var(--accent)" }}>
            Přidat fotky
          </Link>
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <p style={hint}>U každé fotky můžeš doplnit popisek a kategorii. Fotky přidáváš/mažeš v kroku Fotky.</p>
          {photos.map((photo, i) => (
            <div
              key={photo.id}
              style={{
                display: "flex",
                gap: "0.75rem",
                border: "1px solid #1e293b",
                borderRadius: "10px",
                padding: "0.6rem",
                alignItems: "center",
              }}
            >
              <div style={{ width: "72px", height: "54px", flexShrink: 0, background: "#0f172a", borderRadius: "6px", overflow: "hidden" }}>
                {photo.url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- podepsané URL jsou dočasné
                  <img src={photo.url} alt={`Fotka ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : null}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", flex: 1 }}>
                <input
                  style={input}
                  type="text"
                  name={`caption_${photo.id}`}
                  maxLength={300}
                  placeholder="Popisek fotky"
                  defaultValue={photo.caption}
                />
                <select style={input} name={`category_${photo.id}`} defaultValue={photo.category}>
                  <option value="">Bez kategorie</option>
                  {CATEGORY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function BenefitsFields({ defaults }: { defaults: SectionDefaults }) {
  return (
    <>
      <label style={label}>
        Nadpis sekce
        <input style={input} type="text" name="heading" maxLength={200} placeholder="např. Proč právě tady" defaultValue={defaults.heading ?? ""} />
      </label>
      <RepeatableItems
        name="items_json"
        addLabel="Přidat přednost"
        initial={defaults.items ?? []}
        emptyHint="Zatím žádná přednost. Přidej dlaždici tlačítkem níže."
        fields={[
          { key: "icon", label: "Ikona (emoji, nepovinné)", type: "text", placeholder: "např. 🌳" },
          { key: "heading", label: "Nadpis dlaždice", type: "text", placeholder: "např. Klidná ulice" },
          { key: "body", label: "Popis (nepovinné)", type: "textarea", placeholder: "Krátký popis…" },
        ]}
      />
    </>
  );
}

function ValuationFields({ defaults }: { defaults: SectionDefaults }) {
  return (
    <>
      <label style={label}>
        Nadpis sekce
        <input style={input} type="text" name="heading" maxLength={200} placeholder="např. Nezávislé odhady ceny" defaultValue={defaults.heading ?? ""} />
      </label>
      <RepeatableItems
        name="items_json"
        addLabel="Přidat odhad"
        initial={defaults.items ?? []}
        emptyHint="Zatím žádný odhad. Přidej ho tlačítkem níže."
        fields={[
          { key: "source", label: "Zdroj", type: "text", placeholder: "např. Reas, Bezrealitky…" },
          { key: "url", label: "Odkaz (nepovinné)", type: "text", placeholder: "https://…" },
          { key: "estimate_czk", label: "Odhad (Kč)", type: "number", placeholder: "např. 8900000" },
          { key: "min_czk", label: "Od (Kč, nepovinné)", type: "number", placeholder: "např. 8500000" },
          { key: "max_czk", label: "Do (Kč, nepovinné)", type: "number", placeholder: "např. 9300000" },
          { key: "note", label: "Poznámka (nepovinné)", type: "text", placeholder: "krátká poznámka" },
        ]}
      />
    </>
  );
}

function ConditionFields({ defaults }: { defaults: SectionDefaults }) {
  return (
    <>
      <label style={label}>
        Nadpis sekce
        <input style={input} type="text" name="heading" maxLength={200} placeholder="např. Technický stav" defaultValue={defaults.heading ?? ""} />
      </label>
      <RepeatableItems
        name="items_json"
        addLabel="Přidat položku"
        initial={defaults.items ?? []}
        emptyHint="Zatím žádná položka. Přidej ji tlačítkem níže."
        fields={[
          { key: "category", label: "Co (kategorie)", type: "text", placeholder: "např. Střecha" },
          {
            key: "condition",
            label: "Stav",
            type: "select",
            options: CONDITION_STATES.map((c) => ({ value: c, label: CONDITION_LABEL[c] })),
          },
          { key: "description", label: "Popis (nepovinné)", type: "textarea", placeholder: "např. Nová krytina 2021" },
        ]}
      />
    </>
  );
}

function PoiFields({ defaults }: { defaults: SectionDefaults }) {
  return (
    <>
      <label style={label}>
        Nadpis sekce
        <input style={input} type="text" name="heading" maxLength={200} placeholder="např. Co máte v okolí" defaultValue={defaults.heading ?? ""} />
      </label>
      <p style={hint}>Ručně zadaná místa v okolí. (Automatické načítání z map přijde později — vyžaduje klíč.)</p>
      <RepeatableItems
        name="items_json"
        addLabel="Přidat místo"
        initial={defaults.items ?? []}
        emptyHint="Zatím žádné místo. Přidej ho tlačítkem níže."
        fields={[
          { key: "name", label: "Název", type: "text", placeholder: "např. ZŠ Radotín" },
          { key: "category", label: "Kategorie", type: "text", placeholder: "např. Škola / Obchod / MHD" },
          { key: "distance", label: "Vzdálenost", type: "text", placeholder: "např. 5 min pěšky" },
          { key: "note", label: "Poznámka (nepovinné)", type: "text", placeholder: "krátká poznámka" },
        ]}
      />
    </>
  );
}

function SocialFields({ defaults }: { defaults: SectionDefaults }) {
  return (
    <>
      <label style={label}>
        Nadpis sekce
        <input style={input} type="text" name="heading" maxLength={200} placeholder="např. Co říkají ostatní" defaultValue={defaults.heading ?? ""} />
      </label>
      <RepeatableItems
        name="items_json"
        addLabel="Přidat referenci"
        initial={defaults.items ?? []}
        emptyHint="Zatím žádná reference. Přidej ji tlačítkem níže."
        fields={[
          { key: "author", label: "Jméno / zdroj", type: "text", placeholder: "např. Rodina Novákových" },
          {
            key: "rating",
            label: "Hodnocení",
            type: "select",
            options: [
              { value: "5", label: "5 hvězdiček" },
              { value: "4", label: "4 hvězdičky" },
              { value: "3", label: "3 hvězdičky" },
              { value: "2", label: "2 hvězdičky" },
              { value: "1", label: "1 hvězdička" },
            ],
          },
          { key: "text", label: "Text", type: "textarea", placeholder: "Co ocenili…" },
          { key: "source", label: "Zdroj (nepovinné)", type: "text", placeholder: "např. Google recenze" },
        ]}
      />
    </>
  );
}

function NewsFields({ defaults }: { defaults: SectionDefaults }) {
  return (
    <>
      <label style={label}>
        Nadpis sekce
        <input style={input} type="text" name="heading" maxLength={200} placeholder="např. Novinky" defaultValue={defaults.heading ?? ""} />
      </label>
      <RepeatableItems
        name="items_json"
        addLabel="Přidat zápis"
        initial={defaults.items ?? []}
        emptyHint="Zatím žádný zápis. Přidej ho tlačítkem níže."
        fields={[
          { key: "date", label: "Datum", type: "text", placeholder: "např. 15. 7. 2026" },
          { key: "headline", label: "Nadpis", type: "text", placeholder: "např. Nová cyklostezka" },
          { key: "text", label: "Text (nepovinné)", type: "textarea", placeholder: "krátký popis" },
          { key: "url", label: "Odkaz (nepovinné)", type: "text", placeholder: "https://…" },
        ]}
      />
    </>
  );
}

function VideoFields({ defaults }: { defaults: SectionDefaults }) {
  return (
    <>
      <label style={label}>
        Odkaz na video (YouTube nebo Vimeo)
        <input
          style={input}
          type="url"
          name="video_url"
          maxLength={500}
          placeholder="např. https://www.youtube.com/watch?v=xxxxxxxxxxx"
          defaultValue={defaults.videoUrl ?? ""}
        />
        <span style={hint}>
          Zkopíruj odkaz na video z YouTube nebo Vimeo. Rozumíme běžným tvarům
          (youtu.be/…, watch?v=…, vimeo.com/…). Video se vloží bezpečně, přes soukromý
          přehrávač bez sledovacích cookies navíc.
        </span>
      </label>
      <label style={label}>
        Nadpis sekce (nepovinné)
        <input
          style={input}
          type="text"
          name="heading"
          maxLength={200}
          placeholder="např. Video prohlídka"
          defaultValue={defaults.videoHeading ?? ""}
        />
      </label>
      <label style={label}>
        Popisek pod videem (nepovinné)
        <textarea
          style={textarea}
          name="caption"
          maxLength={500}
          placeholder="Krátký popis videa…"
          defaultValue={defaults.videoCaption ?? ""}
        />
      </label>
    </>
  );
}

function InvestmentCalcFields({ defaults }: { defaults: SectionDefaults }) {
  return (
    <>
      <label style={label}>
        Nadpis sekce (nepovinné)
        <input
          style={input}
          type="text"
          name="heading"
          maxLength={200}
          placeholder="např. Investiční kalkulačka"
          defaultValue={defaults.calcHeading ?? ""}
        />
      </label>
      <p style={hint}>
        Výnosy se spočítají samy z hodnot níž. Nájem a náklady jsou nepovinné — bez
        nájmu se ukáže jen cena za m², bez nákladů se vynechá čistý výnos.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label style={label}>
          Kupní cena (Kč)
          <input style={input} type="text" name="price_czk" inputMode="numeric" placeholder="např. 8900000" defaultValue={defaults.calcPrice ?? ""} />
        </label>
        <label style={label}>
          Plocha (m²)
          <input style={input} type="text" name="area_m2" inputMode="decimal" placeholder="např. 82" defaultValue={defaults.calcArea ?? ""} />
        </label>
        <label style={label}>
          Měsíční nájem (Kč, nepovinné)
          <input style={input} type="text" name="monthly_rent_czk" inputMode="numeric" placeholder="např. 18000" defaultValue={defaults.calcRent ?? ""} />
        </label>
        <label style={label}>
          Roční náklady (Kč, nepovinné)
          <input style={input} type="text" name="annual_costs_czk" inputMode="numeric" placeholder="např. 24000" defaultValue={defaults.calcCosts ?? ""} />
        </label>
      </div>
    </>
  );
}
