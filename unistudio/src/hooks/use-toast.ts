import { create } from "zustand";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number; // ms — default 4000
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Store                                                               */
/* ------------------------------------------------------------------ */

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set((s) => ({ toasts: [...s.toasts.slice(-4), { ...toast, id }] }));

    // Auto-dismiss
    const ms = toast.duration ?? 4000;
    if (ms > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, ms);
    }
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/* ------------------------------------------------------------------ */
/*  Convenience helpers                                                 */
/* ------------------------------------------------------------------ */

export function toast(
  message: string,
  variant: ToastVariant = "info",
  duration?: number,
) {
  useToastStore.getState().addToast({ message, variant, duration });
}

toast.success = (msg: string, duration?: number) => toast(msg, "success", duration);
toast.error = (msg: string, duration?: number) => toast(msg, "error", duration);
toast.warning = (msg: string, duration?: number) => toast(msg, "warning", duration);
toast.info = (msg: string, duration?: number) => toast(msg, "info", duration);
