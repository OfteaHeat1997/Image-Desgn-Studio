# Proceso y método de investigación

> **Tipo Diátaxis:** *Explanation*. Este documento no explica **qué** es UniStudio (eso es el [README](../../README.md)) ni **cómo** funciona (eso es [`docs/architecture.md`](../architecture.md)). Explica **cómo se llegó a las decisiones**: qué se investigó, con qué método, y qué se descartó.

UniStudio se construyó con una sola desarrolladora, sin equipo, contra ocho APIs externas cuyo comportamiento no está documentado en ningún sitio fiable. En ese contexto, el riesgo dominante no es escribir mal el código: es **construir bien lo equivocado** o **repetir un experimento que ya falló**.

Los dos marcos que se usan atacan exactamente eso: el **Double Diamond** ordena *qué problema* se resuelve, y el **DOT Framework** ordena *cómo se genera evidencia* para responderlo.

---

## 1. Double Diamond

El Double Diamond (Design Council, 2005) alterna dos veces entre divergir (abrir opciones) y converger (cerrar en una). El error clásico es saltar directo a *Develop*: construir la solución antes de haber definido el problema. Este proyecto lo cometió, y la recuperación está documentada abajo.

```
   DESCUBRIR          DEFINIR           DESARROLLAR         ENTREGAR
   (divergir)        (converger)        (divergir)         (converger)

      \                 /                  \                 /
       \               /                    \               /
        \             /                      \             /
         \___________/                        \___________/
        problema              PROBLEMA        soluciones        SOLUCIÓN
        explorado            DEFINIDO         exploradas       ENTREGADA
```

### Diamante 1 — el problema

**Descubrir (divergir).** Punto de partida: Unistyles paga más de $200/mes en cinco herramientas SaaS (Photoroom, Claid, Pebblely, FASHN, remove.bg) y aun así la fotografía de producto es un cuello de botella.

Lo que se exploró:

- **Inventario real:** 486 productos en 9 categorías, catalogados en [`docs/inventory.md`](../inventory.md). No es un dataset inventado — es el catálogo del negocio.
- **Panorama de proveedores:** qué APIs de IA existen para try-on, segmentación, fondos, upscaling y video, y qué cuesta cada una.
- **Panorama competitivo:** qué hace cada SaaS que se quiere reemplazar y cuánto cobra.

**Definir (converger).** Dos convergencias, y la segunda es la que salvó el proyecto.

*Primera:* el problema no es "hacen falta herramientas de edición", sino **"hacen falta 486 productos fotografiados con calidad de catálogo, a coste marginal y sin sesión de estudio"**.

*Segunda, y la importante:* durante meses se asumió que el problema era **la calidad** del resultado, y se trataron los fallos ("el bra sale distinto", "el frasco cambia", "la joya cambia de material") como bugs independientes de tres pipelines distintos.

El 2026-06-13 un experimento controlado (§2.3) demostró que era **un solo problema, y estructural**:

> **Un modelo generativo no preserva un producto atípico. Lo reemplaza por el promedio de su dataset.**

Esa reformulación es la definición real del problema, y está registrada como [ADR-0004](../decisions/0004-segmentacion-sobre-generacion.md). Reordenó la arquitectura entera: la jerarquía segmentación → warp → composición → generación se deriva directamente de ella.

**Reflexión honesta:** este proyecto entró en *Develop* antes de terminar *Define*. Se construyeron 18 módulos antes de entender que la fidelidad era el requisito dominante. El coste de ese salto fueron varias semanas de arreglos que trataban síntomas. La lección no es "el Double Diamond es bonito", es **que un problema mal definido produce bugs que parecen no tener relación entre sí**.

### Diamante 2 — la solución

**Desarrollar (divergir).** 18 módulos de procesamiento, 51 rutas API y una batería de experimentos con proveedores: seis motores de segmentación, seis de try-on, cuatro variables de Photoroom Virtual Model. Todo lo probado está en [`docs/providers.md`](../providers.md); lo decidido, en [`docs/decisions/`](../decisions/).

**Entregar (converger).** De ahí salen **tres** pipelines canónicos, no nueve, y el criterio de división no es la categoría comercial sino **la física de la toma** ([ADR-0003](../decisions/0003-tres-pipelines-canonicos.md)):

| Pipeline | Criterio | Productos |
|---|---|---:|
| Lencería | se lleva **puesto** sobre un cuerpo | 164 |
| Estáticos | es **rígido y se apoya** en una superficie | 240 |
| Joyería | es **pequeño y reflectante**, sobre el cuerpo | 82 |

486 = 100% del inventario. Coste medido end-to-end: **~$0.15 por producto en fotos, ~$0.55 con los dos videos** (bra `011473`, 2026-08-08).

---

## 2. DOT Framework

El **DOT Framework** (*Development Oriented Triangulation*, Fontys ICT) organiza la investigación en cinco estrategias. Su idea central es la **triangulación**: una conclusión sostenida por una sola estrategia es frágil; sostenida por dos o tres, es fiable.

| Estrategia | Pregunta que responde | Uso en este proyecto |
|---|---|---|
| **Library** | ¿Qué se sabe ya? | Alto |
| **Field** | ¿Qué pasa en el contexto real? | Medio |
| **Lab** | ¿Qué pasa en condiciones controladas? | **Muy alto — es la columna vertebral** |
| **Showroom** | ¿Qué opinan otros del resultado? | Bajo — brecha reconocida |
| **Workshop** | ¿Qué aprendo construyéndolo? | Alto |

### 2.1 Library — revisión de fuentes

*Métodos usados: literature study, available product analysis, expert interview (documentación de proveedores).*

- **Benchmarks públicos de segmentación:** Bria RMBG 2.0 lidera con ~90% frente al ~85% de las alternativas.
- **Análisis de producto disponible:** precios y capacidades reales de Photoroom (Basic €20 vs Plus €100, sandbox de 1.000 llamadas/mes), Uwear ($0.10/crédito, 100 gratis), FASHN, Leffa, fal.ai, Replicate.
- **Documentación técnica como fuente primaria:** leer la doc de FASHN reveló que `moderation_level: "permissive"` es el **valor por defecto** y sí admite ropa interior — desmontando una creencia que el código había arrastrado durante meses.
- **Lectura de la arquitectura de los modelos:** entender que Leffa usa el `AutoMasker` de CatVTON y se entrena con VITON-HD y DressCode fue lo que explicó por qué la vista trasera es imposible ([ADR-0006](../decisions/0006-leffa-descartado-vista-trasera.md)).

> **Hallazgo de método:** Library **por sí sola engaña**. El benchmark decía Bria; el experimento decía BiRefNet. Ver §2.3.

### 2.2 Field — el contexto real

*Métodos usados: document analysis, observation, problem analysis.*

- **El catálogo real de Unistyles** (486 productos, 9 categorías) es la fuente del dominio, no una simplificación.
- **Las fotos de entrada reales** definieron un límite duro: muchas tienen **204 px**. Ese dato — obtenido mirando el material real, no suponiendo — es el techo de calidad HD alcanzable, y cambió la elección de upscaler (Real-ESRGAN fiel, en vez de SUPIR, que **se inventaba texto** en la etiqueta).
- **Las referencias de producto conocidas** (bra REF 189307/212624, bra `011473`, rosario de joyería) funcionan como casos de prueba estables: cada experimento se corre sobre el mismo producto real.

**Brecha reconocida:** el Field se hizo sobre *artefactos* del negocio (catálogo, fotos, precios), no sobre *personas*. No hay entrevistas estructuradas ni observación de la usuaria trabajando. Es la debilidad metodológica más clara del proyecto.

### 2.3 Lab — experimentos controlados

*Métodos usados: A/B testing, data analytics, non-functional test, unit test.*

Es la estrategia dominante, y la que produce casi toda la evidencia de los ADR. El patrón es siempre el mismo: **misma entrada, una variable cambiada, resultado medido y fechado.**

**Experimento 1 — Segmentación de joyería (2026-08-09).**
Seis proveedores, la **misma foto** de un rosario:

| Proveedor | Tiempo | Resultado |
|---|---|---|
| **BiRefNet** | **1,8 s** | Completo, con textura en crucifijo y medalla |
| Grounded SAM | 78,9 s | Blanquea el crucifijo |
| Bria RMBG 2.0 | 4,0 s | No aísla |
| rembg | 8,4 s | No aísla |
| WithoutBG | — | Cae internamente a rembg |
| remove.bg | — | HTTP 400 |

**Library decía Bria. Lab dijo BiRefNet.** Cuando Library y Lab se contradicen sobre tu propio dominio, **gana Lab**: la calidad del borde depende del tipo de imagen, no del promedio del benchmark. → [ADR-0007](../decisions/0007-birefnet-aislar-joyeria.md).

**Experimento 2 — Fidelidad generativa (2026-06-13).**
Tres proveedores (SeedDream, Kolors, FASHN alta calidad) sobre el mismo bra atípico: sin aro, tirantes anchos, cierre frontal. Fotos de entrada buenas.
**Los tres normalizaron la prenda al mismo push-up genérico.** Un fallo idéntico en tres motores independientes no es un bug: es una propiedad de la técnica. → [ADR-0004](../decisions/0004-segmentacion-sobre-generacion.md).

**Experimento 3 — Photoroom Virtual Model (2026-08-08).**
Decisión binaria y cara: ¿se pagan €100/mes? Cuatro variables, una a una:

| Variable | Valores | Resultado |
|---|---|---|
| Color | negro, beige | 500 |
| Pose | standing, random | 500 |
| Presets | los del **ejemplo oficial** | 500 |
| Modo | sandbox y cuota real | 500 |

**Con test de control:** ghost mannequin en el **mismo** sandbox devolvió imagen correcta → el sandbox no era la causa. Sin ese control el descarte no sería concluyente. Todo en el sandbox gratuito: **el experimento costó $0 y evitó €100/mes**. → [ADR-0008](../decisions/0008-photoroom-virtual-model-descartado.md).

**Experimento 4 — Anclaje textual (2026-08-08).**
Descripción escrita a mano frente a ficha generada por Claude Vision, mismo producto. La automática (`cierre frontal: múltiples ganchos centrales verticales`) ganó: sin anclaje el try-on inventa una cremallera; con él aparecen los ganchos reales y el panel de malla lateral. → [ADR-0009](../decisions/0009-claude-vision-anclaje-fidelidad.md).

### 2.4 Showroom — validación externa

*Métodos usados: peer review (ADR + changelog como registro auditable), pitch.*

- El [registro de ADR](../decisions/) y el `CHANGELOG.md` sirven de revisión por pares diferida: cada decisión queda expuesta con su evidencia, falsable por quien venga después.
- El despliegue continuo a producción (`main` → Vercel) pone cada cambio delante de la usuaria real de forma inmediata.

**Brecha reconocida — es la más grande.** No hay usability testing formal, ni pruebas con usuarios distintos de la propietaria del negocio, ni evaluación heurística de Nielsen documentada, ni auditoría WCAG. Sí hubo una revisión de legibilidad **medida** (2026-08-09: 65 textos por debajo de 12 px, 16 tarjetas con contraste casi nulo sobre el fondo), pero fue autoevaluación, no Showroom. **Siguiente paso concreto:** una sesión de usability testing con guion sobre los tres pipelines, y una evaluación heurística de Nielsen sobre la página de setup.

### 2.5 Workshop — aprender construyendo

*Métodos usados: prototyping, proof of concept, design pattern research.*

- Los **18 módulos** funcionan como proofs of concept: cada uno prueba que un proveedor concreto se puede integrar antes de que ningún pipeline dependa de él.
- El **sandbox de Photoroom** (1.000 llamadas gratis/mes) permitió iterar sin gastar — construir *es* el método de investigación cuando la documentación no basta.
- Los **reverts documentados** son resultados de Workshop, no fracasos: `b9c6a36` (revert de `segmentation_free`), `771c694` (revert de la Foto Espalda), `feb0cfc` (revert de FASHN a Leffa en la lateral). Cada uno acotó el espacio de lo posible.

### 2.6 Triangulación — dónde se cruzan

La conclusión más fuerte del proyecto está sostenida por tres estrategias a la vez:

> **La fidelidad del producto se gana con segmentación, no con mejores prompts.**

| Estrategia | Aporte |
|---|---|
| **Lab** | Tres generativos independientes fallan igual sobre el mismo bra (2026-06-13) |
| **Library** | La arquitectura de VITON-HD/CatVTON explica *por qué* falla |
| **Workshop** | La regresión repetida (quitar → re-añadir → quitar el ghost de SeedDream) confirma el mecanismo en el código real |

Tres estrategias, una conclusión. Eso es triangulación, y por eso la decisión se considera estable.

---

## 3. Prácticas de ingeniería

Métodos aplicados de forma continua, no como fase.

| Método | Cómo se aplica aquí |
|---|---|
| **Trunk-Based Development** | Todo va a `main`. Sin ramas de larga vida. Deploy automático a Vercel. Encaja con una sola desarrolladora; con equipo requeriría revisión. |
| **Conventional Commits** | `fix(lingerie):`, `revert(joyeria):`, `perf(lingerie):`. El *scope* es el pipeline, lo que hace el historial filtrable por área. |
| **Documentation as Code** | La documentación vive en el repo, en Markdown, versionada junto al código. Un cambio de proveedor y su ADR van **en el mismo commit**. |
| **Feature Flags** | `LINGERIE_FLATTEN=0`, `DEBUG_KOLORS=1`. Permiten revertir en producción por variable de entorno, sin redeploy de código. |
| **Health Checks** | `/api/health` reporta qué proveedores responden. Primer sitio donde mirar cuando "no funciona nada". |
| **Rollback documentado** | Cada cambio de riesgo lleva escrito su procedimiento de reversión. |
| **Graceful degradation** | Sin `DATABASE_URL` la app funciona ([ADR-0002](../decisions/0002-base-de-datos-opcional.md)); el upscale de joyería usa `softFail` y nunca frena el pipeline. |
| **Pirámide de testing** | Jest unitario, Jest de integración, Playwright E2E, y `npm run smoke-test` contra producción. |
| **Static analysis** | ESLint (`lint:strict` con `--max-warnings 0`) y `tsc --noEmit` antes de mergear. |

### Métodos considerados y descartados

Elegir método es parte del método. Estos se evaluaron y **no** se adoptaron, a propósito:

| Método | Por qué no |
|---|---|
| **Scrum / SAFe / LeSS** | Ceremonias diseñadas para coordinar equipos. Con una persona serían teatro: daily consigo misma, retro consigo misma. Se usa un backlog priorizado y nada más. |
| **Microservicios / CQRS / Event Sourcing** | Resuelven problemas de escala y concurrencia que este sistema no tiene. Ver [ADR-0001](../decisions/0001-monolito-modular.md). |
| **GitFlow** | Ramas `develop` y `release` para un solo desarrollador que despliega varias veces al día son pura sobrecarga. |
| **TDD estricto** | El comportamiento crítico es la **salida visual de una API de terceros**, que no se puede afirmar en un test unitario. Se aplica TDD en la lógica determinista (Sharp, validación, routing) y evaluación por comparación de imágenes en el resto. |
| **Fine-tuning propio** | 486 productos es un dataset diminuto y el coste supera el presupuesto entero del proyecto. |

---

## 4. Cómo se mantiene todo esto vivo

La documentación de proceso se pudre más rápido que el código porque nada falla cuando queda desactualizada. Tres reglas lo evitan:

1. **Un cambio de proveedor y su ADR van en el mismo commit.** Nunca en commits separados.
2. **Una prueba sin fecha y sin resultado medido no entra.** Si no hay evidencia, el ADR queda en `Propuesto`, no en `Aceptado`.
3. **Lo que falló se escribe con el porqué.** Un proveedor descartado sin explicación se vuelve a probar en tres meses; con la razón escrita, no.

---

## 5. Referencias

- Design Council (2005). *The Double Diamond Design Process Model.*
- Fontys ICT. *DOT Framework — Development Oriented Triangulation.* <https://ictresearchmethods.nl/>
- Nygard, M. (2011). *Documenting Architecture Decisions.* → base del formato [ADR](../decisions/).
- Procida, D. *Diátaxis — A systematic framework for technical documentation.* <https://diataxis.fr/>
- Brown, S. *The C4 model for visualising software architecture.* <https://c4model.com/>
- Starke, G. & Hruschka, P. *arc42 — Template for architecture documentation.* <https://arc42.org/>
