# OSPF — Open Shortest Path First

Soubor: `src/core/protocols/OSPF.ts` (486 radku)

OSPF je link-state protokol. Kazdy router zna celou topologii site (LSDB)
a pouziva Dijkstruv algoritmus pro vypocet nejkratsich cest.

---

## Zakladni principy

- **Typ:** Link-state protokol
- **Metrika:** Cost (cena linky) — pouziva `NetworkLink.metric` primo
- **Algoritmus:** Dijkstra (SPF — Shortest Path First)
- **LSDB:** Link State Database — kazdy router uchovava znalost o vsech linkach v siti
- **LSA:** Link State Advertisement — zprava pomoci ktere routery sdili informace o linkach

---

## Tri faze simulace

Na rozdil od RIP a EIGRP, OSPF simulace probiha ve trech explicitnich fazich:

### Faze 1: Neighbor Discovery (objeveni sousedu)

```typescript
phase = "neighbor-discovery"
```

Kazdy router objevi sve primo pripojene sousedy:

1. Pro kazdy router zjisti sousedy (`getNeighbors`)
2. Prida primo pripojene linky do LSDB (`lsdb[routerId].push(linkId)`)
3. Prida routovaci zaznamy pro sousedy s metrikou = cena linky
4. Prepne fazi na `"lsa-flooding"`

**Zmeny:** Pridani primo pripojenych sousedu do routovacich tabulek.

### Faze 2: LSA Flooding (sireni LSA)

```typescript
phase = "lsa-flooding"
```

Routery si vymeni informace o linkach:

1. Vytvori snimek LSDB pred floodingem (`lsdbSnapshot`)
2. Kazdy router posle svou LSDB vsem sousedum
3. Soused prida nove linky do sve LSDB
4. Opakuje se dokud se LSDB nemeni
5. Kdyz se LSDB uz nezmenila, prepne na `"dijkstra"`

**Proc snimek?** Bez snimku by router mohl preposilat linky, ktere prave dostal
v tomto kole. Snimek zajistuje, ze vsechny routery posilaji soucasne (stejne jako u RIP).

**Zmeny:** Zadne zmeny v routovacich tabulkach — menila se jen LSDB.

### Faze 3: Dijkstra (vypocet nejkratsich cest)

```typescript
phase = "dijkstra"
```

Kazdy router spusti Dijkstruv algoritmus na svou LSDB:

1. Pro kazdy router zavola `runDijkstraForRouter(routerId, state)`
2. Dijkstra spocita nejkratsi vzdalenosti ke vsem ostatnim routerum
3. Z vysledku se vytvori routovaci zaznamy
4. Porovnaji se s existujicimi zaznamy → generuji se zmeny

---

## Dijkstruv algoritmus — implementace

Funkce `runDijkstraForRouter()` implementuje klasicky Dijkstruv algoritmus:

```
vstup: routerId (pro ktery pocitame), state (sitovy stav)

1. distances[vsechny] = Infinity, distances[routerId] = 0
2. previous[vsechny] = null
3. unvisited = [vsechny routery]

4. while (unvisited neni prazdny):
   a. current = router s nejmensi vzdalenosti v unvisited
   b. pokud distances[current] == Infinity → konec
   c. odeber current z unvisited
   d. pro kazdeho souseda current:
      - pokud linka neni v nasi LSDB → preskoc
      - alt = distances[current] + neighbor.metric
      - pokud alt < distances[souseda]:
        - distances[souseda] = alt
        - previous[souseda] = current

5. pro kazdy cilovy router:
   - najdi nextHop pomoci findNextHop(source, dest, previous)
   - vytvor RoutingEntry s metrikou distances[dest]
```

### findNextHop — jak najit dalsi skok

Funkce `findNextHop` je klíčová pro transformaci absolutní cesty z Dijkstrova algoritmu na záznam v tabulce. Dijkstrův algoritmus nám dává mapu předchůdců `previous: Record<string, string | null>`. Záznam v routovací tabulce však vyžaduje pouze bezprostřední další krok (`nextHop`).

```typescript
function findNextHop(
  source: string,
  destination: string,
  previous: Record<string, string | null>
): string | null
```

**Princip vyhledávání:**
1. Začne v cílovém uzlu `destination`.
2. Sleduje předchůdce pozpátku: `current = previous[current]`.
3. Pokračuje v cyklu, dokud předchůdce aktuálního uzlu není přímo `source` (nebo `null` v případě neexistující cesty).
4. Pokud je předchůdce uzlu `current` roven `source`, vrátí `current` jako `nextHop`.

**Příklad:**
Mějme cestu z `A` do `D` jako `A → B → C → D`.
Předchůdci jsou: `previous = { D: 'C', C: 'B', B: 'A', A: null }`.
`findNextHop('A', 'D', previous)` provádí:
* `current = D`. Předchůdce `previous[D]` je `C` (není `A`).
* `current = C`. Předchůdce `previous[C]` je `B` (není `A`).
* `current = B`. Předchůdce `previous[B]` je `A` (rovná se `source`).
* Konec cyklu, vrátí se `B`.

### findMinDistanceNode — výběr uzlu s minimální vzdáleností

Tato funkce slouží v hlavní smyčce Dijkstrova algoritmu k nalezení dalšího uzlu k vyhodnocení.

```typescript
function findMinDistanceNode(
  unvisited: string[],
  distances: Record<string, number>
): string | null
```

* **Princip**: Prochází pole `unvisited` (dosud nenavštívené uzly) a porovnává hodnoty v mapě `distances`. Vrátí ten uzel, který má nejmenší vypočtenou vzdálenost od zdroje.
* **Časová složitost**: O(V) v každém kroku, kde V je počet routerů. Vzhledem k malému počtu routerů v simulacích je lineární prohledávání efektivnější a jednodušší než použití prioritní fronty (např. binární haldy).
* **Mezní stav**: Pokud mají všechny zbývající nenavštívené uzly vzdálenost `Infinity`, vrátí se `null` (zbývající uzly jsou v jiné izolované podsíti a nelze se k nim dostat). Hlavní smyčka Dijkstry se v tomto bodě ukončí.

---

## LSDB — Link State Database

LSDB je ulozena jako modulovy stav:

```typescript
let lsdb: Record<string, string[]> = {};
// klic = routerId, hodnota = pole linkId ktere router zna
```

Kazdy router zacina s prazdnou LSDB. Behem neighbor discovery prida primo pripojene linky.
Behem LSA flooding sousede sdili sve linky — po dokonceni flooding maji vsechny routery
kompletni LSDB (znaji vsechny linky v siti).

**Dulezite:** Dijkstra pri hledani sousedu kontroluje, zda je linka v LSDB daneho routeru:

```typescript
if (lsdb[routerId].indexOf(neighbor.linkId) === -1) {
  continue;  // linku nezname, preskocime
}
```

---

## Priklad na vychozi topologii

```
    Router A -----(1)----- Router B
       |                     |  \
      (3)                   (1)  (2)
       |                     |    \
    Router C -----(1)----- Router D
```

### Iterace 1 (Neighbor Discovery)

Kazdy router objevi sousedy a prida je do tabulky:

| Router | Prida do tabulky |
|--------|-----------------|
| A | r2(cost=1), r3(cost=3) |
| B | r1(cost=1), r3(cost=1), r4(cost=2) |
| C | r1(cost=3), r2(cost=1), r4(cost=1) |
| D | r2(cost=2), r3(cost=1) |

### Iterace 2 (LSA Flooding)

Routery sdili LSDB. Po flooding vsechny routery znaji vsech 5 linek.

### Iterace 3 (Dijkstra)

Kazdy router spusti Dijkstru. Napriklad pro Router A:

- r1→r2: cost 1 (primo)
- r1→r3: cost 2 (pres B: 1+1) — lepsi nez primo (3)!
- r1→r4: cost 3 (pres B: 1+2 nebo pres B→C→D: 1+1+1)

**Zmena:** A aktualizuje zaznam pro r3 — metrika z 3 na 2, nextHop zmenen na r2.

### Iterace 4

Zadne zmeny → **konvergence**.

---

## Konvergence

OSPF neni konvergovany dokud:

1. Faze neni `"dijkstra"` (discovery a flooding jeste probihaji)
2. Dalsi Dijkstra by vygenerovala zmeny

```typescript
isConverged: function(state) {
  if (phase !== "dijkstra") return false;
  const testStep = performDijkstraTest(state);
  return testStep.length === 0;
}
```

`performDijkstraTest` je kopie Dijkstry ktera nemenni stav — jen zjisti zmeny.

---

## Rozdily oproti skutecnemu OSPF

| Skutecny OSPF | Nasa implementace |
|---------------|-------------------|
| Pouziva oblasti (Area 0, stub, NSSA) | Jedina plocha sit |
| LSA typy (Type 1–7) | Jednoduchy seznam linkId |
| Hello pakety pro sousedstvi | Okamzite objeveni sousedu |
| SPF timer, hold-down | Okamzity vypocet |
| DR/BDR volba na segmentu | Zadna — point-to-point linky |
