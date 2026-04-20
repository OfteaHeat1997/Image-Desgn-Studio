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
}

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
    id: "accesorios",
    name: "Accesorios / Joyas",
    // Commit 4 will redirect this to /pipelines/jewelry
    agentPreset: "agent-accesorios",
    paths: [
      "C:\\Users\\maria\\Desktop\\Unistyles Projects\\Unistyles inveotory images\\Accesorrios\\CATALOGADOS\\Aretes",
      "C:\\Users\\maria\\Desktop\\Unistyles Projects\\Unistyles inveotory images\\Accesorrios\\CATALOGADOS\\Collares",
      "C:\\Users\\maria\\Desktop\\Unistyles Projects\\Unistyles inveotory images\\Accesorrios\\CATALOGADOS\\Pulseras",
      "C:\\Users\\maria\\Desktop\\Unistyles Projects\\Unistyles inveotory images\\Accesorrios\\CATALOGADOS\\Sets",
      "C:\\Users\\maria\\Desktop\\Unistyles Projects\\Unistyles inveotory images\\Accesorrios\\CATALOGADOS\\Anillos",
    ],
  },
  {
    id: "lenceria",
    name: "Bras / Lenceria",
    // Commit 7 will redirect this to /pipelines/lingerie (currently still uses batch preset)
    agentPreset: "agent-lenceria",
    paths: [
      "C:\\Users\\maria\\Desktop\\Unistyles Projects\\Unistyles inveotory images\\bra",
    ],
  },
  {
    id: "pantys",
    name: "Panties / Ropa Interior",
    // Commit 7 will redirect this to /pipelines/lingerie with garmentType=panty
    agentPreset: "agent-pantys",
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
];

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function toWslPath(winPath: string): string {
  return winPath.replace(/^([A-Z]):\\/, (_, drive: string) => `/mnt/${drive.toLowerCase()}/`).replace(/\\/g, "/");
}

function scanFolder(dirPath: string): { files: string[]; count: number } {
  const wslPath = toWslPath(dirPath);

  try {
    if (!fs.existsSync(wslPath)) return { files: [], count: 0 };

    const entries = fs.readdirSync(wslPath, { withFileTypes: true });
    const imageFiles = entries
      .filter((e) => e.isFile() && IMAGE_EXTENSIONS.has(path.extname(e.name).toLowerCase()))
      .map((e) => path.join(wslPath, e.name));

    return { files: imageFiles, count: imageFiles.length };
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
      const result = scanFolder(p);
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
