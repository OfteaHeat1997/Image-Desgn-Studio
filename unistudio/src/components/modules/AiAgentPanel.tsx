"use client";

import React, { useState, useCallback, useMemo } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils/cn";
import { useAgentPipeline } from "@/hooks/useAgentPipeline";
import type {
  AgentType,
  ProductCategory,
  BudgetTier,
  SocialContentType,
  AgentPlanRequest,
  PipelineStep,
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

  // Pipeline hook
  const pipeline = useAgentPipeline();
  const { plan, planMethod, execution, isPlanning } = pipeline;

  // Elapsed time tracking
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

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
  }, [agentType, description, category, budget, contentType, gender, skinTone, bodyType, pose, ageRange, pipeline]);

  const handleExecute = useCallback(async () => {
    if (!plan || !imageFile) return;
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
  }, [plan, imageFile, pipeline]);

  const handleRetry = useCallback(async (index: number) => {
    if (!plan || !imageFile) return;
    setPhase("executing");
    await pipeline.retryFromStep(plan, imageFile, index);
    if (execution?.status === "completed") {
      setPhase("results");
    }
  }, [plan, imageFile, pipeline, execution]);

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
  }, [pipeline]);

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
          loading={isPlanning}
          disabled={!imageFile || isPlanning}
        >
          {isPlanning ? "Planificando..." : "Crear Plan IA"}
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

        {/* Steps */}
        <SectionLabel>Pipeline ({plan.steps.length} pasos)</SectionLabel>
        <div className="space-y-2">
          {plan.steps.map((step, i) => (
            <div
              key={step.id}
              className="rounded-lg border border-surface-lighter bg-surface-light p-2.5"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 text-[10px] font-bold text-accent-light">
                  {i + 1}
                </span>
                <span className="text-sm">{MODULE_ICONS[step.module] ?? "⚙️"}</span>
                <span className="flex-1 text-xs font-medium text-gray-200">
                  {step.label}
                </span>
                {step.estimatedCost > 0 && (
                  <span className="text-[10px] tabular-nums text-emerald-400">
                    ${step.estimatedCost.toFixed(3)}
                  </span>
                )}
                {step.estimatedCost === 0 && (
                  <Badge variant="success" size="sm">Gratis</Badge>
                )}
              </div>
              <p className="mt-1 text-[10px] text-gray-500 pl-7">{step.reasoning}</p>
            </div>
          ))}
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

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            onClick={() => setPhase("input")}
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
            Ejecutar
          </Button>
        </div>
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

        {/* Step list */}
        <div className="space-y-1.5">
          {plan.steps.map((step, i) => {
            const stepExec = execution.steps[i];
            const isRunning = stepExec.status === "running";
            const isCompleted = stepExec.status === "completed";
            const isFailed = stepExec.status === "failed";

            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-all",
                  isRunning ? "border-accent/50 bg-accent/5" :
                  isCompleted ? "border-emerald-500/30 bg-emerald-500/5" :
                  isFailed ? "border-red-500/30 bg-red-500/5" :
                  "border-surface-lighter bg-surface-light opacity-50",
                )}
              >
                {/* Status icon */}
                {isRunning && <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-light shrink-0" />}
                {isCompleted && <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                {isFailed && <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />}
                {stepExec.status === "pending" && (
                  <span className="flex h-3.5 w-3.5 items-center justify-center text-[9px] text-gray-600 shrink-0">
                    {i + 1}
                  </span>
                )}

                {/* Label */}
                <span className="flex-1 text-[11px] text-gray-300 truncate">{step.label}</span>

                {/* Thumbnail for completed */}
                {isCompleted && stepExec.resultUrl && (
                  <img
                    src={stepExec.resultUrl}
                    alt=""
                    className="h-6 w-6 rounded border border-surface-lighter object-cover shrink-0"
                  />
                )}

                {/* Cost */}
                {isCompleted && stepExec.actualCost > 0 && (
                  <span className="text-[9px] tabular-nums text-emerald-400 shrink-0">
                    ${stepExec.actualCost.toFixed(3)}
                  </span>
                )}
              </div>
            );
          })}
        </div>

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
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            onClick={handleReset}
          >
            Nuevo Plan
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            leftIcon={<ImageIcon className="h-3.5 w-3.5" />}
            onClick={handleUseResult}
            disabled={!finalResultUrl}
          >
            Usar Resultado
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
