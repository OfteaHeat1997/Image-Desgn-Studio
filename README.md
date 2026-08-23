# UniStudio

**Fotografía de producto de catálogo, generada automáticamente.**
Construido para [Unistyles](https://unistyles.com) — lencería y belleza, Curazao.

---

## El problema

Unistyles vende **486 productos**. Cada uno necesita fotos de catálogo: fondo limpio, la prenda puesta sobre una modelo, vistas de detalle, video para redes. Hacerlo con estudio no escala, y hacerlo con SaaS costaba **más de $200 al mes** repartidos entre cinco herramientas que no se hablan entre sí.

UniStudio hace ese trabajo en una sola plataforma por **~$0.15 por producto en fotos** y **~$0.55 si incluye los dos videos** — coste medido end-to-end, no estimado.

## El requisito que manda sobre todos los demás

> **La foto final tiene que mostrar el producto que el cliente va a recibir.**

Parece obvio y es el problema difícil. Los modelos generativos **no preservan un producto atípico**: lo reemplazan por el promedio de su dataset. Un bra sin aro con cierre frontal sale convertido en un push-up genérico. Se comprobó con tres motores independientes y los tres fallaron igual.

De ahí sale la regla que ordena toda la arquitectura:

**Segmentación → warp → composición → generación.** En ese orden, y bajando de nivel solo cuando no queda alternativa. → [ADR-0004](docs/decisions/0004-segmentacion-sobre-generacion.md)

---

## Empezar

```bash
cd unistudio
cp .env.example .env.local   # añade tus API keys
npm install
npx prisma generate
npm run dev                  # http://localhost:3000
```

`http://localhost:3000/api/health` te dice qué proveedores responden.

**La base de datos es opcional.** Sin `DATABASE_URL` la aplicación funciona; solo se pierde el historial persistente.

**Claves imprescindibles:** `REPLICATE_API_TOKEN` y `FAL_KEY`. Todo lo demás es opcional y degrada limpiamente. La lista completa está en [`unistudio/README.md`](unistudio/README.md).

> ⚠️ **fal.ai no es solo un proveedor de modelos: es también el storage de las imágenes intermedias.** Si esa cuenta se queda sin saldo, *todos* los pasos fallan a la vez y parece un bug de código. No lo es.

---

## Los tres pipelines

El sistema tiene exactamente tres, y se dividen por **la física de la toma**, no por categoría comercial. Un bra y una faja son categorías distintas y la misma física.

| Pipeline | Criterio | Productos | Documento |
|---|---|---:|---|
| **Lencería** | se lleva **puesto** sobre un cuerpo | 164 | [how-to](docs/pipelines/lingerie.md) |
| **Estáticos** | es **rígido y se apoya** en una superficie | 240 | [how-to](docs/pipelines/static-product.md) |
| **Joyería** | es **pequeño y reflectante**, sobre el cuerpo | 82 | [how-to](docs/pipelines/jewelry.md) |

486 = 100% del inventario. **Está prohibido crear un cuarto.** Si un producto no encaja en ninguno, es señal de rediseñar los tres. → [ADR-0003](docs/decisions/0003-tres-pipelines-canonicos.md)

Por debajo hay **18 módulos** reutilizables (`/api/<módulo>`) que los pipelines orquestan. La lógica compartida vive en el módulo, nunca duplicada en dos pipelines.

---

## Cómo está construido

Monolito modular en **Next.js 16** (App Router) sobre Vercel. Una sola aplicación, un solo deploy, límites internos en vez de límites de red — porque el cuello de botella son las APIs externas, no nuestro CPU. → [ADR-0001](docs/decisions/0001-monolito-modular.md)

```
UI  →  hook  →  /api/<módulo>  →  lib/processing/  →  lib/api/<proveedor>  →  API externa
```

`lib/api/` es la **única** capa que lee credenciales. Ocho adapters: fal.ai, Replicate, Photoroom, Uwear.ai, FASHN, WithoutBG, Vercel Blob y Anthropic.

Stack: React 19 · TypeScript · Tailwind 4 · Zustand · Prisma 7 + PostgreSQL · Sharp · Fabric.js. Las versiones exactas están en `unistudio/package.json`.

**Arquitectura completa:** [`docs/architecture.md`](docs/architecture.md) — en formato arc42 con vistas C4, incluyendo riesgos y deuda técnica sin maquillar.

---

## Métodos de trabajo

El proyecto se documenta con marcos reconocidos, no con notas sueltas. Cada uno resuelve un problema concreto:

| Marco | Para qué se usa aquí |
|---|---|
| **[Double Diamond](docs/process/README.md#1-double-diamond)** | Ordenar *qué problema* se resuelve. Este proyecto saltó a construir antes de definir, y la corrección está documentada |
| **[DOT Framework](docs/process/README.md#2-dot-framework)** (Fontys) | Generar evidencia por triangulación: Library, Field, Lab, Showroom, Workshop |
| **[ADR](docs/decisions/)** | 11 decisiones registradas con su evidencia medida. Un proveedor descartado sin explicación se vuelve a probar en tres meses |
| **[arc42](docs/architecture.md) + [C4](docs/architecture.md#3-contexto--c4-nivel-1)** | Documentar la arquitectura por niveles, sin diagramas que se pudren |
| **[Diátaxis](docs/README.md)** | Cada documento hace **una** cosa: enseñar, resolver, describir o explicar |
| **README-Driven Development** | Este archivo. Corto, sin volcado de métricas |

En el día a día: Trunk-Based Development, Conventional Commits, Documentation as Code, feature flags para revertir en producción sin redeploy, health checks y degradación elegante en cada capa.

También hay métodos **descartados a propósito** — Scrum, GitFlow, microservicios, TDD estricto — con el motivo escrito en [`docs/process/README.md`](docs/process/README.md#métodos-considerados-y-descartados). Elegir método es parte del método.

---

## Documentación

Empieza por [**`docs/README.md`**](docs/README.md), que clasifica todo por tipo Diátaxis y te dice qué leer según lo que necesites.

Los tres más consultados:

- [`docs/providers.md`](docs/providers.md) — qué proveedor corre cada paso, cuánto cuesta, **y qué se probó y se descartó con la razón medida**
- [`docs/decisions/`](docs/decisions/) — las 11 decisiones de arquitectura
- [`docs/architecture.md`](docs/architecture.md) — arquitectura, riesgos y deuda técnica

---

## Estado

En producción en <https://unistudio.vercel.app>. Los tres pipelines funcionan end-to-end y `main` despliega automáticamente.

Lo que **no** está resuelto se lleva contado, no escondido: la orquestación es cliente-side (cerrar la pestaña pierde el progreso), `lingerie/page.tsx` tiene 6.210 líneas y es la mayor deuda del proyecto, algunos errores de proveedor se tragan sin diagnóstico, y falta usability testing formal. La lista completa y priorizada está en [`docs/architecture.md` §11](docs/architecture.md#11-riesgos-y-deuda-técnica).

---

## Licencia

Proyecto privado para Unistyles, Curazao.
