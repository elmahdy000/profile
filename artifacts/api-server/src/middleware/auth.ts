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

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !safeEqual(authHeader, expectedHeader)) {
    res.status(401).json({ error: "Unauthorized: Invalid admin password" });
    return;
  }

  next();
}
