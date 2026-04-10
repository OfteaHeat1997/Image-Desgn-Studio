"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type CardPadding = "none" | "sm" | "md" | "lg";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Enable subtle hover lift & glow */
  hoverable?: boolean;
  /** Internal padding preset */
  padding?: CardPadding;
}

export interface CardSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Style maps                                                         */
/* ------------------------------------------------------------------ */

const paddingStyles: Record<CardPadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-5",
  lg: "p-7",
};

/* ------------------------------------------------------------------ */
/*  Card                                                               */
/* ------------------------------------------------------------------ */

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ hoverable = false, padding = "md", className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border border-surface-lighter bg-surface-light",
          "transition-all duration-200",
          hoverable && "hover:border-surface-hover hover:shadow-lg hover:shadow-accent/5 hover:-translate-y-0.5",
          paddingStyles[padding],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = "Card";

/* ------------------------------------------------------------------ */
/*  CardHeader                                                         */
/* ------------------------------------------------------------------ */

export function CardHeader({ className, children, ...props }: CardSectionProps) {
  return (
    <div
      className={cn("border-b border-surface-lighter px-5 py-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CardContent                                                        */
/* ------------------------------------------------------------------ */

export function CardContent({ className, children, ...props }: CardSectionProps) {
  return (
    <div className={cn("px-5 py-4", className)} {...props}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CardFooter                                                         */
/* ------------------------------------------------------------------ */

export function CardFooter({ className, children, ...props }: CardSectionProps) {
  return (
    <div
      className={cn(
        "flex items-center border-t border-surface-lighter px-5 py-4",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
