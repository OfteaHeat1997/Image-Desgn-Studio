import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// =============================================================================
// Inventory Scanner — GET /api/inventory/scan
// Scans the local inventory folders and returns categories with image counts.
// =============================================================================

/** Inventory source directories — mapped to agent preset IDs */
const INVENTORY_FOLDERS: {
  id: string;
  name: string;
  agentPreset: string;
  paths: string[];
}[] = [
  {
    id: "colonias",
    name: "Colonias / Perfumes",
    agentPreset: "agent-perfumes",
    paths: [
      "C:\\Users\\maria\\Desktop\\Unistyles Projects\\Unistyles inveotory images\\catalogo colonias",
    ],
  },
  {
    id: "cremas",
    name: "Cremas / Skincare",
    agentPreset: "agent-cremas",
    paths: [
      "C:\\Users\\maria\\Desktop\\Unistyles Projects\\Unistyles inveotory images\\catalogo  cremas",
    ],
  },
  {
    id: "accesorios",
    name: "Accesorios / Joyas",
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
    agentPreset: "agent-lenceria",
    paths: [
      "C:\\Users\\maria\\Desktop\\Unistyles Projects\\Unistyles inveotory images\\bra",
    ],
  },
  {
    id: "pantys",
    name: "Panties / Ropa Interior",
    agentPreset: "agent-pantys",
    paths: [
      "C:\\Users\\maria\\Desktop\\Unistyles Projects\\Unistyles inveotory images\\Pantys",
    ],
  },
  {
    id: "desodorantes",
    name: "Desodorantes / Bloqueador",
    agentPreset: "agent-desodorantes",
    paths: [
      "C:\\Users\\maria\\Desktop\\Unistyles Projects\\Unistyles inveotory images\\DESODORANTES_HD",
      "C:\\Users\\maria\\Desktop\\Unistyles Projects\\Unistyles inveotory images\\CATALOGO BLOQUEADOR",
    ],
  },
  {
    id: "limpieza",
    name: "Limpieza Facial",
    agentPreset: "agent-desodorantes",
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
  agentPreset: string;
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
