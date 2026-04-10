"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  ShoppingBag,
  User as UserIcon,
  Share2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
  Download,
  DollarSign,
  Camera,
  Shirt,
  ImageIcon,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils/cn";
import { useAgentPipeline } from "@/hooks/useAgentPipeline";
import type { AgentType, ProductCategory, BudgetTier } from "@/types/agent";

/* ================================================================== */
/*  Workflow definitions                                                */
/* ================================================================== */

interface Workflow {
  id: string;
  agentType: AgentType;
  label: string;
  description: string;
  icon: React.ElementType;
  defaultCategory: ProductCategory;
  defaultBudget: BudgetTier;
  example: string;
}

const WORKFLOWS: Workflow[] = [
  {
    id: "ecommerce",
    agentType: "ecommerce",
    label: "Foto para E-Commerce",
    description:
      "Quita fondo, mejora calidad, agrega sombras, fondo blanco profesional. Listo para Amazon, Shopify, Etsy.",
    icon: ShoppingBag,
    defaultCategory: "general",
    defaultBudget: "economic",
    example: "Sube tu foto de producto tal como la tomaste",
  },
  {
    id: "replace-model",
    agentType: "modelo",
    label: "Reemplazar Modelo con Copyright",
    description:
      "Tienes una foto de modelo con tu prenda pero no puedes usarla? La IA crea un modelo nuevo y le pone tu prenda.",
    icon: UserIcon,
    defaultCategory: "lingerie",
    defaultBudget: "economic",
    example: "Sube la foto de la modelo con tu prenda puesta",
  },
  {
    id: "social",
    agentType: "social",
    label: "Contenido para Redes Sociales",
    description:
      "Fondos creativos, videos animados, anuncios listos para IG, TikTok, Facebook. De foto cruda a contenido que vende.",
    icon: Share2,
    defaultCategory: "general",
    defaultBudget: "economic",
    example: "Sube la foto de tu producto",
  },
];

const CATEGORIES: { value: ProductCategory; label: string; emoji: string }[] = [
  { value: "lingerie", label: "Lenceria", emoji: "🩱" },
  { value: "perfume", label: "Perfumes", emoji: "🧴" },
  { value: "earrings", label: "Aretes", emoji: "💎" },
  { value: "rings", label: "Anillos", emoji: "💍" },
  { value: "necklace", label: "Collares", emoji: "📿" },
  { value: "bracelet", label: "Pulseras", emoji: "⌚" },
  { value: "watch", label: "Relojes", emoji: "🕐" },
  { value: "sunglasses", label: "Lentes", emoji: "🕶" },
  { value: "general", label: "Otro", emoji: "📦" },
];

/* ================================================================== */
/*  Page Component                                                      */
/* ================================================================== */

export default function AgentPage() {
  /* ── State ─────────────────────────────────────────────────── */
  const [step, setStep] = useState<"choose" | "upload" | "config" | "processing" | "done">("choose");
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [category, setCategory] = useState<ProductCategory>("general");
  const [description, setDescription] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const pipeline = useAgentPipeline();

  /* ── Derived ───────────────────────────────────────────────── */
  const executionProgress = pipeline.execution
    ? Math.round(
        (pipeline.execution.steps.filter((s) => s.status === "completed").length /
          pipeline.execution.steps.length) *
          100,
      )
    : 0;

  const finalUrl = pipeline.execution?.steps
    .filter((s) => s.status === "completed" && s.resultUrl)
    .pop()?.resultUrl;

  /* ── Workflow Selection ─────────────────────────────────────── */
  const handleSelectWorkflow = useCallback((wf: Workflow) => {
    setSelectedWorkflow(wf);
    setCategory(wf.defaultCategory);
    setStep("upload");
  }, []);

  /* ── Image Upload ───────────────────────────────────────────── */
  const handleImage = useCallback(
    (file: File) => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      const url = URL.createObjectURL(file);
      setImageFile(file);
      setImagePreview(url);
      setStep("config");
    },
    [imagePreview],
  );

  /* ── Process: Plan + Execute automatically ──────────────────── */
  const handleProcess = useCallback(async () => {
    if (!imageFile || !selectedWorkflow) return;
    setError(null);
    setStep("processing");

    try {
      // 1. Request plan
      const plan = await pipeline.requestPlan({
        agentType: selectedWorkflow.agentType,
        description: description || `Procesamiento ${selectedWorkflow.label}`,
        productCategory: category,
        imageCount: 1,
        budget: selectedWorkflow.defaultBudget,
      });

      // 2. Execute immediately
      const result = await pipeline.execute(plan, imageFile);

      if (result.status === "completed") {
        setStep("done");
      } else {
        const failedStep = result.steps.find((s) => s.status === "failed");
        setError(failedStep?.error || "Error en el procesamiento");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexion");
      setStep("config");
    }
  }, [imageFile, selectedWorkflow, description, category, pipeline]);

  /* ── Retry ──────────────────────────────────────────────────── */
  const handleRetry = useCallback(
    async (index: number) => {
      if (!pipeline.plan || !imageFile) return;
      setError(null);
      setStep("processing");

      const result = await pipeline.retryFromStep(pipeline.plan, imageFile, index);
      if (result?.status === "completed") {
        setStep("done");
      }
    },
    [pipeline, imageFile],
  );

  /* ── Download ───────────────────────────────────────────────── */
  const handleDownload = useCallback(() => {
    if (!finalUrl) return;
    const a = document.createElement("a");
    a.href = finalUrl;
    a.download = `unistudio-${selectedWorkflow?.id ?? "result"}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [finalUrl, selectedWorkflow]);

  /* ── Reset ──────────────────────────────────────────────────── */
  const handleReset = useCallback(() => {
    pipeline.reset();
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    setSelectedWorkflow(null);
    setCategory("general");
    setDescription("");
    setError(null);
    setStep("choose");
  }, [pipeline, imagePreview]);

  /* ── Auto-scroll to results ─────────────────────────────────── */
  const resultsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (step === "done" || (step === "processing" && pipeline.execution)) {
      resultsRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [step, pipeline.execution?.currentStepIndex]);

  /* ================================================================ */
  /*  Render                                                            */
  /* ================================================================ */

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <div className="mx-auto max-w-[900px] px-6 py-10 md:px-10 md:py-14">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex items-center gap-4 mb-10">
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-white/5"
            style={{ border: "1px solid var(--border-default)" }}
          >
            <ArrowLeft className="h-4 w-4 text-muted" />
          </Link>
          <div>
            <h1 className="text-[28px] font-bold text-heading">AI Automatico</h1>
            <p className="text-[14px] text-muted">
              Elige que necesitas, sube tu foto, y la IA hace todo el trabajo.
            </p>
          </div>
        </div>

        {/* ── Error Banner ────────────────────────────────────── */}
        {error && (
          <div
            className="mb-6 flex items-start gap-3 rounded-xl px-4 py-3"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-[13px] text-red-300">{error}</p>
            </div>
            <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-200">
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* ── STEP 1: Choose Workflow ─────────────────────────── */}
        {step === "choose" && (
          <div className="space-y-4">
            <h2 className="text-[18px] font-semibold text-heading mb-2">Que necesitas hacer?</h2>
            <div className="space-y-3">
              {WORKFLOWS.map((wf) => (
                <button
                  key={wf.id}
                  type="button"
                  onClick={() => handleSelectWorkflow(wf)}
                  className="w-full flex items-start gap-5 rounded-xl p-6 text-left transition-all duration-200 hover:-translate-y-0.5 group"
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-default)",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                  }}
                >
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all duration-200"
                    style={{
                      background: "var(--accent-dim)",
                      border: "1px solid var(--border-accent)",
                    }}
                  >
                    <wf.icon className="h-6 w-6 text-accent" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[16px] font-semibold text-heading mb-1 group-hover:text-accent transition-colors">
                      {wf.label}
                    </h3>
                    <p className="text-[13px] text-body leading-relaxed">{wf.description}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted mt-1 shrink-0 group-hover:text-accent group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 2: Upload Image ────────────────────────────── */}
        {step === "upload" && selectedWorkflow && (
          <div className="space-y-6">
            {/* Back */}
            <button
              type="button"
              onClick={() => setStep("choose")}
              className="flex items-center gap-2 text-[13px] text-muted hover:text-accent transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Cambiar workflow
            </button>

            {/* Selected workflow badge */}
            <div
              className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{ background: "var(--accent-dim)", border: "1px solid var(--border-accent)" }}
            >
              <selectedWorkflow.icon className="h-5 w-5 text-accent" />
              <span className="text-[14px] font-semibold text-accent">{selectedWorkflow.label}</span>
            </div>

            {/* Upload zone */}
            <div
              className={cn(
                "relative flex flex-col items-center justify-center rounded-xl py-16 cursor-pointer transition-all duration-200",
                isDragging && "ring-2 ring-accent",
              )}
              style={{
                background: "var(--bg-surface)",
                border: "2px dashed var(--border-default)",
              }}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const f = e.dataTransfer.files[0];
                if (f?.type.startsWith("image/")) handleImage(f);
              }}
            >
              <Upload className="h-10 w-10 text-muted mb-4" />
              <p className="text-[16px] font-semibold text-heading mb-1">
                Arrastra tu imagen aqui
              </p>
              <p className="text-[13px] text-muted mb-4">o haz click para seleccionar</p>
              <p className="text-[12px] text-accent/70 italic">{selectedWorkflow.example}</p>
            </div>

            <input
              type="file"
              ref={fileRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImage(f);
                e.target.value = "";
              }}
            />
          </div>
        )}

        {/* ── STEP 3: Configure + Launch ──────────────────────── */}
        {step === "config" && selectedWorkflow && imageFile && (
          <div className="space-y-6">
            {/* Back */}
            <button
              type="button"
              onClick={() => setStep("upload")}
              className="flex items-center gap-2 text-[13px] text-muted hover:text-accent transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Cambiar imagen
            </button>

            {/* Image preview */}
            <div className="flex gap-5">
              <div className="shrink-0">
                <img
                  src={imagePreview!}
                  alt="Tu imagen"
                  className="h-40 w-40 rounded-xl object-cover"
                  style={{ border: "1px solid var(--border-default)" }}
                />
              </div>
              <div className="flex-1 space-y-4">
                {/* Workflow badge */}
                <div
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5"
                  style={{ background: "var(--accent-dim)", border: "1px solid var(--border-accent)" }}
                >
                  <selectedWorkflow.icon className="h-4 w-4 text-accent" />
                  <span className="text-[12px] font-semibold text-accent">{selectedWorkflow.label}</span>
                </div>

                {/* Category */}
                <div>
                  <p className="text-[12px] font-medium text-muted mb-2">Tipo de producto:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setCategory(c.value)}
                        className="rounded-full px-3 py-1.5 text-[12px] font-medium transition-all"
                        style={{
                          background: category === c.value ? "var(--accent-dim)" : "var(--bg-surface)",
                          border: category === c.value ? "1px solid var(--border-accent)" : "1px solid var(--border-default)",
                          color: category === c.value ? "var(--accent)" : "var(--text-muted)",
                        }}
                      >
                        {c.emoji} {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <p className="text-[12px] font-medium text-muted mb-2">Instrucciones adicionales (opcional):</p>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={
                      selectedWorkflow.id === "replace-model"
                        ? "Ej: Reemplazar la modelo pero mantener mi prenda de lenceria. Modelo femenina, piel morena, pose natural."
                        : "Ej: Foto para Amazon, fondo blanco, sombra suave"
                    }
                    rows={3}
                    className="w-full rounded-lg px-3 py-2.5 text-[13px] text-body placeholder-muted resize-none outline-none"
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-default)",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Process button */}
            <Button
              variant="primary"
              className="w-full py-4 text-[15px]"
              onClick={handleProcess}
              leftIcon={<Sparkles className="h-5 w-5" />}
            >
              Procesar Automaticamente
            </Button>

            <p className="text-[11px] text-muted text-center">
              La IA creara un plan y ejecutara cada paso automaticamente. Puedes ver el progreso en tiempo real.
            </p>
          </div>
        )}

        {/* ── STEP 4: Processing ──────────────────────────────── */}
        {step === "processing" && pipeline.execution && (
          <div className="space-y-6" ref={resultsRef}>
            {/* Progress header */}
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 text-accent animate-spin" />
              <h2 className="text-[18px] font-semibold text-heading">Procesando tu imagen...</h2>
            </div>

            {/* Progress bar */}
            <Progress value={executionProgress} size="md" />

            {/* Plan method badge */}
            {pipeline.planMethod && (
              <Badge variant={pipeline.planMethod === "ai" ? "info" : "default"} size="sm">
                {pipeline.planMethod === "ai" ? "Plan generado por Claude IA" : "Plan template optimizado"}
              </Badge>
            )}

            {/* Steps list */}
            <div className="space-y-2">
              {pipeline.plan?.steps.map((pStep, i) => {
                const exec = pipeline.execution!.steps[i];
                return (
                  <div
                    key={pStep.id}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all"
                    style={{
                      background:
                        exec.status === "running"
                          ? "var(--accent-dim)"
                          : exec.status === "completed"
                            ? "rgba(52,211,153,0.05)"
                            : "var(--bg-surface)",
                      border:
                        exec.status === "running"
                          ? "1px solid var(--border-accent)"
                          : exec.status === "completed"
                            ? "1px solid rgba(52,211,153,0.15)"
                            : exec.status === "failed"
                              ? "1px solid rgba(239,68,68,0.2)"
                              : "1px solid var(--border-default)",
                    }}
                  >
                    {/* Status icon */}
                    {exec.status === "completed" && <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />}
                    {exec.status === "running" && <Loader2 className="h-5 w-5 text-accent animate-spin shrink-0" />}
                    {exec.status === "failed" && <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />}
                    {exec.status === "pending" && (
                      <div className="h-5 w-5 rounded-full shrink-0" style={{ border: "2px solid var(--border-default)" }} />
                    )}

                    {/* Step info */}
                    <div className="flex-1">
                      <span
                        className={cn(
                          "text-[13px] font-medium",
                          exec.status === "completed" ? "text-emerald-300" :
                          exec.status === "running" ? "text-accent" :
                          exec.status === "failed" ? "text-red-300" :
                          "text-muted",
                        )}
                      >
                        {pStep.label}
                      </span>
                      {exec.status === "running" && (
                        <p className="text-[11px] text-accent/60 mt-0.5">{pStep.reasoning}</p>
                      )}
                      {exec.status === "failed" && exec.error && (
                        <p className="text-[11px] text-red-400/80 mt-0.5">{exec.error}</p>
                      )}
                    </div>

                    {/* Result thumbnail */}
                    {exec.status === "completed" && exec.resultUrl && (
                      <img src={exec.resultUrl} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />
                    )}

                    {/* Cost */}
                    {exec.status === "completed" && (
                      <span className="text-[11px] font-medium tabular-nums text-emerald-400/70">
                        {exec.actualCost === 0 ? "Gratis" : `$${exec.actualCost.toFixed(3)}`}
                      </span>
                    )}

                    {/* Retry */}
                    {exec.status === "failed" && (
                      <Button variant="outline" size="sm" onClick={() => handleRetry(i)} className="text-[11px]">
                        Reintentar
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Running cost */}
            <div className="flex items-center gap-2 text-[13px]">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <span className="text-muted">Costo acumulado:</span>
              <span className="font-semibold tabular-nums text-emerald-400">
                ${pipeline.execution.totalCost.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* ── STEP 5: Done ────────────────────────────────────── */}
        {step === "done" && finalUrl && (
          <div className="space-y-6" ref={resultsRef}>
            {/* Success header */}
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              <h2 className="text-[20px] font-bold text-heading">Imagen lista!</h2>
              {pipeline.execution && (
                <span className="text-[13px] text-emerald-400 font-semibold ml-auto">
                  Costo total: ${pipeline.execution.totalCost.toFixed(2)}
                </span>
              )}
            </div>

            {/* Final result */}
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
            >
              <img
                src={finalUrl}
                alt="Resultado final"
                className="w-full max-h-[500px] object-contain"
                style={{ background: "repeating-conic-gradient(rgba(255,255,255,0.03) 0% 25%, transparent 0% 50%) 50% / 20px 20px" }}
              />
            </div>

            {/* Step thumbnails */}
            {pipeline.execution && pipeline.execution.steps.filter((s) => s.resultUrl).length > 1 && (
              <div>
                <p className="text-[12px] font-medium text-muted mb-2">Resultado de cada paso:</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {pipeline.execution.steps
                    .filter((s) => s.resultUrl)
                    .map((s, i) => (
                      <div key={s.stepId} className="shrink-0 text-center">
                        <img
                          src={s.resultUrl!}
                          alt={`Paso ${i + 1}`}
                          className="h-20 w-20 rounded-lg object-cover mb-1"
                          style={{ border: "1px solid var(--border-default)" }}
                        />
                        <span className="text-[10px] text-muted">Paso {i + 1}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleDownload}
                leftIcon={<Download className="h-4 w-4" />}
              >
                Descargar Resultado
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleReset} leftIcon={<RotateCcw className="h-4 w-4" />}>
                Procesar Otra Imagen
              </Button>
            </div>

            {/* Open in editor */}
            <Link
              href="/editor?module=smart-editor"
              className="block w-full text-center rounded-xl py-3 text-[13px] font-medium text-accent transition-colors hover:bg-accent/5"
              style={{ border: "1px solid var(--border-accent)" }}
            >
              Abrir en Editor para retoques finales
            </Link>
          </div>
        )}

        {/* ── Processing done but with error (show steps + retry) ── */}
        {step === "processing" && !pipeline.execution && pipeline.isPlanning && (
          <div className="flex flex-col items-center py-20">
            <Loader2 className="h-8 w-8 text-accent animate-spin mb-4" />
            <p className="text-[15px] text-heading font-medium">Analizando tu imagen con IA...</p>
            <p className="text-[13px] text-muted mt-1">Creando el plan optimo para tu producto</p>
          </div>
        )}
      </div>
    </div>
  );
}
