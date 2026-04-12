"use client";

import React, { useState, useCallback, useRef } from "react";
import {
  CheckSquare,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  FileImage,
} from "lucide-react";
import { ModuleHeader } from "@/components/ui/module-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { toast } from "@/hooks/use-toast";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface CompliancePanelProps {
  imageFile: File | null;
  onProcess: (result: string, beforeImage?: string, cost?: number) => void;
}

interface PlatformCheck {
  id: string;
  name: string;
  checked: boolean;
}

interface ComplianceIssue {
  rule: "min-width" | "min-height" | "max-size" | "format" | "aspect-ratio";
  message: string;
  severity: "error" | "warning" | "info";
  autoFixAvailable: boolean;
}

interface PlatformResult {
  platform: string;
  passed: boolean;
  issues: ComplianceIssue[];
}

interface PlatformRules {
  minWidth: number;
  minHeight: number;
  maxSizeMB: number;
  formats: string[];
  /** e.g. "1:1", "2:3" — checked if defined */
  aspectRatio?: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const PLATFORMS: PlatformCheck[] = [
  { id: "amazon",    name: "Amazon",    checked: true  },
  { id: "shopify",   name: "Shopify",   checked: false },
  { id: "instagram", name: "Instagram", checked: false },
  { id: "etsy",      name: "Etsy",      checked: false },
  { id: "ebay",      name: "eBay",      checked: false },
  { id: "tiktok",    name: "TikTok",    checked: false },
  { id: "pinterest", name: "Pinterest", checked: false },
  { id: "poshmark",  name: "Poshmark",  checked: false },
  { id: "depop",     name: "Depop",     checked: false },
];

const PLATFORM_RULES: Record<string, PlatformRules> = {
  Amazon:    { minWidth: 1000, minHeight: 1000, maxSizeMB: 10, formats: ["image/jpeg", "image/png", "image/gif", "image/tiff"], aspectRatio: "1:1" },
  Shopify:   { minWidth: 800,  minHeight: 800,  maxSizeMB: 20, formats: ["image/jpeg", "image/png", "image/gif", "image/webp"] },
  Instagram: { minWidth: 320,  minHeight: 320,  maxSizeMB: 8,  formats: ["image/jpeg", "image/png"] },
  Etsy:      { minWidth: 2000, minHeight: 2000, maxSizeMB: 10, formats: ["image/jpeg", "image/png", "image/gif"] },
  eBay:      { minWidth: 500,  minHeight: 500,  maxSizeMB: 12, formats: ["image/jpeg", "image/png"] },
  TikTok:    { minWidth: 720,  minHeight: 720,  maxSizeMB: 10, formats: ["image/jpeg", "image/png"], aspectRatio: "1:1" },
  Pinterest: { minWidth: 600,  minHeight: 900,  maxSizeMB: 20, formats: ["image/jpeg", "image/png"], aspectRatio: "2:3" },
  Poshmark:  { minWidth: 880,  minHeight: 880,  maxSizeMB: 15, formats: ["image/jpeg", "image/png"] },
  Depop:     { minWidth: 640,  minHeight: 640,  maxSizeMB: 10, formats: ["image/jpeg", "image/png"] },
};

/* ------------------------------------------------------------------ */
/*  OffscreenCanvas helpers                                             */
/* ------------------------------------------------------------------ */

/** Load an HTMLImageElement from a File. Object URL is revoked after load. */
function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo cargar la imagen"));
    };
    img.src = url;
  });
}

/**
 * Scale the image up proportionally so width >= minW AND height >= minH.
 * Pass 0 for a dimension you don't care about.
 */
async function scaleUpImage(file: File, minW: number, minH: number): Promise<string> {
  const img    = await loadImageFromFile(file);
  const scaleX = minW > 0 && img.width  < minW  ? minW  / img.width  : 1;
  const scaleY = minH > 0 && img.height < minH  ? minH  / img.height : 1;
  const scale  = Math.max(scaleX, scaleY);
  const outW   = Math.ceil(img.width  * scale);
  const outH   = Math.ceil(img.height * scale);

  const canvas = new OffscreenCanvas(outW, outH);
  const ctx    = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");
  ctx.drawImage(img, 0, 0, outW, outH);

  const mime    = file.type === "image/jpeg" ? "image/jpeg" : "image/png";
  const quality = mime === "image/jpeg" ? 0.92 : undefined;
  const blob    = await canvas.convertToBlob({ type: mime, quality });
  return URL.createObjectURL(blob);
}

/** Compress to JPEG @ 0.80 quality to reduce file size. */
async function compressImage(file: File): Promise<string> {
  const img    = await loadImageFromFile(file);
  const canvas = new OffscreenCanvas(img.width, img.height);
  const ctx    = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");
  ctx.drawImage(img, 0, 0);
  const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.80 });
  return URL.createObjectURL(blob);
}

/** Convert any format to JPEG (white background for transparent sources). */
async function convertToJpeg(file: File): Promise<string> {
  const img    = await loadImageFromFile(file);
  const canvas = new OffscreenCanvas(img.width, img.height);
  const ctx    = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, img.width, img.height);
  ctx.drawImage(img, 0, 0);
  const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.92 });
  return URL.createObjectURL(blob);
}

/**
 * Compute the strictest requirements across all failing platforms and
 * apply them in a single pass: scale → compress/convert.
 */
async function applyAllFixes(file: File, results: PlatformResult[]): Promise<string> {
  let needMinW     = 0;
  let needMinH     = 0;
  let needCompress = false;
  let needConvert  = false;

  for (const r of results) {
    for (const issue of r.issues) {
      if (!issue.autoFixAvailable) continue;
      if (issue.rule === "min-width") {
        const m = issue.message.match(/minimo requerido: (\d+)px/);
        if (m) needMinW = Math.max(needMinW, parseInt(m[1], 10));
      } else if (issue.rule === "min-height") {
        const m = issue.message.match(/minimo requerido: (\d+)px/);
        if (m) needMinH = Math.max(needMinH, parseInt(m[1], 10));
      } else if (issue.rule === "max-size") {
        needCompress = true;
      } else if (issue.rule === "format") {
        needConvert = true;
      }
    }
  }

  // Step 1 — scale if required.
  let currentFile = file;
  if (needMinW > 0 || needMinH > 0) {
    const img    = await loadImageFromFile(currentFile);
    const scaleX = needMinW > 0 && img.width  < needMinW  ? needMinW  / img.width  : 1;
    const scaleY = needMinH > 0 && img.height < needMinH  ? needMinH  / img.height : 1;
    const scale  = Math.max(scaleX, scaleY);
    const outW   = Math.ceil(img.width  * scale);
    const outH   = Math.ceil(img.height * scale);
    const canvas = new OffscreenCanvas(outW, outH);
    const ctx    = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context unavailable");
    ctx.drawImage(img, 0, 0, outW, outH);
    const mime = currentFile.type === "image/jpeg" ? "image/jpeg" : "image/png";
    const blob = await canvas.convertToBlob({ type: mime, quality: mime === "image/jpeg" ? 0.92 : undefined });
    currentFile = new File([blob], currentFile.name, { type: mime });
  }

  // Step 2 — compress or convert format.
  if (needConvert || needCompress) {
    const img    = await loadImageFromFile(currentFile);
    const canvas = new OffscreenCanvas(img.width, img.height);
    const ctx    = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context unavailable");
    if (needConvert) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, img.width, img.height);
    }
    ctx.drawImage(img, 0, 0);
    const quality = needCompress ? 0.80 : 0.92;
    const blob    = await canvas.convertToBlob({ type: "image/jpeg", quality });
    return URL.createObjectURL(blob);
  }

  // Only scale was applied — produce final blob URL.
  const img    = await loadImageFromFile(currentFile);
  const canvas = new OffscreenCanvas(img.width, img.height);
  const ctx    = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");
  ctx.drawImage(img, 0, 0);
  const mime = currentFile.type === "image/jpeg" ? "image/jpeg" : "image/png";
  const blob = await canvas.convertToBlob({ type: mime, quality: mime === "image/jpeg" ? 0.92 : undefined });
  return URL.createObjectURL(blob);
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function CompliancePanel({ imageFile, onProcess }: CompliancePanelProps) {
  const [platforms,   setPlatforms]   = useState<PlatformCheck[]>(PLATFORMS);
  const [isChecking,  setIsChecking]  = useState(false);
  const [isFixingAll, setIsFixingAll] = useState(false);
  const [results,     setResults]     = useState<PlatformResult[] | null>(null);
  const [fixingKey,   setFixingKey]   = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);

  // Populated after the first check — used for the image info card dimensions.
  const imgDimRef = useRef<{ width: number; height: number } | null>(null);

  const togglePlatform = useCallback((id: string) => {
    setPlatforms((prev) =>
      prev.map((p) => (p.id === id ? { ...p, checked: !p.checked } : p)),
    );
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Compliance check                                                 */
  /* ---------------------------------------------------------------- */

  const handleCheck = useCallback(async () => {
    if (!imageFile) return;
    setIsChecking(true);
    setInlineError(null);
    setResults(null);

    try {
      const img = await loadImageFromFile(imageFile);
      imgDimRef.current = { width: img.width, height: img.height };

      const imgWidth  = img.width;
      const imgHeight = img.height;
      const fileSize  = imageFile.size;
      const fileType  = imageFile.type;

      const checkedPlatforms = platforms.filter((p) => p.checked);
      const checkResults: PlatformResult[] = checkedPlatforms.map((platform) => {
        const rules: PlatformRules =
          PLATFORM_RULES[platform.name] ?? {
            minWidth: 500, minHeight: 500, maxSizeMB: 10,
            formats: ["image/jpeg", "image/png"],
          };

        const issues: ComplianceIssue[] = [];

        // -- Min resolution -------------------------------------------------
        if (imgWidth < rules.minWidth) {
          issues.push({
            rule: "min-width",
            message: `Ancho ${imgWidth}px, minimo requerido: ${rules.minWidth}px`,
            severity: "error",
            autoFixAvailable: true,
          });
        }
        if (imgHeight < rules.minHeight) {
          issues.push({
            rule: "min-height",
            message: `Alto ${imgHeight}px, minimo requerido: ${rules.minHeight}px`,
            severity: "error",
            autoFixAvailable: true,
          });
        }

        // -- File size ------------------------------------------------------
        if (fileSize > rules.maxSizeMB * 1024 * 1024) {
          issues.push({
            rule: "max-size",
            message: `Tamano ${(fileSize / 1024 / 1024).toFixed(1)} MB, maximo permitido: ${rules.maxSizeMB} MB`,
            severity: "error",
            autoFixAvailable: true,
          });
        }

        // -- Format ---------------------------------------------------------
        if (!rules.formats.includes(fileType)) {
          issues.push({
            rule: "format",
            message: `Formato ${fileType.split("/")[1]?.toUpperCase() ?? "desconocido"} no soportado. Usar: ${rules.formats.map((f) => f.split("/")[1]?.toUpperCase()).join(", ")}`,
            severity: "error",
            autoFixAvailable: true,
          });
        }

        // -- Aspect ratio ---------------------------------------------------
        if (rules.aspectRatio) {
          const [rW, rH] = rules.aspectRatio.split(":").map(Number);
          if (rW && rH) {
            const tolerance    = 0.05; // 5 %
            const expectedRatio = rW / rH;
            const actualRatio   = imgWidth / imgHeight;
            if (Math.abs(actualRatio - expectedRatio) > tolerance) {
              issues.push({
                rule: "aspect-ratio",
                message: `Proporcion actual ${imgWidth}:${imgHeight} no coincide con ${rules.aspectRatio} requerido`,
                severity: "warning",
                autoFixAvailable: false, // cropping destroys content — warn only
              });
            }
          }
        }

        return {
          platform: platform.name,
          passed: issues.length === 0,
          issues,
        };
      });

      setResults(checkResults);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Error al verificar compliance";
      setInlineError(msg);
      console.error("Compliance check error:", error);
    } finally {
      setIsChecking(false);
    }
  }, [imageFile, platforms]);

  /* ---------------------------------------------------------------- */
  /*  Fix a single issue                                               */
  /* ---------------------------------------------------------------- */

  const handleAutoFix = useCallback(
    async (platformName: string, issue: ComplianceIssue) => {
      if (!imageFile) return;
      const key = `${platformName}-${issue.rule}`;
      setFixingKey(key);
      setInlineError(null);

      try {
        const rules = PLATFORM_RULES[platformName] ?? { minWidth: 500, minHeight: 500, maxSizeMB: 10, formats: ["image/jpeg", "image/png"] };
        let resultUrl: string;

        switch (issue.rule) {
          case "min-width":
            resultUrl = await scaleUpImage(imageFile, rules.minWidth, 0);
            break;
          case "min-height":
            resultUrl = await scaleUpImage(imageFile, 0, rules.minHeight);
            break;
          case "max-size":
            resultUrl = await compressImage(imageFile);
            break;
          case "format":
            resultUrl = await convertToJpeg(imageFile);
            break;
          default:
            return;
        }

        // Create beforeUrl only after we know we have a resultUrl (avoids leak on early return)
        const beforeUrl = URL.createObjectURL(imageFile);
        onProcess(resultUrl, beforeUrl, 0);

        // Optimistically remove the resolved issue.
        setResults((prev) =>
          prev
            ? prev.map((r) =>
                r.platform === platformName
                  ? {
                      ...r,
                      issues: r.issues.filter((i) => i.rule !== issue.rule),
                      passed: r.issues.filter((i) => i.rule !== issue.rule).length === 0,
                    }
                  : r,
              )
            : null,
        );

        toast.success(`Corregido: ${issue.rule.replace("-", " ")}`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Error al corregir";
        setInlineError(msg);
        console.error("Auto-fix error:", error);
      } finally {
        setFixingKey(null);
      }
    },
    [imageFile, onProcess],
  );

  /* ---------------------------------------------------------------- */
  /*  Fix all fixable issues in one pass                               */
  /* ---------------------------------------------------------------- */

  const handleAutoFixAll = useCallback(async () => {
    if (!imageFile || !results) return;
    setIsFixingAll(true);
    setInlineError(null);

    try {
      const beforeUrl = URL.createObjectURL(imageFile);
      const resultUrl = await applyAllFixes(imageFile, results);
      onProcess(resultUrl, beforeUrl, 0);

      // Remove all auto-fixable issues from UI.
      setResults((prev) =>
        prev
          ? prev.map((r) => ({
              ...r,
              issues: r.issues.filter((i) => !i.autoFixAvailable),
              passed: r.issues.filter((i) => !i.autoFixAvailable).length === 0,
            }))
          : null,
      );

      toast.success("Todas las correcciones aplicadas");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Error al corregir todo";
      setInlineError(msg);
      console.error("Fix-all error:", error);
    } finally {
      setIsFixingAll(false);
    }
  }, [imageFile, results, onProcess]);

  /* ---------------------------------------------------------------- */
  /*  Derived state                                                     */
  /* ---------------------------------------------------------------- */

  const imageInfo = imageFile
    ? {
        name: imageFile.name,
        size: `${(imageFile.size / 1024).toFixed(0)} KB`,
        type: imageFile.type.split("/")[1]?.toUpperCase() ?? "Desconocido",
        dims: imgDimRef.current
          ? `${imgDimRef.current.width} x ${imgDimRef.current.height}`
          : null,
      }
    : null;

  const selectedCount    = platforms.filter((p) => p.checked).length;
  const hasFixableIssues = results?.some((r) => r.issues.some((i) => i.autoFixAvailable));
  const isBusy           = isFixingAll || fixingKey !== null;

  /* ---------------------------------------------------------------- */
  /*  Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-5">
      <ModuleHeader
        icon={<CheckSquare className="h-4 w-4" />}
        title="Verificar Marketplace"
        description="Antes de subir tu foto a Amazon, Shopify, eBay u otra plataforma, verificala aqui. El sistema detecta si el tamanio, formato o resolucion no cumple las reglas del marketplace y te ofrece correccion automatica con un clic."
        whyNeeded="Cada marketplace tiene reglas diferentes — Amazon exige minimo 1000px y fondo blanco, eBay pide minimo 500px, Shopify recomienda 2048px. Si tu foto no cumple, el marketplace la rechaza y tu producto no se publica. Este modulo lo verifica todo ANTES de que pierdas tiempo."
        costLabel="Gratis"
        steps={[
          "Sube la imagen que quieres verificar al area central",
          "Selecciona las plataformas donde vas a publicar (puedes elegir varias)",
          "Haz clic en \"Verificar\" para ver el diagnostico completo",
          "Si hay problemas, haz clic en \"Corregir Todo\" para arreglarlos automaticamente",
        ]}
        tips={[
          "Verifica SIEMPRE antes de publicar — un rechazo puede retrasar tu listado dias.",
          "\"Corregir Todo\" ajusta tamanio, formato y compresion automaticamente sin perder calidad.",
          "Amazon es el mas estricto: requiere fondo blanco puro, minimo 1000x1000px, sin texto ni logos.",
          "Este modulo es 100% gratis — no usa IA ni envia datos a ningun servidor.",
        ]}
      />

      {/* Quick instruction */}
      <p className="text-xs text-gray-500">
        Verifica que tu imagen cumple con los requisitos de cada plataforma antes de publicar. 100% gratis.
      </p>

      {/* Platform selector */}
      <div>
        <label className="mb-2 block text-xs font-medium text-gray-400">
          Plataformas ({selectedCount} seleccionadas)
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {platforms.map((platform) => (
            <button
              key={platform.id}
              type="button"
              onClick={() => togglePlatform(platform.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-2 py-2 text-left transition-all",
                platform.checked
                  ? "border-accent bg-accent/10"
                  : "border-surface-lighter bg-surface-light hover:border-surface-hover",
              )}
            >
              <div
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                  platform.checked
                    ? "border-accent bg-accent"
                    : "border-surface-lighter",
                )}
              >
                {platform.checked && (
                  <CheckSquare className="h-3 w-3 text-white" />
                )}
              </div>
              <span className="text-[10px] font-medium text-gray-300">
                {platform.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Image info card */}
      {imageInfo && (
        <div className="rounded-lg border border-surface-lighter bg-surface p-3">
          <div className="flex items-center gap-2 mb-2">
            <FileImage className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-xs font-medium text-gray-300">Info de Imagen</span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-[10px]">
            <div>
              <span className="text-gray-500">Formato</span>
              <p className="font-medium text-gray-300">{imageInfo.type}</p>
            </div>
            <div>
              <span className="text-gray-500">Peso</span>
              <p className="font-medium text-gray-300">{imageInfo.size}</p>
            </div>
            <div>
              <span className="text-gray-500">Dimensiones</span>
              <p className="font-medium text-gray-300">
                {imageInfo.dims ?? "— verificar"}
              </p>
            </div>
            <div className="overflow-hidden">
              <span className="text-gray-500">Nombre</span>
              <p className="truncate font-medium text-gray-300">{imageInfo.name}</p>
            </div>
          </div>
        </div>
      )}

      {/* Inline error banner — replaces alert() */}
      {inlineError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-800 bg-red-950/40 p-3">
          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
          <p className="text-[11px] text-red-300">{inlineError}</p>
        </div>
      )}

      {/* Check button */}
      <Button
        variant="primary"
        className="w-full"
        onClick={handleCheck}
        disabled={!imageFile || isChecking || selectedCount === 0}
        loading={isChecking}
        leftIcon={<CheckSquare className="h-4 w-4" />}
      >
        {isChecking ? "Verificando..." : "Verificar Cumplimiento"}
      </Button>

      {/* Results */}
      {results && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-400">Resultados</label>
            {hasFixableIssues && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Zap className="h-3 w-3" />}
                onClick={handleAutoFixAll}
                loading={isFixingAll}
                disabled={isBusy}
              >
                {isFixingAll ? "Corrigiendo..." : "Corregir Todo"}
              </Button>
            )}
          </div>

          {results.map((result) => (
            <div
              key={result.platform}
              className="rounded-lg border border-surface-lighter bg-surface-light p-3"
            >
              {/* Platform header */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-200">
                  {result.platform}
                </span>
                {result.passed ? (
                  <Badge variant="success" size="sm">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Aprobado
                  </Badge>
                ) : (
                  <Badge variant="error" size="sm">
                    <XCircle className="mr-1 h-3 w-3" />
                    No Cumple
                  </Badge>
                )}
              </div>

              {/* Issues list */}
              {result.issues.length > 0 && (
                <div className="space-y-1.5">
                  {result.issues.map((issue, idx) => {
                    const btnKey   = `${result.platform}-${issue.rule}`;
                    const btnBusy  = fixingKey === btnKey || isFixingAll;

                    return (
                      <div
                        key={idx}
                        className="flex items-start gap-2 rounded-md bg-surface p-2"
                      >
                        {issue.severity === "error" ? (
                          <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-red-400" />
                        ) : (
                          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-yellow-400" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-gray-300">{issue.message}</p>
                        </div>
                        {issue.autoFixAvailable && (
                          <button
                            type="button"
                            disabled={btnBusy}
                            onClick={() => handleAutoFix(result.platform, issue)}
                            className={cn(
                              "shrink-0 rounded-md bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent-light transition-colors",
                              btnBusy
                                ? "cursor-not-allowed opacity-50"
                                : "hover:bg-accent/20",
                            )}
                          >
                            {btnBusy ? "..." : "Corregir"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {result.passed && (
                <p className="text-[10px] text-emerald-400">
                  Todas las verificaciones aprobadas.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CompliancePanel;
