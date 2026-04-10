"use client";

import React, { useState, useCallback } from "react";
import { safeJson } from "@/lib/utils/safe-json";
import { Sparkles, Zap, Monitor, Cpu, Wand2, Image as ImageIcon } from "lucide-react";
import { ModuleHeader } from "@/components/ui/module-header";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import { removeBgBrowser } from "@/lib/processing/bg-remove-browser";

/* ------------------------------------------------------------------ */
/*  Helpers                                                              */
/* ------------------------------------------------------------------ */

/** Compress an image file in the browser to fit within Vercel's 4.5MB body limit */
function compressImageForUpload(file: File, maxDim = 2048, quality = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      // Downscale if too large
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Compression failed"));
          const name = file.name.replace(/\.[^.]+$/, ".jpg");
          resolve(new File([blob], name, { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality,
      );
    };
    img.onerror = () => reject(new Error("No se pudo leer la imagen"));
    img.src = URL.createObjectURL(file);
  });
}

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface BgGeneratePanelProps {
  imageFile: File | null;
  onProcess: (result: string, beforeImage?: string, cost?: number) => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

interface StylePreset {
  id: string;
  name: string;
  category: string;
  color?: string; // If set, can be processed locally (free)
  description: string;
}

const STYLE_PRESETS: StylePreset[] = [
  // Estudio (GRATIS — local)
  { id: "studio-white", name: "Blanco", category: "Estudio", color: "#FFFFFF", description: "Fondo blanco limpio" },
  { id: "studio-gray", name: "Gris", category: "Estudio", color: "#808080", description: "Fondo gris neutro" },
  { id: "studio-black", name: "Negro", category: "Estudio", color: "#1A1A1A", description: "Fondo negro elegante" },
  { id: "studio-gradient", name: "Degradado", category: "Estudio", color: "#E0E0E0", description: "Gradiente suave" },
  { id: "studio-spotlight", name: "Foco", category: "Estudio", color: "#0D0D0D", description: "Foco dramatico" },
  // Naturaleza (API)
  { id: "nature-garden", name: "Jardin", category: "Naturaleza", description: "Jardin verde con flores" },
  { id: "nature-beach", name: "Playa", category: "Naturaleza", description: "Playa tropical" },
  { id: "nature-forest", name: "Bosque", category: "Naturaleza", description: "Bosque con luz natural" },
  { id: "nature-sunset", name: "Atardecer", category: "Naturaleza", description: "Cielo dorado" },
  // Interior (API)
  { id: "lifestyle-living-room", name: "Sala", category: "Interior", description: "Sala moderna" },
  { id: "lifestyle-bedroom", name: "Dormitorio", category: "Interior", description: "Dormitorio elegante" },
  { id: "lifestyle-bathroom", name: "Bano", category: "Interior", description: "Bano de lujo" },
  { id: "lifestyle-kitchen", name: "Cocina", category: "Interior", description: "Cocina moderna" },
  { id: "lifestyle-cafe", name: "Cafe", category: "Interior", description: "Cafeteria acogedora" },
  { id: "lifestyle-office", name: "Oficina", category: "Interior", description: "Oficina minimalista" },
  // Lujo (API)
  { id: "luxury-marble", name: "Marmol", category: "Lujo", description: "Superficie de marmol" },
  { id: "luxury-velvet", name: "Terciopelo", category: "Lujo", description: "Tela de terciopelo" },
  { id: "luxury-gold", name: "Dorado", category: "Lujo", description: "Tonos dorados lujosos" },
  // Belleza (API)
  { id: "beauty-spa", name: "Spa", category: "Belleza", description: "Ambiente zen" },
  { id: "beauty-vanity", name: "Tocador", category: "Belleza", description: "Tocador glamoroso" },
  { id: "beauty-floral", name: "Floral", category: "Belleza", description: "Arreglo de flores" },
  // Abstracto (API)
  { id: "abstract-bokeh", name: "Bokeh", category: "Abstracto", description: "Luces desenfocadas" },
  { id: "abstract-smoke", name: "Humo", category: "Abstracto", description: "Humo etereo" },
  { id: "abstract-neon", name: "Neon", category: "Abstracto", description: "Luces neon vibrantes" },
  { id: "minimalist-clean", name: "Minimalista", category: "Abstracto", description: "Ultra limpio" },
  { id: "minimalist-pastel", name: "Pastel", category: "Abstracto", description: "Tonos pastel suaves" },
  // Temporada (API)
  { id: "seasonal-valentines", name: "San Valentin", category: "Temporada", description: "Romantico rosa y rojo" },
  { id: "seasonal-summer", name: "Verano", category: "Temporada", description: "Vibrante y tropical" },
  { id: "seasonal-christmas", name: "Navidad", category: "Temporada", description: "Festivo y acogedor" },
];

const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1 Cuadrado" },
  { value: "4:5", label: "4:5 Retrato" },
  { value: "9:16", label: "9:16 Historia" },
  { value: "16:9", label: "16:9 Paisaje" },
  { value: "3:2", label: "3:2 Foto" },
  { value: "2:3", label: "2:3 Vertical" },
];

/* ------------------------------------------------------------------ */
/*  Local processing helpers                                            */
/* ------------------------------------------------------------------ */

function parseAspectRatio(ratio: string, base: number = 1024): { w: number; h: number } {
  const [rw, rh] = ratio.split(":").map(Number);
  if (rw >= rh) return { w: base, h: Math.round(base * (rh / rw)) };
  return { w: Math.round(base * (rw / rh)), h: base };
}

async function processLocalStudio(
  imageFile: File,
  presetId: string,
  color: string,
  aspectRatio: string,
  onStatus: (msg: string) => void,
): Promise<string> {
  onStatus("Removiendo fondo con IA (gratis)...");
  const transparentBlob = await removeBgBrowser(imageFile);

  onStatus("Creando fondo...");
  const canvas = parseAspectRatio(aspectRatio, 1024);
  const offscreen = new OffscreenCanvas(canvas.w, canvas.h);
  const ctx = offscreen.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear el canvas");

  // Draw background based on preset type
  if (presetId === "studio-gradient") {
    // Smooth vertical gradient: light gray → darker gray
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.h);
    gradient.addColorStop(0, "#F0F0F0");
    gradient.addColorStop(0.5, "#D0D0D0");
    gradient.addColorStop(1, "#A0A0A0");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.w, canvas.h);
  } else if (presetId === "studio-spotlight") {
    // Dark background with radial spotlight from top-center
    ctx.fillStyle = "#0D0D0D";
    ctx.fillRect(0, 0, canvas.w, canvas.h);
    const gradient = ctx.createRadialGradient(
      canvas.w / 2, canvas.h * 0.3, 0,
      canvas.w / 2, canvas.h * 0.3, canvas.w * 0.6
    );
    gradient.addColorStop(0, "rgba(255,255,255,0.25)");
    gradient.addColorStop(0.5, "rgba(255,255,255,0.08)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.w, canvas.h);
  } else {
    // Solid color
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.w, canvas.h);
  }

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

type ApiMode = "precise" | "fast";

const API_MODE_OPTIONS: { value: ApiMode; label: string; cost: string; description: string }[] = [
  { value: "precise", label: "Preciso", cost: "$0.05", description: "Kontext Pro — maxima calidad, preserva el producto" },
  { value: "fast", label: "Rapido", cost: "$0.003", description: "Flux Schnell — previsualizacion barata y rapida" },
];

export function BgGeneratePanel({ imageFile, onProcess }: BgGeneratePanelProps) {
  const [selectedPreset, setSelectedPreset] = useState("studio-white");
  const [customPrompt, setCustomPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [apiMode, setApiMode] = useState<ApiMode>("precise");
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [progressPct, setProgressPct] = useState(0);

  const preset = STYLE_PRESETS.find((p) => p.id === selectedPreset);
  const isFree = !!preset?.color && !customPrompt;

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!imageFile) return;

    setIsProcessing(true);
    setErrorMsg(null);
    setStatusText("Iniciando...");
    setProgressPct(10);

    try {
      if (isFree && preset?.color) {
        // ---- 100% LOCAL / GRATIS ----
        setProgressPct(20);
        const url = await processLocalStudio(
          imageFile,
          preset.id,
          preset.color,
          aspectRatio,
          setStatusText,
        );
        setProgressPct(100);
        onProcess(url, undefined, 0);
      } else {
        // ---- API (Replicate + optional Claude) ----
        let optimizedPrompt = customPrompt || undefined;

        // If user wrote a custom prompt, optimize it with Claude first
        if (customPrompt) {
          setStatusText("Claude IA optimizando tu prompt...");
          setProgressPct(15);

          try {
            const promptRes = await fetch("/api/prompt", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                description: customPrompt,
                context: {
                  productType: "clothing",
                  brandStyle: "lingerie, Caribbean-inspired, luxury e-commerce",
                  desiredMood: "elegant",
                },
              }),
            });
            const promptData = await safeJson(promptRes);
            if (promptData.success) {
              optimizedPrompt = promptData.data.prompt;
              console.log("[bg-generate] Claude optimized:", optimizedPrompt);
            }
          } catch {
            // If Claude fails, use the raw prompt
            console.warn("[bg-generate] Claude optimization failed, using raw prompt");
          }
        }

        setStatusText("Comprimiendo imagen...");
        setProgressPct(20);

        // Compress image in browser before upload to avoid 413 errors
        const compressedFile = await compressImageForUpload(imageFile, 2048, 0.85);

        setStatusText("Subiendo imagen...");
        setProgressPct(30);

        const formData = new FormData();
        formData.append("file", compressedFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (!uploadRes.ok) {
          const text = await uploadRes.text().catch(() => "");
          throw new Error(text.startsWith("{") ? JSON.parse(text).error : `Error al subir imagen (${uploadRes.status})`);
        }
        const uploadData = await safeJson(uploadRes);
        if (!uploadData.success) throw new Error(uploadData.error || "Error al subir");

        setStatusText("Generando fondo con IA (Replicate)...");
        setProgressPct(50);

        const res = await fetch("/api/bg-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            // Prefer the Replicate URL (already uploaded, no size issues).
            // Fall back to data URL only if Replicate upload failed during /api/upload.
            imageUrl: uploadData.data.replicateUrl || uploadData.data.url,
            mode: apiMode,
            style: selectedPreset,
            customPrompt: optimizedPrompt,
            aspectRatio,
          }),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text.startsWith("{") ? JSON.parse(text).error : `Error del servidor (${res.status})`);
        }
        const data = await safeJson(res);
        if (!data.success) throw new Error(data.error || "Error al generar el fondo");

        setProgressPct(100);
        setStatusText("Listo!");
        const modeCost = apiMode === "fast" ? 0.003 : 0.05;
        onProcess(data.data.url, undefined, data.cost ?? modeCost);
      }
    } catch (error) {
      console.error("BG generation error:", error);
      setStatusText("");
      setErrorMsg(error instanceof Error ? error.message : "Error al generar el fondo");
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        setStatusText("");
        setProgressPct(0);
      }, 3000);
    }
  }, [imageFile, isFree, preset, selectedPreset, customPrompt, aspectRatio, apiMode, onProcess]);

  const categories = Array.from(new Set(STYLE_PRESETS.map((p) => p.category)));

  return (
    <div className="space-y-4">
      <ModuleHeader
        icon={<ImageIcon className="h-4 w-4" />}
        title="Fondos con IA"
        description="Coloca tu producto en cualquier escenario sin necesidad de estudio fotografico. Desde una mesa de marmol elegante hasta una playa tropical — la IA genera el fondo completo alrededor de tu producto."
        whyNeeded="Las fotos con contexto (lifestyle) venden hasta 30% mas que fondo blanco segun estudios de Shopify. Un bloqueador solar sobre arena de playa es mucho mas atractivo que sobre fondo plano. Este modulo te da fotos de catalogo de lujo sin fotografo."
        costLabel="Desde gratis"
        steps={[
          "Sube tu foto de producto (mejor si ya tiene el fondo removido)",
          "Elige un estilo de fondo: Estudio (gratis), Lifestyle, Minimalista, Lujo, etc.",
          "Opcionalmente personaliza el prompt describiendo exactamente lo que quieres",
          "Haz clic en \"Generar Fondo\" — la IA crea el escenario completo",
        ]}
        tips={[
          "Los fondos de Estudio son 100% gratis — se procesan en tu navegador sin enviar datos.",
          "Se especifico en tu descripcion: \"mesa de madera clara con luz natural suave\" da mejor resultado que \"mesa bonita\".",
          "Primero quita el fondo con el modulo anterior, luego genera el fondo nuevo aqui — el resultado es mucho mejor.",
          "Para consistencia de marca, usa el mismo estilo de fondo en todos tus productos.",
        ]}
      />

      {/* Smart info banner */}
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <Zap className="h-3.5 w-3.5 text-emerald-400" />
          <p className="text-[11px] font-semibold text-emerald-400">Modo Inteligente</p>
        </div>
        <p className="text-[10px] text-gray-400">
          Sube tu imagen y elige un fondo — la IA hace todo automaticamente.
          Los estilos de <span className="text-emerald-400 font-medium">Estudio son GRATIS</span> (se procesan en tu navegador).
          Los demas usan Replicate API.
        </p>
      </div>

      {/* Current provider indicator */}
      <div className={cn(
        "flex items-center gap-2 rounded-lg border p-2.5",
        isFree
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-amber-500/40 bg-amber-500/10"
      )}>
        {isFree ? (
          <Monitor className="h-4 w-4 text-emerald-400 shrink-0" />
        ) : (
          <Cpu className="h-4 w-4 text-amber-400 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-gray-200">
            {isFree ? "Navegador (Gratis)" : "Replicate API (Pago)"}
          </p>
          <p className="text-[10px] text-gray-500">
            {isFree
              ? "Se procesa en tu PC — sin costo, sin limite"
              : `Costo estimado: ~${apiMode === "fast" ? "$0.003" : "$0.05"} por imagen`}
          </p>
        </div>
        <span className={cn(
          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
          isFree
            ? "bg-emerald-500/20 text-emerald-400"
            : "bg-amber-500/20 text-amber-400"
        )}>
          {isFree ? "GRATIS" : apiMode === "fast" ? "~$0.003" : "~$0.05"}
        </span>
      </div>

      {/* API Mode selector (only visible when not free) */}
      {!isFree && (
        <div>
          <label className="mb-2 block text-xs font-medium text-gray-400">
            Modo de Generacion
          </label>
          <div className="grid grid-cols-2 gap-2">
            {API_MODE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setApiMode(opt.value)}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left transition-all",
                  apiMode === opt.value
                    ? "border-accent bg-accent/10"
                    : "border-surface-lighter bg-surface-light hover:border-surface-hover",
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="text-[11px] font-medium text-gray-200">{opt.label}</span>
                  <span className={cn(
                    "text-[10px] font-semibold",
                    opt.value === "fast" ? "text-emerald-400" : "text-amber-400",
                  )}>
                    {opt.cost}
                  </span>
                </div>
                <span className="text-[10px] text-gray-500">{opt.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Style presets grid */}
      <div>
        <label className="mb-2 block text-xs font-medium text-gray-400">
          Elige un Fondo
        </label>
        <div className="max-h-56 overflow-y-auto rounded-lg border border-surface-lighter bg-surface p-2 no-scrollbar">
          {categories.map((category) => {
            const catPresets = STYLE_PRESETS.filter((p) => p.category === category);
            const catIsFree = catPresets.some((p) => !!p.color);
            return (
              <div key={category} className="mb-2.5 last:mb-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                    {category}
                  </p>
                  {catIsFree && (
                    <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                      GRATIS
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {catPresets.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPreset(p.id)}
                      title={p.description}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-md p-1.5 transition-all",
                        selectedPreset === p.id
                          ? "bg-accent/15 ring-1 ring-accent"
                          : "bg-surface-light hover:bg-surface-lighter",
                      )}
                    >
                      <div
                        className="h-8 w-full rounded"
                        style={{
                          background: p.color || "var(--border-default)",
                          border: p.color ? `1px solid ${p.color === "#FFFFFF" ? "#ccc" : "transparent"}` : undefined,
                        }}
                      />
                      <span className="text-[10px] text-gray-400 leading-tight text-center">
                        {p.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Prompt - Claude powered */}
      <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Wand2 className="h-3.5 w-3.5 text-accent-light" />
          <label className="text-[11px] font-semibold text-accent-light">
            Fondo Personalizado con IA
          </label>
        </div>
        <p className="text-[10px] text-gray-500">
          Describe el fondo que quieres en espanol — Claude IA lo optimiza y genera automaticamente.
        </p>
        <textarea
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="ej. superficie de marmol rosa con petalos de rosa y luz suave dorada..."
          rows={2}
          className="w-full rounded-lg border border-accent/30 bg-surface-light px-3 py-2 text-xs text-gray-200 placeholder:text-gray-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors resize-none"
        />
        {customPrompt && (
          <p className="text-[10px] text-amber-400">
            Usa Replicate API (~$0.05) + Claude IA (~$0.002) para crear tu fondo unico.
          </p>
        )}
      </div>

      {/* Aspect ratio */}
      <Select
        label="Proporcion"
        value={aspectRatio}
        onValueChange={setAspectRatio}
        options={ASPECT_RATIOS}
      />

      {/* Progress */}
      {isProcessing && (
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

      {/* Generate button */}
      <Button
        variant="primary"
        className="w-full"
        onClick={handleGenerate}
        disabled={!imageFile || isProcessing}
        loading={isProcessing}
        leftIcon={<Sparkles className="h-4 w-4" />}
      >
        {isProcessing
          ? statusText || "Procesando..."
          : isFree
            ? "Generar Fondo (Gratis)"
            : `Generar Fondo (~${apiMode === "fast" ? "$0.003" : "$0.05"})`}
      </Button>

      {!imageFile && (
        <p className="text-center text-[10px] text-amber-400">
          Arrastra una imagen al area central para empezar.
        </p>
      )}

      {/* Error card */}
      {errorMsg && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <span className="text-red-400 text-xs shrink-0">Error:</span>
          <p className="text-xs text-red-300">{errorMsg}</p>
          <button type="button" onClick={() => setErrorMsg(null)} className="ml-auto text-red-400 hover:text-red-300 text-xs shrink-0">x</button>
        </div>
      )}

      {/* Status after completion */}
      {!isProcessing && statusText && !errorMsg && (
        <p className="text-center text-xs text-emerald-400">{statusText}</p>
      )}
    </div>
  );
}

export default BgGeneratePanel;
