# ADR-0005 — Uwear.ai como motor de try-on por defecto en lencería

- **Estado:** Aceptado
- **Fecha:** 2026-08-08
- **Decide:** Paula Salazar
- **Afecta a:** `/api/pipelines/lingerie` paso 2 (foto frontal), `/api/tryon`, `src/lib/api/uwear.ts`

## Contexto

El paso 2 del pipeline de lencería viste el producto sobre una modelo. Es el paso más caro, el más lento y el que más veces se ha roto del proyecto.

Tiene dos restricciones simultáneas poco comunes:

1. **Contenido íntimo.** La mayoría de APIs de try-on filtran ropa interior por moderación, o la aceptan y devuelven basura.
2. **Fidelidad del producto.** Por [ADR-0004](0004-segmentacion-sobre-generacion.md), ningún generativo preserva un bra atípico. Aquí no queda más remedio que usar uno, así que hay que elegir **el que menos invente**.

Se compararon seis proveedores.

## Decisión

**Uwear.ai** es el motor por defecto del try-on frontal de lencería, con **SeedDream v4 edit** como backup automático.

Cascada: `Uwear` → `SeedDream v4 edit` → `Kolors`.

## Alternativas consideradas

| Proveedor | Permite lencería | Enfoque | Costo | Veredicto |
|---|---|---|---|---|
| **Uwear.ai** | Sí, explícitamente | Generativo dedicado a moda (Qwen Intimate / SeedDream 4.5) | ~$0.20 | **Elegido.** Único que acepta foto **de frente y de espalda** del mismo producto |
| **SeedDream v4 edit** | Sí (`enable_safety_checker: false`) | Editor multi-imagen | $0.03 | **Backup.** Edita en vez de sintetizar → preserva mejor que Kolors |
| **FASHN v1.6** | Sí — `moderation_level: "permissive"` es el default | Warp maskless | $0.075 | Reservado para la vista trasera ([ADR-0006](0006-leffa-descartado-vista-trasera.md)) |
| **Leffa** | Sí | Warp real | $0.04 | Solo lateral. Imposible para la espalda |
| **Kolors** | Sí, pero re-pinta genérico | Generativo | $0.02 | Último recurso |
| **Camclo3D** | No publica | — | — | Descartado: sin API documentada |

**Corrección de una creencia falsa del repo:** durante meses el código asumió que *"FASHN bloquea lencería"*. **Es falso hoy** — `moderation_level: "permissive"` es el valor por defecto y admite ropa interior y swimwear. La creencia venía de una prueba antigua que nunca se re-verificó. Confirmado en la documentación de FASHN, agosto de 2026. Es un buen recordatorio de que **una restricción de proveedor caduca**: hay que fecharla como cualquier otra medición.

## Consecuencias

**Positivas**

- Es el único proveedor que acepta las **dos vistas** del producto (frente y espalda), lo que da más anclaje al modelo y mejora la fidelidad.
- Pay-as-you-go a $0.10/crédito, sin suscripción mensual. Regala 100 créditos al abrir cuenta.
- La cascada garantiza que un fallo de Uwear no tumba el pipeline.

**Negativas / costo asumido**

- **Es el paso más caro del proyecto: ~$0.20 por imagen**, unas 10 veces el coste de Kolors. Domina el coste total del pipeline de lencería (~$0.15 en fotos, ~$0.55 con los dos videos).
- **Errores tragados.** Hoy, cuando Uwear falla, el `catch` solo hace `console.warn` y cae a SeedDream: nunca ves *por qué* falló. Mismo problema en `getUwearAvatarAsset` (`catch { return null }`), que no distingue "no hay avatar" de "la API respondió 401". **Deuda técnica abierta**, registrada en `docs/providers.md` §5.3.
- El avatar de Uwear **viene vestido**, lo que provoca el artefacto de la mancha blanca en el paso de espalda ([ADR-0006](0006-leffa-descartado-vista-trasera.md)).

## Evidencia

- **2026-06-13** — comparativa de 6 proveedores registrada en `docs/providers.md` §3.3, ronda 2.
- **2026-08-08** — coste end-to-end medido sobre el bra `011473`: **~$0.15 solo fotos, ~$0.55 con los dos videos.**
- **2026-08-10** (`982e82c`) — *fix(lingerie): Uwear ahora SÍ recibe la ficha de Claude Vision.* El anclaje textual estaba definido pero no llegaba al proveedor. Ver [ADR-0009](0009-claude-vision-anclaje-fidelidad.md).
