// =============================================================================
// TTS Voice Data - UniStudio
// Client-safe constants for TTS voices and languages.
// No server-side imports here — safe for use in client components.
// =============================================================================

export interface TtsVoice {
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female';
}

export const EDGE_TTS_VOICES: TtsVoice[] = [
  // Spanish
  { id: 'es-MX-DaliaNeural', name: 'Dalia (MX)', language: 'es', gender: 'female' },
  { id: 'es-MX-JorgeNeural', name: 'Jorge (MX)', language: 'es', gender: 'male' },
  { id: 'es-ES-ElviraNeural', name: 'Elvira (ES)', language: 'es', gender: 'female' },
  { id: 'es-ES-AlvaroNeural', name: 'Alvaro (ES)', language: 'es', gender: 'male' },
  { id: 'es-CO-SalomeNeural', name: 'Salome (CO)', language: 'es', gender: 'female' },
  { id: 'es-AR-ElenaNeural', name: 'Elena (AR)', language: 'es', gender: 'female' },
  // English
  { id: 'en-US-JennyNeural', name: 'Jenny (US)', language: 'en', gender: 'female' },
  { id: 'en-US-GuyNeural', name: 'Guy (US)', language: 'en', gender: 'male' },
  { id: 'en-GB-SoniaNeural', name: 'Sonia (UK)', language: 'en', gender: 'female' },
  // Dutch (Curacao connection)
  { id: 'nl-NL-ColetteNeural', name: 'Colette (NL)', language: 'nl', gender: 'female' },
  { id: 'nl-NL-MaartenNeural', name: 'Maarten (NL)', language: 'nl', gender: 'male' },
  // Portuguese
  { id: 'pt-BR-FranciscaNeural', name: 'Francisca (BR)', language: 'pt', gender: 'female' },
  // French
  { id: 'fr-FR-DeniseNeural', name: 'Denise (FR)', language: 'fr', gender: 'female' },
];

export const TTS_LANGUAGES = [
  { code: 'es', name: 'Espanol' },
  { code: 'en', name: 'English' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'pt', name: 'Portugues' },
  { code: 'fr', name: 'Francais' },
];

/** Get voices filtered by language */
export function getVoicesForLanguage(language: string): TtsVoice[] {
  return EDGE_TTS_VOICES.filter((v) => v.language === language);
}
