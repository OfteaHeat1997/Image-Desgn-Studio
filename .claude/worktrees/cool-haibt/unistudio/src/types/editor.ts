// =============================================================================
// Editor Types - UniStudio
// =============================================================================

/** Available filter adjustments for an image layer */
export interface LayerFilters {
  brightness: number;    // -100 to 100, default 0
  contrast: number;      // -100 to 100, default 0
  saturation: number;    // -100 to 100, default 0
  blur: number;          // 0 to 100, default 0
  sharpness: number;     // 0 to 100, default 0
  hue: number;           // -180 to 180, default 0
  opacity: number;       // 0 to 100, default 100
  grayscale: boolean;
  sepia: boolean;
  invert: boolean;
}

/** Default filter values */
export const DEFAULT_FILTERS: LayerFilters = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  blur: 0,
  sharpness: 0,
  hue: 0,
  opacity: 100,
  grayscale: false,
  sepia: false,
  invert: false,
};

/** The type of content a layer holds */
export type LayerType = 'image' | 'text' | 'shape' | 'group' | 'adjustment';

/** A single layer on the editor canvas */
export interface ImageLayer {
  id: string;
  name: string;
  type: LayerType;
  src: string;           // data URL, blob URL, or remote URL
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;      // degrees, 0-360
  opacity: number;       // 0 to 1
  flipX: boolean;        // horizontal flip
  flipY: boolean;        // vertical flip
  visible: boolean;
  locked: boolean;
  filters: LayerFilters;
}

/** A snapshot of the editor state used for undo/redo */
export interface HistoryEntry {
  layers: ImageLayer[];
  selectedLayerId: string | null;
  timestamp: number;
}

/** The full state of the editor canvas */
export interface EditorState {
  layers: ImageLayer[];
  selectedLayerId: string | null;
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;          // 0.1 to 10, where 1 = 100%
  history: HistoryEntry[];
  historyIndex: number;  // current position in history stack (-1 = no history)
}

/** Tool types available in the editor toolbar */
export type Tool =
  | 'select'
  | 'crop'
  | 'text'
  | 'shape'
  | 'brush'
  | 'eraser'
  | 'pan'
  | 'zoom';

/** Supported export image formats */
export type ExportFormat = 'png' | 'jpg' | 'webp';

/** Configuration for exporting an image from the editor */
export interface ExportOptions {
  format: ExportFormat;
  quality: number;       // 0 to 100
  width: number;
  height: number;
  background: string;    // CSS color value, e.g. '#ffffff' or 'transparent'
}

/** Status of an asynchronous processing job */
export type ProcessingStatus = 'idle' | 'processing' | 'completed' | 'failed';

/** A generic processing job (bg removal, enhancement, upscale, etc.) */
export interface ProcessingJob {
  id: string;
  type: string;          // e.g. 'bg-remove', 'enhance', 'upscale', 'shadow'
  status: ProcessingStatus;
  progress: number;      // 0 to 100
  result: string | null; // resulting image URL or data URL on success
  error: string | null;  // error message on failure
  cost: number;          // cost in dollars for this operation
}
