"use client";

import React, { useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Dropzone } from "@/components/ui/dropzone";
import { ImageCompare } from "@/components/ui/image-compare";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Toolbar } from "@/components/editor/Toolbar";
import { ModuleSidebar } from "@/components/editor/ModuleSidebar";
import { LayersPanel } from "@/components/editor/LayersPanel";
import { PropertiesPanel } from "@/components/editor/PropertiesPanel";
import { ShadowsGuidePanel, type SessionResult } from "@/components/editor/ShadowsGuidePanel";
import { TryOnGuidePanel } from "@/components/editor/TryOnGuidePanel";
import { useGalleryStore } from "@/stores/gallery-store";
import { ArrowRight, RotateCcw, Eye, EyeOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/ui/empty-state";
import { ResultBanner } from "@/components/ui/result-banner";

/* Module panel imports */
import { BgRemovePanel } from "@/components/modules/BgRemovePanel";
import { BgGeneratePanel } from "@/components/modules/BgGeneratePanel";
import { EnhancePanel } from "@/components/modules/EnhancePanel";
import { ShadowsPanel } from "@/components/modules/ShadowsPanel";
import { InpaintPanel } from "@/components/modules/InpaintPanel";
import { OutpaintPanel } from "@/components/modules/OutpaintPanel";
import { TryOnPanel } from "@/components/modules/TryOnPanel";
import { ModelCreatePanel } from "@/components/modules/ModelCreatePanel";
import { VideoPanel } from "@/components/modules/VideoPanel";
import { CompliancePanel } from "@/components/modules/CompliancePanel";
import { GhostMannequinPanel } from "@/components/modules/GhostMannequinPanel";
import { JewelryTryOnPanel } from "@/components/modules/JewelryTryOnPanel";
import { AiPromptPanel } from "@/components/modules/AiPromptPanel";
import { AdCreatorPanel } from "@/components/modules/AdCreatorPanel";
import { SmartEditorPanel } from "@/components/modules/SmartEditorPanel";
import { AiAgentPanel } from "@/components/modules/AiAgentPanel";
import { UpscalePanel } from "@/components/modules/UpscalePanel";
import { BatchProcessPanel } from "@/components/modules/BatchProcessPanel";
import { BrandKitPanel } from "@/components/modules/BrandKitPanel";

/* ------------------------------------------------------------------ */
/*  Module map                                                          */
/* ------------------------------------------------------------------ */

const MODULE_PANELS: Record<
  string,
  React.ComponentType<{ imageFile: File | null; onProcess: (result: string, beforeImage?: string, cost?: number) => void; [key: string]: unknown }>
> = {
  "bg-remove": BgRemovePanel,
  "bg-generate": BgGeneratePanel,
  enhance: EnhancePanel,
  shadows: ShadowsPanel,
  inpaint: InpaintPanel,
  outpaint: OutpaintPanel,
  tryon: TryOnPanel,
  "model-create": ModelCreatePanel,
  video: VideoPanel,
  compliance: CompliancePanel,
  "ghost-mannequin": GhostMannequinPanel,
  "jewelry-tryon": JewelryTryOnPanel,
  "ai-prompt": AiPromptPanel,
  "smart-editor": SmartEditorPanel,
  "ad-creator": AdCreatorPanel,
  "ai-agent": AiAgentPanel,
  upscale: UpscalePanel,
  batch: BatchProcessPanel,
  "brand-kit": BrandKitPanel,
};

/** Modules that can work without an uploaded image */
const NO_IMAGE_MODULES = new Set(["model-create", "ai-prompt", "ai-agent"]);

/* ------------------------------------------------------------------ */
/*  Helper: convert any image URL to a reliable local blob URL          */
/* ------------------------------------------------------------------ */

async function toBlobUrl(url: string): Promise<string> {
  // Validate: must be a real URL, data URL, or blob URL
  if (
    !url ||
    (!url.startsWith("blob:") &&
      !url.startsWith("data:") &&
      !url.startsWith("http://") &&
      !url.startsWith("https://"))
  ) {
    throw new Error(`Invalid image URL: ${url.slice(0, 80)}...`);
  }

  // Already a blob URL — use directly
  if (url.startsWith("blob:")) return url;

  // Data URL — decode to blob
  if (url.startsWith("data:")) {
    const res = await fetch(url);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }

  // External URL (Replicate, etc.) — download and cache locally
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    // If fetch fails (CORS), try via img element
    return new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas context failed")); return; }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) resolve(URL.createObjectURL(blob));
          else reject(new Error("toBlob failed"));
        }, "image/png");
      };
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = url;
    });
  }
}

/** Convert a blob URL to a File object for chaining operations */
async function blobUrlToFile(blobUrl: string, filename: string): Promise<File> {
  const res = await fetch(blobUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || "image/png" });
}

/** Convert a blob URL to a data URL so it can be sent to the server */
async function blobUrlToDataUrl(blobUrl: string): Promise<string> {
  // If already a data URL or http URL, return as-is
  if (blobUrl.startsWith("data:") || blobUrl.startsWith("http")) return blobUrl;
  const res = await fetch(blobUrl);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Auto-save a processed result to the output folder (fire and forget) */
async function autoSaveResult(
  imageUrl: string,
  module: string,
  filename: string,
) {
  try {
    // Convert blob URLs to data URLs for the server
    const sendableUrl = await blobUrlToDataUrl(imageUrl);
    await fetch("/api/save-result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl: sendableUrl,
        module,
        filename,
      }),
    });
  } catch (err) {
    // Never block the UI — just log if auto-save fails
    console.warn("[auto-save] Failed:", err);
  }
}

/* ------------------------------------------------------------------ */
/*  Inner component that reads search params                            */
/* ------------------------------------------------------------------ */

function EditorInner() {
  const searchParams = useSearchParams();
  const moduleParam = searchParams.get("module") ?? "ai-agent";

  const [selectedModule, setSelectedModule] = useState(moduleParam);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [currentImageFile, setCurrentImageFile] = useState<File | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionCost, setSessionCost] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [imageLoading, setImageLoading] = useState(false);
  const [sessionResults, setSessionResults] = useState<SessionResult[]>([]);
  const [showingOriginal, setShowingOriginal] = useState(false);
  const lastShadowTypeRef = useRef<string>("drop");
  const lastTryOnProviderRef = useRef<string>("auto");
  const [hasModelImage, setHasModelImage] = useState(false);
  const [lastCost, setLastCost] = useState<number | undefined>(undefined);

  // Track blob URLs to revoke on cleanup
  const blobUrlsRef = useRef<string[]>([]);
  const trackBlobUrl = useCallback((url: string) => {
    if (url.startsWith("blob:")) blobUrlsRef.current.push(url);
  }, []);

  /* ---- Handlers ---- */

  const handleImageDrop = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;
    setCurrentImageFile(file);
    const url = URL.createObjectURL(file);
    trackBlobUrl(url);
    setCurrentImage(url);
    setOriginalImage(url);
    setProcessedImage(null);
  }, [trackBlobUrl]);

  const addToGallery = useGalleryStore((s) => s.addImage);

  const handleProcess = useCallback(async (resultUrl: string, beforeImage?: string, cost?: number) => {
    setImageLoading(true);

    try {
      // Convert the result to a local blob URL for reliable display
      const localUrl = await toBlobUrl(resultUrl);
      trackBlobUrl(localUrl);

      // For try-on modules, use the model image as "before" instead of the garment
      if (beforeImage) {
        const localBefore = await toBlobUrl(beforeImage);
        trackBlobUrl(localBefore);
        setCurrentImage(localBefore);
      }

      setProcessedImage(localUrl);
      setShowingOriginal(false);
      setIsProcessing(false);
      setSessionCost((prev) => prev + (cost ?? 0.02));

      setLastCost(cost);

      // Success toast
      const costStr = cost !== undefined ? ` ($${cost.toFixed(3)})` : "";
      toast.success(`Imagen procesada con exito${costStr}`);

      // Track for shadows/tryon session history
      const resultLabel = selectedModule === "shadows"
        ? lastShadowTypeRef.current
        : selectedModule === "tryon"
          ? lastTryOnProviderRef.current
          : selectedModule;
      setSessionResults((prev) => [
        ...prev,
        { url: localUrl, label: resultLabel, timestamp: Date.now() },
      ]);

      // Save to gallery
      addToGallery({
        id: `editor-${Date.now()}`,
        filename: currentImageFile?.name ?? "untitled.png",
        resultUrl: localUrl,
        originalUrl: beforeImage ?? currentImage ?? "",
        date: new Date().toISOString().split("T")[0],
        operations: [selectedModule],
        project: "editor",
      });

      // Auto-save to disk (fire and forget — never blocks the UI)
      autoSaveResult(localUrl, selectedModule, currentImageFile?.name ?? "untitled.png");
    } catch (error) {
      console.error("Failed to load processed image:", error);
      toast.error(`Error al cargar resultado: ${error instanceof Error ? error.message : "Error desconocido"}`);
    } finally {
      setImageLoading(false);
    }
  }, [addToGallery, currentImageFile, currentImage, selectedModule, trackBlobUrl]);

  /** Accept the processed result as the new working image for chaining */
  const handleAcceptResult = useCallback(async () => {
    if (!processedImage) return;
    setImageLoading(true);
    try {
      const file = await blobUrlToFile(
        processedImage,
        currentImageFile?.name ?? "processed.png"
      );
      setCurrentImageFile(file);
      setCurrentImage(processedImage);
      setProcessedImage(null);
    } catch (error) {
      console.error("Failed to accept result:", error);
    } finally {
      setImageLoading(false);
    }
  }, [processedImage, currentImageFile]);

  /** Reset back to the original uploaded image */
  const handleResetToOriginal = useCallback(() => {
    if (!originalImage) return;
    setCurrentImage(originalImage);
    setProcessedImage(null);
  }, [originalImage]);

  const handleModuleChange = useCallback((mod: string) => {
    setSelectedModule(mod);
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + 10, 500));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - 10, 10));
  }, []);

  const handleFitToScreen = useCallback(() => {
    setZoom(100);
  }, []);

  /* ---- Resolve module panel ---- */
  const PanelComponent = MODULE_PANELS[selectedModule] ?? MODULE_PANELS["bg-remove"];

  return (
    <div className="flex h-screen flex-col bg-surface">
      {/* Top Toolbar */}
      <Toolbar
        selectedModule={selectedModule}
        onModuleChange={handleModuleChange}
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitToScreen={handleFitToScreen}
        sessionCost={sessionCost}
        processedImageUrl={processedImage}
        originalImageUrl={currentImage}
      />

      {/* Main workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Module Navigation Sidebar */}
        <ModuleSidebar
          selectedModule={selectedModule}
          onModuleChange={handleModuleChange}
        />

        {/* Left Sidebar - Module Panel */}
        <aside className="flex w-72 shrink-0 flex-col border-r border-surface-lighter bg-surface">
          <div className="flex-1 overflow-y-auto p-4 no-scrollbar space-y-4">
            {/* Result banner after processing */}
            <ResultBanner
              visible={!!processedImage}
              cost={lastCost}
              onNavigate={handleModuleChange}
            />

            {!currentImageFile && !NO_IMAGE_MODULES.has(selectedModule) ? (
              <EmptyState module={selectedModule} />
            ) : selectedModule === "shadows" ? (
              <ShadowsPanel
                imageFile={currentImageFile}
                onProcess={handleProcess}
                onShadowTypeChange={(t) => { lastShadowTypeRef.current = t; }}
              />
            ) : selectedModule === "tryon" ? (
              <TryOnPanel
                imageFile={currentImageFile}
                onProcess={handleProcess}
                onProviderChange={(p) => { lastTryOnProviderRef.current = p; }}
                onModelImageChange={setHasModelImage}
              />
            ) : PanelComponent ? (
              <PanelComponent
                imageFile={currentImageFile}
                onProcess={handleProcess}
              />
            ) : null}
          </div>
        </aside>

        {/* Center Canvas */}
        <div className="flex flex-1 flex-col items-center justify-center overflow-auto bg-surface-overlay p-6">
          {!currentImage ? (
            /* Upload dropzone */
            <div className="w-full max-w-lg">
              <Dropzone
                onDrop={handleImageDrop}
                multiple={false}
                label="Arrastra tu imagen de producto aqui, o haz clic para buscar"
                hint="PNG, JPG, WebP hasta 50MB"
                className="min-h-[300px]"
              />
              <p className="mt-3 text-center text-xs text-gray-500">
                Sube una imagen para empezar a editar con el modulo{" "}
                <span className="text-accent-light">{selectedModule}</span>
              </p>
            </div>
          ) : imageLoading ? (
            /* Loading processed image */
            <Spinner size="lg" label="Cargando resultado..." />
          ) : processedImage ? (
            /* Before/After view */
            <div className="flex w-full flex-col items-center gap-4">
              <div
                className="w-full max-w-2xl"
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: "center" }}
              >
                {(selectedModule === "shadows" || selectedModule === "tryon") ? (
                  /* Shadows/TryOn: toggle between ANTES/DESPUES (different dimensions) */
                  <div className="relative">
                    <div className="checkerboard-bg rounded-xl">
                      <img
                        key={showingOriginal ? `orig-${currentImage}` : `proc-${processedImage}`}
                        src={showingOriginal ? currentImage : processedImage}
                        alt={showingOriginal ? "Original" : "Resultado"}
                        className="block w-full h-auto max-h-[70vh] object-contain rounded-xl border border-surface-lighter"
                      />
                    </div>

                    {/* ANTES / DESPUES badge */}
                    <span className={`absolute top-3 left-3 z-10 rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-sm pointer-events-none ${showingOriginal ? "bg-black/70" : "bg-accent/80"}`}>
                      {showingOriginal ? "ANTES" : "DESPUES"}
                    </span>

                    {/* Toggle button */}
                    <button
                      type="button"
                      onClick={() => setShowingOriginal((v) => !v)}
                      className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-md bg-black/70 px-2.5 py-1.5 text-[10px] font-medium text-gray-200 backdrop-blur-sm hover:bg-black/90 transition-colors"
                    >
                      {showingOriginal ? (
                        <><Eye className="h-3 w-3" /> Ver Resultado</>
                      ) : (
                        <><EyeOff className="h-3 w-3" /> Ver Original</>
                      )}
                    </button>
                  </div>
                ) : (
                  /* Other modules: slider comparison (same dimensions) */
                  <div className="checkerboard-bg rounded-xl">
                    <ImageCompare
                      beforeSrc={currentImage}
                      afterSrc={processedImage}
                      beforeLabel="ANTES"
                      afterLabel="DESPUES"
                      position={20}
                      showHeaderLabels={true}
                      showDragHint={true}
                      dragHintText="← Arrastra para ver el original"
                      className="w-full max-h-[70vh]"
                    />
                  </div>
                )}
              </div>

              {/* Action buttons below */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                  onClick={handleResetToOriginal}
                >
                  Volver al Original
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<ArrowRight className="h-3.5 w-3.5" />}
                  onClick={handleAcceptResult}
                >
                  Aceptar y Seguir Editando
                </Button>
              </div>
            </div>
          ) : (
            /* Single image preview */
            <div
              className="relative"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: "center" }}
            >
              <div className="checkerboard-bg rounded-lg">
                <img
                  src={currentImage}
                  alt="Current"
                  className="max-h-[70vh] rounded-lg border border-surface-lighter object-contain"
                />
              </div>
            </div>
          )}

          {/* Floating Cost Tracker */}
          <div className="fixed bottom-4 right-80 z-20 flex items-center gap-2 rounded-full border border-surface-lighter bg-surface-light px-4 py-2 shadow-lg">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs text-gray-400">Sesion:</span>
            <span className="text-sm font-semibold text-emerald-400">
              ${sessionCost.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Right Sidebar - Contextual */}
        <aside className="flex w-64 shrink-0 flex-col border-l border-surface-lighter bg-surface">
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {selectedModule === "shadows" ? (
              <ShadowsGuidePanel
                hasImage={!!currentImageFile}
                hasProcessedImage={!!processedImage}
                processedImageUrl={processedImage}
                sessionResults={sessionResults}
                selectedShadowType={selectedModule}
              />
            ) : selectedModule === "tryon" ? (
              <TryOnGuidePanel
                hasGarmentImage={!!currentImageFile}
                hasModelImage={hasModelImage}
                hasProcessedImage={!!processedImage}
                processedImageUrl={processedImage}
                sessionResults={sessionResults}
              />
            ) : (
              <>
                <div className="border-b border-surface-lighter p-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Capas
                  </h3>
                </div>
                <LayersPanel />

                <div className="border-t border-surface-lighter p-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Propiedades
                  </h3>
                </div>
                <PropertiesPanel />
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page wrapper with Suspense for useSearchParams                      */
/* ------------------------------------------------------------------ */

export default function EditorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-surface">
          <Spinner size="lg" label="Cargando editor..." />
        </div>
      }
    >
      <EditorInner />
    </Suspense>
  );
}
