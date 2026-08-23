# ADR-0003 — Exactamente tres pipelines canónicos, prohibido crear un cuarto

- **Estado:** Aceptado
- **Fecha:** 2026-04-20
- **Decide:** Paula Salazar
- **Afecta a:** `src/app/pipelines/`, `src/app/api/pipelines/`

## Contexto

El catálogo de Unistyles tiene **486 productos en 9 categorías** (`docs/inventory.md`). Cada categoría necesita un tratamiento fotográfico distinto: un bra se fotografía *puesto sobre un cuerpo*, un perfume *apoyado en una superficie*, un anillo *en macro y sobre una mano*.

El patrón de fallo natural es predecible y ya había empezado a ocurrir: aparece una categoría nueva → se copia el pipeline más parecido → se le cambian dos pasos. A los seis meses hay ocho pipelines, seis con el mismo bug corregido en cinco sitios y sin corregir en el sexto.

## Decisión

Existen **tres** pipelines, y su criterio de división no es el producto sino **la física de la toma**:

| Pipeline | Criterio de pertenencia | Productos | Ruta API |
|---|---|---:|---|
| **Lencería** | El producto se lleva **puesto** sobre un cuerpo | 164 | `/api/pipelines/lingerie` |
| **Estáticos** | El producto es **rígido y se apoya** en una superficie | 240 | `/api/pipelines/static-product` |
| **Joyería** | El producto es **pequeño y reflectante**, se lleva sobre una parte del cuerpo | 82 | `/api/pipelines/jewelry` |

**Total: 486 = 100% del inventario.**

Reglas derivadas, todas de cumplimiento obligatorio:

1. Un producto nuevo **entra en uno de los tres** o los tres se rediseñan. Nunca se bifurca.
2. Ningún paso se duplica entre pipelines. La lógica compartida vive en un **módulo** (`/api/<módulo>`).
3. Un pipeline **orquesta** módulos vía `fetch`. Tiene prohibido llamar a fal, Replicate o Anthropic directamente.
4. Si un commit crea un pipeline, **borra su duplicado en el mismo commit**.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| **Un pipeline por categoría de producto** (9) | Nueve copias del mismo bug. La categoría comercial no predice el tratamiento fotográfico: bras y fajas son categorías distintas y exactamente la misma física. |
| **Un pipeline genérico configurable** | La matriz de configuración se vuelve más compleja que los tres pipelines juntos y ningún caso queda bien resuelto. Los pasos no son intercambiables: un try-on no significa nada para un perfume. |
| **Sin pipelines, solo módulos sueltos** | Es de donde venimos. Obliga al usuario a saber qué módulo va después de cuál — que es exactamente el conocimiento que queremos encapsular. |

## Consecuencias

**Positivas**

- Un arreglo de fidelidad se aplica en **un** sitio por física de toma, no en nueve.
- El enrutado desde la carpeta de inventario es determinista: la categoría implica el pipeline.
- El límite es **falsable**: si un producto no encaja en ninguno de los tres, eso es señal de rediseño, no permiso para bifurcar.

**Negativas / costo asumido**

- La regla se sostiene con **disciplina, no con tipos**. Nada impide técnicamente crear un cuarto pipeline.
- Los casos frontera cuestan discusión: el *swimwear* entra en Lencería por física (se lleva puesto), aunque comercialmente sea otra categoría.
- Un cambio en un módulo compartido puede afectar a tres pipelines a la vez. Es el precio de no duplicar, y se paga con pruebas en los tres.

## Evidencia

- `docs/pipelines/README.md` documenta la consolidación: las rutas duplicadas se eliminaron al introducir los pipelines canónicos.
- La regla está escrita en `CLAUDE.md` como restricción de proyecto y se ha respetado desde 2026-04-20 hasta hoy: siguen siendo tres.
