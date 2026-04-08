import { Router } from "express";
import db from "../db/index.js";
import { authenticateToken, AuthRequest } from "../middlewares/auth.js";

const router = Router();

// Get Favorites
router.get("/", authenticateToken, (req: AuthRequest, res) => {
  const rows = db.prepare(`
    SELECT s.* FROM software s
    JOIN favorites f ON s.id = f.software_id
    WHERE f.user_id = ?
  `).all(req.user.id).map((row: any) => ({
    ...row,
    platforms: JSON.parse(row.platforms),
    screenshots: JSON.parse(row.screenshots)
  }));
  
  res.json({ code: 0, message: "success", data: rows });
});

// Toggle Favorite
router.post("/", authenticateToken, (req: AuthRequest, res) => {
  const { software_id } = req.body;
  const user_id = req.user.id;
  
  const existing = db.prepare("SELECT * FROM favorites WHERE user_id = ? AND software_id = ?").get(user_id, software_id);
  
  if (existing) {
    db.prepare("DELETE FROM favorites WHERE user_id = ? AND software_id = ?").run(user_id, software_id);
    res.json({ code: 0, message: "Removed from favorites", data: { isFavorite: false } });
  } else {
    db.prepare("INSERT INTO favorites (user_id, software_id) VALUES (?, ?)").run(user_id, software_id);
    res.json({ code: 0, message: "Added to favorites", data: { isFavorite: true } });
  }
});

// Check Favorite Status
router.get("/:software_id", authenticateToken, (req: AuthRequest, res) => {
  const { software_id } = req.params;
  const user_id = req.user.id;
  const existing = db.prepare("SELECT * FROM favorites WHERE user_id = ? AND software_id = ?").get(user_id, software_id);
  res.json({ code: 0, message: "success", data: { isFavorite: !!existing } });
});

export default router;
