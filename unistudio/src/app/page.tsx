"use client";

import React, { useRef, useEffect, useState } from "react";
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
  ShoppingBag,
  Play,
  ChevronRight,
  Upload,
  Megaphone,
  ZoomIn,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

/* ================================================================== */
/*  All colors are defined via CSS variables in globals.css :root       */
/*  Change once → updates everywhere automatically                     */
/* ================================================================== */

/* ================================================================== */
/*  Module Definitions                                                  */
/* ================================================================== */

interface ModuleCard {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: React.ElementType;
  category: string;
  cost: string;
  isFree: boolean;
  href: string;
  badge?: string;
  videoUrl?: string;
  /** Step number in the recommended workflow (1 = do first) */
  step?: number;
  /** What you need before using this tool */
  prerequisite?: string;
}

const MODULES: ModuleCard[] = [
  // ── PASO 1: PREPARA TU FOTO ─────────────────────────────────────
  {
    id: "bg-remove",
    name: "Quitar Fondo",
    tagline: "EMPIEZA AQUI — Lo primero que necesitas",
    description: "Sube tu foto de producto tal como la tomaste con el celular. La IA quita el fondo y te deja el producto con fondo transparente, listo para todo lo demas.",
    icon: Scissors,
    category: "Paso 1 — Prepara tu Foto",
    cost: "Gratis",
    isFree: true,
    href: "/editor?module=bg-remove",
    badge: "Empieza Aqui",
    videoUrl: "/videos/bg-remove.mp4",
    step: 1,
  },
  {
    id: "enhance",
    name: "Mejorar Calidad",
    tagline: "Opcional — Si tu foto se ve oscura o borrosa",
    description: "Ajusta brillo, contraste, nitidez y color. Util si la foto original salio oscura, amarillenta o borrosa. 100% gratis, se procesa en tu navegador.",
    icon: Sparkles,
    category: "Paso 1 — Prepara tu Foto",
    cost: "Gratis",
    isFree: true,
    href: "/editor?module=enhance",
    videoUrl: "/videos/enhance.mp4",
    step: 1,
    prerequisite: "Solo si tu foto necesita correccion de color o nitidez",
  },
  {
    id: "upscale",
    name: "Aumentar Resolucion",
    tagline: "Agranda tu imagen sin perder calidad",
    description: "Usa IA para escalar tu foto 2x o 4x. Ideal para fotos de celular que necesitas en alta resolucion para impresion o marketplace.",
    icon: ZoomIn,
    category: "Paso 1 — Prepara tu Foto",
    cost: "$0.02 - $0.05",
    isFree: false,
    href: "/editor?module=upscale",
    step: 1,
    prerequisite: "Solo si tu foto tiene baja resolucion",
  },
  {
    id: "inpaint",
    name: "Borrar y Reemplazar",
    tagline: "Opcional — Quita etiquetas, manchas o imperfecciones",
    description: "Describe que quieres cambiar (ej: \"quitar la etiqueta\", \"borrar la arruga\") y la IA lo edita. Tambien cambia colores de tela o texturas.",
    icon: Eraser,
    category: "Paso 1 — Prepara tu Foto",
    cost: "$0.03 - $0.05",
    isFree: false,
    href: "/editor?module=inpaint",
    videoUrl: "/videos/inpaint.mp4",
    step: 1,
    prerequisite: "Solo si tu producto tiene detalles que quieres corregir",
  },

  // ── PASO 2: CREA EL ESCENARIO ───────────────────────────────────
  {
    id: "bg-generate",
    name: "Fondos con IA",
    tagline: "Pon tu producto en cualquier escenario",
    description: "Despues de quitar el fondo, elige donde poner tu producto: mesa de marmol, playa, estudio de lujo, o cualquier escena que imagines. Fondos de estudio son gratis.",
    icon: ImageIcon,
    category: "Paso 2 — Crea el Escenario",
    cost: "Gratis / $0.05",
    isFree: true,
    href: "/editor?module=bg-generate",
    videoUrl: "/videos/bg-generate.mp4",
    step: 2,
    prerequisite: "Necesitas una foto sin fondo (usa Quitar Fondo primero)",
  },
  {
    id: "shadows",
    name: "Sombras e Iluminacion",
    tagline: "Dale acabado profesional de estudio",
    description: "Agrega sombras suaves, de contacto, reflejos o cambia la iluminacion con IA. Es lo que hace que una foto se vea de catalogo en vez de foto casera.",
    icon: Sun,
    category: "Paso 2 — Crea el Escenario",
    cost: "Gratis / $0.04",
    isFree: true,
    href: "/editor?module=shadows",
    videoUrl: "/videos/shadows.mp4",
    step: 2,
    prerequisite: "Funciona mejor con fotos sin fondo (PNG transparente)",
  },
  {
    id: "outpaint",
    name: "Extender Imagen",
    tagline: "Adapta el formato para cada plataforma",
    description: "Tu foto es cuadrada pero necesitas vertical para Stories? La IA extiende los bordes naturalmente. Presets listos para Instagram, TikTok, Amazon, Pinterest.",
    icon: Expand,
    category: "Paso 2 — Crea el Escenario",
    cost: "$0.05",
    isFree: false,
    href: "/editor?module=outpaint",
    videoUrl: "/videos/outpaint.mp4",
    step: 2,
    prerequisite: "Necesitas una foto ya editada con el fondo que quieres",
  },

  // ── PASO 3: MODELOS Y PRUEBA VIRTUAL ────────────────────────────
  {
    id: "model-create",
    name: "Crear Modelo IA",
    tagline: "PRIMERO — Genera un modelo si no tienes uno",
    description: "No tienes foto de modelo? Crea uno aqui. Elige genero, edad, tono de piel, pose y expresion. Despues puedes vestirlo con tu ropa en Prueba Virtual.",
    icon: User,
    category: "Paso 3 — Modelos y Prueba Virtual",
    cost: "$0.055",
    isFree: false,
    href: "/editor?module=model-create",
    videoUrl: "/videos/model-create.mp4",
    step: 3,
    badge: "Hazlo Primero",
  },
  {
    id: "tryon",
    name: "Prueba Virtual",
    tagline: "DESPUES — Viste al modelo con tu prenda",
    description: "Sube la foto de tu prenda + la foto del modelo, y la IA genera una imagen del modelo vistiendo tu prenda. Compatible con ropa regular, lenceria y swimwear.",
    icon: Shirt,
    category: "Paso 3 — Modelos y Prueba Virtual",
    cost: "$0.015 - $0.05",
    isFree: false,
    href: "/editor?module=tryon",
    badge: "Ahorra $500+",
    videoUrl: "/videos/tryon.mp4",
    step: 3,
    prerequisite: "Necesitas: 1) foto de la prenda sin fondo, 2) foto de modelo (creala arriba si no tienes)",
  },
  {
    id: "ghost-mannequin",
    name: "Maniqui Invisible",
    tagline: "Alternativa — Quita el maniqui de la foto",
    description: "Si fotografiaste tu prenda sobre un maniqui, esta herramienta lo elimina y deja la prenda \"flotando\" con volumen 3D. Efecto profesional de grandes marcas.",
    icon: Box,
    category: "Paso 3 — Modelos y Prueba Virtual",
    cost: "$0.05",
    isFree: false,
    href: "/editor?module=ghost-mannequin",
    videoUrl: "/videos/ghost-mannequin.mp4",
    step: 3,
    prerequisite: "Necesitas una foto de la prenda SOBRE un maniqui fisico",
  },
  {
    id: "jewelry-tryon",
    name: "Joyeria Virtual",
    tagline: "Para joyeria y accesorios especificamente",
    description: "Prueba virtual de aretes, collares, anillos, pulseras y lentes sobre modelos IA. La IA coloca el accesorio con iluminacion y perspectiva realista.",
    icon: Gem,
    category: "Paso 3 — Modelos y Prueba Virtual",
    cost: "$0.05",
    isFree: false,
    href: "/editor?module=jewelry-tryon",
    videoUrl: "/videos/jewelry-tryon.mp4",
    step: 3,
    prerequisite: "Necesitas: 1) foto del accesorio, 2) foto de modelo con rostro visible",
  },

  // ── PASO 4: CONTENIDO PARA REDES ────────────────────────────────
  {
    id: "video",
    name: "Video Studio",
    tagline: "Convierte tu foto final en video",
    description: "Toma tu foto de producto ya editada y conviertela en video para TikTok, Reels e historias. Modo Producto (gira), Moda (camina) y Avatar (habla). Ken Burns es gratis.",
    icon: Video,
    category: "Paso 4 — Contenido para Redes",
    cost: "Desde gratis",
    isFree: false,
    href: "/editor?module=video",
    badge: "Trending",
    videoUrl: "/videos/video.mp4",
    step: 4,
    prerequisite: "Necesitas una foto de producto ya editada (pasos 1-3)",
  },
  {
    id: "ai-prompt",
    name: "Director Creativo IA",
    tagline: "No sabes que estilo usar? La IA te sugiere",
    description: "Sube tu producto y dile a la IA para que plataforma es la foto. Claude IA te sugiere 4 conceptos profesionales de fotografia y los crea automaticamente.",
    icon: Wand2,
    category: "Paso 4 — Contenido para Redes",
    cost: "$0.05",
    isFree: false,
    href: "/editor?module=ai-prompt",
    badge: "IA",
    videoUrl: "/videos/ai-prompt.mp4",
    step: 4,
  },
  {
    id: "ad-creator",
    name: "Crear Anuncios",
    tagline: "Genera ads listos para publicar",
    description: "Elige la red social (IG Reel, TikTok, FB, YouTube Short), escribe tu titular, y la IA genera el video publicitario con el formato y duracion correcta.",
    icon: Megaphone,
    category: "Paso 4 — Contenido para Redes",
    cost: "$0.04+",
    isFree: false,
    href: "/editor?module=ad-creator",
    badge: "Nuevo",
    videoUrl: "/videos/video.mp4",
    step: 4,
    prerequisite: "Necesitas una foto de producto ya editada",
  },
  {
    id: "smart-editor",
    name: "Editor Avanzado",
    tagline: "Retoques finales con herramientas de diseno",
    description: "Editor completo con capas, filtros, texto y transformaciones. Ideal para agregar tu logo o hacer ajustes finales antes de publicar.",
    icon: PenTool,
    category: "Paso 4 — Contenido para Redes",
    cost: "Gratis",
    isFree: true,
    href: "/editor?module=smart-editor",
    videoUrl: "/videos/smart-editor.mp4",
    step: 4,
  },

  // ── PASO 5: AUTOMATIZA Y VERIFICA ───────────────────────────────
  {
    id: "batch",
    name: "Procesamiento Masivo",
    tagline: "Aplica el mismo flujo a cientos de fotos",
    description: "Cuando ya tienes tu flujo listo (ej: quitar fondo + sombras), aplica lo mismo a 300+ fotos automaticamente. Ideal para catalogos grandes.",
    icon: Layers,
    category: "Paso 5 — Automatiza y Publica",
    cost: "Variable",
    isFree: false,
    href: "/batch",
    badge: "Pro",
    videoUrl: "/videos/batch.mp4",
    step: 5,
    prerequisite: "Primero prueba tu flujo con 1 foto, luego automatiza con batch",
  },
  {
    id: "compliance",
    name: "Verificar Marketplace",
    tagline: "Asegurate que tu foto sera aceptada",
    description: "Antes de publicar, verifica que tu imagen cumple los requisitos de Amazon, Shopify, Etsy, eBay, etc. Detecta errores de tamanio, formato y resolucion. Auto-correccion gratis.",
    icon: CheckSquare,
    category: "Paso 5 — Automatiza y Publica",
    cost: "Gratis",
    isFree: true,
    href: "/editor?module=compliance",
    step: 5,
  },
  {
    id: "brand-kit",
    name: "Kit de Marca",
    tagline: "Consistencia visual en todas tus fotos",
    description: "Guarda los colores, tipografias, logotipo y watermark de tu marca para aplicarlos de forma consistente en todas tus fotos de producto.",
    icon: Palette,
    category: "Paso 5 — Automatiza y Publica",
    cost: "Gratis",
    isFree: true,
    href: "/brand-kit",
    step: 5,
  },
];

/* ================================================================== */
/*  Category descriptions for clarity                                   */
/* ================================================================== */

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  "Paso 1 — Prepara tu Foto": "Lo primero: limpia tu foto. Quita el fondo, mejora la calidad, borra imperfecciones. Empieza siempre aqui.",
  "Paso 2 — Crea el Escenario": "Tu producto ya esta limpio. Ahora ponlo en un escenario bonito, agrega sombras profesionales y adapta el formato.",
  "Paso 3 — Modelos y Prueba Virtual": "Quieres mostrar tu prenda en un modelo? Primero crea el modelo, despues vistelo con tu prenda.",
  "Paso 4 — Contenido para Redes": "Tu foto esta lista. Ahora conviertela en video, pide ideas creativas a la IA o crea anuncios para cada red social.",
  "Paso 5 — Automatiza y Publica": "Ya tienes tu flujo. Ahora aplica lo mismo a todo tu catalogo, verifica que todo cumpla los requisitos y publica.",
};

/* ================================================================== */
/*  Tool Card Component (lazy video, no autoplay)                       */
/* ================================================================== */

function ToolCard({ mod }: { mod: ModuleCard }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);

  // Only play video on hover — prevents cache overload
  useEffect(() => {
    if (!videoRef.current) return;
    if (isHovered) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isHovered]);

  return (
    <Link href={mod.href} className="group block">
      <div
        className="relative flex flex-col overflow-hidden rounded-[16px] transition-all duration-300 hover:-translate-y-1"
        style={{
          background: "var(--bg-surface)",
          border: isHovered ? "1px solid var(--border-accent)" : "1px solid var(--border-default)",
          boxShadow: isHovered ? "0 20px 60px rgba(0,0,0,0.5), 0 0 40px var(--accent-glow)" : "0 4px 20px rgba(0,0,0,0.3)",
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Preview area — icon gradient default, video on hover */}
        <div className="relative aspect-[16/10] w-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
          {/* Static fallback: always visible, fades out when video plays */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 transition-opacity duration-500"
            style={{ opacity: isHovered && videoLoaded ? 0 : 1 }}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{
                background: isHovered ? "var(--accent-dim)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${isHovered ? "var(--border-accent)" : "rgba(255,255,255,0.04)"}`,
                transition: "all 0.3s ease",
              }}
            >
              <mod.icon
                className="h-7 w-7 transition-colors duration-300"
                style={{ color: isHovered ? "var(--accent)" : "var(--text-muted)" }}
              />
            </div>
            <span className="text-[10px] font-medium transition-colors duration-300"
              style={{ color: isHovered ? "var(--accent-light)" : "var(--text-muted)" }}
            >
              {isHovered ? "Ver demo" : ""}
            </span>
          </div>

          {/* Video: only loads on hover (preload=none prevents cache errors) */}
          {mod.videoUrl && (
            <video
              ref={videoRef}
              src={mod.videoUrl}
              muted
              loop
              playsInline
              preload="none"
              onCanPlay={() => setVideoLoaded(true)}
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
              style={{ opacity: isHovered && videoLoaded ? 1 : 0 }}
            />
          )}

          {/* Dark overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

          {/* Badge */}
          {mod.badge && (
            <div
              className="absolute top-3 left-3 rounded-full px-3 py-1 text-[10px] font-semibold tracking-wide uppercase"
              style={{
                background: "var(--accent-dim)",
                color: "var(--accent)",
                border: "1px solid var(--border-accent)",
                backdropFilter: "blur(8px)",
              }}
            >
              {mod.badge}
            </div>
          )}

          {/* Cost */}
          <div
            className="absolute top-3 right-3 rounded-full px-3 py-1 text-[10px] font-semibold tracking-wide"
            style={{
              background: mod.isFree ? "var(--success-dim)" : "rgba(255,255,255,0.06)",
              color: mod.isFree ? "var(--success)" : "var(--text-secondary)",
              border: mod.isFree ? "1px solid rgba(80,200,120,0.2)" : "1px solid rgba(255,255,255,0.06)",
              backdropFilter: "blur(8px)",
            }}
          >
            {mod.cost}
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="text-[15px] font-semibold text-heading mb-1">{mod.name}</h3>
          <p className="text-[12px] font-medium text-accent mb-2">{mod.tagline}</p>

          <p className="text-[13px] leading-[1.65] text-body mb-3">
            {mod.description}
          </p>

          {/* Prerequisite hint */}
          {mod.prerequisite && (
            <div className="flex items-start gap-2 rounded-lg mb-3 px-2.5 py-2"
              style={{ background: "rgba(255,180,50,0.06)", border: "1px solid rgba(255,180,50,0.12)" }}
            >
              <ArrowRight className="h-3 w-3 mt-0.5 shrink-0" style={{ color: "rgba(255,180,50,0.7)" }} />
              <span className="text-[11px] leading-relaxed" style={{ color: "rgba(255,200,100,0.8)" }}>
                {mod.prerequisite}
              </span>
            </div>
          )}

          {/* CTA */}
          <div
            className="flex items-center text-[12px] font-semibold tracking-wide uppercase transition-colors duration-300"
            style={{ color: isHovered ? "var(--accent)" : "var(--text-muted)" }}
          >
            Usar herramienta
            <ChevronRight className="h-3.5 w-3.5 ml-1 transition-transform duration-300 group-hover:translate-x-1" />
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ================================================================== */
/*  Category Definitions                                                */
/* ================================================================== */

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  "Paso 1 — Prepara tu Foto": Scissors,
  "Paso 2 — Crea el Escenario": ImageIcon,
  "Paso 3 — Modelos y Prueba Virtual": Shirt,
  "Paso 4 — Contenido para Redes": Play,
  "Paso 5 — Automatiza y Publica": Zap,
};

/* ================================================================== */
/*  Hero Showcase Data                                                  */
/* ================================================================== */

const SHOWCASE_STAGES = [
  {
    id: "bg-remove",
    label: "Quitar Fondo",
    description: "Fondo transparente al instante, gratis",
    icon: Scissors,
    video: "/videos/bg-remove.mp4",
    href: "/editor?module=bg-remove",
    badge: "Gratis",
  },
  {
    id: "bg-generate",
    label: "Fondos con IA",
    description: "Escenarios profesionales ilimitados",
    icon: ImageIcon,
    video: "/videos/bg-generate.mp4",
    href: "/editor?module=bg-generate",
  },
  {
    id: "tryon",
    label: "Prueba Virtual",
    description: "Tu ropa en modelos sin sesion de fotos",
    icon: Shirt,
    video: "/videos/tryon.mp4",
    href: "/editor?module=tryon",
  },
  {
    id: "enhance",
    label: "Mejorar Calidad",
    description: "De foto de celular a calidad de catalogo",
    icon: Sparkles,
    video: "/videos/enhance.mp4",
    href: "/editor?module=enhance",
  },
  {
    id: "video",
    label: "Video Studio",
    description: "Videos profesionales desde una sola foto",
    icon: Video,
    video: "/videos/video.mp4",
    href: "/editor?module=video",
    badge: "Trending",
  },
];

/* ================================================================== */
/*  Hero                                                                */
/* ================================================================== */

function Hero() {
  const [activeStage, setActiveStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const STAGE_DURATION = 4000;

  // Auto-cycle through stages
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStage((prev) => (prev + 1) % SHOWCASE_STAGES.length);
      setProgress(0);
    }, STAGE_DURATION);
    return () => clearInterval(interval);
  }, []);

  // Progress bar animation
  useEffect(() => {
    setProgress(0);
    const start = Date.now();
    const animate = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / STAGE_DURATION) * 100, 100);
      setProgress(pct);
      if (pct < 100) requestAnimationFrame(animate);
    };
    const raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [activeStage]);

  // Play active video
  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      if (i === activeStage) {
        v.currentTime = 0;
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
  }, [activeStage]);

  const stage = SHOWCASE_STAGES[activeStage];

  return (
    <section className="relative overflow-hidden rounded-[24px] mb-24"
      style={{ background: "linear-gradient(160deg, var(--bg-primary) 0%, var(--bg-surface) 100%)" }}
    >
      {/* Ambient glow effects */}
      <div className="absolute top-[-30%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-[0.05] blur-3xl"
        style={{ background: "var(--accent)" }}
      />
      <div className="absolute bottom-[-20%] left-[-5%] w-[400px] h-[400px] rounded-full opacity-[0.03] blur-3xl"
        style={{ background: "var(--accent)" }}
      />

      {/* Two-column layout */}
      <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-0">

        {/* ── Left: Copy ──────────────────────────────────────── */}
        <div className="flex flex-col justify-center px-10 py-16 md:px-14 md:py-20 lg:py-24">
          {/* Logo */}
          <div className="flex items-center gap-3.5 mb-10">
            <div className="flex h-11 w-11 items-center justify-center rounded-[11px]"
              style={{
                background: "linear-gradient(135deg, var(--accent), var(--accent-muted))",
                boxShadow: "0 6px 20px var(--accent-dim)",
              }}
            >
              <Camera className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-[24px] font-bold tracking-tight text-heading">UniStudio</span>
              <div className="h-[1px] w-full mt-0.5" style={{ background: "linear-gradient(90deg, var(--accent), transparent)" }} />
            </div>
          </div>

          <h1 className="text-[36px] md:text-[48px] lg:text-[52px] font-bold leading-[1.08] tracking-tight text-heading mb-5">
            Tu estudio de
            <br />
            fotografia
            <br />
            <span className="text-gradient">con IA</span>
          </h1>

          <p className="text-[16px] leading-[1.7] text-body mb-10 max-w-md">
            Transforma fotos de celular en imagenes de catalogo profesional.
            Quita fondos, genera escenarios con IA, viste modelos virtuales y crea
            videos — todo desde tu navegador, sin fotografo ni estudio.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 mb-12">
            <Link href="/editor?module=bg-remove"
              className="inline-flex items-center gap-2.5 rounded-[11px] px-6 py-3.5 text-[14px] font-semibold text-surface transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
              style={{
                background: "linear-gradient(135deg, var(--accent), var(--accent-light))",
                boxShadow: "0 6px 24px var(--accent-dim)",
              }}
            >
              <Upload className="h-4 w-4" />
              Empezar Gratis
            </Link>
            <Link href="/editor?module=ai-prompt"
              className="inline-flex items-center gap-2.5 rounded-[11px] px-6 py-3.5 text-[14px] font-semibold text-accent transition-all duration-300 hover:-translate-y-0.5"
              style={{
                background: "var(--accent-glow)",
                border: "1px solid var(--border-accent)",
              }}
            >
              <Wand2 className="h-4 w-4" />
              Director Creativo IA
            </Link>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-6">
            {[
              { value: "17", label: "herramientas" },
              { value: "6", label: "gratis" },
              { value: "$0.02", label: "costo promedio" },
            ].map((s, i) => (
              <React.Fragment key={s.label}>
                {i > 0 && <div className="h-8 w-px" style={{ background: "var(--border-default)" }} />}
                <div>
                  <div className="text-[20px] font-bold text-accent leading-none mb-1">{s.value}</div>
                  <div className="text-[11px] text-muted uppercase tracking-wider font-medium">{s.label}</div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ── Right: Animated Showcase ─────────────────────────── */}
        <div className="relative flex items-center justify-center px-6 py-10 lg:px-10 lg:py-16">
          {/* Showcase container */}
          <div className="relative w-full max-w-[520px]">
            {/* Main video frame */}
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[16px]"
              style={{
                border: "1px solid var(--border-accent)",
                boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 60px var(--accent-glow)",
              }}
            >
              {/* Videos (stacked, crossfade — preload metadata to prevent cache overload) */}
              {SHOWCASE_STAGES.map((s, i) => (
                <video
                  key={s.id}
                  ref={(el) => { videoRefs.current[i] = el; }}
                  src={s.video}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
                  style={{ opacity: i === activeStage ? 1 : 0 }}
                />
              ))}

              {/* Gradient overlay at bottom */}
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />

              {/* Active tool label */}
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <stage.icon className="h-4 w-4" style={{ color: "var(--accent)" }} />
                    <span className="text-[14px] font-semibold text-white">{stage.label}</span>
                  </div>
                  <span className="text-[12px] text-white/60">{stage.description}</span>
                </div>
                {stage.badge && (
                  <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
                    style={{ background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--border-accent)" }}
                  >
                    {stage.badge}
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="h-full transition-none"
                  style={{ width: `${progress}%`, background: "var(--accent)" }}
                />
              </div>
            </div>

            {/* Stage dots */}
            <div className="mt-5 flex items-center justify-center gap-2">
              {SHOWCASE_STAGES.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { setActiveStage(i); setProgress(0); }}
                  className="group flex items-center gap-1.5 rounded-full px-2.5 py-1.5 transition-all duration-300"
                  style={{
                    background: i === activeStage ? "var(--accent-dim)" : "transparent",
                    border: i === activeStage ? "1px solid var(--border-accent)" : "1px solid transparent",
                  }}
                >
                  <s.icon className="h-3 w-3 transition-colors duration-300"
                    style={{ color: i === activeStage ? "var(--accent)" : "var(--text-muted)" }}
                  />
                  {i === activeStage && (
                    <span className="text-[11px] font-medium" style={{ color: "var(--accent)" }}>{s.label}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Floating pipeline arrow labels */}
            <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 translate-x-full flex-col gap-3">
              {["Sube", "Edita", "Publica"].map((step, i) => (
                <div key={step} className="flex items-center gap-2">
                  <div className="h-px w-4" style={{ background: "var(--border-default)" }} />
                  <div className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{ background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--border-accent)" }}
                  >
                    {i + 1}
                  </div>
                  <span className="text-[11px] font-medium text-muted">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  Platform Workflow                                                    */
/* ================================================================== */

function GettingStarted() {
  const scenarios = [
    {
      title: "Vendo ropa en e-commerce",
      subtitle: "Amazon, Shopify, Etsy, tu tienda online",
      icon: ShoppingBag,
      steps: [
        { label: "Quitar Fondo", href: "/editor?module=bg-remove", free: true },
        { label: "Crear Modelo IA", href: "/editor?module=model-create", free: false },
        { label: "Prueba Virtual", href: "/editor?module=tryon", free: false },
        { label: "Sombras", href: "/editor?module=shadows", free: true },
        { label: "Verificar", href: "/editor?module=compliance", free: true },
      ],
    },
    {
      title: "Necesito fotos para Instagram / redes",
      subtitle: "Instagram, Facebook, Pinterest, TikTok",
      icon: Camera,
      steps: [
        { label: "Quitar Fondo", href: "/editor?module=bg-remove", free: true },
        { label: "Fondos con IA", href: "/editor?module=bg-generate", free: true },
        { label: "Director Creativo", href: "/editor?module=ai-prompt", free: false },
        { label: "Crear Video", href: "/editor?module=video", free: false },
      ],
    },
    {
      title: "Tengo joyeria / accesorios",
      subtitle: "Aretes, collares, anillos, relojes",
      icon: Gem,
      steps: [
        { label: "Quitar Fondo", href: "/editor?module=bg-remove", free: true },
        { label: "Crear Modelo IA", href: "/editor?module=model-create", free: false },
        { label: "Joyeria Virtual", href: "/editor?module=jewelry-tryon", free: false },
        { label: "Sombras", href: "/editor?module=shadows", free: true },
      ],
    },
  ];

  return (
    <section className="mb-24">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: "var(--accent-dim)", border: "1px solid var(--border-accent)" }}
          >
            <Zap className="h-4 w-4 text-accent" />
          </div>
          <h2 className="text-[28px] font-bold text-heading">No sabes por donde empezar?</h2>
        </div>
        <p className="text-[15px] text-muted leading-relaxed">Elige tu situacion y sigue los pasos en orden. Cada paso enlaza a la herramienta correcta.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {scenarios.map((s) => (
          <div key={s.title}
            className="rounded-[16px] p-6 transition-all duration-300 hover:border-accent/20"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
            }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-[10px]"
                style={{ background: "var(--accent-dim)", border: "1px solid var(--border-accent)" }}
              >
                <s.icon className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-heading">{s.title}</h3>
                <p className="text-[11px] text-muted">{s.subtitle}</p>
              </div>
            </div>
            {/* Numbered steps */}
            <div className="space-y-2">
              {s.steps.map((step, i) => (
                <Link key={step.label} href={step.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 hover:bg-white/[0.03] group"
                  style={{ border: "1px solid var(--border-default)" }}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                    style={{ background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--border-accent)" }}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 text-[13px] font-medium text-body group-hover:text-heading transition-colors">
                    {step.label}
                  </span>
                  {step.free && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                      style={{ background: "var(--success-dim)", color: "var(--success)" }}
                    >
                      Gratis
                    </span>
                  )}
                  <ChevronRight className="h-3.5 w-3.5 text-muted group-hover:text-accent transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ================================================================== */
/*  Dashboard Page                                                      */
/* ================================================================== */

export default function DashboardPage() {
  const categories = Array.from(new Set(MODULES.map((m) => m.category)));

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <div className="mx-auto max-w-[1320px] px-6 py-10 md:px-10 md:py-14">
        {/* Hero */}
        <Hero />

        {/* AI Agent CTA */}
        <section className="mb-24">
          <Link href="/agent"
            className="group block rounded-[20px] p-8 md:p-10 transition-all duration-300 hover:-translate-y-1"
            style={{
              background: "linear-gradient(135deg, var(--bg-surface), var(--bg-elevated))",
              border: "1px solid var(--border-accent)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.3), 0 0 30px var(--accent-glow)",
            }}
          >
            <div className="flex items-center gap-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-muted))", boxShadow: "0 6px 20px var(--accent-dim)" }}
              >
                <Wand2 className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-[22px] font-bold text-heading">AI Automatico</h2>
                  <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--border-accent)" }}
                  >
                    Claude IA
                  </span>
                </div>
                <p className="text-[14px] text-body leading-relaxed">
                  Sube tu foto, describe lo que necesitas, y la IA ejecuta todos los pasos automaticamente.
                  <span className="text-accent font-medium"> Reemplaza modelos con copyright, crea contenido para redes, prepara fotos para e-commerce — todo en un click.</span>
                </p>
              </div>
              <ArrowRight className="h-6 w-6 text-accent shrink-0 transition-transform duration-300 group-hover:translate-x-2" />
            </div>
          </Link>
        </section>

        {/* Quick Nav: Workflows + Docs */}
        <section className="mb-24 grid grid-cols-1 md:grid-cols-2 gap-5">
          <Link href="/workflows"
            className="group flex items-center gap-5 rounded-[20px] p-8 transition-all duration-300 hover:-translate-y-1"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            }}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "rgba(80,200,120,0.1)", border: "1px solid rgba(80,200,120,0.2)" }}
            >
              <Layers className="h-6 w-6" style={{ color: "#50C878" }} />
            </div>
            <div className="flex-1">
              <h3 className="text-[16px] font-bold text-heading mb-1">Workflows Visuales</h3>
              <p className="text-[12px] text-muted leading-relaxed">Ve como se conectan todos los modulos en un mapa visual interactivo estilo Weavy</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted group-hover:text-accent transition-all duration-300 group-hover:translate-x-1" />
          </Link>

          <Link href="/docs"
            className="group flex items-center gap-5 rounded-[20px] p-8 transition-all duration-300 hover:-translate-y-1"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            }}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "rgba(91,156,246,0.1)", border: "1px solid rgba(91,156,246,0.2)" }}
            >
              <Camera className="h-6 w-6" style={{ color: "#5B9CF6" }} />
            </div>
            <div className="flex-1">
              <h3 className="text-[16px] font-bold text-heading mb-1">Mapa del Proyecto</h3>
              <p className="text-[12px] text-muted leading-relaxed">Cada archivo, cada carpeta — que hace y donde ir para cambiarlo. Documentacion interactiva.</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted group-hover:text-accent transition-all duration-300 group-hover:translate-x-1" />
          </Link>
        </section>

        {/* Getting Started */}
        <GettingStarted />

        {/* Tools */}
        <section>
          <div className="mb-12">
            <h2 className="text-[28px] font-bold text-heading mb-2">Herramientas</h2>
            <p className="text-[15px] text-muted leading-relaxed">17 herramientas de IA diseñadas para fotografia profesional de producto — desde la foto cruda hasta contenido listo para vender</p>
          </div>

          {categories.map((category) => {
            const catMods = MODULES.filter((m) => m.category === category);
            const CatIcon = CATEGORY_ICONS[category] || Zap;

            return (
              <div key={category} className="mb-16">
                {/* Category header */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-[8px]"
                      style={{ background: "var(--accent-glow)", border: "1px solid var(--accent-dim)" }}
                    >
                      <CatIcon className="h-3.5 w-3.5 text-accent" />
                    </div>
                    <h3 className="text-[16px] font-semibold text-body uppercase tracking-wider">{category}</h3>
                    <div className="flex-1 h-[1px] bg-surface-lighter" />
                  </div>
                  {CATEGORY_DESCRIPTIONS[category] && (
                    <p className="text-[13px] text-muted leading-relaxed ml-10">
                      {CATEGORY_DESCRIPTIONS[category]}
                    </p>
                  )}
                </div>

                {/* Cards */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {catMods.map((mod) => (
                    <ToolCard key={mod.id} mod={mod} />
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        {/* Bottom CTA */}
        <section className="mt-8 mb-8 rounded-[20px] p-12 text-center relative overflow-hidden"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
        >
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ background: "radial-gradient(circle at 50% 50%, var(--accent), transparent 70%)" }}
          />
          <div className="relative">
            <h2 className="text-[24px] font-bold text-heading mb-3">Listo para transformar tus fotos?</h2>
            <p className="text-[15px] text-muted mb-8 max-w-md mx-auto leading-relaxed">
              Sube tu primera foto y la IA se encarga del resto.
              Quitar fondo es gratis, sin limite — empieza en segundos.
            </p>
            <Link href="/editor?module=bg-remove"
              className="inline-flex items-center gap-3 rounded-[12px] px-8 py-4 text-[15px] font-semibold text-surface transition-all duration-300 hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(135deg, var(--accent), var(--accent-light))",
                boxShadow: "0 8px 30px var(--accent-dim)",
              }}
            >
              <Camera className="h-5 w-5" />
              Subir Imagen y Empezar
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
