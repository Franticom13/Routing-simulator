# Prehled routovacich protokolu

Aplikace implementuje tri routovaci protokoly. Kazdy pouziva jiny algoritmus,
jinou metriku a ma jine chovani pri konvergenci.

---

## Srovnavaci tabulka

| Vlastnost | RIP | OSPF | EIGRP |
|-----------|-----|------|-------|
| **Typ algoritmu** | Distance-vector | Link-state | Hybridni (advanced distance-vector) |
| **Algoritmus** | Bellman-Ford | Dijkstra | DUAL (Diffusing Update Algorithm) |
| **Metrika** | Hop count (pocet skoku) | Cost (cena linky) | Kompozitni (cena linky + RD) |
| **Max hopu** | 15 (16 = nedosazitelny) | Bez limitu | Bez limitu |
| **Znalost topologie** | Jen sousede | Cela sit (LSDB) | Sousede + topologicka tabulka |
| **Pocet fazi simulace** | 1 (vzdy stejna) | 3 (discovery → flooding → Dijkstra) | 2 (sber aktualizaci → DUAL) |
| **Pocatecni tabulka** | Jen sebe (metric 0) | Jen sebe (metric 0) | Jen sebe (metric 0) |
| **Role v tabulce** | — | — | S (successor) / FS (feasible successor) |
| **Konvergence (demo)** | ~3 iterace | ~3 iterace (1 na fazi) | ~3–4 iterace |
| **Implementace** | `RIP.ts` (247 radku) | `OSPF.ts` (483 radku) | `EIGRP.ts` (448 radku) |

---

## Jak se lisi metriky

### RIP — hop count

RIP pocita pouze pocet skoku (routeru) mezi zdrojem a cilem.
**Ignoruje** cenu linky z `NetworkLink.metric` — kazdy skok = +1.

```
Router A → Router B → Router D
  hop 1       hop 2
  metric: 2
```

### OSPF — cost (cena linky)

OSPF pouziva `NetworkLink.metric` jako cenu kazde linky.
Celkova metrika = soucet cen vsech linek na ceste.

```
Router A → Router B → Router D
  cost 1      cost 2
  metric: 3
```

### EIGRP — feasible distance

EIGRP pocita FD (Feasible Distance) = RD (Reported Distance od souseda) + cena linky k sousedovi.
Vysledna metrika reflektuje celkovou cenu cesty vcetne lokalni linky.

```
Router A → Router B → Router D
  link 1      RD=2 od B
  FD = 1 + 2 = 3
```

---

## Kdy ktery protokol pouzit

| Scenar | Doporuceny protokol | Duvod |
|--------|--------------------|----|
| Jednoducha sit, pochopeni zakladu | **RIP** | Nejjednodussi algoritmus, snadno sledovatelny |
| Sit s ruznymi cenami linek | **OSPF** | Bere v uvahu skutecne ceny, najde optimalni cestu |
| Sit kde je dulezita rychla konvergence | **EIGRP** | Neni nutne zaplavet celou sit, staci aktualizace od sousedu |
| Vyuka distance-vector vs link-state | **RIP + OSPF** | Porovnani dvou fundamentalne odlisnych pristupu |

---

## Spolecne rysy implementace

Vsechny tri protokoly sdili:

1. **Inicializaci** — kazdy vytvori zaznam pro sebe (metric 0)
2. **Funkci `tracePath()`** — sleduje nextHop od zdroje k cili (stejna logika)
3. **Detekci konvergence** — `isConverged()` provede testovaci krok a zkontroluje zmeny
4. **Klonovani stavu** — pouzivaji `cloneNetworkState()` pred kazdym krokem (vcetne pole `role`)
5. **Cteni stareho stavu** — pri vymene tabulek ctou tabulky z puvodniho stavu, ne z klonu
6. **EIGRP specifika** — `isConverged()` navic uklada/obnovuje `topologyTable` pred testovacim krokem

---

## Vychozi topologie pro demonstraci

Aplikace startuje s topologii 7 routeru (definovana v `App.tsx`):

```
    Router A -----1----- Router B -----3----- Router C
       |                  |                    |
      (2)                (1)                  (2)
       |                  |                    |
    Router D -----4----- Router E -----1----- Router F
                          |
                         (3)
                          |
                        Router G
```

- 7 routeru: A–G (r1–r7)
- Ruzne metriky na linkach (1–4)

Tato topologie je idealni pro demonstraci, protoze:

- RIP najde nejkratsi cestu podle hopu (ignoruje metriky)
- OSPF najde optimalni cestu podle souctu cen linek
- EIGRP vyhodnoti FD a zobrazi Successor + Feasible Successor cesty
