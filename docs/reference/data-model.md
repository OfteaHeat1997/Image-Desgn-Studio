# Referencia — modelo de datos y estado

> **Tipo Diátaxis:** *Reference*. Verificado contra `unistudio/prisma/schema.prisma` y `src/stores/` el **2026-08-23**.

---

## Base de datos (Prisma 7 · PostgreSQL)

**`DATABASE_URL` es opcional.** Sin ella la aplicación funciona y solo se pierde el historial persistente. Toda llamada a Prisma va con null-guard — ver [ADR-0002](../decisions/0002-base-de-datos-opcional.md).

**Los binarios no viven aquí.** La base de datos guarda **URLs de Vercel Blob**, nunca bytes. Ver [ADR-0010](../decisions/0010-vercel-blob-almacenamiento.md).

7 modelos:

| Modelo | Para qué | Campos clave |
|---|---|---|
| **Project** | Contenedor padre de imágenes | `name`, `description`, `thumbnailUrl` |
| **Image** | Registro de imagen procesada | `originalUrl`, `processedUrl`, `width`, `height`, `fileSize` |
| **ProcessingJob** | Seguimiento de trabajo y coste | `operation`, `provider`, `status`, `cost`, `processingTime` |
| **BrandKit** | Identidad de marca | `colors`, `fonts`, `logoUrl`, `watermark`, `defaultBgStyle` |
| **AiModel** | Registro de modelos de IA generados | `gender`, `ageRange`, `skinTone`, `bodyType`, `pose` |
| **VideoProject** | Seguimiento de generación de video | `provider`, `status`, `cost`, `duration`, `aspectRatio` |
| **PromptTemplate** | Biblioteca de prompts | `category`, `prompt`, `negativePrompt`, `isPublic` |

### Comandos

```bash
npm run db:migrate    # prisma migrate dev
npm run db:push       # prisma db push (primera vez / sincronizar esquema)
npm run db:studio     # Prisma Studio
```

---

## Estado de cliente (Zustand)

7 stores en `src/stores/`. **3 persisten** a `localStorage`.

| Store | Persiste | Notas |
|---|---|---|
| `editor-store` | No | Estado del canvas |
| `editor-session-store` | No | Sesión de edición en curso |
| `gallery-store` | **Sí** | `addImage` es **síncrono**; la miniatura se genera async. Ese orden evita una race condition ya corregida |
| `video-store` | **Sí** | Envuelve las escrituras para tragarse `QuotaExceededError` |
| `settings-store` | **Sí** | Preferencias de la usuaria |
| `brand-store` | No (parcial) | Usa `partialize` para **excluir base64** de lo persistido |
| `language-store` | Sí | Idioma activo (ES / EN) |

### Invariantes que no se deben revertir

1. **`brand-store` → `partialize`.** Sin él, los payloads base64 revientan la cuota de `localStorage`.
2. **`video-store` → wrapper de `QuotaExceededError`.** Sin él, un `localStorage` lleno tumba la aplicación.
3. **`gallery-store.addImage` síncrono.** Invertir el orden reintroduce la race condition de la miniatura.
4. **Revocar las blob URLs** en los efectos de limpieza. `useAgentPipeline`, `UpscalePanel` y `EnhancePanel` ya lo hacen.

---

## Almacenamiento de binarios

| Dónde | Qué guarda | Durabilidad |
|---|---|---|
| **Vercel Blob** (`src/lib/api/blob.ts`) | Resultados finales e intermedios grandes | Durable |
| **Storage de fal.ai** | Imágenes intermedias entre pasos | **Efímero.** Depende del saldo de fal |
| **PostgreSQL** | URLs y metadatos. **Nunca bytes** | Durable, opcional |
| **`localStorage`** | Preferencias y referencias ligeras | Por navegador, con cuota |

> **Deuda abierta:** nada borra los blobs. El almacenamiento crece de forma monótona.
