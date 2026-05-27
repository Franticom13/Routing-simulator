// =====================================================
// EIGRP.ts - Implementace protokolu EIGRP
// (Enhanced Interior Gateway Routing Protocol)
// =====================================================
// EIGRP je hybridni protokol pouzivajici algoritmus DUAL
// (Diffusing Update Algorithm).
//
// Klicove pojmy:
//   FD (Feasible Distance) = nejlepsi znama vzdalenost k cili
//   RD (Reported Distance) = vzdalenost hlasena sousedem
//   Successor = nejlepsi next-hop (soused s nejmensi FD)
//   Feasible Successor = zalozni cesta kde RD < FD (feasibility condition)
//
// Metrika = cena linky (pro jednoduchost pouzivame primo metric z NetworkLink)
//
// Kazdy krok: routery si vymeni aktualizace, spousti se DUAL
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

const PROTOCOL_NAME = "EIGRP";

// Interni pocitadlo iteraci
let iterationCounter = 0;

// Topologicka tabulka EIGRP
// Pro kazdy router a kazdou destinaci uchovavame informace od vsech sousedu
// Struktura: topologyTable[routerId][destinationId] = pole cest pres sousedy
interface TopologyEntry {
  neighborId: string;       // Soused ktery hlasi cestu
  reportedDistance: number;  // RD - vzdalenost hlasena sousedem
  feasibleDistance: number;  // FD = RD + cena linky k sousedovi
  linkMetric: number;        // Cena linky k tomuto sousedovi
}

let topologyTable: Record<string, Record<string, TopologyEntry[]>> = {};

export const EIGRPProtocol: Protocol = {
  name: PROTOCOL_NAME,

  // Inicializace - kazdy router zna sebe a primo pripojene sousedy
  initialize: function initializeEIGRP(
    routers: RouterNode[],
    links: NetworkLink[]
  ): NetworkState {
    iterationCounter = 0;

    // Inicializace topologicke tabulky
    topologyTable = {};

    const routingTables: Record<string, RoutingEntry[]> = {};

    for (const router of routers) {
      const routerId = router.id;
      topologyTable[routerId] = {};

      const entries: RoutingEntry[] = [];

      // Zaznam pro sebe sama
      // Sousedy router objevi az v prvnim kroku simulace
      const selfEntry: RoutingEntry = {
        destination: routerId,
        nextHop: routerId,
        metric: 0,
        protocol: PROTOCOL_NAME,
      };
      entries.push(selfEntry);

      // Topologicky zaznam pro sebe - vzdalenost 0
      topologyTable[routerId][routerId] = [];

      routingTables[routerId] = entries;
    }

    return {
      routers: routers,
      links: links,
      routingTables: routingTables,
    };
  },

  // Jeden krok simulace EIGRP
  // Kazdy router posle svou routovaci tabulku sousedum.
  // Soused spocita FD a RD a pomoci DUAL urci successora a feasible successory.
  step: function stepEIGRP(state: NetworkState): SimulationStep {
    iterationCounter = iterationCounter + 1;
    const newState = cloneNetworkState(state);
    const changes: Change[] = [];

    // Faze 1: Sber aktualizaci od sousedu
    // Kazdy router projde sve sousedy a zpracuje jejich routovaci tabulky
    for (const router of newState.routers) {
      const routerId = router.id;
      const neighbors = getNeighbors(routerId, newState.links);

      for (const neighbor of neighbors) {
        const neighborId = neighbor.routerId;
        const linkCost = neighbor.metric;

        // Ziskame routovaci tabulku souseda z PUVODNIHO stavu
        const neighborTable = state.routingTables[neighborId];
        if (!neighborTable) {
          continue;
        }

        // Projdeme zaznamy souseda — jen successor routes, FS se nesdileji
        for (const neighborEntry of neighborTable) {
          const destId = neighborEntry.destination;

          // Nechceme cestu k sobe samemu pres souseda
          if (destId === routerId) {
            continue;
          }

          // V EIGRP se sousedum posilaji jen successor (S) routes, ne FS
          if (neighborEntry.role === 'FS') {
            continue;
          }

          // RD = metrika kterou soused hlasi pro tuto destinaci
          const reportedDistance = neighborEntry.metric;
          // FD = RD + cena linky k sousedovi
          const feasibleDistance = reportedDistance + linkCost;

          // Inicializace topologickeho zaznamu pokud neexistuje
          if (!topologyTable[routerId]) {
            topologyTable[routerId] = {};
          }
          if (!topologyTable[routerId][destId]) {
            topologyTable[routerId][destId] = [];
          }

          // Aktualizace nebo pridani topologickeho zaznamu
          updateTopologyEntry(
            routerId,
            destId,
            neighborId,
            reportedDistance,
            feasibleDistance,
            linkCost
          );
        }
      }
    }

    // Faze 2: DUAL algoritmus - vyber successora pro kazdou destinaci
    for (const router of newState.routers) {
      const routerId = router.id;
      const routerTopology = topologyTable[routerId];

      if (!routerTopology) {
        continue;
      }

      for (const destId of Object.keys(routerTopology)) {
        if (destId === routerId) {
          continue; // Preskocime sami sebe
        }

        const topologyEntries = routerTopology[destId];
        if (!topologyEntries || topologyEntries.length === 0) {
          continue;
        }

        // Najdeme successora - cestu s nejmensi FD
        const successor = findSuccessor(topologyEntries);
        if (successor === null) {
          continue;
        }

        // Najdeme feasible successory
        const feasibleSuccessors = findFeasibleSuccessors(
          topologyEntries,
          successor.feasibleDistance
        );

        // Aktualizace routovaci tabulky — successor
        const currentTable = newState.routingTables[routerId];
        const existingEntry = findEntryByDestination(currentTable, destId);

        if (existingEntry === null) {
          // Novy zaznam
          const newEntry: RoutingEntry = {
            destination: destId,
            nextHop: successor.neighborId,
            metric: successor.feasibleDistance,
            protocol: PROTOCOL_NAME,
            role: 'S',
          };
          currentTable.push(newEntry);

          changes.push({
            routerId: routerId,
            type: "added",
            entry: copyEntry(newEntry),
          });
        } else if (
          existingEntry.metric !== successor.feasibleDistance ||
          existingEntry.nextHop !== successor.neighborId
        ) {
          // Aktualizace existujiciho zaznamu
          const previousEntry = copyEntry(existingEntry);

          existingEntry.metric = successor.feasibleDistance;
          existingEntry.nextHop = successor.neighborId;
          existingEntry.role = 'S';

          changes.push({
            routerId: routerId,
            type: "updated",
            entry: copyEntry(existingEntry),
            previousEntry: previousEntry,
          });
        } else {
          // Ujistime se ze role je nastavena
          if (!existingEntry.role) {
            existingEntry.role = 'S';
          }
        }

        // Odebrat stare FS zaznamy a zapamatovat si je
        var oldFsEntries: RoutingEntry[] = [];
        var fsIndex = currentTable.length - 1;
        while (fsIndex >= 0) {
          if (currentTable[fsIndex].destination === destId && currentTable[fsIndex].role === 'FS') {
            oldFsEntries.push(currentTable[fsIndex]);
            currentTable.splice(fsIndex, 1);
          }
          fsIndex--;
        }

        // Pridat feasible successory — nove FS trackovat jako change
        for (var fsi = 0; fsi < feasibleSuccessors.length; fsi++) {
          var fs = feasibleSuccessors[fsi];
          var fsEntry: RoutingEntry = {
            destination: destId,
            nextHop: fs.neighborId,
            metric: fs.feasibleDistance,
            protocol: PROTOCOL_NAME,
            role: 'FS',
          };
          currentTable.push(fsEntry);

          var wasAlreadyFS = oldFsEntries.some(function (old) {
            return old.nextHop === fs.neighborId && old.metric === fs.feasibleDistance;
          });
          if (!wasAlreadyFS) {
            changes.push({
              routerId: routerId,
              type: 'added',
              entry: copyEntry(fsEntry),
            });
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

  // EIGRP konvergoval pokud dalsi krok neprinese zadne zmeny
  isConverged: function isConvergedEIGRP(state: NetworkState): boolean {
    // Ulozit stav topology table aby test step neznecistil data
    const savedTopologyTable = JSON.parse(JSON.stringify(topologyTable));
    const testStep = EIGRPProtocol.step(state);
    // Obnovit stav
    iterationCounter = iterationCounter - 1;
    topologyTable = savedTopologyTable;
    return testStep.changes.length === 0;
  },

  // Nalezeni cesty pomoci routovacich tabulek
  findPath: function findPathEIGRP(
    state: NetworkState,
    source: string,
    target: string
  ): string[] {
    return tracePath(state, source, target);
  },
};

// =====================================================
// Pomocne funkce pro DUAL algoritmus
// =====================================================

// Aktualizace topologickeho zaznamu pro dany router, destinaci a souseda
function updateTopologyEntry(
  routerId: string,
  destId: string,
  neighborId: string,
  reportedDistance: number,
  feasibleDistance: number,
  linkMetric: number
): void {
  const entries = topologyTable[routerId][destId];

  // Hledame existujici zaznam od tohoto souseda
  let found = false;
  for (const entry of entries) {
    if (entry.neighborId === neighborId) {
      entry.reportedDistance = reportedDistance;
      entry.feasibleDistance = feasibleDistance;
      entry.linkMetric = linkMetric;
      found = true;
      break;
    }
  }

  // Pokud neexistuje, pridame novy
  if (!found) {
    entries.push({
      neighborId: neighborId,
      reportedDistance: reportedDistance,
      feasibleDistance: feasibleDistance,
      linkMetric: linkMetric,
    });
  }
}

// Najde successora - cestu s nejmensi Feasible Distance
function findSuccessor(entries: TopologyEntry[]): TopologyEntry | null {
  if (entries.length === 0) {
    return null;
  }

  let bestEntry: TopologyEntry = entries[0];

  for (let i = 1; i < entries.length; i++) {
    if (entries[i].feasibleDistance < bestEntry.feasibleDistance) {
      bestEntry = entries[i];
    }
  }

  return bestEntry;
}

// Najde feasible successory - zalozni cesty splnujici feasibility condition
// Feasibility condition: RD souseda < FD aktualniho successora
export function findFeasibleSuccessors(
  entries: TopologyEntry[],
  currentFD: number
): TopologyEntry[] {
  const feasibleSuccessors: TopologyEntry[] = [];
  const successor = findSuccessor(entries);

  if (successor === null) {
    return feasibleSuccessors;
  }

  for (const entry of entries) {
    // Preskocime successora sameho
    if (entry.neighborId === successor.neighborId) {
      continue;
    }

    // Feasibility condition: RD < FD successora
    if (entry.reportedDistance < currentFD) {
      feasibleSuccessors.push(entry);
    }
  }

  return feasibleSuccessors;
}

// =====================================================
// Obecne pomocne funkce
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

// Kopie zaznamu
function copyEntry(entry: RoutingEntry): RoutingEntry {
  return {
    destination: entry.destination,
    nextHop: entry.nextHop,
    metric: entry.metric,
    protocol: entry.protocol,
    role: entry.role,
  };
}

// Sledovani cesty z source do target pomoci routovacich tabulek
function tracePath(
  state: NetworkState,
  source: string,
  target: string
): string[] {
  if (source === target) {
    return [source];
  }

  const path: string[] = [source];
  let currentRouter = source;
  const maxSteps = state.routers.length;

  for (let step = 0; step < maxSteps; step++) {
    const table = state.routingTables[currentRouter];
    if (!table) {
      return [];
    }

    const entry = findEntryByDestination(table, target);
    if (entry === null) {
      return [];
    }

    const nextHop = entry.nextHop;
    path.push(nextHop);

    if (nextHop === target) {
      return path;
    }

    // Kontrola smycky
    if (path.indexOf(nextHop) < path.length - 1) {
      return [];
    }

    currentRouter = nextHop;
  }

  return [];
}
