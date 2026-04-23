// =============================================================================
// Validate Background — POST /api/validate-bg
// Corre después de bg-generate para detectar fallos comunes:
//   - Producto duplicado (Flux a veces genera reflejo/copia del sujeto)
//   - Producto desaparecido (bg-remove excesivo)
//   - Fondo con otro producto distinto al sujeto
//
// Usa Claude Haiku con vision (~$0.0002 por llamada — 250× más barato que
// el bg-generate de $0.05 que validamos).
//
// Doc: docs/inventory-final/AUDIT_ESTATICOS.md — Gap 6
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { CLAUDE_HAIKU } from "@/lib/utils/constants";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY?.trim();

interface ValidateResult {
  productCount: number;
  looksLikeDuplicate: boolean;
  productMissing: boolean;
  reason: string;
  raw?: string;
}

async function fetchImageAsBase64(imageUrl: string): Promise<{ base64: string; mime: string }> {
  // data URL — parse directamente
  if (imageUrl.startsWith("data:")) {
    const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error("Invalid data URL");
    return { mime: match[1], base64: match[2] };
  }
  // HTTP URL — fetch + convert
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Failed to fetch image (${res.status})`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const mime = res.headers.get("content-type") || "image/jpeg";
  return { base64: buffer.toString("base64"), mime };
}

export async function POST(request: NextRequest) {
  try {
    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { success: false, error: "ANTHROPIC_API_KEY no configurada — validador desactivado" },
        { status: 503 },
      );
    }
    const body = await request.json();
    const { imageUrl } = body as { imageUrl: string };
    if (!imageUrl) {
      return NextResponse.json({ success: false, error: "imageUrl is required" }, { status: 400 });
    }

    const { base64, mime } = await fetchImageAsBase64(imageUrl);

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_HAIKU,
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mime, data: base64 } },
              {
                type: "text",
                text: `You are a QA reviewer for a product photography pipeline. The image should contain EXACTLY ONE product (perfume bottle, cream tube, sunscreen, deodorant, or skincare bottle) centered on a decorative background.

Respond with JSON ONLY, no prose:
{
  "productCount": number (how many DISTINCT product units are visible, counting reflections as separate if they show a full product),
  "looksLikeDuplicate": boolean (true if there's a duplicate/ghost/reflection copy of the product anywhere),
  "productMissing": boolean (true if you can't find ANY product — e.g. bg-remove ate it all),
  "reason": string (one short sentence, what you see)
}`,
              },
            ],
          },
        ],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      return NextResponse.json(
        { success: false, error: `Claude Haiku falló: ${errText.slice(0, 200)}` },
        { status: 502 },
      );
    }
    const claudeData = await claudeRes.json();
    const textOut = claudeData?.content?.[0]?.text ?? "";

    // Extract JSON from response
    let parsed: Partial<ValidateResult> = {};
    const jsonMatch = textOut.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        /* keep parsed empty, return raw */
      }
    }

    const result: ValidateResult = {
      productCount: typeof parsed.productCount === "number" ? parsed.productCount : 1,
      looksLikeDuplicate: Boolean(parsed.looksLikeDuplicate),
      productMissing: Boolean(parsed.productMissing),
      reason: parsed.reason || "No se pudo parsear la respuesta del validador",
      raw: parsed.reason ? undefined : textOut.slice(0, 300),
    };

    return NextResponse.json({
      success: true,
      data: result,
      cost: 0.0002, // approx — Claude Haiku con 1 imagen + 256 tokens out
    });
  } catch (err) {
    console.error("[validate-bg] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
