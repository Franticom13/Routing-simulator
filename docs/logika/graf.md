# Datova struktura grafu

Soubor `src/core/graph.ts` obsahuje pomocne funkce pro praci s grafovou reprezentaci site.
Graf je ulozen jako pole routeru (`RouterNode[]`) a pole linek (`NetworkLink[]`) — tedy seznam uzlu a hran.

---

## NeighborInfo

Informace o sousedovi routeru. Pouzivaji ji vsechny protokoly pro zjisteni okolnich routeru.

```typescript
export interface NeighborInfo {
  routerId: string;   // ID sousedniho routeru
  metric: number;     // cena linky k sousedovi
  linkId: string;     // ID linky (pro LSDB v OSPF)
}
```

---

## Funkce getNeighbors

Vraci pole sousedu daneho routeru. Prochazi vsechny linky a hleda ty, kde je router zdrojem nebo cilem.

```typescript
export function getNeighbors(routerId: string, links: NetworkLink[]): NeighborInfo[]
```

**Algoritmus:**

1. Projde vsechny linky
2. Pokud `link.source === routerId` → soused je `link.target`
3. Pokud `link.target === routerId` → soused je `link.source`
4. U kazdeho souseda zaznamena `routerId`, `metric` a `linkId`

**Dulezite:** Linky jsou obousmerne — funkce kontroluje oba smery. Neni treba mit duplicitni linky.

### Priklad

Pro Router A (`r1`) s linkami `r1–r2 (metric=1)` a `r1–r3 (metric=3)`:

```
getNeighbors("r1", links) → [
  { routerId: "r2", metric: 1, linkId: "e1-2" },
  { routerId: "r3", metric: 3, linkId: "e1-3" }
]
```

---

## Funkce getDirectlyConnectedLinks

Vraci vsechny linky primo pripojene k danemu routeru.

```typescript
export function getDirectlyConnectedLinks(routerId: string, links: NetworkLink[]): NetworkLink[]
```

Podobne jako `getNeighbors`, ale vraci cele `NetworkLink` objekty, ne jen sousedy.

---

## Funkce convertToNetworkState

Prevadi React Flow format (Node[] a Edge[]) na interni `NetworkState`.
Toto je most mezi frontend vrstvou a core logikou.

```typescript
export function convertToNetworkState(
  flowNodes: Array<{ id: string; data?: { label?: string }; position: { x: number; y: number } }>,
  flowEdges: Array<{ id: string; source: string; target: string; data?: { metric?: number } }>
): NetworkState
```

**Kroky:**

1. **Prevod uzlu:** Kazdy React Flow `Node` se prevede na `RouterNode` — extrahuje se `id`, `label` (z `data.label`) a `position`
2. **Prevod hran:** Kazdy React Flow `Edge` se prevede na `NetworkLink` — extrahuje se `id`, `source`, `target` a `metric` (z `data.metric`, vychozi hodnota 1)
3. **Prazdne tabulky:** Pro kazdy router se vytvori prazdne pole routovacich zaznamu

**Navratova hodnota:**

```typescript
{
  routers: RouterNode[],          // vsechny routery
  links: NetworkLink[],           // vsechny linky s metrikami
  routingTables: Record<string, RoutingEntry[]>  // prazdne tabulky
}
```

### Priklad

React Flow vstup:

```typescript
nodes = [{ id: 'r1', data: { label: 'Router A' }, position: { x: 100, y: 150 } }]
edges = [{ id: 'e1-2', source: 'r1', target: 'r2', data: { metric: 1 } }]
```

Vystup `NetworkState`:

```typescript
{
  routers: [{ id: 'r1', label: 'Router A', position: { x: 100, y: 150 } }],
  links: [{ id: 'e1-2', source: 'r1', target: 'r2', metric: 1 }],
  routingTables: { 'r1': [] }
}
```

---

## Funkce cloneNetworkState

Hluboka kopie celeho `NetworkState`. Pouziva se pred kazdym krokem simulace
pro zajisteni immutability — routery ctou stary stav a pisi do noveho.

```typescript
export function cloneNetworkState(state: NetworkState): NetworkState
```

**Co klonuje:**

- `routers` — kazdy router se kopiruje vcetne pozice
- `links` — kazda linka se kopiruje vcetne metriky
- `routingTables` — kazdy zaznam v kazde tabulce se kopiruje vcetne pole `role`

> **Pozor na `role`:** U EIGRP zaznamu se musi klonovat i pole `role` (napr. `'FS'` pro feasible
> successor). Bez toho by FS zaznamy po klonovani ztratily svou roli a cleanup kod
> (ktery kontroluje `role === 'FS'`) by je nikdy nenasel — coz zpusobi nekonecne
> duplicitni zaznamy v tabulce.

**Proc ne JSON.parse(JSON.stringify())?** Explicitni klonovani je bezpecnejsi a rychlejsi
pro jednoduche struktury bez vnorenych objektu, `undefined` hodnot nebo cyklickych referenci.

---

## Pouziti v aplikaci

```
App.tsx                  graph.ts                  simulation.ts
   │                        │                          │
   ├── convertToNetworkState() ──────────────────────► │
   │        ↑                                          │
   │   React Flow nodes/edges                          │
   │                                                   │
   │                        ├── getNeighbors() ◄────── │
   │                        │   (pouzivaji protokoly)  │
   │                        │                          │
   │                        ├── cloneNetworkState() ◄─ │
   │                        │   (pred kazdym krokem)   │
```
