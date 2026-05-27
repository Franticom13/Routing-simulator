// =====================================================
// Protocol.ts - Rozhrani pro vsechny routovaci protokoly
// =====================================================

import type { RouterNode, NetworkLink, NetworkState, SimulationStep } from "../types";

// Kazdy routovaci protokol musi implementovat toto rozhrani
export interface Protocol {
  // Nazev protokolu (napr. "RIP", "OSPF", "EIGRP")
  name: string;

  // Inicializace - vytvori pocatecni stav site z routeru a linek
  initialize(routers: RouterNode[], links: NetworkLink[]): NetworkState;

  // Jeden krok simulace - vrati novy stav a zmeny
  step(state: NetworkState): SimulationStep;

  // Kontrola zda protokol konvergoval (zadne dalsi zmeny)
  isConverged(state: NetworkState): boolean;

  // Nalezeni cesty ze zdroje do cile pomoci routovacich tabulek
  findPath(state: NetworkState, source: string, target: string): string[];
}
