// Pravidla pro obrázky sekcí, které nejsou v galerii ani dokumenty:
// půdorysy pater, analytické mapy, panorama fotky, fotky místností.
// Všechny bydlí v jednom PRIVÁTNÍM bucketu `presentation-media`.
//
// Cesta má stejný tvar jako u fotek/dokumentů:
//   <user_id>/<presentation_id>/<náhodné-uuid>.<přípona>
// První složka = ID vlastníka → na tom stojí Storage policies.
// Typ obrázku poznáváme přes sniffImageType z lib/photos.ts (stejné povolené
// typy: JPEG/PNG/WebP), ať se pravidlo drží na jednom místě.

export const MEDIA_BUCKET = "presentation-media";

/** Max velikost jednoho obrázku (panorama bývá velké). Stejný limit i na bucketu. */
export const MAX_MEDIA_BYTES = 15 * 1024 * 1024; // 15 MB

/**
 * Tvrdý strop registrovaných obrázků médií na prezentaci. Vynucuje ho DB
 * (RPC `sync_presentation_media`), ne jen UI — brání zaplavení. Praktický počet
 * drží slicy v editoru (20 map, 20 pater × 40 místností, 1 panorama); tohle je
 * bezpečnostní pojistka nad reálnou potřebou.
 */
export const MAX_MEDIA_PER_PRESENTATION = 1000;

/** Povolené typy: MIME → přípona (shodné s galerií). */
export const ALLOWED_MEDIA_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const MEDIA_LIMITS_HINT = "JPEG, PNG nebo WebP, max 15 MB.";

/**
 * Je cesta k souboru ve správném tvaru a patří danému uživateli a prezentaci?
 * Server tím hlídá, že si nikdo nezaregistruje cizí soubor.
 */
export function isValidMediaPath(
  path: string,
  userId: string,
  presentationId: string,
): boolean {
  const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
  const re = new RegExp(`^${userId}/${presentationId}/${uuid}\\.(jpg|png|webp)$`, "i");
  return re.test(path);
}
