// =============================================================================
// Gallery Store - UniStudio
// Persists processed images across the app using localStorage.
// =============================================================================

import { create } from "zustand";
import { persist } from "zustand/middleware";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface GalleryImage {
  id: string;
  filename: string;
  /** Data-URL or blob-URL for the processed result */
  resultUrl: string;
  /** Data-URL or blob-URL for the original image */
  originalUrl: string;
  /** ISO date string */
  date: string;
  /** Which operations were applied */
  operations: string[];
  /** Optional project/source label */
  project: string;
}

interface GalleryStoreState {
  images: GalleryImage[];
  addImage: (image: GalleryImage) => void;
  addImages: (images: GalleryImage[]) => void;
  removeImage: (id: string) => void;
  removeImages: (ids: string[]) => void;
  clearAll: () => void;
}

// -----------------------------------------------------------------------------
// Store (persisted to localStorage)
// -----------------------------------------------------------------------------

export const useGalleryStore = create<GalleryStoreState>()(
  persist(
    (set) => ({
      images: [],

      addImage: (image) =>
        set((state) => ({
          images: [image, ...state.images].slice(0, 100),
        })),

      addImages: (newImages) =>
        set((state) => ({
          images: [...newImages, ...state.images].slice(0, 100),
        })),

      removeImage: (id) =>
        set((state) => ({
          images: state.images.filter((img) => img.id !== id),
        })),

      removeImages: (ids) =>
        set((state) => ({
          images: state.images.filter((img) => !ids.includes(img.id)),
        })),

      clearAll: () => set({ images: [] }),
    }),
    {
      name: "unistudio-gallery",
      // Clean up stale blob URLs on rehydration (they die after page reload)
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const isPersistentUrl = (url: string) =>
          url.startsWith("data:") ||
          url.startsWith("http://") ||
          url.startsWith("https://") ||
          url === "";
        // Clear stale blob URLs but KEEP entries that have at least one good URL
        state.images = state.images
          .map((img) => ({
            ...img,
            resultUrl: isPersistentUrl(img.resultUrl) ? img.resultUrl : "",
            originalUrl: isPersistentUrl(img.originalUrl) ? img.originalUrl : "",
          }))
          .filter((img) => img.resultUrl !== ""); // Only drop entries with no result
      },
    },
  ),
);
