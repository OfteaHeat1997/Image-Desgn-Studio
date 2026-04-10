si bo# 📋 Guía de Testing — UniStudio
## Fecha: 10 de Abril, 2026

---

### Resumen de cambios realizados hoy (80+ fixes)

#### CRÍTICOS (funcionalidad rota → arreglada)
1. Joyería Virtual — Modo Exhibidor: producto ya no cambia al aplicar
2. Joyería Virtual — Modo Flotante: aretes en fondo oscuro, sin selectores de metal innecesarios
3. Joyería Virtual — Modo Modelo: closeup real del oído con aretes
4. Joyería Virtual — panel ANTES: muestra imagen original (no placeholder)
5. Joyería Virtual — 3 modos nuevos reemplazaron el flujo roto anterior
6. Video Auto Mode: ya no selecciona Ken Burns automáticamente
7. Video Auto Mode: genera video real (no imagen estática)
8. Ghost Mannequin pipeline: operación enviada correctamente (no proveedor)
9. Agente IA — ghost-mannequin: parámetro corregido (`operation` no `provider`)
10. Fondos con IA: producto ya no cambia al generar fondo nuevo
11. Fondos con IA: Data URL oversized — ahora usa blob URLs
12. Fondos con IA: presets reemplazados por categorías reales (Lencería, Fragancias, Joyería, Skincare)
13. Fondos con IA: selector de tipo de producto visible
14. Crear Anuncio: `replicateUrl` fix — ahora genera correctamente
15. Cumplimiento: null check en canvas context
16. Inpaint: null prompt fix — ya no falla sin texto
17. Prueba Virtual (Try-On): blob URL leak arreglado
18. Batch: `response.ok` check + memory leaks corregidos
19. MuseTalk removido del dropdown de Avatar (requería video, no fotos)

#### ALTOS (errores frecuentes → corregidos)
20. Video — Ken Burns: aviso "Solo vista previa" visible
21. Video — Ken Burns: botón descarga oculto (es solo preview, no video real)
22. Video — Lencería 360°: opción de imagen trasera visible en tab Moda
23. Video — Avatar: voces en holandés disponibles
24. Video — Reintentar: botón aparece cuando hay error
25. Video — Errores: mensajes amigables (no técnicos/stack trace)
26. Video — duración: selector 5s/10s funciona correctamente
27. Video — seguridad: 17 vulnerabilidades corregidas (XSS, injection, SSRF, etc.)
28. Quitar Fondo: memory leaks de blob URLs eliminados
29. Quitar Fondo: provider fallback funciona (Browser → API)
30. Outpaint: validación de aspect ratio al seleccionar plataforma
31. Mobile: layout responsive — toolbar vertical en móvil
32. Mobile: dropdown accesible en pantallas pequeñas
33. Undo/Redo: botones Deshacer/Rehacer funcionan en todos los módulos

#### MEDIOS (mejoras de UX)
34. Fondos con IA: presets organizados por tabs (no scroll infinito)
35. Fondos con IA: estimador de costos batch funciona
36. Fondos con IA: modo Creativo pide descripción de texto
37. Fondos con IA: modo Rápido disponible (más barato)
38. Joyería: selectores Metal/Acabado solo visibles en modo Modelo
39. Video — tab Producto: preset "Perfumería Spin" disponible
40. Video — proveedor Wan 2.2 Fast disponible
41. Video — formato 9:16 funciona en preset de producto
42. Batch: procesa múltiples imágenes con pipeline configurable
43. Batch: progreso visible durante procesamiento

#### BAJOS (polish y estabilidad)
44–80+. Correcciones menores de tipos TypeScript, estilos CSS responsive,
mensajes de error consistentes, limpieza de console.log en producción,
null guards adicionales en módulos con Prisma, mejoras de accesibilidad
en botones y formularios, corrección de z-index en modales móvil.

---

## Cómo testear cada módulo

### Pre-requisitos
- Abrir la app en Chrome (desktop o móvil): https://unistudio.vercel.app
- Tener al menos 1 imagen de producto lista para subir (fragancia, joyería, crema, prenda)
- Abrir Chrome DevTools → Console (F12) para ver errores
- Conexión a internet activa (muchos módulos usan IA en la nube)

---

### Módulo 1: Quitar Fondo
**Estado:** ✅ Arreglado  
**Qué se arregló:** Memory leaks de blob URLs, provider fallback

**Pasos para testear:**
1. Ir al editor → seleccionar "Quitar Fondo"
2. Subir una imagen de producto (fragancia, joyería, crema)
3. Seleccionar método "Browser" (gratis) → click "Aplicar"
4. ✅ Verificar: fondo removido correctamente
5. ✅ Verificar: imagen de resultado visible en el canvas
6. Probar "Aislar Producto" toggle → debería quitar modelo Y fondo
7. Probar botón "Deshacer" → debería volver al original
8. Probar botón "Rehacer" → debería restaurar el resultado

**Errores esperados:** Ninguno  
**Si falla:** Verificar consola del navegador, reportar el error

---

### Módulo 2: Quitar y Reemplazar Fondo (Fondos con IA)
**Estado:** ✅ Arreglado + Mejoras  
**Qué se arregló:** Data URL oversized, producto cambiaba, presets genéricos

**Pasos para testear:**
1. Ir al editor → seleccionar "Fondos con IA"
2. ✅ Verificar: selector de tipo de producto visible (Lencería, Fragancias, etc.)
3. ✅ Verificar: presets organizados por tabs (no scroll infinito)
4. Subir imagen de fragancia → seleccionar tab "Fragancias" → preset "Espejo Negro"
5. Click "Generar" → ✅ Verificar: producto se ve IDÉNTICO al original
6. Probar modo "Creativo" → debería pedir descripción de texto
7. Probar modo "Rápido" → más barato pero buena calidad
8. ✅ Verificar: estimador de costos batch funciona

**Errores esperados:** Ninguno  
**Si falla:** Verificar que el producto en el resultado sea el mismo que subiste

---

### Módulo 3: Joyería Virtual
**Estado:** ✅ Arreglado completamente (17 bugs)  
**Qué se arregló:** 3 modos nuevos, producto ya no cambia, closeup en modelo

**Pasos para testear:**
1. Ir al editor → seleccionar "Joyería Virtual"
2. ✅ Verificar: 3 tabs visibles (Exhibidor, Flotante, Modelo)

**Test Exhibidor:**
3. Seleccionar "Exhibidor" → subir foto de aretes
4. Click "Aplicar" → ✅ Verificar: aretes en un stand/exhibidor
5. ✅ Verificar: los aretes son EXACTAMENTE los mismos que subiste
6. ✅ Verificar: panel ANTES muestra tu imagen de joyería (no placeholder)

**Test Flotante:**
7. Seleccionar "Flotante" → click "Aplicar"
8. ✅ Verificar: aretes flotando en fondo oscuro
9. ✅ Verificar: NO aparecen selectores de Metal/Acabado

**Test Modelo:**
10. Seleccionar "Modelo" → ✅ Verificar: sección de modelo aparece
11. Generar modelo IA o subir foto de persona
12. Click "Aplicar" → ✅ Verificar: closeup del oído con aretes puestos
13. ✅ Verificar: selectores Metal/Acabado visibles únicamente en este modo

**Errores esperados:** Ninguno  
**Si falla:** El bug más común era que los aretes cambiaban — reportar si ocurre

---

### Módulo 4: Video
**Estado:** ✅ Arreglado (10 fixes funcionales + 17 fixes de seguridad)  
**Qué se arregló:** Auto mode roto, Ken Burns, duración, seguridad

**Pasos para testear:**

**Test Auto Mode:**
1. Ir al módulo de Video → tab "Auto"
2. Subir imagen → escribir descripción del producto → click "Generar"
3. ✅ Verificar: NO selecciona Ken Burns automáticamente
4. ✅ Verificar: genera un video real (archivo de video, no imagen estática)

**Test Manual Mode:**
5. Seleccionar tab "Producto" → preset "Perfumería Spin"
6. Seleccionar proveedor "Wan 2.2 Fast" → duración 5s → formato 9:16
7. Click "Generar" → ✅ Verificar: video de producto rotando

**Test Ken Burns:**
8. Seleccionar modo Ken Burns
9. ✅ Verificar: aviso visible "Solo vista previa / Solo preview"
10. ✅ Verificar: botón de descarga NO aparece (es solo preview, no video real)

**Test Lencería 360°:**
11. Tab "Moda" → preset "Lencería 360°"
12. ✅ Verificar: opción de subir imagen trasera de la prenda aparece

**Test Avatar:**
13. Tab "Avatar" → escribir guión → seleccionar voz
14. ✅ Verificar: voces en holandés disponibles en el selector
15. ✅ Verificar: MuseTalk ya NO aparece en el dropdown (fue removido)

**Test errores:**
16. ✅ Verificar: si hay error, aparece botón "Reintentar"
17. ✅ Verificar: mensajes de error NO muestran stack trace ni detalles técnicos

**Errores esperados:** Ninguno  
**Si falla:** El bug más común era Auto mode → Ken Burns. Reportar si vuelve a ocurrir.

---

### Módulo 5: Mejorar Imagen
**Estado:** ✅ Sin cambios (estable)

**Pasos para testear:**
1. Ir al editor → seleccionar "Mejorar Imagen"
2. Subir imagen de producto → seleccionar preset "Lujo"
3. Click "Aplicar"
4. ✅ Verificar: imagen mejorada visible (más nitidez, colores)
5. ✅ Verificar: es GRATIS (no consume créditos)

---

### Módulo 6: Mejorar Resolución (Upscale)
**Estado:** ✅ Sin cambios

**Pasos para testear:**
1. Ir al editor → seleccionar "Upscale"
2. Subir imagen → seleccionar 2x o 4x
3. Seleccionar proveedor → click "Generar"
4. ✅ Verificar: imagen resultante tiene mayor resolución

---

### Módulo 7: Inpaint
**Estado:** ✅ Arreglado (null prompt fix)

**Pasos para testear:**
1. Ir al editor → seleccionar "Inpaint"
2. Subir imagen → dibujar máscara sobre el área a modificar
3. Escribir prompt (ej: "quitar el logo") → click "Generar"
4. ✅ Verificar: área bajo máscara modificada según el prompt
5. Probar SIN escribir prompt (dejar vacío) → ✅ Verificar: no crashea

---

### Módulo 8: Sombras
**Estado:** ✅ Sin cambios (estable)

**Pasos para testear:**
1. Ir al editor → seleccionar "Sombras"
2. Subir imagen con fondo transparente (o quitar fondo primero)
3. Seleccionar tipo de sombra (drop shadow, natural, etc.) → click "Generar"
4. ✅ Verificar: sombra aplicada correctamente

---

### Módulo 9: Ampliar Imagen (Outpaint)
**Estado:** ✅ Arreglado (validación aspect ratio)

**Pasos para testear:**
1. Ir al editor → seleccionar "Outpaint"
2. Subir imagen → seleccionar plataforma destino (Instagram 9:16, Facebook, etc.)
3. ✅ Verificar: aspect ratio calculado correctamente
4. Click "Generar" → ✅ Verificar: imagen expandida con bordes coherentes

---

### Módulo 10: Crear Modelo IA
**Estado:** ✅ Sin cambios

**Pasos para testear:**
1. Ir al editor → seleccionar "Crear Modelo"
2. Seleccionar: género, edad, tono de piel, pose
3. Click "Generar" → ✅ Verificar: modelo IA generado

---

### Módulo 11: Prueba Virtual (Try-On)
**Estado:** ✅ Arreglado (blob URL leak)

**Pasos para testear:**
1. Ir al editor → seleccionar "Prueba Virtual"
2. Subir imagen de prenda + imagen de modelo
3. Seleccionar tipo de prenda (top, bottom, vestido)
4. Click "Generar" → ✅ Verificar: modelo vistiendo la prenda
5. ✅ Verificar: no hay error de memoria después de múltiples usos

---

### Módulo 12: Ghost Mannequin
**Estado:** ✅ Arreglado (pipeline fix)

**Pasos para testear:**
1. Ir al editor → seleccionar "Ghost Mannequin"
2. Subir foto de prenda en maniquí
3. Seleccionar operación → click "Generar"
4. ✅ Verificar: maniquí removido, prenda con forma natural

---

### Módulo 13: Crear Anuncio
**Estado:** ✅ Arreglado (replicateUrl fix)

**Pasos para testear:**
1. Ir al editor → seleccionar "Crear Anuncio"
2. Subir imagen de producto
3. Seleccionar plantilla (Instagram Reel, TikTok, etc.)
4. Click "Generar" → ✅ Verificar: anuncio generado correctamente
5. ✅ Verificar: NO aparece error de URL en consola

---

### Módulo 14: Asistente IA (Prompt)
**Estado:** ✅ Sin cambios

**Pasos para testear:**
1. Ir al editor → seleccionar "Asistente IA"
2. Escribir descripción de producto
3. Seleccionar plataforma (Instagram, Shopify, Amazon)
4. Click "Generar" → ✅ Verificar: conceptos y copys generados

---

### Módulo 15: Agente IA
**Estado:** ✅ Arreglado (ghost-mannequin pipeline)

**Pasos para testear:**
1. Ir a /agent
2. Seleccionar tipo de agente → subir imagen de producto
3. Click "Generar Plan"
4. ✅ Verificar: plan de pasos generado
5. Ejecutar plan → ✅ Verificar: cada paso completa sin error

---

### Módulo 16: Cumplimiento (Compliance)
**Estado:** ✅ Arreglado (ctx null check)

**Pasos para testear:**
1. Ir al editor → seleccionar "Cumplimiento"
2. Subir imagen de producto
3. Seleccionar plataforma (Shopify, Amazon, etc.)
4. Click "Verificar" → ✅ Verificar: reporte de cumplimiento generado
5. ✅ Verificar: no hay error de canvas context en consola

---

### Módulo 17: Editor Inteligente
**Estado:** ✅ Sin cambios (estable)

**Pasos para testear:**
1. Ir al editor → seleccionar "Editor Inteligente"
2. Subir imagen → ajustar brillo, contraste, saturación con sliders
3. Click "Exportar" → ✅ Verificar: imagen descargada con ajustes aplicados

---

### Módulo 18: Kit de Marca
**Estado:** ⚠️ Solo en memoria (se pierde al refrescar — issue conocido)

**Pasos para testear:**
1. Ir a /brand-kit
2. Configurar colores corporativos y subir logo
3. ✅ Verificar: configuración visible durante la sesión
4. ⚠️ Refrescar página → los datos se pierden (comportamiento esperado por ahora)

---

### Módulo 19: Batch (Procesamiento en Lote)
**Estado:** ✅ Arreglado (response.ok check, memory leaks)

**Pasos para testear:**
1. Ir a /batch
2. Subir 3–5 imágenes a la vez
3. Configurar pipeline (ej: Quitar Fondo → Fondos con IA)
4. Click "Ejecutar" → ✅ Verificar: todas las imágenes procesadas
5. ✅ Verificar: barra de progreso visible durante procesamiento
6. ✅ Verificar: no hay error de memoria después de procesar

---

### Módulo 20: Mobile (Layout Responsive)
**Estado:** ✅ Arreglado

**Pasos para testear:**
1. Abrir Chrome DevTools → toggle Device Toolbar (Ctrl+Shift+M)
2. Seleccionar iPhone 12 Pro o similar
3. ✅ Verificar: toolbar en posición vertical (no horizontal)
4. ✅ Verificar: dropdown de módulos accesible
5. ✅ Verificar: botones tienen tamaño suficiente para tocar
6. ✅ Verificar: imágenes de resultado visibles sin scroll horizontal

---

## Checklist rápido — marca ✅ cuando pase

### Core
- [ ] Quitar Fondo funciona (gratis, método Browser)
- [ ] Quitar Fondo → Aislar Producto funciona
- [ ] Fondos con IA → presets nuevos visibles (Lencería, Fragancias, Joyería, Skincare)
- [ ] Fondos con IA → producto no cambia al generar
- [ ] Undo/Redo funciona en todos los módulos

### Joyería
- [ ] Joyería → Exhibidor: preserva producto original
- [ ] Joyería → Flotante: funciona, sin selectores extra
- [ ] Joyería → Modelo: hace closeup del oído

### Video
- [ ] Video Auto mode → genera video real (no Ken Burns automático)
- [ ] Video Manual mode → Perfumería Spin funciona
- [ ] Video → Ken Burns → aviso "Solo vista previa" visible
- [ ] Video → Reintentar button aparece en error
- [ ] Video → mensajes de error amigables (no técnicos)

### Otros módulos
- [ ] Ghost Mannequin → procesa sin error de pipeline
- [ ] Crear Anuncio → genera sin error de URL
- [ ] Inpaint → funciona con prompt vacío (no crashea)
- [ ] Batch → procesa múltiples imágenes correctamente
- [ ] Agente IA → ejecuta plan de ghost-mannequin

### UX
- [ ] Mobile → layout responsive en iPhone 375px
- [ ] Errores → mensajes amigables en todos los módulos

---

## Si encuentras un error

1. Tomar screenshot de lo que ves en pantalla
2. Abrir Chrome DevTools → Console (F12)
3. Copiar el error rojo de la consola (incluyendo el mensaje completo)
4. Reportar con:
   - **Módulo:** (ej: Joyería Virtual)
   - **Qué hiciste:** (ej: subí foto de aretes → click Aplicar en modo Exhibidor)
   - **Qué esperabas:** (ej: aretes en exhibidor)
   - **Qué pasó:** (ej: imagen en blanco)
   - **Screenshot:** adjuntar
   - **Error de consola:** pegar texto

---

## URLs útiles

| Recurso | URL |
|---|---|
| App en producción | https://unistudio.vercel.app |
| Editor principal | https://unistudio.vercel.app/editor |
| Agente IA | https://unistudio.vercel.app/agent |
| Batch | https://unistudio.vercel.app/batch |
| Brand Kit | https://unistudio.vercel.app/brand-kit |
| Health check API | https://unistudio.vercel.app/api/health |
