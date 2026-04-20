# UniStudio — Guía de UX/UI

**Audiencia:** gente no-técnica (ej: la mamá del usuario). El sistema debe ser **obvio, visual y consistente** — no hay que leer para entender qué hace cada cosa.

---

## 1. Principios rectores

### 1.1 "Tu mamá lo entiende"
Si una persona que nunca usó software de edición de imágenes no puede decirte qué hace un módulo viéndolo 5 segundos, está mal escrito. Todo label, descripción y ejemplo debe pasar este test.

### 1.2 Acción > jerga
Los nombres de módulos deben ser **verbos o frases de acción**, no términos técnicos.

| ❌ Evitar | ✅ Usar |
|---|---|
| Inpaint | Borrador Mágico |
| Ghost Mannequin | Quitar Maniquí |
| Try-On | Vestir una Modelo |
| Upscale | Subir Resolución HD |
| Outpaint | Adaptar a IG / TikTok |

### 1.3 Ejemplo concreto, siempre
Cada módulo debe tener: **descripción corta** + **ejemplo real** ("brasier sobre mesa → brasier sin la mesa") + **"úsalo cuando…"**. El ejemplo es más importante que la descripción.

### 1.4 Colores comunican
Los colores de categoría son **información**, no decoración. El usuario aprende: "los verdes son para preparar la foto, los amarillos para vestir modelos, los morados para automatización…".

---

## 2. Paleta de categorías

| Categoría | Color hex | Significado | Icono lucide |
|---|---|---|---|
| PREPARAR FOTO | `#50C878` (verde) | Foundation — lo primero que hacés | `Camera` |
| MODELOS Y MODA | `#F5A623` (naranja) | Vestir / crear personas | `Shirt` |
| VIDEO Y ADS | `#E06BDF` (fucsia) | Contenido para redes | `Film` |
| AUTOMATIZACIÓN | `#A78BFA` (morado) | El IA trabaja solo | `Bot` |
| HERRAMIENTAS | `#5B9CF6` (azul) | Utilidades finas | `Settings` |

**Regla:** el color de categoría aparece SIEMPRE en:
- Borde izquierdo del módulo activo (4px)
- Icono del módulo cuando está seleccionado
- Accent del header del panel correspondiente
- Badge/chip en listas que mezclan módulos de varias categorías

---

## 3. Sidebar de módulos

### 3.1 Anatomía de un ítem

```
┌─────────────────────────────────────┐
│ [icon]  Label principal      Cost   │
│         Descripción corta           │
└─────────────────────────────────────┘
```

- **Label:** acción clara, máx 30 caracteres
- **Descripción:** 1 frase ≤ 60 caracteres
- **Cost:** siempre a la derecha. `Gratis` en verde `#50C878`, paid en gris
- **Icono:** 16x16px, color gris cuando inactivo, color de categoría cuando activo

### 3.2 Estado activo

- Fondo: `{categoría}18` (hex + alpha 18)
- Borde: `{categoría}30`
- Borde izquierdo: 3px sólido `{categoría}`
- Icono: color de categoría
- Label en blanco

### 3.3 Hover

- Fondo `rgba(255,255,255,0.04)`
- Tooltip a la derecha (ver §4) con ejemplo + "úsalo cuando"

---

## 4. Tooltip interactivo (hover)

Aparece al pasar el mouse, se queda `pointer-events-auto` para poder leer.

```
┌──────────────────────────────┐
│ [icon] Label         $cost   │
│ ──────────────────────────── │
│ Descripción corta de 1 línea │
│                              │
│ [chip] EJEMPLO               │
│ "Un brasier sobre mesa →     │
│  brasier sin la mesa"        │
│                              │
│ [chip] ÚSALO CUANDO          │
│ "Quieres el producto solo,   │
│  sin fondo, para ponerlo     │
│  en otro fondo después"      │
└──────────────────────────────┘
```

Ancho fijo: `w-72` (288px). Aparece 2px a la derecha del ítem, transición 150ms.

---

## 5. Header de cada módulo

Todo `ModuleXxxPanel` debe abrir con el mismo componente `ModuleHeader`:

```
┌────────────────────────────────────────────────┐
│ [ICON GIGANTE] Label principal    Cost/Rango   │
│                Descripción del módulo           │
│                                                 │
│                [chip EJEMPLO]                   │
└────────────────────────────────────────────────┘
```

El ejemplo sirve de recordatorio durante la sesión (no solo al elegir).

---

## 6. Estados de carga

| Caso | Patrón |
|---|---|
| Paso rápido (< 3s) | Skeleton gris |
| Paso medio (3-30s) | Spinner + "Haciendo X..." |
| Paso largo (> 30s) | Spinner + "Haciendo X (15s)..." con contador |
| Multipaso | Barra de progreso + lista de pasos con checkmarks |

**Siempre:** el loading text es en **primera persona plural** ("Aislando tu prenda…", "Creando la modelo…"). No técnico.

---

## 7. Errores

### 7.1 Copy
Errores deben ser **humanos**, accionables. Nunca:

> "Failed to run model: 422 content_policy_violation: partner_validation_failed"

Siempre:

> ⚠️ El IA no pudo generar esta foto. Probá con otra foto o reintenta.
> *(detalles técnicos en botón opcional "Ver detalle")*

### 7.2 Placement
Los errores aparecen **en línea** cerca del paso fallido, no en un toast global. Con un botón "Reintentar" inmediato.

---

## 8. Costos

- **Gratis:** verde `#50C878`, texto `"Gratis"`
- **Barato (<$0.01):** gris con `"~$0.005"`
- **Medio ($0.01-$0.05):** gris con `"$0.05"`
- **Alto (>$0.05):** ámbar `#F5A623` con `"$0.35"`
- **Variable:** gris claro con `"Variable"`

**Regla:** antes de ejecutar un paso PAID, se muestra un chip con el costo estimado. Antes de un batch, un resumen: "Total estimado: $0.17".

---

## 9. Botones primarios / secundarios / destructivos

| Tipo | Uso | Ejemplo visual |
|---|---|---|
| Primario (accent dorado `#C5A47E`) | Acción principal de la pantalla | "Ejecutar plan", "Guardar" |
| Secundario (outline) | Acción alternativa | "Volver al inicio", "Nueva imagen" |
| Destructivo (rojo `#EF4444`) | Cancelar/borrar/parar | "Cancelar Todo", "Eliminar" |
| Ghost (transparente) | Terciaria | "Saltar", "Ver más" |

**Uno y solo uno** botón primario visible a la vez.

---

## 10. Navegación y orientación

### 10.1 Botón "← Volver al inicio"
Visible durante execution y results en TODO módulo que tiene flujo multi-paso. Resetea el estado.

### 10.2 Breadcrumb
Pages `/editor`, `/gallery`, `/batch`, `/brand-kit`, `/catalog-pipeline` deben tener header con link al Dashboard.

### 10.3 Textos de guía
- **Primera vez en un módulo:** mostrar tarjeta de onboarding con "Así funciona" (cerrable, se recuerda con localStorage)
- **Cada paso espera una acción:** la siguiente acción debe ser OBVIA (botón primario visible, con label claro)

---

## 11. Idioma

- **Todo UI en español** (regla del proyecto)
- Tono: amigable pero profesional. Tuteo OK.
- **NO emojis.** Nada. Ni en categorías, ni en labels, ni en cost chips, ni en descripciones. Usa iconos de `lucide-react` o SVG propios. Regla del usuario: se ve poco profesional y no escala.
- Gifs y videos animados cortos son aceptables como ayuda visual (ej: en tooltips de onboarding) pero no emojis.

---

## 12. Accesibilidad mínima

- Contraste WCAG AA (4.5:1 para texto normal, 3:1 para labels de botones)
- Todos los botones con `aria-label` descriptivo
- Iconos decorativos con `aria-hidden="true"`
- Foco visible con `outline-offset-2`

---

## 13. Checklist antes de mergear UI nueva

- [ ] ¿El label es un verbo/acción que mi mamá entiende?
- [ ] ¿Tiene un ejemplo concreto en el tooltip / header?
- [ ] ¿El color de categoría se usa consistentemente?
- [ ] ¿Hay estado de loading con texto humano en español?
- [ ] ¿Los errores están traducidos y tienen botón reintentar?
- [ ] ¿Solo hay un botón primario a la vista?
- [ ] ¿Funciona con teclado (Tab, Enter, Esc)?

---

## 14. Dónde viven las reglas

- **Este archivo** (`docs/UX_UI_GUIDE.md`) es la fuente de verdad
- Los colores hex están en `tailwind.config.ts` y como CSS vars en globals
- El componente `ModuleHeader` vive en `src/components/ui/module-header.tsx` — úsalo siempre, no hagas headers custom
