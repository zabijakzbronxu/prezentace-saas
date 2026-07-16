import Link from "next/link";
import { moveSection, toggleSection, deleteSection } from "../sections/actions";
import { canMoveSection } from "@/lib/presentations/design";
import { sectionLabel, type SectionKind } from "@/lib/presentations/sections";
import { ConfirmSubmit } from "../../confirm-submit";

// Ovládací lišta jedné sekce ve vizuálním edit-modu. Přesun/zapnutí/smazání jedou
// přes UŽ EXISTUJÍCÍ akce sekcí (`return_to` = zpět sem, na edit-mode); „Upravit"
// otevře stávající editor OBSAHU té sekce (obecně, i pro půdorysy — jejich editor
// se dá později vyměnit bez zásahu sem). Sama lišta je čistě serverová (formuláře +
// odkaz), žádný klientský JS. Anonym ji nikdy nevidí — celá cesta /design je jen
// pro přihlášeného vlastníka.

const BAR_BG = "#111827";
const BAR_TEXT = "#f9fafb";

const btn: React.CSSProperties = {
  padding: "0.3rem 0.6rem",
  borderRadius: "6px",
  border: "1px solid rgba(255,255,255,0.25)",
  background: "rgba(255,255,255,0.08)",
  color: BAR_TEXT,
  fontSize: "0.8rem",
  cursor: "pointer",
  textDecoration: "none",
  lineHeight: 1.2,
};

export function SectionFrame({
  presentationId,
  returnTo,
  section,
  index,
  count,
  children,
}: {
  presentationId: string;
  returnTo: string;
  section: { id: string; kind: SectionKind; enabled: boolean };
  index: number;
  count: number;
  children: React.ReactNode;
}) {
  const label = sectionLabel(section.kind);
  const canUp = canMoveSection(index, count, "up");
  const canDown = canMoveSection(index, count, "down");
  const editHref = `/presentations/${presentationId}/sections/${section.id}?from=design`;

  return (
    <div
      style={{
        position: "relative",
        outline: section.enabled ? "none" : "2px dashed #cbd5e1",
        outlineOffset: "-2px",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: "2.6rem",
          zIndex: 30,
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          flexWrap: "wrap",
          background: BAR_BG,
          color: BAR_TEXT,
          padding: "0.45rem 0.8rem",
          fontSize: "0.85rem",
        }}
      >
        <span style={{ fontWeight: 700 }}>
          {index + 1}. {label}
        </span>
        <span
          style={{
            fontSize: "0.72rem",
            padding: "0.1rem 0.5rem",
            borderRadius: "999px",
            background: section.enabled ? "rgba(34,197,94,0.25)" : "rgba(148,163,184,0.3)",
            color: section.enabled ? "#bbf7d0" : "#e2e8f0",
          }}
        >
          {section.enabled ? "zapnuto" : "vypnuto"}
        </span>

        <div style={{ display: "flex", gap: "0.35rem", marginLeft: "auto", flexWrap: "wrap" }}>
          <form action={moveSection}>
            <input type="hidden" name="section_id" value={section.id} />
            <input type="hidden" name="presentation_id" value={presentationId} />
            <input type="hidden" name="return_to" value={returnTo} />
            <input type="hidden" name="direction" value="up" />
            <button type="submit" style={btn} disabled={!canUp} title="Posunout nahoru">
              ↑
            </button>
          </form>
          <form action={moveSection}>
            <input type="hidden" name="section_id" value={section.id} />
            <input type="hidden" name="presentation_id" value={presentationId} />
            <input type="hidden" name="return_to" value={returnTo} />
            <input type="hidden" name="direction" value="down" />
            <button type="submit" style={btn} disabled={!canDown} title="Posunout dolů">
              ↓
            </button>
          </form>
          <form action={toggleSection}>
            <input type="hidden" name="section_id" value={section.id} />
            <input type="hidden" name="presentation_id" value={presentationId} />
            <input type="hidden" name="return_to" value={returnTo} />
            <input type="hidden" name="enabled" value={section.enabled ? "false" : "true"} />
            <button type="submit" style={btn}>
              {section.enabled ? "Vypnout" : "Zapnout"}
            </button>
          </form>
          <Link href={editHref} style={{ ...btn, fontWeight: 700 }}>
            Upravit
          </Link>
          <form action={deleteSection}>
            <input type="hidden" name="section_id" value={section.id} />
            <input type="hidden" name="presentation_id" value={presentationId} />
            <input type="hidden" name="return_to" value={returnTo} />
            <ConfirmSubmit
              message={`Opravdu odebrat sekci „${label}"? Obsah sekce se smaže.`}
              style={{ ...btn, borderColor: "rgba(248,113,113,0.6)", color: "#fecaca" }}
            >
              Odebrat
            </ConfirmSubmit>
          </form>
        </div>
      </div>

      <div style={{ opacity: section.enabled ? 1 : 0.5 }}>{children}</div>
    </div>
  );
}
