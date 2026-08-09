# 🚦 COORDINATION — Registro entre terminales

> **Este archivo es la constancia compartida entre los terminales que trabajan en UniStudio.**
> Hay 3 entornos trabajando: **Desktop** (esta computadora), **Phone** (teléfono) y **Cloud** (cloud terminal).
> Antes de empezar cualquier trabajo grande, lee este archivo. Al terminar, deja tu nota aquí.

---

## ⚠️ EN CURSO AHORA — léelo antes de tocar nada

### 🖥️ Desktop terminal — Reestructuración de proyecto (2026-08-09)

**Qué está haciendo:** limpieza y reestructuración del repo para la revisión del lunes.
**Alcance (SOLO esto):**







nnesecito 

2. Detectar y archivar **código muerto** (archivos sin imports, huérfanos) → se mueven a `UniStudio-Workspace\archive-dead-code\`, NO se borran.
3. Crear el documento-mapa `docs/README.md` (dónde está cada cosa).

**Zonas que Desktop NO toca (para no chocar con ustedes):**
- ❌ `src/app/pipelines/lingerie/` y `src/app/api/pipelines/lingerie/` — **zona activa de Uwear/lencería**.
- ❌ `docs/pipelines/lingerie.md`, `docs/research/uwear-accuracy-playbook.md`.
- ❌ Rama `claude/multilenguaje-switch-idioma-*` (terminal de i18n).
- ❌ `package-lock.json`, `.claude/settings.local.json` (cambios de otro terminal, no míos).

**Cómo hacen pull sin problema:** los movimientos son solo de `docs/` y archivos no-código. No toco código de `src/` (excepto archivar huérfanos ya confirmados sin imports). Después de que Desktop pushee, hagan `git pull --rebase origin main`.

---

## 📍 DÓNDE QUEDÓ CADA COSA (tras la reestructuración)

- **Código de la app:** `unistudio/` (sin cambios de ubicación).
- **Documentación técnica** (la que sí va en el repo): `docs/` — ver `docs/README.md`.
- **Research, notas, interview-prep, guías HTML, datos crudos, código muerto:** FUERA del repo, en
  `C:\Users\maria\Documents\UniStudio-Workspace\` — ver el `README.md` de esa carpeta.

---

## ⚠️ AVISO IMPORTANTE PARA TODOS LOS TERMINALES

**No usen `git add -A` ni `git add .` desde la raíz** (lo prohíbe `CLAUDE.md`). El 2026-08-09
un terminal hizo `git add -A` justo cuando Desktop tenía cambios en stage, y **absorbió los
borrados de docs de Desktop dentro de un commit de lencería**. Esta vez quedó benigno (nada se
perdió), pero la próxima puede mezclar trabajo a medias. **Staging con rutas explícitas siempre.**

## 🗒️ Bitácora (cada terminal deja su nota, más reciente arriba)

| Fecha | Terminal | Qué hizo |
|-------|----------|----------|
| 2026-08-09 | Desktop | ✅ Reestructuración docs COMPLETA: research/notas/interview-prep/datos-crudos/HTML movidos a `UniStudio-Workspace` externo. `docs/` quedó solo técnico. Creado `docs/README.md` (mapa). Pendiente: archivar código muerto + mover `UniStudioResearchGuide.docx` (abierto en Word). |
| 2026-08-09 | Desktop | Inició reestructuración: workspace externo + limpieza docs + archivo de código muerto. |

---

*Regla de oro: si vas a mover, borrar o renombrar algo grande, primero anótalo aquí y avisa. Nunca `git add .` desde la raíz (ver CLAUDE.md).*

---

## 📋 PENDIENTES DEL PIPELINE DE LENCERÍA (2026-08-09, sesión nocturna)

### Alta prioridad
- **Leffa tarda 2–4 min** en el Paso 2. Es el proveedor que respeta el producto,
  pero la espera es demasiado larga para iterar. Opciones a evaluar: correr los
  pasos independientes en paralelo, mostrar un preview rápido con SeedDream
  mientras Leffa termina, o precalentar la cola.
- **El Paso 1 (ghost de Photoroom) es NO DETERMINISTA**: a veces conserva la
  botonadura de ganchos y a veces no. Si sale sin ganchos, TODOS los pasos
  siguientes heredan el error. Regla: no aceptar el Paso 1 sin verificar el cierre.
- **El recorte real (grounded_sam) muerde los tirantes.** Probado sin éxito:
  nombrar los tirantes en el mask prompt, unión de máscaras candidatas, cierre
  morfológico (devolvía imagen en blanco).

### Sin verificar
- Paso 4 (Cuerpo Completo), Paso 5 (Video 360°), Paso 6 (Video Modelo).

### Deuda de diseño
- **"Crear Modelo IA" y Uwear se pisan**: Uwear genera su propia modelo (avatar
  fijo `UWEAR_AVATAR_ID`, default 21663), así que ese paso se descarta. Si se usa
  Uwear, conviene saltarlo.
- **El avatar por defecto es "Latina"** pero la tienda es para **Curaçao**
  (población mayoritariamente afrocaribeña). Los 3 avatares de mujer disponibles
  son de sistema y ninguno representa bien a esa clienta. Crear uno propio en
  platform.uwear.ai → Avatars y poner su id en `UWEAR_AVATAR_ID`.
- **El ETA del Paso 3 dice "~40s típico"** y en realidad tarda ~4 min (quedó del
  tiempo de SeedDream).

