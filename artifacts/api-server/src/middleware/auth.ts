import { createHmac, timingSafeEqual } from "crypto";
import type { Request, Response, NextFunction } from "express";

const adminPassword = process.env.ADMIN_PASSWORD ?? "";
const subAdminPassword = process.env.SUBADMIN_PASSWORD ?? "";

if (!adminPassword) {
  throw new Error(
    "ADMIN_PASSWORD environment variable is required but was not provided.",
  );
}

const expectedHeader = `Bearer ${adminPassword}`;
const expectedSubHeader = subAdminPassword ? `Bearer ${subAdminPassword}` : "";
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

export function verifyAdminPassword(password: string): "superadmin" | "subadmin" | null {
  if (safeEqual(password, adminPassword)) return "superadmin";
  if (subAdminPassword && safeEqual(password, subAdminPassword)) return "subadmin";
  return null;
}

export function createAdminSessionToken(role: "superadmin" | "subadmin" = "superadmin"): string {
  const expiresAt = Math.floor(Date.now() / 1000) + ADMIN_SESSION_SECONDS;
  const secret = role === "subadmin" ? (subAdminPassword || adminPassword) : adminPassword;
  const signature = createHmac("sha256", secret).update(`${role}.${expiresAt}`).digest("base64url");
  return `${role}.${expiresAt}.${signature}`;
}

export function getAdminRole(req: Request): "superadmin" | "subadmin" | null {
  const authHeader = req.headers.authorization;
  if (authHeader && safeEqual(authHeader, expectedHeader)) return "superadmin";
  if (expectedSubHeader && authHeader && safeEqual(authHeader, expectedSubHeader)) return "subadmin";

  const token = req.cookies?.[ADMIN_COOKIE];
  if (typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length === 2) {
    // Legacy superadmin token format: [expiresAt, signature]
    const [expiresRaw, suppliedSignature] = parts;
    const expiresAt = Number(expiresRaw);
    if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000) || !suppliedSignature) return null;
    const expectedSignature = createHmac("sha256", adminPassword).update(expiresRaw).digest("base64url");
    return safeEqual(suppliedSignature, expectedSignature) ? "superadmin" : null;
  }

  if (parts.length === 3) {
    // New role-aware token format: [role, expiresAt, signature]
    const [role, expiresRaw, suppliedSignature] = parts;
    const expiresAt = Number(expiresRaw);
    if ((role !== "superadmin" && role !== "subadmin") || !Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000) || !suppliedSignature) {
      return null;
    }
    const secret = role === "subadmin" ? (subAdminPassword || adminPassword) : adminPassword;
    const expectedSignature = createHmac("sha256", secret).update(`${role}.${expiresRaw}`).digest("base64url");
    return safeEqual(suppliedSignature, expectedSignature) ? role : null;
  }

  return null;
}

export function adminSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: ADMIN_SESSION_SECONDS * 1000,
    path: "/",
  };
}

export function isAdminRequest(req: Request): boolean {
  return getAdminRole(req) !== null;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: "Unauthorized: Invalid admin password" });
    return;
  }

  next();
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const role = getAdminRole(req);
  if (role !== "superadmin") {
    res.status(403).json({ error: "Forbidden: Superadmin privilege required" });
    return;
  }

  next();
}
