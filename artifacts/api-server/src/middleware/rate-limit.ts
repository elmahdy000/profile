import type { Request, Response, NextFunction } from "express";

type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();

export function fixedWindowRateLimit(options: { name: string; limit: number; windowMs: number }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${options.name}:${req.ip || req.socket.remoteAddress || "unknown"}`;
    const current = buckets.get(key);
    const entry = !current || current.resetAt <= now
      ? { count: 1, resetAt: now + options.windowMs }
      : { count: current.count + 1, resetAt: current.resetAt };
    buckets.set(key, entry);

    res.setHeader("X-RateLimit-Limit", String(options.limit));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, options.limit - entry.count)));
    if (entry.count > options.limit) {
      res.setHeader("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      res.status(429).json({ error: "محاولات كتير. استنى شوية وجرب تاني." });
      return;
    }
    next();
  };
}
