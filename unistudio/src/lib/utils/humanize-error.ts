// =============================================================================
// humanize-error — turns technical API errors into friendly Spanish messages
// for end users. Keep the original under the hood for debugging.
// =============================================================================

export interface HumanError {
  /** Friendly Spanish message to show the user */
  message: string;
  /** Original technical error for "ver detalle" / logs */
  raw: string;
  /** Whether retrying this is likely to succeed */
  retryable: boolean;
}

export function humanizeError(err: unknown): HumanError {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();

  // Content moderation hits
  if (
    lower.includes('content_policy_violation') ||
    lower.includes('partner_validation_failed') ||
    lower.includes('flagged as sensitive') ||
    lower.includes('e005')
  ) {
    return {
      message:
        'El IA no pudo procesar esta imagen por su filtro de contenido. ' +
        'Probá con otra foto o reintenta — a veces funciona al segundo intento.',
      raw,
      retryable: true,
    };
  }

  // Vercel body-size rejection (HTML response)
  if (lower.includes('request body too large') || lower.includes('payload too large')) {
    return {
      message:
        'La imagen es muy pesada para procesar directamente. Comprimila a menos de 4MB o usa otra foto más liviana.',
      raw,
      retryable: false,
    };
  }

  // Timeouts
  if (
    lower.includes('timeout') ||
    lower.includes('timed out') ||
    lower.includes('504') ||
    lower.includes('gateway timeout')
  ) {
    return {
      message:
        'El paso tardó demasiado y se cortó. Reintenta — generalmente funciona a la segunda.',
      raw,
      retryable: true,
    };
  }

  // Rate limits
  if (lower.includes('429') || lower.includes('rate limit') || lower.includes('too many requests')) {
    return {
      message:
        'Demasiadas solicitudes muy rápido. Esperá unos segundos y reintenta.',
      raw,
      retryable: true,
    };
  }

  // Auth issues
  if (lower.includes('401') || lower.includes('auth_missing') || lower.includes('unauthorized')) {
    return {
      message:
        'Falta o está mal una clave de API. Avisa al admin para revisar las variables de entorno.',
      raw,
      retryable: false,
    };
  }

  // Unparseable JSON — almost always means Vercel returned HTML
  if (lower.includes("unexpected token 'a'") || lower.includes('is not valid json')) {
    return {
      message:
        'El servidor devolvió un error interno (probable timeout o imagen muy pesada). Reintenta o usa una imagen más pequeña.',
      raw,
      retryable: true,
    };
  }

  // Network / CORS / download failures
  if (lower.includes('fetch failed') || lower.includes('network') || lower.includes('404')) {
    return {
      message:
        'No se pudo acceder a una imagen o al servicio. Verifica tu conexión y reintenta.',
      raw,
      retryable: true,
    };
  }

  // Provider-specific (fal, replicate)
  if (lower.includes('fal.ai') || lower.includes('fal storage')) {
    return {
      message:
        'fal.ai tuvo un problema temporal. Reintenta en un momento.',
      raw,
      retryable: true,
    };
  }
  if (lower.includes('replicate')) {
    return {
      message:
        'Replicate tuvo un problema temporal. Reintenta en un momento.',
      raw,
      retryable: true,
    };
  }

  // Generic fallback — show the first 140 chars of the raw message, but
  // strip leading stack-trace-ish junk
  const cleaned = raw
    .replace(/^Error:\s*/, '')
    .replace(/^[A-Z][a-zA-Z]+Error:\s*/, '')
    .slice(0, 140);
  return {
    message: cleaned || 'Ocurrió un error inesperado. Reintenta.',
    raw,
    retryable: true,
  };
}
