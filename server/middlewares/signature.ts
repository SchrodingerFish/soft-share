import crypto from "crypto";
import { Request, Response, NextFunction } from "express";

const EXTERNAL_API_TOKEN = process.env.EXTERNAL_API_TOKEN || "default_api_token";

export const verifySignature = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  const timestamp = req.headers['x-timestamp'] as string;
  const signature = req.headers['x-signature'] as string;

  if (token !== EXTERNAL_API_TOKEN) {
    res.status(401).json({ code: 401, message: "Invalid API Token" });
    return;
  }

  if (!timestamp || !signature) {
    res.status(401).json({ code: 401, message: "Missing signature headers" });
    return;
  }

  const now = Date.now();
  const reqTime = parseInt(timestamp, 10);
  
  // Check if timestamp is within 5 minutes (300000 ms)
  if (isNaN(reqTime) || Math.abs(now - reqTime) > 5 * 60 * 1000) {
    res.status(401).json({ code: 401, message: "Request expired" });
    return;
  }

  const expectedSignature = crypto.createHmac('sha256', EXTERNAL_API_TOKEN).update(timestamp).digest('hex');
  if (signature !== expectedSignature) {
    res.status(401).json({ code: 401, message: "Invalid signature" });
    return;
  }

  next();
};
