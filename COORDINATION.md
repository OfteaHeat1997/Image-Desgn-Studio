# 🚦 COORDINATION — Registro entre terminales

> **Este archivo es la constancia compartida entre los terminales que trabajan en UniStudio.**
> Hay 3 entornos trabajando: **Desktop** (esta computadora), **Phone** (teléfono) y **Cloud** (cloud terminal).
> Antes de empezar cualquier trabajo grande, lee este archivo. Al terminar, deja tu nota aquí.

---

## ⚠️ EN CURSO AHORA — léelo antes de tocar nada

### 🖥️ Desktop terminal — Reestructuración de proyecto (2026-08-09)

**Qué está haciendo:** limpieza y reestructuración del repo para la revisión del lunes.
**Alcance (SOLO esto):**
1. Sacar del repo todo lo que **no es código** (research, notas personales, interview-prep, guías HTML gigantes, datos crudos) → se mueve a una carpeta EXTERNA: `C:\Users\maria\Documents\UniStudio-Workspace\` (fuera de GitHub, no se sube).
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

## 🗒️ Bitácora (cada terminal deja su nota, más reciente arriba)

| Fecha | Terminal | Qué hizo |
|-------|----------|----------|
| 2026-08-09 | Desktop | Inició reestructuración: workspace externo + limpieza docs + archivo de código muerto. |

---

*Regla de oro: si vas a mover, borrar o renombrar algo grande, primero anótalo aquí y avisa. Nunca `git add .` desde la raíz (ver CLAUDE.md).*
