# Architecture Decision Records (ADR)

> **Tipo Diátaxis:** *Explanation* — explica **por qué** el sistema es como es. No enseña a usarlo (eso es `docs/tutorials/`) ni describe cómo funciona (eso es `docs/reference/`).

Un **ADR** es un registro corto e inmutable de una decisión técnica importante: el contexto en que se tomó, la decisión, las alternativas descartadas y las consecuencias. El formato es [MADR](https://adr.github.io/madr/) (*Markdown Any Decision Record*).

## Por qué existen en este proyecto

UniStudio depende de **8 proveedores de IA externos** cuyo comportamiento no se puede deducir leyendo el código. Un `fetch` a `fal-ai/leffa/virtual-tryon` no dice que Leffa es *estructuralmente incapaz* de hacer una vista trasera, ni que eso ya se probó y costó tres sesiones descubrirlo.

Sin ADRs, esa información sobrevive solo en la memoria de quien la vivió. Con ADRs, la regla se vuelve:

> Un proveedor descartado **sin** explicación escrita se vuelve a probar dentro de tres meses.
> Un proveedor descartado **con** la razón medida, no.

## Ciclo de vida de un ADR

| Estado | Significa |
|---|---|
| `Propuesto` | Escrito, aún no aplicado en código |
| `Aceptado` | Vigente. El código lo refleja hoy |
| `Reemplazado por ADR-XXXX` | Ya no vale. **No se borra** — el historial es el valor |
| `Descartado` | Se evaluó y se decidió no hacerlo |

**Un ADR aceptado nunca se edita ni se borra.** Si la decisión cambia, se escribe uno nuevo que lo reemplaza. Eso es lo que convierte la carpeta en una línea de tiempo de razonamiento y no en un documento más que se pudre.

## Índice

| ADR | Decisión | Estado | Fecha |
|---|---|---|---|
| [0001](0001-monolito-modular.md) | Monolito modular en Next.js App Router, no microservicios | Aceptado | 2026-04-12 |
| [0002](0002-base-de-datos-opcional.md) | PostgreSQL es opcional: la app funciona sin base de datos | Aceptado | 2026-04-12 |
| [0003](0003-tres-pipelines-canonicos.md) | Exactamente tres pipelines, prohibido crear un cuarto | Aceptado | 2026-04-20 |
| [0004](0004-segmentacion-sobre-generacion.md) | Segmentación por encima de generación para preservar el producto | Aceptado | 2026-06-13 |
| [0005](0005-uwear-tryon-lenceria.md) | Uwear.ai como motor de try-on por defecto en lencería | Aceptado | 2026-08-08 |
| [0006](0006-leffa-descartado-vista-trasera.md) | Leffa descartado para la vista trasera | Aceptado | 2026-08-09 |
| [0007](0007-birefnet-aislar-joyeria.md) | BiRefNet para aislar joyería | Aceptado | 2026-08-09 |
| [0008](0008-photoroom-virtual-model-descartado.md) | Photoroom Virtual Model descartado | Descartado | 2026-08-08 |
| [0009](0009-claude-vision-anclaje-fidelidad.md) | Claude Vision como anclaje de fidelidad en todo proveedor con texto | Aceptado | 2026-08-08 |
| [0010](0010-vercel-blob-almacenamiento.md) | Vercel Blob como almacenamiento durable; prohibido base64 en la DB | Aceptado | 2026-08-09 |
| [0011](0011-determinista-antes-que-ia.md) | Sharp y ffmpeg antes que IA cuando el resultado es determinista | Aceptado | 2026-08-10 |

## Cómo escribir uno nuevo

1. Copia [`_template.md`](_template.md).
2. Numéralo con el siguiente correlativo. **Los números no se reciclan.**
3. Escríbelo **en el mismo commit** que el cambio de código que lo implementa.
4. Agrega la fila a este índice.

Regla mínima de calidad: si la sección **Evidencia** está vacía, no es un ADR — es una opinión. Un ADR de proveedor sin fecha y resultado medido no se acepta.
