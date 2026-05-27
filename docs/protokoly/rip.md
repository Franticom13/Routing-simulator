# RIP — Routing Information Protocol

Soubor: `src/core/protocols/RIP.ts` (258 radku)

RIP je distance-vector protokol pouzivajici Bellman-Forduv algoritmus.
Je nejjednodussi ze tri implementovanych protokolu.

---

## Zakladni principy

- **Metrika:** hop count (pocet skoku) — kazdy skok = +1
- **Maximum:** 15 hopu, 16 = nedosazitelny (`RIP_MAX_METRIC = 16`)
- **Algoritmus:** Kazdy router sdili svou routovaci tabulku se sousedy
- **Aktualizace:** Soused prida 1 k metrice a pokud je cesta lepsi, aktualizuje svou tabulku

---

## Inicializace

Metoda `initialize()` vytvori pocatecni stav, ve kterem kazdy router zna pouze sam sebe:

1. **Sebe sama** — kazdy router prida zaznam pro svou vlastni adresu s metrikou 0.
2. **Sousedy** router pri inicializaci **nezná**. Objevi je az v prvnim kroku simulace, kdy obdrzi routovaci tabulky svych primych sousedu (ti v nich inzeruji sami sebe s metrikou 0, k cemuz prijimajici router pripocte 1 skok).

```typescript
// Priklad tabulky po inicializaci (r1):
routingTables["r1"] = [
  { destination: "r1", nextHop: "r1", metric: 0, protocol: "RIP" }
]
```

**Dulezite:** RIP ignoruje `NetworkLink.metric` — pouziva vzdy hop count 1 na skok.

---

## Krok simulace (step)

Algoritmus jednoho kroku:

1. **Klonuj stav** — `cloneNetworkState(state)` pro immutabilitu
2. **Pro kazdy router:**
   a. Zjisti sousedy (`getNeighbors`)
   b. Pro kazdeho souseda ziskej jeho tabulku **z puvodniho stavu** (ne z klonu!)
   c. Pro kazdy zaznam v tabulce souseda:
      - Spocitej novou metriku: `neighborEntry.metric + 1`
      - Pokud `newMetric >= 16` → preskoc (nedosazitelny)
      - Pokud zaznam pro tuto destinaci neexistuje → **pridej** (change "added")
      - Pokud existuje a nova metrika je mensi → **aktualizuj** (change "updated")

**Proc cteme stary stav?** Vsechny routery posilaji svou tabulku soucasne.
Pokud bychom cetli z noveho stavu, routery by mohly videt zmeny z aktualniho kola,
coz by narusilo spravnost Bellman-Fordova algoritmu.

---

## Priklad krok po kroku

Vychozi topologie:

```
    Router A -----(1)----- Router B
       |                     |  \
      (3)                   (1)  (2)
       |                     |    \
    Router C -----(1)----- Router D
```

### Po inicializaci (pred krokem 1)

| Router | Zna destinace |
|--------|--------------|
| A (r1) | r1(0), r2(1), r3(1) |
| B (r2) | r2(0), r1(1), r3(1), r4(1) |
| C (r3) | r3(0), r1(1), r2(1), r4(1) |
| D (r4) | r4(0), r2(1), r3(1) |

### Iterace 1

Kazdy router posle svou tabulku sousedum:

- **Router A** od souseda B dostane: r4 s metrikou 1+1=2 → **prida** r4(metric=2, via r2)
- **Router A** od souseda C dostane: r4 s metrikou 1+1=2 → uz ma r4(2), stejna metrika
- **Router B** od souseda A dostane: r3 s metrikou 1+1=2 → uz ma r3(1), neaktualizuje
- **Router D** od souseda B dostane: r1 s metrikou 1+1=2 → **prida** r1(metric=2, via r2)
- **Router D** od souseda C dostane: r1 s metrikou 1+1=2 → uz ma r1(2), stejna metrika

**Zmeny:** Router A pridal r4, Router D pridal r1 (a dalsi)

### Iterace 2

Vsechny routery znaji vsechny destinace. Routery overuji jestli existuje lepsi cesta.

**Zmeny:** Zadne lepsi cesty nejsou nalezeny.

### Iterace 3

Zadne zmeny → **konvergence**.

---

## Detekce konvergence

Metoda `isConverged()` provede simulovany krok a zkontroluje jestli vygeneroval zmeny:

```typescript
isConverged: function(state) {
  const testStep = RIPProtocol.step(state);
  iterationCounter = iterationCounter - 1;  // vrat counter zpet
  return testStep.changes.length === 0;
}
```

Vraci counter zpet, protoze jsme jen testovali, ne skutecne krokvali.

---

## Hledani cesty (tracePath)

Funkce `tracePath()` sleduje `nextHop` zaznamy od zdroje k cili:

1. Pridej `source` do cesty
2. Najdi v tabulce `source` zaznam pro `target` → zjisti `nextHop`
3. Pridej `nextHop` do cesty
4. Pokud `nextHop === target` → hotovo
5. Jinak pokracuj z `nextHop`
6. Ochrana: max `routers.length` kroku, detekce smycky

---

## Omezeni

- **Pomalá konvergence** u vetsich siti (O(n) iteraci kde n = pocet routeru)
- **Limit 15 hopu** — velke site nejsou podporovany
- **Count-to-infinity problem** — v teto implementaci neni osetreny (neni split horizon, poison reverse)
- **Ignoruje cenu linky** — vsechny linky maji cenu 1 hop
