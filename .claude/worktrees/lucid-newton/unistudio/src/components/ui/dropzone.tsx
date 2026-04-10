"use client";

import React, { useCallback } from "react";
import { useDropzone, type DropzoneOptions } from "react-dropzone";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface DropzoneProps {
  /** Called with accepted files when dropped or selected */
  onDrop: (files: File[]) => void;
  /** Accepted MIME types (defaults to common image types) */
  accept?: DropzoneOptions["accept"];
  /** Allow multiple files */
  multiple?: boolean;
  /** Max file size in bytes */
  maxSize?: number;
  /** Max number of files */
  maxFiles?: number;
  disabled?: boolean;
  /** Custom instruction text */
  label?: string;
  /** Hint text shown below the label */
  hint?: string;
  className?: string;
  children?: React.ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Defaults                                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_ACCEPT: DropzoneOptions["accept"] = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function Dropzone({
  onDrop,
  accept = DEFAULT_ACCEPT,
  multiple = true,
  maxSize,
  maxFiles,
  disabled = false,
  label = "Drag & drop images here, or click to browse",
  hint = "PNG, JPG, WebP, GIF",
  className,
  children,
}: DropzoneProps) {
  const handleDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) onDrop(acceptedFiles);
    },
    [onDrop],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop: handleDrop,
      accept,
      multiple,
      maxSize,
      maxFiles,
      disabled,
    });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "group relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-all duration-200",
        "bg-surface-light/50",
        isDragActive && !isDragReject
          ? "border-accent bg-accent/5"
          : isDragReject
            ? "border-red-500 bg-red-500/5"
            : "border-surface-lighter hover:border-surface-hover hover:bg-surface-light",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      <input {...getInputProps()} />

      {children ?? (
        <>
          <div
            className={cn(
              "mb-3 flex h-12 w-12 items-center justify-center rounded-full transition-colors",
              isDragActive
                ? "bg-accent/15 text-accent-light"
                : "bg-surface-lighter text-gray-400 group-hover:text-gray-300",
            )}
          >
            <Upload className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-gray-300">{label}</p>
          <p className="mt-1 text-xs text-gray-500">{hint}</p>
        </>
      )}
    </div>
  );
}

export default Dropzone;
