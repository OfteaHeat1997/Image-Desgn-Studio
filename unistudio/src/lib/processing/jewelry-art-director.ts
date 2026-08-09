// =============================================================================
// Jewelry Art Director — prompts escritos por Claude Vision, mirando LA foto
// =============================================================================
// Hasta ahora cada paso usaba una plantilla fija por sub-tipo más un descriptor
// pegado al final ("rosario en oro acabado brillante"). Eso produce resultados
// genéricos y, peor, dirigidos por palabras que no describen ESTA pieza:
//
//   - la "escena de lujo" salía como un primer plano sobre fondo casi negro,
//     porque el prompt solo hablaba de luz y de un "backdrop carbón". Sin
//     superficie, sin props y sin espacio negativo, el modelo no tiene con qué
//     construir una escena — y devuelve un detalle.
//   - el packshot cambiaba la estructura de la cadena (de bolitas + eslabones
//     alternados a solo bolitas), porque la plantilla nunca decía cómo es la
//     cadena real.
//
// Acá Claude mira la foto y ESCRIBE el prompt de cada paso, nombrando lo que ve.
// La dirección de arte (qué hace bueno a un packshot, a una escena de lujo, a un
// macro y a un on-model) va en las instrucciones; el contenido concreto sale de
// la pieza que tenés adelante.
//
// Referencia de dirección de arte (2026): terciopelo negro con reflejos
// controlados para lujo; mármol para lifestyle/redes; props discretos (cinta de
// seda, tarjeta de marca) y ESPACIO NEGATIVO generoso; luz de softbox cenital
// para catálogo y luz de borde sobre fondo oscuro para el dramatismo editorial.
// =============================================================================

import { CLAUDE_SONNET } from '@/lib/utils/constants';
import { replicateHeaders } from '@/lib/utils/image';

export interface JewelryPromptSet {
  /** Packshot fondo blanco para marketplace. */
  packshot: string;
  /** Escena de lujo con superficie, props y espacio negativo, para redes. */
  luxury: string;
  /**
   * SOLO el decorado, sin la joya. Se genera aparte y después se le pega encima
   * el recorte real del producto: así la pieza no puede cambiar, porque nunca
   * pasa por el modelo de imagen. Es la misma razón por la que el detalle macro
   * respeta el producto — son píxeles reales.
   */
  luxuryBackdrop: string;
  /** Encuadre del macro: qué parte de la pieza merece el zoom. */
  macroFocus: string;
  /** Colocación sobre la modelo, con la anatomía y el encuadre correctos. */
  model: string;
  /** Lo que NUNCA debe aparecer o cambiar en esta pieza. */
  negative: string;
  /** Descripción literal de la pieza, para auditar qué entendió Vision. */
  pieceDescription: string;
}

/** Coste aproximado de la llamada (Sonnet con una imagen). */
export const ART_DIRECTOR_COST = 0.01;

const SYSTEM = `Sos director de arte de fotografía de joyería para UNISTYLES. Escribís
prompts en INGLÉS para un modelo de imagen que EDITA o AMBIENTA una foto real del
producto: el producto NO se puede rediseñar, solo se le construye la escena alrededor.

QUÉ ES EL PRODUCTO — esto cambia cómo se fotografía
Joyería de ACERO INOXIDABLE 316L, con acabado PVD 18K cuando corresponda.
NO es bisutería económica y NO es joyería fina de oro macizo. La imagen tiene que
comunicar el valor REAL: hacer que el acero o el PVD parezcan oro macizo es
falsear el producto. Buscamos "boutique contemporánea + joyería moderna + lujo
accesible", y que transmita elegancia, seguridad, feminidad, modernidad, calidad
y fuerza.

PALETA DE LA MARCA — respetala siempre
USAR: negro elegante, marfil, crema, champagne, beige piedra, reflejos metálicos,
dorado solo como ACENTO.
EVITAR: neón, fondos rosados, decoración infantil, glitter, dorado amarillo
artificial, fondos saturados y la estética genérica de marketplace.

METALES
· Dorado PVD 18K: tono cálido, metálico, sofisticado. NUNCA amarillo intenso ni
  brillo plástico. Los reflejos tienen que dejar ver textura, volumen y construcción.
· Plateado: la luz tiene que SEPARAR el metal del fondo. Nunca blanco puro, que se
  come los bordes. Marfil ligeramente cálido, gris piedra muy claro, champagne
  neutro, o negro para editorial. Sin tonos azules artificiales.

PACKSHOT (catálogo, función comercial): fondo limpio en MARFIL, CREMA MUY CLARO o
CHAMPAGNE NEUTRO — NO blanco puro. La pieza ocupa espacio suficiente para apreciar
el detalle. Iluminación profesional, nitidez alta, reflejos metálicos controlados,
sombra muy suave, composición minimalista. NADA de decoración alrededor, nada de
texto.

ESCENA EDITORIAL (redes): composición premium con elementos DISCRETOS — piedra
clara, mármol muy sutil, pedestal, superficie negra mate, vidrio, tela satinada,
sombras arquitectónicas, superficies champagne. La decoración APOYA la joya, nunca
compite: la pieza sigue siendo el punto de mayor atención. Nombrá SUPERFICIE +
disposición + uno o dos props + esquema de luz + ESPACIO NEGATIVO generoso +
profundidad de campo.

ESCENA EDITORIAL — VERSIÓN DECORADO: la MISMA escena pero SIN la joya. Solo la
superficie, los props, la luz y la composición, dejando libre la zona central.
Terminá siempre con "no jewelry, no product, empty center". Este prompt genera el
fondo solo, y el producto real se compone encima.

MACRO: qué parte concreta de ESTA pieza demuestra calidad — textura, piedras,
cierre, eslabones, terminaciones, grabados. NO inventar detalles que no estén.

LIFESTYLE / ON-MODEL: sirve para entender ESCALA y USO. Encuadre por tipo de pieza:
· collares y rosarios → cuello y clavícula
· aretes → oreja, mandíbula y parte del rostro cuando corresponda
· pulseras → muñeca y mano
· anillos → mano y dedos
La joya conserva EXACTAMENTE diseño, tamaño relativo, grosor, piedras, color y
estructura. La piel conserva textura natural: nada de retoque plástico ni piel
de muñeca.

NEGATIVO: listá lo que ESTE producto no tiene y el modelo suele agregar (piedras,
circonias, grabados, eslabones distintos), el falseo de material (solid gold,
yellow gold, plastic shine, blue-tinted silver), la paleta prohibida (neon, pink
background, glitter, saturated background) y los defectos de formato (collage,
díptico, texto, marca de agua, dos productos, logo redibujado).

COHERENCIA: todas las fotos de la categoría tienen que parecer de la misma sesión.
No diseñes cada producto como una campaña aparte.

Escribí prompts DENSOS y CONCRETOS, de 40 a 80 palabras. Nombrá lo que ves: tipo de
eslabón, tamaño y separación de las cuentas, forma del colgante, acabado del metal.
Nunca uses "beautiful", "stunning" ni adjetivos vacíos.`;

function buildUserPrompt(featuresJson: string): string {
  return `Esta es la foto real del producto. Ficha detectada automáticamente:
${featuresJson}

Mirá la foto y respondé SOLO con JSON válido, sin markdown:
{
  "pieceDescription": "descripción literal y precisa de la pieza en español, nombrando el tipo de cadena/eslabón, el tamaño y separación de las cuentas si las hay, la forma del colgante y el acabado",
  "packshot": "prompt en inglés para el packshot",
  "luxury": "prompt en inglés para la escena de lujo, con superficie + soporte + props + luz + espacio negativo",
  "luxuryBackdrop": "el MISMO decorado pero SIN la joya, terminando en 'no jewelry, no product, empty center'",
  "macroFocus": "prompt en inglés que nombre qué parte de ESTA pieza hay que acercar",
  "model": "prompt en inglés para la colocación sobre la modelo",
  "negative": "lista en inglés, separada por comas, de lo que NO debe aparecer ni cambiar"
}`;
}

async function imageToBase64(
  imageUrl: string,
): Promise<{ mediaType: string; data: string } | null> {
  try {
    if (imageUrl.startsWith('data:')) {
      const m = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      return m ? { mediaType: m[1], data: m[2] } : null;
    }
    const r = await fetch(imageUrl, { headers: replicateHeaders(imageUrl) });
    if (!r.ok) return null;
    return {
      mediaType: r.headers.get('content-type') || 'image/jpeg',
      data: Buffer.from(await r.arrayBuffer()).toString('base64'),
    };
  } catch {
    return null;
  }
}

/**
 * Pide a Claude Vision el juego de prompts para ESTA pieza.
 *
 * Devuelve `null` si no hay API key o si la respuesta no es usable — el pipeline
 * cae entonces a las plantillas por sub-tipo, que siguen funcionando. Nunca
 * bloquea: un prompt mejor es una mejora, no un requisito.
 */
export async function directJewelryPrompts(
  imageUrl: string,
  features: unknown,
): Promise<JewelryPromptSet | null> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) return null;

  const img = await imageToBase64(imageUrl);
  if (!img) return null;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_SONNET,
        max_tokens: 1600,
        system: SYSTEM,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: img.mediaType, data: img.data },
              },
              { type: 'text', text: buildUserPrompt(JSON.stringify(features ?? {})) },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      console.warn('[art-director] HTTP', res.status);
      return null;
    }

    const data = await res.json();
    const text = String(data?.content?.[0]?.text ?? '');
    // El modelo a veces envuelve el JSON en ```json … ```
    const jsonText = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(jsonText) as Partial<JewelryPromptSet>;

    if (!parsed.packshot || !parsed.luxury || !parsed.model) return null;

    return {
      pieceDescription: parsed.pieceDescription ?? '',
      packshot: parsed.packshot,
      luxury: parsed.luxury,
      luxuryBackdrop: parsed.luxuryBackdrop ?? '',
      macroFocus: parsed.macroFocus ?? '',
      model: parsed.model,
      negative: parsed.negative ?? '',
    };
  } catch (err) {
    console.warn('[art-director] falló:', err);
    return null;
  }
}
