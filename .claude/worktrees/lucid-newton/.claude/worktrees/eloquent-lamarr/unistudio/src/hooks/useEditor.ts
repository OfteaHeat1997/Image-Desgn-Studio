'use client';

// =============================================================================
// useEditor Hook - UniStudio
// Convenience hook wrapping the editor-store with higher-level canvas operations.
// =============================================================================

import { useCallback } from 'react';
import { useEditorStore } from '@/stores/editor-store';
import { DEFAULT_FILTERS } from '@/types/editor';
import type { ImageLayer, Tool, ExportFormat } from '@/types/editor';
import { fileToBase64, getImageDimensions } from '@/lib/utils/image';
import { nanoid } from 'nanoid';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface UseEditorReturn {
  /** All layers on the canvas. */
  layers: ImageLayer[];
  /** The currently selected layer, or null. */
  selectedLayer: ImageLayer | null;
  /** Add a new image layer from a File. */
  addImage: (file: File) => Promise<void>;
  /** Remove a layer by its ID. */
  removeLayer: (layerId: string) => void;
  /** Select a layer by ID (or null to deselect). */
  selectLayer: (layerId: string | null) => void;
  /** Export the current canvas as a data URL. */
  exportCanvas: (format?: ExportFormat, quality?: number) => Promise<string | null>;
  /** Undo the last action. */
  undo: () => void;
  /** Redo the last undone action. */
  redo: () => void;
  /** The currently active tool. */
  tool: Tool;
  /** Set the active tool. */
  setTool: (tool: Tool) => void;
  /** Current zoom level (1 = 100%). */
  zoom: number;
  /** Set the zoom level. */
  setZoom: (zoom: number) => void;
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

/**
 * High-level hook for canvas editor operations.
 *
 * Wraps the low-level editor-store with convenience methods for
 * adding images, exporting, and undo/redo.
 *
 * @example
 * ```tsx
 * const { layers, addImage, undo, redo, tool, setTool } = useEditor();
 *
 * async function handleDrop(file: File) {
 *   await addImage(file);
 * }
 * ```
 */
export function useEditor(): UseEditorReturn {
  const layers = useEditorStore((s) => s.layers);
  const selectedLayerId = useEditorStore((s) => s.selectedLayerId);
  const tool = useEditorStore((s) => s.tool);
  const zoom = useEditorStore((s) => s.zoom);
  const canvasWidth = useEditorStore((s) => s.canvasWidth);
  const canvasHeight = useEditorStore((s) => s.canvasHeight);

  const storeAddLayer = useEditorStore((s) => s.addLayer);
  const storeRemoveLayer = useEditorStore((s) => s.removeLayer);
  const storeSelectLayer = useEditorStore((s) => s.selectLayer);
  const storeSetTool = useEditorStore((s) => s.setTool);
  const storeSetZoom = useEditorStore((s) => s.setZoom);
  const storeUndo = useEditorStore((s) => s.undo);
  const storeRedo = useEditorStore((s) => s.redo);

  // Derive the selected layer object
  const selectedLayer = layers.find((l) => l.id === selectedLayerId) ?? null;

  /**
   * Add a new image layer from a File object.
   * Reads the file as base64 and determines its dimensions.
   */
  const addImage = useCallback(
    async (file: File) => {
      const [src, dimensions] = await Promise.all([
        fileToBase64(file),
        getImageDimensions(file),
      ]);

      // Scale the image to fit within the canvas if it is larger
      let { width, height } = dimensions;
      const scaleX = canvasWidth / width;
      const scaleY = canvasHeight / height;
      const scale = Math.min(scaleX, scaleY, 1); // never upscale
      width = Math.round(width * scale);
      height = Math.round(height * scale);

      // Center the image on the canvas
      const x = Math.round((canvasWidth - width) / 2);
      const y = Math.round((canvasHeight - height) / 2);

      const layer: ImageLayer = {
        id: nanoid(),
        name: file.name || 'Image',
        type: 'image',
        src,
        x,
        y,
        width,
        height,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        filters: { ...DEFAULT_FILTERS },
      };

      storeAddLayer(layer);
    },
    [canvasWidth, canvasHeight, storeAddLayer],
  );

  /**
   * Export the canvas by compositing all visible layers onto an offscreen canvas.
   * Returns a data URL in the requested format.
   */
  const exportCanvas = useCallback(
    async (
      format: ExportFormat = 'png',
      quality: number = 92,
    ): Promise<string | null> => {
      if (typeof document === 'undefined') return null;

      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Draw each visible layer in order
      for (const layer of layers) {
        if (!layer.visible) continue;

        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            ctx.save();
            ctx.globalAlpha = layer.opacity;

            // Apply transform (position + rotation)
            const cx = layer.x + layer.width / 2;
            const cy = layer.y + layer.height / 2;
            ctx.translate(cx, cy);
            ctx.rotate((layer.rotation * Math.PI) / 180);
            ctx.drawImage(img, -layer.width / 2, -layer.height / 2, layer.width, layer.height);

            ctx.restore();
            resolve();
          };
          img.onerror = () => resolve(); // skip broken images
          img.src = layer.src;
        });
      }

      const mimeType =
        format === 'jpg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';

      return canvas.toDataURL(mimeType, quality / 100);
    },
    [layers, canvasWidth, canvasHeight],
  );

  return {
    layers,
    selectedLayer,
    addImage,
    removeLayer: storeRemoveLayer,
    selectLayer: storeSelectLayer,
    exportCanvas,
    undo: storeUndo,
    redo: storeRedo,
    tool,
    setTool: storeSetTool,
    zoom,
    setZoom: storeSetZoom,
  };
}
