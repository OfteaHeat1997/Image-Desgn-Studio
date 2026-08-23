# ADR-0002 — PostgreSQL es opcional: la aplicación funciona sin base de datos

- **Estado:** Aceptado
- **Fecha:** 2026-04-12
- **Decide:** Paula Salazar
- **Afecta a:** `src/lib/db/`, todas las rutas API que persisten

## Contexto

UniStudio usa Prisma 7 sobre PostgreSQL para historial de procesamiento, brand kits, proyectos de video y plantillas de prompt. Pero el **valor central** del producto — transformar una foto de producto — no necesita base de datos: entra una imagen, sale una imagen.

Al mismo tiempo, la aplicación tiene que poder correr:

- en el portátil de la desarrolladora sin Docker levantado,
- en un preview deployment de Vercel sin `DATABASE_URL` configurada,
- en la máquina de un evaluador que solo quiere ver si funciona.

Si la base de datos fuera obligatoria, cualquiera de esos tres escenarios daría pantalla en blanco.

## Decisión

`DATABASE_URL` es **opcional**. El cliente de Prisma se instancia de forma perezosa y devuelve `null` cuando la variable no está.

**Toda** llamada a Prisma va con null-guard. Sin base de datos, la aplicación degrada limpiamente: se pierde el historial persistente, no la funcionalidad. El estado de sesión vive en Zustand (siete stores, tres persistidos a `localStorage`) y los resultados duraderos viven en Vercel Blob ([ADR-0010](0010-vercel-blob-almacenamiento.md)).

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| **Base de datos obligatoria** | Convierte un fallo de configuración en un fallo total del producto. Para una herramienta de un solo usuario, la relación coste/beneficio es pésima. |
| **SQLite como fallback** | Un segundo dialecto SQL, un segundo juego de migraciones y un segundo camino que probar — para almacenar historial que el usuario puede perder sin drama. |
| **Solo `localStorage`, sin base de datos** | `localStorage` tiene una cuota de pocos MB y ya provocó `QuotaExceededError` con payloads en base64. No sirve como única fuente de verdad. |

## Consecuencias

**Positivas**

- `npm run dev` funciona en un repo recién clonado, sin Docker ni cuenta de Postgres.
- Los preview deployments funcionan sin aprovisionar base de datos por rama.
- La degradación es *parcial y visible*, no un error 500.

**Negativas / costo asumido**

- **Cada** acceso a Prisma necesita el guard. Un `await prisma.image.create(...)` sin comprobar es un crash en runtime que TypeScript no atrapa. Es la regla más fácil de olvidar del proyecto.
- Hay dos comportamientos que mantener y probar: con base de datos y sin ella.

## Evidencia

- La regla está codificada en `CLAUDE.md` como restricción obligatoria: *"every Prisma call must be null-guarded because `DATABASE_URL` may be unset"*.
- 2026-08-09: mover las imágenes de base64-en-DB a Vercel Blob bajó la base de datos de **491 MB a 104 MB**, confirmando que la DB nunca debió ser el almacén de binarios.
