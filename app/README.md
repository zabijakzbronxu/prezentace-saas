# Prodej si sám — aplikace (Next.js)

Základní Next.js aplikace (App Router, TypeScript). Zatím obsahuje jednoduchou
„hello world" úvodní stránku. Odsud poroste celý produkt.

Technika záměrně bez `next/font/google` — používají se **systémové fonty**, aby
build fungoval i bez internetu.

---

## Spuštění na vlastním počítači (pro kontrolu)

V terminálu ve složce `app/`:

```bash
npm install       # jednorázově stáhne závislosti
npm run dev        # spustí vývojový server
```

Pak otevři v prohlížeči **http://localhost:3000** — uvidíš úvodní stránku.

Ověření produkčního buildu (to, co poběží na Vercelu):

```bash
npm run build      # musí projít bez chyby
npm run start      # spustí produkční verzi na http://localhost:3000
```

---

## Nasazení na Vercel — click-by-click (dělá Karel)

Cíl: aby se z gitu automaticky nasazovala živá veřejná URL. Uděláš to jednou,
pak už se každá změna nasazuje sama.

### Předpoklad: kód musí být na GitHubu

Vercel bere kód z GitHub repozitáře. Pokud projekt `prezentace-saas` ještě není
na GitHubu, řekni mi to — připravím přesný postup, jak ho tam dostat (nebo to
udělám krok za krokem s tebou). **Bez toho krok níže nepůjde.**

### Postup na vercel.com

1. Jdi na **https://vercel.com** a přihlas se (ideálně tlačítkem
   **Continue with GitHub**, ať má Vercel rovnou přístup k repozitářům).
2. Vpravo nahoře klikni na **Add New…** → **Project**.
3. V seznamu **Import Git Repository** najdi repozitář **prezentace-saas** a klikni
   u něj na **Import**.
   - Pokud repozitář nevidíš, klikni na **Adjust GitHub App Permissions** a povol
     Vercelu přístup k tomuto repozitáři.
4. **DŮLEŽITÉ — Root Directory:** ve formuláři je pole **Root Directory** (může být
   schované pod tlačítkem **Edit**). Klikni **Edit** a vyber složku **`app`**.
   > Protože aplikace není v kořeni repozitáře, ale v podsložce `app/`. Když to
   > nenastavíš, Vercel aplikaci nenajde.
5. **Framework Preset** by se měl sám přepnout na **Next.js**. Pokud ne, vyber ho
   ručně.
6. **Build & Output Settings** i **Environment Variables** nech zatím prázdné —
   nic teď nepotřebujeme.
7. Klikni **Deploy** a počkej ~1–2 minuty.
8. Až to doběhne, Vercel ukáže náhled a **veřejnou URL** (typu
   `https://prezentace-saas-xxxx.vercel.app`). Klikni na ni — musíš vidět stránku
   „Ahoj světe".

Hotovo. Od teď: každý `git push` do hlavní větve = automatický nový deploy.

### Poznámka k `vercel.json`

Záměrně tu **není** — standardní Next.js aplikaci Vercel pozná sám. Jediné, co je
potřeba nastavit ručně, je **Root Directory = `app`** (krok 4 výše).
