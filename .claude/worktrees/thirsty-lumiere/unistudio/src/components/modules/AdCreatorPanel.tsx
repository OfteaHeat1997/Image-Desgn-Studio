"use client";

import React, { useState, useCallback } from "react";
import { safeJson } from "@/lib/utils/safe-json";
import {
  Film,
  Instagram,
  Play,
  Facebook,
  Youtube,
  Image as ImageIcon,
  Store,
  Sparkles,
  X,
  Check,
  Megaphone,
} from "lucide-react";
import { ModuleHeader } from "@/components/ui/module-header";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import { compressImageFile } from "@/lib/utils/compress-image";
import { AD_TEMPLATES, getRecommendedDuration } from "@/lib/processing/ad-compose";
import { calculateVideoCost, formatCost } from "@/lib/video/cost";
import { VideoPreview } from "./video/VideoPreview";
import type { AdFormat, VideoProviderKey } from "@/types/video";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface AdCreatorPanelProps {
  imageFile: File | null;
  onProcess: (result: string, beforeImage?: string, cost?: number) => void;
}

/* ------------------------------------------------------------------ */
/*  Template Icons                                                      */
/* ------------------------------------------------------------------ */

const TEMPLATE_ICONS: Record<string, React.ElementType> = {
  "instagram-reel": Instagram,
  tiktok: Play,
  "facebook-ad": Facebook,
  "facebook-marketplace": Store,
  "youtube-short": Youtube,
  "instagram-story": Instagram,
  "pinterest-pin": ImageIcon,
};

/* ------------------------------------------------------------------ */
/*  Provider Options                                                    */
/* ------------------------------------------------------------------ */

const PROVIDER_OPTIONS = [
  { value: "ltx-video", label: "LTX-Video · $0.04 (borrador)" },
  { value: "wan-2.2-fast", label: "Wan 2.2 Fast · $0.05 (estandar)" },
  { value: "kling-2.6", label: "Kling 2.6 · $0.35 (premium)" },
  { value: "kenburns", label: "Ken Burns · GRATIS (simple)" },
];

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function AdCreatorPanel({ imageFile, onProcess }: AdCreatorPanelProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<AdFormat>("instagram-reel");
  const [headline, setHeadline] = useState("");
  const [cta, setCta] = useState("Comprar Ahora");
  const [description, setDescription] = useState("");
  const [provider, setProvider] = useState<VideoProviderKey>("wan-2.2-fast");
  const [isProcessing, setIsProcessing] = useState(false);
  const [videoResult, setVideoResult] = useState<string | null>(null);

  /* ---- Inline error ---- */
  const [error, setError] = useState<string | null>(null);

  /* ---- AI Caption state ---- */
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [aiCaption, setAiCaption] = useState<string | null>(null);

  const template = AD_TEMPLATES[selectedTemplate];
  const duration = getRecommendedDuration(selectedTemplate);
  const estimatedCost = calculateVideoCost(provider, duration);

  /* ---- Generate AI Caption ---- */
  const handleGenerateCaption = useCallback(async () => {
    setIsGeneratingCaption(true);
    setAiCaption(null);
    setError(null);

    try {
      const res = await fetch("/api/video-enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: headline || description || "Producto de e-commerce",
          category: "product",
          platform: selectedTemplate,
          duration,
        }),
      });
      const data = await safeJson(res);
      if (!data.success) throw new Error(data.error || "Error al generar caption");

      if (data.data?.caption) {
        setAiCaption(data.data.caption);
      } else {
        setAiCaption(
          `${headline || "Descubre nuestra nueva coleccion"} - ${template.name} #ecommerce`,
        );
      }
    } catch (err) {
      console.error("Caption generation error:", err);
      setError(err instanceof Error ? err.message : "Error al generar caption");
    } finally {
      setIsGeneratingCaption(false);
    }
  }, [headline, description, selectedTemplate, duration, template.name]);

  /* ---- Use AI caption as description ---- */
  const handleUseCaptionAsDescription = useCallback(() => {
    if (aiCaption) {
      setDescription(aiCaption);
      setAiCaption(null);
    }
  }, [aiCaption]);

  /* ---- Generate Ad ---- */
  const handleGenerate = useCallback(async () => {
    if (!imageFile) return;
    setIsProcessing(true);
    setVideoResult(null);
    setError(null);

    try {
      // Upload image
      const compressed = await compressImageFile(imageFile);
      const formData = new FormData();
      formData.append("file", compressed);
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await safeJson(uploadRes);
      if (!uploadData.success)
        throw new Error(uploadData.error || "Error al subir imagen");

      // Call ad-create API
      const res = await fetch("/api/ad-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: uploadData.data.url,
          template: selectedTemplate,
          headline,
          cta,
          description,
          videoProvider: provider,
        }),
      });
      const data = await safeJson(res);
      if (!data.success)
        throw new Error(data.error || "Error al crear el anuncio");

      setVideoResult(data.data.videoUrl);
      onProcess(data.data.videoUrl, undefined, data.cost ?? data.data?.cost ?? 0);
    } catch (err) {
      console.error("Ad creation error:", err);
      setError(
        err instanceof Error ? err.message : "Error al crear el anuncio",
      );
    } finally {
      setIsProcessing(false);
    }
  }, [imageFile, selectedTemplate, headline, cta, description, provider, onProcess]);

  return (
    <div className="space-y-4">
      <ModuleHeader
        icon={<Megaphone className="h-4 w-4" />}
        title="Crear Anuncios"
        description="Crea videos publicitarios profesionales para Instagram, TikTok, Facebook y YouTube en segundos. Elige la plataforma, escribe tu titular y la IA genera el video con el formato, duracion y tamanio exacto que necesita cada red social."
        whyNeeded="Hacer un video publicitario normalmente requiere editor de video, conocer formatos y dimensiones de cada plataforma, y horas de trabajo. Este modulo lo hace todo automaticamente: elige el formato correcto, genera el video y lo deja listo para publicar."
        costLabel="Desde $0.04"
        steps={[
          "Sube tu imagen de producto al area central del editor",
          "Elige la plataforma: Instagram Reel, TikTok, Facebook Ad, YouTube Short, etc.",
          "Escribe un titular atractivo y un boton de accion (ej: \"Compra Ahora\")",
          "Haz clic en \"Crear Anuncio Video\" — la IA genera el video listo para publicar",
        ]}
        tips={[
          "El sistema ajusta automaticamente el formato y duracion para cada plataforma.",
          "Un buen CTA (\"Compra Ahora\", \"Ver Coleccion\", \"Oferta Limitada\") mejora la conversion.",
          "Usa \"Generar Caption IA\" para que la IA escriba la descripcion del anuncio por ti.",
          "Para TikTok e IG Reels usa formato vertical 9:16. Para Facebook usa cuadrado 1:1.",
        ]}
      />

      {/* Inline error card */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
          <span className="flex-1 text-xs text-red-300">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="shrink-0 text-red-400 hover:text-red-200 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Template grid */}
      <div>
        <label className="mb-2 block text-xs font-medium text-gray-400">
          Formato
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.values(AD_TEMPLATES).map((t) => {
            const Icon = TEMPLATE_ICONS[t.id] ?? Film;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTemplate(t.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border p-2.5 text-left transition-all",
                  selectedTemplate === t.id
                    ? "border-accent bg-accent/10"
                    : "border-surface-lighter bg-surface-light hover:border-surface-hover",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    selectedTemplate === t.id
                      ? "text-accent-light"
                      : "text-gray-500",
                  )}
                />
                <div>
                  <span className="block text-[10px] font-medium text-gray-300">
                    {t.name}
                  </span>
                  <span className="block text-[8px] text-gray-500">
                    {t.aspectRatio}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Platform specs */}
      <div className="rounded-lg border border-surface-lighter bg-surface-light/50 px-3 py-2">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[9px] text-gray-500">Dimensiones</p>
            <p className="text-[10px] font-medium text-gray-300">
              {template.width}x{template.height}
            </p>
          </div>
          <div>
            <p className="text-[9px] text-gray-500">Aspecto</p>
            <p className="text-[10px] font-medium text-gray-300">
              {template.aspectRatio}
            </p>
          </div>
          <div>
            <p className="text-[9px] text-gray-500">Duracion max</p>
            <p className="text-[10px] font-medium text-gray-300">
              {template.maxDuration}s
            </p>
          </div>
        </div>
      </div>

      {/* Headline */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-400">
          Titular
        </label>
        <input
          type="text"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="Nueva coleccion de lenceria"
          className="w-full rounded-lg border border-surface-lighter bg-surface-light px-3 py-2 text-xs text-gray-200 placeholder:text-gray-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors"
        />
      </div>

      {/* CTA */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-400">
          Llamada a la Accion
        </label>
        <input
          type="text"
          value={cta}
          onChange={(e) => setCta(e.target.value)}
          placeholder="Comprar Ahora"
          className="w-full rounded-lg border border-surface-lighter bg-surface-light px-3 py-2 text-xs text-gray-200 placeholder:text-gray-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors"
        />
      </div>

      {/* Description + AI Caption button */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-xs font-medium text-gray-400">
            Descripcion (opcional)
          </label>
          <button
            type="button"
            onClick={handleGenerateCaption}
            disabled={isGeneratingCaption}
            className="flex items-center gap-1 text-[10px] font-medium text-accent/70 hover:text-accent transition-colors disabled:opacity-50"
          >
            <Sparkles className="h-3 w-3" />
            {isGeneratingCaption ? "Generando..." : "Generar Caption IA"}
          </button>
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe tu anuncio o dejalo vacio para auto-generar..."
          rows={2}
          className="w-full rounded-lg border border-surface-lighter bg-surface-light px-3 py-2 text-xs text-gray-200 placeholder:text-gray-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors resize-none"
        />
      </div>

      {/* AI Caption result card */}
      {aiCaption && (
        <div className="space-y-2 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-accent" />
            <span className="text-[10px] font-semibold text-accent">
              Caption IA
            </span>
          </div>
          <p className="text-[11px] text-gray-300 leading-relaxed">
            {aiCaption}
          </p>
          <button
            type="button"
            onClick={handleUseCaptionAsDescription}
            className="flex items-center gap-1 rounded-md border border-accent/30 bg-accent/10 px-2.5 py-1 text-[10px] font-medium text-accent hover:bg-accent/20 transition-colors"
          >
            <Check className="h-3 w-3" />
            Usar como descripcion
          </button>
        </div>
      )}

      {/* Provider */}
      <Select
        label="Proveedor de Video"
        value={provider}
        onValueChange={(v) => setProvider(v as VideoProviderKey)}
        options={PROVIDER_OPTIONS}
      />

      {/* Template info + cost */}
      <div className="rounded-lg border border-surface-lighter bg-surface px-3 py-2">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-gray-500">
            {template.width}x{template.height} · {duration}s
          </span>
          <span className="text-gray-500">
            Costo:{" "}
            <span className="text-emerald-400 font-semibold">
              {formatCost(estimatedCost)}
            </span>
          </span>
        </div>
      </div>

      {/* Generate button */}
      <Button
        variant="primary"
        className="w-full"
        onClick={handleGenerate}
        disabled={!imageFile || isProcessing}
        loading={isProcessing}
        leftIcon={<Film className="h-4 w-4" />}
      >
        {isProcessing ? "Creando Anuncio..." : "Crear Anuncio Video"}
      </Button>

      {/* Preview */}
      <VideoPreview videoUrl={videoResult} />
    </div>
  );
}

export default AdCreatorPanel;
