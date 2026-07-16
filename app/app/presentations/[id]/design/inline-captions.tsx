"use client";

// Inline popisky fotek v galerii (vizuální edit-mode). Každá fotka má vlastní
// malý formulář: napiš popisek → Uložit. Chyba se ukáže přímo u fotky a rozepsaný
// text zůstane (useActionState, žádné přesměrování; lesson 2026-07-07). Po úspěchu
// drobné „Uloženo".

import { useActionState } from "react";
import { savePhotoCaption, type CaptionState } from "./actions";

export type CaptionPhoto = { id: string; url?: string; caption: string };

const BORDER = "#e7e5e4";
const MUTED = "#646463";
const INK = "#1c1917";

export function InlineCaptions({
  presentationId,
  photos,
}: {
  presentationId: string;
  photos: CaptionPhoto[];
}) {
  if (photos.length === 0) {
    return (
      <p style={{ color: MUTED, fontSize: "0.9rem" }}>
        Galerie zatím nemá fotky. Přidej je v kroku Fotky, pak sem půjde psát popisky.
      </p>
    );
  }
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(min(220px, 100%), 1fr))",
        gap: "0.9rem",
      }}
    >
      {photos.map((photo, i) => (
        <CaptionCard key={photo.id} presentationId={presentationId} photo={photo} index={i} />
      ))}
    </div>
  );
}

function CaptionCard({
  presentationId,
  photo,
  index,
}: {
  presentationId: string;
  photo: CaptionPhoto;
  index: number;
}) {
  const [state, action, pending] = useActionState<CaptionState, FormData>(savePhotoCaption, {});
  return (
    <form
      action={action}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.4rem",
        border: `1px solid ${BORDER}`,
        borderRadius: "10px",
        padding: "0.5rem",
        background: "#fff",
      }}
    >
      <div style={{ aspectRatio: "4 / 3", background: "#faf9f7", borderRadius: "6px", overflow: "hidden" }}>
        {photo.url ? (
          // eslint-disable-next-line @next/next/no-img-element -- podepsané URL jsou dočasné
          <img
            src={photo.url}
            alt={photo.caption || `Fotka ${index + 1}`}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : null}
      </div>
      <input type="hidden" name="presentation_id" value={presentationId} />
      <input type="hidden" name="photo_id" value={photo.id} />
      <input
        type="text"
        name="caption"
        maxLength={300}
        defaultValue={photo.caption}
        placeholder="Popisek fotky…"
        style={{
          padding: "0.45rem 0.6rem",
          borderRadius: "6px",
          border: `1px solid ${BORDER}`,
          fontSize: "0.9rem",
          color: INK,
          background: "#fff",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <button
          type="submit"
          disabled={pending}
          style={{
            padding: "0.35rem 0.8rem",
            borderRadius: "6px",
            border: `1px solid ${INK}`,
            background: pending ? "#f5f5f4" : "#fff",
            color: INK,
            fontSize: "0.8rem",
            fontWeight: 600,
            cursor: pending ? "wait" : "pointer",
          }}
        >
          {pending ? "Ukládám…" : "Uložit popisek"}
        </button>
        {state.ok ? <span style={{ color: "#15803d", fontSize: "0.8rem" }}>Uloženo ✅</span> : null}
        {state.error ? <span style={{ color: "#b91c1c", fontSize: "0.8rem" }}>{state.error}</span> : null}
      </div>
    </form>
  );
}
