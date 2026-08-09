// =============================================================================
// i18n — Textos visibles del pipeline de Joyería (ES / EN)
// =============================================================================
// Fuente única de todo el texto de la UI de `src/app/pipelines/jewelry/page.tsx`
// (menos el encabezado título/subtítulo, que vive en `pages.ts` → `t.pages.jewelry`).
// Se consume con `const { t } = useI18n()` → `const jt = t.pipelines.jewelry`.
//
// Mismas reglas de escritura que translations.ts:
//  1. Verbos accionables.
//  2. CTAs cortas.
//  3. Descripción = outcome en 1 frase.
//  4. Sin nombrar modelos IA en la copy de marketing (los tooltips técnicos de
//     "Proveedor" son la excepción: su propósito es nombrar la herramienta).
//  5. Segunda persona.
//  6. Ambos idiomas con EXACTAMENTE la misma forma (mismo shape) para que
//     TypeScript garantice que ninguna clave quede sin traducir.
// =============================================================================

/** Estados posibles de un job — deben coincidir con `JobStatus` en page.tsx. */
type JobStatusKey =
  | 'idle'
  | 'uploading'
  | 'isolating'
  | 'upscaling'
  | 'generating-estante'
  | 'generating-model'
  | 'generating-video'
  | 'done'
  | 'error';

/** Claves de paso — deben coincidir con `StepKey` en page.tsx. */
type StepKeyName = 'isolate' | 'upscale' | 'estante' | 'modelo' | 'video';

/** Copy de un paso del timeline (label + tooltip informativo). */
interface StepItemCopy {
  label: string;
  costHint: string;
  what: string;
  provider: string;
  duration: string;
  tips: string[];
}

export interface JewelryPipelineCopy {
  config: {
    heading: string;
    defaultType: string;
    includeModel: string;
    includeVideo: string;
    includeVideoHint: string;
  };
  review: {
    heading: (count: number) => string;
    accumulated: string;
    ready: string;
  };
  buttons: {
    remove: string;
    processAll: string;
    processing: string;
    clearAll: string;
  };
  statusLabels: Record<JobStatusKey, string>;
  steps: {
    infoTitle: string;
    providerLabel: string;
    durationLabel: string;
    tipsLabel: string;
    skipped: string;
    items: Record<StepKeyName, StepItemCopy>;
  };
  features: {
    heading: string;
    stones: (count: number) => string;
    engraved: string;
  };
  upload: {
    cta: string;
    hint: string;
  };
  results: {
    estante: string;
    model: string;
    video: string;
    failedSuffix: string;
    download: string;
    modelMissing: string;
    videoMissing: string;
  };
  messages: {
    error: string;
    isolateFailed: string;
    upscaleFailed: string;
    upscaleFailedDetail: string;
    estanteFailed: string;
    noPending: string;
    processed: (count: number) => string;
    modelSoftFail: (name: string) => string;
    modelError: (name: string, msg: string) => string;
    jobError: (name: string, msg: string) => string;
    jewelryChanged: (changes: string) => string;
    jewelryChangedModel: (changes: string) => string;
  };
}

// -----------------------------------------------------------------------------
// Español (idioma por defecto) — valores EXACTOS a los que ya renderiza la page.
// -----------------------------------------------------------------------------

export const JEWELRY_PIPELINE_ES: JewelryPipelineCopy = {
  config: {
    heading: '1 · Configura y sube',
    defaultType: 'Tipo por defecto',
    includeModel: 'Incluir foto en modelo',
    includeVideo: 'Incluir video 360°',
    includeVideoHint: '(gratis)',
  },
  review: {
    heading: (count) => `2 · Revisa y procesa (${count} pieza${count !== 1 ? 's' : ''})`,
    accumulated: 'acumulado',
    ready: 'listas',
  },
  buttons: {
    remove: 'Quitar',
    processAll: 'Procesar todas',
    processing: 'Procesando...',
    clearAll: 'Limpiar todo',
  },
  statusLabels: {
    idle: 'Listo',
    uploading: 'Subiendo...',
    isolating: 'Quitando fondo...',
    upscaling: 'Upscale 2x...',
    'generating-estante': 'Generando estante...',
    'generating-model': 'Generando foto en modelo...',
    'generating-video': 'Generando video 360°...',
    done: 'Listo',
    error: 'Error',
  },
  steps: {
    infoTitle: '¿Qué hace este paso?',
    providerLabel: 'Proveedor:',
    durationLabel: 'Tiempo:',
    tipsLabel: 'Tips:',
    skipped: 'saltado',
    items: {
      isolate: {
        label: 'Quitar fondo',
        costHint: '$0.01',
        what: 'Aísla la joya sobre fondo transparente — base nítida para el upscale y todos los pasos siguientes.',
        provider: 'Replicate rembg + WithoutBG fallback.',
        duration: '5–15 s',
        tips: ['Para joyas chicas (aretes, topos), una foto bien iluminada da mejor isolate.'],
      },
      upscale: {
        label: 'Upscale 2x',
        costHint: '$0.02',
        what: 'Duplica la resolución para preservar detalle de gemas, grabados y acabado del metal — crítico en joyería.',
        provider: 'Real-ESRGAN 2x (Replicate).',
        duration: '10–25 s',
        tips: ['Si falla, el pipeline se detiene — sin upscale el estante sale borroso.'],
      },
      estante: {
        label: 'Estante lujoso',
        costHint: '$0.05',
        what: "Genera el fondo estilo catálogo Tiffany/Cartier alrededor de TU joya, manteniendo la pieza intacta gracias al guard 'preserve'.",
        provider: 'Flux Kontext Pro con input_image (composite-first).',
        duration: '20–40 s',
        tips: [
          'Usa los features detectados (material, acabado, piedras) para anclar el resultado.',
          'Si la joya cambia (ej oro → plata), el identity-check muestra warning chip.',
        ],
      },
      modelo: {
        label: 'En modelo',
        costHint: '$0.10',
        what: 'Aplica TU joya sobre una modelo IA (orejas, cuello, mano según subtipo) — 100% catálogo profesional.',
        provider: 'model-create (SeedDream) + tryon (Kolors/Kontext según subtipo).',
        duration: '40–90 s',
        tips: [
          'Opcional: desactivá si solo necesitás el estante.',
          'Las gemas y proporciones se preservan gracias al tryonPrompt específico por subtipo.',
        ],
      },
      video: {
        label: 'Video 360°',
        costHint: 'Gratis',
        what: 'Video 360° rotando la joya sobre estante, ideal para Reels/Stories.',
        provider: 'wan-2.2-fast (Replicate).',
        duration: '60–120 s',
        tips: ['Opcional. Si no lo necesitás, desactivá para ahorrar tiempo.'],
      },
    },
  },
  features: {
    heading: 'Lo que la IA ve en tu foto',
    stones: (count) => `${count} piedra${count > 1 ? 's' : ''}`,
    engraved: 'con grabados',
  },
  upload: {
    cta: 'Arrastra fotos de joyería aquí o haz click',
    hint: 'Aretes, cadenas, anillos, pulseras, topos, candongas, sets',
  },
  results: {
    estante: 'Estante',
    model: 'En modelo',
    video: 'Video 360°',
    failedSuffix: 'falló',
    download: 'Descargar',
    modelMissing:
      'La IA no pudo poner la pieza en la modelo. Probá otra foto más nítida o desactivá esta opción.',
    videoMissing: 'No se pudo generar el video. Abrí la consola para ver el error o reintentá.',
  },
  messages: {
    error: 'Error',
    isolateFailed: 'Falló quitar fondo',
    upscaleFailed: 'Falló el upscale',
    upscaleFailedDetail: 'Upscale falló — joyería necesita detalle nítido para verse profesional',
    estanteFailed: 'Falló estante',
    noPending: 'No hay fotos pendientes de procesar.',
    processed: (count) => `${count} pieza(s) procesada(s).`,
    modelSoftFail: (name) => `Modelo para ${name} falló — estante OK.`,
    modelError: (name, msg) => `Modelo para ${name}: ${msg}`,
    jobError: (name, msg) => `Error en ${name}: ${msg}`,
    jewelryChanged: (changes) => `⚠ La joya cambió: ${changes}`,
    jewelryChangedModel: (changes) => `⚠ La joya cambió en la modelo: ${changes}`,
  },
};

// -----------------------------------------------------------------------------
// English
// -----------------------------------------------------------------------------

export const JEWELRY_PIPELINE_EN: JewelryPipelineCopy = {
  config: {
    heading: '1 · Set up and upload',
    defaultType: 'Default type',
    includeModel: 'Include on-model photo',
    includeVideo: 'Include 360° video',
    includeVideoHint: '(free)',
  },
  review: {
    heading: (count) => `2 · Review and process (${count} piece${count !== 1 ? 's' : ''})`,
    accumulated: 'spent',
    ready: 'done',
  },
  buttons: {
    remove: 'Remove',
    processAll: 'Process all',
    processing: 'Processing...',
    clearAll: 'Clear all',
  },
  statusLabels: {
    idle: 'Ready',
    uploading: 'Uploading...',
    isolating: 'Removing background...',
    upscaling: 'Upscaling 2x...',
    'generating-estante': 'Generating display...',
    'generating-model': 'Generating on-model photo...',
    'generating-video': 'Generating 360° video...',
    done: 'Done',
    error: 'Error',
  },
  steps: {
    infoTitle: 'What does this step do?',
    providerLabel: 'Provider:',
    durationLabel: 'Time:',
    tipsLabel: 'Tips:',
    skipped: 'skipped',
    items: {
      isolate: {
        label: 'Remove background',
        costHint: '$0.01',
        what: 'Isolates the jewelry on a transparent background — a crisp base for the upscale and every step that follows.',
        provider: 'Replicate rembg + WithoutBG fallback.',
        duration: '5–15 s',
        tips: ['For small pieces (earrings, studs), a well-lit photo gives a cleaner isolate.'],
      },
      upscale: {
        label: 'Upscale 2x',
        costHint: '$0.02',
        what: 'Doubles the resolution to preserve gem detail, engravings and metal finish — critical for jewelry.',
        provider: 'Real-ESRGAN 2x (Replicate).',
        duration: '10–25 s',
        tips: ['If it fails, the pipeline stops — without the upscale the display comes out blurry.'],
      },
      estante: {
        label: 'Luxury display',
        costHint: '$0.05',
        what: "Generates a Tiffany/Cartier catalog-style background around YOUR piece, keeping it intact thanks to the 'preserve' guard.",
        provider: 'Flux Kontext Pro with input_image (composite-first).',
        duration: '20–40 s',
        tips: [
          'Uses the detected features (material, finish, stones) to anchor the result.',
          'If the piece changes (e.g. gold → silver), the identity check shows a warning chip.',
        ],
      },
      modelo: {
        label: 'On model',
        costHint: '$0.10',
        what: 'Places YOUR jewelry on an AI model (ears, neck or hand by sub-type) — 100% professional catalog.',
        provider: 'model-create (SeedDream) + try-on (Kolors/Kontext by sub-type).',
        duration: '40–90 s',
        tips: [
          'Optional: turn it off if you only need the display.',
          'Gems and proportions are preserved thanks to the sub-type-specific try-on prompt.',
        ],
      },
      video: {
        label: '360° video',
        costHint: 'Free',
        what: 'A 360° video rotating the piece on its display, ideal for Reels/Stories.',
        provider: 'wan-2.2-fast (Replicate).',
        duration: '60–120 s',
        tips: ["Optional. If you don't need it, turn it off to save time."],
      },
    },
  },
  features: {
    heading: 'What AI sees in your photo',
    stones: (count) => `${count} stone${count > 1 ? 's' : ''}`,
    engraved: 'engraved',
  },
  upload: {
    cta: 'Drag jewelry photos here or click',
    hint: 'Earrings, chains, rings, bracelets, studs, hoops, sets',
  },
  results: {
    estante: 'Display',
    model: 'On model',
    video: '360° video',
    failedSuffix: 'failed',
    download: 'Download',
    modelMissing:
      "AI couldn't place the piece on the model. Try a sharper photo or turn this option off.",
    videoMissing: "The video couldn't be generated. Open the console to see the error or try again.",
  },
  messages: {
    error: 'Error',
    isolateFailed: 'Background removal failed',
    upscaleFailed: 'Upscale failed',
    upscaleFailedDetail: 'Upscale failed — jewelry needs crisp detail to look professional',
    estanteFailed: 'Display generation failed',
    noPending: 'No photos pending to process.',
    processed: (count) => `${count} piece(s) processed.`,
    modelSoftFail: (name) => `On-model for ${name} failed — display OK.`,
    modelError: (name, msg) => `On-model for ${name}: ${msg}`,
    jobError: (name, msg) => `Error on ${name}: ${msg}`,
    jewelryChanged: (changes) => `⚠ The piece changed: ${changes}`,
    jewelryChangedModel: (changes) => `⚠ The piece changed on the model: ${changes}`,
  },
};
