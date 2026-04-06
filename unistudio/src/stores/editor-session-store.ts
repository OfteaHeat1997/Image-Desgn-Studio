// =============================================================================
// Editor Session Store - UniStudio
// Persists the current editor working state across page refreshes.
// Stores compressed data URLs of the current and processed images.
// =============================================================================

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface EditorSession {
  /** The current working image (data URL, compressed) */
  currentImage: string | null;
  /** The original uploaded image (data URL, compressed) */
  originalImage: string | null;
  /** The last processed result (data URL, compressed) */
  processedImage: string | null;
  /** Original filename */
  filename: string | null;
  /** Which module was active */
  activeModule: string;
  /** Session cost so far */
  sessionCost: number;
  /** Timestamp of last save */
  lastSaved: number;
}

interface EditorSessionState extends EditorSession {
  saveSession: (session: Partial<EditorSession>) => void;
  clearSession: () => void;
}

const EMPTY_SESSION: EditorSession = {
  currentImage: null,
  originalImage: null,
  processedImage: null,
  filename: null,
  activeModule: "bg-remove",
  sessionCost: 0,
  lastSaved: 0,
};

export const useEditorSessionStore = create<EditorSessionState>()(
  persist(
    (set) => ({
      ...EMPTY_SESSION,

      saveSession: (session) =>
        set((state) => ({
          ...state,
          ...session,
          lastSaved: Date.now(),
        })),

      clearSession: () => set({ ...EMPTY_SESSION }),
    }),
    {
      name: "unistudio-editor-session",
      // Only persist image data if it's under 4MB total to avoid localStorage overflow
      partialize: (state) => {
        const total =
          (state.currentImage?.length ?? 0) +
          (state.originalImage?.length ?? 0) +
          (state.processedImage?.length ?? 0);
        // If over 4MB, only keep the processed result (most important)
        if (total > 4 * 1024 * 1024) {
          return {
            currentImage: null,
            originalImage: null,
            processedImage: state.processedImage,
            filename: state.filename,
            activeModule: state.activeModule,
            sessionCost: state.sessionCost,
            lastSaved: state.lastSaved,
          };
        }
        return {
          currentImage: state.currentImage,
          originalImage: state.originalImage,
          processedImage: state.processedImage,
          filename: state.filename,
          activeModule: state.activeModule,
          sessionCost: state.sessionCost,
          lastSaved: state.lastSaved,
        };
      },
    },
  ),
);
