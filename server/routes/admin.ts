import { Router } from "express";
import db from "../db/index.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

// Middleware to check if user is admin
const isAdmin = (req: any, res: any, next: any) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.json({ code: 403, message: "Forbidden: Admin access required" });
  }
};

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
    const { id } = req.params;
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
    const { id } = req.params;
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

export default router;
