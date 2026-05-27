// =====================================================
// graph.ts - Pomocne funkce pro praci s grafem site
// =====================================================

import type {
  RouterNode,
  NetworkLink,
  NetworkState,
  RoutingEntry,
} from "./types";

// Informace o sousedovi - ID routeru a metrika linky
export interface NeighborInfo {
  routerId: string;
  metric: number;
  linkId: string;
}

// Ziskani sousedu daneho routeru vcetne metrik
// Prochazi vsechny linky a hleda ty, ktere souvisi s danym routerem
export function getNeighbors(
  routerId: string,
  links: NetworkLink[]
): NeighborInfo[] {
  const neighbors: NeighborInfo[] = [];

  for (const link of links) {
    // Linka muze byt v obou smerech - kontrolujeme oba
    if (link.source === routerId) {
      neighbors.push({
        routerId: link.target,
        metric: link.metric,
        linkId: link.id,
      });
    } else if (link.target === routerId) {
      neighbors.push({
        routerId: link.source,
        metric: link.metric,
        linkId: link.id,
      });
    }
  }

  return neighbors;
}

// Ziskani vsech linek primo pripojenych k danemu routeru
export function getDirectlyConnectedLinks(
  routerId: string,
  links: NetworkLink[]
): NetworkLink[] {
  const connectedLinks: NetworkLink[] = [];

  for (const link of links) {
    if (link.source === routerId || link.target === routerId) {
      connectedLinks.push(link);
    }
  }

  return connectedLinks;
}

// Prevod uzlu a hran z React Flow formatu na NetworkState
// React Flow pouziva Node a Edge objekty, ktere prevedeme na nase typy
export function convertToNetworkState(
  flowNodes: Array<{ id: string; data?: { label?: string }; position: { x: number; y: number } }>,
  flowEdges: Array<{ id: string; source: string; target: string; data?: { metric?: number } }>
): NetworkState {
  // Prevod uzlu na RouterNode
  const routers: RouterNode[] = [];
  for (const node of flowNodes) {
    const router: RouterNode = {
      id: node.id,
      label: (node.data && node.data.label) ? node.data.label : node.id,
      position: {
        x: node.position.x,
        y: node.position.y,
      },
    };
    routers.push(router);
  }

  // Prevod hran na NetworkLink
  const links: NetworkLink[] = [];
  for (const edge of flowEdges) {
    const link: NetworkLink = {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      metric: (edge.data && edge.data.metric) ? edge.data.metric : 1,
    };
    links.push(link);
  }

  // Prazdne routovaci tabulky pro kazdy router
  const routingTables: Record<string, RoutingEntry[]> = {};
  for (const router of routers) {
    routingTables[router.id] = [];
  }

  return {
    routers,
    links,
    routingTables,
  };
}

// Hluboka kopie NetworkState - pouzivame pro immutabilitu pri simulaci
export function cloneNetworkState(state: NetworkState): NetworkState {
  const clonedRouters: RouterNode[] = state.routers.map(function cloneRouter(r) {
    return {
      id: r.id,
      label: r.label,
      position: { x: r.position.x, y: r.position.y },
    };
  });

  const clonedLinks: NetworkLink[] = state.links.map(function cloneLink(l) {
    return {
      id: l.id,
      source: l.source,
      target: l.target,
      metric: l.metric,
    };
  });

  const clonedTables: Record<string, RoutingEntry[]> = {};
  for (const routerId of Object.keys(state.routingTables)) {
    const entries = state.routingTables[routerId];
    clonedTables[routerId] = entries.map(function cloneEntry(e) {
      return {
        destination: e.destination,
        nextHop: e.nextHop,
        metric: e.metric,
        protocol: e.protocol,
        role: e.role,
      };
    });
  }

  return {
    routers: clonedRouters,
    links: clonedLinks,
    routingTables: clonedTables,
  };
}
