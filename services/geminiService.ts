
import { GoogleGenAI } from "@google/genai";

export const removeBackgroundAndOptimize = async (
  base64Image: string, 
  mimeType: string, 
  customInstructions?: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const baseInstruction = "Perform a professional background removal on this person. Replace the background with a pure, solid white color (#FFFFFF). Ensure the edges of the person are sharp and clean. Center the person's head and shoulders as if taking a formal passport photo. The result must be a high-quality image of only the person on white background.";
  
  const finalPrompt = customInstructions 
    ? `${baseInstruction} Additionally, apply these user requested modifications: ${customInstructions}. Ensure the final output still adheres to passport standards.`
    : baseInstruction;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType,
          },
        },
        {
          text: finalPrompt,
        },
      ],
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image data returned from Gemini API");
};
