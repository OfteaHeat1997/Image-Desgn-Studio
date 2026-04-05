'use client';

// =============================================================================
// useApiCost Hook - UniStudio
// Provides reactive cost tracking using the cost-tracker utility and
// the settings-store for centralized state.
// =============================================================================

import { useState, useCallback, useEffect } from 'react';
import {
  trackCost as trackCostUtil,
  getTotalCost,
  getCostsByOperation,
  getCostsByDay,
  resetCosts as resetCostsUtil,
} from '@/lib/utils/cost-tracker';
import { useSettingsStore } from '@/stores/settings-store';
import type { ApiProvider } from '@/types/api';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface UseApiCostReturn {
  /** Total cost in USD across all operations. */
  totalCost: number;
  /** Costs grouped by operation name. */
  costsByOperation: Record<string, number>;
  /** Costs grouped by day (YYYY-MM-DD). */
  costsByDay: { date: string; cost: number }[];
  /** Track a new cost entry. Also syncs to the settings store. */
  addCost: (operation: string, provider: string, cost: number) => void;
  /** Reset all cost data in both localStorage and the settings store. */
  resetCosts: () => void;
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

/**
 * Hook for tracking and querying API costs.
 *
 * Combines the localStorage-based cost-tracker utility with the Zustand
 * settings store for a reactive interface that updates the UI whenever
 * costs change.
 *
 * @example
 * ```tsx
 * const { totalCost, costsByOperation, addCost, resetCosts } = useApiCost();
 *
 * // Track a cost after an operation completes
 * addCost('bg-remove', 'replicate', 0.01);
 *
 * // Display total
 * <span>${totalCost.toFixed(2)}</span>
 * ```
 */
export function useApiCost(): UseApiCostReturn {
  const settingsAddCost = useSettingsStore((s) => s.addCost);
  const settingsResetCosts = useSettingsStore((s) => s.resetCosts);

  // Local reactive state synced from localStorage
  const [totalCost, setTotalCost] = useState(0);
  const [costsByOperation, setCostsByOperation] = useState<Record<string, number>>({});
  const [costsByDay, setCostsByDay] = useState<{ date: string; cost: number }[]>([]);

  // Refresh local state from localStorage
  const refresh = useCallback(() => {
    setTotalCost(getTotalCost());
    setCostsByOperation(getCostsByOperation());
    setCostsByDay(getCostsByDay());
  }, []);

  // Load initial data on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  /**
   * Track a new cost entry. Updates both the localStorage-based tracker
   * and the Zustand settings store.
   */
  const addCost = useCallback(
    (operation: string, provider: string, cost: number) => {
      // Persist to localStorage
      trackCostUtil(operation, provider, cost);

      // Sync to the Zustand settings store (for global state consumers)
      settingsAddCost({
        operation,
        provider: provider as ApiProvider,
        cost, // dollars — settings store OperationCost.cost is in dollars
        imageId: null,
      });

      // Refresh reactive state
      refresh();
    },
    [settingsAddCost, refresh],
  );

  /**
   * Reset all tracked costs.
   */
  const resetCosts = useCallback(() => {
    resetCostsUtil();
    settingsResetCosts();
    refresh();
  }, [settingsResetCosts, refresh]);

  return {
    totalCost,
    costsByOperation,
    costsByDay,
    addCost,
    resetCosts,
  };
}
