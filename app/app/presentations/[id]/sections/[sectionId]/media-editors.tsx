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
  onUploaded: (path: string) => void;
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

    setLocalPreview(URL.createObjectURL(file));
    onUploaded(path);
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
//  PŮDORYSY — patra (obrázek plánu) + místnosti (název, plocha, popis, fotka)
// =====================================================================
type Room = { name: string; area: string; description: string; image_path: string };
type Floor = { label: string; image_path: string; rooms: Room[] };

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

  const setFloor = (fi: number, key: "label" | "image_path", val: string) =>
    setFloors((p) => p.map((f, i) => (i === fi ? { ...f, [key]: val } : f)));
  const addFloor = () =>
    setFloors((p) => [...p, { label: "", image_path: "", rooms: [] }]);
  const removeFloor = (fi: number) => setFloors((p) => p.filter((_, i) => i !== fi));
  const moveFloor = (fi: number, d: -1 | 1) =>
    setFloors((p) => {
      const n = [...p];
      const t = fi + d;
      if (t < 0 || t >= n.length) return p;
      [n[fi], n[t]] = [n[t], n[fi]];
      return n;
    });

  const setRoom = (fi: number, ri: number, key: keyof Room, val: string) =>
    setFloors((p) =>
      p.map((f, i) =>
        i === fi ? { ...f, rooms: f.rooms.map((r, j) => (j === ri ? { ...r, [key]: val } : r)) } : f,
      ),
    );
  const addRoom = (fi: number) =>
    setFloors((p) =>
      p.map((f, i) =>
        i === fi ? { ...f, rooms: [...f.rooms, { name: "", area: "", description: "", image_path: "" }] } : f,
      ),
    );
  const removeRoom = (fi: number, ri: number) =>
    setFloors((p) =>
      p.map((f, i) => (i === fi ? { ...f, rooms: f.rooms.filter((_, j) => j !== ri) } : f)),
    );

  return (
    <>
      <input type="hidden" name="floors_json" value={JSON.stringify(floors)} />
      <label style={label}>
        Nadpis sekce
        <input style={input} type="text" name="heading" maxLength={200} placeholder="např. Půdorysy" defaultValue={heading} />
      </label>
      <p style={hint}>
        Přidej patro, nahraj obrázek jeho půdorysu a vyjmenuj místnosti. U místnosti můžeš přidat
        fotku a popis — na veřejné stránce se ukážou po kliknutí.
      </p>

      {floors.length === 0 ? (
        <p style={hint}>Zatím žádné patro. Přidej první tlačítkem níže.</p>
      ) : (
        floors.map((f, fi) => (
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
            <MediaUploader
              presentationId={presentationId}
              userId={userId}
              currentUrl={f.image_path ? mediaUrls[f.image_path] : undefined}
              onUploaded={(path) => setFloor(fi, "image_path", path)}
            />

            <div style={{ borderTop: "1px dashed #334155", paddingTop: "0.6rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Místnosti</span>
              {f.rooms.map((r, ri) => (
                <div key={ri} style={{ border: "1px solid #1e293b", borderRadius: "8px", padding: "0.6rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input style={{ ...input, flex: 2 }} type="text" value={r.name} maxLength={80} placeholder="Název (např. Kuchyně)" onChange={(e) => setRoom(fi, ri, "name", e.target.value)} />
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
                </div>
              ))}
              <div>
                <button type="button" style={smallBtn} onClick={() => addRoom(fi)}>+ Přidat místnost</button>
              </div>
            </div>
          </div>
        ))
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
