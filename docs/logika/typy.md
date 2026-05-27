# TypeScript typy

Vsechny sdilene typy jsou definovany v `src/core/types.ts`. Pouzivaji se jak v core logice
(simulace, protokoly), tak v komponentach (sidebar, tabulka).

---

## RouterNode

Reprezentace jednoho routeru v siti.

```typescript
export interface RouterNode {
  id: string;                        // unikatni identifikator (napr. "r1", "r2")
  label: string;                     // zobrazovany nazev (napr. "Router A")
  position: { x: number; y: number }; // pozice na platne v pixelech
}
```

**Pouziti:**
- Core: `graph.ts` pro konverzi, protokoly pro inicializaci
- Frontend: `Sidebar.tsx` pro seznam routeru, `App.tsx` pro mapovani z React Flow nodu

**Poznamka:** Toto neni React Flow `Node` — je to zjednodusena verze pro interni logiku.
Konverze z React Flow formatu probiha v `convertToNetworkState()`.

---

## NetworkLink

Spoj (linka) mezi dvema routery. Reprezentuje hranu v grafu.

```typescript
export interface NetworkLink {
  id: string;     // unikatni identifikator (napr. "e1-2")
  source: string; // ID zdrojoveho routeru
  target: string; // ID ciloveho routeru
  metric: number; // cena linky (pouzivana protokoly)
}
```

**Metrika:**
- RIP: ignoruje `metric` z linky, pouziva vzdy hop count = 1
- OSPF: pouziva `metric` jako cost pro Dijkstru
- EIGRP: pouziva `metric` jako cenu linky pro vypocet FD

**Obousmernost:** Linky jsou obousmerne — `getNeighbors()` kontroluje oba smery.
Neni nutne mit dva zaznamy pro jeden propoj.

---

## RoutingEntry

Jeden radek v routovaci tabulce routeru.

```typescript
export interface RoutingEntry {
  destination: string; // ID ciloveho routeru
  nextHop: string;     // ID dalsiho routeru na ceste (nebo vlastni ID pro primo pripojene)
  metric: number;      // celkova cena cesty k cili
  protocol: string;    // nazev protokolu ktery zaznam vytvoril ("RIP"/"OSPF"/"EIGRP")
  role?: string;       // EIGRP: S (successor) nebo FS (feasible successor). Pro RIP/OSPF se nepouziva.
}
```

**Priklad tabulky routeru A po konvergenci RIP:**

| destination | nextHop | metric | protocol |
|-------------|---------|--------|----------|
| r1 | r1 | 0 | RIP |
| r2 | r2 | 1 | RIP |
| r3 | r2 | 2 | RIP |
| r4 | r2 | 2 | RIP |

**Specialni pripady:**
- `nextHop === destination` → primo pripojeny soused nebo sebe sama
- `metric === 0` → zaznam pro sebe sama (vzdy pritomen)

---

## NetworkState

Celkovy stav site v jednom okamziku. Toto je hlavni datova struktura, ktera se predava
mezi simulacnim engine a protokoly.

```typescript
export interface NetworkState {
  routers: RouterNode[];                          // vsechny routery
  links: NetworkLink[];                           // vsechny linky
  routingTables: Record<string, RoutingEntry[]>;  // tabulky vsech routeru
}
```

**Proc `Record` a ne `Map`?** Record se lepe serializuje do JSON, jednodusseji se klonuje
a je prirozeny pro TypeScript (pristup pres `state.routingTables['r1']`).

**Klonovani:** Pred kazdym krokem simulace se `NetworkState` klonuje pomoci
`cloneNetworkState()` z `graph.ts`, aby protokoly mohly cist stary stav
a zaroven zapisovat do noveho.

---

## SimulationStep

Vysledek jednoho kroku simulace. Vraci ho metoda `protocol.step()`.

```typescript
export interface SimulationStep {
  iteration: number;     // cislo iterace (1, 2, 3, ...)
  state: NetworkState;   // novy stav site po provedeni kroku
  changes: Change[];     // zmeny oproti predchozimu stavu
  phase?: string;        // OSPF faze: "neighbor-discovery", "lsa-flooding", "dijkstra". Pro RIP/EIGRP se nepouziva.
}
```

**Konvergence:** Pokud `changes.length === 0`, simulace konvergovala — dalsi
krok by nevygeneroval zadne zmeny.

---

## Change

Popisuje jednu zmenu v routovaci tabulce pri konkretnim kroku.

```typescript
export interface Change {
  routerId: string;              // ID routeru jehož tabulka se zmenila
  type: "added" | "updated" | "removed";  // typ zmeny
  entry: RoutingEntry;           // novy/aktualizovany/smazany zaznam
  previousEntry?: RoutingEntry;  // predchozi zaznam (jen u "updated")
}
```

**Typy zmen:**

| Typ | Vyznam | previousEntry |
|-----|--------|---------------|
| `"added"` | Novy zaznam — dříve neexistoval | `undefined` |
| `"updated"` | Zmena metriky nebo nextHop | Puvodni zaznam |
| `"removed"` | Zaznam byl odebran z tabulky | `undefined` |

**Pouziti ve frontend:**
- `Sidebar.tsx` — zvyrazneni routeru s `!` badge
- `RoutingTable.tsx` — zlute pozadi zmenenych bunek
- `App.tsx` → `updateNodeChanges()` — zlute zvyrazneni routeru na platne

---

## NeighborInfo (z graph.ts)

Pomocny typ pro sousedy routeru. Neni v `types.ts`, ale v `graph.ts`.

```typescript
export interface NeighborInfo {
  routerId: string; // ID sousedniho routeru
  metric: number;   // cena linky k nemu
  linkId: string;   // ID linky (pouzivano v OSPF pro LSDB)
}
```

---

## TopologyEntry (z EIGRP.ts)

Interni typ pro topologickou tabulku EIGRP. Neni exportovany z `types.ts`.

```typescript
interface TopologyEntry {
  neighborId: string;        // soused ktery hlasi cestu
  reportedDistance: number;   // RD — vzdalenost hlasena sousedem
  feasibleDistance: number;   // FD = RD + cena linky
  linkMetric: number;         // cena linky k sousedovi
}
```
