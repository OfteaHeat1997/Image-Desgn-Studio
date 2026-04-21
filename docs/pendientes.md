# Pendientes y estado del proyecto

> Este archivo guarda el contexto de las conversaciones con Claude para que no se pierda al cerrar un chat. Cada sesión nueva puede leer este archivo y arrancar donde quedó la anterior.
>
> **Última actualización:** 2026-04-21

---

## Respuesta sobre subir 1 o 3 fotos del producto

**Hoy: 1 sola foto.** Los modelos que usamos (Kolors para tryon, SeedDream para modelo) solo aceptan una imagen de prenda como referencia. Subir 3 no mejora el resultado — se usaría solo la primera.

### La mejor foto que podés subir

- Bra frontal, centrado, ocupa la mayor parte del encuadre
- Modelo real, maniquí o bra plano sobre fondo blanco — cualquiera funciona
- Fondo simple (no patrones) — facilita que `grounded_sam` aísle la prenda
- 1024 px o más de ancho

### Lo que la IA hace hoy con 1 foto

- ✅ Copia fiel del frente del bra (color, corte, copa, tirantes)
- ⚠️ **Espalda:** la IA la "inventa" plausible — si tu bra tiene un detalle raro atrás (cierre decorativo, cruce de tirantes especial), **NO lo va a preservar exacto**
- ⚠️ **Textura:** se infiere del frente — si la tela tiene una trama visible solo en foto macro, se pierde

> Para preservar detalles del back/textura en el futuro: es un módulo nuevo (Flux PuLID o IP-Adapter con multi-reference). Está anotado como **Phase 2f** más abajo.

---

## ✅ Shipped (ya está en producción)

| # | Item | Commit | Verificación |
|---|---|---|---|
| 1 | Tryon 422 image_load_error | `1e63a40` | Confirmado por la usuaria |
| 2 | Video 360° bug (usaba modelo en vez de prenda) | `2b268a5` | Deployado — falta test |
| 3 | ModelThumb onError fallback | `2b268a5` | Deployado — falta test |
| 4 | CHANGELOG del fix 1 | `6a3230a` | Sí |
| 5 | Phase 2a: 4 fotos por producto (hero + espalda + cuerpo completo + prenda sola, misma identidad vía seed) | `deeebeb` | Deployado — falta test |

---

## 🔴 Pendientes de desarrollo

| # | Fase | Qué incluye | Estimado | Bloqueado por |
|---|---|---|---|---|
| 6 | **Phase 2d — Pantys + Shapewear** (próximo) | Characterization específica: pantys (corte bikini/hipster/thong/high-waist, largo pierna), shapewear (zona cintura/abdomen/full, nivel compresión) | ~3h | OK después de confirmar 2a |
| 7 | **Phase 2b — Callout images** | Imágenes con zoom + texto + flechas ("High Coverage", "Underwire") tipo screenshots 5, 9, 11 de Leonisa | ~4h | Respuesta sobre texto auto vs manual |
| 8 | **Phase 2c — Video lifestyle con captions** | Video tipo "girl-to-mirror" con burbujas de texto (screenshots 1, 2, 3 de Leonisa) | ~8h | Prioridad — es caro y complejo |
| 9 | **Phase 2e — UX per-step** | Modal grande al click, botón Download y Save-to-gallery por paso, agrupación REF+color en picker | ~3h | Ninguno |
| 10 | **Phase 2f — Multi-reference garment** (nuevo) | Subir 3 fotos (frente/espalda/detalle) y preservar detalles del back/textura reales | ~6h | OK — nice-to-have, no bloqueante |
| 11 | **Phase 3 — Hero homepage section** | Video lifestyle vertical + overlay tipo Leonisa (solo si se quiere) | ~6h | Confirmar si se quiere o no |

---

## ❓ Preguntas abiertas para la usuaria

1. **Callouts (Phase 2b):** ¿texto auto-generado con Claude leyendo features de la prenda, o dropdowns manuales fijos ("Alta cobertura", "Sin costuras") elegidos manualmente?
2. **Logo de marca:** ¿hay logo propio para el overlay en "prenda sola", o usamos texto plano con número de REF?
3. **Fondo de hero:** ¿beige/crema cálido estilo Leonisa, o blanco estudio limpio como hoy?
4. **Hero homepage (Phase 3):** ¿la app tiene que generar este tipo de video también, o era solo referencia visual? Si sí: ¿1 por colección (SS26) o 1 por producto destacado?
5. **Hero texto/CTA:** ¿quemado dentro del video para postear en redes, o en capa HTML sobre el video para la web del ecommerce?
6. **Multi-foto (Phase 2f):** ¿interesa poder subir 3 fotos por producto para mejor fidelidad de back/textura, o con 1 frontal alcanza?

---

## 🧪 Tests de la usuaria pendientes

| Fase | Cómo testear | Qué esperar |
|---|---|---|
| **Phase 2a** | Subir bra a `/pipelines/lingerie`, dejar los 7 steps activos, automático | 4 fotos: frontal (como antes) + espalda (misma modelo de atrás) + cuerpo completo (misma modelo + shaper) + prenda sola |
| **Video 360° fix** | Mismo run | El Video 360° ahora muestra SOLO el bra rotando (no a la modelo) |
| **ModelThumb** | Abrir picker de modelos reusables | Si alguna preview no carga, sale placeholder checkerboard + nombre en vez de icono roto |

---

## 🎯 Orden propuesto

1. Usuaria testea Phase 2a (2 min de deploy + 2 min de test con una foto)
2. Confirma ✅ o ❌
3. Si ✅ → arranca Phase 2d (pantys + shapewear) inmediatamente
4. Si ❌ → manda screenshot y se fixea antes de seguir

---

## Notas de la sesión 2026-04-21

- Error visto en mobile: `Failed to fetch` en el paso "Crear Modelo IA" del pipeline de lencería. Este mensaje proviene del navegador cuando `fetch()` falla a nivel de red (no respuesta del servidor). Causas típicas: conexión móvil intermitente, timeout del edge, o conexión cortada a mitad de request. La UI ya muestra un mensaje amigable en español ("No pudimos generar la modelo IA. Reintentá o probá con otras configuraciones.") con el detalle técnico oculto bajo "Ver detalle técnico".
