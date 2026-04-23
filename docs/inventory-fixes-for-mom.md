# Lista de cosas a arreglar en el inventario de BH

> **Para:** Mamá (y Angely si ayuda)
> **Hecho:** 2026-04-23
> **Qué es este doc:** lista concreta de todo lo que está mal o falta en la carpeta `C:\Users\maria\Pictures\Inventory Unistyles images\` respecto al inventario de BH (brasieres). Arreglando esto, el pipeline IA va a funcionar mejor y más barato.
>
> **Dónde están los originales que revisé:**
> - Docx: `docs/inventory-final/catalogos/Copia_de_CATALOGO_BH_FINAL.md`
> - Fotos: `docs/inventory-final/images/bras/<REF>/`

---

## Resumen en 1 minuto

- **77 SKUs** de BH (cada combinación REF + color + talla cuenta como un SKU)
- **29 referencias únicas** (REFs) — 1 REF = 1 diseño / corte
- **20 carpetas de fotos** → **faltan fotos de 9 REFs**
- **128 fotos totales** — suficiente para los REFs con fotos, pero hay mucho problema de nombres
- **Precio único** XCG 110 para todo BH
- **Stock bajo**: la mayoría de SKUs tienen solo 1-2 unidades

**Lo más urgente** para que el pipeline funcione bien:
1. Fotografiar los 10 REFs que faltan (ver sección 3)
2. Arreglar los nombres inconsistentes de los archivos (ver sección 4)
3. Arreglar los 2 tipos de errores del docx (ver sección 5)

---

## 1. Tus 6 REFs estrella (los que más stock tienen)

Estos son los que hay que procesar PRIMERO — cubren 55 de las 77 unidades totales (**71% del stock**). Si algo falla con el pipeline, estos 6 son los críticos.

| REF | Unidades | Colores que tiene | Fotos en folder | Estado |
|---|---:|---|---:|---|
| **71321** | 14 | beige, habano, negro | 6 | ✅ Listo para procesar |
| **011970** | 10 | beige, negro, rosado | 7 | ✅ Listo |
| **71332** | 10 | beige, blanco, fucsia, habano, negro | 6 | ⚠ Faltan colores: fucsia, habano no tienen foto dedicada |
| **091044** | 8 | beige, negro | 4 | ✅ Listo (pero pocas fotos) |
| **011968** | 7 | beige, blanco, negro | 6 | ✅ Listo |
| **011473** | 6 | beige, blanco, negro, verde | 9 | ✅ Listo (mejor cobertura) |

**Acción:** estos 6 se pueden procesar hoy. El pipeline IA ya los detecta automáticamente.

---

## 2. REFs que sí tienen fotos — están OK

20 carpetas existen en `bras/`:

```
011473, 011654, 011841, 011843, 011868, 011877, 011911,
011936, 011968, 011970, 011974, 011986, 091026, 091032,
091054, 71321, 71330, 71332, 71339, 91044
```

Estas se pueden procesar cuando llegue su turno.

---

## 3. ❌ REFs SIN FOTOS — hay que fotografiarlos

Aparecen en el docx `CATALOGO_BH_FINAL` pero **no tienen carpeta de fotos** en `bras/`:

| REF | Variantes en catálogo | Acción sugerida |
|---|---|---|
| **011885** | VINOTINTO ESTAMPADO 36B (1 ud) | Foto frontal + foto espalda del bra |
| **011898** | NEGRO 36B (1 ud) | Foto frontal + foto espalda |
| **011977** | NEGRO 34B, 36B×2, 38B (4 uds) | Foto frontal + foto espalda del NEGRO |
| **011979** | BEIGE 36B (1 ud) | Foto frontal + foto espalda |
| **011981** | GRIS 34B (1 ud) | Foto frontal + foto espalda |
| **011985** | NEGRO 32B (1 ud) | Foto frontal + foto espalda |
| **091022** | BEIGE XXL, NEGRO XXL (2 uds) | Foto frontal + foto espalda |
| **71280** | BLANCO 38B (1 ud) | Foto frontal + foto espalda |
| **71333** | NEGRO 38B (1 ud) | Foto frontal + foto espalda |
| **71338** | BEIGE 38B (1 ud) | Foto frontal + foto espalda |
| **P81151** | SALMON 32B (2 uds) | Foto frontal + foto espalda |
| **P81155** | PALO DE ROSA 32 (1 ud) | Foto frontal + foto espalda |

**Total: 12 REFs sin foto, representando 17 unidades de 77 (22% del stock)**.

### Decisión tomada con mami:
1. **Fotografiar primero** los que tengan más de 1 unidad en stock (son los que rotan más): **011977 (4 uds), P81151 (2 uds), 091022 (2 uds)**.
2. **Marcar "no disponible" en la web** los de 1 unidad: **011885, 011898, 011979, 011981, 011985, 71280, 71333, 71338, P81155** — 9 REFs. Estos no se procesan hasta que haya foto.

### Qué foto sacar (mínimo)
Por cada REF, sacar **2 fotos por color disponible**:
1. **Frontal**: modelo mostrando el BH de frente (puede ser modelo o maniquí o bra plano sobre fondo blanco — todos funcionan)
2. **Espalda**: modelo mostrando el broche/banda atrás (lo mismo)

**Fondo:** liso (blanco idealmente). Sin cosas atrás.
**Resolución:** 1024 px o más de ancho.
**Formato:** PNG o JPG.

---

## 4. 🔧 Arreglar los nombres de los archivos

Hoy los nombres son inconsistentes entre carpetas. El pipeline IA detecta automáticamente pero se confunde con nombres raros.

### Comparación:

**Carpeta `011473/`** (bien nombrada):
```
bh beige 011473.png
bh beige patras 011473.png           ← "patras" = espalda ✓
bh blanco 1 delante  011473.png      ← tiene doble espacio, "delante" = frontal ✓
bh negro delante  011473.png         ← doble espacio
```

**Carpeta `71321/`** (mal nombrada):
```
BH 71321  1 BLANCO  .png             ← MAYÚSCULAS, dobles espacios, sin "delante"
BH 71321 BEIGE.png                   ← NO tiene "delante" ni "patras" — el pipeline no sabe si es frontal o atrás
```

### Formato estandarizado propuesto (pedir a mamá/Angely que todas sigan este)

**`bh <color> <vista> <ref>.<ext>`** todo en minúscula, 1 solo espacio entre palabras:

```
bh beige delante 011473.png       ← frontal
bh beige patras 011473.png        ← espalda
bh negro delante 011473.png
bh negro patras 011473.png
bh blanco delante 011473.png
bh blanco patras 011473.png
```

**Palabras clave obligatorias:**
- Vista: **`delante`** (frontal) o **`patras`** (espalda) — el pipeline ya detecta ambas
- Color: usar solo estos nombres (hay typos que el pipeline ya arregla pero mejor directo bien):
  - beige, blanco, negro, gris, rojo, azul, verde, amarillo, rosa, morado, naranja, marrón, dorado, turquesa, plateado
  - ❌ No usar "berde" (es verde), ni variantes con acento

**Sin estos problemas:**
- ❌ Mayúsculas (`BLANCO` → `blanco`)
- ❌ Espacios dobles (`11473  1` → `011473 1`)
- ❌ Números extra al azar (`1 BLANCO`, `2 BLANCO` — si son 2 fotos del mismo color, agregá al final `-1` y `-2`: `bh blanco delante 011473-1.png`)

### Archivos ambiguos actuales que requieren atención

Si querés que los actuales archivos funcionen, al menos:
- **`BH 71321 BEIGE.png`** → renombrar a **`bh 71321 beige delante.png`** (asumo que es frontal; si es espalda, cambiar a `patras`)
- Todos los `.png` con mayúsculas en `71321/` → bajar todo a minúscula y agregar vista
- Los de `011473/` que tienen doble espacio → arreglar para tener 1 solo espacio

**Si no se arreglan los nombres**, el pipeline asume que todo lo que no diga "patras" es "frontal" — y esto puede generar errores en el paso Foto Espalda si acaso usa una frontal como si fuera de atrás.

---

## 5. 📝 Errores del docx `CATALOGO_BH_FINAL`

Hay 2 tipos de error en el Word/tabla que viene del inventario:

### 5.1 Columna "Color" no coincide con el nombre del producto

| Fila | Nombre dice | Columna Color dice | Problema |
|---|---|---|---|
| BRA-004 | "Bra BEIGE S REF 011473" | **BLANCO** | Mismatch — ¿es beige o blanco? |
| BRA-006 | "Bra BEIGE 36 B REF 011473" | **BERDE** | Mismatch + typo (verde) |
| BRA-007 | "Bra BEIGE 36 B REF 011473" | **GRIS** | Mismatch — ¿es beige o gris? |

**Acción:** revisar cada SKU y corregir **O el nombre O la columna color** (elegir cuál es el real). El pipeline IA toma la columna color como fuente de verdad, así que si la columna está mal, la IA va a pintar el color equivocado.

### 5.2 Typo "BERDE" en lugar de "VERDE"

Aparece varias veces en el docx. El pipeline ya lo traduce como "verde" automáticamente, pero para que el catálogo final se vea profesional, mejor corregirlo en el docx directamente.

### 5.3 REFs con "P" al principio

**P81151** y **P81155** usan prefijo P. El pipeline también los detecta pero hay que confirmar que son REFs reales y no un error de tipeo.

---

## 6. Lo que hago yo en el código con esta data

### ✅ Ya funciona automáticamente:
1. Detección de ángulo del filename (delante/patras/back/front/etc.)
2. Detección de color del filename (15 colores + sinónimos)
3. Detección de REF (número de 4-7 dígitos)
4. Corrección automática de typos comunes (berde → verde, nude → beige)
5. Agrupación visual por REF en la UI
6. Modelo IA compartida entre variantes de color de la misma REF (ahorra $0.055 por variante)
7. Foto de espalda real usada como referencia cuando existe (no inventada)
8. Botón "Iniciar Pipeline" procesa todo lo subido

### 🟡 Lo que voy a agregar (te aviso cuando termine):
- Endpoint `/api/inventory/scan-bras` que lee automáticamente `docs/inventory-final/images/bras/`
- Botón **"Cargar inventario"** en `/pipelines/lingerie` que llena la grilla con 1 click en vez de arrastrar archivos
- Tabla de REFs priorizada (top 6 primero)
- Stimado de costo total por batch antes de correr

---

## 7. ⚠️ Pregunta técnica importante que no resolví todavía: la talla

**Lo que tu mamá dijo:** "por cada talla, la modelo se tiene que ver un poquito más gorda, un poquito más flaca, obviamente".

**Tiene razón.** Hoy el pipeline usa 1 sola `modelConfig` para todo el batch (gender, skinTone, bodyType, ageRange). No varía por talla.

Las tallas en el catálogo van de:
- **32B** (más pequeña) → modelo `slim`
- **34B, 36B** (mediana) → modelo `average`
- **38B, 38C, 40B, 40C** (más común, ~60% del catálogo) → modelo `curvy` (actual default)
- **42D, XXL** (más grande) → modelo `plus-size` o `full-figured`

**Cómo lo voy a resolver (próxima sesión):**
1. El pipeline detectará la talla del SKU o del nombre
2. Mapeará automáticamente el `bodyType`:
   - 32-34 → `slim`
   - 36 → `average`
   - 38 → `curvy`
   - 40+ → `full-figured`
3. Para las 77 SKUs, se generarán **varias modelos IA distintas** (una por rango de talla), pero cada una reusada entre SKUs del mismo rango (ahorra dinero).

**Mientras tanto:** si querés que salga bien, podés correr el pipeline manualmente **una vez por rango de talla**, cambiando el bodyType entre corridas. Es manual pero funciona.

---

## 8. Resumen de pedidos concretos para mamá

| # | Qué hacer | Prioridad | Quién |
|---|---|---|---|
| 1 | Fotografiar REFs sin fotos: 011977, 091022, P81151 (altos en stock) | 🔴 ALTA | Mami + Angely |
| 2 | Marcar "no disponible" en web: 011885, 011898, 011979, 011981, 011985, 71280, 71333, 71338, P81155 | 🟡 MEDIA | Maria |
| 3 | Renombrar archivos de `bras/71321/` al formato `bh <color> <vista> <ref>.png` | 🔴 ALTA | Mami / Angely |
| 4 | Arreglar Color column en docx: BRA-004, BRA-006, BRA-007 | 🟡 MEDIA | Mami en Excel/Word |
| 5 | Corregir "BERDE" → "VERDE" en docx | 🟢 BAJA | Mami |

### Cuando mami termine los pedidos 1 y 3, avisame y vuelvo a correr el scan. Los REFs 2 y 5 son cosméticos (el pipeline los maneja pero queda más profesional).

---

## 9. Dónde están todos estos documentos

```
docs/
├── inventory-fixes-for-mom.md        ← ESTE ARCHIVO
├── inventory-final/
│   ├── README.md                      ← Resumen general del inventario (todas las categorías)
│   ├── RESUMEN_CORTO.md               ← Versión 1 pantalla
│   ├── AUDIT_ESTATICOS.md             ← Para el pipeline de perfumes/cremas (no aplica a BH)
│   ├── FLUJO_POR_PRODUCTO.md          ← Flujo por tipo de producto
│   ├── catalogos/
│   │   └── Copia_de_CATALOGO_BH_FINAL.md  ← El Word convertido a texto
│   └── images/bras/<REF>/             ← Las fotos agrupadas por REF
├── pendientes.md                      ← Todo lo que falta del pipeline
└── ux-research-2026-04-22.md          ← Investigación de competidores
```

---

**Cuando tu mamá pregunte qué hacer, mostrale este archivo. Los items con 🔴 son los urgentes.**
