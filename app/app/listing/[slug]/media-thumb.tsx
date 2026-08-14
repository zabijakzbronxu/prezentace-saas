"use client";

// Náhled jednoho obrázku s lightboxem: malý náhled, klik zvětší přes celou
// obrazovku (jako galerie). Používá se u screenshotů odhadů a u fotek
// technického stavu. Zavře se klávesou Esc, kliknutím na pozadí nebo ×.

import { useEffect, useState } from "react";

const BORDER = "#e7e5e4";
const PAPER_ALT = "#faf9f7";

export function MediaThumb({
  url,
  alt,
  height = "150px",
}: {
  url: string;
  alt: string;
  height?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Zvětšit obrázek"
        style={{
          display: "block",
          width: "100%",
          height,
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
          src={url}
          alt={alt}
          loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </button>

      {open ? (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1.5rem",
          }}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Zavřít"
            style={{ position: "absolute", top: "1rem", right: "1.25rem", background: "transparent", border: "none", color: "#fff", fontSize: "2rem", cursor: "pointer" }}
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- podepsané URL jsou dočasné */}
          <img
            src={url}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "100%", maxHeight: "85vh", objectFit: "contain", borderRadius: "6px" }}
          />
        </div>
      ) : null}
    </>
  );
}
