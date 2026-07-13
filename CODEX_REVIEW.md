# CODEX_REVIEW — zadání pro křížovou revizi (zkopíruj do Codexu)

Karle, tohle je hotové zadání pro nezávislou revizi Codexem. Postup:

1. V terminálu: `cd ~/Desktop/prezentace-saas && codex`
2. Zkopíruj **celý blok mezi čarami níže** a vlož ho Codexu jako zadání.
3. Codex NIC nemění — jen vypíše nálezy. Ty mi je pak pošli, projdu je.

> Pozn.: pro čistou nezávislost je připravená větev `codex-review-base`. Když bude
> Codex na usage-limitu, zkus `codex exec -s read-only "…zadání…" < /dev/null`.

---------------------------------------------------------------------------------

Jsi nezávislý bezpečnostní revizor. Pracuješ v režimu **jen ke čtení — NIC neměň**,
nic nekomituj, žádné soubory neupravuj. Úkol je projít kód a **vypsat nálezy**.
Piš **česky a laicky** (majitel projektu není programátor), ale u každého nálezu
uveď **přesný soubor a řádek** a krátký citát problémového místa.

## Kontext projektu

„Prodej si sám" — SaaS, kde si majitel nemovitosti sám vytvoří prodejní prezentaci
(fotky, texty) a po ZAPLACENÍ ji zveřejní na veřejné adrese `/listing/<slug>`.
Stack: **Next.js 16 (App Router) + Supabase (Postgres, Auth, Storage) + Vercel**,
platby Stripe (zatím NEnapojené). Kód je v `app/`. Migrace databáze v
`app/supabase/migrations/`, nastavení úložiště v `app/supabase/storage-setup.md`.
Pravidla projektu jsou v `RULES.md` a `CLAUDE.md`.

Klíčová pravidla produktu, která MUSÍ platit:
- Přihlášený uživatel smí vidět a měnit **jen svoje** prezentace, fotky a texty.
- Veřejná stránka `/listing/<slug>` ukáže **jen publikovanou** prezentaci; koncept
  smí vidět jen přihlášený vlastník.
- **Bez zaplacení nelze publikovat** (ani přímým voláním API).

## Co přesně zrevidovat (rozsah)

Zaměř se na to, co je nové kolem průvodce a veřejné stránky. Projdi hlavně:

1. **Únik / změna cizích dat (RLS).** Přečti VŠECHNY migrace v
   `app/supabase/migrations/*.sql`. Je RLS zapnuté na každé tabulce (`profiles`,
   `presentations`, `presentation_photos`, `payments`)? Můžou být policies obejity?
   Pozor na UPDATE policy bez `with check` (únos řádku přepsáním `owner_id`), na
   `using (true)`, na chybějící policy. Ověř to jako útočník s vlastním JWT (role
   `authenticated`) posílající surové PostgREST/RPC požadavky — ne jen přes UI.

2. **Veřejná stránka** `app/app/listing/[slug]/page.tsx` (+ `layout.tsx`,
   `not-found.tsx`). Neuniká přes ni něco navíc — přihlašovací e-mail majitele,
   nepublikované prezentace, koncepty, cizí fotky, interní ID? Dá se slug
   nepublikovaného inzerátu **uhodnout/vyčíslit** (`app/lib/slug.ts`)? Jde přes
   časování/hlášky zjistit, že koncept existuje?

3. **Placení a publikace.** Trigger `enforce_paid_before_publish()`
   (`app/supabase/migrations/20260705150000_*` a `20260707121000_*`) — je
   neobejitelný? Dá se nastavit `status='published'`/`'paid'` bez skutečné platby
   (přímý update, INSERT rovnou s tímto stavem, podvržení řádku do `payments`)?
   Má uživatel právo zapisovat do `payments`?

4. **Nahrávání fotek.** `app/app/presentations/[id]/photos/uploader.tsx`,
   `.../actions.ts`, `app/lib/photos.ts`, `app/supabase/storage-setup.md`,
   migrace `20260707120000_*`. Kde je vynucená validace typu a velikosti — jen
   v prohlížeči, nebo i v bucketu / DB? Dá se přímým voláním Storage API nahrát
   cokoli (HTML/SVG, obří soubor)? Dá se nahrávat neomezeně (náklady)? Dá se
   stáhnout fotka NEPUBLIKOVANÉ prezentace přes přímý/uhodnutelný odkaz? Jsou
   Storage policies úplné (upload/read/delete/public-read)?

5. **Server actions a autorizace.** Všechny akce v `app/app/**/actions.ts`
   a route `app/app/auth/confirm/route.ts`. Každá akce je veřejně volatelný HTTP
   endpoint — ověřuje (a) přihlášení přes `getUser()`, (b) že daný záznam patří
   volajícímu? Nespoléhá se jen na RLS tam, kde RLS nestačí? Používá se někde
   `service_role` klíč (obchází RLS)? Je open-redirect v `auth/confirm` ošetřen?

6. **Tichá selhání.** Kód, který spadne do prázdna a skončí „zeleně" — ignorovaná
   `error` z dotazu/mutace, prázdný `catch`, redirect na úspěch bez ověření výsledku,
   chybějící kontrola `data === null`.

## Výstup

Pro každý nález uveď: **klasifikaci** (High = únik/změna cizích dat, obejití platby,
převzetí účtu; Medium; Low), **soubor:řádek**, krátký **citát** místa, **proč** je to
problém (co udělá útočník), a **návrh opravy**. Nakonec vypiš, co jsi kontroloval
a je v pořádku. **Znovu: nic neměň, jen popiš.** Piš česky a laicky.

---------------------------------------------------------------------------------

## Pozn. pro Karla — tuhle revizi už jednou proběhla

Claude (2026-07-13) tuhle oblast zrevidoval a **7 nálezů opravil**, výsledky jsou
v `REVIEW_2026_07.md`. Codex 2026-07-13 dodal 5 nálezů, které se s tím překrývají.
Tenhle balík je pro **další nezávislé kolo** (např. po dalších změnách) — čerstvý
agent bez kontextu často najde něco, co první přehlédl. Když Codex potvrdí jen to,
co už je opravené, je to dobrá zpráva.
