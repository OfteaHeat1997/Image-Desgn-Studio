# ADR-0006 — Leffa queda descartado para la vista trasera; se usa FASHN maskless

- **Estado:** Aceptado
- **Fecha:** 2026-08-09
- **Decide:** Paula Salazar
- **Afecta a:** `/api/pipelines/lingerie` paso 4 (foto de espalda), `/api/tryon/async`

## Contexto

Leffa (`fal-ai/leffa/virtual-tryon`) funciona muy bien para la vista **lateral**: hace *warp* de la prenda real en vez de re-dibujarla, que es justo lo que pide [ADR-0004](0004-segmentacion-sobre-generacion.md). La conclusión intuitiva era usarlo también para la vista **trasera**.

No funcionó. Y la pregunta importante no era *"¿qué parámetro hay que ajustar?"* sino *"¿es esto ajustable siquiera?"*.

## Decisión

**Leffa no puede producir una vista trasera. La limitación es estructural, no de configuración.** Queda prohibido reintentarlo.

La cadena de causas, verificada:

1. La máscara de Leffa es el `AutoMasker` de CatVTON, que trata **el pelo como región protegida**.
2. En una modelo de espaldas, el pelo cae **justo sobre el cruce de tirantes**.
3. Esa zona se copia del original → **nunca puede recibir tela**.
4. Además, VITON-HD y DressCode — sus datasets de entrenamiento — son **solo frontales**.
5. El endpoint de fal **no expone** `mask`, `vt_repaint` ni `vt_model_type`: **no hay perilla que girar.**

El paso 4 usa **FASHN v1.6 maskless** (`segmentation_free: true`), $0.075.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Subir `guidance_scale` / `num_inference_steps` en Leffa | El problema es **qué región puede pintar**, no con cuánta fuerza pinta. |
| Prompt engineering en el paso 4 con Leffa | Leffa **no recibe texto**. Solo dos URLs y `garment_type`. |
| IDM-VTON / CatVTON para vista trasera | Mismo linaje VITON-HD → mismo fallo frontal-only. CatVTON además es research-only. |
| FASHN con `segmentation_free: false` | Probado el 2026-08-10: **el paso dejó de devolver imagen**. Revertido (`b9c6a36`). |

## Consecuencias

**Positivas**

- Cierra una línea de investigación que ya había consumido varias sesiones. El coste de *no* escribir esto es volver a probarlo dentro de tres meses.
- Establece un patrón de diagnóstico reutilizable: antes de ajustar parámetros, **comprobar si el modelo puede siquiera expresar el resultado deseado**. Si la máscara no puede pintar la región, ningún parámetro la hará pintar.

**Negativas / costo asumido**

- FASHN maskless es **casi el doble de caro** que Leffa ($0.075 vs $0.04).
- **Defecto conocido que sigue abierto:** con `segmentation_free: true` aparece una **mancha blanca** en el resultado. No es una alucinación del modelo — es el **top blanco del avatar de Uwear**, que viene vestido. FASHN hace exactamente lo que promete: viste *encima* sin quitar la ropa existente. Como la foto de espalda suele ser un 3/4 girado y el avatar está de espaldas rectas, la silueta no calza y el top asoma por un costado.
  **El arreglo correcto no pasa por esa bandera**: hay que **recortar el cutout al bounding box de la prenda** antes del warp. Pendiente.
- **El badge de proveedor miente.** `tryon/async/route.ts:208` devuelve `provider: 'leffa'` hardcodeado incluso cuando el motor que corrió fue FASHN — exactamente el patrón de *sustitución silenciosa de proveedor* que el resto del proyecto combate. Arreglo conocido: `provider: useFashn ? 'fashn' : 'leffa'`. Pendiente.

## Evidencia

- **2026-08-09** — análisis de causa raíz del `AutoMasker` de CatVTON y de los datasets VITON-HD / DressCode. Registrado en `docs/providers.md` §3.3 ronda 3 y en `docs/pipelines/lingerie-root-cause.md`.
- **2026-08-10** (`b9c6a36`) — *revert(lingerie): `segmentation_free` vuelve a `true` — el Paso 4 dejó de dar resultado.*
- **2026-08-10** (`f97d0ea`) — *fix(lingerie): la mancha blanca del Paso 4 era la ropa del avatar.* Diagnóstico confirmado.
