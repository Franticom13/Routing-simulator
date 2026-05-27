# Theme — Routing Simulator

Teal & Warm Gray, light mode, pill-shaped elementy.

---

## DULEZITE PRAVIDLO — ZADNE EMOJI

**NIKDY** nepouzivat emoji v aplikaci. Na vsechno pouzivat **custom SVG ikony**.

- Zadne 🖧 🔧 📊 ⚙️ atd.
- Vsechny ikony jsou inline SVG, primo v kodu
- Barva ikon se ridi pres `currentColor` (dedi se z parentu)
- Velikost ikon: `16px` (male), `20px` (stredni), `24px` (velke)
- Stroke-width na ikonach: `1.5px` nebo `2px`
- Styl ikon: **outline** (ne filled), zakulacene konce (`stroke-linecap: round`, `stroke-linejoin: round`)

### Priklady SVG ikon

**Router ikona:**

```html
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="2" y="8" width="20" height="8" rx="2"/>
  <line x1="6" y1="12" x2="6" y2="12"/>
  <line x1="10" y1="12" x2="10" y2="12"/>
  <line x1="2" y1="12" x2="2" y2="12"/>
  <path d="M12 2v6M12 16v6"/>
</svg>
```

**Play (dalsi krok):**

```html
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="5,3 19,12 5,21"/>
</svg>
```

**Reset:**

```html
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="1,4 1,10 7,10"/>
  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
</svg>
```

---

## Barvy

### Primarni

| Nazev | Hex | Pouziti |
|-------|-----|---------|
| `primary` | `#0D9488` | Hlavni tlacitka, aktivni stavy, linky |
| `primary-light` | `#14B8A6` | Hover stav, sekundarni akcent |
| `primary-lighter` | `#CCFBF1` | Jemne pozadi (selected router, aktivni tab) |
| `primary-dark` | `#0F766E` | Stisknute tlacitko, tmavsi varianta |

### Neutralni

| Nazev | Hex | Pouziti |
|-------|-----|---------|
| `bg` | `#FFFFFF` | Hlavni pozadi stranky |
| `surface` | `#F5F5F4` | Panely, karty, sidebar |
| `surface-hover` | `#EFEDEC` | Hover na kartach/polozkach |
| `border` | `#E7E5E4` | Okraje karet, oddelovace |
| `border-strong` | `#D6D3D1` | Vyraznejsi bordery (input focus ring) |
| `text-primary` | `#1C1917` | Hlavni text, nadpisy |
| `text-secondary` | `#78716C` | Popisky, sekundarni text |
| `text-muted` | `#A8A29E` | Placeholder, disabled text |

### Stavy

| Nazev | Hex | Pouziti |
|-------|-----|---------|
| `success` | `#059669` | Konvergence, hotovo, uspech |
| `success-light` | `#D1FAE5` | Pozadi uspechu |
| `warning` | `#D97706` | Zmena v iteraci, upozorneni |
| `warning-light` | `#FEF3C7` | Pozadi zmeny |
| `danger` | `#DC2626` | Chyba, smazani, vypadek linky |
| `danger-light` | `#FEE2E2` | Pozadi chyby |

---

## Border Radius

Vsechno pills — zakulacene.

| Nazev | Hodnota | Pouziti |
|-------|---------|---------|
| `radius-sm` | `6px` | Male elementy (badge, tag) |
| `radius-md` | `10px` | Karty, panely, dropdown |
| `radius-lg` | `14px` | Vetsi karty, modaly |
| `radius-pill` | `9999px` | Tlacitka, inputy, tagy, chipy |

> **Pravidlo:** Tlacitka a inputy jsou VZDY pill (`9999px`). Karty a panely pouzivaji `radius-md` nebo `radius-lg`.

---

## Bordery

| Nazev | Hodnota | Pouziti |
|-------|---------|---------|
| `border-default` | `1px solid #E7E5E4` | Karty, panely, oddelovace |
| `border-strong` | `1px solid #D6D3D1` | Input focus, aktivni karty |
| `border-primary` | `2px solid #0D9488` | Vybrany router, aktivni element |

---

## Stiny

| Nazev | Hodnota | Pouziti |
|-------|---------|---------|
| `shadow-sm` | `0 1px 3px rgba(28,25,23,0.06)` | Karty, dropdown |
| `shadow-md` | `0 4px 12px rgba(28,25,23,0.08)` | Hover karty, popup |
| `shadow-lg` | `0 8px 24px rgba(28,25,23,0.12)` | Modal, velky popup |

---

## Typografie

Font: **Inter** (Google Fonts), fallback `system-ui, sans-serif`

| Nazev | Size | Weight | Pouziti |
|-------|------|--------|---------|
| `heading-lg` | `22px` | `700` | Nazev aplikace |
| `heading-md` | `17px` | `600` | Nadpisy panelu |
| `heading-sm` | `14px` | `600` | Nadpisy sekci |
| `body` | `14px` | `400` | Bezny text |
| `body-sm` | `12px` | `400` | Popisky, male texty |
| `label` | `12px` | `500` | Labely inputu, badges |
| `mono` | `13px` | `500` | IP adresy, metriky (font: `JetBrains Mono` / `monospace`) |

---

## Tlacitka

Vsechna tlacitka jsou **pill** tvar.

### Primary (vyplnene)

```
background: #0D9488
color: #FFFFFF
border: none
border-radius: 9999px
padding: 8px 20px
font-weight: 600
font-size: 13px
```

- Hover: `background: #14B8A6`
- Active: `background: #0F766E`

### Secondary (obrys)

```
background: transparent
color: #0D9488
border: 1px solid #E7E5E4
border-radius: 9999px
padding: 8px 20px
font-weight: 600
font-size: 13px
```

- Hover: `background: #F5F5F4`

### Ghost (jen text)

```
background: transparent
color: #78716C
border: none
padding: 8px 12px
font-weight: 500
```

- Hover: `color: #1C1917`, `background: #F5F5F4`

---

## Inputy

```
background: #FFFFFF
border: 1px solid #E7E5E4
border-radius: 9999px
padding: 8px 16px
font-size: 13px
color: #1C1917
```

- Placeholder: `color: #A8A29E`
- Focus: `border: 1px solid #D6D3D1`, `box-shadow: 0 0 0 3px #CCFBF1`

---

## Custom browser prvky

Browser NESMI renderovat zadny nativni prvek. Vsechno custom.

### Scrollbar

```css
/* sirka */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

/* pozadi drahy */
::-webkit-scrollbar-track {
  background: transparent;
}

/* samotny tahlo */
::-webkit-scrollbar-thumb {
  background: #D6D3D1;
  border-radius: 9999px;
}

::-webkit-scrollbar-thumb:hover {
  background: #A8A29E;
}

/* Firefox */
* {
  scrollbar-width: thin;
  scrollbar-color: #D6D3D1 transparent;
}
```

### Select / Dropdown

Nativni `<select>` pouzivat JEN pro jednoduche pripady. Pro cokoliv slozitejsiho (vice obsahu, ikony, barvy) pouzit custom dropdown komponentu.

Jednoduchy select:

```
appearance: none;
background: #FFFFFF;
border: 1px solid #E7E5E4;
border-radius: 9999px;
padding: 8px 36px 8px 16px;
font-size: 13px;
color: #1C1917;
cursor: pointer;
```

- Sipka: custom SVG chevron pres `background-image` (viz theme-preview.html)
- Focus: `border: 1px solid #D6D3D1`, `box-shadow: 0 0 0 3px #CCFBF1`
- Hover: `border-color: #D6D3D1`

Custom dropdown (slozitejsi pripady):

```
/* Trigger tlacitko — stejny styl jako select */
/* Dropdown panel: */
background: #FFFFFF;
border: 1px solid #E7E5E4;
border-radius: 10px;
box-shadow: 0 8px 24px rgba(28,25,23,0.12);
padding: 4px;
min-width: 180px;
```

- Polozka v dropdownu:

```
padding: 8px 12px;
border-radius: 6px;
font-size: 13px;
cursor: pointer;
```

- Polozka hover: `background: #F5F5F4`
- Polozka aktivni: `background: #CCFBF1`, `color: #0F766E`, `font-weight: 600`
- Otevreni: fade in + scale from 0.95, `200ms ease`
- Zavreni: fade out, `150ms ease`

### Checkbox

Nativni `<input type="checkbox">` skryt, nahradit custom:

```
/* Zakladni box */
width: 18px;
height: 18px;
border: 2px solid #D6D3D1;
border-radius: 4px;
background: #FFFFFF;
cursor: pointer;
transition: all 0.15s ease;
```

- Hover: `border-color: #0D9488`
- Checked: `background: #0D9488`, `border-color: #0D9488`, bile SVG checkmark uvnitr
- Focus: `box-shadow: 0 0 0 3px #CCFBF1`

### Radio button

Stejny princip jako checkbox, ale kulaty:

```
width: 18px;
height: 18px;
border: 2px solid #D6D3D1;
border-radius: 50%;
background: #FFFFFF;
```

- Checked: `border-color: #0D9488`, vnitrni tecka `background: #0D9488`, `width: 8px`, `height: 8px`

### Tooltip

```
background: #1C1917;
color: #FFFFFF;
font-size: 12px;
padding: 6px 10px;
border-radius: 6px;
box-shadow: 0 4px 12px rgba(28,25,23,0.15);
```

- Animace: fade in + posun o 4px smerem od zdroje, `150ms ease`
- Sipka: maly CSS trojuhelnik stejne barvy jako pozadi

---

## Karty / Panely

```
background: #FFFFFF
border: 1px solid #E7E5E4
border-radius: 10px
padding: 16px
box-shadow: 0 1px 3px rgba(28,25,23,0.06)
```

- Hover: `box-shadow: 0 4px 12px rgba(28,25,23,0.08)`

---

## Router (uzel na platne)

```
background: #FFFFFF
border: 2px solid #E7E5E4
border-radius: 10px
padding: 10px 14px
box-shadow: 0 1px 3px rgba(28,25,23,0.06)
```

- Hover: `border-color: #0D9488`
- Selected: `border-color: #0D9488`, `background: #CCFBF1`
- Zmena (iterace): `border-color: #D97706`, `background: #FEF3C7`

---

## Propoj (hrana)

```
stroke: #D6D3D1
stroke-width: 2px
```

- Hover: `stroke: #0D9488`
- Aktivni cesta: `stroke: #0D9488`, `stroke-width: 3px`
- Zmena: `stroke: #D97706`, `stroke-width: 3px`, `stroke-dasharray: 6 3`

---

## Routovaci tabulka

Tabulka v panelu vedle platna.

| Vlastnost | Hodnota |
|-----------|---------|
| Header bg | `#F5F5F4` |
| Header text | `#78716C`, `12px`, `600` |
| Row bg | `#FFFFFF` |
| Row hover | `#F5F5F4` |
| Cell text | `#1C1917`, `13px`, `mono` |
| Cell border | `1px solid #E7E5E4` (horizontalni) |
| Zmenena bunka | `background: #FEF3C7`, `color: #92400E` |

---

## Obecny vzhled

- **Layout:** sidebar vlevo (routing tabulka, ovladani) + platno vpravo (editor site)
- **Sidebar:** `background: #F5F5F4`, `border-right: 1px solid #E7E5E4`
- **Platno:** `background: #FFFFFF` s teckovym vzorem (dot grid, defaultne)
- **Toolbar nahore:** `background: #FFFFFF`, `border-bottom: 1px solid #E7E5E4`
- **Vse ma jemne stiny**, zadne tvrde okraje

---

## Animace a interakce

Appka musi pusobit zive a responzivne. Nic nesmi byt staticke.

### Transitions (na vsem)

```
transition: all 0.15s ease;
```

Pouzit na: tlacitka, karty, inputy, sidebar polozky, router uzly, badge, radky tabulky — uplne vse.

### Hover stavy

KAZDY element musi reagovat na hover, i kdyz neni interaktivni:

| Element | Hover efekt |
|---------|-------------|
| Tlacitko | `transform: scale(1.03)`, `box-shadow: shadow-md` |
| Karta | `box-shadow: shadow-md`, `transform: translateY(-1px)` |
| Radek tabulky | `background: surface` |
| Badge | `transform: scale(1.05)` |
| Sidebar polozka | `background: surface-hover`, `color: text-primary` |
| Router uzel | `border-color: primary` |

### Active/stisknute stavy

```
transform: scale(0.97);
box-shadow: shadow-sm;  /* mensi stin nez default */
```

Drzeni = zustavne male. Jako opravdove fyzicke tlacitko.

### On-load animace

Pri nacteni stranky / prepnuti panelu:

```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-in {
  animation: fadeInUp 0.25s ease forwards;
}
```

Kazda karta / sekce ma maly stagger delay (0ms, 50ms, 100ms, ...).

### Prepinani tabu / panelu

- Odchazejici panel: fade out + posun doleva
- Prichazejici panel: fade in + posun zprava
- Plynule, 200–300ms

---

## Zakazane vzory

| Vzor | Proc je zakazany |
|------|------------------|
| `border-left: 3px solid color` + barevne pozadi | Typicky "AI vibe coded" alert. Absolutne zakazano. |
| Element bez hover stavu | Appka pusobi mrtve a nedodelane. |
| Element bez stinu na bilem pozadi | V light mode neexistuje hloubka bez stinu. |
| Element bez `transition` | Zmeny stavu musi byt plynule, nikdy skokem. |
| Browser default scrollbar / select | Vsechno custom. |
