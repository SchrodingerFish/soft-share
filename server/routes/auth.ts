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
    const result = await db.execute({
      sql: "INSERT INTO users (username, password) VALUES (?, ?)",
      args: [username, hashedPassword]
    });
    res.json({ code: 0, message: "success", data: { id: result.lastInsertRowid?.toString(), username } });
  } catch (err: any) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
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
