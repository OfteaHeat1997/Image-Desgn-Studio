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

/** Claves de paso — deben coincidir con `StepKey` en page.tsx. */
export type JewelryStepKey =
  | 'isolate'
  | 'sharpen'
  | 'packshot'
  | 'estante'
  | 'macro'
  | 'modelo'
  | 'video';

/** Copy de un paso: encabezado de tarjeta + panel de documentación. */
interface StepItemCopy {
  label: string;
  description: string;
  costHint: string;
  what: string;
  provider: string;
  duration: string;
  costDetail: string;
  canFail: string[];
  tips: string[];
  /** 3 líneas que rotan mientras el paso procesa. */
  processing: [string, string, string];
  eta: string;
}

export interface JewelryPipelineCopy {
  config: {
    heading: string;
    subheading: string;
    defaultType: string;
    outputs: string;
    outputsHint: string;
    includeModel: string;
    includeVideo: string;
    estimated: string;
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
    accept: string;
    skip: string;
    rerun: string;
    stop: string;
    downloadAll: string;
    back: string;
  };
  statusBadge: {
    idle: string;
    pending: string;
    processing: string;
    done: string;
    error: string;
    skipped: string;
    accepted: string;
  };
  stepCard: {
    step: string;
    infoTitle: string;
    infoAria: string;
    stopTitle: string;
    docsWhat: string;
    docsProvider: string;
    docsDuration: string;
    docsCost: string;
    docsCanFail: string;
    docsTips: string;
    zoomHint: string;
    peekTitle: string;
    buildTitle: string;
  };
  thumb: {
    waiting: string;
    expired: string;
  };
  beforeAfter: {
    before: string;
    after: string;
    compareAria: (label: string) => string;
  };
  lightbox: {
    close: string;
    closeTitle: string;
    download: string;
    downloadTitle: string;
    compareWithOriginal: string;
    onlyResult: string;
    compareTitle: string;
    original: string;
    result: string;
    imageAlt: (n: number) => string;
    prevTitle: string;
    nextTitle: string;
  };
  steps: Record<JewelryStepKey, StepItemCopy>;
  features: {
    heading: string;
    analyzing: string;
    failed: string;
    stones: (count: number) => string;
    engraved: string;
  };
  upload: {
    cta: string;
    hint: string;
  };
  results: {
    heading: string;
    download: string;
    failedSuffix: string;
    empty: string;
  };
  messages: {
    error: string;
    skippedUpscale: string;
    noPending: string;
    processed: (count: number) => string;
    jobError: (name: string, msg: string) => string;
    stepSoftFail: (step: string) => string;
    jewelryChanged: (changes: string) => string;
    jewelryChangedModel: (changes: string) => string;
    needsIsolate: string;
    needsEstante: string;
  };
  /** Errores técnicos traducidos a lenguaje humano. */
  errors: {
    gpuMemory: string;
    contentPolicy: string;
    auth: string;
    notFound: string;
    timeout: string;
    imageLoad: string;
    generic: string;
  };
}

// -----------------------------------------------------------------------------
// Español (idioma por defecto)
// -----------------------------------------------------------------------------

export const JEWELRY_PIPELINE_ES: JewelryPipelineCopy = {
  config: {
    heading: 'Configurá y subí tus piezas',
    subheading: 'Elegí qué necesitás de cada joya. Podés cambiar el tipo pieza por pieza después.',
    defaultType: 'Tipo por defecto',
    outputs: 'Qué querés generar',
    outputsHint: 'Las 4 primeras fotos salen siempre. Modelo y video son opcionales.',
    includeModel: 'Foto en modelo',
    includeVideo: 'Video de la pieza',
    estimated: 'Costo estimado por pieza',
  },
  review: {
    heading: (count) => `Tus piezas (${count})`,
    accumulated: 'gastado',
    ready: 'listas',
  },
  buttons: {
    remove: 'Quitar',
    processAll: 'Generar todo',
    processing: 'Generando...',
    clearAll: 'Limpiar todo',
    accept: 'Aceptar',
    skip: 'Saltar',
    rerun: 'Rehacer',
    stop: 'Detener',
    downloadAll: 'Descargar todo',
    back: 'Inicio',
  },
  statusBadge: {
    idle: 'En espera',
    pending: 'En cola',
    processing: 'Generando',
    done: 'Listo',
    error: 'Falló',
    skipped: 'Saltado',
    accepted: 'Aceptado',
  },
  stepCard: {
    step: 'Paso',
    infoTitle: '¿Qué hace este paso?',
    infoAria: 'Ver documentación del paso',
    stopTitle: 'Detener este paso',
    docsWhat: 'Qué hace',
    docsProvider: 'Proveedor',
    docsDuration: 'Tiempo',
    docsCost: 'Costo',
    docsCanFail: 'Qué puede fallar',
    docsTips: 'Qué podés hacer',
    zoomHint: 'Pasá el mouse para verlo grande',
    peekTitle: 'Vista previa',
    buildTitle: 'Version del codigo que este deploy esta sirviendo. Si no coincide con tu ultimo push, estas viendo un build viejo.',
  },
  thumb: {
    waiting: 'Esperando este paso',
    expired: 'La imagen expiró',
  },
  beforeAfter: {
    before: 'Antes',
    after: 'Después',
    compareAria: (label) => `Comparar antes y después de ${label}`,
  },
  lightbox: {
    close: 'Cerrar',
    closeTitle: 'Cerrar la vista grande (Esc)',
    download: 'Descargar',
    downloadTitle: 'Descargar esta imagen',
    compareWithOriginal: 'Comparar con original',
    onlyResult: 'Ver solo el resultado',
    compareTitle: 'Comparar lado a lado (tecla C)',
    original: 'Original',
    result: 'Resultado',
    imageAlt: (n) => `Resultado ${n}`,
    prevTitle: 'Anterior',
    nextTitle: 'Siguiente',
  },
  steps: {
    isolate: {
      label: 'Quitar fondo',
      description: 'Deja la joya sola sobre fondo transparente',
      costHint: '$0.01',
      what: 'Recorta la joya de tu foto y la deja flotando sobre fondo transparente. Es la base de todos los pasos que siguen: cada foto que generes se arma a partir de este recorte.',
      provider: 'Replicate rembg, con WithoutBG de respaldo.',
      duration: '5–15 s',
      costDetail: '$0.01 si el primer proveedor responde; hasta $0.02 si cae al respaldo.',
      canFail: [
        'Con fondo muy cargado o poca luz, el recorte se puede comer una parte de la cadena.',
        'Si la joya es del mismo color que el fondo, el borde queda irregular.',
      ],
      tips: [
        'Fotografiá sobre un fondo liso y contrastante — es lo que más mejora este paso.',
        'Si el recorte sale mal, rehacelo: el resultado varía un poco entre intentos.',
      ],
      processing: ['Buscando tu joya en la foto…', 'Separándola del fondo…', 'Limpiando los bordes…'],
      eta: '~10 s típico',
    },
    sharpen: {
      label: 'Nitidez',
      description: 'Duplica la resolución sin cambiar la pieza',
      costHint: '$0.02',
      what: 'Duplica la resolución del recorte para que se lean los eslabones, los grabados y el engaste. En joyería el detalle ES el producto.',
      provider: 'Real-ESRGAN 2x, con Clarity de respaldo automático.',
      duration: '10–25 s',
      costDetail: '$0.02 con el primero; $0.05 si tiene que usar el respaldo.',
      canFail: [
        'La GPU de Replicate se puede quedar sin memoria si la foto es enorme. Se reintenta sola con la imagen más chica.',
      ],
      tips: [
        'Este paso NUNCA frena el pipeline: si no lo logra, sigue con tu foto original y te avisa en ámbar.',
        'Podés saltarlo si tu foto ya viene en alta resolución.',
      ],
      processing: ['Leyendo el detalle del metal…', 'Duplicando la resolución…', 'Afinando los bordes…'],
      eta: '~20 s típico',
    },
    packshot: {
      label: 'Foto para catálogo',
      description: 'Fondo blanco con sombra — lista para publicar',
      costHint: '$0.05',
      what: 'La foto de fondo blanco que piden los marketplaces: pieza centrada, sombra de contacto suave para que no parezca recortada, y nada más en cuadro. Es la que subís a Mercado Libre o a tu tienda.',
      provider: 'Flux Kontext Pro sobre tu recorte, con el guard de preservación.',
      duration: '20–40 s',
      costDetail: '$0.05 por foto.',
      canFail: [
        'Si el recorte del paso 1 quedó incompleto, acá se nota más.',
        'Ocasionalmente la sombra sale muy marcada — rehacelo y varía.',
      ],
      tips: [
        'Esta es la foto principal de tu publicación: revisala con la vista grande antes de aceptar.',
        'Si la joya cambió de color o de forma, te aparece un aviso ámbar. Rehacé el paso.',
      ],
      processing: ['Preparando el fondo blanco…', 'Centrando la pieza…', 'Calculando la sombra…'],
      eta: '~30 s típico',
    },
    estante: {
      label: 'Escena de lujo',
      description: 'Terciopelo, mármol y luz cálida — para redes',
      costHint: '$0.05',
      what: 'La foto bonita: tu joya sobre terciopelo, mármol o seda, con luz cálida de boutique. En collares se genera colgando de un cuello invisible para que se vea el largo real y cómo cae el dije.',
      provider: 'Flux Kontext Pro sobre tu recorte, con el guard de preservación.',
      duration: '20–40 s',
      costDetail: '$0.05 por foto.',
      canFail: [
        'La IA puede reinterpretar la joya si tu foto tiene poco contraste (oro puede salir plateado).',
        'El chequeo de identidad avisa en ámbar cuando eso pasa, pero no bloquea el resultado.',
      ],
      tips: [
        'Usa la ficha que la IA leyó de tu foto (material, acabado, piedras) para anclar el resultado.',
        'Si la pieza cambió, rehacé el paso — el resultado varía entre intentos.',
      ],
      processing: ['Montando el estante…', 'Ajustando la luz cálida…', 'Puliendo los reflejos…'],
      eta: '~30 s típico',
    },
    macro: {
      label: 'Detalle macro',
      description: 'Zoom real al eslabón, la piedra o el broche',
      costHint: 'Gratis',
      what: 'Acerca a la parte con más cuerpo de la pieza — el dije de un collar, la piedra de un anillo, los eslabones de una cadena — y la muestra sobre un fondo sobrio.',
      provider: 'Recorte local con sharp. NO pasa por ninguna IA.',
      duration: '1–3 s',
      costDetail: 'Gratis. Se procesa en el servidor, sin llamar a ningún proveedor.',
      canFail: [
        'Si el paso 1 dejó el fondo pegado, el recorte puede apuntar al lugar equivocado.',
      ],
      tips: [
        'Estos son los píxeles REALES de tu foto: nada acá está inventado por IA. Por eso sirve como prueba del acabado.',
        'Si apuntó al lugar equivocado, rehacé el paso 1 y este se recalcula.',
      ],
      processing: ['Buscando la parte más rica…', 'Recortando el detalle…', 'Montando el fondo…'],
      eta: '~2 s',
    },
    modelo: {
      label: 'En modelo',
      description: 'La pieza puesta sobre una modelo IA',
      costHint: '$0.10',
      what: 'Pone TU joya sobre una modelo generada por IA, en la parte del cuerpo que corresponde: orejas, cuello, mano o muñeca según el tipo de pieza.',
      provider: 'Modelo IA + colocación con Flux Kontext Pro sobre un compuesto lado a lado.',
      duration: '40–90 s',
      costDetail: '$0.10 ($0.055 la modelo + $0.05 la colocación).',
      canFail: [
        'Es el paso más difícil: la IA puede reinterpretar la joya al ponerla sobre la piel.',
        'Si falla, los otros pasos siguen igual — este nunca frena el resto.',
      ],
      tips: [
        'Opcional. Si vendés solo por catálogo, podés apagarlo y ahorrar.',
        'Revisá el aviso de identidad: te dice si la pieza cambió al montarla.',
      ],
      processing: ['Convocando a la modelo…', 'Colocando tu pieza…', 'Ajustando luz y sombra…'],
      eta: '~60 s típico',
    },
    video: {
      label: 'Video de la pieza',
      description: 'Cámara girando sobre la escena de lujo',
      costHint: '$0.05',
      what: 'Video corto con la cámara girando alrededor de tu joya sobre la escena de lujo, con el brillo recorriendo el metal. Para Reels, Stories y la ficha de producto.',
      provider: 'Generación de video a partir de la foto del estante.',
      duration: '60–120 s',
      costDetail: '$0.05 por video de 5 s.',
      canFail: [
        'Necesita que la escena de lujo haya salido bien — si ese paso falló, este no tiene de dónde partir.',
        'El movimiento puede salir raro; rehacelo y varía.',
      ],
      tips: [
        'Opcional. Es el paso más lento — apagalo si tenés apuro.',
        'Aceptá primero la escena de lujo: el video se arma sobre esa foto.',
      ],
      processing: ['Preparando el giro…', 'Renderizando los cuadros…', 'Puliendo el video…'],
      eta: '~90 s típico',
    },
  },
  features: {
    heading: 'Lo que la IA ve en tu foto',
    analyzing: 'Leyendo tu pieza…',
    failed: 'No se pudo leer la ficha. El pipeline sigue igual.',
    stones: (count) => `${count} piedra${count > 1 ? 's' : ''}`,
    engraved: 'con grabados',
  },
  upload: {
    cta: 'Arrastrá fotos de joyería acá o hacé click',
    hint: 'Aretes, cadenas, anillos, pulseras, topos, candongas, sets',
  },
  results: {
    heading: 'Tus fotos listas',
    download: 'Descargar',
    failedSuffix: 'no se generó',
    empty: 'Todavía no hay resultados. Generá una pieza para verlos acá.',
  },
  messages: {
    error: 'Error',
    skippedUpscale: 'No se pudo mejorar la nitidez — seguimos con tu foto original.',
    noPending: 'No hay piezas pendientes de generar.',
    processed: (count) => `${count} pieza${count !== 1 ? 's' : ''} lista${count !== 1 ? 's' : ''}.`,
    jobError: (name, msg) => `Error en ${name}: ${msg}`,
    stepSoftFail: (step) => `"${step}" falló, pero el resto de las fotos siguen.`,
    jewelryChanged: (changes) => `La joya cambió: ${changes}`,
    jewelryChangedModel: (changes) => `La joya cambió al ponerla en la modelo: ${changes}`,
    needsIsolate: 'Este paso necesita el recorte del paso 1.',
    needsEstante: 'Este paso necesita la escena de lujo.',
  },
  errors: {
    gpuMemory: 'La foto es muy pesada para la GPU. Probá con una imagen más chica.',
    contentPolicy: 'El proveedor rechazó la imagen por su filtro de contenido. Rehacé el paso.',
    auth: 'Problema de autorización con el proveedor. Revisá que las API keys estén activas.',
    notFound: 'El proveedor no encontró el modelo. Puede estar caído — reintentá en un rato.',
    timeout: 'El proveedor tardó demasiado. Rehacé el paso.',
    imageLoad: 'La foto no llegó al proveedor. Rehacé el paso — suele andar al segundo intento.',
    generic: 'Algo falló en este paso. Rehacelo o saltalo para seguir con el resto.',
  },
};

// -----------------------------------------------------------------------------
// English
// -----------------------------------------------------------------------------

export const JEWELRY_PIPELINE_EN: JewelryPipelineCopy = {
  config: {
    heading: 'Set up and upload your pieces',
    subheading: 'Choose what you need from each piece. You can change the type per piece afterwards.',
    defaultType: 'Default type',
    outputs: 'What to generate',
    outputsHint: 'The first 4 photos always run. Model and video are optional.',
    includeModel: 'On-model photo',
    includeVideo: 'Product video',
    estimated: 'Estimated cost per piece',
  },
  review: {
    heading: (count) => `Your pieces (${count})`,
    accumulated: 'spent',
    ready: 'done',
  },
  buttons: {
    remove: 'Remove',
    processAll: 'Generate everything',
    processing: 'Generating...',
    clearAll: 'Clear all',
    accept: 'Accept',
    skip: 'Skip',
    rerun: 'Redo',
    stop: 'Stop',
    downloadAll: 'Download all',
    back: 'Home',
  },
  statusBadge: {
    idle: 'Waiting',
    pending: 'Queued',
    processing: 'Generating',
    done: 'Done',
    error: 'Failed',
    skipped: 'Skipped',
    accepted: 'Accepted',
  },
  stepCard: {
    step: 'Step',
    infoTitle: 'What does this step do?',
    infoAria: 'Show step documentation',
    stopTitle: 'Stop this step',
    docsWhat: 'What it does',
    docsProvider: 'Provider',
    docsDuration: 'Time',
    docsCost: 'Cost',
    docsCanFail: 'What can go wrong',
    docsTips: 'What you can do',
    zoomHint: 'Hover to see it large',
    peekTitle: 'Preview',
    buildTitle: 'Code version this deploy is serving. If it does not match your latest push, you are looking at an old build.',
  },
  thumb: {
    waiting: 'Waiting for this step',
    expired: 'The image expired',
  },
  beforeAfter: {
    before: 'Before',
    after: 'After',
    compareAria: (label) => `Compare before and after for ${label}`,
  },
  lightbox: {
    close: 'Close',
    closeTitle: 'Close the large view (Esc)',
    download: 'Download',
    downloadTitle: 'Download this image',
    compareWithOriginal: 'Compare with original',
    onlyResult: 'Show result only',
    compareTitle: 'Compare side by side (C key)',
    original: 'Original',
    result: 'Result',
    imageAlt: (n) => `Result ${n}`,
    prevTitle: 'Previous',
    nextTitle: 'Next',
  },
  steps: {
    isolate: {
      label: 'Remove background',
      description: 'Leaves the piece alone on a transparent background',
      costHint: '$0.01',
      what: 'Cuts the piece out of your photo and leaves it floating on a transparent background. It is the base for everything that follows: every photo you generate is built from this cutout.',
      provider: 'Replicate rembg, with WithoutBG as backup.',
      duration: '5–15 s',
      costDetail: '$0.01 if the first provider answers; up to $0.02 if it falls back.',
      canFail: [
        'On a busy background or in low light the cutout can eat part of the chain.',
        'If the piece is the same colour as the background, the edge comes out ragged.',
      ],
      tips: [
        'Shoot against a plain, contrasting background — that is what improves this step the most.',
        'If the cutout comes out wrong, redo it: results vary a little between attempts.',
      ],
      processing: ['Finding your piece in the photo…', 'Separating it from the background…', 'Cleaning the edges…'],
      eta: '~10 s typical',
    },
    sharpen: {
      label: 'Sharpness',
      description: 'Doubles the resolution without changing the piece',
      costHint: '$0.02',
      what: 'Doubles the resolution of the cutout so the links, engravings and stone setting read clearly. In jewelry, the detail IS the product.',
      provider: 'Real-ESRGAN 2x, with automatic Clarity fallback.',
      duration: '10–25 s',
      costDetail: '$0.02 with the first one; $0.05 if it has to use the fallback.',
      canFail: [
        "Replicate's GPU can run out of memory on a huge photo. It retries on its own with a smaller image.",
      ],
      tips: [
        'This step NEVER stops the pipeline: if it cannot manage, it continues with your original photo and flags it in amber.',
        'You can skip it if your photo is already high resolution.',
      ],
      processing: ['Reading the metal detail…', 'Doubling the resolution…', 'Refining the edges…'],
      eta: '~20 s typical',
    },
    packshot: {
      label: 'Catalog photo',
      description: 'White background with shadow — ready to publish',
      costHint: '$0.05',
      what: 'The white-background photo marketplaces ask for: piece centred, soft contact shadow so it does not look pasted on, nothing else in frame. This is the one you upload to your store.',
      provider: 'Flux Kontext Pro over your cutout, with the preservation guard.',
      duration: '20–40 s',
      costDetail: '$0.05 per photo.',
      canFail: [
        'If the step 1 cutout came out incomplete, it shows more here.',
        'Occasionally the shadow comes out too harsh — redo it and it varies.',
      ],
      tips: [
        'This is the main photo of your listing: check it in the large view before accepting.',
        'If the piece changed colour or shape you get an amber warning. Redo the step.',
      ],
      processing: ['Preparing the white background…', 'Centring the piece…', 'Working out the shadow…'],
      eta: '~30 s typical',
    },
    estante: {
      label: 'Luxury scene',
      description: 'Velvet, marble and warm light — for social',
      costHint: '$0.05',
      what: 'The pretty photo: your piece on velvet, marble or silk with warm boutique light. Necklaces are generated hanging from an invisible neck so the real length and the way the pendant falls are visible.',
      provider: 'Flux Kontext Pro over your cutout, with the preservation guard.',
      duration: '20–40 s',
      costDetail: '$0.05 per photo.',
      canFail: [
        'The AI can reinterpret the piece if your photo has low contrast (gold can come out silver).',
        'The identity check flags that in amber, but it does not block the result.',
      ],
      tips: [
        'It uses the spec the AI read from your photo (material, finish, stones) to anchor the result.',
        'If the piece changed, redo the step — results vary between attempts.',
      ],
      processing: ['Building the display…', 'Adjusting the warm light…', 'Polishing the reflections…'],
      eta: '~30 s typical',
    },
    macro: {
      label: 'Detail macro',
      description: 'Real zoom on the link, the stone or the clasp',
      costHint: 'Free',
      what: 'Zooms into the most substantial part of the piece — the pendant of a necklace, the stone of a ring, the links of a chain — and shows it against a restrained background.',
      provider: 'Local crop with sharp. It does NOT go through any AI.',
      duration: '1–3 s',
      costDetail: 'Free. Processed on the server, without calling any provider.',
      canFail: [
        'If step 1 left background stuck to the piece, the crop can aim at the wrong spot.',
      ],
      tips: [
        'These are the REAL pixels of your photo: nothing here is invented by AI. That is what makes it proof of the finish.',
        'If it aimed at the wrong spot, redo step 1 and this one recalculates.',
      ],
      processing: ['Finding the richest part…', 'Cropping the detail…', 'Setting the background…'],
      eta: '~2 s',
    },
    modelo: {
      label: 'On model',
      description: 'The piece worn by an AI model',
      costHint: '$0.10',
      what: 'Puts YOUR piece on an AI-generated model, on the matching body part: ears, neck, hand or wrist depending on the type of piece.',
      provider: 'AI model + placement with Flux Kontext Pro over a side-by-side composite.',
      duration: '40–90 s',
      costDetail: '$0.10 ($0.055 the model + $0.05 the placement).',
      canFail: [
        'It is the hardest step: the AI can reinterpret the piece when placing it on skin.',
        'If it fails, the other steps carry on — this one never stops the rest.',
      ],
      tips: [
        'Optional. If you only sell from a catalog you can turn it off and save.',
        'Check the identity warning: it tells you whether the piece changed when mounted.',
      ],
      processing: ['Summoning the model…', 'Placing your piece…', 'Matching light and shadow…'],
      eta: '~60 s typical',
    },
    video: {
      label: 'Product video',
      description: 'Camera orbiting the luxury scene',
      costHint: '$0.05',
      what: 'A short video with the camera orbiting your piece on the luxury scene, highlight travelling across the metal. For Reels, Stories and the product page.',
      provider: 'Video generation from the display photo.',
      duration: '60–120 s',
      costDetail: '$0.05 per 5 s video.',
      canFail: [
        'It needs the luxury scene to have worked — if that step failed, this one has nothing to start from.',
        'The motion can come out odd; redo it and it varies.',
      ],
      tips: [
        'Optional. It is the slowest step — turn it off if you are in a hurry.',
        'Accept the luxury scene first: the video is built on that photo.',
      ],
      processing: ['Preparing the orbit…', 'Rendering the frames…', 'Polishing the video…'],
      eta: '~90 s typical',
    },
  },
  features: {
    heading: 'What AI sees in your photo',
    analyzing: 'Reading your piece…',
    failed: 'The spec could not be read. The pipeline carries on regardless.',
    stones: (count) => `${count} stone${count > 1 ? 's' : ''}`,
    engraved: 'engraved',
  },
  upload: {
    cta: 'Drag jewelry photos here or click',
    hint: 'Earrings, chains, rings, bracelets, studs, hoops, sets',
  },
  results: {
    heading: 'Your finished photos',
    download: 'Download',
    failedSuffix: 'was not generated',
    empty: 'No results yet. Generate a piece to see them here.',
  },
  messages: {
    error: 'Error',
    skippedUpscale: 'Sharpness could not be improved — carrying on with your original photo.',
    noPending: 'No pieces pending.',
    processed: (count) => `${count} piece${count !== 1 ? 's' : ''} ready.`,
    jobError: (name, msg) => `Error on ${name}: ${msg}`,
    stepSoftFail: (step) => `"${step}" failed, but the rest of the photos carry on.`,
    jewelryChanged: (changes) => `The piece changed: ${changes}`,
    jewelryChangedModel: (changes) => `The piece changed when placed on the model: ${changes}`,
    needsIsolate: 'This step needs the cutout from step 1.',
    needsEstante: 'This step needs the luxury scene.',
  },
  errors: {
    gpuMemory: 'The photo is too heavy for the GPU. Try a smaller image.',
    contentPolicy: 'The provider rejected the image through its content filter. Redo the step.',
    auth: 'Authorization problem with the provider. Check that the API keys are active.',
    notFound: 'The provider could not find the model. It may be down — try again later.',
    timeout: 'The provider took too long. Redo the step.',
    imageLoad: 'The photo did not reach the provider. Redo the step — it usually works the second time.',
    generic: 'Something failed in this step. Redo it or skip it to carry on with the rest.',
  },
};
