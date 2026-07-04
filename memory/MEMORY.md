# MEMORY.md — trvalá paměť projektu

Fakta a rozhodnutí, která musí přežít mezi konverzacemi. Co tu není zapsané, zítra neexistuje.

## Rozhodnutí (2026-07-04, založení projektu)

- Systém práce kopírujeme 1:1 podle článku M. Uďana (6 pilířů: pravidla, zadávání, kontroly, záchranné sítě, bezpečná půda, provoz a paměť).
- Úkoly a backlog: **ClickUp** (proč: 1:1 kopie článku, Karlova volba; do připojení konektoru fallback `tasks/todo.md`).
- Platební brána: **Stripe** (proč: nejlepší dokumentace a nejsnazší integrace pro AI vývoj, funguje v ČR).
- **Cenový model: platba předem** — prezentace se nezveřejní bez zaplacení (Karel, 2026-07-04).
- Křížová kontrola: zatím **čerstvý Claude agent** jako nezávislý revizor (proč: Karel zatím nemá OpenAI předplatné); Codex doplníme později.
- Projekt žije v `~/Desktop/prezentace-saas/`, git od první minuty.
- Referenční vzor výsledné prezentace: Otínská (`~/Desktop/index.html`, podklady dle `~/Desktop/OTINSKA_podklady_cesty.md`).
- Start se 3 checky (security, performance, ux), ne 15 — rostou s produktem.

## Technická poznámka (prostředí Cowork)

- Sandbox v Cowork neumí mazat gitové `.lock` soubory na Desktopu → po každé git operaci zůstane stale `index.lock`. Řešení: přesunout ho stranou souborovým nástrojem (move na `*.stale`) před další git operací. V Claude Code (nativně) tento problém nebude.
