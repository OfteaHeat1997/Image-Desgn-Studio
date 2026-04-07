"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Scissors,
  ImageIcon,
  Sparkles,
  Sun,
  Eraser,
  Expand,
  Shirt,
  User,
  Box,
  Gem,
  Video,
  Layers,
  Palette,
  CheckSquare,
  PenTool,
  Wand2,
  ArrowRight,
  Zap,
  Camera,
  Upload,
  Megaphone,
  ZoomIn,
  ChevronDown,
} from "lucide-react";

/* ================================================================== */
/*  Types                                                               */
/* ================================================================== */

interface Tool {
  id: string;
  name: string;
  desc: string;
  icon: React.ElementType;
  cost: string;
  free: boolean;
  href: string;
  badge?: string;
}

interface Category {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  tools: Tool[];
}

/* ================================================================== */
/*  Data                                                                */
/* ================================================================== */

const CATEGORIES: Category[] = [
  {
    title: "Prepara tu Foto",
    subtitle: "Limpia, mejora y corrige tu imagen original",
    icon: Scissors,
    color: "#50C878",
    tools: [
      { id: "bg-remove", name: "Quitar Fondo", desc: "Fondo transparente al instante", icon: Scissors, cost: "Gratis", free: true, href: "/editor?module=bg-remove", badge: "Empieza Aqui" },
      { id: "enhance", name: "Mejorar Calidad", desc: "Brillo, contraste y nitidez", icon: Sparkles, cost: "Gratis", free: true, href: "/editor?module=enhance" },
      { id: "upscale", name: "Aumentar Resolucion", desc: "Escala 2x o 4x con IA", icon: ZoomIn, cost: "$0.02", free: false, href: "/editor?module=upscale" },
      { id: "inpaint", name: "Borrar y Reemplazar", desc: "Quita etiquetas o imperfecciones", icon: Eraser, cost: "$0.05", free: false, href: "/editor?module=inpaint" },
    ],
  },
  {
    title: "Crea el Escenario",
    subtitle: "Fondos, sombras e iluminacion profesional",
    icon: ImageIcon,
    color: "#C5A47E",
    tools: [
      { id: "bg-generate", name: "Fondos con IA", desc: "Escenarios ilimitados", icon: ImageIcon, cost: "Gratis / $0.05", free: true, href: "/editor?module=bg-generate" },
      { id: "shadows", name: "Sombras", desc: "Iluminacion de estudio", icon: Sun, cost: "Gratis / $0.04", free: true, href: "/editor?module=shadows" },
      { id: "outpaint", name: "Extender Imagen", desc: "Adapta formato para cada red", icon: Expand, cost: "$0.05", free: false, href: "/editor?module=outpaint" },
    ],
  },
  {
    title: "Modelos y Prueba Virtual",
    subtitle: "Crea modelos IA y viste con tu ropa",
    icon: Shirt,
    color: "#F5A623",
    tools: [
      { id: "model-create", name: "Crear Modelo IA", desc: "Genera modelos virtuales", icon: User, cost: "$0.055", free: false, href: "/editor?module=model-create", badge: "Primero" },
      { id: "tryon", name: "Prueba Virtual", desc: "Viste al modelo con tu prenda", icon: Shirt, cost: "$0.015", free: false, href: "/editor?module=tryon", badge: "Ahorra $500+" },
      { id: "ghost-mannequin", name: "Maniqui Invisible", desc: "Quita el maniqui de la foto", icon: Box, cost: "$0.05", free: false, href: "/editor?module=ghost-mannequin" },
      { id: "jewelry-tryon", name: "Joyeria Virtual", desc: "Aretes, collares y anillos", icon: Gem, cost: "$0.05", free: false, href: "/editor?module=jewelry-tryon" },
    ],
  },
  {
    title: "Contenido para Redes",
    subtitle: "Videos, anuncios y contenido creativo",
    icon: Video,
    color: "#5B9CF6",
    tools: [
      { id: "video", name: "Video Studio", desc: "Foto a video para TikTok y Reels", icon: Video, cost: "Desde gratis", free: false, href: "/editor?module=video", badge: "Trending" },
      { id: "ai-prompt", name: "Director Creativo", desc: "La IA sugiere conceptos", icon: Wand2, cost: "$0.05", free: false, href: "/editor?module=ai-prompt", badge: "IA" },
      { id: "ad-creator", name: "Crear Anuncios", desc: "Ads listos para publicar", icon: Megaphone, cost: "$0.04+", free: false, href: "/editor?module=ad-creator", badge: "Nuevo" },
      { id: "smart-editor", name: "Editor Avanzado", desc: "Capas, filtros y texto", icon: PenTool, cost: "Gratis", free: true, href: "/editor?module=smart-editor" },
    ],
  },
  {
    title: "Automatiza y Publica",
    subtitle: "Procesamiento masivo y verificacion",
    icon: Zap,
    color: "#A78BFA",
    tools: [
      { id: "batch", name: "Proceso Masivo", desc: "Aplica a 300+ fotos", icon: Layers, cost: "Variable", free: false, href: "/batch", badge: "Pro" },
      { id: "compliance", name: "Verificar Marketplace", desc: "Cumple requisitos de tiendas", icon: CheckSquare, cost: "Gratis", free: true, href: "/editor?module=compliance" },
      { id: "brand-kit", name: "Kit de Marca", desc: "Colores, logo y estilo", icon: Palette, cost: "Gratis", free: true, href: "/brand-kit" },
    ],
  },
];

/* ================================================================== */
/*  Compact Tool Card                                                   */
/* ================================================================== */

function ToolTile({ tool, accentColor }: { tool: Tool; accentColor: string }) {
  return (
    <Link href={tool.href} className="group relative block">
      <div
        className="relative flex items-start gap-3.5 rounded-xl p-4 transition-all duration-200 hover:-translate-y-0.5"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = `${accentColor}33`;
          (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px rgba(0,0,0,0.3)`;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--border-default)";
          (e.currentTarget as HTMLElement).style.boxShadow = "none";
        }}
      >
        {/* Icon */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{ background: `${accentColor}14`, border: `1px solid ${accentColor}22` }}
        >
          <tool.icon className="h-5 w-5" style={{ color: accentColor }} />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">{tool.name}</h3>
            {tool.badge && (
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{ background: `${accentColor}18`, color: accentColor }}
              >
                {tool.badge}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-snug">{tool.desc}</p>
        </div>

        {/* Cost pill */}
        <span
          className="shrink-0 self-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{
            background: tool.free ? "var(--success-dim)" : "rgba(255,255,255,0.04)",
            color: tool.free ? "var(--success)" : "var(--text-secondary)",
          }}
        >
          {tool.cost}
        </span>
      </div>
    </Link>
  );
}

/* ================================================================== */
/*  Category Section                                                    */
/* ================================================================== */

function CategorySection({ cat, defaultOpen }: { cat: Category; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-6">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-1 py-3 group"
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: `${cat.color}14`, border: `1px solid ${cat.color}22` }}
        >
          <cat.icon className="h-4 w-4" style={{ color: cat.color }} />
        </div>
        <div className="flex-1 text-left">
          <h2 className="text-base font-bold text-[var(--text-primary)]">{cat.title}</h2>
          <p className="text-xs text-[var(--text-muted)]">{cat.subtitle}</p>
        </div>
        <span className="text-xs text-[var(--text-muted)] mr-1">{cat.tools.length} herramientas</span>
        <ChevronDown
          className="h-4 w-4 text-[var(--text-muted)] transition-transform duration-200"
          style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
        />
      </button>

      {/* Tools grid */}
      {open && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-1">
          {cat.tools.map((tool) => (
            <ToolTile key={tool.id} tool={tool} accentColor={cat.color} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Quick Start Paths                                                   */
/* ================================================================== */

function QuickStartCard({
  title,
  steps,
  color,
}: {
  title: string;
  steps: { label: string; href: string; free: boolean }[];
  color: string;
}) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
    >
      <h3 className="text-sm font-bold text-[var(--text-primary)]">{title}</h3>
      <div className="flex flex-wrap gap-1.5">
        {steps.map((s, i) => (
          <React.Fragment key={s.label}>
            <Link
              href={s.href}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 hover:bg-white/5"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
                color: "var(--text-secondary)",
              }}
            >
              <span
                className="flex h-4.5 w-4.5 items-center justify-center rounded-full text-[9px] font-bold"
                style={{ background: `${color}20`, color }}
              >
                {i + 1}
              </span>
              {s.label}
              {s.free && (
                <span className="text-[9px] font-bold uppercase" style={{ color: "var(--success)" }}>
                  Gratis
                </span>
              )}
            </Link>
            {i < steps.length - 1 && (
              <ArrowRight className="h-3 w-3 self-center text-[var(--text-muted)]" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Page                                                                */
/* ================================================================== */

export default function DashboardPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <div className="mx-auto max-w-4xl px-5 py-8 md:px-8 md:py-12">

        {/* ── Header ────────────────────────────────────────────── */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                background: "linear-gradient(135deg, var(--accent), var(--accent-muted))",
                boxShadow: "0 4px 12px var(--accent-dim)",
              }}
            >
              <Camera className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[var(--text-primary)]">UniStudio</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold leading-tight tracking-tight text-[var(--text-primary)] mb-3">
            Tu estudio de fotografia{" "}
            <span className="text-gradient">con IA</span>
          </h1>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-xl">
            Transforma fotos de celular en imagenes profesionales. 18 herramientas, 6 gratis, costo promedio $0.02.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 mt-6">
            <Link
              href="/editor?module=bg-remove"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-[var(--bg-primary)] transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(135deg, var(--accent), var(--accent-light))",
                boxShadow: "0 4px 16px var(--accent-dim)",
              }}
            >
              <Upload className="h-4 w-4" />
              Empezar Gratis
            </Link>
            <Link
              href="/agent"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: "var(--accent-glow)",
                border: "1px solid var(--border-accent)",
                color: "var(--accent)",
              }}
            >
              <Wand2 className="h-4 w-4" />
              AI Automatico
            </Link>
          </div>
        </header>

        {/* ── Quick Start ───────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
            Flujos rapidos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <QuickStartCard
              title="E-commerce (ropa)"
              color="#50C878"
              steps={[
                { label: "Quitar Fondo", href: "/editor?module=bg-remove", free: true },
                { label: "Modelo IA", href: "/editor?module=model-create", free: false },
                { label: "Try-On", href: "/editor?module=tryon", free: false },
                { label: "Verificar", href: "/editor?module=compliance", free: true },
              ]}
            />
            <QuickStartCard
              title="Redes sociales"
              color="#5B9CF6"
              steps={[
                { label: "Quitar Fondo", href: "/editor?module=bg-remove", free: true },
                { label: "Fondos IA", href: "/editor?module=bg-generate", free: true },
                { label: "Video", href: "/editor?module=video", free: false },
              ]}
            />
            <QuickStartCard
              title="Joyeria"
              color="#F5A623"
              steps={[
                { label: "Quitar Fondo", href: "/editor?module=bg-remove", free: true },
                { label: "Modelo IA", href: "/editor?module=model-create", free: false },
                { label: "Joyeria Virtual", href: "/editor?module=jewelry-tryon", free: false },
              ]}
            />
          </div>
        </section>

        {/* ── Divider ───────────────────────────────────────────── */}
        <div className="h-px mb-8" style={{ background: "var(--border-default)" }} />

        {/* ── All Tools ─────────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-4">
            Todas las herramientas
          </h2>

          {CATEGORIES.map((cat, i) => (
            <CategorySection key={cat.title} cat={cat} defaultOpen={i < 3} />
          ))}
        </section>

        {/* ── Quick Links ───────────────────────────────────────── */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/gallery"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition-colors duration-150 hover:bg-white/5"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Galeria
          </Link>
          <Link
            href="/batch"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition-colors duration-150 hover:bg-white/5"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}
          >
            <Layers className="h-3.5 w-3.5" />
            Procesamiento Masivo
          </Link>
          <Link
            href="/workflows"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition-colors duration-150 hover:bg-white/5"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}
          >
            <Zap className="h-3.5 w-3.5" />
            Workflows
          </Link>
        </div>

        {/* ── Footer CTA ────────────────────────────────────────── */}
        <footer className="mt-12 mb-4 text-center">
          <p className="text-xs text-[var(--text-muted)]">
            Sube tu primera foto gratis.{" "}
            <Link href="/editor?module=bg-remove" className="text-[var(--accent)] font-medium hover:underline">
              Empezar ahora <ArrowRight className="inline h-3 w-3" />
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
