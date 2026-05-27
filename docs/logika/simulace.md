# Simulacni engine

Soubor `src/core/simulation.ts` implementuje jadro simulace. Spravuje aktualni stav site,
vybrany protokol, historii kroku a detekci konvergence.

---

## SimulationEngine

Hlavni datova struktura, ktera drzi stav cele simulace:

```typescript
export interface SimulationEngine {
  currentState: NetworkState | null;  // aktualni stav site
  protocol: Protocol | null;          // vybrany routovaci protokol
  history: SimulationStep[];          // historie vsech kroku
  converged: boolean;                 // zda simulace konvergovala
}
```

Engine pouziva funkcionalni styl — vsechny operace jsou exportovane funkce, ktere berou `engine` jako prvni parametr. Engine je mutovany na miste (ne immutabilne), coz je
zamerne — stav simulace je jedina mista kde mutace probihaji.

---

## createSimulation()

Vytvori novy prazdny engine:

```typescript
export function createSimulation(): SimulationEngine
```

Vrati engine s `null` stavem, `null` protokolem, prazdnou historii a `converged = false`.

---

## setProtocol(engine, protocol)

Nastavi protokol pro simulaci:

```typescript
export function setProtocol(engine: SimulationEngine, protocol: Protocol): void
```

Uklada referenci na objekt implementujici `Protocol` interface.
Resetuje `converged` na `false`.

---

## reset(engine, routers, links)

Inicializuje simulaci z dane topologie:

```typescript
export function reset(engine: SimulationEngine, routers: RouterNode[], links: NetworkLink[]): void
```

**Kroky:**

1. Zkontroluje, ze je nastaven protokol (jinak vyhodi chybu)
2. Zavola `protocol.initialize(routers, links)` — protokol vytvori pocatecni `NetworkState`
3. Vyprazdni historii
4. Nastavi `converged = false`

**Chybove stavy:** Vyhodi `Error` pokud neni nastaven protokol.

---

## step(engine)

Provede jeden krok simulace:

```typescript
export function step(engine: SimulationEngine): SimulationStep | null
```

**Algoritmus:**

1. Zkontroluje, ze je nastaven protokol a stav
2. Pokud uz konvergovala, vrati `null`
3. Zavola `protocol.step(currentState)` → vrati `SimulationStep`
4. Aktualizuje `currentState` na novy stav
5. Ulozi krok do historie
6. **Zkontroluje konvergenci pomoci `protocol.isConverged()`** (ne jen prazdnych zmen!)
7. Vrati `SimulationStep`

> **Dulezite:** Konvergence se detekuje volanim `protocol.isConverged()`, ne pouhym
> `changes.length === 0`. To je klicove pro OSPF, kde faze flooding neprodukuje
> zadne zmeny v tabulkach, ale simulace jeste neskoncila (ceka se na Dijkstru).

**Navratova hodnota `SimulationStep`:**

```typescript
{
  iteration: number;         // cislo iterace
  state: NetworkState;       // novy stav site vcetne tabulek
  changes: Change[];         // zmeny oproti predchozimu stavu
  phase?: string;            // OSPF faze (volitelne)
}
```

**OSPF faze:** Pole `phase` je pritomne jen u OSPF a nabýva hodnot:
- `"neighbor-discovery"` — faze 1: objev sousedu
- `"lsa-flooding"` — faze 2: sireni LSA
- `"dijkstra"` — faze 3: vypocet nejkratsich cest

App.tsx pouziva `phase` pro vyber spravne animace.

---

## runAll(engine)

Spusti simulaci do konvergence (vsechny kroky naraz):

```typescript
export function runAll(engine: SimulationEngine): SimulationStep[]
```

Opakuje volani `step()` dokud engine nekonverguje. Ma bezpecnostni limit `MAX_ITERATIONS = 100`
jako pojistku proti nekonecne smycce.

**Poznamka:** V App.tsx se misto `runAll` pouziva `handleRunAll` s `setTimeout(runNextStep, delay)` —
to pridava animovane zpozdeni mezi kroky. Delay je phase-aware:
- OSPF flooding: `(BFS diameter * 800 + 400) / speed` ms
- OSPF dijkstra: `2000 / speed` ms
- Ostatni: `1200 / speed` ms

---

## isConverged(engine)

Vraci `true` pokud simulace konvergovala:

```typescript
export function isConverged(engine: SimulationEngine): boolean
```

Jednoduchy getter pro `engine.converged`.

---

## getChanges(oldState, newState)

Porovnava dva stavy a vraci pole zmen:

```typescript
export function getChanges(oldState: NetworkState, newState: NetworkState): Change[]
```

**Algoritmus:**

1. Zjisti vsechny unikatni router ID z obou stavu
2. Pro kazdy router porovna starou a novou routovaci tabulku
3. Pro kazdy zaznam v nove tabulce:
   - Pokud v stare neexistoval → zmena typu `"added"`
   - Pokud se zmenila metrika nebo nextHop → zmena typu `"updated"`
4. Pro kazdy zaznam ve stare tabulce:
   - Pokud v nove neexistuje → zmena typu `"removed"`

**Poznamka:** Tato funkce existuje v `simulation.ts`, ale samotne protokoly generuji zmeny
primo ve svych `step()` metodach — `getChanges` je urcena pro externi pouziti.

---

## findPath(engine, source, target)

Najde cestu mezi dvema routery:

```typescript
export function findPath(engine: SimulationEngine, source: string, target: string): string[]
```

Deleguje na `protocol.findPath(currentState, source, target)`. 
Vrati pole router ID od zdroje k cili, nebo prazdne pole pokud cesta neexistuje.

**Automatické dobehnutí do konvergence:** Vyhledávání cesty vyžaduje, aby byly routovací tabulky plně stabilizované (konvergované). Pokud uživatel aktivuje režim vizualizace cesty a simulační engine ještě nebyl inicializován nebo neběžel do konvergence, frontend v `App.tsx` (metoda `findAndHighlightPath`) automaticky na pozadí inicializuje engine a spustí simulaci krok po kroku (`while (!simIsConverged(engine)) { simStep(engine); }`) až do úplného dosažení stabilního stavu. Teprve poté zavolá `findPath` na zkonvergovaných tabulkách. Tím je zaručeno, že vizualizovaná cesta vždy odpovídá konečnému stavu zvoleného protokolu.

### Algoritmus vyhledávání a prevence smyček (`tracePath`)

Všechny protokoly interně sdílejí vyhledávací funkci `tracePath()`, která pracuje na následujícím principu:

1. **Start**: Nastaví aktuální router na `source` a vloží jej do pole cesty.
2. **Krok**: V tabulce aktuálního routeru vyhledá záznam pro `target` a zjistí hodnotu `nextHop`.
3. **Přesun**: Vloží `nextHop` do pole cesty.
4. **Konec (úspěch)**: Pokud `nextHop === target`, vyhledávání končí úspěšně a vrací se zrekonstruovaná cesta.
5. **Prevence smyček**: Pokud se `nextHop` již nachází v dosavadní cestě (`path.indexOf(nextHop) < path.length - 1`), detekuje se cyklus v tabulkách. Algoritmus ihned zastaví a vrátí prázdné pole `[]`.
6. **Bezpečnostní limit**: Pokud počet skoků překročí celkový počet routerů v síti (`state.routers.length`), vyhledávání se zruší a vrátí `[]`.

---

## OSPF Fáze a Konvergence v Engine

Vzhledem k tomu, že protokol OSPF nepočítá tabulky inkrementálně (jako RIP/EIGRP), ale ve třech oddělených fázích:
1. **`neighbor-discovery`** (záznamy pro přímé sousedy)
2. **`lsa-flooding`** (výměna LSDB dat, v tabulkách nedochází k žádným změnám)
3. **`dijkstra`** (výpočet nejkratších cest a aktualizace tabulek)

Simulační engine a `App.tsx` na to reagují následovně:
* Metoda `step()` spouští interní step metodu OSPF, která po dokončení práce dané fáze posune stavovou proměnnou `phase` do další fáze.
* Metoda `engine.protocol.isConverged()` v OSPF vrací `false`, pokud se aktuální fáze nachází v discovery nebo flooding fázi, i přesto že v tabulkách nedošlo k žádné změně (čímž se zabrání předčasnému ukončení simulace). Teprve po provedení fáze Dijkstra se vyhodnotí skutečné změny tabulek pro konvergenci.

---

## getRoutingTable(engine, routerId)

Vraci routovaci tabulku konkretniho routeru:

```typescript
export function getRoutingTable(engine: SimulationEngine, routerId: string): RoutingEntry[]
```

---

## Jak to pouziva App.tsx

```typescript
// 1. Vytvoreni engine
const engine = createSimulation();

// 2. Nastaveni protokolu
const protocol = getProtocol('RIP');
setProtocol(engine, protocol);

// 3. Inicializace z topologie
const networkState = convertToNetworkState(nodes, edges);
reset(engine, networkState.routers, networkState.links);

// 4. Krok simulace
const result = step(engine);
if (result === null) {
  // konvergovala
}

// 5. Pouziti vysledku
setIteration(result.iteration);
setRoutingTables(result.state.routingTables);
setCurrentChanges(result.changes);

// 6. Kontrola konvergence
if (isConverged(engine)) { ... }

// 7. Hledani cesty
const path = findPath(engine, 'r1', 'r4');
```
