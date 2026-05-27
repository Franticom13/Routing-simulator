# Dokumentace — Routing Simulator

Prehled kompletni dokumentace projektu pro simulaci routovacich protokolu.

---

## Struktura dokumentace

### Architektura

| Soubor | Popis |
|--------|-------|
| [architektura.md](architektura.md) | Celkova architektura, tech stack, struktura slozek, komunikace vrstev |

### Frontend

| Soubor | Popis |
|--------|-------|
| [frontend/editor.md](frontend/editor.md) | Graficky editor site — React Flow, custom nodes, floating edges |
| [frontend/sidebar.md](frontend/sidebar.md) | Levy sidebar — seznam routeru, routovaci tabulka, zmeny |
| [frontend/toolbar.md](frontend/toolbar.md) | Horni toolbar + plovouci bar dole, protocol dropdown |
| [frontend/komponenty.md](frontend/komponenty.md) | Prehled vsech React komponent, props, zodpovednosti |

### Logika (core)

| Soubor | Popis |
|--------|-------|
| [logika/graf.md](logika/graf.md) | Datova struktura grafu, konverze, sousede, klonovani |
| [logika/simulace.md](logika/simulace.md) | Simulacni engine — krokovani, konvergence, hledani cest |
| [logika/typy.md](logika/typy.md) | Vsechny TypeScript typy a rozhrani |
| [logika/rozhrani.md](logika/rozhrani.md) | Protocol interface, kontrakt, navod na pridani noveho protokolu |

### Protokoly

| Soubor | Popis |
|--------|-------|
| [protokoly/prehled.md](protokoly/prehled.md) | Srovnani RIP, OSPF, EIGRP v tabulce |
| [protokoly/rip.md](protokoly/rip.md) | RIP — distance-vector, hop count, Bellman-Ford |
| [protokoly/ospf.md](protokoly/ospf.md) | OSPF — link-state, Dijkstra, LSDB |
| [protokoly/eigrp.md](protokoly/eigrp.md) | EIGRP — hybrid, DUAL, feasible distance/successor |

### Design

| Soubor | Popis |
|--------|-------|
| [design/theme.md](design/theme.md) | Design system — barvy, typografie, stiny, animace |
| [design/ui-flow.md](design/ui-flow.md) | Uzivatelsky flow krok po kroku |

---

## Zdrojove soubory projektu

```
src/
  App.tsx                          — hlavni komponenta, stav simulace
  index.css                        — kompletni design system
  core/
    types.ts                       — sdilene TypeScript typy
    graph.ts                       — datova struktura grafu
    simulation.ts                  — simulacni engine
    protocols/
      Protocol.ts                  — rozhrani pro protokoly
      RIP.ts                       — implementace RIP
      OSPF.ts                      — implementace OSPF
      EIGRP.ts                     — implementace EIGRP
  components/
    Toolbar.tsx                    — horni toolbar
    Sidebar.tsx                    — levy sidebar
    FloatingBar.tsx                — plovouci bar dole
    ProtocolSelect.tsx             — custom dropdown pro protokol
    RoutingTable.tsx               — tabulka routovacich zaznamu
    MetricDialog.tsx               — dialog pro zadani metriky
    Icons.tsx                      — vsechny SVG ikony
    Editor/
      Canvas.tsx                   — React Flow wrapper
      RouterNode.tsx               — custom node (router)
      NetworkEdge.tsx              — custom edge (floating propoj)
```

---

## Tym

| Role | Clen |
|------|------|
| PROG (editor) | Thomas Wilson |
| PROG (logika) | Petr Chmelar |
| GRAF | Adam Racek |
| SITE | Barbora Gazdova |

---

## Tech stack

- **Jazyk:** TypeScript
- **Framework:** React 18+
- **Build tool:** Vite
- **Graficky editor:** React Flow (@xyflow/react)
- **Styling:** Vanilla CSS s custom properties (design tokeny)
- **Fonty:** Inter (UI) + JetBrains Mono (monospace)
