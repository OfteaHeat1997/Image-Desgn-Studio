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
  | 'clean'
  | 'isolate'
  | 'packshot'
  | 'luxury'
  | 'macro'
  | 'model'
  | 'scale'
  | 'social';

/** Las 3 etapas en las que se agrupan los pasos. */
export type JewelryStageKey = 'prepare' | 'generate' | 'publish';

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
    discard: string;
    discardTitle: string;
    variants: (n: number) => string;
    useVariant: (n: number) => string;
    whatIsThis: string;
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
  stages: Record<JewelryStageKey, { label: string; hint: string }>;
  vision: {
    heading: string;
    analyzing: string;
    failed: string;
    detectedAs: (tipo: string) => string;
    guessed: string;
    guessedHint: string;
    multiProduct: (n: number) => string;
    multiProductHint: string;
    chain: string;
    clasp: string;
    engraved: string;
    changeType: string;
  };
  social: {
    carousel: string;
    carouselHint: string;
    reel: string;
    reelHint: string;
    reelUnavailable: string;
    slide: (n: number) => string;
    downloadKit: string;
  };
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
    discard: 'No me gusta',
    discardTitle: 'Descartar este resultado y volver al anterior',
    variants: (n) => `${n} versiones generadas`,
    useVariant: (n) => `Usar la versión ${n}`,
    whatIsThis: '¿Qué hace este paso?',
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
    zoomHint: 'Click para ver en grande, con el original al lado',
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
    clean: {
      label: 'Limpiar la foto',
      description: 'Borra precio, titulo y marca de agua',
      costHint: '$0.04',
      what: 'Quita los textos que le pusieron encima a la foto (nombre, precio, marca de agua) y reconstruye lo que habia detras. NO toca el producto ni el exhibidor: si tu foto ya estaba bien tomada, el resultado de este paso YA es publicable.',
      provider: 'Flux Kontext Pro, con instruccion de retoque estricta.',
      duration: '15-25 s',
      costDetail: '$0.04 por foto.',
      canFail: [
        'Si el texto esta encima del producto, al reconstruir puede alterar esa zona.',
        'Con muchisimo texto puede quedar alguna letra suelta.',
      ],
      tips: [
        'Este paso solo por si ya te sirve la foto: descargala y publicala.',
        'Si borro de mas, rehacelo — varia entre intentos.',
      ],
      processing: ['Leyendo los textos de la foto...', 'Borrando precio y marca de agua...', 'Reconstruyendo el fondo...'],
      eta: '~20 s tipico',
    },
    isolate: {
      label: 'Recortar la pieza',
      description: 'Deja la joya sola, sin fondo',
      costHint: '$0.01',
      what: 'Recorta la joya y la deja sobre fondo transparente. Es la base de las fotos generadas: packshot, escena de lujo, detalle y modelo se arman todos a partir de este recorte.',
      provider: 'BiRefNet (fal). Elegido midiendo contra 5 proveedores mas.',
      duration: '2-5 s',
      costDetail: '$0.01 por foto.',
      canFail: [
        'Con fondo del mismo tono que la pieza el borde puede quedar irregular.',
        'Si falla, cae a rembg — que en joyeria recorta bastante peor.',
      ],
      tips: [
        'Corre DESPUES de limpiar la foto: sin los textos encima acierta mucho mas.',
        'Se probo contra rembg, WithoutBG, Bria RMBG 2.0, Grounded SAM y remove.bg. BiRefNet fue el unico que conservo la cadena fina Y la textura del colgante.',
      ],
      processing: ['Separando la pieza del fondo...', 'Siguiendo la cadena eslabon por eslabon...', 'Afinando los bordes...'],
      eta: '~4 s tipico',
    },
    packshot: {
      label: 'Foto para catalogo',
      description: 'Fondo blanco con sombra, lista para publicar',
      costHint: '$0.05',
      what: 'La foto de fondo blanco que piden los marketplaces: pieza centrada y sombra de contacto suave para que no parezca recortada. Es la que subis a tu tienda.',
      provider: 'Flux Kontext Pro sobre el recorte, con el guard de preservacion.',
      duration: '20-40 s',
      costDetail: '$0.05 por foto.',
      canFail: [
        'Si el recorte quedo incompleto, aca se nota mas.',
        'Puede reinterpretar detalles chicos: en una prueba convirtio una medalla en un broche.',
      ],
      tips: [
        'Es la foto principal de tu publicacion: revisala grande antes de aceptar.',
        'Si la pieza cambio, te sale un aviso ambar. Rehacela.',
      ],
      processing: ['Preparando el fondo blanco...', 'Centrando la pieza...', 'Calculando la sombra...'],
      eta: '~30 s tipico',
    },
    luxury: {
      label: 'Escena de lujo',
      description: 'Terciopelo, marmol y luz calida, para redes',
      costHint: '$0.05',
      what: 'La foto bonita: tu joya sobre terciopelo, marmol o seda con luz de boutique. Collares y rosarios se generan colgando de un cuello invisible, para que se lea el largo real y como cae el dije.',
      provider: 'Flux Kontext Pro sobre el recorte, con el guard de preservacion.',
      duration: '20-40 s',
      costDetail: '$0.05 por foto.',
      canFail: [
        'Con fotos de poco contraste puede reinterpretar el metal (oro sale plateado).',
        'El chequeo de identidad lo avisa en ambar, pero no bloquea.',
      ],
      tips: [
        'Usa la ficha que Vision leyo de tu foto para anclar el resultado.',
        'Es la slide 1 del carrusel: la que gana el swipe.',
      ],
      processing: ['Montando la escena...', 'Ajustando la luz calida...', 'Puliendo los reflejos...'],
      eta: '~30 s tipico',
    },
    macro: {
      label: 'Detalle macro',
      description: 'Zoom real al eslabon, la piedra o el broche',
      costHint: 'Gratis',
      what: 'Acerca a la parte con mas cuerpo de la pieza y la muestra sobre fondo sobrio. Son los PIXELES REALES de tu foto: nada aca lo invento una IA, por eso sirve como prueba del acabado.',
      provider: 'Recorte local con sharp. NO pasa por ninguna IA.',
      duration: '1-3 s',
      costDetail: 'Gratis. Se procesa en el servidor.',
      canFail: [
        'Si el recorte del paso anterior quedo sucio, puede apuntar al lugar equivocado.',
      ],
      tips: [
        'Es la foto que convence de la calidad: se ve el acabado de cerca.',
        'Si apunto mal, rehace el recorte y este se recalcula.',
      ],
      processing: ['Buscando la parte mas rica...', 'Recortando el detalle...', 'Montando el fondo...'],
      eta: '~2 s',
    },
    model: {
      label: 'En modelo',
      description: 'La pieza puesta sobre una modelo IA',
      costHint: '$0.10',
      what: 'Pone TU joya sobre una modelo generada por IA, en la parte del cuerpo que corresponde segun lo que Vision detecto: orejas, cuello, mano o muneca.',
      provider: 'Modelo IA + colocacion con Flux Kontext Pro.',
      duration: '40-90 s',
      costDetail: '$0.10 ($0.055 modelo + $0.05 colocacion).',
      canFail: [
        'Es el paso mas dificil: la IA puede reinterpretar la joya sobre la piel.',
        'Si falla, los demas pasos siguen igual.',
      ],
      tips: [
        'Opcional. Si vendes solo por catalogo, apagalo y ahorras.',
        'Mira el aviso de identidad: te dice si la pieza cambio al montarla.',
      ],
      processing: ['Convocando a la modelo...', 'Colocando tu pieza...', 'Ajustando luz y sombra...'],
      eta: '~60 s tipico',
    },
    scale: {
      label: 'Foto de escala',
      description: 'Muestra el tamano real sobre una mano',
      costHint: '$0.10',
      what: 'La pieza sostenida o puesta sobre una mano, para que se entienda cuanto mide de verdad. Los anillos son lo que mas se devuelve, y la causa documentada es que el cliente no entiende el tamano.',
      provider: 'Modelo IA (mano) + colocacion con Flux Kontext Pro.',
      duration: '40-90 s',
      costDetail: '$0.10 por foto.',
      canFail: [
        'Misma dificultad que el paso En modelo: puede reinterpretar la pieza.',
      ],
      tips: [
        'Opcional, pero es de lo que mas baja las devoluciones.',
        'En anillos y aretes chicos es donde mas aporta.',
      ],
      processing: ['Preparando la mano...', 'Colocando la pieza...', 'Ajustando la proporcion...'],
      eta: '~60 s tipico',
    },
    social: {
      label: 'Listo para Instagram',
      description: 'Carrusel 4:5 y reel vertical',
      costHint: 'Gratis',
      what: 'Toma las fotos ya generadas y arma el material de Instagram: el carrusel en 1080x1350 con el margen seguro, y el reel vertical 1080x1920 con zoom lento y transiciones.',
      provider: 'sharp para el carrusel + ffmpeg para el reel. Sin IA, sin costo.',
      duration: '3-15 s',
      costDetail: 'Gratis.',
      canFail: [
        'El reel necesita ffmpeg; si el entorno no lo tiene, igual te entrega el carrusel.',
      ],
      tips: [
        'El orden de las slides no es casual: la escena de lujo va primera porque la slide 1 se lleva el 80% del resultado.',
        'Instagram admite hasta 10 slides y todas deben tener la misma proporcion.',
      ],
      processing: ['Reencuadrando a vertical...', 'Armando el carrusel...', 'Renderizando el reel...'],
      eta: '~10 s tipico',
    },
  },
  stages: {
    prepare: { label: 'Preparar', hint: 'Dejar la foto limpia y la pieza recortada' },
    generate: { label: 'Generar', hint: 'Las fotos del catalogo y de redes' },
    publish: { label: 'Publicar', hint: 'Armado listo para Instagram' },
  },
  vision: {
    heading: 'Lo que la IA ve en tu foto',
    analyzing: 'Leyendo tu pieza...',
    failed: 'No se pudo leer la ficha. El pipeline sigue igual.',
    detectedAs: (tipo) => `Detectado: ${tipo}`,
    guessed: 'Sin certeza',
    guessedHint: 'La IA no reconocio el tipo de pieza y eligio el mas comun. Revisalo antes de generar.',
    multiProduct: (n) => `${n} productos en esta foto`,
    multiProductHint: 'Se procesa como un conjunto. Si son articulos distintos, conviene subir una foto por cada uno.',
    chain: 'Cadena',
    clasp: 'Cierre',
    engraved: 'Grabado',
    changeType: 'Cambiar tipo',
  },
  social: {
    carousel: 'Carrusel',
    carouselHint: '1080x1350 (4:5). Todas las slides con la misma proporcion, margen seguro de 50 px.',
    reel: 'Reel',
    reelHint: '1080x1920 (9:16), en loop.',
    reelUnavailable: 'El reel no se pudo generar en este entorno. El carrusel esta listo.',
    slide: (n) => `Slide ${n}`,
    downloadKit: 'Descargar todo',
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
    discard: 'Not this one',
    discardTitle: 'Discard this result and go back to the previous one',
    variants: (n) => `${n} versions generated`,
    useVariant: (n) => `Use version ${n}`,
    whatIsThis: 'What does this step do?',
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
    zoomHint: 'Click to see it large, next to the original',
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
    clean: {
      label: 'Clean the photo',
      description: 'Erases price, title and watermark',
      costHint: '$0.04',
      what: 'Removes the text overlaid on the photo (name, price, watermark) and rebuilds what was behind it. It does NOT touch the product or the display: if your photo was already well shot, this step alone gives you something publishable.',
      provider: 'Flux Kontext Pro with a strict retouch instruction.',
      duration: '15-25 s',
      costDetail: '$0.04 per photo.',
      canFail: [
        'If the text sits on top of the product, rebuilding can alter that area.',
        'With a lot of text a stray letter can survive.',
      ],
      tips: [
        'Sometimes this step is all you need: download it and publish.',
        'If it erased too much, redo it — results vary between runs.',
      ],
      processing: ['Reading the text on the photo...', 'Erasing price and watermark...', 'Rebuilding the background...'],
      eta: '~20 s typical',
    },
    isolate: {
      label: 'Cut out the piece',
      description: 'Leaves the jewelry alone, no background',
      costHint: '$0.01',
      what: 'Cuts the piece out onto a transparent background. Every generated photo — packshot, luxury scene, detail and on-model — is built from this cutout.',
      provider: 'BiRefNet (fal). Chosen by measuring against 5 other providers.',
      duration: '2-5 s',
      costDetail: '$0.01 per photo.',
      canFail: [
        'On a background the same tone as the piece the edge can come out ragged.',
        'If it fails it falls back to rembg, which is much worse at jewelry.',
      ],
      tips: [
        'It runs AFTER cleaning the photo: without the text on top it is far more accurate.',
        'Tested against rembg, WithoutBG, Bria RMBG 2.0, Grounded SAM and remove.bg. BiRefNet was the only one that kept the fine chain AND the pendant texture.',
      ],
      processing: ['Separating the piece from the background...', 'Following the chain link by link...', 'Refining the edges...'],
      eta: '~4 s typical',
    },
    packshot: {
      label: 'Catalog photo',
      description: 'White background with shadow, ready to publish',
      costHint: '$0.05',
      what: 'The white-background photo marketplaces ask for: piece centred with a soft contact shadow so it does not look pasted on. This is the one you upload to your store.',
      provider: 'Flux Kontext Pro over the cutout, with the preservation guard.',
      duration: '20-40 s',
      costDetail: '$0.05 per photo.',
      canFail: [
        'If the cutout came out incomplete, it shows more here.',
        'It can reinterpret small details: in one test it turned a medal into a clasp.',
      ],
      tips: [
        'This is the main photo of your listing: check it large before accepting.',
        'If the piece changed you get an amber warning. Redo it.',
      ],
      processing: ['Preparing the white background...', 'Centring the piece...', 'Working out the shadow...'],
      eta: '~30 s typical',
    },
    luxury: {
      label: 'Luxury scene',
      description: 'Velvet, marble and warm light, for social',
      costHint: '$0.05',
      what: 'The pretty photo: your piece on velvet, marble or silk with boutique light. Necklaces and rosaries are generated hanging from an invisible neck, so the real length and drape read.',
      provider: 'Flux Kontext Pro over the cutout, with the preservation guard.',
      duration: '20-40 s',
      costDetail: '$0.05 per photo.',
      canFail: [
        'On low-contrast photos it can reinterpret the metal (gold comes out silver).',
        'The identity check flags it in amber but does not block.',
      ],
      tips: [
        'It uses the spec Vision read from your photo to anchor the result.',
        'This is slide 1 of the carousel: the one that earns the swipe.',
      ],
      processing: ['Building the scene...', 'Adjusting the warm light...', 'Polishing the reflections...'],
      eta: '~30 s typical',
    },
    macro: {
      label: 'Detail macro',
      description: 'Real zoom on the link, the stone or the clasp',
      costHint: 'Free',
      what: 'Zooms into the most substantial part of the piece against a restrained background. These are the REAL pixels of your photo: nothing here was invented by AI, which is what makes it proof of the finish.',
      provider: 'Local crop with sharp. It does NOT go through any AI.',
      duration: '1-3 s',
      costDetail: 'Free. Processed on the server.',
      canFail: [
        'If the cutout came out dirty, it can aim at the wrong spot.',
      ],
      tips: [
        'This is the photo that proves quality: the finish reads up close.',
        'If it aimed wrong, redo the cutout and this recalculates.',
      ],
      processing: ['Finding the richest part...', 'Cropping the detail...', 'Setting the background...'],
      eta: '~2 s',
    },
    model: {
      label: 'On model',
      description: 'The piece worn by an AI model',
      costHint: '$0.10',
      what: 'Puts YOUR piece on an AI-generated model, on the body part that matches what Vision detected: ears, neck, hand or wrist.',
      provider: 'AI model + placement with Flux Kontext Pro.',
      duration: '40-90 s',
      costDetail: '$0.10 ($0.055 model + $0.05 placement).',
      canFail: [
        'It is the hardest step: the AI can reinterpret the piece on skin.',
        'If it fails, the other steps carry on.',
      ],
      tips: [
        'Optional. If you only sell from a catalog, turn it off and save.',
        'Check the identity warning: it tells you whether the piece changed.',
      ],
      processing: ['Summoning the model...', 'Placing your piece...', 'Matching light and shadow...'],
      eta: '~60 s typical',
    },
    scale: {
      label: 'Scale photo',
      description: 'Shows the real size against a hand',
      costHint: '$0.10',
      what: 'The piece held or worn on a hand so the real size reads. Rings have the highest return rate in jewelry, and the documented cause is that the buyer misjudges the size.',
      provider: 'AI hand model + placement with Flux Kontext Pro.',
      duration: '40-90 s',
      costDetail: '$0.10 per photo.',
      canFail: [
        'Same difficulty as the on-model step: it can reinterpret the piece.',
      ],
      tips: [
        'Optional, but it is one of the biggest levers on returns.',
        'It matters most on rings and small earrings.',
      ],
      processing: ['Preparing the hand...', 'Placing the piece...', 'Matching the proportion...'],
      eta: '~60 s typical',
    },
    social: {
      label: 'Ready for Instagram',
      description: '4:5 carousel and vertical reel',
      costHint: 'Free',
      what: 'Takes the photos already generated and builds the Instagram material: the 1080x1350 carousel with the safe margin, and the 1080x1920 vertical reel with slow zoom and transitions.',
      provider: 'sharp for the carousel + ffmpeg for the reel. No AI, no cost.',
      duration: '3-15 s',
      costDetail: 'Free.',
      canFail: [
        'The reel needs ffmpeg; if the environment lacks it, you still get the carousel.',
      ],
      tips: [
        'The slide order is not arbitrary: the luxury scene goes first because slide 1 carries 80% of the outcome.',
        'Instagram allows up to 10 slides and they must all share the same ratio.',
      ],
      processing: ['Reframing to vertical...', 'Building the carousel...', 'Rendering the reel...'],
      eta: '~10 s typical',
    },
  },
  stages: {
    prepare: { label: 'Prepare', hint: 'Get the photo clean and the piece cut out' },
    generate: { label: 'Generate', hint: 'The catalog and social photos' },
    publish: { label: 'Publish', hint: 'Packaged for Instagram' },
  },
  vision: {
    heading: 'What AI sees in your photo',
    analyzing: 'Reading your piece...',
    failed: 'The spec could not be read. The pipeline carries on.',
    detectedAs: (tipo) => `Detected: ${tipo}`,
    guessed: 'Not sure',
    guessedHint: 'AI did not recognise the piece type and picked the most common one. Check it before generating.',
    multiProduct: (n) => `${n} products in this photo`,
    multiProductHint: 'It is processed as one set. If these are separate items, upload one photo each.',
    chain: 'Chain',
    clasp: 'Clasp',
    engraved: 'Engraved',
    changeType: 'Change type',
  },
  social: {
    carousel: 'Carousel',
    carouselHint: '1080x1350 (4:5). Every slide shares the ratio, 50 px safe margin.',
    reel: 'Reel',
    reelHint: '1080x1920 (9:16), looping.',
    reelUnavailable: 'The reel could not be generated in this environment. The carousel is ready.',
    slide: (n) => `Slide ${n}`,
    downloadKit: 'Download all',
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
