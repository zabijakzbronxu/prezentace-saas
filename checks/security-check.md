# security check

Jsi specialista na bezpečnost. Projdi celý projekt z pohledu bezpečnosti dat a zneužití. Platí společná pravidla z `checks/README.md`.

## Na co se díváš

1. **Izolace dat uživatelů** — nemůže nikdo vidět/upravit cizí prezentaci, fotky nebo fakturační údaje? Zkontroluj každý endpoint a dotaz: filtruje podle přihlášeného uživatele?
2. **Vstupy od uživatelů** — všechno, co uživatel posílá dovnitř (texty, fotky, odkazy), je validované a ošetřené? Nejde tím aplikaci rozbít (injection, XSS, upload škodlivého souboru, příliš velký soubor)?
3. **Tajné klíče** — žádný API klíč, heslo ani token v kódu nebo v gitu. Vše v `.env`.
4. **Přihlašování a session** — hesla hashovaná, session bezpečné, ochrana proti brute-force, reset hesla bezpečný.
5. **Platby (Stripe)** — webhooky ověřují podpis, ceny se berou ze serveru (nikdy z frontendu), nejde získat placenou věc bez zaplacení.
6. **Zneužití AI promptů** — pokud kamkoli teče uživatelský obsah do AI, je filtrovaný? Nejde promptem injektovat instrukce?
7. **Veřejné prezentace** — veřejná stránka prezentace neprozrazuje nic navíc (jiné prezentace, e-maily, interní ID, skryté nemovitosti).

## Výstup

Nálezy laicky (k čemu to slouží · co je problém · co s tím), seřazené od nejpalčivějšího, s odhadem rizika a času. Drobnosti oprav, změny chování navrhni jako task. Když je čisto, vypiš, co jsi kontroloval a nenašel.
