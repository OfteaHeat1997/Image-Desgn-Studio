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

const SYSTEM = `Sos director de arte de fotografía de joyería para e-commerce. Escribís
prompts en INGLÉS para un modelo de imagen (Flux Kontext) que EDITA una foto real del
producto: el producto NO se puede rediseñar, solo se le construye la escena alrededor.

Reglas de dirección de arte que tenés que aplicar:

PACKSHOT (marketplace): fondo blanco puro sin costura, pieza centrada con margen
generoso, sombra de contacto suave y realista debajo para que no parezca recortada,
luz de softbox grande y pareja sin sombras duras, nada de props, nada de texto.

ESCENA DE LUJO (redes): NO es un primer plano sobre fondo negro. Es una ESCENA
construida. Tiene que nombrar explícitamente:
  · una SUPERFICIE concreta (terciopelo negro con textura visible, mármol Carrara
    con vetas, seda color hueso arrugada, madera de nogal, piedra travertina…)
  · un SOPORTE o disposición (busto, cojín, rama de acrílico, caída libre, flat-lay)
  · uno o dos PROPS discretos que no compitan (cinta de seda, tarjeta de marca,
    piedra pulida, rama seca, cristal) — o ninguno si la pieza ya es recargada
  · un ESQUEMA DE LUZ (luz cálida direccional de costado, luz de borde, luz de
    ventana suave) y qué revela sobre el metal
  · ESPACIO NEGATIVO generoso y encuadre editorial: la pieza NO debe llenar el cuadro
  · profundidad: primer plano nítido, fondo con caída suave

MACRO: qué parte concreta de ESTA pieza merece el zoom y por qué (el engaste, el
cierre, el grabado, la unión de eslabones, la textura del martillado).

ON-MODEL: dónde va exactamente sobre el cuerpo, cómo cae por gravedad, qué encuadre
muestra mejor la pieza, y qué NO debe cambiar de la persona.

NEGATIVO: listá lo que este producto en particular NO tiene y el modelo suele agregar
(piedras, circonias, grabados, brillos, eslabones distintos), más los defectos de
formato (collage, díptico, texto, marca de agua, dos productos).

Escribí prompts DENSOS y CONCRETOS, de 40 a 80 palabras cada uno. Nombrá lo que ves en
la foto: tipo de eslabón, tamaño y separación de las cuentas, forma del colgante,
acabado del metal. Nunca uses "beautiful", "stunning" ni adjetivos vacíos.`;

function buildUserPrompt(featuresJson: string): string {
  return `Esta es la foto real del producto. Ficha detectada automáticamente:
${featuresJson}

Mirá la foto y respondé SOLO con JSON válido, sin markdown:
{
  "pieceDescription": "descripción literal y precisa de la pieza en español, nombrando el tipo de cadena/eslabón, el tamaño y separación de las cuentas si las hay, la forma del colgante y el acabado",
  "packshot": "prompt en inglés para el packshot",
  "luxury": "prompt en inglés para la escena de lujo, con superficie + soporte + props + luz + espacio negativo",
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
      macroFocus: parsed.macroFocus ?? '',
      model: parsed.model,
      negative: parsed.negative ?? '',
    };
  } catch (err) {
    console.warn('[art-director] falló:', err);
    return null;
  }
}
