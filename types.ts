
export interface ProcessedPhoto {
  id: string;
  originalName: string;
  originalUrl: string;
  processedUrl: string | null;
  status: 'idle' | 'processing' | 'ready' | 'error';
  error?: string;
  quantity: number;
}

export interface SheetPhoto {
  id: string;
  photoId: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PrintSettings {
  photoWidthCm: number;
  photoHeightCm: number;
  spacingMm: number;
  maxHorizontal: number;
}

export const PASSPORT_SETTINGS: PrintSettings = {
  photoWidthCm: 3.1,
  photoHeightCm: 4.2,
  spacingMm: 4,
  maxHorizontal: 6 // Strictly enforced: 6 photos horizontally
};

export const A4_WIDTH_CM = 21.0;
export const A4_HEIGHT_CM = 29.7;
export const CM_TO_PX = 118.11;
export const CM_TO_VIEWPORT = 35;
