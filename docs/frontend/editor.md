# Graficky editor site

Editor je jadrem uzivatelske interakce. Umoznuje vytvaret routery, propojovat je, pretahovat a priblizovat.
Postaven na knihovne **React Flow** (`@xyflow/react`).

---

## Canvas.tsx — React Flow wrapper

Soubor `src/components/Editor/Canvas.tsx` obaluje komponentu `<ReactFlow>` a registruje custom typy.

### Registrace custom typu

```typescript
const nodeTypes = { router: RouterNodeMemo };
const edgeTypes = { network: NetworkEdge };
```

React Flow pri vytvoreni uzlu/hrany hleda odpovidajici typ v techto objektech.
Kdyz `App.tsx` vytvori node s `type: 'router'`, React Flow pouzije `RouterNodeMemo`.

### Vlastnosti platna

| Vlastnost | Hodnota | Ucel |
|-----------|---------|------|
| `fitView` | `true` | Pri nacteni se platno prizpusobi obsahu |
| `snapToGrid` | `true` | Routery se prichytavaji k mrizce |
| `snapGrid` | `[20, 20]` | Krok mrizky 20px |
| `BackgroundVariant.Dots` | — | Teckovy vzor na pozadi |
| `Background.gap` | `20` | Rozestup tecek |
| `Background.color` | `#D6D3D1` | Barva tecek (warm gray) |

### Ovladaci prvky

- **Controls** — zoom +/- tlacitka (vestavene v React Flow), `showInteractive=false`
- **MiniMap** — miniaturni nahled topologie v rohu, barvy dle theme

### Props

```typescript
interface CanvasProps {
  nodes: Node[];            // vsechny uzly
  edges: Edge[];            // vsechny hrany
  onNodesChange;            // callback pro zmeny uzlu (presun, smazani)
  onEdgesChange;            // callback pro zmeny hran
  onConnect: OnConnect;     // callback pri propojeni dvou routeru
  onNodeClick;              // kliknuti na router
  onPaneClick;              // kliknuti na prazdne platno (zrusi vyber)
  onNodeDragStop;           // dokonceni pretazeni routeru
}
```

---

## RouterNode.tsx — custom node

Kazdy router na platne je renderovan komponentou `RouterNodeComponent` (exportovana jako `RouterNodeMemo` pres `React.memo`).

### Vizualni stavy

| Stav | CSS trida | Vzhled |
|------|-----------|--------|
| Vychozi | `.router-node` | Bily pozadi, sedy border |
| Vybrany | `.router-node.selected` | Teal border, svetle teal pozadi |
| Zmeneny | `.router-node.changed` | Oranzovy border, zlute pozadi |
| Na ceste | `.path-node-highlight` | Teal glow (box-shadow) |

### Handles (pripojovaci body)

Router ma dva Handle elementy — `source` a `target` — oba umistene ve stredu nodu s `opacity: 0`.
Jsou neviditelne, protoze skutecny bod pripojeni se pocita dynamicky v `NetworkEdge` (floating edges).

```tsx
<Handle type="source" position={Position.Top} id="source"
  style={{ opacity: 0, top: '50%', left: '50%' }} />
<Handle type="target" position={Position.Top} id="target"
  style={{ opacity: 0, top: '50%', left: '50%' }} />
```

### Data

```typescript
interface RouterNodeData {
  label: string;              // nazev routeru (napr. "Router A")
  isSelected?: boolean;       // vybrany v sidebaru
  isChanged?: boolean;        // zmeneny v aktualnim kroku
  isPathHighlighted?: boolean;// soucasti zvyraznene cesty
}
```

---

## NetworkEdge.tsx — floating edges

Nejslozitejsi vizualni komponenta. Propojuje dva routery primkou, kde body pripojeni
se **dynamicky pocitaji** jako prusecik primky (stred-stred) s obrysem obdelniku nodu.

### Proc floating edges?

Standardni React Flow edges se pripojuji k fixnim bodum (handles).
To vede k neprirozene zakrivenim linkam. Floating edges pocitaji bod pripojeni
na hrane obdelniku routeru — propoj vzdy miri "od stredu ke stredu".

### Matematika — getNodeIntersection()

Funkce `getNodeIntersection(node, targetPoint)` pocita prusecik takto:

1. Zjisti stred nodu: `cx = posX + width/2`, `cy = posY + height/2`
2. Spocita smer k cilovemu bodu: `dx = targetX - cx`, `dy = targetY - cy`
3. Porovna sklon (`slope = |dy/dx|`) s pomerem stran (`aspectRatio = h/w`)
4. Pokud `slope <= aspectRatio` → prusecik je na leve/prave strane obdelniku
5. Pokud `slope > aspectRatio` → prusecik je na horni/spodni strane
6. Vysledny bod: `(cx + ix, cy + iy)`

```
          ┌──────────────┐
          │              │
          │    stred     │ ← prusecik se pocita na okraji
          │      ●───────┼────────→ cilovy stred
          │              │
          └──────────────┘
```

### Vizualni stavy hrany

| Stav | Barva | Sirka | Dalsí |
|------|-------|-------|-------|
| Vychozi | `var(--border-strong)` | 2px | — |
| Vybrany | `var(--primary)` | 3px | — |
| Na ceste | `var(--primary)` | 3px | trida `edge-active` |
| Zmeneny | `var(--warning)` | 3px | carkovaný `6 3`, trida `edge-changed` |

### Label s metrikou

Na strednim bodu hrany se zobrazuje label s hodnotou metriky.
Pouziva `EdgeLabelRenderer` z React Flow a je stylovan tridou `.edge-label` — maly obdelnik
s monospace fontem, borderem a stinem.

```tsx
<EdgeLabelRenderer>
  <div className="edge-label"
    style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}>
    {metricLabel}
  </div>
</EdgeLabelRenderer>
```

---

## Interakce

| Akce | Chovani |
|------|---------|
| Pretazeni routeru | Pozice se automaticky aktualizuje, edges se prepocitaji |
| Zoom koleckem | React Flow vestaveny, Controls zobrazuji +/- |
| Pan pretazenim pozadi | React Flow vestaveny |
| Kliknuti na router | `onNodeClick` → vyber v sidebaru / vyber bodu cesty |
| Kliknuti na pozadi | `onPaneClick` → zruseni vyberu |
| Propojeni dvou routeru | `onConnect` → otevre MetricDialog pro zadani metriky |
