# Toolbar a FloatingBar

Aplikace ma dva ovladaci panely — **Toolbar** nahore (nazev aplikace + sprava topologie + nastaveni)
a **FloatingBar** dole (simulacni ovladani). Editacni nastroje (pridat router, propojit) byly
presunuty do sidebaru (drag) a kontextoveho menu (pravy klik).

---

## Toolbar (horni lista)

Soubor: `src/components/Toolbar.tsx`

### Rozlozeni

```
┌──────────────────────────────────────────────────────────┐
│ 🖧 Routing Simulator              [Topologie] [Nastavení]│
└──────────────────────────────────────────────────────────┘
```

- **Levy blok:** Logo (RouterIcon) + nazev aplikace (`.toolbar-title`), `margin-right: auto` (odtlaci zbytek doprava)
- **Pravy blok:** Tlacitka Topologie a Nastavení

### Props

```typescript
interface ToolbarProps {
  onToggleSettings: () => void;   // prepnuti Settings panelu
  isSettingsOpen: boolean;        // zda je Settings panel otevren
  onOpenTopology: () => void;     // otevreni TopologyDialog
}
```

### Tlacitka

| Tlacitko | Ikona | Akce | Aktivni stav |
|----------|-------|------|--------------|
| Topologie | MapIcon | Otvira `TopologyDialog` (export/import/presety) | — |
| Nastavení | SettingsIcon | Prepina Settings panel | `btn-primary` kdyz `isSettingsOpen` |

Tlacitko **Topologie** otvira modalni `TopologyDialog` prostrednictvim stavu `isTopologyOpen`
v `App.tsx`. Je to **oddeleny dialog** od Settings panelu — obe tlacitka fungují nezavisle.

---

## FloatingBar (plovouci bar)

Soubor: `src/components/FloatingBar.tsx`

### Rozlozeni

```
                ┌─────────────────────────────────────────────────┐
                │ [RIP ▼] │ ↻ [▶ Dalsi krok] [⏩ Vse] │ Iterace 3│
                └─────────────────────────────────────────────────┘
```

Bar je horizontalne centrovan dole na platne, absolutne pozicovany.

### Props

```typescript
interface FloatingBarProps {
  selectedProtocol: string;               // aktualni protokol
  onStep: () => void;                     // dalsi krok simulace
  onRunAll: () => void;                   // spustit vse do konvergence
  onReset: () => void;                    // reset simulace
  iteration: number;                      // cislo iterace
  isConverged: boolean;                   // zda simulace konvergovala
  isSimulationRunning: boolean;           // zda bezi automaticky rezim
  ospfPhase: string;                      // OSPF simulacni faze
  protocolSelectComponent: React.ReactNode;  // ProtocolSelect jako child
}
```

### Prvky zleva doprava

1. **ProtocolSelect** — custom dropdown (viz nize)
2. **Oddelovac** (`.floating-bar-divider`)
3. **Reset** — ghost tlacitko, ResetIcon, vola `onReset`
4. **Dalsi krok** — primary tlacitko, PlayIcon, vola `onStep`, disabled pri konvergenci
5. **Vse** — secondary tlacitko, FastForwardIcon, vola `onRunAll`, disabled pri konvergenci
6. **Oddelovac**
7. **Badge iterace** — zobrazuje stav simulace

### Badge iterace

Dynamicky text a styl podle stavu. Pokud je zvolen protokol OSPF a je aktivní některá fáze, text odráží aktuální fázi simulace:

| Stav | Text | Trida badge |
|------|------|-------------|
| Pred simulaci | "Připraveno" | `badge-neutral` |
| Probiha (RIP/EIGRP) | "Iterace N" | `badge-warning` |
| Probiha (OSPF Fáze 1) | "Fáze 1: Objevení" | `badge-warning` |
| Probiha (OSPF Fáze 2) | "Fáze 2: Flooding" | `badge-warning` |
| Probiha (OSPF Fáze 3) | "Fáze 3: Dijkstra" | `badge-warning` |
| Konvergovala | "Fáze 3: Dijkstra" / "Iterace N" + CheckIcon | `badge-success` |

### Animace vstupu

FloatingBar pouziva vlastni keyframe animaci:

```css
@keyframes floatingBarIn {
  from { opacity: 0; transform: translateX(-50%) translateY(12px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}
```

---

## ProtocolSelect — custom dropdown

Soubor: `src/components/ProtocolSelect.tsx`

Vlastni dropdown komponenta (ne nativni `<select>`), ktera umoznuje vybrat
routovaci protokol z moznosti RIP, OSPF, EIGRP.

### Jak funguje

1. Kliknutim na trigger tlacitko se prepne stav `isOpen`
2. Menu se zobrazi s animaci `scaleIn` (0.95 → 1.0)
3. Kazda polozka ma hover stav; aktivni polozka ma teal pozadi + CheckIcon
4. Vyber polozky zavola `onChange(protocol)` a zavre menu
5. Kliknuti mimo nebo Escape zavre menu

### Zavreni pri kliknuti mimo

```typescript
useEffect(function handleClickOutside() {
  function onDocumentClick(event: MouseEvent) {
    if (!dropdownRef.current) return;
    if (!dropdownRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  }
  document.addEventListener('mousedown', onDocumentClick);
  return function cleanup() {
    document.removeEventListener('mousedown', onDocumentClick);
  };
}, []);
```

### ChevronDownIcon

Mala sipka vedle nazvu protokolu. Otaci se o 180° kdyz je menu otevrene:

```typescript
style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
```

### CSS tridy

- `.dropdown` — relativne pozicovany kontejner
- `.dropdown-menu` — absolutne pozicovane pod trigger, `min-width: 180px`
- `.dropdown-item` — polozka s hover efektem
- `.dropdown-item.active` — teal pozadi, tucne
