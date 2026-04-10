"use client";

import React from "react";
import * as RadixTooltip from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils/cn";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface TooltipProps {
  /** The content shown inside the tooltip */
  content: React.ReactNode;
  /** The element that triggers the tooltip on hover */
  children: React.ReactNode;
  /** Which side the tooltip appears on */
  side?: "top" | "right" | "bottom" | "left";
  /** Alignment along the side axis */
  align?: "start" | "center" | "end";
  /** Delay in ms before opening (default 200) */
  delayDuration?: number;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Provider (wrap your app with this once)                            */
/* ------------------------------------------------------------------ */

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return (
    <RadixTooltip.Provider delayDuration={200}>
      {children}
    </RadixTooltip.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
  delayDuration,
  className,
}: TooltipProps) {
  return (
    <RadixTooltip.Root delayDuration={delayDuration}>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>

      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          align={align}
          sideOffset={6}
          className={cn(
            "z-50 max-w-xs rounded-md bg-surface-light px-3 py-1.5",
            "text-xs font-medium text-white shadow-lg",
            "border border-surface-lighter",
            "animate-in fade-in-0 zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            "data-[side=top]:slide-in-from-bottom-2",
            "data-[side=right]:slide-in-from-left-2",
            "data-[side=bottom]:slide-in-from-top-2",
            "data-[side=left]:slide-in-from-right-2",
            className,
          )}
        >
          {content}
          <RadixTooltip.Arrow className="fill-surface-light" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}

export default Tooltip;
