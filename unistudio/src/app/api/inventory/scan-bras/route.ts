// =============================================================================
// Scan BRAS Inventory — GET /api/inventory/scan-bras
//
// Lee `docs/inventory-final/images/bras/<REF>/*.{png,jpg,jpeg,webp}` y devuelve
// un JSON agrupado por REF con sus colores y ángulos detectados. Usado por el
// botón "Cargar inventario" en /pipelines/lingerie para pre-llenar la grilla
// con todas las fotos disponibles sin que la usuaria arrastre 128 archivos.
//
// La ruta SOLO funciona en Vercel si el folder existe en el build output, o en
// local si corre desde la raíz del repo. Si no encuentra el folder, devuelve
// un array vacío con mensaje claro (no crashea).
// =============================================================================

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Detectores replicados de /pipelines/lingerie/page.tsx — son pequeños y
// autocontenidos, así que duplicar es más seguro que hacer un import circular.
type PhotoAngle = "frontal" | "espalda" | "lado" | "detalle" | "flat" | "otra";

function detectPhotoAngle(filename: string): PhotoAngle {
  const f = filename.toLowerCase();
  if (/\b(patras|atras|espalda|back|rear|trasera|posterior)\b/.test(f)) return "espalda";
  if (/\b(delante|frente|frontal|front)\b/.test(f)) return "frontal";
  if (/\b(lado|side|perfil|lateral)\b/.test(f)) return "lado";
  if (/\b(detalle|detail|macro|closeup|close.?up|zoom|textura)\b/.test(f)) return "detalle";
  if (/\b(flat|flatlay|flat.?lay|packshot|ghost|mannequin|prenda.?sola)\b/.test(f)) return "flat";
  return "frontal";
}

function detectColor(filename: string): string | undefined {
  const f = filename.toLowerCase();
  const colors: [RegExp, string][] = [
    [/\b(berde|verde|green)\b/, "verde"],
    [/\b(beige|beis|nude|nuda|piel|habano|salmon|palo.?de.?rosa)\b/, "beige"],
    [/\b(blanco|blanca|white|hueso)\b/, "blanco"],
    [/\b(negro|negra|black)\b/, "negro"],
    [/\b(gris|grey|gray|plomo)\b/, "gris"],
    [/\b(rojo|roja|red|vino|wine|vinotinto)\b/, "rojo"],
    [/\b(rosa|rose|pink|fucsia|fuchsia|rosado|rosada)\b/, "rosa"],
    [/\b(azul|blue|celeste|cielo)\b/, "azul"],
    [/\b(morado|purple|violeta|lila|lavender)\b/, "morado"],
    [/\b(amarillo|yellow|mostaza|mustard)\b/, "amarillo"],
    [/\b(naranja|orange|coral|melon)\b/, "naranja"],
    [/\b(marron|marrón|brown|cafe|café|chocolate)\b/, "marrón"],
    [/\b(dorado|oro|gold)\b/, "dorado"],
    [/\b(plateado|silver)\b/, "plateado"],
    [/\b(turquesa|turquoise|menta|mint|aqua)\b/, "turquesa"],
  ];
  for (const [re, name] of colors) {
    if (re.test(f)) return name;
  }
  return undefined;
}

interface ScannedPhoto {
  filename: string;
  angle: PhotoAngle;
  color: string | undefined;
  /** Path relativo al /api/inventory/load proxy que sirve el archivo */
  relativePath: string;
}

interface ScannedRef {
  ref: string;
  photoCount: number;
  uniqueColors: string[];
  hasBackPhoto: boolean;  // si al menos 1 foto está tagged como espalda
  photos: ScannedPhoto[];
  /** Estimación de costo para procesar este REF en modo default */
  estimatedCost: number;
}

/**
 * Busca el folder de bras. Prioriza `public/inventory/bras/` (que se sirve
 * directamente en producción vía Vercel static) sobre `docs/inventory-final/`
 * (solo disponible en local dev porque el repo .vercelignore excluye docs/).
 *
 * Retorna { absPath, urlBase } donde urlBase es el prefijo HTTP desde el que
 * el browser puede cargar las imágenes (`<img src={urlBase}/011473/...`).
 */
function findBrasFolder(): { absPath: string; urlBase: string } | null {
  // 1) public/inventory/bras → servido en producción via Next.js static
  const publicPath = path.join(process.cwd(), "public", "inventory", "bras");
  try {
    if (fs.existsSync(publicPath) && fs.statSync(publicPath).isDirectory()) {
      return { absPath: publicPath, urlBase: "/inventory/bras" };
    }
  } catch { /* ignore */ }

  // 2) docs/inventory-final/images/bras (solo local dev — docs/ está en .vercelignore)
  const docsCandidates = [
    path.join(process.cwd(), "..", "docs", "inventory-final", "images", "bras"),
    path.join(process.cwd(), "docs", "inventory-final", "images", "bras"),
  ];
  for (const candidate of docsCandidates) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
        // En local dev servimos via /api/inventory/load-bras (ver abajo). En
        // producción esto no se va a alcanzar porque public/ gana.
        return { absPath: candidate, urlBase: "/api/inventory/load-bras" };
      }
    } catch { /* ignore */ }
  }

  return null;
}

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

// Costos estimados (debe mantenerse sincronizado con STEP_DEFS en lingerie/page.tsx)
const COSTS = {
  isolate: 0.02,
  model: 0.055,
  tryon: 0.02,
  photoBack: 0.075,
  photoFullBody: 0.075,
  productVideo: 0.05,
  modelVideo: 0.05,
};
// Por color dentro de la misma REF, la modelo se reusa (sharedModelUrl), así
// que el costo por color adicional es: isolate + tryon + photoBack +
// photoFullBody = ~0.19. Primer color agrega el model-create: ~0.24 más videos.
const COST_FIRST_COLOR = COSTS.isolate + COSTS.model + COSTS.tryon + COSTS.photoBack + COSTS.photoFullBody + COSTS.productVideo + COSTS.modelVideo;
const COST_NEXT_COLOR = COSTS.isolate + COSTS.tryon + COSTS.photoBack + COSTS.photoFullBody;

export async function GET() {
  try {
    const folder = findBrasFolder();
    if (!folder) {
      return NextResponse.json({
        success: false,
        error: "No se encontró la carpeta de inventario de bras. En producción debe estar en unistudio/public/inventory/bras/ (copiada del docs/inventory-final/images/bras/).",
        cwd: process.cwd(),
      }, { status: 404 });
    }
    const { absPath: brasFolder, urlBase } = folder;

    const refDirs = fs.readdirSync(brasFolder).filter((name) => {
      try {
        return fs.statSync(path.join(brasFolder, name)).isDirectory();
      } catch { return false; }
    });

    const refs: ScannedRef[] = [];
    for (const refDir of refDirs) {
      const refPath = path.join(brasFolder, refDir);
      let files: string[] = [];
      try {
        files = fs.readdirSync(refPath).filter((f) => {
          const ext = path.extname(f).toLowerCase();
          return IMAGE_EXTENSIONS.has(ext);
        });
      } catch {
        continue;
      }

      const photos: ScannedPhoto[] = files.map((filename) => ({
        filename,
        angle: detectPhotoAngle(filename),
        color: detectColor(filename),
        // URL que el browser puede usar directo como <img src>. En producción
        // público, en dev via load-bras. Encoded porque los nombres tienen
        // espacios y caracteres especiales.
        relativePath: `${urlBase}/${encodeURIComponent(refDir)}/${encodeURIComponent(filename)}`,
      }));

      const uniqueColors = Array.from(new Set(photos.map((p) => p.color).filter((c): c is string => !!c)));
      const hasBackPhoto = photos.some((p) => p.angle === "espalda");
      // Costo: 1 primer color (caro) + N-1 colores adicionales (reuso modelo)
      const nColors = Math.max(1, uniqueColors.length);
      const estimatedCost = COST_FIRST_COLOR + (nColors - 1) * COST_NEXT_COLOR;

      refs.push({
        ref: refDir,
        photoCount: photos.length,
        uniqueColors,
        hasBackPhoto,
        photos,
        estimatedCost,
      });
    }

    // Ordenar por cantidad de fotos descendente (REFs con más fotos = más
    // probable que sean los REFs principales que la usuaria quiere procesar).
    refs.sort((a, b) => b.photoCount - a.photoCount);

    const totalCost = refs.reduce((sum, r) => sum + r.estimatedCost, 0);
    const totalPhotos = refs.reduce((sum, r) => sum + r.photoCount, 0);

    return NextResponse.json({
      success: true,
      data: {
        source: brasFolder,
        refCount: refs.length,
        totalPhotos,
        totalEstimatedCost: totalCost,
        refs,
      },
    });
  } catch (error) {
    console.error("[/api/inventory/scan-bras] Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Error inesperado escaneando inventario de bras.",
    }, { status: 500 });
  }
}
