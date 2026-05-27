# Architektura aplikace

Routing Simulator je single-page aplikace (SPA) postavena na React + TypeScript + Vite.
Umoznuje uzivateli graficky navrhovat sitovou topologii a krokove simulovat routovaci protokoly.

---

## Tech stack

| Technologie | Verze | Ucel |
|-------------|-------|------|
| TypeScript | 5.x | Typova bezpecnost, sdilene typy mezi vrstvami |
| React | 18+ | UI framework, stav komponent |
| Vite | 5.x | Build tool, dev server, HMR |
| React Flow | @xyflow/react | Graficky editor uzlu a hran |
| Vanilla CSS | — | Design system s CSS custom properties |
| Inter | Google Fonts | Hlavni font (UI) |
| JetBrains Mono | Google Fonts | Monospace font (metriky, IP) |

---

## Struktura slozek

```
src/
  App.tsx                  ← vstupni bod, propojeni vsech vrstev
  index.css                ← kompletni design system (850 radku)
  core/                    ← cista logika bez zavislosti na Reactu
    types.ts               ← sdilene typy (RouterNode, NetworkLink, ...)
    graph.ts               ← operace nad grafem (sousede, konverze, klon)
    simulation.ts          ← simulacni engine (step, reset, runAll)
    protocols/
      Protocol.ts          ← rozhrani pro vsechny protokoly
      RIP.ts               ← RIP implementace (distance-vector)
      OSPF.ts              ← OSPF implementace (link-state, Dijkstra)
      EIGRP.ts             ← EIGRP implementace (DUAL algoritmus)
  components/              ← React komponenty
    Toolbar.tsx            ← horni lista s editacnimi nastroji
    Sidebar.tsx            ← levy panel s routovaci tabulkou
    FloatingBar.tsx        ← plovouci bar dole se simulacnim ovladanim
    ProtocolSelect.tsx     ← custom dropdown pro vyber protokolu
    RoutingTable.tsx       ← zobrazeni routovaci tabulky
    MetricDialog.tsx       ← modalni dialog pro metriku propoje
    TopologyDialog.tsx     ← dialog pro spravu topologie (export/import/presety)
    Icons.tsx              ← kolekce SVG ikon
    Editor/
      Canvas.tsx           ← React Flow wrapper (platno)
      RouterNode.tsx       ← custom node (vizualizace routeru)
      NetworkEdge.tsx      ← custom edge (floating propoj s metrikou)
```

---

## Vrstvy a komunikace

Aplikace je rozdelena do dvou hlavnich vrstev, ktere komunikuji pres sdilene typy:

```
┌───────────────────────────────────────────────────────┐
│                    App.tsx (orchestrator)              │
│   drzi stav: nodes, edges, routingTables, iteration   │
│   propojuje frontend a core                           │
├─────────────────────────┬─────────────────────────────┤
│    FRONTEND (components)│       CORE (core/)          │
│                         │                             │
│  Toolbar ──────────────►│                             │
│  Sidebar ◄──────────────│  types.ts (sdilene typy)   │
│  FloatingBar ──────────►│                             │
│  Canvas ◄──────────────►│  graph.ts (operace grafu)  │
│  RouterNode             │                             │
│  NetworkEdge            │  simulation.ts (engine)     │
│  RoutingTable           │                             │
│  MetricDialog           │  protocols/                 │
│  TopologyDialog         │    Protocol.ts (rozhrani)   │
│  ProtocolSelect         │    RIP.ts                   │
│  Icons                  │    OSPF.ts                  │
│                         │    EIGRP.ts                 │
└─────────────────────────┴─────────────────────────────┘
```

### Tok dat

1. **Uzivatel** pridava routery a propoje v editoru (Canvas, Toolbar)
2. **App.tsx** drzi React Flow nodes/edges jako zdroj pravdy
3. Pred simulaci se zavola `convertToNetworkState()` z `graph.ts` — prevede React Flow format na interni `NetworkState`
4. **SimulationEngine** (z `simulation.ts`) dostane `NetworkState` a vybrany `Protocol`
5. Kazdy krok (`simStep()`) vola `protocol.step(state)` — vraci novy stav + zmeny
6. **App.tsx** aktualizuje React stav (routingTables, changes, iteration)
7. **Sidebar** a **RoutingTable** zobrazuji aktualni routovaci tabulky
8. **Canvas** zvyraznuje zmenene routery (zluta barva) a cestu (teal barva)

### Dukaz oddeleni vrstev

Slozka `core/` **neimportuje nic z Reactu** — pouziva jen ciste TypeScript typy a funkce.
To umoznuje:

- Testovat logiku protokolu bez renderovani UI
- Pridavat nove protokoly bez zmeny komponent
- Pouzit stejnou logiku v jinem UI frameworku

---

## Klicova rozhodnuti

| Rozhodnuti | Duvod |
|------------|-------|
| `Record` misto `Map` pro routovaci tabulky | Lepsi serializace, jednodussi klonovani |
| Funkcionalni styl v `simulation.ts` | Kazda funkce bere engine jako parametr — snadne testovani |
| `cloneNetworkState()` pred kazdym krokem | Zajistuje immutabilitu — routery ctou stary stav, pisi do noveho |
| React Flow custom node/edge typy | Plna kontrola nad vizualizaci routeru a propoju |
| CSS custom properties | Centralizovany design system, snadna zmena tematu |
| Floating edges (ne fixed handles) | Realisticke vizualni propojeni — bod pripojeni se pocita dynamicky |

---

## Datovy flow simulace

```
uzivatel klikne "Dalsi krok"
      │
      ▼
App.tsx: handleStep()
      │
      ├── initializeEngine()  (pokud prvni krok)
      │       │
      │       ├── createSimulation()
      │       ├── setProtocol(engine, getProtocol(name))
      │       └── reset(engine, routers, links)
      │               └── protocol.initialize(routers, links) → NetworkState
      │
      └── simStep(engine)
              │
              └── protocol.step(currentState) → SimulationStep
                      │
                      ├── state: novy NetworkState s aktualizovanymi tabulkami
                      └── changes: pole Change[] (added/updated/removed)
                              │
                              ▼
                      App.tsx aktualizuje React stav
                      → Sidebar prerenderuje tabulku
                      → Canvas zvyrazni zmenene routery
```

---

## Pill animacni system

Animace "pills" vizualizuji tok dat (propagaci smerovacich informaci) po hranach grafu.
Kazdy pill je maly barevny obdelnik s labelem, ktery se posouva po hrane od zdroje k cili.

### Zmeny v animacnim systemu (Event-Driven / Change-Based)

Puvodni system zalozeny na BFS a poctu hopu byl nahrazen presnejsim animacnim systemem rizenym skutecnymi zmenami v routovacich tabulkach (`stepChanges` ziskane z `Change[]` v simulation engine). To umoznuje spravne animovat sireni zmen i ve slozitych topologiich (napriklad Mesh s ruznymi metrikami), kde se optimalni cesty neurcuji podle poctu hopu.

### Jak to funguje:

1. **Detekce zmeny:** Prochazime vsechny zmeny (`Change`) v danem kroku simulace typu `"added"` nebo `"updated"`.
2. **Urceni smeru:** Pokud uzel (`routerId`) zmenil zaznam pro cil (`destination`) pres souseda (`nextHop`), znamena to, ze `nextHop` (odesilatel) poslal informaci uzlu `routerId` (prijemce).
3. **Vytvoreni pillu:** Na odpovidajici hrane se spusti animace pilulky s oznacenim cile (`destination`), ktera leti od odesilatele k prijemci.
4. **Rezim vyberu:** Pokud je vybran konkretni router (`selectedRouterId !== null`), animuji se pouze zmeny tykajiici se cesty k tomuto routeru. Pokud neni vybran zadny, animuji se vsechny zmeny v danem kroku.

### Trigger funkce

V `App.tsx` jsou klicove funkce pro spousteni pill animaci:

| Funkce | Pouziti | Popis |
|--------|---------|-------|
| `triggerParticles(stepIteration, protocol, stepChanges)` | RIP/EIGRP (kazdy krok), OSPF neighbor-discovery (s vyberem) | Generuje pills na zaklade predanych `stepChanges`. Zjistuje odesilatele a prijemce a spousti animace na spravnych hranach. |
| `triggerFloodingAnimation()` | OSPF faze 2 (lsa-flooding) | Staggered BFS vrstvy s casovym zpozdenimem (700–800ms na vrstvu). Kazda BFS vrstva spusti pills na svych frontier hranach. S vybranym routerem: flooding od centra. Bez vyberu: flooding od kazdeho routeru zaroven. |
| `triggerAllEdgesPills()` | OSPF faze 1 (neighbor-discovery, bez vyberu) | Obousmerne pills po vsech hranach zaroven — kazda hrana dostane dva pills (source → target i target → source). |
| `triggerDijkstraAnimation()` | OSPF faze 3 (dijkstra) | Pulzujici animace primo na routerech (ne na hranach). Nastavi `isComputing: true` na node data, coz aktivuje CSS animace `computePulse` (scale pulsovani) a `computeSpin` (rotace ikony). |

### Rozhodovaci logika v handleStep()

```
OSPF + dijkstra        → triggerDijkstraAnimation()
OSPF + lsa-flooding    → triggerFloodingAnimation()
OSPF + neighbor-discovery:
  s vyberem            → triggerParticles(1, 'OSPF', result.changes)
  bez vyberu           → triggerAllEdgesPills()
RIP / EIGRP            → triggerParticles(iteration, protocol, result.changes)
```

### Klicove implementacni detaily

- **`particleKey`** — monotonni pocitadlo (`particleCounterRef`). Kazda davka pills dostane unikatni key, aby se po skonceni animace smazaly jen spravne pills (ne novejsi).
- **`--pill-speed`** — CSS promenna nastavena na root elementu `.app-layout`: `(1.05 / animationSpeed) + 's'`. Ridi trvani CSS animace `pillTravel`.
- **Automaticky cleanup** — pills se mazou po `1100ms / speed` pomoci `setTimeout`. U staggered flooding se kazda vrstva cisti nezavisle.
- **`particlePills`** — pole objektu `{label, outgoing, reverse}` ulozene v `edge.data`. Komponenta `NetworkEdge` je renderuje jako animovane elementy.

---

## Export / Import topologie

App.tsx obsahuje funkce `handleExport()` a `handleImport(json)` pro JSON serializaci topologie.

### Format souboru

```json
{
  "version": 1,
  "routers": [
    { "id": "r1", "label": "Router 1", "position": { "x": 250, "y": 100 } }
  ],
  "links": [
    { "source": "r1", "target": "r2", "metric": 10 }
  ]
}
```

- **Export** — prevede React Flow `nodes` a `edges` na cisty JSON, stahne jako `topologie.json`
- **Import** — parsuje JSON, vytvori React Flow nodes (type `'router'`) a edges (type `'network'`), aktualizuje interni counter pro nove routery
- Oba callbacky jsou predany do `TopologyDialog` jako props `onExport` / `onImport`

---

## TopologyDialog

Soubor: `src/components/TopologyDialog.tsx`

Modalni dialog pro spravu topologie — umoznuje export (stazeni JSON), import (nahrani JSON souboru) a vyber z predpripravenych topologii (presety).

- Ovlada se stavem `isTopologyOpen` v `App.tsx`
- Otvira se tlacitkem "Topologie" (MapIcon) v Toolbaru
- Je to **samostatny dialog**, oddeleny od Settings panelu
