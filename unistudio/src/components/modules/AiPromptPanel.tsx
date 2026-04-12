"use client";

import React, { useState, useCallback } from "react";
import { safeJson } from "@/lib/utils/safe-json";
import {
  Sparkles,
  Wand2,
  Camera,
  ShoppingBag,
  Instagram,
  Facebook,
  Play,
  Youtube,
  Monitor,
  Cpu,
  RefreshCw,
  ChevronRight,
  Star,
  Palette,
  Globe,
} from "lucide-react";
import { ModuleHeader } from "@/components/ui/module-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { toast } from "@/hooks/use-toast";
import { compressImageFile } from "@/lib/utils/compress-image";
import { removeBgBrowser } from "@/lib/processing/bg-remove-browser";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface AiPromptPanelProps {
  imageFile: File | null;
  onProcess: (result: string, beforeImage?: string, cost?: number) => void;
}

interface PhotoConcept {
  id: string;
  title: string;
  description: string;
  prompt: string;
  negativePrompt: string;
  aspectRatio: string;
  mood: string;
  isFree: boolean;
  bgColor?: string;
}

/* ------------------------------------------------------------------ */
/*  Quick Scenarios                                                     */
/* ------------------------------------------------------------------ */

interface QuickScenario {
  id: string;
  label: string;
  icon: React.ReactNode;
  platform?: string;
  mood?: string;
  occasion?: string;
}

const QUICK_SCENARIOS: QuickScenario[] = [
  { id: "ecommerce", label: "E-Commerce", icon: <ShoppingBag className="h-4 w-4" />, platform: "amazon", mood: "minimal" },
  { id: "instagram", label: "Instagram", icon: <Instagram className="h-4 w-4" />, platform: "instagram", mood: "elegant" },
  { id: "facebook", label: "Facebook", icon: <Facebook className="h-4 w-4" />, platform: "facebook", mood: "bold" },
  { id: "tiktok", label: "TikTok", icon: <Play className="h-4 w-4" />, platform: "tiktok", mood: "playful" },
  { id: "youtube", label: "YouTube", icon: <Youtube className="h-4 w-4" />, platform: "youtube", mood: "bold" },
  { id: "pinterest", label: "Pinterest", icon: <Globe className="h-4 w-4" />, platform: "pinterest", mood: "elegant" },
  { id: "luxury", label: "Lujo", icon: <Star className="h-4 w-4" />, mood: "luxurious" },
  { id: "tropical", label: "Tropical", icon: <Palette className="h-4 w-4" />, mood: "tropical" },
];

const PRODUCT_TYPES = [
  { value: "lingerie", label: "Lenceria" },
  { value: "clothing", label: "Ropa" },
  { value: "beauty", label: "Belleza" },
  { value: "jewelry", label: "Joyeria" },
  { value: "shoes", label: "Zapatos" },
  { value: "cosmetics", label: "Cosmeticos" },
  { value: "accessories", label: "Accesorios" },
  { value: "electronics", label: "Electronica" },
  { value: "food", label: "Alimentos" },
  { value: "furniture", label: "Muebles" },
];

/* ------------------------------------------------------------------ */
/*  Local processing helper                                             */
/* ------------------------------------------------------------------ */

function parseAspectRatio(ratio: string, base: number = 1024): { w: number; h: number } {
  const [rw, rh] = ratio.split(":").map(Number);
  if (rw >= rh) return { w: base, h: Math.round(base * (rh / rw)) };
  return { w: Math.round(base * (rw / rh)), h: base };
}

async function processLocalConcept(
  imageFile: File,
  bgColor: string,
  aspectRatio: string,
  onStatus: (msg: string) => void,
): Promise<string> {
  onStatus("Removiendo fondo con IA (gratis)...");
  const transparentBlob = await removeBgBrowser(imageFile);

  onStatus("Creando tu foto...");
  const canvas = parseAspectRatio(aspectRatio, 1024);
  const offscreen = new OffscreenCanvas(canvas.w, canvas.h);
  const ctx = offscreen.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear el canvas");

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.w, canvas.h);

  const bitmap = await createImageBitmap(transparentBlob);
  const maxW = canvas.w * 0.80;
  const maxH = canvas.h * 0.85;
  let drawW = bitmap.width;
  let drawH = bitmap.height;
  if (drawW > maxW || drawH > maxH) {
    const scale = Math.min(maxW / drawW, maxH / drawH);
    drawW = Math.round(drawW * scale);
    drawH = Math.round(drawH * scale);
  }
  const x = Math.round((canvas.w - drawW) / 2);
  const y = Math.round((canvas.h - drawH) / 2);
  ctx.drawImage(bitmap, x, y, drawW, drawH);
  bitmap.close();

  onStatus("Listo!");
  const resultBlob = await offscreen.convertToBlob({ type: "image/png" });
  return URL.createObjectURL(resultBlob);
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function AiPromptPanel({ imageFile, onProcess }: AiPromptPanelProps) {
  // Step 1: Product info
  const [productType, setProductType] = useState("lingerie");
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);

  // Step 2: AI concepts
  const [concepts, setConcepts] = useState<PhotoConcept[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [aiMethod, setAiMethod] = useState<string>("");

  // Step 3: Generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [progressPct, setProgressPct] = useState(0);
  const [generatingConceptId, setGeneratingConceptId] = useState<string | null>(null);

  // Inline error state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* ---- Ask Claude for concepts ---- */
  const handleAskDirector = useCallback(async () => {
    if (!selectedScenario) {
      setErrorMsg("Selecciona para que quieres la foto.");
      return;
    }

    setIsThinking(true);
    setErrorMsg(null);
    setConcepts([]);

    const scenario = QUICK_SCENARIOS.find((s) => s.id === selectedScenario);

    try {
      const res = await fetch("/api/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "creative-director",
          context: {
            productType,
            targetPlatform: scenario?.platform || undefined,
            desiredMood: scenario?.mood || undefined,
            brandStyle: productType === "lingerie"
              ? "lingerie elegante, Caribbean-inspired, luxury e-commerce"
              : undefined,
            occasion: scenario?.occasion || undefined,
          },
        }),
      });
      const data = await safeJson(res);
      if (!data.success) throw new Error(data.error || "Error al pedir conceptos");

      setConcepts(data.data.concepts);
      setAiMethod(data.data.method);
    } catch (error) {
      console.error("Creative director error:", error);
      setErrorMsg(error instanceof Error ? error.message : "Error al generar conceptos");
      toast.error(error instanceof Error ? error.message : "Error al generar conceptos");
    } finally {
      setIsThinking(false);
    }
  }, [productType, selectedScenario]);

  /* ---- Generate the selected concept ---- */
  const handleCreatePhoto = useCallback(async (concept: PhotoConcept) => {
    if (!imageFile) {
      setErrorMsg("Sube una imagen de producto primero.");
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);
    setGeneratingConceptId(concept.id);
    setProgressPct(10);

    try {
      if (concept.isFree && concept.bgColor) {
        // 100% local / free
        setProgressPct(20);
        const url = await processLocalConcept(
          imageFile,
          concept.bgColor,
          concept.aspectRatio,
          setStatusText,
        );
        setProgressPct(100);
        onProcess(url, undefined, 0);
      } else {
        // API (Replicate)
        setStatusText("Subiendo imagen...");
        setProgressPct(20);

        const compressed = await compressImageFile(imageFile);
        const formData = new FormData();
        formData.append("file", compressed);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        const uploadData = await safeJson(uploadRes);
        if (!uploadData.success) throw new Error(uploadData.error || "Error al subir");

        setStatusText("La IA esta creando tu foto...");
        setProgressPct(50);

        const res = await fetch("/api/bg-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: uploadData.data.url,
            mode: "precise",
            style: "custom",
            customPrompt: concept.prompt,
            aspectRatio: concept.aspectRatio,
          }),
        });
        const data = await safeJson(res);
        if (!data.success) throw new Error(data.error || "Error al generar");

        setProgressPct(100);
        setStatusText("Foto creada!");
        onProcess(data.data.url, undefined, 0.05);
      }
    } catch (error) {
      console.error("Generation error:", error);
      setStatusText("");
      setErrorMsg(error instanceof Error ? error.message : "Error al crear la foto");
      toast.error(error instanceof Error ? error.message : "Error al crear la foto");
    } finally {
      setIsGenerating(false);
      setGeneratingConceptId(null);
      setTimeout(() => {
        setStatusText("");
        setProgressPct(0);
      }, 3000);
    }
  }, [imageFile, onProcess]);

  return (
    <div className="space-y-4">
      {/* Inline error card */}
      {errorMsg && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <span className="text-red-400 text-xs shrink-0">Error:</span>
          <p className="text-xs text-red-300">{errorMsg}</p>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="ml-auto text-red-400 hover:text-red-300 text-xs shrink-0"
          >
            x
          </button>
        </div>
      )}

      {/* Header */}
      <ModuleHeader
        icon={<Wand2 className="h-4 w-4" />}
        title="Director Creativo IA"
        description="No sabes que fondo o estilo usar para tu foto? La IA actua como tu director creativo: analiza tu producto, la plataforma donde lo publicaras, y genera 4 conceptos de fotografia profesional. Tu eliges el que mas te guste y la IA lo crea."
        whyNeeded="Un director creativo profesional cobra $500+ por sesion. Este modulo usa Claude IA para generar ideas de fotografia adaptadas a tu producto y plataforma. Elige entre conceptos como 'minimalismo japones', 'playa tropical', 'estudio de lujo' — cada uno unico y profesional."
        costLabel="$0.05/foto"
        steps={[
          "Sube tu producto al area central y elige el tipo (lenceria, bloqueador, joyeria, etc.)",
          "Selecciona la plataforma destino (Instagram, Amazon, catalogo, etc.)",
          "Haz clic en \"Pedir Ideas\" — la IA genera 4 conceptos creativos con preview",
          "Elige el concepto que mas te guste y haz clic en \"Crear Foto\"",
        ]}
        tips={[
          "Cada vez que pides ideas obtienes conceptos diferentes — regenera si no te convence.",
          "La IA adapta los conceptos a tu plataforma: para Amazon sugiere fondos limpios, para Instagram sugiere lifestyle.",
          "Funciona especialmente bien con lenceria, joyeria, cosmeticos y productos de belleza.",
          "Puedes editar el prompt generado antes de crear la foto para ajustar detalles.",
        ]}
      />

      {/* Step 1: Product type */}
      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-400">
          <Camera className="h-3 w-3" />
          Paso 1 — Tu producto
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {PRODUCT_TYPES.map((pt) => (
            <button
              key={pt.value}
              type="button"
              onClick={() => setProductType(pt.value)}
              className={cn(
                "rounded-md px-2 py-1.5 text-[11px] transition-all",
                productType === pt.value
                  ? "bg-accent/20 text-accent-light ring-1 ring-accent/50"
                  : "bg-surface-light text-gray-400 hover:bg-surface-lighter",
              )}
            >
              {pt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Platform / scenario */}
      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-400">
          <ShoppingBag className="h-3 w-3" />
          Paso 2 — Para donde es la foto?
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {QUICK_SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedScenario(s.id)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 transition-all",
                selectedScenario === s.id
                  ? "bg-accent/20 text-accent-light ring-1 ring-accent/50"
                  : "bg-surface-light text-gray-400 hover:bg-surface-lighter",
              )}
            >
              {s.icon}
              <span className="text-[11px] font-medium">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Ask Claude button */}
      <Button
        variant="primary"
        className="w-full bg-accent-muted hover:bg-accent-muted"
        onClick={handleAskDirector}
        disabled={!selectedScenario || isThinking}
        loading={isThinking}
        leftIcon={<Sparkles className="h-4 w-4" />}
      >
        {isThinking ? "Claude IA pensando..." : "Pedir Ideas a la IA"}
      </Button>

      {/* Cost note for asking */}
      {!concepts.length && (
        <p className="text-center text-[10px] text-gray-600">
          Pedir ideas: <span className="text-emerald-400">~$0.003</span> (Claude IA) — Crear foto gratis o con Replicate
        </p>
      )}

      {/* AI Concepts */}
      {concepts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
              <Sparkles className="h-3 w-3 text-accent-light" />
              Paso 3 — La IA sugiere estas fotos
            </label>
            <button
              type="button"
              onClick={handleAskDirector}
              disabled={isThinking}
              className="flex items-center gap-1 text-[10px] text-accent-light hover:text-accent-light transition-colors"
            >
              <RefreshCw className={cn("h-3 w-3", isThinking && "animate-spin")} />
              Nuevas ideas
            </button>
          </div>

          {/* Method badge */}
          <div className="text-center">
            <span className={cn(
              "inline-block rounded-full px-2 py-0.5 text-[10px] font-medium",
              aiMethod === "claude"
                ? "bg-accent/15 text-accent-light"
                : "bg-blue-500/15 text-blue-400",
            )}>
              {aiMethod === "claude" ? "Conceptos por Claude IA" : "Conceptos predeterminados"}
            </span>
          </div>

          {/* Concept cards */}
          {concepts.map((concept) => {
            const isCurrentlyGenerating = generatingConceptId === concept.id;
            return (
              <div
                key={concept.id}
                className={cn(
                  "rounded-lg border p-3 transition-all",
                  concept.isFree
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-surface-lighter bg-surface-light",
                )}
              >
                {/* Title + cost badge */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h4 className="text-xs font-semibold text-gray-200">{concept.title}</h4>
                  <span className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                    concept.isFree
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-amber-500/20 text-amber-400",
                  )}>
                    {concept.isFree ? "GRATIS" : "~$0.05"}
                  </span>
                </div>

                {/* Description */}
                <p className="text-[10px] text-gray-400 leading-relaxed mb-2">
                  {concept.description}
                </p>

                {/* Meta info */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] text-gray-500">
                    {concept.aspectRatio}
                  </span>
                  <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] text-gray-500">
                    {concept.mood}
                  </span>
                  {concept.isFree ? (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                      <Monitor className="h-2.5 w-2.5" /> Navegador
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-amber-400">
                      <Cpu className="h-2.5 w-2.5" /> Replicate
                    </span>
                  )}
                </div>

                {/* Preview of bg color for free concepts */}
                {concept.bgColor && (
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="h-4 w-4 rounded border border-gray-600"
                      style={{ background: concept.bgColor }}
                    />
                    <span className="text-[10px] text-gray-500">Color: {concept.bgColor}</span>
                  </div>
                )}

                {/* Generate button */}
                <Button
                  variant={concept.isFree ? "primary" : "outline"}
                  size="sm"
                  className={cn(
                    "w-full",
                    concept.isFree && "bg-emerald-600 hover:bg-emerald-700",
                  )}
                  onClick={() => handleCreatePhoto(concept)}
                  disabled={!imageFile || isGenerating}
                  loading={isCurrentlyGenerating}
                  leftIcon={<ChevronRight className="h-3.5 w-3.5" />}
                >
                  {isCurrentlyGenerating
                    ? statusText || "Creando..."
                    : concept.isFree
                      ? "Crear Foto (Gratis)"
                      : "Crear Foto (~$0.05)"}
                </Button>
              </div>
            );
          })}

          {/* Progress bar */}
          {isGenerating && (
            <div className="space-y-1.5">
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-lighter">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-center text-[10px] text-gray-400">{statusText}</p>
            </div>
          )}
        </div>
      )}

      {/* No image warning */}
      {!imageFile && (
        <p className="text-center text-[10px] text-amber-400">
          Arrastra una imagen al area central para empezar.
        </p>
      )}

      {/* Cost summary */}
      {!isGenerating && !isThinking && (
        <div className="rounded-lg border border-surface-lighter bg-surface p-3 space-y-1">
          <p className="text-[10px] font-semibold text-gray-400 text-center">Costos estimados</p>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="flex justify-between">
              <span className="text-gray-500">Pedir ideas (Claude)</span>
              <span className="text-emerald-400">~$0.003</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Foto con fondo solido</span>
              <span className="text-emerald-400">GRATIS</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Foto con IA (Replicate)</span>
              <span className="text-amber-400">~$0.05</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total tipico</span>
              <span className="text-gray-300">$0.003-$0.05</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AiPromptPanel;
