"use client";

// Editory sekcí, které pracují s obrázky (analytické mapy, panorama, půdorysy).
// Obrázek jde z prohlížeče PŘÍMO do bucketu `presentation-media`, cesta se uloží
// do stavu a při odeslání formuláře odejde v skrytém JSON poli. Serverová akce
// saveSection cesty ověří (isValidMediaPath) — klient je jen pohodlí.

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  MEDIA_BUCKET,
  MAX_MEDIA_BYTES,
  ALLOWED_MEDIA_TYPES,
  MEDIA_LIMITS_HINT,
} from "@/lib/media";
import { sniffImageType } from "@/lib/photos";
import { input, label, hint, smallBtn } from "../../../ui";
import { CompassRose } from "../../../../listing/[slug]/compass";

// ---- sdílený nahrávač jednoho obrázku -------------------------------
export function MediaUploader({
  presentationId,
  userId,
  currentUrl,
  onUploaded,
}: {
  presentationId: string;
  userId: string;
  currentUrl?: string;
  // 2. argument = dočasný náhled z blobu; hodí se, když chce rodič obrázek
  // ukázat hned po nahrání (než přijde podepsané URL ze serveru). Nepovinné.
  onUploaded: (path: string, previewUrl?: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  // Náhled čerstvě nahraného souboru (blob). Když nic nenahrál v této relaci,
  // ukáže se currentUrl z propu — takže po přeřazení položek náhled sedí s daty.
  const [localPreview, setLocalPreview] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const preview = localPreview ?? currentUrl;

  async function handleChange() {
    const file = inputRef.current?.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);

    if (file.size > MAX_MEDIA_BYTES) {
      setError("Obrázek je moc velký (max 15 MB).");
      setBusy(false);
      return;
    }
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const mime = sniffImageType(head);
    if (!mime || !(mime in ALLOWED_MEDIA_TYPES)) {
      setError("Tohle není podporovaný obrázek (JPEG/PNG/WebP).");
      setBusy(false);
      return;
    }

    const path = `${userId}/${presentationId}/${crypto.randomUUID()}.${ALLOWED_MEDIA_TYPES[mime]}`;
    const supabase = createClient();
    const { error: upErr } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(path, file, { contentType: mime, upsert: false });
    setBusy(false);
    if (upErr) {
      if (/bucket not found/i.test(upErr.message)) {
        setError("Chybí bucket presentation-media — spusť app/supabase/APLIKUJ_VSE.sql.");
      } else if (/row-level security|new row violates/i.test(upErr.message)) {
        setError("Úložiště odmítlo soubor — chybí policy. Spusť app/supabase/APLIKUJ_VSE.sql.");
      } else {
        setError(`Nahrání se nepovedlo (${upErr.message}).`);
      }
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setLocalPreview(objectUrl);
    onUploaded(path, objectUrl);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
      {preview ? (
        <div style={{ width: "100%", maxWidth: "260px", aspectRatio: "4 / 3", background: "#0f172a", borderRadius: "8px", overflow: "hidden", border: "1px solid #1e293b" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- náhled je dočasný (blob / podepsané URL) */}
          <img src={preview} alt="Náhled" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={busy}
        onChange={handleChange}
        style={{ color: "var(--muted)", fontSize: "0.85rem" }}
      />
      <span style={hint}>{busy ? "Nahrávám…" : MEDIA_LIMITS_HINT}</span>
      {error ? (
        <p style={{ color: "#fca5a5", fontSize: "0.85rem", margin: 0 }}>{error}</p>
      ) : null}
    </div>
  );
}

// =====================================================================
//  ANALYTICKÉ MAPY — obrázky map v tabech s odůvodněním
// =====================================================================
type MapItem = { title: string; caption: string; group: string; why: string; image_path: string };

export function AnalyticMapsFields({
  presentationId,
  userId,
  heading,
  initialItems,
  mediaUrls,
}: {
  presentationId: string;
  userId: string;
  heading: string;
  initialItems: MapItem[];
  mediaUrls: Record<string, string>;
}) {
  const [items, setItems] = useState<MapItem[]>(initialItems);

  const set = (i: number, key: keyof MapItem, val: string) =>
    setItems((p) => p.map((it, idx) => (idx === i ? { ...it, [key]: val } : it)));
  const add = () =>
    setItems((p) => [...p, { title: "", caption: "", group: "", why: "", image_path: "" }]);
  const remove = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i));
  const move = (i: number, d: -1 | 1) =>
    setItems((p) => {
      const n = [...p];
      const t = i + d;
      if (t < 0 || t >= n.length) return p;
      [n[i], n[t]] = [n[t], n[i]];
      return n;
    });

  return (
    <>
      <input type="hidden" name="items_json" value={JSON.stringify(items)} />
      <label style={label}>
        Nadpis sekce
        <input style={input} type="text" name="heading" maxLength={200} placeholder="např. Analýza okolí" defaultValue={heading} />
      </label>
      <p style={hint}>
        Nahraj obrázek mapy (screenshot z analytické mapy hluku, oslunění, dopravy…), pojmenuj ho a
        napiš, proč je to důležité. Návštěvník mapy uvidí v tabech.
      </p>

      {items.length === 0 ? (
        <p style={hint}>Zatím žádná mapa. Přidej první tlačítkem níže.</p>
      ) : (
        items.map((it, i) => (
          <div key={i} style={cardStyle}>
            <div style={cardHeader}>
              <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Mapa {i + 1}</span>
              <div style={{ display: "flex", gap: "0.35rem" }}>
                <button type="button" style={smallBtn} onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
                <button type="button" style={smallBtn} onClick={() => move(i, 1)} disabled={i === items.length - 1}>↓</button>
                <button type="button" style={dangerBtn} onClick={() => remove(i)}>Odebrat</button>
              </div>
            </div>
            <MediaUploader
              presentationId={presentationId}
              userId={userId}
              currentUrl={it.image_path ? mediaUrls[it.image_path] : undefined}
              onUploaded={(path) => set(i, "image_path", path)}
            />
            <label style={label}>
              Název (štítek tabu)
              <input style={input} type="text" value={it.title} maxLength={120} placeholder="např. Hluk" onChange={(e) => set(i, "title", e.target.value)} />
            </label>
            <label style={label}>
              Skupina (nepovinné, pro seskupení tabů)
              <input style={input} type="text" value={it.group} maxLength={60} placeholder="např. Prostředí" onChange={(e) => set(i, "group", e.target.value)} />
            </label>
            <label style={label}>
              Popisek pod mapou
              <input style={input} type="text" value={it.caption} maxLength={300} placeholder="krátký popis mapy" onChange={(e) => set(i, "caption", e.target.value)} />
            </label>
            <label style={label}>
              Proč je to důležité?
              <textarea style={{ ...input, minHeight: "4rem", resize: "vertical", fontFamily: "inherit" }} value={it.why} maxLength={600} placeholder="Vysvětli, co z mapy plyne pro kupujícího." onChange={(e) => set(i, "why", e.target.value)} />
            </label>
          </div>
        ))
      )}
      <div>
        <button type="button" style={{ ...smallBtn, padding: "0.5rem 0.9rem" }} onClick={add}>+ Přidat mapu</button>
      </div>
    </>
  );
}

// =====================================================================
//  PANORAMA — jeden obrázek + poznámka (statické zobrazení)
// =====================================================================
export function PanoramaFields({
  presentationId,
  userId,
  heading,
  caption,
  imagePath,
  currentUrl,
}: {
  presentationId: string;
  userId: string;
  heading: string;
  caption: string;
  imagePath: string;
  currentUrl?: string;
}) {
  const [path, setPath] = useState(imagePath);
  return (
    <>
      <input type="hidden" name="image_path" value={path} />
      <label style={label}>
        Nadpis sekce
        <input style={input} type="text" name="heading" maxLength={200} placeholder="např. Virtuální prohlídka" defaultValue={heading} />
      </label>
      <p style={hint}>
        Nahraj panorama fotku (širokoúhlou / 360°). Zatím ji ukážeme jako velký obrázek —
        <strong> interaktivní otáčení připravujeme</strong>.
      </p>
      <MediaUploader
        presentationId={presentationId}
        userId={userId}
        currentUrl={path ? currentUrl : undefined}
        onUploaded={setPath}
      />
      <label style={label}>
        Popisek (nepovinné)
        <input style={input} type="text" name="caption" maxLength={300} placeholder="např. Pohled z obývacího pokoje" defaultValue={caption} />
      </label>
    </>
  );
}

// =====================================================================
//  PŮDORYSY — patra (plán + kompas) + klikací špendlíky místností
//  Workflow pro laika s naskenovaným/vyfoceným plánem:
//   (a) nahraj plán patra, (b) nastav sever (kompas), (c) klikáním do plánu
//   rozmísti místnosti-špendlíky s fotkou a popisem. Pozice se ukládá v % (0–100),
//   takže sedí při každé velikosti. Staré místnosti bez pozice zůstanou v seznamu.
// =====================================================================
type Room = {
  name: string;
  area: string;
  description: string;
  image_path: string;
  x: number | null; // pozice špendlíku v % (0–100), null = jen v seznamu
  y: number | null;
  // Varianta B (obrys): editor ji zatím nekreslí, jen ji nese beze změny,
  // aby se při uložení neztratila (přijde-li přímým zápisem / v příštím kole).
  polygon?: { x: number; y: number }[];
};
type Floor = { label: string; image_path: string; compass: number | null; rooms: Room[] };

// Interaktivní plán: klik do obrázku přidá/umístí špendlík, tažením se přemístí.
// Bez knihovny — pozice počítá z rozměrů obrázku a ukládá v procentech.
function PlanPinboard({
  imageUrl,
  rooms,
  placingRi,
  selectedRi,
  onPlanClick,
  onMovePin,
  onSelectPin,
}: {
  imageUrl: string;
  rooms: Room[];
  placingRi: number | null;
  selectedRi: number | null;
  onPlanClick: (x: number, y: number) => void;
  onMovePin: (ri: number, x: number, y: number) => void;
  onSelectPin: (ri: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const dragMoved = useRef(false);

  const pct = (clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
    return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
  };

  // Číslo špendlíku = pořadí umístěné místnosti (odpovídá číslu v seznamu).
  let n = 0;
  const pinNumber = rooms.map((r) => (r.x !== null && r.y !== null ? ++n : 0));

  return (
    <div
      ref={ref}
      onPointerDown={() => {
        dragMoved.current = false;
      }}
      onClick={(e) => {
        if (dragMoved.current) {
          dragMoved.current = false;
          return;
        }
        const pos = pct(e.clientX, e.clientY);
        if (pos) onPlanClick(pos.x, pos.y);
      }}
      onPointerMove={(e) => {
        if (drag === null) return;
        const pos = pct(e.clientX, e.clientY);
        if (pos) {
          dragMoved.current = true;
          onMovePin(drag, pos.x, pos.y);
        }
      }}
      onPointerUp={() => setDrag(null)}
      onPointerLeave={() => setDrag(null)}
      style={{
        position: "relative",
        width: "100%",
        maxWidth: "520px",
        borderRadius: "8px",
        overflow: "hidden",
        border: "1px solid #1e293b",
        cursor: placingRi !== null ? "crosshair" : "default",
        touchAction: "none",
        userSelect: "none",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- náhled je dočasný (podepsané URL / blob) */}
      <img src={imageUrl} alt="Plán patra" draggable={false} style={{ width: "100%", display: "block", pointerEvents: "none" }} />
      {rooms.map((r, ri) =>
        r.x !== null && r.y !== null ? (
          <button
            key={ri}
            type="button"
            title={r.name || `Místnost ${pinNumber[ri]}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelectPin(ri);
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              dragMoved.current = false;
              setDrag(ri);
            }}
            style={{
              position: "absolute",
              left: `${r.x}%`,
              top: `${r.y}%`,
              transform: "translate(-50%, -50%)",
              width: "26px",
              height: "26px",
              borderRadius: "999px",
              border: selectedRi === ri ? "2px solid #fef08a" : "2px solid rgba(255,255,255,0.85)",
              background: "#d64545",
              color: "#fff",
              fontSize: "0.8rem",
              fontWeight: 700,
              cursor: drag === ri ? "grabbing" : "grab",
              boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              touchAction: "none",
            }}
          >
            {pinNumber[ri]}
          </button>
        ) : null,
      )}
    </div>
  );
}

export function FloorplansFields({
  presentationId,
  userId,
  heading,
  initialFloors,
  mediaUrls,
}: {
  presentationId: string;
  userId: string;
  heading: string;
  initialFloors: Floor[];
  mediaUrls: Record<string, string>;
}) {
  const [floors, setFloors] = useState<Floor[]>(initialFloors);
  const [placing, setPlacing] = useState<{ fi: number; ri: number } | null>(null);
  const [selected, setSelected] = useState<{ fi: number; ri: number } | null>(null);
  // Dočasné náhledy plánů z blobu (klíč = storage cesta), aby šlo klikat špendlíky
  // hned po nahrání, než přijde podepsané URL ze serveru. Neukládá se do DB.
  const [previews, setPreviews] = useState<Record<string, string>>({});

  const setFloor = (fi: number, key: "label" | "image_path", val: string) =>
    setFloors((p) => p.map((f, i) => (i === fi ? { ...f, [key]: val } : f)));
  const setFloorCompass = (fi: number, val: number | null) =>
    setFloors((p) =>
      p.map((f, i) =>
        i === fi
          ? { ...f, compass: val === null || !Number.isFinite(val) ? null : Math.min(360, Math.max(0, Math.round(val))) }
          : f,
      ),
    );
  const addFloor = () =>
    setFloors((p) => [...p, { label: "", image_path: "", compass: null, rooms: [] }]);
  const removeFloor = (fi: number) => {
    setPlacing(null);
    setSelected(null);
    setFloors((p) => p.filter((_, i) => i !== fi));
  };
  const moveFloor = (fi: number, d: -1 | 1) => {
    setPlacing(null);
    setSelected(null);
    setFloors((p) => {
      const n = [...p];
      const t = fi + d;
      if (t < 0 || t >= n.length) return p;
      [n[fi], n[t]] = [n[t], n[fi]];
      return n;
    });
  };

  const setRoom = (fi: number, ri: number, key: "name" | "area" | "description" | "image_path", val: string) =>
    setFloors((p) =>
      p.map((f, i) =>
        i === fi ? { ...f, rooms: f.rooms.map((r, j) => (j === ri ? { ...r, [key]: val } : r)) } : f,
      ),
    );
  const addRoom = (fi: number) =>
    setFloors((p) =>
      p.map((f, i) =>
        i === fi
          ? { ...f, rooms: [...f.rooms, { name: "", area: "", description: "", image_path: "", x: null, y: null }] }
          : f,
      ),
    );
  const removeRoom = (fi: number, ri: number) => {
    setPlacing(null);
    setSelected(null);
    setFloors((p) => p.map((f, i) => (i === fi ? { ...f, rooms: f.rooms.filter((_, j) => j !== ri) } : f)));
  };
  const setPin = (fi: number, ri: number, x: number | null, y: number | null) =>
    setFloors((p) =>
      p.map((f, i) =>
        i === fi ? { ...f, rooms: f.rooms.map((r, j) => (j === ri ? { ...r, x, y } : r)) } : f,
      ),
    );

  // Klik do plánu: buď umístí právě „umísťovanou" místnost, nebo přidá novou.
  const planClick = (fi: number, x: number, y: number) => {
    if (placing && placing.fi === fi) {
      setPin(fi, placing.ri, x, y);
      setSelected({ fi, ri: placing.ri });
      setPlacing(null);
      return;
    }
    const newRi = floors[fi]?.rooms.length ?? 0;
    setFloors((p) =>
      p.map((f, i) =>
        i === fi
          ? { ...f, rooms: [...f.rooms, { name: "", area: "", description: "", image_path: "", x, y }] }
          : f,
      ),
    );
    setSelected({ fi, ri: newRi });
  };

  return (
    <>
      <input type="hidden" name="floors_json" value={JSON.stringify(floors)} />
      <label style={label}>
        Nadpis sekce
        <input style={input} type="text" name="heading" maxLength={200} placeholder="např. Půdorysy" defaultValue={heading} />
      </label>
      <p style={hint}>
        Máš jen naskenovaný nebo vyfocený plán? Stačí: 1) nahraj obrázek plánu (klidně z mobilu),
        2) nastav sever (kompas), 3) klikni do plánu a přidej místnost — dostane špendlík, fotku a popis.
        Návštěvník pak na špendlík klikne a uvidí fotku i popis.
      </p>

      {floors.length === 0 ? (
        <p style={hint}>Zatím žádné patro. Přidej první tlačítkem níže.</p>
      ) : (
        floors.map((f, fi) => {
          const compassOn = f.compass !== null;
          const planUrl = f.image_path ? (mediaUrls[f.image_path] ?? previews[f.image_path]) : undefined;
          let pn = 0;
          const pinNo = f.rooms.map((r) => (r.x !== null && r.y !== null ? ++pn : 0));
          return (
            <div key={fi} style={{ ...cardStyle, gap: "0.75rem" }}>
              <div style={cardHeader}>
                <strong style={{ fontSize: "0.9rem" }}>Patro {fi + 1}</strong>
                <div style={{ display: "flex", gap: "0.35rem" }}>
                  <button type="button" style={smallBtn} onClick={() => moveFloor(fi, -1)} disabled={fi === 0}>↑</button>
                  <button type="button" style={smallBtn} onClick={() => moveFloor(fi, 1)} disabled={fi === floors.length - 1}>↓</button>
                  <button type="button" style={dangerBtn} onClick={() => removeFloor(fi)}>Odebrat patro</button>
                </div>
              </div>
              <label style={label}>
                Název patra
                <input style={input} type="text" value={f.label} maxLength={80} placeholder="např. Přízemí" onChange={(e) => setFloor(fi, "label", e.target.value)} />
              </label>

              <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Obrázek plánu patra</span>
              <MediaUploader
                presentationId={presentationId}
                userId={userId}
                currentUrl={planUrl}
                onUploaded={(path, preview) => {
                  setFloor(fi, "image_path", path);
                  if (preview) setPreviews((p) => ({ ...p, [path]: preview }));
                }}
              />

              {/* Kompas patra */}
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                <label style={{ ...label, flexDirection: "row", alignItems: "center", gap: "0.5rem", margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={compassOn}
                    onChange={(e) => setFloorCompass(fi, e.target.checked ? (f.compass ?? 0) : null)}
                  />
                  Nastavit sever (kompas)
                </label>
                {compassOn ? (
                  <>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      step={1}
                      value={f.compass ?? 0}
                      onChange={(e) => setFloorCompass(fi, Number(e.target.value))}
                      style={{ flex: 1, minWidth: "120px" }}
                      aria-label="Natočení severu ve stupních"
                    />
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <input
                        style={{ ...input, width: "5rem" }}
                        type="number"
                        min={0}
                        max={360}
                        value={f.compass ?? 0}
                        onChange={(e) => setFloorCompass(fi, e.target.value === "" ? 0 : Number(e.target.value))}
                      />
                      <span style={hint}>° od svislice</span>
                    </div>
                    <CompassRose deg={f.compass ?? 0} size={56} />
                  </>
                ) : null}
              </div>

              {/* Plán se špendlíky */}
              {planUrl ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <p style={hint}>
                    {placing && placing.fi === fi
                      ? "Klikni do plánu, kam místnost umístit."
                      : "Klikni do plánu a přidej místnost. Špendlík pak přetáhni přesně tam, kam patří."}
                    {placing && placing.fi === fi ? (
                      <>
                        {"  "}
                        <button type="button" style={{ ...smallBtn, padding: "0.15rem 0.5rem" }} onClick={() => setPlacing(null)}>
                          Zrušit umísťování
                        </button>
                      </>
                    ) : null}
                  </p>
                  <PlanPinboard
                    imageUrl={planUrl}
                    rooms={f.rooms}
                    placingRi={placing && placing.fi === fi ? placing.ri : null}
                    selectedRi={selected && selected.fi === fi ? selected.ri : null}
                    onPlanClick={(x, y) => planClick(fi, x, y)}
                    onMovePin={(ri, x, y) => setPin(fi, ri, x, y)}
                    onSelectPin={(ri) => setSelected({ fi, ri })}
                  />
                </div>
              ) : (
                <p style={hint}>Nahraj obrázek plánu výše — pak do něj klikáním rozmístíš místnosti.</p>
              )}

              {/* Seznam místností (i těch bez špendlíku — fallback/doplněk) */}
              <div style={{ borderTop: "1px dashed #334155", paddingTop: "0.6rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Místnosti</span>
                {f.rooms.length === 0 ? (
                  <p style={hint}>Zatím žádná místnost. Klikni do plánu, nebo přidej tlačítkem níže.</p>
                ) : null}
                {f.rooms.map((r, ri) => {
                  const placed = r.x !== null && r.y !== null;
                  const isSel = Boolean(selected && selected.fi === fi && selected.ri === ri);
                  return (
                    <div
                      key={ri}
                      style={{
                        border: isSel ? "1px solid #fde047" : "1px solid #1e293b",
                        borderRadius: "8px",
                        padding: "0.6rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.4rem",
                      }}
                    >
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            color: "#fff",
                            background: placed ? "#d64545" : "#475569",
                            borderRadius: "999px",
                            padding: "0.1rem 0.55rem",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {placed ? `📍 ${pinNo[ri]}` : "v seznamu"}
                        </span>
                        <input style={{ ...input, flex: 2 }} type="text" value={r.name} maxLength={80} placeholder="Název (např. Kuchyně)" onChange={(e) => setRoom(fi, ri, "name", e.target.value)} onFocus={() => setSelected({ fi, ri })} />
                        <input style={{ ...input, flex: 1 }} type="text" value={r.area} maxLength={40} placeholder="Plocha" onChange={(e) => setRoom(fi, ri, "area", e.target.value)} />
                        <button type="button" style={dangerBtn} onClick={() => removeRoom(fi, ri)}>×</button>
                      </div>
                      <input style={input} type="text" value={r.description} maxLength={400} placeholder="Popis (nepovinné)" onChange={(e) => setRoom(fi, ri, "description", e.target.value)} />
                      <MediaUploader
                        presentationId={presentationId}
                        userId={userId}
                        currentUrl={r.image_path ? mediaUrls[r.image_path] : undefined}
                        onUploaded={(path) => setRoom(fi, ri, "image_path", path)}
                      />
                      {planUrl ? (
                        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                          {placed ? (
                            <button type="button" style={smallBtn} onClick={() => setPin(fi, ri, null, null)}>Sundat z plánu</button>
                          ) : (
                            <button
                              type="button"
                              style={{ ...smallBtn, ...(placing && placing.fi === fi && placing.ri === ri ? { borderColor: "#fde047", color: "#fde047" } : {}) }}
                              onClick={() => setPlacing({ fi, ri })}
                            >
                              {placing && placing.fi === fi && placing.ri === ri ? "Klikni do plánu…" : "Umístit na plán"}
                            </button>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                <div>
                  <button type="button" style={smallBtn} onClick={() => addRoom(fi)}>+ Přidat místnost</button>
                </div>
              </div>
            </div>
          );
        })
      )}
      <div>
        <button type="button" style={{ ...smallBtn, padding: "0.5rem 0.9rem" }} onClick={addFloor}>+ Přidat patro</button>
      </div>
    </>
  );
}

// ---- sdílené styly --------------------------------------------------
const cardStyle: React.CSSProperties = {
  border: "1px solid #1e293b",
  borderRadius: "10px",
  padding: "0.85rem",
  display: "flex",
  flexDirection: "column",
  gap: "0.6rem",
};
const cardHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};
const dangerBtn: React.CSSProperties = {
  ...smallBtn,
  color: "#fca5a5",
  borderColor: "rgba(248,113,113,0.4)",
};
