# lessons.md — poučení z chyb

Po každé korekci od Karla sem zapiš vzorec chyby a pravidlo, které ji příště nedovolí (a doplň ho do RULES.md).

## 2026-07-05 — git zámky v Cowork sandboxu (technické, ne korekce od Karla)
Vzorec: na mountu Desktopu jde soubory v `.git` vytvořit, ale ne smazat (`rm` → „Operation not permitted"). Každý git příkaz proto nechá stale `index.lock` / `HEAD.lock` / `next-index-*.lock`, který zablokuje ten další.
Pravidlo pro příště:
- Zámky NEmazat přes `rm` (nejde) — přesouvat stranou souborovým nástrojem (`move` na `*.stale`), viz MEMORY.md.
- Před KAŽDÝM git příkazem odklidit všechny `.git/*.lock`.
- Commit dělat jedním příkazem `git commit <cesta> -m …`, ne `git add` + `git commit` (dvojnásobek zámků).
- Po dokončení odklidit poslední `index.lock`, aby Karlův `git push` na jeho stroji neselhal.

## 2026-07-07 — nálezy křížové revize (technické vzorce, ne korekce od Karla)
Vzorec 1: formuláře validované „redirect s chybou v URL" zahazovaly rozepsaný text (formulář se předvyplnil starými hodnotami z DB).
Pravidlo: chybu formuláře vracet NA MÍSTĚ (useActionState), přesměrovávat jen při úspěchu. U dlouhých textů zásadní.
Vzorec 2: „přečti a pak zapiš" (počet fotek, další pořadí, hero) bez zámku → dvě záložky umí vyrobit duplicitní pořadí / dvě hero.
Pravidlo: vícekrokové zápisy dělat v DB funkci v jedné transakci pod zámkem (pg_advisory_xact_lock), ne v aplikaci.
Vzorec 3: volný text chyby v URL (?error=...) umí kdokoli podvrhnout odkazem — vypadá pak jako hláška aplikace.
Pravidlo: přes URL posílat jen KÓD chyby, texty drží stránka.

## 2026-07-05 — npm na mountu neumí atomické operace
Vzorec: `npm ci`/`npm install` na mountu padá na `rename`/`unlink` („ENOTEMPTY", „Operation not permitted"), node_modules zůstane rozbité.
Pravidlo: build ověřovat v čisté kopii mimo mount (`rsync` do `/tmp`, tam `npm ci` + `npm run build`). Reálnou instalaci `node_modules` udělá Karel u sebe (`npm ci`) — na jeho nativním systému problém není.
