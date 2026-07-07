# Wargame 11 — „Prodej si sám": trasa exekutora

Wargame provedena 2026-07-07 (Opus, read-only recon celého repa + adversariální plánování).
Zdroj rozkazu: `tasks/wargame-11.md`. Tento dokument JE trasa — exekutor (Claude Code / Sonnet
v `~/Desktop/prezentace-saas/`) ji projíždí odshora dolů a nemá klást žádnou otázku NA TECHNIKU.
Otázky NA PRODUKT jsou vyjmenované v sekci 2 — tam tah končí STOP a čeká na Karla.

Hierarchie pravidel: `RULES.md` > `CLAUDE.md` > `checks/` > cokoli v konverzaci. Platí beze zbytku.

---

## 0. Jak číst tento dokument

**Tah** = jednotka práce. Každý tah má:
- **AKCE** — přesné kroky (soubory, příkazy, kdo je dělá: EXEKUTOR vs. KAREL),
- **OČEKÁVÁNÍ** — přesně co uvidíš, když tah vyšel (obrazovka / terminál / DB),
- **SELHÁNÍ** — nejpravděpodobnější selhání → příčina, kterou signalizuje → protitah,
- **VĚTVE** — „pokud pozoruješ X → jdi trasou Y". Žádné soudy se nenechávají na exekutorovi.

**Vlajky:**
- `BLOCKED: …` — tah závisí na vstupu, který rozhoduje výhradně Karel. Přesná otázka je v sekci 2.
- `STOP: …` — produktová otázka (RULES.md pravidlo 1). Tah končí otázkou, nikdy domněnkou.
- `RECON NEEDED: …` — předpoklad, který recon nevyřešil; uvedený check ho vyřeší. Registr v sekci 11.

**Neporušitelné standardy (platí v každém tahu):**
1. Git commit po každé dokončené změně. Push a deploy dělá VÝHRADNĚ Karel, vědomě.
2. Tajné klíče žijí jen v `app/.env.local` (je v `.gitignore` — ověřeno). Nikdy do kódu, gitu, logů, ClickUpu.
3. Stripe výhradně TEST MODE (`sk_test_`). Zeleným testům u plateb se nevěří — ruční proklik povinný.
4. Validace v prohlížeči, ne v kódu. Každá fáze končí klikacím acceptance checkem + řídicím panelem (šablona v sekci 12).
5. `npm ci/install/build/test` NIKDY přímo na mountu Desktopu — vždy čistá kopie v /tmp (lessons.md). Stale git `.lock` NIKDY `rm` — přesunout na `*.stale`.
6. Plán fází v `tasks/todo.md` s checkboxy; zrcadlení do ClickUp listu „Prezentace SaaS — Backlog" (901219290922); když konektor neběží → `tasks/kroky-pro-karla.md`.
7. Žádný scope creep: jen 3 moduly MVP (Stripe platba, admin, dotažení správy). `/listing/<slug>` se NEMĚNÍ — ROZHODNUTO.

---

## 1. Výchozí stav (recon 2026-07-07, vše ověřeno čtením repa)

**Hotovo a funkční (nesahat, jen ověřit klikem):**
- Průvodce Základ → Fotky → Texty vč. validací na serveru i v DB; sdílený formulář drží rozepsané hodnoty (`app/lib/presentations/form.ts`, useActionState).
- Správa prezentací (E3.10): seznam s miniaturami (hero + fallback, podepsané URL 1 h), akce Upravit/Fotky/Texty/Náhled/Smazat, mazání s potvrzením + úklid Storage (`app/app/presentations/page.tsx`, `actions.ts`).
- Fotky: upload z prohlížeče přímo do privátního bucketu, magic-bytes kontrola typu, 4 DB funkce pod advisory zámkem (`app/supabase/migrations/20260707120000_photos_integrity.sql`).
- Veřejná stránka `/listing/<slug>`: čte běžným RLS (cookie) klientem s anon klíčem — NIKDY service_role; kód status nefiltruje, kdo co vidí rozhoduje 100 % RLS (`app/app/listing/[slug]/page.tsx:38-44`); koncept pro anonyma = 404; `force-dynamic` (žádná cache HTML).
- Auth: registrace, login, logout, potvrzení e-mailu přes `/auth/confirm` (verifyOtp, safeNextPath proti open redirectu). Ochrana stránek per-page (getUser + redirect), middleware jen obnovuje session.
- DB pojistky: trigger `enforce_paid_before_publish` — KAŽDÝ přechod do `paid` i `published` vyžaduje řádek `payments.status='paid'` (`20260707121000_status_slug_guard.sql`); CHECK na tvar slugu; RLS všude; payments mají jen owner-SELECT policy (zápis = jen service_role, záměr).
- Testy: vitest, 34 zelených (v čisté kopii). Světlá veřejná šablona dle Otínské, admin/průvodce tmavý — záměr.

**Chybí (= náplň mise):**
- ŽÁDNÁ akce změny statusu v celé aplikaci — status se jen zobrazuje jako štítek. Průvodce končí krokem 3 bez CTA.
- Stripe: žádný kód, žádná závislost v package.json, žádný klíč v `.env.local.example`. Payments nemají UNIQUE na `provider_payment_id` → idempotence webhooku v DB neexistuje.
- Admin: žádný `/admin`, žádný sloupec role/is_admin nikde ve schématu.
- Reset hesla NEEXISTUJE (grep celého `app/` bez nálezu) — zapomenuté heslo = trvale zamčený účet. Povinná verifikace 4 ho vyžaduje.

**Kritické nesoulady a stav prostředí (ověřeno při wargame 2026-07-07):**
- Na Karla čeká 5 nespuštěných migrací v živé DB (text_sections, contact_checks, profile_checks, photos_integrity, status_slug_guard) + znovu-spuštění zpřísněných Storage policies (`tasks/kroky-pro-karla.md`). Bez nich fotky v živé DB NEFUNGUJÍ a pojistka „paid vyžaduje platbu" NEPLATÍ.
- `git status -sb`: **main je 39 commitů před origin/main** — jediná kopie práce je na disku. Push = krok Karla.
- `app/.env.local` **NEEXISTUJE** (git check-ignore ho kryje). Bez něj neběží dev server ani auth.
- Nástroje: `stripe` CLI **CHYBÍ**, `pg_dump`/`psql` **CHYBÍ**, `docker` binárka JE (`/usr/local/bin/docker` — běh daemonu neověřen), node+npm jsou. Žádné stale git locky.
- docs/BACKUP.md je NÁVRH, čeká na schválení; tarif Supabase (free/Pro) neznámý. Zkouška obnovy nikdy neproběhla.

**Klíčové technické kotvy (exekutor je nikdy neporušuje):**
- Webhook je JEDINÉ místo, kde smí vzniknout `payments.status='paid'`. Pořadí vynucené triggerem: napřed INSERT payments, pak UPDATE presentations.
- Stripe počítá v haléřích (`unit_amount` = Kč × 100), sloupec `amount_czk` je v Kč — převod a validace částky + měny proti ceně ZE SERVERU před přepnutím stavu.
- Při NESOULADU částky se platba zapíše se statusem **`pending`** (nikdy `paid`!) + error log — řádek se statusem `paid` by triggerem odemkl publikaci vlastníkovi, i když se stav nepřepne.
- Trigger chrání proti klientům s anon/uživatelským JWT; service_role si platbu vložit umí — proto service_role jen ve webhooku a v admin stránkách, nikde jinde.
- Payments nemají `updated_at` — webhook nastavuje `paid_at`.
- Signed URL fotek platí 1 h i po zneveřejnění (známý kompromis, neřešit). DB chyba na listingu se maskuje jako 404 (známé, neřešit v této misi).
- Cesty fotek generovat malými písmeny (stávající kód to dělá). Slug ani `/listing/<slug>` se NEMĚNÍ.

---

## 2. Otázky pro Karla — položit VŠECHNY najednou, hned na startu Fáze 0

Odpovědi se sejdou, zatímco běží Fáze 0–1 (ty na nich nezávisí). U každé je uvedeno, co odblokuje.

| # | Otázka (doslovně) | Odblokuje |
|---|---|---|
| K1 | **BLOCKED — cena:** Karle, jaká je přesná cena za publikaci jedné prezentace v Kč (s/bez DPH)? Do Tvé odpovědi testujeme s dočasnou částkou 100 Kč výhradně ve Stripe test mode (žádné skutečné peníze); před ostrým provozem musíš cenu nastavit Ty. | finální částku v S6/S10 a ostrý provoz (stavba a testy SMÍ běžet s dočasnou 100 Kč v test mode i bez odpovědi) |
| K2 | **BLOCKED — náhled zdarma:** Má uživatel vidět náhled své prezentace zdarma před zaplacením? Dnes to tak funguje (vlastník vidí `/listing/<adresa>` s modrým pruhem „Náhled konceptu", nikdo jiný ji nevidí). Pokud náhled před platbou být nemá, řekni to — je to změna chování a udělá se zvlášť. | texty a umístění platebního CTA (S8) |
| K3 | **BLOCKED — název:** Jaký je finální název produktu/služby? Zobrazí se zákazníkovi na Stripe checkoutu a účtence. (Doména na checkout nutná není; do rozhodnutí běží pracovní „Prodej si sám".) | S6 větev „po K3" (název na checkoutu), deploy |
| K4 | **STOP — publikace:** Po úspěšném zaplacení se má prezentace (A) zveřejnit automaticky sama, nebo (B) má uživatel dostat tlačítko „Publikovat" a zveřejnit ji, až bude chtít? Obojí je technicky bezpečné — jde čistě o zážitek uživatele. | S13 |
| K5 | **STOP — mazání zaplacených:** Smí uživatel smazat prezentaci, která už je ZAPLACENÁ nebo PUBLIKOVANÁ? Dnes tomu nic nebrání a smazání odstraní i záznam o platbě (účetní stopa zmizí). Možnosti: (a) zakázat, (b) povolit, ale záznam platby ponechat, (c) nechat jak je. | M4 (větev po odpovědi) |
| K6 | **STOP — reset hesla:** Reset hesla v aplikaci neexistuje — zapomenuté heslo dnes znamená trvale zamčený účet i pro platícího zákazníka, a povinná verifikace mise ho vyžaduje. Smím dostavět dvě stránky: „Zapomenuté heslo" (pošle e-mail s odkazem) a „Nastavení nového hesla"? | M6, M7, verifikace 4 |
| K7 | **BLOCKED — admin účet:** Kterou e-mailovou adresou se budeš do aplikace přihlašovat jako admin? (Musí to být běžně registrovaný účet; pokud ho ještě nemáš, řekni adresu a zaregistruješ se jí.) A potvrď: admin v MVP je jen ke ČTENÍ (přehledy uživatelů, prezentací, plateb) — jakákoli akce navíc by bylo nové zadání. | A1–A2 |
| K8 | **STOP — zálohy:** Schvaluješ zálohovací plán v `docs/BACKUP.md`? A jsme na free, nebo Pro tarifu Supabase? (Na free nejsou automatické zálohy — zkouška zálohy a obnovy je pak povinná před prvními reálnými daty.) | V7, ostrý provoz |
| K9 | **STOP — české hlášky:** Schvaluješ nahrazení anglických chybových hlášek při přihlášení českými? Návrh: „Nesprávný e-mail nebo heslo." / „E-mail ještě není potvrzený — klikni na odkaz v e-mailu." / „Příliš mnoho pokusů, zkus to za chvíli." Vedlejší přínos: nikdo nepodvrhne vlastní text do stránky přes odkaz. | M9 |
| K10 | **BLOCKED — Stripe účet a nástroje:** Máš Stripe účet? (I test mode ho vyžaduje; založení je zdarma.) A souhlasíš s instalací Stripe CLI (`brew install stripe/stripe-cli/stripe` + `stripe login`)? CLI na stroji teď není — bez něj nejde platby lokálně ručně proklikat. | S3, S9–S14 |

Provozní prosby (nejsou produktové otázky, ale jen Karel je může udělat):
- **P1:** vytvořit `app/.env.local` s `NEXT_PUBLIC_SUPABASE_URL` a `NEXT_PUBLIC_SUPABASE_ANON_KEY` (dle `.env.local.example`; soubor je v .gitignore). Bez něj neběží žádné klikací ověření.
- **P2:** spustit 5 čekajících migrací + zpřísněné Storage policies dle `tasks/kroky-pro-karla.md`, pak kontrolní SQL z tahu V1.
- **P3:** `git push` (main je 39 commitů před GitHubem — jediná kopie práce je na disku).

---

## 3. Mapa fází a závislostí

```
FÁZE 0  Zajištění stavu        V1 (soulad DB+push) → V6 (metodika migrací) → V7 (backup drill) → 0.5 uzávěrka
   │    + položit K1–K10, P1–P3 hned
FÁZE 1  Bezpečnostní základ    M1 (prostředí+účty) → M2 (audit správy) → V2 (izolace) → V3a (brána) → M4 (mazání)
   │    ← nutná PODMÍNKA pro stavbu plateb: izolace a brána musí držet PŘED Stripe
FÁZE 2  Stripe (modul 1)       S2 → S3 → S4 → S5 → S6+S7 → S8 → S9 → S10 → S11 → S12 → S14 → S15; S13 po K4
FÁZE 3  Auth + správa (modul 3) M5 → M6+M7 (po K6) → M8 → M9 (po K9) → M10
FÁZE 4  Admin (modul 2)        A1 → A2 → A3 → A4 → A5 → A6 (izolační regrese!) → A7
UZÁVĚRKA                        kontrola všech PASS, todo/ClickUp, doporučit Karlovi povel „mega check"
```

Proč toto pořadí: V1 blokuje všechno (bez souladu živé DB s repem je každý test bezcenný — pojistka „paid vyžaduje platbu" možná vůbec neběží). Izolace a publikační brána (Fáze 1) musí být prokázané PŘED stavbou plateb — stavět platby nad děravou izolací znamená publikovat děravě. Auth e2e běží po Stripe, aby pokryl i účet, který zaplatil. Admin jde poslední: čte data všech, takže izolační regrese po něm je povinná — a testovací účty i platby z dřívějších fází mu poslouží jako demo data (NEmazat je bez Karla).

V7 (backup drill): tvrdá podmínka mise = PŘED prvními reálnými daty (tj. před ostrým provozem). Doporučené provedení hned ve Fázi 0 (pojistka i pro nové migrace). Pokud K8 nemá odpověď, Fáze 1–4 smí běžet dál (testovací data nejsou reálná data), ale mise se NESMÍ uzavřít bez V7 PASS.

---

## 4. FÁZE 0 — Zajištění stavu

### Tah 0.1 — Vstupní kontrola prostředí a repa (EXEKUTOR, read-only)
**AKCE:** (1) `ls /Users/apple/Desktop/prezentace-saas/.git/*.lock` — existují-li, `mv <soubor> <soubor>.stale` (NIKDY rm). (2) `ls -la app/.env.local` — při wargame NEEXISTOVAL; pokud stále chybí → připomenout P1, klikací tahy stojí. (3) `git status -sb` — čekej `[ahead N]`; připomenout P3. (4) Nástroje: `command -v stripe docker pg_dump psql` (stav při wargame: stripe CHYBÍ, docker binárka JE, pg_dump/psql CHYBÍ) + `docker info >/dev/null 2>&1 && echo OK || echo DAEMON NEBĚŽÍ`. (5) ClickUp konektor: jeden levný dotaz (`clickup_get_list` na 901219290922) — funguje/nefunguje si zapiš. (6) Výsledky zapsat do `tasks/todo.md` jako vstupní stav mise.
**OČEKÁVÁNÍ:** Zapsaný stav: locky žádné / odklizené; env.local existuje či ne; ahead N; dostupnost 4 nástrojů; ClickUp ano/ne.
**SELHÁNÍ:**
- Stale lock brání i po přesunu → příčina: sandbox drží soubor → protitah: stop, nahlásit Karlovi (git operace dělá Karel u sebe).
- `docker info` hlásí daemon neběží → příčina: Docker Desktop nespuštěný → protitah: požádat Karla o spuštění Docker Desktop; do té doby V6/V7 jedou cestou B (transakce v SQL editoru / druhý Supabase projekt).
**VĚTVE:** vše zapsáno → 0.2. ClickUp neběží → všechna zrcadlení této mise jdou do `tasks/kroky-pro-karla.md`.

### Tah 0.2 (V1) — Soulad živé DB a Storage s repem + push (PREREKVIZITA VŠEHO)
**AKCE:** EXEKUTOR vytvoří `tasks/verifikace-db.sql` s kontrolními SELECTy (jen čtení):
a) `select proname from pg_proc where proname in ('register_presentation_photo','swap_photo_order','set_hero_photo','delete_presentation_photo','enforce_paid_before_publish') order by 1;` → očekává 5 řádků;
b) `select (prosrc like '%(''paid'', ''published'')%') as hlida_paid from pg_proc where proname='enforce_paid_before_publish';` → true JEN u nové verze z 20260707121000 (POZOR: prostý test na slovo 'paid' by dal falešný PASS i u staré verze z 20260705150000 — ta 'paid' obsahuje v podmínce na payments; rozlišuje výhradně řetězec `in ('paid', 'published')`);
c) `select policyname from pg_policies where schemaname='storage' and tablename='objects' order by 1;` → obsahuje přesně tyto 4: `photos owner delete`, `photos owner read`, `photos owner upload`, `photos public read published` (další policies jiných bucketů nevadí);
d) `select id, public, file_size_limit, allowed_mime_types from storage.buckets where id='presentation-photos';` → public=false, file_size_limit=8388608 (8 MB), allowed_mime_types = {image/jpeg,image/png,image/webp};
e) `select conname from pg_constraint where conname in ('presentations_slug_format','presentations_contact_lengths','presentations_section_text_lengths','profiles_field_lengths') order by 1;` → 4 řádky;
f) `select policyname, cmd, qual, with_check from pg_policies where schemaname='storage' and tablename='objects' and policyname='photos owner upload';` → vypíše plnou definici upload policy.
KAREL: zkopíruje obsah do Supabase → SQL Editor → Run a pošle výstup (stačí screenshot) — NIC neposuzuje, Karel kód nečte. EXEKUTOR: porovná výstup f) se zpřísněnou předlohou ve `app/supabase/storage-setup.md` (musí obsahovat regex na UUID složku `[0-9a-f]{8}-…` a na příponu `\.(jpg|png|webp)$`). Poté KAREL: `git push`. EXEKUTOR: commit `tasks/verifikace-db.sql`.
**OČEKÁVÁNÍ:** Vše sedí (5 funkcí, hlida_paid=true, 4 policies, bucket privátní 8 MB + 3 MIME, 4 CHECKy, výstup f) obsahuje oba regexy). Po pushi `git status -sb` bez `[ahead]`.
**SELHÁNÍ:**
- a) < 5 funkcí → příčina: Karel nespustil photos_integrity / status_slug_guard → protitah: Karel spustí všech 5 migrací v pořadí timestampů dle `tasks/kroky-pro-karla.md` (idempotentní), V1 zopakovat. Do té doby ŽÁDNÝ tah proti živé DB.
- b) false nebo upload policy bez regexu na příponu → příčina: stará verze funkce/policy → protitah: Karel znovu spustí 20260707121000 resp. celý SQL blok ze storage-setup.md; V1 zopakovat.
- d) bucket chybí / file_size_limit null → příčina: bucket bez povinných limitů → protitah: Karel projde storage-setup.md Krok 1 i 2; V1 zopakovat.
- SQL editor: „must be owner of table objects" u policies → protitah: cesta B ze storage-setup.md (naklikat 4 policies ručně).
**VĚTVE:** vše sedí → odemčeny Fáze 1, V6, V7. Nesedí i po znovu-spuštění → STOP celé mise, výstup do `tasks/lessons.md`, otázka Karlovi, zda míří na správný Supabase projekt (může jich existovat víc).

### Tah 0.3 (V6) — Metodika migrací: každá nová má ověřený rollback PŘED živou DB
**AKCE:** Platí pro všechny nové migrace mise (S2; reset hesla ani admin žádnou nepotřebují). (1) Šablona: každý nový soubor `app/supabase/migrations/<timestamp>_<název>.sql` končí komentovanou sekcí `-- ROLLBACK (spustit jen při vracení změny):` s doslovnými příkazy. (2) Test — cesta A (Docker, preferovaná): `docker run -d --name mig-test -p 54329:5432 -e POSTGRES_PASSWORD=test postgres:16`; před init migrací spustit stub: `create schema if not exists auth; create table if not exists auth.users(id uuid primary key, raw_user_meta_data jsonb); create or replace function auth.uid() returns uuid language sql as $$ select null::uuid $$; create schema if not exists storage;`; aplikovat všech 9 stávajících migrací + novou v pořadí timestampů (`docker exec -i mig-test psql -U postgres < soubor` — psql lokálně chybí); pak ROLLBACK sekci → bez chyby; pak migraci ZNOVU → bez chyby (idempotence). Nakonec `docker rm -f mig-test`. Cesta B (bez Dockeru): v Supabase SQL editoru `begin;` + celá migrace + `rollback;` v jednom query → Success = aplikovatelnost bez trvalé změny; ROLLBACK sekce se testuje stejně v begin/rollback obálce hned po ostrém nasazení. (3) Ostré spuštění vždy Karel (copy-paste, Success); po něm exekutor rozšíří `tasks/verifikace-db.sql` o kontrolu nového objektu a Karel ji spustí. (4) Evidence: `tasks/kroky-pro-karla.md` vede seznam „migrace spuštěné v živé DB" s datem.
**OČEKÁVÁNÍ:** Cesta A: 10 souborů + rollback + re-aplikace bez chyby. Cesta B: query končí Success.
**SELHÁNÍ:**
- Init migrace padá v lokálním Postgresu i se stubem → příčina: další interní Supabase objekt → protitah: doplnit stub dle chybové hlášky; když ani pak → cesta B + poznámka do lessons.md.
- ROLLBACK sekce padá (dependence) → příčina: špatné pořadí příkazů → protitah: opravit pořadí (nejdřív policies/triggery, pak sloupce/indexy), test celý zopakovat — migrace se ke Karlovi nedostane, dokud rollback neprojde.
**VĚTVE:** Docker daemon neběží a Karel ho nespustí → cesta B; do poznámek fáze zapsat „rollback testován jen v transakci (slabší důkaz)". V1 kdykoli ukáže nesoulad → žádná nová migrace, dokud Karel nedorovná.

### Tah 0.4 (V7) — Backup + zkouška obnovy (před prvními reálnými daty)
**AKCE:** KROK 0 = STOP K8 (schválení BACKUP.md + tarif). Minimální drill (free tier): (1) KAREL: dashboard → Project Settings → Database → Connection string, **Session pooler** variantu (IPv4) → vloží do `app/.env.local` jako `SUPABASE_DB_URL` (mimo git; exekutor ověří `git check-ignore app/.env.local`). (1b) KAREL v SQL editoru: `select version();` → exekutor podle výstupu zvolí Docker image se STEJNOU nebo VYŠŠÍ major verzí Postgresu (pg_dump s nižší verzí než server odmítne pracovat; postgres:17 zvládne dump z 15/16/17). (2) EXEKUTOR (pg_dump lokálně chybí → přes Docker): nejdřív načíst proměnnou BEZ vypsání hodnoty: `export SUPABASE_DB_URL="$(grep '^SUPABASE_DB_URL=' app/.env.local | cut -d= -f2-)"`; pak `docker run --rm postgres:<major dle version()> pg_dump "$SUPABASE_DB_URL" --no-owner --no-privileges -n public -Fc > <scratchpad>/zaloha-<datum>.dump` — dump NIKDY do repa (obsahuje data). (3) Obnova — cesta A: `docker run -d --name restore-test -p 54330:5432 -e POSTGRES_PASSWORD=test postgres:16` + stub auth/storage jako v 0.3 + `pg_restore` do něj. Cesta B: Karel založí druhý free Supabase projekt „prezentace-restore-test" a obnoví se tam. (4) PASS ověření: na živé i obnovené DB stejné SQL: `select (select count(*) from profiles),(select count(*) from presentations),(select count(*) from presentation_photos),(select count(*) from payments);` → čísla se rovnají; namátka `select title, slug from presentations limit 3;` → shodné texty. Výstupy → `tasks/dukazy-zaloha.txt`. (5) Storage: fotky v pg_dump nejsou — Karel v dashboardu stáhne 2–3 soubory z bucketu (důkaz ručního stažení); plnohodnotný skript = návrh do ClickUpu, NEstavět (scope). (6) Úklid: `docker rm -f restore-test`, dump po PASS smazat (nebo Karel uloží mimo git dle BACKUP.md).
**OČEKÁVÁNÍ:** dump > 0 B; restore doběhne; kontrolní čísla identická; dump není v `git status`.
**SELHÁNÍ:**
- pg_restore padá na FK profiles → auth.users → příčina: dump jen `-n public`, FK míří do auth → protitah: dump zopakovat s `-n public -n auth`; když Supabase čtení auth odepře → `pg_restore -l` + vynechat FK constraint; funkční postup zapsat do BACKUP.md jako závazný.
- pg_dump se nepřipojí (timeout) → příčina: přímý host je jen IPv6 → protitah: Session pooler string (IPv4), opakovat.
- pg_dump hlásí „server version mismatch" → příčina: Docker image má nižší major verzi než server → protitah: image tag dle `select version();` (vyšší major zvládne dump z nižší), opakovat.
- Docker nedostupný → protitah: cesta B (druhý Supabase projekt) + `brew install libpq` pro pg_dump, se souhlasem Karla.
**VĚTVE:** Karel potvrdí Pro tarif → drill se zjednoduší (ověřit existenci automatické zálohy + jedna obnova do testovacího projektu); BACKUP.md aktualizovat. PASS → do BACKUP.md zapsat datum první úspěšné zkoušky + přesné příkazy, commit; teprve pak smí dovnitř reálná data. V živé DB už jsou reálná data → drill jen čtecí, obnova výhradně do izolovaného cíle.

### Tah 0.5 — Uzávěrka fáze 0 (acceptance + řídicí panel)
**AKCE:** EXEKUTOR: řídicí panel dle šablony (sekce 12) do odpovědi Karlovi i todo.md; checkboxy fáze 0 v todo.md; ClickUp zrcadlo (fallback kroky-pro-karla.md); commit (`tasks/verifikace-db.sql`, případná aktualizace BACKUP.md, todo).
**OČEKÁVÁNÍ (klikací acceptance pro Karla):** (a) Supabase → Storage → presentation-photos → vidí limit „8 MB" a 3 povolené typy obrázků; (b) po P1: http://localhost:3000/login ukazuje přihlašovací formulář (NE hlášku „Zobrazení zatím není zapnuté"); (c) github.com — repo ukazuje dnešní poslední commit (P3 proběhl). todo.md má fázi 0 kompletně odškrtnutou.
**SELHÁNÍ:**
- Kterýkoli acceptance bod neprošel → příčina: příslušný tah nedoběhl → protitah: vrátit se k němu (a → 0.2/P2, b → P1, c → P3); fázi NEuzavírat.
- ClickUp neběží → příčina: výpadek konektoru (známé) → protitah: fallback kroky-pro-karla.md.
**VĚTVE:** vše PASS → Fáze 1.

---

## 5. FÁZE 1 — Bezpečnostní základ (izolace a brána PŘED platbami)

### Tah M1 — Prostředí + smoke test + testovací účty
**AKCE:** EXEKUTOR: (1) `rsync -a --exclude node_modules --exclude .next app/ <scratchpad>/app-copy/`; tam `npm ci && npm test && npm run build`; zkopírovat do kopie i `app/.env.local` (cp, ne git). (2) Dev server z čisté kopie: `npm run dev` (RECON: zda `next dev` běží i přímo na mountu, je neověřeno — lessons.md dokládá selhání jen u npm install/build; kopie je bezpečná volba). (3) Testovací identity: gmail plus-aliasy `zabijakzbronxu+wg-a@gmail.com` (A) a `+wg-b` (B) — e-maily chodí do Karlovy schránky, potvrzovací odkazy kliká KAREL (potvrdit s ním předem).
**OČEKÁVÁNÍ:** `npm test` = 34 passed; build bez chyb; http://localhost:3000 běží; `/login` ukazuje formulář (NE hlášku o nevyplněných klíčích).
**SELHÁNÍ:**
- npm ci/build padá v kopii → příčina: NENÍ mount problém (kopie je mimo) — čti přesnou chybu (lock nesoulad, Node verze) → protitah: `npm install` místo ci; TS chyba = regrese → oprav jen, je-li to jednořádkový překlep v souboru, který chybová hláška přímo jmenuje; cokoli jiného → nahlásit Karlovi a stát.
- `/login` v degradovaném režimu → příčina: .env.local se nedostal do kopie / neexistuje → protitah: cp; pokud neexistuje ani originál → P1 (Karel), klikací tahy stojí.
- < 34 passed → příčina: regrese/necommitnuté změny → protitah: `git status`+`git diff`; necommitnutý kód → nahlásit Karlovi a stát; čistý tree → zapsat padající testy, pokračovat jen v tazích na nich nezávislých.
**VĚTVE:** vše zelené → M2. Bez env → jen kroky 1 (testy/build jedou bez env).

### Tah M2 — Audit správy prezentací klikem (uživatel A)
**AKCE:** EXEKUTOR jako A: (1) `/presentations`: karta s miniaturou, štítek statusu, akce Upravit/Fotky/Texty/Náhled/Smazat; bez prezentace → založit přes `/presentations/new`. (2) Krok 1: neplatná cena (0) → chyba NA MÍSTĚ, hodnoty drží; pak platná → uloženo. (3) Krok 2: nahrát 2 JPEG → pořadí, první hero; přehodit pořadí; přepnout hero; smazat jednu. (4) Krok 3: vyplnit popis, uložit, vrátit se — drží. (5) Náhled `/listing/<slug>` v TÉŽE session → modrý pruh „Náhled konceptu". (6) Prázdný stav: čerstvý účet → prázdný seznam s CTA. Jakoukoli odchylku POUZE zapsat do nálezů — v tomto tahu se neopravuje nikdy; opravy dělají jen tahy, které je výslovně předepisují.
**OČEKÁVÁNÍ:** vše dle kroků, žádná chyba v konzoli.
**SELHÁNÍ:**
- Upload selže hláškou o registraci fotky / neexistující funkci → příčina: živá DB bez photos_integrity → protitah: zpět na 0.2/P2 (Karel migrace), pak M2 od kroku 3.
- Upload selže 403/RLS ze Storage → příčina: chybí/stará Storage policies → protitah: Karel znovu spustí SQL blok ze storage-setup.md; opakovat.
- Miniatura rozbitá → DevTools Network: 403 = policy (Karel storage-setup), 404 = sirotčí záznam → zapsat nález, neopravovat.
**VĚTVE:** zelené → V2. Chyby DB/Storage → stop, vyřešit s Karlem, M2 celé zopakovat.

### Tah V2 — Izolace dat: A nesmí na data B (UI, API, Storage, listing) — POVINNÁ VERIFIKACE 1
**AKCE:** EXEKUTOR, dva oddělené prohlížeče/profily (ne dvě záložky — cookies se sdílí). Jako B: vytvořit prezentaci + 1 fotku; poznamenat `<idB>`, `<slugB>`, `<storage_path_B>` (z DevTools Network při uploadu). Pak:
(1) UI jako A: `/presentations` NEobsahuje prezentaci B; `/presentations/<idB>/edit` → „Prezentace nenalezena"; totéž `/photos` a `/texts`; `/listing/<slugB>` → „Prezentace není dostupná". Screenshoty.
(2) API curl — KAŽDÝ požadavek níže MUSÍ nést OBĚ hlavičky `-H "apikey: $ANON"` A `-H "Authorization: Bearer $JWT_A"` (bez apikey vrací Supabase gateway 401 na VŠECHNO a test by lhal falešným PASS); POST/PATCH navíc `-H 'Content-Type: application/json'`. (JWT A: `curl -s -X POST "$URL/auth/v1/token?grant_type=password" -H "apikey: $ANON" -H 'Content-Type: application/json' -d '{"email":"…","password":"…"}'` → access_token):
a) `GET /rest/v1/presentations?select=id,slug,status` s JWT A → jen řádky A;
b) `…?id=eq.<idB>` → `[]`;
c) `GET /rest/v1/presentation_photos?presentation_id=eq.<idB>` → `[]`;
d) `GET /rest/v1/payments?select=*` → `[]`;
e) POKUS O ZÁPIS: `POST /rest/v1/payments` s JWT A `{"presentation_id":"<idA>","status":"paid"}` → **403 s RLS hláškou (kód 42501)** — POZOR: odpověď 401 znamená chybějící apikey hlavičku, tedy chybu testu, NE pass! (payments bez insert policy — klíč k platební bráně);
f) podepsání fotky B tokenem A: `POST /storage/v1/object/sign/presentation-photos/<storage_path_B>` s tělem `-d '{"expiresIn":3600}'` → chyba, žádný signedURL;
g) přímé stažení `GET /storage/v1/object/authenticated/presentation-photos/<storage_path_B>` s JWT A → ≠ 200;
h) anonym (jen apikey): `GET /rest/v1/presentations?select=slug,status` → pouze published (teď `[]`).
(3) Výstupy (bez tokenů!) → `tasks/dukazy-izolace.txt` + screenshoty.
**OČEKÁVÁNÍ / PASS:** (1) nikde žádné datum B; (2) a) jen A, b–d) `[]`, e) 403/42501, f) chyba bez signedURL, g) ≠200, h) `[]`. Soubor důkazů existuje.
**SELHÁNÍ:**
- b)/h) vrátí koncept B → příčina: RLS volnější/vypnuté → protitah (JEDEN povolený): Karel `select policyname, qual from pg_policies where tablename='presentations';`, srovnat s init migrací, znovu spustit 20260704120000 (idempotentní). Nepomůže → **ABORT mise** (izolace bez zřejmého fixu), lessons.md, otázka Karlovi.
- f) vrátí funkční signedURL → příčina: `photos owner read` bez vazby na první složku → protitah: Karel znovu celý blok storage-setup.md; opakovat f+g; druhé selhání → ABORT jako výše.
- e) projde → **KRITICKÉ**: brána obejitelná vložením vlastní platby → ABORT stavby Stripe, Karel ověří policies na payments (má existovat JEN owner-SELECT), pak opakovat.
- Registrace účtů nejde (čeká na e-mail) → příčina: Confirm email + rate limit (~3–4/h na free) → protitah: plus-aliasy do Karlovy schránky; nebo Karel DOČASNĚ vypne Confirm email (vratné, jen on, zapsat do panelu, po testech vrátit).
**VĚTVE:** PASS → V3a; účty a data NEMAZAT (poslouží ve V3–V5, Stripe testech a admin regresi).

### Tah V3a — Publikační brána negativně (bez Stripe) — POVINNÁ VERIFIKACE 2, část 1
**AKCE:** (1) Anonymní okno (nejdřív ověř čistotu: `/account` → musí přesměrovat na `/login`) → `/listing/<slugB>` → „Prezentace není dostupná"; screenshot. (2) Vlastník B se pokusí přepnout stav bez platby (hlavičky jako ve V2: apikey + Authorization + Content-Type): `PATCH /rest/v1/presentations?id=eq.<idB>` s JWT B, `{"status":"published"}` → 4xx s hláškou triggeru o chybějící platbě; totéž `{"status":"paid"}` → 4xx; poté `GET …&select=status` → stále `draft`. Výstupy → `tasks/dukazy-brana.txt`.
**OČEKÁVÁNÍ / PASS:** anonym 404; oba PATCHe 4xx; status draft.
**SELHÁNÍ:**
- PATCH published projde → příčina: trigger v živé DB neběží/stará verze → protitah: zpět k 0.2 bodu b); Karel znovu 20260705150000 + 20260707121000; V3a celé zopakovat.
- Anonym vidí koncept → viz V2 ABORT větev.
**VĚTVE:** PASS → zelená pro Fázi 2 (Stripe). Část 3 verifikace 2 (pozitivní: po zaplacení a publikaci anonym vidí) se uzavírá až tahem S13.

### Tah M4 — Mazání prezentace (kaskáda + Storage úklid) + STOP na zaplacené
**AKCE:** Jako A: (1) obětní prezentace + 2 fotky; poznamenat `<id>` a storage cesty. (2) Smazat → confirm → Zrušit → zůstává. (3) Smazat → OK → karta zmizí bez `?error=` v URL. (4) Kaskáda: `/listing/<slug>` → 404 i pro vlastníka; `/edit` → „nenalezena". (5) Storage úklid — primárně KAREL v dashboardu: Storage → presentation-photos → složka `<idA>/<id-prezentace>` je prázdná/neexistuje. Alternativa bez Karla: `curl -s -X POST "$URL/storage/v1/object/list/presentation-photos" -H "apikey: $ANON" -H "Authorization: Bearer $JWT_A" -H 'Content-Type: application/json' -d '{"prefix":"<idA>/<id-prezentace>"}'` → `[]`. (supabase-js klient NENÍ v konzoli prohlížeče dostupný — aplikace ho neexportuje; nezkoušet.) (6) Mazání paid/published NETESTOVAT a NEMĚNIT — čeká na K5.
**OČEKÁVÁNÍ:** dle kroků; žádný `delete-failed`.
**SELHÁNÍ:**
- Karta pryč, ale soubory zůstaly → příčina: storage.remove selhal a jen se loguje (známé chování) — 403 = policy (Karel storage-setup), race = známý trade-off → zapsat, neopravovat.
- `?error=delete-failed` → příčina: RLS delete policy / kaskáda v živé DB → protitah: server log dev serveru ukáže přesnou DB chybu → příslušná migrace (Karel), opakovat.
**VĚTVE:** čisté → Fáze 1 hotová, řídicí panel, commit důkazů. K5 zodpovězeno „(a) zakázat" → nový malý tah: v `deletePresentation` kontrola statusu (smazat jen draft) + kódovaná česká hláška + panel + commit; NEimplementovat před odpovědí.

---

## 6. FÁZE 2 — Stripe: platba předem (modul 1)

Architektura (kotvy): hosted Stripe Checkout (redirect ze server action) → na klientu není žádný Stripe kód ani publishable key. Jediné klíče: `STRIPE_SECRET_KEY` (sk_test_), `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` — vše jen v `app/.env.local`. Zdroj pravdy o zaplacení = VÝHRADNĚ webhook `checkout.session.completed` (success_url nikdy nerozhoduje o stavu). Pořadí ve webhooku vynucené triggerem: INSERT payments(paid) → UPDATE presentations.

### Tah S2 — Migrace: idempotence webhooku v DB
**AKCE:** EXEKUTOR vytvoří `app/supabase/migrations/20260708090000_payments_webhook_idempotence.sql`: (1) `create unique index if not exists payments_provider_payment_uidx on public.payments (provider, provider_payment_id) where provider_payment_id is not null;` (parciální — staré NULL řádky nevadí); (2) sekce `-- ROLLBACK…: drop index if exists public.payments_provider_payment_uidx;`; (3) komentář: provider_payment_id = Checkout Session id (`cs_test_…`); opakované doručení = konflikt na indexu, ne druhý řádek. Tabulka zpracovaných eventů se NEZAVÁDÍ (jeden typ eventu + unique index stačí; tabulka = scope navíc). Rollback otestovat dle 0.3 (Docker cesta A). Aktualizovat `app/supabase/README.md`. Commit. KAREL: spustí v SQL editoru; OVĚŘENÝ ROLLBACK: spustí create → drop (rollback řádek) → `select indexname from pg_indexes where tablename='payments';` (index pryč) → create znovu.
**OČEKÁVÁNÍ:** „Success" při všech třech spuštěních; finálně index v pg_indexes; commit v repu.
**SELHÁNÍ:**
- create unique padá na duplicitách → příčina: duplicitní (provider, provider_payment_id) z ručních pokusů → protitah: Karel `select provider, provider_payment_id, count(*) … group by 1,2 having count(*)>1;` → exekutor navrhne úklid jako SAMOSTATNÝ Karlem schválený SQL (nikdy nemazat platební evidenci naslepo), pak migrace znovu.
- Karel přeskočí rollback test → protitah: v kroky-pro-karla.md označit jako POVINNÝ acceptance bod; fázi neuzavírat bez potvrzení create→drop→create.
**VĚTVE:** hotovo → S7 smí používat toleranci 23505.

### Tah S3 — Klíče: Stripe test mode + service_role (KAREL; exekutor jen návod a kontrola)
**AKCE:** KAREL (návod do kroky-pro-karla.md): (1) Stripe účet, přepnout **Test mode**; Developers → API keys → `sk_test_…` (NIKDY sk_live_). (2) Supabase → Project Settings → API → service_role (nové UI: „API Keys" → secret; obě varianty do návodu — RECON: přesnou cestu ověřit v aktuální Supabase dokumentaci). (3) Do `app/.env.local`: `STRIPE_SECRET_KEY=sk_test_…`, `SUPABASE_SERVICE_ROLE_KEY=…`, `PRESENTATION_PRICE_CZK=100` (VÝSLOVNĚ dočasná testovací hodnota — K1), `STRIPE_WEBHOOK_SECRET=` (doplní S9), `APP_ORIGIN=http://localhost:3000` (fallback pro návratové adresy z platby; produkční doména = K3/BLOCKED). EXEKUTOR: do `.env.local.example` JEN prázdné placeholdery s komentáři („sk_test_ POUZE; service_role NIKDY s prefixem NEXT_PUBLIC_"); pak `git status` + `git diff` → žádný soubor s hodnotou klíče.
**OČEKÁVÁNÍ:** env.local má 5 nových proměnných; `git status` ho neukazuje; example jen placeholdery; `grep -rn "sk_test\|sk_live" app --include='*.ts*' --include='*.example'` bez skutečné hodnoty.
**SELHÁNÍ:**
- Karel vloží sk_live_ → příčina: dashboard v Live mode → protitah: tvrdá kontrola prefixu v kódu (S5) checkout odmítne; krok „přepni do Test mode a vyměň klíč". Ostrý klíč se nikam nezapisuje.
- Klíč v git diffu (vložen do example) → **ABORT**: hodnotu odstranit PŘED commitem; `git log -p -- app/.env.local.example` — pokud byl commitnut, Karel klíč ROTUJE (smazání z historie nestačí).
- Proměnná pojmenovaná `NEXT_PUBLIC_…SERVICE_ROLE…` → STOP, okamžitě přejmenovat (NEXT_PUBLIC_ = odejde do prohlížeče).
**VĚTVE:** klíče na místě → S4–S7. Stripe účet zatím není → S4–S8 (kód) jedou, S9+ čeká (K10).

### Tah S4 — Instalace Stripe SDK (v čisté kopii, verze pinovaná)
**AKCE:** EXEKUTOR: (1) `npm view stripe version` (aktuální stabilní — z repa neověřitelné). (2) rsync kopie do /tmp; `npm install stripe@^<major>`; `npm run build`; `npm test`. (3) Zpět do repa POUZE package.json + package-lock.json. Commit. KAREL: u sebe `npm ci` v `app/` (kvůli dev serveru).
**OČEKÁVÁNÍ:** build „Compiled successfully"; testy 34 passed; dependency v package.json.
**SELHÁNÍ:**
- peer-dependency konflikt s Next 16 → protitah: o major níž (`npm view stripe versions`); pak changelog stripe-node (docs). Nikdy `--force`.
- testy < 34 → příčina: drift v kopii (rsync), ne Stripe → protitah: `diff -rq` kopie vs. originál; testy bez stripe — padají-li i tak, problém je předchozí → zapsat, neblokovat.
**VĚTVE:** zelené → S5.

### Tah S5 — Serverové základy: stripe klient, admin klient, cena ze serveru
**AKCE:** EXEKUTOR, 3 soubory: (1) `app/lib/stripe.ts` — `getStripe()`: čte `STRIPE_SECRET_KEY`, TVRDĚ vyhodí chybu, pokud chybí NEBO nezačíná `sk_test_` (pojistka proti ostrému klíči; uvolní se až vědomým krokem Karla při ostrém provozu); `new Stripe(key, { apiVersion: '<literal dle nainstalované SDK>' })`. (2) `app/lib/supabase/admin.ts` — `createAdminClient()`: `createClient<Database>(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })`; první řádky: `if (typeof window !== "undefined") throw new Error("admin klient jen na serveru")` (balíček server-only NEinstalovat — žádná nová závislost) + komentář „JEN Stripe webhook a /admin — nikdy pro běžné čtení"; helper `isAdminConfigured()`. TENTO soubor později sdílí Fáze 4. (3) `app/lib/pricing.ts` — `getPresentationPriceCzk()`: parsuje `PRESENTATION_PRICE_CZK`, vyhodí chybu při chybějící/nečíselné/nekladné hodnotě; komentář „dočasná testovací hodnota, finální cena = K1". Ověření: build v kopii + `grep -rn "supabase/admin" app/app` → import zatím nikde. Commit.
**OČEKÁVÁNÍ:** build zelený; žádná env hodnota v kódu.
**SELHÁNÍ:**
- build padá na volání admin klienta při statické analýze → příčina: volání na top-level modulu → protitah: createAdminClient volat VÝHRADNĚ uvnitř funkcí (lazy); admin/webhook routy `force-dynamic`.
- TS neakceptuje apiVersion → protitah: použít přesný literal z typové chyby (SDK zná svou verzi); žádné `as any`.
**VĚTVE:** zelené → S6 + S7 (nezávislé).

### Tah S6 — Server action: start Checkout Session
**AKCE:** EXEKUTOR přidá `startCheckout(presentationId)` do `app/app/presentations/actions.ts` (vzory z deletePresentation): (1) getUser → !user → redirect /login. (2) validace UUID. (3) SELECT přes běžný RLS klient `.eq('id', id).maybeSingle()` — vlastnictví hlídá RLS; `status === 'draft'` jinak redirect `?error=already-paid` (kódy, texty drží stránka). (4) `getStripe().checkout.sessions.create({ mode:'payment', line_items:[{ quantity:1, price_data:{ currency:'czk', unit_amount: getPresentationPriceCzk()*100 /* haléře! */, product_data:{ name:'Prodej si sám — publikace prezentace: <titulek/slug>' /* pracovní název; po K3 vyměnit, viz VĚTVE */ } } }], metadata:{ presentation_id:id, owner_id:user.id }, success_url:'<origin>/presentations?checkout=success', cancel_url:'<origin>/presentations?checkout=cancelled' })` — origin z request headers s fallbackem na env `APP_ORIGIN` (S3); dev = http://localhost:3000. (5) Stripe volání v try/catch → chyba = redirect `?error=checkout-failed`; `redirect(session.url)` MIMO try/catch (NEXT_REDIRECT je výjimka — nesmí ji spolknout catch). (6) `/presentations`: stavový pruh pro `?checkout=success` („Platba se zpracovává, stav se změní během chvilky") a `?checkout=cancelled` („Platba nedokončena, prezentace zůstává konceptem") — stav se NIKDY neodvozuje z query, jen z DB štítku. Commit.
**OČEKÁVÁNÍ:** klik (S8) → checkout.stripe.com, částka „100,00 Kč", název produktu, lišta TEST MODE; zrušení → cancel pruh, štítek „Koncept".
**SELHÁNÍ:**
- „amount too small" pro CZK → příčina: pod minimem Stripe (řádově ~15 Kč — přesně z hlášky/docs) → protitah: 100 Kč minimum splní; přetrvává-li, přečíst přesný limit a zapsat pro Karla (dolní mez ceny K1).
- checkout projde pro cizí prezentaci → to by bylo selhání RLS → **ABORT** (izolace), eskalovat, nefixovat potichu.
**VĚTVE:** není draft → kód already-paid; tlačítko se u ne-draftů vůbec nevykresluje (S8). `STRIPE_SECRET_KEY` chybí → getStripe vyhodí chybu → kód checkout-unavailable, stránka „Platby zatím nejsou zapnuté" (vzor degradace isSupabaseConfigured). K3 zodpovězena → vyměnit pracovní název v product_data (jednořádková změna + commit); název firmy na účtence nastavuje Karel ve Stripe dashboardu (Business settings) — jeho krok. K1 zodpovězena → Karel změní PRESENTATION_PRICE_CZK v .env.local, kód se nemění.
**FLAGS:** BLOCKED K1 (cena): stavět a testovat SMÍŠ s dočasnou 100 Kč výhradně v test mode i bez odpovědi — K1 blokuje jen finální částku a ostrý provoz. BLOCKED K3 (název): do odpovědi pracovní „Prodej si sám".

### Tah S7 — Webhook: podpis, zápis service_role, přechod na 'paid', idempotence
**AKCE:** EXEKUTOR vytvoří `app/app/api/stripe/webhook/route.ts`, `POST`: (1) `const body = await req.text()` (RAW tělo — první a jediné čtení!), `stripe-signature` header. (2) `stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)` v try/catch → selhání = 400. (3) POUZE `checkout.session.completed`: (a) `session.payment_status === 'paid'` (pojistka proti async metodám); (b) `metadata.presentation_id` chybí/není UUID → log + 200 (není náš event, neretryovat); (c) VALIDACE: `session.amount_total === getPresentationPriceCzk()*100` && `session.currency === 'czk'` — při NESOULADU insert payments se **status='pending'** A s `provider_payment_id: session.id` (idempotence platí i pro nesoulad — parciální index řádek kryje, retry nevyrobí druhý); NIKDY 'paid' — paid řádek by triggerem odemkl publikaci vlastníkovi! + error log + řádek do todo k prošetření, status prezentace NEměnit; (d) při souladu: `createAdminClient().from('payments').insert({ presentation_id, amount_czk: session.amount_total/100, currency:'czk', status:'paid', provider:'stripe', provider_payment_id: session.id, paid_at: new Date().toISOString() })` — chyba 23505 (index z S2): NEJDŘÍV `select status from payments where provider='stripe' and provider_payment_id=<session.id>`; je-li **'paid'** → pokračovat na (e) (idempotentní opakování); je-li **cokoli jiného** (např. 'pending' z větve c) → return 200 + log „event už evidován, čeká na prošetření" a NIC nepřepínat; (e) `update presentations set status='paid' where id=… and status='draft'` admin klientem — WHERE dělá update idempotentním (2. doručení = 0 řádků). (4) Ostatní event typy → 200 bez akce (204 Stripe nemá rád). Endpoint NIC nepublikuje — publikace = S13 po K4. (5) Vitest unit testy s `stripe.webhooks.generateTestHeaderString`: validní podpis → 200; špatný → 400; duplicitní session.id nad 'paid' řádkem → 1 řádek + update proběhne idempotentně; duplicitní session.id nad 'pending' řádkem → 200 BEZ přepnutí stavu; neznámý event → 200 (mock supabase). Commit. Pozn.: middleware matcher kryje /api/* — updateSession na webhook POSTu je neškodný, matcher NEMĚNIT.
**OČEKÁVÁNÍ:** build + testy zelené (34 + nové). Po S10: platný POST → 200, přesně 1 řádek payments (paid, stripe, cs_test_…), prezentace 'paid'; rozbitý podpis → 400, DB beze změny.
**SELHÁNÍ:**
- constructEvent „No signatures found…" u legitimního eventu → příčina: tělo parsováno před ověřením, NEBO whsec_ z jiného běhu `stripe listen` (mění se při každém startu) → protitah: req.text() jako první; whsec_ přesně z aktuálního listen výstupu. NIKDY neřešit vypnutím verifikace — ABORT.
- insert padá na RLS/permission → příčina: použit cookie klient místo createAdminClient, nebo špatný service_role klíč → protitah: import zkontrolovat; klíč Karel překopíruje. NIKDY nepřidávat INSERT policy na payments — ABORT.
- update padá check_violation → příčina: insert selhal tiše (FK — prezentace mezitím smazána) a kód přesto přepínal, NEBO živá DB bez migrace → protitah: kontrolovat výsledek insertu PŘED update; FK violation → log „platba bez prezentace" + 200 + todo pro Karla (refund otázka); chybějící migrace → zpět 0.2.
**VĚTVE:** `checkout.session.expired` dorazí → 200 bez akce (kryto unit testem). Nesoulad částky → viz (c), nikdy nepublikovat.

### Tah S8 — UI: tlačítko „Zaplatit" (jen u konceptů)
**AKCE:** EXEKUTOR: (1) `/listing/[slug]/page.tsx` — do existujícího owner-only banneru náhledu přidat tlačítko volající `startCheckout(id)` POUZE když `status === 'draft'` (explicitně — isPreview je true i pro 'paid'!). Adresa se NEMĚNÍ — jen prvek v existujícím banneru. (2) `/presentations/page.tsx` — na kartě se štítkem „Koncept" přidat akci „Zaplatit · 100 Kč" (form + server action, vzor DeleteButton; částka z getPresentationPriceCzk). (3) Text tlačítka NEUTRÁLNÍ „Zaplatit" — NEPSAT „a zveřejnit" (K4 nerozhodnuto). (4) Čtvrtý krok průvodce „Náhled a zveřejnění" NEstavět — jen kandidát do todo (závisí na K2/K4). Commit.
**OČEKÁVÁNÍ:** vlastník vidí tlačítko v banneru náhledu i na kartě konceptu; karty Zaplaceno/Publikováno ho NEMAJÍ; anonym na `/listing/<slug>` konceptu dál „Prezentace není dostupná".
**SELHÁNÍ:**
- tlačítko u statusu 'paid' → příčina: podmínka na isPreview místo status==='draft' → protitah: vázat na status; ověřit po S10 na zaplacené prezentaci.
- klik končí na /login → příčina: session vypršela — korektní chování → protitah: nic; ověřit, že po přihlášení jde opakovat a nic se neúčtovalo dvakrát.
**VĚTVE:** K2 = „náhled zdarma NEmá existovat" → změna viditelnosti náhledu je samostatný tah se svolením, mimo tento modul.
**FLAGS:** BLOCKED K1: tlačítko smí zobrazovat dočasnou částku 100 Kč (čte se z env) i bez odpovědi — po K1 stačí změnit PRESENTATION_PRICE_CZK, kód se nemění.

### Tah S9 — Stripe CLI: lokální doručování webhooků
**AKCE:** CLI na stroji CHYBÍ (ověřeno). KAREL (K10): `brew install stripe/stripe-cli/stripe`, `stripe login` (párování s účtem v TEST mode). Pak dva terminály: (T1) dev server (z čisté kopie, viz M1); (T2) `stripe listen --forward-to localhost:3000/api/stripe/webhook` → „Ready! Your webhook signing secret is whsec_…" → vložit do `app/.env.local` jako `STRIPE_WEBHOOK_SECRET` a RESTARTOVAT dev server (env se čte při startu).
**OČEKÁVÁNÍ:** T2 „Ready!…whsec_…"; T1 běží; po S10 v T2 řádky checkout.session.completed → [200].
**SELHÁNÍ:**
- listen „not configured API keys" → příčina: login neproběhl / jiný účet / live mode → protitah: `stripe login` znovu, `stripe config --list`.
- T2 dostává [400] → příčina: whsec_ z jiného běhu listen / dev server nerestartován → protitah: překopírovat aktuální whsec_, restart, opakovat.
- dev server na mountu padá → protitah: rsync kopie v /tmp, `npm ci && npm run dev`, .env.local přes cp; kód se edituje v repu a rsyncuje.
**VĚTVE:** brew/CLI nejde → **BLOCKED na K10**; fallback NENÍ deploy (deploy jen Karel) — zůstávají unit testy podpisu z S7 a S10–S14 stojí.

### Tah S10 — Ruční test: ÚSPĚŠNÁ platba (karta 4242…)
**AKCE:** KAREL + EXEKUTOR (ruční proklik POVINNÝ): (1) přihlásit testovací účet, `/presentations`, u konceptu „Zaplatit". (2) checkout.stripe.com (TEST MODE banner): karta `4242 4242 4242 4242`, budoucí expirace, libovolné CVC. (3) Zaplatit. (4) Sledovat: redirect `?checkout=success` s pruhem; T2: completed → [200]. (5) Obnovit — štítek „Zaplaceno". (6) KAREL SQL: `select status, provider, provider_payment_id, amount_czk, paid_at from public.payments order by created_at desc limit 5;` + `select id, status from public.presentations where id='<id>';`.
**OČEKÁVÁNÍ / PASS:** přesně 1 nový řádek payments (paid/stripe/cs_test_/100/paid_at); prezentace 'paid'; štítek „Zaplaceno"; Stripe dashboard (Test → Payments) ukazuje succeeded.
**SELHÁNÍ:**
- Stripe succeeded, ale štítek „Koncept" a payments prázdné → příčina: webhook nedorazil/spadl → protitah dle T2: nic = listen neběží/špatná URL; [400] = podpis (S9); [500] = stack v dev logu → oprava dle S7; event lze doručit znovu `stripe events resend <evt_id>`.
- payments řádek je, status zůstal draft → příčina: trigger (chybí migrace → 0.2) nebo id z metadata nesedí → protitah: porovnat metadata v Stripe dashboardu s DB.
**VĚTVE:** sedí → hned S11, S12, S14 na téže infrastruktuře (dokud běží listen).
**FLAGS:** BLOCKED K1: PASS hodnota amount_czk=100 odpovídá dočasné testovací ceně; po odpovědi K1 se očekávaná hodnota mění s env.

### Tah S11 — Ruční test: ZAMÍTNUTÁ karta (4000…0002)
**AKCE:** nový koncept → „Zaplatit" → karta `4000 0000 0000 0002` → sledovat checkout, T2, návrat na cancel_url. KAREL: stejné SQL.
**OČEKÁVÁNÍ / PASS:** checkout ukáže „declined", NEpřesměruje (lze zkusit jinou kartu); T2 bez completed (payment_intent.payment_failed může přijít — webhook vrací 200 bez akce); DB: žádný nový payments řádek, status draft; anonym: 404.
**SELHÁNÍ:**
- payments řádek přes zamítnutou platbu → příčina: webhook zpracovává jiné event typy / nekontroluje payment_status → protitah: opravit filtr; testovací řádek smazat Karlovým SQL; opakovat.
**VĚTVE:** po zamítnutí uživatel doplatí kartou 4242 → musí dopadnout jako S10 s JEDNÍM payments řádkem (Stripe drží stejnou session).

### Tah S12 — Ruční test: OPUŠTĚNÝ checkout + brána anonymem — POVINNÁ VERIFIKACE 2, část 2
**AKCE:** (1) „Zaplatit" → na checkoutu nic nevyplňovat, zavřít záložku. (2) `/presentations`: štítek „Koncept", žádný pruh. (3) SQL: žádný nový řádek. (4) BRÁNA: anonymní okno → `/listing/<slug>` konceptu → „není dostupná"; TOTÉŽ pro prezentaci ve stavu 'paid' ze S10 (zaplacená ≠ publikovaná!). (5) `stripe trigger checkout.session.expired` NEPOUŽÍVAT (syntetický event bez našich metadat; reálná expirace chodí ~24 h — chování kryje unit test z S7).
**OČEKÁVÁNÍ / PASS:** žádná stopa v DB; anonym: koncept i 'paid' prezentace = „Prezentace není dostupná"; vlastník náhled vidí.
**SELHÁNÍ:**
- anonym vidí 'paid' prezentaci → **ABORT** (brána prolomena): zastavit, nefixovat potichu; přečíst přesné znění policy v 20260704120000, nález + návrh opravné migrace pro Karla.
- po ~24 h expired event → chyba v logu → protitah: neznámé eventy vracet 200 (default větev + unit test).
**VĚTVE:** drží → důkazy do panelu; → S14.

### Tah S13 — STOP (K4): co po zaplacení — auto-publikace vs. tlačítko
**AKCE:** NESTAVĚT do odpovědi. Podklad pro Karla (laicky): A = webhook rovnou `published` + `published_at` (nemusí nic klikat; publikuje se i nedodělaný obsah) vs. B = webhook jen 'paid', uživatel dostane tlačítko „Publikovat" (na kartě + v náhledu; publikuje vědomě). Obě projdou triggerem. Implementace po odpovědi: A = rozšířit update v S7 (jediné místo); B = server action `publishPresentation` (RLS klient vlastníka — owner policy pustí update a trigger pustí díky platbě) + tlačítko jen u 'paid'. Pak ruční ověření: anonymní okno vidí plný obsah BEZ banneru náhledu; štítek „Publikováno".
**OČEKÁVÁNÍ:** odpověď K4 v todo; po implementaci prezentace ze S10 dojde do 'published' zvolenou cestou; anonym ji vidí (uzavírá VERIFIKACI 2 pozitivně).
**SELHÁNÍ:**
- (B) update na published vlastníkem padá check_violation → příčina: platba chybí/jiný status (trigger čte payments přes RLS vlastníka — owner-SELECT existuje, projít má) → protitah: SQL na payments; existuje-li paid a přesto padá → rozpor = nález, eskalovat, NEobcházet service_role klientem.
- Karel neodpovídá → moduly 2 a 3 na K4 nezávisí — pokračovat tam; tah zůstává STOP v todo.
**VĚTVE:** A → rozšířit S7, znovu projet S10 + anonym. B → action + tlačítko; test: publikovat, anonym vidí; tlačítko není u 'draft' ani 'published'.

### Tah S14 — Ruční test IDEMPOTENCE: stejný event 2× — POVINNÁ VERIFIKACE 3, jádro
**AKCE:** (listen běží): (1) id eventu ze S10 (`stripe events list --limit 5` nebo T2 výstup → `evt_…`). (2) `stripe events resend evt_…`. (3) T2: → [200]. (4) KAREL SQL: `select count(*) from public.payments where provider_payment_id='cs_test_…';` + status prezentace. (5) Resend ještě jednou (celkem 3 doručení).
**OČEKÁVÁNÍ / PASS:** po každém resendu [200]; count = 1; status beze změny; žádná 500 v logu; ve Stripe dashboardu ŽÁDNÁ druhá platba (resend znovu doručuje zprávu, neúčtuje).
**SELHÁNÍ:**
- count = 2 → příčina: migrace S2 v živé DB neběží, nebo insert jde mimo indexované sloupce → protitah: `select indexname from pg_indexes where tablename='payments';`; chybí → spustit S2 + duplicitu smazat schváleným SQL; existuje → porovnat hodnoty provider/provider_payment_id obou řádků (překlep v route).
- resend → [500] → příčina: 23505 považováno za fatal → protitah: route dle S7(d): 23505 → pokračovat na idempotentní update → 200; unit test na větev.
**VĚTVE:** drží → S15.

### Tah S15 — Uzávěrka fáze 2
**AKCE:** EXEKUTOR: (1) každý tah S2–S8 má commit; `git log -p | grep -ci "sk_test\|whsec_\|service_role"` → historie bez tajemství. (2) todo.md: checkboxy S2–S15 se stavem (S1 v číslování záměrně není — prerekvizity kryje Fáze 0). (3) ClickUp zrcadlo (fallback kroky-pro-karla.md). (4) Řídicí panel (šablona sekce 12): souhrn „zaplatíš testovací kartou a prezentace se označí Zaplaceno; publikace čeká na K4", riziko „test mode = žádné skutečné peníze; ostrý provoz vyžaduje Tvé klíče, cenu a V7 PASS", rollback „git revert commitů fáze + ROLLBACK sekce migrace S2 (spouští Karel)", ověřovací cesta (klikací: Zaplatit → 4242 → štítek Zaplaceno; anonymní okno → nedostupná), další krok Karla (K4 + připomenout K1/K2/K8). (5) Push NE bez pokynu.
**OČEKÁVÁNÍ:** čistý `git status`; historie bez tajemství; dokumentace aktuální; Karel má panel.
**SELHÁNÍ:** grep najde klíč v historii → **ABORT**: nic nepushovat, Karel klíč rotuje, čištění historie = samostatný schválený krok. ClickUp neběží → fallback.

---

## 7. FÁZE 3 — Auth dotažení + zbytek správy (modul 3)

### Tah M5 — Auth e2e: registrace, potvrzení, login, logout — POVINNÁ VERIFIKACE 4, část 1
**AKCE:** EXEKUTOR + KAREL (schránka): (1) anonymní okno → `/login` → registrace `zabijakzbronxu+wg-reg@gmail.com`, heslo 6+ → čekej redirect `?message=„Účet vytvořen…"`. (2) KAREL: v e-mailu NEklikat hned — zkopírovat URL exekutorovi (ověření tvaru `/auth/confirm?token_hash=…&type=…`), pak otevřít. (3) Přistání na `/account` (přihlášen). (4) Odhlásit (tlačítko na /account existuje) → `/login`; zpět na `/account` → redirect `/login` (guard). (5) Login špatným heslem → chyba se zobrazí (surová anglická — nález pro M9, ne blocker); správným → `/account`. (6) Registrace existujícího e-mailu → zapsat přesné chování (podklad k user-enumeration nálezu).
**OČEKÁVÁNÍ / PASS:** celý řetěz projde; e-mail dorazí (default Supabase SMTP: minuty, limit ~2–4/hod!).
**SELHÁNÍ:**
- e-mail nedorazí do 10 min → příčina: rate limit / spam → protitah: spam + Auth → Rate limits/Logs; počkat hodinu NEBO Karel dočasně vypne Confirm email (vratné, jen on, po testech vrátit).
- odkaz vede na `<projekt>.supabase.co/auth/v1/verify` místo `/auth/confirm` → příčina: šablona „Confirm signup" není v token_hash tvaru → protitah: Karel nastaví `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/account`; nový alias, opakovat.
- „Odkaz je neplatný nebo vypršel" → příčina: Site URL míří jinam, nebo token spotřeboval e-mailový prefetch → protitah: Karel ověří Site URL + Redirect URLs; nový alias, odkaz otevřít jen jednou.
**VĚTVE:** Confirm email vypnuto → kroky 2–3 se přeskočí; verifikaci potvrzení e-mailu označit NEPROVEDENOU + otázka Karlovi, zda zapnout a opakovat.

### Tah M6 — Reset hesla: minimální Supabase flow (STAVĚT AŽ PO ANO na K6)
**AKCE:** Nová obrazovka = změna chování; K6 opřená o povinnou verifikaci 4 — implementace až po Karlově ANO. Rozsah (nic navíc): (1) `/login`: odkaz „Zapomenuté heslo?" → `/forgot-password`. (2) Nová `app/app/forgot-password/page.tsx + actions.ts`: e-mail formulář → `resetPasswordForEmail(email, { redirectTo: '<origin>/auth/confirm?next=/account/update-password' })`; po odeslání VŽDY stejná neutrální hláška „Pokud e-mail existuje, poslali jsme odkaz" (žádná user enumeration). (3) Nová `app/app/account/update-password/page.tsx + actions.ts`: guard getUser (bez session → /login); nové heslo 2× (min 6, shoda); `auth.updateUser({ password })`; úspěch → `/account?message=heslo-zmeneno` (kódovaně). (4) `/auth/confirm` NEMĚNIT — type=recovery už verifyOtp zvládá a safeNextPath interní next pustí. (5) Styl dle /login (tmavý). (6) Vitest na validaci hesel. (7) Commit + řídicí panel. KAREL: šablona „Reset Password" → `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/account/update-password` + Redirect URLs allowlist.
**OČEKÁVÁNÍ:** build + testy zelené; stránky se vykreslí; update-password bez session přesměruje.
**SELHÁNÍ:**
- „redirect URL not allowed" → příčina: redirectTo mimo allowlist → protitah: Karel přidá localhost (finální doména je K3/BLOCKED — allowlist zatím bez ní).
- po odkazu přistání na `/account` místo update-password → příčina: šablona bez next / fallback safeNextPath → protitah: Karel ověří šablonu; porovnat celou příchozí URL s očekávaným tvarem.
**VĚTVE:** hotovo + šablona nastavená → M7. Karel šablonu teď nenastaví → M7 ODLOŽENO, verifikace 4 NEsplněná — blokující položka před ostrým provozem.
**FLAGS:** ABORT dodatek: úprava verifyOtp logiky v `/auth/confirm` by se ukázala nutná → zastavit a nahlásit (riziko rozbití potvrzování registrace).

### Tah M7 — Reset hesla e2e (pozitivní i negativní) — POVINNÁ VERIFIKACE 4, část 2
**AKCE:** (1) anonymní okno → „Zapomenuté heslo?" → `+wg-a` alias → neutrální hláška. (2) KAREL: URL z e-mailu zkopírovat (kontrola tvaru), otevřít v TOM SAMÉM anonymním okně. (3) `/account/update-password` → nové heslo 2× → `/account`. (4) Odhlásit; staré heslo → chyba; nové → `/account`. (5) Tentýž odkaz podruhé → „Odkaz je neplatný nebo vypršel." (6) update-password v čerstvém anonymním okně → redirect /login. (7) forgot-password s neexistujícím e-mailem → STEJNÁ neutrální hláška.
**OČEKÁVÁNÍ / PASS:** kompletní řetěz + všechny 3 negativní scénáře přesně dle popisu.
**SELHÁNÍ:**
- e-mail nedorazí → rate limit sdílený s M5 → protitah: plánovat M5/M7 tak, ať limit nespálí najednou; dlouhodobě „vlastní SMTP před ostrým provozem" jen jako task do todo (mimo MVP).
- použitý odkaz podruhé PŘIHLÁSÍ → bezpečnostní nález → nahlásit Karlovi před pokračováním.
**VĚTVE:** zelené → M8.

### Tah M8 — Expirace session + refresh token — POVINNÁ VERIFIKACE 4, část 3
**AKCE:** Test A (vždy proveditelný): přihlášen na `/presentations` → DevTools → Application → Cookies → smazat všechny `sb-*` → tvrdý reload (Cmd+Shift+R) → redirect `/login`; totéž `/account`, `/presentations/<id>/edit`. Test B (jen po Karlově souhlasu — globální nastavení projektu; podmínka: v projektu JEN testovací účty): Karel dočasně JWT expiry na 60 s → login → 2 min nečinnosti → klik na odkaz → zůstává přihlášen (middleware tiše obnovil session). Test C: login ve 2 prohlížečích; v prvním odhlásit; ve druhém po vypršení JWT klik → `/login`. Po testech Karel expiry VRÁTÍ.
**OČEKÁVÁNÍ / PASS:** A: vždy redirect, nikdy data ani 500; B: refresh neviditelný; C: po globálním odhlášení druhý prohlížeč skončí na /login.
**SELHÁNÍ:**
- B: vyhozen po 2 min → příčina: middleware neběží pro cestu / zápis cookies selhává → protitah: matcher v `app/middleware.ts` + server log; refresh přesto selhává → přesné chování + hlavičky zapsat, nález pro Karla, neopravovat naslepo.
- A: stránka zobrazí data → příčina: bfcache/router cache → protitah: tvrdý reload + nová navigace URL; i plný server request vrací data → reálný guard fail → **nahlásit okamžitě** (únik).
**VĚTVE:** A+B+C zelené → verifikace 4 KOMPLETNÍ. Jen A (Karel nechce expiry měnit) → B/C ODLOŽENO na testovací projekt (vznikne při V7 cestě B), verifikace 4 se hlásí jako ČÁSTEČNÁ.

### Tah M9 — České kódované hlášky přihlášení (PO ANO na K9; volitelný NADSTANDARD mimo 3 MVP moduly)
**AKCE:** po schválení: v `app/app/login/actions.ts` nahradit surové hlášky kódy (`?error=invalid-credentials` / `email-not-confirmed` / `rate-limited`; mapování na serveru dle error.message/status); page mapuje kódy na české texty, neznámý kód → obecná hláška (nikdo nepodvrhne text přes URL — vzor delete-failed už v repu). Nové stránky z M6 kódovaně od začátku. Vitest na mapování; existující testy upravit v témže commitu (34 musí zůstat zelených). Commit + mini panel.
**OČEKÁVÁNÍ:** špatné heslo → „Nesprávný e-mail nebo heslo."; `/login?error=PodvrzenyText` → jen obecná hláška.
**SELHÁNÍ:**
- Existující vitest test padne na starý tvar redirect URL → příčina: testy asertují surové hlášky → protitah: upravit testy v TÉMŽE commitu; 34 testů musí zůstat zelených, jinak revert celého commitu.
- Ztratí se rozlišení specifických chyb (např. „Email not confirmed") → příčina: příliš hrubé mapování → protitah: rozlišit kódy invalid-credentials / email-not-confirmed / rate-limited dle error.message/status na serveru.
**VĚTVE:** Karel neodpoví → otevřený task v todo, NEblokuje M10. Schválením K9 se tah stává zadáním od Karla (abort č. 5 se na něj pak nevztahuje); bez schválení se vypouští bez následků pro uzávěrku mise.

### Tah M10 — Uzávěrka fáze 3
**AKCE:** todo.md checkboxy tahů M1, M2, M4–M9 + odkaz na V2/V3a z Fáze 1 (M3 v číslování záměrně není — izolaci kryje V2); stavy OVĚŘENO / DOPLNĚNO / ODLOŽENO / STOP; ClickUp zrcadlo (fallback kroky-pro-karla.md); řídicí panel s acceptance checkem pro Karla: přihlásit → Moje prezentace → upravit → smazat obětní koncept → odhlásit → „Zapomenuté heslo" → e-mail → nové heslo → přihlásit novým. Commit. Připomenout nevyřízené: push, K5, K8, K9.
**OČEKÁVÁNÍ:** todo.md odpovídá realitě (žádný checkbox „hotovo" bez důkazu v panelu); ClickUp (nebo kroky-pro-karla.md) zrcadlí; commit v git logu; Karel má panel s klikací cestou.
**SELHÁNÍ:**
- ClickUp konektor neběží → příčina: MCP výpadek (známé) → protitah: fallback kroky-pro-karla.md se sekcí „přenes do ClickUpu".
- Commit selže na stale .lock → příčina: sandbox nechává locky → protitah: přesun na *.stale (nikdy rm), opakovat.

---

## 8. FÁZE 4 — Admin pro Karla (modul 2)

**Rozhodnutí architektury (wargame, ověřeno z repa):** identifikace admina = **service_role klient VÝHRADNĚ na serveru v /admin stránkách + shoda `user.id` s `ADMIN_USER_ID` z env**. ŽÁDNÁ migrace, ŽÁDNÁ změna RLS. Proč ne sloupec `is_admin` v profiles: (1) RLS policy „profiles update own" (init migrace, řádky 181–183) je FOR UPDATE na CELÝ řádek — uživatel by si `is_admin=true` nastavil sám; ochrana = další trigger/column-privileges migrace s rollbackem a rozšířeným izolačním testem. (2) Admin potřebuje e-maily uživatelů; profiles e-mail záměrně NEukládá a auth.users je přes RLS nedostupná — e-maily dá jen `auth.admin` API se service_role, takže sloupec by service_role stejně potřeboval. (3) Bez zásahu do RLS se izolační plocha nerozšiřuje. (4) service_role klíč už existuje kvůli webhooku (S3/S5) — žádná nová třída tajemství. Shoda přes UUID, ne e-mail (e-mail může obsadit cizí registrace). Fail-closed: bez env je /admin 404 pro všechny. Rozsah MVP: READ-ONLY.

### Tah A1 — Zápis rozhodnutí + otázka K7
**AKCE:** do todo.md sekce „Modul Admin" s checkboxy A1–A7 + laický odstavec rozhodnutí (viz výše); ClickUp zrcadlo; položit K7 (pokud ještě nezodpovězena) a POČKAT — bez ní nejde A2 dokončit.
**OČEKÁVÁNÍ:** todo.md obsahuje sekci Modul Admin s checkboxy a odstavcem „Rozhodnutí: identifikace admina" srozumitelným pro nekodéra; K7 položena; `git status` ukazuje změny jen v tasks/*.
**SELHÁNÍ:**
- ClickUp neběží → příčina: výpadek konektoru → protitah: fallback kroky-pro-karla.md.
- Karel odpoví „chci admin práva v databázi" → příčina: preference vlastníka → protitah: respektovat, ale PŘED implementací laicky vysvětlit díru (dnešní pravidlo v DB by uživateli dovolilo zapnout si admin práva samému) + nutnost ochranné migrace s rollbackem a rozšířeným izolačním testem; přeplánovat až po jeho potvrzení.
**VĚTVE:** Karel odpoví e-mailem bez registrovaného účtu → krok 0 do kroky-pro-karla.md: registrovat se tímto e-mailem na /login. Karel chce víc adminů → `ADMIN_USER_IDS` (UUID čárkami, includes()). Karel trvá na is_admin v DB → respektovat, ale PŘED implementací laicky vysvětlit díru „profiles update own" + nutnost ochranné migrace; přeplánovat až po jeho potvrzení.

### Tah A2 — Env: ADMIN_USER_ID (service_role už je z S3)
**AKCE:** EXEKUTOR: do `.env.local.example` placeholder `ADMIN_USER_ID=` (komentář: „UUID Karlova účtu: Supabase → Authentication → Users → User UID"); `git check-ignore app/.env.local` ověřit. KAREL: Authentication → Users → svůj účet → zkopírovat User UID → do `app/.env.local`; restart dev serveru. Exekutor ověří jen EXISTENCI (`grep -c '^ADMIN_USER_ID=.' app/.env.local` → 1), hodnoty nikdy nevypisovat.
**OČEKÁVÁNÍ:** `git diff` ukazuje změnu JEN v `.env.local.example` (placeholder bez hodnoty); `git check-ignore app/.env.local` vypíše cestu; po Karlově kroku grep vrátí 1 (hodnota se nikdy neobjeví v konverzaci ani logu).
**SELHÁNÍ:** env.local ve `git status` → **ABORT** (secret v gitu): `git rm --cached`, opravit .gitignore, `git log --all -- app/.env.local`; byl-li commitnut → Karel rotuje klíče.

### Tah A3 — Guard requireAdmin() (bez migrace)
**AKCE:** `app/lib/admin-guard.ts` — `requireAdmin()`: přes STÁVAJÍCÍ cookie klient getUser(); `!user || user.id !== process.env.ADMIN_USER_ID || !isAdminConfigured()` → `notFound()` (vzor v repu). Vrací user. `app/lib/supabase/admin.ts` UŽ EXISTUJE z S5 — jen použít (kdyby Fáze 4 běžela před Fází 2, vytvořit ho dle S5 tady). Vitest na čistou porovnávací funkci. Build + testy v kopii.
**OČEKÁVÁNÍ:** `git diff --stat` NEOBSAHUJE nic v migrations/ ani změny stávajících stránek; grep `createAdminClient` v app/app zatím nic.
**SELHÁNÍ:** build padá na env při statické analýze → createAdminClient jen lazy uvnitř funkcí; /admin stránky `force-dynamic`.
**VĚTVE:** ukáže se potřeba JAKÉKOLI migrace/RLS změny → STOP, zpět k A1, zapsat důvod (signál scope creepu).

### Tah A4 — Stránky /admin (tmavé, read-only)
**AKCE:** 4 server-component stránky pod `app/app/admin/`, KAŽDÁ: isSupabaseConfigured → `await requireAdmin()` (PRVNÍ await!) → teprve createAdminClient; `force-dynamic`; styl z presentations/ui.tsx (tmavý). ŽÁDNÉ mutace, formuláře, akční tlačítka. (1) `/admin`: dlaždice počtů (profiles; presentations po statusech; payments po statusech) + odkazy + štítek „ADMIN — jen ke čtení". (2) `/admin/users`: e-mail (`adminClient.auth.admin.listUsers({ page:1, perPage:200 })` — RECON: signaturu ověřit v docs supabase-js 2.50.0, nepsat z paměti), jméno+telefon (join s profiles v paměti přes Map), počet prezentací, created_at; poznámka „zobrazeno prvních 200". (3) `/admin/presentations`: titulek, slug jako odkaz na `/listing/<slug>` (target=_blank — adresa se NEMĚNÍ), štítek statusu (mapa z presentations/page.tsx), e-mail vlastníka, created_at desc. (4) `/admin/payments`: prezentace, amount_czk, currency, status, provider, provider_payment_id, paid_at; prázdný stav „Zatím žádné platby". Tabulky v kontejneru overflow-x auto. Česky.
**OČEKÁVÁNÍ:** admin vidí: počty souhlasí s DB (Karel: SELECT count v SQL editoru), users obsahuje e-maily VČETNĚ těch, co nejsou v profiles (důkaz service_role), presentations ukazuje prezentace VŠECH (i cizí koncept), payments ukazuje platby ze Stripe testů. Žádné akční tlačítko.
**SELHÁNÍ:**
- users prázdné / „User not allowed" → příčina: anon klient místo service_role / env nenačtené → protitah: import createAdminClient; restart dev serveru; dočasně `console.log(Boolean(...))` — NIKDY hodnotu.
- presentations ukazuje jen adminovy → příčina: dotaz jde cookie klientem (RLS) → protitah: data VÝHRADNĚ přes createAdminClient (cookie klient jen na identitu v guardu).
- listUsers vrací max 50 → příčina: default perPage → protitah: explicitně perPage:200 + přiznat v UI; stránkování mimo MVP.
**VĚTVE:** chuť přidat akce (mazání, blokace, refund) → NEPŘIDÁVAT (scope creep = abort); návrh do ClickUpu.

### Tah A5 — Ochrana route klikem: admin vidí vše, ostatní 404
**AKCE:** (1) jako Karel-admin: `/admin`, `/admin/users`, `/admin/presentations`, `/admin/payments` → vše se vykreslí, v prezentacích je i koncept uživatele B. (2) jako uživatel B: všechny 4 URL → 404 (HTTP 404 v Network tabu; NE redirect na /login, NE prázdná kostra). (3) anonym: `/admin` → 404. (4) Únik klíče: v čisté build kopii `grep -r "SUPABASE_SERVICE_ROLE_KEY" .next/static/` → 0; View Source /login a /listing → bez klíče (prvních 8 znaků čte KAREL, do konverzace se nepíší).
**SELHÁNÍ:**
- B vidí kostru / redirect místo 404 → příčina: guard po renderu / redirect místo notFound → protitah: requireAdmin PRVNÍ await + notFound(); nejde-li do jednoho protitahu → ABORT (izolace).
- admin dostane 404 → příčina: ADMIN_USER_ID nesedí (překlep/mezera/jiný účet) / env nenačtené → protitah: Karel znovu zkopíruje UID, restart; dočasný server log porovnávaných UUID (nejsou tajemství), po opravě smazat.
**VĚTVE:** grep najde název proměnné v .next/static → import admin.ts z klientské komponenty → najít, přerušit, rebuild; dokud nález trvá, NEcommitovat.

### Tah A6 — Izolační regrese — POVINNÁ VERIFIKACE 1, opakování po adminu
**AKCE:** (1) Statický důkaz: diff modulu NEOBSAHUJE migrations/, změny server.ts/middleware/stávajících stránek — jen app/app/admin/**, lib/admin-guard.ts, .env.local.example, testy, tasks/*. Žádné route.ts v admin. (2) Klikací důkaz: jako B → `/listing/<slug konceptu admina>` → 404; anonym totéž; jako B `/presentations` → jen vlastní. Zapsat do panelu.
**SELHÁNÍ:** B vidí cizí data → NENÍ následek adminu (RLS se neměnila) — nesoulad živé DB s repem → **ABORT** + okamžitě Karel (dashboard → Policies vs. migrace). Diff mimo whitelist → vrátit (`git checkout -- <soubor>`), nebo nutnou změnu vypsat v panelu + proklik průvodce, že nic nerozbila.

### Tah A7 — Uzávěrka fáze 4
**AKCE:** build+testy v kopii; commit POUZE whitelist; PŘED commitem `git diff --cached | grep -i "service_role\|eyJ"` → nic; todo/ClickUp; řídicí panel: souhrn („máš stránku /admin; vidíš všechny uživatele, prezentace a platby; nikdo jiný ji neuvidí"), riziko („service_role = generální klíč k DB; žije jen v .env.local; Vercel env = Tvůj vědomý krok, zatím se nedělá"), rollback („git revert <commit>; smazáním ADMIN_USER_ID z .env.local admin zmizí — fail-closed"), ověřovací cesta (přihlas se → /admin → počty; odhlas → /admin → stránka neexistuje), další krok Karla (potvrdit čísla; K7 read-only potvrzení). NEpushovat.
**OČEKÁVÁNÍ:** build i testy v /tmp kopii zelené (34 + nové); `git log -1 --stat` ukazuje jen whitelist soubory; `git status` čistý; Karel má panel; NEpushnuto.
**SELHÁNÍ:**
- npm ci v kopii padá → příčina: kopie omylem na mountu / lock nesoulad → protitah: ověřit cestu kopie mimo Desktop; `npm install`; přetrvává → build jako přesný příkaz pro Karla do kroky-pro-karla.md.
- Stale git .lock blokuje commit → protitah: přesun na *.stale (nikdy rm), opakovat.
**VĚTVE:** grep před commitem najde klíč → ABORT commitu, git reset, najít únik, Karel rotuje, pak commit. Čísla nesedí → porovnat s `select count(*)` v SQL editoru, opravit dotaz, re-test A5.

---

## 9. Povinné verifikace — kde se plní a jak vypadá PASS

| # | Verifikace | Tahy | PASS (klikací definice) | Důkaz |
|---|---|---|---|---|
| 1 | Izolace dat | V2 (+M2, A6 regrese) | B nikde nevidí data A: UI prázdné/nenalezena, REST `[]`/401/403, signedURL na cizí fotku selže, anonym na koncept 404; POST payments cizím JWT → 401/403; po admin modulu vše znovu drží | `tasks/dukazy-izolace.txt` + screenshoty |
| 2 | Publikační brána | V3a, S12, S13 | Anonymní okno: koncept 404, 'paid' 404; PATCH na paid/published bez platby → 4xx a status draft; PO zaplacení+publikaci (K4) anonym vidí plnou stránku bez banneru | `tasks/dukazy-brana.txt` |
| 3 | Stripe test mode | S10, S11, S12, S14 | 4242 → přesně 1 paid řádek + štítek Zaplaceno; 4000…0002 → declined, DB beze změny; opuštěný checkout → beze stopy; `stripe events resend` 2× → count=1, [200], žádné dvojí účtování; nepodepsaný POST → 400. Ruční proklik proveden (ne jen testy) | `tasks/dukazy-stripe.txt` + screenshoty |
| 4 | Auth e2e | M5, M7, M8 | Registrace vč. potvrzovacího e-mailu → /account; logout+guard; reset hesla: e-mail → nové heslo → staré nefunguje, nové ano, použitý odkaz podruhé selže; smazání sb-* cookies → redirect /login (+ B/C refresh testy, jinak ČÁSTEČNÁ) | zápis v panelu fáze 3 |
| 5 | Migrace s rollbackem | 0.3, S2 | Nová migrace: aplikace → ROLLBACK → re-aplikace bez chyby (Docker cesta A, jinak begin/rollback cesta B se zápisem „slabší důkaz"); Karel potvrdil create→drop→create v živé DB | výstupy v panelu + kroky-pro-karla evidence |
| 6 | Backup + obnova | 0.4 (V7) | pg_dump doběhl; obnova do izolovaného cíle; kontrolní SELECTy identické na obou stranách; datum PASS zapsáno do BACKUP.md; VŠE PŘED prvními reálnými daty | `tasks/dukazy-zaloha.txt` |

---

## 10. Abort podmínky (stop a flag, žádná improvizace)

Z mise (vždy platné):
1. Tah by měnil chování produktu bez Karlova svolení (RULES.md pravidlo 2).
2. Secret/API klíč by měl skončit v kódu nebo gitu.
3. RLS/izolační test selže a fix není zřejmý do JEDNOHO protitahu.
4. Cokoli kolem plateb se chová jinak, než dokumentace Stripe předpovídá (ověřit proti docs.stripe.com, pak teprve otázka).
5. Tah přidává modul mimo MVP seznam.
6. `/listing/<slug>` by se měl měnit — ROZHODNUTO, adresa se nemění.

Doplňky z wargame (projektová specifika):
7. `sk_live_`/`pk_live_` KDEKOLI (repo, example, historie, návrh Vercel env) → abort + rotace klíče Karlem.
8. Návrh vypnout/oslabit/obejít ověření podpisu webhooku „aby testy prošly" → abort.
9. Potřeba INSERT/UPDATE RLS policy na payments pro anon/authenticated → abort (zapisuje jen service_role z webhooku).
10. Oslabení triggeru enforce_paid_before_publish nebo policy „public read published" kvůli průchodu flow → abort (jádro brány).
11. Jediná zbývající cesta k testu = deploy na veřejnou URL → abort a čekat na Karla.
12. Anonym KDYKOLI vidí obsah prezentace se statusem draft nebo paid → abort, eskalovat, nefixovat potichu.
13. npm ci/install/build přímo na mountu Desktopu → přerušit; vždy čistá kopie v /tmp.
14. Stale git .lock → nikdy rm; přesun na *.stale; brání-li i pak → stop, Karel.
15. V1 FAIL → žádné migrace, žádné testy proti živé DB, žádná stavba Stripe, dokud Karel nedorovná a V1 neprojde.
16. DB dump nebo soubor s daty uživatelů míří do repa/gitu → abort; dumpy jen scratchpad, po drillu smazat.
17. service_role klíč / whsec_ / connection string KDEKOLI mimo app/.env.local (kód, commit, log, dukazy-*.txt, ClickUp) → abort + rotace.
18. V živé DB se objeví reálná data skutečných uživatelů → destruktivní kroky stop; dál jen po V7 PASS a s Karlovým souhlasem.
19. Stejná verifikace selže 2× i po protitahu → stop tahu, zápis do lessons.md, přesná otázka Karlovi — žádné třetí slepé opakování.
20. Admin by vyžadoval migraci/změnu RLS, nebo by se createAdminClient použil mimo /admin a webhook → abort, zpět k A1.
21. Úprava verifyOtp logiky v /auth/confirm by se zdála nutná → stop a nahlásit (rozbil by se confirm registrace).
22. Testovací účty a prezentace po misi NEmazat bez Karla (admin je používá jako demo data).

---

## 11. RECON NEEDED — registr (co wargame nevyřešila a přesný check)

| Předpoklad | Check | Kdo | Stav při wargame 2026-07-07 |
|---|---|---|---|
| Živá DB má 5 migrací + zpřísněné Storage policies | `tasks/verifikace-db.sql` v SQL editoru (tah 0.2) | Karel | NEZNÁMO (kroky-pro-karla.md je nepotvrzené) |
| app/.env.local existuje s NEXT_PUBLIC_* klíči | `ls app/.env.local && git check-ignore app/.env.local` (obsah nečíst) | exekutor | **NEEXISTUJE** → P1 |
| Stripe CLI | `command -v stripe && stripe version` | exekutor/Karel | **CHYBÍ** → K10 (brew install) |
| Docker daemon běží | `docker info >/dev/null 2>&1 && echo OK` | exekutor | binárka JE, daemon neověřen |
| pg_dump/psql | `command -v pg_dump psql` | exekutor | **CHYBÍ** → fallback Docker kontejner / brew libpq |
| `next dev` běží přímo na mountu | zkusit po Karlově npm ci; padá → kopie v /tmp | exekutor | neověřeno (lessons kryje jen npm install/build) |
| Verze npm balíčku stripe kompatibilní s Next 16.2.10 | `npm view stripe version` + build v kopii (S4) | exekutor | neověřeno |
| Supabase Auth: Confirm email zap/vyp; šablony Confirm signup + Reset password (token_hash tvar); Site URL + Redirect URLs; rate limit e-mailů | Karel opíše/vyfotí dashboard → Authentication (Sign In/Up, Email Templates, URL Configuration, Rate limits) — PŘED M5 | Karel | NEZNÁMO |
| Signatura `auth.admin.listUsers` v supabase-js 2.50.0 | oficiální docs před psaním A4 — nepsat z paměti | exekutor | neověřeno |
| Přesná cesta k service_role klíči v aktuálním Supabase UI | aktuální Supabase docs → doslovný postup do kroky-pro-karla.md | exekutor | UI se mění (legacy „service_role" vs. „Secret keys") |
| ClickUp konektor běží | `clickup_get_list` na 901219290922 (tah 0.1) | exekutor | v minulých sessions výpadky |
| Stránky photos/texts mají pro cizí ID stejný bezpečný fallback jako edit | grep na maybeSingle/fallback + klik ve V2 | exekutor | z repa ověřen jen edit |
| V projektu jsou jen testovací účty (podmínka pro JWT expiry test M8) | Karel: Authentication → Users | Karel | NEZNÁMO |
| Gmail plus-aliasy smí chodit do Karlovy schránky | potvrdit s Karlem před M1 | Karel | NEZNÁMO |
| Minimální částka Stripe pro CZK < 100 Kč | první sessions.create (S6/S10); chyba „amount too small" → přečíst limit | exekutor | neověřeno (řádově ~15 Kč) |
| Verze Postgresu živé DB (volba pg_dump Docker image) | Karel: SQL editor `select version();` (součást tahu 0.4) | Karel | NEZNÁMO |
| Tarif Supabase free vs. Pro | K8 | Karel | NEZNÁMO |

---

## 12. Šablona řídicího panelu fáze (povinná uzávěrka každé fáze)

Vkládá se do odpovědi Karlovi i do tasks/todo.md:
1. **LAICKY:** co se změnilo a proč (2–3 věty bez žargonu).
2. **RIZIKO:** co nejhoršího se může pokazit a koho to zasáhne.
3. **ROLLBACK:** přesné kroky návratu (git revert <hash>; u migrace odkaz na její `-- ROLLBACK` sekci + spouští Karel v SQL editoru).
4. **OVĚŘ SI TO SÁM (klikací):** očíslované kroky v prohlížeči — adresa, klik, co přesně musíš vidět — VČETNĚ jednoho NEGATIVNÍHO kroku (co vidět NESMÍŠ, např. cizí koncept v anonymním okně).
5. **DŮKAZY:** odkazy na tasks/dukazy-*.txt a screenshoty.
6. **DALŠÍ KROK KARLA:** právě JEDNA nejbližší akce (spustit SQL / odpovědět na otázku / kliknout ověření).
7. **STAV:** checkboxy fáze v todo.md + stav zrcadla v ClickUpu.

**Doporučená uzávěrka celé mise (po Fázi 4):** navrhnout Karlovi povel `security check` (případně `mega check`) — čerstvý agent s čistým kontextem projde výsledek mise; a povel `dobrou noc` pro večerní uzávěrku. Checky se spouštějí jen na povel — exekutor je sám nespouští, jen doporučí.

---

*Konec trasy. Exekutore: začni tahem 0.1, otázky K1–K10 + P1–P3 polož Karlovi JEDNOU zprávou hned na startu. Nikdy neestimuj tiše — co nejde ověřit z repa nebo dokumentace, označ unverified. Před každým reportem audituj tvrzení proti tomu, co jsi v session skutečně spustil nebo přečetl.*
