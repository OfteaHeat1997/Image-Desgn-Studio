# ADR-0008 — Photoroom Virtual Model queda descartado; Photoroom se limita a ghost mannequin y estáticos

- **Estado:** Descartado (la *feature* de Photoroom, no el proveedor)
- **Fecha:** 2026-08-08
- **Decide:** Paula Salazar
- **Afecta a:** `src/lib/api/photoroom.ts`, `/api/photoroom-virtualmodel`, `/api/photoroom-check`

## Contexto

Photoroom Plus (€100/mes) incluye **Virtual Model**: generar una modelo vistiendo el producto en una sola llamada. Sobre el papel resolvía el paso más caro y más frágil del pipeline de lencería ([ADR-0005](0005-uwear-tryon-lenceria.md)) por menos dinero.

La decisión a tomar era binaria y cara: **¿se paga el plan Plus o no?** Así que la evaluación se hizo en sandbox antes de pagar.

## Decisión

**Virtual Model queda descartado con prueba. No volver a intentarlo.**

Photoroom **sí se queda** en el proyecto, pero limitado a dos usos donde está probado:

| Función | Estado |
|---|---|
| **Ghost Mannequin** (`/v2/edit` + `ghostMannequin.mode=ai.auto`) | **Probado, funciona.** Devuelve el producto flotando en 3D sobre blanco. Es el único paso que recibe bien la ficha de Claude Vision |
| **Recorte + fondo + sombra** (estáticos) | **Funciona.** Una sola llamada de $0.10 reemplaza 2-3 pasos de Sharp/Flux |
| Virtual Model | **Descartado** |
| Video | **No existe.** Confirmado en su documentación |

## Alternativas consideradas — el diseño del experimento

Se probaron **cuatro variables** de forma sistemática antes de decidir:

| Variable | Valores probados | Resultado |
|---|---|---|
| Color del producto | negro, beige | **500** en los dos |
| Pose | `standing`, `random` | **500** en las dos |
| Presets | `ava`+`studio`, `avery`+`street` (los del ejemplo **oficial**) | **500** en los dos |
| Modo | sandbox y cuota real | **500** en los dos |

Error siempre idéntico y genérico:
`500 {"error":{"message":"An error occurred during Virtual Model processing"}}`

**Test de control:** ghost mannequin en el **mismo** sandbox devolvió imagen correcta → el sandbox no era la causa. Sin ese control, el descarte no habría sido concluyente.

## Consecuencias

**Positivas**

- **Se evitó pagar €100/mes** por una función que no responde. El experimento costó $0: se hizo en sandbox.
- Photoroom queda con un alcance definido y probado en vez de una expectativa difusa.
- El diseño del experimento (variar una variable a la vez + test de control) queda como plantilla para evaluar cualquier proveedor nuevo.

**Negativas / costo asumido**

- El paso de try-on sigue costando ~$0.20 con Uwear.
- Queda **una hipótesis viva sin probar**: la API documenta `virtualModel.additionalProductImages[]` y `virtualModel.prompt`, que la prueba no incluyó. Pero como falló incluso con los presets del **ejemplo oficial**, la explicación más probable es que la feature estuviera caída o bloqueada para esta cuenta, no que faltara un parámetro. **Prioridad baja.** Si algún día se reintenta: sandbox primero, y **máximo 3 llamadas**.

## Precios verificados (2026-08-14)

| Plan | Suscripción | Por llamada | Incluye |
|---|---|---|---|
| **Basic** | €20/mes | $0.02/img | **Solo** Remove Background. **No** incluye ghost mannequin |
| **Plus** | €100/mes | **$0.10 plana** | Image Editing API: ghost mannequin, Virtual Model, flat lay, fondos IA, sombras IA, relighting |
| Enterprise | Anual | Volumen | Mínimo 200.000 img/año |

Dos matices que cambian la economía:

1. **$0.10 es por LLAMADA, no por operación.** Recorte + fondo + sombra en una sola llamada = $0.10 total. Por eso conviene en estáticos.
2. **Sandbox: 1.000 llamadas/mes gratis** (máx. 100/día) con marca de agua, misma key con prefijo `sandbox_`. **Es la forma de iterar sin gastar** — y es lo que permitió que este ADR costara $0.

**Corrección a un comentario del código:** `photoroom.ts` dice *"el plan de la usuaria es una prueba de 10 imágenes/mes"*. Las 10 llamadas gratis de producción son solo del **Remove Background API**, no del Image Editing API donde vive ghost mannequin. Sin plan Plus, ghost mannequin en producción **no existe** — solo sandbox con marca de agua. **No hay rollover:** lo no usado se pierde cada mes.

## Evidencia

- **2026-08-08** — matriz completa de 4 variables + test de control, en `docs/providers.md` §3.2.
- **2026-08-14** — precios verificados contra la web de Photoroom.
