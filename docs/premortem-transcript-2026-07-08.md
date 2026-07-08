# Premortem transcript — „Prodej si sám“ (2026-07-08)

Metoda: premortem (Gary Klein) — „je leden 2027, šest měsíců po spuštění, produkt selhal; proč?“
Provedeno: 4 tržní recon agenti s webem (7–8/2026) → 10 příčin selhání → 10 paralelních hloubkových sond → syntéza.
Vizuální report: `docs/premortem-report-2026-07-08.html`

## 1. Kontext (co se premortovalo)

- Produkt: „Prodej si sám“ — český SaaS, majitel si sám vytvoří prodejní prezentaci nemovitosti jako samostatnou webovou stránku (vzor kvality: ručně kurátorovaná Otínská). Platba předem za publikaci, koncept zdarma.
- Pro koho: 1) netechnický majitel prodávající bez makléře, 2) makléř / malá realitka.
- Úspěch měl vypadat: do 6 měsíců od spuštění platící zákazníci pravidelně publikují prezentace bez ručního tahání. Stav: MVP ~70 % (chybí platby, admin), tým 1 produkťák + AI vývoj, marketingový rozpočet nestanoven.
- Účel premortemu (zadání Karla): (a) rozhodnout, zda vůbec pokračovat, (b) pokud ano, podklad pro cenu/název/pozicování.

## 2. Syntéza

### Verdikt
7 z 10 příčin selhání vyšlo jako SMRTELNÉ s VYSOKOU pravděpodobností, zbylé 3 jako VÁŽNÉ. V dnešní podobě — samoobslužná placená prezentace pro samoprodejce — produkt téměř jistě neuspěje. To ale není rozsudek, je to hypotéza: 3 levné testy (dohromady do ~5 000 Kč a 3 týdnů) ji ověří, nebo vyvrátí. Doporučení: POZASTAVIT stavbu plateb a adminu (Mise 11), dokud testy neproběhnou. Kód se nikam neztratí — čeká.

### Nejpravděpodobnější selhání
„Bolest neexistuje“ (sondy 1 + 3). Samoprodejci prokazatelně platí za právní jistotu (8–12 tis. Kč advokátovi) a za dosah (inzerce 399–3 993 Kč) — kvalitu prezentace v diskuzích nezmiňuje ani jeden. Cenová kotva v hlavě zákazníka je 399 Kč za CELÝ inzerát s exportem na tři portály a garancí vrácení. Produkt tiše umře s hřbitovem konceptů zdarma a konverzí pod 5 %.

### Nejnebezpečnější selhání
„Billboard v lese“ (sonda 2) s právní dohrou (sonda 7). Ti, kdo zaplatí, nedostanou jediný dotaz od kupce — Sreality (odhadem ~70 % poptávky) zakazují odkazy v inzerátech, takže na prezentaci nemá kdo přijít. Následují refundy a negativní recenze přesně v té malé komunitě, odkud jedině mohli přijít další zákazníci. Nejošklivější ocas: zákazník publikuje bez PENB třídy, dostane od inspekce hrozbu pokuty (až 100 tis. Kč) a obrátí ji proti nám.

### Skrytý předpoklad
„Otínská je šablona.“ Brali jsme za samozřejmé, že hodnota referenční prezentace je v rozložení stránky, které SaaS umí rozdat každému. Ve skutečnosti je v ruční kurátorské práci a profesionálních vstupech (dron, panorama, půdorysy), v obsahu, který je právně nepřenositelný (hodnocení okolí z Google, novinové výstřižky) — a hlavně v domněnce, že krása je bolest, za kterou se platí. Podle všech dostupných dat není.

### Revidovaný plán — validační brána

**TEST A — Předprodej naostro (týden 1–2, ~0 Kč + čas)**
Oslovit 30 aktivních samoprodejců přímo z inzerátů (Bezrealitky, České reality — kontakty jsou veřejné) a nabídnout RUČNĚ vyrobenou prezentaci z jejich vlastních podkladů za 490 Kč, s vrácením peněz do 14 dnů. Žádný další vývoj — vyrobí se ručně, produkt už to umí.
PASS: zaplatí aspoň 3 z 30. Zapisovat: s čím cenu srovnávají a zda padne otázka „a kdo to uvidí?“.

**TEST B — Distribuce (týden 1–2, ~500 Kč)**
Vlastní testovací inzerát na Sreality (5 dní, ~365 Kč) a na Bezrealitky. Prakticky vyzkoušet všechny cesty, jak dostat kupce z inzerátu na prezentaci: odkaz v popisu, QR/URL na fotce, sekce Kontakt, odkaz v odpovědi zájemci. Změřit, co moderace smaže a kolik cizích lidí doklikne.
PASS: existuje legální cesta, kterou reálně proklikávají cizí lidé (ne jen my).

**TEST C — Falešné dveře + cena akvizice (týden 2–3, ~2 000 Kč)**
Jednoduchá stránka „Prémiová prezentace vaší nemovitosti za 990 Kč“ s ukázkou Otínské a tlačítkem „Chci ji“ (sbírá e-mail jako předobjednávku). Sklik/FB reklama na „prodej bytu bez realitky“. Měřit cenu prokliku a cenu za jeden kontakt.
PASS: kontakt pod ~300 Kč a aspoň 5 předobjednávek.


ROZHODOVACÍ BRÁNA: aspoň 2 testy ze 3 PASS → pokračovat: právní konzultace (checklist PENB/GDPR/obsah, ~2 000 Kč), přerámování ceny mimo kotvu „inzerát“, a teprve PAK dostavět platby (trasa Mise 11 je hotová a čeká). Jinak NEstavět platby a vybrat směr: (a) pivot na makléře s předplatným a napojením na jejich systémy — je to NOVÝ produkt, otestovat zvlášť 15 telefonáty; (b) ruční prémiová služba na klíč (à la webpronemovitost.cz za 6 999 Kč) — živnost, ne SaaS; (c) přestavět produkt kolem skutečné bolesti — průvodce samoprodejem (smlouvy, úschova, PENB, prohlídky) s prezentací jako bonusem; (d) čestně uzavřít jako hotové portfolio a poučení. Rozhodnutí je Karlovo — testy ho jen zlevní z měsíců stavby na 3 týdny.

### Checklist před spuštěním (pokud brána projde)

- PENB: povinné pole třídy v šabloně + laické varování majiteli (bez toho produkt vyrábí pokutovatelné inzeráty — až 100 tis. Kč).
- GDPR: proces výmazu na žádost + poučení/nástroj na rozmazání osob a SPZ na fotkách.
- Vyhodit z plánů Google hodnocení okolí a novinové výstřižky (ToS Google / licence vydavatelů) — nahradit vlastním textem majitele.
- Cenu rámovat proti právnímu servisu (11 990 Kč), nikdy proti inzerátu (399 Kč); nikdy neprodávat „hezčí inzerát“.
- Distribuce vyřešená V PRODUKTU dřív než platby: návod + QR/odkazová cesta ověřená testem B.
- Provozní zkouška ohněm: 5 simulovaných incidentů (výpadek v neděli, refund, GDPR výmaz, rozbitý upload, dotaz na PENB); kritérium: výpadek do 4 h, zbytek do 24 h.
- Spouštět v únoru–březnu (nájezd na sezónu III–VI), nikdy v létě do mrtvé zimy.

### Poctivost a limity
Poctivost premortemu: rámec „už to selhalo“ záměrně hledá jen cesty ke dnu — testy A–C můžou příčiny VYVRÁTIT a pak platí opak doporučení. Největší díry v datech: podíl samoprodejů (jediný nedatovaný průzkum ~45 %; reálně aktivních inzerentů výrazně méně), momentka ~2 100 inzerátů Bezrealitek nemusí zachycovat celý roční průtok, a existenci českého self-service konkurenta nejde vyloučit, jen se nenašel.


## 3. Tržní recon (fakta se zdroji)

## cz-konkurence

### Souhrn
Český trh 2026 nabízí samoprodejcům především inzertní portály, ne prezentační weby. Bezrealitky prodává inzerci v balíčcích podle délky (14/30/60 dní) od 399 Kč, placené balíčky od 749 Kč, nejvyšší balíček Komplet exportuje inzerát i na Reality.iDNES.cz, RealityMIX a České reality a má garanci vrácení peněz; doplňky: topování 99 Kč, prodloužení od 299 Kč, kompletní právní servis 11 990 Kč. Sreality soukromníkům inzerci umožňuje (jednorázová inzerce, nutno být vlastník), historicky za 72,60 Kč/den, nově balíček 3 993 Kč za 90 dní se 6 topováními — klíčové ale je, že pravidla Sreality ZAKAZUJÍ URL odkazy v popisu inzerátu (výjimka jen elektronické aukce), takže z nejsilnějšího portálu nelze legálně odkázat na externí prezentaci nemovitosti v popisu. iDNES Reality vyšel soukromníka (k 2/2024) na 320–620 Kč za 14–60 dní, České reality uvádí bezplatné vložení majitelem; existují i agregační služby pro samoprodejce (ProdejSiTo: 290–890 Kč/30 dní vč. Sreality v PREMIU) a bezplatný RealFree.cz. Právní balíčky mimo portály stojí 9 000–16 900 Kč (Dostupný advokát), výkupní firmy platí zhruba 60–90 % tržní ceny. „Web pro jednu nemovitost“ v ČR už existuje, ale jako ruční/agenturní služba, ne self-service SaaS pro laika: webpronemovitost.cz (6 999 Kč jednorázově, one-page web na míru), webnem.cz od DALTEN media (250 Kč/měs + doména, cílí na makléře napojené na RealityMIX) a Poski REAL (modul pro makléře); řada makléřů (RE/MAX Centrum, jakubzizka.cz, hlouskova.cz aj.) nabízí web nemovitosti jako součást prémiového marketingu v provizi 3–5 % + DPH spolu s profi fotkami, videem, 3D scanem a home stagingem. Samoobslužný SaaS přesně v konceptu „Prodej si sám“ se dohledat nepodařilo — ale nejde prokázat, že neexistuje; zároveň jeden servis pro samoprodejce (nemovitostisvepomoci.cz) už zjevně zanikl (doména přesměrovává jinam), což je varovný signál o velikosti niky.

### Fakta
- Bezrealitky prodejní inzerce začíná na 399 Kč; existují tři balíčky podle délky inzerce 14/30/60 dní, nižší placený balíček od 749 Kč, dražší balíček zahrnuje export i na Reality.iDNES.cz.
  ZDROJ: https://www.bezrealitky.com/price-list/sale + https://www.5nej.cz/bezrealitky-recenze/ (recenze aktualizována 6. 7. 2026)
- Bezrealitky balíček Komplet obsahuje export na Reality.iDNES.cz, RealityMIX.cz, České reality a další portály, 1 topování zdarma a garanci vrácení ceny inzerce, pokud majitel nezíská žádnou reakci (blog Bezrealitky 3/2026 uvádí garanci u 60denního Kompletu).
  ZDROJ: https://www.bezrealitky.com/price-list/sale + https://www.bezrealitky.cz/blog/inzerce-nemovitosti (31. 3. 2026)
- Doplňkové služby Bezrealitky: topování (boost) 99 Kč za jedno zvednutí, prodloužení inzerátu od 299 Kč; zvýrazňovací balíčky Promokit (banner/plachta, 7 dní zvýraznění) a Premium (fixní pozice ve výsledcích, umístění na homepage).
  ZDROJ: https://www.bezrealitky.com/price-list/sale + https://www.bezrealitky.com/information/casto-kladene-otazky
- Bezrealitky nabízí kompletní advokátní servis za 11 990 Kč: sepsání/kontrola kupní smlouvy, 60 min konzultace s advokátem, návrh na vklad do katastru, ověření podpisů a advokátní úschova; expresní režim do 24 h s příplatkem 50 %.
  ZDROJ: https://www.bezrealitky.com/service-centre/legal-services
- Na Sreality.cz smí inzerovat soukromá osoba přes tzv. jednorázovou inzerci; podmínkou je být vlastníkem nemovitosti (nebo mít právo s ní nakládat) a na výzvu to doložit. Topovat lze max. 3× denně.
  ZDROJ: https://o-seznam.cz/napoveda/sreality/smluvni-podminky-sluzby-sreality-cz/smluvni-podminky-pro-vkladani-jednorazove-inzerce-do-databaze-serveru-sreality-cz-platne-od-19-5-2025/
- Sreality zavedlo pro soukromníky balíček prodeje: 3 993 Kč za 90 dní inzerce a 6× topování, s možností prodloužení o 30 dní se 2× topováním; jednorázová platba bez dalších poplatků.
  ZDROJ: https://www.sreality.cz/reality/clanek/sreality-cz-jak-inzerovat-nemovitosti-efektivne-a-bez-starosti-nove-balicky-na-sreality-cz-366 (datum článku neuvedeno)
- Starší denní model Sreality: 72,60 Kč/den za publikaci inzerátu + 72,60 Kč za jedno topnutí (článek aktualizován 14. 2. 2024). Aktuálně platný ceník má na nápovědě verzi 'Platný od 11. 7. 2026', jeho obsah se nepodařilo načíst.
  ZDROJ: https://www.jak-prodat-v-praze-byt.cz/kolik-zaplatite-za-inzerci-kdyz-nemovitost-prodavate-sami/ + https://o-seznam.cz/napoveda/sreality/nejcastejsi-dotazy/cenik-sluzeb/
- KLÍČOVÉ PRO PREMORTEM: Pravidla inzerce Sreality zakazují URL odkazy v popisu inzerátu — výjimkou je pouze odkaz na konkrétní elektronickou aukci inzerované nemovitosti; zakázány jsou i odkazy na konkurenční realitní inzertní služby. Kontakty (vč. webových stránek) lze uvádět pouze v sekci 'Kontakt'. Tzn. z inzerátu na Sreality nelze v popisu legálně odkázat na externí prezentační web nemovitosti.
  ZDROJ: https://o-seznam.cz/napoveda/sreality/pravidla-inzerce-sreality-cz/
- Parametry inzerátu na Sreality: minimálně 3 fotografie (interiér i exteriér), max. 100 fotek, až 10 videí, popis do 3 000 znaků; zakázány verzálky, superlativy a reklamní sdělení.
  ZDROJ: https://o-seznam.cz/napoveda/sreality/vlozeni-inzeratu/ + https://o-seznam.cz/napoveda/sreality/pravidla-inzerce-sreality-cz/
- Sreality Premium (od března 2026) je předplatné 199 Kč/měsíc určené KUPUJÍCÍM (notifikace, historie cen, katastr) — není to služba pro prodávající.
  ZDROJ: https://www.sreality.cz/premium + https://www.bezrealitky.cz/blog/inzerce-nemovitosti
- Reality.iDNES.cz pro soukromníky (k 2/2024): 320 Kč/14 dní, 420 Kč/30 dní, 620 Kč/60 dní, 'hopnutí' zdarma za zkrácení platnosti o den. Aktuální oficiální ceník 2026 se nepodařilo dohledat.
  ZDROJ: https://www.jak-prodat-v-praze-byt.cz/kolik-zaplatite-za-inzerci-kdyz-nemovitost-prodavate-sami/ (aktualizace 14. 2. 2024)
- České reality.cz umožňuje bezplatné vložení nemovitosti majitelem (zdroj nedatovaný, ověřit); Realitymat.cz jednorázový poplatek 150 Kč.
  ZDROJ: https://realitnikonzultace.cz/realitni-servery/
- ProdejSiTo.online — agregátor pro samoprodejce: FREE (drobné portály, základní odhad ceny), BASIC 290 Kč/30 dní (České reality, Reality.iDNES, RealityČechy, RealityMorava), PREMIUM 890 Kč/30 dní (navíc Sreality, profesionální popis inzerátu, vzory smluv, konzultace).
  ZDROJ: https://prodejsito.online/cenik-zakladni.html
- RealFree.cz nabízí bezplatnou inzerci nemovitostí bez administrativního poplatku, kontakt na protistranu zdarma.
  ZDROJ: https://realfree.cz/blog/co-je-administrativni-poplatek-na-bezrealitky-cz-b8d6d2
- Právní balíčky pro prodej mimo portály — Dostupný advokát: Standard 9 000 Kč (příprava/kontrola dokumentace), Premium 14 900 Kč (kompletní servis vč. advokátní úschovy), Developer 16 900 Kč, vše vč. DPH; všechny zahrnují kupní a rezervační smlouvu a návrh na vklad.
  ZDROJ: https://dostupnyadvokat.cz/nemovitosti/koupe-prodej
- Výkupní firmy platí zpravidla 60–90 % tržní ceny (různé zdroje uvádějí slevu 10–20 %, jiné až 30–40 %); výhodou jsou peníze o 3–5 měsíců dříve.
  ZDROJ: https://www.investnews.cz/vykup-nemovitosti-kdy-se-vyplati-vic-nez-klasicky-prodej/ + https://vykoupim-nemovitost.cz/blog/kolik-stoji-vykup + https://www.realspektrum.cz/bydleni/aktuality/vykup-nemovitosti-ma-hacek-prozradime-vam-o-kolik-penez-prijdete
- PŘÍMÝ SUBSTITUT: webpronemovitost.cz vytváří prodejní one-page web pro jednu nemovitost za jednorázových 6 999 Kč vč. DPH (design, texty, SEO, formuláře, GDPR); hosting/doména, fotky a půdorysy nejsou v ceně. Cílí na realitky, samostatné makléře i majitele výjimečných domů. Provozuje živnostník Martin Ivančo (znackovyweb.cz) — ruční výroba, ne self-service SaaS.
  ZDROJ: https://webpronemovitost.cz/
- PŘÍMÝ SUBSTITUT: webnem.cz (DALTEN media s.r.o., provozovatel RealityMIX) nabízí web jednotlivé nemovitosti za 250 Kč/měsíc + doména 200 Kč/rok (bez DPH); obsah se přebírá z inzerce v systému, cílí na makléře inzerující na realitymix.cz.
  ZDROJ: https://webnem.cz/
- Poski REAL nabízí makléřům modul 'web nemovitosti' (stránka pro konkrétní nemovitost bez vyplňování, hosting v ceně systému) — další důkaz, že koncept existuje jako B2B nástroj pro makléře, ne pro majitele.
  ZDROJ: https://www.realitni-system.com/webovky/web-nemovitosti/
- Jednotliví makléři nabízejí web nemovitosti jako součást prémiového marketingu v rámci provize (jakubzizka.cz, hlouskova.cz, bulldogreality.cz, boldreality.cz, koutna-nemovitosti.cz) — pro personu 'makléř' je to dnes dostupné zdarma v provizi nebo levně od dodavatelů výše.
  ZDROJ: https://www.jakubzizka.cz/webova-stranka-nemovitosti/ + https://hlouskova.cz/web-nemovitosti-pro-nadstandardni-marketing/ + https://bulldogreality.cz/sluzby/web-nemovitosti/
- Provize realitní kanceláře je obvykle 3–5 % + DPH z prodejní ceny; v ceně bývá profesionální foto, video, 3D scan, home staging, web nemovitosti, inzerce na portálech a právní servis — rozsah se ale mezi kancelářemi výrazně liší a levnější makléři na prezentaci šetří.
  ZDROJ: https://www.remax-centrum.cz/kolik-stoji-realitni-sluzby/ + https://zpasti.cz/blog/provize-realitni-kancelare
- ODHAD (signál zániku niky): služba nemovitostisvepomoci.cz ('prodej nemovitosti svépomocí s podporou') už nefunguje — doména 301 přesměrovává na brandovi.cz. Stojí na přímém ověření redirectu při fetchi; důvod zániku neznám.
  ZDROJ: ODHAD — ověřený redirect https://nemovitostisvepomoci.cz/sluzby/prodej-nemovitosti/ → https://brandovi.cz/ (7. 7. 2026)
- ODHAD (interpretace pravidel): odkaz na vlastní prezentační web nemovitosti by na Sreality mohl být teoreticky uveden jen v sekci 'Kontakt' (pravidla říkají, že kontaktní informace na webové stránky patří pouze tam), v popisu je zakázán; zda by Sreality web jedné nemovitosti posoudilo jako 'konkurenční realitní inzertní službu', není nikde výslovně řečeno. Stojí na textu pravidel inzerce.
  ZDROJ: ODHAD — na základě https://o-seznam.cz/napoveda/sreality/pravidla-inzerce-sreality-cz/
- ODHAD (tržní podíly, stará data): Sreality generuje ~70 % poptávek, iDNES ~15 %, České reality ~5 % — článek je nedatovaný a ceny v něm zjevně zastaralé, čísla brát jen jako řádovou orientaci.
  ZDROJ: ODHAD — https://realitnikonzultace.cz/realitni-servery/ (nedatováno, prokazatelně zastaralé ceny)

### Čísla
- Bezrealitky prodejní inzerce od 399 Kč, placené balíčky od 749 Kč, délky 14/30/60 dní (https://www.bezrealitky.com/price-list/sale, https://www.5nej.cz/bezrealitky-recenze/)
- Bezrealitky topování 99 Kč/1×, prodloužení inzerátu od 299 Kč (https://www.bezrealitky.com/price-list/sale)
- Bezrealitky kompletní advokátní servis 11 990 Kč (https://www.bezrealitky.com/service-centre/legal-services)
- Sreality balíček pro prodej: 3 993 Kč / 90 dní / 6 topování (https://www.sreality.cz/reality/clanek/...nove-balicky-na-sreality-cz-366)
- Sreality starší denní sazba 72,60 Kč/den + 72,60 Kč/topnutí, k 2/2024 (https://www.jak-prodat-v-praze-byt.cz/kolik-zaplatite-za-inzerci-kdyz-nemovitost-prodavate-sami/)
- Sreality Premium pro kupující 199 Kč/měsíc (https://www.sreality.cz/premium)
- iDNES Reality soukromě: 320 Kč/14 dní, 420 Kč/30 dní, 620 Kč/60 dní, k 2/2024 (https://www.jak-prodat-v-praze-byt.cz/...)
- ProdejSiTo: BASIC 290 Kč/30 dní, PREMIUM 890 Kč/30 dní vč. Sreality (https://prodejsito.online/cenik-zakladni.html)
- Dostupný advokát: prodej Standard 9 000 Kč, Premium s úschovou 14 900 Kč vč. DPH (https://dostupnyadvokat.cz/nemovitosti/koupe-prodej)
- webpronemovitost.cz: web jedné nemovitosti 6 999 Kč vč. DPH jednorázově (https://webpronemovitost.cz/)
- webnem.cz: 250 Kč/měs + doména 200 Kč/rok bez DPH (https://webnem.cz/)
- Provize RK 3–5 % + DPH z prodejní ceny (https://www.remax-centrum.cz/kolik-stoji-realitni-sluzby/)
- Výkupní firmy: 60–90 % tržní ceny (https://vykoupim-nemovitost.cz/blog/kolik-stoji-vykup, https://www.investnews.cz/vykup-nemovitosti-kdy-se-vyplati-vic-nez-klasicky-prodej/)
- Sreality inzerát: min. 3 fotky, max. 100 fotek, až 10 videí, popis 3 000 znaků (https://o-seznam.cz/napoveda/sreality/vlozeni-inzeratu/)

### Mezery
- Přesná aktuální tabulka balíčků Bezrealitky (názvy a ceny všech tří prodejních balíčků pro 14/30/60 dní) — ceník je renderovaný JavaScriptem a nepodařilo se ho strojově načíst; ověřeno jen 'od 399 Kč', 'od 749 Kč' a ceny doplňků. Nutno ověřit ručně v prohlížeči na bezrealitky.cz/cenik.
- Zda má Bezrealitky v roce 2026 stále bezplatnou variantu prodejního inzerátu — zdroje si protiřečí (recenze zmiňuje 'balíček Zdarma', oficiální ceník začíná na 399 Kč).
- Obsah aktuálního ceníku Sreality 'platného od 11. 7. 2026' (PDF na o-seznam.cz se nepodařilo načíst) — nejasné, zda pro soukromníky stále platí denní model, nebo už jen balíček 3 993 Kč; článek o balíčcích nemá datum publikace.
- Aktuální oficiální ceník soukromé inzerce Reality.iDNES.cz pro rok 2026 — poslední ověřené ceny jsou z 2/2024; novější zdroj tvrdí kombinaci bezplatné základní a placené prémiové inzerce, ale bez částek.
- Zda České reality.cz stále nabízí bezplatnou inzerci majitelům (jediný zdroj je nedatovaný a má prokazatelně zastaralé ceny ostatních portálů).
- Existence českého SELF-SERVICE SaaS pro majitele na tvorbu prezentačního webu nemovitosti (přesný koncept 'Prodej si sám') — nenalezena, ale neexistenci nelze prokázat; nalezené služby (webpronemovitost.cz, webnem.cz, Poski REAL) jsou 'uděláme za vás' nebo B2B pro makléře.
- Aktuální návštěvnost a podíly poptávek jednotlivých portálů v 2026 — k dispozici jen staré/nedatované odhady.
- Ceny profesionálního focení nemovitostí jako samostatné služby v ČR (relevantní substitut části hodnoty) — cílené vyhledávání vrátilo nerelevantní výsledky, nedohledáno.
- Podmínky exportu inzerátů Bezrealitky (balíček Komplet) — zda export na iDNES/RealityMIX zahrnuje i zpětný odkaz či kontakt přímo na majitele, nezjištěno.


## zahranici

### Souhrn
Kategorie „single property website" v USA/UK/Německu existuje přes 15 let, ale téměř výhradně jako levný doplňkový nástroj pro realitní makléře, ne pro majitele-samoprodejce. Ceny jsou velmi nízké: typicky 0–30 USD/měsíc za web, jednorázově i 10–15 USD, „unlimited" plány za 10–25 USD/měsíc; prémiová varianta (Luxury Presence) je součástí agentských balíčků za 300–1500 USD/měsíc + setup 3 500–5 000 USD. Makléři je používají jako nástroj k získání zakázky (listing presentation) a sběru kontaktů kupujících, tj. web je pro ně marketing opakovaného byznysu, ne jednorázový produkt. FSBO segment (majitelé bez makléře) v USA klesl na historické minimum 5–6 % prodejů (NAR 2024/2025) a FSBO služby fungují jako inzertní portály (flat fee od 95 USD), ne jako tvůrci prezentačních webů; symbolické je, že ForSaleByOwner.com se v 2018 prodal za pouhých 2,5 mil. USD a jeho zakladatel v 2011 prodal vlastní byt přes makléře. V UK se levné/„free" modely prodeje bez agenta neuchytily — Purplebricks spadl z valuace přes 1 mld. GBP na prodej za 1 GBP (2023), free model po ztrátě 37,8 mil. GBP zrušil a vrátil se k fixnímu poplatku od 1 599 GBP. V Německu single-property landing pages nabízejí nástroje pro makléře (Hummify, immoprofessional od 69,95 €/měs.); soukromý prodej řeší portály, kde privátní inzerát na ImmoScout24 stojí od 109 €/měs. V ČR už přímé obdoby existují: webpronemovitost.cz dělá prodejní web nemovitosti na míru za 6 999 Kč jednorázově (cílí na majitele i makléře), Poski „web nemovitosti" od 95 Kč/měs. cílí čistě na makléře a Bezrealitky inzeruje prodej od 399 Kč. Hlavní poučení pro premortem: platící a opakovaný zákazník této kategorie je všude na světě makléř; majitel-samoprodejce je mizivý a smršťující se segment s nákupem jednou za mnoho let, který navíc primárně platí za dosah (portály), ne za krásu prezentace.

### Fakta
- Single property websites jsou etablovaná produktová kategorie pro US realitní agenty; srovnávací články z 2025/2026 uvádějí platformy ListingFlare, Rela, CribFlyer, Spiro, SinglePropertySites.com, HDPhotoHub, Placester — všechny cílí primárně na agenty, žádná explicitně na majitele (FSBO).
  ZDROJ: https://www.listingflare.com/blog/best-single-property-website-builders
- SinglePropertySites.com (US) prodává měsíční plány podle počtu aktivních webů: FREE 0 USD, Startup 12 USD/měs. (1 web), Do More 19 USD/měs. (3 weby), Multi-User 49 USD/měs. (10 webů), Team/Office 97 USD/měs. (100 webů), Enterprise od 250 USD/měs.; bez smluv a setup poplatků. Primární zákazník je agent, FSBO má jen vedlejší produkt 'FSBO Marketing System'.
  ZDROJ: https://singlepropertysites.com/pricing.php
- AgencyLogic nabízí neomezené single property weby za 9,95 USD/měs.; RealBird za 15 USD/měs. (roční platba); Listings Unlimited neomezeně pod 25 USD/měs.; PhotoUp 29–79 USD/měs. — potvrzuje, že tržní cena za samotný single-property web je řádově jednotky až desítky dolarů měsíčně.
  ZDROJ: https://isitdownorjustme.net/web/best-single-property-websites-2025-guide/ (souhrn srovnání), https://www.realbird.com/Single-Property-Websites.aspx
- Luxury Presence (prémiový segment) neprodává single property web samostatně koncovým majitelům — je zahrnut v agentských plánech (podle úrovně plánu až 20 aktivních property webů); typické ceny Luxury Presence: setup 3 500–5 000 USD a 300–1 500 USD/měs. Článek Luxury Presence popisuje užití: listing presentation (získání zakázky od prodávajícího) a lead generation (kontakty kupujících jdou agentovi, ne portálu).
  ZDROJ: https://www.luxurypresence.com/blogs/how-to-build-property-websites/ + https://inboundrem.com/2023-luxury-presence-review-pros-cons-websites-pricing/
- AgentFire (US) je builder webů pro agenty: od cca 149–165 USD/měs. + setup 700–3 500 USD; recenze upozorňují, že reálné náklady prvního roku s CRM/MLS/pluginy mohou přesáhnout 3 000–20 000 USD. Opět produkt pro agenty, ne pro majitele.
  ZDROJ: https://agentfire.com/pricing/ + https://www.luxurypresence.com/blogs/agentfire-pricing/
- FSBO podíl na prodejích domů v USA je na historickém minimu: 6 % v 2024 a 5 % v 2025 (NAR Profile of Home Buyers and Sellers); rekordních 91 % prodávajících prodalo přes agenta. V 1985 přitom FSBO tvořilo až 21 %.
  ZDROJ: https://www.nar.realtor/magazine/real-estate-news/fsbos-reach-all-time-low-more-sellers-rely-on-agents + https://crosscountrymortgage.com/mortgage/resources/nar-profile-home-buyers-sellers-2025/
- Medián prodejní ceny FSBO v USA byl 380 000 USD vs. 435 000 USD u prodeje s agentem (NAR 2025) — argument, kterým realitní branže odrazuje majitele od samoprodeje.
  ZDROJ: https://www.realestatewitch.com/fsbo-statistics/
- US FSBO služby jsou inzertní portály/flat-fee MLS, ne tvůrci prezentačních webů: ByOwner.com od 95 USD za balíček (zápis do MLS a portálů), FSBO.com plány Starter/Plus/MLS, ForSaleByOwner.com zdarma na vlastním webu. Samostatný 'prezentační web' pro majitele jako placený produkt se v mainstreamu nevyskytuje.
  ZDROJ: https://www.byowner.com/ + https://fsbo.com/ + https://www.realestatewitch.com/best-fsbo-websites/
- ForSaleByOwner.com (založen 1999, největší US FSBO web) koupila Tribune 2006 a v 2018 jej In-House Realty (Rocket/Quicken Loans) koupila za pouhých 2,5 mil. USD — po ~20 letech provozu zanedbatelná hodnota, dnes funguje jako doplněk lead-gen ekosystému Rocket.
  ZDROJ: https://www.inman.com/2018/05/24/quickens-in-house-realty-purchases-forsalebyowner-com-for-2-5m/ + https://en.wikipedia.org/wiki/Forsalebyowner.com
- Zakladatel ForSaleByOwner.com Colby Sambrotto v 2011 po 6 měsících neúspěšného samoprodeje najal makléře na prodej svého bytu na Manhattanu; prodal za 2,15 mil. USD (o 150 000 USD nad původní cenu) včetně 6% provize — mediálně nejcitovanější anekdota o limitech FSBO.
  ZDROJ: https://theamericangenius.com/housing-news/forsalebyowner-com-founder-gives-up-on-own-listing-hires-real-estate-broker
- UK: Purplebricks (low-fee online agent) spadl z valuace přes 1 mld. GBP na prodej za 1 GBP konkurentovi Strike (květen 2023); následný 'free listing' model prohloubil ztráty (z 19,4 na 37,8 mil. GBP za rok do 3/2024) a byl potichu zrušen — nyní fixní poplatek od 1 599 GBP vč. VAT.
  ZDROJ: https://propertyindustryeye.com/purplebricks-silent-as-fee-free-estate-agent-model-quietly-axed/ + https://theboar.org/2024/02/the-company-that-was-bought-for-a-pound/
- UK: soukromník nemůže sám inzerovat na Rightmove/Zoopla (přijímají jen registrované agenty/členy) — privátní prodejce musí použít zprostředkovatelskou službu; hlavní hodnota, za kterou UK samoprodejci platí, je tedy dosah portálů, ne prezentační web.
  ZDROJ: https://www.propertypassport.uk/guides/selling-house-yourself-without-agent
- US: flat-fee brokerage Homie (Utah, 'disruptor' s levným prodejem) se po sérii propouštění (z ~600 zaměstnanců na ~40 do konce 2023) v 2024 fakticky rozpadl na minifirmu s 18 agenty na 1099 — další doklad, že levné modely obcházení plné provize v downturnu neufinancovaly CAC.
  ZDROJ: https://www.sltrib.com/news/business/2024/04/19/homie-utah-company-meant-disrupt/ + https://www.inman.com/2024/04/22/flat-fee-brokerage-homie-makes-remarkable-pivot-amid-upheaval/
- Německo: single-property landing pages nabízí Hummify ('Für Makler und Bauträger' — pro makléře a developery, jednorázové 30denní licence, 'kein Abo', ceny neveřejné) a komplet immoprofessional od 69,95 €/měs. (weby + exposé generátor pro makléře). Nástroj pro soukromé prodávající jsem nenašel.
  ZDROJ: https://hummify.de/ + https://www.immoprofessional.com/de/immobilien-website/
- Německo: soukromý prodej bez makléře obsluhují portály a multi-portal služby (ohne-makler.net publikuje inzerát na ImmoScout24, immowelt, Kleinanzeigen aj. za paušál); privátní inzerát na ImmoScout24 stojí od 109 €/měs., inzerce na 3 portálech vyjde na ~600 € za 3 měsíce, s premium funkcemi a realistickou dobou prodeje 1 500–3 000 €.
  ZDROJ: https://www.ohne-makler.net/ + https://privatverkaufen.de/ratgeber/immobilienanzeigen-kosten-portale/
- ČR: přímá obdoba záměru už existuje — webpronemovitost.cz vytvoří prodejní web jedné nemovitosti za 6 999 Kč vč. DPH (jednorázově, hosting/doména zvlášť); je to ale ruční služba na míru (dodání 3–5 dní), ne samoobslužný SaaS, a cílí na majitele výjimečných nemovitostí i makléře.
  ZDROJ: https://webpronemovitost.cz/
- ČR: Poski REAL nabízí 'web nemovitosti' od 95 Kč/měs. (šablony, hosting v ceně, napojení na realitní software) — určeno výhradně makléřům a realitním kancelářím jako 'exkluzivní služba' klientovi; potvrzuje, že i v ČR se single-property web prodává agentům.
  ZDROJ: https://www.realitni-system.com/webovky/web-nemovitosti/
- ČR: Bezrealitky inzeruje prodej nemovitosti od 399 Kč (balíčky dle délky inzerce 14/30/60 dní, topování 99 Kč, prodloužení od 299 Kč) — cenová kotva, kterou český samoprodejce srovnává s jakoukoli další placenou službou.
  ZDROJ: https://www.bezrealitky.com/price-list/sale + https://www.5nej.cz/bezrealitky-recenze/
- Poučení, proč se prodává agentům: (a) agent je opakovaný zákazník — plány jsou stavěné na 3–100 aktivních webů a měsíční předplatné; (b) web je pro agenta nástroj akvizice zakázek (listing presentation) a sběru leadů, takže má návratnost i při nule prodejů z webu; (c) majitelů-samoprodejců je 5–6 % trhu (US) a kupují jednou za mnoho let. ODHAD (syntéza z výše citovaných zdrojů): pro čistě FSBO single-property SaaS z toho plyne malý TAM, nulová retence a CAC neamortizovatelné přes opakované nákupy.
  ZDROJ: ODHAD — stojí na https://singlepropertysites.com/pricing.php (struktura plánů), https://www.luxurypresence.com/blogs/how-to-build-property-websites/ (use-case), https://www.nar.realtor/magazine/real-estate-news/fsbos-reach-all-time-low-more-sellers-rely-on-agents (velikost segmentu)

### Čísla
- Single property web u US nástrojů pro agenty: 0–30 USD/měs. za web, unlimited 9,95–25 USD/měs., jednorázově od 15 USD (https://singlepropertysites.com/pricing.php, https://isitdownorjustme.net/web/best-single-property-websites-2025-guide/, https://www.listingflare.com/blog/best-single-property-website-builders)
- Luxury Presence: setup 3 500–5 000 USD, 300–1 500 USD/měs., až 20 property webů v plánu (https://inboundrem.com/2023-luxury-presence-review-pros-cons-websites-pricing/)
- AgentFire: od ~149–165 USD/měs. + setup 700–3 500 USD (https://agentfire.com/pricing/, https://www.luxurypresence.com/blogs/agentfire-pricing/)
- FSBO podíl v USA: 6 % (2024), 5 % (2025) — historická minima; 91 % prodejů přes agenta; 21 % FSBO v 1985 (https://www.nar.realtor/magazine/real-estate-news/fsbos-reach-all-time-low-more-sellers-rely-on-agents)
- Medián ceny FSBO 380 000 USD vs. 435 000 USD s agentem, rozdíl ~12,6 % (https://www.realestatewitch.com/fsbo-statistics/)
- ForSaleByOwner.com prodán za 2,5 mil. USD (2018) (https://www.inman.com/2018/05/24/quickens-in-house-realty-purchases-forsalebyowner-com-for-2-5m/)
- Purplebricks: valuace >1 mld. GBP → prodej za 1 GBP (2023); ztráta 37,8 mil. GBP (FY 3/2024); nyní fixní poplatek od 1 599 GBP (https://theboar.org/2024/02/the-company-that-was-bought-for-a-pound/, https://propertyindustryeye.com/purplebricks-silent-as-fee-free-estate-agent-model-quietly-axed/)
- ByOwner.com flat-fee balíčky od 95 USD (https://www.byowner.com/)
- Německo: ImmoScout24 privátní inzerát od 109 €/měs.; 3 portály ~600 €/3 měsíce, reálně 1 500–3 000 € (https://privatverkaufen.de/ratgeber/immobilienanzeigen-kosten-portale/); immoprofessional od 69,95 €/měs. (https://www.immoprofessional.com/de/immobilien-website/)
- ČR: webpronemovitost.cz 6 999 Kč jednorázově za web nemovitosti (https://webpronemovitost.cz/); Poski web nemovitosti od 95 Kč/měs. pro makléře (https://www.realitni-system.com/webovky/web-nemovitosti/); Bezrealitky prodej od 399 Kč, topování 99 Kč (https://www.bezrealitky.com/price-list/sale)
- Homie: z ~600 zaměstnanců (peak) na ~40 (konec 2023) a 18 agentů-kontraktorů (2024) (https://www.sltrib.com/news/business/2024/04/19/homie-utah-company-meant-disrupt/)

### Mezery
- Přesný rozpis balíčků Bezrealitky pro prodej (názvy, ceny za 14/30/60 dní) — ceník je renderovaný JavaScriptem, podařilo se ověřit jen 'od 399 Kč', boost 99 Kč a prodloužení od 299 Kč; recenze z 5nej.cz uvádí 'od 749 Kč', rozpor jsem nerozřešil.
- Konkrétní ceny Hummify (DE) — web ceník neuvádí, jen strukturu licencí (30denní jednorázové, 'kein Abo').
- Cena samostatného single property webu u Luxury Presence mimo balíček — neveřejná, jen na dotaz.
- Tržby/objemy firem v kategorii single property websites (SinglePropertySites, AgencyLogic, CribFlyer…) — malé soukromé firmy, čísla nejsou veřejná; nelze tedy doložit, jak velký (malý) je to byznys.
- Výsledky 'FSBO Marketing System' od SinglePropertySites.com — produkt existuje, ale nenašel jsem žádná data o jeho adopci; obecně jsem nenašel jediný doložený případ čistě FSBO single-property-website SaaS, který by viditelně uspěl NEBO jehož krach by byl zdokumentován — kategorie spíš nikdy nevznikla, což je samo o sobě signál, ale absence důkazu není důkaz absence.
- Podíl prodejů 'bez realitky' na českém trhu (obdoba NAR FSBO statistiky) — v této rešerši jsem nenašel ověřené číslo z důvěryhodného zdroje.
- WebSearch je omezen na US index — německé a UK výsledky jsou pravděpodobně neúplné (např. další lokální nástroje typu Hummify mohly zůstat nenalezené).


## fsbo-trh-cr

### Souhrn
Český rezidenční trh dělá zhruba 60–80 tisíc transakcí s byty a domy ročně: 2023 ~60 tis. (Dataligence), 2024 růst prodejů o 34 % (ČBA/Flat Zone), 2025 ~54 tis. bytů a ~22 tis. rodinných domů (Reas.cz). Podíl prodejů bez realitky nemá žádnou oficiální aktuální statistiku — nejlepší dostupný průzkum (Chytrý makléř, citovaný sítí Next Reality, datace nejasná) říká, že ~45 % prodávajících prodalo svépomocí, 12 % to zkusilo a přešlo k realitce a 62 % lidí bez zkušenosti by prodej samo zkusilo; starší nepodložené tvrzení (2018) mluví o polovině trhu. Při ~76 tis. transakcích to znamená ODHAD řádově 20–35 tis. samoprodejů ročně, z toho jen zlomek jde přes Bezrealitky (poslední ověřený rok 2021: ~5 500 prodejů). V nabídce je Sreality dominantní: 106 tis. inzerátů celkem (7/2026) proti ~2,1 tis. prodejních inzerátů na Bezrealitky. Samoprodejci se radí hlavně v regionálních FB skupinách typu „bez realitky" (převážně inzertní nástěnky) a na fórech (Modrý koník, Modrá střecha); dominantní témata jsou právník a kupní smlouva, úschova peněz, katastr, nastavení ceny a organizace prohlídek — kvalitu prezentace či fotek v prostudované diskuzi (46 příspěvků) nikdo nezmínil, což je pro produkt „hezká prezentace" varovný signál: bolest, za kterou samoprodejci prokazatelně platí, je právo a bezpečí peněz, ne vzhled inzerátu. Sezónnost: vrchol jaro (březen–červen, poptávka +20 % proti zimě), druhá vlna září–listopad, útlum prosinec–únor. Cenová kotva konkurence: Sreality soukromá inzerce 72,60 Kč/den nebo balíček 3 993 Kč/90 dní, Bezrealitky balíčky od 399 Kč a nová služba Komfort za 1,5 % z ceny — samoprodejce je dnes zvyklý platit za inzerci stovky korun až nízké tisíce.

### Fakta
- V roce 2023 proběhlo v ČR celkem téměř 60 000 transakcí s bytem či domem; struktura: rodinné domy 30 %, panelové byty ~26 %, novostavby 24 %, cihlové byty ~20 % (data Dataligence, publikováno 8. 3. 2024)
  ZDROJ: https://www.epravo.cz/top/clanky/dojde-k-oziveni-realitniho-trhu-117679.html
- Za rok 2024 vzrostly celkové prodeje nemovitostí meziročně o 34 %, novostavby o 51 %; ceny +10,7 % (ČBA + Flat Zone, 26. 2. 2025)
  ZDROJ: https://www.cbamonitor.cz/aktuality/cesky-realitni-trh-posilil-vice-nez-o-tretinu
- Dataligence/HYPOX za rok 2024: přes 21 tis. prodaných novostaveb, přes 33 tis. transakcí se staršími byty (z toho 2/3 panel), ~26 tis. rodinných domů — dohromady ~80 tis. rezidenčních transakcí
  ZDROJ: https://hypox.cz/blog/novinky/realitni-trh-2024
- Za rok 2025 se v ČR prodalo ~54 000 bytů (+9 % meziročně) a necelých 22 000 rodinných domů (−1 %) podle dat Reas.cz (článek 13. 2. 2026)
  ZDROJ: https://www.hypoindex.cz/clanky/byty-se-na-realitnim-trhu-moc-neohreji-rodinne-domy-brzdi-nova-ocekavani-kupujicich/
- ČÚZK eviduje ~70–76 tis. návrhů na vklad měsíčně (duben 2026: 76 410, květen 2026: 71 686) — jde ale o všechny vklady práv, ne jen kupní smlouvy; detailní roční čísla jsou v XLS na webu ČÚZK
  ZDROJ: https://cuzk.gov.cz/Katastr-nemovitosti/Statisticke-udaje-o-transakcich/Statisticke-udaje-o-vybranych-transakcich-s-ne-(1).aspx
- Průzkum Chytrý makléř (citovaný Next Reality, datum průzkumu neuvedeno): 43 % prodávajících si najalo realitku hned, 12 % nejdřív zkusilo prodej svépomocí a pak přešlo k realitce, celkem 55 % skončilo u makléře — tedy ~45 % prodalo samo; z lidí bez zkušenosti s prodejem by se 62 % pokusilo prodat samo a jen 38 % důvěřuje realitkám
  ZDROJ: https://www.nextreality.cz/s-realitkou-nebo-bez-vysledky-pruzkumu-prinasi-realitnim-kancelarim-dobre-i-spatne-zpravy
- Starší tvrzení (článek 19. 3. 2018): cca polovina všech prodejů nemovitostí v ČR probíhá bez realitní kanceláře — bez uvedení zdroje, ber jako orientační
  ZDROJ: https://www.realitycechy.cz/clanky/realitni-zpravodaj/1612-prodej-bez-realitky-nebo-radeji-s-ni
- Sreality.cz nabízí 106 096 inzerátů celkem (homepage 7/2026): byty 30 884, domy 21 997, pozemky 28 112, komerční 19 681
  ZDROJ: https://www.sreality.cz/
- Bezrealitky.cz zobrazuje ve výpisu prodeje 2 126 nemovitostí (7/2026); starší srovnání (cca 2022) uvádělo Sreality 65 tis., iDNES 50 tis., České reality 37 tis., Bezrealitky ~10 tis. inzerátů
  ZDROJ: https://www.bezrealitky.cz/vypis/nabidka-prodej a https://realitnikonzultace.cz/realitni-servery/
- Poslední ověřené roční výsledky Bezrealitky (za 2021): ~5 500 prodaných nemovitostí za ~32 mld. Kč, 44–47 tis. pronájmů, obrat 60 mil. Kč; měsíčně ~800 prodejů a přes půl milionu návštěvníků
  ZDROJ: https://www.hypoindex.cz/tiskove-zpravy/bezrealitky-na-novem-rekordu-vloni-pronajaly-47-tisic-domu-a-bytu-zprostredkovaly-prodej-nemovitosti-v-hodnote-32-miliard-a-zvedly-obrat-na-50-milionu/ a https://zpravy.kurzy.cz/639760
- Bezrealitky v únoru 2026 propagují službu Komfort za 1,5 % z ceny nemovitosti (právní servis, inzerce, komunikace se zájemci) a tvrdí průměrnou úsporu 166 tis. Kč na provizi; realitky (RE/MAX, Century 21) model kritizují jako vystavení pár fotek
  ZDROJ: https://cc.cz/provize-4-je-prezitek-z-90-let-tvrdi-bezrealitky-za-vystaveni-par-fotek-je-hodne-cokoliv-rype-konkurence/
- Ceník pro samoprodejce: Sreality jednorázová inzerce 72,60 Kč/den vč. DPH, prodejní balíček 3 993 Kč/90 dní; Bezrealitky prodejní balíčky od 399 Kč (30/60/90 dní), topování 99 Kč, prodloužení od 299 Kč
  ZDROJ: https://o-seznam.cz/napoveda/sreality/nejcastejsi-dotazy/jednorazova-inzerce/ a https://www.bezrealitky.com/price-list/sale
- Diskuze samoprodejců na Modrém koníku (46 příspěvků, vlákno Jak prodat nemovitost bez realitky): řeší právníka na kupní smlouvu (~4 000 Kč rezervační + ~4 000 Kč kupní), advokátní/bankovní/notářskou úschovu, vklad na katastr, vedení prohlídek, nastavení ceny a úsporu provize (~160 tis. Kč); kvalitu fotek/prezentace nezmínil nikdo
  ZDROJ: https://www.modrykonik.cz/forum/zkusenosti-s-koupi-prodejem-a-pronajmem-nemovitosti/jak-prodat-nemovitost-bez-realitky-zkusenosti-a-tipy/
- FB skupiny kolem samoprodeje jsou převážně regionální inzertní nástěnky (např. Podnájem, prodej bytů, rod. domů BEZ REALITKY; Bez realitky nemovitosti inzerce; Brno: Byty bez realitky; BEZ REALITKY Zlín/Benešov/Frýdek-Místek), ne poradny — poradenský obsah se odehrává spíš na fórech
  ZDROJ: https://www.facebook.com/groups/253347711682148/ a další skupiny z vyhledávání (počty členů nedostupné bez přihlášení)
- Sezónnost: nejvyšší aktivita březen–červen (poptávka v březnu/dubnu +20 % a více proti zimním měsícům), druhá vlna září–listopad, nejslabší prosinec–únor; v silných měsících se prodává až o 30 % rychleji (blog realitní sítě, 23. 8. 2025 — kvalitativní zdroj)
  ZDROJ: https://www.realitakroku.cz/aktuality/kdy-prodavat-a-kdy-kupovat-jak-nacasovani-ovlivni-cenu-i-rychlost-obchodu
- ODHAD velikosti cílového trhu: při ~76 tis. transakcích s byty a domy ročně (2025) a podílu samoprodejů 30–45 % vychází 23–34 tis. samoprodejů ročně; stojí na kombinaci dat Reas.cz (transakce) a průzkumu Chytrý makléř (podíl), oba s nejistotou
  ZDROJ: ODHAD — kombinace https://www.hypoindex.cz/clanky/byty-se-na-realitnim-trhu-moc-neohreji-rodinne-domy-brzdi-nova-ocekavani-kupujicich/ a https://www.nextreality.cz/s-realitkou-nebo-bez-vysledky-pruzkumu-prinasi-realitnim-kancelarim-dobre-i-spatne-zpravy

### Čísla
- ~60 000 transakcí byt/dům v ČR za 2023 (Dataligence via epravo.cz)
- ~54 000 prodaných bytů a ~22 000 rodinných domů za 2025, tj. ~76 tis. celkem (Reas.cz via hypoindex.cz, 2/2026)
- +34 % meziroční růst prodejů za 2024, novostavby +51 % (ČBA/Flat Zone, cbamonitor.cz)
- ~45 % prodávajících prodalo svépomocí, 55 % s realitkou, 62 % lidí bez zkušenosti by to zkusilo samo (průzkum Chytrý makléř via nextreality.cz, datace neznámá)
- 106 096 inzerátů na Sreality celkem, z toho 30 884 bytů a 21 997 domů (sreality.cz, 7/2026)
- 2 126 prodejních inzerátů na Bezrealitky (bezrealitky.cz/vypis/nabidka-prodej, 7/2026) — poměr k Sreality u prodeje bytů+domů zhruba 25:1
- ~5 500 prodejů za ~32 mld. Kč přes Bezrealitky za rok 2021, ~800 prodejů měsíčně (hypoindex.cz/kurzy.cz)
- Sreality soukromá inzerce: 72,60 Kč/den, balíček prodej 3 993 Kč/90 dní (o-seznam.cz)
- Bezrealitky: balíčky od 399 Kč, topování 99 Kč; služba Komfort 1,5 % z ceny, tvrzená úspora 166 tis. Kč (bezrealitky.com, cc.cz 2/2026)
- Náklady samoprodeje z diskuzí: právník ~8 000 Kč (rezervační + kupní smlouva), úspora na provizi ~160 tis. Kč (modrykonik.cz)
- Sezónnost: poptávka březen–duben +20 % proti zimě, prodej v sezóně až o 30 % rychlejší (realitakroku.cz — kvalitativní zdroj)
- 23–34 tis. samoprodejů ročně (ODHAD: 76 tis. transakcí × 30–45 % podíl)

### Mezery
- Neexistuje oficiální ani čerstvá (2024–2026) statistika podílu prodejů bez realitky — průzkum Chytrý makléř nemá dohledatelné datum, vzorek ani metodiku; tvrzení o polovině trhu je z 2018 a bez zdroje
- Počty členů FB skupin bez realitky se nepodařilo zjistit (Facebook blokuje anonymní přístup) — nelze tak doložit, jak velká je poradní scéna samoprodejců
- Novější roční výsledky Bezrealitky než za 2021 se nepodařilo najít (po vstupu do skupiny Rosenbaum/Maxima a fúzi s německým konkurentem 11/2024 firma zjevně nepublikuje srovnatelné roční řady)
- Číslo 2 126 prodejních inzerátů Bezrealitky je momentka z jednoho výpisu (7/2026) — nemusí zahrnovat všechny kategorie; starší zdroje uváděly ~10 tis. inzerátů vč. pronájmů
- Přesný počet vkladů vlastnického práva na základě kupní smlouvy za 2024 z ČÚZK vyžaduje stažení XLS souborů (neprovedeno — zadání zakazovalo zápis na disk); měsíční řady ČÚZK by daly tvrdá data o sezónnosti
- Sezónnost je doložena jen kvalitativně z blogu realitní sítě (+20 % poptávka na jaře), ne tvrdými měsíčními daty o transakcích
- Rozpor mezi zdroji o počtu transakcí 2024: Dataligence/HYPOX ~80 tis. vs. Reas.cz ~76 tis. za 2025 — různé metodiky, přesné oficiální číslo neexistuje
- Nepodařilo se ověřit tvrzení o 1 500 samoprodejích za 3 měsíce (+75 %) zmíněné v jednom vyhledávacím souhrnu — bez dohledatelného primárního zdroje, nepoužito


## pravo-a-pravidla

### Souhrn
PENB: Zákon č. 406/2000 Sb. (§ 7a odst. 2 písm. d)) ukládá vlastníkovi budovy/jednotky povinnost zajistit uvedení klasifikační třídy energetické náročnosti už v „informačních a reklamních materiálech" při prodeji — tedy v inzerci; při prodeji přes zprostředkovatele přechází uvedení třídy na něj a bez předané grafické části průkazu musí uvést nejhorší třídu G (§ 7a odst. 2 písm. e)). Zákon médium nerozlišuje, takže vlastní prodejní web majitele pod „reklamní materiály" s vysokou pravděpodobností spadá (ODHAD — jazykový výklad, oficiální výklad pro vlastní web nenalezen); kontroluje SEI, fyzické osobě hrozí pokuta v řádu 50–100 tis. Kč dle sekundárních zdrojů. GDPR: fotka osoby i čitelná SPZ jsou osobní údaje (stanovisko ÚOOÚ), zveřejnění podoby vyžaduje svolení dle § 84–85 občanského zákoníku a publikace na internetu nespadá pod výjimku pro domácnost (SDEU Lindqvist C-101/01) — produkt by měl mít nástroj/poučení k rozmazání osob a SPZ. Sreality v podmínkách jednorázové inzerce výslovně zakazují URL odkazy v popisu i na fotkách (body 74, 79, 89 — výjimka jen e-aukce), takže odkaz na externí prezentaci prodávajícího tam legálně umístit nejde (nanejvýš sporně v sekci Kontakt); Bezrealitky zakazují redirect a komerční inzeráty pod smluvní pokutou 35 000 Kč, odkaz na vlastní nekomerční prezentaci je šedá zóna. Google Places ToS zakazují ukládání obsahu (hodnocení, fotky, detaily míst) — cacheovat lze jen place ID (neomezeně) a souřadnice (30 dní), zobrazení bez Google mapy vyžaduje logo Google a obsah Places nesmí být zobrazen s ne-Google mapou; ukládání hodnocení okolí do vlastní DB by porušilo ToS. Novinové výstřižky: citační licence § 31 autorského zákona nepokrývá marketingové užití celých článků („napsali o nás") — je třeba licence vydavatele; loga médií lze užít jen referenčně dle § 10 zákona č. 441/2003 Sb. bez vyvolání dojmu obchodního spojení.

### Fakta
- Vlastník budovy nebo SVJ je povinen zajistit uvedení klasifikační třídy ukazatele energetické náročnosti v informačních a reklamních materiálech při prodeji/pronájmu budovy nebo ucelené části (§ 7a odst. 2 písm. d) zákona č. 406/2000 Sb.)
  ZDROJ: https://krajta.slv.cz/2000/406/par_7a (plné znění § 7a); potvrzeno i https://www.zakonyprolidi.cz/cs/2000-406
- Při prodeji přes zprostředkovatele mu vlastník předá grafickou část průkazu; zprostředkovatel uvádí třídu v reklamních a informačních materiálech, a pokud grafickou část neobdrží, uvede nejhorší klasifikační třídu G (§ 7a odst. 2 písm. e))
  ZDROJ: https://krajta.slv.cz/2000/406/par_7a
- Vlastník musí PENB (nebo ověřenou kopii) předložit zájemci před uzavřením kupní smlouvy a předat nejpozději při podpisu kupní smlouvy (§ 7a odst. 2 písm. c)); vlastník jednotky může PENB nahradit vyúčtováním dodávek energií za 3 roky, pokud mu SVJ průkaz na písemnou žádost nepředá (§ 7a odst. 7)
  ZDROJ: https://krajta.slv.cz/2000/406/par_7a a FAQ MPO https://mpo.gov.cz/assets/cz/energetika/energeticka-legislativa/legislativa-cr/2016/11/FAQ-k-zakonu-406_2000.pdf (otázky 8, 11, 16)
- Odpovědnost za zajištění PENB nese vlastník (majitel) — při samoprodeji bez makléře tedy vše (průkaz i třída v inzerci) leží na něm; známý případ: SEI vymáhala po důchodkyni pokutu až 100 000 Kč za prodej domu bez PENB, přestože prodej řešila realitní kancelář (článek 9. 7. 2015)
  ZDROJ: https://www.hypoindex.cz/clanky/kontroly-energetickych-prukazu-zprisnuji-inspekce-chce-po-duchodkyni-100-tisic-korun/
- Dozor vykonává Státní energetická inspekce (SEI); kontroluje mj. povinnost uvádět klasifikační třídu v inzerci; podle kontrol z r. 2015 realitky u 74 % inzerátů uváděly třídu G (často automaticky, když majitel průkaz nedodal)
  ZDROJ: https://sei.gov.cz/?p=1373 a https://www.hypoindex.cz/clanky/inzeraty-nerikaji-pravdu-o-energeticke-narocnosti/ a https://www.irozhlas.cz/zpravy-domov/realitni-kancelare-casto-v-inzeratech-neuvadeji-energetickou-narocnost-nemovitosti_201510170308_dpihova
- Pokuty (sekundární zdroje, přesné znění § 12 se nepodařilo ověřit přímo): fyzická osoba vlastník budovy až 100 000 Kč, vlastník jednotky až 50 000 Kč (vč. neuvedení třídy v inzerci); právnická/podnikající osoba až 5 000 000 Kč
  ZDROJ: http://www.k-p-m.cz/?sankce-a-kontrola,145 a https://www.dumazahrada.cz/doporucujeme/mate-platny-a-aktualni-penb-pokud-ne-muze-vam-hrozit-pokuta/
- Výjimky z povinnosti PENB: budovy s energeticky vztažnou plochou do 50 m2 a stavby pro rodinnou rekreaci (§ 7a odst. 5); při převodu družstevního podílu povinnost PENB nevzniká
  ZDROJ: FAQ MPO https://mpo.gov.cz/assets/cz/energetika/energeticka-legislativa/legislativa-cr/2016/11/FAQ-k-zakonu-406_2000.pdf (otázky 6, 18, 19)
- ODHAD: povinnost uvést třídu platí i pro vlastní webovou stránku majitele — § 7a odst. 2 písm. d) mluví obecně o 'informačních a reklamních materiálech' bez omezení na realitní portály; prodejní web je reklamní materiál. Stojí na jazykovém výkladu zákona; oficiální výklad (MPO/SEI/soud) specificky pro vlastní web nenalezen a samo MPO ve FAQ upozorňuje, že závazný výklad může dát jen soud
  ZDROJ: ODHAD na základě znění § 7a (https://krajta.slv.cz/2000/406/par_7a) a FAQ MPO (úvodní upozornění, str. 1)
- Fotografie, na níž je identifikovatelná osoba, je osobní údaj a podléhá GDPR; podle § 84–85 občanského zákoníku je k zachycení i rozšiřování podoby člověka třeba jeho svolení, které lze kdykoli odvolat (§ 87 odst. 2)
  ZDROJ: https://www.k-net.cz/sluzby/it-consulting/gdpr/gdpr-a-fotky/ a https://aspidos.cz/potreba-souhlasu-pri-porizovani-sireni-fotografii-podle-obcaskeho-zakoniku-a-gdpr/
- Čitelná registrační značka (SPZ) na fotce je podle ÚOOÚ osobní údaj, protože přes ni lze majitele nepřímo identifikovat — fotky exteriéru se sousedovými auty jsou tedy rizikové bez rozmazání
  ZDROJ: https://auto-mania.cz/zverejnit-fotku-s-cizi-registracni-znackou-muze-byt-hodne-problematicke-znacka-je-totiz-osobni-udaj/ (cituje ÚOOÚ) a https://www.bezplatnapravniporadna.cz/obcanske-pravo/nezarazene/40940-je-spz-osobni-udaj-podlehajici-gdpr-nebo-ne.html
- Zveřejnění osobních údajů na volně přístupné internetové stránce nespadá pod výjimku GDPR pro osobní/domácí činnost (rozsudek SDEU C-101/01 Lindqvist) — i majitel-fyzická osoba publikující prezentaci se stává správcem údajů; kontakt na sebe zveřejňuje dobrovolně, ale za fotky třetích osob (sousedé, SPZ) odpovídá
  ZDROJ: https://ictjudikatura.law.muni.cz/wiki/C-101/01_-_Lindqvist; role platformy jako zpracovatele = ODHAD z konstrukce GDPR čl. 4 a 28
- Sreality (smluvní podmínky jednorázové inzerce platné od 19. 5. 2025): bod 79 zakazuje v popisu inzerátu 'URL odkazy nebo nefunkční internetové odkazy či domény' (výjimka jen odkaz na konkrétní e-aukci); bod 74 — kontakty na osoby, firmy nebo webové stránky jen do sekce Kontakt; bod 89 — fotografie nesmí obsahovat kontakty, weby, reklamu ani fotografie osob. Odkaz na externí prezentaci prodávajícího tedy v popisu ani na fotkách nelze uvést
  ZDROJ: https://o-seznam.cz/napoveda/sreality/smluvni-podminky-sluzby-sreality-cz/smluvni-podminky-pro-vkladani-jednorazove-inzerce-do-databaze-serveru-sreality-cz-platne-od-19-5-2025/ a https://o-seznam.cz/napoveda/sreality/pravidla-inzerce-sreality-cz/
- Bezrealitky (obchodní podmínky služby Inzerce): čl. 3 odst. 5 — 'Redirect není povolen – adresa URL Objednatele v Inzerátu nesmí směřovat zejména na komerční realitní servery'; čl. 3 odst. 8 — zákaz inzerátů k podnikatelským účelům bez písemného souhlasu, smluvní pokuta 35 000 Kč za každé porušení; server je jen pro majitele, ne pro RK/makléře. Odkaz na vlastní nekomerční prezentaci výslovně zakázán není — ODHAD: šedá zóna závislá na moderaci, riziko posouzení SaaS prezentace jako 'komerčního' obsahu
  ZDROJ: https://www.bezrealitky.com/information/smluvni-podminky/sluzby-inzerce-nove
- Google Places API: obsah (detaily míst, hodnocení, fotky) se nesmí pre-fetchovat, cachovat ani ukládat; výjimky — place ID lze ukládat neomezeně, zeměpisné souřadnice max. 30 kalendářních dní; při zobrazení dat bez Google mapy je povinné Google logo/atribuce; obsah Places se nesmí zobrazovat s ne-Google mapou (např. Mapbox/OSM). Ukládání hodnocení okolních míst do vlastní DB a jejich trvalé zobrazování v prezentaci by porušilo ToS
  ZDROJ: https://developers.google.com/maps/documentation/places/web-service/policies a https://cloud.google.com/maps-platform/terms/maps-service-terms
- Novinové výstřižky: citační licence § 31 autorského zákona č. 121/2000 Sb. pokrývá užití výňatků pro kritiku, recenzi, vědu či výuku s uvedením autora a pramene; marketingová sekce typu 'napsali o nás' s celými články/skeny do citační licence typicky nespadá — je třeba licence od vydavatele (ODHAD kvalifikace konkrétního užití; samotné znění § 31 doloženo)
  ZDROJ: https://www.kurzy.cz/zakony/121-2000-autorsky-zakon/paragraf-31/ a https://is.muni.cz/elportal/a_zakon/faq/
- Loga médií: podle § 10 zákona č. 441/2003 Sb. (omezení účinků ochranné známky) lze cizí známku užít referenčně/informačně, jen pokud nevzniká dojem obchodního spojení s vlastníkem známky a užití je v souladu s poctivými obchodními zvyklostmi; jinak jde o zásah do práv ke známce
  ZDROJ: https://www.kurzy.cz/zakony/441-2003-zakon-o-ochrannych-znamkach/paragraf-10/ a https://www.epravo.cz/top/clanky/limity-uzivani-cizi-ochranne-znamky-118146.html
- Titulek + krátká anotace + odkaz na článek média je bezpečnější forma sekce 'psali o nás' než sken celého článku; pro placené licence článků existují vydavatelské licence — ODHAD, stojí na obecné konstrukci autorského zákona (výlučná práva § 12 AZ) a praxi vydavatelů, konkrétní ceník nezjišťován
  ZDROJ: ODHAD na základě https://www.zakonyprolidi.cz/cs/2000-121 a https://is.muni.cz/elportal/a_zakon/faq/

### Čísla
- Pokuta pro fyzickou osobu — vlastníka budovy: až 100 000 Kč (http://www.k-p-m.cz/?sankce-a-kontrola,145; https://www.dumazahrada.cz/doporucujeme/mate-platny-a-aktualni-penb-pokud-ne-muze-vam-hrozit-pokuta/)
- Pokuta pro vlastníka bytové jednotky vč. neuvedení třídy v inzerci: až 50 000 Kč (https://www.dumazahrada.cz/doporucujeme/mate-platny-a-aktualni-penb-pokud-ne-muze-vam-hrozit-pokuta/)
- Pokuta pro právnickou/podnikající osobu: až 5 000 000 Kč (http://www.k-p-m.cz/?sankce-a-kontrola,145)
- Bez předané grafické části PENB musí zprostředkovatel uvést třídu G — nejhorší (§ 7a odst. 2 písm. e), https://krajta.slv.cz/2000/406/par_7a)
- 74 % inzerátů realitních kanceláří uvádělo třídu G (kontroly 2015, https://www.hypoindex.cz/clanky/inzeraty-nerikaji-pravdu-o-energeticke-narocnosti/)
- Smluvní pokuta Bezrealitky za komerční inzerát: 35 000 Kč za každé porušení (https://www.bezrealitky.com/information/smluvni-podminky/sluzby-inzerce-nove)
- Google Places cache: place ID neomezeně, souřadnice max. 30 dní, ostatní obsah 0 dní (https://developers.google.com/maps/documentation/places/web-service/policies; https://cloud.google.com/maps-platform/terms/maps-service-terms)
- Sreality — klíčové body podmínek: 74 (kontakty jen v sekci Kontakt), 79 (zákaz URL v popisu), 89 (zákaz webů/kontaktů na fotkách) (https://o-seznam.cz/napoveda/sreality/smluvni-podminky-sluzby-sreality-cz/smluvni-podminky-pro-vkladani-jednorazove-inzerce-do-databaze-serveru-sreality-cz-platne-od-19-5-2025/)
- Výjimka z PENB: budovy s energeticky vztažnou plochou do 50 m2 a stavby pro rodinnou rekreaci (FAQ MPO, otázka 18)

### Mezery
- Nepodařilo se ověřit přesné aktuální znění sankčních ustanovení (§ 12/§ 12a zákona 406/2000 Sb.) přímo v primárním zdroji — zakonyprolidi.cz vracel HTTP 403 a zrcadla § 12 neobsahovala; částky pokut jsou jen ze sekundárních zdrojů a případná novela 2024–2026 měnící sazby není vyloučena
- Neexistuje nalezený oficiální výklad (MPO, SEI, judikatura), zda 'informační a reklamní materiály' výslovně zahrnují vlastní webovou stránku majitele — závěr je jen jazykový výklad (zákon médium neomezuje)
- Sreality zveřejnily nové smluvní podmínky účinné od 8. 4. 2026 — jejich případné změny oproti verzi z 19. 5. 2025 jsem neanalyzoval; nejasné také je, zda moderace Sreality v praxi propustí odkaz na externí prezentaci v sekci Kontakt
- U Bezrealitek se nepodařilo získat úplné aktuální znění podmínek k poli URL — jen výňatky; zda projde odkaz na nekomerční prezentaci vytvořenou přes placený SaaS, není jisté
- Nenalezeno stanovisko ÚOOÚ přímo k fotografiím v realitní inzerci (náhodně zachycení sousedé, výhledy do cizích oken) — závěry jsou odvozeny z obecných stanovisek k fotkám a SPZ
- Aktuální praxe a statistiky kontrol SEI u inzerce za roky 2024–2026 nezjištěny — nalezené konkrétní případy a čísla jsou z let 2014–2015
- Podmínky licencování novinových článků českými vydavateli (ceny, proces) nezjišťovány
- EEA-specifické podmínky Google Maps Platform (od 10/2025 existují oddělené EEA Service Specific Terms) — detailní rozdíly proti globálním podmínkám neprověřeny


## 4. Hloubkové sondy (10 příčin smrti)

## SONDA 1 [SMRTELNÉ / VYSOKÁ]
PŘÍČINA: Prodávali jsme krásu, ale trh kupuje jistotu a dosah. Samoprodejci prokazatelně platí za právní servis (8–12 tis. Kč) a za inzerci na portálech (399–3 993 Kč); kvalitu prezentace v žádné diskuzi neřeší — bolest, kterou produkt léčí, u zákazníka neexistuje nebo je příliš slabá na otevření peněženky.

PŘÍBĚH:
Spustili jsme v srpnu 2026 — přesně do začátku mrtvé sezóny (vrchol trhu je březen–červen). První měsíc: pár stovek návštěv landing page, 41 rozdělaných konceptů, 0 plateb. Lidé si průvodce zkusili, nahráli fotky, došli k platební bráně a odešli. Napsali jsme deseti z nich. Odpovědi se opakovaly: „Hezké, ale já potřebuju, aby to někdo viděl." Prezentace bez návštěvnosti je billboard v lese — a Sreality, kudy jde odhadem ~70 % poptávek, zakazují URL v popisu inzerátu i na fotkách. Zákazník tedy zaplatil, dostal krásnou stránku, a neměl ji legálně kam dát.

Mezitím jsme si konečně přečetli, co samoprodejci skutečně řeší: v diskuzi na Modrém koníku (46 příspěvků) padal právník na smlouvy (~8 000 Kč), úschova peněz, katastr, cena, prohlídky. Kvalitu prezentace nezmínil nikdo — ani jednou. Peněženku otevírají u Bezrealitky za advokátní servis 11 990 Kč a za inzerci 399–3 993 Kč, protože to kupuje jistotu a dosah. My prodávali krásu, kterou zákazník na škále bolestí vůbec nevedl. Otínská nás zmátla: byla to naše vlastní láska k řemeslu, ne poptávka trhu.

Do prosince jsme měli 7 plateb — z toho 4 makléři, kteří chtěli měsíční tarif a napojení na RealityMIX (jako webnem.cz za 250 Kč/měs), což jsme neměli. Jednorázový model na trhu, kde samoprodejce nakupuje jednou za život a aktivně jich inzeruje jen pár tisíc ročně (Bezrealitky ~2 126 prodejních inzerátů), matematicky nevycházel. V lednu 2027, uprostřed sezónního mrtva, jsme to zavřeli — stejně jako před námi nemovitostisvepomoci.cz, Purplebricks (z 1 mld. GBP na 1 GBP) a Homie.

SKRYTÝ PŘEDPOKLAD: Brali jsme za samozřejmé, že když krásná prezentace nadchne nás, majitel za ni zaplatí — tedy že kvalita prezentace je bolest, kterou samoprodejce vnímá a řeší penězi, místo jistoty (právník, úschova) a dosahu (portály), za které prokazatelně platí.

VAROVNÉ SIGNÁLY:
- Konverze dokončený koncept → platba pod 5 % u prvních 50 konceptů, a v exit dotazech se opakuje otázka „a kdo to uvidí?“ místo výhrad k ceně.
- V monitorovaných diskuzích a FB skupinách „bez realitky“ za měsíc nula spontánních zmínek o kvalitě prezentace/fotek — všechny dotazy se točí kolem smluv, úschovy a katastru.

LEVNÝ TEST: Falešné dveře: jednoduchá landing page „Prémiová webová prezentace vaší nemovitosti za 990 Kč“ s ukázkou Otínské a tlačítkem „Chci ji“ (po kliknutí: „Spouštíme brzy, nechte e-mail“). Rozpočet ~1 500 Kč na Sklik/Facebook reklamu cílenou na „prodej bytu bez realitky“; paralelně napsat 15 aktuálním samoprodejcům z Bezrealitek/FB skupin a nabídnout prezentaci zdarma výměnou za rozhovor. Kritérium: aspoň 5 % kliknutí→e-mail A aspoň 3 z 15 oslovených řeknou, že by za to zaplatili — jinak bolest neexistuje.

---

## SONDA 2 [SMRTELNÉ / VYSOKÁ]
PŘÍČINA: Stránka bez návštěvníků. Prezentace nemá odkud získat kupce: Sreality zakazuje URL v popisu inzerátu, Bezrealitky je šedá zóna — zaplacená prezentace nepřinesla majitelům žádné dotazy od zájemců, první zákazníci se cítili podvedeni a garance/refundy či špatné recenze produkt pohřbily.

PŘÍBĚH:
Září 2026. Prvních dvanáct zákazníků zaplatilo za publikaci. Paní z Kladna prodává byt 3+kk, prezentaci má hotovou za večer — vypadá skvěle. Pak řeší, kde ji ukázat kupcům. Dá inzerát na Sreality (72,60 Kč/den), protože tam je odhadem ~70 % poptávek — a do popisu vloží odkaz na prezentaci. Sreality ho smažou: pravidla výslovně zakazují URL v popisu i na fotkách. Zkusí Bezrealitky (balíček od 399 Kč) — externí odkaz je šedá zóna a pokuta 35 000 Kč za komerční obsah ji vyděsí. Prezentace tak visí na doméně, kterou nezná nikdo kromě ní. Google ji za měsíc nezaindexuje na nic smysluplného — na dotaz „byt 3+kk Kladno" vyhrávají Sreality a Bezrealitky.

Říjen: statistiky návštěvnosti (které jsme jí sami dali do adminu) ukazují 23 návštěv za měsíc — z toho 19 je ona sama a její rodina. Nula dotazů od kupců. Napíše nám: „Zaplatila jsem, a k čemu to je, když to nikdo nevidí?" Má pravdu. Vracíme peníze. Stejný scénář u 9 z 12 zákazníků. Dva napíšou recenzi na Google a do FB skupiny „bez realitky": „vyhozené peníze, kupci to nenajdou". FB skupiny jsou inzertní nástěnky — negativní zkušenost se tam šíří rychleji než produkt.

Prosinec–únor je na trhu mrtvo (vrchol sezóny je III–VI), takže nové zákazníky není kde chytit. V lednu 2027 máme čtyři aktivní prezentace, všechny neplacené koncepty, a refundovali jsme víc, než jsme vybrali. Produkt nezemřel na kvalitu — zemřel na to, že prezentace bez distribuce je billboard v lese.

SKRYTÝ PŘEDPOKLAD: Brali jsme za samozřejmé, že hezká prezentace si kupce najde sama — že přivedení zájemců na stránku je problém zákazníka, ne náš, přitom kanály s reálnou poptávkou (Sreality ~70 % trhu) odkazy na externí weby aktivně blokují.

VAROVNÉ SIGNÁLY:
- Medián unikátních návštěv publikované prezentace za prvních 30 dní pod ~50, s většinou návštěv od samotného majitele — měřitelné z analytiky, kterou už MVP má.
- Podíl zaplacených prezentací s 0 dotazy od zájemců do 30 dní od publikace nad 50 % (plus první žádost o refund s odůvodněním „nikdo to nevidí").

LEVNÝ TEST: Do 14 dnů a za ~500 Kč: udělat jednu vlastní testovací prezentaci reálného bytu (nebo Otínské), podat soukromý inzerát na Sreality na 5 dní (~365 Kč) a na Bezrealitky zdarma, a prakticky vyzkoušet všechny cesty, jak z inzerátu dostat zájemce na prezentaci (odkaz v popisu, QR/URL na fotce, odkaz v e-mailové/telefonické odpovědi zájemcům). Změřit: co moderace smaže, co projde, a kolik reálných lidí na prezentaci doklikne. Pokud jediná funkční cesta je ruční posílání odkazu odpovídajícím zájemcům, hlavní slib produktu („stránka přitáhne kupce") neplatí a je to slib jiného produktu.

---

## SONDA 3 [SMRTELNÉ / VYSOKÁ]
PŘÍČINA: Cenová past. Trh kotví hodnotu jinde: celý inzerát na Bezrealitkách stojí 399 Kč, web nemovitosti pro makléře 95–250 Kč/měs, ručně vyrobený web 6 999 Kč. Cena, kterou by zákazník akceptoval (stovky Kč), neuživí ani provoz; cena, která by dávala byznysový smysl (tisíce), se srovnává s celou inzercí na Sreality a prohrává.

PŘÍBĚH:
Spustili jsme v červenci 2026 s cenou 990 Kč za publikaci. První reakce z FB skupin „bez realitky" byla vždy stejná otázka: „Proč mám platit skoro tisícovku za stránku, když celý inzerát na Bezrealitkách s exportem na iDNES stojí 399 Kč a je na něm garance vrácení peněz?" Nešlo o kvalitu — lidi tu stránku i chválili. Jen ji v hlavě porovnali s cenou celé inzerce a vyšlo jim, že doplněk nemůže stát víc než hlavní produkt. V září jsme zlevnili na 490 Kč. Konverze se nehnula: samoprodejce řeší právníka za 8–12 tisíc, úschovu a katastr, ne prezentaci — a i těch 490 Kč porovnal se Sreality za 72,60 Kč/den a odešel.

V říjnu jsme se otočili na makléře s cenou 1 990 Kč za prezentaci. Makléř to ale porovnal s webnem.cz za 250 Kč/měsíc bez omezení počtu nemovitostí a Poski od 95 Kč/měsíc — na jednu zakázku jsme byli 10× dražší než konkurence na celý rok. Prémiový konec (kurátorovaná stránka jako Otínská) mezitím obsluhovala webpronemovitost.cz za 6 999 Kč ručně, bez nákladů na vývoj SaaS.

V lednu 2027 účetnictví: 11 zaplacených publikací za 6 měsíců, tržby ~7 000 Kč. Nepokrylo to ani hosting, doménu a AI nástroje, natož jedinou korunu marketingu. Nebyla cena, která by fungovala: pod 399 Kč jsme byli neuživitelní (na provoz by bylo potřeba stovek prodejů měsíčně z trhu, kde aktivně inzeruje pár tisíc samoprodejců ročně), nad 399 Kč jsme prohrávali kotvu s celou inzercí. Produkt nezemřel na kvalitu, ale na to, že v cenové mapě zákazníka pro něj neexistovalo místo.

SKRYTÝ PŘEDPOKLAD: Brali jsme za samozřejmé, že zákazník ocení prezentaci podle její kvality — ve skutečnosti ji ocení podle nejbližší cenové kotvy, a tou je celý inzerát za 399 Kč.

VAROVNÉ SIGNÁLY:
- Podíl návštěvníků ceníku, kteří odejdou bez zahájení platby, nad ~95 % — a v dotazech se opakuje srovnání s Bezrealitkami/Sreality (počítat výskyty slova „inzerát" v námitkách).
- Dokončené koncepty vs. zaplacené publikace: pokud víc než 9 z 10 hotových konceptů nikdy nezaplatí, lidé chtějí výstup, ne cenu.

LEVNÝ TEST: Skutečný předprodej místo stavění: oslovit 30 aktivních samoprodejců přímo z inzerátů na Bezrealitkách/České reality (kontakt je veřejný, telefonicky/e-mailem) a nabídnout hotovou prezentaci jejich nemovitosti za 490 Kč předem, s vrácením peněz do 14 dnů. Náklad: čas + max. stovky Kč. Kritérium: zaplatí-li méně než 3 z 30, cenová past je potvrzená; zároveň zaznamenat, s čím cenu srovnávají.

---

## SONDA 4 [SMRTELNÉ / VYSOKÁ]
PŘÍČINA: Mikroskopický a jednorázový trh. Aktivně inzerujících samoprodejců je řádově tisíce (Bezrealitky ~2 100 prodejních inzerátů v daný moment), každý nakupuje jednou za dekádu, retence nulová — i při zázračné penetraci vychází roční tržba na hobby, ne byznys; celosvětové FSBO příběhy (ForSaleByOwner za 2,5 mil. USD, Purplebricks za 1 GBP) ukazují strop kategorie.

PŘÍBĚH:
Spustili jsme v srpnu 2026 — přesně do sezónního útlumu (vrchol trhu je březen–červen, my chytili nájezd do mrtvého prosince–února). Za první měsíc 4 zaplacené prezentace, vesměs od známých. Pak přišlo počítání, které jsme měli udělat před stavbou: aktivně inzerujících samoprodejců je v ČR v jeden moment řádově pár tisíc (Bezrealitky ~2 126 prodejních inzerátů; jejich celoroční průtok byl ~5 500 prodejů už v rekordním 2021). I kdybychom zázrakem získali 5 % z nich — což se nikomu bez rozpočtu nepovede — je to ~275 prodejů ročně. Při ceně 990 Kč je to 272 tisíc Kč tržeb za rok. Hobby, ne firma.

Horší bylo, že zákazník se nikdy nevrátil. Prodal dům, poděkoval, zmizel na deset let. Každou korunu tržby jsme museli znovu a znovu zaplatit akvizicí — a akviziční kanály neexistovaly: Sreality zakazují URL v inzerátech i na fotkách, Bezrealitky hrozí pokutou 35 000 Kč za komerční obsah, FB skupiny „bez realitky" jsou jen nástěnky inzerátů. V prosinci 2026 jsme měli 11 platících celkem, nulovou retenci z principu produktu a CAC vyšší než cenu prezentace.

V lednu 2027 jsme si přečetli, co jsme mohli vygooglit za večer: kategorie „single property website" celosvětově žije z MAKLÉŘŮ (předplatné 10–30 USD/měs, Luxury Presence stovky dolarů měsíčně), ne ze samoprodejců. ForSaleByOwner.com se po 20 letech prodal za 2,5 mil. USD, Purplebricks spadl z miliardy liber na 1 libru, česká nemovitostisvepomoci.cz zanikla. Strop kategorie byl známý a nízký. Zavřeli jsme.

SKRYTÝ PŘEDPOKLAD: Brali jsme za samozřejmé, že „hodně lidí prodává bez makléře" znamená dost velký a dosažitelný trh — ale trh se počítá jako (aktivně inzerující samoprodejci v daný moment) × (nákup jednou za dekádu) × (dosažitelnost bez akvizičního kanálu), a to vychází na tisíce lidí ročně, ne statisíce.

VAROVNÉ SIGNÁLY:
- Podíl opakovaných/vracejících se zákazníků za 90 dní: pokud je pod 10 % (a u samoprodejců bude ~0 %), každá tržba stojí plnou akvizici — sledovat CAC vs. cena prezentace každý měsíc.
- Počet nových samoprodejních inzerátů na Bezrealitkách/Srealitách týdně v našem regionu: pokud je celý český „rybník" pod ~500 nových samoprodejců měsíčně, matematika nikdy nedá byznys — spočítat před dalším vývojem, ne po něm.

LEVNÝ TEST: Týden 1: ručně spočítat reálný přítok — nové soukromé inzeráty na Bezrealitkách + Srealitách za 7 dní (filtr „soukromá inzerce"), vynásobit 52 = celoroční TAM v kusech; vynásobit uvažovanou cenou (např. 990 Kč) a realistickou penetrací 1–3 %. Týden 2: oslovit zpráv­ou 30 čerstvých samoprodejců s nabídkou hotové prezentace za 490 Kč (udělat ručně, bez produktu) a měřit, kolik zaplatí. Náklad: čas + max. pár set Kč. Pokud TAM × penetrace × cena < 300 tis. Kč/rok NEBO zaplatí méně než 2 z 30, příčina je potvrzena — buď zvednout cenu 10×, přepnout na makléře s předplatným, nebo nestavět.

---

## SONDA 5 [SMRTELNÉ / VYSOKÁ]
PŘÍČINA: Cena akvizice zabila jednorázovou platbu. Zákazník v okamžiku potřeby se dá koupit jen přes drahá realitní klíčová slova nebo SEO obsazené Bezrealitkami a obsahovými weby; jednorázová platba za publikaci nikdy nezaplatila náklad na jeho získání — proto kategorie všude na světě přežívá jen prodejem makléřům (opakovaný zákazník).

PŘÍBĚH:
Spustili jsme v červenci 2026 s cenou 990 Kč za publikaci. První měsíc přišlo pár známých a jedna zvědavá makléřka, pak ticho — a my zjistili, že zákazníka neumíme koupit. Samoprodejce musíme chytit v jediném týdnu, kdy inzerát připravuje. Jediné kanály, kde v tu chvíli je, jsou Google a inzertní portály. Na Googlu jsme na slova jako „prodej bytu bez realitky" dražili proti Bezrealitkám, Dostupnému advokátovi a realitkám, které z provize 3–5 % zaplatí za proklik cokoliv — proklik vycházel na desítky korun. Při konverzi 1–2 % (koncept zdarma → platba) stál jeden platící zákazník 3 000–6 000 Kč. Z něj jsme měli 990 Kč. Jednou. Nikdy znovu — dům se prodá a zákazník mizí.

SEO nepomohlo: první stránku drží Bezrealitky, iDNES a obsahové weby, nový web se tam za 6 měsíců nedostal. Virální smyčka přes publikované prezentace neexistovala, protože Sreality (~70 % poptávek) zakazují URL v inzerátu — naše stránky nikdo cizí neviděl. A trh je maličký: aktivně inzerujících samoprodejců jsou nízké tisíce ročně (Bezrealitky ~2 126 prodejních inzerátů), takže drahá akvizice neměla ani kde škálovat.

V listopadu jsme spočítali, že každý zákazník nás stojí čtyřnásobek toho, co zaplatí. V prosinci trh sezónně umřel (mrtvo XII–II) a v lednu 2027 jsme to zabalili. Přesně proto celá kategorie „single property website" všude na světě prodává makléřům za 10–25 USD měsíčně: makléř se vrací každý měsíc a akvizici splatí opakovanými platbami. My prodávali jednorázovku člověku na jedno použití.

SKRYTÝ PŘEDPOKLAD: Brali jsme za samozřejmé, že zákazník si nás v okamžiku potřeby sám levně najde, takže jednorázová platba ve stovkách korun pokryje náklad na jeho získání.

VAROVNÉ SIGNÁLY:
- CAC > cena: útrata za reklamu dělená počtem plateb přesáhne cenu publikace hned v prvním měsíci kampaně — počítat týdně, ne až po půl roce.
- Cena prokliku v Google Ads na slova typu „prodej bytu bez realitky" nad ~20 Kč při konverzi koncept→platba pod 5 % — matematicky to nikdy nevyjde.

LEVNÝ TEST: Za 2 000 Kč pustit 10denní kampaň Google Ads na 5 klíčových slov („prodej bytu bez realitky" apod.) na jednoduchou landing page s cenou 990 Kč a tlačítkem „Chci prezentaci" (sbírá e-mail jako předobjednávku). Měřit: skutečné CPC, cenu za e-mail a počet lidí ochotných dát kontakt při viditelné ceně. Když cena za jeden kontakt přesáhne ~300 Kč nebo přijde méně než 5 kontaktů, jednorázový model akvizici neuživí.

---

## SONDA 6 [SMRTELNÉ / VYSOKÁ]
PŘÍČINA: Aktivační propast. Netechnický majitel s fotkami z mobilu nikdy nedosáhl kvality vzoru Otínská (dron, panorama, půdorysy) — jeho koncept vypadal jako obyčejný inzerát, jen jinde; hodnotu neuviděl, nezaplatil, a drafty zdarma zůstaly hřbitovem nedokončených prezentací. AI asistence textů, která to měla zachránit, nebyla v MVP.

PŘÍBĚH:
Červenec 2026, spuštěno. Landing page slibuje „prezentaci jako Otínská" — dron, 360° panorama, půdorysy, výstřižky z novin. Jenže Otínská vznikla ručně: objednaný dronař, koupené panorama, překreslené půdorysy, hodiny kurátorské práce. První reální uživatelé přišli s tím, co mají: 12–20 fotek z mobilu, focených odpoledne proti oknu, obývák s prádelníkem a sušákem. Průvodce je provedl, nahráli fotky, u pole „popis nemovitosti" napsali dvě věty („Prodám dům 4+1, dobrý stav, volejte") — AI asistent textů v MVP nebyl. Klikli na náhled a uviděli pravdu: velké fotky z mobilu jsou jen velké špatné fotky. Jejich koncept nevypadal jako Otínská, vypadal jako inzerát ze Sreality, jen na adrese, kterou nikdo nezná — a kterou na Sreality (odhadem ~70 % poptávek) ani nesmí vložit, protože pravidla URL v inzerátu zakazují.

Do listopadu se registrovalo pár desítek lidí, vznikly desítky konceptů, publikace v jednotkách. Konverze koncept→platba se držela pod 5 %. Ti, co došli k platební stěně (kterou Karel mezitím dostavěl), si spočítali: za 399 Kč mám na Bezrealitkách Komplet s exportem na tři portály a garancí vrácení; tady mám zaplatit stovky až tisíce za hezčí rámeček kolem svých špatných fotek. Hodnotový rozdíl, který měl prodávat, existoval jen ve vzoru — ne v tom, co si uživatel sám vyrobil. A prvky, které vzor dělaly prémiovým, produkt stejně nesměl replikovat: hodnocení okolí z Googlu zakazují Places ToS, výstřižky chtějí licenci vydavatele.

V lednu 2027 je databáze hřbitov: rozpracované koncepty s 6 fotkami a prázdným popisem, poslední login před 2 měsíci. Nikdo se nevrátil dokončit — protože dokončení nezlepšilo výsledek, jen ho zveřejnilo. Produkt prodával výsledek profesionální produkce, ale dodával jen šablonu; propast mezi nimi měl překlenout uživatel sám, a ten to neuměl a nevěděl proč by měl.

SKRYTÝ PŘEDPOKLAD: Brali jsme za samozřejmé, že kvalitu vzoru Otínská tvoří šablona a rozložení stránky, a ne vstupní materiál a kurátorská práce, kterou netechnický majitel nemá jak sám dodat.

VAROVNÉ SIGNÁLY:
- Konverze koncept→publikovaná prezentace pod 10 % a medián nahraných fotek v konceptu pod ~10 kusů bez návratu do 7 dnů (hřbitov draftů roste).
- Podíl uživatelů, kteří si zobrazí náhled a do 48 hodin se nevrátí, přes 60 % — náhled hodnotu zabíjí místo aby ji prodával.

LEVNÝ TEST: Test „vlastní materiál": najdi 5 skutečných samoprodejců (inzeráty na Bezrealitkách/FB „bez realitky"), nabídni jim zdarma ruční výrobu prezentace POUZE z fotek a textů, které už mají v inzerátu — bez dronu, bez retuše. Hotovou stránku jim ukaž vedle jejich inzerátu a polož dvě otázky: „Zaplatili byste za tohle 500 Kč?" a „Kam byste odkaz dali, když ho Sreality zakazují?" Náklady: čas + max. pár stovek za oslovení/odměnu. Pokud ani hotová stránka z jejich vlastních podkladů nevyvolá ochotu platit, aktivační propast je potvrzená dřív, než se dostaví platby a admin.

---

## SONDA 7 [VÁŽNÉ / VYSOKÁ]
PŘÍČINA: Právní pasti. Produkt nechal zákazníky publikovat inzerci bez PENB třídy (pokuta až 100 tis. Kč od SEI), s fotkami sousedů a SPZ (GDPR), a to nejatraktivnější z reference — hodnocení okolí z Google a novinové výstřižky — bylo právně nepoužitelné (ToS Google, autorská práva). Produkt tak nemohl legálně doručit slibovanou kvalitu a k tomu vystavoval zákazníky i provozovatele postihu.

PŘÍBĚH:
Spustili jsme v srpnu 2026 a vzorová prezentace „jako Otínská" byl náš hlavní prodejní argument. Jenže už při stavbě šablony se ukázalo, že to nejlepší z reference legálně nejde: hodnocení okolí z Googlu nesmíme dle Places ToS ukládat a zobrazovat ve vlastní službě, novinové výstřižky chtěly licenci od vydavatelů (nikdo z nás nevěděl, koho a jak žádat) a cenové odhady jsme neměli odkud brát. Publikovaná verze tak vypadala jako hezčí Sreality inzerát — a za to nikdo nechtěl platit stovky až tisíce Kč, když Bezrealitky Komplet stojí 399 Kč.

V říjnu přišel první skutečný průšvih: zákaznice publikovala prezentaci bez třídy PENB. Zákon 406/2000 § 7a ji vyžaduje v „informačních a reklamních materiálech" — tedy s vysokou pravděpodobností i na jejím vlastním webu — a soused, se kterým se hádala o plot, ji nahlásil na SEI. Hrozba pokuty až 100 tis. Kč pro fyzickou osobu, a ona ji přeposlala nám s dotazem, proč jsme ji nevarovali. Náš produkt přitom PENB pole vůbec neměl povinné, protože jsme „nechtěli otravovat uživatele ve wizardu". Do toho dvě prezentace s dron fotkami zachytily sousedovic zahrady a SPZ aut — GDPR stížnost, žádost o smazání, žádný proces na to.

V prosinci jsme místo prodeje řešili konzultace s advokátem (víc, než kolik jsme kdy vybrali na publikacích), přepisovali podmínky užití, přenášeli odpovědnost na uživatele — a tím zabili i poslední důvěru netechnické persony, která si nás platila právě proto, aby „to bylo v pořádku". Skutečná placená právní bolest samoprodejců (advokátní servis za 9–15 tis. Kč) přitom celou dobu ležela vedle a my ji ignorovali.

SKRYTÝ PŘEDPOKLAD: Brali jsme za samozřejmé, že co jde ručně poskládat do jedné kurátorované reference (Google hodnocení, výstřižky, dron fotky bez anonymizace, inzerát bez PENB), jde legálně zopakovat jako samoobslužný produkt pro stovky cizích lidí.

VAROVNÉ SIGNÁLY:
- Podíl publikovaných prezentací bez vyplněné třídy PENB — pokud přesáhne ~20 %, produkt aktivně vyrábí pokutovatelné inzeráty (měřitelné dotazem do DB každý týden).
- Počet prvků z reference Otínská, které v šabloně reálně chybí nebo jsou nahrazené slabší verzí (Google hodnocení, výstřižky, odhady) — pokud jsou 3+ pryč, prodáváme něco jiného, než ukazujeme.

LEVNÝ TEST: Jedna placená konzultace s advokátem na IT/reality (cca 1 500–2 000 Kč / 1 hod, do týdne): předložit mu vzor Otínská a checklist — PENB na vlastním webu majitele, Google Places hodnocení ve vlastní službě, novinové výstřižky, dron fotky sousedů/SPZ. Výstup: co smí být v samoobslužné šabloně, co jen s ručním procesem, co vůbec. Souběžně e-mail na SEI s dotazem, zda se § 7a vztahuje na vlastní web majitele (zdarma).

---

## SONDA 8 [VÁŽNÉ / VYSOKÁ]
PŘÍČINA: Makléřská persona nebyla záchrana, ale jiný produkt. Makléři už web nemovitosti mají — od 95 Kč/měs integrovaný do svých systémů, nebo v provizi; značka „Prodej si sám" je navíc aktivně odpuzuje. Pivot na B2B by znamenal jinou distribuci, jinou značku a jiné funkce — tedy nový produkt, ne záchranu tohoto.

PŘÍBĚH:
Říjen 2026. Po třech měsících bez platícího samoprodejce Karel otočil landing page na makléře: „Prezentace, která prodá i vaši značku." Napsal 60 makléřům z Reality.iDNES, obeslal dvě FB skupiny makléřů. Odpovědělo jedenáct. Osm z nich mělo web nemovitosti už v ceně svého systému — Poski REAL od 95 Kč/měsíc, webnem.cz za 250 Kč/měsíc s napojením na RealityMIX, kam stejně exportují inzeráty. Náš produkt bez exportu do Sreality/RealityMIX pro ně znamenal přepisovat každou zakázku ručně podruhé. Dva makléři řekli natvrdo: „Prodej si sám? To je stránka, co říká klientům, že mě nepotřebují. Tam se registrovat nebudu."

Listopad: pokus o záchranu. Makléři chtěli vlastní logo místo naší značky, hromadnou správu zakázek, fakturaci na IČO, měsíční paušál místo platby za kus a hlavně import z realitního softwaru. Nic z toho MVP nemělo — bylo postavené na průvodce pro jednoho netechnického majitele s jednou nemovitostí. AI vývoj sice funkce zvládal dopisovat, ale každá z nich byla k ničemu pro původní personu a distribuce (obvolávání realitek, obchodní schůzky, provizní partneři) byla práce, na kterou jeden produkťák bez rozpočtu neměl kapacitu ani chuť. Světový vzor to potvrzoval: single property weby prodávají makléřům Luxury Presence za 300–1500 USD/měs jako součást celé marketingové platformy, ne jako samostatnou stránku za stovky korun.

Leden 2027: dva makléři na „zdarma na zkoušku", nula platících. Pivot na B2B by znamenal novou značku, nový web, integraci na RealityMIX a rok obchodní práce — tedy nový produkt. Ten se nepostavil, protože nikdo nechtěl přiznat, že ten starý je mrtvý.

SKRYTÝ PŘEDPOKLAD: Brali jsme za samozřejmé, že makléř je „záložní zákazník" téhož produktu — že když nekoupí majitelé, stejný nástroj se stejnou značkou a distribucí prostě prodáme makléřům.

VAROVNÉ SIGNÁLY:
- Z 20 oslovených makléřů méně než 3 dojdou k publikované prezentaci vlastní zakázky (i zdarma) do 30 dnů — a první otázka většiny zní „umí to export/import z mého systému?“.
- Poměr požadovaných B2B funkcí (logo makléře, hromadná správa, fakturace, import) vůči funkcím MVP: když každá makléřská schůzka generuje 3+ nové požadavky mimo roadmapu, prodáváme jiný produkt.

LEVNÝ TEST: Do 14 dnů obvolat/napsat 15 makléřům a malým realitkám (kontakty zdarma ze Sreality) s nabídkou: „prémiová webová prezentace vaší zakázky, první zdarma, pak X Kč" — pod neutrální značkou, s ukázkou Otínské. Měřit: kolik jich řekne ano, kolik se ptá na integraci s jejich softwarem, kolik reaguje na jméno „Prodej si sám" negativně (druhé kolo A/B s touto značkou). Náklad: čas + max. stovky Kč za telefon/doménu na neutrální landing page. Pokud méně než 3 z 15 chtějí pokračovat bez integrace, makléřská persona jako záchrana padá.

---

## SONDA 9 [SMRTELNÉ / VYSOKÁ]
PŘÍČINA: Žádný příkop. Bezrealitky (pod tlakem po fúzi) přidaly hezčí prezentaci jako feature balíčku, případně AI web-buildery (Wix AI, Durable…) udělaly stránku nemovitosti na jeden prompt v předplatném, které lidé už platí — jediná diferenciace produktu se dala okopírovat přes noc a nezbyl důvod platit zvlášť.

PŘÍBĚH:
Spustili jsme v červenci 2026. Prodejní argument byl jediný: hezčí stránka nemovitosti než inzerát. Jenže už v den spuštění uměl Durable nebo Wix AI vygenerovat z deseti fotek a pár vět slušnou jednostránkovou prezentaci na jeden prompt — v předplatném kolem 500 Kč měsíčně, které část lidí už platila. Makléřům navíc totéž prodával webnem.cz za 250 Kč/měs s napojením na RealityMIX a Poski od 95 Kč/měs. Naše cena v nízkých tisících za jednu publikaci vedle toho vypadala absurdně dřív, než jsme ji stihli oznámit.

Na podzim přišla rána z druhé strany: Bezrealitky, pod tlakem po fúzi a s pouhými ~2 126 prodejními inzeráty, potřebovaly zvednout hodnotu balíčků — a prémiová webová prezentace nemovitosti je pro ně jedno odpoledne vývoje navrch k balíčku Komplet od 399 Kč, i s exportem na iDNES a RealityMIX, který my nemáme a mít nemůžeme (Sreality zakazují URL v inzerátech, takže naše stránka ani nešla propojit s místem, kde je ~70 % poptávky). Kdo chtěl ruční prémiovku typu Otínská, koupil ji na klíč u webpronemovitost.cz za 6 999 Kč.

V lednu 2027 sedíme nad čísly: pár desítek konceptů zdarma, jednotky plateb. Ne proto, že by produkt byl špatně udělaný — proto, že jeho jediná odlišnost (vzhled stránky) byla komodita, kterou vyrobil kdokoli s AI builderem přes noc, a my neměli nic dalšího: žádnou distribuci, žádná data, žádnou značku, žádné napojení na portály.

SKRYTÝ PŘEDPOKLAD: Brali jsme za samozřejmé, že krásná prezentace je vzácná a obhájitelná hodnota sama o sobě — ne komodita, kterou AI buildery a portály zreplikují za odpoledne a přibalí zdarma k tomu, co lidé už platí.

VAROVNÉ SIGNÁLY:
- Ceníky konkurence 1× měsíčně, písemně s datem: jakmile se u Bezrealitek (balíček Komplet 399 Kč), webnem.cz nebo Poski objeví položka typu webová prezentace / mikrostránka nemovitosti, příkop zmizel.
- Slepý test rozlišitelnosti každý měsíc: vygenerovat tutéž nemovitost v aktuálním AI builderu (Durable/Wix AI) a ukázat obě stránky vedle sebe 10 lidem — pokud méně než 7 z 10 pozná a preferuje tu naši, diferenciace reálně neexistuje.

LEVNÝ TEST: Kopírovací test za jeden týden: vezmi fotky a texty z Otínské a zkus sám (jako nekodér) za max. 2 hodiny postavit srovnatelnou stránku ve Wix AI a Durable (zkušební verze + 1 měsíc předplatného, dohromady pod 1 500 Kč). Pak obě verze ukaž vedle sebe 10 skutečným samoprodejcům z FB skupin „bez realitky" a polož dvě otázky: která je lepší a kolik korun byste zaplatili za každou. Pokud rozdíl nepoznají nebo za náš výstup nenabídnou násobně víc, příkop neexistuje a nemá smysl dostavovat platby.

---

## SONDA 10 [VÁŽNÉ / VYSOKÁ]
PŘÍČINA: Provoz jednoho nekodéra. Platby přinesly refundy, spory, podporu a GDPR žádosti; sezónnost (mrtvo prosinec–únor) sebrala příjmy, zatímco „výkladní skříň prodeje domu nesmí nikdy spadnout" vyžadovala pohotovost, kterou jednočlenný tým s AI vývojem neuměl držet — provozní náklady (čas + peníze) předběhly tržby.

PŘÍBĚH:
Spustili jsme v srpnu 2026 — na konci sezóny. Do listopadu přišlo pár desítek platících (řekněme 40 publikací po ~800 Kč = 32 tis. Kč hrubého za čtvrt roku). Jenže s první platbou začal druhý produkt, který nikdo nestavěl: provoz. První refund přišel týden po spuštění — majitel zaplatil, pak zjistil, že na Sreality (odhadem ~70 % poptávek) nesmí dát URL do inzerátu, prezentaci nikdo neviděl a chtěl peníze zpět. Následovala GDPR žádost o výmaz (soused na dron fotce), dotaz SEI kvůli chybějícímu PENB štítku na dvou stránkách (hrozba pokuty 50–100 tis. Kč pro majitele — a naštvaný majitel to obrátil na nás) a e-maily typu „nejde mi nahrát fotka" každý druhý den. Karel, produkťák bez schopnosti číst kód, řešil každý incident přes AI asistenta: co je hotové za 20 minut pro programátora, trvalo půl dne pokusů, a dvakrát oprava rozbila něco jiného.

V prosinci trh zamrzl (mrtvo XII–II je ověřený fakt) — nové publikace spadly na 2–3 za měsíc, tedy pod 3 000 Kč tržeb. Fixní náklady ale běžely dál: hosting, AI nástroje, platební brána s minimy, ~1 500–3 000 Kč měsíčně, plus 15–20 hodin Karlova času týdně na podporu a hašení. V lednu spadla na 36 hodin veřejná stránka domu, jehož majitel měl ten víkend tři domluvené prohlídky. Nedokázali jsme to opravit rychle — nikdo v týmu neuměl diagnostikovat produkci. Majitel žádal vrácení peněz a napsal recenzi na FB skupinu „bez realitky". Tam, kde jsme chtěli získávat zákazníky zdarma (rozpočet na marketing: nula), teď viselo varování. V únoru Karel spočítal, že tři mrtvé měsíce prodělal víc, než za podzim vydělal, a projekt ukončil dřív, než přišla jarní sezóna.

SKRYTÝ PŘEDPOKLAD: Brali jsme za samozřejmé, že „hotový produkt" končí publikací stránky — že provoz (podpora, refundy, výpadky, právní žádosti) bude po spuštění zanedbatelný a zvládne ho jeden nekodér s AI po večerech.

VAROVNÉ SIGNÁLY:
- Poměr provozního času k tržbám: jakmile podpora+opravy přesáhnou 1 hodinu na každých 1 000 Kč tržeb dva týdny po sobě, model se nedá udržet.
- Průměrná doba vyřešení incidentu (od nahlášení po opravu v produkci): pokud běžná chyba trvá déle než 24 hodin a výpadek veřejné stránky déle než 4 hodiny, provoz nekodér nedrží.

LEVNÝ TEST: Provozní zkouška ohněm bez zákazníků: 1 týden nechat běžet 3 testovací prezentace v produkci a nasimulovat 5 reálných incidentů (výpadek stránky v neděli večer, žádost o refund, GDPR výmaz fotky, rozbitý upload, dotaz na PENB). Změřit u každého čas do vyřešení jen s AI, bez programátora. Kritérium: výpadek opraven do 4 h, ostatní do 24 h. Náklady: ~0 Kč hotově (hosting už běží), max 2 000 Kč za hodinovou konzultaci devops/právníka na sepsání scénářů.

---

