# Protocol — rozhrani pro routovaci protokoly

Soubor `src/core/protocols/Protocol.ts` definuje interface, ktery musi implementovat kazdy
routovaci protokol. Toto rozhrani je kontrakt mezi simulacnim engine a konkretnimi protokoly.

---

## Definice rozhrani

```typescript
export interface Protocol {
  name: string;

  initialize(routers: RouterNode[], links: NetworkLink[]): NetworkState;

  step(state: NetworkState): SimulationStep;

  isConverged(state: NetworkState): boolean;

  findPath(state: NetworkState, source: string, target: string): string[];
}
```

---

## Metody

### name

Textovy nazev protokolu (napr. `"RIP"`, `"OSPF"`, `"EIGRP"`).
Pouziva se v `RoutingEntry.protocol` pro identifikaci zdroje zaznamu.

### initialize(routers, links)

Vytvori pocatecni `NetworkState` z dane topologie.

**Vstup:** Pole routeru a linek (z `convertToNetworkState`).
**Vystup:** `NetworkState` s pocatecnimi routovacimi tabulkami.

Kazdy protokol inicializuje tabulky jinak:

| Protokol | Pocatecni tabulka obsahuje |
|----------|---------------------------|
| RIP | Sebe (metric 0) + primo pripojene sousedy (metric 1) |
| OSPF | Jen sebe (metric 0), sousede se objevi ve fazi neighbor discovery |
| EIGRP | Jen sebe (metric 0), sousede se objevi az po prvnim volani step() |

### step(state)

Provede jeden krok simulace.

**Vstup:** Aktualni `NetworkState` (klonovany pred volanim).
**Vystup:** `SimulationStep` s novym stavem a polem zmen.

Kazdy protokol implementuje vlastni algoritmus:

| Protokol | Co dela v jednom kroku |
|----------|----------------------|
| RIP | Kazdy router posle tabulku sousedum, soused prida 1 k metrice |
| OSPF | Faze: neighbor discovery → LSA flooding → Dijkstra |
| EIGRP | Sber aktualizaci od sousedu → DUAL algoritmus pro vyber successora |

**Dulezite:** Vsechny protokoly ctou stary stav (`state` parametr) a pisi do noveho
(klonovaneho) stavu. To zajistuje, ze vsechny routery v jednom kroku pracuji
se stejnymi daty — soucasny vymenný cyklus.

### isConverged(state)

Zkontroluje, zda by dalsi krok prinesl zmeny.

**Implementace:** Vetsina protokolu (RIP, EIGRP) provede simulovany krok a zkontroluje
jestli vygeneroval zmeny. OSPF navic kontroluje fazi (neni konvergovany dokud
nedokonci Dijkstru).

### findPath(state, source, target)

Najde cestu ze zdrojoveho routeru do ciloveho pomoci routovacich tabulek.

**Algoritmus (spolecny vsem protokolum):**

1. Zacni na zdrojovem routeru
2. V jeho tabulce najdi zaznam pro cil → zjisti `nextHop`
3. Presun se na `nextHop` a opakuj
4. Skonci kdyz `nextHop === target`
5. Ochrana proti smyckam: max `routers.length` kroku

**Navratova hodnota:** Pole router ID (`["r1", "r2", "r4"]`) nebo prazdne pole.

---

## Jak simulacni engine pouziva Protocol

```typescript
// v simulation.ts:

// 1. Inicializace
engine.currentState = engine.protocol.initialize(routers, links);

// 2. Krok
const simulationStep = engine.protocol.step(engine.currentState);

// 3. Konvergence (detekuje se pres protocol.isConverged)
engine.converged = engine.protocol.isConverged(engine.currentState);

// 4. Hledani cesty
return engine.protocol.findPath(engine.currentState, source, target);
```

---

## Jak pridat novy protokol

### 1. Vytvorte soubor

Vytvorte `src/core/protocols/MujProtokol.ts`.

### 2. Implementujte Protocol interface

```typescript
import type { Protocol } from "./Protocol";
import type { RouterNode, NetworkLink, NetworkState, SimulationStep, RoutingEntry, Change } from "../types";
import { getNeighbors, cloneNetworkState } from "../graph";

const PROTOCOL_NAME = "MUJ";

export const MujProtocol: Protocol = {
  name: PROTOCOL_NAME,

  initialize: function(routers, links) {
    // vytvorte pocatecni NetworkState
    // ...
    return { routers, links, routingTables };
  },

  step: function(state) {
    const newState = cloneNetworkState(state);
    const changes: Change[] = [];
    // vas algoritmus — pouzijte getNeighbors() pro sousedy
    // ...
    return { iteration: ..., state: newState, changes };
  },

  isConverged: function(state) {
    // zkuste provest krok a zjistete jestli jsou zmeny
    const testStep = MujProtocol.step(state);
    return testStep.changes.length === 0;
  },

  findPath: function(state, source, target) {
    // pouzijte tracePath() (viz RIP.ts pro vzor)
    return tracePath(state, source, target);
  },
};
```

### 3. Zaregistrujte v App.tsx

```typescript
import { MujProtocol } from './core/protocols/MujProtokol';

function getProtocol(name: string): Protocol {
  if (name === 'MUJ') return MujProtocol;
  // ...existujici protokoly
}
```

### 4. Pridejte do ProtocolSelect

V `src/components/ProtocolSelect.tsx` pridejte nazev do pole `PROTOCOLS`:

```typescript
const PROTOCOLS = ['RIP', 'OSPF', 'EIGRP', 'MUJ'];
```

### 5. Hotovo

Zadne dalsi zmeny nejsou potreba — simulacni engine a vsechny komponenty
pracuji s `Protocol` rozhranim a automaticky pouziji novy protokol.
