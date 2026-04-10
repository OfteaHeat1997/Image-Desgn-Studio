"use client";

import React, { useEffect, useState } from "react";
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { useToastStore, type ToastVariant } from "@/hooks/use-toast";
import { cn } from "@/lib/utils/cn";

/* ------------------------------------------------------------------ */
/*  Icon + color map                                                    */
/* ------------------------------------------------------------------ */

const VARIANT_CONFIG: Record<
  ToastVariant,
  { icon: React.ElementType; bg: string; border: string; text: string; iconColor: string }
> = {
  success: {
    icon: CheckCircle,
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-300",
    iconColor: "text-emerald-400",
  },
  error: {
    icon: AlertCircle,
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    text: "text-red-300",
    iconColor: "text-red-400",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-300",
    iconColor: "text-amber-400",
  },
  info: {
    icon: Info,
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    text: "text-blue-300",
    iconColor: "text-blue-400",
  },
};

/* ------------------------------------------------------------------ */
/*  Single toast item                                                   */
/* ------------------------------------------------------------------ */

function ToastItem({ id, message, variant }: { id: string; message: string; variant: ToastVariant }) {
  const removeToast = useToastStore((s) => s.removeToast);
  const [visible, setVisible] = useState(false);

  const cfg = VARIANT_CONFIG[variant];
  const Icon = cfg.icon;

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => removeToast(id), 200);
  };

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm transition-all duration-200",
        cfg.bg,
        cfg.border,
        visible ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0",
      )}
    >
      <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", cfg.iconColor)} />
      <p className={cn("flex-1 text-sm leading-snug", cfg.text)}>{message}</p>
      <button
        type="button"
        onClick={handleClose}
        className="shrink-0 text-gray-500 hover:text-gray-300 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Toast container — add once to the root layout                       */
/* ------------------------------------------------------------------ */

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 w-80">
      {toasts.map((t) => (
        <ToastItem key={t.id} {...t} />
      ))}
    </div>
  );
}
