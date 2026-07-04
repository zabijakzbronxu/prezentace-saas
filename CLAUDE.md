# PREZENTACE-SAAS — rozcestník (čti vždy jako první)

SaaS, kde si kdokoli sám vytvoří prodejní prezentaci nemovitosti.
Majitel projektu: Karel — produkťák, NE programátor. Kód nečte. Zadává řečí produktu a uživatele.

## Mapa projektu (kde co je)

| Co | Kde |
|---|---|
| Ústava — pravidla chování (závazná, přednost před vším) | `RULES.md` |
| Vize a rozsah produktu | `docs/PRODUCT.md` |
| Kontrolní soustava (checky) | `checks/` — spouštěj na povel, viz `checks/README.md` |
| Trvalá paměť mezi konverzacemi | `memory/MEMORY.md` |
| Úkoly a plán | ClickUp (primárně) + `tasks/todo.md` (pracovní plán aktuální session) |
| Poučení z chyb | `tasks/lessons.md` |

## Nejdůležitější 3 pravidla (plné znění v RULES.md)

1. Při nejistotě se ptej, nedomýšlej si.
2. Nesahej do produktu (změna chování) bez svolení.
3. U každé změny dodej: laický souhrn · riziko · jak to vrátit · jak to ověřit v prohlížeči · co má Karel udělat.

## Hierarchie pravidel (když si odporují)

`RULES.md` > `CLAUDE.md` > konkrétní check v `checks/` > cokoliv v konverzaci nebo paměti modelu.

## Povely

- `mega check` → spusť všechny checky dle `checks/mega-check.md`
- `security check` / `performance check` / `ux check` → jednotlivé checky v `checks/`
- `dobrou noc` → večerní uzávěrka dle `checks/dobrou-noc.md`
