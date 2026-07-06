// Formátování hodnot pro zobrazení (česky).

/** Cena v Kč: 8900000 → „8 900 000 Kč". Null → záložní text. */
export function formatPrice(v: number | null, fallback = "cena neuvedena"): string {
  if (v === null) return fallback;
  return new Intl.NumberFormat("cs-CZ").format(v) + " Kč";
}

/** Plocha v m²: 82.5 → „82,5 m²". Null → null (sekce se nezobrazí). */
export function formatArea(v: number | null): string | null {
  if (v === null) return null;
  return new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 1 }).format(v) + " m²";
}

/** Adresa na jeden řádek z dostupných kousků. */
export function formatAddress(parts: {
  street: string | null;
  city: string | null;
  postal_code?: string | null;
}): string | null {
  const line = [parts.street, parts.city].filter(Boolean).join(", ");
  return line || null;
}
