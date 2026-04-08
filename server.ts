import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import path from "path";
import fs from "fs";

import authRoutes from "./server/routes/auth.js";
import softwareRoutes from "./server/routes/software.js";
import favoritesRoutes from "./server/routes/favorites.js";
// import { verifySignature } from "./server/middlewares/signature.js"; 
// Note: verifySignature is available if you want to protect specific backend routes from external callers.

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // --- API Routes ---
  app.use("/api/auth", authRoutes);
  app.use("/api/software", softwareRoutes);
  app.use("/api/favorites", favoritesRoutes);

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
