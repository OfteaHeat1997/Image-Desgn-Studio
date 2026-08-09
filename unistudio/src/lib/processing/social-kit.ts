// =============================================================================
// Social Kit Processing Module - UniStudio
// =============================================================================
// Toma las fotos que el pipeline ya generó y arma el material listo para
// Instagram: el carrusel 4:5 y el reel 9:16.
//
// MEDIDAS (Instagram 2026, verificadas 2026-08-09)
// -----------------------------------------------
//   Carrusel/feed : 1080x1350 (4:5). El vertical ocupa más pantalla y rinde
//                   más que el cuadrado. TODAS las slides deben compartir la
//                   proporción — la primera fija el formato del post y si
//                   mezclás, Instagram recorta y te rompe el diseño.
//   Grilla perfil : del 4:5 solo se ve el centro 1012x1350 → lo importante va
//                   centrado.
//   Margen seguro : >= 50 px de cada borde.
//   Reel/Story    : 1080x1920 (9:16).
//
// POR QUÉ EL REEL SE ARMA CON FFMPEG Y NO CON IA
// ----------------------------------------------
// `ffmpeg-static` ya estaba instalado en el proyecto y declarado en
// `serverExternalPackages`, pero ningún archivo de src/ lo usaba. Armar el reel
// localmente cuesta $0 y es determinista — frente a ~$0.05-0.35 y un resultado
// distinto en cada corrida si lo generara un modelo de video. Para un montaje
// de fotos que ya existen, la IA no aporta nada.
// =============================================================================

import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { urlToBuffer } from '@/lib/utils/image';

export const CAROUSEL_W = 1080;
export const CAROUSEL_H = 1350;
export const REEL_W = 1080;
export const REEL_H = 1920;
/** Margen mínimo desde cada borde para que nada quede recortado en la grilla. */
export const SAFE_MARGIN = 50;

export interface SocialKitOptions {
  /**
   * Fondo de relleno cuando la foto no llena el lienzo vertical.
   * 'auto' (default) muestrea el borde de CADA foto y rellena con ese color, de
   * modo que la banda no se note. Rellenar con blanco fijo una foto de fondo
   * negro deja dos franjas blancas arriba y abajo — se ve amateur y fue lo
   * primero que saltó al probarlo.
   */
  background?: 'auto' | 'white' | 'black' | 'warm-gray';
  /** Segundos que dura cada foto en el reel (sin contar la transición). */
  secondsPerSlide?: number;
  /** Duración del crossfade entre fotos. */
  transitionSeconds?: number;
  /** Generar el reel además del carrusel. */
  includeReel?: boolean;
}

export interface SocialKitResult {
  /** Slides del carrusel, en orden, como data URLs 1080x1350. */
  carousel: string[];
  /** Reel 1080x1920 como data URL mp4, o null si no se pidió / falló. */
  reel: string | null;
  /** Motivo por el que no hay reel, para poder mostrarlo en la UI. */
  reelError?: string;
}

type Rgb = { r: number; g: number; b: number };

const BG_COLOR: Record<'white' | 'black' | 'warm-gray', Rgb> = {
  white: { r: 255, g: 255, b: 255 },
  black: { r: 12, g: 12, b: 14 },
  'warm-gray': { r: 58, g: 54, b: 50 },
};

/**
 * Color medio del BORDE de la foto (marco de 24 px). Se usa para rellenar el
 * lienzo vertical con el mismo tono que ya tiene la imagen, en vez de meter una
 * franja de color plano que delate el reencuadre.
 */
async function sampleEdgeColor(buffer: Buffer): Promise<Rgb> {
  const N = 48;
  const { data } = await sharp(buffer)
    .removeAlpha()
    .resize(N, N, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Solo las 4 ESQUINAS, no el marco entero. Promediar todo el borde mezcla el
  // fondo con lo que asome del producto o del exhibidor: en la foto del rosario
  // el marco tocaba los pedestales blancos y el promedio salía gris, dejando un
  // recuadro visible alrededor de una foto de fondo negro. Las esquinas son la
  // parte que casi siempre es fondo puro.
  const band = 7;
  const patches: Rgb[] = [];
  const corners: Array<[number, number]> = [
    [0, 0], [N - band, 0], [0, N - band], [N - band, N - band],
  ];
  for (const [x0, y0] of corners) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = y0; y < y0 + band; y++) {
      for (let x = x0; x < x0 + band; x++) {
        const i = (y * N + x) * 3;
        r += data[i]; g += data[i + 1]; b += data[i + 2];
        n++;
      }
    }
    patches.push({ r: r / n, g: g / n, b: b / n });
  }

  // Mediana por canal: si una esquina cae sobre el producto, no arrastra el resto.
  const median = (vals: number[]) => {
    const s = [...vals].sort((a, b2) => a - b2);
    return Math.round((s[1] + s[2]) / 2);
  };
  return {
    r: median(patches.map((p) => p.r)),
    g: median(patches.map((p) => p.g)),
    b: median(patches.map((p) => p.b)),
  };
}

/**
 * Encaja una foto en el lienzo vertical SIN recortar el producto.
 *
 * `fit: 'contain'` en vez de 'cover' a propósito: recortar para llenar es lo que
 * decapita productos altos y corta cadenas largas. Se rellena con color plano y
 * se deja el margen seguro, que es lo que pide la especificación de la grilla.
 */
async function fitToCanvas(
  buffer: Buffer,
  width: number,
  height: number,
  background: NonNullable<SocialKitOptions['background']>,
): Promise<Buffer> {
  const pad: Rgb =
    background === 'auto' ? await sampleEdgeColor(buffer) : BG_COLOR[background];
  const inner = await sharp(buffer)
    .resize(width - SAFE_MARGIN * 2, height - SAFE_MARGIN * 2, {
      fit: 'inside',
      withoutEnlargement: false,
    })
    .toBuffer();

  const meta = await sharp(inner).metadata();
  const w = meta.width ?? width;
  const h = meta.height ?? height;

  return sharp({
    create: { width, height, channels: 3, background: pad },
  })
    .composite([
      { input: inner, left: Math.round((width - w) / 2), top: Math.round((height - h) / 2) },
    ])
    .jpeg({ quality: 92 })
    .toBuffer();
}

/**
 * Encuentra un ffmpeg ejecutable en ESTE entorno.
 *
 * `ffmpeg-static` descarga el binario de la plataforma donde corrió el install.
 * En este repo el que quedó en node_modules es el de Linux (ELF), que es el
 * correcto para Vercel pero no arranca en un Windows de desarrollo — el síntoma
 * era `spawn ffmpeg.exe ENOENT`, porque el paquete busca el `.exe` y solo existe
 * el binario sin extensión. Por eso se prueba, en orden: la variable de entorno,
 * lo que reporte el paquete, los dos nombres posibles dentro del paquete, y por
 * último un ffmpeg del PATH del sistema.
 */
async function resolveFfmpeg(): Promise<string | null> {
  const fromEnv = process.env.FFMPEG_PATH?.trim();
  if (fromEnv) return fromEnv;

  const isWin = process.platform === 'win32';

  let pkgPath: string | null = null;
  try {
    pkgPath = ((await import('ffmpeg-static')).default as unknown as string) ?? null;
  } catch {
    pkgPath = null;
  }

  const candidates: string[] = [];
  if (pkgPath) {
    candidates.push(pkgPath);
    // El paquete asume `ffmpeg.exe` en Windows; probamos también el otro nombre.
    const dir = path.dirname(pkgPath);
    candidates.push(path.join(dir, isWin ? 'ffmpeg' : 'ffmpeg.exe'));
  }

  for (const c of candidates) {
    try {
      await fs.access(c);
      // Un binario de otra plataforma existe pero no ejecuta; se comprueba de verdad.
      await runFfmpeg(c, ['-version']);
      return c;
    } catch {
      /* siguiente candidato */
    }
  }

  // Último recurso: un ffmpeg instalado en el sistema.
  try {
    await runFfmpeg('ffmpeg', ['-version']);
    return 'ffmpeg';
  } catch {
    return null;
  }
}

/** Ejecuta ffmpeg y resuelve con su stderr (donde escribe el log). */
function runFfmpeg(binary: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(binary, args);
    let stderr = '';
    proc.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve(stderr);
      else reject(new Error(`ffmpeg salió con código ${code}: ${stderr.slice(-500)}`));
    });
  });
}

/**
 * Arma el reel vertical a partir de las fotos.
 *
 * Cada foto recibe un zoom lento (Ken Burns) y se encadenan con crossfade. El
 * movimiento no es decorativo: la investigación de 2026 es explícita en que los
 * primeros 3 segundos deciden la distribución del reel, y que en joyería el
 * movimiento es lo que muestra el brillo y el peso del metal — cosa que una
 * foto fija no puede.
 */
async function buildReel(
  frames: Buffer[],
  opts: Required<Pick<SocialKitOptions, 'secondsPerSlide' | 'transitionSeconds' | 'background'>>,
): Promise<string> {
  const ffmpegPath = await resolveFfmpeg();
  if (!ffmpegPath) {
    throw new Error(
      'No se encontró un binario de ffmpeg utilizable. En Vercel viene con ffmpeg-static; ' +
        'en local, instalá ffmpeg o seteá FFMPEG_PATH.',
    );
  }

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'unistudio-reel-'));
  try {
    const fps = 30;
    const slide = opts.secondsPerSlide;
    const trans = opts.transitionSeconds;

    // Cada foto al lienzo del reel antes de entrar a ffmpeg: así el filtro solo
    // se ocupa del movimiento y no de reescalar, que es donde ffmpeg tiembla.
    const paths: string[] = [];
    for (let i = 0; i < frames.length; i++) {
      const canvas = await fitToCanvas(frames[i], REEL_W, REEL_H, opts.background);
      const p = path.join(dir, `f${i}.jpg`);
      await fs.writeFile(p, canvas);
      paths.push(p);
    }

    const args: string[] = [];
    for (const p of paths) args.push('-loop', '1', '-t', String(slide), '-i', p);

    // zoompan por foto (zoom lento hacia el centro) y luego xfade encadenado.
    const filters: string[] = [];
    const d = Math.round(slide * fps);
    for (let i = 0; i < paths.length; i++) {
      filters.push(
        `[${i}:v]scale=${REEL_W * 2}:${REEL_H * 2},` +
          `zoompan=z='min(zoom+0.0009,1.12)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':` +
          `d=${d}:s=${REEL_W}x${REEL_H}:fps=${fps},setsar=1[v${i}]`,
      );
    }

    let last = 'v0';
    for (let i = 1; i < paths.length; i++) {
      const offset = (slide - trans) * i - trans * (i - 1) * 0 + (slide - trans) * 0;
      // offset acumulado: cada corte ocurre `slide - trans` despues del anterior.
      const at = (slide - trans) * i;
      const out = i === paths.length - 1 ? 'vout' : `x${i}`;
      filters.push(
        `[${last}][v${i}]xfade=transition=fade:duration=${trans}:offset=${at.toFixed(3)}[${out}]`,
      );
      last = out;
      void offset;
    }
    if (paths.length === 1) filters.push('[v0]null[vout]');

    const outPath = path.join(dir, 'reel.mp4');
    args.push(
      '-filter_complex', filters.join(';'),
      '-map', '[vout]',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-r', String(fps),
      '-movflags', '+faststart',
      '-y', outPath,
    );

    await runFfmpeg(ffmpegPath, args);
    const mp4 = await fs.readFile(outPath);
    return `data:video/mp4;base64,${mp4.toString('base64')}`;
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Genera el kit de redes a partir de las fotos ya producidas por el pipeline.
 *
 * El ORDEN de `imageUrls` importa y lo decide quien llama: la investigación de
 * 2026 dice que la primera slide se lleva el 80% del resultado (es la que gana
 * el swipe) y que el engagement baja después de la slide 3. Por eso el pipeline
 * manda la escena de lujo primero y deja la prueba de calidad en el medio.
 */
export async function buildSocialKit(
  imageUrls: string[],
  options: SocialKitOptions = {},
): Promise<SocialKitResult> {
  if (imageUrls.length === 0) {
    throw new Error('Se necesita al menos una foto para armar el kit de redes.');
  }

  const background = options.background ?? 'auto';
  const secondsPerSlide = Math.min(Math.max(options.secondsPerSlide ?? 1.6, 0.8), 4);
  const transitionSeconds = Math.min(Math.max(options.transitionSeconds ?? 0.4, 0.1), 1);

  const buffers: Buffer[] = [];
  for (const url of imageUrls) {
    buffers.push(await urlToBuffer(url));
  }

  const carousel: string[] = [];
  for (const buf of buffers) {
    const slide = await fitToCanvas(buf, CAROUSEL_W, CAROUSEL_H, background);
    carousel.push(`data:image/jpeg;base64,${slide.toString('base64')}`);
  }

  let reel: string | null = null;
  let reelError: string | undefined;
  if (options.includeReel !== false) {
    try {
      reel = await buildReel(buffers, { secondsPerSlide, transitionSeconds, background });
    } catch (err) {
      // El carrusel es el entregable principal; si ffmpeg falla en este entorno
      // se devuelve igual, con el motivo, en vez de tumbar todo el paso.
      reelError = err instanceof Error ? err.message : String(err);
      console.warn('[social-kit] reel falló:', reelError);
    }
  }

  return { carousel, reel, reelError };
}
