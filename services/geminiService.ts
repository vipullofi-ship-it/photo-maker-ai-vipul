
import { GoogleGenAI } from "@google/genai";

export const removeBackgroundAndOptimize = async (
  base64Image: string, 
  mimeType: string, 
  customInstructions?: string
): Promise<string> => {
  const response = await fetch('/.netlify/functions/process-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Image, mimeType, customInstructions })
  });

  if (!response.ok) {
    throw new Error('Failed to process image on the server');
  }

  const data = await response.json();
  return data.imageUrl;
};
