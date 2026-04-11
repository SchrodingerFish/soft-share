import { Router } from "express";
import db from "../db/index.js";

const router = Router();

// Today's hot software
router.get("/hot", async (req, res) => {
  try {
    const result = await db.execute({
      sql: `SELECT s.id, s.name, s.category, c.name_en as category_en, s.screenshots, COUNT(l.id) as download_count 
            FROM software s 
            LEFT JOIN categories c ON s.category = c.name
            LEFT JOIN download_logs l ON s.id = l.software_id 
            WHERE l.created_at >= ${process.env.DB_TYPE === 'postgres' ? "CURRENT_DATE" : "date('now')"} 
            GROUP BY s.id, c.name_en 
            ORDER BY download_count DESC 
            LIMIT 20`
    });
    
    const parseJson = (str: string | null, fallbackVal: any) => {
      if (!str) return fallbackVal;
      try {
        return JSON.parse(str);
      } catch (e) {
        return fallbackVal;
      }
    };

    // Fallback if no downloads today
    if (result.rows.length === 0) {
      const fallback = await db.execute({
        sql: "SELECT s.id, s.name, s.category, c.name_en as category_en, s.screenshots, s.platforms, s.tags, s.popularity as download_count FROM software s LEFT JOIN categories c ON s.category = c.name ORDER BY s.popularity DESC LIMIT 20"
      });
      const rows = fallback.rows.map((row: any) => ({
        ...row,
        platforms: parseJson(row.platforms, []),
        screenshots: parseJson(row.screenshots, []),
        tags: parseJson(row.tags, [])
      }));
      res.json({ code: 0, message: "success", data: rows });
      return;
    }

    const rows = result.rows.map((row: any) => ({
      ...row,
      platforms: parseJson(row.platforms, []),
      screenshots: parseJson(row.screenshots, []),
      tags: parseJson(row.tags, [])
    }));
    res.json({ code: 0, message: "success", data: rows });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

// Weekly ranking
router.get("/weekly", async (req, res) => {
  try {
    const parseJson = (str: string | null, fallbackVal: any) => {
      if (!str) return fallbackVal;
      try {
        return JSON.parse(str);
      } catch (e) {
        return fallbackVal;
      }
    };

    const result = await db.execute({
      sql: `SELECT s.id, s.name, s.category, c.name_en as category_en, s.screenshots, COUNT(l.id) as download_count 
            FROM software s 
            LEFT JOIN categories c ON s.category = c.name
            LEFT JOIN download_logs l ON s.id = l.software_id 
            WHERE l.created_at >= ${process.env.DB_TYPE === 'postgres' ? "CURRENT_DATE - INTERVAL '7 days'" : "date('now', '-7 days')"} 
            GROUP BY s.id, c.name_en 
            ORDER BY download_count DESC 
            LIMIT 20`
    });

    // Fallback
    if (result.rows.length === 0) {
      const fallback = await db.execute({
        sql: "SELECT s.id, s.name, s.category, c.name_en as category_en, s.screenshots, s.platforms, s.tags, s.popularity as download_count FROM software s LEFT JOIN categories c ON s.category = c.name ORDER BY s.popularity DESC LIMIT 20"
      });
      const rows = fallback.rows.map((row: any) => ({
        ...row,
        platforms: parseJson(row.platforms, []),
        screenshots: parseJson(row.screenshots, []),
        tags: parseJson(row.tags, [])
      }));
      res.json({ code: 0, message: "success", data: rows });
      return;
    }

    const rows = result.rows.map((row: any) => ({
      ...row,
      platforms: parseJson(row.platforms, []),
      screenshots: parseJson(row.screenshots, []),
      tags: parseJson(row.tags, [])
    }));
    res.json({ code: 0, message: "success", data: rows });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

export default router;
