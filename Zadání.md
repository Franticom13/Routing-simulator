# 3 Simulace a demonstrace routovacích protokolů

**Zadavatel:** Petr Dušek

---

## Cíl projektu

Vytvořit webovou aplikaci, která umožní uživateli v grafickém prostředí simulovat routovací protokoly.

---

## Požadavky

### Funkční požadavky

- **Grafický editor sítě** — uživatel vytvoří routery a propoje mezi nimi v GUI
- **Simulace protokolu** — na tlačítko se vypočítají jednotlivé iterace routovacího protokolu
- **Zobrazení routovací tabulky** — pro každý router se zobrazí jeho aktuální routovací tabulka
- **Vizuální zvýraznění změn** — při každé iteraci se graficky zobrazí, kde došlo ke změně
- **Rozšiřitelnost** — architektura musí umožňovat přidání dalších protokolů v budoucnu

### Bonus

- Zobrazení dvou bodů v síti a vykreslení cesty dat mezi nimi na plánu sítě

---

## Routovací protokoly

### Primární (nutné implementovat)

| Protokol | Typ | Popis |
|----------|-----|-------|
| **RIP** (Routing Information Protocol) | Distance-vector | Jednoduchý protokol, přehledné iterace — ideální pro vizualizaci |
| **OSPF** (Open Shortest Path First) | Link-state | Využívá Dijkstrův algoritmus, reálně nasazovaný v sítích |
| **EIGRP** (Enhanced Interior Gateway Routing Protocol) | Hybrid | Kombinuje výhody distance-vector a link-state přístupu |

### Bonus (bylo by cool)

| Protokol | Typ | Popis |
|----------|-----|-------|
| **Bellman-Ford** | Distance-vector | Základ RIPu, hezky vizualizovatelný krok po kroku |
| **IS-IS** | Link-state | Podobný OSPFu, používaný u větších poskytovatelů |
| **BGP** (Border Gateway Protocol) | Path-vector | Protokol internetu — složitý, ale zajímavý jako ukázka |

---

## Pozice v týmu

| Role | Odpovědnost |
|------|-------------|
| **PROG** | Naprogramování grafického editoru síťové topologie |
| **PROG** | Výpočet protokolu, vnitřní logika aplikace |
| **SITE** | Popis funkčnosti protokolů; vysvětlení PROGrámátorům, jak se počítají routovací tabulky |
| **GRAF** | Návrh a tvorba UI aplikace |