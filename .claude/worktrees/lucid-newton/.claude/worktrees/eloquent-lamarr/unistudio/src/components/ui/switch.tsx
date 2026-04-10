"use client";

import React from "react";
import * as RadixSwitch from "@radix-ui/react-switch";
import { cn } from "@/lib/utils/cn";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SwitchProps {
  /** Whether the switch is on (controlled) */
  checked?: boolean;
  /** Default checked state (uncontrolled) */
  defaultChecked?: boolean;
  /** Called when the checked state changes */
  onCheckedChange?: (checked: boolean) => void;
  /** Label text shown next to the switch */
  label?: string;
  /** Place label before or after the switch */
  labelPosition?: "left" | "right";
  disabled?: boolean;
  className?: string;
  id?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function Switch({
  checked,
  defaultChecked,
  onCheckedChange,
  label,
  labelPosition = "right",
  disabled = false,
  className,
  id,
}: SwitchProps) {
  const switchId = id ?? React.useId();

  const switchElement = (
    <RadixSwitch.Root
      id={switchId}
      checked={checked}
      defaultChecked={defaultChecked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full",
        "border border-transparent transition-colors duration-200",
        "bg-surface-lighter",
        "data-[state=checked]:bg-accent",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        "disabled:cursor-not-allowed disabled:opacity-50",
      )}
    >
      <RadixSwitch.Thumb
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm",
          "transition-transform duration-200",
          "data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0.5",
        )}
      />
    </RadixSwitch.Root>
  );

  if (!label) {
    return <div className={className}>{switchElement}</div>;
  }

  const labelElement = (
    <label
      htmlFor={switchId}
      className={cn(
        "text-sm font-medium text-gray-300 select-none",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      {label}
    </label>
  );

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {labelPosition === "left" && labelElement}
      {switchElement}
      {labelPosition === "right" && labelElement}
    </div>
  );
}

export default Switch;
