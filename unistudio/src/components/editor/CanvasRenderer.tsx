"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { useEditorStore } from "@/stores/editor-store";
import type { ImageLayer, LayerFilters } from "@/types/editor";
import { DEFAULT_FILTERS } from "@/types/editor";

/* ------------------------------------------------------------------ */
/*  Helpers                                                              */
/* ------------------------------------------------------------------ */

function buildFilterString(f: LayerFilters): string {
  const parts: string[] = [];
  if (f.brightness !== 0) parts.push(`brightness(${1 + f.brightness / 100})`);
  if (f.contrast !== 0) parts.push(`contrast(${1 + f.contrast / 100})`);
  if (f.saturation !== 0) parts.push(`saturate(${1 + f.saturation / 100})`);
  if (f.blur > 0) parts.push(`blur(${f.blur}px)`);
  if (f.hue !== 0) parts.push(`hue-rotate(${f.hue}deg)`);
  if (f.grayscale) parts.push("grayscale(1)");
  if (f.sepia) parts.push("sepia(1)");
  if (f.invert) parts.push("invert(1)");
  return parts.length > 0 ? parts.join(" ") : "none";
}

/* ------------------------------------------------------------------ */
/*  Image cache — avoid re-decoding the same src every frame            */
/* ------------------------------------------------------------------ */

const imageCache = new Map<string, HTMLImageElement>();

function getCachedImage(src: string): HTMLImageElement | null {
  if (!src) return null;
  const cached = imageCache.get(src);
  if (cached?.complete && cached.naturalWidth > 0) return cached;
  if (!cached) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    imageCache.set(src, img);
  }
  return null;
}

/** Evict cache entries whose src is no longer used by any layer */
function evictStaleCacheEntries(activeSrcs: Set<string>) {
  for (const key of imageCache.keys()) {
    if (!activeSrcs.has(key)) {
      imageCache.delete(key);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                            */
/* ------------------------------------------------------------------ */

interface CanvasRendererProps {
  zoom: number;
  className?: string;
  onLayerClick?: (layerId: string | null) => void;
}

export function CanvasRenderer({ zoom, className, onLayerClick }: CanvasRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const layers = useEditorStore((s) => s.layers);
  const canvasWidth = useEditorStore((s) => s.canvasWidth);
  const canvasHeight = useEditorStore((s) => s.canvasHeight);
  const selectedLayerId = useEditorStore((s) => s.selectedLayerId);

  /* ---- Render all layers onto the canvas ---- */
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set actual pixel size
    if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
    }

    // Clear
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Checkerboard background (transparency indicator)
    const size = 16;
    for (let y = 0; y < canvasHeight; y += size) {
      for (let x = 0; x < canvasWidth; x += size) {
        ctx.fillStyle = ((x / size + y / size) % 2 === 0) ? "#1a1a1a" : "#252525";
        ctx.fillRect(x, y, size, size);
      }
    }

    // Draw each visible layer
    for (const layer of layers) {
      if (!layer.visible) continue;

      const img = getCachedImage(layer.src);
      if (!img) continue; // still loading

      ctx.save();
      ctx.globalAlpha = layer.opacity;

      // Filters
      const filterStr = buildFilterString(layer.filters ?? DEFAULT_FILTERS);
      if (filterStr !== "none") ctx.filter = filterStr;

      // Transform: translate to center, rotate, flip, draw centered
      const cx = layer.x + layer.width / 2;
      const cy = layer.y + layer.height / 2;
      ctx.translate(cx, cy);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.scale(layer.flipX ? -1 : 1, layer.flipY ? -1 : 1);
      ctx.drawImage(img, -layer.width / 2, -layer.height / 2, layer.width, layer.height);

      ctx.restore();
    }

    // Draw selection outline for selected layer
    const selected = layers.find((l) => l.id === selectedLayerId);
    if (selected && selected.visible) {
      ctx.save();
      const cx = selected.x + selected.width / 2;
      const cy = selected.y + selected.height / 2;
      ctx.translate(cx, cy);
      ctx.rotate((selected.rotation * Math.PI) / 180);
      ctx.scale(selected.flipX ? -1 : 1, selected.flipY ? -1 : 1);

      ctx.strokeStyle = "#C5A47E";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(
        -selected.width / 2 - 1,
        -selected.height / 2 - 1,
        selected.width + 2,
        selected.height + 2,
      );
      ctx.restore();
    }
  }, [layers, canvasWidth, canvasHeight, selectedLayerId]);

  /* ---- Evict stale image cache entries when layers change ---- */
  useEffect(() => {
    const activeSrcs = new Set(layers.map((l) => l.src).filter(Boolean));
    evictStaleCacheEntries(activeSrcs);
  }, [layers]);

  /* ---- Animation loop to catch image loads ---- */
  useEffect(() => {
    let running = true;
    const loop = () => {
      if (!running) return;
      render();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [render]);

  /* ---- Hit-test on click to select layer ---- */
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!onLayerClick) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvasWidth / rect.width;
      const scaleY = canvasHeight / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      // Iterate in reverse (top layer first) to find which layer was clicked
      for (let i = layers.length - 1; i >= 0; i--) {
        const l = layers[i];
        if (!l.visible || !l.src) continue;
        if (mx >= l.x && mx <= l.x + l.width && my >= l.y && my <= l.y + l.height) {
          onLayerClick(l.id);
          return;
        }
      }
      onLayerClick(null);
    },
    [layers, canvasWidth, canvasHeight, onLayerClick],
  );

  const scale = zoom / 100;

  return (
    <div className={className} style={{ display: "inline-block" }}>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="rounded-lg border border-surface-lighter cursor-crosshair"
        style={{
          width: canvasWidth * scale,
          height: canvasHeight * scale,
          maxWidth: "100%",
          maxHeight: "70vh",
          objectFit: "contain",
        }}
      />
    </div>
  );
}

export default CanvasRenderer;
