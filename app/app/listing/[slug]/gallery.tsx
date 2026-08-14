"use client";

// Galerie s lightboxem: mřížka náhledů, klik otevře fotku přes celou obrazovku
// se šipkami a popiskem. Zavře se klávesou Esc, kliknutím na pozadí nebo ×.
//
// Fotky se seskupují podle kategorie (exteriér/interiér/zahrada/okolí) — nadpis
// kategorie + mřížka. Fotky bez kategorie spadnou do „Ostatní". Když ale nikdo
// kategorii nenastavil, vyjde jediná skupina a nadpis se vynechá (jako dřív).
// Lightbox prochází VŠECHNY fotky napříč skupinami (index do plochého seznamu).

import { useCallback, useEffect, useState } from "react";
import { groupByGalleryCategory } from "@/lib/presentations/sections";

export type GalleryImage = { id: string; url?: string; caption?: string; category?: string | null };

const MUTED = "#646463";
const BORDER = "#e7e5e4";
const PAPER_ALT = "#faf9f7";
const INK = "#2b2b28";
const DISPLAY = "'Playfair Display', Georgia, serif";

export function Gallery({ images }: { images: GalleryImage[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const groups = groupByGalleryCategory(images.filter((im) => im.url));
  // Ploché pořadí (v pořadí skupin) je zdroj pravdy pro lightbox; index každé
  // fotky bereme z něj (žádná mutace během renderu).
  const flat = groups.flatMap((g) => g.items);
  const indexById = new Map(flat.map((im, i) => [im.id, i]));
  const total = flat.length;
  // Nadpisy kategorií ukážeme jen tehdy, když aspoň jedna fotka kategorii má.
  const showHeadings = groups.length > 1 || (groups.length === 1 && groups[0].key !== "");

  const close = useCallback(() => setOpen(null), []);
  const prev = useCallback(
    () => setOpen((i) => (i === null ? null : (i - 1 + total) % total)),
    [total],
  );
  const next = useCallback(
    () => setOpen((i) => (i === null ? null : (i + 1) % total)),
    [total],
  );

  useEffect(() => {
    if (open === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, prev, next]);

  if (total === 0) return null;

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
        {groups.map((group) => (
          <div key={group.key}>
            {showHeadings ? (
              <h3
                style={{
                  fontFamily: DISPLAY,
                  fontSize: "1.15rem",
                  fontWeight: 600,
                  color: INK,
                  margin: "0 0 0.75rem",
                }}
              >
                {group.label}
              </h3>
            ) : null}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(240px, 100%), 1fr))",
                gap: "0.9rem",
              }}
            >
              {group.items.map((image) => {
                const i = indexById.get(image.id) ?? 0;
                return (
                  <figure key={image.id} style={{ margin: 0 }}>
                    <button
                      type="button"
                      onClick={() => setOpen(i)}
                      style={{
                        display: "block",
                        width: "100%",
                        aspectRatio: "4 / 3",
                        background: PAPER_ALT,
                        borderRadius: "8px",
                        overflow: "hidden",
                        border: `1px solid ${BORDER}`,
                        cursor: "zoom-in",
                        padding: 0,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- podepsané URL jsou dočasné */}
                      <img
                        src={image.url}
                        alt={image.caption || `Fotka ${i + 1}`}
                        loading="lazy"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    </button>
                    {image.caption ? (
                      <figcaption style={{ fontSize: "0.82rem", color: MUTED, marginTop: "0.35rem" }}>
                        {image.caption}
                      </figcaption>
                    ) : null}
                  </figure>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {open !== null && flat[open] ? (
        <div
          onClick={close}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.9)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1.5rem",
          }}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Zavřít"
            style={{ position: "absolute", top: "1rem", right: "1.25rem", background: "transparent", border: "none", color: "#fff", fontSize: "2rem", cursor: "pointer" }}
          >
            ×
          </button>
          {total > 1 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              aria-label="Předchozí"
              style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", fontSize: "1.6rem", cursor: "pointer", borderRadius: "999px", width: "2.75rem", height: "2.75rem" }}
            >
              ‹
            </button>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element -- podepsané URL jsou dočasné */}
          <img
            src={flat[open].url}
            alt={flat[open].caption || "Fotka"}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain", borderRadius: "6px" }}
          />
          {flat[open].caption ? (
            <p style={{ color: "#fff", marginTop: "1rem", textAlign: "center", maxWidth: "40rem" }}>
              {flat[open].caption}
            </p>
          ) : null}
          {total > 1 ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                aria-label="Další"
                style={{ position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", fontSize: "1.6rem", cursor: "pointer", borderRadius: "999px", width: "2.75rem", height: "2.75rem" }}
              >
                ›
              </button>
              <p style={{ color: "rgba(255,255,255,0.7)", marginTop: "0.5rem", fontSize: "0.85rem" }}>
                {open + 1} / {total}
              </p>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
