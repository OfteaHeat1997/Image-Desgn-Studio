"use client";

import React, { useState, useCallback, useRef } from "react";
import {
  PenTool,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Type,
  Crop,
  Download,
  Palette,
} from "lucide-react";
import { ModuleHeader } from "@/components/ui/module-header";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface SmartEditorPanelProps {
  imageFile: File | null;
  onProcess: (result: string, beforeImage?: string, cost?: number) => void;
}

type EditorTool = "adjust" | "transform" | "text" | "crop";

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const TOOL_TABS: { id: EditorTool; label: string; icon: React.ReactNode }[] = [
  { id: "adjust", label: "Ajustar", icon: <Palette className="h-3 w-3" /> },
  { id: "transform", label: "Transformar", icon: <RotateCw className="h-3 w-3" /> },
  { id: "text", label: "Texto", icon: <Type className="h-3 w-3" /> },
  { id: "crop", label: "Recortar", icon: <Crop className="h-3 w-3" /> },
];

const FONT_OPTIONS = [
  { value: "sans-serif", label: "Sans Serif" },
  { value: "serif", label: "Serif" },
  { value: "monospace", label: "Monospace" },
  { value: "cursive", label: "Cursiva" },
];

const CROP_PRESETS = [
  { value: "free", label: "Libre" },
  { value: "1:1", label: "1:1 Cuadrado" },
  { value: "4:3", label: "4:3" },
  { value: "3:4", label: "3:4" },
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16 Stories" },
];

const EXPORT_FORMATS = [
  { value: "png", label: "PNG (sin perdida)" },
  { value: "jpeg", label: "JPEG (ligero)" },
  { value: "webp", label: "WebP (moderno)" },
];

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function SmartEditorPanel({ imageFile, onProcess }: SmartEditorPanelProps) {
  const [activeTool, setActiveTool] = useState<EditorTool>("adjust");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Adjust state
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [blur, setBlur] = useState(0);
  const [sharpness, setSharpness] = useState(0);
  const [hue, setHue] = useState(0);

  // Transform state
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  // Text state
  const [textContent, setTextContent] = useState("");
  const [textFont, setTextFont] = useState("sans-serif");
  const [textSize, setTextSize] = useState(48);
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [textBold, setTextBold] = useState(false);
  const [textPosX, setTextPosX] = useState(50);
  const [textPosY, setTextPosY] = useState(50);
  const [textShadow, setTextShadow] = useState(true);

  // Crop state
  const [cropPreset, setCropPreset] = useState("free");
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [cropW, setCropW] = useState(100);
  const [cropH, setCropH] = useState(100);

  // Export state
  const [exportFormat, setExportFormat] = useState("png");
  const [exportQuality, setExportQuality] = useState(92);

  // Reference for the source image
  const imgRef = useRef<HTMLImageElement | null>(null);

  /* ---- Load source image ---- */
  const loadImage = useCallback((): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      if (!imageFile) return reject(new Error("No hay imagen cargada"));
      const img = new Image();
      const blobUrl = URL.createObjectURL(imageFile);
      img.onload = () => {
        URL.revokeObjectURL(blobUrl);
        imgRef.current = img;
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        reject(new Error("Error al cargar imagen"));
      };
      img.src = blobUrl;
    });
  }, [imageFile]);

  /* ---- Apply all edits and produce output ---- */
  const handleApply = useCallback(async () => {
    if (!imageFile) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const img = await loadImage();
      const srcW = img.naturalWidth;
      const srcH = img.naturalHeight;

      // 1. Determine crop region
      const cx = Math.round((cropX / 100) * srcW);
      const cy = Math.round((cropY / 100) * srcH);
      let cw = Math.round((cropW / 100) * srcW);
      let ch = Math.round((cropH / 100) * srcH);

      // Enforce aspect ratio if a crop preset is selected
      if (cropPreset !== "free") {
        const [rw, rh] = cropPreset.split(":").map(Number);
        const targetRatio = rw / rh;
        const currentRatio = cw / ch;
        if (currentRatio > targetRatio) {
          cw = Math.round(ch * targetRatio);
        } else {
          ch = Math.round(cw / targetRatio);
        }
      }

      // Clamp to bounds
      const finalCW = Math.min(cw, srcW - cx);
      const finalCH = Math.min(ch, srcH - cy);

      // 2. Create canvas
      const canvas = new OffscreenCanvas(finalCW, finalCH);
      const ctx = canvas.getContext("2d")!;

      // 3. Apply transforms
      ctx.save();
      ctx.translate(finalCW / 2, finalCH / 2);

      // Rotation
      if (rotation !== 0) {
        ctx.rotate((rotation * Math.PI) / 180);
      }

      // Flip
      const sx = flipH ? -1 : 1;
      const sy = flipV ? -1 : 1;
      ctx.scale(sx, sy);

      // Apply CSS-like filters
      const filters: string[] = [];
      if (brightness !== 0) filters.push(`brightness(${1 + brightness / 100})`);
      if (contrast !== 0) filters.push(`contrast(${1 + contrast / 100})`);
      if (saturation !== 0) filters.push(`saturate(${1 + saturation / 100})`);
      if (blur > 0) filters.push(`blur(${blur / 10}px)`);
      if (hue !== 0) filters.push(`hue-rotate(${hue}deg)`);
      if (filters.length > 0) ctx.filter = filters.join(" ");

      // Draw cropped image centered
      ctx.drawImage(
        img,
        cx, cy, finalCW, finalCH,
        -finalCW / 2, -finalCH / 2, finalCW, finalCH,
      );
      ctx.restore();

      // 4. Apply sharpness via unsharp mask (simplified)
      if (sharpness > 0) {
        const sharpAmount = sharpness / 100;
        const imageData = ctx.getImageData(0, 0, finalCW, finalCH);
        const data = imageData.data;
        const copy = new Uint8ClampedArray(data);
        // Simple sharpen: enhance = original + factor * (original - blurred neighbor avg)
        for (let y = 1; y < finalCH - 1; y++) {
          for (let x = 1; x < finalCW - 1; x++) {
            const idx = (y * finalCW + x) * 4;
            for (let c = 0; c < 3; c++) {
              const center = copy[idx + c];
              const neighbors =
                (copy[((y - 1) * finalCW + x) * 4 + c] +
                  copy[((y + 1) * finalCW + x) * 4 + c] +
                  copy[(y * finalCW + x - 1) * 4 + c] +
                  copy[(y * finalCW + x + 1) * 4 + c]) / 4;
              data[idx + c] = Math.max(0, Math.min(255,
                center + sharpAmount * 2 * (center - neighbors),
              ));
            }
          }
        }
        ctx.putImageData(imageData, 0, 0);
      }

      // 5. Draw text overlay
      if (textContent.trim()) {
        ctx.save();
        const fontSize = Math.round((textSize / 100) * Math.min(finalCW, finalCH));
        ctx.font = `${textBold ? "bold " : ""}${fontSize}px ${textFont}`;
        ctx.fillStyle = textColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const tx = (textPosX / 100) * finalCW;
        const ty = (textPosY / 100) * finalCH;

        if (textShadow) {
          ctx.shadowColor = "rgba(0,0,0,0.6)";
          ctx.shadowBlur = fontSize / 4;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
        }

        ctx.fillText(textContent, tx, ty);
        ctx.restore();
      }

      // 6. Export
      const mimeType = exportFormat === "jpeg" ? "image/jpeg" : exportFormat === "webp" ? "image/webp" : "image/png";
      const quality = exportFormat === "png" ? undefined : exportQuality / 100;
      const blob = await canvas.convertToBlob({ type: mimeType, quality });

      // Convert to data URL so the gallery can persist it across page refreshes
      // (blob URLs die when the tab is closed)
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      onProcess(dataUrl, undefined, 0);
    } catch (error) {
      console.error("SmartEditor error:", error);
      setErrorMsg(error instanceof Error ? error.message : "Error al editar imagen");
    } finally {
      setIsProcessing(false);
    }
  }, [
    imageFile, loadImage, brightness, contrast, saturation, blur, sharpness, hue,
    rotation, flipH, flipV, textContent, textFont, textSize, textColor, textBold,
    textPosX, textPosY, textShadow, cropPreset, cropX, cropY, cropW, cropH,
    exportFormat, exportQuality, onProcess,
  ]);

  return (
    <div className="space-y-5">
      <ModuleHeader
        icon={<PenTool className="h-4 w-4" />}
        title="Editor Avanzado"
        description="Haz ajustes finales a tu imagen sin abrir otro programa. Rota, voltea, recorta, ajusta brillo/contraste, agrega texto o marca de agua. Todo gratis y se procesa en tu computadora."
        whyNeeded="A veces la foto necesita un pequeno ajuste antes de publicar: rotar 90 grados, recortar un borde, agregar el nombre de tu marca, o ajustar el brillo un poco. Este editor te permite hacer esos retoques rapidos sin salir de UniStudio."
        costLabel="Gratis"
        steps={[
          "Sube tu imagen al area central del editor",
          "Elige la herramienta: Ajustar (brillo/contraste), Transformar (rotar/voltear), Texto, o Recortar",
          "Configura los parametros como quieras — ves el cambio en tiempo real",
          "Haz clic en \"Aplicar Edicion\" para guardar el resultado",
        ]}
        tips={[
          "Todo es gratis e ilimitado — puedes experimentar sin costo.",
          "Ideal para agregar tu marca o texto promocional sobre la foto del producto.",
          "Los presets de recorte (1:1, 4:5, 16:9) son perfectos para adaptar a redes sociales.",
          "Puedes encadenar ediciones: aplica una, acepta, y aplica otra.",
        ]}
      />

      {/* Tool tabs */}
      <div className="flex gap-1">
        {TOOL_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTool(tab.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-lg border px-2 py-2 text-[10px] font-medium transition-all",
              activeTool === tab.id
                ? "border-accent bg-accent/10 text-accent-light"
                : "border-surface-lighter bg-surface-light text-gray-500 hover:text-gray-300",
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ---- Adjust panel ---- */}
      {activeTool === "adjust" && (
        <div className="space-y-3">
          <label className="block text-xs font-medium text-gray-400">
            Ajustes de Imagen
          </label>
          <Slider label="Brillo" value={[brightness]} onValueChange={([v]) => setBrightness(v)} min={-100} max={100} step={1} />
          <Slider label="Contraste" value={[contrast]} onValueChange={([v]) => setContrast(v)} min={-100} max={100} step={1} />
          <Slider label="Saturacion" value={[saturation]} onValueChange={([v]) => setSaturation(v)} min={-100} max={100} step={1} />
          <Slider label="Nitidez" value={[sharpness]} onValueChange={([v]) => setSharpness(v)} min={0} max={100} step={1} />
          <Slider label="Desenfoque" value={[blur]} onValueChange={([v]) => setBlur(v)} min={0} max={50} step={1} />
          <Slider label="Tono (Hue)" value={[hue]} onValueChange={([v]) => setHue(v)} min={-180} max={180} step={1} formatValue={(v) => `${v}°`} />
        </div>
      )}

      {/* ---- Transform panel ---- */}
      {activeTool === "transform" && (
        <div className="space-y-4">
          <label className="block text-xs font-medium text-gray-400">
            Transformaciones
          </label>

          <Slider
            label="Rotacion"
            value={[rotation]}
            onValueChange={([v]) => setRotation(v)}
            min={-180}
            max={180}
            step={1}
            formatValue={(v) => `${v}°`}
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-surface-lighter bg-surface-light px-3 py-2 text-xs text-gray-300 hover:border-accent/40 transition-colors"
            >
              <RotateCw className="h-3.5 w-3.5" /> +90°
            </button>
            <button
              type="button"
              onClick={() => setRotation(0)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-surface-lighter bg-surface-light px-3 py-2 text-xs text-gray-300 hover:border-accent/40 transition-colors"
            >
              Resetear
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFlipH((f) => !f)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-all",
                flipH
                  ? "border-accent bg-accent/10 text-accent-light"
                  : "border-surface-lighter bg-surface-light text-gray-400 hover:border-surface-hover",
              )}
            >
              <FlipHorizontal className="h-3.5 w-3.5" /> Voltear H
            </button>
            <button
              type="button"
              onClick={() => setFlipV((f) => !f)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-all",
                flipV
                  ? "border-accent bg-accent/10 text-accent-light"
                  : "border-surface-lighter bg-surface-light text-gray-400 hover:border-surface-hover",
              )}
            >
              <FlipVertical className="h-3.5 w-3.5" /> Voltear V
            </button>
          </div>
        </div>
      )}

      {/* ---- Text panel ---- */}
      {activeTool === "text" && (
        <div className="space-y-3">
          <label className="block text-xs font-medium text-gray-400">
            Texto Superpuesto
          </label>

          <div>
            <label className="mb-1 block text-[10px] text-gray-500">Contenido</label>
            <input
              type="text"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Escribe tu texto aqui..."
              className="h-9 w-full rounded-lg border border-surface-lighter bg-surface-light px-3 text-xs text-gray-200 placeholder:text-gray-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors"
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Select label="Fuente" value={textFont} onValueChange={setTextFont} options={FONT_OPTIONS} />
            </div>
            <div className="w-20">
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Color</label>
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="h-10 w-full cursor-pointer rounded-lg border border-surface-lighter bg-surface-light"
              />
            </div>
          </div>

          <Slider label="Tamanio" value={[textSize]} onValueChange={([v]) => setTextSize(v)} min={5} max={100} step={1} formatValue={(v) => `${v}%`} />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTextBold((b) => !b)}
              className={cn(
                "flex-1 rounded-lg border px-3 py-2 text-xs font-bold transition-all",
                textBold
                  ? "border-accent bg-accent/10 text-accent-light"
                  : "border-surface-lighter bg-surface-light text-gray-400",
              )}
            >
              Negrita
            </button>
            <button
              type="button"
              onClick={() => setTextShadow((s) => !s)}
              className={cn(
                "flex-1 rounded-lg border px-3 py-2 text-xs transition-all",
                textShadow
                  ? "border-accent bg-accent/10 text-accent-light"
                  : "border-surface-lighter bg-surface-light text-gray-400",
              )}
            >
              Sombra
            </button>
          </div>

          <Slider label="Posicion X" value={[textPosX]} onValueChange={([v]) => setTextPosX(v)} min={0} max={100} step={1} formatValue={(v) => `${v}%`} />
          <Slider label="Posicion Y" value={[textPosY]} onValueChange={([v]) => setTextPosY(v)} min={0} max={100} step={1} formatValue={(v) => `${v}%`} />
        </div>
      )}

      {/* ---- Crop panel ---- */}
      {activeTool === "crop" && (
        <div className="space-y-3">
          <Select label="Proporcion" value={cropPreset} onValueChange={setCropPreset} options={CROP_PRESETS} />

          <Slider label="Inicio X" value={[cropX]} onValueChange={([v]) => setCropX(v)} min={0} max={80} step={1} formatValue={(v) => `${v}%`} />
          <Slider label="Inicio Y" value={[cropY]} onValueChange={([v]) => setCropY(v)} min={0} max={80} step={1} formatValue={(v) => `${v}%`} />
          <Slider label="Ancho" value={[cropW]} onValueChange={([v]) => setCropW(v)} min={20} max={100} step={1} formatValue={(v) => `${v}%`} />
          <Slider label="Alto" value={[cropH]} onValueChange={([v]) => setCropH(v)} min={20} max={100} step={1} formatValue={(v) => `${v}%`} />
        </div>
      )}

      {/* ---- Export settings ---- */}
      <div className="space-y-2 rounded-lg border border-surface-lighter bg-surface p-3">
        <label className="block text-xs font-medium text-gray-400">Exportar Como</label>
        <div className="flex gap-2">
          <div className="flex-1">
            <Select value={exportFormat} onValueChange={setExportFormat} options={EXPORT_FORMATS} />
          </div>
          {exportFormat !== "png" && (
            <div className="w-24">
              <Slider value={[exportQuality]} onValueChange={([v]) => setExportQuality(v)} min={50} max={100} step={1} formatValue={(v) => `${v}%`} />
            </div>
          )}
        </div>
      </div>

      {/* Cost display */}
      <div className="rounded-lg border border-surface-lighter bg-surface px-3 py-2 text-center">
        <span className="text-[10px] text-gray-500">
          Costo: <span className="text-emerald-400 font-semibold">Gratis</span> — procesamiento local
        </span>
      </div>

      {/* Error card */}
      {errorMsg && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <span className="text-red-400 text-xs shrink-0">Error:</span>
          <p className="text-xs text-red-300">{errorMsg}</p>
          <button type="button" onClick={() => setErrorMsg(null)} className="ml-auto text-red-400 hover:text-red-300 text-xs shrink-0">x</button>
        </div>
      )}

      {/* Apply button */}
      <Button
        variant="primary"
        className="w-full"
        onClick={handleApply}
        disabled={!imageFile || isProcessing}
        loading={isProcessing}
        leftIcon={<Download className="h-4 w-4" />}
      >
        {isProcessing ? "Procesando..." : "Aplicar Edicion"}
      </Button>
    </div>
  );
}

export default SmartEditorPanel;
