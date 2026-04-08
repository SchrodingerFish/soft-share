import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db/index.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-for-dev";

// Register
router.post("/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.json({ code: 400, message: "Username and password required" });
    return;
  }
  
  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const stmt = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)");
    const info = stmt.run(username, hashedPassword);
    res.json({ code: 0, message: "success", data: { id: info.lastInsertRowid, username } });
  } catch (err: any) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.json({ code: 400, message: "Username already exists" });
    } else {
      res.json({ code: 500, message: err.message });
    }
  }
});

// Login
router.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;
  
  if (!user || !bcrypt.compareSync(password, user.password)) {
    res.json({ code: 400, message: "Invalid credentials" });
    return;
  }
  
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ code: 0, message: "success", data: { token, user: { id: user.id, username: user.username } } });
});

export default router;
