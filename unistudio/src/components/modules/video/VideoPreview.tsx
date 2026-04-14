"use client";

import React, { useRef, useState } from "react";
import { Download, AlertCircle } from "lucide-react";

interface VideoPreviewProps {
  videoUrl: string | null;
  aspectRatio?: string;
}

export function VideoPreview({ videoUrl, aspectRatio }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loadError, setLoadError] = useState(false);

  if (!videoUrl) return null;

  const videoAspectRatio = aspectRatio?.replace(':', '/') ?? '16/9';

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `unistudio-video-${Date.now()}.mp4`;
    a.click();
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-xs font-medium text-gray-400">Preview</label>
        <button
          type="button"
          onClick={handleDownload}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-gray-400 hover:bg-surface-light hover:text-gray-200 transition-colors"
        >
          <Download className="h-3 w-3" />
          Descargar
        </button>
      </div>

      <div
        className="relative overflow-hidden rounded-lg border border-surface-lighter bg-surface-light"
        style={{ aspectRatio: videoAspectRatio }}
      >
        {loadError ? (
          <div className="flex h-full items-center justify-center px-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              <p className="text-xs text-red-300">
                No se pudo reproducir el video. Intenta descargar el archivo.
              </p>
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            src={videoUrl}
            className="h-full w-full object-contain"
            controls
            autoPlay
            loop
            muted
            onError={() => setLoadError(true)}
          />
        )}
      </div>
    </div>
  );
}
