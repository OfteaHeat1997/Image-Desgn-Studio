import { NextRequest, NextResponse } from "next/server";
import type {
  AgentPlanRequest,
  AgentPlanResponse,
  AgentPlan,
  AgentType,
  ProductCategory,
  PipelineStep,
  BudgetTier,
  SocialContentType,
} from "@/types/agent";

// =============================================================================
// AI Agent Plan — POST /api/ai-agent/plan
// Plans a pipeline based on agent type + product category.
// Uses Claude Haiku when ANTHROPIC_API_KEY is set, otherwise local fallback.
// =============================================================================

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// -----------------------------------------------------------------------------
// Local fallback templates
// -----------------------------------------------------------------------------

function makeStep(
  module: PipelineStep["module"],
  label: string,
  params: Record<string, unknown>,
  cost: number,
  reasoning: string,
): PipelineStep {
  return {
    id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    module,
    label,
    params,
    estimatedCost: cost,
    reasoning,
  };
}

function getEcommercePipeline(
  category: ProductCategory,
  budget: BudgetTier,
): PipelineStep[] {
  const shadowType =
    category === "perfume"
      ? "reflection"
      : category === "lingerie"
        ? "contact"
        : "drop";

  const shadowLabel =
    shadowType === "reflection"
      ? "Reflejo elegante"
      : shadowType === "contact"
        ? "Sombra de contacto"
        : "Sombra suave";

  const steps: PipelineStep[] = [
    makeStep(
      "bg-remove",
      "Quitar fondo",
      { provider: "browser" },
      0,
      "Eliminamos el fondo para aislar el producto sobre transparencia.",
    ),
    makeStep(
      "enhance",
      "Mejorar imagen",
      { preset: "product-clean" },
      0,
      "Ajuste automático de brillo, contraste y nitidez para look profesional.",
    ),
    makeStep(
      "shadows",
      shadowLabel,
      { type: shadowType, provider: "browser" },
      0,
      `Sombra tipo ${shadowType} ideal para ${category}.`,
    ),
    makeStep(
      "outpaint",
      "Extender a 1:1 fondo blanco",
      { platform: "instagram", prompt: "clean white background, product photography" },
      budget === "free" ? 0 : 0.05,
      "Extendemos la imagen a formato cuadrado con fondo blanco uniforme.",
    ),
  ];

  // Free budget: skip outpaint (uses paid API)
  if (budget === "free") {
    steps.pop();
  }

  return steps;
}

function getModeloPipeline(
  category: ProductCategory,
  budget: BudgetTier,
  prefs?: AgentPlanRequest["preferences"],
): PipelineStep[] {
  const isJewelry = ["earrings", "rings", "necklace", "bracelet", "watch", "sunglasses"].includes(category);

  const steps: PipelineStep[] = [
    makeStep(
      "bg-remove",
      "Aislar producto",
      { provider: "browser" },
      0,
      "Eliminamos el fondo original (evitar copyright de foto de marca).",
    ),
    makeStep(
      "model-create",
      "Crear modelo IA",
      {
        gender: prefs?.gender ?? "female",
        ageRange: prefs?.ageRange ?? "26-35",
        skinTone: prefs?.skinTone ?? "medium",
        bodyType: prefs?.bodyType ?? "average",
        pose: prefs?.pose ?? "standing",
        expression: "confident",
        hairStyle: "natural professional",
        background: "studio white",
      },
      budget === "free" ? 0 : 0.055,
      "Generamos un modelo IA original con las caracteristicas elegidas.",
    ),
  ];

  if (isJewelry) {
    const jewelryType = category === "earrings"
      ? "earrings"
      : category === "rings"
        ? "ring"
        : category === "necklace"
          ? "necklace"
          : category === "bracelet"
            ? "bracelet"
            : category === "watch"
              ? "watch"
              : "sunglasses";
    steps.push(
      makeStep(
        "jewelry-tryon",
        `Probar ${category} en modelo`,
        { type: jewelryType },
        budget === "free" ? 0 : 0.05,
        `Colocamos la joyeria (${category}) en el modelo IA generado.`,
      ),
    );
  } else {
    const garmentCategory =
      category === "lingerie" ? "one-pieces" : "tops";
    steps.push(
      makeStep(
        "tryon",
        "Vestir modelo con prenda",
        { provider: "idm-vton", category: garmentCategory },
        budget === "free" ? 0 : 0.02,
        "Virtual try-on: el modelo IA viste la prenda aislada.",
      ),
    );
  }

  steps.push(
    makeStep(
      "enhance",
      "Mejorar resultado final",
      { preset: "product-clean" },
      0,
      "Ajuste final de calidad para resultado profesional.",
    ),
  );

  // Free budget: remove paid steps
  if (budget === "free") {
    return steps.filter((s) => s.estimatedCost === 0);
  }

  return steps;
}

function getSocialPipeline(
  category: ProductCategory,
  budget: BudgetTier,
  contentType?: SocialContentType,
): PipelineStep[] {
  const ct = contentType ?? "hero";

  if (ct === "avatar") {
    return [
      makeStep(
        "video",
        "Video con avatar IA",
        { provider: "kenburns", category: "avatar" },
        budget === "premium" ? 0.04 : 0,
        "Creamos un video con avatar hablante para redes sociales.",
      ),
    ];
  }

  if (ct === "product-video") {
    return [
      makeStep(
        "bg-remove",
        "Quitar fondo",
        { provider: "browser" },
        0,
        "Aislamos el producto.",
      ),
      makeStep(
        "enhance",
        "Mejorar imagen",
        { preset: "product-clean" },
        0,
        "Mejoramos calidad antes de generar video.",
      ),
      makeStep(
        "video",
        "Generar video de producto",
        {
          provider: budget === "free" ? "kenburns" : "wan-2.2-fast",
          prompt: `Cinematic product video of ${category}, smooth camera motion, professional lighting`,
        },
        budget === "free" ? 0 : 0.05,
        "Video cinematico del producto para redes sociales.",
      ),
    ];
  }

  const isVideo = ["ig-reel", "tiktok", "ig-story"].includes(ct);

  const steps: PipelineStep[] = [
    makeStep(
      "bg-remove",
      "Quitar fondo",
      { provider: "browser" },
      0,
      "Aislamos el producto para nuevo fondo creativo.",
    ),
    makeStep(
      "bg-generate",
      "Fondo creativo IA",
      {
        mode: ct === "hero" ? "precise" : "creative",
        style: ct === "hero" ? "luxury-lifestyle" : "trendy-colorful",
      },
      budget === "free" ? 0 : 0.05,
      ct === "hero"
        ? "Fondo lifestyle de lujo para hero/banner."
        : "Fondo creativo tematico para categoria/redes.",
    ),
    makeStep(
      "enhance",
      "Mejorar composicion",
      { preset: "product-clean" },
      0,
      "Mejoramos la composicion final.",
    ),
    makeStep(
      "outpaint",
      ct === "hero" ? "Extender a 16:9" : "Ajustar formato",
      {
        platform: ct === "hero" ? "twitter" : "instagram",
        prompt: "seamless extension, professional product photography",
      },
      budget === "free" ? 0 : 0.05,
      `Extendemos al formato ideal para ${ct}.`,
    ),
  ];

  if (isVideo) {
    steps.push(
      makeStep(
        "video",
        "Generar video",
        {
          provider: budget === "free" ? "kenburns" : "wan-2.2-fast",
          prompt: `Smooth cinematic ${category} showcase, professional lighting`,
        },
        budget === "free" ? 0 : 0.05,
        "Animamos la composicion en video para redes.",
      ),
    );

    const templateMap: Record<string, string> = {
      "ig-reel": "instagram-reel",
      "tiktok": "tiktok",
      "ig-story": "instagram-story",
    };
    steps.push(
      makeStep(
        "ad-create",
        `Crear anuncio ${ct}`,
        { template: templateMap[ct] ?? "instagram-reel" },
        0,
        "Formateamos el video como anuncio listo para publicar.",
      ),
    );
  }

  // Free budget: filter out paid steps
  if (budget === "free") {
    return steps.filter((s) => s.estimatedCost === 0);
  }

  return steps;
}

// ---------------------------------------------------------------------------
// Catálogo pipeline — generates Leonisa-style multi-angle product photo set
//
// FLOW:
// 1. BG-Remove: remove the Leonisa model + background → isolate JUST the bra
//    (watermark gets removed automatically since it's on the model/background)
// 2. For each angle (front, back, side, lifestyle):
//    a. Model-Create: generate NEW AI model in that pose (white bg)
//    b. Try-On: put the isolated bra on the new model
// 3. Infographics: add text/arrows overlay on front + back results
// ---------------------------------------------------------------------------

function getCatalogoPipeline(
  category: ProductCategory,
  budget: BudgetTier,
  prefs?: AgentPlanRequest["preferences"],
): PipelineStep[] {
  const gender = prefs?.gender ?? "female";
  const ageRange = prefs?.ageRange ?? "25-35";
  const skinTone = prefs?.skinTone ?? "medium";
  const bodyType = prefs?.bodyType ?? "curvy";
  const garmentCat = category === "lingerie" ? "one-pieces" : "tops";

  const steps: PipelineStep[] = [];

  // PASO 1: Quitar modelo Leonisa + fondo → aislar solo el bra
  // El watermark se va automaticamente porque esta sobre la modelo/fondo
  steps.push(
    makeStep(
      "bg-remove",
      "Quitar modelo Leonisa — aislar solo el bra",
      { provider: "browser" },
      0,
      "Removemos la modelo original y el fondo. Queda solo el bra aislado (sin copyright).",
    ),
  );

  // PASO 3: Crear modelo IA nueva + vestirla — VISTA FRONTAL
  steps.push(
    makeStep(
      "model-create",
      "Crear modelo IA — vista frontal",
      {
        gender, ageRange, skinTone, bodyType,
        pose: "standing",
        expression: "smile",
        hairStyle: "long wavy hair",
        background: "studio white",
        _catalogAngle: "front",
      },
      0.055,
      "Generamos modelo nueva de frente — foto principal del catalogo.",
    ),
  );

  steps.push(
    makeStep(
      "tryon",
      "Vestir modelo (frontal)",
      { provider: "idm-vton", category: garmentCat, _catalogAngle: "front" },
      0.02,
      "Ponemos el bra aislado en la modelo nueva — vista frontal.",
    ),
  );

  // PASO 4: Crear modelo IA + vestirla — VISTA ESPALDA
  steps.push(
    makeStep(
      "model-create",
      "Crear modelo IA — vista espalda",
      {
        gender, ageRange, skinTone, bodyType,
        pose: "back-view",
        expression: "neutral",
        hairStyle: "long wavy hair pulled to one side",
        background: "studio white",
        _catalogAngle: "back",
      },
      0.055,
      "Generamos modelo de espalda — muestra cobertura y broches traseros.",
    ),
  );

  steps.push(
    makeStep(
      "tryon",
      "Vestir modelo (espalda)",
      { provider: "idm-vton", category: garmentCat, _catalogAngle: "back" },
      0.02,
      "Ponemos el bra en la modelo — vista trasera.",
    ),
  );

  // PASO 5: Crear modelo IA + vestirla — VISTA LATERAL 3/4
  steps.push(
    makeStep(
      "model-create",
      "Crear modelo IA — vista lateral",
      {
        gender, ageRange, skinTone, bodyType,
        pose: "three-quarter",
        expression: "confident",
        hairStyle: "long wavy hair",
        background: "studio white",
        _catalogAngle: "side",
      },
      0.055,
      "Generamos modelo en vista 3/4 — muestra silueta y ajuste lateral.",
    ),
  );

  steps.push(
    makeStep(
      "tryon",
      "Vestir modelo (lateral)",
      { provider: "idm-vton", category: garmentCat, _catalogAngle: "side" },
      0.02,
      "Ponemos el bra en la modelo — vista lateral.",
    ),
  );

  // PASO 6: Crear modelo IA + vestirla — POSE LIFESTYLE
  steps.push(
    makeStep(
      "model-create",
      "Crear modelo IA — pose lifestyle",
      {
        gender, ageRange, skinTone, bodyType,
        pose: "casual",
        expression: "relaxed",
        hairStyle: "long wavy hair, natural look",
        background: "studio white",
        _catalogAngle: "lifestyle",
      },
      0.055,
      "Generamos modelo en pose relajada — foto lifestyle natural.",
    ),
  );

  steps.push(
    makeStep(
      "tryon",
      "Vestir modelo (lifestyle)",
      { provider: "idm-vton", category: garmentCat, _catalogAngle: "lifestyle" },
      0.02,
      "Ponemos el bra en la modelo — pose lifestyle.",
    ),
  );

  // PASO 7: Infografías con texto (estilo Leonisa "discover")
  steps.push(
    makeStep(
      "infographic",
      "Infografia frontal con features",
      {
        features: [
          { title: "Alto", subtitle: "CUBRIMIENTO", position: "center-left" },
          { title: "Soporte", subtitle: "REFORZADO", position: "bottom-left" },
        ],
        style: "light",
        _catalogAngle: "info-front",
        _useResult: "front",
      },
      0,
      "Agregamos texto de caracteristicas sobre la foto frontal — estilo Leonisa.",
    ),
  );

  steps.push(
    makeStep(
      "infographic",
      "Infografia espalda con features",
      {
        features: [
          { title: "Espalda", subtitle: "SUAVIZANTE", position: "center-left" },
          { title: "Broches", subtitle: "4 NIVELES DE AJUSTE", position: "bottom-left" },
        ],
        style: "light",
        _catalogAngle: "info-back",
        _useResult: "back",
      },
      0,
      "Agregamos texto de caracteristicas sobre la foto trasera — estilo Leonisa.",
    ),
  );

  // Free budget: can't do any of this (needs model-create + tryon)
  if (budget === "free") {
    return steps.filter((s) => s.estimatedCost === 0);
  }

  return steps;
}

function buildFallbackPlan(req: AgentPlanRequest): AgentPlan {
  const budget = req.budget ?? "economic";
  const analysis = req.imageAnalysis;
  let steps: PipelineStep[];
  let name: string;
  let description: string;

  switch (req.agentType) {
    case "ecommerce":
      steps = getEcommercePipeline(req.productCategory, budget);
      name = "Agente E-Commerce";
      description = `Pipeline de producto ${req.productCategory} para tienda online. Fondo blanco, uniforme, HD.`;
      break;
    case "modelo":
      steps = getModeloPipeline(req.productCategory, budget, req.preferences);
      name = "Agente Modelo";
      description = `Crear modelo IA con ${req.productCategory}. Evita copyright, genera variantes originales.`;
      break;
    case "social":
      steps = getSocialPipeline(req.productCategory, budget, req.contentType);
      name = "Agente Redes Sociales";
      description = `Contenido para redes: ${req.contentType ?? "hero"} con ${req.productCategory}.`;
      break;
    case "catalogo":
      steps = getCatalogoPipeline(req.productCategory, budget, req.preferences);
      name = "Agente Catalogo Completo";
      description = `Set completo de fotos de catalogo: frontal, espalda, lateral, lifestyle + infografias. Estilo Leonisa.`;
      break;
    default:
      steps = getEcommercePipeline(req.productCategory, budget);
      name = "Agente E-Commerce";
      description = "Pipeline por defecto.";
  }

  // --- Smart adjustments based on image analysis ---
  if (analysis) {
    // Prepend watermark removal if detected (paid only)
    if (analysis.hasWatermark && budget !== "free") {
      steps.unshift(
        makeStep(
          "inpaint",
          "Remover marca de agua",
          { prompt: "Remove watermark, logo, and text overlay completely", provider: "kontext" },
          0.05,
          "Marca de agua detectada — la removemos antes de procesar.",
        ),
      );
    }

    // CRITICAL: Ensure bg-remove is present when image has complex/colored background
    // This fixes the issue where the agent gets confused with non-white backgrounds
    const hasBgRemove = steps.some((s) => s.module === "bg-remove");
    const bgType = analysis.backgroundType as string;
    const needsBgRemove =
      bgType === "complex" ||
      bgType === "colored" ||
      bgType === "gradient" ||
      // If background is NOT white and NOT transparent, we need to remove it
      (bgType !== "transparent" && bgType !== "white");

    if (needsBgRemove && !hasBgRemove) {
      // Insert bg-remove as the first step (or after inpaint if watermark removal is first)
      const insertIdx = steps.findIndex((s) => s.module === "inpaint") >= 0 ? 1 : 0;
      steps.splice(
        insertIdx,
        0,
        makeStep(
          "bg-remove",
          "Quitar fondo (detectado automaticamente)",
          { provider: "browser" },
          0,
          `Fondo ${analysis.backgroundType} detectado — lo removemos primero para mejor resultado.`,
        ),
      );
    }

    // Skip bg-remove ONLY if background is already transparent or white AND agent is e-commerce
    if (
      (analysis.backgroundType === "transparent" || analysis.backgroundType === "white") &&
      req.agentType === "ecommerce"
    ) {
      steps = steps.filter((s) => s.module !== "bg-remove");
    }

    // Add enhance if lighting/color issues detected and not already in pipeline
    if (
      (analysis.lightingQuality !== "good" || analysis.colorBalance !== "good") &&
      !steps.some((s) => s.module === "enhance")
    ) {
      // Insert enhance early (after bg-remove or inpaint, before shadows/outpaint)
      const insertIndex = Math.max(
        steps.findIndex((s) => s.module === "bg-remove"),
        steps.findIndex((s) => s.module === "inpaint"),
      ) + 1;
      steps.splice(
        Math.max(insertIndex, 1),
        0,
        makeStep(
          "enhance",
          "Corregir iluminacion/color",
          { preset: "auto" },
          0,
          `Correccion automatica: ${analysis.lightingQuality !== "good" ? "iluminacion " + analysis.lightingQuality : ""}${analysis.colorBalance !== "good" ? " color " + analysis.colorBalance : ""}.`,
        ),
      );
    }

    // Append upscale if low resolution and not already in pipeline (paid only)
    if (analysis.isLowResolution && !steps.some((s) => s.module === "upscale") && budget !== "free") {
      steps.push(
        makeStep(
          "upscale",
          "Escalar resolucion",
          { provider: "real-esrgan", scale: 2 },
          0.02,
          `Resolucion baja (${analysis.width}x${analysis.height}) — escalamos a 2x para e-commerce.`,
        ),
      );
    }
  }

  const totalCost = steps.reduce((sum, s) => sum + s.estimatedCost, 0);
  const durationMin = steps.length * 8;

  return {
    id: `plan-${Date.now()}`,
    name,
    description,
    agentType: req.agentType,
    steps,
    totalEstimatedCost: totalCost,
    estimatedDuration: `~${durationMin}s`,
  };
}

// -----------------------------------------------------------------------------
// Claude Haiku planning
// -----------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an AI pipeline planner for UniStudio, a product photography platform for Unistyles (lingerie/beauty e-commerce in Curacao).

You plan image processing pipelines by selecting and ordering modules. You MUST respond with valid JSON only — no markdown, no explanation.

## Available Modules (with costs)
- bg-remove: Remove background. Providers: "browser" ($0), "withoutbg" ($0), "replicate" ($0.01). Params: {provider}
- bg-generate: Generate new background. Modes: "precise"/"creative"/"fast". Cost: $0.05. Params: {mode, style}
- enhance: Improve quality (free, local sharp). Presets: auto, product-clean, warm-lifestyle, cool-modern. Params: {preset}
- shadows: Add shadows. Types: "drop"/$0, "contact"/$0, "reflection"/$0, "ai-relight"/$0.04, "ai-kontext"/$0.05. Params: {type, provider:"browser"|"replicate"}
- outpaint: Extend image. Cost: $0.05. Platforms: amazon, shopify, instagram, tiktok. Params: {platform, prompt}
- upscale: Upscale resolution. Cost: $0.02-0.05. Params: {provider, scale}
- model-create: Generate AI model person. Cost: $0.055. Params: {gender, ageRange, skinTone, bodyType, pose, expression, hairStyle, background}
- tryon: Virtual try-on (garment on model). Cost: $0.02. Params: {provider:"idm-vton"|"kolors"|"fashn", category:"tops"|"bottoms"|"one-pieces"|"dresses"|"full-body"}
- jewelry-tryon: Jewelry on model. Cost: $0.05. Params: {type:"earrings"|"necklace"|"ring"|"bracelet"|"watch"|"sunglasses"}
- inpaint: Edit specific areas. Cost: $0.03-0.05. Params: {prompt, provider}
- video: Generate video. Providers: "kenburns" ($0), "ltx-video" ($0.04), "wan-2.2-fast" ($0.05). Params: {provider, prompt, category}
- ad-create: Format as ad. Templates: instagram-reel, tiktok, facebook-ad, youtube-short, instagram-story, pinterest-pin. Params: {template}

## 4 Agent Types
1. ecommerce: Product photos for web store. Goal: white bg, uniform, HD. Typical: bg-remove → enhance → shadows → outpaint
2. modelo: Extract garment → create AI model → try-on. Goal: copyright-free model photos. ALWAYS start with bg-remove first to isolate the garment. NEVER start with bg-generate. Typical: bg-remove → model-create → tryon → enhance
3. social: Content for social media. Goal: engaging visuals/videos. Varies by content type.
4. catalogo: DO NOT plan this — always use fallback template.

## CRITICAL RULES
- For "modelo" agent: the FIRST step MUST ALWAYS be "bg-remove" to isolate the garment from the original photo. NEVER use bg-generate as first step.
- bg-generate means ADD/CREATE a new background. bg-remove means REMOVE the existing background. These are OPPOSITE operations.
- For lingerie/clothing: bg-remove isolates the garment, then model-create generates a new model, then tryon puts the garment on the model.

## Budget Tiers
- free: Only use $0 modules (browser bg-remove, enhance, programmatic shadows, kenburns video)
- economic: Use affordable options (total < $0.15)
- premium: Use best quality providers

## Rules
- Each step needs: id (unique string), module, label (Spanish), params, estimatedCost, reasoning (Spanish)
- Chain outputs: each step's output becomes next step's input
- For tryon: the pipeline engine handles passing both garment (from bg-remove) and model (from model-create) images
- For jewelry categories, use jewelry-tryon instead of tryon
- Output valid JSON matching the AgentPlan schema`;

async function planWithClaude(req: AgentPlanRequest): Promise<AgentPlan | null> {
  if (!ANTHROPIC_API_KEY) return null;

  try {
    // Build image analysis context for Claude
    const analysisContext = req.imageAnalysis
      ? `\n## Image Analysis Results
- Resolution: ${req.imageAnalysis.width}x${req.imageAnalysis.height} (${req.imageAnalysis.isLowResolution ? "LOW — needs upscale" : "OK"})
- Background: ${req.imageAnalysis.backgroundType}${req.imageAnalysis.backgroundType === "white" ? " (already white, skip bg-remove if goal is white bg)" : req.imageAnalysis.backgroundType === "transparent" ? " (already transparent, skip bg-remove)" : ""}
- Watermark: ${req.imageAnalysis.hasWatermark ? "YES — add inpaint step FIRST to remove it" : "no"}
- Text/tags: ${req.imageAnalysis.hasText ? "YES — consider inpaint to remove" : "no"}
- Lighting: ${req.imageAnalysis.lightingQuality}${req.imageAnalysis.lightingQuality !== "good" ? " — add enhance step" : ""}
- Color balance: ${req.imageAnalysis.colorBalance}${req.imageAnalysis.colorBalance !== "good" ? " — add enhance step" : ""}
- Suggested steps: ${req.imageAnalysis.suggestedSteps.join(", ") || "none"}
- Warnings: ${req.imageAnalysis.warnings.join("; ") || "none"}`
      : "";

    const userPrompt = `Plan a pipeline for:
- Agent: ${req.agentType}
- Product: ${req.productCategory}
- Budget: ${req.budget ?? "economic"}
- Description: ${req.description || "Standard processing"}
${req.contentType ? `- Content type: ${req.contentType}` : ""}
${req.preferences ? `- Model preferences: ${JSON.stringify(req.preferences)}` : ""}
${req.imageCount ? `- Images: ${req.imageCount}` : ""}
${analysisContext}

CRITICAL RULES:
1. For "modelo" agent: FIRST step MUST be "bg-remove" (remove background) to isolate the garment. NEVER use "bg-generate" as first step. bg-generate ADDS a background, bg-remove REMOVES it — they are OPPOSITE.
2. The flow for modelo is ALWAYS: bg-remove → model-create → tryon → enhance. Never change this order.
3. If watermark detected AND budget allows: add "inpaint" BEFORE bg-remove.
4. For ecommerce: bg-remove first, then enhance, shadows, outpaint.
5. If lighting or color is bad, add an "enhance" step.
6. If resolution is low, add "upscale" as the LAST step.
7. NEVER put bg-generate as the first step for any pipeline. Always remove the original background first.

Return JSON: {"id","name","description","agentType","steps":[{"id","module","label","params","estimatedCost","reasoning"}],"totalEstimatedCost","estimatedDuration"}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!res.ok) {
      console.error("[ai-agent/plan] Claude API error:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const text = data.content?.[0]?.text;
    if (!text) return null;

    // Extract JSON from response (handle possible markdown wrapping)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const plan = JSON.parse(jsonMatch[0]) as AgentPlan;

    // Validate minimum structure
    if (!plan.steps || !Array.isArray(plan.steps) || plan.steps.length === 0) {
      return null;
    }

    // Validate each step's module is a valid AgentModule
    const validModules = new Set([
      "bg-remove", "bg-generate", "enhance", "shadows", "outpaint",
      "upscale", "tryon", "model-create", "inpaint", "video",
      "ad-create", "jewelry-tryon", "infographic",
    ]);
    const invalidSteps = plan.steps.filter((s) => !validModules.has(s.module));
    if (invalidSteps.length > 0) {
      console.error(
        "[ai-agent/plan] Claude returned invalid modules:",
        invalidSteps.map((s) => s.module),
      );
      return null; // Fall back to templates
    }

    // Validate budget constraints on Claude's output
    const totalCost = plan.steps.reduce((sum, s) => sum + (s.estimatedCost ?? 0), 0);
    // Catalog needs more budget (~$0.35) so we allow up to $0.50 for economic
    const budgetLimit = req.budget === "free" ? 0 : req.budget === "economic" ? 0.50 : Infinity;
    if (totalCost > budgetLimit) {
      console.error(
        `[ai-agent/plan] Claude plan cost $${totalCost.toFixed(3)} exceeds ${req.budget} budget limit $${budgetLimit}`,
      );
      return null; // Fall back to templates which respect budget
    }

    // Ensure IDs exist
    plan.id = plan.id || `plan-${Date.now()}`;
    plan.steps.forEach((step, i) => {
      step.id = step.id || `step-${i}-${Date.now()}`;
    });

    // Recalculate totalEstimatedCost from actual steps (don't trust Claude's math)
    plan.totalEstimatedCost = plan.steps.reduce((sum, s) => sum + (s.estimatedCost ?? 0), 0);

    return plan;
  } catch (err) {
    console.error("[ai-agent/plan] Claude planning failed:", err);
    return null;
  }
}

// -----------------------------------------------------------------------------
// Route handler
// -----------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AgentPlanRequest;

    if (!body.agentType || !body.productCategory) {
      return NextResponse.json(
        { success: false, data: null, cost: 0, error: "agentType and productCategory are required" },
        { status: 400 },
      );
    }

    // Validate agent type
    const validAgents: AgentType[] = ["ecommerce", "modelo", "social", "catalogo"];
    if (!validAgents.includes(body.agentType)) {
      return NextResponse.json(
        { success: false, data: null, cost: 0, error: `Invalid agentType: ${body.agentType}` },
        { status: 400 },
      );
    }

    // Validate product category
    const validCategories: ProductCategory[] = [
      "lingerie", "perfume", "earrings", "rings", "necklace",
      "bracelet", "watch", "sunglasses", "general",
    ];
    if (!validCategories.includes(body.productCategory)) {
      return NextResponse.json(
        { success: false, data: null, cost: 0, error: `Invalid productCategory: ${body.productCategory}` },
        { status: 400 },
      );
    }

    // Catalogo always uses template (complex multi-step pipeline, Claude can't plan it correctly)
    // Other agents try Claude Haiku first, fallback to templates
    let plan: AgentPlan | null = null;
    let method: "ai" | "fallback" = "fallback";

    if (body.agentType === "catalogo") {
      plan = buildFallbackPlan(body);
    } else {
      plan = await planWithClaude(body);
      if (plan) {
        method = "ai";
      } else {
        plan = buildFallbackPlan(body);
      }
    }

    const response: AgentPlanResponse = {
      success: true,
      data: { plan, method },
      cost: method === "ai" ? 0.001 : 0,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("[ai-agent/plan] Error:", err);
    return NextResponse.json(
      {
        success: false,
        data: null,
        cost: 0,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
