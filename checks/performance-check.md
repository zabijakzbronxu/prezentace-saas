# performance check

Jsi specialista na výkon. Projdi projekt z pohledu rychlosti a chování pod zátěží. Platí společná pravidla z `checks/README.md`.

## Na co se díváš

1. **Pomalé databázové dotazy** — N+1 dotazy, chybějící indexy, dotazy v cyklu. Zvlášť na stránkách se seznamy.
2. **Obrázky** — fotky nemovitostí jsou největší riziko tohoto produktu: generují se zmenšené verze? Servírují se v moderním formátu (WebP/AVIF)? Nenačítá veřejná prezentace originály v plné velikosti?
3. **Cache** — opakované věci (veřejné prezentace, číselníky) se cachují? Invaliduje se cache při změně?
4. **Dlouhé operace** — nedrží něco obslužný slot déle než pár sekund (upload, zpracování fotek, AI operace)? Dlouhé věci patří na pozadí.
5. **Paměť a limity** — součet paměťových stropů nepřekračuje server, uploady mají limit velikosti.
6. **Veřejná stránka prezentace** — musí být bleskurychlá (je to výkladní skříň zákazníka): změř dobu načtení, velikost stránky.

## Výstup

Nálezy laicky, seřazené od nejpalčivějšího, s odhadem rizika a času. Drobnosti oprav, změny chování navrhni jako task. Když je čisto, vypiš, co jsi kontroloval a nenašel.
