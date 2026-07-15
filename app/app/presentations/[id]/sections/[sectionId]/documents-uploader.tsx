"use client";

// Nahrávání dokumentu: soubor jde z prohlížeče PŘÍMO do Supabase Storage
// (bucket presentation-documents), pak se zapíše do DB serverovou akcí
// registerDocument (vlastní pojistky: tvar cesty, limit počtu, název).

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  DOCUMENTS_BUCKET,
  MAX_DOCUMENT_BYTES,
  MAX_DOCUMENTS_PER_PRESENTATION,
  ALLOWED_DOCUMENT_TYPES,
  DOCUMENT_LIMITS_HINT,
  sniffDocumentType,
} from "@/lib/documents";
import { input, label, hint, primaryBtn } from "../../../ui";
import { registerDocument } from "./actions";

export function DocumentsUploader({
  presentationId,
  userId,
  documentCount,
}: {
  presentationId: string;
  userId: string;
  documentCount: number;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remaining = Math.max(0, MAX_DOCUMENTS_PER_PRESENTATION - documentCount);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Nejdřív vyber soubor.");
      return;
    }
    if (remaining === 0) {
      setError(`Prezentace má plný počet dokumentů (${MAX_DOCUMENTS_PER_PRESENTATION}).`);
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    if (file.size > MAX_DOCUMENT_BYTES) {
      setError(`Soubor je moc velký (max 20 MB).`);
      setBusy(false);
      return;
    }

    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const mime = sniffDocumentType(head);
    if (!mime || !(mime in ALLOWED_DOCUMENT_TYPES)) {
      setError("Tohle není podporovaný soubor (PDF, JPEG, PNG nebo WebP).");
      setBusy(false);
      return;
    }

    const finalName = (name.trim() || file.name).slice(0, 200);
    const path = `${userId}/${presentationId}/${crypto.randomUUID()}.${ALLOWED_DOCUMENT_TYPES[mime]}`;
    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(path, file, { contentType: mime, upsert: false });

    if (uploadError) {
      const msg = uploadError.message;
      if (/bucket not found/i.test(msg)) {
        setError(
          "Úložiště dokumentů není zapnuté — chybí bucket presentation-documents. Spusť app/supabase/APLIKUJ_VSE.sql.",
        );
      } else if (/row-level security|new row violates/i.test(msg)) {
        setError(
          "Úložiště odmítlo soubor — chybí bezpečnostní pravidla Storage. Spusť app/supabase/APLIKUJ_VSE.sql.",
        );
      } else if (/mime type .* is not supported|exceeded the maximum allowed size/i.test(msg)) {
        setError("Bucket má špatně nastavené limity. Spusť app/supabase/APLIKUJ_VSE.sql, ten je srovná.");
      } else {
        setError(`Nahrání se nepovedlo (${msg}).`);
      }
      setBusy(false);
      return;
    }

    const result = await registerDocument(presentationId, path, {
      name: finalName,
      category: category.trim() || null,
      description: description.trim() || null,
      fileType: mime,
      fileSize: file.size,
    });

    setBusy(false);
    if (!result.ok) {
      setError(result.message ?? "Uložení dokumentu se nepovedlo.");
      return;
    }
    setMessage(`Dokument „${finalName}" nahrán. ✅`);
    setName("");
    setCategory("");
    setDescription("");
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  }

  if (remaining === 0) {
    return (
      <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
        Prezentace má plný počet dokumentů ({MAX_DOCUMENTS_PER_PRESENTATION}). Když chceš přidat
        další, nejdřív nějaký smaž.
      </p>
    );
  }

  return (
    <div
      style={{
        border: "1px dashed #334155",
        borderRadius: "12px",
        padding: "1.1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.7rem",
      }}
    >
      <label style={label}>
        Soubor
        <input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={busy} style={{ color: "var(--muted)" }} />
        <span style={hint}>{DOCUMENT_LIMITS_HINT}</span>
      </label>
      <label style={label}>
        Název (co uvidí zájemce)
        <input style={input} type="text" value={name} maxLength={200} placeholder="např. Průkaz energetické náročnosti" onChange={(e) => setName(e.target.value)} />
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <label style={label}>
          Kategorie (nepovinné)
          <input style={input} type="text" value={category} maxLength={40} placeholder="např. Průkazy" onChange={(e) => setCategory(e.target.value)} />
        </label>
        <label style={label}>
          Popis (nepovinné)
          <input style={input} type="text" value={description} maxLength={200} placeholder="krátký popis" onChange={(e) => setDescription(e.target.value)} />
        </label>
      </div>

      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <button
          type="button"
          onClick={handleUpload}
          disabled={busy}
          style={{ ...primaryBtn, padding: "0.6rem 1.2rem", fontSize: "0.95rem", opacity: busy ? 0.6 : 1, cursor: busy ? "wait" : "pointer" }}
        >
          {busy ? "Nahrávám…" : "Nahrát dokument"}
        </button>
        {message ? <span style={{ color: "#86efac", fontSize: "0.85rem" }}>{message}</span> : null}
      </div>

      {error ? (
        <p
          style={{
            color: "#fca5a5",
            background: "rgba(248,113,113,0.1)",
            border: "1px solid rgba(248,113,113,0.3)",
            borderRadius: "8px",
            padding: "0.6rem 0.8rem",
            fontSize: "0.9rem",
          }}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
