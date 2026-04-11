import { Router } from "express";
import db from "../db/index.js";
import { authenticate, isAdmin } from "../middlewares/auth.js";

const router = Router();

// Get all users
router.get("/users", authenticate, isAdmin, async (req, res) => {
  try {
    const result = await db.execute("SELECT id, username, role, email, is_paid FROM users ORDER BY id DESC");
    res.json({ code: 0, message: "success", data: result.rows });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

// Update user paid status
router.post("/users/:id/paid", authenticate, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { is_paid } = req.body;
    
    const isPostgres = process.env.DB_TYPE === "postgres";
    const paidValue = isPostgres ? (is_paid ? true : false) : (is_paid ? 1 : 0);

    await db.execute({
      sql: "UPDATE users SET is_paid = ? WHERE id = ?",
      args: [paidValue, id]
    });
    
    res.json({ code: 0, message: "success" });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

// Update user role
router.post("/users/:id/role", authenticate, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { role } = req.body;
    
    await db.execute({
      sql: "UPDATE users SET role = ? WHERE id = ?",
      args: [role, id]
    });
    
    res.json({ code: 0, message: "success" });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

// --- Tags Management ---
router.get("/tags", async (req, res) => {
  try {
    const result = await db.execute("SELECT * FROM tags ORDER BY id ASC");
    res.json({ code: 0, message: "success", data: result.rows });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

router.post("/tags", authenticate, isAdmin, async (req, res) => {
  try {
    const { name, name_en, color } = req.body;
    await db.execute({
      sql: "INSERT INTO tags (name, name_en, color) VALUES (?, ?, ?)",
      args: [name, name_en || name, color || "gray"]
    });
    res.json({ code: 0, message: "success" });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

router.put("/tags/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, name_en, color } = req.body;
    await db.execute({
      sql: "UPDATE tags SET name = ?, name_en = ?, color = ? WHERE id = ?",
      args: [name, name_en || name, color || "gray", id]
    });
    res.json({ code: 0, message: "success" });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

router.delete("/tags/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.execute({
      sql: "DELETE FROM tags WHERE id = ?",
      args: [id]
    });
    res.json({ code: 0, message: "success" });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

export default router;
