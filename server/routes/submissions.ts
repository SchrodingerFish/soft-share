import { Router } from "express";
import db from "../db/index.js";
import { authenticate, isAdmin } from "../middlewares/auth.js";
import { actionLimiter } from "../middlewares/rateLimiter.js";
import { validate } from "../middlewares/validate.js";
import { submissionSchema } from "../schemas/index.js";

const router = Router();

// Submit a software
router.post("/", authenticate, actionLimiter, validate(submissionSchema), async (req: any, res) => {
  try {
    const { name, version, platforms, category, size, description, download_url } = req.body;
    const user_id = req.user.id;

    if (!name || !download_url) {
      res.json({ code: 400, message: "Name and Download URL are required" });
      return;
    }

    await db.execute({
      sql: `INSERT INTO submissions (user_id, name, version, platforms, category, size, description, download_url) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [user_id, name, version, JSON.stringify(platforms || []), category, size, description, download_url]
    });

    res.json({ code: 0, message: "Submission successful, waiting for review" });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

// List submissions (Admin only)
router.get("/", authenticate, isAdmin, async (req, res) => {
  try {
    const result = await db.execute({
      sql: `SELECT s.*, u.username, c.name_en as category_en 
            FROM submissions s 
            JOIN users u ON s.user_id = u.id 
            LEFT JOIN categories c ON s.category = c.name 
            ORDER BY s.created_at DESC`
    });
    
    const rows = result.rows.map((row: any) => ({
      ...row,
      platforms: JSON.parse(row.platforms as string || "[]")
    }));
    
    res.json({ code: 0, message: "success", data: rows });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

// Update submission status (Admin only)
router.put("/:id/status", authenticate, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body; // 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      res.json({ code: 400, message: "Invalid status" });
      return;
    }

    await db.execute({
      sql: "UPDATE submissions SET status = ? WHERE id = ?",
      args: [status, id]
    });

    // If approved, add to software table
    if (status === 'approved') {
      const subResult = await db.execute({ sql: "SELECT * FROM submissions WHERE id = ?", args: [id] });
      const sub = subResult.rows[0];
      if (sub) {
        await db.execute({
          sql: `INSERT INTO software (name, version, platforms, category, size, update_date, description, screenshots, popularity, download_url) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            sub.name, sub.version, sub.platforms, sub.category, sub.size, 
            new Date().toISOString().split('T')[0], sub.description, 
            '[]', 0, sub.download_url
          ]
        });
      }
    }

    // Notify the user who submitted
    const subResult = await db.execute({ sql: "SELECT user_id, name FROM submissions WHERE id = ?", args: [id] });
    const sub = subResult.rows[0];
    if (sub) {
      const title = status === 'approved' ? 'Submission Approved' : 'Submission Rejected';
      const content = `Your submission for ${sub.name} has been ${status}.`;
      
      await db.execute({
        sql: "INSERT INTO notifications (user_id, title, content, type) VALUES (?, ?, ?, ?)",
        args: [sub.user_id, title, content, "system"]
      });

      const { getIO } = await import("../socket.js");
      const io = getIO();
      io.to(`user_${sub.user_id}`).emit("notification", {
        title,
        content,
        type: "system"
      });
    }

    res.json({ code: 0, message: "Status updated" });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

export default router;
