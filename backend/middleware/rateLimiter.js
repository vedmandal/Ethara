/**
 * Rate Limiter
 */
import rateLimit from 'express-rate-limit';

const isDevelopment = process.env.NODE_ENV !== 'production';
const globalWindowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000;
const globalMax = parseInt(
  process.env.RATE_LIMIT_MAX,
  10
) || (isDevelopment ? 2000 : 500);

export const rateLimiter = rateLimit({
  windowMs: globalWindowMs,
  max: globalMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => (
    req.path === '/api/health'
    || req.path.startsWith('/api/auth')
    || (isDevelopment && (req.ip === '::1' || req.ip === '127.0.0.1' || req.ip === '::ffff:127.0.0.1'))
  ),
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

// Stricter limiter for auth routes
export const authRateLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || (isDevelopment ? 50 : 15),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts. Please wait 15 minutes.' },
});
