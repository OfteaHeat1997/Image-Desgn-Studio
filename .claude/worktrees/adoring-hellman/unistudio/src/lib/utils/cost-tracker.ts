// =============================================================================
// Cost Tracker Utility - UniStudio
// Client-side cost tracking using localStorage.
// =============================================================================

const STORAGE_KEY = 'unistudio_cost_tracker';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface CostEntry {
  operation: string;
  provider: string;
  cost: number;
  timestamp: number; // Unix timestamp in ms
}

interface CostData {
  entries: CostEntry[];
  totalCost: number;
}

// -----------------------------------------------------------------------------
// Internal helpers
// -----------------------------------------------------------------------------

function loadData(): CostData {
  if (typeof window === 'undefined') {
    return { entries: [], totalCost: 0 };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { entries: [], totalCost: 0 };

    const parsed = JSON.parse(raw) as CostData;
    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      totalCost: typeof parsed.totalCost === 'number' ? parsed.totalCost : 0,
    };
  } catch {
    return { entries: [], totalCost: 0 };
  }
}

function saveData(data: CostData): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage may be full or unavailable; silently fail
    console.warn('[cost-tracker] Failed to persist cost data to localStorage');
  }
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Track a cost entry for an operation.
 *
 * @param operation - The operation name (e.g. "bg-remove", "upscale").
 * @param provider - The provider used (e.g. "replicate", "browser").
 * @param cost - The cost in USD.
 */
export function trackCost(
  operation: string,
  provider: string,
  cost: number,
): void {
  const data = loadData();

  const entry: CostEntry = {
    operation,
    provider,
    cost,
    timestamp: Date.now(),
  };

  data.entries.push(entry);
  data.totalCost += cost;

  saveData(data);
}

/**
 * Get the total accumulated cost across all operations.
 *
 * @returns The total cost in USD.
 */
export function getTotalCost(): number {
  return loadData().totalCost;
}

/**
 * Get costs grouped by operation name.
 *
 * @returns An object mapping operation names to their total cost in USD.
 *
 * @example
 * ```ts
 * getCostsByOperation();
 * // { "bg-remove": 0.15, "upscale": 0.03, "tryon": 0.075 }
 * ```
 */
export function getCostsByOperation(): Record<string, number> {
  const data = loadData();
  const result: Record<string, number> = {};

  for (const entry of data.entries) {
    result[entry.operation] = (result[entry.operation] ?? 0) + entry.cost;
  }

  return result;
}

/**
 * Get costs grouped by day (YYYY-MM-DD).
 *
 * @returns An array of objects with date and cost, sorted chronologically.
 *
 * @example
 * ```ts
 * getCostsByDay();
 * // [{ date: "2026-02-21", cost: 0.05 }, { date: "2026-02-22", cost: 0.12 }]
 * ```
 */
export function getCostsByDay(): { date: string; cost: number }[] {
  const data = loadData();
  const dayMap: Record<string, number> = {};

  for (const entry of data.entries) {
    const date = new Date(entry.timestamp).toISOString().split('T')[0];
    dayMap[date] = (dayMap[date] ?? 0) + entry.cost;
  }

  return Object.entries(dayMap)
    .map(([date, cost]) => ({ date, cost }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Reset all tracked costs, clearing the localStorage data.
 */
export function resetCosts(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Silently fail
  }
}
