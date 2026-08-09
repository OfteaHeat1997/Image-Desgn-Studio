# Joyería — pendientes

> **Por qué existe este archivo.** Maria tuvo que repetir los mismos pedidos toda
> una noche porque yo no llevaba la lista por escrito y mi memoria de la
> conversación es finita. Esto vive en el repo justamente para que **no dependa
> de que nadie recuerde nada**.
>
> **Regla:** antes de tocar código de joyería, leer esto y trabajar de arriba
> hacia abajo. Al terminar algo, tacharlo acá en el MISMO commit.

Última actualización: 2026-08-09 · commit `0312eea`

---

## Pendientes, en orden de impacto

### 1. Recorte que quite el exhibidor  ⬅️ el que más arregla

**Problema:** el paso 2 conserva el pedestal/cilindro del taller. BiRefNet es un
segmentador de objeto *saliente*: no sabe qué es el producto, así que se queda
con la pieza **y** su soporte. Los pasos 3, 4, 5 y 6 heredan ese recorte — por eso
el packshot redibuja la pieza (tiene que inventar cómo se ve sin el cilindro).

**Ya hecho:** `productWords` / `propWords` en el director de arte, y
`subjectPrompt` / `propPrompt` en `/api/bg-remove` → `isolateGarment()`.

**Falta:** activarlo en el paso `isolate` de la página.

**Ojo — se probó el 2026-08-09 y FALLÓ.** Con la pulsera de cordón, Grounded SAM
devolvió una máscara casi vacía **y `success: true`**, así que el respaldo por
error no se activaba. Dos cosas antes de reintentar:

- Pedirle a Vision **2-3 palabras núcleo** (`"cord bracelet, gold plate"`), no la
  enumeración de 7 frases. Grounding DINO rinde peor con prompts largos.
- **Compuerta de calidad**: medir el área opaca de la máscara y caer a BiRefNet si
  baja de un umbral. No confiar en el `success` de la ruta.

### 2. Selector de proveedor por paso

Se ve cuál corrió, no se puede elegir. Lencería sí deja, con la explicación de
cuándo usar cada uno.

**Modelo a copiar:** `ISOLATE_METHOD_OPTIONS` y `TRYON_PROVIDER_OPTIONS` en
`src/app/pipelines/lingerie/page.tsx`.

### 3. Multi-sample con picker

Lencería genera 4 candidatos y se elige en una grilla 2×2. Joyería solo acumula
versiones al rehacer, de a una.

### 4. Ver en grande al pasar el mouse

Existía y **se quitó** el 2026-08-09: era un overlay `fixed inset-0` que tapaba
las tarjetas al scrollear. Hoy el zoom es por clic. Hay que rehacerlo como
lencería, que agranda sin bloquear la página.

### 5. Escena de lujo: la pieza no se integra

El decorado se genera a ciegas y la pieza se pega en una posición fija, así que
queda flotando sobre pedestales que el propio decorado inventó.

**Arreglo:** que `luxuryBackdrop` prohíba explícitamente pedestal, bandeja y
soporte en el centro — superficie plana, props a los costados.

### 6. Macro: el dije debe mandar sobre la cadena

Vision elige la región, pero con la pulsera de la hoja eligió las cuentas en vez
del dije. Falta darle el criterio de jerarquía: dije/colgante/engaste **antes** que
un tramo de cadena.

### 7. On-model: el díptico vuelve

Kontext devuelve la foto partida en dos paneles de forma intermitente. Los guards
de prompt son **no deterministas**: al tapar uno se abre otro.

**Arreglo real:** detección mecánica — comparar las dos mitades y recortar una si
son casi idénticas.

### 8. Recuadro gris en la escena

El recorte llega sin canal alfa (el proxy lo reencodea) y se pega el rectángulo.
Hay una reconstrucción de alfa por color de esquina con tolerancia 26, pero **no
alcanzó** en la pulsera. Subir tolerancia y muestrear las cuatro esquinas.

### 9. Sets y combinaciones — punto 6 de la doctrina

Sin implementar.

### 10. Empaque y logo — punto 10 de la doctrina

Sin implementar. **El logo de Unistyles no se toca jamás.**

### 11. Verificar el reel

Nunca se corrió. El `ffmpeg-static` de `node_modules` es binario **Linux**: anda en
Vercel, no en el Windows de desarrollo. Para probarlo en local hace falta
`npm rebuild ffmpeg-static` (~80 MB).

---

## Hecho y verificado

- Limpiar foto (borra precio/título/marca de agua, conserva el exhibidor)
- Recorte con BiRefNet — ganó una comparativa de 6 proveedores
- Packshot, escena de lujo por composición, detalle macro
- Vision con `tipo` abierto, `num_productos`, `tipo_cadena`, `cierre`, `texto_grabado`
- Director de arte: prompts por paso, escritos mirando la foto
- Doctrina de marca cableada (`jewelry-brand.md`)
- **Ficha de Vision editable + volver a analizar**
- Botón "Generar este paso", barra de pasos, tarjetas plegables, dos paneles
- Timeouts de Vercel para los 4 módulos nuevos

## Reglas aprendidas a los golpes

1. **Probar antes de pushear.** Cuatro bugs en un día por editar sin verificar:
   `<button>` anidado (rompió la hidratación), `overflow-x-hidden` (mató el
   scroll), región del macro desplazada por el trim, y el recorte dirigido.
2. **`success: true` no significa buen resultado.** Hay que medir la salida.
3. **El working directory es compartido** con otras terminales: leer
   `git diff --staged` antes de cada commit.
4. **Prompt largo ≠ mejor.** Grounding DINO rinde peor con enumeraciones.
