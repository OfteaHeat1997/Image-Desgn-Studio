# ADR-0010 — Vercel Blob como almacenamiento durable; se prohíbe base64 en la base de datos

- **Estado:** Aceptado
- **Fecha:** 2026-08-09
- **Decide:** Paula Salazar
- **Afecta a:** `src/lib/api/blob.ts`, `/api/save-result`, `src/stores/`, esquema de Prisma

## Contexto

El sistema produce imágenes en cada paso y las mueve entre proveedores. El diseño original guardaba los resultados como **base64 dentro de PostgreSQL** y los estados intermedios en `localStorage`.

Los tres se rompieron a la vez:

1. La **base de datos** llegó a **491 MB** almacenando binarios que no consulta ni indexa.
2. **`localStorage`** empezó a lanzar `QuotaExceededError` con payloads en base64 (cuota de pocos MB).
3. Las funciones de Vercel devolvían **`FUNCTION_PAYLOAD_TOO_LARGE`** al pasar composites entre pasos del pipeline de estáticos.

Los tres síntomas tenían la misma causa: **binarios viajando y viviendo donde solo deberían viajar y vivir referencias.**

## Decisión

Los binarios se guardan en **Vercel Blob** (`src/lib/api/blob.ts`). La base de datos y el estado de cliente guardan **URLs, nunca bytes**.

Reglas derivadas:

1. Nada de base64 en Prisma.
2. `brand-store` usa `partialize` de Zustand para **excluir los payloads base64** de lo que se persiste a `localStorage`.
3. `video-store` envuelve las escrituras a `localStorage` para tragarse `QuotaExceededError` sin romper.
4. Un paso de pipeline que produce un composite **lo sube a Blob y pasa la URL** al siguiente paso, en vez de pasar el buffer.
5. Los resultados de video se guardan en la galería **por el flujo de URL**, no con `toPersistentThumbnail` — que falla sobre `.mp4`.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| **Base64 en Postgres** (el diseño original) | 491 MB de binarios que la base de datos no consulta ni indexa. Encarece backups y consultas para almacenar algo que un CDN sirve mejor y más barato. |
| **Dejar los binarios en el storage de fal.ai** | fal es storage *intermedio*, no durable. Y concentra el riesgo: si la cuenta de fal se queda sin saldo, se pierde el acceso a los resultados además de la capacidad de generar. |
| **S3 / Cloudflare R2** | Mejor precio a gran escala, pero añade credenciales, SDK y configuración de CORS a un proyecto que ya despliega en Vercel. Blob es cero configuración en el mismo entorno. |
| **Solo `localStorage`** | Cuota de pocos MB. Ya estaba fallando. |

## Consecuencias

**Positivas**

- **La base de datos bajó de 491 MB a 104 MB** — una reducción del 79%.
- Desaparecen `QuotaExceededError` y `FUNCTION_PAYLOAD_TOO_LARGE`.
- Las URLs son duraderas y compartibles; las imágenes se sirven por CDN, no por una consulta a la base de datos.
- Los payloads entre pasos del pipeline se vuelven pequeños, lo que reduce el riesgo de timeout.

**Negativas / costo asumido**

- Se añade una dependencia de plataforma más: el almacenamiento queda atado a Vercel.
- Hay que gestionar el ciclo de vida de los blobs. **Hoy nada los borra:** el almacenamiento crece de forma monótona. Deuda abierta.
- Las URLs de Blob son públicas por defecto — aceptable aquí (fotos de catálogo destinadas a publicarse), pero **no** sería aceptable para contenido privado.

## Evidencia

- **2026-08-09** (`5d79edf`) — *fix(storage): guardar imágenes en Vercel Blob (URL durable) y quitar base64 de la DB.* Base de datos de **491 MB → 104 MB**.
- **2026-08-10** (`a68fc62`) — *fix(static-product): subir composites a Blob — mata `FUNCTION_PAYLOAD_TOO_LARGE`.*
- Los guards de `localStorage` en `brand-store` y `video-store` están documentados en `CLAUDE.md` como invariantes que no se deben revertir.
