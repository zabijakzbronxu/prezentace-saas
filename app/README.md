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

### KROK 0: Dostat kód na GitHub (dělá Karel jednou)

Vercel bere kód z GitHub repozitáře. Projekt je zatím jen na tvém disku —
nejdřív ho musíme nahrát na GitHub. **Bez toho nasazení na Vercel nepůjde.**

Máš na to připravený skript **`app/PUSH_GITHUB.command`** — udělá skoro všechno
za tebe. Nemaže nic, jen nahraje kód.

#### Nejjednodušší cesta: spusť skript

1. V **Finderu** otevři složku `prezentace-saas/app/`.
2. **Dvojklik** na `PUSH_GITHUB.command`.
   - Kdyby macOS řekl „nelze otevřít, protože pochází od neznámého vývojáře":
     klikni na skript **pravým tlačítkem → Otevřít → Otevřít**. (Jen poprvé.)
   - Nebo v Terminálu ve složce `app/` napiš `./PUSH_GITHUB.command`.
3. Skript se sám rozhodne:
   - **Máš-li nainstalované GitHub CLI (`gh`) a jsi přihlášený** → zeptá se na název
     a repozitář ti sám vytvoří i nahraje. Hotovo.
   - **Nemáš `gh`** → řekne ti, ať si vytvoříš prázdný repozitář na webu (viz níže),
     a pak jen vložíš jeho URL. Zbytek udělá skript.

#### Varianta A — přes web github.com (bez `gh`)

1. Jdi na **https://github.com/new**.
2. **Repository name:** např. `prezentace-saas`.
3. **⚠️ DŮLEŽITÉ:** **NEZAŠKRTÁVEJ** „Add a README file", „Add .gitignore" ani
   „Choose a license". Repozitář musí být **úplně prázdný** — jinak vznikne
   konflikt s tím, co už máš na disku, a push selže.
4. Klikni **Create repository**.
5. Zkopíruj URL repozitáře (tlačítko **Code** → HTTPS, končí na `.git`), např.
   `https://github.com/tve-jmeno/prezentace-saas.git`.
6. Spusť `PUSH_GITHUB.command` (viz výše) a URL do něj vlož.

#### Varianta B — přes GitHub CLI (`gh`)

Pokud chceš mít `gh` (pak je vše na jedno spuštění skriptu):

1. Nainstaluj: v Terminálu `brew install gh` (potřebuješ Homebrew z https://brew.sh).
2. Přihlas se: `gh auth login` (vyber GitHub.com → HTTPS → přihlášení přes prohlížeč).
3. Spusť `PUSH_GITHUB.command` — repozitář vytvoří i nahraje sám.

> Po prvním nahrání už stačí jen `git push` (nebo znovu spustit skript) a Vercel
> nasadí novou verzi automaticky.

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
