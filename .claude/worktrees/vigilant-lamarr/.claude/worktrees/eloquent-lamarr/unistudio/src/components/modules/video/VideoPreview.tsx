"use client";

import React, { useRef } from "react";
import { Download } from "lucide-react";

interface VideoPreviewProps {
  videoUrl: string | null;
}

export function VideoPreview({ videoUrl }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!videoUrl) return null;

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
      <div className="relative aspect-video overflow-hidden rounded-lg border border-surface-lighter bg-surface-light">
        <video
          ref={videoRef}
          src={videoUrl}
          className="h-full w-full object-contain"
          controls
          autoPlay
          loop
          muted
        />
      </div>
    </div>
  );
}
