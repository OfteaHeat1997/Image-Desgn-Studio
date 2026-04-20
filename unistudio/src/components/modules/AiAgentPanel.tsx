"use client";

import React from "react";
import { Wand2, ArrowRight, ExternalLink, Shirt, Package, Gem } from "lucide-react";

/**
 * AiAgentPanel — consolidated stub.
 *
 * The previous version (2025 lines) was an in-editor orchestrator with 5 agent
 * types (ecommerce / modelo / social / catalogo / cambiar-modelo) that
 * duplicated the canonical pipelines. It has been replaced by the standalone
 * router at `/agent` and the 3 dedicated pipelines at `/pipelines/*`.
 *
 * This panel now only tells the user where the flow lives and redirects.
 * Consolidated in commit 8 of the pipeline rewrite.
 */

interface AiAgentPanelProps {
  imageFile?: File | null;
  onProcess?: (result: unknown) => void;
}

const PIPELINE_CARDS = [
  {
    label: "Lencería",
    description: "Bras · Panties · Shapewear — quita la modelo y crea una nueva",
    href: "/pipelines/lingerie",
    icon: Shirt,
  },
  {
    label: "Estáticos",
    description: "Perfumes · Cremas · Skincare · Maquillaje — fondo adaptativo",
    href: "/pipelines/static-product",
    icon: Package,
  },
  {
    label: "Joyería",
    description: "Aretes · Cadenas · Anillos · Pulseras — estante + modelo + video",
    href: "/pipelines/jewelry",
    icon: Gem,
  },
];

export function AiAgentPanel(_props: AiAgentPanelProps) {
  return (
    <div className="flex flex-col gap-5 p-5 text-white">
      <div className="flex items-center gap-2">
        <Wand2 className="h-5 w-5 text-violet-400" />
        <h2 className="text-lg font-semibold">Agente IA</h2>
      </div>

      <p className="text-sm leading-relaxed text-gray-400">
        El Agente IA ahora vive como router separado. Te pregunta qué tipo de producto tenés y te
        manda al pipeline correcto con la configuración apropiada para esa categoría.
      </p>

      <a
        href="/agent"
        className="inline-flex items-center justify-between rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm font-semibold text-violet-200 transition hover:border-violet-500/50 hover:bg-violet-500/15"
      >
        <span className="flex items-center gap-2">
          <Wand2 className="h-4 w-4" />
          Abrir Agente IA (selector de pipeline)
        </span>
        <ArrowRight className="h-4 w-4" />
      </a>

      <div className="mt-2">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          O ir directo al pipeline
        </p>
        <div className="flex flex-col gap-2">
          {PIPELINE_CARDS.map((p) => {
            const Icon = p.icon;
            return (
              <a
                key={p.href}
                href={p.href}
                className="flex items-start gap-3 rounded-lg border border-white/8 bg-white/[0.02] p-3 transition hover:border-white/20"
              >
                <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-200">{p.label}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{p.description}</p>
                </div>
                <ExternalLink className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-500" />
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default AiAgentPanel;
