'use client';

// =============================================================================
// useI18n — Hook de traducción de la interfaz
// =============================================================================
// Devuelve los textos del idioma activo junto con helpers para cambiarlo.
//
//   const { t, locale, setLocale, toggleLocale, bcp47 } = useI18n();
//   <h1>{t.dashboard.title}</h1>
//
// Nota SSR: el idioma persistido en localStorage solo existe en el cliente.
// Para evitar un desajuste de hidratación (el servidor renderiza siempre en
// el idioma por defecto), durante el primer render del cliente devolvemos el
// idioma por defecto y, ya montados, pasamos al idioma real de la usuaria.
// =============================================================================

import { useEffect, useState } from 'react';
import { useLanguageStore } from '@/stores/language-store';
import {
  DEFAULT_LOCALE,
  LOCALE_BCP47,
  getCopy,
  type AppCopy,
  type Locale,
} from '@/lib/i18n/translations';

export interface UseI18n {
  /** Textos del idioma activo. */
  t: AppCopy;
  /** Idioma activo (es | en). */
  locale: Locale;
  /** BCP-47 del idioma activo (para el Web Speech API / TTS). */
  bcp47: string;
  /** Fija un idioma concreto. */
  setLocale: (locale: Locale) => void;
  /** Alterna entre idiomas (es <-> en). */
  toggleLocale: () => void;
  /** true una vez leído el idioma persistido en el cliente. */
  hydrated: boolean;
}

export function useI18n(): UseI18n {
  const storeLocale = useLanguageStore((s) => s.locale);
  const setLocale = useLanguageStore((s) => s.setLocale);
  const toggleLocale = useLanguageStore((s) => s.toggleLocale);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // One-time hydration flag: el idioma persistido solo existe en el cliente,
    // así que pasamos del idioma por defecto (SSR) al real tras montar. Es un
    // set único al montar, no un ciclo en cascada.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional one-time mount flag
    setHydrated(true);
  }, []);

  const locale: Locale = hydrated ? storeLocale : DEFAULT_LOCALE;

  return {
    t: getCopy(locale),
    locale,
    bcp47: LOCALE_BCP47[locale],
    setLocale,
    toggleLocale,
    hydrated,
  };
}
