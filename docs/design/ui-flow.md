# Uzivatelsky flow

Krok po kroku, jak uzivatel pracuje s aplikaci od otevreni po vizualizaci cesty.

---

## 1. Otevreni aplikace

Po nacteni stranky uzivatel vidi:

- **Toolbar** nahore — nazev "Routing Simulator" + tlacitka Topologie a Nastavení
- **Sidebar** vlevo — sekce Přidat (prvek "Nový router"), sekce Routery s 7 pocatecnimi uzly (A-G), polozka Cesta a sekce Tabulka (pokud je vybran router)
- **Canvas** uprostred — platno s teckovym vzorem, 7 routeru a 8 propoju
- **FloatingBar** dole — protokol "RIP", tlacitka simulace, badge "Pripraveno"

Pocatecni topologie je prednastavena pro demonstraci:

```
    Router A -----1----- Router B -----3----- Router C
       |                  |                    |
      (2)                (1)                  (2)
       |                  |                    |
    Router D -----4----- Router E -----1----- Router F
                          |
                         (3)
                          |
                        Router G
```

---

## 2. Pridani routeru

1. Uzivatel najede mysi v sidebaru na prvek **[Nový router]** v sekci Přidat
2. Pretahne ho mysi (Drag & Drop) kamkoliv na platno (Canvas)
3. Router se objevi na cilove pozici na platne, nazev se automaticky generuje (Router H, Router I, ...)
4. Router se prida do seznamu v sidebaru

**Technicke pozadi:** `onDrop` na Canvasu zachyti pretazeni, zjisti souradnice platna pomoci `screenToFlowPosition` a zavola `onDropRouter()`. V `App.tsx` se vygeneruje novy Node a prida do stavu.

---

## 3. Propojeni routeru

1. Uzivatel najede mysi nad libovolny router na platne
2. Zobrazi se pripojovaci body (Handles) po stranach routeru
3. Uzivatel chyti bod mysi a pretahne ho nad druhy router, ktery chce pripojit
4. Po pusteni mysi se zobrazi **MetricDialog** — modalni dialog pro zadani ceny linky (metriky)
5. Uzivatel zada metriku (vychozi 1, musi byt >= 1) a potvrdi Enterem nebo tlacitkem "Potvrdit"
6. Linka (propoj) se vytvori s prislusnou metrikou zobrazenou jako stredovy stitek

**Technicke pozadi:** React Flow detekuje vytvoreni propoje a spusti `onConnect` callback. Ten otevre MetricDialog, a po schvaleni se prida nova hrana typu `'network'` se zadanou metrikou do stavu.

---

## 4. Vyber protokolu

1. Uzivatel klikne na dropdown **[RIP ▼]** ve FloatingBaru dole
2. Rozbali se nabidka s protokoly: RIP, OSPF, EIGRP
3. Aktivni protokol je zvyraznen teal barvou s check ikonou
4. Zmena protokolu automaticky resetuje predchozi simulaci

**Technicke pozadi:** `handleProtocolChange()` zmeni stav `selectedProtocol`, vymaze historii kroku a provede reset simulace.

---

## 5. Krokovani simulace

### Jeden krok

1. Uzivatel klikne na **[▶ Dalsi krok]** ve FloatingBaru
2. Spusti se prislusna iterace protokolu
3. **Pills (animovane castice)** vyjedou po hranach a vizualizuji tok aktualizaci/paketu
4. Aktualizuji se routovaci tabulky v sidebaru
5. Zmenene routery se na platne docasne zlutě zvyrazni
6. Badge v panelu se zmeni na "Iterace X" s oranzovou barvou

### Automaticky beh

1. Uzivatel klikne na **[⏩ Vse]** ve FloatingBaru
2. Simulace krokuje automaticky s casovym odstupem (delay), ktery odpovida rychlosti animace
3. Po dosazeni stabilniho stavu (zadne zmeny v tabulkach) se beh zastavi a badge zezelena s textem "Iterace X (Konvergováno)"

### Reset

1. Uzivatel klikne na **[↻]** (Reset) ve FloatingBaru
2. Vsechny routovaci tabulky se vyprazdni (zustanou jen inicializacni self-zaznamy)
3. Odeberou se vsechna vizualni zvyrazneni a badge se vrati do stavu "Pripraveno"

---

## 6. Prohlizeni routovacich tabulek

1. Uzivatel klikne na router v sidebaru nebo primo na platne
2. Vybrany router dostane teal obrys a v sidebaru se otevre sekce **Tabulka — Router [Nazev]**
3. Tabulka prehledne zobrazuje vsechny zaznamy (Cil, Next Hop, Metrika, pripadne Role u EIGRP)
4. Bunky zmenene v poslednim kroku maji **zlute pozadi** a indikatory:
   - `+` pro nove pridany radek
   - `↓` / `↑` pro zmenu metriky k cili

---

## 7. Vizualizace cesty

1. Uzivatel klikne na polozku **Cesta** v sidebaru (sekce s ikonou cesty)
2. Zobrazi se plovouci panel (toast) s badgy "Zdroj" a "Cíl"
3. Uzivatel klikne na prvni router na platne — ten se oznaci jako Zdroj
4. Uzivatel klikne na druhy router — ten se oznaci jako Cíl
5. Aplikace okamzite vykresli nejkratsi cestu:
   - Pokud simulace jeste nedosahla konvergence, na pozadi se dobehne do stabilniho stavu
   - Routery na ceste dostanou teal podsviceni (glow)
   - Linky na ceste se zvyrazni tlustou teal linkou
6. Kliknutim na krizek v panelu nebo kliknutim na polozku Cesta v sidebaru se rezim vizualizace ukonci

---

## 8. Kontextova menu (Edge a Node)

### Node Kontextove menu (pravy klik na router)
- **Prejmenovat** — otevre RenameDialog pro zmenu nazvu routeru
- **Smazat** — smaze router z platna vcetne vsech pripojenych linek

### Edge Kontextove menu (pravy klik na linku)
- **Upravit metriku** — otevre dialog pro zmenu ceny linky
- **Smazat** — odstrani linku z platna
