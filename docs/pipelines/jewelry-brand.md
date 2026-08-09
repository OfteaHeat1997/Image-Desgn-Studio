# Unistyles — Dirección visual de Joyería

> **Fuente de verdad de la marca.** Provisto por la usuaria el 2026-08-09.
> Este documento manda sobre cualquier prompt del pipeline. Si un prompt
> contradice algo de acá, el prompt está mal.
>
> Se consume desde `unistudio/src/lib/processing/jewelry-art-director.ts`, donde
> Claude Vision escribe los prompts de cada paso. Editar ese archivo sin leer
> esto es cómo se rompe la coherencia de la categoría.

## Qué es el producto (y qué NO es)

Joyería de **acero inoxidable 316L**, con acabado **PVD 18K** cuando corresponda.

- **No** es bisutería económica.
- **No** es joyería fina de oro macizo.

La presentación tiene que comunicar el valor **real**. Convertir visualmente
acero/PVD en oro macizo es falsear el producto.

La imagen debe transmitir: **elegancia · seguridad · feminidad · modernidad ·
calidad · fuerza**.

## 1. Regla absoluta — no modificar la joya

Con una foto original del producto, **nunca**:

- cambiar diseño, forma o grosor
- agregar o quitar piedras
- cambiar cierres, grabados o texturas
- cambiar el tono real del metal
- convertir acero/PVD en oro macizo
- inventar piezas adicionales
- modificar el logo de Unistyles

Sí se puede mejorar: **fondo, iluminación, sombra, reflejos, composición y
presentación**. Nunca rediseñar el producto.

> La pieza de la foto tiene que ser la pieza que recibe la clienta.

## 2. Paleta

**Usar:** negro elegante, marfil, crema, champagne, beige piedra, reflejos
metálicos, dorado como **acento**.

**Evitar:** neón, fondos muy rosados, decoración infantil, exceso de glitter,
dorado amarillo artificial, fondos saturados, estética genérica de marketplace.

Sensación buscada: *boutique contemporánea + joyería moderna + lujo accesible*.

## 3. Foto de catálogo (imagen 1)

Función **comercial**: que se vea exactamente qué se está comprando.

- Fondo limpio en **marfil / crema muy claro / champagne neutro** — **no blanco puro**
- La pieza ocupa espacio suficiente para apreciar el detalle
- Iluminación profesional, nitidez, reflejos metálicos controlados
- Sombra muy suave, composición minimalista, temperatura visual consistente
- **Sin decoración alrededor**

## 4. Foto editorial (imagen 2)

Composición premium con elementos **discretos**: piedra clara, mármol muy sutil,
pedestal, superficie negra mate, vidrio, tela satinada, sombras arquitectónicas,
superficies champagne.

La decoración **apoya** la joya, nunca compite. La pieza sigue siendo el punto de
mayor atención.

## 5. Lifestyle / en persona (imagen 3)

Sirve para entender **escala y uso**.

| Pieza | Qué mostrar |
|---|---|
| Collares | Cuello y clavícula |
| Aretes | Oreja, mandíbula y parte del rostro cuando corresponda |
| Pulseras | Muñeca y mano |
| Anillos | Mano y dedos |

La joya sobre la modelo conserva **exactamente** diseño, tamaño relativo, grosor,
piedras, color y estructura. La piel conserva textura natural — nada de retoque
plástico.

## 6. Sets y combinaciones

- Solo con **productos reales disponibles**
- **No** inventar piezas para completar un set
- Indicar cuando se venden por separado
- Coherencia entre collar, aretes, pulsera y anillos

Objetivo: que la clienta piense *"así puedo combinar estas piezas"*.

## 7. Dorado PVD 18K

Tono **elegante, cálido, metálico, sofisticado**.

- **No** amarillo intenso
- **No** brillo artificial que parezca plástico
- Los reflejos deben dejar ver textura, volumen, acabado y construcción

Solo indicar `Acero inoxidable 316L · PVD 18K` cuando esté confirmado en la ficha.

## 8. Plateados

Iluminación que **separe el metal del fondo**. Evitar blanco puro, que se come
los bordes. Usar marfil ligeramente cálido, gris piedra muy claro, champagne
neutro, o negro para editorial. Metal limpio y natural, **sin tonos azules**.

## 9. Macro

Textura, piedras, cierre, cadena, terminaciones, grabados, detalles de
fabricación. Demuestra calidad. **No inventar detalles** que no estén.

## 10. Empaque

**El logo original de Unistyles no se modifica bajo ninguna circunstancia.** No
redibujar, reinterpretar, cambiar tipografía o proporciones, mover elementos ni
reconstruir con IA. Solo archivos oficiales aprobados.

## 11. Estructura por producto

1. **Catálogo** — producto limpio sobre fondo estándar
2. **Editorial** — composición premium
3. **Lifestyle** — puesta, para mostrar escala y uso
4. **Macro** — acabado y construcción
5. **Combinación** — productos complementarios reales

No es obligatorio llegar a cinco. **Nunca sacrificar precisión del producto para
completar el número de imágenes.**

## 12. Coherencia

Misma calidad, proporciones, iluminación, familia de fondos y tratamiento del
metal en toda la categoría. No diseñar cada producto como una campaña aparte:
estamos construyendo un lenguaje visual.

Cuando alguien vea la categoría completa debe percibir: *"esto pertenece a
Unistyles"*. No una colección de fotos de proveedores distintos.

## Checklist antes de publicar

En este orden:

1. ¿La joya sigue siendo exactamente la original?
2. ¿El color y el acabado son reales?
3. ¿Se aprecia claramente el producto?
4. ¿Pertenece al universo Unistyles?
5. ¿Se ve profesional?
6. ¿Genera deseo de compra?
7. ¿Combina con el resto del catálogo?

**Si falla cualquiera de los primeros cuatro, la imagen se corrige antes de
publicarse.**

---

## Cómo lo aplica el pipeline hoy

| Punto de la doctrina | Dónde vive |
|---|---|
| Regla absoluta de no modificar | `PRESERVE` en `src/lib/pipelines/jewelry.ts` + guard anti-duplicación |
| Fidelidad garantizada por composición | `/api/jewelry-scene` — genera el decorado vacío y pega los píxeles reales |
| Paleta, acabados, lifestyle por pieza | `SYSTEM` en `src/lib/processing/jewelry-art-director.ts` |
| Verificación 1 y 2 del checklist | `/api/identity-check`, avisa en ámbar cuando la pieza cambió |

**Pendiente:** el paso "En modelo" no puede usar composición (la joya tiene que
adaptarse al cuerpo), así que depende del prompt y del chequeo de identidad. Es
el punto donde el checklist falla con más frecuencia.
