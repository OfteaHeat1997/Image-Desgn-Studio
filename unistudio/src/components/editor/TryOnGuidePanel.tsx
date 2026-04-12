"use client";

import React, { useState } from "react";
import { CheckCircle2, Circle, Download, Image as ImageIcon, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import type { SessionResult } from "@/components/editor/ShadowsGuidePanel";
import { proxyFetch } from "@/lib/utils/image";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface TryOnGuidePanelProps {
  hasGarmentImage: boolean;
  hasModelImage: boolean;
  hasProcessedImage: boolean;
  processedImageUrl: string | null;
  sessionResults: SessionResult[];
}

/* ------------------------------------------------------------------ */
/*  Guide steps                                                         */
/* ------------------------------------------------------------------ */

const GUIDE_STEPS = [
  { id: "garment", text: "Sube una imagen de la prenda" },
  { id: "model", text: "Sube una foto del modelo" },
  { id: "config", text: "Elige categoria y tipo de prenda" },
  { id: "generate", text: 'Haz clic en "Generar Prueba Virtual"' },
  { id: "download", text: "Descarga el resultado" },
];

const PRO_TIPS = [
  "Usa fotos de cuerpo completo con buena iluminacion para mejores resultados.",
  "La prenda debe estar sobre fondo blanco o transparente (PNG).",
  "IDM-VTON es el unico proveedor que soporta lenceria y swimwear.",
];

/* ------------------------------------------------------------------ */
/*  Download formats                                                    */
/* ------------------------------------------------------------------ */

const FORMATS = [
  { id: "png", label: "PNG", desc: "Sin perdida, soporta transparencia" },
  { id: "jpg", label: "JPG", desc: "Mas ligero, sin transparencia" },
  { id: "webp", label: "WebP", desc: "Moderno, ligero con transparencia" },
] as const;

type FormatId = (typeof FORMATS)[number]["id"];

/* ------------------------------------------------------------------ */
/*  Provider labels (for history)                                       */
/* ------------------------------------------------------------------ */

const PROVIDER_LABELS: Record<string, string> = {
  auto: "Auto",
  fashn: "FASHN v1.6",
  "idm-vton": "IDM-VTON",
  kolors: "Kolors",
  tryon: "Try-On",
};

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function TryOnGuidePanel({
  hasGarmentImage,
  hasModelImage,
  hasProcessedImage,
  processedImageUrl,
  sessionResults,
}: TryOnGuidePanelProps) {
  const [downloadFormat, setDownloadFormat] = useState<FormatId>("png");

  // Determine which steps are complete
  const completedSteps = new Set<string>();
  if (hasGarmentImage) completedSteps.add("garment");
  if (hasModelImage) completedSteps.add("model");
  if (hasGarmentImage || hasModelImage) completedSteps.add("config"); // always has defaults
  if (hasProcessedImage) completedSteps.add("generate");

  const handleDownload = async () => {
    if (!processedImageUrl) return;

    try {
      const res = await proxyFetch(processedImageUrl);
      const blob = await res.blob();

      let finalBlob = blob;
      if (downloadFormat !== "png") {
        const img = new Image();
        img.crossOrigin = "anonymous";
        const loaded = new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Image load failed"));
        });
        img.src = URL.createObjectURL(blob);
        await loaded;

        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context failed");

        if (downloadFormat === "jpg") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0);

        const mimeType = downloadFormat === "jpg" ? "image/jpeg" : "image/webp";
        finalBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
            mimeType,
            0.92,
          );
        });
      }

      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resultado-tryon.${downloadFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Error al descargar la imagen.");
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Section 1: Guia Rapida */}
      <div className="border-b border-surface-lighter p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
          Guia Rapida
        </h3>

        <ol className="space-y-1.5">
          {GUIDE_STEPS.map((step) => {
            const done = completedSteps.has(step.id);
            return (
              <li key={step.id} className="flex items-start gap-2">
                {done ? (
                  <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-400" />
                ) : (
                  <Circle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-gray-600" />
                )}
                <span
                  className={`text-[11px] leading-tight ${
                    done ? "text-gray-300" : "text-gray-500"
                  }`}
                >
                  {step.text}
                </span>
              </li>
            );
          })}
        </ol>

        {/* Pro tips */}
        <div className="mt-3 space-y-1.5">
          {PRO_TIPS.map((tip, i) => (
            <div
              key={i}
              className="flex items-start gap-1.5 rounded-md bg-accent/5 px-2 py-1.5"
            >
              <Info className="h-3 w-3 mt-0.5 shrink-0 text-accent-light/60" />
              <span className="text-[10px] text-accent-light/70 leading-tight">{tip}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Historial de Sesion */}
      <div className="border-b border-surface-lighter p-3 flex-1 overflow-y-auto">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
          Historial de Sesion
        </h3>

        {sessionResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <ImageIcon className="h-8 w-8 text-gray-700 mb-2" />
            <p className="text-[11px] text-gray-600">
              Los resultados que proceses apareceran aqui.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {sessionResults.map((result, i) => (
              <div key={result.timestamp + i} className="group relative">
                <div className="aspect-square overflow-hidden rounded-lg border border-surface-lighter bg-surface-light">
                  <img
                    src={result.url}
                    alt={result.label}
                    className="h-full w-full object-cover"
                  />
                </div>
                <span className="mt-1 block text-center text-[10px] text-gray-500 truncate">
                  {PROVIDER_LABELS[result.label] ?? result.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 3: Descargar */}
      <div className="p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
          Descargar
        </h3>

        {!hasProcessedImage ? (
          <p className="text-[11px] text-gray-600 text-center py-2">
            Genera una prueba virtual primero para poder descargar.
          </p>
        ) : (
          <div className="space-y-2.5">
            {/* Format selector */}
            <div className="grid grid-cols-3 gap-1.5">
              {FORMATS.map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setDownloadFormat(fmt.id)}
                  className={`rounded-md px-1.5 py-2 text-center transition-all ${
                    downloadFormat === fmt.id
                      ? "bg-accent/15 text-accent-light ring-1 ring-accent"
                      : "bg-surface-light text-gray-400 hover:bg-surface-lighter"
                  }`}
                >
                  <span className="block text-[10px] font-semibold">{fmt.label}</span>
                  <span className="block text-[10px] text-gray-500 mt-0.5 leading-tight">
                    {fmt.desc}
                  </span>
                </button>
              ))}
            </div>

            <Button
              variant="primary"
              className="w-full"
              size="sm"
              leftIcon={<Download className="h-3.5 w-3.5" />}
              onClick={handleDownload}
            >
              Descargar Imagen
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default TryOnGuidePanel;
