"use client";

import React from "react";
import { Palette, ExternalLink, Droplets, Type, ImageIcon, CheckCircle, XCircle } from "lucide-react";
import { ModuleHeader } from "@/components/ui/module-header";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { useBrandStore } from "@/stores/brand-store";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface BrandKitPanelProps {
  imageFile: File | null;
  onProcess: (result: string, beforeImage?: string, cost?: number) => void;
}

/* ------------------------------------------------------------------ */
/*  Color swatch sub-component                                          */
/* ------------------------------------------------------------------ */

function ColorSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="h-8 w-8 rounded-full border border-white/10 shadow-sm"
        style={{ backgroundColor: color }}
        title={`${label}: ${color}`}
      />
      <span className="text-[9px] text-gray-500 text-center leading-none">{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function BrandKitPanel({ imageFile, onProcess: _onProcess }: BrandKitPanelProps) {
  const brandKit = useBrandStore((s) => s.brandKit);

  // useBrandStore is a Zustand store that persists its state in memory
  // across page navigations — no fetch needed on mount.

  const hasLogo = Boolean(brandKit.logoUrl);
  const watermarkEnabled = brandKit.watermark?.enabled ?? false;
  const watermarkHasImage = Boolean(brandKit.watermark?.imageUrl);

  /* ---- Render ---- */

  return (
    <div className="space-y-4">
      {/* Header */}
      <ModuleHeader
        icon={<Palette className="h-4 w-4" />}
        title="Kit de Marca"
        description="Define los colores, fuentes, logo y marca de agua de tu marca en un solo lugar. Todos los demas modulos pueden usar esta configuracion para mantener la consistencia visual automaticamente."
        whyNeeded="Si cada foto de producto tiene colores diferentes, fuentes diferentes o sin logo, tu marca se ve desorganizada y poco confiable. El Kit de Marca asegura que TODAS tus fotos mantengan la misma identidad visual — como lo hacen las marcas profesionales."
        costLabel="Gratis"
        steps={[
          "Define tus colores de marca: principal, secundario, acento y fondo",
          "Configura la marca de agua: logo, posicion, opacidad y tamanio",
          "Elige las fuentes para titulos y textos",
          "Guarda — todos los demas modulos usaran estos ajustes automaticamente",
        ]}
        tips={[
          "Usa los colores exactos de tu marca (codigos hex) para maxima consistencia.",
          "La marca de agua debe ser visible pero no distraer — opacidad 20-40% es ideal.",
          "Para e-commerce, fondo blanco es estandar. Pero tu marca de agua puede usar tu color acento.",
          "Los cambios aqui se aplican automaticamente al generar fotos en otros modulos.",
        ]}
      />

      {/* ── Brand Colors ── */}
      <div className="rounded-lg border border-surface-lighter bg-surface-light p-3 space-y-2.5">
        <div className="flex items-center gap-1.5">
          <Droplets className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-[11px] font-semibold text-gray-300">Colores de Marca</span>
        </div>
        <div className="flex items-center justify-around pt-0.5">
          <ColorSwatch color={brandKit.colors.primary} label="Principal" />
          <ColorSwatch color={brandKit.colors.secondary} label="Secundario" />
          <ColorSwatch color={brandKit.colors.accent} label="Acento" />
          <ColorSwatch color={brandKit.colors.background} label="Fondo" />
        </div>
        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
          {(
            [
              { label: "Principal", value: brandKit.colors.primary },
              { label: "Secundario", value: brandKit.colors.secondary },
              { label: "Acento", value: brandKit.colors.accent },
              { label: "Fondo", value: brandKit.colors.background },
            ] as const
          ).map(({ label, value }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 rounded bg-surface px-2 py-1"
            >
              <span
                className="inline-block h-3 w-3 rounded-sm shrink-0 border border-white/10"
                style={{ backgroundColor: value }}
              />
              <span className="text-[10px] text-gray-400 truncate">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Fonts ── */}
      <div className="rounded-lg border border-surface-lighter bg-surface-light p-3 space-y-2">
        <div className="flex items-center gap-1.5">
          <Type className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-[11px] font-semibold text-gray-300">Tipografia</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] text-gray-500">Principal</span>
            <span className="text-[11px] text-gray-300 font-medium">
              {brandKit.fonts.primary || "Inter"}
            </span>
          </div>
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] text-gray-500">Secundaria</span>
            <span className="text-[11px] text-gray-300 font-medium">
              {brandKit.fonts.secondary || "Inter"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Logo & Watermark status ── */}
      <div className="rounded-lg border border-surface-lighter bg-surface-light p-3 space-y-2.5">
        <div className="flex items-center gap-1.5">
          <ImageIcon className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-[11px] font-semibold text-gray-300">Logo y Marca de Agua</span>
        </div>

        {/* Logo thumbnail or placeholder */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border",
              hasLogo
                ? "border-accent/30 bg-surface"
                : "border-dashed border-surface-hover bg-surface",
            )}
          >
            {hasLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brandKit.logoUrl}
                alt="Logo de marca"
                className="h-full w-full rounded-lg object-contain p-1"
              />
            ) : (
              <ImageIcon className="h-5 w-5 text-gray-600" />
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              {hasLogo ? (
                <CheckCircle className="h-3 w-3 text-emerald-400" />
              ) : (
                <XCircle className="h-3 w-3 text-gray-600" />
              )}
              <span className="text-[11px] text-gray-300">
                {hasLogo ? "Logo configurado" : "Sin logo"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {watermarkEnabled ? (
                <CheckCircle className="h-3 w-3 text-emerald-400" />
              ) : (
                <XCircle className="h-3 w-3 text-gray-600" />
              )}
              <span className="text-[11px] text-gray-300">Marca de agua</span>
              <Badge
                variant={watermarkEnabled ? "success" : "default"}
                size="sm"
              >
                {watermarkEnabled ? "Activa" : "Inactiva"}
              </Badge>
            </div>
            {watermarkEnabled && (
              <p className="text-[10px] text-gray-500">
                Opacidad: {Math.round((brandKit.watermark?.opacity ?? 0.3) * 100)}% &middot; Posicion: {brandKit.watermark?.position ?? "bottom-right"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Info ── */}
      <div className="rounded-lg border border-surface-lighter bg-surface-light p-3">
        <p className="text-[10px] text-gray-500 leading-relaxed">
          Este panel muestra un resumen de tu identidad de marca. Para editar colores, fuentes, logo o marca de agua, abre la pagina completa de Kit de Marca.
        </p>
      </div>

      {/* ── Link to full brand kit page ── */}
      <a
        href="/brand-kit"
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-lg",
          "border border-accent/30 bg-accent/5 px-3 py-2.5",
          "text-[11px] font-semibold text-accent-light",
          "hover:bg-accent/10 transition-colors",
        )}
      >
        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
        Editar Kit de Marca Completo
      </a>
    </div>
  );
}

export default BrandKitPanel;
