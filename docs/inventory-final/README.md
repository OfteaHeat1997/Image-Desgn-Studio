# Inventario Final Unistyles — Estado Real Abril 2026

> **Para qué sirve este doc:** Es la fuente de verdad del inventario DESPUÉS de que tu mamá y Angely hicieron la limpieza (mamá borró rows, Angely marcó en rojo → los rojos ya están fuera de los docx). Este README reemplaza los conteos viejos de `docs/inventory.md` para las 7 categorías que recibieron update.
>
> **Creado:** 2026-04-23
> **Fuente:** 6 docx + 5 zips en `C:\Users\maria\Pictures\Inventory Unistyles images\`
> **Archivos derivados en este folder:**
> - `catalogos/*.md` — cada Word convertido a markdown legible
> - `images/<categoría>/` — todas las imágenes finales extraídas
> - `_raw_products.json` — lista completa estructurada (para scripts)
> - `RESUMEN_CORTO.md` — versión para leer en el teléfono
> - `AUDIT_ESTATICOS.md` — auditoría del pipeline Estáticos
> - `FLUJO_POR_PRODUCTO.md` — step-by-step por tipo de producto (estilo Lencería)

---

## 1. Resumen numérico (qué sobrevivió al filtro familia)

| Categoría | Pipeline destino | Productos final | Productos antes (`docs/inventory.md`) | Δ | Imágenes en zip | Cobertura |
|---|---|---:|---:|---:|---:|---|
| BH (Bras) | Lencería | **77** | 77 | = | 128 | ✅ 31 REF con fotos por color |
| Pantys | Lencería | **72** | 72 | = | 0 | ❌ **falta zip** |
| Colonias (Perfumes) | Estáticos | **139** | 146 | −7 | 0 | ❌ **falta zip** |
| Cremas | Estáticos | **52** | 49 | +3 | 32 | ⚠ 20 productos sin foto |
| Bloqueador | Estáticos | **15** | 11 | +4 | 10 | ⚠ 5 sin foto |
| Limpieza Facial | Estáticos | **6** | 6 | = | 2 | ⚠ 4 sin foto |
| Desodorantes | Estáticos | **~28** (sin docx update) | 28 | ? | 27 | ✅ cobertura alta, falta docx |
| Shapewear | Lencería | 15 (sin cambio) | 15 | = | n/a | n/a |
| Joyería | Joyería | 82 (sin cambio) | 82 | = | n/a | n/a |
| **TOTAL** | | **486** | **486** | — | **199** | — |

**Cambios netos:**
- 7 perfumes eliminados (posiblemente agotados o descontinuados)
- 3 cremas añadidas (ampliación de línea)
- 4 bloqueadores añadidos (probablemente los compactos Yanbal de colores nude/beige claro/oscuro)
- Pantys, BH y Limpieza Facial sin cambio numérico (revisión visual de fotos nuevas sí aplicó)

---

## 2. Gaps bloqueantes para empezar producción

| # | Bloqueador | Impacta | Qué pedir a mamá/Angely |
|---|---|---|---|
| 1 | **No hay zip de COLONIAS** | 139 perfumes no tienen imagen nueva | Zipear `CATALOGO_COLONIAS/` con las fotos limpias actualizadas |
| 2 | **No hay zip de PANTYS** | 72 pantys no tienen imagen nueva | Zipear `CATALOGO_PANTYS/` con las fotos finales |
| 3 | **No hay docx actualizado de DESODORANTES** | 27 imgs sin catálogo — SKUs ambiguos | Crear `CATALOGO_DESODORANTES_UPDATED.docx` formato igual al de bloqueador |
| 4 | **Limpieza facial solo 2 imgs para 6 SKUs** | 4 productos no procesables | Foto faltante de: LF-LB01, LF-LB03, LF-LB04, LF-ES02 |
| 5 | **Bloqueador 10 imgs para 15 SKUs** | 5 SKUs huérfanos | Fotos de los 5 compactos Yanbal que no estén en el zip actual |
| 6 | **Cremas 32 imgs para 52 SKUs** | 20 sin foto | Revisar cuáles SKUs no tienen imagen en el zip y fotografiarlos |

Sin resolver 1–3 no se puede procesar 238 productos (139 perfumes + 72 pantys + 27 desodorantes sin SKU claro). Son el 49% del inventario total.

---

## 3. Detalle por categoría

### 3.1 BH (Bras) — Pipeline Lencería ✅
**Catálogo:** `catalogos/Copia_de_CATALOGO_BH_FINAL.md` — 77 productos Leonisa
**Imágenes:** `images/bras/` — 128 archivos organizados por REF (`011473/`, `011654/`, …)
**31 referencias únicas** cada una con varias variantes color/talla. Precio rango $110 XCG.

REFs con más variantes: 011473 (6), 011843 (n), 011911 (n), 091032, 091044, 71321, 71332, 91030…

### 3.2 Pantys — Pipeline Lencería ⚠️ pendiente zip
**Catálogo:** `catalogos/CATALOGO_PANTYS_FINAL.md` — 72 productos Leonisa
**Imágenes:** ❌ NO extraídas (falta zip)
Tallas S/M/L/XL. Precio $19 XCG. Grupos: HD_PANTY, Tanga Algodón (REF 012632, 012633), Tiro Alto Algodón (REF 207 con 14 colores), Tiro Alto Lycra (REF 1255, 0118).

### 3.3 Colonias — Pipeline Estáticos ⚠️ pendiente zip
**Catálogo:** `catalogos/CATALOGO_COLONIAS_UPDATED.md` — 139 productos
**Imágenes:** ❌ NO extraídas (falta zip)
Marcas: **Cyzone (41)** COL-CY01..41, **Esika (45)** COL-ES01..45, **L'Bel (19)** COL-LB01..19, **Yanbal (34)** COL-YB01..34.
Rango precios: XCG 25–140 (variable por tamaño/línea premium).

### 3.4 Cremas — Pipeline Estáticos ⚠️ cobertura parcial
**Catálogo:** `catalogos/CATALOGO_CREMAS_UPDATED.md` — 52 productos
**Imágenes:** `images/cremas/` — 32 archivos (20 SKUs huérfanos)
Marcas: Avon (4), Cyzone (1), Esika (16), L'Bel (10), Salome (1), **Yanbal (20)**.
SKUs CRM-001..052 correlativo.

### 3.5 Bloqueador — Pipeline Estáticos ⚠️ cobertura parcial
**Catálogo:** `catalogos/CATALOGO_BLOQUEADOR_UPDATED.md` — 15 productos
**Imágenes:** `images/bloqueador/` — 10 archivos (5 SKUs huérfanos)
Marcas: Esika (2), L'Bel (1), **Yanbal (12)** dominante.
SKUs BLQ-001..015. Precios XCG 30–120 (compactos caros, spray medio).

### 3.6 Limpieza Facial — Pipeline Estáticos ⚠️ cobertura baja
**Catálogo:** `catalogos/CATALOGO_LIMPIEZA_FACIAL_UPDATED.md` — 6 productos
**Imágenes:** `images/limpieza-facial/` — solo 2 archivos (4 huérfanos)
Marcas: Esika (2), L'Bel (4). SKUs LF-ES01, LF-ES02, LF-LB01..04.

### 3.7 Desodorantes — Pipeline Estáticos ⚠️ sin docx actualizado
**Catálogo:** NO existe docx actualizado. Usar `docs/inventory.md` (28 productos) hasta que mamá cree uno.
**Imágenes:** `images/desodorantes/` — 27 archivos con nombres como "AROM ABSOLUTE", "Ccori Oro", "DORSAY", "OHM", "OSADIA", "CHICS", "extreme", etc.
**Problema conocido:** varias imágenes se COMPARTEN con perfumes (DORSAY, GAIA, OHM, OSADIA, ZENTRO) — el pipeline debe forzar productType:deodorant antes de aplicar matriz de marca.

---

## 4. Mapeo folder → pipeline (auto-ruteo)

Estos paths nuevos reemplazan los de `docs/inventory.md` para las categorías actualizadas:

```
docs/inventory-final/images/bras/<REF>/*.png          → pipeline Lencería, garmentType:bra
docs/inventory-final/images/cremas/*.jpg              → pipeline Estáticos, productType:cream
docs/inventory-final/images/bloqueador/*.jpg|.png     → pipeline Estáticos, productType:sunscreen
docs/inventory-final/images/desodorantes/*.jpg|.png   → pipeline Estáticos, productType:deodorant
docs/inventory-final/images/limpieza-facial/*.jpg     → pipeline Estáticos, productType:facial
```

Para que `/api/inventory/scan` los recoja automáticamente, hay que:
1. O mover estas imágenes a `unistudio/public/images/<categoría>/` (respeta límite Vercel 10MB → riesgoso con 128 imgs de BH)
2. O actualizar `/api/inventory/scan` para leer de `docs/inventory-final/images/` (recomendado, respeta `.vercelignore`)

---

## 5. Qué falta comparado con el plan ideal (post-MVP)

Ver `AUDIT_ESTATICOS.md` para el detalle de pipeline. En una línea: **el pipeline Estáticos tiene MVP funcional pero le faltan 5 cosas que Lencería sí tiene**: persistencia de seed por marca, batch real desde folder, UI per-step igual a Lencería, troubleshooting detectado por vision, reuso de fondo generado entre SKUs.

---

## 6. Próximos pasos sugeridos (orden)

1. **Pedir** a mamá los zips faltantes (colonias + pantys) y el docx de desodorantes.
2. **Fotografiar** los 29 SKUs huérfanos (4 limpieza + 5 bloqueador + 20 cremas).
3. **Actualizar** `/api/inventory/scan` para que lea de `docs/inventory-final/images/`.
4. **Implementar mejoras** del `AUDIT_ESTATICOS.md` (sprint de ~2 commits).
5. **Probar batch** de 10 cremas con pipeline Estáticos → validar cohesión visual del catálogo.
6. **Escalar** al batch completo por categoría una vez validado.

---

## 7. Ver también

- `RESUMEN_CORTO.md` — versión que cabe en un mensaje
- `AUDIT_ESTATICOS.md` — qué le falta al pipeline y cómo arreglarlo
- `FLUJO_POR_PRODUCTO.md` — step-by-step por tipo (perfume/crema/bloqueador/desodorante/facial/maquillaje)
- `catalogos/*.md` — el texto completo de cada catálogo Word
- `docs/pipelines/static-product.md` — doc actual del pipeline (esta sería la que hay que actualizar si se aprueban las mejoras)
- `docs/inventory.md` — doc legacy, mantener pero marcar que para las 7 cats actualizadas este README es la fuente de verdad
