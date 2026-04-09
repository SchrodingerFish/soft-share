import { Router } from "express";
import db from "../db/index.js";
import { authenticate, AuthRequest } from "../middlewares/auth.js";

const router = Router();

// Get Favorites
router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await db.execute({
      sql: `
        SELECT s.* FROM software s
        JOIN favorites f ON s.id = f.software_id
        WHERE f.user_id = ?
      `,
      args: [req.user!.id]
    });
    
    const rows = result.rows.map((row: any) => ({
      ...row,
      platforms: JSON.parse(row.platforms as string),
      screenshots: JSON.parse(row.screenshots as string)
    }));
    
    res.json({ code: 0, message: "success", data: rows });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

// Toggle Favorite
router.post("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const { software_id } = req.body;
    const user_id = req.user!.id;
    
    const existingResult = await db.execute({
      sql: "SELECT * FROM favorites WHERE user_id = ? AND software_id = ?",
      args: [user_id, software_id]
    });
    
    const existing = existingResult.rows[0];
    
    if (existing) {
      await db.execute({
        sql: "DELETE FROM favorites WHERE user_id = ? AND software_id = ?",
        args: [user_id, software_id]
      });
      res.json({ code: 0, message: "Removed from favorites", data: { isFavorite: false } });
    } else {
      await db.execute({
        sql: "INSERT INTO favorites (user_id, software_id) VALUES (?, ?)",
        args: [user_id, software_id]
      });
      res.json({ code: 0, message: "Added to favorites", data: { isFavorite: true } });
    }
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

// Check Favorite Status
router.get("/:software_id", authenticate, async (req: AuthRequest, res) => {
  try {
    const { software_id } = req.params;
    const user_id = req.user!.id;
    
    const existingResult = await db.execute({
      sql: "SELECT * FROM favorites WHERE user_id = ? AND software_id = ?",
      args: [user_id, software_id]
    });
    
    const existing = existingResult.rows[0];
    res.json({ code: 0, message: "success", data: { isFavorite: !!existing } });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

export default router;
