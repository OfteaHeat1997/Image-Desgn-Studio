"use client";

import { useEffect } from "react";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useI18n } from "@/hooks/useI18n";
import type { HomeCopy } from "@/lib/i18n/translations";

/**
 * Dashboard / Home page.
 *
 * Diseño basado en research de Photoroom, Claid y Pebblely (los 3 líderes
 * de AI product photography para e-commerce). Patrones aplicados:
 *
 *  1. Mobile-first — los 3 pipelines son cards grandes en columna en mobile,
 *     row en desktop.
 *  2. Outcome > proceso — la descripción dice qué SALE, no qué pasa.
 *  3. Design tokens — usa el oro premium del brand (--accent #D4B48A).
 *  4. Jerarquía visual — los 3 pipelines son la sección principal.
 *  5. Bilingüe — TODO el texto viene de `src/lib/i18n/translations.ts` y el
 *     switch ES/EN (arriba a la derecha) cambia el idioma en vivo. La
 *     tipografía usa la serif editorial (Fraunces) en los títulos para un
 *     acabado de "estudio de moda".
 */
export default function HomePage() {
  const { t, locale } = useI18n();

  // Mantén el atributo lang del documento en sync con el idioma elegido —
  // mejora accesibilidad (lectores de pantalla) y SEO en el cliente.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <div className="min-h-screen bg-surface text-heading">
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        {/* ── Top bar: wordmark + switch de idioma ─────────────────── */}
        <div className="flex items-center justify-between mb-8 md:mb-10">
          <span className="font-serif text-lg md:text-xl font-semibold tracking-tight text-gradient">
            {t.app.name}
          </span>
          <LanguageSwitcher />
        </div>

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <header className="text-center mb-12 md:mb-16">
          <p className="text-muted text-sm md:text-base font-medium tracking-wide">
            {t.app.tagline}
          </p>
          <h1 className="font-serif mt-5 text-3xl md:text-5xl font-semibold leading-tight tracking-tight text-heading text-balance">
            {t.dashboard.title}
          </h1>
          <p className="mt-4 text-base md:text-lg text-muted max-w-2xl mx-auto text-balance">
            {t.dashboard.subtitle}
          </p>
        </header>

        {/* ── Sección principal: 3 pipelines ──────────────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-12">
          <PipelineCard href="/pipelines/lingerie" data={t.pipelines.lingerie} />
          <PipelineCard href="/pipelines/static-product" data={t.pipelines.beauty} />
          <PipelineCard href="/pipelines/jewelry" data={t.pipelines.jewelry} />
        </section>

        {/* ── Utilities ──────────────────────────────────────────── */}
        <section className="mb-12">
          <SectionLabel>{t.sections.moreOptions}</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
            <UtilityCard href="/batch" data={t.utilities.batch} />
            <UtilityCard href="/editor" data={t.utilities.editor} />
            <UtilityCard href="/brand-kit" data={t.utilities.brandKit} />
          </div>
        </section>

        {/* ── Módulos sueltos (avanzado) ─────────────────────────── */}
        <details className="mb-10 group">
          <summary className="cursor-pointer list-none">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-light border border-[var(--border-default)] hover:border-[var(--accent-muted)] transition-default">
              <span className="text-sm font-semibold text-body">
                📸 {t.sections.advancedTitle}
              </span>
              <span className="text-xs text-muted group-open:hidden">
                {t.sections.show} →
              </span>
              <span className="text-xs text-muted hidden group-open:inline">
                {t.sections.hide} ↓
              </span>
            </div>
          </summary>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
            {t.modules.map((m) => (
              <ModuleLink
                key={m.id}
                href={`/editor?module=${m.id}`}
                name={m.name}
                cost={m.cost}
                wide={m.wide}
              />
            ))}
          </div>
        </details>

        {/* ── Quick links ────────────────────────────────────────── */}
        <nav className="flex justify-center gap-6 md:gap-8 mt-12 mb-6 text-sm text-muted">
          <a href="/gallery" className="hover:text-[var(--accent)] transition-default">
            📁 {t.nav.gallery}
          </a>
          <a href="/workflows" className="hover:text-[var(--accent)] transition-default">
            📋 {t.nav.workflows}
          </a>
          <a href="/docs" className="hover:text-[var(--accent)] transition-default">
            📖 {t.nav.docs}
          </a>
        </nav>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                              */
/* -------------------------------------------------------------------------- */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold mb-3 text-muted uppercase tracking-[0.14em]">
      {children}
    </h2>
  );
}

type PipelineCardData = HomeCopy["pipelines"]["lingerie"];

function PipelineCard({ href, data }: { href: string; data: PipelineCardData }) {
  return (
    <a
      href={href}
      className="group block rounded-xl bg-surface-light border border-[var(--border-default)] hover:border-[var(--accent)] hover:bg-surface-elevated transition-default overflow-hidden"
    >
      {/* Video preview — autoplay muted loop, muestra qué hace el pipeline */}
      <div className="relative aspect-video bg-surface-elevated overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-default"
        >
          <source src={data.video} type="video/mp4" />
        </video>
        {/* Overlay gradient para que el icono se lea */}
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(12,12,14,0.95)] via-[rgba(12,12,14,0.3)] to-transparent" />
        <span className="absolute top-3 left-3 text-3xl drop-shadow-lg">{data.icon}</span>
      </div>
      <div className="p-4 md:p-5">
        <h3 className="font-serif text-lg md:text-xl font-semibold mb-1 text-heading tracking-tight">
          {data.title}
        </h3>
        <p className="text-xs text-muted mb-2">{data.tagline}</p>
        <p className="text-sm text-body leading-relaxed">{data.benefit}</p>
        <div className="mt-4">
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--accent-dim)] text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-[var(--bg-primary)] transition-default">
            {data.cta}
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </span>
        </div>
      </div>
    </a>
  );
}

type UtilityCardData = HomeCopy["utilities"]["batch"];

function UtilityCard({ href, data }: { href: string; data: UtilityCardData }) {
  return (
    <a
      href={href}
      className="group block rounded-lg bg-surface-light border border-[var(--border-default)] hover:border-[var(--accent-muted)] transition-default overflow-hidden"
    >
      {/* Mini-video preview en utility cards */}
      <div className="relative aspect-[16/9] bg-surface-elevated overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-default"
        >
          <source src={data.video} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(12,12,14,0.85)] to-transparent" />
        <span className="absolute top-2 left-2 text-xl drop-shadow">{data.icon}</span>
      </div>
      <div className="p-3">
        <h3 className="font-medium text-sm text-heading truncate">{data.title}</h3>
        <p className="text-xs text-muted truncate">{data.benefit}</p>
      </div>
    </a>
  );
}

function ModuleLink({
  href,
  name,
  cost,
  wide,
}: {
  href: string;
  name: string;
  cost: string;
  wide?: boolean;
}) {
  return (
    <a
      href={href}
      className={`block p-2.5 rounded-lg bg-surface-light/40 border border-[var(--border-subtle)] hover:border-[var(--accent-muted)] text-sm transition-default ${
        wide ? "col-span-2 md:col-span-4" : ""
      }`}
    >
      <span className="block font-medium text-body">{name}</span>
      <span className="block text-[10px] text-muted leading-tight">{cost}</span>
    </a>
  );
}
