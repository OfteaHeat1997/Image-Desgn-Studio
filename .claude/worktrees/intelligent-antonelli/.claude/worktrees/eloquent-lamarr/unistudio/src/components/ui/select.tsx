"use client";

import React from "react";
import * as RadixSelect from "@radix-ui/react-select";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  /** Current value (controlled) */
  value?: string;
  /** Default value (uncontrolled) */
  defaultValue?: string;
  /** Called when value changes */
  onValueChange?: (value: string) => void;
  /** Options to display */
  options: SelectOption[];
  /** Label displayed above the select */
  label?: string;
  /** Placeholder text when nothing is selected */
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function Select({
  value,
  defaultValue,
  onValueChange,
  options,
  label,
  placeholder = "Select an option",
  disabled = false,
  className,
}: SelectProps) {
  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-gray-300">
          {label}
        </label>
      )}

      <RadixSelect.Root
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        {/* Trigger */}
        <RadixSelect.Trigger
          className={cn(
            "inline-flex h-10 w-full items-center justify-between rounded-lg",
            "border border-surface-lighter bg-surface-light px-3 text-sm text-gray-200",
            "placeholder:text-gray-500",
            "hover:border-surface-hover transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
          aria-label={label}
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>

        {/* Content */}
        <RadixSelect.Portal>
          <RadixSelect.Content
            className={cn(
              "relative z-50 overflow-hidden rounded-lg border border-surface-lighter bg-surface shadow-xl",
              "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
              "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
              "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
            )}
            position="popper"
            sideOffset={4}
          >
            <RadixSelect.Viewport className="p-1">
              {options.map((option) => (
                <RadixSelect.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className={cn(
                    "relative flex h-9 cursor-pointer select-none items-center rounded-md pl-8 pr-3 text-sm text-gray-200",
                    "outline-none transition-colors",
                    "hover:bg-surface-light focus:bg-surface-light",
                    "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                  )}
                >
                  <RadixSelect.ItemIndicator className="absolute left-2 flex items-center justify-center">
                    <Check className="h-3.5 w-3.5 text-accent" />
                  </RadixSelect.ItemIndicator>
                  <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </div>
  );
}

export default Select;
