// Pravidla pro dokumenty ke stažení (sekce „documents"). Sdílí je prohlížeč
// (rychlá kontrola před nahráním) i server (pojistka při zápisu do DB).
//
// Soubory bydlí v Supabase Storage v PRIVÁTNÍM bucketu `presentation-documents`,
// v DB (presentation_documents.storage_path) je jen cesta. Stejný tvar jako fotky:
//   <user_id>/<presentation_id>/<náhodné-uuid>.<přípona>
// První složka = ID vlastníka — na tom stojí Storage policies.

export const DOCUMENTS_BUCKET = "presentation-documents";

/** Max velikost jednoho dokumentu. Stejný limit je i na bucketu (migrace). */
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024; // 20 MB

/** Max počet dokumentů na prezentaci. */
export const MAX_DOCUMENTS_PER_PRESENTATION = 30;

/** Povolené typy dokumentů: MIME → přípona souboru. */
export const ALLOWED_DOCUMENT_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Lidský popis limitů do UI. */
export const DOCUMENT_LIMITS_HINT =
  "PDF nebo obrázek (JPEG/PNG/WebP), každý max 20 MB, celkem nejvýš 30 souborů.";

/**
 * Poznej typ dokumentu podle prvních bajtů (magic bytes).
 * Vrací MIME typ, nebo null když to není podporovaný soubor.
 * Spolehlivější než věřit příponě nebo MIME hlavičce z prohlížeče.
 */
export function sniffDocumentType(bytes: Uint8Array): string | null {
  // PDF: „%PDF-"
  if (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  ) {
    return "application/pdf";
  }
  // JPEG
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  // WebP: „RIFF"…„WEBP"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

/**
 * Je cesta k souboru ve správném tvaru a patří danému uživateli a prezentaci?
 * Server tím hlídá, že si nikdo nezaregistruje cizí soubor.
 */
export function isValidDocumentPath(
  path: string,
  userId: string,
  presentationId: string,
): boolean {
  const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
  const re = new RegExp(`^${userId}/${presentationId}/${uuid}\\.(pdf|jpg|png|webp)$`, "i");
  return re.test(path);
}

/** Přátelská velikost souboru: 1536000 → „1,5 MB". */
export function formatFileSize(bytes: number | null): string | null {
  if (bytes === null || !Number.isFinite(bytes) || bytes < 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 }).format(kb)} kB`;
  const mb = kb / 1024;
  return `${new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 1 }).format(mb)} MB`;
}
