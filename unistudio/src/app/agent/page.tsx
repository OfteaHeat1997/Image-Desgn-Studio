"use client";

import React, { useState, useCallback, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Upload,
  Wand2,
  ArrowRight,
  Package,
  Gem,
  Shirt,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { toast } from "@/hooks/use-toast";

/**
 * AI Agent — pipeline router.
 *
 * This page does NOT execute any pipeline. It detects the product category
 * (optionally using /api/analyze-image for clothing) and redirects the user
 * to the right canonical pipeline (/pipelines/lingerie, /pipelines/static-product,
 * or /pipelines/jewelry).
 *
 * Previous version had 3 workflow cards (ecommerce, modelo, social) that
 * duplicated the canonical pipelines and used useAgentPipeline for orchestration.
 * Consolidated in commit 7 of the pipeline rewrite.
 */

type PipelineFamily = "lingerie" | "static-product" | "jewelry";

interface CategoryOption {
  id: string;
  label: string;
  description: string;
  family: PipelineFamily;
  params: Record<string, string>;
  icon: React.ElementType;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  // --- Lencería ---
  {
    id: "lingerie-bra",
    label: "Bras / Brasiere",
    description: "Quita la modelo original y pone el bra en una modelo IA",
    family: "lingerie",
    params: { productType: "bra" },
    icon: Shirt,
  },
  {
    id: "lingerie-panty",
    label: "Panties",
    description: "Quita la modelo original y pone el panty en una modelo IA",
    family: "lingerie",
    params: { productType: "panty" },
    icon: Shirt,
  },
  {
    id: "lingerie-shapewear",
    label: "Shapewear / Faja",
    description: "Fajas, bodysuits — mismo flow de lencería con categoría correcta",
    family: "lingerie",
    params: { productType: "faja" },
    icon: Shirt,
  },
  // --- Estáticos ---
  {
    id: "static-perfume",
    label: "Perfumes / Colonias",
    description: "Fondo gradient premium (estilo Sephora) o pastel juvenil",
    family: "static-product",
    params: { productType: "perfume" },
    icon: Package,
  },
  {
    id: "static-cream",
    label: "Cremas / Skincare",
    description: "Mármol blanco (anti-age) o beige spa (hidratantes)",
    family: "static-product",
    params: { productType: "cream" },
    icon: Package,
  },
  {
    id: "static-sunscreen",
    label: "Bloqueador solar",
    description: "Playa desenfocada estilo Coppertone",
    family: "static-product",
    params: { productType: "sunscreen" },
    icon: Package,
  },
  {
    id: "static-deodorant",
    label: "Desodorantes / Talcos",
    description: "Degradado gris neutro product-shot clean",
    family: "static-product",
    params: { productType: "deodorant" },
    icon: Package,
  },
  {
    id: "static-facial",
    label: "Limpieza facial",
    description: "Fondo azul/blanco spa estilo La Roche-Posay",
    family: "static-product",
    params: { productType: "facial" },
    icon: Package,
  },
  {
    id: "static-makeup",
    label: "Maquillaje",
    description: "Negro mate dramático estilo MAC",
    family: "static-product",
    params: { productType: "makeup" },
    icon: Package,
  },
  // --- Joyería ---
  {
    id: "jewelry-earrings",
    label: "Aretes / Topos / Candongas",
    description: "Estante de terciopelo + foto en orejas de modelo + video",
    family: "jewelry",
    params: { subType: "earrings" },
    icon: Gem,
  },
  {
    id: "jewelry-necklace",
    label: "Cadenas / Collares",
    description: "Busto de cuero + foto en cuello de modelo + video",
    family: "jewelry",
    params: { subType: "necklace" },
    icon: Gem,
  },
  {
    id: "jewelry-ring",
    label: "Anillos",
    description: "Cojín de seda + foto en mano + video",
    family: "jewelry",
    params: { subType: "ring" },
    icon: Gem,
  },
  {
    id: "jewelry-bracelet",
    label: "Pulseras",
    description: "Base de madera + foto en muñeca + video",
    family: "jewelry",
    params: { subType: "bracelet" },
    icon: Gem,
  },
  {
    id: "jewelry-set",
    label: "Sets (combo)",
    description: "Mármol blanco + foto torso mostrando combo + video",
    family: "jewelry",
    params: { subType: "set" },
    icon: Gem,
  },
];

const FAMILY_META: Record<PipelineFamily, { label: string; path: string; color: string }> = {
  lingerie: {
    label: "Pipeline de Lencería",
    path: "/pipelines/lingerie",
    color: "violet",
  },
  "static-product": {
    label: "Pipeline de Estáticos",
    path: "/pipelines/static-product",
    color: "amber",
  },
  jewelry: {
    label: "Pipeline de Joyería",
    path: "/pipelines/jewelry",
    color: "yellow",
  },
};

/* ================================================================== */
/*  Page component                                                      */
/* ================================================================== */

export default function AgentPage() {
  return (
    <Suspense fallback={<FallbackLoader />}>
      <AgentRouterContent />
    </Suspense>
  );
}

function FallbackLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-gray-400">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );
}

function AgentRouterContent() {
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [autoDetected, setAutoDetected] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Support preselection via ?cat=lingerie-bra (useful for homepage links)
  useEffect(() => {
    const cat = searchParams.get("cat");
    if (cat && CATEGORY_OPTIONS.some((c) => c.id === cat)) {
      setSelectedId(cat);
    }
  }, [searchParams]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFile = useCallback(async (file: File) => {
    setUploadedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });

    // Try to auto-detect garment type via /api/analyze-image.
    // Only works for lingerie categories (bra / panty / set). Soft-fail for everything else.
    setIsDetecting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/analyze-image", { method: "POST", body: form });
      const json = await res.json();
      if (json.success && json.data?.garmentType) {
        const gt = json.data.garmentType as string;
        let matchedId: string | null = null;
        if (gt === "bra") matchedId = "lingerie-bra";
        else if (gt === "panty") matchedId = "lingerie-panty";
        else if (gt === "set") matchedId = "lingerie-bra"; // set → default to bra flow
        if (matchedId) {
          setAutoDetected(matchedId);
          setSelectedId(matchedId);
          toast.success(`Detectado: ${CATEGORY_OPTIONS.find((c) => c.id === matchedId)?.label}`);
        }
      }
    } catch {
      // Silent — user will pick manually.
    } finally {
      setIsDetecting(false);
    }
  }, []);

  const handleContinue = () => {
    if (!selectedId) {
      toast.error("Elegí una categoría primero.");
      return;
    }
    const option = CATEGORY_OPTIONS.find((c) => c.id === selectedId);
    if (!option) return;
    const meta = FAMILY_META[option.family];
    const qs = new URLSearchParams(option.params).toString();
    window.location.assign(`${meta.path}?${qs}`);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/8 bg-black/40 px-6 py-3 backdrop-blur">
        <a href="/" className="flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Inicio
        </a>
        <span className="text-gray-700">/</span>
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-violet-400" />
          <span className="text-sm font-semibold text-white">Agente IA · Router de pipelines</span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">¿Qué querés procesar?</h1>
          <p className="mt-1 text-sm text-gray-400">
            Subí una foto (opcional, auto-detecto lencería) o elegí la categoría abajo. Te mando al pipeline correcto con la configuración apropiada para ese tipo de producto.
          </p>
        </div>

        {/* Optional upload — auto-detects lingerie garments */}
        <section className="mb-6 rounded-xl border border-white/8 bg-white/[0.02] p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
              Subir foto (opcional — auto-detecta lencería)
            </h2>
            {autoDetected && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300">
                <CheckCircle2 className="h-3 w-3" />
                Detectado
              </span>
            )}
          </div>

          <div className="flex items-start gap-4">
            {previewUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={previewUrl}
                alt="Subida"
                className="h-32 w-32 flex-shrink-0 rounded-lg border border-white/10 bg-black object-contain"
              />
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex h-32 w-32 flex-shrink-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-white/10 bg-white/[0.02] text-center transition hover:border-white/20"
              >
                <Upload className="h-5 w-5 text-gray-400" />
                <span className="text-[11px] text-gray-500">Subir</span>
              </div>
            )}

            <div className="flex-1">
              {uploadedFile && (
                <p className="mb-2 text-sm font-medium text-gray-200">{uploadedFile.name}</p>
              )}
              {isDetecting && (
                <p className="inline-flex items-center gap-2 text-xs text-amber-300">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Analizando la foto...
                </p>
              )}
              {!uploadedFile && (
                <p className="text-xs text-gray-500">
                  Si subís una foto con prenda de lencería, la detecto automáticamente. Para perfumes, cremas o joyería, elegí la categoría manualmente abajo.
                </p>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>
        </section>

        {/* Category grid */}
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
            O elegí la categoría
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
            {CATEGORY_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const meta = FAMILY_META[opt.family];
              const isSelected = selectedId === opt.id;
              const isAuto = autoDetected === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setSelectedId(opt.id)}
                  className={cn(
                    "flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-all",
                    isSelected
                      ? "border-violet-500/50 bg-violet-500/10"
                      : "border-white/8 bg-white/[0.02] hover:border-white/20",
                  )}
                >
                  <div className="flex w-full items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className={cn("h-4 w-4", isSelected ? "text-violet-400" : "text-gray-400")} />
                      <span className="text-sm font-medium text-gray-200">{opt.label}</span>
                    </div>
                    {isAuto && (
                      <span className="text-[10px] font-medium text-emerald-400">AUTO</span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500">{opt.description}</p>
                  <span className="mt-1 text-[10px] text-gray-600">→ {meta.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Continue button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleContinue}
            disabled={!selectedId}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:bg-violet-500/30"
          >
            Ir al pipeline
            <ArrowRight className="h-4 w-4" />
          </button>
          {selectedId && (
            <span className="text-xs text-gray-400">
              →{" "}
              {FAMILY_META[CATEGORY_OPTIONS.find((c) => c.id === selectedId)!.family].path}
              {"?"}
              {new URLSearchParams(CATEGORY_OPTIONS.find((c) => c.id === selectedId)!.params).toString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
