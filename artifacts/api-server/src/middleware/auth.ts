import { timingSafeEqual } from "crypto";
import type { Request, Response, NextFunction } from "express";

const adminPassword = process.env.ADMIN_PASSWORD;

if (!adminPassword) {
  throw new Error(
    "ADMIN_PASSWORD environment variable is required but was not provided.",
  );
}

const expectedHeader = `Bearer ${adminPassword}`;

/** Constant-time string comparison to avoid timing attacks. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function isAdminRequest(req: Request): boolean {
  const authHeader = req.headers.authorization;
  return !!(authHeader && safeEqual(authHeader, expectedHeader));
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: "Unauthorized: Invalid admin password" });
    return;
  }

  next();
}
