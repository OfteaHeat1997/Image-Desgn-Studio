// =============================================================================
// Scan LINGERIE Inventory — GET /api/inventory/scan-lingerie?type=bras
//
// Versión genérica de scan-bras. Acepta query param `type` y busca el folder
// correspondiente. Soporta bras, panties, shapewear, fajas, bodysuits, sets.
// Si no existe inventario para ese tipo, devuelve 404 con mensaje claro para
// que la UI pueda decirle a la usuaria "no hay inventario, sube manualmente".
//
// Pedido directo de la usuaria: "el folder del lencería bra pero se te
// obviamente que no solo es bra pantys shapewear, ahora esta solo la función
// de bra de los folder. Si mi mamá quiere intentar con pantys ahora no
// funciona".
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type LingerieType = "bras" | "panties" | "shapewear" | "fajas" | "bodysuits" | "sets";
const VALID_TYPES: LingerieType[] = ["bras", "panties", "shapewear", "fajas", "bodysuits", "sets"];

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
  relativePath: string;
}

interface ScannedRef {
  ref: string;
  photoCount: number;
  uniqueColors: string[];
  hasBackPhoto: boolean;
  photos: ScannedPhoto[];
  estimatedCost: number;
}

function findInventoryFolder(type: LingerieType): { absPath: string; urlBase: string } | null {
  // 1) public/inventory/<type> → servido en producción
  const publicPath = path.join(process.cwd(), "public", "inventory", type);
  try {
    if (fs.existsSync(publicPath) && fs.statSync(publicPath).isDirectory()) {
      return { absPath: publicPath, urlBase: `/inventory/${type}` };
    }
  } catch { /* ignore */ }

  // 2) docs/inventory-final/images/<type> (solo dev local)
  const docsCandidates = [
    path.join(process.cwd(), "..", "docs", "inventory-final", "images", type),
    path.join(process.cwd(), "docs", "inventory-final", "images", type),
  ];
  for (const candidate of docsCandidates) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
        return { absPath: candidate, urlBase: `/api/inventory/load-bras` /* TODO: load-{type} */ };
      }
    } catch { /* ignore */ }
  }

  return null;
}

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

const COSTS = {
  isolate: 0.02,
  model: 0.055,
  tryon: 0.02,
  photoBack: 0.075,
  photoFullBody: 0.075,
  productVideo: 0.05,
  modelVideo: 0.05,
};
const COST_FIRST_COLOR = COSTS.isolate + COSTS.model + COSTS.tryon + COSTS.photoBack + COSTS.photoFullBody + COSTS.productVideo + COSTS.modelVideo;
const COST_NEXT_COLOR = COSTS.isolate + COSTS.tryon + COSTS.photoBack + COSTS.photoFullBody;

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const typeParam = (url.searchParams.get("type") ?? "bras") as LingerieType;
    if (!VALID_TYPES.includes(typeParam)) {
      return NextResponse.json({
        success: false,
        error: `Tipo "${typeParam}" no válido. Usa uno de: ${VALID_TYPES.join(", ")}.`,
      }, { status: 400 });
    }

    const folder = findInventoryFolder(typeParam);
    if (!folder) {
      return NextResponse.json({
        success: false,
        error: `No hay inventario pre-cargado de ${typeParam}. Sube tus fotos manualmente arrastrándolas o tocando el área de upload.`,
        type: typeParam,
        availableTypes: VALID_TYPES.filter((t) => findInventoryFolder(t) !== null),
      }, { status: 404 });
    }
    const { absPath: invFolder, urlBase } = folder;

    const refDirs = fs.readdirSync(invFolder).filter((name) => {
      try {
        return fs.statSync(path.join(invFolder, name)).isDirectory();
      } catch { return false; }
    });

    const refs: ScannedRef[] = [];
    for (const refDir of refDirs) {
      const refPath = path.join(invFolder, refDir);
      let files: string[] = [];
      try {
        files = fs.readdirSync(refPath).filter((f) => {
          const ext = path.extname(f).toLowerCase();
          return IMAGE_EXTENSIONS.has(ext);
        });
      } catch { continue; }

      const photos: ScannedPhoto[] = files.map((filename) => ({
        filename,
        angle: detectPhotoAngle(filename),
        color: detectColor(filename),
        relativePath: `${urlBase}/${encodeURIComponent(refDir)}/${encodeURIComponent(filename)}`,
      }));

      const uniqueColors = Array.from(new Set(photos.map((p) => p.color).filter((c): c is string => !!c)));
      const hasBackPhoto = photos.some((p) => p.angle === "espalda");
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

    refs.sort((a, b) => b.photoCount - a.photoCount);

    const totalCost = refs.reduce((sum, r) => sum + r.estimatedCost, 0);
    const totalPhotos = refs.reduce((sum, r) => sum + r.photoCount, 0);

    return NextResponse.json({
      success: true,
      data: {
        type: typeParam,
        source: invFolder,
        refCount: refs.length,
        totalPhotos,
        totalEstimatedCost: totalCost,
        refs,
      },
    });
  } catch (error) {
    console.error("[/api/inventory/scan-lingerie] Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Error inesperado escaneando inventario.",
    }, { status: 500 });
  }
}
