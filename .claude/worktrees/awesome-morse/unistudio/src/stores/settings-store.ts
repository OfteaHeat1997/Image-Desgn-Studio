// =============================================================================
// Settings Store - UniStudio
// Manages app-wide settings: default provider, API key status, cost tracking,
// and theme preferences.
// =============================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ApiProvider } from '@/types/api';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type AppTheme = 'light' | 'dark' | 'system';

/** Tracks whether an API key has been configured (not the key itself) */
export interface ApiKeyStatus {
  provider: ApiProvider;
  configured: boolean;
  lastVerified: number | null; // Unix timestamp
}

/** A single cost entry for an operation */
export interface OperationCost {
  id: string;
  operation: string;       // e.g. 'bg-remove', 'enhance', 'upscale'
  provider: ApiProvider;
  cost: number;            // dollars
  timestamp: number;       // Unix timestamp
  imageId: string | null;  // optional reference to the image
}

/** Aggregated cost tracking */
export interface CostTracker {
  totalSpent: number;      // dollars
  operationCosts: OperationCost[];
}

/** All settings fields */
export interface AppSettings {
  defaultProvider: ApiProvider;
  apiKeys: ApiKeyStatus[];
  costTracker: CostTracker;
  theme: AppTheme;
  autoSave: boolean;
  showCostWarnings: boolean;
  costWarningThreshold: number; // dollars — warn when a single operation exceeds this
}

// -----------------------------------------------------------------------------
// Default API key statuses (one per provider)
// -----------------------------------------------------------------------------

const ALL_PROVIDERS: ApiProvider[] = [
  'replicate',
  'fal',
  'browser',
  'withoutbg',
];

const defaultApiKeys: ApiKeyStatus[] = ALL_PROVIDERS.map((provider) => ({
  provider,
  configured: provider === 'browser' || provider === 'withoutbg', // these providers need no API key
  lastVerified: null,
}));

// -----------------------------------------------------------------------------
// State & Actions Interface
// -----------------------------------------------------------------------------

interface SettingsStoreState extends AppSettings {
  // Settings actions
  updateSettings: (updates: Partial<AppSettings>) => void;
  setDefaultProvider: (provider: ApiProvider) => void;
  setTheme: (theme: AppTheme) => void;
  setApiKeyStatus: (provider: ApiProvider, configured: boolean) => void;

  // Cost actions
  addCost: (cost: Omit<OperationCost, 'id' | 'timestamp'>) => void;
  resetCosts: () => void;
  getCostByOperation: (operation: string) => number;
  getCostByProvider: (provider: ApiProvider) => number;
}

// -----------------------------------------------------------------------------
// Store
// -----------------------------------------------------------------------------

export const useSettingsStore = create<SettingsStoreState>()(
  persist(
    (set, get) => ({
  // -- Initial state ----------------------------------------------------------
  defaultProvider: 'browser',
  apiKeys: defaultApiKeys,
  costTracker: {
    totalSpent: 0,
    operationCosts: [],
  },
  theme: 'system',
  autoSave: true,
  showCostWarnings: true,
  costWarningThreshold: 0.50, // warn above $0.50

  // -- Settings actions -------------------------------------------------------

  updateSettings: (updates) => {
    set((state) => ({ ...state, ...updates }));
  },

  setDefaultProvider: (provider) => {
    set({ defaultProvider: provider });
  },

  setTheme: (theme) => {
    set({ theme });
  },

  setApiKeyStatus: (provider, configured) => {
    set((state) => ({
      apiKeys: state.apiKeys.map((key) =>
        key.provider === provider
          ? { ...key, configured, lastVerified: configured ? Date.now() : null }
          : key
      ),
    }));
  },

  // -- Cost actions -----------------------------------------------------------

  addCost: (cost) => {
    const entry: OperationCost = {
      ...cost,
      id: `cost-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
    };

    set((state) => ({
      costTracker: {
        totalSpent: state.costTracker.totalSpent + cost.cost,
        operationCosts: [...state.costTracker.operationCosts, entry],
      },
    }));
  },

  resetCosts: () => {
    set({
      costTracker: {
        totalSpent: 0,
        operationCosts: [],
      },
    });
  },

  getCostByOperation: (operation) => {
    const { costTracker } = get();
    return costTracker.operationCosts
      .filter((c) => c.operation === operation)
      .reduce((sum, c) => sum + c.cost, 0);
  },

  getCostByProvider: (provider) => {
    const { costTracker } = get();
    return costTracker.operationCosts
      .filter((c) => c.provider === provider)
      .reduce((sum, c) => sum + c.cost, 0);
  },
    }),
    {
      name: 'unistudio-settings',
      partialize: (state) => ({
        defaultProvider: state.defaultProvider,
        apiKeys: state.apiKeys,
        costTracker: state.costTracker,
        theme: state.theme,
        autoSave: state.autoSave,
        showCostWarnings: state.showCostWarnings,
        costWarningThreshold: state.costWarningThreshold,
      }),
    },
  ),
);
