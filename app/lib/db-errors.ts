// Rozpoznání jediné konkrétní situace: DATABÁZE NENÍ DOROVNANÁ.
//
// Když v Supabase chybí sloupec, tabulka nebo funkce, kterou dnešní kód čte,
// dotaz vrátí chybu a `data` je null. Bez téhle detekce by stránka takový stav
// spolkla a tvářila se jako „prezentace nenalezena" / prázdný seznam — což
// posílá uživatele hledat chybu úplně jinam.
//
// Typický příklad: „column presentations.location_text does not exist"
// = neproběhla migrace 20260706100000. Řešení: spustit supabase/APLIKUJ_VSE.sql.

/** Kódy, kterými Postgres / PostgREST hlásí „tohle ve schématu není". */
const MISSING_SCHEMA_CODES = new Set([
  "42703", // undefined_column   — sloupec neexistuje
  "42P01", // undefined_table    — tabulka neexistuje
  "42883", // undefined_function — funkce (RPC) neexistuje
  "PGRST202", // PostgREST: funkce není ve schema cache
  "PGRST204", // PostgREST: sloupec není ve schema cache
  "PGRST205", // PostgREST: tabulka není ve schema cache
]);

/** Chyba tak, jak ji vrací supabase-js (PostgrestError). */
export type DbErrorLike = {
  code?: string | null;
  message?: string | null;
} | null | undefined;

/**
 * Je to chyba typu „v databázi chybí kus schématu"?
 * Rozhoduje primárně kód; text je jen záchranná síť pro případ, že ho
 * klient nevyplní.
 */
export function isMissingSchemaError(error: DbErrorLike): boolean {
  if (!error) return false;
  if (error.code && MISSING_SCHEMA_CODES.has(error.code)) return true;

  const message = error.message ?? "";
  return (
    /does not exist/i.test(message) ||
    /could not find .* in the schema cache/i.test(message)
  );
}

/** Hláška pro uživatele — stejná všude, ať se to nerozchází. */
export const MISSING_SCHEMA_MESSAGE =
  "Databáze není dorovnaná na aktuální verzi aplikace — chybí v ní část struktury, kterou stránka potřebuje.";

/** Co s tím. Krok pro Karla, ne pro koncového uživatele. */
export const MISSING_SCHEMA_FIX =
  "Spusť v Supabase → SQL Editor obsah souboru app/supabase/APLIKUJ_VSE.sql (jedno vložení a Run). Dorovná chybějící tabulky, sloupce, funkce i úložiště fotek.";
