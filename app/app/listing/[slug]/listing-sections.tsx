"use client";

// Interaktivní / klientské části veřejných sekcí:
//  - MapTabs: analytické mapy v tabech (přepínání skupin/map) — kolo 3
//  - FloorplansView: patra v tabech, klik na místnost otevře fotku + popis — kolo 2
//  - InvestmentCalcView: investiční kalkulačka, výpočet běží v prohlížeči — kolo 4

import { useState } from "react";
import { computeInvestment } from "@/lib/presentations/sections";

const INK = "#1c1917";
const MUTED = "#646463";
const BORDER = "#e7e5e4";
const PAPER_ALT = "#faf9f7";

// ---- taby (sdílené) -------------------------------------------------
function Tabs({
  labels,
  active,
  onSelect,
}: {
  labels: string[];
  active: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1.1rem" }}>
      {labels.map((l, i) => {
        const on = i === active;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            style={{
              padding: "0.45rem 1rem",
              borderRadius: "999px",
              border: on ? `1px solid ${INK}` : `1px solid ${BORDER}`,
              background: on ? INK : "#fff",
              color: on ? "#fff" : INK,
              fontWeight: on ? 700 : 500,
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            {l || `Položka ${i + 1}`}
          </button>
        );
      })}
    </div>
  );
}

// ---- analytické mapy ------------------------------------------------
export type MapView = { title: string; caption?: string; group?: string; why?: string; url?: string };

export function MapTabs({ maps }: { maps: MapView[] }) {
  const [active, setActive] = useState(0);
  const shown = maps[active] ?? maps[0];
  if (!shown) return null;

  return (
    <div>
      <Tabs labels={maps.map((m) => m.group || m.title || "Mapa")} active={active} onSelect={setActive} />
      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr", alignItems: "start" }}>
        {shown.url ? (
          <div style={{ borderRadius: "12px", overflow: "hidden", border: `1px solid ${BORDER}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- podepsané URL jsou dočasné */}
            <img src={shown.url} alt={shown.title} style={{ width: "100%", display: "block" }} />
          </div>
        ) : null}
        <div>
          {shown.title ? <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: INK }}>{shown.title}</h3> : null}
          {shown.caption ? <p style={{ color: MUTED, marginTop: "0.3rem" }}>{shown.caption}</p> : null}
          {shown.why ? (
            <div style={{ marginTop: "0.75rem", background: PAPER_ALT, border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "0.9rem 1rem" }}>
              <strong style={{ color: INK, fontSize: "0.9rem" }}>Proč je to důležité?</strong>
              <p style={{ color: MUTED, marginTop: "0.3rem", lineHeight: 1.6 }}>{shown.why}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ---- půdorysy -------------------------------------------------------
export type RoomView = { name: string; area?: string; description?: string; url?: string };
export type FloorView = { label: string; url?: string; rooms: RoomView[] };

export function FloorplansView({ floors }: { floors: FloorView[] }) {
  const [active, setActive] = useState(0);
  const [room, setRoom] = useState<RoomView | null>(null);
  const floor = floors[active] ?? floors[0];
  if (!floor) return null;

  return (
    <div>
      <Tabs labels={floors.map((f) => f.label)} active={active} onSelect={(i) => { setActive(i); setRoom(null); }} />

      <div style={{ display: "grid", gap: "1.2rem", gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))" }}>
        {floor.url ? (
          <div style={{ borderRadius: "12px", overflow: "hidden", border: `1px solid ${BORDER}`, background: PAPER_ALT }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- podepsané URL jsou dočasné */}
            <img src={floor.url} alt={`Půdorys — ${floor.label}`} style={{ width: "100%", display: "block" }} />
          </div>
        ) : null}

        {floor.rooms.length > 0 ? (
          <div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: INK, marginBottom: "0.6rem" }}>Místnosti</h3>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {floor.rooms.map((r, i) => {
                const clickable = Boolean(r.url || r.description);
                return (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => clickable && setRoom(r)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "0.75rem",
                        background: "#fff",
                        border: `1px solid ${BORDER}`,
                        borderRadius: "8px",
                        padding: "0.6rem 0.85rem",
                        cursor: clickable ? "pointer" : "default",
                      }}
                    >
                      <span style={{ fontWeight: 600, color: INK }}>{r.name}</span>
                      <span style={{ color: MUTED, fontSize: "0.85rem" }}>
                        {r.area}
                        {clickable ? "  ›" : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>

      {room ? (
        <div
          onClick={() => setRoom(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1.5rem" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: "14px", overflow: "hidden", maxWidth: "40rem", width: "100%", maxHeight: "88vh", display: "flex", flexDirection: "column" }}
          >
            {room.url ? (
              // eslint-disable-next-line @next/next/no-img-element -- podepsané URL jsou dočasné
              <img src={room.url} alt={room.name} style={{ width: "100%", maxHeight: "60vh", objectFit: "cover", display: "block" }} />
            ) : null}
            <div style={{ padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "1rem" }}>
                <h3 style={{ fontSize: "1.3rem", fontWeight: 700, color: INK }}>{room.name}</h3>
                {room.area ? <span style={{ color: MUTED }}>{room.area}</span> : null}
              </div>
              {room.description ? <p style={{ color: MUTED, marginTop: "0.6rem", lineHeight: 1.7 }}>{room.description}</p> : null}
              <button
                type="button"
                onClick={() => setRoom(null)}
                style={{ marginTop: "1rem", padding: "0.6rem 1.4rem", borderRadius: "999px", border: `1px solid ${INK}`, background: "#fff", color: INK, fontWeight: 600, cursor: "pointer" }}
              >
                Zavřít
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ---- investiční kalkulačka -----------------------------------------
// Čistě klientský výpočet: dostane vstupy, spočítá je v prohlížeči přes
// sdílenou čistou funkci `computeInvestment`. Nespočitatelné = pomlčka.
const czk = (v: number | null): string =>
  v === null
    ? "—"
    : new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 }).format(Math.round(v)) + " Kč";
const pct = (v: number | null): string =>
  v === null ? "—" : new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 1 }).format(v) + " %";

export function InvestmentCalcView({
  price,
  area,
  rent,
  costs,
}: {
  price: number | null;
  area: number | null;
  rent: number | null;
  costs: number | null;
}) {
  const r = computeInvestment({ price, area, rent, costs });
  const hasRent = typeof rent === "number" && rent > 0;
  const hasCosts = typeof costs === "number" && costs >= 0;

  const cards: { label: string; value: string; note?: string }[] = [
    { label: "Cena za m²", value: czk(r.pricePerM2) },
  ];
  if (hasRent) {
    cards.push({
      label: "Hrubý roční výnos",
      value: pct(r.grossYieldPct),
      note: r.annualRent !== null ? `roční nájem ${czk(r.annualRent)}` : undefined,
    });
  }
  if (hasRent && hasCosts) {
    cards.push({
      label: "Čistý roční výnos",
      value: pct(r.netYieldPct),
      note: "po odečtení ročních nákladů",
    });
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))",
        gap: "0.9rem",
      }}
    >
      {cards.map((c) => (
        <div
          key={c.label}
          style={{
            background: "#fff",
            border: `1px solid ${BORDER}`,
            borderRadius: "12px",
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.3rem",
          }}
        >
          <span style={{ color: MUTED, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {c.label}
          </span>
          <strong style={{ fontSize: "1.5rem", color: INK }}>{c.value}</strong>
          {c.note ? <span style={{ color: MUTED, fontSize: "0.8rem" }}>{c.note}</span> : null}
        </div>
      ))}
    </div>
  );
}
