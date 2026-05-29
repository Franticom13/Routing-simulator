# Prehled vsech React komponent

Kompletni seznam vsech komponent v aplikaci, jejich zodpovednosti a props.

---

## Hlavni komponenta

### App (`src/App.tsx`)

Centralni orchestrator cele aplikace. Drzi veskery stav a propojuje frontend s core logikou.
Spravuje multi-tab system -- kazdy tab (`TabData`) ma vlastni izolovanou sadu stavu.

**Stav (per-tab -- ulozeno v `TabData`):**

| Stav | Typ | Ucel |
|------|-----|------|
| `nodes` / `edges` | React Flow state | Uzly a hrany na platne |
| `selectedProtocol` | `string` | Nazev protokolu (RIP/OSPF/EIGRP) |
| `iteration` | `number` | Cislo aktualni iterace |
| `isConverged` | `boolean` | Zda simulace konvergovala |
| `isSimulationRunning` | `boolean` | Zda bezi automaticky rezim |
| `routingTables` | `Record<string, RoutingEntry[]>` | Vsechny routovaci tabulky |
| `currentChanges` | `Change[]` | Zmeny v poslednim kroku |
| `simulationState` | `NetworkState \| null` | Interni stav simulace |
| `selectedRouterId` | `string \| null` | ID vybraneho routeru |
| `isPathMode` | `boolean` | Rezim vizualizace cesty |
| `pathSource` / `pathTarget` | `string \| null` | Zdroj a cil cesty |
| `ospfPhase` | `string` | Aktualni faze OSPF simulace |
| `routerCounter` | `number` | Pocitadlo pro generovani unikatnich router ID |

**Stav (tab management):**

| Stav | Typ | Ucel |
|------|-----|------|
| `tabs` | `TabData[]` | Pole vsech tabu s jejich snapshoty stavu |
| `activeTabId` | `string` | ID aktualne aktivniho tabu |
| `tabsRef` | `Ref<TabData[]>` | Ref pro pristup k poslednim hodnotam bez stale closure |
| `activeTabIdRef` | `Ref<string>` | Ref pro pristup k poslednimu activeTabId |

**Stav (ostatni):**

| Stav | Typ | Ucel |
|------|-----|------|
| `isConnecting` | `boolean` | Rezim propojovani |
| `highlightedPath` | `string[]` | Zvyraznena cesta |
| `metricDialog` | objekt | Stav modalu pro metriku |
| `simulationRef` | `Ref<SimulationEngine>` | Reference na engine |

**Tab management metody:**

| Metoda | Popis |
|--------|-------|
| `handleSwitchTab(tabId)` | Ulozi aktualni tab (`saveActiveTabState`), nacte cilovy tab (`loadTabState`) |
| `handleAddTab()` | Vytvori prazdny tab (`createEmptyTab`), prida ho a prepne na nej |
| `handleCloseTab(tabId)` | Zavre tab, prepne na sousedni pokud se maze aktivni |
| `handleRenameTab(tabId, newName)` | Prejmenuje tab v poli `tabs` |
| `handleReorderTabs(fromIndex, toIndex)` | Presune tab na novou pozici (drag & drop) |
| `saveActiveTabState()` | Ulozi aktualni React stav zpet do `tabs` pole |
| `loadTabState(tab)` | Nacte stav z `TabData` do vsech React useState setteru |

**localStorage persistence:**

| Entita | Popis |
|--------|-------|
| `STORAGE_KEY` | Klic `'routing-simulator-tabs'` v localStorage |
| `CACHED_STORAGE` | Jednorazove nacteni z localStorage pri startu (volano mimo komponentu) |
| `saveTabsToStorage(tabs, activeTabId)` | Serializuje taby do JSON, odstrani `simulationState` pred ulozenim |
| Auto-save `useEffect` | Debounced (200ms) -- sleduje zmeny nodes, edges, iteration, atd. a automaticky uklada |

**Klicove metody (editace/simulace):** `handleAddRouter`, `handleToggleConnect`, `handleTogglePath`, `handleStep`, `handleRunAll`, `handleReset`, `handleProtocolChange`, `findAndHighlightPath`

---

## Komponenty editoru

### Canvas (`src/components/Editor/Canvas.tsx`)

React Flow wrapper. Registruje custom node/edge typy, nastavuje pozadi a ovladaci prvky.

| Prop | Typ |
|------|-----|
| `nodes` | `Node[]` |
| `edges` | `Edge[]` |
| `onNodesChange` | `(changes) => void` |
| `onEdgesChange` | `(changes) => void` |
| `onConnect` | `OnConnect` |
| `onNodeClick` | `NodeMouseHandler` |
| `onPaneClick` | `() => void` |
| `onNodeDragStop` | `(event, node) => void` |

### RouterNode (`src/components/Editor/RouterNode.tsx`)

Custom React Flow node. Zobrazuje ikonu routeru a nazev. Memoizovany (`React.memo`).

| Data prop | Typ | Ucel |
|-----------|-----|------|
| `label` | `string` | Nazev routeru |
| `isChanged` | `boolean` | Zvyrazneni zmeny (zluta) |
| `isSelected` | `boolean` | Zvyrazneni vyberu (teal) |
| `isPathHighlighted` | `boolean` | Zvyrazneni na ceste (glow) |
| `isDiscovered` | `boolean` | Zvýraznění známých cílů (vybraný router pro ně má záznam v tabulce, teal obrys) |
| `isAlreadyConnected` | `boolean` | Zvýraznění uzlů již připojených ke zdroji při novém propojování (šedý obrys) |
| `isComputing` | `boolean` | Aktivuje pulzování a rotaci ikony během Dijkstra výpočtu v OSPF |

### NetworkEdge (`src/components/Editor/NetworkEdge.tsx`)

Custom React Flow edge s floating pripojenim. Zobrazuje primku s metrikou.

| Data prop | Typ | Ucel |
|-----------|-----|------|
| `metric` | `number` | Cena linky (zobrazena jako label) |
| `isChanged` | `boolean` | Zvyrazneni zmeny (oranzovy carkovaný) |
| `isPathHighlighted` | `boolean` | Zvyrazneni na ceste (teal) |
| `showMetrics` | `boolean` | Příznak viditelnosti popisku s metrikou linky (vypínatelné v nastavení) |
| `particleKey` | `number` | Monotónní identifikátor aktuální dávky animovaných pilulek |
| `particleTarget` | `string` | ID cílového routeru pro pohybující se pilulky na této lince |
| `particlePills` | `Array<string \| object>` | Seznam zpráv/záznamů k animaci (putují po lince v podobě pilulek) |

---

## TabBar (`src/components/TabBar.tsx`)

Horizontalni lista tabu umistena nad platnem (Canvas), napravo od sidebaru. Kazdy tab predstavuje nezavisly workspace s vlastnim grafem a simulaci.

### Props

```typescript
interface TabBarProps {
  tabs: TabInfo[];                                        // pole tabu (id, name)
  activeTabId: string;                                    // ID aktivniho tabu
  onSwitchTab: (tabId: string) => void;                   // prepnuti na tab
  onAddTab: () => void;                                   // pridani noveho tabu
  onCloseTab: (tabId: string) => void;                    // zavreni tabu
  onRenameTab: (tabId: string, newName: string) => void;  // prejmenovani tabu
  onReorderTabs: (fromIndex: number, toIndex: number) => void; // zmena poradi (drag)
}
```

### TabInfo

```typescript
export interface TabInfo {
  id: string;    // unikatni identifikator tabu
  name: string;  // zobrazovany nazev tabu
}
```

### Funkcionalita

| Funkce | Popis |
|--------|-------|
| **Prepinani** | Klik na tab zavola `onSwitchTab`, aktivni tab ma tridu `.tab-item.active` |
| **Pridani** | Tlacitko `+` na konci listy zavola `onAddTab` |
| **Zavreni** | Krizek (`CloseIcon`) na kazdem tabu -- zobrazen jen pokud existuje vice nez 1 tab |
| **Prejmenovani** | Pravy klik -> context menu -> Prejmenovat -> inline `<input>` s automatickou sirkou |
| **Drag & Drop** | Kazdy tab je `draggable`, pri pretazeni nad jiny tab se okamzite vola `onReorderTabs` |
| **Sliding indicator** | Animovany spodni prouzek (`.tab-indicator`) plynule sleduje aktivni tab pomoci `useLayoutEffect` + `ResizeObserver` |

### Context menu

Pravy klik na tab otvira kontextove menu (`position: fixed`) s polozkami:
- **Prejmenovat** -- spusti inline editaci nazvu
- **Zavrit tab** -- zobrazen jen pokud existuje vice nez 1 tab (trida `.danger`)

Menu se zavre pri kliknuti mimo (listener na `mousedown`).

### Inline editace nazvu

Pri prejmenovani se nazev tabu nahradi elementem `<input>`. Sirka inputu se dynamicky meri pomoci skryteho `<span>` (`.tab-measure`). Potvrzeni: Enter nebo blur. Zruseni: Escape.

---

## Komponenty panelu

### Toolbar (`src/components/Toolbar.tsx`)

Horni lista s editacnimi nastroji.

| Prop | Typ | Ucel |
|------|-----|------|
| `onAddRouter` | `() => void` | Pridani routeru |
| `onToggleConnect` | `() => void` | Prepnuti propojovani |
| `onTogglePath` | `() => void` | Prepnuti rezimu cesty |
| `isConnecting` | `boolean` | Aktivni stav propojovani |
| `isPathMode` | `boolean` | Aktivni stav vizualizace |

### Sidebar (`src/components/Sidebar.tsx`)

Levy panel se seznamem routeru, routovaci tabulkou a informacemi o simulaci.

| Prop | Typ |
|------|-----|
| `selectedRouter` | `RouterNodeType \| null` |
| `routingEntries` | `RoutingEntry[]` |
| `changes` | `Change[]` |
| `routers` | `RouterNodeType[]` |
| `protocolName` | `string` |
| `iteration` | `number` |
| `onSelectRouter` | `(routerId: string) => void` |
| `pathSource` / `pathTarget` | `string \| null` |
| `isPathMode` | `boolean` |
| `allRoutingTables` | `Record<string, RoutingEntry[]>` |
| `allChanges` | `Change[]` |

### FloatingBar (`src/components/FloatingBar.tsx`)

Plovouci panel dole se simulacnim ovladanim.

| Prop | Typ |
|------|-----|
| `selectedProtocol` | `string` |
| `onProtocolChange` | `(protocol: string) => void` |
| `onStep` | `() => void` |
| `onRunAll` | `() => void` |
| `onReset` | `() => void` |
| `iteration` | `number` |
| `isConverged` | `boolean` |
| `isSimulationRunning` | `boolean` |
| `protocolSelectComponent` | `React.ReactNode` |

---

## Doplnkove komponenty

### ProtocolSelect (`src/components/ProtocolSelect.tsx`)

Custom dropdown pro vyber protokolu. Interni stav `isOpen`, zavreni pri kliknuti mimo (useEffect).

| Prop | Typ |
|------|-----|
| `value` | `string` |
| `onChange` | `(value: string) => void` |

### RoutingTable (`src/components/RoutingTable.tsx`)

Tabulka routovacich zaznamu. Zvyraznuje zmenene bunky zlutou barvou.

| Prop | Typ |
|------|-----|
| `routerId` | `string` |
| `routerLabel` | `string` |
| `entries` | `RoutingEntry[]` |
| `changes` | `Change[]` |
| `protocolName` | `string` |

Sloupce tabulky: **Cil** (destination), **Next Hop** (nextHop nebo "primo"), **Metrika** (cislo + indikator zmeny).

### MetricDialog (`src/components/MetricDialog.tsx`)

Modalni dialog pro zadani metriky pri propojeni dvou routeru.

| Prop | Typ |
|------|-----|
| `isOpen` | `boolean` |
| `sourceName` | `string` |
| `targetName` | `string` |
| `defaultValue` | `number \| undefined` |
| `onConfirm` | `(metric: number) => void` |
| `onCancel` | `() => void` |

Validace: `metric >= 1`, potvrzeni Enterem, zavreni Escapem.

### RenameDialog (`src/components/RenameDialog.tsx`)

Modalni dialog pro prejmenovani vybraneho routeru (nahrazuje `window.prompt`).

| Prop | Typ |
|------|-----|
| `isOpen` | `boolean` |
| `currentName` | `string` |
| `onConfirm` | `(newName: string) => void` |
| `onCancel` | `() => void` |

Validace: Nazev nesmi byt prazdny, potvrzeni Enterem, zruseni Escapem.

### SettingsPanel (`src/components/SettingsPanel.tsx`)

Panel nastaveni zobrazeny pod hornim settings tlacitkem. Ovlada vizualni a interakcni vlastnosti platna.

| Prop | Typ | Popis |
|------|-----|-------|
| `isOpen` | `boolean` | Zda je panel otevren |
| `onClose` | `() => void` | Zavreni panelu pri kliknuti mimo nebo Escape |
| `background` | `string` | Typ pozadi platna (`'none' \| 'dots' \| 'lines' \| 'cross'`) |
| `onBackgroundChange` | `(bg: string) => void` | Zmena vzoru pozadi |
| `animationSpeed` | `number` | Rychlost simulacnich animaci (rozsah 0.2 az 2.0x) |
| `onAnimationSpeedChange`| `(speed: number) => void` | Zmena rychlosti |
| `snapToGrid` | `boolean` | Prichytavani routeru k mrizce |
| `onSnapToGridChange` | `(snap: boolean) => void` | Prepnuti prichytavani |
| `showMetrics` | `boolean` | Zobrazeni ciselnych metrik na hranach |
| `onShowMetricsChange` | `(show: boolean) => void` | Prepnuti zobrazeni metrik |

### ContextMenu (`src/components/ContextMenu.tsx`)

Kontextove menu pro pravy klik na router uzel (clamped do viewportu).

| Prop | Typ | Popis |
|------|-----|-------|
| `isOpen` | `boolean` | Viditelnost menu |
| `x` / `y` | `number` | Pozice kliku pro umisteni |
| `routerId` | `string` | ID routeru ke kteremu se menu vaze |
| `routerLabel` | `string` | Zobrazovany nazev routeru v hlavicce |
| `onConnect` | `(id: string) => void` | Akce pro zahajeni propojovani |
| `onRename` | `(id: string) => void` | Akce pro otevreni RenameDialogu |
| `onDelete` | `(id: string) => void` | Akce pro smazani routeru a propoju |
| `onClose` | `() => void` | Callback pro zavreni menu (Escape, scroll, click-away) |

### Icons (`src/components/Icons.tsx`)

Kolekce SVG ikon. Vsechny sdili rozhrani `IconProps { size?: number; className?: string }`.
Nektere ikony implementuji high-fidelity mikropohyby pomoci `requestAnimationFrame` pri hover stavu.

| Ikona | Typ | Pouziti / Animace |
|-------|-----|-------------------|
| `RouterIcon` | Static SVG | Logo aplikace v Toolbaru |
| `AnimatedRouterIcon` | Animated | Ikona routeru v `RouterNode` a sidebaru (hover: roztahovaci anteny, blikajici LED, signalove vlny) |
| `PlayIcon` | Static SVG | Tlacitko "Dalsi krok" |
| `FastForwardIcon` | Static SVG | Tlacitko "Vse" (spusteni do konvergence) |
| `ResetIcon` | Static SVG | Tlacitko resetu simulace |
| `PlusIcon` | Static SVG | Pridani |
| `TrashIcon` | Static SVG | Smazani v kontextovem menu |
| `TableIcon` | Static SVG | Nadpis sekce tabulky v sidebaru |
| `SettingsIcon` | Static SVG | Ozubene kolecko v Toolbaru pro nastaveni |
| `PathIcon` | Static SVG | Tlacitko "Cesta", nadpis vizualizace cesty |
| `LinkIcon` | Static SVG | Propojeni v kontextovem menu |
| `CheckIcon` | Static SVG | Znak konvergence, aktivni dropdown polozka |
| `NetworkIcon` | Static SVG | Smerovani / topologie |
| `AnimatedNetworkIcon` | Animated | Polozky routeru v sidebaru (hover: mizejici cary, kulicky rotuji po oblouku, cary se vrati) |
| `InfoIcon` | Static SVG | Informacni ikona |
| `CursorIcon` | Static SVG | Kurzor |
| `EditIcon` | Static SVG | Upravit / tuzka pro metriky a prejmenovani |
| `GripIcon` | Static SVG | Pretahovaci madlo v sidebaru |
| `ExportIcon` | Static SVG | Tlacitko exportu v TopologyDialog |
| `ImportIcon` | Static SVG | Tlacitko importu v TopologyDialog |
| `MapIcon` | Static SVG | Tlacitko "Topologie" v Toolbaru (grid s propojenymi body) |

### TopologyDialog (`src/components/TopologyDialog.tsx`)

Modalni overlay pro spravu topologie — export, import a vyber z predefinovanych topologii. Dialog se zobrazi pres backdrop s rozmazanim pozadi.

| Prop | Typ | Ucel |
|------|-----|------|
| `isOpen` | `boolean` | Viditelnost dialogu |
| `onClose` | `() => void` | Zavreni dialogu |
| `onExport` | `() => void` | Export topologie do JSON |
| `onImport` | `(json: string) => void` | Import topologie z JSON |
| `onLoadPreset` | `(preset: PresetTopology) => void` | Nacteni predefinovane topologie |

**6 predefinovanych topologii:**

| # | Nazev | Popis | Routery | Metriky |
|---|-------|-------|---------|---------|
| 1 | Hvězda | 1 centrální router připojený ke 4 okolním | 5 | 1 |
| 2 | Kruh | 6 routerů v kruhovém zapojení | 6 | 1 |
| 3 | Mesh | 5 routerů plně propojených | 5 | 1–6 |
| 4 | Lineární | 5 routerů v řadě za sebou | 5 | 1–3 |
| 5 | Strom | Hierarchická stromová struktura | 7 | 1–2 |
| 6 | Dual ring | Dva propojené kruhy — redundantní síť | 6 | 1–2 |

**TopologyPreview** — Mini SVG nahled topologie v karte. Normalizuje pozice routeru do `120×80` viewBoxu. Zobrazuje routery jako kruznice (`<circle>`) a linky jako cary (`<line>`).

- **Castice na kartach:** Kazda karta obsahuje animovane castice (`<animateMotion>`) ktere projizdi po linkach. Castice jsou ve vychozim stavu skryte (CSS `opacity: 0`), zobrazi se pri hover nebo vyber karty.

**Animovana paticka** — Po vyberu topologie se slidne dolu paticka (CSS `max-height` transition). Zobrazuje nazev, pocet routeru/linek a tlacitko „Načíst topologii".

**Klavesove zkratky:** Escape zavre dialog.

**Import souboru:** Pouziva `FileReader` pro cteni JSON souboru. Validuje strukturu (musi obsahovat pole `routers` a `links`). Po uspesnem nacteni se zobrazi animovany checkmark overlay a dialog se automaticky zavre po 1,2 s.

### EdgeContextMenu

Kontextove menu pro hrany (pravym klikem na linku). Implementovano primo v `App.tsx` jako interni stav (`edgeContextMenu`), neni samostatna komponenta.

Akce:
- Upravit metriku
- Smazat linku

Menu se zavre pri kliknuti mimo (`onMouseDown` na pozadi) nebo po provedeni akce.
