import { Router } from "express";
import db from "../db/index.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

// Get Download History
router.get("/history", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const result = await db.execute({
      sql: `SELECT s.*, l.created_at as download_at 
            FROM download_logs l 
            JOIN software s ON l.software_id = s.id 
            WHERE l.user_id = ? 
            ORDER BY l.created_at DESC`,
      args: [userId]
    });

    const parseJson = (str: string | null, fallback: any) => {
      if (!str) return fallback;
      try {
        return JSON.parse(str);
      } catch (e) {
        return fallback;
      }
    };

    const rows = result.rows.map((row: any) => ({
      ...row,
      platforms: parseJson(row.platforms, []),
      screenshots: parseJson(row.screenshots, [])
    }));

    res.json({ code: 0, message: "success", data: rows });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

// Get Personalized Recommendations
router.get("/recommendations", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    
    // Get user's favorite categories
    const favCatsResult = await db.execute({
      sql: "SELECT DISTINCT s.category FROM favorites f JOIN software s ON f.software_id = s.id WHERE f.user_id = ?",
      args: [userId]
    });
    
    const categories = favCatsResult.rows.map(r => r.category);
    
    if (categories.length === 0) {
      // Fallback: Just popular software
      const fallback = await db.execute({
        sql: "SELECT * FROM software ORDER BY popularity DESC LIMIT 8"
      });
      
      const parseJson = (str: string | null, fallbackVal: any) => {
        if (!str) return fallbackVal;
        try {
          return JSON.parse(str);
        } catch (e) {
          return fallbackVal;
        }
      };

      const rows = fallback.rows.map((row: any) => ({
        ...row,
        platforms: parseJson(row.platforms, []),
        screenshots: parseJson(row.screenshots, [])
      }));

      res.json({ code: 0, message: "success", data: rows });
      return;
    }

    // Recommend software from same categories that user hasn't favorited yet
    const placeholders = categories.map(() => "?").join(",");
    const result = await db.execute({
      sql: `SELECT * FROM software 
            WHERE category IN (${placeholders}) 
            AND id NOT IN (SELECT software_id FROM favorites WHERE user_id = ?)
            ORDER BY popularity DESC 
            LIMIT 8`,
      args: [...categories, userId]
    });

    const parseJson = (str: string | null, fallback: any) => {
      if (!str) return fallback;
      try {
        return JSON.parse(str);
      } catch (e) {
        return fallback;
      }
    };

    const rows = result.rows.map((row: any) => ({
      ...row,
      platforms: parseJson(row.platforms, []),
      screenshots: parseJson(row.screenshots, [])
    }));

    res.json({ code: 0, message: "success", data: rows });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

// Get Notifications
router.get("/notifications", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const result = await db.execute({
      sql: "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
      args: [userId]
    });
    
    const unreadCountResult = await db.execute({
      sql: "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0",
      args: [userId]
    });

    res.json({ 
      code: 0, 
      message: "success", 
      data: {
        items: result.rows,
        unreadCount: unreadCountResult.rows[0].count
      }
    });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

// Mark Notification as Read
router.post("/notifications/:id/read", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const id = req.params.id;
    await db.execute({
      sql: "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
      args: [id, userId]
    });
    res.json({ code: 0, message: "success" });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

// Mark All Notifications as Read
router.post("/notifications/read-all", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    await db.execute({
      sql: "UPDATE notifications SET is_read = 1 WHERE user_id = ?",
      args: [userId]
    });
    res.json({ code: 0, message: "success" });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

// Delete Notification
router.delete("/notifications/:id", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const id = req.params.id;
    await db.execute({
      sql: "DELETE FROM notifications WHERE id = ? AND user_id = ?",
      args: [id, userId]
    });
    res.json({ code: 0, message: "success" });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

// Update Profile
router.post("/profile", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { username, email } = req.body;
    
    if (!username) {
      res.json({ code: 400, message: "Username is required" });
      return;
    }

    await db.execute({
      sql: "UPDATE users SET username = ?, email = ? WHERE id = ?",
      args: [username, email || null, userId]
    });

    res.json({ code: 0, message: "success" });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

export default router;
