"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[UniStudio Error Boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
          <span className="text-red-400 text-xl">!</span>
        </div>
        <h2 className="text-lg font-semibold text-gray-200 mb-2">
          Algo salio mal
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          {error.message || "Ocurrio un error inesperado. Intenta de nuevo."}
        </p>
        <button
          onClick={reset}
          className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-background hover:bg-accent-light transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
