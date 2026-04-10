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
          images: [image, ...state.images],
        })),

      addImages: (newImages) =>
        set((state) => ({
          images: [...newImages, ...state.images],
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
      // Filter out entries with invalid URLs on rehydration
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const isValidUrl = (url: string) =>
          url.startsWith("blob:") ||
          url.startsWith("data:") ||
          url.startsWith("http://") ||
          url.startsWith("https://") ||
          url === "";
        state.images = state.images.filter(
          (img) => isValidUrl(img.resultUrl) && isValidUrl(img.originalUrl),
        );
      },
    },
  ),
);
