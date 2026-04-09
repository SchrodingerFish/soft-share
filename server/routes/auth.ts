import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db/index.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-for-dev";

// Register
router.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.json({ code: 400, message: "Username and password required" });
    return;
  }
  
  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const sql = process.env.DB_TYPE === "postgres" 
      ? "INSERT INTO users (username, password) VALUES (?, ?) RETURNING id"
      : "INSERT INTO users (username, password) VALUES (?, ?)";
      
    const result = await db.execute({
      sql,
      args: [username, hashedPassword]
    });
    
    const id = process.env.DB_TYPE === "postgres" 
      ? result.rows[0].id.toString()
      : result.lastInsertRowid?.toString();

    res.json({ code: 0, message: "success", data: { id, username } });
  } catch (err: any) {
    if (err.message && (err.message.includes('UNIQUE constraint failed') || err.message.includes('duplicate key value violates unique constraint'))) {
      res.json({ code: 400, message: "Username already exists" });
    } else {
      res.json({ code: 500, message: err.message });
    }
  }
});

// Login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const result = await db.execute({
      sql: "SELECT * FROM users WHERE username = ?",
      args: [username]
    });
    
    const user = result.rows[0] as any;
    
    if (!user || !bcrypt.compareSync(password, user.password as string)) {
      res.json({ code: 400, message: "Invalid credentials" });
      return;
    }
    
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ code: 0, message: "success", data: { token, user: { id: user.id, username: user.username } } });
  } catch (err: any) {
    res.json({ code: 500, message: err.message });
  }
});

export default router;
