"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  Search,
  Filter,
  Download,
  CheckSquare,
  Square,
  X,
  Trash2,
  Calendar,
  Eye,
  ChevronLeft,
  ChevronRight,
  ImageOff,
  Pencil,
  Archive,
} from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { ImageCompare } from "@/components/ui/image-compare";
import { cn } from "@/lib/utils/cn";
import { useGalleryStore, type GalleryImage } from "@/stores/gallery-store";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";
import { AudioButton } from "@/components/ui/AudioButton";

/* ------------------------------------------------------------------ */
/*  Filter constants                                                    */
/* ------------------------------------------------------------------ */

const OPERATION_OPTIONS = [
  { value: "all", label: "Todas las Operaciones" },
  { value: "bg-remove", label: "Quitar Fondo" },
  { value: "bg-generate", label: "Fondos con IA" },
  { value: "enhance", label: "Mejorar Calidad" },
  { value: "shadows", label: "Sombras" },
  { value: "upscale", label: "Escalar" },
  { value: "outpaint", label: "Extender" },
  { value: "inpaint", label: "Borrar/Reemplazar" },
  { value: "tryon", label: "Prueba Virtual" },
  { value: "model-create", label: "Modelo IA" },
  { value: "ghost-mannequin", label: "Maniqui Invisible" },
  { value: "jewelry-tryon", label: "Joyeria Virtual" },
  { value: "video", label: "Video" },
];

const PROJECT_OPTIONS = [
  { value: "all", label: "Todas las Fuentes" },
  { value: "editor", label: "Editor" },
  { value: "batch", label: "Procesamiento Masivo" },
];

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function GalleryPage() {
  const router = useRouter();
  const images = useGalleryStore((s) => s.images);
  const addImage = useGalleryStore((s) => s.addImage);
  const removeImage = useGalleryStore((s) => s.removeImage);
  const removeImages = useGalleryStore((s) => s.removeImages);

  // Load history from database on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/db/history?limit=50");
        if (!res.ok) return;
        const data = await res.json();
        if (!data.success || !data.data) return;
        const jobs = Array.isArray(data.data) ? data.data : data.data.jobs;
        if (!Array.isArray(jobs)) return;

        const existingIds = new Set(images.map((img) => img.id));
        for (const job of jobs) {
          const id = `db-${job.id}`;
          if (existingIds.has(id)) continue;
          addImage({
            id,
            filename: job.filename || "untitled.png",
            resultUrl: job.resultUrl || job.outputUrl || "",
            originalUrl: job.originalUrl || job.inputUrl || "",
            date: job.createdAt ? new Date(job.createdAt).toISOString().split("T")[0] : "",
            operations: job.operation ? [job.operation] : [],
            project: "editor",
          });
        }
      } catch {
        // Gallery DB sync is optional — don't block the UI
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [operationFilter, setOperationFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewImage, setPreviewImage] = useState<GalleryImage | null>(null);

  /* ---- Filtering ---- */

  const filteredImages = useMemo(() => {
    return images.filter((img) => {
      if (searchQuery && !img.filename.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (operationFilter !== "all" && !img.operations.includes(operationFilter)) {
        return false;
      }
      if (projectFilter !== "all" && img.project !== projectFilter) {
        return false;
      }
      return true;
    });
  }, [images, searchQuery, operationFilter, projectFilter]);

  /* ---- Selection ---- */

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.size === filteredImages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredImages.map((img) => img.id)));
    }
  }, [filteredImages, selectedIds.size]);

  /* ---- Download ---- */

  const downloadImage = useCallback(async (img: GalleryImage) => {
    const a = document.createElement("a");
    a.href = img.resultUrl;
    a.download = `processed-${img.filename}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const downloadSelected = useCallback(async () => {
    const selected = filteredImages.filter((img) => selectedIds.has(img.id));
    for (const img of selected) {
      await downloadImage(img);
      await new Promise((r) => setTimeout(r, 300));
    }
  }, [filteredImages, selectedIds, downloadImage]);

  /**
   * Descarga TODAS las seleccionadas como un solo ZIP. Crítico para batches
   * grandes (la usuaria reportó 200+ imágenes acumuladas en testing). El
   * download uno-por-uno con delay rompe en navegadores que limitan multi-
   * download. ZIP soluciona eso y queda más ordenado.
   */
  const downloadSelectedAsZip = useCallback(async () => {
    const selected = filteredImages.filter((img) => selectedIds.has(img.id));
    if (selected.length === 0) return;
    toast.info(`Empaquetando ${selected.length} imágenes en ZIP…`);
    const zip = new JSZip();
    let added = 0;
    for (const img of selected) {
      try {
        const url = img.resultUrl;
        if (!url) continue;
        const res = await fetch(url);
        if (!res.ok) continue;
        const blob = await res.blob();
        const ext = blob.type.includes("video") ? "mp4"
          : blob.type.includes("png") ? "png"
          : blob.type.includes("webp") ? "webp"
          : "jpg";
        const safeName = (img.project ?? img.filename ?? "image")
          .replace(/[^a-z0-9-]/gi, "_")
          .toLowerCase()
          .slice(0, 40);
        const ts = new Date(img.date).toISOString().replace(/[:.]/g, "-").slice(0, 19);
        zip.file(`${safeName}_${ts}_${img.id.slice(0, 6)}.${ext}`, blob);
        added++;
      } catch (err) {
        console.warn("[gallery] zip skip image:", err);
      }
    }
    if (added === 0) {
      toast.error("No se pudo descargar ninguna imagen.");
      return;
    }
    const content = await zip.generateAsync({ type: "blob" });
    const fileName = `unistudio-galeria-${new Date().toISOString().slice(0, 10)}-${added}imgs.zip`;
    saveAs(content, fileName);
    toast.success(`ZIP listo: ${added} imágenes (${(content.size / 1024 / 1024).toFixed(1)} MB)`);
  }, [filteredImages, selectedIds]);

  /* ---- Delete ---- */

  const deleteSelected = useCallback(() => {
    removeImages(Array.from(selectedIds));
    setSelectedIds(new Set());
  }, [selectedIds, removeImages]);

  /* ---- Preview navigation ---- */

  const navigatePreview = useCallback(
    (direction: "prev" | "next") => {
      if (!previewImage) return;
      const idx = filteredImages.findIndex((img) => img.id === previewImage.id);
      const nextIdx = direction === "next" ? idx + 1 : idx - 1;
      if (nextIdx >= 0 && nextIdx < filteredImages.length) {
        setPreviewImage(filteredImages[nextIdx]);
      }
    },
    [previewImage, filteredImages],
  );

  return (
    <div className="min-h-screen bg-surface text-heading overflow-x-hidden">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--border-default)] bg-[rgba(12,12,14,0.85)] px-4 md:px-6 py-3 backdrop-blur">
        <Link href="/" className="flex items-center gap-2 text-sm font-medium text-muted transition-default hover:text-[var(--accent)]">
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Inicio</span>
        </Link>
        <span className="text-[var(--border-default)]">/</span>
        <div className="flex items-center gap-2 min-w-0">
          <Eye className="h-4 w-4 text-[var(--accent)] shrink-0" />
          <span className="text-sm font-semibold text-heading truncate">Galería</span>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-heading">Tu galería de imágenes</h1>
          <p className="mt-1 text-sm text-body">
            Todas tus fotos procesadas, listas para reusar o descargar.{" "}
            <span className="text-muted">{images.length} en total</span>
          </p>
          <div className="mt-3">
            <AudioButton
              variant="inline"
              text={`Galería. Tienes ${images.length} imágenes procesadas. Selecciónalas y descarga todo en un solo ZIP, o reusa imágenes individuales.`}
            />
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="default">{selectedIds.size} seleccionados</Badge>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="h-3.5 w-3.5" />}
              onClick={downloadSelected}
              title="Descargar una por una (lento si son muchas)"
            >
              Descargar individual
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Archive className="h-3.5 w-3.5" />}
              onClick={downloadSelectedAsZip}
              title="Empaquetar todas en un solo ZIP — recomendado para 10+ fotos"
            >
              Descargar ZIP ({selectedIds.size})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={deleteSelected}
              className="text-red-400 hover:text-red-300"
            >
              Eliminar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<X className="h-3.5 w-3.5" />}
              onClick={() => setSelectedIds(new Set())}
            >
              Limpiar
            </Button>
          </div>
        )}
      </div>

      {/* Filters row */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-lg border border-surface-lighter bg-surface-light pl-10 pr-3 text-sm text-gray-200 placeholder:text-gray-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors"
          />
        </div>

        {/* Operation filter */}
        <div className="w-48">
          <Select
            value={operationFilter}
            onValueChange={setOperationFilter}
            options={OPERATION_OPTIONS}
          />
        </div>

        {/* Project filter */}
        <div className="w-48">
          <Select
            value={projectFilter}
            onValueChange={setProjectFilter}
            options={PROJECT_OPTIONS}
          />
        </div>

        {/* Select all */}
        {filteredImages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={selectAll}>
            {selectedIds.size === filteredImages.length ? (
              <CheckSquare className="mr-1.5 h-3.5 w-3.5" />
            ) : (
              <Square className="mr-1.5 h-3.5 w-3.5" />
            )}
            {selectedIds.size === filteredImages.length ? "Deseleccionar Todo" : "Seleccionar Todo"}
          </Button>
        )}
      </div>

      {/* Image Grid */}
      {filteredImages.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-surface-lighter py-20">
          {images.length === 0 ? (
            <>
              <ImageOff className="mb-3 h-8 w-8 text-gray-600" />
              <p className="text-sm text-gray-500">Aun no hay imagenes procesadas.</p>
              <p className="mt-1 text-xs text-gray-600">
                Procesa imagenes en el Editor o en Batch para verlas aqui.
              </p>
            </>
          ) : (
            <>
              <Filter className="mb-3 h-8 w-8 text-gray-600" />
              <p className="text-sm text-gray-500">Ninguna imagen coincide con los filtros.</p>
            </>
          )}
        </div>
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
          {filteredImages.map((img) => {
            const isSelected = selectedIds.has(img.id);

            return (
              <div
                key={img.id}
                className={cn(
                  "group relative mb-4 break-inside-avoid overflow-hidden rounded-xl border bg-surface-light transition-all duration-200",
                  isSelected
                    ? "border-accent ring-2 ring-accent/30"
                    : "border-surface-lighter hover:border-surface-hover",
                )}
              >
                {/* Thumbnail */}
                <div className="relative w-full">
                  <img
                    src={img.resultUrl}
                    alt={img.filename}
                    className="w-full object-cover"
                    loading="lazy"
                  />

                  {/* Hover overlay */}
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => setPreviewImage(img)}
                      className="rounded-lg bg-surface-light p-2 text-gray-300 hover:text-white transition-colors"
                      title="Ver"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push(`/editor?imageUrl=${encodeURIComponent(img.resultUrl)}`)}
                      className="rounded-lg bg-surface-light p-2 text-gray-300 hover:text-accent-light transition-colors"
                      title="Abrir en Editor"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadImage(img)}
                      className="rounded-lg bg-surface-light p-2 text-gray-300 hover:text-white transition-colors"
                      title="Descargar"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeImage(img.id)}
                      className="rounded-lg bg-surface-light p-2 text-gray-300 hover:text-red-400 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Select checkbox */}
                  <button
                    type="button"
                    onClick={() => toggleSelect(img.id)}
                    className={cn(
                      "absolute left-2 top-2 rounded-md p-1 transition-all",
                      isSelected
                        ? "bg-accent text-white"
                        : "bg-black/40 text-gray-400 opacity-0 group-hover:opacity-100",
                    )}
                  >
                    {isSelected ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="truncate text-xs font-medium text-gray-200">
                    {img.filename}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 text-gray-500" />
                    <span className="text-[10px] text-gray-500">{img.date}</span>
                    <span className="text-[10px] text-gray-600">| {img.project}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {img.operations.map((op) => (
                      <Badge key={op} size="sm" variant="default">
                        {op}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      <Modal
        open={previewImage !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewImage(null);
        }}
        title={previewImage?.filename ?? "Vista Previa"}
        size="lg"
      >
        {previewImage && (
          <div className="space-y-4">
            {/* Before / After comparison */}
            {previewImage.originalUrl ? (
              <ImageCompare
                beforeSrc={previewImage.originalUrl}
                afterSrc={previewImage.resultUrl}
                beforeLabel="Original"
                afterLabel="Procesada"
                className="w-full"
              />
            ) : (
              <div className="overflow-hidden rounded-xl border border-surface-lighter">
                <img
                  src={previewImage.resultUrl}
                  alt={previewImage.filename}
                  className="w-full object-contain"
                />
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-1">
              {previewImage.operations.map((op) => (
                <Badge key={op} variant="default">
                  {op}
                </Badge>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<ChevronLeft className="h-4 w-4" />}
                onClick={() => navigatePreview("prev")}
              >
                Anterior
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Download className="h-4 w-4" />}
                onClick={() => downloadImage(previewImage)}
              >
                Descargar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                rightIcon={<ChevronRight className="h-4 w-4" />}
                onClick={() => navigatePreview("next")}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </Modal>
      </div>
    </div>
  );
}
