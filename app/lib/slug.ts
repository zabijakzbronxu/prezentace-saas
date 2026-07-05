// Pomůcky pro tvorbu "slugu" — kousku textu do veřejné URL (např. /p/byt-praha-a1b2c3).

/** Převede text na slug: bez diakritiky, malá písmena, pomlčky místo mezer. */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // odstraní diakritiku (á → a)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // vše ostatní na pomlčky
    .replace(/^-+|-+$/g, "") // ořízne pomlčky na krajích
    .slice(0, 60);
}

/** Náhodná přípona, aby byl slug unikátní i pro dvě stejné adresy. */
export function randomSuffix(length = 6): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}
