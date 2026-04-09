import { Router } from "express";
import db from "../db/index.js";
import { authenticate, isAdmin } from "../middlewares/auth.js";

const router = Router();

// Submit a software
router.post("/", authenticate, async (req: any, res) => {
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
      sql: "SELECT s.*, u.username FROM submissions s JOIN users u ON s.user_id = u.id ORDER BY s.created_at DESC"
    });
    res.json({ code: 0, message: "success", data: result.rows });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

// Update submission status (Admin only)
router.put("/:id/status", authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
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

    res.json({ code: 0, message: "Status updated" });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

export default router;
