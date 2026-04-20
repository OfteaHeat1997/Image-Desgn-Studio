"use client";

import React, { useState } from "react";
import { Info, PlayCircle, ChevronDown, ChevronUp, Lightbulb, HelpCircle } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface ModuleHeaderProps {
  /** Icon component to display next to the title */
  icon?: React.ReactNode;
  /** Module title — e.g. "Quitar Fondo" */
  title: string;
  /** One-paragraph description of what the module does */
  description: string;
  /** Concrete real-world example. Shown as a callout chip — "brasier sobre mesa → brasier sin la mesa" */
  example?: string;
  /** "Por que lo necesitas" — explains the business value */
  whyNeeded?: string;
  /** Numbered "Como usar" steps */
  steps?: string[];
  /** Pro tips — short hints shown with info icon */
  tips?: string[];
  /** Video tutorial URL (YouTube/Loom) */
  videoUrl?: string;
  /** Cost label, shown in a subtle badge — e.g. "Gratis", "$0.02/img" */
  costLabel?: string;
  /** Category accent color — matches the sidebar category the module belongs to */
  accentColor?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function ModuleHeader({
  icon,
  title,
  description,
  example,
  whyNeeded,
  steps,
  tips,
  videoUrl,
  costLabel,
  accentColor,
}: ModuleHeaderProps) {
  const [showTips, setShowTips] = useState(false);
  const accent = accentColor ?? "var(--accent)";

  return (
    <div className="space-y-3">
      {/* Title + cost badge — category-colored accent bar on the left, big icon */}
      <div
        className="flex items-center gap-2.5 rounded-lg border-l-4 pl-2.5 py-1"
        style={{ borderColor: accent }}
      >
        {icon && (
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ background: `${accent}22`, color: accent }}
          >
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-bold text-white leading-tight">{title}</h3>
          {costLabel && (
            <span className="inline-block mt-0.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
              {costLabel}
            </span>
          )}
        </div>
      </div>

      {/* Description — always visible, readable size */}
      <p className="text-xs text-gray-300 leading-relaxed">
        {description}
      </p>

      {/* Concrete example — the fastest way to understand what this does */}
      {example && (
        <div
          className="rounded-lg border px-3 py-2.5"
          style={{ borderColor: `${accent}40`, background: `${accent}0A` }}
        >
          <span
            className="mb-1 block text-[9px] font-bold uppercase tracking-wider"
            style={{ color: accent }}
          >
            Ejemplo
          </span>
          <p className="text-[11px] text-gray-200 leading-snug">{example}</p>
        </div>
      )}

      {/* Why you need it — business value explanation */}
      {whyNeeded && (
        <div className="flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/8 px-3 py-2.5">
          <HelpCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-blue-400" />
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Por que lo necesitas</span>
            <p className="mt-0.5 text-[11px] text-blue-300/80 leading-relaxed">{whyNeeded}</p>
          </div>
        </div>
      )}

      {/* Steps — always visible */}
      {steps && steps.length > 0 && (
        <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
          <span className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-accent-light">
            <Info className="h-3.5 w-3.5" />
            Como usar
          </span>
          <ol className="space-y-1.5">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/20 text-[10px] font-bold text-accent-light">
                  {i + 1}
                </span>
                <span className="text-[11px] text-gray-300 leading-relaxed pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Tips — collapsible, but with visible toggle */}
      {tips && tips.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowTips((v) => !v)}
            className="flex w-full items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/15 transition-colors"
          >
            <Lightbulb className="h-3.5 w-3.5 shrink-0" />
            <span>{showTips ? "Ocultar tips" : "Ver tips y consejos"}</span>
            {showTips ? (
              <ChevronUp className="ml-auto h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="ml-auto h-3.5 w-3.5" />
            )}
          </button>

          {showTips && (
            <div className="space-y-1.5">
              {tips.map((tip, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-lg bg-surface-light px-3 py-2"
                >
                  <Lightbulb className="h-3 w-3 mt-0.5 shrink-0 text-amber-400/70" />
                  <span className="text-[11px] text-gray-300 leading-relaxed">{tip}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Video tutorial — only show if URL provided */}
      {videoUrl && (
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg bg-purple-500/10 border border-purple-500/20 px-3 py-2.5 text-[11px] font-semibold text-purple-300 hover:bg-purple-500/15 transition-colors"
        >
          <PlayCircle className="h-4 w-4 shrink-0" />
          <span>Ver video tutorial</span>
        </a>
      )}
    </div>
  );
}

export default ModuleHeader;
