"use client";

import React, { useCallback, useState, useRef, useEffect } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Plus,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useEditorStore } from "@/stores/editor-store";
import { cn } from "@/lib/utils/cn";
import { toast } from "@/hooks/use-toast";
import type { ImageLayer } from "@/types/editor";

/* ------------------------------------------------------------------ */
/*  Layer Row                                                           */
/* ------------------------------------------------------------------ */

interface LayerRowProps {
  layer: ImageLayer;
  index: number;
  isSelected: boolean;
  totalLayers: number;
  onSelect: (id: string) => void;
  onToggleVisible: (id: string, visible: boolean) => void;
  onToggleLock: (id: string, locked: boolean) => void;
  onRename: (id: string, name: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onDelete: (id: string) => void;
}

function LayerRow({
  layer,
  index,
  isSelected,
  totalLayers,
  onSelect,
  onToggleVisible,
  onToggleLock,
  onRename,
  onMoveUp,
  onMoveDown,
  onDelete,
}: LayerRowProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameBuf, setRenameBuf] = useState(layer.name);
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) renameRef.current?.select();
  }, [isRenaming]);

  const commitRename = () => {
    const trimmed = renameBuf.trim();
    if (trimmed && trimmed !== layer.name) onRename(layer.id, trimmed);
    setIsRenaming(false);
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-all cursor-pointer",
        isSelected
          ? "border-accent/50 bg-accent/5"
          : "border-transparent hover:bg-surface-light",
      )}
      onClick={() => onSelect(layer.id)}
    >
      {/* Visibility toggle */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleVisible(layer.id, !layer.visible);
        }}
        className="text-gray-500 hover:text-gray-300 transition-colors"
        aria-label={layer.visible ? "Ocultar capa" : "Mostrar capa"}
      >
        {layer.visible ? (
          <Eye className="h-3.5 w-3.5" />
        ) : (
          <EyeOff className="h-3.5 w-3.5 opacity-40" />
        )}
      </button>

      {/* Thumbnail */}
      <div className="h-8 w-8 shrink-0 overflow-hidden rounded border border-surface-lighter bg-surface">
        {layer.src ? (
          <img
            src={layer.src}
            alt={layer.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-600">
            IMG
          </div>
        )}
      </div>

      {/* Name — double-click to rename */}
      {isRenaming ? (
        <input
          ref={renameRef}
          value={renameBuf}
          onChange={(e) => setRenameBuf(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") { setRenameBuf(layer.name); setIsRenaming(false); }
          }}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 min-w-0 rounded bg-surface-light px-1 py-0.5 text-xs text-gray-200 outline-none ring-1 ring-accent/50"
        />
      ) : (
        <span
          className="flex-1 truncate text-xs text-gray-300"
          onDoubleClick={(e) => {
            e.stopPropagation();
            setRenameBuf(layer.name);
            setIsRenaming(true);
          }}
          title="Doble clic para renombrar"
        >
          {layer.name}
        </span>
      )}

      {/* Lock toggle */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleLock(layer.id, !layer.locked);
        }}
        className="text-gray-500 hover:text-gray-300 transition-colors opacity-0 group-hover:opacity-100"
        aria-label={layer.locked ? "Unlock layer" : "Lock layer"}
      >
        {layer.locked ? (
          <Lock className="h-3 w-3" />
        ) : (
          <Unlock className="h-3 w-3" />
        )}
      </button>

      {/* Reorder buttons */}
      <div className="flex flex-col opacity-0 group-hover:opacity-100">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp(index);
          }}
          disabled={index === totalLayers - 1}
          className="text-gray-500 hover:text-gray-300 disabled:opacity-30 transition-colors"
          aria-label="Mover arriba"
        >
          <ChevronUp className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown(index);
          }}
          disabled={index === 0}
          className="text-gray-500 hover:text-gray-300 disabled:opacity-30 transition-colors"
          aria-label="Mover abajo"
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Layers Panel                                                        */
/* ------------------------------------------------------------------ */

export function LayersPanel() {
  const {
    layers,
    selectedLayerId,
    selectLayer,
    updateLayer,
    removeLayer,
    reorderLayers,
    addLayer,
  } = useEditorStore();

  const selectedLayer = layers.find((l) => l.id === selectedLayerId);

  const handleToggleVisible = useCallback(
    (id: string, visible: boolean) => {
      updateLayer(id, { visible });
    },
    [updateLayer],
  );

  const handleToggleLock = useCallback(
    (id: string, locked: boolean) => {
      updateLayer(id, { locked });
    },
    [updateLayer],
  );

  // In the reversed display, "up" means higher in the visual stack = higher array index
  const handleMoveUp = useCallback(
    (index: number) => {
      if (index < layers.length - 1) reorderLayers(index, index + 1);
    },
    [reorderLayers, layers.length],
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index > 0) reorderLayers(index, index - 1);
    },
    [reorderLayers],
  );

  const handleRename = useCallback(
    (id: string, name: string) => {
      updateLayer(id, { name });
    },
    [updateLayer],
  );

  const handleDelete = useCallback(
    (id: string) => {
      const layer = layers.find((l) => l.id === id);
      if (layer?.locked) {
        toast.warning("La capa esta bloqueada. Desbloqueala primero.");
        return;
      }
      removeLayer(id);
    },
    [removeLayer, layers],
  );

  const handleAddLayer = useCallback(() => {
    const newLayer: ImageLayer = {
      id: `layer-${Date.now()}`,
      name: `Layer ${layers.length + 1}`,
      type: "image",
      src: "",
      x: 0,
      y: 0,
      width: 512,
      height: 512,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      flipX: false,
      flipY: false,
      filters: {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        blur: 0,
        sharpness: 0,
        hue: 0,
        opacity: 100,
        grayscale: false,
        sepia: false,
        invert: false,
      },
    };
    addLayer(newLayer);
  }, [addLayer, layers.length]);

  return (
    <div className="p-2">
      {/* Layer list */}
      {layers.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-[10px] text-gray-500">Sin capas aun.</p>
          <p className="text-[10px] text-gray-600">
            Sube una imagen para crear la primera capa.
          </p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {[...layers].reverse().map((layer, reversedIndex) => {
            const actualIndex = layers.length - 1 - reversedIndex;
            return (
              <LayerRow
                key={layer.id}
                layer={layer}
                index={actualIndex}
                isSelected={layer.id === selectedLayerId}
                totalLayers={layers.length}
                onSelect={selectLayer}
                onToggleVisible={handleToggleVisible}
                onToggleLock={handleToggleLock}
                onRename={handleRename}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onDelete={handleDelete}
              />
            );
          })}
        </div>
      )}

      {/* Selected layer controls */}
      {selectedLayer && (
        <div className="mt-3 space-y-2 border-t border-surface-lighter pt-3">
          <Slider
            label="Opacidad"
            value={[Math.round(selectedLayer.opacity * 100)]}
            onValueChange={([v]) => updateLayer(selectedLayer.id, { opacity: v / 100 })}
            min={0}
            max={100}
            step={1}
            formatValue={(v) => `${v}%`}
          />

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={handleAddLayer}
              leftIcon={<Plus className="h-3 w-3" />}
            >
              Agregar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-red-400 hover:text-red-300"
              onClick={() => handleDelete(selectedLayer.id)}
              leftIcon={<Trash2 className="h-3 w-3" />}
            >
              Eliminar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LayersPanel;
