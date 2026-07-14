import { headers } from "next/headers";

/**
 * Adresa webu — kam se má zákazník po platbě vrátit.
 *
 * Přednost má `NEXT_PUBLIC_SITE_URL` z nastavení. Teprve když chybí (typicky
 * při vývoji na localhostu), odvodí se z hlaviček požadavku.
 *
 * Proč to pořadí: hlavička `Host` se dá podvrhnout. Kdyby se návratová adresa
 * brala jen z ní, dal by se zákazník po zaplacení poslat na cizí web. Na ostrém
 * provozu proto MUSÍ být `NEXT_PUBLIC_SITE_URL` vyplněná.
 */
export async function getSiteUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";

  if (!host) {
    throw new Error(
      "Nepodařilo se zjistit adresu webu. Nastav proměnnou NEXT_PUBLIC_SITE_URL.",
    );
  }
  return `${proto}://${host}`;
}
