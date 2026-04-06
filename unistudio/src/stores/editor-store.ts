// =============================================================================
// Editor Store - UniStudio
// Manages canvas layers, tool state, zoom, and undo/redo history.
// =============================================================================

import { create } from 'zustand';
import type {
  ImageLayer,
  Tool,
  HistoryEntry,
} from '@/types/editor';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const MAX_HISTORY = 50;
const DEFAULT_CANVAS_WIDTH = 1024;
const DEFAULT_CANVAS_HEIGHT = 1024;
const DEFAULT_ZOOM = 1;

// -----------------------------------------------------------------------------
// State & Actions Interface
// -----------------------------------------------------------------------------

interface EditorStoreState {
  // State
  layers: ImageLayer[];
  selectedLayerId: string | null;
  tool: Tool;
  zoom: number;
  canvasWidth: number;
  canvasHeight: number;
  history: HistoryEntry[];
  historyIndex: number;

  // Layer actions
  addLayer: (layer: ImageLayer) => void;
  removeLayer: (layerId: string) => void;
  updateLayer: (layerId: string, updates: Partial<Omit<ImageLayer, 'id'>>) => void;
  selectLayer: (layerId: string | null) => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;

  // Tool & canvas actions
  setTool: (tool: Tool) => void;
  setZoom: (zoom: number) => void;

  // History actions
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
}

// -----------------------------------------------------------------------------
// Helper: Create a history snapshot
// -----------------------------------------------------------------------------

function createSnapshot(
  layers: ImageLayer[],
  selectedLayerId: string | null
): HistoryEntry {
  return {
    layers: layers.map((l) => ({ ...l, filters: { ...l.filters } })),
    selectedLayerId,
    timestamp: Date.now(),
  };
}

// -----------------------------------------------------------------------------
// Store
// -----------------------------------------------------------------------------

export const useEditorStore = create<EditorStoreState>()((set, get) => ({
  // -- Initial state ----------------------------------------------------------
  layers: [],
  selectedLayerId: null,
  tool: 'select',
  zoom: DEFAULT_ZOOM,
  canvasWidth: DEFAULT_CANVAS_WIDTH,
  canvasHeight: DEFAULT_CANVAS_HEIGHT,
  history: [],
  historyIndex: -1,

  // -- Layer actions ----------------------------------------------------------

  addLayer: (layer) => {
    const state = get();
    state.pushHistory();
    set({
      layers: [...state.layers, layer],
      selectedLayerId: layer.id,
    });
  },

  removeLayer: (layerId) => {
    const state = get();
    state.pushHistory();
    const newLayers = state.layers.filter((l) => l.id !== layerId);
    set({
      layers: newLayers,
      selectedLayerId:
        state.selectedLayerId === layerId
          ? (newLayers.length > 0 ? newLayers[newLayers.length - 1].id : null)
          : state.selectedLayerId,
    });
  },

  updateLayer: (layerId, updates) => {
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === layerId ? { ...l, ...updates } : l
      ),
    }));
  },

  selectLayer: (layerId) => {
    set({ selectedLayerId: layerId });
  },

  reorderLayers: (fromIndex, toIndex) => {
    const state = get();
    if (
      fromIndex < 0 ||
      fromIndex >= state.layers.length ||
      toIndex < 0 ||
      toIndex >= state.layers.length
    ) {
      return;
    }
    state.pushHistory();
    const newLayers = [...state.layers];
    const [moved] = newLayers.splice(fromIndex, 1);
    newLayers.splice(toIndex, 0, moved);
    set({ layers: newLayers });
  },

  // -- Tool & canvas actions --------------------------------------------------

  setTool: (tool) => {
    set({ tool });
  },

  setZoom: (zoom) => {
    set({ zoom: Math.max(0.1, Math.min(10, zoom)) });
  },

  // -- History actions --------------------------------------------------------

  pushHistory: () => {
    const { layers, selectedLayerId, history, historyIndex } = get();

    // Discard any forward history when a new action is taken
    const truncatedHistory = history.slice(0, historyIndex + 1);
    const snapshot = createSnapshot(layers, selectedLayerId);

    // Enforce max history size
    const newHistory =
      truncatedHistory.length >= MAX_HISTORY
        ? [...truncatedHistory.slice(1), snapshot]
        : [...truncatedHistory, snapshot];

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const { history, historyIndex, layers, selectedLayerId } = get();
    if (historyIndex < 0) return;

    // If we are at the tip, save current state so redo can restore it
    let updatedHistory = history;
    let newIndex = historyIndex;

    if (historyIndex === history.length - 1) {
      const currentSnapshot = createSnapshot(layers, selectedLayerId);
      updatedHistory = [...history, currentSnapshot];
    }

    const entry = updatedHistory[newIndex];
    set({
      layers: entry.layers.map((l) => ({ ...l, filters: { ...l.filters } })),
      selectedLayerId: entry.selectedLayerId,
      history: updatedHistory,
      historyIndex: newIndex - 1,
    });
  },

  redo: () => {
    const { history, historyIndex } = get();
    const nextIndex = historyIndex + 2; // +2 because undo decrements by 1 and we stored current at tip
    if (nextIndex >= history.length) return;

    const entry = history[nextIndex];
    set({
      layers: entry.layers.map((l) => ({ ...l, filters: { ...l.filters } })),
      selectedLayerId: entry.selectedLayerId,
      historyIndex: historyIndex + 1,
    });
  },

}));
