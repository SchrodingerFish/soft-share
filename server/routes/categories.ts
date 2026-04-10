import { Router } from "express";
import db from "../db/index.js";
import { authenticate, isAdmin } from "../middlewares/auth.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const result = await db.execute({
      sql: "SELECT * FROM categories ORDER BY id ASC"
    });
    res.json({ code: 0, message: "success", data: result.rows });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

router.post("/", authenticate, isAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.json({ code: 400, message: "Name is required" });
    }
    const result = await db.execute({
      sql: "INSERT INTO categories (name, description) VALUES (?, ?)",
      args: [name, description || ""]
    });
    res.json({ code: 0, message: "success" });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

router.put("/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    if (!name) {
      return res.json({ code: 400, message: "Name is required" });
    }
    const result = await db.execute({
      sql: "UPDATE categories SET name = ?, description = ? WHERE id = ?",
      args: [name, description || "", id]
    });
    res.json({ code: 0, message: "success" });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

router.delete("/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.execute({
      sql: "DELETE FROM categories WHERE id = ?",
      args: [id]
    });
    res.json({ code: 0, message: "success" });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

export default router;
