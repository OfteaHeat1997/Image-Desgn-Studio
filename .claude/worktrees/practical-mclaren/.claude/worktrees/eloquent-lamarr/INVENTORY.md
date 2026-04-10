# UNISTYLES CURACAO - Complete Product & Image Inventory

> **Purpose:** This document is a complete reference for any AI agent working on this project.
> It maps every product, image, data source, and known issue so you can fix images,
> update products, and sync data accurately.
>
> **Last updated:** 2026-02-25

---

## TABLE OF CONTENTS

1. [Data Sources](#data-sources)
2. [Product Summary](#product-summary)
3. [Category 1: BRAS (77 products)](#category-1-bras)
4. [Category 2: PANTIES (72 products)](#category-2-panties)
5. [Category 3: SHAPEWEAR (15 products)](#category-3-shapewear)
6. [Category 4: FRAGRANCES (146 products)](#category-4-fragrances)
7. [Category 5: CREAMS (49 products)](#category-5-creams)
8. [Category 6: SUNSCREEN (11 products)](#category-6-sunscreen)
9. [Category 7: PERSONAL CARE (28 products)](#category-7-personal-care)
10. [Category 8: FACIAL CLEANSING (6 products)](#category-8-facial-cleansing)
11. [Category 9: ACCESSORIES & JEWELRY (82 products)](#category-9-accessories--jewelry)
12. [Image Directories](#image-directories)
13. [Known Issues & Gaps](#known-issues--gaps)
14. [Data Sync Status](#data-sync-status)

---

## DATA SOURCES

There are **4 data sources** that must stay in sync:

| Source | Location | Description |
|--------|----------|-------------|
| **Word Catalogs** | `C:\Users\maria\Desktop\Unistyles Projects\CATALOGOS_ACTUALIZADOS\` | 9 Word docs with the REAL complete inventory + stock counts |
| **Excel Inventory** | `C:\Users\maria\Desktop\Unistyles Projects\INVENTARIO UNISTYLES 2025.xlsx` | Master spreadsheet with 13 sheets, purchase history, costs, sales |
| **Frontend Data** | `frontend/src/data/productData.js` | Local JS fallback data — currently only 148 products (OUTDATED) |
| **Strapi Seed** | `strapi/src/seed-data.json` | CMS seed data — mirrors productData.js (OUTDATED) |

### Word Catalog Files (Source of Truth)

| File | Category | Products | Total Units |
|------|----------|----------|-------------|
| `CATALOGO_BH_FINAL.docx` | Bras | 77 | ~230+ |
| `CATALOGO_PANTYS_FINAL.docx` | Panties | 72 | ~216 |
| `CATALOGO_COLONIAS_UPDATED.docx` | Fragrances | 146 | ~438+ |
| `CATALOGO_CREMAS_UPDATED.docx` | Creams | 49 | 139 |
| `CATALOGO_ASEO.docx` | Deodorants/Talcos | 28 | ~35 |
| `CATALOGO_BLOQUEADOR_UPDATED.docx` | Sunscreen | 11 | 28 |
| `CATALOGO_LIMPIEZA_FACIAL_UPDATED.docx` | Facial Cleansing | 6 | 16 |
| `CATALOGO_JOYAS.docx` | Jewelry | 82 | 244 |
| `Inventario aseo.docx` | (Duplicate of ASEO) | — | — |

### Excel Sheets

| Sheet | Unique Products | Description |
|-------|----------------|-------------|
| GASTOS FIJOS | 0 | Fixed expenses (not products) |
| ASEO | 20 | Deodorants, talcos |
| COLONIAS | 20 | Fragrances (subset) |
| PANTY | 20 | Panties (subset) |
| BH | 20 | Bras (subset) |
| CREMAS | 23 | Creams |
| MAQUILLAJE | 19 | Makeup |
| JOYAS | 11 | Jewelry (subset) |
| BLOQ | 10 | Sunscreen |
| LIMPIEZA FACIAL | 6 | Facial cleansing |
| BOLSOS | 2 | Handbags |
| BILLETERAS | 1 | Wallets |
| CORREAS | 1 | Belts |

---

## PRODUCT SUMMARY

| Category | Slug | Catalog Count | Website Count | GAP |
|----------|------|:------------:|:------------:|:---:|
| Bras | `bras` | **77** | 20 | **-57** |
| Panties | `panties` | **72** | 20 | **-52** |
| Shapewear | `shapewear` | 15 | 15 | 0 |
| Fragrances | `perfume` | **146** | 22 | **-124** |
| Creams | `cremas` | **49** | 12 | **-37** |
| Sunscreen | `bloqueador` | **11** | 12 | +1 |
| Personal Care | `desodorantes` | **28** | 24 | **-4** |
| Facial Cleansing | `limpieza-facial` | **6** | 9 | +3 |
| Accessories | `accesorios` | **82** | 14 | **-68** |
| **TOTALS** | | **486** | **148** | **-338** |

### Brands

| Brand | Catalog Products | Website Products |
|-------|:---------------:|:---------------:|
| Leonisa | 164 (77 bras + 72 panties + 15 shapewear) | 55 |
| Esika | 51 fragrances + 15 creams + 11 deodorants + 2 sunscreen + 2 facial | 33 |
| Yanbal | 35 fragrances + 18 creams + 14 deodorants + 8 sunscreen | 27 |
| L'Bel | 20 fragrances + 10 creams + 1 sunscreen + 4 facial | 17 |
| Cyzone | 38 fragrances + 1 cream | 2 |
| Avon | 2 fragrances + 4 creams | 0 |
| Salome | 1 cream | 0 |
| No brand (Jewelry) | 82 | 14 |

---

## CATEGORY 1: BRAS

**Catalog:** `CATALOGO_BH_FINAL.docx` — **77 products**, all Leonisa, all $35 XCG

Every bra has: Reference #, Color, Size. Key references:

| Reference | Styles |
|-----------|--------|
| REF 71332 | Classic bra (Beige, Blanco, Negro — sizes 34B-42C) |
| REF 71321 | Classic bra (various colors) |
| REF 011911 | Lace Bralette |
| REF 011912 | Lace Bralette |
| REF 71318 | Strapless Lace |
| REF 011920 | Push-Up Lace |
| REF 011843 | Full Coverage Unlined |
| REF 011968 | Contour Push-Up |
| REF 012100 | Triangle Lace |
| REF 091044 | Comfort Bra |
| REF 091001, 091026, etc. | Various styles |

**Images available in:** `frontend/public/images/bra/` (42 files) + `frontend/public/images/LEONISA_HD_*.jpg` (10 HD files)

**WEBSITE STATUS:** Only 20 of 77 bras are on the website. Missing 57 products (mostly color/size variants).

---

## CATEGORY 2: PANTIES

**Catalog:** `CATALOGO_PANTYS_FINAL.docx` — **72 products**, all Leonisa, all $19 XCG

Key product groups:

| Group | Reference | Colors Available | Count |
|-------|-----------|-----------------|:-----:|
| HD Panty Collection | Various | Negro, Blanco, Rosa, Crema, Azul Encaje, Lila, Morado, Rayas Beige | 14 |
| Leonisa Branded | Various | Beige, Black | 19 |
| Tanga Algodon REF012632 | 012632 | Beige, Blanco, Crema | 3 |
| Tanga Algodon REF012633 | 012633 | 9 colors (Azul Claro/Medio/Oscuro, Beige, Beige Estampado, Blanco, Blanco Estampado, Café Medio, Crema) | 9 |
| Tiro Alto Algodon REF 207 | 207 | 14 colors (Azul Estampado/Oscuro, Beige, Blanco, Café, Crema, Lila, Morado, Negro, Palo de Rosa, Rosa Salmon, Salmon Oscuro, Verde Lima, Vinotinto) | 15 |
| Tiro Alto Licra REF1255 | 1255 | 5 colors (Azul Estampado, Beige, Blanco, Crema, Salmon) | 5 |
| Tiro Alto Lycra REF 0118 | 0118 | 3 variants (Beige x2, Crema) | 3 |
| Packs | Various | Multi-color packs | 4 |

**Images:** `frontend/public/images/Pantys/` (84 files) + root HD_PANTY_* files

**WEBSITE STATUS:** Only 20 of 72 panties are on the website. Missing 52 products.

---

## CATEGORY 3: SHAPEWEAR

**15 products**, all Leonisa, prices $45-$95 XCG

| ID | Name | Price | Image |
|----|------|:-----:|-------|
| SHP-001 | High Waist Shaper Panty (Beige) | 68 | LEONISA_HIGH_WAIST_SHAPER_BEIGE.jpg |
| SHP-002 | High Waist Shaper Panty (Black) | 68 | LEONISA_HIGH_WAIST_SHAPER_BLACK.jpg |
| SHP-003 | Firm Compression Shaper | 95 | LEONISA_FIRM_COMPRESSION_BEIGE.jpg |
| SHP-004 | High Waist Thong Shaper (Beige) | 58 | LEONISA_THONG_SHAPER_BEIGE.jpg |
| SHP-005 | High Waist Thong Shaper (Black) | 58 | LEONISA_THONG_SHAPER_HD.jpg |
| SHP-006 | Seamless Shaper Panty | 52 | LEONISA_SEAMLESS_SHAPER_HD.jpg |
| SHP-007 | Lace Trim Shaper Panty | 48 | LEONISA_LACE_SHAPER_BEIGE.jpg |
| SHP-008 | Lace Classic Shaper | 48 | LEONISA_LACE_CLASSIC_SHAPER_HD.jpg |
| SHP-009 | Comfy Everyday Shaper | 45 | LEONISA_COMFY_SHAPER_HD.jpg |
| SHP-010 | High Waist Shaper (White) | 68 | LEONISA_HIGH_WAIST_SHAPER_WHITE.jpg |
| SHP-011 | Sheer Lace Shaper | 55 | LEONISA_SHEER_LACE_SHAPER_HD.jpg |
| SHP-012 | High Waist Sculpting Thong | 58 | LEONISA_HIGH_WAIST_SCULPTING_THONG_HD.jpg |
| SHP-013 | Lace Seamless Thong | 48 | LEONISA_LACE_SEAMLESS_THONG_HD.jpg |
| SHP-014 | Sheer Lace Beige | 55 | LEONISA_SHEER_LACE_BEIGE.jpg |
| SHP-015 | High Waist Thong Black | 58 | LEONISA_HIGH_WAIST_THONG_BLACK.jpg |

**STATUS:** All 15 are on the website. Complete.

---

## CATEGORY 4: FRAGRANCES

**Catalog:** `CATALOGO_COLONIAS_UPDATED.docx` — **146 perfumes**, all $19 XCG

### By Brand:

| Brand | Count | SKU Range |
|-------|:-----:|-----------|
| Esika | 51 | COL-ES01 to COL-ES51 |
| Cyzone | 38 | COL-CY01 to COL-CY38 |
| Yanbal | 35 | COL-YB01 to COL-YB35 |
| L'Bel | 20 | COL-LB01 to COL-LB20 |
| Avon | 2 | COL-AV01 to COL-AV02 |

### Key Fragrances (Esika — 51 products):
Agua Mananas Felices, Aura Lila, Bela, Berry Cocktail, Cielo, Coconut Ocean, Comando Force, Dancing, Dancing Night, Dendur, Devos Magnetic, Dorsay, Dorsay Class, Dorsay Inspire, Dream, Dulce Amistad, Empire, Evoluzion, Expression, Expression Sense, Fantasia Azul Infinito, Femme Magnat, Fist, Fist Team, Forze, Forze Unlimited, Girlink, Grazzia Rosado, Id, Identity Bloom, Impredecible (x3), Inlove, Its You (Emotion/Live/Since 1997/Travel), Magnat, Magnat Select, Maracuya Passion, Men Extreme, Mia, Mia Sensual Night, Miss, Miss Sexy Active, Pulso, Pulso Absolute, Pulso Mini, Score, Temptation (Black/Mujer/Para Hombre), Winner (Max/Sport/Traxion)

### Key Fragrances (Cyzone — 38 products):
Adrenaline, Ainnara, All Black, Berry Cocktail, Blue Blue For Her/Him, Dancing/Night, Fist/Team, Girlink, Mon/Mon Pink, Mora Potion, Musk Blanc, New Code (Code Red/Cool), Nitro (Adventure/Air/Intense/Night/Ocean/Ultimate), Paradisso, Pera In Love, Prints (Adventure/Morada/Xperience Verde), Revolution, Salvaje, Sandia Shake, Soft Musk Delice, Soy Cool/Soy Sexy, Sprio Blue, Sweet Black (x3), Uva Kiss, Vera, Viva/Viva Happy, Xool

### Key Fragrances (Yanbal — 35 products):
43N Paralel, Arom/Arom Element, Autenti-K, Body & Spirit, Ccori Oro/Rose, Cielo, Destine (Budapest/Florence/Vienna), Efective (Brisa Floral/Original), Emouv, Gaia/Gaia Elixir, Homme 033, Hypnotisant, L'Essence, Liberatta/Viva Liberatta, Liasson, Limage, Mithyka (x4), OHM/OHM Azul, Osadia (Infinita/Para Hombre), Rose D'Amelie, Soleil Rose, Temptation Hombre, Valentia, Vivir, Zentro

### Key Fragrances (L'Bel — 20 products):
Aqua, Bleu Femme/Intense/Night, Emouv, Expression/Expression Sense, Fleur Divine/Icon, Icono, Id, Mithyka/Mithyka Lumiere, Noir Absolu, Reve Sensuelle, Satin (Nude/Rouge), Solo, Vanilla (Mujer/Hombre), Vibranza (Addiction/Blanc/Iluminour)

**Images:** `frontend/public/images/perfumes/` (161 white-bg files) + `Photos of perfume/` (160 raw camera JPGs at 4-7MB each)

**WEBSITE STATUS:** Only 22 of 146 fragrances are on the website. **Missing 124 products.**

---

## CATEGORY 5: CREAMS

**Catalog:** `CATALOGO_CREMAS_UPDATED.docx` — **49 products**, all $19 XCG, 139 total units

### By Brand:

| Brand | Count | Products Include |
|-------|:-----:|-----------------|
| Yanbal | 18 | Ccori Oro/Rose Body Cream, Gaia, Osadia, Seda (Ambar y Miel/Perlas y Rosas/Rosas y Musk), Temptation Mystic, Totalist (multiple), Triple Accion (multiple) |
| Esika | 15 | Emotion Happy, Encanto, Multicrem, Naturals (Frambuesa/Violeta Lichi), Perfumada (Bela/Chic/Vibranza), Renacer, Triple Accion (25+/40+/55+/Max) |
| L'Bel | 10 | Delice Hand, Hidratante (Bronze/Gold), Perfumada (Liasson/Mithyka/Mon/Satin Rouge), Sensitiva (Elixir/Tinted Moisturizer), Totalist Avocado |
| Avon | 4 | Care Milk, Hot Body Gel, Naturals Body Cream (x2) |
| Cyzone | 1 | Perfumada Autenti-K Body Cream |
| Salome | 1 | Hot Body Gel |

**Images:** `frontend/public/images/catalogo  cremas/` (49 files, 1.8MB)

**WEBSITE STATUS:** Only 12 of 49 creams on the website. **Missing 37 products.**

---

## CATEGORY 6: SUNSCREEN

**Catalog:** `CATALOGO_BLOQUEADOR_UPDATED.docx` — **11 products**, all $19 XCG, 28 units

| SKU | Name | Brand | Stock |
|-----|------|-------|:-----:|
| BLQ-001 | Perfect Block FPS 50 | Esika | 3 |
| BLQ-002 | Triple Action Max Anti-aging FPS 100 | Esika | 3 |
| BLQ-003 | Defense Total FPS 50 Natural Color | L'Bel | 3 |
| BLQ-004 | Total Block Compact Beige Claro | Yanbal | 3 |
| BLQ-005 | Total Block Compact Beige Oscuro | Yanbal | 3 |
| BLQ-006 | Total Block Compact Nude | Yanbal | 1 |
| BLQ-007 | Total Block 140g | Yanbal | 2 |
| BLQ-008 | Total Block 50+ Bifasico Spray | Yanbal | 3 |
| BLQ-009 | Total Block Matt Matificante 80g | Yanbal | 1 |
| BLQ-010 | Total Block 140g (v2) | Yanbal | 2 |
| BLQ-011 | Total Block 80g | Yanbal | 4 |

**Images:** `frontend/public/images/CATALOGO BLOQUEADOR/` (12 files)

**STATUS:** Website has 12 (close match). Minor naming differences.

---

## CATEGORY 7: PERSONAL CARE

**Catalog:** `CATALOGO_ASEO.docx` — **28 products** (25 deodorants + 1 conditioner + 2 talcos)

### Deodorants — Yanbal (14 products):
AROM ABSOLUTE (1), CCORI ORO (3), CCORI ROSE (2), EFECTIVE BRISA FLORAL (2), EFECTIVE ORIGINAL (1), CIELO (2), GAIA (2), OHM (1), OHM BLACK (1), OSADIA (2), TEMPTATION HOMBRE (6), ZENTRO (1), *+ 2 unnamed*

### Deodorants — Esika (11 products):
DORSAY (1), FANTASIA AZUL INFINITO (1), ITS YOU ROLL-ON (1), ITS YOU LIVE (1), LEYENDA (2), MAGNAT (2), MAGNAT SELECT (1), PULSO (1), 36H TOTAL SEC PIEL DELICADA (1), 36H TOTAL SEC NEUTRO (1)

### Other:
- DESENREDANTE MINI CHICS — Esika (stock: 2)
- TALCO FANTASIA AZUL INFINITO — Esika (stock: 2)
- TALCO XTREME — Esika (stock: 1)

**Images:** `frontend/public/images/DESODORANTES_HD/` (25 HD files) + `DESODORANTES/` (27 older files)

**WEBSITE STATUS:** 24 of 28 on website. Missing ~4.

---

## CATEGORY 8: FACIAL CLEANSING

**Catalog:** `CATALOGO_LIMPIEZA_FACIAL_UPDATED.docx` — **6 products**, all $19 XCG

| SKU | Name | Brand | Stock |
|-----|------|-------|:-----:|
| LF-ES01 | Exfoliante Triple Accion Max | Esika | 1 |
| LF-ES02 | Agua Micelar Triple Accion Max | Esika | 3 |
| LF-LB01 | Desmaquillador Essential Bifasico | L'Bel | 3 |
| LF-LB02 | Agua Micelar Limpiadora y Tonica 2 en 1 | L'Bel | 3 |
| LF-LB03 | Locion Tonica Essential | L'Bel | 3 |
| LF-LB04 | Nocturne Gel Limpiador Facial | L'Bel | 3 |

**Images:** `frontend/public/images/limpieza facial/` (6 files)

**WEBSITE STATUS:** Website has 9 (includes 3 serums not in catalog). The 6 core products match.

---

## CATEGORY 9: ACCESSORIES & JEWELRY

**Catalog:** `CATALOGO_JOYAS.docx` — **82 items**, all Stainless Steel, all $19 XCG, 244 total units

### Product Types:

| Type | Count | Examples |
|------|:-----:|---------|
| Aretes (Earrings) | ~20 | Largos Grandes, Perlas, Argollas Chiquitas, etc. |
| Cadenas (Chains) | ~15 | Militar Mediana/Grande, Corazon Mediana, Figaro, etc. |
| Candongas | ~10 | Canasta, Piedra, Topos Pepita (various sizes/colors) |
| Pulseras (Bracelets) | ~12 | 3 Colores, Corazones, Pepitas, Tennis, etc. |
| Topos (Studs) | ~15 | Pepita (S/M/L, Oro/Plata), Bolita (S/M/L) |
| Anillos (Rings) | ~5 | Various |
| Sets | ~5 | Clover, Tree of Life, etc. |

**Images:** `frontend/public/images/Accesorrios/CATALOGADOS/` — organized into:
- `Anillos/` (2 files)
- `Aretes/` (17 files)
- `Collares/` (21 files)
- `Pulseras/` (15 files)
- `Sets/` (17 files)

**WEBSITE STATUS:** Only 14 of 82 jewelry items on website. **Missing 68 products.**

---

## IMAGE DIRECTORIES

### Main Product Images (web-ready)
| Directory | Files | Size | Used By |
|-----------|:-----:|:----:|---------|
| `frontend/public/images/` (root) | ~230 | Mixed | All categories |
| `frontend/public/images/perfumes/` | 161 | 13 MB | White-bg perfume images |
| `frontend/public/images/Pantys/` | 84 | 28 MB | Panty products |
| `frontend/public/images/bra/` | 42 | 3.5 MB | Bra products |
| `frontend/public/images/Accesorrios/CATALOGADOS/` | 72 | ~120 MB | Jewelry (organized) |
| `frontend/public/images/catalogo  cremas/` | 49 | 1.8 MB | Cream products |
| `frontend/public/images/DESODORANTES_HD/` | 25 | 1.5 MB | Deodorant products (HD) |
| `frontend/public/images/CATALOGO BLOQUEADOR/` | 12 | ~2 MB | Sunscreen products |
| `frontend/public/images/limpieza facial/` | 6 | 504 KB | Facial cleansing |
| `frontend/public/images/catalogo colonias/` | 161 | 17 MB | Cologne catalog (duplicate of perfumes/) |

### Raw / Source Images (NOT for web)
| Directory | Files | Size | Notes |
|-----------|:-----:|:----:|-------|
| `frontend/public/images/Photos of perfume/` | 160 | **833 MB** | Raw camera JPGs (4-7MB each) |
| `frontend/public/images/06_Inventory/` | 624 | **1.4 GB** | Catalog scans + raw photos |
| `frontend/public/images/Accesorrios/` (root) | 192 | ~500 MB | Raw phone photos + videos |
| `images/Unistyles inveotory images/` | 850 | **1.5 GB** | FULL DUPLICATE of frontend/public/images |

### Files to NOT deploy
| File | Size | Reason |
|------|:----:|--------|
| `Photos of perfume.zip` | 830 MB | Archive in public dir |
| `Accesorrios-20260209T151553Z-3-001.zip` | 478 MB | Archive in public dir |
| `images/Unistyles inveotory images/` (entire dir) | 1.5 GB | Duplicate |
| `Photos of perfume/` (entire dir) | 833 MB | Raw unoptimized |
| `06_Inventory/FOTOS_COLONIAS/` | ~850 MB | Raw camera photos |

### Video Files
| File | Size | Location |
|------|:----:|---------|
| `2026-02-04-181023290.mp4` | 2.5 MB | Accesorrios/ |
| `2026-02-04-192040283.mp4` | 2.5 MB | Accesorrios/ |
| `2026-02-05-011458411.mp4` | 2.4 MB | Accesorrios/ |
| `2026-02-05-065002982.mp4` | 2.3 MB | Accesorrios/ |
| `2026-02-06-145858095.mp4` | 3.2 MB | Accesorrios/ |
| `VID_20260204_151936_186_bsl.mp4` | 33 MB | Accesorrios/ |
| `VID_20260204_211346_503_bsl.mp4` | 29 MB | Accesorrios/ |
| `VID_20260205_024620_873_bsl.mp4` | 27 MB | Accesorrios/ |
| `VID_20260206_105650_405_bsl.mp4` | 37 MB | Accesorrios/ |
| `VID_20260206_120926_550_bsl.mp4` | 37 MB | Accesorrios/ |

---

## KNOWN ISSUES & GAPS

### Critical: Missing Products (338 products not on website)
1. **Fragrances:** 124 missing — only 22 of 146 on site
2. **Accessories:** 68 missing — only 14 of 82 on site
3. **Bras:** 57 missing — only 20 of 77 on site
4. **Panties:** 52 missing — only 20 of 72 on site
5. **Creams:** 37 missing — only 12 of 49 on site
6. **Personal Care:** 4 missing

### Image Issues
1. **Shared images between categories:** DORSAY.jpg, GAIA.jpg, OHM.jpg, OSADIA.jpg, ZENTRO.jpg used for both perfumes AND deodorants
2. **Missing dedicated deodorant images:** Several deodorants use perfume bottle images
3. **DES-024 (Mini Chics Set)** uses placeholder.jpg
4. **DES-023 (Magnat Select)** shares image with DES-015 (Magnat Classic) — magnat.png
5. **Duplicate images:** `perfumes/` and `catalogo colonias/` contain identical 161 files
6. **Unoptimized raw images:** 833 MB of raw camera photos in public directory
7. **ZIP files in public:** 1.3 GB of archives that shouldn't be deployed
8. **Panty folder has excluded subfolder:** `Pantys/SIN_CALIDAD_EXCLUIDOS/` — 36 low-quality images

### Price Discrepancies
- **Catalog prices:** All $19 XCG (uniform pricing in Word docs)
- **Website prices:** Vary widely ($12-$185 XCG) — more realistic retail prices
- **Note:** The website prices appear to be the correct retail prices; catalog prices may be wholesale/cost

### Brand Attribution
- All 82 jewelry items have NO brand in the website data (listed as "Unknown")
- Avon and Salome brands exist in catalogs but NOT on website
- Maquillaje (Makeup) category exists in Excel but NOT on website

---

## DATA SYNC STATUS

### What needs to happen to sync everything:

1. **Add 338 missing products** to `productData.js` and `seed-data.json`
2. **Map images** for all new products from the organized catalog folders
3. **Optimize images** — compress the raw photos for web use
4. **Remove duplicates** — delete `images/Unistyles inveotory images/`, `catalogo colonias/`, ZIP files
5. **Add Maquillaje category** — 19 products exist in Excel but no website page
6. **Add Bolsos/Billeteras/Correas** — 4 products in Excel, could be sub-categories of accessories
7. **Fix shared images** — deodorants need their own product photos separate from perfumes
8. **Update stock counts** — pull current stock from Word catalogs into the database

### File mapping for new products:
- Bras → use images from `frontend/public/images/bra/` (42 files with ref# naming)
- Panties → use images from `frontend/public/images/Pantys/` (84 files)
- Fragrances → use images from `frontend/public/images/perfumes/` (161 white-bg files)
- Creams → use images from `frontend/public/images/catalogo  cremas/` (49 files)
- Jewelry → use images from `frontend/public/images/Accesorrios/CATALOGADOS/` (72 organized files)
- Deodorants → use images from `frontend/public/images/DESODORANTES_HD/` (25 HD files)
- Sunscreen → use images from `frontend/public/images/CATALOGO BLOQUEADOR/` (12 files)
- Facial → use images from `frontend/public/images/limpieza facial/` (6 files)
