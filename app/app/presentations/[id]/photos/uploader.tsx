"use client";

// Nahrávání fotek: soubor jde z prohlížeče PŘÍMO do Supabase Storage
// (přes server by nás hosting limitoval na ~4,5 MB na požadavek).
// Po úspěšném nahrání se fotka zapíše do DB serverovou akcí registerPhoto,
// která má vlastní pojistky (vlastnictví cesty, limit počtu).

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  PHOTOS_BUCKET,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS_PER_PRESENTATION,
  ALLOWED_IMAGE_TYPES,
  PHOTO_LIMITS_HINT,
  sniffImageType,
} from "@/lib/photos";
import { registerPhoto } from "./actions";

export function PhotoUploader({
  presentationId,
  userId,
  photoCount,
}: {
  presentationId: string;
  userId: string;
  photoCount: number;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const remaining = Math.max(0, MAX_PHOTOS_PER_PRESENTATION - photoCount);

  async function handleUpload() {
    const files = Array.from(inputRef.current?.files ?? []);
    if (files.length === 0) {
      setErrors(["Nejdřív vyber fotky tlačítkem pro výběr souborů."]);
      return;
    }

    setBusy(true);
    setErrors([]);
    const problems: string[] = [];
    let uploaded = 0;

    if (files.length > remaining) {
      problems.push(
        `Vejde se už jen ${remaining} ${remaining === 1 ? "fotka" : remaining < 5 ? "fotky" : "fotek"} (limit je ${MAX_PHOTOS_PER_PRESENTATION}). Nahraju první ${remaining}.`,
      );
    }

    const supabase = createClient();

    for (const file of files.slice(0, remaining)) {
      setProgress(`Nahrávám ${uploaded + 1}. z ${Math.min(files.length, remaining)}…`);

      if (file.size > MAX_PHOTO_BYTES) {
        problems.push(`„${file.name}": je moc velká (max 8 MB).`);
        continue;
      }

      // Typ poznáváme podle obsahu souboru, ne podle přípony.
      const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
      const mime = sniffImageType(head);
      if (!mime || !(mime in ALLOWED_IMAGE_TYPES)) {
        problems.push(`„${file.name}": tohle není podporovaný obrázek (JPEG/PNG/WebP).`);
        continue;
      }

      const path = `${userId}/${presentationId}/${crypto.randomUUID()}.${ALLOWED_IMAGE_TYPES[mime]}`;
      const { error: uploadError } = await supabase.storage
        .from(PHOTOS_BUCKET)
        .upload(path, file, { contentType: mime, upsert: false });

      if (uploadError) {
        const notFound = /bucket not found/i.test(uploadError.message);
        problems.push(
          notFound
            ? "Úložiště fotek ještě není zapnuté (chybí bucket v Supabase — krok pro Karla)."
            : `„${file.name}": nahrání se nepovedlo (${uploadError.message}).`,
        );
        if (notFound) break; // bez bucketu nemá smysl zkoušet další
        continue;
      }

      const result = await registerPhoto(presentationId, path);
      if (!result.ok) {
        problems.push(`„${file.name}": ${result.message ?? "uložení se nepovedlo."}`);
        continue;
      }
      uploaded += 1;
    }

    setBusy(false);
    setProgress(uploaded > 0 ? `Nahráno ${uploaded} fotek. ✅` : null);
    setErrors(problems);
    if (inputRef.current) inputRef.current.value = "";
    if (uploaded > 0) router.refresh();
  }

  if (remaining === 0) {
    return (
      <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
        Prezentace má plný počet fotek ({MAX_PHOTOS_PER_PRESENTATION}). Když chceš přidat
        další, nejdřív nějakou smaž.
      </p>
    );
  }

  return (
    <div
      style={{
        border: "1px dashed #334155",
        borderRadius: "12px",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
      }}
    >
      <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.95rem" }}>
        Přidat fotky
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          style={{ color: "var(--muted)" }}
        />
        <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{PHOTO_LIMITS_HINT}</span>
      </label>

      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <button
          type="button"
          onClick={handleUpload}
          disabled={busy}
          style={{
            padding: "0.6rem 1.2rem",
            borderRadius: "8px",
            border: "none",
            background: busy ? "#334155" : "var(--accent)",
            color: busy ? "var(--muted)" : "#04263a",
            fontWeight: 700,
            fontSize: "0.95rem",
            cursor: busy ? "wait" : "pointer",
          }}
        >
          {busy ? "Nahrávám…" : "Nahrát vybrané fotky"}
        </button>
        {progress ? (
          <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>{progress}</span>
        ) : null}
      </div>

      {errors.length > 0 ? (
        <ul
          style={{
            listStyle: "none",
            color: "#fca5a5",
            background: "rgba(248,113,113,0.1)",
            border: "1px solid rgba(248,113,113,0.3)",
            borderRadius: "8px",
            padding: "0.7rem 0.9rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.3rem",
            fontSize: "0.9rem",
          }}
        >
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
