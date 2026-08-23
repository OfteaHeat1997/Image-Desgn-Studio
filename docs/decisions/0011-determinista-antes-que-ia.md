# ADR-0011 — Sharp y ffmpeg antes que IA cuando el resultado es determinista

- **Estado:** Aceptado
- **Fecha:** 2026-08-10
- **Decide:** Paula Salazar
- **Afecta a:** módulos Enhance, Shadows, Macro Crop, Social Kit; pipeline de Estáticos

## Contexto

En un proyecto cuyo valor es "IA aplicada a fotografía de producto", la tentación por defecto es resolver **cada** paso con un modelo. Es más vistoso y se escribe más rápido.

Pero varios pasos del sistema tienen una respuesta **exacta y calculable**: recortar una región macro, poner un fondo blanco liso, componer un carrusel de Instagram, ajustar brillo y contraste, generar una sombra de contacto. Para todos ellos existe una operación determinista con la respuesta correcta.

Usar un modelo generativo ahí no solo es caro: es **peor**, porque introduce variabilidad donde no debería haberla y arriesga la fidelidad que protege [ADR-0004](0004-segmentacion-sobre-generacion.md).

## Decisión

> Si el resultado se puede **calcular**, se calcula. La IA se reserva para lo que no se puede calcular.

| Operación | Implementación | Costo |
|---|---|---|
| Fondo blanco (estáticos) | **Sharp** | $0 |
| Enhance (color, brillo, contraste — 10 presets) | **Sharp** | $0 |
| Sombras drop / contact / reflection | **Sharp** | $0 |
| Detalle macro (recorte) | **Sharp** | $0 |
| Kit de Instagram / carrusel | **Sharp + ffmpeg** | $0 |
| Composición sobre fondo generado | **Sharp** | $0 |

La regla más fuerte de las tres es la de **Estáticos**: el fondo se genera con Flux, pero el **producto nunca pasa por el modelo**. Se compositea el píxel original sobre el fondo generado. Etiqueta, vidrio y color quedan idénticos, y eso es una garantía verificable, no una esperanza.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Un modelo generativo para el fondo blanco | Cuesta dinero, tarda 30 s y **re-dibuja el producto**. Sharp da el resultado exacto en milisegundos por $0. |
| Un modelo de video para el reel de fotos | Un modelo de video *interpreta* el movimiento. Un carrusel de fotos es una operación determinista: ffmpeg da exactamente el resultado pedido. |
| Kontext Pro para poner fondo y sombra a un producto rígido | Lo re-dibuja. Rompe [ADR-0004](0004-segmentacion-sobre-generacion.md). |

## Consecuencias

**Positivas**

- **Coste $0** en una parte grande del trabajo por imagen.
- **Latencia de milisegundos** en vez de decenas de segundos.
- **Reproducible:** la misma entrada da siempre la misma salida. Se puede probar con aserciones normales, sin evaluación humana.
- **Fidelidad garantizada por construcción**, no por prompt.

**Negativas / costo asumido**

- El resultado es *correcto*, no *creativo*. Una sombra de Sharp es geométricamente exacta; una sombra de IA puede quedar más bonita en una escena compleja. Por eso el módulo Shadows conserva un modo `ai-relight` como opción explícita.
- Sharp y ffmpeg son dependencias nativas con sus propias particularidades de despliegue.
- Requiere resistir la tentación en cada paso nuevo. Es una decisión que hay que **volver a tomar** cada vez.

## Evidencia

- **2026-08-10** (`37159a3`) — *fix(static-product): el vertical daba timeout por un recorte que ya estaba hecho.* Un paso caro repetía trabajo determinista ya realizado. El arreglo fue **quitar** trabajo, no añadir potencia.
- **2026-08-10** (`215668a`) — *fix(joyería): el reel ya no puede tumbar el carrusel.* Se aisló el paso generativo (reel) para que no arrastrara al determinista (carrusel) al fallar.
- Tabla de costes de `docs/providers.md` §4: macro crop, kit social y fondo blanco figuran en **$0**, frente a $0.003–$0.35 de sus equivalentes generativos.
