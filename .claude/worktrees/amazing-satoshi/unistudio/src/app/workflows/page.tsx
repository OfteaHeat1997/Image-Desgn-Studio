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
  Megaphone,
  ArrowLeft,
  ArrowRight,
  ArrowDown,
  ChevronDown,
  ChevronRight,
  Zap,
  Bot,
  Globe,
  Database,
  FileCode,
  Code,
  DollarSign,
  Clock,
  ShoppingBag,
  Camera,
  Play,
  Eye,
  Server,
  Cpu,
  Package,
  FolderOpen,
} from "lucide-react";

// =============================================================================
// Your Unistyles Inventory (from INVENTORY.md)
// =============================================================================

const INVENTORY = {
  total: 486,
  onWebsite: 148,
  missing: 338,
  categories: [
    { name: "Brassieres", slug: "bras", count: 77, onSite: 20, brand: "Leonisa", price: 35, emoji: "👙", color: "#FF6B9D" },
    { name: "Panties", slug: "panties", count: 72, onSite: 20, brand: "Leonisa", price: 19, emoji: "🩲", color: "#E879F9" },
    { name: "Shapewear", slug: "shapewear", count: 15, onSite: 15, brand: "Leonisa", price: "45-95", emoji: "✨", color: "#C5A47E" },
    { name: "Perfumes", slug: "perfume", count: 146, onSite: 22, brand: "Esika/Cyzone/Yanbal/L'Bel", price: 19, emoji: "🧴", color: "#5B9CF6" },
    { name: "Cremas", slug: "cremas", count: 49, onSite: 12, brand: "Yanbal/Esika/L'Bel", price: 19, emoji: "🧴", color: "#50C878" },
    { name: "Bloqueador", slug: "bloqueador", count: 11, onSite: 12, brand: "Yanbal/Esika/L'Bel", price: 19, emoji: "☀️", color: "#F5A623" },
    { name: "Desodorantes", slug: "desodorantes", count: 28, onSite: 24, brand: "Yanbal/Esika", price: 19, emoji: "🧊", color: "#5B9CF6" },
    { name: "Limpieza Facial", slug: "limpieza", count: 6, onSite: 9, brand: "Esika/L'Bel", price: 19, emoji: "💧", color: "#50C878" },
    { name: "Joyeria", slug: "joyeria", count: 82, onSite: 14, brand: "Sin marca", price: 19, emoji: "💍", color: "#C5A47E" },
  ],
};

// =============================================================================
// Every Feature / Module — Full Detail
// =============================================================================

interface FeatureDetail {
  id: string;
  name: string;
  nameEn: string;
  icon: React.ElementType;
  color: string;
  category: "fondos" | "mejora" | "edicion" | "modelos" | "contenido" | "auto";
  // What it does
  whatItDoes: string;
  // Step by step flow
  flow: string[];
  // Files involved
  files: { label: string; path: string; purpose: string }[];
  // API providers
  providers: { name: string; cost: string; quality: string }[];
  // What products use this
  usedBy: string[];
  // Real output image (if available)
  outputImage?: string;
  // Link to use it
  editorLink: string;
  // Video demo
  videoUrl?: string;
}

const FEATURES: FeatureDetail[] = [
  // ── 1. BG REMOVE ──
  {
    id: "bg-remove",
    name: "Quitar Fondo",
    nameEn: "Background Removal",
    icon: Scissors,
    color: "#50C878",
    category: "fondos",
    whatItDoes: "Toma tu foto de producto con cualquier fondo (mesa, piso, pared) y elimina todo lo que no es el producto. Te deja un PNG transparente listo para poner en cualquier fondo nuevo.",
    flow: [
      "Subes tu foto de producto (JPG/PNG desde celular)",
      "Eliges provider: Browser WASM (gratis) o API (withoutBG/Replicate)",
      "La IA detecta el producto y separa del fondo",
      "Resultado: PNG con fondo transparente",
      "Opcion: poner fondo de color solido o blur",
    ],
    files: [
      { label: "Panel UI", path: "src/components/modules/BgRemovePanel.tsx", purpose: "Controles: elegir provider, tipo salida, color picker" },
      { label: "API Route", path: "src/app/api/bg-remove/route.ts", purpose: "Recibe imagen, llama al provider elegido, devuelve resultado" },
      { label: "Procesamiento", path: "src/lib/processing/bg-remove.ts", purpose: "Router entre providers (withoutBG, Replicate RMBG)" },
      { label: "Browser WASM", path: "src/lib/processing/bg-remove-browser.ts", purpose: "BG removal GRATIS en el navegador con @imgly/background-removal" },
      { label: "API Client", path: "src/lib/api/withoutbg.ts", purpose: "Conexion con withoutBG API (0.05 EUR/imagen)" },
    ],
    providers: [
      { name: "@imgly WASM (Browser)", cost: "GRATIS", quality: "4/5" },
      { name: "withoutBG API", cost: "€0.05/img", quality: "5/5" },
      { name: "Replicate RMBG-2.0", cost: "$0.01/img", quality: "5/5" },
      { name: "remove.bg HD", cost: "$0.20/img", quality: "5/5" },
    ],
    usedBy: ["TODOS los 486 productos — es el primer paso de todo"],
    outputImage: "/showcase/bg-remove-cream.png",
    editorLink: "/editor?module=bg-remove",
    videoUrl: "/videos/bg-remove.mp4",
  },
  // ── 2. BG GENERATE ──
  {
    id: "bg-generate",
    name: "Fondos con IA",
    nameEn: "AI Background Generation",
    icon: ImageIcon,
    color: "#5B9CF6",
    category: "fondos",
    whatItDoes: "Despues de quitar el fondo, pon tu producto en CUALQUIER escenario: mesa de marmol, playa, estudio de lujo, jardin. La IA genera el fondo y tu producto se ve como foto profesional de catalogo.",
    flow: [
      "Necesitas: foto con fondo transparente (usa Quitar Fondo primero)",
      "Eliges modo: PRECISO (producto exacto + fondo nuevo) o CREATIVO (IA re-imagina todo)",
      "Eliges estilo: 20+ presets (studio, lifestyle, nature, luxury, beauty, seasonal)",
      "O escribes tu propio prompt describiendo el fondo que quieres",
      "La IA genera el fondo y coloca tu producto encima",
      "Resultado: foto profesional con fondo de estudio/lifestyle",
    ],
    files: [
      { label: "Panel UI", path: "src/components/modules/BgGeneratePanel.tsx", purpose: "Modo preciso/creativo, presets de estilo, prompt custom, previews" },
      { label: "API Route", path: "src/app/api/bg-generate/route.ts", purpose: "Recibe imagen + style, llama Flux model, devuelve resultado" },
      { label: "Procesamiento", path: "src/lib/processing/bg-generate.ts", purpose: "Flux Schnell (rapido), Flux Dev (calidad), Flux Kontext (preciso) + compositing Sharp" },
      { label: "API Client", path: "src/lib/api/replicate.ts", purpose: "Conexion con Replicate (Flux models)" },
      { label: "Prompts", path: "src/lib/utils/prompts.ts", purpose: "20+ prompts optimizados por estilo de fondo" },
    ],
    providers: [
      { name: "Flux Schnell", cost: "$0.003/img", quality: "3/5 (rapido)" },
      { name: "Flux Dev", cost: "$0.03/img", quality: "4/5" },
      { name: "Flux Kontext Pro", cost: "$0.055/img", quality: "5/5 (preciso)" },
    ],
    usedBy: ["Perfumes (146) — studio marble/luxury", "Cremas (49) — beauty spa/vanity", "Joyeria (82) — luxury velvet/gold"],
    outputImage: "/showcase/bg-generate-cream.png",
    editorLink: "/editor?module=bg-generate",
    videoUrl: "/videos/bg-generate.mp4",
  },
  // ── 3. ENHANCE ──
  {
    id: "enhance",
    name: "Mejorar Calidad",
    nameEn: "Image Enhancement",
    icon: Sparkles,
    color: "#50C878",
    category: "mejora",
    whatItDoes: "Ajusta brillo, contraste, saturacion, nitidez y color de tu foto. Si tu foto de celular salio oscura, amarillenta o borrosa, esto lo corrige. 100% GRATIS, se procesa con Sharp en el servidor.",
    flow: [
      "Subes tu foto (cualquier formato)",
      "Eliges preset: ecommerce, fashion, beauty, luxury, natural, etc. (o ajustas manual)",
      "Sharp procesa: white balance, brightness, contrast, saturation, sharpness",
      "Preview instantaneo — ajusta sliders en tiempo real",
      "Resultado: foto mejorada sin costo de API",
    ],
    files: [
      { label: "Panel UI", path: "src/components/modules/EnhancePanel.tsx", purpose: "Sliders de brillo/contraste/saturacion/nitidez + presets" },
      { label: "API Route", path: "src/app/api/enhance/route.ts", purpose: "Recibe imagen + parametros, procesa con Sharp, devuelve resultado" },
      { label: "Procesamiento", path: "src/lib/processing/enhance.ts", purpose: "Sharp: recomb (white balance), linear (brightness/contrast), modulate (saturation), unsharp mask (sharpness)" },
      { label: "Sharp Utils", path: "src/lib/processing/sharp-utils.ts", purpose: "Resize, format convert, compress — utilidades de Sharp" },
    ],
    providers: [
      { name: "Sharp (servidor)", cost: "GRATIS", quality: "4/5" },
    ],
    usedBy: ["TODOS — mejora gratis despues de cualquier procesamiento"],
    editorLink: "/editor?module=enhance",
    videoUrl: "/videos/enhance.mp4",
  },
  // ── 4. SHADOWS ──
  {
    id: "shadows",
    name: "Sombras e Iluminacion",
    nameEn: "AI Shadows & Lighting",
    icon: Sun,
    color: "#F5A623",
    category: "mejora",
    whatItDoes: "Agrega sombras profesionales (drop shadow, contact, reflection) o cambia toda la iluminacion con IA. Esto transforma una foto plana en una foto de catalogo con profundidad y realismo.",
    flow: [
      "Subes foto con fondo transparente (funciona mejor asi)",
      "Eliges tipo: Drop Shadow (gratis), Contact Shadow (gratis), Reflection (gratis)",
      "O eliges IA: IC-Light relight ($0.02) o Flux Kontext ($0.055)",
      "Configuras: opacidad, blur, offset, color de sombra",
      "Resultado: producto con sombra/iluminacion profesional",
    ],
    files: [
      { label: "Panel UI", path: "src/components/modules/ShadowsPanel.tsx", purpose: "Tipo de sombra, sliders, presets de iluminacion" },
      { label: "API Route", path: "src/app/api/shadows/route.ts", purpose: "Dos paths: programatico (Sharp) o IA (Replicate IC-Light)" },
      { label: "Procesamiento", path: "src/lib/processing/shadows.ts", purpose: "Drop/Contact/Reflection con Sharp + IC-Light para relight IA" },
      { label: "Guia visual", path: "src/components/editor/ShadowsGuidePanel.tsx", purpose: "Explica visualmente cada tipo de sombra" },
    ],
    providers: [
      { name: "Sharp programatico", cost: "GRATIS", quality: "3/5 (basico)" },
      { name: "IC-Light (Replicate)", cost: "$0.02/img", quality: "4/5" },
      { name: "Flux Kontext Pro", cost: "$0.055/img", quality: "5/5" },
    ],
    usedBy: ["Perfumes — reflection shadow", "Lenceria — contact shadow", "Joyeria — spotlight"],
    outputImage: "/showcase/shadows-serum.png",
    editorLink: "/editor?module=shadows",
    videoUrl: "/videos/shadows.mp4",
  },
  // ── 5. INPAINT ──
  {
    id: "inpaint",
    name: "Borrar y Reemplazar",
    nameEn: "Inpainting & Object Editing",
    icon: Eraser,
    color: "#E879F9",
    category: "edicion",
    whatItDoes: "Describe que quieres cambiar y la IA lo hace: quitar etiquetas, borrar arrugas, cambiar color de tela, quitar manchas. No necesitas mascara — solo describe el cambio con texto.",
    flow: [
      "Subes tu foto de producto",
      "Escribes que quieres cambiar: 'quitar la etiqueta', 'cambiar color a rojo'",
      "O usas preset: remove-tag, remove-wrinkles, fix-stain, change-color",
      "Flux Fill Pro (con mascara) o Flux Kontext (sin mascara, solo texto)",
      "Resultado: producto editado limpiamente",
    ],
    files: [
      { label: "Panel UI", path: "src/components/modules/InpaintPanel.tsx", purpose: "Prompt de edicion, presets, brush para mascara" },
      { label: "API Route", path: "src/app/api/inpaint/route.ts", purpose: "Recibe imagen + prompt/mascara, llama Flux model" },
      { label: "Procesamiento", path: "src/lib/processing/inpaint.ts", purpose: "Flux Fill Pro/Dev (mascara) o Flux Kontext (texto)" },
    ],
    providers: [
      { name: "Flux Fill Dev", cost: "$0.003/img", quality: "4/5 (budget)" },
      { name: "Flux Fill Pro", cost: "$0.03/img", quality: "5/5" },
      { name: "Flux Kontext Pro", cost: "$0.055/img", quality: "5/5 (sin mascara)" },
    ],
    usedBy: ["Lenceria — quitar etiquetas, arrugas", "Perfumes — quitar reflejos"],
    editorLink: "/editor?module=inpaint",
  },
  // ── 6. OUTPAINT ──
  {
    id: "outpaint",
    name: "Extender Imagen",
    nameEn: "Outpainting / Canvas Extension",
    icon: Expand,
    color: "#E879F9",
    category: "edicion",
    whatItDoes: "Tu foto es cuadrada pero necesitas vertical para Stories? La IA extiende los bordes naturalmente. Presets listos para cada plataforma: Amazon 1:1, Instagram 4:5, TikTok 9:16, Pinterest 2:3.",
    flow: [
      "Subes tu foto ya editada con el fondo que quieres",
      "Eliges plataforma destino: Amazon, IG Feed, IG Story, TikTok, Pinterest, etc.",
      "O defines custom: direccion (arriba/abajo/izquierda/derecha) + padding",
      "Flux Kontext extiende la imagen naturalmente",
      "Resultado: imagen en el formato correcto para publicar",
    ],
    files: [
      { label: "Panel UI", path: "src/components/modules/OutpaintPanel.tsx", purpose: "Presets por plataforma, direccion, custom ratio" },
      { label: "API Route", path: "src/app/api/outpaint/route.ts", purpose: "Recibe imagen + target ratio, llama Flux Kontext" },
      { label: "Procesamiento", path: "src/lib/processing/outpaint.ts", purpose: "Outpaint con Flux Kontext + platform presets" },
      { label: "Compliance", path: "src/lib/brand/compliance.ts", purpose: "Requisitos de dimension por marketplace" },
    ],
    providers: [
      { name: "Flux Kontext Pro", cost: "$0.055/img", quality: "5/5" },
      { name: "Flux Fill Dev", cost: "$0.005/img", quality: "4/5 (budget)" },
    ],
    usedBy: ["TODOS — adaptar formato para cada marketplace/red social"],
    outputImage: "/showcase/outpaint-result.png",
    editorLink: "/editor?module=outpaint",
    videoUrl: "/videos/outpaint.mp4",
  },
  // ── 7. TRY-ON ──
  {
    id: "tryon",
    name: "Prueba Virtual",
    nameEn: "Virtual Try-On",
    icon: Shirt,
    color: "#C5A47E",
    category: "modelos",
    whatItDoes: "Toma la foto de tu prenda (flat-lay o maniqui) + un modelo IA y genera una imagen del modelo VISTIENDO tu prenda. Para lenceria usa IDM-VTON (FASHN no soporta lingerie).",
    flow: [
      "Necesitas: 1) foto de prenda sin fondo, 2) foto de modelo (creada con Crear Modelo)",
      "Smart Router decide: lenceria/swimwear → IDM-VTON, otro → FASHN",
      "FASHN: POST a api.fashn.ai con garment_image + model_image + categoria",
      "IDM-VTON: Replicate cuuupid/idm-vton con garm_img + human_img",
      "Poll cada 2 seg hasta completado",
      "Resultado: modelo vistiendo tu prenda",
    ],
    files: [
      { label: "Panel UI", path: "src/components/modules/TryOnPanel.tsx", purpose: "Upload prenda + modelo, seleccion provider, categoria" },
      { label: "Guia", path: "src/components/editor/TryOnGuidePanel.tsx", purpose: "Guia paso a paso para try-on correcto" },
      { label: "API Route", path: "src/app/api/tryon/route.ts", purpose: "Recibe garment + model, smart router, devuelve resultado" },
      { label: "Procesamiento", path: "src/lib/processing/tryon.ts", purpose: "Smart router: lingerie→IDM-VTON, otro→FASHN. Fallback automatico" },
      { label: "FASHN Client", path: "src/lib/api/fashn.ts", purpose: "POST a api.fashn.ai/v1/run + poll /v1/status/{id}" },
    ],
    providers: [
      { name: "FASHN v1.6", cost: "$0.075/img", quality: "5/5 (NO lingerie)" },
      { name: "IDM-VTON (Replicate)", cost: "$0.02/img", quality: "4/5 (SI lingerie)" },
      { name: "Kolors VTO (Replicate)", cost: "$0.015/img", quality: "3/5" },
    ],
    usedBy: ["Brassieres (77) — IDM-VTON (lingerie)", "Panties (72) — IDM-VTON", "Shapewear (15) — IDM-VTON"],
    editorLink: "/editor?module=tryon",
    videoUrl: "/videos/tryon.mp4",
  },
  // ── 8. MODEL CREATE ──
  {
    id: "model-create",
    name: "Crear Modelo IA",
    nameEn: "AI Model Creation",
    icon: User,
    color: "#C5A47E",
    category: "modelos",
    whatItDoes: "No tienes modelo? Genera uno con IA. Elige genero, edad, tono de piel, tipo de cuerpo, pose y expresion. El modelo generado se puede reutilizar para vestir con Try-On o Joyeria Virtual.",
    flow: [
      "Configuras: genero, rango de edad, tono de piel, tipo cuerpo, pose, expresion",
      "buildModelPrompt() construye un prompt detallado para FASHN",
      "FASHN Model Create genera imagen de modelo",
      "Resultado se guarda en galeria de modelos para reutilizar",
      "Puedes usar Face to Model (tu selfie → modelo completo)",
    ],
    files: [
      { label: "Panel UI", path: "src/components/modules/ModelCreatePanel.tsx", purpose: "Formulario: genero, edad, piel, cuerpo, pose, expresion" },
      { label: "API Route", path: "src/app/api/model-create/route.ts", purpose: "Construye prompt, llama FASHN Model Create" },
      { label: "Procesamiento", path: "src/lib/processing/model-create.ts", purpose: "buildModelPrompt + FASHN API call + variaciones" },
      { label: "AI Models DB", path: "src/app/api/ai-models/route.ts", purpose: "Guardar/cargar modelos creados en DB" },
    ],
    providers: [
      { name: "FASHN Model Create", cost: "$0.075/modelo", quality: "5/5" },
      { name: "FASHN Face to Model", cost: "$0.075", quality: "5/5" },
      { name: "FASHN Model Variation", cost: "$0.05", quality: "4/5" },
    ],
    usedBy: ["Lenceria — modelos femeninos diversos", "Joyeria — modelos para aretes/collares"],
    outputImage: "/showcase/model-create-result.png",
    editorLink: "/editor?module=model-create",
    videoUrl: "/videos/model-create.mp4",
  },
  // ── 9. GHOST MANNEQUIN ──
  {
    id: "ghost-mannequin",
    name: "Maniqui Invisible",
    nameEn: "Ghost Mannequin",
    icon: Box,
    color: "#C5A47E",
    category: "modelos",
    whatItDoes: "Si fotografiaste tu prenda sobre un maniqui fisico, esta herramienta elimina el maniqui y deja la prenda 'flotando' con volumen 3D. Efecto profesional que usan grandes marcas.",
    flow: [
      "Subes foto de prenda SOBRE maniqui fisico",
      "Flux Kontext inpainting: 'Remove the mannequin body completely'",
      "La IA rellena el interior de la prenda naturalmente",
      "Resultado: prenda flotando con forma 3D, sin maniqui",
    ],
    files: [
      { label: "Panel UI", path: "src/components/modules/GhostMannequinPanel.tsx", purpose: "Controles de ghost mannequin" },
      { label: "API Route", path: "src/app/api/ghost-mannequin/route.ts", purpose: "Recibe imagen, llama Flux Kontext para inpaint" },
      { label: "Procesamiento", path: "src/lib/processing/ghost-mannequin.ts", purpose: "Flux Kontext con prompt especifico para maniqui" },
    ],
    providers: [
      { name: "Flux Kontext Pro", cost: "$0.055/img", quality: "5/5" },
    ],
    usedBy: ["Brassieres fotografiados en maniqui", "Shapewear en maniqui"],
    editorLink: "/editor?module=ghost-mannequin",
    videoUrl: "/videos/ghost-mannequin.mp4",
  },
  // ── 10. JEWELRY TRY-ON ──
  {
    id: "jewelry-tryon",
    name: "Joyeria Virtual",
    nameEn: "Jewelry & Accessories Try-On",
    icon: Gem,
    color: "#E879F9",
    category: "modelos",
    whatItDoes: "Prueba virtual de aretes, collares, anillos, pulseras, lentes y relojes. La IA coloca tu accesorio en un modelo con iluminacion y perspectiva realista.",
    flow: [
      "Necesitas: 1) foto del accesorio sin fondo, 2) foto de modelo con rostro visible",
      "Seleccionas tipo: earrings, necklace, ring, bracelet, sunglasses, watch",
      "Flux Kontext usa prompt especializado por tipo de accesorio",
      "La IA posiciona el accesorio correctamente (orejas, cuello, dedo, etc)",
      "Resultado: modelo usando tu joya con reflejo metalico realista",
    ],
    files: [
      { label: "Panel UI", path: "src/components/modules/JewelryTryOnPanel.tsx", purpose: "Tipo accesorio, upload joya + modelo" },
      { label: "API Route", path: "src/app/api/jewelry-tryon/route.ts", purpose: "Recibe imagen + tipo + modelo, llama Flux Kontext" },
      { label: "Procesamiento", path: "src/lib/processing/jewelry.ts", purpose: "Prompts especializados por tipo de joya + Flux Kontext" },
    ],
    providers: [
      { name: "Flux Kontext Pro", cost: "$0.055/img", quality: "5/5" },
    ],
    usedBy: ["Aretes (~20)", "Cadenas (~15)", "Pulseras (~12)", "Topos (~15)", "Anillos (~5)", "Sets (~5)"],
    outputImage: "/showcase/jewelry-tryon-result.png",
    editorLink: "/editor?module=jewelry-tryon",
    videoUrl: "/videos/jewelry-tryon.mp4",
  },
  // ── 11. VIDEO STUDIO ──
  {
    id: "video",
    name: "Video Studio",
    nameEn: "Image-to-Video Generation",
    icon: Video,
    color: "#FF6B6B",
    category: "contenido",
    whatItDoes: "Convierte tu foto de producto en video animado para TikTok, Reels e historias. 3 modos: Producto (gira, zoom), Moda (model walk), Avatar (habla con lip sync + TTS).",
    flow: [
      "Subes foto de producto ya editada",
      "Eliges tab: Producto, Moda o Avatar",
      "Eliges provider: Ken Burns (GRATIS), Wan 2.2 ($0.05), Kling ($0.07+)",
      "Para Avatar: escribes texto → Edge TTS genera audio → lip sync con video",
      "Resultado: video MP4 listo para publicar",
    ],
    files: [
      { label: "Panel UI", path: "src/components/modules/VideoPanel.tsx", purpose: "3 tabs: ProductVideoTab, FashionVideoTab, AvatarVideoTab" },
      { label: "Product Tab", path: "src/components/modules/video/ProductVideoTab.tsx", purpose: "Video de producto: rotate, zoom, orbit" },
      { label: "Fashion Tab", path: "src/components/modules/video/FashionVideoTab.tsx", purpose: "Video moda: model walk, reveal" },
      { label: "Avatar Tab", path: "src/components/modules/video/AvatarVideoTab.tsx", purpose: "Avatar parlante: TTS + lip sync" },
      { label: "Providers", path: "src/lib/video/providers.ts", purpose: "Registry de 7 providers: Ken Burns, LTX, Wan 2.1/2.2, Kling, Minimax" },
      { label: "API Route", path: "src/app/api/video/route.ts", purpose: "Recibe imagen + provider + params, genera video" },
      { label: "TTS Route", path: "src/app/api/tts/route.ts", purpose: "Genera audio con Edge TTS (gratis)" },
      { label: "Avatar Route", path: "src/app/api/avatar/route.ts", purpose: "Wav2Lip/MuseTalk/SadTalker/LivePortrait" },
      { label: "Video Store", path: "src/stores/video-store.ts", purpose: "Estado Zustand del Video Studio" },
    ],
    providers: [
      { name: "Ken Burns (local)", cost: "GRATIS", quality: "2/5 (zoom/pan)" },
      { name: "LTX-Video", cost: "$0.04/5s", quality: "3/5" },
      { name: "Wan 2.2 Fast", cost: "$0.05/5s", quality: "4/5" },
      { name: "Kling 2.6", cost: "$0.07/s", quality: "5/5 (con audio)" },
    ],
    usedBy: ["Hero products para TikTok/Reels", "Perfumes con rotacion 360", "Lenceria con fashion walk"],
    editorLink: "/editor?module=video",
    videoUrl: "/videos/video.mp4",
  },
  // ── 12. AD CREATOR ──
  {
    id: "ad-creator",
    name: "Crear Anuncios",
    nameEn: "Ad Creator",
    icon: Megaphone,
    color: "#FF6B6B",
    category: "contenido",
    whatItDoes: "Genera video publicitario listo para publicar. Elige red social (IG Reel, TikTok, FB, YouTube Short, Pinterest), escribe titular y CTA. La IA genera el video con el formato correcto.",
    flow: [
      "Subes foto de producto ya editada",
      "Eliges template: IG Reel, TikTok, FB Ad, FB Marketplace, YT Short, IG Story, Pinterest",
      "Escribes headline y CTA",
      "Auto-prompt genera descripcion optimizada",
      "Video se genera con el aspect ratio y duracion correcta por plataforma",
    ],
    files: [
      { label: "Panel UI", path: "src/components/modules/AdCreatorPanel.tsx", purpose: "Templates por red social, headline/CTA, preview" },
      { label: "API Route", path: "src/app/api/ad-create/route.ts", purpose: "Recibe imagen + template + texto, genera video ad" },
      { label: "Composicion", path: "src/lib/processing/ad-compose.ts", purpose: "Composicion de anuncio: template + video + texto overlay" },
    ],
    providers: [
      { name: "Video provider elegido", cost: "$0.04-0.10", quality: "Depende del provider" },
    ],
    usedBy: ["Campanas de Instagram/TikTok para Unistyles"],
    editorLink: "/editor?module=ad-creator",
  },
  // ── 13. AI PROMPT ──
  {
    id: "ai-prompt",
    name: "Director Creativo IA",
    nameEn: "AI Prompt Assistant",
    icon: Wand2,
    color: "#C5A47E",
    category: "contenido",
    whatItDoes: "No sabes que estilo usar? Sube tu producto, dile a Claude para que plataforma es, y la IA te sugiere 4 conceptos profesionales de fotografia con prompts optimizados.",
    flow: [
      "Subes foto de producto",
      "Describes que tipo de contenido necesitas (e-commerce, social, lifestyle)",
      "Claude Haiku analiza tu producto y genera 4 conceptos",
      "Cada concepto incluye: prompt optimizado, estilo de iluminacion, composicion",
      "Seleccionas el que mas te gusta y se aplica automaticamente",
    ],
    files: [
      { label: "Panel UI", path: "src/components/modules/AiPromptPanel.tsx", purpose: "Input de producto + plataforma, muestra 4 conceptos" },
      { label: "API Route", path: "src/app/api/prompt/route.ts", purpose: "Envia a Claude Haiku, devuelve conceptos" },
      { label: "Prompts", path: "src/lib/utils/prompts.ts", purpose: "System prompts para Claude" },
    ],
    providers: [
      { name: "Claude Haiku", cost: "$0.001/call", quality: "5/5" },
    ],
    usedBy: ["Cuando no sabes que fondo/estilo usar para tu producto"],
    editorLink: "/editor?module=ai-prompt",
    videoUrl: "/videos/ai-prompt.mp4",
  },
  // ── 14. BATCH ──
  {
    id: "batch",
    name: "Procesamiento Masivo",
    nameEn: "Batch Processing",
    icon: Layers,
    color: "#F5A623",
    category: "auto",
    whatItDoes: "Cuando ya probaste tu flujo con 1 foto, aplicalo a 300+ fotos automaticamente. Define un pipeline (quitar fondo → mejorar → sombras) y batch lo aplica a todo tu catalogo.",
    flow: [
      "Subes multiples imagenes (drag & drop o seleccion multiple)",
      "Defines pipeline: secuencia de operaciones (bg-remove → enhance → shadow → resize)",
      "O usas preset: Quick Clean (gratis), Amazon Ready, Instagram Lifestyle, Full Production",
      "Batch procesa cada imagen por el pipeline completo",
      "Tracking en vivo: progreso, completadas, fallidas, costo acumulado",
      "Descarga ZIP con todos los resultados",
    ],
    files: [
      { label: "Pagina", path: "src/app/batch/page.tsx", purpose: "UI completa de batch processing" },
      { label: "API Route", path: "src/app/api/batch/route.ts", purpose: "Recibe imagenes[] + pipeline, ejecuta secuencialmente" },
      { label: "Panel", path: "src/components/modules/BatchProcessPanel.tsx", purpose: "Pipeline builder con presets y ejecucion" },
      { label: "Pagina", path: "src/app/batch/page.tsx", purpose: "Procesamiento masivo con inventario" },
    ],
    providers: [
      { name: "Depende del pipeline", cost: "Variable", quality: "Configurable" },
    ],
    usedBy: ["Catalogos completos: 300+ productos de una vez"],
    editorLink: "/batch",
    videoUrl: "/videos/batch.mp4",
  },
  // ── 15. AI AGENT ──
  {
    id: "ai-agent",
    name: "AI Agent Automatico",
    nameEn: "AI Agent Pipeline",
    icon: Bot,
    color: "#C5A47E",
    category: "auto",
    whatItDoes: "EL CEREBRO de UniStudio. 3 agentes (E-Commerce, Modelo, Social) que deciden automaticamente que pasos ejecutar. Sube tu foto → elige agente → la IA planifica → ejecuta todo automaticamente.",
    flow: [
      "Sube foto + elige agente (E-Commerce, Modelo o Social)",
      "Elige categoria de producto (lingerie, perfume, joyeria, etc)",
      "Elige presupuesto: Gratis, Economico o Premium",
      "/api/ai-agent/plan → Claude Haiku crea plan de pasos (o fallback a template local)",
      "useAgentPipeline ejecuta pasos secuencialmente via /api/* existentes",
      "Contexto fluye: currentUrl (imagen actual) + garmentUrl (de bg-remove) + modelUrl (de model-create)",
      "Resultado final con costo total y previews de cada paso",
    ],
    files: [
      { label: "Tipos", path: "src/types/agent.ts", purpose: "AgentType, PipelineStep, AgentPlan, StepExecution, BudgetTier" },
      { label: "Motor", path: "src/hooks/useAgentPipeline.ts", purpose: "EJECUTOR: orquesta /api/* routes, maneja contexto garmentUrl/modelUrl" },
      { label: "Panel Editor", path: "src/components/modules/AiAgentPanel.tsx", purpose: "4 fases en sidebar: Input → Plan → Execute → Results" },
      { label: "Chat Dashboard", path: "src/components/dashboard/AgentChat.tsx", purpose: "Interface chat del dashboard con 5 widgets" },
      { label: "Pagina Standalone", path: "src/app/agent/page.tsx", purpose: "Workflow de 5 pasos: elegir → subir → configurar → procesar → resultado" },
      { label: "Plan API", path: "src/app/api/ai-agent/plan/route.ts", purpose: "Claude Haiku genera plan + fallback a templates locales" },
    ],
    providers: [
      { name: "Claude Haiku (planning)", cost: "$0.001/plan", quality: "5/5" },
      { name: "Template fallback (local)", cost: "GRATIS", quality: "4/5" },
    ],
    usedBy: ["Automatizar TODO: sube foto y la IA hace el resto"],
    outputImage: "/showcase/ai-agent-result.png",
    editorLink: "/editor?module=ai-agent",
  },
  // ── 16. COMPLIANCE ──
  {
    id: "compliance",
    name: "Verificar Marketplace",
    nameEn: "Marketplace Compliance",
    icon: CheckSquare,
    color: "#50C878",
    category: "auto",
    whatItDoes: "Antes de publicar, verifica que tu imagen cumple los requisitos exactos de Amazon, Shopify, Etsy, eBay, TikTok Shop, etc. Detecta errores de tamanio, formato, fondo y sugiere correcciones.",
    flow: [
      "Subes tu imagen final",
      "Seleccionas marketplace: Amazon, Shopify, IG Shop, Etsy, eBay, TikTok Shop, Pinterest, etc.",
      "checkCompliance() valida: dimensiones, aspect ratio, color de fondo, file size, formato",
      "Reporte: PASS o FAIL con issues especificos y fixes sugeridos",
      "Auto-fix: upscale, outpaint, cambiar fondo, comprimir automaticamente",
    ],
    files: [
      { label: "Panel UI", path: "src/components/modules/CompliancePanel.tsx", purpose: "Selector marketplace, reporte visual, auto-fix" },
      { label: "Compliance", path: "src/lib/brand/compliance.ts", purpose: "Requisitos por plataforma + checkCompliance()" },
    ],
    providers: [
      { name: "Local (sin API)", cost: "GRATIS", quality: "5/5" },
    ],
    usedBy: ["TODOS los productos antes de publicar en marketplace"],
    editorLink: "/editor?module=compliance",
    videoUrl: "/videos/compliance.mp4",
  },
  // ── 17. BRAND KIT ──
  {
    id: "brand-kit",
    name: "Kit de Marca",
    nameEn: "Brand Kit & Consistency",
    icon: Palette,
    color: "#C5A47E",
    category: "auto",
    whatItDoes: "Guarda los colores, tipografias, logo y watermark de Unistyles para aplicar consistencia visual en TODAS las fotos de producto.",
    flow: [
      "Configuras colores de marca (primario, secundario, accent, fondo)",
      "Subes logo en varias versiones (color, blanco, negro, icono)",
      "Configuras watermark: posicion, opacidad, tamanio",
      "Se aplica automaticamente en exports y batch processing",
    ],
    files: [
      { label: "Pagina", path: "src/app/brand-kit/page.tsx", purpose: "UI completa de brand kit" },
      { label: "API Route", path: "src/app/api/brand-kit/route.ts", purpose: "CRUD de brand kit en DB" },
      { label: "Logica", path: "src/lib/brand/brand-kit.ts", purpose: "Colores, fonts, watermark, logo management" },
      { label: "Store", path: "src/stores/brand-store.ts", purpose: "Zustand store de brand" },
    ],
    providers: [
      { name: "Local", cost: "GRATIS", quality: "N/A" },
    ],
    usedBy: ["Toda la marca Unistyles"],
    editorLink: "/brand-kit",
    videoUrl: "/videos/brand-kit.mp4",
  },
];

// =============================================================================
// The 3 Agent Workflows
// =============================================================================

const AGENT_WORKFLOWS = [
  {
    name: "E-Commerce",
    icon: ShoppingBag,
    color: "#5B9CF6",
    description: "Fotos de producto para Amazon, Shopify, Etsy — fondo blanco, sombras, formato correcto",
    steps: [
      { module: "bg-remove", label: "Quitar fondo", cost: "Gratis" },
      { module: "enhance", label: "Mejorar calidad", cost: "Gratis" },
      { module: "shadows", label: "Agregar sombra", cost: "Gratis/$0.02" },
      { module: "outpaint", label: "Adaptar formato", cost: "$0.04" },
    ],
    totalCost: "~$0.06/foto",
    products: "Perfumes, Cremas, Bloqueador, Desodorantes",
  },
  {
    name: "Modelo Virtual",
    icon: Shirt,
    color: "#C5A47E",
    description: "Prenda en modelo IA — quita fondo, crea modelo, viste, mejora",
    steps: [
      { module: "bg-remove", label: "Quitar fondo prenda", cost: "Gratis" },
      { module: "model-create", label: "Crear modelo IA", cost: "$0.055" },
      { module: "tryon", label: "Vestir modelo", cost: "$0.02-0.075" },
      { module: "enhance", label: "Mejorar resultado", cost: "Gratis" },
    ],
    totalCost: "~$0.12/foto",
    products: "Brassieres (77), Panties (72), Shapewear (15)",
  },
  {
    name: "Social / Video",
    icon: Play,
    color: "#FF6B6B",
    description: "Contenido para TikTok, Reels, Stories — video + anuncio",
    steps: [
      { module: "bg-remove", label: "Quitar fondo", cost: "Gratis" },
      { module: "bg-generate", label: "Fondo lifestyle", cost: "$0.03" },
      { module: "enhance", label: "Mejorar", cost: "Gratis" },
      { module: "video", label: "Crear video", cost: "$0.04+" },
      { module: "ad-creator", label: "Crear anuncio", cost: "$0.04+" },
    ],
    totalCost: "~$0.10/video",
    products: "Hero products, campanas de temporada",
  },
];

// =============================================================================
// Components
// =============================================================================

function FeatureCard({ feature, index }: { feature: FeatureDetail; index: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = feature.icon;

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        background: "#111113",
        border: `1px solid ${isOpen ? feature.color + "50" : "#262629"}`,
        boxShadow: isOpen ? `0 0 30px ${feature.color}15` : "none",
      }}
    >
      {/* Header — always visible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-4 p-5 text-left"
      >
        {/* Number + Icon */}
        <div className="flex items-center gap-3 shrink-0">
          <span
            className="text-[11px] font-bold w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: `${feature.color}20`, color: feature.color }}
          >
            {index + 1}
          </span>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: `${feature.color}15`, border: `1px solid ${feature.color}30` }}
          >
            <Icon className="h-5 w-5" style={{ color: feature.color }} />
          </div>
        </div>

        {/* Title + description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-[15px] font-semibold text-[#F5F5F5]">{feature.name}</h3>
            <span className="text-[10px] text-[#55555A] font-mono">{feature.nameEn}</span>
          </div>
          <p className="text-[12px] text-[#8A8A90] line-clamp-1">{feature.whatItDoes}</p>
        </div>

        {/* Cost + Providers */}
        <div className="flex items-center gap-3 shrink-0">
          <span
            className="text-[10px] font-bold px-2 py-1 rounded-full"
            style={{
              background: feature.providers[0]?.cost === "GRATIS" ? "rgba(80,200,120,0.12)" : `${feature.color}15`,
              color: feature.providers[0]?.cost === "GRATIS" ? "#50C878" : feature.color,
            }}
          >
            {feature.providers[0]?.cost}
          </span>
          {isOpen ? <ChevronDown className="h-4 w-4 text-[#55555A]" /> : <ChevronRight className="h-4 w-4 text-[#55555A]" />}
        </div>
      </button>

      {/* Expanded content */}
      {isOpen && (
        <div className="px-5 pb-5 space-y-5">
          {/* Divider */}
          <div className="h-px" style={{ background: `${feature.color}20` }} />

          {/* Two columns: Info + Image */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left: Details */}
            <div className="lg:col-span-2 space-y-5">
              {/* What it does */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#55555A] mb-2">Que Hace</h4>
                <p className="text-[13px] text-[#D4D4D8] leading-relaxed">{feature.whatItDoes}</p>
              </div>

              {/* Flow */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#55555A] mb-3">Flujo Paso a Paso</h4>
                <div className="space-y-2">
                  {feature.flow.map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span
                        className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: `${feature.color}20`, color: feature.color }}
                      >
                        {i + 1}
                      </span>
                      <p className="text-[12px] text-[#8A8A90] leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Providers */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#55555A] mb-2">Providers / APIs</h4>
                <div className="space-y-1.5">
                  {feature.providers.map((p) => (
                    <div key={p.name} className="flex items-center gap-3 text-[11px]">
                      <span className="text-[#D4D4D8] flex-1">{p.name}</span>
                      <span
                        className="font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: p.cost === "GRATIS" ? "rgba(80,200,120,0.12)" : "rgba(255,255,255,0.04)",
                          color: p.cost === "GRATIS" ? "#50C878" : "#8A8A90",
                        }}
                      >
                        {p.cost}
                      </span>
                      <span className="text-[#55555A]">{p.quality}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Used by */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#55555A] mb-2">Productos Unistyles que lo Usan</h4>
                <div className="flex flex-wrap gap-1.5">
                  {feature.usedBy.map((u) => (
                    <span
                      key={u}
                      className="text-[10px] px-2 py-1 rounded-md"
                      style={{ background: "#1A1A1D", color: "#D4D4D8", border: "1px solid #262629" }}
                    >
                      {u}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Image + Files */}
            <div className="space-y-4">
              {/* Output image */}
              {feature.outputImage && (
                <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${feature.color}30` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={feature.outputImage}
                    alt={`${feature.name} resultado`}
                    className="w-full h-auto object-cover"
                    loading="lazy"
                  />
                  <div className="px-3 py-2 text-[10px] text-[#55555A]" style={{ background: `${feature.color}08` }}>
                    Resultado real de UniStudio
                  </div>
                </div>
              )}

              {/* Video demo */}
              {feature.videoUrl && (
                <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #262629" }}>
                  <video
                    src={feature.videoUrl}
                    controls
                    muted
                    playsInline
                    preload="metadata"
                    className="w-full h-auto"
                  />
                  <div className="px-3 py-2 text-[10px] text-[#55555A]" style={{ background: "#1A1A1D" }}>
                    Video demo
                  </div>
                </div>
              )}

              {/* Files involved */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#55555A] mb-2 flex items-center gap-1.5">
                  <FileCode className="h-3 w-3" />
                  Archivos del Codigo
                </h4>
                <div className="space-y-1.5">
                  {feature.files.map((f) => (
                    <div
                      key={f.path}
                      className="rounded-lg px-2.5 py-2"
                      style={{ background: "#0D0D0F", border: "1px solid #1E1E21" }}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-semibold" style={{ color: feature.color }}>{f.label}</span>
                      </div>
                      <div className="text-[9px] font-mono text-[#55555A] mb-0.5">{f.path}</div>
                      <div className="text-[9px] text-[#8A8A90]">{f.purpose}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action */}
          <div className="flex items-center gap-3 pt-2">
            <Link
              href={feature.editorLink}
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-[12px] font-semibold transition-all hover:-translate-y-0.5"
              style={{
                background: `${feature.color}20`,
                color: feature.color,
                border: `1px solid ${feature.color}30`,
              }}
            >
              <Icon className="h-3.5 w-3.5" />
              Usar {feature.name}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Page
// =============================================================================

export default function WorkflowsPage() {
  const [filterCat, setFilterCat] = useState<string>("all");

  const filtered = filterCat === "all" ? FEATURES : FEATURES.filter((f) => f.category === filterCat);

  return (
    <div className="min-h-screen" style={{ background: "#09090B" }}>
      <div className="mx-auto max-w-[1100px] px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/" className="text-[#8A8A90] hover:text-[#F5F5F5] transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-[32px] font-bold text-[#F5F5F5]">
              UniStudio — Mapa Completo
            </h1>
            <p className="text-[14px] text-[#8A8A90]">
              Cada feature, que hace, que archivos tocar, con fotos reales de tu inventario Unistyles
            </p>
          </div>
        </div>

        {/* ── SECTION 1: Inventory ── */}
        <section className="mb-12">
          <h2 className="text-[20px] font-bold text-[#F5F5F5] mb-4 flex items-center gap-2">
            <Package className="h-5 w-5" style={{ color: "#C5A47E" }} />
            Tu Inventario Unistyles
          </h2>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="rounded-xl p-4 text-center" style={{ background: "#111113", border: "1px solid #262629" }}>
              <div className="text-[28px] font-bold" style={{ color: "#C5A47E" }}>{INVENTORY.total}</div>
              <div className="text-[11px] text-[#55555A] uppercase tracking-wider">Productos Total</div>
            </div>
            <div className="rounded-xl p-4 text-center" style={{ background: "#111113", border: "1px solid #262629" }}>
              <div className="text-[28px] font-bold" style={{ color: "#50C878" }}>{INVENTORY.onWebsite}</div>
              <div className="text-[11px] text-[#55555A] uppercase tracking-wider">En la Web</div>
            </div>
            <div className="rounded-xl p-4 text-center" style={{ background: "#111113", border: "1px solid #262629" }}>
              <div className="text-[28px] font-bold" style={{ color: "#FF6B6B" }}>{INVENTORY.missing}</div>
              <div className="text-[11px] text-[#55555A] uppercase tracking-wider">Faltan</div>
            </div>
          </div>

          {/* Categories */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {INVENTORY.categories.map((cat) => {
              const gap = cat.count - cat.onSite;
              return (
                <div
                  key={cat.slug}
                  className="rounded-xl p-4"
                  style={{ background: "#111113", border: "1px solid #262629" }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[24px]">{cat.emoji}</span>
                    <div>
                      <div className="text-[14px] font-semibold text-[#F5F5F5]">{cat.name}</div>
                      <div className="text-[10px] text-[#55555A]">{cat.brand}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[12px] mb-2">
                    <span className="text-[#8A8A90]">Catalogo: <strong className="text-[#F5F5F5]">{cat.count}</strong></span>
                    <span className="text-[#8A8A90]">Web: <strong className="text-[#50C878]">{cat.onSite}</strong></span>
                    {gap > 0 && <span className="text-[#FF6B6B] font-bold">-{gap} faltan</span>}
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#1A1A1D" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min((cat.onSite / cat.count) * 100, 100)}%`,
                        background: cat.onSite >= cat.count ? "#50C878" : cat.color,
                      }}
                    />
                  </div>
                  <div className="text-[10px] text-[#55555A] mt-1">
                    Precio: ${typeof cat.price === "number" ? cat.price : cat.price} XCG
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── SECTION 2: 3 Agent Workflows ── */}
        <section className="mb-12">
          <h2 className="text-[20px] font-bold text-[#F5F5F5] mb-4 flex items-center gap-2">
            <Bot className="h-5 w-5" style={{ color: "#C5A47E" }} />
            3 Flujos del AI Agent
          </h2>
          <p className="text-[13px] text-[#8A8A90] mb-5">
            Asi es como el AI Agent encadena los modulos automaticamente segun el tipo de producto
          </p>

          <div className="space-y-4">
            {AGENT_WORKFLOWS.map((wf) => {
              const WfIcon = wf.icon;
              return (
                <div
                  key={wf.name}
                  className="rounded-2xl p-6"
                  style={{ background: "#111113", border: `1px solid ${wf.color}30` }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ background: `${wf.color}15`, border: `1px solid ${wf.color}30` }}
                    >
                      <WfIcon className="h-5 w-5" style={{ color: wf.color }} />
                    </div>
                    <div>
                      <h3 className="text-[16px] font-bold text-[#F5F5F5]">Agente: {wf.name}</h3>
                      <p className="text-[11px] text-[#8A8A90]">{wf.description}</p>
                    </div>
                    <div className="ml-auto text-right">
                      <div className="text-[14px] font-bold" style={{ color: wf.color }}>{wf.totalCost}</div>
                      <div className="text-[10px] text-[#55555A]">{wf.products}</div>
                    </div>
                  </div>

                  {/* Steps flow */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {wf.steps.map((step, i) => {
                      const StepFeature = FEATURES.find((f) => f.id === step.module);
                      const StepIcon = StepFeature?.icon || Zap;
                      return (
                        <React.Fragment key={step.module}>
                          <div
                            className="flex items-center gap-2 rounded-lg px-3 py-2"
                            style={{
                              background: `${StepFeature?.color || wf.color}12`,
                              border: `1px solid ${StepFeature?.color || wf.color}30`,
                            }}
                          >
                            <span
                              className="text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
                              style={{ background: `${StepFeature?.color || wf.color}25`, color: StepFeature?.color || wf.color }}
                            >
                              {i + 1}
                            </span>
                            <StepIcon className="h-3.5 w-3.5" style={{ color: StepFeature?.color || wf.color }} />
                            <div>
                              <div className="text-[11px] font-medium text-[#F5F5F5]">{step.label}</div>
                              <div className="text-[9px]" style={{ color: step.cost === "Gratis" ? "#50C878" : "#8A8A90" }}>
                                {step.cost}
                              </div>
                            </div>
                          </div>
                          {i < wf.steps.length - 1 && (
                            <ArrowRight className="h-4 w-4 shrink-0" style={{ color: `${wf.color}50` }} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── SECTION 3: Architecture Quick View ── */}
        <section className="mb-12">
          <h2 className="text-[20px] font-bold text-[#F5F5F5] mb-4 flex items-center gap-2">
            <FolderOpen className="h-5 w-5" style={{ color: "#5B9CF6" }} />
            Arquitectura del Proyecto
          </h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Paginas", count: 8, desc: "/, /editor, /agent, /workflows, /docs, /batch, /gallery, /brand-kit", icon: Globe, color: "#5B9CF6" },
              { label: "API Routes", count: 28, desc: "Un endpoint por modulo en src/app/api/", icon: Server, color: "#FF6B6B" },
              { label: "Modulos UI", count: 17, desc: "Paneles en src/components/modules/", icon: Eye, color: "#C5A47E" },
              { label: "Procesamiento", count: 16, desc: "Logica IA en src/lib/processing/", icon: Cpu, color: "#E879F9" },
              { label: "API Clients", count: 4, desc: "Replicate, fal.ai, FASHN, withoutBG", icon: Globe, color: "#F5A623" },
              { label: "Stores", count: 6, desc: "Zustand: editor, video, batch, brand, gallery, settings", icon: Database, color: "#50C878" },
              { label: "Hooks", count: 6, desc: "useAgentPipeline, useEditor, useImageProcessing, etc", icon: Code, color: "#5B9CF6" },
              { label: "Types", count: 6, desc: "agent.ts, api.ts, editor.ts, video.ts, batch.ts, brand.ts", icon: FileCode, color: "#8A8A90" },
            ].map((item) => {
              const ItemIcon = item.icon;
              return (
                <div
                  key={item.label}
                  className="rounded-xl p-4"
                  style={{ background: "#111113", border: "1px solid #262629" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <ItemIcon className="h-4 w-4" style={{ color: item.color }} />
                    <span className="text-[13px] font-semibold text-[#F5F5F5]">{item.label}</span>
                    <span className="text-[14px] font-bold ml-auto" style={{ color: item.color }}>{item.count}</span>
                  </div>
                  <p className="text-[10px] text-[#55555A] leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── SECTION 4: All Features ── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[20px] font-bold text-[#F5F5F5] flex items-center gap-2">
              <Zap className="h-5 w-5" style={{ color: "#F5A623" }} />
              Todas las Features ({FEATURES.length})
            </h2>

            {/* Category filter */}
            <div className="flex gap-1.5">
              {[
                { id: "all", label: "Todas", color: "#8A8A90" },
                { id: "fondos", label: "Fondos", color: "#5B9CF6" },
                { id: "mejora", label: "Mejora", color: "#50C878" },
                { id: "edicion", label: "Edicion", color: "#E879F9" },
                { id: "modelos", label: "Modelos", color: "#C5A47E" },
                { id: "contenido", label: "Contenido", color: "#FF6B6B" },
                { id: "auto", label: "Auto", color: "#F5A623" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setFilterCat(cat.id)}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                  style={{
                    background: filterCat === cat.id ? `${cat.color}20` : "transparent",
                    color: filterCat === cat.id ? cat.color : "#55555A",
                    border: `1px solid ${filterCat === cat.id ? `${cat.color}40` : "transparent"}`,
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <p className="text-[12px] text-[#55555A] mb-5">
            Haz click en cada feature para ver el flujo completo, archivos del codigo, providers, fotos reales y video demo
          </p>

          <div className="space-y-3">
            {filtered.map((feature, i) => (
              <FeatureCard key={feature.id} feature={feature} index={i} />
            ))}
          </div>
        </section>

        {/* Footer nav */}
        <div className="mt-12 flex items-center justify-center gap-4">
          {[
            { label: "Dashboard", href: "/", icon: Globe },
            { label: "Editor", href: "/editor", icon: PenTool },
            { label: "AI Agent", href: "/agent", icon: Bot },
            { label: "Docs", href: "/docs", icon: FileCode },
          ].map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-[12px] font-medium transition-all hover:-translate-y-0.5"
              style={{ background: "#111113", border: "1px solid #262629", color: "#8A8A90" }}
            >
              <link.icon className="h-3.5 w-3.5" />
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
