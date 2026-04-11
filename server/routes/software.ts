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

    let query = `
      SELECT s.*, c.name_en as category_en 
      FROM software s 
      LEFT JOIN categories c ON s.category = c.name 
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (search) {
      query += " AND (s.name LIKE ? OR s.description LIKE ? OR s.category LIKE ? OR c.name_en LIKE ? OR s.tags LIKE ?)";
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }
    if (platform) {
      query += " AND s.platforms LIKE ?";
      params.push(`%${platform}%`);
    }
    if (category) {
      // Support filtering by either Chinese or English category name
      query += " AND (s.category = ? OR c.name_en = ?)";
      params.push(category, category);
    }
    
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM software s 
      LEFT JOIN categories c ON s.category = c.name 
      WHERE 1=1 
      ${search ? " AND (s.name LIKE ? OR s.description LIKE ? OR s.category LIKE ? OR c.name_en LIKE ? OR s.tags LIKE ?)" : ""}
      ${platform ? " AND s.platforms LIKE ?" : ""}
      ${category ? " AND (s.category = ? OR c.name_en = ?)" : ""}
    `;
    
    const countParams: any[] = [];
    if (search) {
      const searchPattern = `%${search}%`;
      countParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }
    if (platform) countParams.push(`%${platform}%`);
    if (category) countParams.push(category, category);

    const totalResult = await db.execute({ sql: countQuery, args: countParams });
    const total = totalResult.rows[0].total as number;
    
    query += " ORDER BY popularity DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);
    
    const result = await db.execute({ sql: query, args: params });
    const rows = result.rows.map((row: any) => ({
      ...row,
      platforms: parseJson(row.platforms, []),
      screenshots: parseJson(row.screenshots, []),
      version_history: parseJson(row.version_history, []),
      tags: parseJson(row.tags, [])
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
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ code: 400, message: "Invalid ID format" });
      return;
    }
    const result = await db.execute({
      sql: "SELECT s.*, c.name_en as category_en FROM software s LEFT JOIN categories c ON s.category = c.name WHERE s.id = ?",
      args: [id]
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
      sql: "SELECT s.id, s.name, s.version, s.platforms, s.category, c.name_en as category_en, s.size, s.update_date, s.description, s.screenshots, s.popularity, s.link_status FROM software s LEFT JOIN categories c ON s.category = c.name WHERE s.category = ? AND s.id != ? LIMIT 4",
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
        tags: parseJson(row.tags, []),
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
    const { name, version, platforms, category, size, update_date, description, screenshots, popularity, download_url, version_history, tutorial, tags } = req.body;
    
    const sql = process.env.DB_TYPE === "postgres"
      ? `INSERT INTO software (name, version, platforms, category, size, update_date, description, screenshots, popularity, download_url, version_history, tutorial, tags)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
      : `INSERT INTO software (name, version, platforms, category, size, update_date, description, screenshots, popularity, download_url, version_history, tutorial, tags)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const result = await db.execute({
      sql,
      args: [
        name, version, JSON.stringify(platforms), category, size, update_date, description, 
        JSON.stringify(screenshots), popularity || 0, download_url, 
        JSON.stringify(version_history || []), tutorial || "", JSON.stringify(tags || [])
      ]
    });
    
    const id = process.env.DB_TYPE === "postgres" 
      ? (result.rows && result.rows.length > 0 ? (result.rows[0] as any).id : null)
      : result.lastInsertRowid;
      
    if (!id && process.env.DB_TYPE === "postgres") {
      throw new Error("Failed to get inserted ID from database");
    }
      
    res.json({ code: 0, message: "success", data: { id } });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

// Admin: Update Software
router.put("/:id", authenticate, isAdmin, validate(softwareSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { name, version, platforms, category, size, update_date, description, screenshots, popularity, download_url, version_history, tutorial, tags } = req.body;
    const id = parseInt(req.params.id);
    
    // Check if version has changed
    const currentResult = await db.execute({
      sql: "SELECT version, name FROM software WHERE id = ?",
      args: [id]
    });
    const current = currentResult.rows[0];

    const sql = `UPDATE software SET 
      name = ?, version = ?, platforms = ?, category = ?, size = ?, 
      update_date = ?, description = ?, screenshots = ?, popularity = ?, download_url = ?,
      version_history = ?, tutorial = ?, tags = ?
      WHERE id = ?`;
      
    await db.execute({
      sql,
      args: [
        name, version, JSON.stringify(platforms), category, size, update_date, description, 
        JSON.stringify(screenshots), popularity, download_url, 
        JSON.stringify(version_history || []), tutorial || "", JSON.stringify(tags || []), id
      ]
    });

    // If version changed, notify followers (favoriters)
    if (current && current.version !== version) {
      const followers = await db.execute({
        sql: "SELECT user_id FROM favorites WHERE software_id = ?",
        args: [id]
      });

      const { getIO } = await import("../socket.js");
      const io = getIO();

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
        
        // Emit real-time notification
        io.to(`user_${follower.user_id}`).emit("notification", {
          title: "Software Update",
          content: `${current.name} has been updated to version ${version}. Check it out!`,
          type: "update"
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
    const id = parseInt(req.params.id);
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
