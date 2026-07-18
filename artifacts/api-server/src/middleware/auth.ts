import { createHmac, timingSafeEqual } from "crypto";
import type { Request, Response, NextFunction } from "express";

const adminPassword = process.env.ADMIN_PASSWORD ?? "";

if (!adminPassword) {
  throw new Error(
    "ADMIN_PASSWORD environment variable is required but was not provided.",
  );
}

const expectedHeader = `Bearer ${adminPassword}`;
export const ADMIN_COOKIE = "admin_session";
const ADMIN_SESSION_SECONDS = 60 * 60 * 12;

/** Constant-time string comparison to avoid timing attacks. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function verifyAdminPassword(password: string): boolean {
  return safeEqual(password, adminPassword);
}

export function createAdminSessionToken(): string {
  const expiresAt = Math.floor(Date.now() / 1000) + ADMIN_SESSION_SECONDS;
  const signature = createHmac("sha256", adminPassword).update(String(expiresAt)).digest("base64url");
  return `${expiresAt}.${signature}`;
}

function hasValidAdminCookie(req: Request): boolean {
  const token = req.cookies?.[ADMIN_COOKIE];
  if (typeof token !== "string") return false;
  const [expiresRaw, suppliedSignature] = token.split(".");
  const expiresAt = Number(expiresRaw);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000) || !suppliedSignature) return false;
  const expectedSignature = createHmac("sha256", adminPassword).update(expiresRaw).digest("base64url");
  return safeEqual(suppliedSignature, expectedSignature);
}

export function adminSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: ADMIN_SESSION_SECONDS * 1000,
    path: "/",
  };
}

export function isAdminRequest(req: Request): boolean {
  const authHeader = req.headers.authorization;
  return hasValidAdminCookie(req) || !!(authHeader && safeEqual(authHeader, expectedHeader));
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: "Unauthorized: Invalid admin password" });
    return;
  }

  next();
}
