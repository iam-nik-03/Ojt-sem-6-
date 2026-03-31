import express from "express";
import { createServer as createViteServer } from "vite";
import cookieParser from "cookie-parser";
import compression from "compression";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import userAuthRoutes from "./server/routes/userAuthRoutes";
import authRoutes from "./server/routes/authRoutes";
import importRoutes from "./server/routes/importRoutes";
import streamRoutes from "./server/routes/streamRoutes";
import youtubeRoutes from "./server/routes/youtubeRoutes";
import exportRoutes from "./server/routes/exportRoutes";
import { authMiddleware, adminMiddleware } from "./server/middleware/authMiddleware";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable Gzip compression
  app.use(compression());
  
  app.use(express.json());
  app.use(cookieParser());

  // API Routes
  app.use("/api/auth", userAuthRoutes);
  app.use("/api/gdrive", authMiddleware, authRoutes);
  app.use("/api/import", authMiddleware, importRoutes);
  app.use("/api/stream", authMiddleware, streamRoutes);
  app.use("/api/youtube", youtubeRoutes);
  app.use("/api/export", authMiddleware, adminMiddleware, exportRoutes);
  
  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok",
      env: {
        hasYoutubeKey: !!process.env.YOUTUBE_API_KEY,
        hasViteYoutubeKey: !!process.env.VITE_YOUTUBE_API_KEY,
        hasDriveKey: !!process.env.VITE_GOOGLE_DRIVE_API_KEY,
        nodeEnv: process.env.NODE_ENV
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("[Server] Running in DEVELOPMENT mode with Vite HMR");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("[Server] Running in PRODUCTION mode serving from /dist");
    const distPath = path.join(__dirname, "dist");
    
    // Serve static files in production
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
