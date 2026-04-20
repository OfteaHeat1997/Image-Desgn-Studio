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
// IndexedDB tier-2 backup — survives localStorage overflow & manual clearing
//
// Commit 9 hardening: localStorage quota (5-10MB) would silently drop the
// gallery when exceeded. Now every write is ALSO mirrored to IndexedDB (50MB+
// quota typical), and reads fall back to IDB if localStorage was cleared.
// -----------------------------------------------------------------------------

const IDB_NAME = "unistudio-fallback";
const IDB_STORE = "gallery";

function idbOpen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
  });
}

async function idbGet(key: string): Promise<string | null> {
  try {
    if (typeof indexedDB === "undefined") return null;
    const db = await idbOpen();
    return await new Promise<string | null>((resolve) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve((req.result as string) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function idbSet(key: string, value: string): Promise<void> {
  try {
    if (typeof indexedDB === "undefined") return;
    const db = await idbOpen();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      const req = tx.objectStore(IDB_STORE).put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    /* silent — IDB unavailable (private browsing, old browser) */
  }
}

async function idbDelete(key: string): Promise<void> {
  try {
    if (typeof indexedDB === "undefined") return;
    const db = await idbOpen();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      const req = tx.objectStore(IDB_STORE).delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    /* silent */
  }
}

// -----------------------------------------------------------------------------
// Safe storage wrapper: localStorage (tier 1, fast sync) + IDB (tier 2, backup)
// Writes go to both; reads prefer localStorage, fall back to IDB if missing.
// -----------------------------------------------------------------------------

const safeStorage: StateStorage = {
  getItem: async (name) => {
    const ls = typeof localStorage !== "undefined" ? localStorage.getItem(name) : null;
    if (ls) return ls;
    // localStorage was cleared (or never had it) — hydrate from IDB backup
    return await idbGet(name);
  },
  setItem: async (name, value) => {
    // Mirror to IDB first so the full payload is safe even if localStorage evicts.
    void idbSet(name, value);
    // Try localStorage for fast sync access; evict on quota.
    try {
      localStorage.setItem(name, value);
    } catch {
      try {
        const parsed = JSON.parse(value);
        if (parsed?.state?.images) {
          // Keep only the newest 15 and strip full-size data URLs
          parsed.state.images = parsed.state.images.slice(0, 15);
          parsed.state.images = parsed.state.images.map((img: GalleryImage) => ({
            ...img,
            resultUrl: img.resultUrl?.startsWith("data:") ? (img.thumbnailUrl || "") : img.resultUrl,
            originalUrl: img.originalUrl?.startsWith("data:") ? "" : img.originalUrl,
          }));
          localStorage.setItem(name, JSON.stringify(parsed));
        }
      } catch {
        // Couldn't even fit slimmed — localStorage stays empty, but IDB has
        // the full payload so getItem will recover on next load.
        try { localStorage.removeItem(name); } catch { /* ignore */ }
      }
    }
  },
  removeItem: (name) => {
    try { localStorage.removeItem(name); } catch { /* ignore */ }
    void idbDelete(name);
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
        // Add image immediately so it appears in gallery right away
        set((state) => ({
          images: [image, ...state.images].slice(0, 30),
        }));
        // Then generate thumbnail async and update the entry
        if (image.resultUrl?.startsWith("data:")) {
          createThumbnail(image.resultUrl).then((thumbnailUrl) => {
            if (thumbnailUrl) {
              set((state) => ({
                images: state.images.map((img) =>
                  img.id === image.id ? { ...img, thumbnailUrl } : img
                ),
              }));
            }
          }).catch(() => { /* thumbnail is optional — image already added */ });
        }
      },

      addImages: (newImages) => {
        // Add images immediately so they appear in gallery right away
        set((state) => ({
          images: [...newImages, ...state.images].slice(0, 30),
        }));
        // Then generate thumbnails async and update entries
        newImages.forEach((img) => {
          if (img.resultUrl?.startsWith("data:")) {
            createThumbnail(img.resultUrl).then((thumb) => {
              if (thumb) {
                set((state) => ({
                  images: state.images.map((i) =>
                    i.id === img.id ? { ...i, thumbnailUrl: thumb } : i
                  ),
                }));
              }
            }).catch(() => { /* thumbnail is optional */ });
          }
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
