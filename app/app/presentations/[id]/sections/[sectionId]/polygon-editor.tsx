"use client";

// SDÍLENÝ NÁSTROJ „obtáhni polygon nad obrázkem" — bez cizí knihovny, čisté SVG.
// Používá ho editor půdorysů (obrys místnosti) i editor hera (hranice pozemku).
//
// Princip (stejný jako špendlíky/hotspoty jinde v appce): pozice vrcholů se drží
// v PROCENTECH (0–100) vůči obrázku, ne v pixelech — díky tomu obrys sedí stejně
// na mobilu i na velké obrazovce. Klik do obrázku přidá vrchol, vrchol jde
// přetáhnout (myš i prst), dvojklik / tlačítko „Hotovo" obrys uzavře.
//
// Controlled komponenta: rodič drží `points` a dostává `onChange(points)`. Sám
// si komponenta drží jen UI stav (co se zrovna táhne, jestli je obrys uzavřený).
// Do dat se ukládá JEN pole bodů — polygon je uzavřený implicitně, jakmile má 3+
// vrcholy (shodně s validátorem `readRoomPolygon`).

import { useRef, useState } from "react";
import { smallBtn } from "../../../ui";

export type PolygonPoint = { x: number; y: number };

export function ImagePolygonEditor({
  imageUrl,
  points,
  onChange,
  stroke = "#d64545",
  fill = "rgba(214,69,69,0.25)",
  maxPoints = 40,
}: {
  imageUrl: string;
  points: PolygonPoint[];
  onChange: (points: PolygonPoint[]) => void;
  /** Barva obrysu. */
  stroke?: string;
  /** Poloprůhledná výplň uzavřeného obrysu. */
  fill?: string;
  maxPoints?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Index právě taženého vrcholu (null = netáhne se nic).
  const [drag, setDrag] = useState<number | null>(null);
  // Rozlišení „klik" vs. „tažení": po pohybu se klik (přidání bodu) potlačí.
  const dragMoved = useRef(false);
  // Uzavřený obrys = klik do plochy už nepřidává body (jen se dají přetahovat
  // vrcholy). Na začátku uzavřený, když už nějaký obrys existuje (editace dat),
  // otevřený, když kreslíme od nuly. Je to čistě UI stav, do dat nejde.
  const [closed, setClosed] = useState<boolean>(() => points.length >= 3);

  // Přepočet pozice ukazatele na procenta obrázku (0–100), s ořezem do rozsahu.
  const pct = (clientX: number, clientY: number): PolygonPoint | null => {
    const el = ref.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
    return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
  };

  // Přidání vrcholu na konec (jen když kreslíme a není překročen strop).
  const addPoint = (p: PolygonPoint) => {
    if (closed || points.length >= maxPoints) return;
    onChange([...points, p]);
  };
  // Posun konkrétního vrcholu (tažení).
  const movePoint = (i: number, p: PolygonPoint) =>
    onChange(points.map((pt, idx) => (idx === i ? p : pt)));
  const removeLast = () => {
    if (points.length === 0) return;
    onChange(points.slice(0, -1));
    setClosed(false);
  };
  const clearAll = () => {
    onChange([]);
    setClosed(false);
  };

  // Řetězec bodů pro SVG (viewBox 0..100 → hodnota v % = souřadnice přímo).
  const ptsStr = points.map((p) => `${p.x},${p.y}`).join(" ");
  const canClose = points.length >= 3;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <div
        ref={ref}
        onPointerDown={() => {
          dragMoved.current = false;
        }}
        onClick={(e) => {
          // Klik hned po tažení nepovažuj za přidání bodu.
          if (dragMoved.current) {
            dragMoved.current = false;
            return;
          }
          const pos = pct(e.clientX, e.clientY);
          if (pos) addPoint(pos);
        }}
        onDoubleClick={() => {
          if (!canClose) return;
          // Dvojklik napřed vygeneroval dva běžné kliky (dva body téměř na stejném
          // místě) — koncový duplikát zahoď, ať v datech nezůstávají zdvojené vrcholy.
          // Jen když i po zahození zbydou 3+ body (jinak by se obrys rozpadl).
          const n = points.length;
          if (n >= 4) {
            const a = points[n - 1];
            const b = points[n - 2];
            if (Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1) {
              onChange(points.slice(0, -1));
            }
          }
          setClosed(true);
        }}
        onPointerMove={(e) => {
          if (drag === null) return;
          const pos = pct(e.clientX, e.clientY);
          if (pos) {
            dragMoved.current = true;
            movePoint(drag, pos);
          }
        }}
        onPointerUp={() => setDrag(null)}
        onPointerLeave={() => setDrag(null)}
        style={{
          position: "relative",
          width: "100%",
          borderRadius: "8px",
          overflow: "hidden",
          border: "1px solid #1e293b",
          cursor: closed ? "default" : "crosshair",
          touchAction: "none",
          userSelect: "none",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- náhled je dočasný (podepsané URL / blob) */}
        <img src={imageUrl} alt="Podklad pro obrys" draggable={false} style={{ width: "100%", display: "block", pointerEvents: "none" }} />

        {/* SVG vrstva: rozpracované body jako čára, 3+ bodů jako uzavřená plocha.
            preserveAspectRatio="none" + viewBox 0..100 → % sedí bez ohledu na poměr
            stran; vectorEffect drží tloušťku čáry konstantní i při nerovnoměrném
            roztažení. Vrstva nechytá kliky (pointerEvents:none), aby klik do plochy
            přidával body — vrcholy jsou zvlášť jako tažitelná tlačítka níž. */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
        >
          {points.length >= 3 && closed ? (
            <polygon points={ptsStr} fill={fill} stroke={stroke} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          ) : points.length >= 2 ? (
            <polyline points={ptsStr} fill="none" stroke={stroke} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeDasharray="4 3" />
          ) : null}
        </svg>

        {/* Vrcholy jako tažitelná tlačítka (myš i prst). */}
        {points.map((p, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Vrchol ${i + 1}`}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => {
              e.stopPropagation();
              // Capture: tažení se neutrhne, ani když myš vyjede z plochy obrázku
              // (na dotyku je capture implicitní, tam je volání jen no-op navíc).
              e.currentTarget.setPointerCapture?.(e.pointerId);
              dragMoved.current = false;
              setDrag(i);
            }}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${p.y}%`,
              transform: "translate(-50%, -50%)",
              width: "16px",
              height: "16px",
              borderRadius: "999px",
              border: "2px solid #fff",
              background: stroke,
              cursor: drag === i ? "grabbing" : "grab",
              boxShadow: "0 1px 3px rgba(0,0,0,0.5)",
              padding: 0,
              touchAction: "none",
            }}
          />
        ))}
      </div>

      {/* Ovládání pod obrázkem */}
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
        {closed ? (
          <button type="button" style={smallBtn} onClick={() => setClosed(false)}>Upravit body</button>
        ) : (
          <button type="button" style={{ ...smallBtn, ...(canClose ? { borderColor: "#4ade80", color: "#4ade80" } : {}) }} onClick={() => canClose && setClosed(true)} disabled={!canClose}>
            Hotovo (uzavřít obrys)
          </button>
        )}
        <button type="button" style={smallBtn} onClick={removeLast} disabled={points.length === 0}>Zpět (smazat poslední bod)</button>
        <button type="button" style={{ ...smallBtn, color: "#fca5a5", borderColor: "rgba(248,113,113,0.4)" }} onClick={clearAll} disabled={points.length === 0}>Vymazat obrys</button>
        <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
          {closed
            ? "Obrys uzavřen. Vrcholy jde přetáhnout, nebo klikni „Upravit body“ a přidej další."
            : points.length === 0
              ? "Klikáním do obrázku obtáhni obrys (min. 3 body)."
              : `Bodů: ${points.length}. Klikni pro další vrchol, dvojklikem obrys uzavřeš.`}
        </span>
      </div>
    </div>
  );
}
