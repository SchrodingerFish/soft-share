import { Router } from "express";
import db from "../db/index.js";
import { authenticate, isAdmin } from "../middlewares/auth.js";

const router = Router();

// Get All Collections
router.get("/", async (req, res) => {
  try {
    const result = await db.execute("SELECT * FROM collections");
    const rows = result.rows.map((row: any) => ({
      ...row,
      software_ids: JSON.parse(row.software_ids as string)
    }));
    res.json({ code: 0, message: "success", data: rows });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

// Get Collection Detail (with software items)
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await db.execute({
      sql: "SELECT * FROM collections WHERE id = ?",
      args: [id]
    });
    
    const collection = result.rows[0] as any;
    if (!collection) {
      res.json({ code: 404, message: "Not found" });
      return;
    }
    
    const softwareIds = JSON.parse(collection.software_ids as string);
    if (softwareIds.length === 0) {
      res.json({ code: 0, message: "success", data: { ...collection, software_ids: [], items: [] } });
      return;
    }

    // Fetch software items
    const placeholders = softwareIds.map(() => "?").join(",");
    const softwareResult = await db.execute({
      sql: `SELECT * FROM software WHERE id IN (${placeholders})`,
      args: softwareIds
    });

    const parseJson = (str: string | null, fallback: any) => {
      if (!str) return fallback;
      try {
        return JSON.parse(str);
      } catch (e) {
        return fallback;
      }
    };

    const items = softwareResult.rows.map((row: any) => ({
      ...row,
      platforms: parseJson(row.platforms as string, []),
      screenshots: parseJson(row.screenshots as string, []),
      version_history: parseJson(row.version_history as string, []),
      tags: parseJson(row.tags as string, [])
    }));

    res.json({
      code: 0,
      message: "success",
      data: {
        ...collection,
        software_ids: softwareIds,
        items
      }
    });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

// Admin: Add Collection
router.post("/", authenticate, isAdmin, async (req, res) => {
  try {
    const { title, title_en, description, description_en, cover_image, software_ids } = req.body;
    const sql = process.env.DB_TYPE === "postgres"
      ? "INSERT INTO collections (title, title_en, description, description_en, cover_image, software_ids) VALUES (?, ?, ?, ?, ?, ?) RETURNING id"
      : "INSERT INTO collections (title, title_en, description, description_en, cover_image, software_ids) VALUES (?, ?, ?, ?, ?, ?)";
    
    const result = await db.execute({
      sql,
      args: [title, title_en || title, description, description_en || description, cover_image, JSON.stringify(software_ids || [])]
    });
    
    const id = process.env.DB_TYPE === "postgres" 
      ? (result.rows && result.rows.length > 0 ? (result.rows[0] as any).id : null)
      : result.lastInsertRowid;
    res.json({ code: 0, message: "success", data: { id } });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

// Admin: Update Collection
router.put("/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, title_en, description, description_en, cover_image, software_ids } = req.body;
    await db.execute({
      sql: "UPDATE collections SET title = ?, title_en = ?, description = ?, description_en = ?, cover_image = ?, software_ids = ? WHERE id = ?",
      args: [title, title_en || title, description, description_en || description, cover_image, JSON.stringify(software_ids || []), id]
    });
    res.json({ code: 0, message: "success" });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

// Admin: Delete Collection
router.delete("/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.execute({ sql: "DELETE FROM collections WHERE id = ?", args: [id] });
    res.json({ code: 0, message: "success" });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

export default router;
