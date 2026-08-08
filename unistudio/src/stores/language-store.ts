// =============================================================================
// Language Store - UniStudio
// Guarda el idioma activo de la interfaz (es | en) y lo persiste en
// localStorage para que la elección de la usuaria sobreviva recargas.
// =============================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/lib/i18n/translations';

interface LanguageState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Alterna entre los idiomas disponibles (es <-> en). */
  toggleLocale: () => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      locale: DEFAULT_LOCALE,

      setLocale: (locale) => {
        // Guard: solo aceptamos locales soportados.
        if (LOCALES.includes(locale)) set({ locale });
      },

      toggleLocale: () => {
        const current = get().locale;
        const idx = LOCALES.indexOf(current);
        const next = LOCALES[(idx + 1) % LOCALES.length];
        set({ locale: next });
      },
    }),
    {
      name: 'unistudio-language',
      partialize: (state) => ({ locale: state.locale }),
    },
  ),
);
