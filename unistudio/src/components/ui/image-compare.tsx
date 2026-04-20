"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils/cn";

export interface ImageCompareProps {
  beforeSrc: string;
  afterSrc: string;
  beforeAlt?: string;
  afterAlt?: string;
  beforeLabel?: string;
  afterLabel?: string;
  position?: number;
  className?: string;
  /** Show large ANTES/DESPUES labels at top corners */
  showHeaderLabels?: boolean;
  /** Show animated drag hint near the handle */
  showDragHint?: boolean;
  /** Custom text for the drag hint */
  dragHintText?: string;
}

export function ImageCompare({
  beforeSrc,
  afterSrc,
  beforeAlt = "Before",
  afterAlt = "After",
  beforeLabel = "Before",
  afterLabel = "After",
  position = 50,
  className,
  showHeaderLabels = false,
  showDragHint = false,
  dragHintText = "Arrastra para comparar",
}: ImageCompareProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderPos, setSliderPos] = useState(position);
  const [dragging, setDragging] = useState(false);
  const [loaded, setLoaded] = useState({ before: false, after: false });
  const [errored, setErrored] = useState({ before: false, after: false });
  const [hasInteracted, setHasInteracted] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  // Show the compare view as soon as BOTH sides have either loaded or errored
  // (errored = we know we can't show it, but stop hanging the UI forever).
  const bothResolved =
    (loaded.before || errored.before) && (loaded.after || errored.after);

  // Reset all transient state when sources change
  useEffect(() => {
    setLoaded({ before: false, after: false });
    setErrored({ before: false, after: false });
    setSliderPos(position);
    setHasInteracted(false);
    setAspectRatio(null);
  }, [beforeSrc, afterSrc, position]);

  // Measure the largest aspect ratio from both images so both fit in the same box
  const handleAfterLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setAspectRatio((prev) => {
        const ratio = img.naturalWidth / img.naturalHeight;
        return prev ? Math.min(prev, ratio) : ratio;
      });
    }
    setLoaded((s) => ({ ...s, after: true }));
  }, []);

  const handleBeforeLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setAspectRatio((prev) => {
        const ratio = img.naturalWidth / img.naturalHeight;
        return prev ? Math.min(prev, ratio) : ratio;
      });
    }
    setLoaded((s) => ({ ...s, before: true }));
  }, []);

  const updatePosition = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setSliderPos(pct);
  }, []);

  // Pointer drag
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      setDragging(true);
      setHasInteracted(true);
      updatePosition(e.clientX);
    },
    [updatePosition],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      e.preventDefault();
      updatePosition(e.clientX);
    },
    [dragging, updatePosition],
  );

  const onPointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative select-none overflow-hidden rounded-xl border border-surface-lighter bg-surface-light touch-none",
        className,
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        cursor: dragging ? "ew-resize" : "col-resize",
      }}
    >
      {/* Loading overlay */}
      {!bothResolved && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-surface-light" style={{ minHeight: 300 }}>
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <span className="text-xs text-gray-400">Cargando preview...</span>
          </div>
        </div>
      )}

      {/*
        Both images are absolutely positioned in the same box with object-contain.
        This ensures they have the same visual scale regardless of their native dimensions.
        The container's aspect-ratio is set dynamically based on the tallest image.
      */}

      {/* AFTER image — in normal flow, sets container height */}
      <img
        src={afterSrc}
        alt={afterAlt}
        draggable={false}
        onLoad={handleAfterLoad}
        onError={() => setErrored((s) => ({ ...s, after: true }))}
        className="block w-full h-auto object-contain"
      />

      {/* BEFORE image — absolute on top, clipped by slider */}
      <img
        src={beforeSrc}
        alt={beforeAlt}
        draggable={false}
        onLoad={handleBeforeLoad}
        onError={() => setErrored((s) => ({ ...s, before: true }))}
        className="absolute top-0 left-0 w-full h-full object-contain"
        style={{
          clipPath: `inset(0 ${100 - sliderPos}% 0 0)`,
        }}
      />

      {/* Slider line + draggable handle */}
      {bothResolved && !errored.before && !errored.after && (
        <div
          className="absolute top-0 bottom-0 z-20 pointer-events-none"
          style={{ left: `${sliderPos}%` }}
        >
          {/* Vertical line */}
          <div className="absolute top-0 bottom-0 left-0 w-0.5 -translate-x-1/2 bg-accent shadow-[0_0_6px_rgba(197,164,126,0.5)]" />

          {/* Handle circle */}
          <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border-2 border-accent bg-surface shadow-lg pointer-events-auto cursor-ew-resize">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M5 3L1.5 8L5 13M11 3L14.5 8L11 13"
                stroke="var(--accent)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Header labels (ANTES / DESPUES) */}
      {bothResolved && showHeaderLabels && (
        <>
          <span className="absolute top-3 left-3 z-10 rounded-md bg-black/70 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-sm pointer-events-none">
            {beforeLabel}
          </span>
          <span className="absolute top-3 right-3 z-10 rounded-md bg-accent/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-sm pointer-events-none">
            {afterLabel}
          </span>
        </>
      )}

      {/* Bottom labels (hidden when header labels are used) */}
      {bothResolved && !showHeaderLabels && (
        <>
          <span className="absolute bottom-3 left-3 z-10 rounded-md bg-black/60 px-2 py-1 text-xs font-semibold text-white backdrop-blur-sm pointer-events-none">
            {beforeLabel}
          </span>
          <span className="absolute bottom-3 right-3 z-10 rounded-md bg-black/60 px-2 py-1 text-xs font-semibold text-white backdrop-blur-sm pointer-events-none">
            {afterLabel}
          </span>
        </>
      )}

      {/* Drag hint — disappears after first interaction */}
      {bothResolved && showDragHint && !hasInteracted && (
        <div className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 pointer-events-none animate-pulse">
          <span className="rounded-full bg-black/70 px-3 py-1.5 text-[10px] font-medium text-gray-200 backdrop-blur-sm">
            ← {dragHintText} →
          </span>
        </div>
      )}
    </div>
  );
}

export default ImageCompare;
