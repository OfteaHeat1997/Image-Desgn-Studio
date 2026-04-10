# Guía de Testing — UniStudio
## Fecha: 10 de Abril, 2026
## Total de cambios: 80+ bugs arreglados, 20+ features nuevas

---

## Pre-requisitos
- Abrir la app en Chrome (desktop o móvil)
- Tener al menos 1 imagen de producto lista
- Abrir Chrome DevTools → Console (F12) para ver errores

---

## Resumen de cambios de hoy

### Bugs de producción (12)
- Memory leaks de blob URLs en 5 componentes
- Race condition en editor al soltar imágenes rápido
- Crash en batch API por JSON parse sin verificar response.ok
- Upload silencioso fallando en Replicate
- Null assertion en OffscreenCanvas
- Prompt null en inpaint
- Sin validación de style en bg-generate
- Sin validación de aspect_ratio en outpaint

### Joyería Virtual (17 bugs + 3 modos nuevos)
- Modos: Exhibidor, Flotante, Modelo
- Composición real (producto 100% intacto)
- ANTES muestra imagen correcta
- bgStyle se aplica en exhibidor/flotante
- Metal/acabado removido de exhibidor/flotante
- Imagen de modelo no se descarga dos veces
- Cleanup de blob URLs en unmount
- Preview de imagen del editor
- Resolución máxima 2048px
- Imágenes pequeñas se escalan en composite
- Aspect ratio 1:1 en Flux
- Closeup por tipo de accesorio en Modelo
- Flotante nombra tipo de accesorio
- Estilo de fondo pasado a Flux
- Visibilidad de orejas para aretes

### Quitar Fondo
- Nuevo: "Aislar Producto" (quita modelo + fondo)

### Quitar y Reemplazar Fondo
- Fix: usaba data URL (2-4MB) en vez de replicateUrl
- Fix: costo se leía del campo equivocado

### Fondos con IA (11 presets + 5 mejoras UX)
- 3 presets Moda Íntima (boudoir, satén, tocador)
- 3 presets Fragancias (espejo negro, jardín brumoso, cristal)
- 3 presets Joyería (bandeja terciopelo, piedra oscura, flatlay botánico)
- 2 presets Skincare (flatlay natural, terrazzo pastel)
- Modo Creativo expuesto en UI
- Selector de tipo de producto dinámico
- Tabs por categoría
- Botón reintentar
- Progress bar suave

### E-Commerce
- Modo rápido usa composición (producto intacto)
- Prompts reforzados para preservar producto

### Editor
- Undo/redo: bug off-by-one arreglado

### Mobile Responsive
- Layout vertical en teléfonos
- Sidebar reemplazado por dropdown
- Toolbar optimizado para móvil

### Video (10 fixes + 17 seguridad)
- Auto mode arreglado (ya no usa Ken Burns siempre)
- Ken Burns etiquetado como "solo preview"
- 6 presets por categoría (perfumería, joyería, skincare)
- Wan 2.2 Fast respeta duración
- Wan 2.5 tipo correcto
- Estimador de costos batch
- Voces holandesas para Curaçao
- Lencería 360° con front/back
- Botón reintentar en errores
- Mobile layout mejorado

### Seguridad
- Autenticación en 5 API routes
- Rate limiting (video 10/hr, avatar 5/hr, TTS 20/hr)
- Límites de texto (TTS 1000, prompts 500-1000 chars)
- Errores genéricos al usuario (no técnicos)
- MuseTalk rechaza imágenes estáticas
- localStorage no guarda data URLs enormes
- Protección contra prompt injection
- Validación de budget

### Pipeline
- Ghost mannequin en AI Agent: parámetro corregido

---

## Testing por módulo

### 1. Quitar Fondo
1. Editor → "Quitar Fondo"
2. Subir imagen de producto
3. Seleccionar "Browser" (gratis) → "Aplicar"
4. [ ] Fondo removido correctamente
5. [ ] Resultado visible en canvas
6. Activar "Aislar Producto" → "Aplicar"
7. [ ] Solo queda el producto (sin modelo/maniquí)
8. [ ] Botón "Deshacer" funciona
9. [ ] Botón "Rehacer" funciona

### 2. Fondos con IA
1. Editor → "Fondos con IA"
2. [ ] Selector de tipo de producto visible
3. [ ] Presets en tabs (no scroll infinito)
4. Seleccionar tipo "Fragancias" → tab "Fragancias" → "Espejo Negro"
5. Subir imagen → "Generar"
6. [ ] Producto se ve IDÉNTICO al original
7. [ ] Modo "Creativo" pide descripción de texto
8. [ ] Modo "Rápido" funciona
9. [ ] Estimador de costos visible

### 3. Joyería Virtual
1. Editor → "Joyería Virtual"
2. [ ] 3 tabs visibles (Exhibidor, Flotante, Modelo)
3. **Exhibidor:** subir aretes → "Aplicar"
4. [ ] Aretes en stand/exhibidor
5. [ ] Aretes son EXACTAMENTE los mismos
6. [ ] ANTES muestra tu imagen de joyería
7. [ ] NO aparecen selectores de Metal/Acabado
8. **Flotante:** "Aplicar"
9. [ ] Aretes flotando en fondo oscuro
10. **Modelo:** generar modelo → "Aplicar"
11. [ ] Closeup del oído con aretes
12. [ ] Metal/Acabado selectores visibles

### 4. Video
1. Módulo de Video
2. **Auto Mode:** subir imagen → descripción → "Generar"
3. [ ] NO selecciona Ken Burns automáticamente
4. [ ] Genera video real
5. **Manual:** tab "Producto" → "Perfumería Spin" → Wan 2.2 Fast → 5s → 9:16
6. [ ] Video de producto rotando
7. **Ken Burns:** seleccionar
8. [ ] Aviso "Solo vista previa" visible
9. [ ] Botón descarga NO aparece
10. **Lencería 360°:** tab "Moda"
11. [ ] Opción de subir imagen trasera
12. **Avatar:** tab → escribir guión
13. [ ] Voces holandesas mencionadas
14. [ ] Botón "Reintentar" en errores

### 5. Mejorar Imagen
1. Subir imagen → preset "Lujo" → "Aplicar"
2. [ ] Imagen mejorada. GRATIS.

### 6. Mejorar Resolución
1. Subir imagen → 2x → Real-ESRGAN → "Generar"
2. [ ] Imagen más grande y nítida

### 7. Inpaint
1. Subir imagen → dibujar máscara → prompt → "Generar"
2. [ ] Área editada correctamente

### 8. Sombras
1. Subir imagen → tipo de sombra → "Generar"
2. [ ] Sombra aplicada correctamente

### 9. Ampliar Imagen (Outpaint)
1. Subir imagen → plataforma (Instagram 9:16) → "Generar"
2. [ ] Imagen extendida correctamente

### 10. Crear Modelo IA
1. Seleccionar género, edad, tono de piel, pose
2. [ ] Modelo generado correctamente

### 11. Prueba Virtual (Try-On)
1. Subir prenda + modelo → tipo de prenda → "Generar"
2. [ ] Prenda aplicada al modelo

### 12. Ghost Mannequin
1. Subir foto de prenda → operación → "Generar"
2. [ ] Maniquí removido/efecto aplicado

### 13. Crear Anuncio
1. Subir imagen → plantilla (Instagram Reel) → "Generar"
2. [ ] Video/imagen con formato correcto

### 14. Asistente IA
1. Descripción de producto → plataforma → "Generar"
2. [ ] 4 conceptos generados

### 15. Agente IA
1. Tipo de agente → subir imagen → "Generar plan"
2. [ ] Pipeline generado correctamente

### 16. Cumplimiento
1. Subir imagen → plataforma (Shopify) → "Verificar"
2. [ ] Validación muestra resultados

### 17. Editor Inteligente
1. Subir imagen → ajustar brillo/contraste → "Exportar"
2. [ ] Imagen exportada correctamente. GRATIS.

### 18. Kit de Marca
1. Ir a /brand-kit → configurar colores y logo
2. [ ] Configuración guardada (⚠️ solo en memoria por ahora)

### 19. Batch
1. Subir múltiples imágenes → configurar pipeline → "Ejecutar"
2. [ ] Todas las imágenes procesadas

### 20. Mobile
1. Abrir en teléfono
2. [ ] Layout vertical
3. [ ] Dropdown en toolbar
4. [ ] Botones accesibles

---

## Checklist rápido

- [ ] Quitar Fondo funciona (gratis)
- [ ] Aislar Producto funciona
- [ ] Fondos con IA → presets nuevos visibles
- [ ] Fondos con IA → producto no cambia
- [ ] Joyería → Exhibidor preserva producto
- [ ] Joyería → Flotante funciona
- [ ] Joyería → Modelo hace closeup
- [ ] Video Auto mode genera video real
- [ ] Video Manual mode funciona
- [ ] Video → Reintentar funciona
- [ ] Mobile responsive funciona
- [ ] Undo/Redo funciona
- [ ] Batch procesa múltiples imágenes
- [ ] Errores → mensajes amigables

---

## Si encuentras un error
1. Toma screenshot
2. Abre Chrome DevTools → Console (F12)
3. Copia el error de la consola
4. Reporta: módulo + qué hiciste + screenshot + error de consola
