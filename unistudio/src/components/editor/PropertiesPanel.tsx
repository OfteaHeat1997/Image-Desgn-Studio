"use client";

import React, { useState, useCallback } from "react";
import {
  Link2,
  Link2Off,
  FlipHorizontal,
  FlipVertical2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useEditorStore } from "@/stores/editor-store";
import { cn } from "@/lib/utils/cn";
import { toast } from "@/hooks/use-toast";

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function PropertiesPanel() {
  const { layers, selectedLayerId, updateLayer } = useEditorStore();
  const selectedLayer = layers.find((l) => l.id === selectedLayerId);

  const [lockAspect, setLockAspect] = useState(true);
  const [exportFormat, setExportFormat] = useState<"png" | "jpg" | "webp">("png");
  const [exportQuality, setExportQuality] = useState(90);

  /* ---- Position / Size helpers ---- */

  const handlePositionChange = useCallback(
    (axis: "x" | "y", value: string) => {
      if (!selectedLayer) return;
      const num = parseFloat(value) || 0;
      updateLayer(selectedLayer.id, { [axis]: num });
    },
    [selectedLayer, updateLayer],
  );

  const handleSizeChange = useCallback(
    (dimension: "width" | "height", value: string) => {
      if (!selectedLayer) return;
      const num = parseFloat(value) || 0;
      if (lockAspect && selectedLayer.width > 0 && selectedLayer.height > 0) {
        const aspect = selectedLayer.width / selectedLayer.height;
        if (dimension === "width") {
          updateLayer(selectedLayer.id, {
            width: num,
            height: Math.round(num / aspect),
          });
        } else {
          updateLayer(selectedLayer.id, {
            height: num,
            width: Math.round(num * aspect),
          });
        }
      } else {
        updateLayer(selectedLayer.id, { [dimension]: num });
      }
    },
    [selectedLayer, lockAspect, updateLayer],
  );

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (!selectedLayer?.src) {
      toast.warning("No hay imagen para descargar.");
      return;
    }
    setIsExporting(true);
    try {
      const response = await fetch(selectedLayer.src);
      const blob = await response.blob();
      const mimeType = exportFormat === "jpg" ? "image/jpeg" : `image/${exportFormat}`;

      let downloadBlob = blob;
      if (exportFormat !== "png" || blob.type !== mimeType) {
        const img = new Image();
        const tempUrl = URL.createObjectURL(blob);
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Error al cargar imagen"));
          img.src = tempUrl;
        });
        URL.revokeObjectURL(tempUrl);

        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d")!;
        if (exportFormat === "jpg") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0);
        downloadBlob = await new Promise<Blob>((resolve) =>
          canvas.toBlob((b) => resolve(b!), mimeType, exportQuality / 100)
        );
      }

      const downloadUrl = URL.createObjectURL(downloadBlob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${selectedLayer.name || "imagen"}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
      toast.success("Imagen descargada");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Error al descargar la imagen");
    } finally {
      setIsExporting(false);
    }
  }, [selectedLayer, exportFormat, exportQuality]);

  const handleFlipH = useCallback(() => {
    if (!selectedLayer) return;
    updateLayer(selectedLayer.id, { flipX: !selectedLayer.flipX });
  }, [selectedLayer, updateLayer]);

  const handleFlipV = useCallback(() => {
    if (!selectedLayer) return;
    updateLayer(selectedLayer.id, { flipY: !selectedLayer.flipY });
  }, [selectedLayer, updateLayer]);

  if (!selectedLayer) {
    return (
      <div className="p-4 text-center">
        <p className="text-[10px] text-gray-500">
          Selecciona una capa para ver sus propiedades.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-3">
      {/* Position */}
      <div>
        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-gray-500">
          Posicion
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-0.5 block text-[10px] text-gray-500">X</label>
            <input
              type="number"
              value={Math.round(selectedLayer.x)}
              onChange={(e) => handlePositionChange("x", e.target.value)}
              className="h-8 w-full rounded-md border border-surface-lighter bg-surface-light px-2 text-xs text-gray-200 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 transition-colors"
            />
          </div>
          <div>
            <label className="mb-0.5 block text-[10px] text-gray-500">Y</label>
            <input
              type="number"
              value={Math.round(selectedLayer.y)}
              onChange={(e) => handlePositionChange("y", e.target.value)}
              className="h-8 w-full rounded-md border border-surface-lighter bg-surface-light px-2 text-xs text-gray-200 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Size */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Tamanio
          </label>
          <button
            type="button"
            onClick={() => setLockAspect(!lockAspect)}
            className={cn(
              "rounded-md p-1 transition-colors",
              lockAspect
                ? "text-accent-light bg-accent/10"
                : "text-gray-500 hover:text-gray-400",
            )}
            aria-label={lockAspect ? "Unlock aspect ratio" : "Lock aspect ratio"}
          >
            {lockAspect ? (
              <Link2 className="h-3 w-3" />
            ) : (
              <Link2Off className="h-3 w-3" />
            )}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-0.5 block text-[10px] text-gray-500">W</label>
            <input
              type="number"
              value={Math.round(selectedLayer.width)}
              onChange={(e) => handleSizeChange("width", e.target.value)}
              className="h-8 w-full rounded-md border border-surface-lighter bg-surface-light px-2 text-xs text-gray-200 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 transition-colors"
            />
          </div>
          <div>
            <label className="mb-0.5 block text-[10px] text-gray-500">H</label>
            <input
              type="number"
              value={Math.round(selectedLayer.height)}
              onChange={(e) => handleSizeChange("height", e.target.value)}
              className="h-8 w-full rounded-md border border-surface-lighter bg-surface-light px-2 text-xs text-gray-200 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Rotation */}
      <Slider
        label="Rotacion"
        value={[selectedLayer.rotation]}
        onValueChange={([v]) => updateLayer(selectedLayer.id, { rotation: v })}
        min={0}
        max={360}
        step={1}
        formatValue={(v) => `${v}\u00B0`}
      />

      {/* Opacity */}
      <Slider
        label="Opacidad"
        value={[Math.round(selectedLayer.opacity * 100)]}
        onValueChange={([v]) => updateLayer(selectedLayer.id, { opacity: v / 100 })}
        min={0}
        max={100}
        step={1}
        formatValue={(v) => `${v}%`}
      />

      {/* Flip buttons */}
      <div>
        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-gray-500">
          Transformar
        </label>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={handleFlipH}>
            <FlipHorizontal className="mr-1 h-3.5 w-3.5" />
            Voltear H
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={handleFlipV}>
            <FlipVertical2 className="mr-1 h-3.5 w-3.5" />
            Voltear V
          </Button>
        </div>
      </div>

      {/* Export section */}
      <div className="border-t border-surface-lighter pt-3">
        <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-gray-500">
          Exportar
        </label>

        {/* Format radios */}
        <div className="mb-2 flex gap-1">
          {(["png", "jpg", "webp"] as const).map((fmt) => (
            <button
              key={fmt}
              type="button"
              onClick={() => setExportFormat(fmt)}
              className={cn(
                "flex-1 rounded-md py-1.5 text-[10px] font-medium uppercase transition-all",
                exportFormat === fmt
                  ? "bg-accent/15 text-accent-light ring-1 ring-accent/50"
                  : "bg-surface-light text-gray-500 hover:text-gray-400",
              )}
            >
              {fmt}
            </button>
          ))}
        </div>

        {/* Quality slider */}
        {exportFormat !== "png" && (
          <Slider
            label="Calidad"
            value={[exportQuality]}
            onValueChange={([v]) => setExportQuality(v)}
            min={10}
            max={100}
            step={5}
            formatValue={(v) => `${v}%`}
            className="mb-2"
          />
        )}

        {/* Download button */}
        <Button
          variant="primary"
          size="sm"
          className="w-full"
          leftIcon={<Download className="h-3.5 w-3.5" />}
          onClick={handleExport}
          loading={isExporting}
          disabled={!selectedLayer?.src}
        >
          {isExporting ? "Descargando..." : `Descargar ${exportFormat.toUpperCase()}`}
        </Button>
      </div>
    </div>
  );
}

export default PropertiesPanel;
