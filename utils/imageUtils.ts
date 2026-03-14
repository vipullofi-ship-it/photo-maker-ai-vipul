
import { CM_TO_PX, A4_WIDTH_CM, A4_HEIGHT_CM, PrintSettings } from '../types';

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64String = result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
  });
};

/**
 * Crops an image based on provided pixel coordinates
 */
export const cropImageToDataUrl = async (
  imageUrl: string,
  crop: { x: number; y: number; width: number; height: number }
): Promise<string> => {
  const img = await loadImage(imageUrl);
  const canvas = document.createElement('canvas');
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Canvas context failed");

  ctx.drawImage(
    img,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );

  return canvas.toDataURL('image/jpeg', 0.95);
};

export const generateA4Sheet = async (
  photos: { url: string; quantity: number }[],
  settings: PrintSettings
): Promise<string> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Could not get canvas context");

  // Set high-res canvas for 300 DPI A4
  canvas.width = A4_WIDTH_CM * CM_TO_PX;
  canvas.height = A4_HEIGHT_CM * CM_TO_PX;

  // Background white
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const photoWidthPx = settings.photoWidthCm * CM_TO_PX;
  const photoHeightPx = settings.photoHeightCm * CM_TO_PX;
  const spacingPx = (settings.spacingMm / 10) * CM_TO_PX;
  
  // Calculate margins to center the grid horizontally
  const totalGridWidth = (settings.maxHorizontal * photoWidthPx) + ((settings.maxHorizontal - 1) * spacingPx);
  const leftMargin = (canvas.width - totalGridWidth) / 2;
  const topMargin = CM_TO_PX; // 1cm top margin

  let currentX = leftMargin;
  let currentY = topMargin;
  let countInRow = 0;

  for (const photo of photos) {
    const img = await loadImage(photo.url);
    
    for (let i = 0; i < photo.quantity; i++) {
      if (countInRow >= settings.maxHorizontal) {
        countInRow = 0;
        currentX = leftMargin;
        currentY += photoHeightPx + spacingPx;
      }

      // Draw the photo
      ctx.drawImage(img, currentX, currentY, photoWidthPx, photoHeightPx);
      
      // Draw a black border around the photo as requested
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5; // Slightly thicker for clear cutting line
      ctx.strokeRect(currentX, currentY, photoWidthPx, photoHeightPx);

      currentX += photoWidthPx + spacingPx;
      countInRow++;

      if (currentY + photoHeightPx > canvas.height) {
        break; 
      }
    }
  }

  return canvas.toDataURL('image/jpeg', 0.95);
};
