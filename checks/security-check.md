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

## Ověření nasazení úložiště (revize 2026-07)

Bezpečnost fotek stojí na nastavení bucketu a pravidel, které se dělají RUČNĚ
v Supabase (viz `app/supabase/storage-setup.md`) — v kódu je vynutit nejde.
Proto po každém zásahu do Storage spusť v **SQL Editoru** tuhle kontrolu a ověř
výsledky:

```sql
-- 1) Bucket musí být PRIVÁTNÍ a mít limity (jinak jdou nahrát velké/cizí soubory).
select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id = 'presentation-photos';
--   public = false
--   file_size_limit = 8388608  (8 MB)
--   allowed_mime_types = {image/jpeg,image/png,image/webp}

-- 2) Musí existovat všechna 4 pravidla (upload/read/delete/public-read).
select policyname from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and policyname like 'photos %';
--   photos owner upload, photos owner read, photos owner delete, photos public read published
```

Když `public` = true, nebo chybí limit/MIME typy, nebo některé pravidlo chybí →
**vysoké riziko** (mohou unikat cizí fotky nebo jít nahrát nebezpečný soubor);
oprav podle `storage-setup.md` a spusť znovu.

## Výstup

Nálezy laicky (k čemu to slouží · co je problém · co s tím), seřazené od nejpalčivějšího, s odhadem rizika a času. Drobnosti oprav, změny chování navrhni jako task. Když je čisto, vypiš, co jsi kontroloval a nenašel.
