import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// =============================================================================
// Inventory Scanner — GET /api/inventory/scan
// Scans the local inventory folders and returns categories with image counts.
//
// Two routing modes per category:
//   - `agentPreset` — legacy, loads a preset in /batch auto-mode
//   - `pipeline` + `pipelineParams` — new, redirects the user to a canonical
//     pipeline page (/pipelines/lingerie, /pipelines/static-product, etc.)
// =============================================================================

interface FolderConfig {
  id: string;
  name: string;
  /** Legacy routing — batch preset ID. Used when `pipeline` is not set. */
  agentPreset?: string;
  /** New routing — redirect URL to a canonical pipeline. Wins over agentPreset. */
  pipeline?: string;
  /** Query params to attach to the pipeline redirect (productType, brand, etc.). */
  pipelineParams?: Record<string, string>;
  paths: string[];
  /**
   * When true, `scanFolder` recurses into subdirectories (needed for bras/
   * organized por REF). Default false for flat folders (cremas/, desodorantes/).
   */
  recursive?: boolean;
}

/**
 * Repo root path — the scan route runs from `unistudio/` (Next.js cwd), but
 * inventory-final images viven en `../docs/inventory-final/images/` relativo
 * al repo. Resolver una sola vez.
 */
const REPO_ROOT = path.resolve(process.cwd(), '..');
const INVENTORY_FINAL = path.join(REPO_ROOT, 'docs', 'inventory-final', 'images');

/** Inventory source directories — mapped to pipelines or batch presets */
const INVENTORY_FOLDERS: FolderConfig[] = [
  {
    id: "colonias",
    name: "Colonias / Perfumes",
    pipeline: "/pipelines/static-product",
    pipelineParams: { productType: "perfume" },
    paths: [
      "C:\\Users\\maria\\Desktop\\Unistyles Projects\\Unistyles inveotory images\\catalogo colonias",
    ],
  },
  {
    id: "cremas",
    name: "Cremas / Skincare",
    pipeline: "/pipelines/static-product",
    pipelineParams: { productType: "cream" },
    paths: [
      "C:\\Users\\maria\\Desktop\\Unistyles Projects\\Unistyles inveotory images\\catalogo  cremas",
    ],
  },
  {
    id: "aretes",
    name: "Aretes",
    pipeline: "/pipelines/jewelry",
    pipelineParams: { subType: "earrings" },
    paths: [
      "C:\\Users\\maria\\Desktop\\Unistyles Projects\\Unistyles inveotory images\\Accesorrios\\CATALOGADOS\\Aretes",
    ],
  },
  {
    id: "collares",
    name: "Cadenas / Collares",
    pipeline: "/pipelines/jewelry",
    pipelineParams: { subType: "necklace" },
    paths: [
      "C:\\Users\\maria\\Desktop\\Unistyles Projects\\Unistyles inveotory images\\Accesorrios\\CATALOGADOS\\Collares",
    ],
  },
  {
    id: "pulseras",
    name: "Pulseras",
    pipeline: "/pipelines/jewelry",
    pipelineParams: { subType: "bracelet" },
    paths: [
      "C:\\Users\\maria\\Desktop\\Unistyles Projects\\Unistyles inveotory images\\Accesorrios\\CATALOGADOS\\Pulseras",
    ],
  },
  {
    id: "anillos",
    name: "Anillos",
    pipeline: "/pipelines/jewelry",
    pipelineParams: { subType: "ring" },
    paths: [
      "C:\\Users\\maria\\Desktop\\Unistyles Projects\\Unistyles inveotory images\\Accesorrios\\CATALOGADOS\\Anillos",
    ],
  },
  {
    id: "sets",
    name: "Sets de joyería",
    pipeline: "/pipelines/jewelry",
    pipelineParams: { subType: "set" },
    paths: [
      "C:\\Users\\maria\\Desktop\\Unistyles Projects\\Unistyles inveotory images\\Accesorrios\\CATALOGADOS\\Sets",
    ],
  },
  {
    id: "lenceria",
    name: "Bras / Lenceria",
    pipeline: "/pipelines/lingerie",
    pipelineParams: { productType: "bra" },
    paths: [
      "C:\\Users\\maria\\Desktop\\Unistyles Projects\\Unistyles inveotory images\\bra",
    ],
  },
  {
    id: "pantys",
    name: "Panties / Ropa Interior",
    pipeline: "/pipelines/lingerie",
    pipelineParams: { productType: "panty" },
    paths: [
      "C:\\Users\\maria\\Desktop\\Unistyles Projects\\Unistyles inveotory images\\Pantys",
    ],
  },
  {
    id: "desodorantes",
    name: "Desodorantes / Bloqueador",
    pipeline: "/pipelines/static-product",
    pipelineParams: { productType: "deodorant" },
    paths: [
      "C:\\Users\\maria\\Desktop\\Unistyles Projects\\Unistyles inveotory images\\DESODORANTES_HD",
      "C:\\Users\\maria\\Desktop\\Unistyles Projects\\Unistyles inveotory images\\CATALOGO BLOQUEADOR",
    ],
  },
  {
    id: "limpieza",
    name: "Limpieza Facial",
    pipeline: "/pipelines/static-product",
    pipelineParams: { productType: "facial" },
    paths: [
      "C:\\Users\\maria\\Desktop\\Unistyles Projects\\Unistyles inveotory images\\limpieza facial",
    ],
  },

  // =======================================================================
  // Gap 3 del audit: inventario FINAL post-limpieza familia (abril 2026).
  // Viene de docs/inventory-final/images/ — excluido de Vercel (docs/ en
  // .vercelignore) pero commiteado al repo. Solo funciona en dev local.
  // En producción estas entries retornan count:0 y la UI no las muestra.
  // =======================================================================
  {
    id: "inv-final-bras",
    name: "BH (inventory-final)",
    pipeline: "/pipelines/lingerie",
    pipelineParams: { productType: "bra" },
    paths: [path.join(INVENTORY_FINAL, "bras")],
    recursive: true, // organized by REF/<files>
  },
  {
    id: "inv-final-cremas",
    name: "Cremas (inventory-final)",
    pipeline: "/pipelines/static-product",
    pipelineParams: { productType: "cream" },
    paths: [path.join(INVENTORY_FINAL, "cremas")],
  },
  {
    id: "inv-final-bloqueador",
    name: "Bloqueador (inventory-final)",
    pipeline: "/pipelines/static-product",
    pipelineParams: { productType: "sunscreen" },
    paths: [path.join(INVENTORY_FINAL, "bloqueador")],
  },
  {
    id: "inv-final-desodorantes",
    name: "Desodorantes (inventory-final)",
    pipeline: "/pipelines/static-product",
    pipelineParams: { productType: "deodorant" },
    paths: [path.join(INVENTORY_FINAL, "desodorantes")],
  },
  {
    id: "inv-final-facial",
    name: "Limpieza Facial (inventory-final)",
    pipeline: "/pipelines/static-product",
    pipelineParams: { productType: "facial" },
    paths: [path.join(INVENTORY_FINAL, "limpieza-facial")],
  },
];

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function toWslPath(winPath: string): string {
  return winPath.replace(/^([A-Z]):\\/, (_, drive: string) => `/mnt/${drive.toLowerCase()}/`).replace(/\\/g, "/");
}

function scanFolder(dirPath: string, recursive = false): { files: string[]; count: number } {
  // WSL path translation only for Windows-style paths. Native Linux / already-resolved paths pasan igual.
  const resolvedPath = dirPath.match(/^[A-Z]:\\/) ? toWslPath(dirPath) : dirPath;

  try {
    if (!fs.existsSync(resolvedPath)) return { files: [], count: 0 };

    if (!recursive) {
      const entries = fs.readdirSync(resolvedPath, { withFileTypes: true });
      const imageFiles = entries
        .filter((e) => e.isFile() && IMAGE_EXTENSIONS.has(path.extname(e.name).toLowerCase()))
        .map((e) => path.join(resolvedPath, e.name));
      return { files: imageFiles, count: imageFiles.length };
    }

    // Recursive mode — para inventarios organizados por sub-REF (ej: bras/<REF>/*.png)
    const collected: string[] = [];
    const stack: string[] = [resolvedPath];
    while (stack.length > 0) {
      const current = stack.pop()!;
      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(current, e.name);
        if (e.isDirectory()) stack.push(full);
        else if (e.isFile() && IMAGE_EXTENSIONS.has(path.extname(e.name).toLowerCase())) {
          collected.push(full);
        }
      }
    }
    return { files: collected, count: collected.length };
  } catch {
    return { files: [], count: 0 };
  }
}

export interface InventoryCategory {
  id: string;
  name: string;
  /** Legacy — set for categories still using a /batch preset. */
  agentPreset?: string;
  /** New — URL to redirect the user to (a canonical pipeline). */
  pipeline?: string;
  /** Query params to attach to the pipeline redirect. */
  pipelineParams?: Record<string, string>;
  imageCount: number;
  folders: string[];
}

export async function GET() {
  const categories: InventoryCategory[] = INVENTORY_FOLDERS.map((folder) => {
    let totalCount = 0;
    const allFolders: string[] = [];

    for (const p of folder.paths) {
      const result = scanFolder(p, folder.recursive ?? false);
      totalCount += result.count;
      if (result.count > 0) {
        allFolders.push(p);
      }
    }

    return {
      id: folder.id,
      name: folder.name,
      agentPreset: folder.agentPreset,
      pipeline: folder.pipeline,
      pipelineParams: folder.pipelineParams,
      imageCount: totalCount,
      folders: allFolders,
    };
  });

  const totalImages = categories.reduce((sum, c) => sum + c.imageCount, 0);

  return NextResponse.json({
    success: true,
    data: { categories, totalImages },
  });
}
