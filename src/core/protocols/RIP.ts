// =====================================================
// RIP.ts - Implementace protokolu RIP (Routing Information Protocol)
// =====================================================
// RIP je distance-vector protokol.
// Metrika = pocet hopu (hop count).
// Maximum je 15 hopu, 16 = nedosazitelny.
// Kazdy router sdili svou tabulku se sousedy.
// Soused prida 1 k metrice a aktualizuje, pokud je lepsi.
// =====================================================

import type { Protocol } from "./Protocol";
import type {
  RouterNode,
  NetworkLink,
  NetworkState,
  SimulationStep,
  RoutingEntry,
  Change,
} from "../types";
import { getNeighbors, cloneNetworkState } from "../graph";

// Maximalni pocet hopu v RIP - 16 znamena nedosazitelny
const RIP_MAX_METRIC = 16;
// Nazev protokolu pro zaznamy v tabulce
const PROTOCOL_NAME = "RIP";

// Interni pocitadlo iteraci - uchovava si kazda instance
let iterationCounter = 0;

// Hlavni trida implementujici RIP protokol
export const RIPProtocol: Protocol = {
  name: PROTOCOL_NAME,

  // Inicializace - kazdy router zna jen sam sebe (metrika 0)
  // a sve primo pripojene sousedy (metrika 1, protoze RIP pocita hopy)
  initialize: function initializeRIP(
    routers: RouterNode[],
    links: NetworkLink[]
  ): NetworkState {
    iterationCounter = 0;

    const routingTables: Record<string, RoutingEntry[]> = {};

    for (const router of routers) {
      const entries: RoutingEntry[] = [];

      // Zaznam pro sebe sama - metrika 0
      // Sousedy router objevi az v prvnim kroku simulace
      const selfEntry: RoutingEntry = {
        destination: router.id,
        nextHop: router.id,
        metric: 0,
        protocol: PROTOCOL_NAME,
      };
      entries.push(selfEntry);

      routingTables[router.id] = entries;
    }

    return {
      routers: routers,
      links: links,
      routingTables: routingTables,
    };
  },

  // Jeden krok simulace RIP
  // Kazdy router posle svou tabulku vsem sousedum.
  // Soused projde prijatou tabulku, prida 1 k metrice a porovna se svou.
  // Pokud je nova cesta lepsi, aktualizuje svou tabulku.
  step: function stepRIP(state: NetworkState): SimulationStep {
    iterationCounter = iterationCounter + 1;
    const newState = cloneNetworkState(state);
    const changes: Change[] = [];

    // Pro kazdy router provedeme aktualizaci
    for (const router of newState.routers) {
      const routerId = router.id;
      const neighbors = getNeighbors(routerId, newState.links);

      // Projdeme vsechny sousedy
      for (const neighbor of neighbors) {
        const neighborId = neighbor.routerId;

        // Ziskame tabulku souseda z PUVODNIHO stavu (ne noveho!)
        // To je dulezite - vsechny routery posilaji svou tabulku soucasne
        const neighborTable = state.routingTables[neighborId];
        if (!neighborTable) {
          continue;
        }

        // Projdeme vsechny zaznamy v tabulce souseda
        for (const neighborEntry of neighborTable) {
          // Nova metrika = metrika souseda + 1 (jeden hop navic)
          const newMetric = neighborEntry.metric + 1;

          // Pokud je metrika >= 16, cesta je nedosazitelna
          if (newMetric >= RIP_MAX_METRIC) {
            continue;
          }

          // Hledame, zda uz mame zaznam pro tuto destinaci
          const currentTable = newState.routingTables[routerId];
          const existingEntry = findEntryByDestination(
            currentTable,
            neighborEntry.destination
          );

          if (existingEntry === null) {
            // Novy zaznam - destinaci jsme jeste neznali
            const newEntry: RoutingEntry = {
              destination: neighborEntry.destination,
              nextHop: neighborId,
              metric: newMetric,
              protocol: PROTOCOL_NAME,
            };
            currentTable.push(newEntry);

            const change: Change = {
              routerId: routerId,
              type: "added",
              entry: copyEntry(newEntry),
            };
            changes.push(change);
          } else if (newMetric < existingEntry.metric) {
            // Lepsi cesta - aktualizujeme
            const previousEntry = copyEntry(existingEntry);

            existingEntry.metric = newMetric;
            existingEntry.nextHop = neighborId;

            const change: Change = {
              routerId: routerId,
              type: "updated",
              entry: copyEntry(existingEntry),
              previousEntry: previousEntry,
            };
            changes.push(change);
          }
        }
      }
    }

    return {
      iteration: iterationCounter,
      state: newState,
      changes: changes,
    };
  },

  // RIP konvergoval, pokud by dalsi krok neprinsel zadne zmeny
  // Provedeme simulovany krok a zkontrolujeme, zda jsou zmeny
  isConverged: function isConvergedRIP(state: NetworkState): boolean {
    const testStep = RIPProtocol.step(state);
    // Vratime iterationCounter zpet, protoze jsme jen testovali
    iterationCounter = iterationCounter - 1;
    return testStep.changes.length === 0;
  },

  // Nalezeni cesty pomoci routovacich tabulek
  // Zacneme na zdrojovem routeru a sledujeme nextHop az k cili
  findPath: function findPathRIP(
    state: NetworkState,
    source: string,
    target: string
  ): string[] {
    return tracePath(state, source, target);
  },
};

// =====================================================
// Pomocne funkce
// =====================================================

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

// Kopie zaznamu - aby zmeny v jednom neovlivnily druhy
function copyEntry(entry: RoutingEntry): RoutingEntry {
  return {
    destination: entry.destination,
    nextHop: entry.nextHop,
    metric: entry.metric,
    protocol: entry.protocol,
  };
}

// Sledovani cesty z source do target pomoci routovacich tabulek
function tracePath(
  state: NetworkState,
  source: string,
  target: string
): string[] {
  // Pokud zdroj a cil jsou stejne, cesta je jen jeden uzel
  if (source === target) {
    return [source];
  }

  const path: string[] = [source];
  let currentRouter = source;
  // Ochrana proti smyckam - maximalne tolik kroku kolik je routeru
  const maxSteps = state.routers.length;

  for (let step = 0; step < maxSteps; step++) {
    const table = state.routingTables[currentRouter];
    if (!table) {
      // Router nema tabulku - cesta neexistuje
      return [];
    }

    const entry = findEntryByDestination(table, target);
    if (entry === null) {
      // Neni zaznam pro cil - cesta neexistuje
      return [];
    }

    const nextHop = entry.nextHop;
    path.push(nextHop);

    if (nextHop === target) {
      // Dosli jsme do cile
      return path;
    }

    // Kontrola smycky
    if (path.indexOf(nextHop) < path.length - 1) {
      // Nasli jsme smycku - cesta neexistuje
      return [];
    }

    currentRouter = nextHop;
  }

  // Prekrocen maximalni pocet kroku
  return [];
}
