import { Router } from "express";
import db from "../db/index.js";
import { authenticate } from "../middlewares/auth.js";
import { actionLimiter } from "../middlewares/rateLimiter.js";
import { validate } from "../middlewares/validate.js";
import { commentSchema } from "../schemas/index.js";

const router = Router();

// Get comments for a software
router.get("/:softwareId", async (req, res) => {
  try {
    const { softwareId } = req.params;
    const result = await db.execute({
      sql: `SELECT c.*, u.username FROM comments c 
            JOIN users u ON c.user_id = u.id 
            WHERE c.software_id = ? 
            ORDER BY c.created_at DESC`,
      args: [softwareId]
    });
    res.json({ code: 0, message: "success", data: result.rows });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

// Add a comment
router.post("/", authenticate, actionLimiter, validate(commentSchema), async (req: any, res) => {
  try {
    const { software_id, rating, content } = req.body;
    const user_id = req.user.id;

    if (!software_id || !rating || !content) {
      res.json({ code: 400, message: "Missing required fields" });
      return;
    }

    await db.execute({
      sql: "INSERT INTO comments (user_id, software_id, rating, content) VALUES (?, ?, ?, ?)",
      args: [user_id, software_id, rating, content]
    });

    // Update software popularity (simple increment for now)
    await db.execute({
      sql: "UPDATE software SET popularity = popularity + 10 WHERE id = ?",
      args: [software_id]
    });

    res.json({ code: 0, message: "success" });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

export default router;
