# 📚 Documentación de UniStudio — Índice

Mapa de **dónde está cada cosa** en este repositorio. Si buscas algo, empieza aquí.

## 🗺️ Estructura del repositorio

```
Image-Desgn-Studio/
├── unistudio/            ← LA APP (Next.js 16). Todo el código vive aquí.
│   ├── src/app/          ← páginas + rutas API (App Router)
│   ├── src/components/   ← componentes de UI y paneles de módulos
│   ├── src/hooks/        ← hooks (useAgentPipeline, useProcessingState…)
│   ├── src/lib/          ← lógica de negocio + clientes de proveedores IA
│   ├── src/stores/       ← estado global (Zustand)
│   └── prisma/           ← esquema de base de datos
├── docs/                 ← documentación TÉCNICA (este folder)
├── scripts/              ← utilidades (smoke-test)
├── CLAUDE.md             ← reglas del proyecto para agentes de IA
├── COORDINATION.md       ← registro entre terminales (Desktop/Phone/Cloud)
├── CHANGELOG.md          ← historial de cambios por deploy
└── README.md            ← presentación general del proyecto
```

## 📄 Qué hay en `docs/` (solo técnico)

| Archivo | Para qué sirve |
|---------|----------------|
| `providers.md` | **Qué proveedor de IA usa cada paso, cuánto cuesta, y qué se probó de cada uno** |
| `architecture.md` | Rutas API + esquema de base de datos + flujo de peticiones |
| `design-system.md` | Tokens de diseño, colores, tipografía |
| `UX_UI_GUIDE.md` | Guía de UX/UI de la app |
| `guia-completa.md` | Walkthrough completo en español |
| `inventory.md` | Catálogo de productos (dominio del negocio) |
| `pipelines/` | Los 3 pipelines canónicos (lingerie, static-product, jewelry) |
| `modules/` | Índice de los 18 módulos |
| `research/` | Playbook de precisión de Uwear (⚠️ zona activa del terminal de lencería) |

## 🔒 Lo que NO está en el repo (y por qué)

Research, notas personales, preparación de entrevista, guías HTML gigantes, datos crudos y
código muerto **se sacaron del repositorio** para mantenerlo limpio y profesional. Ahora viven en:

```
C:\Users\maria\Documents\UniStudio-Workspace\   ← FUERA de GitHub, no se sube
```

Ahí encontrarás: `interview-prep/`, `research/`, `planning/`, `inventory-data/`,
`guides-html/`, `generated-output/` y `archive-dead-code/`.
Ese folder tiene su propio `README.md` que explica cada subcarpeta.

## 🔗 Docs relacionados

- Proveedores de IA (qué usar y qué ya se descartó): [`providers.md`](providers.md)
- Índice de pipelines: [`pipelines/README.md`](pipelines/README.md)
- Índice de módulos: [`modules/README.md`](modules/README.md)
- Coordinación entre terminales: [`../COORDINATION.md`](../COORDINATION.md)
