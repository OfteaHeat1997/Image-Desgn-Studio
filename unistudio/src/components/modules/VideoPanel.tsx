"use client";

import React, { useState, useCallback } from "react";
import { safeJson } from "@/lib/utils/safe-json";
import {
  Video,
  Wand2,
  ShoppingBag,
  Shirt,
  UserCircle,
  Sparkles,
  X,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { ModuleHeader } from "@/components/ui/module-header";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { TabRoot, TabList, TabTrigger, TabContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils/cn";
import { useVideoStore } from "@/stores/video-store";
import { VIDEO_PROVIDERS, getProviderCost } from "@/lib/video/providers";
import { AVATAR_PROVIDERS, TTS_PROVIDERS } from "@/lib/video/providers";
import {
  calculateVideoCost,
  calculateAvatarCost,
  formatCost,
} from "@/lib/video/cost";
import { getPresetById } from "@/lib/video/presets";

import { VideoModeToggle } from "./video/VideoModeToggle";
import { VideoProviderSelect } from "./video/VideoProviderSelect";
import { VideoPreview } from "./video/VideoPreview";
import { ProductVideoTab } from "./video/ProductVideoTab";
import { FashionVideoTab } from "./video/FashionVideoTab";
import { AvatarVideoTab } from "./video/AvatarVideoTab";

import type {
  VideoCategory,
  VideoProviderKey,
  AvatarProviderKey,
  TtsProviderKey,
  AiEnhancement,
} from "@/types/video";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface VideoPanelProps {
  imageFile: File | null;
  onProcess: (result: string, beforeImage?: string, cost?: number) => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const DURATION_OPTIONS = [
  { value: "3", label: "3 segundos" },
  { value: "5", label: "5 segundos" },
  { value: "10", label: "10 segundos" },
  { value: "15", label: "15 segundos" },
];

const ASPECT_RATIO_OPTIONS = [
  { value: "16:9", label: "16:9 (Horizontal)" },
  { value: "9:16", label: "9:16 (Vertical)" },
  { value: "1:1", label: "1:1 (Cuadrado)" },
];

const AUTO_PLACEHOLDERS: Record<VideoCategory, string> = {
  product:
    "Ej: Video mostrando este producto con rotacion suave sobre fondo blanco",
  fashion:
    "Ej: Video de moda mostrando esta prenda con movimiento elegante de tela",
  avatar:
    "Ej: Una presentadora hablando sobre este producto, tono amigable y profesional",
};

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function VideoPanel({ imageFile, onProcess }: VideoPanelProps) {
  const store = useVideoStore();
  const [avatarImageFile, setAvatarImageFile] = useState<File | null>(null);

  /* ---- Auto mode prompt ---- */
  const [autoPrompt, setAutoPrompt] = useState("");

  /* ---- Inline error state ---- */
  const [error, setError] = useState<string | null>(null);

  /* ---- Track completed auto steps for UI ---- */
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  /* ---- Estimated cost ---- */
  const estimatedCost =
    store.activeTab === "avatar"
      ? calculateAvatarCost(store.avatarProvider, store.ttsProvider)
      : calculateVideoCost(store.selectedProvider, store.duration);

  /* ---- Is auto mode busy? ---- */
  const isAutoBusy = store.isEnhancing || store.isProcessing;

  /* ---------------------------------------------------------------
   * ONE-CLICK AUTO GENERATE — full pipeline
   * Step 1: AI enhances prompt + picks cheapest provider
   * Step 2: Upload image
   * Step 3: Generate video (or avatar with AI script + TTS)
   * --------------------------------------------------------------- */
  const handleAutoGenerate = useCallback(async () => {
    const isAvatar = store.activeTab === "avatar";
    const sourceImage = isAvatar ? (avatarImageFile ?? imageFile) : imageFile;
    if (!sourceImage) return;
    if (!autoPrompt.trim()) return;

    // Reset everything
    setError(null);
    setCompletedSteps([]);
    store.setAiEnhancement(null);
    store.setVideoResult(null);
    store.setIsEnhancing(true);

    try {
      /* ── STEP 1: AI Enhancement ── */
      store.setAutoStep("Optimizando prompt con IA...");

      const enhanceRes = await fetch("/api/video-enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: autoPrompt,
          category: store.activeTab,
          duration: store.duration,
          budget: 0, // prefer free providers
        }),
      });
      const enhanceData = await safeJson(enhanceRes);
      if (!enhanceData.success)
        throw new Error(enhanceData.error || "Error en mejora IA");

      const ai = enhanceData.data as AiEnhancement;
      store.setAiEnhancement(ai);
      setCompletedSteps(["enhance"]);

      /* ── STEP 2: Upload Image ── */
      store.setAutoStep("Subiendo imagen...");
      store.setIsEnhancing(false);
      store.setIsProcessing(true);

      const formData = new FormData();
      formData.append("file", sourceImage);
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await safeJson(uploadRes);
      if (!uploadData.success)
        throw new Error(uploadData.error || "Error al subir imagen");

      // Use HTTP URL for AI models (data URLs are too large / inaccessible to providers)
      const httpImageUrl = uploadData.data.replicateUrl || uploadData.data.url;

      setCompletedSteps(["enhance", "upload"]);

      /* ── STEP 3: Generate ── */
      if (isAvatar) {
        // Avatar: use AI-generated script
        const script = ai.script || autoPrompt;
        store.setAutoStep("Generando avatar con voz IA...");

        const res = await fetch("/api/avatar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            avatarImageUrl: httpImageUrl,
            provider: ai.recommendedProvider,
            script,
            ttsProvider: store.ttsProvider || "edge-tts",
            voice: store.voice,
            language: store.language,
          }),
        });
        const data = await safeJson(res);
        if (!data.success)
          throw new Error(data.error || "Error al generar avatar");

        setCompletedSteps(["enhance", "upload", "generate"]);
        store.setVideoResult(data.data.videoUrl);
        store.addProject({
          id: `avatar-${Date.now()}`,
          name: `Avatar ${new Date().toLocaleTimeString()}`,
          category: "avatar",
          sourceImageUrl: httpImageUrl,
          resultVideoUrl: data.data.videoUrl,
          provider: ai.recommendedProvider,
          status: "completed",
          cost: data.cost ?? 0,
          createdAt: new Date().toISOString(),
          options: { avatarImageUrl: httpImageUrl, provider: ai.recommendedProvider as AvatarProviderKey, script: ai.script || autoPrompt, ttsProvider: (store.ttsProvider || "edge-tts") as TtsProviderKey, voice: store.voice, language: store.language },
        });
        onProcess(data.data.videoUrl, undefined, data.cost ?? data.data?.cost ?? 0);
      } else {
        // Product / Fashion video
        store.setAutoStep("Generando video...");

        const res = await fetch("/api/video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: httpImageUrl,
            provider: ai.recommendedProvider,
            preset: store.selectedPreset,
            prompt: ai.enhancedPrompt,
            duration: ai.recommendedDuration,
            aspectRatio: store.aspectRatio,
            category: store.activeTab,
            mode: "auto",
          }),
        });
        const data = await safeJson(res);
        if (!data.success)
          throw new Error(data.error || "Error al generar video");

        setCompletedSteps(["enhance", "upload", "generate"]);
        store.setVideoResult(data.data.url);
        store.addProject({
          id: `video-${Date.now()}`,
          name: `${store.activeTab} ${new Date().toLocaleTimeString()}`,
          category: store.activeTab,
          sourceImageUrl: httpImageUrl,
          resultVideoUrl: data.data.url,
          provider: ai.recommendedProvider,
          status: "completed",
          cost: data.cost ?? 0,
          createdAt: new Date().toISOString(),
          options: { imageUrl: httpImageUrl, provider: ai.recommendedProvider as VideoProviderKey, prompt: ai.enhancedPrompt, duration: ai.recommendedDuration, aspectRatio: store.aspectRatio, category: store.activeTab, mode: store.mode },
        });
        onProcess(data.data.url, undefined, data.cost ?? 0);
      }
    } catch (err) {
      console.error("Auto generation error:", err);
      setError(
        err instanceof Error ? err.message : "Error en la generacion automatica",
      );
    } finally {
      store.setIsEnhancing(false);
      store.setIsProcessing(false);
      store.setAutoStep(null);
    }
  }, [imageFile, avatarImageFile, store, autoPrompt, onProcess]);

  /* ---- Manual mode generate handler ---- */
  const handleGenerate = useCallback(async () => {
    if (!imageFile && store.activeTab !== "avatar") return;
    store.setIsProcessing(true);
    store.setVideoResult(null);
    setError(null);

    try {
      if (store.activeTab === "avatar") {
        const avatarImage = avatarImageFile ?? imageFile;
        if (!avatarImage) throw new Error("Se necesita una imagen de avatar");
        if (!store.script.trim())
          throw new Error("Escribe un script para el avatar");

        const formData = new FormData();
        formData.append("file", avatarImage);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await safeJson(uploadRes);
        if (!uploadData.success)
          throw new Error(uploadData.error || "Error al subir imagen");

        const res = await fetch("/api/avatar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            avatarImageUrl: uploadData.data.url,
            provider: store.avatarProvider,
            script: store.script,
            ttsProvider: store.ttsProvider,
            voice: store.voice,
            language: store.language,
          }),
        });
        const data = await safeJson(res);
        if (!data.success)
          throw new Error(data.error || "Error al generar avatar");

        store.setVideoResult(data.data.videoUrl);
        store.addProject({
          id: `avatar-m-${Date.now()}`,
          name: `Avatar ${new Date().toLocaleTimeString()}`,
          category: "avatar",
          sourceImageUrl: uploadData.data.url,
          resultVideoUrl: data.data.videoUrl,
          provider: store.avatarProvider,
          status: "completed",
          cost: data.data.cost ?? 0,
          createdAt: new Date().toISOString(),
          options: { avatarImageUrl: uploadData.data.url, provider: store.avatarProvider, script: store.script, ttsProvider: store.ttsProvider, voice: store.voice, language: store.language },
        });
        onProcess(data.data.videoUrl, undefined, data.cost ?? data.data?.cost ?? 0);
      } else {
        if (!imageFile) throw new Error("Se necesita una imagen para generar video");
        const formData = new FormData();
        formData.append("file", imageFile);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await safeJson(uploadRes);
        if (!uploadData.success)
          throw new Error(uploadData.error || "Error al subir imagen");

        const preset = getPresetById(store.selectedPreset);
        const prompt =
          store.customPrompt ||
          preset?.promptTemplate ||
          "Product video showcase";

        const res = await fetch("/api/video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: uploadData.data.url,
            provider: store.selectedProvider,
            preset: store.selectedPreset,
            prompt,
            duration: store.duration,
            aspectRatio: store.aspectRatio,
            category: store.activeTab,
            mode: store.mode,
          }),
        });
        const data = await safeJson(res);
        if (!data.success)
          throw new Error(data.error || "Error al generar video");

        store.setVideoResult(data.data.url);
        store.addProject({
          id: `video-m-${Date.now()}`,
          name: `${store.activeTab} ${new Date().toLocaleTimeString()}`,
          category: store.activeTab,
          sourceImageUrl: uploadData.data.url,
          resultVideoUrl: data.data.url,
          provider: store.selectedProvider,
          status: "completed",
          cost: data.data.cost ?? 0,
          createdAt: new Date().toISOString(),
          options: { imageUrl: uploadData.data.url, provider: store.selectedProvider, prompt, duration: store.duration, aspectRatio: store.aspectRatio, category: store.activeTab, mode: store.mode },
        });
        onProcess(data.data.url, undefined, data.cost ?? data.data?.cost ?? 0);
      }
    } catch (err) {
      console.error("Video generation error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Error en la generacion de video",
      );
    } finally {
      store.setIsProcessing(false);
    }
  }, [imageFile, avatarImageFile, store, onProcess]);

  /* ---- Step labels for progress display ---- */
  const autoStepLabels = store.activeTab === "avatar"
    ? [
        { key: "enhance", label: "IA escribe script + elige proveedor" },
        { key: "upload", label: "Subiendo imagen" },
        { key: "generate", label: "Generando avatar + voz" },
      ]
    : [
        { key: "enhance", label: "IA optimiza prompt + elige proveedor" },
        { key: "upload", label: "Subiendo imagen" },
        { key: "generate", label: "Generando video" },
      ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <ModuleHeader
        icon={<Video className="h-4 w-4" />}
        title="Video Studio"
        description="Convierte tus fotos de producto en videos profesionales para TikTok, Instagram Reels y YouTube Shorts. Elige entre 3 modos: Producto (el producto se mueve/gira), Moda (modelo caminando con tu ropa), o Avatar (una persona hablando sobre tu producto con voz IA)."
        whyNeeded="Los videos tienen 5x mas engagement que las fotos estaticas en redes sociales. TikTok e Instagram priorizan videos en sus algoritmos. Un video corto de 5-15 segundos de tu producto puede generar mas ventas que 10 fotos."
        costLabel="Desde gratis"
        steps={[
          "Sube tu imagen de producto al area central del editor",
          "Elige la pestana: Producto, Moda o Avatar",
          "Modo Auto: un clic genera todo. Modo Manual: elige proveedor, duracion y estilo",
          "Haz clic en \"Generar Video\" — el resultado se previsualiza directamente",
        ]}
        tips={[
          "Ken Burns (zoom/pan suave) es GRATIS — ideal para empezar sin gastar.",
          "Modo Auto escribe el prompt, elige el mejor proveedor y genera todo automaticamente.",
          "Para Avatar: sube una foto de rostro, escribe el texto que debe decir, y la IA genera el video con voz.",
          "Edge TTS (voz) es gratis e incluye voces en espanol latino y castellano.",
          "Videos de 5-10 segundos funcionan mejor en TikTok e Instagram Reels.",
        ]}
      />

      {/* Mode Toggle */}
      <VideoModeToggle
        mode={store.mode}
        onModeChange={(m) => {
          store.setMode(m);
          store.setAiEnhancement(null);
          store.setAutoStep(null);
          setError(null);
          setCompletedSteps([]);
        }}
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

      {store.mode === "auto" ? (
        /* ══════════════════════════════════════════════════════════════
         *  AUTO MODE — One-click AI pipeline
         * ══════════════════════════════════════════════════════════════ */
        <div className="space-y-4">
          {/* Category tabs */}
          <div className="flex items-center gap-1 rounded-lg bg-surface-light p-1">
            {(
              [
                { key: "product" as VideoCategory, icon: ShoppingBag, label: "Producto" },
                { key: "fashion" as VideoCategory, icon: Shirt, label: "Moda" },
                { key: "avatar" as VideoCategory, icon: UserCircle, label: "Avatar" },
              ] as const
            ).map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                type="button"
                disabled={isAutoBusy}
                onClick={() => {
                  store.setActiveTab(key);
                  store.setAiEnhancement(null);
                  setCompletedSteps([]);
                }}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-medium transition-all",
                  store.activeTab === key
                    ? "bg-accent/15 text-accent-light shadow-sm"
                    : "text-gray-400 hover:text-gray-200",
                  isAutoBusy && "opacity-50 cursor-not-allowed",
                )}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>

          {/* Description textarea */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">
              {store.activeTab === "avatar"
                ? "Describe tu avatar video"
                : "Describe tu video"}
            </label>
            <textarea
              value={autoPrompt}
              onChange={(e) => {
                setAutoPrompt(e.target.value);
                if (store.aiEnhancement) {
                  store.setAiEnhancement(null);
                  setCompletedSteps([]);
                }
              }}
              disabled={isAutoBusy}
              placeholder={AUTO_PLACEHOLDERS[store.activeTab]}
              rows={3}
              className="w-full rounded-lg border border-surface-lighter bg-surface-light px-3 py-2 text-xs text-gray-200 placeholder:text-gray-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors resize-none disabled:opacity-50"
            />
            <p className="mt-1 text-[10px] text-gray-500">
              Un clic = la IA escribe el prompt, elige proveedor gratis y genera
              {store.activeTab === "avatar" ? " el avatar con voz" : " el video"}
            </p>
          </div>

          {/* Live progress steps (shown while processing) */}
          {(isAutoBusy || completedSteps.length > 0) && (
            <div className="space-y-1.5 rounded-lg border border-surface-lighter bg-surface px-3 py-2.5">
              {autoStepLabels.map(({ key, label }, i) => {
                const isDone = completedSteps.includes(key);
                const isActive =
                  !isDone &&
                  isAutoBusy &&
                  (i === 0
                    ? !completedSteps.includes(autoStepLabels[0].key)
                    : completedSteps.includes(autoStepLabels[i - 1].key));
                const isPending = !isDone && !isActive;

                return (
                  <div key={key} className="flex items-center gap-2">
                    {isDone ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    ) : isActive ? (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 text-accent animate-spin" />
                    ) : (
                      <div className="h-3.5 w-3.5 shrink-0 rounded-full border border-gray-600" />
                    )}
                    <span
                      className={cn(
                        "text-[10px]",
                        isDone
                          ? "text-emerald-400"
                          : isActive
                            ? "text-gray-200 font-medium"
                            : "text-gray-500",
                      )}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* AI Recommendation Card (shown after step 1 completes) */}
          {store.aiEnhancement && !isAutoBusy && (
            <div className="space-y-2 rounded-lg border border-accent/40 bg-accent/5 px-3 py-3">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                <span className="text-[11px] font-semibold text-accent">
                  Resultado IA
                </span>
                <span className="ml-auto rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-medium text-accent">
                  {store.aiEnhancement.method === "claude" ? "Claude" : "Local"}
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px]">
                <span className="text-gray-400">
                  Proveedor:{" "}
                  <span className="font-medium text-gray-200">
                    {store.aiEnhancement.recommendedProvider}
                  </span>
                </span>
                <span className="text-gray-400">
                  Costo:{" "}
                  <span className="font-semibold text-emerald-400">
                    {store.aiEnhancement.estimatedCost === 0
                      ? "GRATIS"
                      : `$${store.aiEnhancement.estimatedCost.toFixed(2)}`}
                  </span>
                </span>
              </div>

              <p className="text-[10px] text-gray-400 italic">
                {store.aiEnhancement.reasoning}
              </p>

              {/* Enhanced prompt */}
              <div className="rounded-md bg-surface-light/50 px-2 py-1.5">
                <p className="text-[9px] font-medium text-gray-500 mb-0.5">
                  Prompt usado:
                </p>
                <p className="text-[10px] text-gray-300 line-clamp-3">
                  {store.aiEnhancement.enhancedPrompt}
                </p>
              </div>

              {/* Script (avatar) */}
              {store.aiEnhancement.script && (
                <div className="rounded-md bg-surface-light/50 px-2 py-1.5">
                  <p className="text-[9px] font-medium text-gray-500 mb-0.5">
                    Script generado:
                  </p>
                  <p className="text-[10px] text-gray-300">
                    {store.aiEnhancement.script}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Cost estimate */}
          {!isAutoBusy && !store.aiEnhancement && (
            <div className="rounded-lg border border-surface-lighter bg-surface px-3 py-2 text-center">
              <span className="text-[10px] text-gray-500">
                Prioridad:{" "}
                <span className="text-emerald-400 font-semibold">
                  Proveedores GRATIS
                </span>
                {" "}(Ken Burns, Hedra, Edge TTS)
              </span>
            </div>
          )}

          {/* ONE-CLICK Generate button */}
          <Button
            variant="primary"
            className="w-full"
            onClick={handleAutoGenerate}
            disabled={!imageFile || isAutoBusy || !autoPrompt.trim()}
            loading={isAutoBusy}
            leftIcon={<Wand2 className="h-4 w-4" />}
          >
            {isAutoBusy
              ? (store.autoStep || "Procesando...")
              : "Generar con IA"}
          </Button>
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════════
         *  MANUAL MODE
         * ══════════════════════════════════════════════════════════════ */
        <>
          {/* Tab navigation */}
          <TabRoot
            value={store.activeTab}
            onValueChange={(v) => store.setActiveTab(v as VideoCategory)}
          >
            <TabList className="w-full">
              <TabTrigger value="product" className="flex-1 gap-1">
                <ShoppingBag className="h-3 w-3" />
                Producto
              </TabTrigger>
              <TabTrigger value="fashion" className="flex-1 gap-1">
                <Shirt className="h-3 w-3" />
                Moda
              </TabTrigger>
              <TabTrigger value="avatar" className="flex-1 gap-1">
                <UserCircle className="h-3 w-3" />
                Avatar
              </TabTrigger>
            </TabList>

            <TabContent value="product">
              <ProductVideoTab
                selectedPreset={store.selectedPreset}
                onPresetChange={store.setSelectedPreset}
                customPrompt={store.customPrompt}
                onCustomPromptChange={store.setCustomPrompt}
              />
            </TabContent>

            <TabContent value="fashion">
              <FashionVideoTab
                selectedPreset={store.selectedPreset}
                onPresetChange={store.setSelectedPreset}
                customPrompt={store.customPrompt}
                onCustomPromptChange={store.setCustomPrompt}
              />
            </TabContent>

            <TabContent value="avatar">
              <AvatarVideoTab
                script={store.script}
                onScriptChange={store.setScript}
                avatarProvider={store.avatarProvider}
                onAvatarProviderChange={store.setAvatarProvider}
                ttsProvider={store.ttsProvider}
                onTtsProviderChange={store.setTtsProvider}
                voice={store.voice}
                onVoiceChange={store.setVoice}
                language={store.language}
                onLanguageChange={store.setLanguage}
                avatarImageFile={avatarImageFile}
                onAvatarImageUpload={setAvatarImageFile}
              />
            </TabContent>
          </TabRoot>

          {/* Provider, Duration, Aspect Ratio (for product/fashion) */}
          {store.activeTab !== "avatar" && (
            <div className="space-y-3 border-t border-surface-lighter pt-3">
              <VideoProviderSelect
                category={store.activeTab}
                value={store.selectedProvider}
                onChange={store.setSelectedProvider}
                duration={store.duration}
              />

              <Select
                label="Duracion"
                value={String(store.duration)}
                onValueChange={(v) => store.setDuration(parseInt(v))}
                options={DURATION_OPTIONS}
              />

              <Select
                label="Aspecto"
                value={store.aspectRatio}
                onValueChange={store.setAspectRatio}
                options={ASPECT_RATIO_OPTIONS}
              />
            </div>
          )}

          {/* Cost estimate */}
          <div className="rounded-lg border border-surface-lighter bg-surface px-3 py-2 text-center">
            <span className="text-[10px] text-gray-500">
              Costo estimado:{" "}
              <span className="text-emerald-400 font-semibold">
                {formatCost(estimatedCost)}
              </span>
              {store.activeTab !== "avatar" && (
                <>
                  {" | "}Duracion: {store.duration}s
                </>
              )}
            </span>
          </div>

          {/* Generate button */}
          <Button
            variant="primary"
            className="w-full"
            onClick={handleGenerate}
            disabled={
              store.isProcessing ||
              (store.activeTab === "avatar"
                ? !store.script.trim()
                : !imageFile)
            }
            loading={store.isProcessing}
            leftIcon={<Video className="h-4 w-4" />}
          >
            {store.isProcessing
              ? "Generando Video..."
              : store.activeTab === "avatar"
                ? "Generar Avatar Video"
                : "Generar Video"}
          </Button>
        </>
      )}

      {/* Video preview */}
      <VideoPreview videoUrl={store.videoResult} />
    </div>
  );
}

export default VideoPanel;
