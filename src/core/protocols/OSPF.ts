// =====================================================
// OSPF.ts - Implementace protokolu OSPF (Open Shortest Path First)
// =====================================================
// OSPF je link-state protokol.
// Kazdy router zna celou topologii site (LSDB - Link State Database).
// Pouziva Dijkstruv algoritmus pro vypocet nejkratsich cest.
// Metrika = cena linky (cost) z NetworkLink.metric.
//
// Faze simulace:
//   Iterace 1: routery objevi sousedy a zaznamenaji primo pripojene linky
//   Iterace 2: LSA (Link State Advertisements) se siri siti - routery sdili LSDB
//   Iterace 3+: Dijkstra bezi na kazdem routeru, routovaci tabulky se vypocitaji
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

const PROTOCOL_NAME = "OSPF";

// Interni stav OSPF - LSDB pro kazdy router
// Klic = routerId, hodnota = mnozina linek ktere router zna
// Uchovavame jako Record<routerId, linkId[]>
let lsdb: Record<string, string[]> = {};

// Interni pocitadlo iteraci
let iterationCounter = 0;

// Faze OSPF simulace
let phase: "neighbor-discovery" | "lsa-flooding" | "dijkstra" = "neighbor-discovery";

export const OSPFProtocol: Protocol = {
  name: PROTOCOL_NAME,

  // Inicializace - prazdne routovaci tabulky, prazdna LSDB
  initialize: function initializeOSPF(
    routers: RouterNode[],
    links: NetworkLink[]
  ): NetworkState {
    iterationCounter = 0;
    phase = "neighbor-discovery";

    // Inicializace LSDB - zatim zadny router nic nezna
    lsdb = {};
    for (const router of routers) {
      lsdb[router.id] = [];
    }

    // Prazdne routovaci tabulky - jen zaznam pro sebe (metrika 0)
    const routingTables: Record<string, RoutingEntry[]> = {};
    for (const router of routers) {
      const selfEntry: RoutingEntry = {
        destination: router.id,
        nextHop: router.id,
        metric: 0,
        protocol: PROTOCOL_NAME,
      };
      routingTables[router.id] = [selfEntry];
    }

    return {
      routers: routers,
      links: links,
      routingTables: routingTables,
    };
  },

  // Jeden krok simulace OSPF
  step: function stepOSPF(state: NetworkState): SimulationStep {
    iterationCounter = iterationCounter + 1;

    if (phase === "neighbor-discovery") {
      // Faze 1: Kazdy router objevi sve sousedy a prida primo pripojene linky do LSDB
      return performNeighborDiscovery(state);
    } else if (phase === "lsa-flooding") {
      // Faze 2: Routery si vymeni LSA - kazdy router posle svou LSDB sousedum
      return performLSAFlooding(state);
    } else {
      // Faze 3: Dijkstra - kazdy router spocita nejkratsi cesty
      return performDijkstra(state);
    }
  },

  // OSPF konvergoval pokud vsechny routery maji kompletni LSDB
  // a dalsi Dijkstra by neprinsel zmeny
  isConverged: function isConvergedOSPF(state: NetworkState): boolean {
    // Pokud jsme jeste ve fazi discovery nebo flooding, neni konvergence
    if (phase !== "dijkstra") {
      return false;
    }
    // Zkusime provest Dijkstru a zjistime zda jsou zmeny
    const testStep = performDijkstraTest(state);
    return testStep.length === 0;
  },

  // Nalezeni cesty pomoci routovacich tabulek
  findPath: function findPathOSPF(
    state: NetworkState,
    source: string,
    target: string
  ): string[] {
    return tracePath(state, source, target);
  },
};

// =====================================================
// Faze 1: Objeveni sousedu
// =====================================================
function performNeighborDiscovery(state: NetworkState): SimulationStep {
  const newState = cloneNetworkState(state);
  const changes: Change[] = [];

  for (const router of newState.routers) {
    const routerId = router.id;
    const neighbors = getNeighbors(routerId, newState.links);

    // Pridame primo pripojene linky do LSDB tohoto routeru
    for (const neighbor of neighbors) {
      if (lsdb[routerId].indexOf(neighbor.linkId) === -1) {
        lsdb[routerId].push(neighbor.linkId);
      }
    }

    // Pridame routovaci zaznamy pro primo pripojene sousedy
    for (const neighbor of neighbors) {
      const existingEntry = findEntryByDestination(
        newState.routingTables[routerId],
        neighbor.routerId
      );

      if (existingEntry === null) {
        const newEntry: RoutingEntry = {
          destination: neighbor.routerId,
          nextHop: neighbor.routerId,
          metric: neighbor.metric,
          protocol: PROTOCOL_NAME,
        };
        newState.routingTables[routerId].push(newEntry);

        changes.push({
          routerId: routerId,
          type: "added",
          entry: copyEntry(newEntry),
        });
      }
    }
  }

  // Presuneme se do dalsi faze
  phase = "lsa-flooding";

  return {
    iteration: iterationCounter,
    state: newState,
    changes: changes,
    phase: "neighbor-discovery",
  };
}

// =====================================================
// Faze 2: Sireni LSA (Link State Advertisements)
// =====================================================
function performLSAFlooding(state: NetworkState): SimulationStep {
  const newState = cloneNetworkState(state);
  const changes: Change[] = [];

  // Provedeme VSECHNY kola floodingu najednou (dokud se LSDB nemeni)
  let keepFlooding = true;
  while (keepFlooding) {
    keepFlooding = false;

    // Snimek LSDB pred timto kolem
    const lsdbSnapshot: Record<string, string[]> = {};
    for (const routerId of Object.keys(lsdb)) {
      lsdbSnapshot[routerId] = lsdb[routerId].slice();
    }

    for (const router of newState.routers) {
      const routerId = router.id;
      const neighbors = getNeighbors(routerId, newState.links);

      for (const neighbor of neighbors) {
        const neighborId = neighbor.routerId;

        for (const linkId of lsdbSnapshot[routerId]) {
          if (lsdb[neighborId].indexOf(linkId) === -1) {
            lsdb[neighborId].push(linkId);
            keepFlooding = true;
          }
        }
      }
    }
  }

  // Presuneme se na Dijkstru
  phase = "dijkstra";

  return {
    iteration: iterationCounter,
    state: newState,
    changes: changes,
    phase: "lsa-flooding",
  };
}

// =====================================================
// Faze 3: Dijkstruv algoritmus
// =====================================================
function performDijkstra(state: NetworkState): SimulationStep {
  const newState = cloneNetworkState(state);
  const changes: Change[] = [];

  // Pro kazdy router spocitame nejkratsi cesty pomoci Dijkstry
  for (const router of newState.routers) {
    const routerId = router.id;
    const dijkstraChanges = runDijkstraForRouter(routerId, newState);

    for (const change of dijkstraChanges) {
      changes.push(change);
    }
  }

  return {
    iteration: iterationCounter,
    state: newState,
    changes: changes,
    phase: "dijkstra",
  };
}

// Testovaci verze Dijkstry - nemenime stav, jen zjistujeme zmeny
function performDijkstraTest(state: NetworkState): Change[] {
  const testState = cloneNetworkState(state);
  const allChanges: Change[] = [];

  for (const router of testState.routers) {
    const routerId = router.id;
    const dijkstraChanges = runDijkstraForRouter(routerId, testState);
    for (const change of dijkstraChanges) {
      allChanges.push(change);
    }
  }

  return allChanges;
}

// Dijkstruv algoritmus pro jeden router
// Spocita nejkratsi cesty ke vsem ostatnim routerum
function runDijkstraForRouter(
  routerId: string,
  state: NetworkState
): Change[] {
  const changes: Change[] = [];

  // Mnozina vsech routeru
  const allRouterIds: string[] = [];
  for (const router of state.routers) {
    allRouterIds.push(router.id);
  }

  // Inicializace vzdalenosti - nekonecno pro vsechny krome sebe
  const distances: Record<string, number> = {};
  // Predchudce na nejkratsi ceste - pro urceni nextHop
  const previous: Record<string, string | null> = {};
  // Mnozina nenavstivenych uzlu
  const unvisited: string[] = [];

  for (const id of allRouterIds) {
    distances[id] = Infinity;
    previous[id] = null;
    unvisited.push(id);
  }
  distances[routerId] = 0;

  // Hlavni smycka Dijkstry
  while (unvisited.length > 0) {
    // Najdeme nenavstiveny uzel s nejmensi vzdalenosti
    const currentNode = findMinDistanceNode(unvisited, distances);
    if (currentNode === null) {
      break; // Vsechny zbyvajici uzly jsou nedosazitelne
    }

    // Pokud je vzdalenost nekonecna, zbyle uzly jsou nedosazitelne
    if (distances[currentNode] === Infinity) {
      break;
    }

    // Odebereme z nenavstivenych
    const currentIndex = unvisited.indexOf(currentNode);
    unvisited.splice(currentIndex, 1);

    // Projdeme sousedy - ale jen pokud je linka v nasi LSDB
    const neighbors = getNeighbors(currentNode, state.links);
    for (const neighbor of neighbors) {
      // Kontrola zda linku zname v LSDB
      if (lsdb[routerId] && lsdb[routerId].indexOf(neighbor.linkId) === -1) {
        continue;
      }

      const alternativeDistance = distances[currentNode] + neighbor.metric;

      if (alternativeDistance < distances[neighbor.routerId]) {
        distances[neighbor.routerId] = alternativeDistance;
        previous[neighbor.routerId] = currentNode;
      }
    }
  }

  // Vytvoreni routovacich zaznamu z vysledku Dijkstry
  for (const destId of allRouterIds) {
    if (destId === routerId) {
      continue; // Preskocime sami sebe
    }

    if (distances[destId] === Infinity) {
      continue; // Nedosazitelny
    }

    // Najdeme nextHop - prvni uzel na ceste od nas k cili
    const nextHop = findNextHop(routerId, destId, previous);
    if (nextHop === null) {
      continue;
    }

    const newEntry: RoutingEntry = {
      destination: destId,
      nextHop: nextHop,
      metric: distances[destId],
      protocol: PROTOCOL_NAME,
    };

    // Porovnani s existujicim zaznamem
    const existingEntry = findEntryByDestination(
      state.routingTables[routerId],
      destId
    );

    if (existingEntry === null) {
      // Novy zaznam
      state.routingTables[routerId].push(copyEntry(newEntry));
      changes.push({
        routerId: routerId,
        type: "added",
        entry: copyEntry(newEntry),
      });
    } else if (
      existingEntry.metric !== newEntry.metric ||
      existingEntry.nextHop !== newEntry.nextHop
    ) {
      // Aktualizovany zaznam
      const prev = copyEntry(existingEntry);
      existingEntry.metric = newEntry.metric;
      existingEntry.nextHop = newEntry.nextHop;

      changes.push({
        routerId: routerId,
        type: "updated",
        entry: copyEntry(newEntry),
        previousEntry: prev,
      });
    }
  }

  return changes;
}

// =====================================================
// Pomocne funkce
// =====================================================

// Najde nenavstiveny uzel s nejmensi vzdalenosti (pro Dijkstru)
function findMinDistanceNode(
  unvisited: string[],
  distances: Record<string, number>
): string | null {
  let minDistance = Infinity;
  let minNode: string | null = null;

  for (const nodeId of unvisited) {
    if (distances[nodeId] < minDistance) {
      minDistance = distances[nodeId];
      minNode = nodeId;
    }
  }

  return minNode;
}

// Najde prvni uzel na ceste od source k destination (nextHop)
// Sleduje retezec predchudcu zpet od cile ke zdroji
function findNextHop(
  source: string,
  destination: string,
  previous: Record<string, string | null>
): string | null {
  let current = destination;

  // Sledujeme cestu zpet od cile ke zdroji
  while (previous[current] !== null && previous[current] !== source) {
    current = previous[current] as string;
  }

  // Pokud jsme se dostali k uzlu jehoz predchudce je source, to je nextHop
  if (previous[current] === source) {
    return current;
  }

  return null;
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

// Kopie zaznamu
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
