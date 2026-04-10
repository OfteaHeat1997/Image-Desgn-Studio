"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Bot,
  Send,
  ImagePlus,
  ShoppingBag,
  User as UserIcon,
  Share2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  RotateCcw,
  Download,
  Upload,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils/cn";
import { useAgentPipeline } from "@/hooks/useAgentPipeline";
import type { AgentType, ProductCategory, BudgetTier } from "@/types/agent";

/* ================================================================== */
/*  Chat message type                                                    */
/* ================================================================== */

interface ChatMsg {
  id: string;
  role: "user" | "agent";
  text?: string;
  imageUrl?: string;
  fileName?: string;
  /** Which interactive widget to render inside this bubble */
  widget?: "welcome" | "config" | "plan" | "progress" | "result";
  ts: number;
}

/* ================================================================== */
/*  Constants                                                            */
/* ================================================================== */

const AGENTS: {
  type: AgentType;
  label: string;
  desc: string;
  icon: React.ElementType;
}[] = [
  {
    type: "ecommerce",
    label: "E-Commerce",
    desc: "Foto profesional para tienda",
    icon: ShoppingBag,
  },
  {
    type: "modelo",
    label: "Modelo IA",
    desc: "Modelos vistiendo tu prenda",
    icon: UserIcon,
  },
  {
    type: "social",
    label: "Redes Sociales",
    desc: "Videos y anuncios",
    icon: Share2,
  },
];

const CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: "lingerie", label: "Lenceria" },
  { value: "perfume", label: "Perfumes" },
  { value: "earrings", label: "Aretes" },
  { value: "rings", label: "Anillos" },
  { value: "necklace", label: "Collares" },
  { value: "bracelet", label: "Pulseras" },
  { value: "watch", label: "Relojes" },
  { value: "sunglasses", label: "Lentes" },
  { value: "general", label: "Otro" },
];

let _msgCounter = 0;
function nextId() {
  return `chat-${++_msgCounter}-${Date.now()}`;
}

/* ================================================================== */
/*  AgentChat Component                                                  */
/* ================================================================== */

export function AgentChat() {
  /* ── State ─────────────────────────────────────────────────────── */
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: nextId(),
      role: "agent",
      text: "Hola! Soy tu asistente de fotografia con IA. Sube una imagen de producto y la transformo en foto profesional automaticamente.",
      widget: "welcome",
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentType>("ecommerce");
  const [selectedCategory, setSelectedCategory] =
    useState<ProductCategory>("general");
  const [budget] = useState<BudgetTier>("economic");
  const [phase, setPhase] = useState<
    "idle" | "uploaded" | "planning" | "reviewing" | "executing" | "done"
  >("idle");
  const [isDragging, setIsDragging] = useState(false);

  const pipeline = useAgentPipeline();

  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const msgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup blob URL and pending timer on unmount
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      if (msgTimerRef.current !== null) clearTimeout(msgTimerRef.current);
    };
  }, []);

  /* ── Auto-scroll on new messages / execution updates ───────── */
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pipeline.execution?.currentStepIndex, phase]);

  /* ── Helpers ───────────────────────────────────────────────── */
  const addMsg = useCallback(
    (partial: Omit<ChatMsg, "id" | "ts">) => {
      setMessages((prev) => [
        ...prev,
        { ...partial, id: nextId(), ts: Date.now() },
      ]);
    },
    [],
  );

  /* ── Upload Image ──────────────────────────────────────────── */
  const handleImage = useCallback(
    (file: File) => {
      // Revoke previous blob URL before creating a new one
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      const url = URL.createObjectURL(file);
      previewUrlRef.current = url;
      setImageFile(file);
      setImagePreview(url);
      setPhase("uploaded");

      addMsg({ role: "user", imageUrl: url, fileName: file.name });

      if (msgTimerRef.current !== null) clearTimeout(msgTimerRef.current);
      msgTimerRef.current = setTimeout(() => {
        addMsg({
          role: "agent",
          text: "Imagen recibida! Elige tu agente, tipo de producto, y haz click en Crear Plan.",
          widget: "config",
        });
      }, 400);
    },
    [addMsg],
  );

  /* ── Plan + Auto-Execute in one click ─────────────────────── */
  const handlePlanAndExecute = useCallback(async () => {
    if (!imageFile) return;

    // Step 1: Create plan
    setPhase("planning");
    addMsg({ role: "agent", text: "Analizando imagen y creando plan..." });

    let plan;
    try {
      plan = await pipeline.requestPlan({
        agentType: selectedAgent,
        description: input,
        productCategory: selectedCategory,
        imageCount: 1,
        budget,
      });
    } catch (err) {
      setMessages((prev) => prev.slice(0, -1));
      addMsg({
        role: "agent",
        text: `Error al crear plan: ${err instanceof Error ? err.message : "Intenta de nuevo."}`,
      });
      setPhase("uploaded");
      return;
    }

    // Step 2: Show plan and immediately start executing
    setMessages((prev) => {
      const filtered = prev.slice(0, -1);
      return [
        ...filtered,
        {
          id: nextId(),
          role: "agent" as const,
          text: `Plan: ${plan.steps.length} pasos · $${plan.totalEstimatedCost.toFixed(2)} estimado. Ejecutando automaticamente...`,
          widget: "plan" as const,
          ts: Date.now(),
        },
      ];
    });

    // Step 3: Execute automatically
    setPhase("executing");
    addMsg({
      role: "agent",
      text: "Procesando tu imagen paso a paso:",
      widget: "progress",
    });

    const result = await pipeline.execute(plan, imageFile);

    if (result.status === "completed") {
      setPhase("done");
      addMsg({
        role: "agent",
        text: `Listo! Tu imagen esta procesada. Costo total: $${result.totalCost.toFixed(2)}`,
        widget: "result",
      });
    } else {
      const failedStep = result.steps.find((s) => s.status === "failed");
      addMsg({
        role: "agent",
        text: `Error en paso: ${failedStep?.error || "desconocido"}. Puedes reintentar.`,
      });
      setPhase("reviewing");
    }
  }, [imageFile, selectedAgent, selectedCategory, budget, input, pipeline, addMsg]);

  /* ── Execute only (for retry/manual) ────────────────────── */
  const handleExecute = useCallback(async () => {
    if (!pipeline.plan || !imageFile) return;

    setPhase("executing");
    addMsg({
      role: "agent",
      text: "Ejecutando pipeline...",
      widget: "progress",
    });

    const result = await pipeline.execute(pipeline.plan, imageFile);

    if (result.status === "completed") {
      setPhase("done");
      addMsg({
        role: "agent",
        text: `Listo! Costo total: $${result.totalCost.toFixed(2)}`,
        widget: "result",
      });
    } else {
      addMsg({
        role: "agent",
        text: "Error en un paso. Puedes reintentar desde el paso fallido.",
      });
    }
  }, [pipeline, imageFile, addMsg]);

  /* ── Retry Failed Step ─────────────────────────────────────── */
  const handleRetry = useCallback(
    async (index: number) => {
      if (!pipeline.plan || !imageFile) return;
      setPhase("executing");

      const result = await pipeline.retryFromStep(
        pipeline.plan,
        imageFile,
        index,
      );

      if (result?.status === "completed") {
        setPhase("done");
        addMsg({
          role: "agent",
          text: `Completado! Costo: $${result.totalCost.toFixed(2)}`,
          widget: "result",
        });
      }
    },
    [pipeline, imageFile, addMsg],
  );

  /* ── Reset Session ─────────────────────────────────────────── */
  const handleReset = useCallback(() => {
    pipeline.reset();
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setImageFile(null);
    setImagePreview(null);
    setSelectedAgent("ecommerce");
    setSelectedCategory("general");
    setPhase("idle");
    setInput("");
    setMessages([
      {
        id: nextId(),
        role: "agent",
        text: "Nueva sesion! Sube una imagen para empezar.",
        widget: "welcome",
        ts: Date.now(),
      },
    ]);
  }, [pipeline, imagePreview]);

  /* ── Send Text ─────────────────────────────────────────────── */
  const handleSend = useCallback(() => {
    if (!input.trim()) return;

    addMsg({ role: "user", text: input.trim() });

    if (phase === "idle") {
      setTimeout(() => {
        addMsg({
          role: "agent",
          text: "Para empezar, sube una imagen de producto. Arrastrala al chat o haz click en el icono de imagen.",
        });
      }, 300);
    }

    setInput("");
  }, [input, phase, addMsg]);

  /* ── Download Result ───────────────────────────────────────── */
  const handleDownload = useCallback(() => {
    const url = pipeline.execution?.steps
      .filter((s) => s.status === "completed" && s.resultUrl)
      .pop()?.resultUrl;
    if (!url) return;

    const a = document.createElement("a");
    a.href = url;
    a.download = "unistudio-result.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [pipeline.execution]);

  /* ── Derived ───────────────────────────────────────────────── */
  const finalUrl = pipeline.execution?.steps
    .filter((s) => s.status === "completed" && s.resultUrl)
    .pop()?.resultUrl;

  const executionProgress = pipeline.execution
    ? Math.round(
        (pipeline.execution.steps.filter((s) => s.status === "completed")
          .length /
          pipeline.execution.steps.length) *
          100,
      )
    : 0;

  /* ================================================================ */
  /*  Render                                                            */
  /* ================================================================ */

  return (
    <section className="mb-16">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{
            background:
              "linear-gradient(135deg, var(--accent), var(--accent-muted))",
            boxShadow: "0 4px 16px var(--accent-dim)",
          }}
        >
          <Bot className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-[22px] font-bold text-heading">AI Agent</h2>
          <p className="text-[12px] text-muted">
            Asistente automatico de fotografia
          </p>
        </div>
        {phase !== "idle" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="ml-auto"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Nuevo
          </Button>
        )}
      </div>

      {/* ── Chat Card ───────────────────────────────────────────── */}
      <div
        className="relative rounded-[20px] overflow-hidden"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
        }}
      >
        {/* ── Messages Area ────────────────────────────────────── */}
        <div
          className={cn(
            "relative h-[500px] overflow-y-auto px-5 py-5 space-y-4",
            isDragging && "ring-2 ring-inset ring-accent/30",
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const f = e.dataTransfer.files[0];
            if (f?.type.startsWith("image/")) handleImage(f);
          }}
        >
          {/* Drag overlay */}
          {isDragging && (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center"
              style={{ background: "rgba(9,9,11,0.85)" }}
            >
              <div className="text-center">
                <Upload className="h-10 w-10 mx-auto mb-3 text-accent" />
                <p className="text-lg font-semibold text-heading">
                  Suelta tu imagen aqui
                </p>
              </div>
            </div>
          )}

          {/* ── Render messages ─────────────────────────────── */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3",
                msg.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              {/* Agent avatar */}
              {msg.role === "agent" && (
                <div className="flex-shrink-0 mt-1">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{
                      background: "var(--accent-dim)",
                      border: "1px solid var(--border-accent)",
                    }}
                  >
                    <Bot className="h-4 w-4 text-accent" />
                  </div>
                </div>
              )}

              {/* Message bubble */}
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl",
                  msg.role === "user"
                    ? "rounded-br-md px-4 py-2.5"
                    : "rounded-bl-md px-4 py-3",
                )}
                style={{
                  background:
                    msg.role === "user"
                      ? "var(--accent-dim)"
                      : "var(--bg-elevated)",
                  border:
                    msg.role === "user"
                      ? "1px solid var(--border-accent)"
                      : "1px solid var(--border-default)",
                }}
              >
                {/* User image */}
                {msg.imageUrl && (
                  <div className="mb-2">
                    <img
                      src={msg.imageUrl}
                      alt=""
                      className="max-h-48 rounded-lg object-contain"
                    />
                    {msg.fileName && (
                      <p className="text-[11px] text-muted mt-1">
                        {msg.fileName}
                      </p>
                    )}
                  </div>
                )}

                {/* Text */}
                {msg.text && (
                  <p
                    className={cn(
                      "text-[14px] leading-relaxed",
                      msg.role === "user" ? "text-accent-light" : "text-body",
                    )}
                  >
                    {msg.text}
                  </p>
                )}

                {/* ── Welcome Widget ───────────────────────── */}
                {msg.widget === "welcome" && (
                  <div className="mt-4 space-y-3">
                    <p className="text-[13px] text-muted">
                      Elige un agente o arrastra una imagen para empezar:
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {AGENTS.map((a) => (
                        <button
                          key={a.type}
                          type="button"
                          onClick={() => {
                            setSelectedAgent(a.type);
                            fileRef.current?.click();
                          }}
                          className="flex flex-col items-center gap-2 rounded-xl px-3 py-3 transition-all hover:-translate-y-0.5"
                          style={{
                            background: "var(--bg-surface)",
                            border: "1px solid var(--border-default)",
                          }}
                        >
                          <div
                            className="flex h-9 w-9 items-center justify-center rounded-lg"
                            style={{ background: "var(--accent-dim)" }}
                          >
                            <a.icon className="h-4 w-4 text-accent" />
                          </div>
                          <span className="text-[12px] font-semibold text-heading">
                            {a.label}
                          </span>
                          <span className="text-[10px] text-muted leading-tight text-center">
                            {a.desc}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Config Widget ────────────────────────── */}
                {msg.widget === "config" && (
                  <div className="mt-3 space-y-4">
                    {/* Agent type selector */}
                    <div>
                      <p className="text-[12px] font-medium text-muted mb-2">
                        Agente:
                      </p>
                      <div className="flex gap-2">
                        {AGENTS.map((a) => (
                          <button
                            key={a.type}
                            type="button"
                            onClick={() => setSelectedAgent(a.type)}
                            className={cn(
                              "flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-semibold transition-all",
                              selectedAgent === a.type
                                ? "text-accent"
                                : "text-muted hover:text-body",
                            )}
                            style={{
                              background:
                                selectedAgent === a.type
                                  ? "var(--accent-dim)"
                                  : "var(--bg-surface)",
                              border:
                                selectedAgent === a.type
                                  ? "1px solid var(--border-accent)"
                                  : "1px solid var(--border-default)",
                            }}
                          >
                            <a.icon className="h-3.5 w-3.5" />
                            {a.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Product category pills */}
                    <div>
                      <p className="text-[12px] font-medium text-muted mb-2">
                        Tipo de producto:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {CATEGORIES.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => setSelectedCategory(c.value)}
                            className={cn(
                              "rounded-full px-3 py-1 text-[11px] font-medium transition-all",
                              selectedCategory === c.value
                                ? "text-accent"
                                : "text-muted hover:text-body",
                            )}
                            style={{
                              background:
                                selectedCategory === c.value
                                  ? "var(--accent-dim)"
                                  : "transparent",
                              border:
                                selectedCategory === c.value
                                  ? "1px solid var(--border-accent)"
                                  : "1px solid var(--border-default)",
                            }}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Auto plan + execute */}
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handlePlanAndExecute}
                      loading={phase === "planning" || phase === "executing"}
                      leftIcon={<Sparkles className="h-3.5 w-3.5" />}
                    >
                      {phase === "planning" ? "Analizando..." : phase === "executing" ? "Procesando..." : "Procesar Automaticamente"}
                    </Button>
                  </div>
                )}

                {/* ── Plan Widget ──────────────────────────── */}
                {msg.widget === "plan" && pipeline.plan && (
                  <div className="mt-3 space-y-3">
                    {/* Method badge */}
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          pipeline.planMethod === "ai" ? "info" : "default"
                        }
                        size="sm"
                      >
                        {pipeline.planMethod === "ai"
                          ? "Claude IA"
                          : "Template"}
                      </Badge>
                      <span className="text-[11px] text-muted">
                        {pipeline.plan.estimatedDuration}
                      </span>
                    </div>

                    {/* Steps list */}
                    <div className="space-y-1.5">
                      {pipeline.plan.steps.map((step, i) => (
                        <div
                          key={step.id}
                          className="flex items-center gap-2.5 rounded-lg px-3 py-2"
                          style={{
                            background: "var(--bg-surface)",
                            border: "1px solid var(--border-default)",
                          }}
                        >
                          <span
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                            style={{
                              background: "var(--accent-dim)",
                              color: "var(--accent)",
                            }}
                          >
                            {i + 1}
                          </span>
                          <span className="flex-1 text-[12px] font-medium text-body">
                            {step.label}
                          </span>
                          <span className="text-[11px] tabular-nums text-muted">
                            {step.estimatedCost === 0
                              ? "Gratis"
                              : `$${step.estimatedCost.toFixed(3)}`}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Total cost + action buttons */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-[13px] font-semibold text-emerald-400">
                          ${pipeline.plan.totalEstimatedCost.toFixed(2)}
                        </span>
                      </div>
                      {phase === "reviewing" && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePlanAndExecute}
                          >
                            Regenerar
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={handleExecute}
                            leftIcon={<Sparkles className="h-3.5 w-3.5" />}
                          >
                            Reintentar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Progress Widget ──────────────────────── */}
                {msg.widget === "progress" && pipeline.execution && (
                  <div className="mt-3 space-y-3">
                    {/* Progress bar */}
                    <Progress value={executionProgress} size="sm" />

                    {/* Step status list */}
                    <div className="space-y-1">
                      {pipeline.plan?.steps.map((step, i) => {
                        const exec = pipeline.execution!.steps[i];
                        return (
                          <div
                            key={step.id}
                            className="flex items-center gap-2.5 py-1.5"
                          >
                            {/* Status icon */}
                            {exec.status === "completed" && (
                              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                            )}
                            {exec.status === "running" && (
                              <Loader2 className="h-4 w-4 text-accent animate-spin shrink-0" />
                            )}
                            {exec.status === "failed" && (
                              <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                            )}
                            {exec.status === "pending" && (
                              <div className="h-4 w-4 rounded-full border border-surface-lighter shrink-0" />
                            )}

                            {/* Label */}
                            <span
                              className={cn(
                                "flex-1 text-[12px]",
                                exec.status === "completed"
                                  ? "text-body"
                                  : exec.status === "running"
                                    ? "text-accent font-medium"
                                    : exec.status === "failed"
                                      ? "text-red-400"
                                      : "text-muted",
                              )}
                            >
                              {step.label}
                            </span>

                            {/* Thumbnail for completed */}
                            {exec.status === "completed" && exec.resultUrl && (
                              <img
                                src={exec.resultUrl}
                                alt=""
                                className="h-8 w-8 rounded object-cover"
                              />
                            )}

                            {/* Retry button for failed */}
                            {exec.status === "failed" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRetry(i)}
                                className="text-[10px] h-6 px-2"
                              >
                                Reintentar
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Running cost */}
                    <div className="flex items-center gap-1.5 text-[12px] text-muted">
                      <DollarSign className="h-3 w-3" />
                      <span className="tabular-nums">
                        ${pipeline.execution.totalCost.toFixed(2)}
                      </span>
                      {phase === "executing" && (
                        <Loader2 className="h-3 w-3 animate-spin ml-1" />
                      )}
                    </div>
                  </div>
                )}

                {/* ── Result Widget ────────────────────────── */}
                {msg.widget === "result" && finalUrl && (
                  <div className="mt-3 space-y-3">
                    {/* Final image */}
                    <img
                      src={finalUrl}
                      alt="Resultado final"
                      className="w-full max-h-72 rounded-xl object-contain"
                      style={{ background: "var(--bg-surface)" }}
                    />

                    {/* Step thumbnails */}
                    {pipeline.execution &&
                      pipeline.execution.steps.filter((s) => s.resultUrl)
                        .length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {pipeline.execution.steps
                            .filter((s) => s.resultUrl)
                            .map((s, i) => (
                              <img
                                key={s.stepId}
                                src={s.resultUrl!}
                                alt={`Paso ${i + 1}`}
                                className="h-16 w-16 rounded-lg object-cover shrink-0 border border-surface-lighter"
                              />
                            ))}
                        </div>
                      )}

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1"
                        leftIcon={<Download className="h-3.5 w-3.5" />}
                        onClick={handleDownload}
                      >
                        Descargar
                      </Button>
                      <Link href="/editor?module=ai-agent" className="flex-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          Abrir en Editor
                        </Button>
                      </Link>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReset}
                      className="w-full"
                      leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                    >
                      Procesar otra imagen
                    </Button>
                  </div>
                )}
              </div>

              {/* User avatar */}
              {msg.role === "user" && (
                <div className="flex-shrink-0 mt-1">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{
                      background: "var(--accent-dim)",
                      border: "1px solid var(--border-accent)",
                    }}
                  >
                    <UserIcon className="h-4 w-4 text-accent" />
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Scroll anchor */}
          <div ref={endRef} />
        </div>

        {/* ── Input Bar ─────────────────────────────────────────── */}
        <div
          className="border-t px-5 py-3.5 flex items-center gap-3"
          style={{
            borderColor: "var(--border-default)",
            background: "var(--bg-elevated)",
          }}
        >
          {/* Image upload / preview */}
          {imagePreview ? (
            <div className="relative shrink-0">
              <img
                src={imagePreview}
                alt=""
                className="h-10 w-10 rounded-lg object-cover"
              />
              <div
                className="absolute -top-1 -right-1 rounded-full bg-surface p-0.5"
                style={{ border: "1px solid var(--border-default)" }}
              >
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all hover:bg-white/5"
              style={{ border: "1px solid var(--border-default)" }}
            >
              <ImagePlus className="h-4 w-4 text-muted" />
            </button>
          )}

          {/* Hidden file input */}
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

          {/* Text input */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
            placeholder={
              phase === "idle"
                ? "Describe tu producto o sube una imagen..."
                : "Escribe un mensaje..."
            }
            className="flex-1 bg-transparent text-[14px] text-body placeholder-muted outline-none"
          />

          {/* Send button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSend}
            disabled={!input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
