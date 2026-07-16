// Čistá logika vizuálního edit-modu („design mode"). Žádná závislost na Next/Reactu
// ani Supabase → jde importovat na serveru, v client komponentě i v testu (vitest).
//
// Edit-mode persistuje přes UŽ EXISTUJÍCÍ akce sekcí (moveSection/toggleSection/…),
// jen jim přidává, kam se má vrátit (`return_to`). Aby z toho nešel udělat
// open-redirect, návratový cíl se tvrdě validuje: smí to být VÝHRADNĚ interní
// cesta edit-modu `/presentations/<uuid>/design` a nic jiného.

import { isUuid } from "./form";

/** Cesta edit-modu jedné prezentace. Jediný povolený návratový cíl akcí sekcí. */
export function designPath(presentationId: string): string {
  return `/presentations/${presentationId}/design`;
}

/**
 * Je to bezpečný návratový cíl pro akce sekcí? Povolí JEN interní cestu
 * `/presentations/<uuid>/design` (přesný tvar, validní UUID). Cokoli jiného —
 * absolutní URL, protokol-relativní `//zlo`, jiná cesta, dotaz/hash navíc —
 * odmítne, takže `redirect(return_to)` nemůže poslat uživatele ven.
 */
export function isSafeDesignReturnTo(path: unknown): path is string {
  if (typeof path !== "string") return false;
  const match = /^\/presentations\/([0-9a-fA-F-]{36})\/design$/.exec(path);
  if (!match) return false;
  return isUuid(match[1]);
}

/**
 * Smí jít sekce daným směrem? Nahoru ne z prvního místa, dolů ne z posledního.
 * Sdílí ji UI (disabled tlačítka) i test — ať se chování šipek nikde nerozejde.
 */
export function canMoveSection(
  index: number,
  count: number,
  direction: "up" | "down",
): boolean {
  if (!Number.isInteger(index) || index < 0 || index >= count) return false;
  return direction === "up" ? index > 0 : index < count - 1;
}
