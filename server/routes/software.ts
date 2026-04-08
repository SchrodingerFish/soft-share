import { Router } from "express";
import crypto from "crypto";
import db from "../db/index.js";

const router = Router();
const SECRET_KEY = process.env.SECRET_KEY || "default-secret-key";

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
      platforms: JSON.parse(row.platforms as string),
      screenshots: JSON.parse(row.screenshots as string)
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
    
    res.json({
      code: 0,
      message: "success",
      data: {
        ...row,
        platforms: JSON.parse(row.platforms as string),
        screenshots: JSON.parse(row.screenshots as string)
      }
    });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

// Get Verification Code Hint
router.get("/:id/hint", (req, res) => {
  const id = parseInt(req.params.id);
  res.json({ code: 0, message: "success", data: { hint: getVerificationCode(id) } });
});

// Verify Code and Get Download URL
router.post("/:id/download", async (req, res) => {
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
    
    res.json({ code: 0, message: "success", data: { download_url: row.download_url } });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

export default router;
