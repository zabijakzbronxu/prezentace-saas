# PRODUCT.md — vize produktu

## Co stavíme

SaaS, kde si **kdokoli sám vytvoří prodejní prezentaci své nemovitosti** — krásnou samostatnou webovou stránku, jakou majitelé domů běžně nemají a realitky ji dělají draho nebo vůbec.

**Referenční vzor:** Karlova prezentace domu Otínská (Praha-Radotín) — `~/Desktop/index.html` a podklady dle `~/Desktop/OTINSKA_podklady_cesty.md`. Takhle má vypadat výsledek, který si uživatel „vyklikne" sám.

## PROČ (důvod existence)

Majitel nemovitosti dnes nemá jednoduchý způsob, jak svůj dům prezentovat důstojně: inzertní portály jsou šablonovité a ošklivé, web na míru je drahý. Chceme, aby si prezentaci na úrovni profesionálního webu postavil sám za večer.

## Pro koho (persony)

1. **Majitel prodávající vlastní nemovitost** (primární) — netechnický, chce to mít hezké a rychle.
2. **Makléř / malá realitka** — dělá prezentace opakovaně, ocení rychlost a jednotnou kvalitu.

## Co produkt musí umět (MVP)

1. Registrace a přihlášení
2. Průvodce tvorbou prezentace: adresa a základní údaje → fotky (hero + galerie) → texty (s AI asistencí) → dispozice, parametry, PENB → kontakt
3. Veřejná stránka prezentace na vlastní URL — rychlá, krásná, mobilní
4. Platba přes **Stripe** (model upřesníme: jednorázově za prezentaci vs. předplatné)
5. Admin pro Karla: přehled uživatelů, prezentací, plateb
6. Uživatelský přístup (frontend): správa vlastních prezentací

## Co MVP neumí (vědomě odloženo)

- Vlastní domény uživatelů
- Vícejazyčné prezentace
- Napojení na inzertní portály (Sreality apod.)
- Analýzy lokality (hluk, oslunění) — nice-to-have později

## Zásady produktu

- **Uživatelsky přívětivé** — netechnický člověk projde tvorbu bez nápovědy.
- **Naprosto spolehlivé** — veřejná prezentace nesmí nikdy spadnout; je to výkladní skříň prodeje domu.
- **Platby bez chyb** — viz RULES.md, sekce Platby.

## Otevřené otázky

- [ ] Cenový model (jednorázově / předplatné / free tier?)
- [ ] Název a doména produktu
- [ ] Tech stack (navrhne se v první vývojové konverzaci, Karel schválí)
- [ ] Kolik šablon vzhledu v MVP (návrh: 1 — ta z Otínské)
