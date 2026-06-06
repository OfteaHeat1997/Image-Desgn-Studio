# Despliegue en Coolify

Guía paso a paso para desplegar **UniStudio** en [Coolify](https://coolify.io) (tu
"Vercel privado" auto-alojado). UniStudio ya no usa Vercel; Coolify es el
despliegue oficial.

> **Recuerda:** la app Next.js vive en la subcarpeta `unistudio/`, no en la raíz
> del repo. Esto importa al configurar el contexto de build en Coolify.

---

## 1. Requisitos previos

1. Un servidor (VPS) con Coolify instalado. Si aún no lo tienes:
   ```bash
   # En el servidor (Ubuntu/Debian), como root:
   curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
   ```
   Luego abre `http://IP_DEL_SERVIDOR:8000` y crea tu cuenta de administrador.
2. Tu repositorio de GitHub conectado a Coolify
   (Coolify → *Sources* → GitHub App).
3. Tus claves de API a mano (ver `unistudio/.env.example`).

---

## 2. Crear la base de datos PostgreSQL

UniStudio funciona sin base de datos, pero para guardar galería e historial
conviene tener Postgres.

1. En tu proyecto de Coolify: **+ New** → **Database** → **PostgreSQL**.
2. Coolify genera usuario, contraseña y nombre de base de datos.
3. Copia la **Connection String interna** (algo como
   `postgresql://usuario:clave@nombre-servicio:5432/basedatos`). La usarás como
   `DATABASE_URL` en la app.

---

## 3. Crear la aplicación

1. En el mismo proyecto: **+ New** → **Application** → tu repositorio de GitHub.
2. **Branch:** `main`.
3. **Build Pack:** `Dockerfile`.
4. **Base Directory / Build Context:** `unistudio`
   ⚠️ Esto es lo más importante: el Dockerfile y el código están en `unistudio/`,
   no en la raíz.
5. **Dockerfile Location:** `Dockerfile` (relativo al base directory).
6. **Port (puerto expuesto):** `3000`.

---

## 4. Variables de entorno

En la pestaña **Environment Variables** de la app, agrega (ver lista completa en
`unistudio/.env.example`):

| Variable | Obligatoria | Valor |
|---|---|---|
| `DATABASE_URL` | recomendada | La connection string interna del paso 2 |
| `REPLICATE_API_TOKEN` | sí | Tu token de Replicate |
| `FAL_KEY` | sí | Tu clave de fal.ai |
| `ANTHROPIC_API_KEY` | opcional | Para el agente de IA (Claude) |
| `FASHN_API_KEY` | opcional | Try-on premium |
| `HEDRA_API_KEY` | opcional | Avatares premium |
| `GOOGLE_TTS_API_KEY` | opcional | Texto a voz de Google |
| `NEXT_PUBLIC_APP_URL` | sí | Tu dominio real, p.ej. `https://studio.tudominio.com` |

> Las claves se leen con `.trim()` en el código, así que un salto de línea
> accidental no rompe nada — pero igual pégalas limpias.

---

## 5. Dominio y HTTPS

1. En **Domains**, pon tu dominio (p.ej. `studio.tudominio.com`).
2. Apunta ese dominio (registro DNS tipo `A`) a la IP de tu servidor.
3. Coolify genera el certificado HTTPS (Let's Encrypt) automáticamente.

---

## 6. Timeouts de las rutas largas (importante)

En Vercel los timeouts se configuraban en `vercel.json` (300s para video,
avatar, try-on, etc.). En Coolify **eso no aplica** — los maneja el proxy
(Traefik). Coolify ya usa timeouts amplios por defecto, pero si una generación
de video se corta, sube el timeout del proxy en la app:

- **Settings → Advanced** de la app, o
- Etiquetas de Traefik para subir `readTimeout` / `writeTimeout`.

Las rutas que pueden tardar hasta ~300s: `video`, `avatar`, `model-create`,
`tryon`, `ad-create`, `batch`, `bg-remove`, `jewelry-tryon`.

---

## 7. Migraciones de base de datos

El primer despliegue (o tras cambios de esquema Prisma) necesita crear/actualizar
las tablas. Opciones:

- **Manual (rápido):** en el **Terminal** de la app en Coolify ejecuta:
  ```bash
  npx prisma db push
  ```
- **Automático:** agrega un *Pre-deployment command* en Coolify:
  ```bash
  npx prisma migrate deploy
  ```

---

## 8. Desplegar y verificar

1. Pulsa **Deploy**. Coolify construye la imagen con el Dockerfile de producción
   (`next build` + `next start`) y la levanta.
2. Cuando termine, visita tu dominio.
3. Verifica los servicios conectados en:
   `https://tu-dominio/api/health`

---

## Desarrollo local (sin Coolify)

Para correr en tu máquina con recarga en caliente (hot reload) sigue usando
Docker Compose, que ahora apunta a `Dockerfile.dev`:

```bash
cd unistudio
cp .env.example .env.local   # rellena tus claves
npm run docker:up            # app + postgres con hot reload en :3000
```

O sin Docker:

```bash
cd unistudio
npm install
npm run dev
```

---

## Resumen de archivos relevantes

| Archivo | Para qué |
|---|---|
| `unistudio/Dockerfile` | Imagen de **producción** que usa Coolify |
| `unistudio/Dockerfile.dev` | Imagen de **desarrollo** (hot reload) para Compose |
| `unistudio/docker-compose.yml` | Desarrollo local (app + Postgres) |
| `unistudio/.env.example` | Lista completa de variables de entorno |
| `unistudio/vercel.json` | Obsoleto (era de Vercel); Coolify no lo usa |
