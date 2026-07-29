"use client";

// Hranice pozemku přes hero fotku — klientský overlay, který SEDÍ NA FOTKU.
//
// Proč klientsky: hero fotka se vykresluje s `object-fit: cover`, takže se podle
// poměru stran zařízení ořízne a posune. Body obrysu jsou uložené v procentech
// CELÉ fotky (tak se kreslí v editoru) — aby obrys ležel na stejném místě fotky
// i po ořezu, musí se přepočítat stejnou matematikou jako cover: potřebujeme
// skutečné rozměry fotky (naturalWidth/Height) a aktuální rozměr kontejneru
// (ResizeObserver). Server tohle znát nemůže → malý klientský ostrov.
//
// Převod je čistá sdílená funkce `coverMapPercent` v sections.ts (krytá testy).
// Dokud neznáme rozměry fotky/kontejneru, nekreslí se nic (žádný záblesk špatně
// posazeného obrysu); při chybě načtení fotky se overlay prostě nevykreslí.

import { useEffect, useRef, useState } from "react";
import { coverMapPercent } from "@/lib/presentations/sections";

export type LandPolygonPoint = { x: number; y: number };

export function LandPolygonOverlay({
  imageUrl,
  points,
  stroke = "#f5b301",
  fill = "rgba(245,179,1,0.16)",
}: {
  /** Stejné (podepsané) URL jako hero <img> — prohlížeč ji už má v cache. */
  imageUrl: string;
  /** Body v % celé fotky (0–100), min. 3 (hlídá reader). */
  points: LandPolygonPoint[];
  stroke?: string;
  fill?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const [img, setImg] = useState<{ w: number; h: number } | null>(null);

  // Rozměr kontejneru (mění se s viewportem) — overlay se přepočítá při každé změně.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setBox({ w: r.width, h: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Skutečné rozměry fotky (naturalWidth/Height) — bez nich cover-přepočet nejde.
  useEffect(() => {
    let cancelled = false;
    const im = new Image();
    im.onload = () => {
      if (!cancelled && im.naturalWidth > 0 && im.naturalHeight > 0) {
        setImg({ w: im.naturalWidth, h: im.naturalHeight });
      }
    };
    im.src = imageUrl;
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  const mapped =
    box && img && points.length >= 3
      ? points
          .map((p) => coverMapPercent(img.w, img.h, box.w, box.h, p.x, p.y))
          .filter((p): p is { x: number; y: number } => p !== null)
      : [];

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      {mapped.length >= 3 ? (
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        >
          <polygon
            points={mapped.map((p) => `${p.x},${p.y}`).join(" ")}
            fill={fill}
            stroke={stroke}
            strokeWidth={2.5}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </div>
  );
}
