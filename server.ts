import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

// Load .env file with override: true to prioritize local .env over system environment variables
dotenv.config({ override: true });

import { initDb } from "./server/db/index.js";
import { startLinkCheckerTask } from "./server/services/linkChecker.js";
import authRoutes from "./server/routes/auth.js";
import softwareRoutes from "./server/routes/software.js";
import favoritesRoutes from "./server/routes/favorites.js";
import collectionsRoutes from "./server/routes/collections.js";
import commentsRoutes from "./server/routes/comments.js";
import submissionsRoutes from "./server/routes/submissions.js";
import rankingsRoutes from "./server/routes/rankings.js";
import userRoutes from "./server/routes/user.js";
import aiRoutes from "./server/routes/ai.js";
import adminRoutes from "./server/routes/admin.js";
// import { verifySignature } from "./server/middlewares/signature.js"; 
// Note: verifySignature is available if you want to protect specific backend routes from external callers.

async function startServer() {
  // Initialize database before starting the server
  await initDb();
  
  // Start automated link checker (checks every 24 hours)
  startLinkCheckerTask();

  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // --- API Routes ---
  app.use("/api/auth", authRoutes);
  app.use("/api/software", softwareRoutes);
  app.use("/api/favorites", favoritesRoutes);
  app.use("/api/collections", collectionsRoutes);
  app.use("/api/comments", commentsRoutes);
  app.use("/api/submissions", submissionsRoutes);
  app.use("/api/rankings", rankingsRoutes);
  app.use("/api/user", userRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/admin", adminRoutes);

  // --- Vite Middleware ---
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
