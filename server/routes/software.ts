import { Router, Response } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import db from "../db/index.js";
import { authenticate, isAdmin, AuthRequest } from "../middlewares/auth.js";
import { checkAllLinks } from "../services/linkChecker.js";
import { actionLimiter } from "../middlewares/rateLimiter.js";
import { validate } from "../middlewares/validate.js";
import { softwareSchema } from "../schemas/index.js";

const router = Router();
const SECRET_KEY = process.env.SECRET_KEY || "default-secret-key";
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-for-dev";

function getVerificationCode(id: number): string {
  const date = new Date();
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const str = `${id}-${dateStr}-${SECRET_KEY}`;
  return crypto.createHash('sha256').update(str).digest('hex').substring(0, 6).toUpperCase();
}

// Get Software List (Pagination, Search, Filter)
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string || "";
    const platform = req.query.platform as string || "";
    const category = req.query.category as string || "";
    
    const offset = (page - 1) * limit;
    
    const parseJson = (str: string | null, fallback: any) => {
      if (!str) return fallback;
      try {
        return JSON.parse(str);
      } catch (e) {
        return fallback;
      }
    };

    let query = "SELECT * FROM software WHERE 1=1";
    const params: any[] = [];
    
    if (search) {
      query += " AND (name LIKE ? OR description LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }
    if (platform) {
      query += " AND platforms LIKE ?";
      params.push(`%${platform}%`);
    }
    if (category) {
      query += " AND category = ?";
      params.push(category);
    }
    
    const countQuery = query.replace("SELECT *", "SELECT COUNT(*) as total");
    const totalResult = await db.execute({ sql: countQuery, args: params });
    const total = totalResult.rows[0].total as number;
    
    query += " ORDER BY popularity DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);
    
    const result = await db.execute({ sql: query, args: params });
    const rows = result.rows.map((row: any) => ({
      ...row,
      platforms: parseJson(row.platforms, []),
      screenshots: parseJson(row.screenshots, [])
    }));
    
    res.json({
      code: 0,
      message: "success",
      data: {
        items: rows,
        total: total,
        page,
        limit
      }
    });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

// Get Software Detail
router.get("/:id", async (req, res) => {
  try {
    const result = await db.execute({
      sql: "SELECT * FROM software WHERE id = ?",
      args: [req.params.id]
    });
    
    const row = result.rows[0] as any;
    if (!row) {
      res.json({ code: 404, message: "Not found" });
      return;
    }

    const parseJson = (str: string | null, fallback: any) => {
      if (!str) return fallback;
      try {
        return JSON.parse(str);
      } catch (e) {
        return fallback;
      }
    };

    // Get Related Software (same category, excluding current)
    const relatedResult = await db.execute({
      sql: "SELECT id, name, version, platforms, category, size, update_date, description, screenshots, popularity, link_status FROM software WHERE category = ? AND id != ? LIMIT 4",
      args: [row.category, row.id]
    });

    // Get average rating
    const ratingResult = await db.execute({
      sql: "SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM comments WHERE software_id = ?",
      args: [row.id]
    });
    const stats = ratingResult.rows[0];

    const related = relatedResult.rows.map((r: any) => ({
      ...r,
      platforms: parseJson(r.platforms, []),
      screenshots: parseJson(r.screenshots, [])
    }));
    
    res.json({
      code: 0,
      message: "success",
      data: {
        ...row,
        platforms: parseJson(row.platforms, []),
        screenshots: parseJson(row.screenshots, []),
        version_history: parseJson(row.version_history, []),
        rating: stats.avg_rating || 0,
        comment_count: stats.count || 0,
        related
      }
    });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

// Get Verification Code Hint
router.get("/:id/hint", async (req, res) => {
  const id = parseInt(req.params.id);
  
  let isPaid = false;
  const token = req.headers.authorization?.split(" ")[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const userResult = await db.execute({
        sql: "SELECT is_paid FROM users WHERE id = ?",
        args: [decoded.id]
      });
      if (userResult.rows.length > 0) {
        const user = userResult.rows[0] as any;
        isPaid = process.env.DB_TYPE === "postgres" ? user.is_paid === true : user.is_paid === 1;
      }
    } catch (e) {}
  }

  if (!isPaid) {
    res.json({ code: 403, message: "Only paid users can view the verification code hint." });
    return;
  }

  res.json({ code: 0, message: "success", data: { hint: getVerificationCode(id) } });
});

// Verify Code and Get Download URL
router.post("/:id/download", actionLimiter, async (req, res) => {
  try {
    const { code } = req.body;
    const id = parseInt(req.params.id);
    
    const expectedCode = getVerificationCode(id);
    
    if (code !== expectedCode) {
      res.json({ code: 400, message: "Invalid verification code" });
      return;
    }
    
    const result = await db.execute({
      sql: "SELECT download_url FROM software WHERE id = ?",
      args: [id]
    });
    
    const row = result.rows[0];
    if (!row) {
      res.json({ code: 404, message: "Software not found" });
      return;
    }

    // Optional: Get user ID from token if logged in
    let userId = null;
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        userId = decoded.id;
      } catch (e) {}
    }

    // Log download
    await db.execute({
      sql: "INSERT INTO download_logs (software_id, user_id) VALUES (?, ?)",
      args: [id, userId]
    });

    // Update popularity
    await db.execute({
      sql: "UPDATE software SET popularity = popularity + 1 WHERE id = ?",
      args: [id]
    });
    
    res.json({ code: 0, message: "success", data: { download_url: row.download_url } });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

// Admin: Add Software
router.post("/", authenticate, isAdmin, validate(softwareSchema), async (req, res) => {
  try {
    const { name, version, platforms, category, size, update_date, description, screenshots, popularity, download_url, version_history, tutorial } = req.body;
    
    const sql = process.env.DB_TYPE === "postgres"
      ? `INSERT INTO software (name, version, platforms, category, size, update_date, description, screenshots, popularity, download_url, version_history, tutorial)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
      : `INSERT INTO software (name, version, platforms, category, size, update_date, description, screenshots, popularity, download_url, version_history, tutorial)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const result = await db.execute({
      sql,
      args: [
        name, version, JSON.stringify(platforms), category, size, update_date, description, 
        JSON.stringify(screenshots), popularity || 0, download_url, 
        JSON.stringify(version_history || []), tutorial || ""
      ]
    });
    
    const id = process.env.DB_TYPE === "postgres" 
      ? result.rows[0].id 
      : result.lastInsertRowid;
      
    res.json({ code: 0, message: "success", data: { id } });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

// Admin: Update Software
router.put("/:id", authenticate, isAdmin, validate(softwareSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { name, version, platforms, category, size, update_date, description, screenshots, popularity, download_url, version_history, tutorial } = req.body;
    const id = req.params.id;
    
    // Check if version has changed
    const currentResult = await db.execute({
      sql: "SELECT version, name FROM software WHERE id = ?",
      args: [id]
    });
    const current = currentResult.rows[0];

    const sql = `UPDATE software SET 
      name = ?, version = ?, platforms = ?, category = ?, size = ?, 
      update_date = ?, description = ?, screenshots = ?, popularity = ?, download_url = ?,
      version_history = ?, tutorial = ?
      WHERE id = ?`;
      
    await db.execute({
      sql,
      args: [
        name, version, JSON.stringify(platforms), category, size, update_date, description, 
        JSON.stringify(screenshots), popularity, download_url, 
        JSON.stringify(version_history || []), tutorial || "", id
      ]
    });

    // If version changed, notify followers (favoriters)
    if (current && current.version !== version) {
      const followers = await db.execute({
        sql: "SELECT user_id FROM favorites WHERE software_id = ?",
        args: [id]
      });

      for (const follower of followers.rows) {
        await db.execute({
          sql: "INSERT INTO notifications (user_id, title, content, type) VALUES (?, ?, ?, ?)",
          args: [
            follower.user_id,
            "Software Update",
            `${current.name} has been updated to version ${version}. Check it out!`,
            "update"
          ]
        });
      }
    }
    
    res.json({ code: 0, message: "success" });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

// Admin: Delete Software
router.delete("/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    await db.execute({ sql: "DELETE FROM software WHERE id = ?", args: [id] });
    await db.execute({ sql: "DELETE FROM favorites WHERE software_id = ?", args: [id] });
    res.json({ code: 0, message: "success" });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

// Admin: Trigger Link Check
router.post("/check-links", authenticate, isAdmin, async (req, res) => {
  try {
    // Run in background
    checkAllLinks();
    res.json({ code: 0, message: "Link check started" });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

export default router;
