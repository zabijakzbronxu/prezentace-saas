# Úložiště fotek (E2.5) — zapnutí bucketu v Supabase (dělá Karel, ~5 minut)

Fotky prezentací se ukládají do Supabase **Storage** (úložiště souborů).
V databázi je jen „adresa" souboru; samotný soubor bydlí v tzv. **bucketu**
(přihrádce). Dokud bucket nevznikne, nahrávání fotek v aplikaci vypíše
srozumitelnou hlášku a nic se nerozbije — ale fotky nepůjdou nahrát.

## Jak je to vymyšlené (laicky)

- Bucket je **privátní** — soubory NEJSOU veřejně dostupné jen tak přes odkaz.
- **Nahrávat a mazat** smí jen přihlášený vlastník, a jen do své vlastní složky
  (cesta souboru začíná jeho ID — hlídají to bezpečnostní pravidla níže).
- **Číst** smí vlastník své fotky; **kdokoli** (i nepřihlášený) smí číst jen fotky
  **publikované** prezentace — to bude veřejná výkladní skříň.
- Limity: každá fotka max **8 MB**, jen obrázky **JPEG / PNG / WebP**,
  max **20 fotek** na prezentaci (počet hlídá aplikace).

## Krok 1 — založit bucket

1. Otevři projekt na `supabase.com/dashboard`.
2. V levém menu klikni na **Storage** (ikona kyblíku).
3. Klikni **New bucket** a vyplň:
   - **Name:** `presentation-photos` (přesně takhle, malými písmeny)
   - **Public bucket:** **VYPNUTO** (nechat vypnuté — bucket je privátní!)
   - Pokud dialog nabízí **Additional configuration / File size limit:** nastav **8 MB**
   - Pokud nabízí **Allowed MIME types:** vyplň `image/jpeg, image/png, image/webp`
4. Ulož (**Create bucket** / **Save**).

## Krok 2 — bezpečnostní pravidla (policies)

Zkus nejdřív cestu A (rychlejší). Když skončí chybou, použij cestu B.

### Cesta A — přes SQL Editor

V levém menu **SQL Editor** → **New query**, vlož celý blok níže a spusť (**Run**).
Musí skončit **Success**. Skript jde spustit i opakovaně, nic nerozbije.

```sql
-- Pravidla pro bucket presentation-photos.
-- Cesta souboru: <id_vlastníka>/<id_prezentace>/<náhodné_jméno>.jpg|png|webp
-- „První složka = ID vlastníka" je základ všech pravidel.

-- Nahrávat smí jen přihlášený, a jen do SVÉ složky.
drop policy if exists "photos owner upload" on storage.objects;
create policy "photos owner upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'presentation-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Číst smí vlastník svoje soubory (kvůli náhledům v editaci).
drop policy if exists "photos owner read" on storage.objects;
create policy "photos owner read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'presentation-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Mazat smí jen vlastník svoje soubory.
drop policy if exists "photos owner delete" on storage.objects;
create policy "photos owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'presentation-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Veřejné čtení JEN u fotek publikované prezentace,
-- a jen když složka souboru sedí na vlastníka té prezentace
-- (aby si nikdo nemohl „přivlastnit" cizí soubor do své prezentace).
drop policy if exists "photos public read published" on storage.objects;
create policy "photos public read published" on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'presentation-photos'
    and exists (
      select 1
      from public.presentation_photos ph
      join public.presentations p on p.id = ph.presentation_id
      where ph.storage_path = name
        and p.status = 'published'
        and (storage.foldername(name))[1] = p.owner_id::text
    )
  );
```

> Pozn.: ÚMYSLNĚ tu není pravidlo pro přepis (UPDATE) — aplikace soubory nikdy
> nepřepisuje, každá fotka má nové náhodné jméno.

### Cesta B — když SQL skončí chybou „must be owner of table objects"

U některých projektů Supabase nedovolí zakládat pravidla Storage přes SQL.
Pak je naklikej ručně: **Storage → Policies → presentation-photos → New policy**
a založ 4 pravidla se stejným obsahem jako výše (dialog nabízí pole pro
operaci INSERT/SELECT/DELETE, roli a podmínku — podmínky zkopíruj z bloků
`with check (...)` / `using (...)`).

## Jak ověřit, že to funguje

1. Na webu se přihlas, otevři **Moje prezentace** → nějakou prezentaci → krok **2. Fotky**.
2. Nahraj 2–3 fotky (JPEG/PNG). Musí se objevit náhledy; první fotka dostane
   štítek **Hlavní fotka**.
3. Zkus fotku smazat a posunout šipkami ← → — pořadí se musí změnit.
4. Kontrola bezpečí: zkopíruj si adresu obrázku (pravé tlačítko → kopírovat adresu
   obrázku) a otevři ji v anonymním okně. Odkaz je dočasně podepsaný — po ~hodině
   přestane fungovat. Bez přihlášení se k souboru jinak dostat nesmí
   (dokud prezentace není publikovaná).
