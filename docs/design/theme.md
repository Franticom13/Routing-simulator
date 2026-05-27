# Design system

Kompletni specifikace vizualniho stylu aplikace. Detailni theme je definovan v
`theme.md` v korenove slozce projektu. Design system je implementovan v `src/index.css`
pomoci CSS custom properties (849 radku).

---

## Zakladni koncept

- **Barevne schema:** Teal & Warm Gray, light mode
- **Tvar prvku:** Pill-shaped (zakulacene) pro tlacitka a inputy
- **Ikony:** Custom SVG, outline styl, `currentColor`, zadne emoji
- **Fonty:** Inter (UI) + JetBrains Mono (monospace)

---

## Barvy

### Primarni (teal)

| Promena | Hex | Pouziti |
|---------|-----|---------|
| `--primary` | `#0D9488` | Hlavni tlacitka, aktivni stavy, linky |
| `--primary-light` | `#14B8A6` | Hover stav |
| `--primary-lighter` | `#CCFBF1` | Jemne pozadi (selected router, dropdown) |
| `--primary-dark` | `#0F766E` | Stisknute tlacitko |

### Neutralni (warm gray)

| Promena | Hex | Pouziti |
|---------|-----|---------|
| `--bg` | `#FFFFFF` | Hlavni pozadi |
| `--surface` | `#F5F5F4` | Sidebar, header tabulky |
| `--surface-hover` | `#EFEDEC` | Hover na polozkach |
| `--border` | `#E7E5E4` | Bordery karet, oddelovace |
| `--border-strong` | `#D6D3D1` | Focus ring, propoje |
| `--text-primary` | `#1C1917` | Hlavni text |
| `--text-secondary` | `#78716C` | Popisky |
| `--text-muted` | `#A8A29E` | Placeholder, disabled |

### Stavove

| Promena | Hex | Pouziti |
|---------|-----|---------|
| `--success` / `--success-light` | `#059669` / `#D1FAE5` | Konvergence, badge-success |
| `--warning` / `--warning-light` | `#D97706` / `#FEF3C7` | Zmeny v iteraci |
| `--danger` / `--danger-light` | `#DC2626` / `#FEE2E2` | Chyba, smazani |

---

## Typografie

| Pouziti | Font | Velikost | Vaha |
|---------|------|----------|------|
| Nadpisy | Inter | 15–22px | 600–700 |
| Body text | Inter | 14px | 400 |
| Small text | Inter | 12px | 400–500 |
| Labely | Inter | 12px | 500 |
| Metriky, IP | JetBrains Mono | 11–13px | 500 |

---

## Border radius

| Promena | Hodnota | Pouziti |
|---------|---------|---------|
| `--radius-sm` | `6px` | Badge, dropdown polozka |
| `--radius-md` | `10px` | Karty, panely, minimap |
| `--radius-lg` | `14px` | Modaly |
| `--radius-pill` | `9999px` | Tlacitka, inputy, badge |

**Pravidlo:** Tlacitka a inputy jsou VZDY pill (`9999px`).

---

## Stiny

| Promena | Hodnota | Pouziti |
|---------|---------|---------|
| `--shadow-sm` | `0 1px 3px rgba(28,25,23,0.06)` | Karty, dropdown |
| `--shadow-md` | `0 4px 12px rgba(28,25,23,0.08)` | Hover, popup, toolbar |
| `--shadow-lg` | `0 8px 24px rgba(28,25,23,0.12)` | Modal, floating bar |

---

## Animace

### Keyframes

| Nazev | Efekt | Pouziti |
|-------|-------|---------|
| `fadeInUp` | Opacity 0→1, translateY 8px→0 | Sidebar sekce, tabulka |
| `fadeIn` | Opacity 0→1 | Overlay, tooltip |
| `scaleIn` | Opacity 0→1, scale 0.95→1 | Dropdown menu, modal |
| `floatingBarIn` | Opacity 0→1, translateY 12px→0 | Floating bar |

### Transitions

Na vsech interaktivnich prvcich:

```css
transition: all 0.15s ease;
```

### Hover efekty

| Element | Hover |
|---------|-------|
| Tlacitko | `transform: scale(1.03)` |
| Router node | `border-color: primary`, `translateY(-2px)` |
| Tabulkovy radek | `background: surface` |
| Badge | `transform: scale(1.05)` |
| Sidebar polozka | `background: surface-hover` |

### Active (stisknute)

```css
transform: scale(0.97);
```

---

## Zakazane vzory

| Vzor | Duvod |
|------|-------|
| `border-left: 3px solid color` + barevne pozadi | Typicky "AI generated" alert |
| Element bez hover stavu | Mrtvy, nedodelany dojem |
| Element bez stinu na bilem pozadi | Chybi hloubka |
| Element bez `transition` | Skokove zmeny stavu |
| Nativni browser scrollbar / select | Vsechno musi byt custom |
| Emoji v UI | Pouzivat jen custom SVG ikony |

---

## Custom browser prvky

- **Scrollbar:** Tenky (6px), zakulaceny, barva `--border-strong`
- **Select:** Nativni `<select>` s `appearance: none` + SVG chevron, nebo custom dropdown
- **Input:** Pill tvar, focus ring s `--primary-lighter`
