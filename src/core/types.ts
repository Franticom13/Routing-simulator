// =====================================================
// types.ts - Sdilene typy pro cely simulator routovani
// =====================================================

// Uzel (router) v siti
export interface RouterNode {
  id: string;
  label: string;
  position: { x: number; y: number };
}

// Spoj (linka) mezi dvema routery
export interface NetworkLink {
  id: string;
  source: string;
  target: string;
  metric: number;
}

// Jeden zaznam v routovaci tabulce
export interface RoutingEntry {
  destination: string;
  nextHop: string;
  metric: number;
  protocol: string;
  role?: string; // EIGRP: 'S' (successor) nebo 'FS' (feasible successor)
}

// Celkovy stav site - routery, linky a routovaci tabulky
// Pouzivame Record misto Map, protoze se lepe serializuje
export interface NetworkState {
  routers: RouterNode[];
  links: NetworkLink[];
  routingTables: Record<string, RoutingEntry[]>;
}

// Jeden krok simulace - iterace, novy stav a zmeny
export interface SimulationStep {
  iteration: number;
  state: NetworkState;
  changes: Change[];
  phase?: string;
}

// Zmena v routovaci tabulce pri jednom kroku
export interface Change {
  routerId: string;
  type: "added" | "updated" | "removed";
  entry: RoutingEntry;
  previousEntry?: RoutingEntry;
}
