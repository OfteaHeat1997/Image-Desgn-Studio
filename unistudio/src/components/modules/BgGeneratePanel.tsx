"use client";

import React, { useState, useCallback, useEffect } from "react";
import { safeJson } from "@/lib/utils/safe-json";
import { Sparkles, Zap, Monitor, Cpu, Wand2, Image as ImageIcon } from "lucide-react";
import { ModuleHeader } from "@/components/ui/module-header";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import { toast } from "@/hooks/use-toast";
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

type ApiMode = "precise" | "fast" | "creative";

/* ------------------------------------------------------------------ */
/*  Constants — ALL STATIC, no async loading                           */
/* ------------------------------------------------------------------ */

interface StylePreset {
  id: string;
  name: string;
  category: string;
  color?: string; // If set, can be processed locally (free)
  description: string;
}

// NOTE: All presets are static constants. Never load presets asynchronously —
// that would cause an infinite "Cargando presets..." spinner if the fetch fails.
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
  { id: "lingerie-coastal", name: "Costera", category: "Naturaleza", description: "Ambiente tropical Caribeno" },
  // Interior (API)
  { id: "lifestyle-living-room", name: "Sala", category: "Interior", description: "Sala moderna" },
  { id: "lifestyle-bedroom", name: "Dormitorio", category: "Interior", description: "Dormitorio elegante" },
  { id: "lifestyle-bathroom", name: "Bano", category: "Interior", description: "Bano de lujo" },
  { id: "lifestyle-kitchen", name: "Cocina", category: "Interior", description: "Cocina moderna" },
  { id: "lifestyle-cafe", name: "Cafe", category: "Interior", description: "Cafeteria acogedora" },
  { id: "lifestyle-office", name: "Oficina", category: "Interior", description: "Oficina minimalista" },
  { id: "lingerie-boudoir", name: "Boudoir", category: "Interior", description: "Dormitorio romantico lujoso" },
  // Lujo (API)
  { id: "luxury-marble", name: "Marmol", category: "Lujo", description: "Superficie de marmol" },
  { id: "luxury-velvet", name: "Terciopelo", category: "Lujo", description: "Tela de terciopelo" },
  { id: "luxury-gold", name: "Dorado", category: "Lujo", description: "Tonos dorados lujosos" },
  { id: "fragrance-crystal", name: "Crystal", category: "Lujo", description: "Cristal reflectante" },
  { id: "fragrance-dark", name: "Lujo Oscuro", category: "Lujo", description: "Negro y dorado dramatico" },
  { id: "jewelry-velvet", name: "Terciopelo Joya", category: "Lujo", description: "Cojin de terciopelo azul" },
  { id: "jewelry-marble", name: "Marmol Joya", category: "Lujo", description: "Marmol Carrara con venas doradas" },
  { id: "jewelry-dark", name: "Elegancia Oscura", category: "Lujo", description: "Fondo negro con foco" },
  // Belleza (API)
  { id: "beauty-spa", name: "Spa", category: "Belleza", description: "Ambiente zen" },
  { id: "beauty-vanity", name: "Tocador", category: "Belleza", description: "Tocador glamoroso" },
  { id: "beauty-floral", name: "Floral", category: "Belleza", description: "Arreglo de flores" },
  { id: "lingerie-silk", name: "Seda", category: "Belleza", description: "Seda con petalos de flores" },
  { id: "fragrance-garden", name: "Jardin Bot.", category: "Belleza", description: "Jardin tropical exotico" },
  { id: "skincare-spa", name: "Ritual Spa", category: "Belleza", description: "Spa zen con piedras y bambu" },
  { id: "skincare-botanical", name: "Botanico", category: "Belleza", description: "Ingredientes naturales organicos" },
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

// All categories derived from presets — no async fetch needed
const ALL_CATEGORIES = Array.from(new Set(STYLE_PRESETS.map((p) => p.category)));

// Product types map to their best starting category
const PRODUCT_TYPES: { id: string; label: string; defaultCategory: string }[] = [
  { id: "todos", label: "Todos", defaultCategory: "Estudio" },
  { id: "moda", label: "Moda", defaultCategory: "Interior" },
  { id: "lenceria", label: "Lenceria", defaultCategory: "Belleza" },
  { id: "joyeria", label: "Joyeria", defaultCategory: "Lujo" },
  { id: "fragrancias", label: "Fragancias", defaultCategory: "Lujo" },
  { id: "skincare", label: "Skincare", defaultCategory: "Belleza" },
];

const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1 Cuadrado" },
  { value: "4:5", label: "4:5 Retrato" },
  { value: "9:16", label: "9:16 Historia" },
  { value: "16:9", label: "16:9 Paisaje" },
  { value: "3:2", label: "3:2 Foto" },
  { value: "2:3", label: "2:3 Vertical" },
];

const API_MODE_OPTIONS: { value: ApiMode; label: string; cost: string; description: string }[] = [
  { value: "precise", label: "Preciso", cost: "$0.05", description: "Kontext Pro — preserva el producto exactamente" },
  { value: "fast", label: "Rapido", cost: "$0.003", description: "Flux Schnell — previsualizacion barata" },
  { value: "creative", label: "Creativo", cost: "$0.03", description: "Flux Dev — escena completa con IA" },
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

  if (presetId === "studio-gradient") {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.h);
    gradient.addColorStop(0, "#F0F0F0");
    gradient.addColorStop(0.5, "#D0D0D0");
    gradient.addColorStop(1, "#A0A0A0");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.w, canvas.h);
  } else if (presetId === "studio-spotlight") {
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

export function BgGeneratePanel({ imageFile, onProcess }: BgGeneratePanelProps) {
  const [selectedPreset, setSelectedPreset] = useState("studio-white");
  // activeCategory starts at "Estudio" — always has presets, no loading state needed
  const [activeCategory, setActiveCategory] = useState("Estudio");
  const [productType, setProductType] = useState("todos");
  const [customPrompt, setCustomPrompt] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [apiMode, setApiMode] = useState<ApiMode>("precise");
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [progressPct, setProgressPct] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const preset = STYLE_PRESETS.find((p) => p.id === selectedPreset);
  const isFree = !!preset?.color && !customPrompt && apiMode !== "creative";

  // When product type changes, auto-jump to the most relevant category tab
  useEffect(() => {
    const pt = PRODUCT_TYPES.find((p) => p.id === productType);
    if (pt) setActiveCategory(pt.defaultCategory);
  }, [productType]);

  // Presets for the active category tab — derived directly from static array, never loading
  const categoryPresets = STYLE_PRESETS.filter((p) => p.category === activeCategory);

  const handleGenerate = useCallback(async () => {
    if (!imageFile && apiMode !== "creative") return;
    if (apiMode === "creative" && !productDescription.trim()) return;

    setIsProcessing(true);
    setErrorMsg(null);
    setStatusText("Iniciando...");
    setProgressPct(10);

    try {
      if (isFree && preset?.color) {
        // ---- 100% LOCAL / GRATIS ----
        setProgressPct(20);
        const url = await processLocalStudio(
          imageFile!,
          preset.id,
          preset.color,
          aspectRatio,
          setStatusText,
        );
        setProgressPct(100);
        onProcess(url, undefined, 0);
      } else {
        // ---- API (Replicate + optional Claude prompt optimization) ----
        let optimizedPrompt = customPrompt || undefined;

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
                  productType,
                  brandStyle: "luxury e-commerce, Caribbean-inspired",
                  desiredMood: "elegant",
                },
              }),
            });
            const promptData = await safeJson(promptRes);
            if (promptData.success) {
              optimizedPrompt = promptData.data.prompt;
            }
          } catch {
            console.warn("[bg-generate] Claude optimization failed, using raw prompt");
          }
        }

        if (apiMode === "creative") {
          // Creative mode: full scene generation — no image upload needed
          setStatusText("Generando escena creativa con IA...");
          setProgressPct(40);

          const res = await fetch("/api/bg-generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mode: "creative",
              style: selectedPreset,
              customPrompt: optimizedPrompt,
              aspectRatio,
              productDescription: productDescription.trim(),
            }),
          });
          if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(text.startsWith("{") ? JSON.parse(text).error : `Error del servidor (${res.status})`);
          }
          const data = await safeJson(res);
          if (!data.success) throw new Error(data.error || "Error al generar la escena");

          setProgressPct(100);
          setStatusText("Listo!");
          onProcess(data.data.url, undefined, data.cost ?? 0.03);
        } else {
          // Precise or Fast mode: upload image first, then generate
          setStatusText("Comprimiendo imagen...");
          setProgressPct(20);
          const compressedFile = await compressImageForUpload(imageFile!, 2048, 0.85);

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

          setStatusText("Generando fondo con IA...");
          setProgressPct(50);
          const res = await fetch("/api/bg-generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
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
      }
    } catch (error) {
      console.error("BG generation error:", error);
      setStatusText("");
      setErrorMsg(error instanceof Error ? error.message : "Error al generar el fondo");
      toast.error(error instanceof Error ? error.message : "Error al generar el fondo");
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        setStatusText("");
        setProgressPct(0);
      }, 3000);
    }
  }, [imageFile, isFree, preset, selectedPreset, customPrompt, productDescription, aspectRatio, apiMode, productType, onProcess]);

  const canGenerate = apiMode === "creative"
    ? productDescription.trim().length > 0
    : !!imageFile;

  return (
    <div className="space-y-4">
      <ModuleHeader
        icon={<ImageIcon className="h-4 w-4" />}
        title="Fondos con IA"
        description="Coloca tu producto en cualquier escenario sin necesidad de estudio fotografico. Desde una mesa de marmol elegante hasta una playa tropical — la IA genera el fondo completo alrededor de tu producto."
        whyNeeded="Las fotos con contexto (lifestyle) venden hasta 30% mas que fondo blanco segun estudios de Shopify. Este modulo te da fotos de catalogo de lujo sin fotografo."
        costLabel="Desde gratis"
        steps={[
          "Sube tu foto de producto (mejor si ya tiene el fondo removido)",
          "Elige tu tipo de producto para ver los fondos mas relevantes",
          "Selecciona una categoria y elige un fondo",
          "Haz clic en \"Generar Fondo\" — la IA crea el escenario completo",
        ]}
        tips={[
          "Los fondos de Estudio son 100% gratis — se procesan en tu navegador.",
          "Modo Creativo genera una escena completa sin necesidad de imagen de producto.",
          "Primero quita el fondo con el modulo anterior para mejores resultados.",
          "Para consistencia de marca, usa el mismo estilo en todos tus productos.",
        ]}
      />

      <p className="text-xs text-gray-500">
        Reemplaza el fondo de tu producto con escenas profesionales generadas por IA.
      </p>

      {/* Smart info banner */}
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <Zap className="h-3.5 w-3.5 text-emerald-400" />
          <p className="text-[11px] font-semibold text-emerald-400">Modo Inteligente</p>
        </div>
        <p className="text-[10px] text-gray-400">
          Elige un fondo — la IA hace todo automaticamente.
          Los estilos de <span className="text-emerald-400 font-medium">Estudio son GRATIS</span>.
          Los demas usan Replicate API.
        </p>
      </div>

      {/* Product type selector */}
      <div>
        <label className="mb-2 block text-xs font-medium text-gray-400">
          Tipo de Producto
        </label>
        <div className="flex gap-1.5 flex-wrap">
          {PRODUCT_TYPES.map((pt) => (
            <button
              key={pt.id}
              type="button"
              onClick={() => setProductType(pt.id)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-medium transition-all border",
                productType === pt.id
                  ? "bg-accent/20 text-accent-light border-accent/40"
                  : "bg-surface-light text-gray-400 border-transparent hover:bg-surface-lighter",
              )}
            >
              {pt.label}
            </button>
          ))}
        </div>
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
              : `Costo estimado: ~${apiMode === "fast" ? "$0.003" : apiMode === "creative" ? "$0.03" : "$0.05"} por imagen`}
          </p>
        </div>
        <span className={cn(
          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
          isFree ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
        )}>
          {isFree ? "GRATIS" : apiMode === "fast" ? "~$0.003" : apiMode === "creative" ? "~$0.03" : "~$0.05"}
        </span>
      </div>

      {/* API Mode selector */}
      <div>
        <label className="mb-2 block text-xs font-medium text-gray-400">
          Modo de Generacion
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {API_MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setApiMode(opt.value)}
              className={cn(
                "flex flex-col items-start gap-0.5 rounded-lg border p-2 text-left transition-all",
                apiMode === opt.value
                  ? "border-accent bg-accent/10"
                  : "border-surface-lighter bg-surface-light hover:border-surface-hover",
              )}
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-[10px] font-medium text-gray-200">{opt.label}</span>
                <span className={cn(
                  "text-[9px] font-semibold",
                  opt.value === "fast" ? "text-emerald-400" : opt.value === "creative" ? "text-purple-400" : "text-amber-400",
                )}>
                  {opt.cost}
                </span>
              </div>
              <span className="text-[9px] text-gray-500 leading-tight">{opt.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Creative mode: product description instead of image upload */}
      {apiMode === "creative" && (
        <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Wand2 className="h-3.5 w-3.5 text-purple-400" />
            <label className="text-[11px] font-semibold text-purple-300">
              Modo Creativo — Describe tu Producto
            </label>
          </div>
          <p className="text-[10px] text-gray-500">
            La IA genera una escena completa. No necesitas imagen — solo describe tu producto.
          </p>
          <textarea
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            placeholder="ej. perfume de lujo en frasco de cristal azul, marca premium caribena..."
            rows={2}
            className="w-full rounded-lg border border-purple-500/30 bg-surface-light px-3 py-2 text-xs text-gray-200 placeholder:text-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-colors resize-none"
          />
        </div>
      )}

      {/* Style presets with category tabs */}
      <div>
        <label className="mb-2 block text-xs font-medium text-gray-400">
          Elige un Fondo
        </label>

        {/* Category tabs — horizontal scroll, no loading state */}
        <div className="flex gap-1 overflow-x-auto pb-1.5 no-scrollbar mb-2">
          {ALL_CATEGORIES.map((cat) => {
            const catHasFree = STYLE_PRESETS.filter((p) => p.category === cat).some((p) => !!p.color);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-[10px] font-medium transition-all whitespace-nowrap",
                  activeCategory === cat
                    ? "bg-accent text-white"
                    : "bg-surface-light text-gray-400 hover:bg-surface-lighter",
                )}
              >
                {cat}
                {catHasFree && activeCategory !== cat && (
                  <span className="ml-1 text-emerald-400">*</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Preset grid for active category — derived from static array, always renders immediately */}
        <div className="grid grid-cols-4 gap-1 rounded-lg border border-surface-lighter bg-surface p-2">
          {categoryPresets.map((p) => (
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
              <span className="text-[10px] text-gray-400 leading-tight text-center truncate w-full">
                {p.name}
              </span>
            </button>
          ))}
        </div>

        {activeCategory === "Estudio" && (
          <p className="mt-1 text-[9px] text-emerald-400">
            * Estos fondos son GRATIS — procesados en tu navegador
          </p>
        )}
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
          Describe el fondo que quieres — Claude IA lo optimiza automaticamente.
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

      {/* Progress bar with percentage */}
      {isProcessing && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-gray-400">{statusText}</p>
            <p className="text-[10px] font-mono text-gray-500">{progressPct}%</p>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-lighter">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Generate button */}
      <Button
        variant="primary"
        className="w-full"
        onClick={handleGenerate}
        disabled={!canGenerate || isProcessing}
        loading={isProcessing}
        leftIcon={<Sparkles className="h-4 w-4" />}
      >
        {isProcessing
          ? statusText || "Procesando..."
          : apiMode === "creative"
            ? "Generar Escena Creativa (~$0.03)"
            : isFree
              ? "Generar Fondo (Gratis)"
              : `Generar Fondo (~${apiMode === "fast" ? "$0.003" : "$0.05"})`}
      </Button>

      {!imageFile && apiMode !== "creative" && (
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

      {/* Success status */}
      {!isProcessing && statusText && !errorMsg && (
        <p className="text-center text-xs text-emerald-400">{statusText}</p>
      )}
    </div>
  );
}

export default BgGeneratePanel;
