import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { isUuid } from "@/lib/presentations/form";
import { formatAddress } from "@/lib/format";
import { formatFileSize, DOCUMENTS_BUCKET } from "@/lib/documents";
import { PHOTOS_BUCKET } from "@/lib/photos";
import { MEDIA_BUCKET } from "@/lib/media";
import { isMissingSchemaError } from "@/lib/db-errors";
import {
  isSectionKind,
  sectionLabel,
  readTextContent,
  readMapContent,
  readContactContent,
  readGalleryContent,
  readBenefitsContent,
  readValuationContent,
  readConditionContent,
  readPoiContent,
  readSocialContent,
  readNewsContent,
  readAnalyticMapsContent,
  readPanoramaContent,
  readFloorplansContent,
  readVideoContent,
  readInvestmentCalcContent,
  type SectionKind,
} from "@/lib/presentations/sections";
import { SchemaErrorScreen } from "../../../../schema-error";
import { wrap, card, smallBtn, SuccessBox, ErrorBox, WizardNav, PreviewLink } from "../../../ui";
import { ConfirmSubmit } from "../../../confirm-submit";
import { SectionEditor, type SectionDefaults, type GalleryPhoto } from "./editor";
import { DocumentsUploader } from "./documents-uploader";
import { deleteDocument } from "./actions";

export const dynamic = "force-dynamic";

const numToStr = (v: number | null): string => (v === null || v === undefined ? "" : String(v));

export default async function SectionEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; sectionId: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id, sectionId } = await params;
  const { saved, error } = await searchParams;

  if (!isSupabaseConfigured()) redirect("/presentations");
  if (!isUuid(id) || !isUuid(sectionId)) redirect("/presentations");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: p, error: loadError } = await supabase
    .from("presentations")
    .select(
      "id, slug, title, street, city, postal_code, price_czk, subtitle, property_type, disposition, floor_area_m2, land_area_m2, built_area_m2, building_dimensions, year_built, floors, condition, ownership, monthly_costs_czk, energy_class, lat, lng, contact_name, contact_email, contact_phone",
    )
    .eq("id", id)
    .maybeSingle();

  if (loadError) {
    console.error("[sections/edit] načtení prezentace selhalo:", loadError.message);
    if (isMissingSchemaError(loadError)) return <SchemaErrorScreen detail={loadError.message} />;
  }
  if (!p) {
    return (
      <main style={{ ...wrap, justifyContent: "center", textAlign: "center", gap: "1rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 700 }}>Prezentace nenalezena</h1>
        <Link href="/presentations" style={{ color: "var(--accent)" }}>
          ← zpět na Moje prezentace
        </Link>
      </main>
    );
  }

  const { data: section, error: sectionError } = await supabase
    .from("presentation_sections")
    .select("id, kind, content")
    .eq("id", sectionId)
    .eq("presentation_id", p.id)
    .maybeSingle();

  if (sectionError) {
    console.error("[sections/edit] načtení sekce selhalo:", sectionError.message);
    if (isMissingSchemaError(sectionError)) return <SchemaErrorScreen detail={sectionError.message} />;
  }
  if (!section || !isSectionKind(section.kind)) {
    return (
      <main style={{ ...wrap, justifyContent: "center", textAlign: "center", gap: "1rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 700 }}>Sekce nenalezena</h1>
        <Link href={`/presentations/${p.id}/sections`} style={{ color: "var(--accent)" }}>
          ← zpět na seznam sekcí
        </Link>
      </main>
    );
  }

  const kind = section.kind as SectionKind;
  const content = (section.content ?? {}) as Record<string, unknown>;

  // --- sestavení výchozích hodnot podle typu ---
  const defaults: SectionDefaults = {};
  const mediaPaths: string[] = []; // cesty k obrázkům sekce → podepíšeme níž

  if (kind === "hero") {
    defaults.subtitle = p.subtitle ?? "";
    defaults.showPrice = content.show_price !== false;
  } else if (kind === "text") {
    const t = readTextContent(content);
    defaults.textHeading = t.heading ?? "";
    defaults.textSource = t.source ?? null;
    defaults.textBody = t.body ?? "";
  } else if (kind === "parameters") {
    defaults.property_type = p.property_type ?? "";
    defaults.disposition = p.disposition ?? "";
    defaults.floor_area_m2 = numToStr(p.floor_area_m2);
    defaults.land_area_m2 = numToStr(p.land_area_m2);
    defaults.built_area_m2 = numToStr(p.built_area_m2);
    defaults.building_dimensions = p.building_dimensions ?? "";
    defaults.year_built = numToStr(p.year_built);
    defaults.floors = numToStr(p.floors);
    defaults.condition = p.condition ?? "";
    defaults.ownership = p.ownership ?? "";
    defaults.monthly_costs_czk = numToStr(p.monthly_costs_czk);
    defaults.energy_class = p.energy_class ?? "";
  } else if (kind === "map") {
    const m = readMapContent(content);
    defaults.mapHeading = m.heading ?? "";
    defaults.lat = numToStr(p.lat);
    defaults.lng = numToStr(p.lng);
    defaults.zoom = m.zoom ? String(m.zoom) : "";
    defaults.address = formatAddress(p) ?? "";
  } else if (kind === "contact") {
    const c = readContactContent(content);
    defaults.ctaText = c.cta_text ?? "";
    defaults.contactSummary =
      [p.contact_name, p.contact_phone, p.contact_email].filter(Boolean).join(", ") || "";
  } else if (kind === "benefits") {
    const b = readBenefitsContent(content);
    defaults.heading = b.heading ?? "";
    defaults.items = b.items.map((it) => ({
      icon: it.icon ?? "",
      heading: it.heading,
      body: it.body ?? "",
    }));
  } else if (kind === "valuation") {
    const v = readValuationContent(content);
    defaults.heading = v.heading ?? "";
    defaults.items = v.items.map((it) => ({
      source: it.source,
      url: it.url ?? "",
      estimate_czk: it.estimate_czk != null ? String(it.estimate_czk) : "",
      min_czk: it.min_czk != null ? String(it.min_czk) : "",
      max_czk: it.max_czk != null ? String(it.max_czk) : "",
      note: it.note ?? "",
    }));
  } else if (kind === "technicalCondition") {
    const c = readConditionContent(content);
    defaults.heading = c.heading ?? "";
    defaults.items = c.items.map((it) => ({
      category: it.category,
      condition: it.condition ?? "",
      description: it.description ?? "",
    }));
  } else if (kind === "poi") {
    const c = readPoiContent(content);
    defaults.heading = c.heading ?? "";
    defaults.items = c.items.map((it) => ({
      name: it.name,
      category: it.category ?? "",
      distance: it.distance ?? "",
      note: it.note ?? "",
    }));
  } else if (kind === "socialProof") {
    const c = readSocialContent(content);
    defaults.heading = c.heading ?? "";
    defaults.items = c.items.map((it) => ({
      author: it.author,
      rating: it.rating != null ? String(it.rating) : "",
      text: it.text ?? "",
      source: it.source ?? "",
    }));
  } else if (kind === "news") {
    const c = readNewsContent(content);
    defaults.heading = c.heading ?? "";
    defaults.items = c.items.map((it) => ({
      date: it.date ?? "",
      headline: it.headline,
      text: it.text ?? "",
      url: it.url ?? "",
    }));
  } else if (kind === "analyticMaps") {
    const c = readAnalyticMapsContent(content);
    defaults.heading = c.heading ?? "";
    defaults.mapsItems = c.items.map((it) => ({
      title: it.title ?? "",
      caption: it.caption ?? "",
      group: it.group ?? "",
      why: it.why ?? "",
      image_path: it.image_path ?? "",
    }));
    for (const it of c.items) if (it.image_path) mediaPaths.push(it.image_path);
  } else if (kind === "panorama") {
    const c = readPanoramaContent(content);
    defaults.panorama = {
      heading: c.heading ?? "",
      caption: c.caption ?? "",
      image_path: c.image_path ?? "",
    };
    if (c.image_path) mediaPaths.push(c.image_path);
  } else if (kind === "floorplans") {
    const c = readFloorplansContent(content);
    defaults.heading = c.heading ?? "";
    defaults.floorsData = c.floors.map((f) => ({
      label: f.label,
      image_path: f.image_path ?? "",
      rooms: f.rooms.map((r) => ({
        name: r.name,
        area: r.area ?? "",
        description: r.description ?? "",
        image_path: r.image_path ?? "",
      })),
    }));
    for (const f of c.floors) {
      if (f.image_path) mediaPaths.push(f.image_path);
      for (const r of f.rooms) if (r.image_path) mediaPaths.push(r.image_path);
    }
  } else if (kind === "video") {
    const v = readVideoContent(content);
    defaults.videoUrl = v.url ?? "";
    defaults.videoHeading = v.heading ?? "";
    defaults.videoCaption = v.caption ?? "";
  } else if (kind === "investmentCalc") {
    const c = readInvestmentCalcContent(content);
    defaults.calcHeading = c.heading ?? "";
    defaults.calcPrice = numToStr(c.price_czk ?? null);
    defaults.calcArea = numToStr(c.area_m2 ?? null);
    defaults.calcRent = numToStr(c.monthly_rent_czk ?? null);
    defaults.calcCosts = numToStr(c.annual_costs_czk ?? null);
  } else if (kind === "documents") {
    defaults.documentsHeading = typeof content.heading === "string" ? content.heading : "";
  }

  // Podepsané náhledové odkazy pro obrázky sekce (media bucket).
  if (mediaPaths.length > 0) {
    const mediaUrls: Record<string, string> = {};
    const { data: signed } = await supabase.storage
      .from(MEDIA_BUCKET)
      .createSignedUrls(mediaPaths, 60 * 60);
    for (const u of signed ?? []) if (u.signedUrl && u.path) mediaUrls[u.path] = u.signedUrl;
    defaults.mediaUrls = mediaUrls;
  }

  // --- galerie: fotky s náhledem + popisky ---
  if (kind === "gallery") {
    defaults.galleryHeading = readGalleryContent(content).heading ?? "";
    const { data: photosData } = await supabase
      .from("presentation_photos")
      .select("id, storage_path, caption, category, sort_order, is_hero")
      .eq("presentation_id", p.id)
      .order("sort_order", { ascending: true });
    const photos = photosData ?? [];
    const signed = new Map<string, string>();
    if (photos.length > 0) {
      const { data: urls } = await supabase.storage
        .from(PHOTOS_BUCKET)
        .createSignedUrls(photos.map((ph) => ph.storage_path), 60 * 60);
      for (const u of urls ?? []) if (u.signedUrl && u.path) signed.set(u.path, u.signedUrl);
    }
    defaults.photos = photos.map((ph): GalleryPhoto => ({
      id: ph.id,
      url: signed.get(ph.storage_path),
      caption: ph.caption ?? "",
      category: ph.category ?? "",
    }));
  }

  // --- dokumenty: seznam + náhledové odkazy ---
  type DocRow = {
    id: string;
    name: string;
    category: string | null;
    description: string | null;
    storage_path: string;
    file_size_bytes: number | null;
    url?: string;
  };
  let documents: DocRow[] = [];
  let documentCount = 0;
  if (kind === "documents") {
    const { data: docsData, error: docsError } = await supabase
      .from("presentation_documents")
      .select("id, name, category, description, storage_path, file_size_bytes, sort_order")
      .eq("presentation_id", p.id)
      .order("sort_order", { ascending: true });
    if (docsError && isMissingSchemaError(docsError)) {
      return <SchemaErrorScreen detail={docsError.message} />;
    }
    const rows = docsData ?? [];
    documentCount = rows.length;
    const signed = new Map<string, string>();
    if (rows.length > 0) {
      const { data: urls } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .createSignedUrls(rows.map((d) => d.storage_path), 60 * 60);
      for (const u of urls ?? []) if (u.signedUrl && u.path) signed.set(u.path, u.signedUrl);
    }
    documents = rows.map((d) => ({ ...d, url: signed.get(d.storage_path) }));
  }

  const nazev = p.title || [p.street, p.city].filter(Boolean).join(", ") || "Prezentace";

  return (
    <main style={wrap}>
      <div style={{ ...card, width: "42rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <WizardNav presentationId={p.id} current="sections" />
            <PreviewLink slug={p.slug} />
          </div>
          <p style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
            <Link href={`/presentations/${p.id}/sections`} style={{ color: "var(--muted)" }}>
              Sekce
            </Link>{" "}
            / {nazev}
          </p>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700 }}>{sectionLabel(kind)}</h1>
        </div>

        {saved ? <SuccessBox>Uloženo. ✅</SuccessBox> : null}
        {error === "doc-delete" ? <ErrorBox>Smazání dokumentu se nepovedlo, zkus to znovu.</ErrorBox> : null}

        <SectionEditor
          presentationId={p.id}
          sectionId={section.id}
          userId={user.id}
          kind={kind}
          defaults={defaults}
        />

        {kind === "documents" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", borderTop: "1px solid #1e293b", paddingTop: "1.25rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Soubory</h2>
            <DocumentsUploader presentationId={p.id} userId={user.id} documentCount={documentCount} />

            {documents.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Zatím žádné dokumenty.</p>
            ) : (
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {documents.map((doc) => (
                  <li
                    key={doc.id}
                    style={{
                      border: "1px solid #1e293b",
                      borderRadius: "10px",
                      padding: "0.6rem 0.8rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: "12rem" }}>
                      <div style={{ fontWeight: 600 }}>{doc.name}</div>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                        {[doc.category, formatFileSize(doc.file_size_bytes)].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    {doc.url ? (
                      <a href={doc.url} target="_blank" rel="noreferrer" style={{ ...smallBtn, textDecoration: "none" }}>
                        Otevřít
                      </a>
                    ) : null}
                    <form action={deleteDocument}>
                      <input type="hidden" name="document_id" value={doc.id} />
                      <input type="hidden" name="section_id" value={section.id} />
                      <input type="hidden" name="presentation_id" value={p.id} />
                      <ConfirmSubmit
                        message="Opravdu smazat tento dokument?"
                        style={{ ...smallBtn, color: "#fca5a5", borderColor: "rgba(248,113,113,0.4)" }}
                      >
                        Smazat
                      </ConfirmSubmit>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </main>
  );
}
