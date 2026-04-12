"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Monitor, Copy, Check, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// ── Scene options ──
const SCENE_OPTIONS = [
  { id: "product-closeup", label: "Producto Close-up" },
  { id: "brand-story", label: "Brand Story" },
  { id: "seasonal-campaign", label: "Campaña Estacional" },
  { id: "collection", label: "Colección" },
];

// ── Duration options with cost preview ──
const DURATION_OPTIONS = [
  { value: 8, label: "8s", costNote: "~$0.56 Kling" },
  { value: 15, label: "15s", costNote: "~$1.05 Kling" },
  { value: 30, label: "30s", costNote: "~$2.10 Kling" },
];

// ── Brand mood options ──
const MOOD_OPTIONS = [
  { id: "elegante", label: "Elegante", modifier: "elegant refined sophisticated atmosphere" },
  { id: "romantico", label: "Romántico", modifier: "romantic soft warm dreamy atmosphere" },
  { id: "dinamico", label: "Dinámico", modifier: "dynamic energetic bold vibrant atmosphere" },
  { id: "minimalista", label: "Minimalista", modifier: "minimal clean pure white space aesthetic" },
  { id: "lujoso", label: "Lujoso", modifier: "ultra luxury opulent high-end cinematic atmosphere" },
];

// ── Category-specific hero templates ──
const CATEGORY_TEMPLATES: Record<string, { label: string; prompt: string }> = {
  lingerie: {
    label: "Lencería",
    prompt:
      "Soft delicate lingerie fabric floating in slow motion, warm golden lighting, silk and lace texture, intimate luxury brand",
  },
  fragrances: {
    label: "Fragancias",
    prompt:
      "Luxury perfume bottle on reflective dark surface, dramatic light refraction through glass, ethereal golden mist rising",
  },
  jewelry: {
    label: "Joyería",
    prompt:
      "Polished stainless steel jewelry against dark velvet, dramatic light sweep revealing sparkle and metallic sheen",
  },
  skincare: {
    label: "Skincare",
    prompt:
      "Premium skincare product with fresh water droplets, glowing radiant skin texture, clean fresh spa aesthetic",
  },
};

// ── Scene descriptors ──
const SCENE_DESCRIPTORS: Record<string, string> = {
  "product-closeup": "extreme close-up macro product hero shot, cinematic depth of field",
  "brand-story": "storytelling brand film, emotional connection, aspirational lifestyle",
  "seasonal-campaign": "seasonal campaign hero video, festive atmosphere, celebration mood",
  collection: "full collection showcase, multiple products, editorial style reveal",
};

interface HeroVideoTabProps {
  customPrompt: string;
  onCustomPromptChange: (prompt: string) => void;
  onDurationChange: (duration: number) => void;
  onAspectRatioChange: (ratio: string) => void;
  videoResult?: string | null;
}

export function HeroVideoTab({
  customPrompt,
  onCustomPromptChange,
  onDurationChange,
  onAspectRatioChange,
  videoResult,
}: HeroVideoTabProps) {
  const [scene, setScene] = useState("product-closeup");
  const [duration, setDuration] = useState(8);
  const [loopMode, setLoopMode] = useState(false);
  const [mood, setMood] = useState("elegante");
  const [categoryTemplate, setCategoryTemplate] = useState("lingerie");
  const [copied, setCopied] = useState(false);

  const buildPrompt = useCallback(() => {
    const templateData = CATEGORY_TEMPLATES[categoryTemplate];
    const moodData = MOOD_OPTIONS.find((m) => m.id === mood);
    const sceneDesc = SCENE_DESCRIPTORS[scene];

    const parts = [
      templateData?.prompt ?? "",
      sceneDesc,
      moodData?.modifier ?? "",
      "cinematic hero video, high production value, brand commercial",
    ];

    if (loopMode) {
      parts.push("seamless loop, smooth transition back to start, perfect loop point");
    }

    return parts.filter(Boolean).join(", ");
  }, [scene, mood, categoryTemplate, loopMode]);

  // Rebuild prompt whenever controls change
  useEffect(() => {
    onCustomPromptChange(buildPrompt());
  }, [scene, duration, loopMode, mood, categoryTemplate, buildPrompt, onCustomPromptChange]);

  // Sync duration and aspect ratio with parent
  useEffect(() => {
    onDurationChange(Math.min(duration, 10)); // cap at provider max
    onAspectRatioChange("16:9");
  }, [duration, onDurationChange, onAspectRatioChange]);

  const handleCopyEmbed = () => {
    if (!videoResult) return;
    const code = `<video autoplay loop muted playsinline src="${videoResult}" style="width:100%;height:auto;"></video>`;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-4">
      {/* Header note */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-500/30 bg-blue-500/8 px-3 py-2">
        <Monitor className="h-3.5 w-3.5 shrink-0 text-blue-400 mt-0.5" />
        <p className="text-[10px] text-blue-300">
          Crea el video principal para la página de inicio de tu tienda. Formato 16:9 optimizado para web.
        </p>
      </div>

      {/* Scene selector */}
      <div>
        <label className="mb-2 block text-xs font-medium text-gray-400">
          Tipo de Escena
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {SCENE_OPTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setScene(s.id)}
              className={cn(
                "rounded-lg border p-2 text-left text-[10px] font-medium transition-all",
                scene === s.id
                  ? "border-accent bg-accent/10 text-accent-light"
                  : "border-surface-lighter bg-surface-light text-gray-400 hover:border-surface-hover hover:text-gray-200",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category template */}
      <div>
        <label className="mb-2 block text-xs font-medium text-gray-400">
          Categoría de Producto
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(CATEGORY_TEMPLATES).map(([key, tmpl]) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategoryTemplate(key)}
              className={cn(
                "rounded-lg border p-2 text-left text-[10px] font-medium transition-all",
                categoryTemplate === key
                  ? "border-accent bg-accent/10 text-accent-light"
                  : "border-surface-lighter bg-surface-light text-gray-400 hover:border-surface-hover hover:text-gray-200",
              )}
            >
              {tmpl.label}
            </button>
          ))}
        </div>
      </div>

      {/* Brand mood */}
      <div>
        <label className="mb-2 block text-xs font-medium text-gray-400">
          Mood de Marca
        </label>
        <div className="flex flex-wrap gap-1.5">
          {MOOD_OPTIONS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMood(m.id)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10px] font-medium transition-all",
                mood === m.id
                  ? "border-accent bg-accent/15 text-accent-light"
                  : "border-surface-lighter bg-surface-light text-gray-400 hover:border-accent/40 hover:text-gray-200",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Duration selector */}
      <div>
        <label className="mb-2 block text-xs font-medium text-gray-400">
          Duración
        </label>
        <div className="flex gap-2">
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDuration(opt.value)}
              className={cn(
                "flex-1 rounded-lg border p-2 text-center transition-all",
                duration === opt.value
                  ? "border-accent bg-accent/10"
                  : "border-surface-lighter bg-surface-light hover:border-surface-hover",
              )}
            >
              <span
                className={cn(
                  "block text-[11px] font-bold",
                  duration === opt.value ? "text-accent-light" : "text-gray-300",
                )}
              >
                {opt.label}
              </span>
              <span className="block text-[9px] text-gray-500 mt-0.5">
                {opt.costNote}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-1 text-[10px] text-gray-500">
          Nota: proveedores tienen máx. 10s — duración se ajusta automáticamente
        </p>
      </div>

      {/* Loop mode toggle */}
      <div className="flex items-center justify-between rounded-lg border border-surface-lighter bg-surface-light px-3 py-2.5">
        <div>
          <p className="text-[11px] font-medium text-gray-300">
            Reproducción Infinita
          </p>
          <p className="text-[10px] text-gray-500">
            Agrega modificadores de loop sin interrupciones
          </p>
        </div>
        <button
          type="button"
          onClick={() => setLoopMode(!loopMode)}
          className={cn(
            "relative h-5 w-9 rounded-full transition-colors",
            loopMode ? "bg-accent" : "bg-surface-lighter",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
              loopMode ? "translate-x-4" : "translate-x-0.5",
            )}
          />
        </button>
      </div>

      {/* Prompt preview */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-400">
          Prompt generado
        </label>
        <textarea
          value={customPrompt}
          onChange={(e) => onCustomPromptChange(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-surface-lighter bg-surface-light px-3 py-2 text-xs text-gray-200 placeholder:text-gray-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors resize-none"
        />
        <button
          type="button"
          onClick={() => onCustomPromptChange(buildPrompt())}
          className="mt-1 flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          Regenerar prompt
        </button>
      </div>

      {/* Embed code button — shown after generation */}
      {videoResult && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/8 px-3 py-3 space-y-2">
          <p className="text-[11px] font-semibold text-emerald-400">
            Video listo para tu página web
          </p>
          <button
            type="button"
            onClick={handleCopyEmbed}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-medium text-emerald-300 hover:bg-emerald-500/20 transition-colors"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? "Copiado!" : "Copiar código embed"}
          </button>
          <p className="text-[9px] text-gray-500 font-mono bg-surface-light rounded px-2 py-1 break-all">
            {"<video autoplay loop muted playsinline src=\"...\">"}
          </p>
        </div>
      )}
    </div>
  );
}
