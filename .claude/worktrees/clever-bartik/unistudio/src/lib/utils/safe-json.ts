/**
 * Safe JSON parser for fetch responses.
 * Handles cases where the server returns non-JSON text (e.g. "Request Entity Too Large").
 * Use instead of `res.json()` to avoid "Unexpected token" crashes.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    const preview = text.length > 120 ? text.slice(0, 120) + "..." : text;
    throw new Error(preview || `HTTP ${res.status} ${res.statusText}`);
  }
}
