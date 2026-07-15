// Pravidla pro fotky prezentace (E2.5). Sdílí je prohlížeč (rychlá kontrola
// před nahráním) i server (pojistka při zápisu do DB).
//
// Soubory bydlí v Supabase Storage v PRIVÁTNÍM bucketu `presentation-photos`,
// v DB (presentation_photos.storage_path) je jen cesta. Cesta má pevný tvar:
//   <user_id>/<presentation_id>/<náhodné-uuid>.<přípona>
// První složka = ID vlastníka — na tom stojí Storage policies (viz
// supabase/storage-setup.md). Nikdy do cesty nedávat názvy souborů od uživatele.

export const PHOTOS_BUCKET = "presentation-photos";

/** Max velikost jedné fotky. Stejný limit nastaví Karel i na bucketu. */
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8 MB

/** Max počet fotek na prezentaci (hero + galerie dohromady). */
export const MAX_PHOTOS_PER_PRESENTATION = 60;

/** Povolené typy obrázků: MIME → přípona souboru. */
export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Lidský popis limitů do UI. */
export const PHOTO_LIMITS_HINT =
  "JPEG, PNG nebo WebP, každá max 8 MB, celkem nejvýš 60 fotek.";

/**
 * Poznej typ obrázku podle prvních bajtů souboru (magic bytes).
 * Vrací MIME typ, nebo null když to není podporovaný obrázek.
 * Spolehlivější než věřit příponě nebo MIME hlavičce z prohlížeče.
 */
export function sniffImageType(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
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
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x45 && // E
    bytes[10] === 0x42 && // B
    bytes[11] === 0x50 // P
  ) {
    return "image/webp";
  }
  return null;
}

/**
 * Je cesta k souboru ve správném tvaru a patří danému uživateli a prezentaci?
 * Server tím hlídá, že si nikdo nezaregistruje cizí soubor do své prezentace.
 */
export function isValidPhotoPath(
  path: string,
  userId: string,
  presentationId: string,
): boolean {
  const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
  const re = new RegExp(`^${userId}/${presentationId}/${uuid}\\.(jpg|png|webp)$`, "i");
  return re.test(path);
}
