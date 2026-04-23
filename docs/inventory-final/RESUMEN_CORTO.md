# Resumen corto — Inventario Unistyles Abril 2026

*(Para leer en el teléfono o mandar por texto. Detalle completo en `README.md`.)*

## Qué pasó
Mamá borró rows + Angely marcó en rojo → todo lo que NO está en los docx/zips fue eliminado del inventario.

## Conteo final (7 categorías actualizadas)

```
BH Leonisa .............. 77 productos ✅ 128 fotos
Pantys Leonisa .......... 72 productos ❌ FALTA ZIP
Colonias (perfumes) .... 139 productos ❌ FALTA ZIP
Cremas .................. 52 productos ⚠ 32 fotos (20 sin foto)
Bloqueador .............. 15 productos ⚠ 10 fotos (5 sin foto)
Limpieza facial .......... 6 productos ⚠  2 fotos (4 sin foto)
Desodorantes ............ ~28 productos ⚠ 27 fotos SIN docx updated
```

**Sin cambio vs anterior:** Shapewear (15), Joyería (82).
**Total inventario:** 486 productos (igual).

## Lo que bloquea empezar estáticos

1. **Falta zip de colonias** (139 perfumes sin imagen nueva)
2. **Falta docx actualizado de desodorantes** (27 imgs sin SKU claro)
3. **Faltan fotos de 29 productos huérfanos** (4 limpieza + 5 bloqueador + 20 cremas)

## Lo que bloquea empezar lencería

1. **Falta zip de pantys** (72 pantys sin imagen nueva)

## Pipeline Estáticos actual
✅ Matriz de fondo por tipo+marca ya funciona (perfume/crema/bloqueador/desodorante/facial/maquillaje × premium/juvenil/clásico).
⚠ Le falta: batch real desde folder, reuso de seed por marca, UI per-step como Lencería. Ver `AUDIT_ESTATICOS.md`.

## Archivos dejados aquí
- `docs/inventory-final/README.md` → detalle completo
- `docs/inventory-final/catalogos/*.md` → los 6 Word convertidos a texto
- `docs/inventory-final/images/<cat>/` → imágenes limpias extraídas (BH, bloqueador, cremas, desodorantes, limpieza-facial)
- `docs/inventory-final/AUDIT_ESTATICOS.md` → qué arreglar del pipeline
- `docs/inventory-final/FLUJO_POR_PRODUCTO.md` → el flow tipo Lencería, pero para estáticos
- `docs/inventory-final/_raw_products.json` → lista estructurada (para scripts)
