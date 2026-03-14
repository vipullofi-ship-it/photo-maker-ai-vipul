import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for base64 images
  app.use(express.json({ limit: '50mb' }));

  // API route for AI Studio (this mimics the Netlify function locally)
  app.post("/api/process-image", async (req, res) => {
    try {
      const { base64Image, mimeType, customInstructions } = req.body;
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const baseInstruction = "Perform a professional background removal on this person. Replace the background with a pure, solid white color (#FFFFFF). Ensure the edges of the person are sharp and clean. Center the person's head and shoulders as if taking a formal passport photo. The result must be a high-quality image of only the person on white background.";
      
      const finalPrompt = customInstructions 
        ? `${baseInstruction} Additionally, apply these user requested modifications: ${customInstructions}. Ensure the final output still adheres to passport standards.`
        : baseInstruction;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: base64Image, mimeType: mimeType } },
            { text: finalPrompt },
          ],
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return res.json({ imageUrl: `data:image/png;base64,${part.inlineData.data}` });
        }
      }

      throw new Error("No image data returned from Gemini API");
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to process image' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const path = await import('path');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
