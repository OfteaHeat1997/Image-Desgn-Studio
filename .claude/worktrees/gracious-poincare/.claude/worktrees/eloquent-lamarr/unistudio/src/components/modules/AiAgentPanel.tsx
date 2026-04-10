"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  ShoppingBag,
  User,
  Share2,
  Play,
  RefreshCw,
  Check,
  AlertCircle,
  Loader2,
  ChevronRight,
  Sparkles,
  DollarSign,
  Clock,
  ImageIcon,
  X,
  Download,
  Eye,
  Info,
  ZoomIn,
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils/cn";
import { useAgentPipeline } from "@/hooks/useAgentPipeline";
import type {
  AgentType,
  AgentModule,
  AgentPlan,
  ProductCategory,
  BudgetTier,
  SocialContentType,
  AgentPlanRequest,
  PipelineStep,
  ImageAnalysis,
} from "@/types/agent";
import { toast } from "@/hooks/use-toast";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface AiAgentPanelProps {
  imageFile: File | null;
  onProcess: (result: string, beforeImage?: string, cost?: number) => void;
}

type Phase = "input" | "plan" | "executing" | "results";

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const AGENTS: { type: AgentType; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    type: "ecommerce",
    label: "E-Commerce",
    icon: <ShoppingBag className="h-4 w-4" />,
    desc: "Foto de producto: fondo blanco, uniforme, HD",
  },
  {
    type: "modelo",
    label: "Modelo",
    icon: <User className="h-4 w-4" />,
    desc: "Modelo IA vistiendo tu producto",
  },
  {
    type: "social",
    label: "Social",
    icon: <Share2 className="h-4 w-4" />,
    desc: "Videos, banners y ads para redes",
  },
];

const CATEGORY_OPTIONS = [
  { value: "lingerie", label: "Lenceria" },
  { value: "perfume", label: "Perfume" },
  { value: "earrings", label: "Aretes" },
  { value: "rings", label: "Anillos" },
  { value: "necklace", label: "Collares" },
  { value: "bracelet", label: "Pulseras" },
  { value: "watch", label: "Relojes" },
  { value: "sunglasses", label: "Lentes de sol" },
  { value: "general", label: "General" },
];

const CONTENT_TYPE_OPTIONS = [
  { value: "hero", label: "Hero / Banner" },
  { value: "category", label: "Imagen de Categoria" },
  { value: "ig-reel", label: "Instagram Reel" },
  { value: "tiktok", label: "TikTok" },
  { value: "ig-story", label: "Instagram Story" },
  { value: "product-video", label: "Video de Producto" },
  { value: "avatar", label: "Avatar con Voz" },
];

const BUDGET_OPTIONS: { value: BudgetTier; label: string; desc: string }[] = [
  { value: "free", label: "Gratis", desc: "$0 — solo herramientas locales" },
  { value: "economic", label: "Economico", desc: "< $0.15 — balance calidad/costo" },
  { value: "premium", label: "Premium", desc: "Mejor calidad, sin limite" },
];

/** Free tier warnings per agent type */
const FREE_TIER_WARNINGS: Record<AgentType, string | null> = {
  ecommerce: null, // Free ecommerce works fine (bg-remove + enhance + shadows)
  modelo:
    "El modo Gratis solo puede quitar fondo y mejorar la imagen. Para generar un modelo IA y vestirlo necesitas minimo el plan Economico.",
  social:
    "El modo Gratis solo genera videos Ken Burns basicos. Para fondos creativos, videos IA y anuncios usa el plan Economico.",
};

const GENDER_OPTIONS = [
  { value: "female", label: "Femenino" },
  { value: "male", label: "Masculino" },
];

const SKIN_TONE_OPTIONS = [
  { value: "light", label: "Clara" },
  { value: "medium-light", label: "Media Clara" },
  { value: "medium", label: "Media" },
  { value: "medium-dark", label: "Media Oscura" },
  { value: "dark", label: "Oscura" },
];

const BODY_TYPE_OPTIONS = [
  { value: "slim", label: "Delgado" },
  { value: "average", label: "Promedio" },
  { value: "athletic", label: "Atletico" },
  { value: "plus-size", label: "Plus Size" },
];

const POSE_OPTIONS = [
  { value: "standing", label: "De pie" },
  { value: "sitting", label: "Sentado" },
  { value: "walking", label: "Caminando" },
  { value: "dynamic", label: "Dinamico" },
];

const AGE_OPTIONS = [
  { value: "18-25", label: "18-25" },
  { value: "26-35", label: "26-35" },
  { value: "36-45", label: "36-45" },
  { value: "46-55", label: "46-55" },
];

const MODULE_ICONS: Record<string, string> = {
  "bg-remove": "✂️",
  "bg-generate": "🎨",
  enhance: "✨",
  shadows: "💡",
  outpaint: "↔️",
  upscale: "🔍",
  "model-create": "👤",
  tryon: "👗",
  "jewelry-tryon": "💎",
  inpaint: "🖌️",
  video: "🎬",
  "ad-create": "📱",
};

/** Modules available for "add step" in plan editor */
const ADDABLE_MODULES: { module: AgentModule; label: string; cost: number }[] = [
  { module: "bg-remove", label: "Quitar fondo", cost: 0 },
  { module: "bg-generate", label: "Generar fondo", cost: 0.05 },
  { module: "enhance", label: "Mejorar imagen", cost: 0 },
  { module: "shadows", label: "Agregar sombras", cost: 0 },
  { module: "inpaint", label: "Inpainting / Remover", cost: 0.05 },
  { module: "outpaint", label: "Extender imagen", cost: 0.05 },
  { module: "upscale", label: "Escalar resolucion", cost: 0.02 },
  { module: "model-create", label: "Crear modelo IA", cost: 0.055 },
  { module: "tryon", label: "Try-On virtual", cost: 0.02 },
  { module: "jewelry-tryon", label: "Try-On joyeria", cost: 0.05 },
  { module: "video", label: "Generar video", cost: 0.05 },
  { module: "ad-create", label: "Crear anuncio", cost: 0 },
];

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function AiAgentPanel({ imageFile, onProcess }: AiAgentPanelProps) {
  // Phase
  const [phase, setPhase] = useState<Phase>("input");

  // Input state
  const [agentType, setAgentType] = useState<AgentType>("ecommerce");
  const [category, setCategory] = useState<ProductCategory>("lingerie");
  const [description, setDescription] = useState("");
  const [contentType, setContentType] = useState<SocialContentType>("hero");
  const [budget, setBudget] = useState<BudgetTier>("economic");

  // Modelo preferences
  const [gender, setGender] = useState("female");
  const [skinTone, setSkinTone] = useState("medium");
  const [bodyType, setBodyType] = useState("average");
  const [pose, setPose] = useState("standing");
  const [ageRange, setAgeRange] = useState("26-35");

  // Error state (inline, visible in panel)
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cost confirmation dialog
  const [showCostConfirm, setShowCostConfirm] = useState(false);

  // Image analysis (runs on upload, informs planner)
  const [imageAnalysis, setImageAnalysis] = useState<ImageAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Expanded step preview (click thumbnail to see full image)
  const [previewStepUrl, setPreviewStepUrl] = useState<string | null>(null);
  const [previewStepLabel, setPreviewStepLabel] = useState<string>("");

  // Plan editor state
  const [editedPlan, setEditedPlan] = useState<AgentPlan | null>(null);
  const [showAddStep, setShowAddStep] = useState(false);

  // Pipeline hook
  const pipeline = useAgentPipeline();
  const { plan: rawPlan, planMethod, execution, isPlanning } = pipeline;

  // Use editedPlan if user has modified, otherwise use raw plan from pipeline
  const plan = editedPlan ?? rawPlan;

  // Elapsed time tracking
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Analyze image automatically when user uploads one
  useEffect(() => {
    if (!imageFile) {
      setImageAnalysis(null);
      return;
    }

    let cancelled = false;
    setIsAnalyzing(true);
    setImageAnalysis(null);

    const analyze = async () => {
      try {
        const formData = new FormData();
        formData.append("file", imageFile);
        const res = await fetch("/api/analyze-image", { method: "POST", body: formData });
        if (!res.ok) throw new Error(`Analysis failed: ${res.status}`);
        const json = await res.json();
        if (!cancelled && json.success && json.data) {
          setImageAnalysis(json.data as ImageAnalysis);
        }
      } catch (err) {
        console.error("[AiAgentPanel] Image analysis failed:", err);
        // Non-blocking — analysis is optional, planning still works without it
      } finally {
        if (!cancelled) setIsAnalyzing(false);
      }
    };

    analyze();
    return () => { cancelled = true; };
  }, [imageFile]);

  // Tick elapsed every second during execution
  React.useEffect(() => {
    if (execution?.status !== "running" || !startTime) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [execution?.status, startTime]);

  // Computed progress
  const progress = useMemo(() => {
    if (!execution || !plan) return 0;
    const completed = execution.steps.filter((s) => s.status === "completed").length;
    return Math.round((completed / plan.steps.length) * 100);
  }, [execution, plan]);

  // Final result URL (last completed step)
  const finalResultUrl = useMemo(() => {
    if (!execution) return null;
    const completedSteps = [...execution.steps].reverse();
    const last = completedSteps.find((s) => s.status === "completed" && s.resultUrl);
    return last?.resultUrl ?? null;
  }, [execution]);

  // ----- Handlers -----

  const handleCreatePlan = useCallback(async () => {
    setErrorMsg(null);
    const req: AgentPlanRequest = {
      agentType,
      description,
      productCategory: category,
      imageCount: 1,
      budget,
      contentType: agentType === "social" ? contentType : undefined,
      preferences: agentType === "modelo" ? { gender, skinTone, bodyType, pose, ageRange } : undefined,
      imageAnalysis: imageAnalysis ?? undefined,
    };

    try {
      await pipeline.requestPlan(req);
      setPhase("plan");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido al crear plan";
      console.error("Plan creation failed:", err);
      setErrorMsg(msg);
      toast.error(msg);
    }
  }, [agentType, description, category, budget, contentType, gender, skinTone, bodyType, pose, ageRange, pipeline, imageAnalysis]);

  const handleExecute = useCallback(async () => {
    if (!plan || !imageFile) return;

    // Show cost confirmation for paid pipelines
    if (plan.totalEstimatedCost > 0 && !showCostConfirm) {
      setShowCostConfirm(true);
      return;
    }

    setShowCostConfirm(false);
    setErrorMsg(null);
    setPhase("executing");
    setStartTime(Date.now());
    setElapsed(0);

    try {
      const result = await pipeline.execute(plan, imageFile);

      if (result?.status === "completed") {
        setPhase("results");
      } else if (result?.status === "failed") {
        // Stay in executing phase so user can see error & retry
      }
    } catch (err) {
      console.error("Execution failed:", err);
      setErrorMsg(err instanceof Error ? err.message : "Error inesperado durante ejecucion");
      setPhase("input");
    }
  }, [plan, imageFile, pipeline, showCostConfirm]);

  const handleRetry = useCallback(async (index: number) => {
    if (!plan || !imageFile) return;
    setPhase("executing");
    // FIX: retryFromStep returns the final execution state directly,
    // so we check the returned value instead of the stale React state
    const result = await pipeline.retryFromStep(plan, imageFile, index);
    if (result?.status === "completed") {
      setPhase("results");
    }
  }, [plan, imageFile, pipeline]);

  const handleUseResult = useCallback(() => {
    if (!finalResultUrl) return;
    onProcess(finalResultUrl, undefined, execution?.totalCost ?? 0);
  }, [finalResultUrl, execution, onProcess]);

  const handleReset = useCallback(() => {
    pipeline.reset();
    setPhase("input");
    setDescription("");
    setStartTime(null);
    setElapsed(0);
    setImageAnalysis(null);
    setEditedPlan(null);
    setShowAddStep(false);
  }, [pipeline]);

  // ----- Plan editing helpers -----

  /** Get or create the editable plan copy */
  const getEditablePlan = useCallback((): AgentPlan | null => {
    if (editedPlan) return editedPlan;
    if (!rawPlan) return null;
    // Deep clone the raw plan for editing
    return JSON.parse(JSON.stringify(rawPlan)) as AgentPlan;
  }, [editedPlan, rawPlan]);

  const recalcPlanCost = (p: AgentPlan): AgentPlan => {
    p.totalEstimatedCost = p.steps.reduce((sum, s) => sum + s.estimatedCost, 0);
    return p;
  };

  const handleRemoveStep = useCallback((index: number) => {
    const p = getEditablePlan();
    if (!p || p.steps.length <= 1) return; // Don't allow empty plan
    p.steps.splice(index, 1);
    setEditedPlan(recalcPlanCost({ ...p, steps: [...p.steps] }));
  }, [getEditablePlan]);

  const handleMoveStep = useCallback((index: number, direction: "up" | "down") => {
    const p = getEditablePlan();
    if (!p) return;
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= p.steps.length) return;
    const steps = [...p.steps];
    [steps[index], steps[newIndex]] = [steps[newIndex], steps[index]];
    setEditedPlan({ ...p, steps });
  }, [getEditablePlan]);

  const handleAddStep = useCallback((module: AgentModule) => {
    const p = getEditablePlan();
    if (!p) return;
    const tmpl = ADDABLE_MODULES.find((m) => m.module === module);
    if (!tmpl) return;
    const newStep: PipelineStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      module,
      label: tmpl.label,
      params: {},
      estimatedCost: tmpl.cost,
      reasoning: "Paso agregado manualmente.",
    };
    p.steps.push(newStep);
    setEditedPlan(recalcPlanCost({ ...p, steps: [...p.steps] }));
    setShowAddStep(false);
  }, [getEditablePlan]);

  // ----- Section header -----
  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
      {children}
    </p>
  );

  /* ================================================================== */
  /*  PHASE 1 — INPUT                                                    */
  /* ================================================================== */

  if (phase === "input") {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent-light" />
          <h2 className="text-sm font-bold text-white">AI Agent</h2>
          <Badge variant="default" size="sm">Auto</Badge>
        </div>
        <p className="text-[11px] text-gray-500">
          Selecciona un agente y sube tu imagen. La IA planifica y ejecuta todo automaticamente.
        </p>

        {/* Agent tabs */}
        <SectionLabel>Agente</SectionLabel>
        <div className="grid grid-cols-3 gap-1.5">
          {AGENTS.map((a) => (
            <button
              key={a.type}
              type="button"
              onClick={() => setAgentType(a.type)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-center transition-all",
                agentType === a.type
                  ? "border-accent bg-accent/10 text-accent-light"
                  : "border-surface-lighter bg-surface-light text-gray-400 hover:border-surface-hover",
              )}
            >
              {a.icon}
              <span className="text-[10px] font-semibold">{a.label}</span>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-gray-500">
          {AGENTS.find((a) => a.type === agentType)?.desc}
        </p>

        {/* Product category */}
        <SectionLabel>Categoria de Producto</SectionLabel>
        <Select
          value={category}
          onValueChange={(v) => setCategory(v as ProductCategory)}
          options={CATEGORY_OPTIONS}
        />

        {/* Social content type */}
        {agentType === "social" && (
          <>
            <SectionLabel>Tipo de Contenido</SectionLabel>
            <Select
              value={contentType}
              onValueChange={(v) => setContentType(v as SocialContentType)}
              options={CONTENT_TYPE_OPTIONS}
            />
          </>
        )}

        {/* Modelo preferences */}
        {agentType === "modelo" && (
          <>
            <SectionLabel>Modelo IA</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={gender}
                onValueChange={setGender}
                options={GENDER_OPTIONS}
                label="Genero"
              />
              <Select
                value={ageRange}
                onValueChange={setAgeRange}
                options={AGE_OPTIONS}
                label="Edad"
              />
              <Select
                value={skinTone}
                onValueChange={setSkinTone}
                options={SKIN_TONE_OPTIONS}
                label="Tono de piel"
              />
              <Select
                value={bodyType}
                onValueChange={setBodyType}
                options={BODY_TYPE_OPTIONS}
                label="Cuerpo"
              />
            </div>
            <Select
              value={pose}
              onValueChange={setPose}
              options={POSE_OPTIONS}
              label="Pose"
            />
          </>
        )}

        {/* Description */}
        <SectionLabel>Descripcion (opcional)</SectionLabel>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={
            agentType === "ecommerce"
              ? "Ej: Brasier encaje negro, tienda online Unistyles"
              : agentType === "modelo"
                ? "Ej: Modelo latina, ambiente de playa tropical"
                : "Ej: Promo de San Valentin, reel de 15 segundos"
          }
          className="h-16 w-full resize-none rounded-lg border border-surface-lighter bg-surface-light px-3 py-2 text-xs text-gray-200 placeholder:text-gray-600 focus:border-accent/50 focus:outline-none"
        />

        {/* Budget */}
        <SectionLabel>Presupuesto</SectionLabel>
        <div className="space-y-1.5">
          {BUDGET_OPTIONS.map((b) => (
            <button
              key={b.value}
              type="button"
              onClick={() => setBudget(b.value)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-all",
                budget === b.value
                  ? "border-accent bg-accent/10"
                  : "border-surface-lighter bg-surface-light hover:border-surface-hover",
              )}
            >
              <div>
                <span className={cn(
                  "text-xs font-semibold",
                  budget === b.value ? "text-accent-light" : "text-gray-300",
                )}>
                  {b.label}
                </span>
                <p className="text-[10px] text-gray-500">{b.desc}</p>
              </div>
              {budget === b.value && <Check className="h-3.5 w-3.5 text-accent-light" />}
            </button>
          ))}
        </div>

        {/* Free tier warning */}
        {budget === "free" && FREE_TIER_WARNINGS[agentType] && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5">
            <Info className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-300 leading-relaxed">
              {FREE_TIER_WARNINGS[agentType]}
            </p>
          </div>
        )}

        {/* Image preview + analysis */}
        {imageFile && (
          <div className="space-y-1.5">
            <SectionLabel>Imagen a Procesar</SectionLabel>
            <div className="relative overflow-hidden rounded-lg border border-surface-lighter">
              <img
                src={URL.createObjectURL(imageFile)}
                alt="Imagen seleccionada"
                className="w-full aspect-[4/3] object-contain bg-black/20"
              />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                <p className="text-[9px] text-gray-300 truncate">{imageFile.name}</p>
                <p className="text-[9px] text-gray-500">
                  {imageAnalysis
                    ? `${imageAnalysis.width}x${imageAnalysis.height} · ${imageAnalysis.format.toUpperCase()} · ${imageAnalysis.aspectRatio}`
                    : `${(imageFile.size / 1024).toFixed(0)}KB`}
                </p>
              </div>
              {/* Analysis spinner overlay */}
              {isAnalyzing && (
                <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/60 rounded-full px-2 py-1">
                  <Loader2 className="h-3 w-3 animate-spin text-accent-light" />
                  <span className="text-[9px] text-gray-300">Analizando...</span>
                </div>
              )}
            </div>

            {/* Analysis results */}
            {imageAnalysis && (
              <div className="space-y-1.5">
                {/* Warnings (watermark, bad lighting, low res, etc.) */}
                {imageAnalysis.warnings.length > 0 && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertCircle className="h-3 w-3 text-amber-400 shrink-0" />
                      <span className="text-[10px] font-semibold text-amber-300">
                        Problemas detectados ({imageAnalysis.warnings.length})
                      </span>
                    </div>
                    <ul className="space-y-0.5 pl-4">
                      {imageAnalysis.warnings.map((w, i) => (
                        <li key={i} className="text-[9px] text-amber-200/80 list-disc">{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Quick info chips */}
                <div className="flex flex-wrap gap-1">
                  {imageAnalysis.hasWatermark && (
                    <span className="text-[8px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded border border-red-500/30">
                      Marca de agua
                    </span>
                  )}
                  {imageAnalysis.isLowResolution && (
                    <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                      Baja resolucion
                    </span>
                  )}
                  {imageAnalysis.lightingQuality !== "good" && (
                    <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                      {imageAnalysis.lightingQuality === "dark" ? "Oscura" :
                       imageAnalysis.lightingQuality === "overexposed" ? "Sobreexpuesta" : "Luz desigual"}
                    </span>
                  )}
                  {imageAnalysis.backgroundType === "white" && (
                    <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      Fondo blanco
                    </span>
                  )}
                  {imageAnalysis.backgroundType === "transparent" && (
                    <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      Transparente
                    </span>
                  )}
                  {imageAnalysis.backgroundType === "complex" && (
                    <span className="text-[8px] bg-gray-500/20 text-gray-300 px-1.5 py-0.5 rounded border border-gray-500/30">
                      Fondo complejo
                    </span>
                  )}
                  {imageAnalysis.warnings.length === 0 && imageAnalysis.lightingQuality === "good" && (
                    <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      Imagen lista
                    </span>
                  )}
                </div>

                {/* Budget recommendation */}
                {imageAnalysis.minBudgetNeeded !== "free" && budget === "free" && (
                  <div className="flex items-start gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2">
                    <Info className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-amber-200/80">
                      Esta imagen necesita minimo presupuesto <strong className="text-amber-300">
                      {imageAnalysis.minBudgetNeeded === "economic" ? "Economico" : "Premium"}</strong> para
                      {imageAnalysis.hasWatermark ? " remover marca de agua" :
                       imageAnalysis.isLowResolution ? " escalar resolucion" : " procesamiento optimo"}.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Error card */}
        {errorMsg && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
            <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300 flex-1">{errorMsg}</p>
            <button type="button" onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-300 text-xs shrink-0">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Create plan button */}
        <Button
          variant="primary"
          size="sm"
          className="w-full"
          leftIcon={<Sparkles className="h-3.5 w-3.5" />}
          onClick={handleCreatePlan}
          loading={isPlanning || isAnalyzing}
          disabled={!imageFile || isPlanning || isAnalyzing}
        >
          {isAnalyzing ? "Analizando imagen..." : isPlanning ? "Planificando..." : "Crear Plan IA"}
        </Button>

        {!imageFile && (
          <p className="text-center text-[10px] text-amber-400/80">
            Sube una imagen primero para crear el plan
          </p>
        )}
      </div>
    );
  }

  /* ================================================================== */
  /*  PHASE 2 — REVIEW PLAN                                              */
  /* ================================================================== */

  if (phase === "plan" && plan) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent-light" />
            <h2 className="text-sm font-bold text-white">{plan.name}</h2>
          </div>
          <Badge variant={planMethod === "ai" ? "default" : "info"} size="sm">
            {planMethod === "ai" ? "Claude IA" : "Template"}
          </Badge>
        </div>
        <p className="text-[11px] text-gray-400">{plan.description}</p>

        {/* Steps (editable) */}
        <SectionLabel>Pipeline ({plan.steps.length} pasos) — editable</SectionLabel>
        <div className="space-y-2">
          {plan.steps.map((step, i) => (
            <div
              key={step.id}
              className="rounded-lg border border-surface-lighter bg-surface-light p-2.5"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 text-[10px] font-bold text-accent-light shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm shrink-0">{MODULE_ICONS[step.module] ?? "⚙️"}</span>
                <span className="flex-1 text-xs font-medium text-gray-200 truncate">
                  {step.label}
                </span>
                {step.estimatedCost > 0 && (
                  <span className="text-[10px] tabular-nums text-emerald-400 shrink-0">
                    ${step.estimatedCost.toFixed(3)}
                  </span>
                )}
                {step.estimatedCost === 0 && (
                  <Badge variant="success" size="sm">Gratis</Badge>
                )}
              </div>
              <p className="mt-1 text-[10px] text-gray-500 pl-7">{step.reasoning}</p>
              {/* Edit controls */}
              <div className="flex items-center gap-1 mt-1.5 pl-7">
                <button
                  type="button"
                  onClick={() => handleMoveStep(i, "up")}
                  disabled={i === 0}
                  className="p-0.5 rounded text-gray-500 hover:text-gray-300 hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Mover arriba"
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveStep(i, "down")}
                  disabled={i === plan.steps.length - 1}
                  className="p-0.5 rounded text-gray-500 hover:text-gray-300 hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Mover abajo"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveStep(i)}
                  disabled={plan.steps.length <= 1}
                  className="p-0.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed ml-auto"
                  title="Eliminar paso"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}

          {/* Add step button */}
          {!showAddStep ? (
            <button
              type="button"
              onClick={() => setShowAddStep(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-surface-lighter bg-surface-light/50 py-2 text-[10px] text-gray-500 hover:border-accent/40 hover:text-accent-light transition-colors"
            >
              <Plus className="h-3 w-3" />
              Agregar paso
            </button>
          ) : (
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-accent-light">Agregar Paso</span>
                <button type="button" onClick={() => setShowAddStep(false)} className="text-gray-500 hover:text-gray-300">
                  <X className="h-3 w-3" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1">
                {ADDABLE_MODULES.map((m) => (
                  <button
                    key={m.module}
                    type="button"
                    onClick={() => handleAddStep(m.module)}
                    className="flex items-center gap-1.5 rounded border border-surface-lighter bg-surface-light px-2 py-1.5 text-left hover:border-accent/40 transition-colors"
                  >
                    <span className="text-xs shrink-0">{MODULE_ICONS[m.module] ?? "⚙️"}</span>
                    <div className="min-w-0">
                      <p className="text-[9px] text-gray-300 truncate">{m.label}</p>
                      <p className="text-[8px] text-gray-500">
                        {m.cost > 0 ? `$${m.cost.toFixed(3)}` : "Gratis"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="flex items-center justify-between rounded-lg border border-surface-lighter bg-surface-light px-3 py-2">
          <div className="flex items-center gap-2">
            <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400">
              ${plan.totalEstimatedCost.toFixed(3)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-[10px] text-gray-500">{plan.estimatedDuration}</span>
          </div>
        </div>

        {/* Cost confirmation dialog */}
        {showCostConfirm && plan.totalEstimatedCost > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-semibold text-amber-300">Confirmar Costo</span>
            </div>
            <div className="space-y-1">
              {plan.steps.filter(s => s.estimatedCost > 0).map((step) => (
                <div key={step.id} className="flex items-center justify-between text-[10px]">
                  <span className="text-gray-300">{MODULE_ICONS[step.module]} {step.label}</span>
                  <span className="text-amber-300 tabular-nums">${step.estimatedCost.toFixed(3)}</span>
                </div>
              ))}
              <div className="border-t border-amber-500/20 pt-1 flex items-center justify-between text-xs font-semibold">
                <span className="text-amber-200">Total estimado</span>
                <span className="text-amber-200">${plan.totalEstimatedCost.toFixed(3)}</span>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setShowCostConfirm(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                leftIcon={<Play className="h-3.5 w-3.5" />}
                onClick={handleExecute}
              >
                Confirmar y Ejecutar
              </Button>
            </div>
          </div>
        )}

        {/* Actions */}
        {!showCostConfirm && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
              onClick={() => { setPhase("input"); setEditedPlan(null); setShowAddStep(false); }}
            >
              Regenerar
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              leftIcon={<Play className="h-3.5 w-3.5" />}
              onClick={handleExecute}
              disabled={!imageFile}
            >
              Ejecutar{plan.totalEstimatedCost > 0 ? ` ($${plan.totalEstimatedCost.toFixed(2)})` : ""}
            </Button>
          </div>
        )}
      </div>
    );
  }

  /* ================================================================== */
  /*  PHASE 3 — EXECUTING                                                */
  /* ================================================================== */

  if ((phase === "executing" || (phase === "results" && execution?.status === "failed")) && execution && plan) {
    const failedIndex = execution.steps.findIndex((s) => s.status === "failed");

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {execution.status === "running" && <Loader2 className="h-4 w-4 animate-spin text-accent-light" />}
            {execution.status === "completed" && <Check className="h-4 w-4 text-emerald-400" />}
            {execution.status === "failed" && <AlertCircle className="h-4 w-4 text-red-400" />}
            <h2 className="text-sm font-bold text-white">
              {execution.status === "running" ? "Ejecutando..." : execution.status === "completed" ? "Completado" : "Error"}
            </h2>
          </div>
          {execution.status === "running" && (
            <Button variant="outline" size="sm" onClick={pipeline.cancel}>
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Progress bar */}
        <Progress value={progress} size="sm" label={`${progress}%`} showPercentage />

        {/* Time + Cost */}
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-gray-500">
            <Clock className="mr-1 inline h-3 w-3" />
            {elapsed}s
          </span>
          <span className="text-emerald-400">
            <DollarSign className="mr-0.5 inline h-3 w-3" />
            ${execution.totalCost.toFixed(3)}
          </span>
        </div>

        {/* Step list — each step shows full-width result preview */}
        <div className="space-y-2">
          {plan.steps.map((step, i) => {
            const stepExec = execution.steps[i];
            const isRunning = stepExec.status === "running";
            const isCompleted = stepExec.status === "completed";
            const isFailed = stepExec.status === "failed";

            return (
              <div
                key={step.id}
                className={cn(
                  "rounded-lg border overflow-hidden transition-all",
                  isRunning ? "border-accent/50 bg-accent/5" :
                  isCompleted ? "border-emerald-500/30 bg-emerald-500/5" :
                  isFailed ? "border-red-500/30 bg-red-500/5" :
                  "border-surface-lighter bg-surface-light opacity-50",
                )}
              >
                {/* Step header row */}
                <div className="flex items-center gap-2 px-2.5 py-2">
                  {/* Status icon */}
                  {isRunning && <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-light shrink-0" />}
                  {isCompleted && <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                  {isFailed && <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />}
                  {stepExec.status === "pending" && (
                    <span className="flex h-3.5 w-3.5 items-center justify-center text-[9px] text-gray-600 shrink-0">
                      {i + 1}
                    </span>
                  )}

                  {/* Icon + Label */}
                  <span className="text-sm shrink-0">{MODULE_ICONS[step.module] ?? "⚙️"}</span>
                  <span className="flex-1 text-[11px] text-gray-300 truncate">{step.label}</span>

                  {/* Cost */}
                  {isCompleted && stepExec.actualCost > 0 && (
                    <span className="text-[9px] tabular-nums text-emerald-400 shrink-0">
                      ${stepExec.actualCost.toFixed(3)}
                    </span>
                  )}
                  {isCompleted && stepExec.actualCost === 0 && (
                    <span className="text-[9px] text-emerald-400/60 shrink-0">Gratis</span>
                  )}
                </div>

                {/* RESULT PREVIEW — large, visible, the whole point */}
                {isCompleted && stepExec.resultUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewStepUrl(stepExec.resultUrl);
                      setPreviewStepLabel(step.label);
                    }}
                    className="relative w-full group cursor-pointer"
                  >
                    <img
                      src={stepExec.resultUrl}
                      alt={step.label}
                      className="w-full aspect-[16/10] object-contain bg-black/30 border-t border-surface-lighter"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                      <ZoomIn className="h-5 w-5 text-white" />
                    </div>
                    <div className="absolute bottom-1 right-1">
                      <span className="text-[8px] bg-black/60 text-gray-300 px-1.5 py-0.5 rounded">
                        Paso {i + 1} de {plan.steps.length}
                      </span>
                    </div>
                  </button>
                )}

                {/* Running animation */}
                {isRunning && (
                  <div className="flex items-center justify-center py-6 border-t border-accent/20">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-accent-light" />
                      <span className="text-[10px] text-accent-light animate-pulse">
                        Procesando {step.label.toLowerCase()}...
                      </span>
                    </div>
                  </div>
                )}

                {/* Failed message */}
                {isFailed && stepExec.error && (
                  <div className="px-2.5 pb-2">
                    <p className="text-[10px] text-red-400">{stepExec.error}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Step preview modal overlay */}
        {previewStepUrl && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setPreviewStepUrl(null)}
          >
            <div className="relative max-w-2xl w-full max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-3 py-2 bg-surface rounded-t-xl border border-surface-lighter">
                <span className="text-xs font-medium text-gray-200">{previewStepLabel}</span>
                <button
                  type="button"
                  onClick={() => setPreviewStepUrl(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <img
                src={previewStepUrl}
                alt={previewStepLabel}
                className="w-full max-h-[75vh] object-contain bg-black rounded-b-xl border-x border-b border-surface-lighter"
              />
            </div>
          </div>
        )}

        {/* Failed step error + retry */}
        {failedIndex >= 0 && (
          <div className="space-y-2">
            <p className="text-[10px] text-red-400">
              {execution.steps[failedIndex].error}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleReset}
              >
                Nuevo Plan
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                onClick={() => handleRetry(failedIndex)}
              >
                Reintentar
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ================================================================== */
  /*  PHASE 4 — RESULTS                                                  */
  /* ================================================================== */

  if (phase === "results" && execution && plan) {
    const completedSteps = execution.steps.filter((s) => s.status === "completed" && s.resultUrl);

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Check className="h-5 w-5 text-emerald-400" />
          <h2 className="text-sm font-bold text-white">Resultado Listo</h2>
        </div>

        {/* Summary */}
        <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
          <div className="flex items-center gap-2">
            <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400">
              ${execution.totalCost.toFixed(3)}
            </span>
          </div>
          <span className="text-[10px] text-gray-500">
            {plan.steps.length} pasos en {elapsed}s
          </span>
        </div>

        {/* Results gallery */}
        <SectionLabel>Resultados por Paso</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          {completedSteps.map((stepExec, i) => {
            const stepDef = plan.steps.find((s) => s.id === stepExec.stepId);
            return (
              <div
                key={stepExec.stepId}
                className="group relative overflow-hidden rounded-lg border border-surface-lighter"
              >
                <img
                  src={stepExec.resultUrl!}
                  alt={stepDef?.label ?? `Paso ${i + 1}`}
                  className="aspect-square w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                  <p className="text-[9px] font-medium text-white truncate">
                    {stepDef?.label ?? `Paso ${i + 1}`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Final result large */}
        {finalResultUrl && (
          <>
            <SectionLabel>Resultado Final</SectionLabel>
            <div className="overflow-hidden rounded-xl border border-accent/30">
              <img
                src={finalResultUrl}
                alt="Resultado final"
                className="w-full object-contain"
              />
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              leftIcon={<ImageIcon className="h-3.5 w-3.5" />}
              onClick={handleUseResult}
              disabled={!finalResultUrl}
            >
              Usar en Editor
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="h-3.5 w-3.5" />}
              disabled={!finalResultUrl}
              onClick={() => {
                if (!finalResultUrl) return;
                const a = document.createElement("a");
                a.href = finalResultUrl;
                a.download = `unistudio-agent-${Date.now()}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }}
            >
              Descargar
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            onClick={handleReset}
          >
            Nuevo Plan
          </Button>
        </div>
      </div>
    );
  }

  /* ================================================================== */
  /*  Fallback (shouldn't reach here)                                    */
  /* ================================================================== */

  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <Sparkles className="h-8 w-8 text-gray-600" />
      <p className="text-xs text-gray-500">Cargando agente...</p>
      <Button variant="outline" size="sm" onClick={handleReset}>
        Reiniciar
      </Button>
    </div>
  );
}

export default AiAgentPanel;
