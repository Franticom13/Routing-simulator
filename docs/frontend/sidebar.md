# Sidebar

Levy panel aplikace (`src/components/Sidebar.tsx`). Zobrazuje seznam routeru,
routovaci tabulku vybraneho routeru, informace o vizualizaci cesty a stav simulace.

> **Multi-tab:** Obsah sidebaru vzdy odpovida aktivnimu tabu. Pri prepnuti tabu
> se automaticky aktualizuje seznam routeru, routovaci tabulka, stav simulace
> i rezim vizualizace cesty -- sidebar dostava data z `App.tsx`, ktery pri
> prepnuti tabu nacte odpovidajici stav pomoci `loadTabState()`.

---

## Struktura panelu

Sidebar je rozdeleny do dynamickych sekci, ktere se zobrazuji podle kontextu:

```
┌─────────────────────────┐
│ ROUTERY                 │  ← vzdy viditelne
│  ● Router A         3  │
│  ● Router B      !  2  │  ← vykricnik = zmena v iteraci
│  ● Router C         3  │
│  ● Router D         3  │
├─────────────────────────┤
│ TABULKA — Router A      │  ← jen kdyz je vybrany router
│  Cil   | Next | Metrika │
│  r1    | primo|    0    │
│  r2    | r2   |    1    │
│  ...   | ...  |   ...   │
├─────────────────────────┤
│ VIZUALIZACE CESTY       │  ← jen v path mode
│  [Router A] → [Router D]│
├─────────────────────────┤
│ SIMULACE                │  ← jen kdyz iterace > 0
│  Protokol: RIP          │
│  Iterace: 3             │
│  Zmen v iteraci: 4      │
└─────────────────────────┘
```

---

## Props

```typescript
interface SidebarProps {
  selectedRouter: RouterNodeType | null;  // aktualne vybrany router
  routingEntries: RoutingEntry[];         // zaznamy vybraneho routeru
  changes: Change[];                      // zmeny v aktualnim kroku
  routers: RouterNodeType[];              // vsechny routery pro seznam
  protocolName: string;                   // nazev protokolu (RIP/OSPF/EIGRP)
  iteration: number;                      // cislo iterace
  onSelectRouter: (routerId: string) => void;  // kliknuti na router v seznamu
  pathSource: string | null;              // zdrojovy router pro cestu
  pathTarget: string | null;              // cilovy router pro cestu
  isPathMode: boolean;                    // zda je aktivni rezim cesty
  allRoutingTables: Record<string, RoutingEntry[]>;  // vsechny tabulky
  allChanges: Change[];                   // vsechny zmeny pro zvyrazneni
}
```

---

## Sekce 0: Přidat (Drag & Drop)

Zobrazuje přetahovatelnou položku `SidebarDragItem` s nápisem „Nový router".
* Obsahuje animovanou ikonu routeru `AnimatedRouterIcon` (blikání LED, signal arcs při hoveru).
* Nastavuje drag transfer typ `application/routernode` pro přenos dat při pokládání na plátno.

---

## Sekce 1: Routery

Zobrazuje vsechny routery v siti jako klikatelny seznam.

- Kazda polozka ma ikonu site (`AnimatedNetworkIcon`), nazev routeru, pocet zaznamu v tabulce
- Pokud ma router zmeny v aktualnim kroku, zobrazi se **oranzovy badge** s `!`
- Aktivni (vybrany) router ma tridu `.sidebar-nav-item.active` — svetle teal pozadi
- Pokud v siti nejsou zadne routery, zobrazi se prazdny stav s napovedou

### Detekce zmen

```typescript
function routerHasChanges(routerId: string): boolean {
  return allChanges.some(function (change) {
    return change.routerId === routerId;
  });
}
```

---

## Sekce 2: Routovaci tabulka

Zobrazi se pouze kdyz je vybrany router (`selectedRouter !== null`).

Pouziva komponentu `RoutingTable` (viz `komponenty.md`), ktere preda:

- `routerId` a `routerLabel` — identifikace routeru
- `entries` — zaznamy routovaci tabulky vybraneho routeru
- `changes` — zmeny pro zvyrazneni zluteho pozadi
- `protocolName` — nazev protokolu

Nadpis sekce obsahuje ikonu tabulky a nazev routeru: `Tabulka — Router A`.

---

## Sekce 3: Vizualizace cesty

Tato sekce obsahuje přepínací tlačítko „Cesta" v sidebaru. 

Při aktivaci (`isPathMode === true`) se podrobnosti a navigační panel zobrazují jako **plovoucí toast nahoře uprostřed plátna** (`.path-toast`), nikoliv přímo v sidebaru, aby se uvolnil prostor pro routovací tabulky.

Plovoucí panel vizualizace cesty obsahuje:
- Návod: „Klikněte na dva routery"
- Badge pro zdrojový router (vyhledává se z `pathSource` v seznamu routerů, jinak zobrazuje „Zdroj")
- Směrovou šipku `→`
- Badge pro cílový router (vyhledává se z `pathTarget`, jinak zobrazuje „Cíl")
- Křížek pro zrušení režimu cesty

---

## Sekce 4: Simulace

Zobrazi se pouze kdyz simulace bezela (`iteration > 0`).

Obsahuje tri radky:

- **Protokol:** nazev aktualniho protokolu (tucne)
- **Iterace:** cislo aktualni iterace (tucne)
- **Zmen v iteraci:** pocet zmen v poslednim kroku

---

## Animace

Kazda sekce sidebaru ma animaci `fadeInUp` pri zobrazeni:

```css
.sidebar-section {
  animation: fadeInUp 0.25s ease forwards;
}
```

Sekce maji staggered delay — kazda dalsi sekce se objevi o 50ms pozdeji
(nastaveno pres inline `animationDelay` v JSX).

---

## Styling

- Sirka sidebaru: `--sidebar-width: 320px`
- Pozadi: `var(--surface)` (#F5F5F4)
- Border: `border-right: 1px solid var(--border)`
- Jemny stin: `2px 0 12px rgba(28, 25, 23, 0.05)`
- Overflow: `overflow-y: auto` s custom scrollbarem
