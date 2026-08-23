# ADR-0001 — Construir un monolito modular en Next.js App Router, no microservicios

- **Estado:** Aceptado
- **Fecha:** 2026-04-12
- **Decide:** Paula Salazar
- **Afecta a:** todo el sistema

## Contexto

UniStudio reemplaza cinco herramientas SaaS (Photoroom, Claid, Pebblely, FASHN, remove.bg) que costaban más de $200/mes. Las restricciones reales del proyecto son:

- **Una sola desarrolladora**, sin equipo de operaciones.
- **Un solo usuario final** (Unistyles, Curazao). No hay multi-tenancy, ni concurrencia alta, ni SLA.
- **Presupuesto de infraestructura ≈ $0.** El gasto tiene que irse en llamadas a APIs de IA, no en servidores.
- El trabajo pesado (30 s a 4 min por imagen) lo hacen **APIs de terceros**, no nuestro CPU.

La tentación arquitectónica era separar cada módulo de procesamiento en su propio servicio, porque "así se hace en producción".

## Decisión

Se construye un **monolito modular** desplegado en Vercel: una sola aplicación Next.js 16 (App Router) donde el frontend y las rutas API viven en el mismo repositorio y el mismo deploy.

La modularidad se logra con **límites internos**, no con límites de red:

```
UI (components/modules/)
  -> hook (hooks/)
  -> HTTP a /api/<módulo>
  -> route.ts (validación en el borde)
  -> lib/processing/<módulo>.ts (lógica de negocio)
  -> lib/api/<proveedor>.ts (única capa que lee API keys)
```

La regla que sostiene la modularidad es que **un pipeline nunca llama a fal, Replicate o Anthropic directamente**: llama al módulo, y el módulo llama al proveedor. Ver [ADR-0003](0003-tres-pipelines-canonicos.md).

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| **Microservicios** (un servicio por módulo) | Añade service discovery, red entre procesos y observabilidad distribuida a un sistema con **un usuario**. El cuello de botella es la latencia de la API externa, no la nuestra: separar no hace nada más rápido. Coste operativo puro. |
| **Serverless functions sueltas** sin framework | Se pierde el App Router, el enrutado tipado y el deploy unificado. Habría que reimplementar a mano lo que Next.js ya da. |
| **Backend separado** (Express/FastAPI) + frontend estático | Dos repos, dos deploys, dos configuraciones de entorno y CORS — para una persona. El coste de coordinación supera el beneficio de la separación. |
| **Hexagonal / Clean Architecture completa** | Los ports & adapters ya existen donde importan: `lib/api/<proveedor>.ts` **es** un adapter. Formalizar el resto añadiría capas de indirección sin un segundo consumidor que las justifique. |

## Consecuencias

**Positivas**

- Un `git push` a `main` despliega todo el sistema. Sin orquestación.
- Refactorizar a través de capas es un cambio atómico, no una migración coordinada.
- El coste de infraestructura sigue siendo el del plan de Vercel; el gasto real es por llamada de IA.
- El límite de módulo se puede *mover* barato mientras el dominio todavía se está descubriendo — que es exactamente la fase del proyecto.

**Negativas / costo asumido**

- **No hay aislamiento de fallos.** Un error no capturado en una ruta puede tumbar el proceso. Se mitiga con un error boundary global (`app/error.tsx` + `global-error.tsx`) y con la política de null-guards de [ADR-0002](0002-base-de-datos-opcional.md).
- **No se puede escalar un módulo por separado.** Aceptable: no hay ningún módulo con carga suficiente para necesitarlo.
- Las rutas lentas **tienen que declararse una por una** en `vercel.json` con su `maxDuration`, o mueren en el timeout por defecto. Es una trampa recurrente y está documentada en `CLAUDE.md`.
- La disciplina de módulos **no la impone el compilador**: la impone la revisión. Si alguien llama a `fal` desde un pipeline, TypeScript no protesta.

## Evidencia

- El sistema lleva desde 2026-02-23 en producción con este diseño, hoy con **51 rutas API** y **70.831 líneas** de código fuente, sin haber necesitado dividirse.
- Auditoría de estabilidad del 2026-04-12: los 27 fallos encontrados fueron de *validación de entrada y manejo de estado*; ninguno de escala ni de aislamiento — que es justo lo que microservicios habría resuelto.
