# Kontrolní soustava

Každý check je samostatný „revizor" s úzkým zaměřením. Spouští se povelem (např. „security check").

## Společná pravidla všech checků

- Revizor běží jako **čerstvý agent s čistým kontextem** — vidí jen svůj úkol.
- **Drobnosti se 100% jistotou oprav sám** (překlep, mrtvý kód). **Cokoli, co mění chování produktu, jen navrhni jako úkol** — založ task v ClickUpu (dokud není připojen: zapiš do `tasks/todo.md`).
- **Výstup je laický**, u každého nálezu tři bloky: *k čemu ta věc slouží · co je problém · co s tím* + odhad rizika a času. Seřazeno od nejpalčivějšího.
- **Nevymýšlej si nálezy.** Když je čisto, řekni, že je čisto — a vypiš, co jsi kontroloval a NEnašel.
- Na konci každého běhu si polož otázku: **„Nechybí nám nějaká kontrola?"** Pokud ano, navrhni ji.

## Aktuální checky

| Povel | Soubor | Zaměření |
|---|---|---|
| `security check` | `security-check.md` | bezpečnost dat, platby, zneužití |
| `performance check` | `performance-check.md` | rychlost, zátěž, databáze |
| `ux check` | `ux-check.md` | použitelnost + soulad slibů s realitou |
| `mega check` | `mega-check.md` | všechny checky najednou |
| `dobrou noc` | `dobrou-noc.md` | večerní uzávěrka |

Další checky (test, refactor, dependency, resilience, language, customers, logical…) doplníme, až poroste produkt — pravidelnost > dokonalost.

## Budoucí rozšíření (až existuje kód)

Automatizované doplňky checků: bezpečnostní scan závislostí (npm audit), testovací sada spouštěná před releasem, linting/formátování, měření výkonu. A před prvními produkčními daty: plán zálohování + pravidelná zkouška obnovy (viz RULES.md).
