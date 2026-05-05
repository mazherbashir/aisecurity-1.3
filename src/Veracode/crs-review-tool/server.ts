import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs/promises";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Prompts Config Routes
  const promptsPath = path.join(process.cwd(), 'src', 'config', 'prompts.json');

  app.get("/api/prompts", async (req, res) => {
    try {
      const data = await fs.readFile(promptsPath, 'utf-8');
      res.json(JSON.parse(data));
    } catch (error) {
      console.error('Error reading prompts:', error);
      res.status(500).json({ error: 'Failed to read prompts' });
    }
  });

  app.post("/api/prompts", async (req, res) => {
    try {
      const { sast, sca } = req.body;
      await fs.writeFile(promptsPath, JSON.stringify({ sast, sca }, null, 2));
      res.json({ success: true });
    } catch (error) {
      console.error('Error writing prompts:', error);
      res.status(500).json({ error: 'Failed to save prompts' });
    }
  });

  // AI API Route
  app.post("/api/ai", async (req, res) => {
    const { comment, provider } = req.body;

    if (!comment) {
      return res.status(400).json({ error: "Comment is required" });
    }

    const prompt = comment; // The prompt is now fully built on the frontend

    try {
      if (provider === 'azure') {
        const apiKey = process.env.VITE_AZURE_OPENAI_KEY;
        const endpoint = process.env.VITE_AZURE_OPENAI_ENDPOINT;
        const deployment = process.env.VITE_AZURE_OPENAI_DEPLOYMENT;

        if (!apiKey || !endpoint || !deployment) {
          throw new Error('Azure OpenAI configuration missing (Key, Endpoint, or Deployment)');
        }

        const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2023-05-15`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey,
          },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: 'You are a security audit expert.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 500,
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(`Azure Error: ${err.error?.message || response.statusText}`);
        }

        const data = await response.json();
        res.json({ text: data.choices[0].message.content });
      } else {
        const geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
        const response = await geminiClient.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
        });
        res.json({ text: response.text || 'AI could not generate a response.' });
      }
    } catch (error) {
      console.error('Error fetching AI response:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: errorMessage });
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
