import rateLimit from 'express-rate-limit';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 10000, // Limit each IP to 10,000 requests per day
  message: { code: 429, message: 'Too many requests from this IP, please try again after 24 hours' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for auth routes (login, register)
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 login/register requests per hour
  message: { code: 429, message: 'Too many authentication attempts, please try again after an hour' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for AI routes
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 AI requests per hour
  message: { code: 429, message: 'Too many AI requests, please try again after an hour' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for comments/submissions
export const actionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 actions per 15 minutes
  message: { code: 429, message: 'Too many actions, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
