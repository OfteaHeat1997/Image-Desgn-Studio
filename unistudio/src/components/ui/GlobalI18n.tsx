'use client';

// =============================================================================
// GlobalI18n — Selector de idioma global + sincronización de <html lang>
// =============================================================================
// Se monta UNA vez en el layout raíz, así el switch ES/EN aparece en TODAS las
// páginas (no solo la home) y el atributo lang del <html> sigue al idioma activo
// (importante para accesibilidad y lectores de pantalla).
// =============================================================================

import { useEffect } from 'react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useI18n } from '@/hooks/useI18n';

export function GlobalI18n() {
  const { locale } = useI18n();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <div className="fixed right-3 top-3 z-50">
      <LanguageSwitcher />
    </div>
  );
}
