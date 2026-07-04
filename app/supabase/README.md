# Datový model (E1.3) — popis a spuštění migrace

Tady žije databázová struktura projektu. Migrace (SQL skript) je v
`migrations/20260704120000_init_data_model.sql`.

## Co která tabulka drží a proč (laicky)

**`profiles` — profil uživatele.** Ke každému přihlášenému účtu (ze Supabase Auth)
patří jeden řádek. Drží jméno a telefon. Zakládá se **sám** ve chvíli registrace
(zařizuje to databázový spouštěč), takže se o to nemusíme starat v aplikaci.

**`presentations` — jednotlivé prezentace nemovitostí.** Jeden uživatel jich může
mít víc (podle tvého rozhodnutí „víc prezentací na účet"). Každá má:

- **stav**: `draft` (koncept) → `paid` (zaplaceno) → `published` (publikováno).
  Tady se propisuje pravidlo „bez zaplacení se nezveřejní".
- **slug**: krátký text do veřejné adresy (např. `/p/otinska-radotin`), unikátní.
- **adresu** (ulice, město, PSČ), **parametry** (cena, dispozice, plochy, PENB),
  **popis** a **kontakt**, který se ukáže na veřejné stránce.

**`presentation_photos` — fotky prezentace.** Patří ke konkrétní prezentaci. Jedna
může být označená jako **hero** (hlavní záběr) — databáze hlídá, že hero je nejvýš
jedna. `sort_order` drží pořadí v galerii. Samotné soubory bydlí v Supabase Storage,
tady je jen cesta k nim.

**`payments` — platby.** Zatím jen **struktura** (žádné reálné účtování). Ke každé
prezentaci se sem později zapíše platba a její stav. Napojení na Stripe přijde
v úkolu E3.9.

## Bezpečnost (RLS — kdo co smí)

Row Level Security je zapnuté na všech tabulkách:

- Každý přihlášený vidí a upravuje **jen svoje** prezentace, fotky a profil.
- **Publikovanou** prezentaci (a její fotky) si přečte **kdokoli**, i nepřihlášený —
  to je ta veřejná výkladní skříň.
- Platby si vlastník smí jen **přečíst**; zapisovat je bude server (přes Stripe),
  ne uživatel.

> Pozn.: „tvrdé" databázové vynucení, že publikovat jde jen po zaplacení, doplníme
> až se Stripe (E3.9), aby teď šla publikace testovat i bez reálné platby.

---

## Jak spustit migraci v Supabase (dělá Karel, ~2 minuty)

1. Otevři svůj projekt na `supabase.com/dashboard`.
2. V levém menu klikni na **SQL Editor** (ikona `</>`).
3. Klikni **New query** (nový dotaz).
4. Otevři soubor `app/supabase/migrations/20260704120000_init_data_model.sql`,
   **zkopíruj celý jeho obsah** a vlož ho do editoru.
5. Klikni **Run** (vpravo dole, nebo Cmd/Ctrl+Enter).
6. Dole musí naskočit **Success. No rows returned** — to je v pořádku, skript jen
   vytváří tabulky, nic nevrací.

Skript je psaný tak, že když ho omylem spustíš dvakrát, nic nerozbije.

## Jak ověřit, že to vzniklo

**Tabulky:** v levém menu **Table Editor** — musíš vidět čtyři tabulky:
`profiles`, `presentations`, `presentation_photos`, `payments`.

**RLS:** v **Authentication → Policies** (nebo v Table Editor u každé tabulky štítek
„RLS enabled") uvidíš, že je u tabulek zapnuté a jsou tam politiky vypsané výše.

**Rychlý test profilu:** když se teď na webu zaregistruje nový uživatel, v tabulce
`profiles` by měl automaticky přibýt jeho řádek (díky spouštěči při registraci).

Až tohle proběhne a uvidíš tabulky, dej vědět — úkol E1.3 přepneme na hotový.
