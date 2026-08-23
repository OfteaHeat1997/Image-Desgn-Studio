# ADR-0007 — BiRefNet como proveedor de aislado en el pipeline de joyería

- **Estado:** Aceptado
- **Fecha:** 2026-08-09
- **Decide:** Paula Salazar
- **Afecta a:** `/api/pipelines/jewelry` paso 2, `/api/bg-remove`

## Contexto

La joyería es el caso más duro de segmentación del proyecto: piezas pequeñas, con calados, cadenas finas, superficies reflectantes y bordes que se confunden con el fondo. Un recorte mediocre en un perfume no se nota; en un crucifijo con calado, se nota inmediatamente.

Los rankings públicos de la industria daban ganador a **Bria RMBG 2.0** (~90% de precisión frente al ~85% de las alternativas). La decisión fácil era adoptar el ganador del benchmark general.

En vez de eso se corrió un benchmark propio: **seis proveedores sobre la misma foto** de un rosario.

## Decisión

**BiRefNet** es el proveedor de aislado del pipeline de joyería (~$0.01, vía fal).

## Alternativas consideradas

Benchmark del 2026-08-09, misma foto de rosario en los seis casos:

| Proveedor | Tiempo | Resultado | Veredicto |
|---|---|---|---|
| **BiRefNet** | **1,8 s** | Rosario completo, crucifijo y medalla con textura | **Ganador** |
| Grounded SAM | 78,9 s | Blanquea el crucifijo | Descartado |
| Bria RMBG 2.0 | 4,0 s | No aísla | Descartado |
| rembg | 8,4 s | No aísla | Descartado |
| WithoutBG | — | Cae internamente a rembg | Descartado |
| remove.bg | — | HTTP 400 | Descartado |

BiRefNet gana en las dos dimensiones a la vez: es **44 veces más rápido** que Grounded SAM y es el único que conserva la textura del crucifijo y la medalla.

## Consecuencias

**Positivas**

- Es a la vez el más rápido y el más preciso para este dominio: no hay trade-off que gestionar.
- A ~$0.01 no cambia el perfil de coste del pipeline.
- El benchmark deja escritos **cinco proveedores que no hay que volver a probar** para joyería.

**Negativas / costo asumido**

- El resultado es específico de **joyería**. No se ha demostrado que BiRefNet gane en lencería o en estáticos, donde el cascade sigue siendo distinto.
- Se depende de fal.ai también para este paso, lo que concentra riesgo (ver *Trampa operativa* abajo).

## Evidencia

- **2026-08-09** — benchmark completo en `docs/providers.md` §3.1, con tiempos medidos.
- **2026-08-10** (`5ed2b2c`) — *fix(joyería): el recuadro gris era MI sombra, y ahora está probado.*

## Lección transferible

> Bria gana el benchmark **general** de la industria (90% vs 85%) y **perdió aquí**.
> **La calidad del borde depende del tipo de imagen, no del promedio.**
> Mide con **tu** foto, no con el ranking de un blog.

En términos del DOT Framework esto es una **estrategia de Lab** (experimento controlado, misma entrada, variable única) que contradice la **estrategia de Library** (lo que dice la literatura). Cuando Lab y Library se contradicen sobre tu propio dominio, **gana Lab**.

## Trampa operativa

Si la cuenta de **fal.ai se queda sin saldo**, *todos* los pasos salen en rojo — porque fal no es solo el modelo, es también el **storage de todas las imágenes intermedias**. No es un bug de código. Se recarga en `fal.ai/dashboard/billing`.
