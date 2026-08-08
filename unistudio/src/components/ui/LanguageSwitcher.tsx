'use client';

// =============================================================================
// LanguageSwitcher — Toggle ES / EN
// =============================================================================
// Pill segmentado con dos opciones (Español / English). Marca el idioma activo
// con el color de acento del brand y persiste la elección vía el language-store.
// Accesible: role="group", cada botón con aria-pressed.
// =============================================================================

import { Globe } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { LOCALES, LOCALE_LABEL, type Locale } from '@/lib/i18n/translations';

const FULL_NAME: Record<Locale, string> = {
  es: 'Español',
  en: 'English',
};

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className = '' }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      role="group"
      aria-label={t.language.label}
      className={`inline-flex items-center gap-1 rounded-full border border-[var(--border-default)] bg-surface-light/70 p-0.5 backdrop-blur ${className}`}
    >
      <Globe className="ml-2 h-3.5 w-3.5 text-muted" aria-hidden="true" />
      {LOCALES.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-pressed={active}
            title={FULL_NAME[code]}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide transition-default ${
              active
                ? 'bg-[var(--accent)] text-[var(--bg-primary)] shadow-sm'
                : 'text-muted hover:text-[var(--accent)]'
            }`}
          >
            {LOCALE_LABEL[code]}
          </button>
        );
      })}
    </div>
  );
}
