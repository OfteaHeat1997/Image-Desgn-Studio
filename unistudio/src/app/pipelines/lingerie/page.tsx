"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Upload,
  X,
  Play,
  RotateCcw,
  Check,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Scissors,
  Image as ImageIcon,
  User,
  Shirt,
  Film,
  Sparkles,
  Package,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Settings2,
  Zap,
  ZapOff,
  Info,
  StopCircle,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { toast } from "@/hooks/use-toast";
import { mapProductTypeToGarmentType } from "@/lib/constants/garment-types";
import { useGalleryStore } from "@/stores/gallery-store";
import type { ProductSpec } from "@/app/api/analyze-product/route";

/* ------------------------------------------------------------------ */
/*  Download helpers                                                    */
/*                                                                      */
/*  Las URLs de fal.media / replicate.delivery caducan después de       */
/*  horas/días. Antes usábamos <a href={proxyUrl} download>, lo que     */
/*  cuando el upstream devolvía 502 abría el JSON de error como tab     */
/*  ("File wasn't available on site" en Chrome). Ahora bajamos vía      */
/*  fetch, detectamos expired:true del proxy, y disparamos un Blob      */
/*  download solo cuando hay archivo real.                              */
/* ------------------------------------------------------------------ */

function buildProxyHref(url: string, filename: string): string {
  if (url.startsWith("data:")) return url;
  if (url.startsWith("/api/proxy-image")) {
    // Append filename if not already present so Content-Disposition kicks in.
    return url.includes("filename=")
      ? url
      : `${url}${url.includes("?") ? "&" : "?"}filename=${encodeURIComponent(filename)}`;
  }
  return `/api/proxy-image?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
}

/**
 * Descarga un asset upstream con detección de URLs caducadas.
 * Si el proxy devuelve 502 con expired:true muestra un toast claro en
 * vez de abrir un JSON tab en Chrome. Para data: URLs hace download
 * directo (no hay round-trip al servidor).
 */
async function downloadAsset(url: string, filename: string): Promise<void> {
  // data: URLs are already self-contained — direct anchor download works.
  if (url.startsWith("data:")) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }

  const href = buildProxyHref(url, filename);
  try {
    const res = await fetch(href);
    if (!res.ok) {
      // Try to read expired hint from JSON body
      let expired = false;
      try {
        const body = await res.json();
        expired = body?.expired === true;
      } catch { /* not JSON, ignore */ }
      if (expired) {
        toast.error("Este archivo expiró. Volvé a generarlo desde la galería.");
      } else {
        toast.error(`No se pudo descargar (HTTP ${res.status}).`);
      }
      return;
    }
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Release the blob URL after the browser starts the download.
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch (err) {
    console.error("[lingerie] downloadAsset failed:", err);
    toast.error("No se pudo descargar el archivo. Reintentá.");
  }
}

/**
 * Convierte una URL upstream (fal.media / replicate.delivery) a un data: URL
 * base64 — útil para guardar en la galería de forma persistente, ya que las
 * URLs originales caducan en horas/días. Devuelve la URL original si ya es
 * data:/blob: o si la conversión falla (degradación silenciosa).
 */
async function urlToDataUrl(url: string): Promise<string> {
  if (!url || url.startsWith("data:") || url.startsWith("blob:")) return url;
  try {
    const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(url)}`);
    if (!res.ok) return url;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
}

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type StepId = "isolate" | "model" | "tryon" | "texturePreserve" | "photoBack" | "photoFullBody" | "productVideo" | "modelVideo";
type StepStatus = "idle" | "pending" | "processing" | "done" | "error" | "skipped" | "accepted";
type Phase = "setup" | "pipeline";

interface PipelineStep {
  id: StepId;
  label: string;
  description: string;
  icon: React.ElementType;
  cost: string;
  enabled: boolean;
  status: StepStatus;
  inputUrl?: string;
  // Override de la imagen "Original/antes" que se muestra en la tarjeta. Para el
  // try-on lo usamos para mostrar la MODELO nueva (antes) en vez del garment, así
  // la Foto Frontal se ve como un antes/después: modelo → modelo con el bra puesto.
  originalUrl?: string;
  resultUrl?: string;
  error?: string;
  cost_actual?: number;
  // Multi-sample: lista completa de candidatos generados. resultUrl es siempre
  // el candidato actualmente seleccionado por la usuaria; candidates es la lista
  // para mostrar en el picker 2×2. Solo se popula cuando generationMode =
  // "multi-sample" y el step admite variantes (tryon/photoBack/photoFullBody).
  candidates?: string[];
  // P1-1: la usuaria eligió un proveedor distinto al default en el retry (ej
  // "reintentá con FASHN porque Kolors reinterpretó mal el broche"). El
  // siguiente rerun usa este provider en vez del default de lencería (Kolors).
  // Limpia al empezar un run exitoso para que el próximo ciclo vuelva al default.
  providerOverride?: TryonProvider;
  // Proveedor que REALMENTE produjo el resultado (lo devuelve /api/tryon en
  // data.provider). Distinto de providerOverride (lo que pidió la usuaria): la
  // ruta puede caer de FASHN a Kolors en silencio, así que mostramos en la UI
  // cuál corrió de verdad para que testear sea determinista.
  usedProvider?: string;
  // Pose manual override (frontal/lateral/3-cuartos/espalda/cuerpo-completo).
  // "auto" = default por stepId. La usuaria puede forzar otra pose desde la UI
  // antes de procesar. Aplicable a tryon, photoBack, photoFullBody.
  poseOverride?: PoseOption;
  // Acción manual override para modelVideo (caminar/posar/girar/etc).
  // "auto" = default. Aplicable solo a modelVideo.
  actionOverride?: VideoActionOption;
}

/**
 * Opciones de pose manual que la usuaria puede elegir para tryon/photoBack/
 * photoFullBody. "auto" = default por stepId (frontal en tryon, espalda en
 * photoBack, full-body en photoFullBody).
 */
type PoseOption =
  | "auto"
  | "frontal"
  | "tres-cuartos"
  | "lateral"
  | "espalda"
  | "cuerpo-completo";

const POSE_OPTIONS: { value: PoseOption; label: string; modelCreatePose: string }[] = [
  { value: "auto",            label: "Automático",        modelCreatePose: "" /* depende del stepId */ },
  { value: "frontal",         label: "Frontal",           modelCreatePose: "standing-front-view" },
  { value: "tres-cuartos",    label: "3/4 (diagonal)",    modelCreatePose: "standing-three-quarter-view" },
  { value: "lateral",         label: "Lateral (perfil)",  modelCreatePose: "standing-side-view" },
  { value: "espalda",         label: "Espalda",           modelCreatePose: "back-view" },
  { value: "cuerpo-completo", label: "Cuerpo completo",   modelCreatePose: "standing" },
];

/**
 * Acción que ejecuta la modelo en el video. Aplicable a modelVideo.
 * El producto (bra) se mantiene visible — solo varía qué hace la modelo.
 */
type VideoActionOption =
  | "auto"
  | "girar-suave"
  | "caminar-hacia"
  | "posar-quieta"
  | "manos-cintura"
  | "girar-completo";

const VIDEO_ACTION_OPTIONS: { value: VideoActionOption; label: string; promptHint: string }[] = [
  { value: "auto",            label: "Automático",          promptHint: "movimiento natural posando" },
  { value: "girar-suave",     label: "Girar suave",         promptHint: "model slowly turning torso left and right, smooth motion" },
  { value: "caminar-hacia",   label: "Caminar hacia cámara",promptHint: "model walking toward camera, runway style, confident" },
  { value: "posar-quieta",    label: "Posar quieta",        promptHint: "model holding pose, subtle breathing motion" },
  { value: "manos-cintura",   label: "Manos en cintura",    promptHint: "model with hands on hips, slight hip sway" },
  { value: "girar-completo",  label: "Giro 360°",           promptHint: "model rotating 360 degrees, showing full outfit" },
];

/**
 * Proveedores de try-on disponibles. "auto" deja que /api/tryon elija
 * (Kolors para lencería, FASHN/IDM-VTON para otros).
 */
type TryonProvider = "seedream" | "uwear" | "leffa" | "kolors" | "fashn" | "idm-vton" | "auto";

const TRYON_PROVIDER_OPTIONS: { value: TryonProvider; label: string; hint: string }[] = [
  { value: "auto",     label: "Automático",   hint: "El sistema elige (SeedDream para lencería)" },
  { value: "seedream", label: "SeedDream edit", hint: "Default lencería · preserva el producto real (encaje, tirantes) · $0.03" },
  { value: "uwear",    label: "Uwear (dedicado)", hint: "Plataforma de moda · genera la modelo + viste tu prenda · permite lencería · SeedDream 4.5/Qwen Intimate · requiere UWEAR_API_KEY · ~$0.20" },
  { value: "leffa",    label: "Leffa (probar)", hint: "OTRO proveedor · warpea la prenda real en vez de re-dibujarla · probalo si SeedDream te cambia el producto · $0.04" },
  { value: "kolors",   label: "Kolors",        hint: "Backup · rápido · tiende a inventar prendas genéricas · $0.02" },
  { value: "fashn",    label: "FASHN v1.6",    hint: "Bloquea lencería · útil solo para no-íntimos · $0.05" },
  { value: "idm-vton", label: "IDM-VTON",      hint: "Backup · $0.02" },
];

/**
 * P1-3: modo de calidad de FASHN v1.6. Solo afecta cuando tryon usa FASHN
 * (via provider override o flow non-lencería). Kolors e IDM-VTON lo ignoran.
 */
type FashnMode = "performance" | "balanced" | "quality";

const FASHN_MODE_OPTIONS: { value: FashnMode; label: string; duration: string; hint: string }[] = [
  { value: "performance", label: "Rápido",        duration: "~5s",  hint: "Menor fidelidad, útil para previews" },
  { value: "balanced",    label: "Balanceado",    duration: "~8s",  hint: "Default — equilibrio calidad/velocidad" },
  { value: "quality",     label: "Alta calidad",  duration: "~17s", hint: "Preserva mejor texturas, costuras, broches" },
];

/**
 * Ángulo / rol de una foto del producto (Phase 2f — P0-1). La usuaria lo
 * asigna manualmente por dropdown, o se auto-detecta del nombre del archivo.
 *
 * - "frontal": vista de frente del bra (lo que hoy se subía como única foto)
 * - "espalda":  vista trasera del producto (broche, banda, cruce de tirantes)
 * - "lado":     perfil lateral
 * - "detalle":  macro de textura, costura, encaje
 * - "flat":     prenda sola sobre fondo plano, sin modelo
 * - "otra":     no aplica / no clasificada
 */
type PhotoAngle = "frontal" | "espalda" | "lado" | "detalle" | "flat" | "otra";

const PHOTO_ANGLE_OPTIONS: { value: PhotoAngle; label: string; hint: string }[] = [
  { value: "frontal", label: "Frontal",  hint: "Vista de frente (default)" },
  { value: "espalda", label: "Espalda",  hint: "Cuando exista, se usa directo en el paso Foto Espalda" },
  { value: "lado",    label: "Lado",     hint: "Perfil lateral" },
  { value: "detalle", label: "Detalle",  hint: "Macro de textura, encaje, costura" },
  { value: "flat",    label: "Flat lay", hint: "Prenda sola, sin modelo" },
  { value: "otra",    label: "Otra",     hint: "No clasificada" },
];

/**
 * Heurística: mira el nombre del archivo y adivina el ángulo. Matchea tanto
 * español (delante/patras/atras/espalda/lado/detalle) como inglés (front/back/
 * side/detail/flat). Sin match → "frontal" por default (es lo más común).
 *
 * Ejemplos que mapea bien:
 *   "bh negro patras 011473.png"       → espalda
 *   "bh blanco delante 1.png"          → frontal
 *   "011473_back_view.jpg"             → espalda
 *   "product_side_left.png"            → lado
 *   "texture_macro.jpg"                → detalle
 */
function detectPhotoAngle(filename: string): PhotoAngle {
  const f = filename.toLowerCase();
  if (/\b(patras|atras|espalda|back|rear|trasera|posterior)\b/.test(f)) return "espalda";
  if (/\b(delante|frente|frontal|front)\b/.test(f)) return "frontal";
  if (/\b(lado|side|perfil|lateral)\b/.test(f)) return "lado";
  if (/\b(detalle|detail|macro|closeup|close.?up|zoom|textura)\b/.test(f)) return "detalle";
  if (/\b(flat|flatlay|flat.?lay|packshot|ghost|mannequin|prenda.?sola)\b/.test(f)) return "flat";
  return "frontal";
}

interface ImageJob {
  id: string;
  /**
   * File object. Es null cuando el job fue restaurado desde localStorage
   * (Files no serializan). Los jobs restaurados siguen siendo viewables
   * porque tienen uploadedUrl, pero NO se pueden re-subir ni re-analizar
   * Claude Vision sin re-agregar la foto.
   */
  file: File | null;
  /**
   * Nombre del archivo original. Se preserva aún cuando `file` es null
   * (para mostrar en la UI). Cuando `file` existe, duplica `file.name`.
   */
  filename: string;
  previewUrl: string;
  uploadedUrl?: string;
  falUrl?: string;
  steps: PipelineStep[];
  status: "idle" | "active" | "done" | "error";
  totalCost: number;
  // Ficha técnica del producto extraída por Claude Vision antes de correr los
  // steps. Se inyecta en photoBack/photoFullBody/tryon para que no inventen
  // color/textura/broche. Nullable: si falla el análisis, el pipeline sigue
  // con el comportamiento legacy (invención libre).
  productSpec?: ProductSpec | null;
  // Estado del análisis: "pending" = no empezó, "analyzing" = en curso,
  // "done" = ya hay spec, "error" = falló (seguimos sin spec).
  analysisStatus?: "pending" | "analyzing" | "done" | "error";
  analysisError?: string;
  // Phase 2f P0-1: ángulo de la foto. Auto-detectado del filename, editable
  // por la usuaria en un dropdown. En P0-2, si alguna foto del batch tiene
  // angle="espalda", se usa directo en el paso Foto Espalda (no se reconstruye
  // desde la frontal).
  photoAngle: PhotoAngle;
  // Clave para agrupar fotos del MISMO producto (ej. "011473" extraído del
  // nombre). Si dos jobs comparten referenceKey, comparten referencias
  // cruzadas (la espalda de uno puede servir a la frontal del otro).
  referenceKey?: string;
  // P1-2 colorway matrix: color detectado del filename (ej "negro", "beige").
  // Usado para: badges visuales + agrupar colores del mismo producto + en el
  // futuro, optimizar el isolate cuando varios colores comparten el mismo
  // corte. Opcional — si no se detecta, queda undefined.
  color?: string;
  // Talla detectada (ej "38B", "XL"). Informativa — badge en UI + sugerencia
  // de bodyType. La modelo IA debería parecerse a esta talla para credibilidad.
  sizeHint?: string;
  suggestedBodyType?: string;
}

/**
 * Modo de generación del pipeline (elegible por la usuaria en el setup).
 *
 * - "default": el flow clásico. model-create genera una modelo IA completa,
 *   luego Kolors/FASHN viste la modelo con la prenda aislada (tryon). La
 *   prenda se APROXIMA (reinterpreta) en cada vista. Legalmente limpio —
 *   modelo IA original + prenda aislada tuya.
 *
 * - "face-swap": a las fotos reales que subiste (frontal/espalda/cuerpo) se
 *   les cambia SOLO la cara por una modelo IA. El cuerpo, pose, prenda,
 *   iluminación quedan INTACTOS → producto idéntico al original, 3 vistas
 *   consistentes entre sí. Más barato y rápido. Usar con responsabilidad —
 *   si las fotos originales tienen copyright de otro, el derivado también lo
 *   tiene aunque cambies la cara (aclarado con la usuaria).
 *
 * - "multi-sample": tryon genera 4 candidatos en 1 solo request (FASHN
 *   num_samples:4). La usuaria ve los 4 y elige la mejor. Sube la fidelidad
 *   del producto sin cambiar el pipeline legalmente. Más caro por step pero
 *   control total.
 */
type GenerationMode = "default" | "face-swap" | "multi-sample";

const GENERATION_MODE_OPTIONS: { value: GenerationMode; label: string; desc: string; cost: string; disabled?: boolean; disabledReason?: string }[] = [
  {
    value: "default",
    label: "Modelo IA + Try-on (clásico)",
    desc: "Genera una modelo IA nueva y le pone tu prenda aislada. Legalmente limpio. La prenda se reinterpreta un poco en cada vista.",
    cost: "~$0.15 / producto",
  },
  {
    value: "face-swap",
    label: "Cambiar cara sobre tu foto real",
    desc: "Usa TU foto real (frontal/espalda) y solo cambia la cara por una modelo IA. Producto idéntico al original. Más rápido y barato.",
    cost: "~$0.01 / producto",
  },
  {
    value: "multi-sample",
    label: "4 variantes — elegí la mejor",
    desc: "Foto Espalda y Cuerpo Completo generan 4 opciones con caras/interpretaciones distintas. Vos elegís la que mejor preserva tu producto. Frontal sigue con 1 resultado.",
    cost: "~$0.60 / producto (4× los pasos de vista)",
  },
];

/**
 * Art Direction = brief creativo reutilizable (concepto tomado de Uwear). En vez
 * de prompts improvisados por step, la usuaria elige un "look" y ese brief
 * estructurado se inyecta en model-create (background) y en el try-on (scenePrompt).
 * Es el mayor salto de consistencia del catálogo (ver docs/research/uwear-accuracy-playbook.md).
 * Color-agnóstico por regla del proyecto — nunca hardcodear color del producto.
 */
type ArtDirectionId = "catalogo-blanco" | "editorial-suave" | "lifestyle-natural";

interface ArtDirection {
  id: ArtDirectionId;
  label: string;
  desc: string;
  /** Fondo para model-create (reemplaza el "plain white studio background"). */
  modelBackground: string;
  /** Brief que se inyecta al prompt del try-on (seedream/uwear). */
  scenePrompt: string;
}

// Regla de fondo para ecommerce: TODAS las art directions usan fondo BLANCO limpio
// (sin gente, runway, jardín, exteriores ni props). Solo cambia la LUZ/mood, nunca el
// fondo — la usuaria pidió que todos los fondos estén listos para ecommerce.
const ECOMMERCE_BG =
  "Plain pure-white seamless e-commerce studio background ONLY. ABSOLUTELY NO people, " +
  "no audience, no crowd, no runway, no catwalk, no outdoor, no garden, no trees, no " +
  "furniture, no props, no scenery of any kind. Just the model on a clean white sweep. " +
  "Catalog packshot. Preserve the garment's exact color, texture, stitching and closure.";

const ART_DIRECTIONS: ArtDirection[] = [
  {
    id: "catalogo-blanco",
    label: "Catálogo blanco",
    desc: "E-commerce limpio: fondo blanco, luz pareja de softbox, color fiel. Default.",
    modelBackground: "clean seamless pure white studio background, no props, no scenery",
    scenePrompt:
      "Clean e-commerce studio photography, soft even softbox lighting, sharp focus, polished and minimal. " +
      ECOMMERCE_BG,
  },
  {
    id: "editorial-suave",
    label: "Editorial suave",
    desc: "Mismo fondo blanco ecommerce, pero con luz cálida direccional (más estético).",
    modelBackground: "clean seamless pure white studio background, no props, no scenery",
    scenePrompt:
      "Editorial e-commerce studio photography, warm directional key light with gentle soft shadows, elegant, sharp focus. " +
      ECOMMERCE_BG,
  },
  {
    id: "lifestyle-natural",
    label: "Luz natural",
    desc: "Mismo fondo blanco ecommerce, con luz natural suave (look más fresco).",
    modelBackground: "clean seamless pure white studio background, no props, no scenery",
    scenePrompt:
      "E-commerce studio photography with soft natural daylight, fresh and bright, sharp focus. " +
      ECOMMERCE_BG,
  },
];

/**
 * Detecta el color desde el nombre del archivo. Cubre la paleta típica del
 * catálogo Unistyles + sinónimos comunes en español y algunos en inglés.
 * Returns undefined si no matchea — entonces la usuaria no ve badge de color
 * pero la foto sigue funcionando normal.
 */
function detectColor(filename: string): string | undefined {
  const f = filename.toLowerCase();
  // Orden importa: palabras más específicas primero para no matchear
  // "rojo claro" como "rojo". Mantener lowercase + sin tildes.
  const colors: [RegExp, string][] = [
    [/\b(berde|verde|green)\b/, "verde"],
    [/\b(beige|beis|nude|nuda|piel)\b/, "beige"],
    [/\b(blanco|blanca|white|hueso)\b/, "blanco"],
    [/\b(negro|negra|black)\b/, "negro"],
    [/\b(gris|grey|gray|plomo)\b/, "gris"],
    [/\b(rojo|roja|red|vino|wine)\b/, "rojo"],
    [/\b(rosa|rose|pink|fucsia|fuchsia)\b/, "rosa"],
    [/\b(azul|blue|celeste|cielo)\b/, "azul"],
    [/\b(morado|purple|violeta|lila|lavender)\b/, "morado"],
    [/\b(amarillo|yellow|mostaza|mustard)\b/, "amarillo"],
    [/\b(naranja|orange|coral|melon)\b/, "naranja"],
    [/\b(marron|marrón|brown|cafe|café|chocolate)\b/, "marrón"],
    [/\b(dorado|oro|gold)\b/, "dorado"],
    [/\b(plateado|silver)\b/, "plateado"],
    [/\b(turquesa|turquoise|menta|mint|aqua)\b/, "turquesa"],
  ];
  for (const [re, name] of colors) {
    if (re.test(f)) return name;
  }
  return undefined;
}

/**
 * Traduce el color detectado (español) a la frase de panty en inglés para el
 * prompt de cuerpo completo, de modo que el brief HAGA JUEGO con el bra.
 * "beige"/sin color → nude (neutro seguro). Cualquier otro → ese color.
 */
function pantyColorPhrase(color?: string): string {
  const map: Record<string, string> = {
    negro: "black",
    blanco: "white",
    rojo: "red",
    rosa: "pink",
    azul: "blue",
    verde: "green",
    gris: "gray",
    morado: "purple",
    amarillo: "yellow",
    naranja: "orange",
    marrón: "brown",
    dorado: "gold",
    plateado: "silver",
    turquesa: "turquoise",
    beige: "nude beige skin-tone",
  };
  const en = color ? map[color] : undefined;
  // Sin color detectado o beige → nude neutro. Resto → "<color> seamless briefs".
  return en && color !== "beige" ? `${en} seamless briefs (panty) matching the bra color`
    : "nude beige skin-tone seamless briefs (panty)";
}

/**
 * Swatch (dot de color) para mostrar en el badge. Devuelve un HEX aproximado
 * para cada color detectable. Si no está en el map, devuelve gris neutro.
 */
const COLOR_SWATCH: Record<string, string> = {
  verde: "#2f8a4a",
  beige: "#d4c4a0",
  blanco: "#ffffff",
  negro: "#1a1a1a",
  gris: "#808080",
  rojo: "#c02633",
  rosa: "#e87fa7",
  azul: "#2b5e9c",
  morado: "#7a44a8",
  amarillo: "#f4c400",
  naranja: "#e08040",
  "marrón": "#6b4226",
  dorado: "#c99a2e",
  plateado: "#b8b8b8",
  turquesa: "#3db8a8",
};

/**
 * Detecta la talla de un bra desde el filename. Busca patrones comunes:
 *   "38B", "40C", "34 B", "XXL", "L", "S", "M"
 * Returns undefined si no matchea nada reconocible.
 *
 * Ejemplos:
 *   "Leonisa Bra BEIGE 38 B REF 011473.png" → "38B"
 *   "BH NEGRO XXL 091022.png"                → "XXL"
 *   "bh beige 011473.png"                     → undefined
 */
function detectSize(filename: string): string | undefined {
  const f = filename.toUpperCase();
  // Patrón numérico: "32B", "34 B", "38C", "40 C", "42D"
  const numMatch = f.match(/\b(\d{2})\s*([A-G])\b/);
  if (numMatch) return `${numMatch[1]}${numMatch[2]}`;
  // Patrón letter-only: "XXL", "XL", "L", "M", "S"
  const letterMatch = f.match(/\b(XXL|XL|L|M|S)\b/);
  if (letterMatch) return letterMatch[1];
  return undefined;
}

/**
 * Mapea una talla a un bodyType sugerido para el modelConfig.
 * La modelo IA debe parecerse a la talla del producto para que el resultado
 * sea creíble (no poner un bra 42D en una modelo slim).
 */
function sizeToBodyType(size: string | undefined): string | undefined {
  if (!size) return undefined;
  const s = size.toUpperCase();
  // Tallas numéricas: 32-34 → slim, 36 → average, 38 → curvy, 40+ → plus-size
  const numMatch = s.match(/^(\d{2})/);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    if (num <= 34) return "slim";
    if (num === 36) return "average";
    if (num <= 38) return "curvy";
    return "plus-size";
  }
  // Tallas letras
  if (s === "S") return "slim";
  if (s === "M") return "average";
  if (s === "L") return "curvy";
  if (s === "XL" || s === "XXL") return "plus-size";
  return undefined;
}

/**
 * Extrae una clave de referencia del nombre del archivo. Soporta patrones:
 *   "bh negro patras 011473.png"  → "011473"
 *   "011473_802_front.png"        → "011473"
 *   "REF-71332 blanco.jpg"        → "71332"
 * Si no encuentra nada parseable, devuelve undefined (la usuaria puede
 * agrupar manualmente después).
 */
function detectReferenceKey(filename: string): string | undefined {
  // Busca el primer número de 4+ dígitos (típico de REFs Unistyles tipo
  // 011473, 71332, 199307). Ignora 4 dígitos que sean claramente año/resolución.
  const m = filename.match(/\b(\d{4,7})\b/);
  if (!m) return undefined;
  const num = m[1];
  // Descarta tamaños típicos de resolución (1200, 1920, 2048, etc.)
  if (/^(1200|1920|2048|4096|800|1080|720|480|360|240)$/.test(num)) {
    // Buscar el siguiente número en el string
    const all = filename.match(/\b\d{4,7}\b/g) || [];
    const filtered = all.filter((n) => !/^(1200|1920|2048|4096|800|1080|720|480|360|240)$/.test(n));
    return filtered[0];
  }
  return num;
}

interface ModelConfig {
  gender: string;
  skinTone: string;
  bodyType: string;
  ageRange: string;
}

/* ------------------------------------------------------------------ */
/*  Step definitions                                                    */
/* ------------------------------------------------------------------ */

// Flow lencería — pensado para cubrir las 4 vistas que muestra un ecommerce tipo
// Leonisa por producto (hero frontal, espalda, cuerpo completo, prenda sola) +
// 2 videos (360 producto, modelo posando).
//
// photoBack y photoFullBody reusan el SEED del model step → la misma identidad
// de modelo en distintas poses (mismo rostro, cuerpo, tono piel). Sin seed
// compartido serían modelos diferentes en cada foto.
const STEP_DEFS: Omit<PipelineStep, "status" | "inputUrl" | "resultUrl" | "error" | "cost_actual">[] = [
  { id: "isolate",         label: "Aislar Producto",         description: "Quitar la modelo y fondo, dejar solo la prenda flotando estilo ghost 3D", icon: Scissors,  cost: "$0.01-$0.04",  enabled: true  },
  { id: "model",           label: "Crear Modelo IA",         description: "Generar modelo con licencia libre (se reutiliza entre colores de la misma REF)", icon: User,      cost: "$0.055", enabled: true  },
  { id: "tryon",           label: "Foto Frontal (opcional)", description: "Vestir la modelo IA con TU prenda, vista frontal 3/4. Si falla, el pipeline sigue con el resto.", icon: Shirt,     cost: "$0.02",  enabled: true  },
  { id: "texturePreserve", label: "Restaurar Textura",       description: "Inpaint sobre la zona del bra para recuperar la textura real de la prenda (Kolors la deja satinada/plástica). EXPERIMENTAL — desactivado por default mientras lo estabilizamos.", icon: Sparkles,  cost: "$0.05",  enabled: false },
  { id: "photoBack",       label: "Foto Espalda",            description: "Misma modelo de espaldas, mostrando el broche y la banda del bra (mismo seed, misma identidad)", icon: User,      cost: "$0.075", enabled: true  },
  { id: "photoFullBody",   label: "Foto Cuerpo Completo",    description: "Extiende el resultado del try-on hacia abajo con outpaint — misma cara y mismo bra real, agrega piernas + panty nude. NO regenera la modelo.", icon: User,      cost: "$0.05",  enabled: true  },
  { id: "productVideo",    label: "Video 360° del Producto", description: "Rotación 360° de la prenda aislada, estilo producto rotando (5s, 1:1)",     icon: Film,      cost: "$0.05",  enabled: true  },
  { id: "modelVideo",      label: "Video de la Modelo",      description: "Modelo vestida con la prenda, movimiento humano fotorealista (5s, 9:16). Provider premium Kling 2.6 Pro — apto para catálogo.",    icon: Film,      cost: "$0.35",  enabled: true  },
];

function makeSteps(): PipelineStep[] {
  return STEP_DEFS.map((d) => ({ ...d, status: "idle" }));
}

/**
 * P0-4: documentación por step mostrada en el tooltip "i". Explica qué hace,
 * qué proveedor usa, cuánto tarda típico, cuánto cuesta, qué puede fallar y
 * qué puede hacer la usuaria si falla. Fuente: docs/pipelines/lingerie.md.
 */
interface StepDoc {
  what: string;          // qué hace este step en lenguaje humano
  provider: string;      // qué proveedor / modelo usa
  duration: string;      // tiempo típico
  costDetail: string;    // detalle del costo
  canFail: string[];     // modos típicos de falla
  tips: string[];        // qué hacer la usuaria
}

const STEP_DOCS: Record<StepId, StepDoc> = {
  isolate: {
    what: "Quita la modelo y el fondo de tu foto, dejando solo la prenda flotando como si fuera un producto 3D (estilo ghost mannequin).",
    provider: "grounded_sam + SeedDream edit (o Flux Kontext para no-lencería). Fallback: WithoutBG.",
    duration: "15-45 s",
    costDetail: "$0.01 si el primer proveedor funciona; hasta $0.04 si cae al fallback final.",
    canFail: [
      "El proveedor no identifica la prenda si hay poca iluminación o fondo complejo.",
      "Si cae al último fallback (rembg), puede dejar a la modelo adentro — en ese caso el pipeline se detiene con error claro.",
    ],
    tips: [
      "Reintenta — a veces el primer intento falla por cola saturada.",
      "Si falla siempre, probá con una foto con fondo más limpio.",
      "Podés saltar este paso si ya subiste la prenda flotando (flat lay).",
    ],
  },
  model: {
    what: "Genera una modelo de IA con licencia libre (el rostro no existe). Se reutiliza en toda la REF para consistencia.",
    provider: "SeedDream v4.5 (fal.ai) — sin filtro de contenido, diseñado para lencería. Kontext Pro para no-lencería.",
    duration: "20-60 s",
    costDetail: "$0.055 por modelo nueva. $0 si reusás una ya creada desde el picker.",
    canFail: [
      "ByteDance rechaza el prompt por palabras sensibles → reintenta con prompt más seguro automáticamente.",
      "Timeout si la cola está saturada (raro en SeedDream).",
    ],
    tips: [
      "Si el resultado te gusta, aceptá y continuá — esta modelo se guarda y podés reusarla en futuras fotos sin pagar.",
      "Si no te gusta, reintentá — el seed random da variaciones.",
      "Ajustá tono de piel / edad / cuerpo en la configuración antes de correr.",
    ],
  },
  tryon: {
    what: "Viste la modelo de IA con TU prenda — la prenda real, preservando color y cortes.",
    provider: "SeedDream v4 edit (fal.ai) para lencería — editor multi-imagen (modelo + prenda) que preserva el producto real. Kolors queda de backup si SeedDream falla. FASHN v1.6 solo para no-íntimos.",
    duration: "10-30 s",
    costDetail: "$0.03 con SeedDream; $0.02 con Kolors (backup); $0.05 con FASHN.",
    canFail: [
      "image_load_error: el archivo intermedio no llegó a fal.ai (suele ser URL temporal caída).",
      "Si el badge dice 'kolors' (ámbar), SeedDream falló para esta prenda y cayó al backup — Kolors reinterpreta y puede inventar.",
      "Tela queda con aspecto satinado/plástico cuando corre Kolors. El paso 'Restaurar Textura' corrige esto.",
    ],
    tips: [
      "Este paso es OPCIONAL — si falla, el pipeline sigue con los demás.",
      "Mirá el BADGE: verde 'seedream' = preservó el producto; ámbar 'kolors' = cayó al backup.",
      "Si querés comparar, forzá un proveedor a mano en el selector de abajo y reintentá.",
      "Dejá 'Restaurar Textura' activado para recuperar la tela real después del tryon.",
    ],
  },
  texturePreserve: {
    what: "Inpaint dirigido sobre la zona del bra para recuperar la textura real (satinada, encaje, mesh) que Kolors aplana en una superficie plástica genérica.",
    provider: "grounded_sam (máscara del bra) + flux-fill-pro (Replicate, inpaint con prompt de material). Usa ProductSpec.material extraída por Claude Vision en el análisis previo.",
    duration: "20-50 s",
    costDetail: "$0.05 (≈$0.01 máscara + $0.05 flux-fill-pro).",
    canFail: [
      "Si la máscara del bra no se detecta (poca luz, fondo complejo), el step se salta sin error.",
      "Inpaint puede correr el ajuste del bra al cuerpo en 1-2 píxeles — si pasa, bajar el strength.",
      "flux-fill-pro no acepta imagen de referencia directa — la textura se guía por prompt (ProductSpec.material) y prompt-engineering. Para texturas muy específicas (encaje custom, prints), el resultado es aproximado.",
    ],
    tips: [
      "Si el bra original ya se ve bien en el tryon, podés saltar este paso.",
      "Funciona mejor cuando el productSpec tiene material identificado (ej 'satén elastizado', 'encaje floral').",
      "Si la textura quedó muy distinta, reintentá — flux-fill-pro varía con random seed.",
    ],
  },
  photoBack: {
    what: "Genera una foto de la misma modelo de espaldas, mostrando broche y banda del bra. Si subiste una foto etiquetada como 'espalda', se usa esa directo; si no, la IA la infiere del frente.",
    provider: "model-create (SeedDream con mismo seed) + Kolors Try-On. Si hay foto de espalda real, la usa como garment reference.",
    duration: "30-90 s",
    costDetail: "$0.075 ($0.055 modelo + $0.02 tryon).",
    canFail: [
      "Sin foto de espalda real, la IA inventa detalles: broche, cruce de tirantes, banda pueden diferir del producto.",
      "Mismo seed del paso 'model' → misma cara, pero ropa y pose son nuevos.",
    ],
    tips: [
      "Para mejor fidelidad, subí una foto de la espalda real del bra y etiquetala como 'Espalda' en el setup — P0-2 la usa automáticamente.",
      "Si el resultado no sirve, saltá este paso — el pipeline sigue con los otros.",
    ],
  },
  photoFullBody: {
    what: "Extiende el resultado del try-on hacia abajo con outpainting — agrega piernas + panty nude SIN regenerar la modelo. Garantiza misma cara y mismo bra real porque solo agrega canvas, no genera persona nueva.",
    provider: "/api/outpaint (flux-fill-pro con direction:'down', expandRatio:0.65) sobre el resultado del paso tryon (o texturePreserve si corrió).",
    duration: "20-50 s",
    costDetail: "$0.05 — outpaint solo, sin model-create ni tryon adicionales (antes era $0.075 con bugs).",
    canFail: [
      "Si tryon falló, este step no tiene canvas sobre el cual extender — falla con mensaje claro.",
      "El outpaint puede generar piernas anatómicamente raras si la pose original es muy de 3/4 — usar pose 'frontal' en tryon para mejor resultado.",
    ],
    tips: [
      "Corré primero 'Foto Frontal (tryon)' — y opcionalmente 'Restaurar Textura' antes — para que el outpaint extienda sobre la mejor versión.",
      "Si las piernas salen raras, reintentá — flux-fill-pro varía con random seed.",
    ],
  },
  productVideo: {
    what: "Video 360° de la prenda rotando sobre sí misma, estilo producto 3D de ecommerce.",
    provider: "wan-2.2-fast (Replicate) — 81 frames mínimo, guidance 3.0.",
    duration: "60-180 s",
    costDetail: "$0.05 por video de 5s.",
    canFail: [
      "REQUIERE que el paso 'Aislar Producto' haya completado — si no, el video rotaría la foto original (modelo + prenda).",
      "Si lo generás sin aislar, no sirve y el paso falla con mensaje claro.",
    ],
    tips: [
      "No desactives 'Aislar Producto' si querés este video.",
      "Si la rotación queda rara, reintentá — el random de wan-2.2 varía el motion.",
    ],
  },
  modelVideo: {
    what: "Video de la modelo posando con la prenda — movimiento humano natural, apto para catálogo de moda. Usa el resultado del tryon (con textura ya restaurada si texturePreserve corrió); si no hay tryon, la modelo sola.",
    provider: "Kling 2.6 Pro (fal-ai/kling-video/v2.6/pro/image-to-video) — calidad cinematográfica para humanos. wan-2.2-fast (el provider anterior, $0.05) generaba look de muñeco / piel waxy / identidad cambiando entre frames.",
    duration: "60-180 s",
    costDetail: "$0.35 por video de 5s (kling-2.6 a $0.07/s).",
    canFail: [
      "Si el tryon falló, el video muestra la modelo con base beige en vez de tu bra.",
      "Kling es más lento que wan — esperá hasta 3 min. Si tarda más, abortá y reintentá.",
    ],
    tips: [
      "Corré primero 'Foto Frontal (tryon)' — así el video usa tu prenda real.",
      "Activá 'Restaurar Textura' antes — la corrección de tela fluye al video.",
      "Si querés ahorrar costo, podés desactivar este step (perdés el video, pero las fotos quedan).",
    ],
  },
};

/**
 * Convierte mensajes técnicos de error en texto humano, amigable para la
 * usuaria que no sabe lo que es un 422 o un JSON. Si no matchea ningún pattern,
 * devuelve un mensaje genérico por step.
 */
function humanizeStepError(stepId: StepId, rawError?: string): string {
  const msg = (rawError ?? '').toLowerCase();

  // Patterns comunes de error → mensaje humano
  if (msg.includes('image_load_error') || msg.includes('failed to load the image')) {
    return "La foto se corrompió antes de llegar a la IA. Reintentá — suele funcionar la segunda vez.";
  }
  if (msg.includes('content policy') || msg.includes('e005') || msg.includes('flagged as sensitive')) {
    return "La IA rechazó la prenda por su filtro de contenido. Reintentamos con otro proveedor automáticamente — dale reintentar.";
  }
  if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('auth')) {
    return "Hubo un problema de autorización con el proveedor IA. Verificá que las API keys en Vercel estén activas.";
  }
  if (msg.includes('404') || msg.includes('not found')) {
    return "El archivo intermedio se perdió o expiró. Reintentá para regenerar desde el paso anterior.";
  }
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return "La IA tardó demasiado. Reintentá — suele ser cola saturada, no error de tu foto.";
  }
  if (msg.includes('non-image content') || msg.includes('json metadata')) {
    return "El archivo que llegó a la IA no era una imagen válida. Reintentá.";
  }
  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return "Demasiadas requests al proveedor. Esperá 30 segundos y reintentá.";
  }
  if (msg.includes('network') || msg.includes('fetch failed')) {
    return "Error de conexión al proveedor. Revisá tu internet y reintentá.";
  }

  // Fallback por step
  const byStep: Record<StepId, string> = {
    isolate: "No pudimos aislar la prenda. Probá con una foto más clara donde se vea todo el producto.",
    model: "No pudimos generar la modelo IA. Reintentá o probá con otras configuraciones.",
    tryon: "No pudimos vestir la modelo con tu prenda. Reintentá — si sigue fallando podés saltar este paso y los videos se generan igual.",
    texturePreserve: "No pudimos restaurar la textura del bra. Si el resultado del try-on ya se ve bien, podés saltar este paso.",
    photoBack: "No pudimos generar la foto de espalda. El resto del pipeline sigue sin problema.",
    photoFullBody: "No pudimos generar la foto de cuerpo completo. El resto del pipeline sigue sin problema.",
    productVideo: "No pudimos generar el video 360°. Reintentá.",
    modelVideo: "No pudimos generar el video de la modelo. Reintentá.",
  };
  return byStep[stepId] ?? "Algo salió mal en este paso. Reintentá.";
}

/* ------------------------------------------------------------------ */
/*  Cost estimate                                                       */
/* ------------------------------------------------------------------ */

function estimateCost(steps: PipelineStep[], imageCount: number): number {
  const perImage: Record<StepId, number> = {
    isolate: 0.04,       // rango $0.01-$0.04 — SeedDream ghost fallback cuando grounded_sam falla
    model: 0.055,
    tryon: 0.02,
    texturePreserve: 0.06,  // máscara (~$0.01) + flux-fill-pro inpaint ($0.05)
    photoBack: 0.075,    // model-create (0.055) + tryon (0.02) — nueva modelo con mismo seed + distinta pose
    photoFullBody: 0.05,    // outpaint flux-fill-pro sobre tryon — NO regenera modelo+tryon
    productVideo: 0.05,  // wan-2.2-fast — calidad standard, ok para producto sin humano
    modelVideo: 0.35,    // kling-2.6 Pro ($0.07/s × 5s) — premium humano fotorealista
  };
  const enabledSteps = steps.filter((s) => s.enabled);
  let cost = 0;
  for (const step of enabledSteps) {
    if (step.id === "model") {
      // model is generated ONCE and reused across all color variants for the same REF
      cost += perImage[step.id];
    } else {
      cost += perImage[step.id] * imageCount;
    }
  }
  return cost;
}

/* ------------------------------------------------------------------ */
/*  Live processing UX — rotating reassurance copy + elapsed timer      */
/* ------------------------------------------------------------------ */

/**
 * Mensajes que rotan mientras un paso procesa, para acompañar a la usuaria en
 * vez de dejarla mirando un spinner. 3 líneas por paso (la animación CSS
 * `lz-copy-track` cicla entre ellas) + un ETA humano. Fallback genérico.
 */
const PROCESSING_COPY: Record<string, { copy: [string, string, string]; eta: string }> = {
  isolate:        { copy: ["Detectando tu prenda…", "Separándola del cuerpo…", "Limpiando el fondo…"], eta: "~30s típico" },
  model:          { copy: ["Convocando a tu modelo IA…", "Definiendo pose y luz…", "Renderizando piel y cabello…"], eta: "~40s típico" },
  tryon:          { copy: ["Leyendo tu prenda real…", "Vistiendo a la modelo…", "Ajustando tirantes y corte…"], eta: "~25s típico" },
  texturePreserve:{ copy: ["Detectando la zona del bra…", "Leyendo la textura del encaje…", "Pintando la tela real…"], eta: "~50s típico" },
  photoBack:      { copy: ["Buscando la vista de espalda…", "Componiendo broche y banda…", "Afinando los detalles…"], eta: "~40s típico" },
  photoFullBody:  { copy: ["Extendiendo el lienzo…", "Agregando piernas y briefs…", "Manteniendo la misma modelo…"], eta: "~40s típico" },
  modelVideo:     { copy: ["Dándole movimiento a la modelo…", "Cuidando la identidad facial…", "Renderizando los frames…"], eta: "~2-3 min típico" },
  productVideo:   { copy: ["Preparando el giro 360°…", "Renderizando los frames…", "Puliendo el video…"], eta: "~1-2 min típico" },
};
const DEFAULT_PROCESSING_COPY: { copy: [string, string, string]; eta: string } = {
  copy: ["Procesando…", "Trabajando en tu imagen…", "Casi listo…"],
  eta: "",
};

/** Cuenta segundos mientras `active` es true; se resetea al activarse. */
function useElapsedSeconds(active: boolean): number {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!active) return;
    const start = Date.now();
    const tick = () => setSecs(Math.floor((Date.now() - start) / 1000));
    // first tick on a macrotask (avoids synchronous setState inside the effect)
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [active]);
  // When inactive, render 0 without touching state synchronously in the effect.
  return active ? secs : 0;
}

/** Formatea segundos como m:ss. */
function fmtClock(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/*  Status badge                                                        */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: StepStatus }) {
  const config = {
    idle:       { label: "Pendiente",    className: "bg-white/5 text-gray-400 border-white/10",                          icon: Clock         },
    pending:    { label: "En cola",      className: "bg-white/5 text-gray-400 border-white/10",                          icon: Clock         },
    processing: { label: "En vivo",      className: "bg-[var(--accent-dim)] text-[var(--accent-light)] border-[var(--accent)]/25", icon: Loader2 },
    done:       { label: "Listo",        className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",          icon: CheckCircle2 },
    error:      { label: "Error",        className: "bg-red-500/15 text-red-300 border-red-500/25",                      icon: AlertCircle   },
    skipped:    { label: "Saltado",      className: "bg-white/5 text-gray-500 border-white/10",                          icon: SkipForward   },
    accepted:   { label: "Aceptado",     className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",          icon: CheckCircle2 },
  }[status];

  const Icon = config.icon;
  return (
    <span className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", config.className)}>
      {status === "processing" ? (
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] lz-dot" />
      ) : (
        <Icon className="h-3 w-3" />
      )}
      {config.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Image thumbnail                                                     */
/* ------------------------------------------------------------------ */

/**
 * Thumbnail para el picker de modelos reusables. Si la previewUrl no carga
 * (URL vieja de Replicate expirada, fal URL borrada, CORS), muestra icono +
 * nombre corto en vez del icono roto <img> que el browser pone por default.
 * La usuaria reportó "hay imágenes pero no se ven las modelos" — esto lo arregla.
 */
function ModelThumb({ url, alt, name }: { url: string; alt: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-1 bg-white/5 text-center px-2"
        style={{ background: "repeating-conic-gradient(#1a1a1a 0% 25%, #141414 0% 50%) 0 0 / 10px 10px" }}
      >
        <ImageIcon className="h-5 w-5 text-gray-600" />
        <span className="text-[9px] text-gray-500 leading-tight line-clamp-2">{name}</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className="aspect-[3/4] w-full object-cover bg-white/5"
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}

function ImageThumb({ url, label, className }: { url?: string; label: string; className?: string }) {
  const [hasError, setHasError] = useState(false);

  if (!url || hasError) {
    // Placeholder visual decente en lugar del texto 'Sin imagen' plano.
    // Muestra icono + mensaje contextual con el background checkerboard típico de transparencia.
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border border-white/10 text-center px-3",
          className,
        )}
        style={{
          background: "repeating-conic-gradient(#1a1a1a 0% 25%, #141414 0% 50%) 0 0 / 16px 16px",
        }}
      >
        <ImageIcon className="h-6 w-6 text-gray-600" />
        <span className="text-[11px] text-gray-500 leading-tight">
          {hasError
            ? "La imagen expiró. Refresca la página y reprocesa."
            : "Esperando paso anterior"}
        </span>
      </div>
    );
  }
  const isVideo = url.includes(".mp4") || url.includes(".webm") || url.includes("video");
  if (isVideo) {
    return (
      <video
        src={url}
        className={cn("rounded-lg object-cover", className)}
        muted
        loop
        autoPlay
        playsInline
        onError={() => setHasError(true)}
      />
    );
  }
  return (
    <img
      src={url}
      alt={label}
      className={cn("rounded-lg object-contain", className)}
      style={{ background: "repeating-conic-gradient(#2a2a2a 0% 25%, #222 0% 50%) 0 0 / 12px 12px" }}
      onError={() => setHasError(true)}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  ImageLightbox — modal full-screen para ver/comparar/descargar      */
/* ------------------------------------------------------------------ */

interface ImageLightboxProps {
  images: string[];           // 1 o N URLs (multi-sample = N candidatos)
  startIndex: number;
  selectedUrl?: string;       // URL marcada como "elegida" (multi-sample)
  onClose: () => void;
  onSelect?: (url: string) => void;  // Si está, mostramos botón "Elegir esta"
  filenamePrefix?: string;    // ej "espalda-011473" → "espalda-011473-2.jpg"
  /** URL de referencia (foto original / input del step) para modo comparación side-by-side */
  compareWith?: string;
}

/**
 * Modal full-screen para inspeccionar una imagen al detalle. Si recibe
 * múltiples imágenes (multi-sample), permite navegar entre ellas con flechas
 * o tecla. Cada vista incluye botón Descargar y, si hay onSelect, botón
 * "Usar esta variante".
 */
function ImageLightbox({ images, startIndex, selectedUrl, onClose, onSelect, filenamePrefix, compareWith }: ImageLightboxProps) {
  const [idx, setIdx] = useState(Math.max(0, Math.min(startIndex, images.length - 1)));
  // Arranca EN modo comparación cuando hay una foto "antes" → al abrir full screen
  // se ve directo el antes/después (Original | Resultado) sin tener que buscar el
  // botón. Si es video, el render cae al reproductor igual (canCompare lo filtra).
  const [compareMode, setCompareMode] = useState<boolean>(!!compareWith);
  const url = images[idx];
  const isVideo = url && (url.includes(".mp4") || url.includes(".webm"));
  const isSelected = url === selectedUrl;
  const canCompare = !!compareWith && !isVideo;

  // Cerrar con ESC, navegar con flechas, C para comparar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && images.length > 1) setIdx((i) => (i - 1 + images.length) % images.length);
      if (e.key === "ArrowRight" && images.length > 1) setIdx((i) => (i + 1) % images.length);
      if ((e.key === "c" || e.key === "C") && compareWith && !isVideo) setCompareMode((c) => !c);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [images.length, onClose, compareWith, isVideo]);

  // Lock body scroll mientras está abierto
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  if (!url) return null;

  // Click outside (en el backdrop) cierra. Click en la imagen NO cierra.
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  // El proxy /api/proxy-image acepta filename para devolver Content-Disposition
  // attachment y detecta expired:true cuando el upstream (fal.media) ya caducó.
  // downloadAsset hace fetch→Blob→download para evitar abrir el JSON de error
  // como tab cuando la URL caducó (bug previo "File wasn't available on site").
  const filename = `${filenamePrefix ?? "uniestudio"}-${idx + 1}.${isVideo ? "mp4" : "jpg"}`;

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm"
    >
      {/* Top bar con controles */}
      <div className="absolute top-0 right-0 left-0 flex items-center justify-between gap-2 p-3 sm:p-4">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {images.length > 1 && (
            <span className="rounded-md bg-black/60 px-2.5 py-1 font-medium text-white">
              {idx + 1} / {images.length}
            </span>
          )}
          {isSelected && (
            <span className="rounded-md bg-[var(--accent)]/30 px-2.5 py-1 font-medium text-[var(--accent-light)]">
              ✓ Variante elegida
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canCompare && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setCompareMode((c) => !c); }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                compareMode
                  ? "bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent)]"
                  : "bg-white/10 text-white hover:bg-white/20",
              )}
              title="Comparar con la foto original (C)"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              {compareMode ? "Solo resultado" : "Comparar con original"}
            </button>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); void downloadAsset(url, filename); }}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20"
            title="Descargar esta imagen"
          >
            <Download className="h-3.5 w-3.5" />
            Descargar
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20"
            title="Cerrar (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Imagen / video grande, centrada. En compareMode, mostramos split
          50/50: original a la izquierda, resultado a la derecha. */}
      <div className="flex h-full w-full items-center justify-center px-4 py-16">
        {compareMode && canCompare && compareWith ? (
          <div className="flex h-full max-h-[80vh] w-full max-w-[95vw] items-center gap-2">
            <div className="relative flex-1 h-full">
              <img
                src={compareWith}
                alt="Original"
                className="h-full w-full rounded-lg object-contain"
                style={{ background: "repeating-conic-gradient(#1a1a1a 0% 25%, #0e0e0e 0% 50%) 0 0 / 16px 16px" }}
              />
              <span className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                Original
              </span>
            </div>
            <div className="relative flex-1 h-full">
              <img
                src={url}
                alt="Resultado"
                className="h-full w-full rounded-lg object-contain"
                style={{ background: "repeating-conic-gradient(#1a1a1a 0% 25%, #0e0e0e 0% 50%) 0 0 / 16px 16px" }}
              />
              <span className="absolute right-2 top-2 rounded-md bg-[var(--accent)]/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                Resultado
              </span>
            </div>
          </div>
        ) : isVideo ? (
          <video
            src={url}
            controls
            autoPlay
            loop
            className="max-h-[80vh] max-w-[95vw] rounded-lg"
          />
        ) : (
          <img
            src={url}
            alt={`Imagen ${idx + 1}`}
            className="max-h-[80vh] max-w-[95vw] rounded-lg object-contain"
            style={{ background: "repeating-conic-gradient(#1a1a1a 0% 25%, #0e0e0e 0% 50%) 0 0 / 16px 16px" }}
          />
        )}
      </div>

      {/* Navegación entre candidatos */}
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setIdx((i) => (i - 1 + images.length) % images.length); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            title="Anterior (←)"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setIdx((i) => (i + 1) % images.length); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            title="Siguiente (→)"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Bottom: botón Elegir (solo en multi-sample) */}
      {onSelect && images.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 flex justify-center p-4">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSelect(url); onClose(); }}
            disabled={isSelected}
            className={cn(
              "flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors",
              isSelected
                ? "bg-emerald-500/30 text-emerald-200 cursor-default"
                : "bg-[var(--accent)] text-[var(--bg-primary)] shadow-lg shadow-[var(--accent)]/30 hover:bg-[var(--accent)]",
            )}
          >
            <Check className="h-4 w-4" />
            {isSelected ? "Variante ya elegida" : `Usar variante ${idx + 1}`}
          </button>
        </div>
      )}

      {/* Thumbnails strip al pie cuando hay multi-sample */}
      {images.length > 1 && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-1.5 rounded-lg bg-black/60 p-1.5">
          {images.map((u, i) => (
            <button
              key={`${u}-${i}`}
              type="button"
              onClick={(e) => { e.stopPropagation(); setIdx(i); }}
              className={cn(
                "relative h-10 w-10 overflow-hidden rounded transition-all",
                i === idx ? "ring-2 ring-[var(--accent)]" : "opacity-60 hover:opacity-100",
              )}
            >
              <img src={u} alt={`v${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step Card — the core interactive component                          */
/* ------------------------------------------------------------------ */

interface StepCardProps {
  step: PipelineStep;
  stepNumber: number;
  isActive: boolean;
  previousResultUrl?: string;
  onAccept: () => void;
  onSkip: () => void;
  onRerun: () => void;
  onStop?: () => void;
  onSelectCandidate?: (url: string) => void;
  onChangeProvider?: (provider: TryonProvider) => void;
  onChangePose?: (pose: PoseOption) => void;
  onChangeAction?: (action: VideoActionOption) => void;
  autoMode: boolean;
}

function StepCard({ step, stepNumber, isActive, previousResultUrl, onAccept, onSkip, onRerun, autoMode, onStop, onSelectCandidate, onChangeProvider, onChangePose, onChangeAction }: StepCardProps) {
  const Icon = step.icon;
  // Fallback chain: step's own captured input > chain input > empty. Si los
  // dos son falsy, ImageThumb ahora muestra placeholder con ícono + "Esperando"
  // en lugar del texto crudo "Sin imagen".
  const inputUrl = step.inputUrl || previousResultUrl || undefined;
  const canInteract = step.status === "done" && !autoMode;
  const isVideo = step.resultUrl && (step.resultUrl.includes(".mp4") || step.resultUrl.includes(".webm") || step.resultUrl.includes("video"));
  const [showDocs, setShowDocs] = useState(false);
  // Lightbox: cuando es null no está abierto. Cuando tiene número, esa es
  // la imagen inicial. Para resultado único usamos el array [resultUrl].
  // Para multi-sample usamos step.candidates.
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const lightboxImages = step.candidates && step.candidates.length > 1
    ? step.candidates
    : (step.resultUrl ? [step.resultUrl] : []);
  const docs = STEP_DOCS[step.id];
  // UX en vivo: temporizador + microcopy rotativo mientras procesa.
  const elapsed = useElapsedSeconds(step.status === "processing");
  const proc = PROCESSING_COPY[step.id] ?? DEFAULT_PROCESSING_COPY;

  return (
    <div
      data-step-id={step.id}
      className={cn(
        "lz-rise rounded-2xl border transition-all duration-300",
        step.status === "processing"
          ? "border-[var(--accent)]/35 bg-gradient-to-b from-[var(--accent-glow)] to-transparent lz-glow"
          : isActive && step.status !== "idle" && step.status !== "pending"
          ? "border-[var(--accent)]/30 bg-[var(--accent-glow)]"
          : step.status === "done" || step.status === "accepted"
          ? "border-emerald-500/20 bg-emerald-500/[0.02]"
          : step.status === "skipped"
          ? "border-white/5 bg-white/[0.01] opacity-60"
          : step.status === "error"
          ? "border-red-500/30 bg-red-500/[0.03]"
          : "border-white/8 bg-white/[0.02]",
      )}
    >
      {/* Card header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative shrink-0">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors",
                step.status === "done" || step.status === "accepted"
                  ? "bg-emerald-500/15 text-emerald-300"
                  : step.status === "processing"
                  ? "bg-gradient-to-br from-[var(--accent)]/25 to-[var(--accent-muted)]/15 text-[var(--accent-light)]"
                  : step.status === "error"
                  ? "bg-red-500/15 text-red-300"
                  : isActive
                  ? "bg-[var(--accent)]/12 text-[var(--accent-light)]"
                  : "bg-white/[0.06] text-gray-400",
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
            </div>
            {(step.status === "done" || step.status === "accepted") && (
              <span className="lz-pop absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-[var(--bg-primary)]">
                <Check className="h-2.5 w-2.5 text-black/80" />
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-500">Paso {stepNumber}</span>
              {/* P0-4: botón "i" que abre el panel de docs del step */}
              {docs && (
                <button
                  type="button"
                  onClick={() => setShowDocs((s) => !s)}
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full transition-colors",
                    showDocs
                      ? "bg-[var(--accent)]/30 text-[var(--accent-light)]"
                      : "bg-white/10 text-gray-400 hover:bg-[var(--accent)]/20 hover:text-[var(--accent-light)]",
                  )}
                  title="Ver detalles de este paso"
                  aria-label="Ver detalles"
                >
                  <Info className="h-3 w-3" />
                </button>
              )}
            </div>
            <span className="block truncate text-[15px] font-semibold text-white">{step.label}</span>
            <p className="mt-0.5 truncate text-xs text-gray-500">{step.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Proveedor REAL que generó el resultado — visible SIEMPRE (también
              cuando el paso ya está "Aceptado"). Verde = SeedDream (preserva el
              producto real), ámbar = Kolors (cayó al backup, tiende a inventar
              prendas genéricas → SeedDream falló para esta prenda). */}
          {step.usedProvider && (
            <span
              className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                step.usedProvider === "kolors"
                  ? "border-amber-500/30 bg-amber-500/15 text-amber-300"
                  : "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
              }`}
              title={
                step.usedProvider === "kolors"
                  ? "Cayó a Kolors (backup): SeedDream falló para esta prenda. Kolors tiende a inventar prendas genéricas. Reintentá o subí mejor la prenda aislada."
                  : `Proveedor que generó este resultado: ${step.usedProvider}.`
              }
            >
              {step.usedProvider}
            </span>
          )}
          <span className="text-xs font-medium text-gray-500">{step.cost}</span>
          <StatusBadge status={step.status} />
          {/* P0-3: botón DETENER visible solo cuando está procesando y existe un handler */}
          {step.status === "processing" && onStop && (
            <button
              type="button"
              onClick={onStop}
              className="flex items-center gap-1 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-[11px] font-semibold text-red-300 transition-colors hover:bg-red-500/20"
              title="Cancelar este paso"
            >
              <StopCircle className="h-3 w-3" />
              Detener
            </button>
          )}
        </div>
      </div>

      {/* P0-4: panel desplegable con docs del step (qué hace, proveedor, costo,
          duración, fallas típicas, tips). Se expande al tocar el ícono "i". */}
      {showDocs && docs && (
        <div className="border-b border-white/6 bg-[var(--accent)]/[0.03] px-5 py-4 text-xs">
          <div className="space-y-3">
            <div>
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">Qué hace</p>
              <p className="text-gray-300">{docs.what}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">Proveedor</p>
                <p className="text-gray-400">{docs.provider}</p>
              </div>
              <div>
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">Duración típica</p>
                <p className="text-gray-400">{docs.duration}</p>
              </div>
              <div>
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">Costo</p>
                <p className="text-gray-400">{docs.costDetail}</p>
              </div>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">Qué puede fallar</p>
              <ul className="list-disc space-y-0.5 pl-4 text-gray-400">
                {docs.canFail.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Tips</p>
              <ul className="list-disc space-y-0.5 pl-4 text-gray-300">
                {docs.tips.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Manual overrides — siempre visibles para que la usuaria pueda elegir
          ángulo/acción ANTES de procesar (no solo cuando hay error). */}
      {(step.id === "tryon" || step.id === "photoBack" || step.id === "photoFullBody") && onChangePose && step.status !== "done" && step.status !== "accepted" && (
        <div className="px-5 py-3 border-t border-white/[0.04]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-gray-500 shrink-0">Pose:</span>
            <select
              value={step.poseOverride ?? "auto"}
              onChange={(e) => onChangePose(e.target.value as PoseOption)}
              disabled={step.status === "processing"}
              className="flex-1 rounded-md border border-white/15 bg-black/40 px-2 py-1.5 text-[11px] text-white outline-none focus:border-[var(--accent)]/50 disabled:opacity-50"
            >
              {POSE_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}{p.value === "auto" ? ` (default: ${step.id === "photoBack" ? "espalda" : step.id === "photoFullBody" ? "cuerpo completo" : "frontal"})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      {step.id === "modelVideo" && onChangeAction && step.status !== "done" && step.status !== "accepted" && (
        <div className="px-5 py-3 border-t border-white/[0.04]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-gray-500 shrink-0">Acción:</span>
            <select
              value={step.actionOverride ?? "auto"}
              onChange={(e) => onChangeAction(e.target.value as VideoActionOption)}
              disabled={step.status === "processing"}
              className="flex-1 rounded-md border border-white/15 bg-black/40 px-2 py-1.5 text-[11px] text-white outline-none focus:border-[var(--accent)]/50 disabled:opacity-50"
            >
              {VIDEO_ACTION_OPTIONS.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Card body — before/after comparison */}
      {(step.status !== "idle" && step.status !== "pending") && (
        <div className="p-5">
          <div className="flex items-center gap-4">
            {/* Input (before) */}
            <div className="flex-1 min-w-0">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Original</p>
              <ImageThumb
                url={step.originalUrl ?? inputUrl}
                label="Sin imagen"
                className="h-40 w-full"
              />
            </div>

            {/* Arrow */}
            <div className="flex shrink-0 flex-col items-center gap-1">
              <ArrowRight className={cn(
                "h-5 w-5",
                step.status === "processing" ? "text-[var(--accent)] animate-pulse" : "text-gray-600",
              )} />
            </div>

            {/* Output (after) */}
            <div className="flex-1 min-w-0">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Resultado</p>
              {step.status === "processing" ? (
                <div className="relative flex h-40 w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-lg border border-[var(--accent)]/25 bg-[var(--accent-glow)]">
                  {/* skeleton shimmer detrás, como que la imagen se está "revelando" */}
                  <div className="lz-skeleton absolute inset-0 opacity-40" aria-hidden="true" />
                  <div className="relative flex flex-col items-center gap-2 px-4 text-center">
                    {/* ring animado con el tiempo transcurrido en el centro */}
                    <div className="relative h-12 w-12">
                      <div
                        className="lz-spin absolute inset-0 rounded-full"
                        style={{
                          background: "conic-gradient(var(--accent) 25%, rgba(255,255,255,0.08) 0)",
                          WebkitMask: "radial-gradient(closest-side, transparent 66%, #000 67%)",
                          mask: "radial-gradient(closest-side, transparent 66%, #000 67%)",
                        }}
                        aria-hidden="true"
                      />
                      <div className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold tabular-nums text-[var(--accent-light)]">
                        {fmtClock(elapsed)}
                      </div>
                    </div>
                    {/* microcopy que rota para acompañar a la usuaria */}
                    <div className="h-5 overflow-hidden">
                      <div className="lz-copy-track">
                        {proc.copy.map((line, i) => (
                          <div key={i} className="flex h-5 items-center justify-center text-xs text-[var(--text-secondary)]">
                            {line}
                          </div>
                        ))}
                      </div>
                    </div>
                    {proc.eta && <span className="text-[10px] text-gray-500">{proc.eta}</span>}
                  </div>
                  {/* barra indeterminada con destello que barre */}
                  <div className="absolute inset-x-0 bottom-0 h-1 overflow-hidden bg-white/5">
                    <div className="lz-bar-sheen h-full w-full" aria-hidden="true" />
                  </div>
                </div>
              ) : step.status === "error" ? (
                <div className="flex h-40 w-full flex-col items-center justify-center gap-2 overflow-auto rounded-lg border border-red-500/20 bg-red-500/[0.04] px-3 py-3">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
                  <p className="text-center text-sm font-medium text-red-300">
                    {humanizeStepError(step.id, step.error)}
                  </p>
                  {step.error && (
                    <details className="w-full">
                      <summary className="cursor-pointer text-[10px] text-gray-500 hover:text-gray-300">
                        Ver detalle técnico
                      </summary>
                      <pre className="mt-1 max-h-20 overflow-auto rounded bg-black/40 p-2 text-[9px] leading-tight text-gray-400">
                        {step.error}
                      </pre>
                    </details>
                  )}
                </div>
              ) : step.status === "skipped" && step.error ? (
                /* Skipped con error message: típicamente photoBack sin foto de
                   espalda real. Banner amber claro (no rojo — no es un fallo,
                   es una pre-condición no cumplida) explicando qué hacer. */
                <div className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-400" />
                  <p className="text-center text-xs font-medium text-amber-200 leading-snug">
                    {step.error}
                  </p>
                  {step.id === "photoBack" && (
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById("lingerie-upload-area");
                        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className="mt-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-100 transition-colors hover:bg-amber-500/20"
                    >
                      Ir a subir foto de espalda
                    </button>
                  )}
                </div>
              ) : step.candidates && step.candidates.length > 1 ? (
                // Multi-sample: grid 2×2 de candidatos. resultUrl es el
                // seleccionado actualmente (borde violeta); click en uno
                // ABRE el lightbox (no selecciona directo) — la usuaria ve
                // el detalle al tamaño grande y desde ahí puede elegir.
                <div>
                  <p className="mb-1.5 text-[10px] text-[var(--accent)]">
                    {step.candidates.length} variantes — tocá una para verla grande y elegirla
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {step.candidates.map((url, i) => {
                      const isSelected = url === step.resultUrl;
                      return (
                        <button
                          key={`${url}-${i}`}
                          type="button"
                          onClick={() => setLightboxIdx(i)}
                          className={cn(
                            "group relative aspect-[3/4] overflow-hidden rounded-md border transition-all",
                            isSelected
                              ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/50"
                              : "border-white/15 hover:border-white/40",
                          )}
                          title={`Tocá para ver variante ${i + 1} en grande${isSelected ? ' (seleccionada)' : ''}`}
                        >
                          <img
                            src={url}
                            alt={`Variante ${i + 1}`}
                            className="h-full w-full object-contain"
                            style={{ background: "repeating-conic-gradient(#2a2a2a 0% 25%, #222 0% 50%) 0 0 / 10px 10px" }}
                          />
                          <div className="absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-[9px] font-bold text-white">
                            {i + 1}
                          </div>
                          {isSelected && (
                            <div className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent)]">
                              <Check className="h-2.5 w-2.5 text-white" />
                            </div>
                          )}
                          {/* Hint visual de "click para zoom" */}
                          <div className="absolute right-1 bottom-1 flex h-5 w-5 items-center justify-center rounded bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                            <Maximize2 className="h-3 w-3 text-white" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => step.resultUrl && setLightboxIdx(0)}
                  disabled={!step.resultUrl}
                  className="group relative block w-full text-left disabled:cursor-not-allowed"
                  title={step.resultUrl ? "Tocá para ver en grande + descargar" : undefined}
                >
                  {/* ImageThumb maneja video, imagen y URL expirada (placeholder
                      limpio "La imagen expiró"). Sin slider — la vista de dos
                      paneles Original | Resultado es la estable. */}
                  <ImageThumb url={step.resultUrl} label="Resultado" className="h-40 w-full" />
                  {(step.status === "accepted") && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-emerald-500/20 pointer-events-none">
                      <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                    </div>
                  )}
                  {step.resultUrl && (
                    <div className="absolute right-1.5 top-1.5 flex h-7 items-center gap-1 rounded-md bg-black/60 px-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <Maximize2 className="h-3.5 w-3.5 text-white" />
                      <span className="text-[10px] font-medium text-white">Ver grande</span>
                    </div>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Action buttons — only shown when done and in manual mode */}
          {canInteract && (
            <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-white/6 pt-4">
              {/* Selector para re-testear con otro proveedor (el badge del
                  proveedor que corrió está en la cabecera, siempre visible).
                  Cambiá el proveedor acá y dale Rehacer para comparar Kolors
                  vs FASHN antes de aceptar. */}
              {onChangeProvider && (step.id === "tryon" || step.id === "photoBack" || step.id === "photoFullBody") && (
                <div className="mr-auto flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-gray-500">Proveedor:</span>
                  <select
                    value={step.providerOverride ?? "auto"}
                    onChange={(e) => onChangeProvider(e.target.value as TryonProvider)}
                    className="rounded-md border border-white/15 bg-black/40 px-2 py-1 text-[11px] text-white outline-none focus:border-[var(--accent)]/50"
                    title="Cambiá el proveedor y dale Rehacer para comparar"
                  >
                    {TRYON_PROVIDER_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value} title={p.hint}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button
                onClick={onSkip}
                className="lz-lift flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-gray-400 hover:bg-white/5 hover:text-white"
              >
                <SkipForward className="h-3.5 w-3.5" />
                Saltar
              </button>
              {/* Descargar directo sin abrir lightbox */}
              {step.resultUrl && (
                <button
                  type="button"
                  onClick={() => {
                    if (!step.resultUrl) return;
                    void downloadAsset(
                      step.resultUrl,
                      `unistudio-${step.id}.${isVideo ? "mp4" : "jpg"}`,
                    );
                  }}
                  className="lz-lift flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-gray-300 hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/10 hover:text-[var(--accent-light)]"
                  title="Descargar esta imagen"
                >
                  <Download className="h-3.5 w-3.5" />
                  Descargar
                </button>
              )}
              <button
                onClick={onRerun}
                className="lz-lift flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-gray-300 hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/10 hover:text-[var(--accent-light)]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Rehacer
              </button>
              <button
                onClick={onAccept}
                className="lz-lift flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-gradient-to-b from-emerald-400/90 to-emerald-500 px-4 py-2 text-xs font-semibold text-emerald-950 shadow-[0_4px_14px_-4px_rgba(80,200,120,0.5)] hover:brightness-105"
              >
                <Check className="h-3.5 w-3.5" />
                Aceptar y continuar
              </button>
            </div>
          )}

          {/* Error retry — Reintentar es primario (botón grande violeta), Saltar secundario (link gris) */}
          {step.status === "error" && (
            <div className="mt-4 space-y-3 border-t border-white/6 pt-4">
              {/* P1-1: selector de proveedor para tryon steps. Permite reintentar
                  con FASHN si Kolors reinterpretó mal el broche/textura. */}
              {onChangeProvider && (step.id === "tryon" || step.id === "photoBack" || step.id === "photoFullBody") && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-gray-500">Proveedor:</span>
                  <select
                    value={step.providerOverride ?? "auto"}
                    onChange={(e) => onChangeProvider(e.target.value as TryonProvider)}
                    className="flex-1 rounded-md border border-white/15 bg-black/40 px-2 py-1 text-[11px] text-white outline-none focus:border-[var(--accent)]/50"
                  >
                    {TRYON_PROVIDER_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value} title={p.hint}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={onSkip}
                  className="text-xs font-medium text-gray-500 underline-offset-2 hover:text-gray-300 hover:underline"
                >
                  Saltar este paso
                </button>
                <button
                  onClick={onRerun}
                  className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--bg-primary)] shadow-md transition-colors hover:brightness-105"
                >
                  <RotateCcw className="h-4 w-4" />
                  {step.providerOverride && step.providerOverride !== "auto"
                    ? `Reintentar con ${TRYON_PROVIDER_OPTIONS.find((p) => p.value === step.providerOverride)?.label ?? step.providerOverride}`
                    : "Reintentar"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lightbox: portal a document.body para que el modal `fixed` NO quede
          atrapado por el transform/overflow del card (si no, se mal-posiciona,
          tapa la página y bloquea scroll/clicks). Solo se monta con lightboxIdx. */}
      {lightboxIdx !== null && lightboxImages.length > 0 && createPortal(
        <ImageLightbox
          images={lightboxImages}
          startIndex={lightboxIdx}
          selectedUrl={step.resultUrl}
          onClose={() => setLightboxIdx(null)}
          onSelect={onSelectCandidate}
          filenamePrefix={`unistudio-${step.id}`}
          // Referencia para el modo comparación (antes): para la Foto Frontal es
          // la MODELO nueva (originalUrl); para el resto, el input del step. Así
          // el full screen abre en "antes vs después" con la referencia correcta.
          compareWith={step.originalUrl ?? inputUrl}
        />,
        document.body,
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Product spec panel (ficha técnica leída por Claude Vision)          */
/* ------------------------------------------------------------------ */

interface ProductSpecPanelProps {
  status: ImageJob["analysisStatus"];
  spec: ProductSpec | null | undefined;
  error?: string;
  onChange: (updated: ProductSpec) => void;
  onReanalyze?: () => void;
}

/**
 * Campos que Claude lee del producto. Se mantienen string/null y se editan
 * inline; el resultado queda pegado al `job.productSpec` para iteraciones
 * futuras (hoy solo se muestran al usuario — iteración 2 los inyecta en los
 * prompts de generación).
 */
const SPEC_FIELDS: {
  group: "Identidad" | "Construcción" | "Detalles";
  key: string;
  label: string;
  placeholder: string;
  getter: (s: ProductSpec) => string | null | undefined;
  setter: (s: ProductSpec, v: string) => ProductSpec;
}[] = [
  { group: "Identidad", key: "color", label: "Color principal", placeholder: "ej. negro satinado",
    getter: (s) => s.color?.primary,
    setter: (s, v) => ({ ...s, color: { ...s.color, primary: v } }) },
  { group: "Identidad", key: "material", label: "Tela", placeholder: "ej. satén con elastano",
    getter: (s) => s.material,
    setter: (s, v) => ({ ...s, material: v }) },
  { group: "Identidad", key: "texture", label: "Textura", placeholder: "ej. lisa con brillo suave",
    getter: (s) => s.texture,
    setter: (s, v) => ({ ...s, texture: v }) },
  { group: "Identidad", key: "type", label: "Tipo de prenda", placeholder: "ej. bra deportivo con broche frontal",
    getter: (s) => s.garment?.type,
    setter: (s, v) => ({ ...s, garment: { ...s.garment, type: v } }) },
  { group: "Construcción", key: "cup", label: "Copa", placeholder: "ej. preformada, costura en V",
    getter: (s) => s.garment?.cup,
    setter: (s, v) => ({ ...s, garment: { ...s.garment, cup: v || null } }) },
  { group: "Construcción", key: "strapStyle", label: "Tirantes", placeholder: "ej. anchos ajustables",
    getter: (s) => s.garment?.strapStyle,
    setter: (s, v) => ({ ...s, garment: { ...s.garment, strapStyle: v || null } }) },
  { group: "Construcción", key: "frontClosure", label: "Broche frontal", placeholder: "ej. 5 ganchos centrales o sin cierre",
    getter: (s) => s.garment?.frontClosure,
    setter: (s, v) => ({ ...s, garment: { ...s.garment, frontClosure: v || null } }) },
  { group: "Construcción", key: "backClosure", label: "Cierre trasero", placeholder: "ej. 3 ganchos y gancho",
    getter: (s) => s.garment?.backClosure,
    setter: (s, v) => ({ ...s, garment: { ...s.garment, backClosure: v || null } }) },
  { group: "Construcción", key: "band", label: "Banda", placeholder: "ej. ancha 5cm",
    getter: (s) => s.garment?.band,
    setter: (s, v) => ({ ...s, garment: { ...s.garment, band: v || null } }) },
  { group: "Detalles", key: "padding", label: "Padding", placeholder: "ej. removible / sin padding",
    getter: (s) => s.garment?.padding,
    setter: (s, v) => ({ ...s, garment: { ...s.garment, padding: v || null } }) },
  { group: "Detalles", key: "underwire", label: "Varilla", placeholder: "ej. sin varilla",
    getter: (s) => s.garment?.underwire,
    setter: (s, v) => ({ ...s, garment: { ...s.garment, underwire: v || null } }) },
  { group: "Detalles", key: "details", label: "Otros detalles", placeholder: "ej. encaje, transparencias, bordados",
    getter: (s) => s.garment?.details,
    setter: (s, v) => ({ ...s, garment: { ...s.garment, details: v || null } }) },
];

function ProductSpecPanel({ status, spec, error, onChange, onReanalyze }: ProductSpecPanelProps) {
  const [open, setOpen] = useState(true);

  // Estado de análisis en curso
  if (status === "analyzing") {
    return (
      <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/[0.05] p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
          <div>
            <p className="text-sm font-semibold text-white">Entendiendo el producto…</p>
            <p className="text-xs text-gray-400">Claude Vision está leyendo la foto para extraer color, textura y detalles reales.</p>
          </div>
        </div>
      </div>
    );
  }

  // Error en el análisis — el pipeline sigue pero sin spec
  if (status === "error") {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-200">No se pudo leer la ficha técnica</p>
            <p className="mt-1 text-xs text-gray-400">
              {error || "Claude Vision no respondió."} El pipeline continúa igual que antes — los pasos siguientes van a inferir los detalles del producto.
            </p>
            {onReanalyze && (
              <button
                onClick={onReanalyze}
                className="mt-2 flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-200 hover:bg-amber-500/20"
              >
                <RotateCcw className="h-3 w-3" />
                Reintentar análisis
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // No spec todavía (pending o antes de correr el pipeline)
  if (!spec) return null;

  return (
    <div className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/[0.03]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left"
      >
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-4 w-4 text-[var(--accent)]" />
          <div>
            <p className="text-sm font-semibold text-white">Ficha técnica del producto</p>
            <p className="text-[11px] text-gray-500">Leída por Claude Vision — podés editar cualquier campo antes de que corra el resto.</p>
          </div>
        </div>
        <ChevronRight className={cn("h-4 w-4 text-gray-400 transition-transform", open && "rotate-90")} />
      </button>

      {open && (
        <div className="space-y-4 border-t border-[var(--accent)]/15 px-5 py-4">
          {(["Identidad", "Construcción", "Detalles"] as const).map((group) => {
            const fields = SPEC_FIELDS.filter((f) => f.group === group);
            return (
              <div key={group}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]/70">{group}</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {fields.map((field) => {
                    const value = field.getter(spec) ?? "";
                    return (
                      <label key={field.key} className="flex flex-col gap-1">
                        <span className="text-[11px] text-gray-400">{field.label}</span>
                        <input
                          type="text"
                          value={value}
                          placeholder={field.placeholder}
                          onChange={(e) => onChange(field.setter(spec, e.target.value))}
                          className="rounded-md border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white outline-none focus:border-[var(--accent)]/50"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {spec.notes && (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]/70">Notas</p>
              <textarea
                value={spec.notes}
                onChange={(e) => onChange({ ...spec, notes: e.target.value })}
                rows={2}
                className="w-full rounded-md border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white outline-none focus:border-[var(--accent)]/50"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Upload zone                                                         */
/* ------------------------------------------------------------------ */

function UploadZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length > 0) onFiles(files);
  }, [onFiles]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    if (files.length > 0) onFiles(files);
    e.target.value = "";
  }, [onFiles]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 transition-all",
        dragging
          ? "border-[var(--accent)]/60 bg-[var(--accent)]/10"
          : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]",
      )}
    >
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleChange} />
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5">
        <Upload className={cn("h-6 w-6", dragging ? "text-[var(--accent)]" : "text-gray-400")} />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-white">Arrastra las fotos aquí</p>
        <p className="mt-1 text-xs text-gray-500">O haz clic para seleccionar — múltiples ángulos/colores del mismo producto</p>
      </div>
      <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-500">JPG, PNG, WebP — máx. 50MB por foto</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Convierte un File a dataURL base64 para mandar a /api/analyze-product.
 * Claude Vision necesita el contenido inline (no URLs externas accesibles
 * desde el server).
 */
async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`No se pudo leer el archivo ${file.name}`));
    reader.readAsDataURL(file);
  });
}

/**
 * Analiza las fotos de un producto con Claude Vision y devuelve la ficha
 * técnica. Por ahora solo usa la foto frontal (la que subiste inicialmente).
 * Cuando agreguemos multi-foto, el caller puede pasar más entradas.
 */
async function analyzeProductPhotos(
  photos: { file: File; role: "frontal" | "back" | "detail" | "flat" }[],
  productType: string,
): Promise<ProductSpec> {
  const dataUrls = await Promise.all(
    photos.map(async (p) => ({ dataUrl: await fileToDataUrl(p.file), role: p.role })),
  );
  const res = await fetch("/api/analyze-product", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ photos: dataUrls, productType }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "analyze-product failed");
  return json.data.productSpec as ProductSpec;
}

async function uploadFile(file: File): Promise<{ url: string; falUrl?: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Upload failed");
  return { url: json.data.replicateUrl || json.data.url, falUrl: json.data.falUrl };
}

/**
 * Arma una descripción compacta de la CONSTRUCCIÓN real del producto leída por
 * Claude Vision (cierre, copas, tirantes, banda, varilla, detalles). Se inyecta
 * en el prompt del try-on para anclar al producto real y evitar que SeedDream
 * invente un zipper o costuras que no existen (reporte usuaria ref 011473).
 * Devuelve "" si no hay spec útil.
 */
function buildGarmentDescription(spec: ProductSpec | null | undefined): string | undefined {
  if (!spec) return undefined;
  const g = spec.garment;
  const parts: string[] = [];
  if (spec.material?.trim()) parts.push(`material: ${spec.material.trim()}`);
  if (spec.texture?.trim()) parts.push(`textura: ${spec.texture.trim()}`);
  if (g?.cup?.trim()) parts.push(`copas: ${g.cup.trim()}`);
  if (g?.strapStyle?.trim()) parts.push(`tirantes: ${g.strapStyle.trim()}`);
  if (g?.frontClosure?.trim()) parts.push(`cierre frontal: ${g.frontClosure.trim()}`);
  if (g?.backClosure?.trim()) parts.push(`cierre trasero: ${g.backClosure.trim()}`);
  if (g?.band?.trim()) parts.push(`banda: ${g.band.trim()}`);
  if (g?.underwire?.trim()) parts.push(`varilla: ${g.underwire.trim()}`);
  if (g?.padding?.trim()) parts.push(`relleno: ${g.padding.trim()}`);
  if (g?.details?.trim()) parts.push(`detalles: ${g.details.trim()}`);
  const out = parts.join("; ");
  return out.length > 0 ? out : undefined;
}

async function runStep(
  stepId: StepId,
  inputUrl: string,
  falUrl: string | undefined,
  modelConfig: ModelConfig,
  productType: string,
  sharedModelUrl?: string,
  referenceNumber?: string,
  sharedSeed?: number,
  isolatedGarmentUrl?: string,
  // P0-3: signal opcional de AbortController. Si la usuaria aprieta Detener,
  // el controller se abort()a y todos los fetch() de este step explotan con
  // DOMException("AbortError") → el caller en processJob marca el step como
  // "error" con mensaje custom ("Cancelado por la usuaria").
  abortSignal?: AbortSignal,
  /**
   * P0-2: URL de una foto de ESPALDA real del producto (que la usuaria subió
   * y tagged como angle="espalda"). Cuando se pasa y el step es photoBack,
   * en vez de reconstruir la espalda desde la frontal se usa esta foto
   * directo como garment reference en el tryon. El resultado preserva detalles
   * reales del broche, banda, cruce de tirantes.
   */
  backGarmentUrl?: string,
  /**
   * P1-1: proveedor de tryon que la usuaria eligió en el retry. Si se pasa,
   * sobreescribe el default (Kolors para lencería). Aplica en tryon,
   * photoBack (phase 2) y photoFullBody (phase 2).
   */
  providerOverride?: TryonProvider,
  /**
   * P1-3: modo de calidad FASHN. Solo tiene efecto si el proveedor resuelto
   * termina siendo FASHN. Kolors e IDM-VTON lo ignoran.
   */
  fashnMode?: FashnMode,
  /**
   * Pose manual elegida por la usuaria desde el step card. Si "auto" o
   * undefined, se usa el default por stepId (back-view en photoBack,
   * standing en photoFullBody, etc).
   */
  poseOverride?: PoseOption,
  /**
   * Acción manual para modelVideo (girar/caminar/posar/etc). Si "auto" o
   * undefined, se usa el default genérico.
   */
  actionOverride?: VideoActionOption,
  /**
   * Material extraído por Claude Vision en el análisis previo (ej "satén
   * elastizado", "encaje floral", "mesh transparente"). Lo usa
   * texturePreserve para guiar el prompt de flux-fill-pro hacia la textura
   * correcta — flux-fill-pro NO acepta imagen de referencia, solo texto.
   */
  materialHint?: string,
  /**
   * Descripción de la construcción real del producto (cierre, copas, tirantes…)
   * leída por Claude Vision. Se inyecta en el prompt del try-on para que SeedDream
   * preserve el cierre/costuras reales en vez de inventar (zipper, costura de copa).
   */
  garmentDescription?: string,
  /**
   * Art Direction elegida (id). Inyecta el brief al `background` de model-create
   * y al `scenePrompt` del try-on. Si no se pasa, usa el primer preset (catálogo blanco).
   */
  artDirectionId?: string,
  /**
   * Color detectado del producto (job.color, ej "negro", "rojo", "beige"). Lo usa
   * photoFullBody para que el panty/brief del cuerpo completo HAGA JUEGO con el bra
   * (bra negro → panty negro), en vez de hardcodear beige nude. Si no se detecta,
   * cae a "skin-tone nude" como neutro seguro.
   */
  garmentColor?: string,
): Promise<{ resultUrl: string; cost: number; newModelUrl?: string; newSeed?: number; usedProvider?: string }> {
  // Brief creativo elegido. Fallback al primer preset si el id no matchea.
  const artDir = ART_DIRECTIONS.find((a) => a.id === artDirectionId) ?? ART_DIRECTIONS[0];
  // Map productType to the garmentType the AI Agent routes expect. This unlocks:
  // - bg-remove's grounded_sam segmentation (needs garmentType + removeSubject)
  // - model-create's SeedDream routing with the no-moderation prompt
  // - tryon's forced Kolors for lingerie
  // Centralized in src/lib/constants/garment-types.ts (commit S1).
  const garmentTypeForApi = mapProductTypeToGarmentType(productType);
  const isLingerieFlow = garmentTypeForApi !== 'other';

  if (stepId === "isolate") {
    const res = await fetch("/api/bg-remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: abortSignal,
      body: JSON.stringify({
        // Preferir falUrl (URL PÚBLICA de fal): el uploadedUrl/inputUrl suele ser un
        // URL de Replicate protegido (api.replicate.com/v1/files) que requiere auth
        // → el navegador muestra "expiró", y NI grounded_sam NI Uwear lo pueden bajar
        // (401 "could not download"). El falUrl es público y lo bajan todos.
        imageUrl: falUrl ?? inputUrl,
        // Foto de espalda real del MISMO REF (pública) → el ghost la usa como 2ª
        // referencia para reconstruir bien la espalda y no borrarla/inventarla.
        backImageUrl: backGarmentUrl,
        provider: "replicate",
        // Lingerie input usually shows a model wearing the garment — we need
        // grounded_sam to strip the person and return ONLY the product, not
        // run plain rembg which keeps the person as foreground.
        removeSubject: isLingerieFlow,
        garmentType: garmentTypeForApi,
      }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "bg-remove failed");
    // Hard-fail en lencería cuando isolate cayó al último recurso rembg plano:
    // ese provider solo quita el fondo pero DEJA A LA MODELO como foreground.
    // Downstream productVideo genera rotación de la modelo en vez de la prenda.
    // Mejor fallar acá con mensaje claro que generar un video 360° inútil.
    if (isLingerieFlow && json.data?.provider === 'rembg-last-resort') {
      throw new Error(
        "No se pudo recortar la prenda sola (esta foto es difícil para el recorte automático). NO inventamos un producto falso — preferimos avisarte. Para el catálogo: DESACTIVÁ el paso 'Aislar Producto' y en el Try-on usá el proveedor 'Uwear' (usa tu foto real, no necesita el recorte). El Video 360° sí necesita el recorte: para ese, reintentá con una foto de la prenda sola o más limpia."
      );
    }
    // Aviso honesto: si el aislado vino de SeedDream (regenerativo), el producto
    // PUEDE no ser pixel-idéntico al real. Que la usuaria lo revise antes de
    // mandarlo al catálogo. Cuando vino de grounded_sam (el producto real), no
    // molestamos con ningún aviso.
    if (isLingerieFlow && json.data?.regenerated) {
      toast.warning(
        "⚠️ Esta foto era difícil de recortar, así que la prenda se regeneró con IA (SeedDream). Revisá que el resultado coincida con tu producto real antes de usarlo en el catálogo — puede tener diferencias.",
        12000,
      );
    }
    return { resultUrl: json.data.url, cost: json.cost ?? 0.01 };
  }

  // Step "background" (Fondo Profesional) removed 2026-04-21 — era para pipeline
  // Estáticos (perfumes/cremas), no para lencería. El tryon Kolors ya provee
  // fondo blanco estudio. Dead code — cualquier legacy stepId "background" que
  // llegue acá cae al throw del final de runStep.

  if (stepId === "model") {
    if (sharedModelUrl) return { resultUrl: sharedModelUrl, cost: 0 };
    // Bra → MEDIO CUERPO (de la cabeza a la cintura). El cuerpo completo se arma
    // después en el paso photoFullBody con outpaint. Si la modelo sale cuerpo
    // completo acá, la frontal queda mal y el full-body se rompe.
    const pose = productType === "bra"
      ? "waist-up half-body beauty portrait with the COMPLETE head and face clearly visible and centered, headroom above the head, framed from above the head down to the waist, front-facing, looking at camera, head must NOT be cropped, not a full-body shot, no legs"
      : "full-body front-facing";
    // Generamos seed cliente-side y lo pasamos a model-create. Guardamos el seed
    // para que photoBack + photoFullBody puedan reusar la misma identidad de
    // modelo cambiando solo la pose.
    const generatedSeed = Math.floor(Math.random() * 999999);
    const res = await fetch("/api/model-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: abortSignal,
      body: JSON.stringify({
        gender: modelConfig.gender,
        ageRange: modelConfig.ageRange,
        skinTone: modelConfig.skinTone,
        bodyType: modelConfig.bodyType,
        pose,
        expression: "confident natural",
        // Fondo blanco ecommerce ESTRICTO — sin softbox, equipo de estudio, props ni escenas.
        background: "plain pure-white seamless background only, no studio equipment, no softbox, no props, no scenery",
        garmentType: garmentTypeForApi,
        seed: generatedSeed,
        // Tag the saved AiModel with this reference so future runs for same SKU can reuse
        referenceNumber: referenceNumber || undefined,
      }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "model-create failed");
    return { resultUrl: json.data.url, cost: json.cost ?? 0.055, newModelUrl: json.data.url, newSeed: generatedSeed };
  }

  // photoFullBody: extiende el resultado del tryon (o texturePreserve si corrió)
  // hacia abajo con outpaint flux-fill-pro. Bug previo: usaba model-create +
  // Kolors con el "mismo seed" pero SeedDream con prompt distinto genera otra
  // persona — daba modelo diferente al tryon + 3:4 crop (no era full body).
  // Ahora extiende el canvas, no regenera: misma cara + mismo bra real garantizado.
  if (stepId === "photoFullBody") {
    if (!isLingerieFlow) {
      throw new Error("Foto Cuerpo Completo solo aplica a lencería.");
    }
    // inputUrl en este step viene de stepResults.texturePreserve si corrió,
    // o stepResults.tryon. Si ninguno corrió, fallamos con mensaje claro.
    if (!inputUrl || inputUrl === sharedModelUrl) {
      throw new Error("Foto Cuerpo Completo necesita el resultado del Try-On (o de Restaurar Textura). Corré esos pasos primero.");
    }
    // El panty del cuerpo completo hace JUEGO con el color del bra (bra negro →
    // panty negro). Si no se detectó color, cae a nude neutro.
    const pantyPhrase = pantyColorPhrase(garmentColor);
    const promptDown = `Continue the photograph downward to show the full body of the same woman from the upper half. Same skin tone, same body proportions, narrow hips, wearing ${pantyPhrase}, bare legs, standing pose with feet visible, clean white studio background continuing from above, soft studio lighting consistent with the upper half, photorealistic, sharp focus, e-commerce catalog photography. The upper half (face, hair, bra, torso) must remain pixel-identical.`;
    const negativeDown = "different person, different body, different skin, change of face, change of hairstyle, new clothes on torso, different background, harsh shadows, low quality, plastic skin, distorted limbs, extra fingers, multiple people";

    const outpaintRes = await fetch("/api/outpaint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: abortSignal,
      body: JSON.stringify({
        imageUrl: inputUrl,
        provider: "flux-fill-pro",
        direction: "down",
        expandRatio: 0.65,
        prompt: promptDown,
        negativePrompt: negativeDown,
      }),
    });
    const outpaintJson = await outpaintRes.json();
    if (!outpaintJson.success) throw new Error(outpaintJson.error || "Foto Cuerpo Completo: outpaint falló");
    return { resultUrl: outpaintJson.data.url, cost: outpaintJson.data.cost ?? 0.05 };
  }

  // photoBack: genera una SEGUNDA foto reusando el seed de la modelo original
  // → distinta pose (espalda). Fujo interno:
  // 1. model-create(seed, pose=back-view) → modelo de espaldas
  // 2. tryon Kolors(modelo nueva, foto de espalda real) → foto final
  // Sin foto de espalda real, el step se salta antes de llegar acá (guard en
  // processStep) porque Kolors no sabe rotar 180° desde la frontal.
  if (stepId === "photoBack") {
    if (!isolatedGarmentUrl) {
      throw new Error("Foto Espalda necesita la prenda aislada. Activá el paso 'Aislar Producto'.");
    }
    if (!isLingerieFlow) {
      throw new Error("Estas fotos extra solo aplican a lencería.");
    }
    // Default por stepId: photoBack=back-view, photoFullBody=standing.
    // Si la usuaria seleccionó pose manual desde la UI (poseOverride), usar esa.
    const defaultPose = stepId === "photoBack" ? "back-view" : "standing";
    const newPose = poseOverride && poseOverride !== "auto"
      ? POSE_OPTIONS.find((p) => p.value === poseOverride)?.modelCreatePose || defaultPose
      : defaultPose;
    // Bug histórico: para photoFullBody se mandaba
    //   "plain white studio background, full body shot showing legs with nude seamless shaper shorts"
    // al campo `background`. /api/model-create lo embute en "against a X
    // background", produciendo "against a plain white studio background, full
    // body shot showing legs with nude seamless shaper shorts background" —
    // SeedDream interpretaba mal esa frase hyper-poblada y generaba pantalones
    // marrones en vez de briefs nude. Ahora usamos background limpio y dejamos
    // que el prompt base de model-create (beige swim briefs para lencería) se
    // encargue del lower body; Kolors reemplaza el top con la prenda real.
    const newBackground = "plain white studio background, clean minimalist";
    // Fase 1: generar modelo en la nueva pose con el MISMO seed
    const modelRes = await fetch("/api/model-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: abortSignal,
      body: JSON.stringify({
        gender: modelConfig.gender,
        ageRange: modelConfig.ageRange,
        skinTone: modelConfig.skinTone,
        bodyType: modelConfig.bodyType,
        pose: newPose,
        expression: "confident natural",
        background: newBackground,
        garmentType: garmentTypeForApi,
        seed: sharedSeed,
        referenceNumber: referenceNumber || undefined,
      }),
    });
    const modelJson = await modelRes.json();
    if (!modelJson.success) throw new Error(modelJson.error || `${stepId}: model-create failed`);
    const newModelImage = modelJson.data.url;
    const modelCost = modelJson.cost ?? 0.055;

    // Fase 2: vestir la nueva modelo con la prenda correcta.
    // P0-2: si el step es photoBack Y la usuaria subió una foto tagged
    // angle="espalda" (backGarmentUrl), usamos ESA como garment reference en
    // vez de la prenda aislada del frente. Así Kolors ve los detalles reales
    // del broche, banda y cruce de tirantes en lugar de inventarlos.
    const useRealBackPhoto = stepId === "photoBack" && !!backGarmentUrl;
    const garmentForTryon = useRealBackPhoto ? backGarmentUrl! : isolatedGarmentUrl;
    if (useRealBackPhoto) {
      console.log(`[lingerie] photoBack usando foto REAL de espalda (${backGarmentUrl!.slice(0, 80)})`);
    }
    const category =
      productType === "panty" ? "bottoms"
      : productType === "set" ? "one-pieces"
      : "tops";
    const tryonRes = await fetch("/api/tryon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: abortSignal,
      body: JSON.stringify({
        modelImage: newModelImage,
        garmentImage: garmentForTryon,
        category,
        garmentType: garmentTypeForApi,
        // P1-1: respetar providerOverride si la usuaria lo pidió; sino "auto".
        // En lencería "auto" → la ruta prueba SeedDream edit primero (preserva el
        // producto) y cae a Kolors solo si falla. El badge muestra el real.
        provider: providerOverride && providerOverride !== "auto" ? providerOverride : "auto",
        // Cuando la usuaria eligió un proveedor a mano (para testear), forzar
        // que la ruta lo honre y NO lo cambie sola (Kolors → auto/FASHN).
        forceProvider: !!(providerOverride && providerOverride !== "auto"),
        fashnMode,
        // Construcción real (Claude Vision) → ancla SeedDream al cierre/copas reales.
        garmentDescription,
        // Art Direction: brief del look inyectado al prompt del try-on (seedream/uwear).
        scenePrompt: artDir.scenePrompt,
      }),
    });
    const tryonJson = await tryonRes.json();
    if (!tryonJson.success) throw new Error(tryonJson.error || `${stepId}: tryon failed`);
    const tryonCost = tryonJson.cost ?? 0.02;
    return { resultUrl: tryonJson.data.url, cost: modelCost + tryonCost, usedProvider: tryonJson.data.provider };
  }

  if (stepId === "tryon") {
    // Kolors-compatible category names (tryon route maps them):
    // bra → "tops", panty → "bottoms", set → "one-pieces"
    const category =
      productType === "panty" ? "bottoms"
      : productType === "set" ? "one-pieces"
      : "tops";
    // Refuse to run tryon without a separate model image — otherwise both
    // inputs become the same URL and Kolors produces garbage.
    if (!sharedModelUrl) {
      throw new Error("Falta la modelo IA (paso 'model' no corrió o falló). Corré ese paso antes del try-on.");
    }
    const res = await fetch("/api/tryon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: abortSignal,
      body: JSON.stringify({
        modelImage: sharedModelUrl,
        // Uwear castea su propia modelo + extrae el garment él mismo (remove_background),
        // así que le damos la FOTO REAL del producto (falUrl) en vez del aislado — que
        // para prendas difíciles se regenera y sale falso. Otros proveedores
        // (SeedDream/Kolors/IDM) sí necesitan el garment aislado limpio.
        garmentImage: providerOverride === "uwear" ? (falUrl ?? inputUrl) : inputUrl,
        // Foto real de espalda del MISMO REF → Uwear genera desde frente+espalda.
        garmentBackUrl: providerOverride === "uwear" ? backGarmentUrl : undefined,
        category,
        garmentType: garmentTypeForApi,
        // P1-1: respetar providerOverride si existe; sino default del flow.
        // Lencería → "auto" (ruta prueba SeedDream edit primero, cae a Kolors si
        // falla); no-lencería → IDM-VTON.
        provider: providerOverride && providerOverride !== "auto"
          ? providerOverride
          : (isLingerieFlow ? "auto" : "idm-vton"),
        // Forzar el proveedor elegido a mano para que la ruta no lo reemplace.
        forceProvider: !!(providerOverride && providerOverride !== "auto"),
        fashnMode,
        // Construcción real (Claude Vision) → ancla SeedDream al cierre/copas reales.
        garmentDescription,
        // Art Direction: brief del look inyectado al prompt del try-on (seedream/uwear).
        scenePrompt: artDir.scenePrompt,
      }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "tryon failed");
    return { resultUrl: json.data.url, cost: json.cost ?? 0.02, usedProvider: json.data.provider };
  }

  if (stepId === "texturePreserve") {
    // Solo aplica a lencería — fuera de ese flujo el step queda como passthrough.
    if (!isLingerieFlow) {
      console.warn("[lingerie] texturePreserve: flujo no-lencería, devolviendo input sin cambios");
      return { resultUrl: inputUrl, cost: 0 };
    }

    // 1. Obtener máscara B/W de la zona del bra sobre el resultado del tryon.
    //    Reusamos /api/bg-remove con returnMaskOnly:true — el módulo expone la
    //    máscara cruda de grounded_sam sin componerla con la imagen.
    const maskRes = await fetch("/api/bg-remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: abortSignal,
      body: JSON.stringify({
        imageUrl: inputUrl,
        provider: "replicate",
        removeSubject: true,
        garmentType: garmentTypeForApi,
        returnMaskOnly: true,
      }),
    });
    const maskJson = await maskRes.json();
    if (!maskJson.success) {
      // Si no se detecta la prenda en el tryon (imagen muy oscura, fondo
      // complejo), no podemos inpaintear — devolvemos el tryon como está y
      // logueamos. No es un error, solo una mejora opcional que no aplicó.
      console.warn("[lingerie] texturePreserve: no se pudo extraer máscara, skip");
      return { resultUrl: inputUrl, cost: 0 };
    }
    const maskUrl: string = maskJson.data.maskUrl ?? maskJson.data.url;

    // 2. Inpaint con flux-fill-pro. El prompt incorpora el material extraído
    //    por Claude Vision (ProductSpec.material) cuando está disponible. NOTA:
    //    flux-fill-pro NO acepta imagen de referencia — la fidelidad de textura
    //    depende del prompt-engineering, no de píxeles. Para texturas custom
    //    extremas el resultado es una aproximación, no una copia exacta.
    const materialPhrase = materialHint && materialHint.trim().length > 0
      ? `${materialHint} fabric`
      : "satin/lace fabric";
    const garmentNoun =
      productType === "panty" ? "panty"
      : productType === "faja" ? "shapewear"
      : productType === "set" ? "lingerie set"
      : "bra";

    const inpaintPrompt = `Preserve the exact ${materialPhrase} texture, weave, sheen and material of this ${garmentNoun}. Photorealistic ${materialPhrase} with natural folds, soft highlights, original product color. The garment fit, position and silhouette must remain unchanged. High-detail fabric weave visible.`;
    const negative = "plastic look, latex, vinyl, smooth artificial surface, fake material, oversaturated, blurry, melted, distorted";

    const inpaintRes = await fetch("/api/inpaint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: abortSignal,
      body: JSON.stringify({
        imageUrl: inputUrl,
        maskUrl,
        prompt: `${inpaintPrompt}. Avoid: ${negative}.`,
        provider: "flux-fill-pro",
      }),
    });
    const inpaintJson = await inpaintRes.json();
    if (!inpaintJson.success) {
      console.warn("[lingerie] texturePreserve: inpaint falló, fallback a tryon original:", inpaintJson.error);
      return { resultUrl: inputUrl, cost: 0.01 };  // pagamos solo la máscara
    }
    return { resultUrl: inpaintJson.data.url, cost: 0.01 + (inpaintJson.data.cost ?? 0.05) };
  }

  if (stepId === "productVideo") {
    const res = await fetch("/api/video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: abortSignal,
      body: JSON.stringify({
        imageUrl: inputUrl,
        falImageUrl: falUrl,
        provider: "wan-2.2-fast",
        duration: 5,
        aspectRatio: "1:1",
        prompt: "Smooth slow 360 degree rotation of this lingerie garment on pure white background, professional product photography, clean studio lighting",
      }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "video failed");
    return { resultUrl: json.data.url, cost: json.cost ?? 0.10 };
  }

  if (stepId === "modelVideo") {
    // Usa el URL de la modelo (sharedModelUrl) PRIORITARIAMENTE. Si tryon funcionó
    // (inputUrl viene del tryon exitoso, o texturePreserve si corrió), usa ese.
    // Si no, fallback al modelo alone. Así modelVideo produce algo útil incluso
    // cuando tryon falla.
    const modelVideoUrl = inputUrl && inputUrl !== sharedModelUrl ? inputUrl : (sharedModelUrl ?? inputUrl);

    // Acción que ejecuta la modelo: si la usuaria eligió manualmente
    // (actionOverride) usar esa, sino el default de movimiento humano natural.
    const actionPrompt = actionOverride && actionOverride !== "auto"
      ? VIDEO_ACTION_OPTIONS.find((a) => a.value === actionOverride)?.promptHint
      : "subtle breathing, gentle weight shift from one leg to another, slight head turn, natural blink, hands resting at sides";
    const fullPrompt = `Realistic woman posing naturally for a fashion catalog wearing lingerie. ${actionPrompt}. Photorealistic skin texture with pores and natural light reflection. Hair moves softly with body movement. No exaggerated motion. Studio lighting consistent across all frames.`;
    // negative_prompt diseñado para evitar el bug de wan-2.2-fast (look muñeco,
    // morphing, identidad cambiando entre frames). Kling 2.6 lo acepta nativo.
    const negativePrompt = "doll-like, plastic skin, waxy face, morphing features, uncanny valley, flickering, identity change, distorted limbs, extra fingers, exaggerated motion, dance moves, jumping, duplicate, split screen";

    const res = await fetch("/api/video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: abortSignal,
      body: JSON.stringify({
        imageUrl: modelVideoUrl,
        falImageUrl: falUrl,
        // Kling 2.6 Pro (fal-ai/kling-video/v2.6/pro/image-to-video) — calidad
        // cinematográfica para humanos. wan-2.2-fast es para productos y genera
        // personas con look de muñeco / piel waxy / micro-expresiones erráticas.
        provider: "kling-2.6",
        duration: 5,
        aspectRatio: "9:16",
        prompt: fullPrompt,
        negativePrompt,
      }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "video failed");
    // Costo: $0.07/s × 5s = $0.35 con kling-2.6.
    return { resultUrl: json.data.url, cost: json.cost ?? 0.35 };
  }

  throw new Error(`Unknown step: ${stepId}`);
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                           */
/* ------------------------------------------------------------------ */

export default function LingeriePipelinePage() {
  const [phase, setPhase] = useState<Phase>("setup");
  // Help dialog: keyboard shortcuts reference
  const [showHelp, setShowHelp] = useState(false);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (e.key === "?" || e.key === "/") {
        e.preventDefault();
        setShowHelp((s) => !s);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const [referenceNumber, setReferenceNumber] = useState("");
  // Inicializar referenceNumber desde localStorage (no se puede usar
  // persistedSettings acá porque está declarado abajo). Lo seteo al mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("lingerie:pipeline:settings:v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.referenceNumber) setReferenceNumber(parsed.referenceNumber);
      }
    } catch { /* ignore */ }
  }, []);
  // Persistencia: cargar settings del último uso desde localStorage. Las fotos
  // (jobs) NO se persisten porque los File objects no serializan; solo lo que
  // la usuaria configuró (modo, calidad, tipo, REF, modelo). Si refrescás la
  // página, no perdés tus preferencias — solo las fotos hay que re-subir.
  const PERSIST_KEY = "lingerie:pipeline:settings:v1";
  const persistedSettings = (() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(PERSIST_KEY);
      return raw ? JSON.parse(raw) as Partial<{
        productType: string;
        modelConfig: ModelConfig;
        autoMode: boolean;
        generationMode: GenerationMode;
        fashnMode: FashnMode;
        artDirection: ArtDirectionId;
        referenceNumber: string;
      }> : null;
    } catch { return null; }
  })();

  const [productType, setProductType] = useState(persistedSettings?.productType ?? "bra");
  const [modelConfig, setModelConfig] = useState<ModelConfig>(persistedSettings?.modelConfig ?? {
    gender: "female",
    skinTone: "medium",
    bodyType: "curvy",
    ageRange: "26-35",
  });
  const [steps, setSteps] = useState<PipelineStep[]>(makeSteps());
  // Persistencia de jobs: se restauran al mount (sin `file`, usando
  // uploadedUrl como previewUrl). Jobs restaurados son viewables y su
  // pipeline puede re-correr si ya tienen uploadedUrl; lo único que no
  // funciona sin file es analyze-product (Claude Vision).
  const [jobs, setJobs] = useState<ImageJob[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem("lingerie:pipeline:jobs:v1");
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Array<Omit<ImageJob, "file"> & { file?: never }>;
      // Re-hydrate step.icon desde STEP_DEFS: las funciones React (forwardRef
      // de lucide-react) NO son JSON-serializables — al persistir se vuelven {}
      // y al renderizar <Icon /> con un {} React tira el #130 "got: object".
      // Reconstruimos los steps desde la definición canónica, conservando solo
      // el estado dinámico (status, resultUrl, error, enabled, etc) del job.
      const rehydrateSteps = (persistedSteps: PipelineStep[] | undefined): PipelineStep[] => {
        const byId = new Map((persistedSteps ?? []).map((s) => [s.id, s]));
        return STEP_DEFS.map((def) => {
          const old = byId.get(def.id);
          return {
            ...def,
            status: old?.status ?? "idle",
            inputUrl: old?.inputUrl,
            resultUrl: old?.resultUrl,
            error: old?.error,
            cost_actual: old?.cost_actual,
            candidates: old?.candidates,
            providerOverride: old?.providerOverride,
            usedProvider: old?.usedProvider,
            poseOverride: old?.poseOverride,
            actionOverride: old?.actionOverride,
            enabled: old?.enabled ?? def.enabled,
          };
        });
      };
      return parsed
        .filter((j) => j.uploadedUrl)  // skip jobs sin upload (no servirían para nada)
        .map((j) => ({
          ...j,
          file: null,
          steps: rehydrateSteps(j.steps),
          // Si previewUrl era blob (ya muerto) usar uploadedUrl como fallback
          previewUrl: j.previewUrl?.startsWith("blob:") ? (j.uploadedUrl ?? "") : (j.previewUrl ?? j.uploadedUrl ?? ""),
        }));
    } catch (err) {
      console.warn("[lingerie] failed to restore jobs:", err);
      return [];
    }
  });
  const [activeJobIndex, setActiveJobIndex] = useState(0);
  const [autoMode, setAutoMode] = useState(persistedSettings?.autoMode ?? true);
  // Phase 2f: modo de generación elegible (default / face-swap / multi-sample).
  // default = el flow legacy (model-create + tryon Kolors).
  const [generationMode, setGenerationMode] = useState<GenerationMode>(persistedSettings?.generationMode ?? "default");
  // P1-3: calidad FASHN — solo aplica cuando tryon usa FASHN (override manual
  // o flow non-lencería). Kolors e IDM-VTON lo ignoran.
  const [fashnMode, setFashnMode] = useState<FashnMode>(persistedSettings?.fashnMode ?? "balanced");
  // Art Direction (look del shoot) — brief reutilizable inyectado a model-create + try-on.
  const [artDirection, setArtDirection] = useState<ArtDirectionId>(persistedSettings?.artDirection ?? "catalogo-blanco");
  const [sharedModelUrl, setSharedModelUrl] = useState<string | undefined>();
  // Seed compartido entre poses: photoBack + photoFullBody lo reusan para que
  // SeedDream genere la MISMA modelo (mismo rostro + cuerpo + piel) en distinta
  // pose. Sin seed serían modelos diferentes en cada foto.
  const [sharedSeed, setSharedSeed] = useState<number | undefined>();
  const [isRunning, setIsRunning] = useState(false);
  // "Detener todo el batch": cuando la usuaria aprieta el botón rojo
  // grande, seteamos esto en true. El loop de startPipeline chequea antes
  // de procesar cada job y si es true, salta todos los restantes.
  const batchAbortRef = useRef(false);
  const stopBatch = useCallback(() => {
    batchAbortRef.current = true;
    // Abort todos los controllers activos de todos los steps en vuelo.
    // IMPORTANTE: NO limpiamos el state de jobs aquí — la usuaria reportó
    // "detener pierde la info, debería poder seguir viendo lo que hice".
    // Lo que ya procesó (steps con status=done) se mantiene visible y
    // descargable; solo paramos lo que está en vuelo.
    for (const [, ctrl] of abortControllersRef.current) {
      ctrl.abort();
    }
    abortControllersRef.current.clear();
    setIsRunning(false);
    toast.warning(
      "Procesamiento detenido. Lo que ya completaste se mantiene visible y descargable.",
    );
  }, []);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [savedModels, setSavedModels] = useState<Array<{ id: string; name: string; previewUrl: string; gender?: string; skinTone?: string; bodyType?: string; seed?: number }>>([]);

  // Cargar modelos IA previamente generadas para ofrecer reuso sin costo
  useEffect(() => {
    fetch('/api/ai-models', { signal: AbortSignal.timeout(10000) })
      .then((r) => r.json())
      .then((json) => {
        if (json?.success && Array.isArray(json.data)) {
          // Extraer seed de metadata (donde model-create lo guardó para reuso
          // entre poses). Modelos viejos pre-Phase-2a no tienen seed → undefined.
          //
          // NOTA: /api/ai-models devuelve AiModelRecord con snake_case
          // (preview_url, skin_tone, body_type). El código anterior leía
          // camelCase (previewUrl) → siempre undefined → todas las previews
          // rotas.
          type ModelWithMeta = {
            id: string;
            name: string;
            preview_url: string | null;
            gender?: string;
            skin_tone?: string;
            body_type?: string;
            metadata?: Record<string, unknown> | null;
          };
          const mapped = (json.data as ModelWithMeta[])
            .filter((m) => !!m.preview_url)
            .map((m) => ({
              id: m.id,
              name: m.name,
              previewUrl: m.preview_url!,
              gender: m.gender,
              skinTone: m.skin_tone,
              bodyType: m.body_type,
              seed: typeof m.metadata?.seed === 'number' ? (m.metadata.seed as number) : undefined,
            }));
          setSavedModels(mapped);
        }
      })
      .catch(() => {
        /* Silent — la usuaria puede crear modelo nueva igual */
      });
  }, []);

  const previewUrlsRef = useRef<string[]>([]);
  useEffect(() => {
    return () => previewUrlsRef.current.forEach(URL.revokeObjectURL);
  }, []);

  // Persistencia: guardar settings cada vez que cambian. Debounce 400ms para
  // no spamear localStorage en cada keystroke del referenceNumber.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem("lingerie:pipeline:settings:v1", JSON.stringify({
          productType,
          modelConfig,
          autoMode,
          generationMode,
          fashnMode,
          artDirection,
          referenceNumber,
        }));
      } catch { /* localStorage quota o disabled — silently ignore */ }
    }, 400);
    return () => clearTimeout(timer);
  }, [productType, modelConfig, autoMode, generationMode, fashnMode, artDirection, referenceNumber]);

  // Persistencia de jobs: guarda el array entero (sin `file`, que no
  // serializa) cada vez que cambia. Debounce 800ms porque jobs cambia mucho
  // durante el pipeline (cada status update). Máximo 150 jobs guardados para
  // soportar el inventario completo (128 fotos = 128 jobs) sin saturar
  // localStorage (~2KB/job × 150 = ~300KB, muy por debajo del quota 5-10MB).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = setTimeout(() => {
      try {
        const MAX_PERSISTED = 150;
        const toPersist = jobs.slice(-MAX_PERSISTED).map((j) => {
          // Omit `file` (File objects no serializan). Mantenemos todo lo demás.
          // Previews blob: mantenemos el string tal cual; al restaurar se
          // detecta y cae a uploadedUrl.
          const { file: _file, ...rest } = j;
          void _file;
          return rest;
        });
        window.localStorage.setItem("lingerie:pipeline:jobs:v1", JSON.stringify(toPersist));
      } catch {
        // Quota excedido o disabled — silent. No molestar a la usuaria con
        // un toast por cada write fallido.
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [jobs]);

  // Read URL params on mount — inventory auto-mode redirects with ?productType=bra|panty
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pt = params.get("productType");
    if (pt && ["bra", "panty", "set", "faja"].includes(pt)) {
      setProductType(pt);
    }
  }, []);

  // Cross-session AI model reuse: when referenceNumber is typed/changed,
  // lookup saved models with that tag. If found, reuse it and skip $0.055 regen.
  const [reusedModelFound, setReusedModelFound] = useState(false);
  useEffect(() => {
    setReusedModelFound(false);
    const ref = referenceNumber.trim();
    if (!ref) {
      setSharedModelUrl(undefined);
      return;
    }
    // Debounce 600ms so we don't spam the API on every keystroke
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/ai-models?referenceNumber=${encodeURIComponent(ref)}`,
          { signal: AbortSignal.timeout(10000) },
        );
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const saved = json.data[0];
          if (saved?.preview_url) {
            setSharedModelUrl(saved.preview_url);
            setReusedModelFound(true);
            toast.success(`Modelo IA de REF ${ref} encontrada — se va a reusar (ahorro $0.055).`);
          }
        }
      } catch {
        // Silent — user can still run the pipeline, just won't reuse
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [referenceNumber]);

  /* ---- Setup: add images ---- */
  // Undo/Redo: stack de snapshots de jobs antes de cada acción destructiva.
  // Solo se aplica en el setup phase — durante el pipeline run, setJobs cambia
  // demasiado (cada status update) y un undo no tendría sentido semántico.
  const historyRef = useRef<ImageJob[][]>([]);
  const futureRef = useRef<ImageJob[][]>([]);
  const MAX_HISTORY = 20;
  const [historyVersion, setHistoryVersion] = useState(0);  // Para re-render de botones

  /** Snapshot del estado actual de jobs antes de una acción destructiva.
   *  Limpia el redo stack (futureRef) porque la nueva acción rompe el futuro. */
  const pushHistory = useCallback(() => {
    setJobs((prev) => {
      historyRef.current.push(prev);
      if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
      futureRef.current = [];
      setHistoryVersion((v) => v + 1);
      return prev;
    });
  }, []);

  const undoJobs = useCallback(() => {
    if (historyRef.current.length === 0) return;
    setJobs((prev) => {
      futureRef.current.push(prev);
      const last = historyRef.current.pop()!;
      setHistoryVersion((v) => v + 1);
      toast.info("Deshecho");
      return last;
    });
  }, []);

  const redoJobs = useCallback(() => {
    if (futureRef.current.length === 0) return;
    setJobs((prev) => {
      historyRef.current.push(prev);
      const next = futureRef.current.pop()!;
      setHistoryVersion((v) => v + 1);
      toast.info("Rehecho");
      return next;
    });
  }, []);

  const handleFiles = useCallback((files: File[]) => {
    pushHistory();
    const newJobs: ImageJob[] = files.map((file) => {
      const url = URL.createObjectURL(file);
      previewUrlsRef.current.push(url);
      return {
        id: `${Date.now()}-${Math.random()}`,
        file,
        filename: file.name,
        previewUrl: url,
        steps: makeSteps(),
        status: "idle",
        totalCost: 0,
        // Phase 2f P0-1: auto-detect del nombre del archivo. La usuaria puede
        // corregir con el dropdown si el heurístico se equivocó.
        photoAngle: detectPhotoAngle(file.name),
        referenceKey: detectReferenceKey(file.name),
        color: detectColor(file.name),
        sizeHint: detectSize(file.name),
        suggestedBodyType: sizeToBodyType(detectSize(file.name)),
      };
    });
    setJobs((prev) => [...prev, ...newJobs]);
  }, [pushHistory]);

  /** Phase 2f P0-1: usuaria corrigió el ángulo desde el dropdown del card. */
  const updateJobAngle = useCallback((jobId: string, angle: PhotoAngle) => {
    pushHistory();
    setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, photoAngle: angle } : j));
  }, [pushHistory]);

  const removeJob = useCallback((id: string) => {
    pushHistory();
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, [pushHistory]);

  /** Carga todo el inventario del tipo SELECCIONADO (bras / panties /
   *  shapewear / fajas / sets) desde public/inventory/<type>/ vía la ruta
   *  /api/inventory/scan-lingerie?type=<X>. Antes solo cargaba bras (queja
   *  reportada: "ahora esta solo la función de bra de los folder, si mi mamá
   *  quiere intentar con pantys ahora no funciona"). Ahora respeta el
   *  productType actual; si no existe inventario para ese tipo, muestra una
   *  guía clara de "sube manualmente". */
  const loadInventoryBras = useCallback(async () => {
    // Mapeo del productType del dropdown (bra/panty/faja/set) al folder
    // canónico de inventario en plural.
    const typeMap: Record<string, string> = {
      bra: "bras",
      panty: "panties",
      faja: "shapewear",
      set: "sets",
    };
    const inventoryType = typeMap[productType] ?? "bras";
    setLoadingInventory(true);
    try {
      const res = await fetch(`/api/inventory/scan-lingerie?type=${inventoryType}`);
      const json = await res.json();
      if (!json.success) {
        if (res.status === 404) {
          toast.warning(
            `No hay inventario pre-cargado de ${inventoryType}. Subí tus fotos arrastrándolas o tocando el área de upload de arriba.`,
          );
        } else {
          toast.error(`No se pudo escanear el inventario: ${json.error ?? "error desconocido"}`);
        }
        return;
      }
      type ScannedPhoto = { filename: string; angle: PhotoAngle; color: string | undefined; relativePath: string };
      type ScannedRef = { ref: string; photoCount: number; uniqueColors: string[]; hasBackPhoto: boolean; photos: ScannedPhoto[]; estimatedCost: number };
      const refs: ScannedRef[] = json.data.refs;
      const totalPhotos: number = json.data.totalPhotos;
      toast.info(`Cargando ${totalPhotos} fotos de ${refs.length} REFs…`);

      // Aplanar + fetchear en paralelo con concurrencia limitada a 6.
      const flat: Array<ScannedPhoto & { ref: string }> = [];
      for (const r of refs) for (const p of r.photos) flat.push({ ...p, ref: r.ref });

      const CONCURRENCY = 6;
      const newFiles: File[] = [];
      let failed = 0;
      const runOne = async (item: ScannedPhoto & { ref: string }) => {
        try {
          const r = await fetch(item.relativePath);
          if (!r.ok) throw new Error(`${r.status}`);
          const blob = await r.blob();
          const type = blob.type || (item.filename.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg");
          newFiles.push(new File([blob], item.filename, { type }));
        } catch (err) {
          failed++;
          console.warn(`[load-inventory] ${item.filename}:`, err);
        }
      };
      for (let i = 0; i < flat.length; i += CONCURRENCY) {
        await Promise.all(flat.slice(i, i + CONCURRENCY).map(runOne));
      }

      if (newFiles.length === 0) {
        toast.error("No se pudo cargar ninguna foto del inventario.");
        return;
      }
      handleFiles(newFiles);
      toast.success(`Inventario cargado: ${newFiles.length} fotos${failed > 0 ? ` (${failed} fallaron)` : ''}.`);
    } catch (err) {
      toast.error(`Error cargando inventario: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoadingInventory(false);
    }
  }, [handleFiles, productType]);

  /** P2: "Comenzar de nuevo" — clear everything (jobs in memory + localStorage
   *  persistence). La ficha técnica y los resultados procesados se limpian,
   *  pero la galería (/gallery) y los settings quedan. */
  const resetAll = useCallback(() => {
    if (jobs.length > 0 && !window.confirm("¿Estás segura? Se borran las fotos subidas y los resultados. Los settings se mantienen.")) {
      return;
    }
    pushHistory();
    setJobs([]);
    setActiveJobIndex(0);
    setSharedModelUrl(undefined);
    setSharedSeed(undefined);
    setPhase("setup");
    try {
      window.localStorage.removeItem("lingerie:pipeline:jobs:v1");
    } catch { /* ignore */ }
    toast.success("Sesión reiniciada — podés subir fotos nuevas.");
  }, [jobs.length, pushHistory]);

  // Atajos Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y. Solo activan si el foco no está
  // en un input/textarea (así no pisa el undo nativo del browser en campos).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (isEditable) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undoJobs();
      } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        e.preventDefault();
        redoJobs();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undoJobs, redoJobs]);

  const canUndo = historyRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;
  // historyVersion fuerza re-render cuando canUndo/canRedo cambian
  void historyVersion;

  /* ---- Toggle step enabled ---- */
  const toggleStep = useCallback((stepId: StepId) => {
    setSteps((prev) => prev.map((s) => s.id === stepId ? { ...s, enabled: !s.enabled } : s));
  }, []);

  /* ---- Update a specific step in a specific job ---- */
  const updateStep = useCallback((jobId: string, stepId: StepId, update: Partial<PipelineStep>) => {
    setJobs((prev) => prev.map((job) =>
      job.id !== jobId ? job : {
        ...job,
        steps: job.steps.map((s) => s.id === stepId ? { ...s, ...update } : s),
      },
    ));
  }, []);

  /* ---- Run one step for one job ---- */
  // P0-3: un AbortController por (jobId, stepId) en vuelo. Si la usuaria
  // aprieta "Detener" en un step, buscamos el controller y lo abort()amos.
  // Usamos useRef porque no queremos re-renderear al agregar/quitar entries.
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  const stopStep = useCallback((jobId: string, stepId: StepId) => {
    const key = `${jobId}:${stepId}`;
    const ctrl = abortControllersRef.current.get(key);
    if (ctrl) {
      ctrl.abort();
      abortControllersRef.current.delete(key);
      toast.info(`Paso "${stepId}" detenido.`);
    }
  }, []);

  /**
   * Busca en el batch una foto del mismo producto tagged con el ángulo
   * solicitado. Usado por el modo face-swap para encontrar la foto real de
   * cada vista. Prefiere match por referenceKey; cae a match cualquiera del
   * batch si ninguna tiene referenceKey.
   */
  const findMatchingPhoto = useCallback((
    job: ImageJob,
    jobsSnapshot: ImageJob[],
    angles: PhotoAngle[],
  ): ImageJob | undefined => {
    return jobsSnapshot.find((j) =>
      angles.includes(j.photoAngle) &&
      j.uploadedUrl &&
      (j.referenceKey === job.referenceKey || (!j.referenceKey && !job.referenceKey))
    );
  }, []);

  const executeStep = useCallback(async (
    job: ImageJob,
    step: PipelineStep,
    inputUrl: string,
    currentSharedModel: string | undefined,
    currentSharedSeed: number | undefined,
    currentIsolatedGarment: string | undefined,
    jobsSnapshot: ImageJob[],
  ): Promise<{ resultUrl: string; cost: number; newModelUrl?: string; newSeed?: number; candidates?: string[]; usedProvider?: string }> => {
    // P0-3: crear AbortController para este step específico
    const controller = new AbortController();
    const key = `${job.id}:${step.id}`;
    abortControllersRef.current.set(key, controller);

    try {
      // MODO FACE-SWAP: para tryon / photoBack / photoFullBody, si existe la
      // foto real correspondiente Y ya tenemos una modelo IA (currentSharedModel),
      // hacemos face-swap en vez de runStep. Cambia SOLO la cara en la foto
      // real de la usuaria — cuerpo, pose, prenda, iluminación quedan intactos.
      //
      // Si no tenemos modelo IA aún o no hay foto real para esta vista, caemos
      // al flow default (runStep).
      if (generationMode === "face-swap" && currentSharedModel) {
        let targetPhoto: ImageJob | undefined;
        if (step.id === "tryon") {
          targetPhoto = findMatchingPhoto(job, jobsSnapshot, ["frontal"]) || job;
        } else if (step.id === "photoBack") {
          targetPhoto = findMatchingPhoto(job, jobsSnapshot, ["espalda"]);
        } else if (step.id === "photoFullBody") {
          // Priorizar "flat" o "otra" (cuerpo completo); fallback a frontal si no hay.
          targetPhoto = findMatchingPhoto(job, jobsSnapshot, ["flat", "otra"])
            || findMatchingPhoto(job, jobsSnapshot, ["frontal"])
            || job;
        }
        if (targetPhoto?.uploadedUrl) {
          console.log(`[lingerie] ${step.id}: face-swap sobre foto real "${targetPhoto.filename}"`);
          const res = await fetch("/api/face-swap", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              targetImage: targetPhoto.uploadedUrl,
              sourceImage: currentSharedModel,
            }),
          });
          const json = await res.json();
          if (!json.success) throw new Error(json.error || "face-swap failed");
          return { resultUrl: json.data.url, cost: json.cost ?? 0.003 };
        }
        // No hay foto real para esta vista → fallback a runStep default con warning.
        if (step.id !== "isolate" && step.id !== "model" && step.id !== "productVideo" && step.id !== "modelVideo") {
          toast.info(`Sin foto real para ${step.label} — usando modo clásico para este paso.`);
        }
      }

      // Foto real de ESPALDA del mismo REF (tagged angle="espalda"). Se usa:
      //  - photoBack: como garment reference para la vista trasera.
      //  - tryon con Uwear: como clothing_item_back_url, así Uwear genera desde
      //    frente + espalda reales (clava broche, banda y racerback de CADA bra).
      let backGarmentUrl: string | undefined;
      if ((step.id === "isolate" || step.id === "photoBack" || step.id === "tryon") && generationMode !== "face-swap") {
        const matchingBack = findMatchingPhoto(job, jobsSnapshot, ["espalda"]);
        if (matchingBack && matchingBack.id !== job.id) {
          // Preferir el falUrl PÚBLICO (el uploadedUrl es el de Replicate privado que
          // ni SeedDream ni Uwear pueden bajar). Así el ghost/try-on recibe la espalda real.
          backGarmentUrl = matchingBack.falUrl ?? matchingBack.uploadedUrl;
          if (backGarmentUrl) console.log(`[lingerie] ${step.id}: foto real de espalda (${matchingBack.filename})`);
        }
      }

      // MODO MULTI-SAMPLE: para photoBack / photoFullBody, generar 4 candidatos
      // en paralelo con distintos seeds → 4 caras ligeramente distintas + 4
      // interpretaciones del tryon. La usuaria ve las 4 en un grid 2×2 y elige
      // la que mejor preserva el producto. Costo: 4× el step normal.
      //
      // No se implementa para tryon porque usa un sharedModel fijo — Kolors es
      // determinístico sobre inputs idénticos → generaría 4 veces lo mismo.
      if (
        generationMode === "multi-sample" &&
        (step.id === "photoBack" || step.id === "photoFullBody")
      ) {
        const N_SAMPLES = 4;
        // Cada sample usa su propio seed → modelo IA distinta en cada → face
        // y tryon varían. La usuaria elige cuál interpretación le gusta más.
        const seeds = Array.from({ length: N_SAMPLES }, () => Math.floor(Math.random() * 999999));
        console.log(`[lingerie] ${step.id}: multi-sample con ${N_SAMPLES} variantes (seeds: ${seeds.join(', ')})`);
        const effectiveConfig: ModelConfig = job.suggestedBodyType && job.suggestedBodyType !== modelConfig.bodyType
          ? { ...modelConfig, bodyType: job.suggestedBodyType }
          : modelConfig;
        const results = await Promise.all(
          seeds.map((seed) =>
            runStep(
              step.id,
              inputUrl,
              job.falUrl,
              effectiveConfig,
              productType,
              currentSharedModel,
              referenceNumber || undefined,
              seed,
              currentIsolatedGarment,
              controller.signal,
              backGarmentUrl,
              step.providerOverride,
              fashnMode,
              step.poseOverride,
              step.actionOverride,
              job.productSpec?.material?.trim() || undefined,
              buildGarmentDescription(job.productSpec),
              artDirection,
              job.color,
            ),
          ),
        );
        const candidates = results.map((r) => r.resultUrl);
        const totalCost = results.reduce((sum, r) => sum + r.cost, 0);
        return {
          resultUrl: candidates[0],
          candidates,
          cost: totalCost,
          usedProvider: results[0]?.usedProvider,
        };
      }

      // Per-job bodyType override: si la foto tiene talla detectada que sugiere
      // un bodyType distinto al global, usamos el sugerido para ESTE job. Así un
      // batch con tallas mixtas (32B slim + 38B curvy + 42D plus-size) genera
      // modelos IA con cuerpos apropiados para cada talla automáticamente.
      const effectiveModelConfig: ModelConfig = job.suggestedBodyType && job.suggestedBodyType !== modelConfig.bodyType
        ? { ...modelConfig, bodyType: job.suggestedBodyType }
        : modelConfig;

      // ProductSpec.material extraída por Claude Vision en el análisis previo
      // del job. Lo usa texturePreserve para guiar el prompt de flux-fill-pro
      // hacia la textura correcta. Si no hay spec (jobs restaurados o análisis
      // que falló), el step usa un default genérico "satin/lace fabric".
      const materialHint = job.productSpec?.material?.trim() || undefined;
      // Construcción real del producto (cierre, copas, tirantes…) para anclar el try-on.
      const garmentDescription = buildGarmentDescription(job.productSpec);

      return await runStep(
        step.id,
        inputUrl,
        job.falUrl,
        effectiveModelConfig,
        productType,
        currentSharedModel,
        referenceNumber || undefined,
        currentSharedSeed,
        currentIsolatedGarment,
        controller.signal,
        backGarmentUrl,
        step.providerOverride,
        fashnMode,
        step.poseOverride,
        step.actionOverride,
        materialHint,
        garmentDescription,
        artDirection,
        job.color,
      );
    } finally {
      abortControllersRef.current.delete(key);
    }
  }, [modelConfig, productType, referenceNumber, generationMode, findMatchingPhoto, fashnMode, artDirection]);

  /* ---- Process one job sequentially ---- */
  const processJob = useCallback(async (
    jobId: string,
    jobsSnapshot: ImageJob[],
    currentSharedModel: string | undefined,
    currentSharedSeed: number | undefined,
  ): Promise<{ newSharedModel?: string; newSharedSeed?: number }> => {
    const job = jobsSnapshot.find((j) => j.id === jobId);
    if (!job) return {};

    // Upload the image first. Si el job es RESTAURADO desde localStorage
    // (file es null), saltamos el upload — ya debería tener uploadedUrl del
    // run anterior. Si no tiene NI file NI uploadedUrl, el job está corrupto
    // y marcamos error.
    let uploadedUrl = job.uploadedUrl;
    let falUrl = job.falUrl;
    if (!uploadedUrl) {
      if (!job.file) {
        setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, status: "error" } : j));
        toast.error(`${job.filename}: tenés que subir la foto de nuevo (esta sesión fue restaurada sin el archivo).`);
        return {};
      }
      try {
        const uploaded = await uploadFile(job.file);
        uploadedUrl = uploaded.url;
        falUrl = uploaded.falUrl;
        // Fix bug "No pudimos cargar la imagen": el blob URL del preview se
        // revoca al hacer reload o cuando el browser limpia memoria. Tras
        // upload exitoso, promovemos previewUrl al HTTP URL persistente para
        // que la imagen ORIGINAL siga visible después de cualquier refresh.
        setJobs((prev) => prev.map((j) =>
          j.id === jobId
            ? { ...j, uploadedUrl, falUrl, previewUrl: uploadedUrl ?? j.previewUrl }
            : j,
        ));
      } catch (err) {
        setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, status: "error" } : j));
        toast.error(`Error de carga — ${job.filename}: ${err instanceof Error ? err.message : "Error desconocido"}`);
        return {};
      }
    }

    // Análisis de producto con Claude Vision — corre UNA sola vez por job antes
    // del primer step. Produce una ProductSpec que se muestra al usuario
    // (editable) y que iteraciones siguientes inyectarán en los prompts. Si
    // falla, el pipeline sigue igual que antes (sin spec). No es bloqueante.
    if (!job.productSpec && job.analysisStatus !== "done" && job.file) {
      // Solo corremos el análisis de Claude Vision si tenemos el File (necesita
      // subir el contenido en base64). Para jobs restaurados (file=null) la
      // ficha técnica no se puede regenerar — queda undefined silenciosamente.
      setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, analysisStatus: "analyzing" } : j));
      try {
        const spec = await analyzeProductPhotos(
          [{ file: job.file, role: "frontal" }],
          productType,
        );
        setJobs((prev) => prev.map((j) =>
          j.id === jobId ? { ...j, productSpec: spec, analysisStatus: "done" } : j,
        ));
      } catch (analyzeErr) {
        const msg = analyzeErr instanceof Error ? analyzeErr.message : "Análisis falló";
        console.warn(`[lingerie] analyze-product failed for ${job.filename}:`, msg);
        setJobs((prev) => prev.map((j) =>
          j.id === jobId ? { ...j, productSpec: null, analysisStatus: "error", analysisError: msg } : j,
        ));
        // No bloquea el pipeline — solo warnea y seguimos como antes.
        toast.warning(`No se pudo leer la ficha técnica de ${job.filename}. Sigo con los pasos normales.`);
      }
    }

    let lastResultUrl = uploadedUrl;
    let newSharedModel = currentSharedModel;
    let newSharedSeed = currentSharedSeed;

    // Get fresh step list with only enabled steps
    const enabledSteps = job.steps.filter((s) => s.enabled);

    // Local map de resultados por step — evita leer job.steps (snapshot stale
    // del useState inicial, que NO se actualiza durante el loop por ser una
    // closure). Se populate abajo cada vez que un step completa.
    const stepResults: Partial<Record<StepId, string>> = {};

    // processStep — extrae el body del per-step loop (antes era inline) para
    // poder correrlo en paralelo entre isolate + model (FASE A), que son
    // inputs independientes a tryon. Devuelve `true` si la usuaria abortó
    // (AbortError) y el caller debe romper el loop.
    const processStep = async (stepDef: PipelineStep): Promise<boolean> => {
      // GUARD photoBack: Kolors es virtual try-on, no rotador. Si solo tiene
      // la vista FRONTAL del bra inventa un diseño distinto al producto real
      // (broche/banda/tirantes random). Si la usuaria no subió foto de espalda
      // etiquetada, saltamos el step con mensaje claro en vez de generar un
      // resultado falso para el catálogo.
      if (stepDef.id === "photoBack") {
        const jobForMatching = { ...job, uploadedUrl, falUrl } as ImageJob;
        const hasBackPhoto = !!findMatchingPhoto(jobForMatching, jobsSnapshot, ["espalda"])?.uploadedUrl;
        if (!hasBackPhoto) {
          updateStep(jobId, "photoBack", {
            status: "skipped",
            error: 'No subiste foto del producto desde atrás — no podemos inferirla del frente (Kolors generaría un bra distinto al original). Subí una foto etiquetada "Espalda" en el setup y reintentá.',
          });
          console.warn(`[lingerie] photoBack skipeado: ${job.filename} no tiene foto etiquetada "espalda" asociada.`);
          return false;  // No es abort, sigue al siguiente step
        }
      }

      // Determine input: for tryon use sharedModelUrl is handled in runStep
      let inputForStep = lastResultUrl;
      if (stepDef.id === "isolate") {
        // Paso 1: mostrar/procesar con el falUrl PÚBLICO (el uploadedUrl es el de
        // Replicate privado → el navegador muestra "La imagen expiró"). Así la foto
        // original se ve a la izquierda y grounded_sam/ghost reciben una imagen legible.
        inputForStep = falUrl || uploadedUrl || lastResultUrl;
      } else if (stepDef.id === "modelVideo") {
        // modelVideo usa SOLO el try-on (modelo IA + tu prenda) o la modelo IA.
        // NUNCA cae a la foto original (es copyright de Leonisa). Si no hay try-on
        // ni modelo, se salta con mensaje claro.
        const base = stepResults.texturePreserve || stepResults.tryon || newSharedModel;
        if (!base) {
          updateStep(jobId, stepDef.id, {
            status: "skipped",
            error: "El video de la modelo necesita la Foto Frontal (try-on). Corré ese paso primero — no usamos tu foto original (copyright).",
          });
          return false;
        }
        inputForStep = base;
      } else if (stepDef.id === "texturePreserve") {
        // texturePreserve necesita el resultado del tryon — la imagen modelo+prenda
        // donde Kolors dejó la tela plástica. Sin tryon, no hay nada que corregir.
        if (!stepResults.tryon) {
          console.warn("[lingerie] texturePreserve: tryon no corrió, skip");
          updateStep(jobId, stepDef.id, { status: "skipped", error: "Sin resultado del tryon — no hay nada para texturizar." });
          return false;
        }
        inputForStep = stepResults.tryon;
      } else if (stepDef.id === "photoFullBody") {
        // photoFullBody hace outpaint downward sobre el resultado del tryon. Si
        // texturePreserve corrió, usamos ESE (textura ya corregida) — sino, tryon
        // crudo. Sin ninguno, no podemos extender canvas → skip con mensaje claro.
        //
        // Fallback robusto: el mapa local `stepResults` puede no tener el tryon
        // (closures / orden), pero el resultado SÍ está renderizado en el estado
        // del job. Lo leemos de ahí antes de saltar — así el paso deja de quedar
        // "Saltado/sin output" cuando la Foto Frontal sí corrió (bug reportado).
        let baseUrl = stepResults.texturePreserve || stepResults.tryon;
        if (!baseUrl) {
          baseUrl = await new Promise<string | undefined>((resolve) => {
            setJobs((prev) => {
              const j = prev.find((jj) => jj.id === jobId);
              const tx = j?.steps.find((s) => s.id === "texturePreserve");
              const ty = j?.steps.find((s) => s.id === "tryon");
              const pick = (st?: PipelineStep) =>
                st && (st.status === "done" || st.status === "accepted") ? st.resultUrl : undefined;
              resolve(pick(tx) || pick(ty));
              return prev;
            });
          });
        }
        if (!baseUrl) {
          updateStep(jobId, stepDef.id, {
            status: "skipped",
            error: "Foto Cuerpo Completo necesita el resultado del Try-On (Foto Frontal). Activá y corré la Foto Frontal primero.",
          });
          return false;
        }
        inputForStep = baseUrl;
      } else if (stepDef.id === "tryon") {
        // tryon → Kolors (fal.ai). Preferir URLs de fal nativas para evitar
        // el round-trip Replicate→fal en ensureFalAccessibleUrl que descarga
        // JSON metadata en vez de bytes de imagen (fix de commit 1e63a40).
        // Prioridad: isolate result (fal URL) → falUrl pre-subida → uploadedUrl.
        inputForStep = stepResults.isolate || falUrl || uploadedUrl;
      } else if (stepDef.id === "productVideo") {
        // productVideo REQUIERE la prenda aislada (prenda sola, fondo limpio).
        // Caer a falUrl/uploadedUrl daría video de la foto original (modelo
        // con prenda puesta) → lo opuesto del objetivo. Mejor fallar con
        // mensaje claro pidiendo activar el paso 'Aislar Prenda'.
        if (!stepResults.isolate) {
          throw new Error(
            "Video 360° del Producto necesita la prenda aislada. Activá el paso 'Aislar Prenda' o desactivá este video."
          );
        }
        inputForStep = stepResults.isolate;
      }

      updateStep(jobId, stepDef.id, { status: "processing", inputUrl: inputForStep });

      // Auto-scroll al step que está procesando. En mobile las tarjetas se
      // extienden below-the-fold y la usuaria no vería que un step arrancó.
      // requestAnimationFrame para esperar que React renderee el status update.
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-step-id="${stepDef.id}"]`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      });

      try {
        // Refresh job to get latest state
        const freshJob = (await new Promise<ImageJob>((resolve) => {
          setJobs((prev) => {
            const j = prev.find((j) => j.id === jobId);
            if (j) resolve({ ...j, uploadedUrl, falUrl });
            return prev;
          });
        }));

        const result = await executeStep(
          { ...freshJob, uploadedUrl, falUrl },
          stepDef,
          inputForStep,
          newSharedModel,
          newSharedSeed,
          stepResults.isolate,
          jobsSnapshot,  // P0-2: contexto para buscar fotos de espalda tagged
        );

        if (result.newModelUrl) {
          newSharedModel = result.newModelUrl;
          setSharedModelUrl(result.newModelUrl);
        }
        if (result.newSeed !== undefined) {
          newSharedSeed = result.newSeed;
          setSharedSeed(result.newSeed);
        }

        updateStep(jobId, stepDef.id, {
          status: "done",
          resultUrl: result.resultUrl,
          cost_actual: result.cost,
          candidates: result.candidates,
          usedProvider: result.usedProvider,
          // Foto Frontal: mostrar la MODELO nueva como "Original/antes" (en vez del
          // garment) → la tarjeta queda como antes/después: modelo → modelo con el bra.
          ...(stepDef.id === "tryon" && newSharedModel ? { originalUrl: newSharedModel } : {}),
        });

        // Populate local map para que el próximo step pueda leer este resultUrl
        // sin depender del useState (que es stale en esta closure).
        stepResults[stepDef.id] = result.resultUrl;

        // lastResultUrl se usa como input default del siguiente step. Evitamos
        // propagar outputs que no son imagen de producto (videos, models vacias
        // sin vestir, y las fotos extra photoBack/photoFullBody que son fotos
        // paralelas al hero, no un eslabón lineal).
        const nonPropagatingSteps: StepId[] = ["productVideo", "modelVideo", "model", "photoBack", "photoFullBody"];
        if (!nonPropagatingSteps.includes(stepDef.id)) {
          lastResultUrl = result.resultUrl;
        }

        setJobs((prev) => prev.map((j) =>
          j.id !== jobId ? j : { ...j, totalCost: j.totalCost + result.cost }
        ));

        // Manual mode: pause and wait for user action (10 min timeout to prevent memory leak)
        if (!autoMode && (stepDef.id !== "model" || !newSharedModel)) {
          await new Promise<void>((resolve) => {
            const TIMEOUT_MS = 10 * 60 * 1000; // 10 min — si la usuaria cierra tab, no queda pendiente forever
            let timeoutId: ReturnType<typeof setTimeout> | undefined = undefined;
            const cleanup = () => {
              window.removeEventListener("pipeline-action" as keyof WindowEventMap, handler as EventListener);
              clearTimeout(timeoutId);
            };
            const handler = (event: CustomEvent<{ jobId: string; stepId: string; action: string }>) => {
              if (event.detail.jobId === jobId && event.detail.stepId === stepDef.id) {
                cleanup();
                if (event.detail.action === "skip") {
                  updateStep(jobId, stepDef.id, { status: "skipped" });
                } else {
                  updateStep(jobId, stepDef.id, { status: "accepted" });
                }
                resolve();
              }
            };
            window.addEventListener("pipeline-action" as keyof WindowEventMap, handler as EventListener);
            timeoutId = setTimeout(() => {
              cleanup();
              updateStep(jobId, stepDef.id, { status: "skipped" });
              resolve();
            }, TIMEOUT_MS);
          });
        } else {
          updateStep(jobId, stepDef.id, { status: "accepted" });
        }
      } catch (err) {
        const rawMsg = err instanceof Error ? err.message : "Error desconocido";
        // P0-3: si la usuaria apretó "Detener" (AbortController.abort()), el
        // fetch() tira DOMException con name "AbortError". Lo mostramos como
        // status "skipped" con mensaje claro, no como error rojo — fue una
        // acción deliberada de la usuaria, no un fallo.
        const isAbort = err instanceof Error && (err.name === "AbortError" || /aborted|the user aborted/i.test(rawMsg));
        if (isAbort) {
          updateStep(jobId, stepDef.id, { status: "skipped", error: "Detenido por la usuaria" });
          // Señal al caller: salir del loop, no procesar más steps.
          return true;
        }

        // Smart fallback: si photoFullBody / photoBack fallan y la usuaria
        // tiene una foto REAL del ángulo correspondiente (o una frontal como
        // último recurso para photoFullBody), usamos esa foto como resultado
        // del paso. No es ideal pero evita que se pierda plata + el usuario
        // tenga que reintentar manualmente. Aviso por toast para transparencia.
        if (stepDef.id === "photoFullBody" || stepDef.id === "photoBack") {
          // Usar el job original del snapshot (freshJob solo existe dentro del
          // try block, acá estamos en el catch). Reconstruir para el matching.
          const jobForMatching = { ...job, uploadedUrl, falUrl } as ImageJob;
          const fallback = stepDef.id === "photoBack"
            ? findMatchingPhoto(jobForMatching, jobsSnapshot, ["espalda"])
            : findMatchingPhoto(jobForMatching, jobsSnapshot, ["flat", "otra", "frontal"]);
          if (fallback?.uploadedUrl) {
            console.warn(`[lingerie] ${stepDef.id} falló: usando foto real "${fallback.filename}" como resultado.`);
            toast.warning(
              `${stepDef.label} falló — usamos tu foto real (${fallback.filename}) en su lugar para no perder el paso.`,
            );
            updateStep(jobId, stepDef.id, {
              status: "done",
              resultUrl: fallback.uploadedUrl,
              cost_actual: 0,
              error: undefined,
            });
            stepResults[stepDef.id] = fallback.uploadedUrl;
            return false;  // Continúa al siguiente step
          }
        }

        // "Failed to fetch" / "NetworkError" / "Load failed" son TypeErrors del
        // browser cuando fetch() falla antes de recibir respuesta (conexión móvil
        // intermitente, red caída, request cortado). Traducimos a español para
        // que la usuaria entienda qué hacer (reintentar con mejor señal) en vez
        // de ver un string técnico en inglés.
        const isNetworkError = /failed to fetch|networkerror|load failed|network request failed/i.test(rawMsg);
        const errorMsg = isNetworkError
          ? "Error de conexión. Revisá tu internet y reintentá."
          : rawMsg;
        updateStep(jobId, stepDef.id, { status: "error", error: errorMsg });

        if (!autoMode) {
          // Wait for user to retry or skip (10 min timeout)
          await new Promise<void>((resolve) => {
            const TIMEOUT_MS = 10 * 60 * 1000;
            let timeoutId: ReturnType<typeof setTimeout> | undefined = undefined;
            const cleanup = () => {
              window.removeEventListener("pipeline-action" as keyof WindowEventMap, handler as EventListener);
              clearTimeout(timeoutId);
            };
            const handler = (event: CustomEvent<{ jobId: string; stepId: string; action: string }>) => {
              if (event.detail.jobId === jobId && event.detail.stepId === stepDef.id) {
                cleanup();
                if (event.detail.action === "skip") {
                  updateStep(jobId, stepDef.id, { status: "skipped" });
                  resolve();
                } else if (event.detail.action === "rerun") {
                  resolve();
                }
              }
            };
            window.addEventListener("pipeline-action" as keyof WindowEventMap, handler as EventListener);
            timeoutId = setTimeout(() => {
              cleanup();
              updateStep(jobId, stepDef.id, { status: "skipped" });
              resolve();
            }, TIMEOUT_MS);
          });
        } else {
          // Auto mode: skip errored step and continue
          toast.error(`Error en "${stepDef.label}": ${errorMsg}`);
        }
      }
      return false;
    };

    // FASE A — isolate + model en paralelo
    //
    // Son inputs INDEPENDIENTES a tryon: isolate solo necesita uploadedUrl,
    // y model no usa input alguno (genera persona desde prompts). Antes
    // corrían secuencial perdiendo ~25-35s por foto. Si la usuaria habilitó
    // ambos como los dos primeros steps (caso default), los lanzamos juntos.
    //
    // Si solo uno está enabled, o el orden cambió, caemos al loop serial
    // de siempre. Lo mismo si la usuaria abortó durante la fase paralela.
    const idxIsolate = enabledSteps.findIndex((s) => s.id === "isolate");
    const idxModel = enabledSteps.findIndex((s) => s.id === "model");
    const canParallelizePhaseA =
      idxIsolate === 0 && idxModel === 1 && enabledSteps.length >= 2;

    let startIndex = 0;
    let aborted = false;

    if (canParallelizePhaseA) {
      console.log("[lingerie] FASE A: isolate + model en paralelo");
      const [isolateAborted, modelAborted] = await Promise.all([
        processStep(enabledSteps[0]),
        processStep(enabledSteps[1]),
      ]);
      aborted = isolateAborted || modelAborted;
      startIndex = 2;
    }

    // Loop serial — resto de steps (o todos si no se paralelizó la fase A).
    if (!aborted) {
      for (let i = startIndex; i < enabledSteps.length; i++) {
        const shouldBreak = await processStep(enabledSteps[i]);
        if (shouldBreak) break;
      }
    }

    setJobs((prev) => prev.map((j) => j.id !== jobId ? j : { ...j, status: "done" }));

    // Auto-guardar resultados en la galería persistente (gallery-store).
    // Cada step con resultado queda como entry separada para que la usuaria
    // pueda volver a /gallery y ver/descargar el historial entre sesiones.
    //
    // Las URLs upstream (fal.media / replicate.delivery) caducan en horas/días,
    // así que ANTES de guardar convertimos cada URL a un data: base64 — así la
    // galería sigue descargable indefinidamente. Videos se omiten porque su
    // base64 es de MB y revientan localStorage; se guardan como URL upstream
    // (mejor que nada — caducan, pero el costo de descargar y meter MB de
    // video en gallery-store es peor).
    try {
      const addImages = useGalleryStore.getState().addImages;
      const finalJob = (jobsSnapshot.find((j) => j.id === jobId)) ?? job;
      const baseName = finalJob.filename.replace(/\.[^.]+$/, '');
      const ts = Date.now();
      const refTag = finalJob.referenceKey ?? '';
      const colorTag = finalJob.color ?? '';
      const labelSuffix = [refTag, colorTag].filter(Boolean).join(' · ');

      const galleryItems: Parameters<typeof addImages>[0] = [];
      const entries = Object.entries(stepResults).filter(([, u]) => !!u) as Array<[string, string]>;

      // Convertimos a base64 en paralelo (urlToDataUrl ya degrada silenciosamente
      // si el proxy falla — devuelve la URL original como fallback).
      const persistentUrls = await Promise.all(
        entries.map(async ([, resultUrl]) => {
          const isVideo = resultUrl.includes('.mp4') || resultUrl.includes('.webm') || resultUrl.includes('video');
          if (isVideo) return resultUrl;
          return await urlToDataUrl(resultUrl);
        }),
      );

      for (let i = 0; i < entries.length; i++) {
        const [stepId, resultUrl] = entries[i];
        const stepDef = STEP_DEFS.find((s) => s.id === stepId);
        const isVideo = resultUrl.includes('.mp4') || resultUrl.includes('.webm') || resultUrl.includes('video');
        const ext = isVideo ? 'mp4' : 'jpg';
        galleryItems.push({
          id: `lingerie-${stepId}-${ts}-${finalJob.id}`,
          filename: `${baseName}-${stepId}${labelSuffix ? ` (${labelSuffix})` : ''}.${ext}`,
          resultUrl: persistentUrls[i],
          originalUrl: finalJob.uploadedUrl ?? finalJob.previewUrl,
          date: new Date().toISOString(),
          operations: [stepDef?.label ?? stepId],
          project: `lingerie-${productType}${refTag ? `-${refTag}` : ''}`,
        });
      }
      if (galleryItems.length > 0) {
        addImages(galleryItems);
        console.log(`[lingerie] ${galleryItems.length} resultados guardados en /gallery (base64-persistentes)`);
      }
    } catch (galleryErr) {
      // Silent — fallo de la galería no bloquea el pipeline ni molesta con toast
      console.warn('[lingerie] No se pudo guardar en galería:', galleryErr);
    }

    return { newSharedModel, newSharedSeed };
  }, [autoMode, executeStep, updateStep, productType]);

  /* ---- Start the full pipeline ---- */
  const startPipeline = useCallback(async () => {
    if (jobs.length === 0) return;
    setPhase("pipeline");
    setIsRunning(true);

    // Apply enabled steps to all jobs
    setJobs((prev) => prev.map((job) => ({
      ...job,
      status: "idle",
      steps: job.steps.map((s) => ({
        ...s,
        enabled: steps.find((def) => def.id === s.id)?.enabled ?? s.enabled,
        status: "idle",
        resultUrl: undefined,
        error: undefined,
      })),
    })));

    let currentSharedModel = sharedModelUrl;
    let currentSharedSeed = sharedSeed;

    // Get fresh snapshot
    const jobsSnapshot = jobs.map((job) => ({
      ...job,
      steps: job.steps.map((s) => ({
        ...s,
        enabled: steps.find((def) => def.id === s.id)?.enabled ?? s.enabled,
        status: "idle" as StepStatus,
        resultUrl: undefined,
        error: undefined,
      })),
    }));

    // Pre-upload TODAS las fotos antes de correr el pipeline. Así cuando el
    // modo face-swap (u otro que use findMatchingPhoto) busque la uploadedUrl
    // de otra foto del batch, ya está disponible. Sin esto, las fotos no-
    // frontal quedan con uploadedUrl=undefined hasta que su propio processJob
    // las suba — y face-swap en frontal runs ANTES, así que no las veía.
    //
    // Upload en paralelo para no secuenciar 6 uploads de ~5s cada uno.
    const uploadPromises = jobsSnapshot.map(async (job, idx) => {
      if (job.uploadedUrl) return { idx, ...job };
      if (!job.file) {
        // Job restaurado sin File — no podemos subir. Queda sin uploadedUrl
        // y su processJob mostrará error amistoso.
        console.warn(`[lingerie] ${job.filename}: job restaurado sin File, saltando upload`);
        return { idx, ...job };
      }
      try {
        const uploaded = await uploadFile(job.file);
        return { idx, ...job, uploadedUrl: uploaded.url, falUrl: uploaded.falUrl };
      } catch (err) {
        console.warn(`[lingerie] pre-upload falló para ${job.filename}:`, err);
        return { idx, ...job };
      }
    });
    const uploadedJobs = await Promise.all(uploadPromises);
    // Mutar jobsSnapshot in-place con las URLs conseguidas + reflejar en la
    // UI para que la usuaria vea que hubo progreso (ya no quedan en "En cola").
    for (const u of uploadedJobs) {
      jobsSnapshot[u.idx] = { ...jobsSnapshot[u.idx], uploadedUrl: u.uploadedUrl, falUrl: u.falUrl };
    }
    setJobs((prev) => prev.map((j) => {
      const match = uploadedJobs.find((u) => u.id === j.id);
      return match ? { ...j, uploadedUrl: match.uploadedUrl, falUrl: match.falUrl } : j;
    }));

    // Marcar las vistas SECUNDARIAS (espalda/lado/detalle) que tienen una foto
    // PRINCIPAL del mismo REF como referencia (status "done") DESDE YA — así no
    // quedan "En cola": no son productos aparte, son referencia del producto principal.
    setJobs((prev) => prev.map((j) => {
      const isSecondary = j.photoAngle === "espalda" || j.photoAngle === "lado" || j.photoAngle === "detalle";
      const hasPrimary = prev.some((p) =>
        p.id !== j.id &&
        (p.photoAngle === "frontal" || p.photoAngle === "flat" || p.photoAngle === "otra") &&
        (p.referenceKey === j.referenceKey || (!p.referenceKey && !j.referenceKey)),
      );
      return isSecondary && hasPrimary ? { ...j, status: "done" as const } : j;
    }));

    batchAbortRef.current = false;
    for (let i = 0; i < jobsSnapshot.length; i++) {
      // Check si la usuaria apretó "Detener todo el batch"
      if (batchAbortRef.current) break;
      const job = jobsSnapshot[i];

      // UN PRODUCTO POR REF: si esta foto es una VISTA SECUNDARIA (espalda/lado/detalle)
      // y existe una foto PRINCIPAL (frontal/flat) del MISMO REF, NO la procesamos como
      // producto aparte — queda como REFERENCIA (la usa el paso Foto Espalda del producto
      // principal vía findMatchingPhoto). Así frente+espalda son UN producto, no dos.
      const isSecondaryView = job.photoAngle === "espalda" || job.photoAngle === "lado" || job.photoAngle === "detalle";
      const hasPrimarySameRef = jobsSnapshot.some((j) =>
        j.id !== job.id &&
        (j.photoAngle === "frontal" || j.photoAngle === "flat" || j.photoAngle === "otra") &&
        (j.referenceKey === job.referenceKey || (!j.referenceKey && !job.referenceKey)),
      );
      if (isSecondaryView && hasPrimarySameRef) {
        console.log(`[lingerie] ${job.filename}: vista "${job.photoAngle}" del REF ${job.referenceKey ?? "?"} → referencia, no se procesa aparte`);
        setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, status: "done" } : j));
        continue;
      }

      setActiveJobIndex(i);
      setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, status: "active" } : j));
      const { newSharedModel, newSharedSeed } = await processJob(job.id, jobsSnapshot, currentSharedModel, currentSharedSeed);
      if (newSharedModel) currentSharedModel = newSharedModel;
      if (newSharedSeed !== undefined) currentSharedSeed = newSharedSeed;
    }

    setIsRunning(false);
    if (!batchAbortRef.current) {
      toast.success(`Pipeline completado — ${jobsSnapshot.length} imagen(es) procesada(s)`);
    } else {
      batchAbortRef.current = false;
    }
  }, [jobs, steps, sharedModelUrl, sharedSeed, processJob]);

  /* ---- Manual mode action dispatcher ---- */
  const dispatchAction = useCallback((jobId: string, stepId: StepId, action: "accept" | "skip" | "rerun") => {
    if (action === "rerun") {
      updateStep(jobId, stepId, { status: "idle", resultUrl: undefined, error: undefined });
    }
    window.dispatchEvent(new CustomEvent("pipeline-action", { detail: { jobId, stepId, action } }));
  }, [updateStep]);

  /* ---- Download all results ---- */
  const downloadAll = useCallback(async () => {
    const results: { url: string; name: string }[] = [];
    for (const job of jobs) {
      const base = job.filename.replace(/\.[^.]+$/, "");
      for (const step of job.steps) {
        if (step.resultUrl && (step.status === "done" || step.status === "accepted")) {
          results.push({ url: step.resultUrl, name: `${base}_${step.id}` });
        }
      }
    }
    for (const { url, name } of results) {
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const ext = blob.type.includes("video") ? "mp4" : "png";
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${name}.${ext}`;
        a.click();
        URL.revokeObjectURL(a.href);
        await new Promise((r) => setTimeout(r, 200));
      } catch {
        /* skip failed downloads */
      }
    }
  }, [jobs]);

  const activeJob = jobs[activeJobIndex];
  const completedCount = jobs.filter((j) => j.status === "done").length;
  const totalCostAll = jobs.reduce((a, j) => a + j.totalCost, 0);
  const estimatedCost = estimateCost(steps, jobs.length);

  /* ================================================================ */
  /*  SETUP PHASE                                                      */
  /* ================================================================ */
  if (phase === "setup") {
    return (
      <div className="min-h-screen bg-surface text-heading overflow-x-hidden">
        {/* Top nav — design tokens (oro brand) */}
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--border-default)] bg-[rgba(12,12,14,0.85)] px-4 md:px-6 py-3 backdrop-blur">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-muted transition-default hover:text-[var(--accent)]">
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Inicio</span>
          </Link>
          <span className="text-[var(--border-default)]">/</span>
          <div className="flex items-center gap-2 min-w-0">
            <Package className="h-4 w-4 text-[var(--accent)] shrink-0" />
            <span className="text-sm font-semibold text-heading truncate">Lencería</span>
          </div>
          <div className="ml-auto hidden md:block">
            <span className="rounded-full bg-[var(--accent-dim)] px-3 py-1 text-xs font-medium text-[var(--accent)]">
              Bras · Panties · Shapewear · Fajas
            </span>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 md:px-6 py-6 md:py-8">
          {/* Page title */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Configura tu Pipeline de Lencería</h1>
            <p className="mt-1 text-sm text-gray-400">
              Bras, panties y shapewear. Sube fotos de una referencia con modelo original, y el pipeline quita la modelo, crea una nueva con licencia libre, y la viste con la prenda. Opcionalmente genera videos de producto y de modelo.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
            {/* Left column */}
            <div className="space-y-6">
              {/* Upload */}
              <section className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                    1 · Fotos del Producto
                  </h2>
                  {/* Undo / Redo / Reset — controles "app profesional" */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={undoJobs}
                      disabled={!canUndo}
                      title="Deshacer (Ctrl+Z)"
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-gray-400 transition-colors hover:border-white/25 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-white/10 disabled:hover:text-gray-400"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={redoJobs}
                      disabled={!canRedo}
                      title="Rehacer (Ctrl+Shift+Z)"
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-gray-400 transition-colors hover:border-white/25 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-white/10 disabled:hover:text-gray-400"
                    >
                      <RotateCcw className="h-3.5 w-3.5 -scale-x-100" />
                    </button>
                    <div className="mx-1 h-4 w-px bg-white/10" />
                    <button
                      type="button"
                      onClick={resetAll}
                      disabled={jobs.length === 0}
                      title="Comenzar de nuevo — borra las fotos y resultados (settings se mantienen)"
                      className="flex items-center gap-1 rounded-md border border-white/10 px-2 h-7 text-[11px] font-medium text-gray-400 transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-white/10 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                    >
                      <X className="h-3 w-3" />
                      Comenzar de nuevo
                    </button>
                  </div>
                </div>
                <UploadZone onFiles={handleFiles} />

                {/* Cargar inventario — respeta el productType seleccionado.
                    bra → bras/, panty → panties/, faja → shapewear/, set → sets/.
                    Si no hay folder, toast claro "subí manualmente". */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={loadInventoryBras}
                    disabled={loadingInventory}
                    className="flex items-center gap-2 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-dim)] px-3 py-2 text-xs font-semibold text-[var(--accent)] transition-default hover:border-[var(--accent)] disabled:opacity-50 disabled:cursor-wait"
                  >
                    {loadingInventory ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Cargando…
                      </>
                    ) : (
                      <>
                        <Package className="h-3.5 w-3.5" />
                        Cargar inventario de {productType === "bra" ? "Bras" : productType === "panty" ? "Panties" : productType === "faja" ? "Shapewear" : "Sets"}
                      </>
                    )}
                  </button>
                  <span className="text-[10px] text-muted">
                    Si no hay folder pre-cargado de este tipo, subí tus fotos manualmente arrastrándolas arriba.
                  </span>
                </div>

                {/* Uploaded image grid */}
                {jobs.length > 0 && (
                  <div id="lingerie-upload-area">
                    <div className="mt-4 mb-2 flex items-center justify-between text-[11px]">
                      <span className="text-gray-400">
                        {jobs.length} foto{jobs.length === 1 ? '' : 's'} · el ángulo se detecta del nombre, pero podés corregirlo abajo de cada foto
                      </span>
                      {jobs.some((j) => j.photoAngle === 'espalda') && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/[0.06] px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                          <Check className="h-2.5 w-2.5" />
                          Espalda real lista
                        </span>
                      )}
                    </div>
                    {/* Hint de qué ángulos desbloquean qué steps. Si la usuaria
                        solo sube frontal, photoBack se va a saltar — mejor que
                        lo sepa ANTES de procesar, no después. */}
                    <div className="mb-3 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-[10px] text-gray-400">
                      <p className="mb-1 font-semibold uppercase tracking-wider text-gray-300">Qué fotos necesitás</p>
                      <ul className="space-y-0.5">
                        <li><b className="text-white">Frontal</b> — obligatoria (para tryon y modelo)</li>
                        <li><b className="text-white">Espalda</b> — opcional, <span className="text-amber-300">necesaria si querés &quot;Foto Espalda&quot;</span> (Kolors no rota 180° solo)</li>
                        <li><b className="text-white">Lateral / Detalle</b> — opcionales, mejoran fidelidad</li>
                        <li><b className="text-white">Flat lay</b> — opcional, para video 360° del producto</li>
                      </ul>
                    </div>
                    {/* Warning de talla vs bodyType: si las fotos tienen tallas que
                        sugieren un bodyType distinto al configurado, avisamos. */}
                    {(() => {
                      const suggestions = new Map<string, number>();
                      for (const j of jobs) {
                        if (j.suggestedBodyType) {
                          suggestions.set(j.suggestedBodyType, (suggestions.get(j.suggestedBodyType) ?? 0) + 1);
                        }
                      }
                      if (suggestions.size === 0) return null;
                      // Encontrar el bodyType más frecuente entre las fotos
                      const mostCommon = Array.from(suggestions.entries()).sort((a, b) => b[1] - a[1])[0];
                      if (!mostCommon || mostCommon[0] === modelConfig.bodyType) return null;
                      return (
                        <div className="mb-3 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-[11px] text-amber-200">
                          <span className="font-semibold">Sugerencia de talla:</span> la mayoría de tus fotos son talla que sugiere modelo <b>{mostCommon[0]}</b>, pero tenés configurado <b>{modelConfig.bodyType}</b>.
                          {' '}
                          <button
                            type="button"
                            onClick={() => setModelConfig((prev) => ({ ...prev, bodyType: mostCommon[0] }))}
                            className="ml-1 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-100 hover:bg-amber-500/20"
                          >
                            Cambiar a {mostCommon[0]}
                          </button>
                        </div>
                      );
                    })()}

                    {/* P1-2: resumen de agrupación por REF + colores detectados.
                        Muestra a la usuaria qué tantos productos únicos detectó. */}
                    {(() => {
                      const groups = new Map<string, Set<string>>();
                      for (const j of jobs) {
                        const refKey = j.referenceKey ?? "sin-ref";
                        if (!groups.has(refKey)) groups.set(refKey, new Set());
                        if (j.color) groups.get(refKey)!.add(j.color);
                      }
                      const namedGroups = Array.from(groups.entries()).filter(([k]) => k !== "sin-ref");
                      if (namedGroups.length === 0) return null;
                      return (
                        <div className="mb-3 rounded-md border border-[var(--accent)]/20 bg-[var(--accent)]/[0.04] px-3 py-2 text-[11px]">
                          <span className="font-semibold text-[var(--accent)]">
                            {namedGroups.length} producto{namedGroups.length === 1 ? '' : 's'} detectado{namedGroups.length === 1 ? '' : 's'}:
                          </span>{' '}
                          {namedGroups.map(([ref, colorSet], i) => (
                            <span key={ref} className="text-gray-300">
                              {i > 0 && ' · '}
                              REF {ref}
                              {colorSet.size > 0 && (
                                <span className="ml-1 text-gray-500">
                                  ({colorSet.size} color{colorSet.size === 1 ? '' : 'es'})
                                </span>
                              )}
                            </span>
                          ))}
                          <p className="mt-1 text-[10px] text-gray-500">
                            Las fotos con misma REF comparten la modelo IA (se paga una sola vez por REF).
                          </p>
                        </div>
                      );
                    })()}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {/* Ordenar jobs por referenceKey + color para que los del mismo producto
                          aparezcan adyacentes visualmente. Jobs sin REF quedan al final. */}
                      {[...jobs].sort((a, b) => {
                        const rk = (a.referenceKey ?? "zzz").localeCompare(b.referenceKey ?? "zzz");
                        if (rk !== 0) return rk;
                        return (a.color ?? "zzz").localeCompare(b.color ?? "zzz");
                      }).map((job) => (
                        <div key={job.id} className="group relative">
                          <div className="relative">
                            <img
                              src={job.previewUrl}
                              alt={job.filename}
                              className="aspect-square w-full rounded-lg object-cover border border-white/10"
                            />
                            <button
                              onClick={() => removeJob(job.id)}
                              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-white"
                            >
                              <X className="h-3 w-3" />
                            </button>
                            {/* Badge con el ángulo detectado — siempre visible */}
                            <div className="absolute left-1 top-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white">
                              {PHOTO_ANGLE_OPTIONS.find((o) => o.value === job.photoAngle)?.label ?? job.photoAngle}
                            </div>
                            {/* P1-2: Color swatch + nombre */}
                            {job.color && (
                              <div className="absolute right-1 top-7 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                                <span
                                  className="inline-block h-2 w-2 rounded-full border border-white/30"
                                  style={{ background: COLOR_SWATCH[job.color] ?? "#666" }}
                                />
                                <span className="capitalize">{job.color}</span>
                              </div>
                            )}
                            {/* Talla detectada */}
                            {job.sizeHint && (
                              <div className="absolute right-1 top-14 rounded-md bg-blue-500/70 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                                {job.sizeHint}
                              </div>
                            )}
                            {job.referenceKey && (
                              <div className="absolute left-1 bottom-1 rounded-md bg-[var(--accent)]/70 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                                REF {job.referenceKey}
                              </div>
                            )}
                          </div>
                          <p className="mt-1 truncate text-[10px] text-gray-500">{job.filename}</p>
                          {/* P0-1: dropdown para corregir el ángulo */}
                          <label className="mt-1 flex items-center gap-1">
                            <span className="text-[9px] uppercase tracking-wider text-gray-600">Ángulo</span>
                            <select
                              value={job.photoAngle}
                              onChange={(e) => updateJobAngle(job.id, e.target.value as PhotoAngle)}
                              className="flex-1 rounded-md border border-white/10 bg-black/40 px-1.5 py-1 text-[10px] text-white outline-none focus:border-[var(--accent)]/50"
                            >
                              {PHOTO_ANGLE_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value} title={o.hint}>{o.label}</option>
                              ))}
                            </select>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* Reuso de modelos IA ya generadas — ahorro $0.055 por REF */}
              {savedModels.length > 0 && (
                <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-300">
                        Reusar modelo IA existente (ahorro $0.055/foto)
                      </h2>
                      <p className="mt-1 text-xs text-gray-400">
                        Click una modelo ya creada en sesiones anteriores para NO pagar por generar otra. O dejá sin seleccionar para crear nueva.
                      </p>
                    </div>
                    {sharedModelUrl && (
                      <button
                        type="button"
                        onClick={() => setSharedModelUrl(undefined)}
                        className="rounded border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-300 hover:border-white/20"
                      >
                        Usar nueva modelo ($0.055)
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                    {savedModels.slice(0, 18).map((m) => {
                      const isSelected = sharedModelUrl === m.previewUrl;
                      return (
                        <button
                          type="button"
                          key={m.id}
                          onClick={() => {
                            setSharedModelUrl(m.previewUrl);
                            // Si el modelo guardado tiene seed (solo los creados post-upgrade 2a),
                            // lo reusamos para que photoBack/photoFullBody generen la MISMA
                            // identidad. Si no hay seed (modelos viejos), esas fotos extra
                            // usarán seed random → identidad similar pero no idéntica.
                            if (m.seed !== undefined) setSharedSeed(m.seed);
                            toast.success(`Modelo "${m.name}" seleccionada — pipeline la reusa sin cobrar.`);
                          }}
                          className={cn(
                            "group relative flex flex-col overflow-hidden rounded-lg border transition-all",
                            isSelected
                              ? "border-emerald-400 ring-2 ring-emerald-400/40"
                              : "border-white/10 hover:border-white/30",
                          )}
                          title={`${m.name} — ${m.gender ?? 'female'}, ${m.skinTone ?? 'medium'}, ${m.bodyType ?? 'average'}`}
                        >
                          <ModelThumb url={m.previewUrl} alt={m.name} name={m.name ?? 'Modelo'} />
                          <div className="bg-black/60 px-1.5 py-1 text-[10px] text-gray-300">
                            <input
                              type="text"
                              defaultValue={m.name?.slice(0, 30) ?? 'Modelo'}
                              onClick={(e) => e.stopPropagation()}
                              onBlur={async (e) => {
                                const newName = e.target.value.trim();
                                if (!newName || newName === m.name) return;
                                try {
                                  const res = await fetch('/api/ai-models', {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ id: m.id, name: newName }),
                                  });
                                  const json = await res.json();
                                  if (json.success) {
                                    setSavedModels((prev) => prev.map((x) => x.id === m.id ? { ...x, name: newName } : x));
                                    toast.success(`Modelo renombrada a "${newName}"`);
                                  }
                                } catch { /* silent */ }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                e.stopPropagation();
                              }}
                              className="w-full bg-transparent text-[10px] text-gray-300 outline-none truncate placeholder:text-gray-600 focus:text-white focus:bg-white/5 focus:rounded px-0.5"
                              placeholder="Nombre…"
                              title="Click para renombrar esta modelo (ej: 'Karen', 'Ana')"
                            />
                          </div>
                          {isSelected && (
                            <div className="absolute right-1 top-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                              ✓
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {savedModels.length > 18 && (
                    <p className="mt-2 text-[11px] text-gray-500">
                      Mostrando 18 de {savedModels.length} modelos guardadas. Más en /gallery.
                    </p>
                  )}
                </section>
              )}

              {/* Reference + product type */}
              <section className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
                  2 · Información del Producto
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-400">Número de referencia</label>
                    <input
                      type="text"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="ej. 011473"
                      className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-400">Tipo de producto</label>
                    <select
                      value={productType}
                      onChange={(e) => setProductType(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)]/50"
                    >
                      <option value="bra">Brassiere / Top</option>
                      <option value="panty">Panty / Ropa interior</option>
                      <option value="faja">Faja / Shapewear</option>
                      <option value="set">Set completo</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Steps to run */}
              <section className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
                  3 · Pasos del Pipeline
                </h2>
                <div className="space-y-2">
                  {steps.map((step, idx) => {
                    const Icon = step.icon;
                    return (
                      <label
                        key={step.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-all",
                          step.enabled
                            ? "border-[var(--accent)]/30 bg-[var(--accent)]/[0.06]"
                            : "border-white/6 bg-white/[0.01] opacity-60",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={step.enabled}
                          onChange={() => toggleStep(step.id)}
                          className="accent-[var(--accent)]"
                        />
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/5 text-xs font-bold text-gray-500">
                          {idx + 1}
                        </div>
                        <Icon className="h-4 w-4 shrink-0 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">{step.label}</p>
                          <p className="text-xs text-gray-500">{step.description}</p>
                        </div>
                        <span className={cn(
                          "shrink-0 text-xs font-semibold",
                          step.id === "model" ? "text-amber-400" : "text-gray-500",
                        )}>
                          {step.id === "model" && jobs.length > 1 ? `${step.cost} (1x)` : `${step.cost}/foto`}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* Right column — model config + summary */}
            <div className="space-y-5">
              {/* Model config */}
              <section className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
                  Configuración del Modelo IA
                </h2>
                <p className="mb-4 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                  El modelo se genera <strong>una sola vez</strong> y se reutiliza para todas las fotos del producto — optimizando costos.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-400">Tono de piel</label>
                    <select
                      value={modelConfig.skinTone}
                      onChange={(e) => setModelConfig((m) => ({ ...m, skinTone: e.target.value }))}
                      className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)]/50"
                    >
                      <option value="light">Clara</option>
                      <option value="medium-light">Medio clara</option>
                      <option value="medium">Media</option>
                      <option value="medium-dark">Medio oscura</option>
                      <option value="dark">Oscura</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-400">Tipo de cuerpo</label>
                    <select
                      value={modelConfig.bodyType}
                      onChange={(e) => setModelConfig((m) => ({ ...m, bodyType: e.target.value }))}
                      className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)]/50"
                    >
                      <option value="slim">Delgada</option>
                      <option value="regular">Regular</option>
                      <option value="curvy">Curvy</option>
                      <option value="plus-size">Plus size</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-400">Rango de edad</label>
                    <select
                      value={modelConfig.ageRange}
                      onChange={(e) => setModelConfig((m) => ({ ...m, ageRange: e.target.value }))}
                      className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)]/50"
                    >
                      <option value="18-25">18 – 25 años</option>
                      <option value="26-35">26 – 35 años</option>
                      <option value="36-45">36 – 45 años</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Mode toggle */}
              <section className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Modo de Ejecución</h2>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setAutoMode(true)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-xs transition-all",
                      autoMode
                        ? "border-[var(--accent)]/40 bg-[var(--accent)]/15 text-[var(--accent)]"
                        : "border-white/8 bg-white/[0.02] text-gray-400 hover:border-white/15",
                    )}
                  >
                    <Zap className="h-4 w-4" />
                    <span className="font-semibold">Automático</span>
                    <span className="text-center text-[10px] text-gray-500">Todo sin pausas</span>
                  </button>
                  <button
                    onClick={() => setAutoMode(false)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-xs transition-all",
                      !autoMode
                        ? "border-[var(--accent)]/40 bg-[var(--accent)]/15 text-[var(--accent)]"
                        : "border-white/8 bg-white/[0.02] text-gray-400 hover:border-white/15",
                    )}
                  >
                    <Settings2 className="h-4 w-4" />
                    <span className="font-semibold">Manual</span>
                    <span className="text-center text-[10px] text-gray-500">Revisar cada paso</span>
                  </button>
                </div>
              </section>

              {/* Phase 2f: modo de generación — default / face-swap / multi-sample.
                  Elegible por la usuaria; cada uno tiene tradeoffs distintos. */}
              <section className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
                <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-gray-400">
                  Modo de Generación
                </h2>
                <p className="mb-3 text-[11px] text-gray-500">
                  Elegí cómo se generan las fotos. El default es el más seguro; las otras opciones son alternativas con tradeoffs distintos.
                </p>
                <div className="space-y-2">
                  {GENERATION_MODE_OPTIONS.map((opt) => {
                    const selected = generationMode === opt.value;
                    const isDisabled = !!opt.disabled;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => !isDisabled && setGenerationMode(opt.value)}
                        className={cn(
                          "flex w-full flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left transition-all",
                          isDisabled && "cursor-not-allowed opacity-50",
                          !isDisabled && selected
                            ? "border-[var(--accent)]/50 bg-[var(--accent)]/10"
                            : !isDisabled
                            ? "border-white/8 bg-white/[0.02] hover:border-white/20"
                            : "border-white/8 bg-white/[0.01]",
                        )}
                      >
                        <div className="flex w-full items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              "text-xs font-semibold",
                              selected ? "text-[var(--accent-light)]" : "text-gray-300",
                            )}>
                              {opt.label}
                            </span>
                            {isDisabled && (
                              <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-300">
                                Próximamente
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-medium text-gray-500">{opt.cost}</span>
                        </div>
                        <p className="text-[10px] leading-snug text-gray-500">{opt.desc}</p>
                        {isDisabled && opt.disabledReason && (
                          <p className="text-[9px] italic leading-snug text-amber-400/70">{opt.disabledReason}</p>
                        )}
                      </button>
                    );
                  })}
                </div>
                {generationMode === "face-swap" && (
                  <p className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/5 px-2.5 py-2 text-[10px] leading-snug text-amber-200">
                    ⚠️ Requiere que etiquetes tus fotos con su ángulo (Frontal/Espalda/Cuerpo). El face-swap solo se aplica a las fotos reales que subiste; las vistas sin foto real caen al modo clásico automáticamente.
                  </p>
                )}
              </section>

              {/* Art Direction — brief reutilizable del "look" del shoot. Inyecta
                  el fondo a model-create y el scenePrompt al try-on. Parte 1 del
                  roadmap Uwear (ver docs/research/uwear-accuracy-playbook.md):
                  prompts improvisados → preset estructurado = consistencia. */}
              <section className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
                <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-gray-400">
                  Art Direction (look del shoot)
                </h2>
                <p className="mb-3 text-[11px] text-gray-500">
                  El &ldquo;look&rdquo; como preset reutilizable — da consistencia a todo el catálogo. Se aplica a la modelo y al try-on.
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {ART_DIRECTIONS.map((ad) => {
                    const selected = artDirection === ad.id;
                    return (
                      <button
                        key={ad.id}
                        type="button"
                        onClick={() => setArtDirection(ad.id)}
                        className={cn(
                          "flex flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left transition-all",
                          selected
                            ? "border-[var(--accent)]/50 bg-[var(--accent)]/10"
                            : "border-white/8 bg-white/[0.02] hover:border-white/20",
                        )}
                        title={ad.desc}
                      >
                        <span className={cn(
                          "text-xs font-semibold",
                          selected ? "text-[var(--accent-light)]" : "text-gray-300",
                        )}>
                          {ad.label}
                        </span>
                        <span className="text-[10px] leading-tight text-gray-500 line-clamp-3">{ad.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* P1-3: calidad de FASHN — solo aplica cuando tryon usa FASHN
                  (via provider override en retry o flow non-lencería). El
                  default de lencería es SeedDream (preserva la prenda real),
                  con Kolors de backup. Por eso este panel es AVANZADO/opcional:
                  no nombramos FASHN como si fuera el motor o confundimos. */}
              <section className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
                <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-gray-400">
                  Calidad de Try-on (avanzado)
                </h2>
                <p className="mb-3 text-[11px] text-gray-500">
                  El try-on de lencería usa <span className="font-semibold text-gray-300">SeedDream</span> por
                  default (preserva tu prenda real), con Kolors de backup. Este control SOLO afecta si forzás
                  FASHN manualmente al reintentar un paso — y FASHN bloquea lencería, así que normalmente no lo
                  vas a necesitar.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {FASHN_MODE_OPTIONS.map((opt) => {
                    const selected = fashnMode === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFashnMode(opt.value)}
                        className={cn(
                          "flex flex-col items-center gap-0.5 rounded-lg border px-2 py-2.5 transition-all",
                          selected
                            ? "border-[var(--accent)]/50 bg-[var(--accent)]/10"
                            : "border-white/8 bg-white/[0.02] hover:border-white/20",
                        )}
                        title={opt.hint}
                      >
                        <span className={cn(
                          "text-xs font-semibold",
                          selected ? "text-[var(--accent-light)]" : "text-gray-300",
                        )}>
                          {opt.label}
                        </span>
                        <span className="text-[10px] text-gray-500">{opt.duration}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Cost summary + launch */}
              <section className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/[0.04] p-5">
                <h2 className="mb-4 text-sm font-semibold text-white">Resumen</h2>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Imágenes</span>
                    <span className="font-medium text-white">{jobs.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Pasos activos</span>
                    <span className="font-medium text-white">{steps.filter((s) => s.enabled).length} de {steps.length}</span>
                  </div>
                  <div className="my-3 border-t border-white/8" />
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Costo estimado</span>
                    <span className="text-base font-bold text-[var(--accent)]">
                      ${estimatedCost.toFixed(3)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={startPipeline}
                  disabled={jobs.length === 0}
                  className={cn(
                    "mt-5 flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all",
                    jobs.length > 0
                      ? "bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent)] active:scale-[0.98]"
                      : "cursor-not-allowed bg-white/5 text-gray-500",
                  )}
                >
                  <Play className="h-4 w-4" />
                  Iniciar Pipeline
                  {jobs.length > 0 && <span className="ml-1 text-[var(--accent)]">({jobs.length} fotos)</span>}
                </button>

                {jobs.length === 0 && (
                  <p className="mt-2 text-center text-xs text-gray-600">Sube al menos una imagen para continuar</p>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  PIPELINE PHASE                                                   */
  /* ================================================================ */
  return (
    <div className="flex min-h-screen flex-col bg-surface text-heading overflow-x-hidden">
      {/* Top bar — design tokens (oro brand en vez de violet random) */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--border-default)] bg-[rgba(12,12,14,0.85)] px-4 md:px-6 py-3 backdrop-blur">
        <button
          onClick={() => { if (!isRunning) setPhase("setup"); }}
          className={cn(
            "flex items-center gap-2 text-sm font-medium transition-default",
            isRunning ? "cursor-not-allowed text-disabled" : "text-muted hover:text-[var(--accent)]",
          )}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Configuración</span>
        </button>
        <span className="text-[var(--border-default)]">/</span>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--accent-muted)] text-[var(--bg-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0 truncate">
            <span className="font-serif text-[15px] font-semibold text-white">Lencería <span className="text-[var(--accent)]">Studio</span></span>
            {referenceNumber ? <span className="ml-2 text-xs text-gray-500">Ref. {referenceNumber}</span> : null}
          </span>
          {/* Sello de build: muestra el commit que está VIVO en este deploy. Si no
              coincide con el último push, estás viendo un build viejo (cache/deploy). */}
          <span
            className="ml-2 shrink-0 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-gray-500"
            title="Versión del build que está sirviendo Vercel ahora mismo"
          >
            build {process.env.NEXT_PUBLIC_BUILD_SHA ?? "dev"}
          </span>
        </div>

        {/* Overall progress */}
        <div className="ml-auto flex items-center gap-4">
          {isRunning && (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />
              <span className="text-sm text-gray-400">
                Procesando {activeJobIndex + 1} de {jobs.length}…
              </span>
            </div>
          )}
          {!isRunning && completedCount > 0 && (
            <span className="text-sm text-emerald-400 font-medium">
              ✓ {completedCount} de {jobs.length} completadas
            </span>
          )}
          {!isRunning && completedCount === jobs.length && jobs.length > 0 && (
            <button
              onClick={downloadAll}
              className="flex items-center gap-2 rounded-lg bg-emerald-600/20 border border-emerald-500/30 px-4 py-2 text-sm font-semibold text-emerald-400 transition-colors hover:bg-emerald-600/30"
            >
              <Download className="h-4 w-4" />
              Descargar todo
            </button>
          )}
          {totalCostAll > 0 && (
            <span className="text-xs text-gray-500">
              Gastado: <span className="font-semibold text-gray-300">${totalCostAll.toFixed(3)}</span>
            </span>
          )}
        </div>
      </header>

      {/* Batch progress — visible arriba cuando hay 2+ jobs, muestra cuántos
          van completados, cuántos en cola, y el gasto acumulado del batch. */}
      {jobs.length > 1 && (
        <div className="border-b border-white/8 bg-white/[0.02] px-4 py-2">
          {(() => {
            const done = jobs.filter((j) => j.status === "done").length;
            const active = jobs.filter((j) => j.status === "active").length;
            const errors = jobs.filter((j) => j.status === "error").length;
            const pending = jobs.length - done - active - errors;
            const totalSpent = jobs.reduce((sum, j) => sum + j.totalCost, 0);
            const pct = Math.round((done / jobs.length) * 100);
            return (
              <div className="mx-auto flex max-w-4xl items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={cn(
                      "h-full transition-all duration-500",
                      done === jobs.length ? "bg-emerald-500" : "bg-[var(--accent)]",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-400 whitespace-nowrap">
                  {done > 0 && <span className="text-emerald-400">{done} listo{done > 1 ? 's' : ''}</span>}
                  {active > 0 && <span className="text-[var(--accent)]">{active} procesando</span>}
                  {errors > 0 && <span className="text-red-400">{errors} error{errors > 1 ? 'es' : ''}</span>}
                  {pending > 0 && <span>{pending} en cola</span>}
                  <span className="text-gray-500">·</span>
                  <span className="font-medium text-white">${totalSpent.toFixed(2)}</span>
                  {isRunning && (
                    <button
                      type="button"
                      onClick={stopBatch}
                      className="ml-1 flex items-center gap-1 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-300 hover:bg-red-500/20"
                    >
                      <StopCircle className="h-3 w-3" />
                      Parar todo
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — image list */}
        <aside className="hidden w-52 shrink-0 overflow-y-auto border-r border-white/8 p-3 lg:block">
          <p className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            Imágenes ({jobs.length})
          </p>
          <div className="space-y-1.5">
            {jobs.map((job, idx) => (
              <button
                key={job.id}
                onClick={() => setActiveJobIndex(idx)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-all",
                  idx === activeJobIndex
                    ? "border border-[var(--accent)]/30 bg-[var(--accent)]/10"
                    : "border border-transparent hover:bg-white/[0.03]",
                )}
              >
                <div className="relative shrink-0">
                  <img
                    src={job.previewUrl}
                    alt={job.filename}
                    className="h-10 w-10 rounded-md object-cover"
                  />
                  {job.status === "done" && (
                    <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500">
                      <Check className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                  {job.status === "active" && (
                    <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent)]">
                      <Loader2 className="h-2.5 w-2.5 animate-spin text-white" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium text-white">{job.filename}</p>
                  <p className="text-[10px] text-gray-500">
                    {job.status === "done"
                      ? `$${job.totalCost.toFixed(3)}`
                      : job.status === "active"
                      ? "Procesando…"
                      : "En cola"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Main content — step cards */}
        <main className="flex-1 overflow-y-auto p-6">
          {activeJob && (
            <div className="mx-auto max-w-3xl space-y-4">
              {/* Image header */}
              <div className="mb-6 flex items-center gap-4">
                <img
                  src={activeJob.previewUrl}
                  alt={activeJob.filename}
                  className="h-14 w-14 rounded-lg border border-white/10 object-cover"
                />
                <div>
                  <h2 className="text-base font-bold text-white">{activeJob.filename}</h2>
                  <p className="text-sm text-gray-400">
                    {activeJob.status === "done"
                      ? `Completado · costo: $${activeJob.totalCost.toFixed(3)}`
                      : activeJob.status === "active"
                      ? "Procesando…"
                      : "En cola"}
                  </p>
                  {/* Live cost progress: gastado vs estimado, en tiempo real. */}
                  {(() => {
                    const done = activeJob.steps.filter((s) => s.status === "done" || s.status === "accepted" || s.status === "skipped").length;
                    const total = activeJob.steps.filter((s) => s.enabled).length;
                    if (total === 0) return null;
                    const estimated = activeJob.steps
                      .filter((s) => s.enabled)
                      .reduce((sum, s) => {
                        // Parsear "$0.02" o "$0.01-$0.04" → tomar el primer número
                        const m = (s.cost ?? "").match(/\$(\d+\.?\d*)/);
                        return sum + (m ? parseFloat(m[1]) : 0);
                      }, 0);
                    const spent = activeJob.totalCost;
                    const pct = Math.min(100, Math.round((done / total) * 100));
                    void pct;
                    return (
                      <div className="mt-2 flex items-center gap-2.5">
                        <div className="flex items-center gap-1">
                          {activeJob.steps.filter((s) => s.enabled).map((s) => (
                            <span
                              key={s.id}
                              title={s.label}
                              className={cn(
                                "h-1.5 w-5 rounded-full transition-colors",
                                s.status === "done" || s.status === "accepted"
                                  ? "bg-emerald-500"
                                  : s.status === "processing"
                                  ? "bg-[var(--accent)]"
                                  : s.status === "error"
                                  ? "bg-red-500"
                                  : s.status === "skipped"
                                  ? "bg-white/15"
                                  : "bg-white/10",
                              )}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] tabular-nums text-gray-500">
                          {done}/{total} · ${spent.toFixed(3)} / ~${estimated.toFixed(2)}
                        </span>
                      </div>
                    );
                  })()}
                </div>
                {/* Mobile: image navigation */}
                <div className="ml-auto flex items-center gap-2 lg:hidden">
                  <button
                    onClick={() => setActiveJobIndex((i) => Math.max(0, i - 1))}
                    disabled={activeJobIndex === 0}
                    className="rounded-lg border border-white/10 p-1.5 text-gray-400 disabled:opacity-30 hover:text-white"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs text-gray-500">{activeJobIndex + 1} / {jobs.length}</span>
                  <button
                    onClick={() => setActiveJobIndex((i) => Math.min(jobs.length - 1, i + 1))}
                    disabled={activeJobIndex === jobs.length - 1}
                    className="rounded-lg border border-white/10 p-1.5 text-gray-400 disabled:opacity-30 hover:text-white"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Ficha técnica del producto — leída por Claude Vision antes
                  del primer step. Editable; los valores se guardan en el job
                  (iteraciones siguientes los inyectan en los prompts). */}
              <ProductSpecPanel
                status={activeJob.analysisStatus}
                spec={activeJob.productSpec}
                error={activeJob.analysisError}
                onChange={(updated) => {
                  setJobs((prev) => prev.map((j) =>
                    j.id === activeJob.id ? { ...j, productSpec: updated } : j,
                  ));
                }}
                onReanalyze={async () => {
                  if (!activeJob.file) {
                    toast.error("No hay archivo cargado para analizar.");
                    return;
                  }
                  const fileToAnalyze: File = activeJob.file;
                  setJobs((prev) => prev.map((j) =>
                    j.id === activeJob.id
                      ? { ...j, analysisStatus: "analyzing", analysisError: undefined }
                      : j,
                  ));
                  try {
                    const spec = await analyzeProductPhotos(
                      [{ file: fileToAnalyze, role: "frontal" }],
                      productType,
                    );
                    setJobs((prev) => prev.map((j) =>
                      j.id === activeJob.id
                        ? { ...j, productSpec: spec, analysisStatus: "done", analysisError: undefined }
                        : j,
                    ));
                  } catch (err) {
                    const msg = err instanceof Error ? err.message : "Análisis falló";
                    setJobs((prev) => prev.map((j) =>
                      j.id === activeJob.id
                        ? { ...j, productSpec: null, analysisStatus: "error", analysisError: msg }
                        : j,
                    ));
                  }
                }}
              />

              {/* Step cards.
                  MERGE Paso 2 + 3: ocultamos la tarjeta de "Crear Modelo IA"
                  (sigue ejecutándose por dentro, solo no se muestra suelta). La
                  Foto Frontal es la tarjeta unida: su panel Original muestra la
                  modelo nueva (step.originalUrl) y Resultado la modelo con el bra.
                  Pedido repetido de la usuaria desde las 10am. */}
              {activeJob.steps.filter((s) => s.enabled && s.id !== "model").map((step, idx, arr) => {
                const prevStep = arr[idx - 1];
                const isActive = step.status === "processing" || (step.status === "done" && !autoMode);
                return (
                  <StepCard
                    key={step.id}
                    step={step}
                    stepNumber={idx + 1}
                    isActive={isActive}
                    previousResultUrl={prevStep?.resultUrl || activeJob.uploadedUrl || activeJob.previewUrl}
                    onAccept={() => dispatchAction(activeJob.id, step.id, "accept")}
                    onSkip={() => dispatchAction(activeJob.id, step.id, "skip")}
                    onRerun={() => dispatchAction(activeJob.id, step.id, "rerun")}
                    onStop={() => stopStep(activeJob.id, step.id)}
                    onSelectCandidate={(url) => updateStep(activeJob.id, step.id, { resultUrl: url })}
                    onChangeProvider={(provider) => updateStep(activeJob.id, step.id, { providerOverride: provider })}
                    onChangePose={(pose) => updateStep(activeJob.id, step.id, { poseOverride: pose })}
                    onChangeAction={(action) => updateStep(activeJob.id, step.id, { actionOverride: action })}
                    autoMode={autoMode}
                  />
                );
              })}

              {/* Completion summary */}
              {activeJob.status === "done" && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                    <div>
                      <p className="font-semibold text-white">Imagen procesada</p>
                      <p className="text-sm text-gray-400">
                        Costo total: <span className="font-medium text-emerald-400">${activeJob.totalCost.toFixed(3)}</span>
                      </p>
                    </div>
                    <div className="ml-auto flex flex-wrap gap-2">
                      {/* Descargar todos los resultados del job como ZIP (batch download) */}
                      <button
                        type="button"
                        onClick={async () => {
                          const results = activeJob.steps
                            .filter((s) => s.status === "done" || s.status === "accepted")
                            .filter((s) => s.resultUrl && !s.resultUrl.startsWith("/api/proxy-image?url=data:"));
                          if (results.length === 0) {
                            toast.info("No hay resultados para descargar todavía.");
                            return;
                          }
                          toast.info(`Descargando ${results.length} archivos…`);
                          // downloadAsset hace fetch→Blob→download con detección
                          // de URLs caducadas (toast claro si el upstream ya
                          // expiró). Delay de 200ms entre cada uno para que el
                          // browser no los ahogue.
                          for (let i = 0; i < results.length; i++) {
                            const s = results[i];
                            if (!s.resultUrl) continue;
                            const isVideo = s.resultUrl.includes(".mp4") || s.resultUrl.includes(".webm") || s.resultUrl.includes("video");
                            const ext = isVideo ? "mp4" : "jpg";
                            const filename = `unistudio-${activeJob.referenceKey ?? activeJob.id.slice(0, 6)}-${s.id}.${ext}`;
                            await downloadAsset(s.resultUrl, filename);
                            if (i < results.length - 1) await new Promise((r) => setTimeout(r, 200));
                          }
                        }}
                        className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-[var(--bg-primary)] shadow-md hover:brightness-105"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Descargar todos
                      </button>
                      {activeJobIndex < jobs.length - 1 && (
                        <button
                          onClick={() => setActiveJobIndex(activeJobIndex + 1)}
                          className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-gray-300 hover:border-white/20 hover:text-white"
                        >
                          Siguiente imagen
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Keyboard shortcuts help dialog */}
      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="mx-4 w-full max-w-md rounded-xl border border-white/15 bg-[#1a1a1a] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Atajos de teclado</h3>
              <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2 text-sm">
              {[
                ["Ctrl + Z", "Deshacer (undo)"],
                ["Ctrl + Shift + Z", "Rehacer (redo)"],
                ["Ctrl + Y", "Rehacer (alternativo)"],
                ["?  o  /", "Abrir/cerrar esta ayuda"],
                ["Esc", "Cerrar modal / lightbox"],
                ["← →", "Navegar entre variantes (lightbox)"],
                ["C", "Comparar con original (lightbox)"],
              ].map(([keys, desc]) => (
                <div key={keys} className="flex items-center justify-between gap-3 border-b border-white/5 py-1.5">
                  <span className="text-gray-300">{desc}</span>
                  <kbd className="whitespace-nowrap rounded border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-xs text-gray-400">{keys}</kbd>
                </div>
              ))}
            </div>
            <p className="mt-4 text-center text-[11px] text-gray-600">
              Los atajos no funcionan cuando estás escribiendo en un campo de texto.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
