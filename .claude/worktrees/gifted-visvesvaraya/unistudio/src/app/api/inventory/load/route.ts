import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// =============================================================================
// Inventory Image Loader — POST /api/inventory/load
// Loads images from a local inventory folder and returns them as base64 data URLs.
// Supports pagination via offset/limit.
// =============================================================================

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const MAX_IMAGES_PER_REQUEST = 10;

// Allowed base paths — only these Windows roots may be loaded
const ALLOWED_WIN_ROOTS = [
  "C:\\Users\\maria\\Desktop\\Unistyles Projects\\",
];

function toWslPath(winPath: string): string {
  return winPath.replace(/^([A-Z]):\\/, (_, drive: string) => `/mnt/${drive.toLowerCase()}/`).replace(/\\/g, "/");
}

/** Returns true only if the folder is under an allowed root (prevents path traversal) */
function isAllowedFolder(folder: string): boolean {
  // Reject any path containing traversal sequences
  if (folder.includes("..") || folder.includes("%2e") || folder.includes("%2E")) return false;
  return ALLOWED_WIN_ROOTS.some((root) => folder.startsWith(root));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { folder, offset = 0, limit = MAX_IMAGES_PER_REQUEST } = body as {
      folder: string;
      offset?: number;
      limit?: number;
    };

    if (!folder) {
      return NextResponse.json({ success: false, error: "folder is required" }, { status: 400 });
    }

    if (!isAllowedFolder(folder)) {
      return NextResponse.json({ success: false, error: "Folder not permitted." }, { status: 403 });
    }

    const wslPath = toWslPath(folder);

    if (!fs.existsSync(wslPath)) {
      return NextResponse.json({ success: false, error: `Folder not found: ${folder}` }, { status: 404 });
    }

    // Read all image files
    const entries = fs.readdirSync(wslPath, { withFileTypes: true });
    const allImages = entries
      .filter((e) => e.isFile() && IMAGE_EXTENSIONS.has(path.extname(e.name).toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));

    const total = allImages.length;
    const capped = Math.min(limit, MAX_IMAGES_PER_REQUEST);
    const slice = allImages.slice(offset, offset + capped);

    // Read each image file and convert to base64 data URL
    const images = slice.map((entry) => {
      const filePath = path.join(wslPath, entry.name);
      const buffer = fs.readFileSync(filePath);
      const ext = path.extname(entry.name).toLowerCase();
      const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
      const base64 = buffer.toString("base64");
      return {
        filename: entry.name,
        dataUrl: `data:${mime};base64,${base64}`,
        size: buffer.length,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        images,
        total,
        offset,
        limit: capped,
        hasMore: offset + capped < total,
      },
    });
  } catch (err) {
    console.error("[inventory/load] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
