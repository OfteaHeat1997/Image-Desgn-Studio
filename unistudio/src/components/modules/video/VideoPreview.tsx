"use client";

import React, { useRef } from "react";
import { Download, AlertCircle } from "lucide-react";

interface VideoPreviewProps {
  videoUrl: string | null;
}

// Detect if the URL is an image (Ken Burns returns original image URL)
function isImageUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.match(/\.(jpg|jpeg|png|webp|gif|avif)(\?|$)/) !== null ||
    lower.startsWith("data:image/")
  );
}

export function VideoPreview({ videoUrl }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!videoUrl) return null;

  const isKenBurns = isImageUrl(videoUrl);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `unistudio-video-${Date.now()}.mp4`;
    a.click();
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-xs font-medium text-gray-400">
          {isKenBurns ? "Vista Previa (Ken Burns)" : "Preview"}
        </label>
        {!isKenBurns && (
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-gray-400 hover:bg-surface-light hover:text-gray-200 transition-colors"
          >
            <Download className="h-3 w-3" />
            Descargar
          </button>
        )}
      </div>

      {isKenBurns ? (
        /* Ken Burns — show image with preview-only notice */
        <div className="space-y-2">
          <div className="relative overflow-hidden rounded-lg border border-amber-500/30 bg-surface-light">
            {/* CSS Ken Burns animation on the image */}
            <img
              src={videoUrl}
              alt="Ken Burns preview"
              className="h-full w-full object-cover"
              style={{
                animation: "kenburns 5s ease-in-out infinite alternate",
              }}
            />
            <style>{`
              @keyframes kenburns {
                from { transform: scale(1) translate(0, 0); }
                to   { transform: scale(1.12) translate(-3%, -2%); }
              }
            `}</style>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-400 mt-0.5" />
            <p className="text-[10px] text-amber-300 leading-relaxed">
              <span className="font-semibold">Solo vista previa</span> — Ken Burns genera una animacion CSS, no un archivo MP4 descargable. Para exportar a TikTok/Instagram usa{" "}
              <span className="font-medium text-amber-200">LTX-Video ($0.04)</span> o{" "}
              <span className="font-medium text-amber-200">Wan 2.2 Fast ($0.05)</span>.
            </p>
          </div>
        </div>
      ) : (
        /* Real video file */
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
      )}
    </div>
  );
}
