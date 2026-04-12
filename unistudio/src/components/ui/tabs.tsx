"use client";

import React from "react";
import * as RadixTabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils/cn";

/* ------------------------------------------------------------------ */
/*  TabRoot                                                            */
/* ------------------------------------------------------------------ */

export interface TabRootProps extends RadixTabs.TabsProps {
  className?: string;
}

export function TabRoot({ className, ...props }: TabRootProps) {
  return (
    <RadixTabs.Root
      className={cn("flex flex-col", className)}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  TabList                                                            */
/* ------------------------------------------------------------------ */

export interface TabListProps extends RadixTabs.TabsListProps {
  className?: string;
}

export function TabList({ className, ...props }: TabListProps) {
  return (
    <RadixTabs.List
      className={cn(
        "inline-flex items-center gap-1 rounded-lg bg-surface-light p-1",
        className,
      )}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  TabTrigger                                                         */
/* ------------------------------------------------------------------ */

export interface TabTriggerProps extends RadixTabs.TabsTriggerProps {
  className?: string;
}

export function TabTrigger({ className, ...props }: TabTriggerProps) {
  return (
    <RadixTabs.Trigger
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5",
        "text-sm font-medium text-gray-400 transition-all",
        "hover:text-gray-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
        "disabled:pointer-events-none disabled:opacity-50",
        "data-[state=active]:bg-accent/15 data-[state=active]:text-accent-light data-[state=active]:shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  TabContent                                                         */
/* ------------------------------------------------------------------ */

export interface TabContentProps extends RadixTabs.TabsContentProps {
  className?: string;
}

export function TabContent({ className, ...props }: TabContentProps) {
  return (
    <RadixTabs.Content
      className={cn(
        "mt-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
        "data-[state=inactive]:hidden",
        "data-[state=active]:animate-in data-[state=active]:fade-in-0 duration-200",
        className,
      )}
      {...props}
    />
  );
}

export default TabRoot;
