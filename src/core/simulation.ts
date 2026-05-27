// =====================================================
// simulation.ts - Hlavni simulacni engine
// =====================================================
// Spravuje aktualni stav site a vybrany protokol.
// Umoznuje krokovou simulaci i automaticky beh do konvergence.
// Sleduje zmeny mezi kroky.
// =====================================================

import type {
  RouterNode,
  NetworkLink,
  NetworkState,
  SimulationStep,
  RoutingEntry,
  Change,
} from "./types";
import type { Protocol } from "./protocols/Protocol";

// Stav simulacniho engine
export interface SimulationEngine {
  // Aktualni stav site
  currentState: NetworkState | null;
  // Vybrany protokol
  protocol: Protocol | null;
  // Historie vsech kroku simulace
  history: SimulationStep[];
  // Zda simulace konvergovala
  converged: boolean;
}

// Vytvoreni noveho simulacniho engine
export function createSimulation(): SimulationEngine {
  return {
    currentState: null,
    protocol: null,
    history: [],
    converged: false,
  };
}

// Nastaveni protokolu pro simulaci
export function setProtocol(
  engine: SimulationEngine,
  protocol: Protocol
): void {
  engine.protocol = protocol;
  engine.converged = false;
}

// Reset simulace - inicializace z topologie
// Pouzije aktualni routery a linky z currentState nebo je predame
export function reset(
  engine: SimulationEngine,
  routers: RouterNode[],
  links: NetworkLink[]
): void {
  if (engine.protocol === null) {
    throw new Error("Protokol neni nastaven. Nejdrive nastavte protokol pomoci setProtocol().");
  }

  // Inicializace stavu pomoci vybraneho protokolu
  engine.currentState = engine.protocol.initialize(routers, links);
  engine.history = [];
  engine.converged = false;
}

// Jeden krok simulace - vrati SimulationStep s novym stavem a zmenami
export function step(engine: SimulationEngine): SimulationStep | null {
  if (engine.protocol === null) {
    throw new Error("Protokol neni nastaven.");
  }
  if (engine.currentState === null) {
    throw new Error("Simulace nebyla inicializovana. Zavolejte reset().");
  }

  // Pokud uz konvergovala, nevykonavame dalsi krok
  if (engine.converged) {
    return null;
  }

  // Provedeme jeden krok protokolu
  const simulationStep = engine.protocol.step(engine.currentState);

  // Aktualizujeme aktualni stav
  engine.currentState = simulationStep.state;

  // Ulozime do historie
  engine.history.push(simulationStep);

  // Zkontrolujeme konvergenci pomoci protokolu (ne jen prazdnych zmen)
  // Napr. OSPF flooding faze neprodukuje zmeny v tabulkach,
  // ale simulace jeste neskoncila
  engine.converged = engine.protocol.isConverged(engine.currentState);

  return simulationStep;
}

// Automaticky beh do konvergence - vrati vsechny kroky
// Maximalni pocet iteraci jako pojistka proti nekonecne smycce
const MAX_ITERATIONS = 100;

export function runAll(engine: SimulationEngine): SimulationStep[] {
  if (engine.protocol === null) {
    throw new Error("Protokol neni nastaven.");
  }
  if (engine.currentState === null) {
    throw new Error("Simulace nebyla inicializovana. Zavolejte reset().");
  }

  const steps: SimulationStep[] = [];
  let iterationCount = 0;

  while (!engine.converged && iterationCount < MAX_ITERATIONS) {
    const result = step(engine);
    if (result === null) {
      break;
    }
    steps.push(result);
    iterationCount = iterationCount + 1;
  }

  return steps;
}

// Kontrola zda simulace konvergovala
export function isConverged(engine: SimulationEngine): boolean {
  return engine.converged;
}

// Porovnani dvou stavu a ziskani zmen
// Porovnavame routovaci tabulky vsech routeru
export function getChanges(
  oldState: NetworkState,
  newState: NetworkState
): Change[] {
  const changes: Change[] = [];

  // Ziskame vsechny routery (sjednoceni klicu obou stavu)
  const allRouterIds = getAllRouterIds(oldState, newState);

  for (const routerId of allRouterIds) {
    const oldTable = oldState.routingTables[routerId] || [];
    const newTable = newState.routingTables[routerId] || [];

    // Hledame nove a aktualizovane zaznamy
    for (const newEntry of newTable) {
      const oldEntry = findEntryByDestination(oldTable, newEntry.destination);

      if (oldEntry === null) {
        // Novy zaznam - v puvodni tabulce neexistoval
        changes.push({
          routerId: routerId,
          type: "added",
          entry: copyEntry(newEntry),
        });
      } else if (hasEntryChanged(oldEntry, newEntry)) {
        // Aktualizovany zaznam - zmenila se metrika nebo nextHop
        changes.push({
          routerId: routerId,
          type: "updated",
          entry: copyEntry(newEntry),
          previousEntry: copyEntry(oldEntry),
        });
      }
    }

    // Hledame odebrane zaznamy
    for (const oldEntry of oldTable) {
      const newEntry = findEntryByDestination(newTable, oldEntry.destination);

      if (newEntry === null) {
        // Zaznam byl odebran
        changes.push({
          routerId: routerId,
          type: "removed",
          entry: copyEntry(oldEntry),
        });
      }
    }
  }

  return changes;
}

// Ziskani aktualni routovaci tabulky pro konkretni router
export function getRoutingTable(
  engine: SimulationEngine,
  routerId: string
): RoutingEntry[] {
  if (engine.currentState === null) {
    return [];
  }

  const table = engine.currentState.routingTables[routerId];
  if (!table) {
    return [];
  }

  return table;
}

// Nalezeni cesty mezi dvema routery
export function findPath(
  engine: SimulationEngine,
  source: string,
  target: string
): string[] {
  if (engine.protocol === null) {
    throw new Error("Protokol neni nastaven.");
  }
  if (engine.currentState === null) {
    throw new Error("Simulace nebyla inicializovana.");
  }

  return engine.protocol.findPath(engine.currentState, source, target);
}

// =====================================================
// Pomocne funkce
// =====================================================

// Ziskani vsech unikatnich router ID z obou stavu
function getAllRouterIds(
  state1: NetworkState,
  state2: NetworkState
): string[] {
  const ids: string[] = [];

  for (const key of Object.keys(state1.routingTables)) {
    if (ids.indexOf(key) === -1) {
      ids.push(key);
    }
  }

  for (const key of Object.keys(state2.routingTables)) {
    if (ids.indexOf(key) === -1) {
      ids.push(key);
    }
  }

  return ids;
}

// Hledani zaznamu v tabulce podle destinace
function findEntryByDestination(
  table: RoutingEntry[],
  destination: string
): RoutingEntry | null {
  for (const entry of table) {
    if (entry.destination === destination) {
      return entry;
    }
  }
  return null;
}

// Kontrola zda se zaznam zmenil
function hasEntryChanged(
  oldEntry: RoutingEntry,
  newEntry: RoutingEntry
): boolean {
  if (oldEntry.metric !== newEntry.metric) {
    return true;
  }
  if (oldEntry.nextHop !== newEntry.nextHop) {
    return true;
  }
  if (oldEntry.protocol !== newEntry.protocol) {
    return true;
  }
  return false;
}

// Kopie zaznamu
function copyEntry(entry: RoutingEntry): RoutingEntry {
  return {
    destination: entry.destination,
    nextHop: entry.nextHop,
    metric: entry.metric,
    protocol: entry.protocol,
  };
}
