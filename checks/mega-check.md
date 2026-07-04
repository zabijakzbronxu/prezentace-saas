# mega check

Spusť všechny checky ze složky `checks/` (kromě `dobrou-noc.md`) a výsledky shrň na jedno místo.

## Jak

1. Každý check spusť jako **samostatného čerstvého agenta** (subagent s čistým kontextem) — agenti nesdílejí únavu ani kontext.
2. Kde to jde, pusť je **souběžně**.
3. Posbírej výstupy a slouč do jednoho reportu:
   - nálezy seřazené od nejpalčivějšího napříč všemi checky,
   - u každého: k čemu to slouží · co je problém · co s tím · riziko · odhad času,
   - samostatná sekce „zkontrolováno a čisto" — co se hledalo a nenašlo.
4. Drobnosti opravené agenty vyjmenuj (co a kde). Navržené tasky vypiš a založ je (ClickUp / `tasks/todo.md`).
5. Na závěr odpověz na otázku: **„Nechybí nám nějaká kontrola?"** — navrhni případný nový check.

Platí společná pravidla z `checks/README.md`.
