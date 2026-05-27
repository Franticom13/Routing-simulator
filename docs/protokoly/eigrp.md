# EIGRP — Enhanced Interior Gateway Routing Protocol

Soubor: `src/core/protocols/EIGRP.ts` (448 radku)

EIGRP je hybridni (advanced distance-vector) protokol pouzivajici algoritmus DUAL
(Diffusing Update Algorithm). Kombinuje vlastnosti distance-vector a link-state pristupu.

---

## Klicove pojmy

| Pojem | Zkratka | Vyznam |
|-------|---------|--------|
| Feasible Distance | **FD** | Nejlepsi znama celkova vzdalenost k cili |
| Reported Distance | **RD** | Vzdalenost k cili hlasena sousedem |
| Successor | — | Soused s nejmensi FD (primární cesta) |
| Feasible Successor | **FS** | Zalozni cesta kde `RD < FD` successora |
| Feasibility Condition | **FC** | Podminka: `RD souseda < FD aktualniho successora` |
| Topology Table | — | Tabulka vsech znamych cest od vsech sousedu |

### Vztah FD a RD

```
         cena linky        RD souseda (metrika k cili)
Router A ─────(2)────── Router B ─────────(3)─────── Cil
                         |
              FD = 2 + 3 = 5
              RD = 3 (co hlasi B)
```

**FD** = cena linky k sousedovi + RD souseda

---

## Topologicka tabulka

Na rozdil od RIP (ktery uchovava jen nejlepsi cestu) EIGRP uchovava **vsechny cesty**
od vsech sousedu v topologicke tabulce:

```typescript
interface TopologyEntry {
  neighborId: string;       // soused ktery hlasi cestu
  reportedDistance: number;  // RD — co soused hlasi
  feasibleDistance: number;  // FD = RD + cena linky
  linkMetric: number;        // cena linky k tomuto sousedovi
}

// Struktura: topologyTable[routerId][destinationId] = TopologyEntry[]
let topologyTable: Record<string, Record<string, TopologyEntry[]>> = {};
```

### Priklad topologicke tabulky pro Router A

| Destinace | Pres souseda | RD | FD | Link cost |
|-----------|-------------|----|----|-----------|
| r4 | r2 (Router B) | 2 | 3 | 1 |
| r4 | r3 (Router C) | 1 | 4 | 3 |

Z tabulky vyplýva: Successor pro r4 je **r2** (FD=3), feasible successor je **r3** (RD=1 < FD=3).

---

## Inicializace

Metoda `initialize()`:

1. Prazdna topologicka tabulka pro kazdy router
2. Kazdy router prida zaznam pro sebe (metric 0)
3. **Sousedy router objevi az v prvnim kroku simulace** (ne pri inicializaci)

```typescript
const selfEntry: RoutingEntry = {
  destination: routerId,
  nextHop: routerId,
  metric: 0,
  protocol: 'EIGRP',
};
```

> **Poznamka:** Na rozdil od drive uvadeneho popisu, `initialize()` **neprida** primo
> pripojene sousedy. Ti se objevi az po prvnim volani `step()`.

---

## Krok simulace (step)

Kazdy krok ma dve faze:

### Faze 1: Sber aktualizaci od sousedu

Pro kazdy router:

1. Zjisti sousedy (`getNeighbors`)
2. Pro kazdeho souseda ziskej jeho routovaci tabulku **z puvodniho stavu**
3. **Preskoc FS zaznamy** — sousedum se posilaji jen Successor routes (`role !== 'FS'`)
4. Pro kazdy zaznam v tabulce souseda:
   - `RD = neighborEntry.metric` (co soused hlasi)
   - `FD = RD + linkCost` (pripocitej cenu nasi linky k sousedovi)
   - Aktualizuj nebo pridej do topologicke tabulky pomoci `updateTopologyEntry()`

> **Dulezite:** V realnem EIGRP se sdileji jen successor routes. FS zaznamy jsou
> lokalni zalozni informace a nesdileji se sousedum. Filtrovani zajistuje
> `if (neighborEntry.role === 'FS') continue;`

### Aktualizace topologické tabulky (`updateTopologyEntry`)

Při příjmu aktualizace se topologická tabulka routeru plní a aktualizuje na základě odesílatele (`neighborId`):

```typescript
function updateTopologyEntry(
  routerId: string,
  destId: string,
  neighborId: string,
  reportedDistance: number,
  feasibleDistance: number,
  linkMetric: number
): void
```

* **Vyhledání**: Funkce projde všechny dosavadní záznamy pro danou cílovou destinaci `destId`.
* **Aktualizace**: Pokud již existuje záznam od souseda `neighborId`, aktualizuje se jeho hlášená vzdálenost (`reportedDistance`), vypočtená celková vzdálenost (`feasibleDistance`) a cena propojovací linky (`linkMetric`).
* **Vložení**: Pokud záznam od souseda dosud neexistoval, vytvoří se nový `TopologyEntry` objekt a přidá se do pole možných cest k dané destinaci.

---

### Faze 2: DUAL — vyber successora

Pro kazdy router a kazdou destinaci:

1. Najdi successor — zaznam s **nejmensi FD** (`findSuccessor`)
2. Pokud se successor zmenil (jiny nextHop nebo jina metrika):
   - Aktualizuj routovaci tabulku
   - Generuj zmenu ("added" nebo "updated")

```typescript
function findSuccessor(entries: TopologyEntry[]): TopologyEntry | null {
  let bestEntry = entries[0];
  for (let i = 1; i < entries.length; i++) {
    if (entries[i].feasibleDistance < bestEntry.feasibleDistance) {
      bestEntry = entries[i];
    }
  }
  return bestEntry;
}
```

### Role v routovaci tabulce

Kazdy zaznam v routovaci tabulce ma volitelne pole `role`:

| Role | Vyznam |
|------|--------|
| `'S'` | **Successor** — primarni cesta (nejlepsi FD) |
| `'FS'` | **Feasible Successor** — zalozni cesta splnujici FC |

V DUAL fazi se:
1. Najde successor (zaznam s **nejmensi FD**)
2. Successor dostane `role: 'S'`
3. **Stare FS zaznamy se odeberou** (vsechny s `role === 'FS'` pro danou destinaci)
4. **Nove FS zaznamy se pridaji** s `role: 'FS'`
5. Nove FS (ktere nebyly v predchozich FS) se zaznamenaji jako `Change` typu `'added'`

Toto zajistuje, ze konvergence pocka na stabilizaci FS zaznamu.

---

## Feasible Successors (zalozni cesty)

Funkce `findFeasibleSuccessors()` najde zalozni cesty splnujici feasibility condition:

```typescript
export function findFeasibleSuccessors(
  entries: TopologyEntry[],
  currentFD: number
): TopologyEntry[] {
  // Feasibility condition: RD souseda < FD successora
  for (const entry of entries) {
    if (entry.reportedDistance < currentFD) {
      feasibleSuccessors.push(entry);
    }
  }
}
```

**Proc?** Pokud successor selze, EIGRP muze okamzite prepnout na feasible successor
bez nutnosti prepocitavat celou topologii.

**V nasi simulaci:** FS se aktivne pocitaji a zobrazuji v routovaci tabulce s roli `FS`.
Radky s FS maji v UI snizenou opacitu (0.55) a sedou znacku misto zelene.
Nove FS zaznamy se trackuji jako changes (typ `'added'`), coz zaruci spravnou
detekci konvergence.

---

## Priklad na vychozi topologii

```
    Router A -----(1)----- Router B
       |                     |  \
      (3)                   (1)  (2)
       |                     |    \
    Router C -----(1)----- Router D
```

### Po inicializaci

| Router | Zna | Topologicka tabulka |
|--------|-----|---------------------|
| A | r1(0), r2(1), r3(3) | r2: via r2 FD=1; r3: via r3 FD=3 |
| B | r2(0), r1(1), r3(1), r4(2) | r1: via r1 FD=1; r3: via r3 FD=1; r4: via r4 FD=2 |

### Iterace 1

- **A** od B dostane: r4(metric=2) → `RD=2, FD=2+1=3` → prida r4 via r2 s FD=3
- **A** od C dostane: r4(metric=1) → `RD=1, FD=1+3=4` → prida cestu pres C s FD=4
- Successor pro r4 z A: via **r2** (FD=3 < FD=4)
- **A** od C dostane: r2(metric=1) → `RD=1, FD=1+3=4` → uz ma r2 s FD=1, neaktualizuje

### Iterace 2

- **D** od B dostane: r1(metric=1) → `RD=1, FD=1+2=3` → prida r1 via r2
- **D** od C dostane: r1(metric=3) → `RD=3, FD=3+1=4` → prida cestu, ale FD=4 > 3

### Iterace 3

Zadne zmeny → **konvergence**.

---

## Konvergence

Stejna strategie jako RIP — provede simulovany krok a zkontroluje zmeny.
**Navic se uklada a obnovuje `topologyTable`**, aby testovaci krok neznecistil
globalni stav:

```typescript
isConverged: function(state) {
  // Ulozit topology table pred testem
  const saved = JSON.parse(JSON.stringify(topologyTable));
  const testStep = EIGRPProtocol.step(state);
  // Obnovit stav
  iterationCounter = iterationCounter - 1;
  topologyTable = saved;
  return testStep.changes.length === 0;
}
```

> **Proc save/restore?** `step()` modifikuje globalni `topologyTable` (modul-level promenna).
> Bez obnoveni by testovaci krok "spotreboval" data urcena pro skutecny dalsi krok,
> coz zpusobovalo spatny pocet iteraci a chybejici FS zaznamy.

---

## Rozdily oproti skutecnemu EIGRP

| Skutecny EIGRP | Nasa implementace |
|----------------|-------------------|
| K-values (bandwidth, delay, reliability, load) | Jednoducha cena linky |
| Hello/holddown timery | Okamzite aktualizace |
| Active/Passive stav pro kazdou cestu | Zjednoduseny DUAL |
| Diffusing computation (query/reply) | Jednoduchy flooding tabulek |
| Stuck-in-active (SIA) timeout | Bez timeoutu |
| Unequal-cost load balancing | Pouze jedna nejlepsi cesta |
| FS jako ticha zalozni informace | FS se aktivne pocitaji a zobrazuji s roli FS |
| Sdileni jen successor routes | Implementovano — FS se filtruju pri cteni sousedovych tabulek |
