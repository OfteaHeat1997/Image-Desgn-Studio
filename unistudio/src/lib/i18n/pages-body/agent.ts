// =============================================================================
// Agent page — body copy (ES / EN)
// =============================================================================
// Decoupled i18n for the VISIBLE BODY of src/app/agent/page.tsx.
// The page header stays on t.pages.agent.* — this file only covers the body.
//
//   const b = locale === 'en' ? AGENT_BODY_EN : AGENT_BODY_ES;
//   <h2>{b.upload.heading}</h2>
//
// ES is the current Spanish, byte-for-byte (Argentine voice: querés, elegí, Subí).
// EN is natural professional English (no AI model names, second person).
// =============================================================================

export interface AgentBodyCopy {
  /** Category options — keyed by CategoryOption.id. */
  categories: Record<
    string,
    {
      label: string;
      description: string;
    }
  >;
  /** Pipeline family labels — keyed by PipelineFamily. */
  families: {
    lingerie: string;
    'static-product': string;
    jewelry: string;
  };
  upload: {
    heading: string;
    detectedBadge: string;
    imageAlt: string;
    uploadButton: string;
    analyzing: string;
    hint: string;
  };
  grid: {
    heading: string;
    autoTag: string;
    familyArrow: (label: string) => string;
  };
  cta: {
    button: string;
  };
  toasts: {
    detected: (label: string) => string;
    detectionTimeout: string;
    pickCategoryFirst: string;
  };
}

export const AGENT_BODY_ES: AgentBodyCopy = {
  categories: {
    'lingerie-bra': {
      label: 'Bras / Brasiere',
      description: 'Quita la modelo original y pone el bra en una modelo IA',
    },
    'lingerie-panty': {
      label: 'Panties',
      description: 'Quita la modelo original y pone el panty en una modelo IA',
    },
    'lingerie-shapewear': {
      label: 'Shapewear / Faja',
      description: 'Fajas, bodysuits — mismo flow de lencería con categoría correcta',
    },
    'static-perfume': {
      label: 'Perfumes / Colonias',
      description: 'Fondo gradient premium (estilo Sephora) o pastel juvenil',
    },
    'static-cream': {
      label: 'Cremas / Skincare',
      description: 'Mármol blanco (anti-age) o beige spa (hidratantes)',
    },
    'static-sunscreen': {
      label: 'Bloqueador solar',
      description: 'Playa desenfocada estilo Coppertone',
    },
    'static-deodorant': {
      label: 'Desodorantes / Talcos',
      description: 'Degradado gris neutro product-shot clean',
    },
    'static-facial': {
      label: 'Limpieza facial',
      description: 'Fondo azul/blanco spa estilo La Roche-Posay',
    },
    'static-makeup': {
      label: 'Maquillaje',
      description: 'Negro mate dramático estilo MAC',
    },
    'jewelry-earrings': {
      label: 'Aretes / Topos / Candongas',
      description: 'Estante de terciopelo + foto en orejas de modelo + video',
    },
    'jewelry-necklace': {
      label: 'Cadenas / Collares',
      description: 'Busto de cuero + foto en cuello de modelo + video',
    },
    'jewelry-ring': {
      label: 'Anillos',
      description: 'Cojín de seda + foto en mano + video',
    },
    'jewelry-bracelet': {
      label: 'Pulseras',
      description: 'Base de madera + foto en muñeca + video',
    },
    'jewelry-set': {
      label: 'Sets (combo)',
      description: 'Mármol blanco + foto torso mostrando combo + video',
    },
  },
  families: {
    lingerie: 'Pipeline de Lencería',
    'static-product': 'Pipeline de Estáticos',
    jewelry: 'Pipeline de Joyería',
  },
  upload: {
    heading: 'Subir foto (opcional — auto-detecta lencería)',
    detectedBadge: 'Detectado',
    imageAlt: 'Subida',
    uploadButton: 'Subir',
    analyzing: 'Analizando la foto...',
    hint: 'Si subís una foto con prenda de lencería, la detecto automáticamente. Para perfumes, cremas o joyería, elegí la categoría manualmente abajo.',
  },
  grid: {
    heading: 'O elegí la categoría',
    autoTag: 'AUTO',
    familyArrow: (label) => `→ ${label}`,
  },
  cta: {
    button: 'Ir al pipeline',
  },
  toasts: {
    detected: (label) => `Detectado: ${label}`,
    detectionTimeout: 'La detección automática tardó demasiado — elegí la categoría manualmente abajo.',
    pickCategoryFirst: 'Elegí una categoría primero.',
  },
};

export const AGENT_BODY_EN: AgentBodyCopy = {
  categories: {
    'lingerie-bra': {
      label: 'Bras',
      description: 'Removes the original model and puts the bra on an AI model',
    },
    'lingerie-panty': {
      label: 'Panties',
      description: 'Removes the original model and puts the panty on an AI model',
    },
    'lingerie-shapewear': {
      label: 'Shapewear',
      description: 'Shapewear and bodysuits — same lingerie flow with the right category',
    },
    'static-perfume': {
      label: 'Perfumes / Colognes',
      description: 'Premium gradient background (Sephora style) or youthful pastel',
    },
    'static-cream': {
      label: 'Creams / Skincare',
      description: 'White marble (anti-aging) or spa beige (moisturizers)',
    },
    'static-sunscreen': {
      label: 'Sunscreen',
      description: 'Blurred beach, Coppertone style',
    },
    'static-deodorant': {
      label: 'Deodorants / Powders',
      description: 'Neutral grey gradient, clean product shot',
    },
    'static-facial': {
      label: 'Facial cleansers',
      description: 'Blue/white spa background, La Roche-Posay style',
    },
    'static-makeup': {
      label: 'Makeup',
      description: 'Dramatic matte black, MAC style',
    },
    'jewelry-earrings': {
      label: 'Earrings / Studs / Hoops',
      description: 'Velvet stand + shot on a model’s ears + video',
    },
    'jewelry-necklace': {
      label: 'Chains / Necklaces',
      description: 'Leather bust + shot on a model’s neck + video',
    },
    'jewelry-ring': {
      label: 'Rings',
      description: 'Silk cushion + shot on a hand + video',
    },
    'jewelry-bracelet': {
      label: 'Bracelets',
      description: 'Wood base + shot on a wrist + video',
    },
    'jewelry-set': {
      label: 'Sets (combo)',
      description: 'White marble + torso shot showing the combo + video',
    },
  },
  families: {
    lingerie: 'Lingerie Pipeline',
    'static-product': 'Static Product Pipeline',
    jewelry: 'Jewelry Pipeline',
  },
  upload: {
    heading: 'Upload a photo (optional — auto-detects lingerie)',
    detectedBadge: 'Detected',
    imageAlt: 'Upload',
    uploadButton: 'Upload',
    analyzing: 'Analyzing the photo...',
    hint: 'If you upload a photo with a lingerie garment, it gets detected automatically. For perfumes, creams or jewelry, pick the category manually below.',
  },
  grid: {
    heading: 'Or pick the category',
    autoTag: 'AUTO',
    familyArrow: (label) => `→ ${label}`,
  },
  cta: {
    button: 'Go to pipeline',
  },
  toasts: {
    detected: (label) => `Detected: ${label}`,
    detectionTimeout: 'Automatic detection took too long — pick the category manually below.',
    pickCategoryFirst: 'Pick a category first.',
  },
};
