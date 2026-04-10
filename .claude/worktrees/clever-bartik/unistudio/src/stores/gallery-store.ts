// =============================================================================
// Gallery Store - UniStudio
// Persists processed images across the app using localStorage.
// Thumbnails are stored to avoid QuotaExceededError.
// =============================================================================

import { create } from "zustand";
import { persist, type StateStorage } from "zustand/middleware";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface GalleryImage {
  id: string;
  filename: string;
  /** Data-URL or blob-URL for the processed result (full-size, in-memory only) */
  resultUrl: string;
  /** Data-URL or blob-URL for the original image (full-size, in-memory only) */
  originalUrl: string;
  /** Thumbnail data-URL for persistence (small, ~20KB) */
  thumbnailUrl?: string;
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
// Thumbnail helper — resizes a data URL to max 200px for localStorage
// -----------------------------------------------------------------------------

function createThumbnail(dataUrl: string, maxSize = 200): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith("data:")) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(""); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.6));
    };
    img.onerror = () => resolve("");
    img.src = dataUrl;
  });
}

// -----------------------------------------------------------------------------
// Safe localStorage wrapper — evicts old entries on quota error
// -----------------------------------------------------------------------------

const safeStorage: StateStorage = {
  getItem: (name) => {
    return localStorage.getItem(name);
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      // QuotaExceededError — evict oldest images and retry
      try {
        const parsed = JSON.parse(value);
        if (parsed?.state?.images) {
          // Keep only the newest 15 images
          parsed.state.images = parsed.state.images.slice(0, 15);
          // Strip any full-size data URLs that leaked into persistence
          parsed.state.images = parsed.state.images.map((img: GalleryImage) => ({
            ...img,
            resultUrl: img.resultUrl?.startsWith("data:") ? (img.thumbnailUrl || "") : img.resultUrl,
            originalUrl: img.originalUrl?.startsWith("data:") ? "" : img.originalUrl,
          }));
          const reduced = JSON.stringify(parsed);
          localStorage.setItem(name, reduced);
        }
      } catch {
        // Last resort: clear this key entirely
        localStorage.removeItem(name);
      }
    }
  },
  removeItem: (name) => {
    localStorage.removeItem(name);
  },
};

// -----------------------------------------------------------------------------
// Persistence transform — strip full data URLs before saving, restore on load
// -----------------------------------------------------------------------------

/** Before saving to localStorage: replace large data URLs with thumbnails */
function serializeForStorage(images: GalleryImage[]): GalleryImage[] {
  return images.map((img) => ({
    ...img,
    // Only persist thumbnail or HTTP URLs — never full base64
    resultUrl: img.resultUrl?.startsWith("data:")
      ? (img.thumbnailUrl || "")
      : img.resultUrl,
    originalUrl: img.originalUrl?.startsWith("data:")
      ? ""
      : img.originalUrl,
  }));
}

// -----------------------------------------------------------------------------
// Store (persisted to localStorage)
// -----------------------------------------------------------------------------

export const useGalleryStore = create<GalleryStoreState>()(
  persist(
    (set) => ({
      images: [],

      addImage: (image) => {
        // Generate thumbnail immediately before adding to avoid quota issues
        if (image.resultUrl?.startsWith("data:")) {
          createThumbnail(image.resultUrl).then((thumbnailUrl) => {
            set((state) => ({
              images: [{ ...image, thumbnailUrl: thumbnailUrl || undefined }, ...state.images].slice(0, 30),
            }));
          }).catch(() => {
            set((state) => ({
              images: [image, ...state.images].slice(0, 30),
            }));
          });
        } else {
          set((state) => ({
            images: [image, ...state.images].slice(0, 30),
          }));
        }
      },

      addImages: (newImages) => {
        // Generate thumbnails for all, then add in batch
        Promise.all(
          newImages.map(async (img) => {
            if (img.resultUrl?.startsWith("data:")) {
              const thumb = await createThumbnail(img.resultUrl).catch(() => "");
              return { ...img, thumbnailUrl: thumb || undefined };
            }
            return img;
          })
        ).then((withThumbs) => {
          set((state) => ({
            images: [...withThumbs, ...state.images].slice(0, 30),
          }));
        }).catch(() => {
          // Fallback: add images without thumbnails rather than losing them
          set((state) => ({
            images: [...newImages, ...state.images].slice(0, 30),
          }));
        });
      },

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
      storage: {
        getItem: (name) => {
          const raw = safeStorage.getItem(name);
          if (!raw || typeof raw !== "string") return null;
          return JSON.parse(raw);
        },
        setItem: (name, value) => {
          // Strip large data URLs before persisting
          const toSave = {
            ...value,
            state: {
              ...value.state,
              images: serializeForStorage(value.state.images),
            },
          };
          safeStorage.setItem(name, JSON.stringify(toSave));
        },
        removeItem: (name) => safeStorage.removeItem(name),
      },
      // Clean up stale blob URLs on rehydration (they die after page reload)
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const isPersistentUrl = (url: string) =>
          url.startsWith("data:") ||
          url.startsWith("http://") ||
          url.startsWith("https://") ||
          url === "";
        state.images = state.images
          .map((img) => ({
            ...img,
            resultUrl: isPersistentUrl(img.resultUrl) ? img.resultUrl : "",
            originalUrl: isPersistentUrl(img.originalUrl) ? img.originalUrl : "",
          }))
          .filter((img) => img.resultUrl !== "");
      },
    },
  ),
);
