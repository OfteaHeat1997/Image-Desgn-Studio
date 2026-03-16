"use client";

import React, { useState, useCallback } from "react";
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Download,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils/cn";
import { useEditorStore } from "@/stores/editor-store";
import { toast } from "@/hooks/use-toast";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface ToolbarProps {
  selectedModule: string;
  onModuleChange: (module: string) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToScreen: () => void;
  sessionCost: number;
  processedImageUrl?: string | null;
  originalImageUrl?: string | null;
}

/* ------------------------------------------------------------------ */
/*  Module options                                                      */
/* ------------------------------------------------------------------ */

const MODULE_OPTIONS = [
  { value: "ai-agent", label: "Agente IA (Auto)" },
  { value: "bg-remove", label: "Quitar Fondo" },
  { value: "bg-generate", label: "Fondos con IA" },
  { value: "enhance", label: "Mejorar Calidad" },
  { value: "upscale", label: "Aumentar Resolucion" },
  { value: "shadows", label: "Sombras e Iluminacion" },
  { value: "inpaint", label: "Borrar y Reemplazar" },
  { value: "outpaint", label: "Extender Imagen" },
  { value: "tryon", label: "Prueba Virtual" },
  { value: "model-create", label: "Crear Modelo IA" },
  { value: "ghost-mannequin", label: "Maniqui Invisible" },
  { value: "jewelry-tryon", label: "Joyeria Virtual" },
  { value: "video", label: "Estudio de Video" },
  { value: "batch", label: "Procesamiento Masivo" },
  { value: "brand-kit", label: "Kit de Marca" },
  { value: "compliance", label: "Verificar Marketplace" },
  { value: "smart-editor", label: "Editor Avanzado" },
  { value: "ai-prompt", label: "Director Creativo IA" },
  { value: "ad-creator", label: "Crear Anuncios" },
];

/* ------------------------------------------------------------------ */
/*  Separator                                                           */
/* ------------------------------------------------------------------ */

function Separator() {
  return <div className="mx-1 h-6 w-px bg-surface-lighter" />;
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function Toolbar({
  selectedModule,
  onModuleChange,
  zoom,
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  sessionCost,
  processedImageUrl,
  originalImageUrl,
}: ToolbarProps) {
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<"png" | "jpg" | "webp">("png");
  const [exportQuality, setExportQuality] = useState(90);
  const [isExporting, setIsExporting] = useState(false);

  const { undo, redo, historyIndex, history } = useEditorStore();

  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < history.length - 1;

  const handleExport = useCallback(async () => {
    const imageUrl = processedImageUrl || originalImageUrl;
    if (!imageUrl) {
      toast.warning("No hay imagen para exportar. Procesa una imagen primero.");
      return;
    }

    setIsExporting(true);
    try {
      // Fetch the image as blob
      const response = await fetch(imageUrl);
      const blob = await response.blob();

      // If format conversion is needed (jpg/webp), use canvas
      let downloadBlob = blob;
      const mimeType = exportFormat === "jpg" ? "image/jpeg" : `image/${exportFormat}`;

      if (exportFormat !== "png" || blob.type !== mimeType) {
        const img = new Image();
        const tempUrl = URL.createObjectURL(blob);
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Failed to load image for conversion"));
          img.src = tempUrl;
        });
        URL.revokeObjectURL(tempUrl);

        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d")!;

        // For JPG, fill white background (no transparency)
        if (exportFormat === "jpg") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(img, 0, 0);
        downloadBlob = await new Promise<Blob>((resolve) =>
          canvas.toBlob((b) => resolve(b!), mimeType, exportQuality / 100)
        );
      }

      // Trigger download
      const downloadUrl = URL.createObjectURL(downloadBlob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `unistudio-export.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      setShowExportModal(false);
    } catch (error) {
      console.error("Export error:", error);
      toast.error(`Error al exportar: ${error instanceof Error ? error.message : "Error desconocido"}`);
    } finally {
      setIsExporting(false);
    }
  }, [processedImageUrl, originalImageUrl, exportFormat, exportQuality]);

  return (
    <>
      <div className="flex h-12 items-center gap-1 border-b border-surface-lighter bg-surface px-3">
        {/* Undo / Redo */}
        <Button
          variant="ghost"
          size="sm"
          disabled={!canUndo}
          onClick={undo}
          aria-label="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!canRedo}
          onClick={redo}
          aria-label="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </Button>

        <Separator />

        {/* Zoom controls */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomOut}
          aria-label="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="mx-1 min-w-[3rem] text-center text-xs tabular-nums text-gray-400">
          {zoom}%
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomIn}
          aria-label="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onFitToScreen}
          aria-label="Fit to screen"
        >
          <Maximize className="h-4 w-4" />
        </Button>

        <Separator />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Cost tracker badge */}
        <div className="flex items-center gap-1.5 rounded-full border border-surface-lighter bg-surface-light px-3 py-1">
          <DollarSign className="h-3 w-3 text-emerald-400" />
          <span className="text-xs tabular-nums text-emerald-400">
            ${sessionCost.toFixed(2)}
          </span>
        </div>

        <Separator />

        {/* Export button */}
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Download className="h-3.5 w-3.5" />}
          onClick={() => setShowExportModal(true)}
        >
          Exportar
        </Button>
      </div>

      {/* Export Modal */}
      <Modal
        open={showExportModal}
        onOpenChange={setShowExportModal}
        title="Exportar Imagen"
        description="Elige el formato y la calidad para tu descarga."
        size="sm"
      >
        <div className="space-y-4">
          {/* Format */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Formato
            </label>
            <div className="flex gap-2">
              {(["png", "jpg", "webp"] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setExportFormat(fmt)}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-2 text-sm font-medium uppercase transition-all",
                    exportFormat === fmt
                      ? "border-accent bg-accent/10 text-accent-light"
                      : "border-surface-lighter bg-surface-light text-gray-400 hover:border-surface-hover",
                  )}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Quality (not for PNG) */}
          {exportFormat !== "png" && (
            <Slider
              label="Calidad"
              value={[exportQuality]}
              onValueChange={([v]) => setExportQuality(v)}
              min={10}
              max={100}
              step={5}
              formatValue={(v) => `${v}%`}
            />
          )}

          <ModalFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportModal(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Download className="h-3.5 w-3.5" />}
              onClick={handleExport}
              loading={isExporting}
              disabled={!processedImageUrl && !originalImageUrl}
            >
              {isExporting ? "Exportando..." : "Descargar"}
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </>
  );
}

export default Toolbar;
