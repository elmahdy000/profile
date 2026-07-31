import { createHmac, timingSafeEqual } from "crypto";
import type { Request, Response, NextFunction } from "express";

const adminPassword = process.env.ADMIN_PASSWORD ?? "prof1234";
const subAdminPassword = process.env.SUBADMIN_PASSWORD ?? "";

// قائمة المشرفين المساعدين المعتمدين بالأسماء والباسوردات الخاص بهم
export const SUBADMIN_ACCOUNTS: Record<string, { name: string; pass: string }> = {
  ahmed: { name: "أحمد (المشرف المساعد)", pass: process.env.SUBADMIN_AHMED_PASS ?? "ahmed1234" },
  assistant: { name: "مساعد الإدارة 2", pass: process.env.SUBADMIN_ASSISTANT_PASS ?? "sub1234" },
};

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

export type AdminAuthResult = {
  role: "superadmin" | "subadmin";
  username: string;
};

export function verifyAdminCredentials(passwordInput: string, usernameInput?: string): AdminAuthResult | null {
  const pass = passwordInput.trim();
  const user = (usernameInput || "").trim().toLowerCase();

  // 1. فحص المدير الرئيسي
  if (safeEqual(pass, adminPassword)) {
    return { role: "superadmin", username: "د. محمود المهدي (المدير الرئيسي)" };
  }

  // 2. فحص باسورد المشرف المساعد العام (إذا وُجد)
  if (subAdminPassword && safeEqual(pass, subAdminPassword)) {
    return { role: "subadmin", username: "مشرف مساعد" };
  }

  // 3. فحص الحسابات المسماة (ahmed / assistant)
  if (user && SUBADMIN_ACCOUNTS[user] && safeEqual(pass, SUBADMIN_ACCOUNTS[user].pass)) {
    return { role: "subadmin", username: SUBADMIN_ACCOUNTS[user].name };
  }

  // 4. فحص بالباسورد فقط في حال ادخال كلمة السر الخاصة بأي من المشرفين
  for (const accountKey of Object.keys(SUBADMIN_ACCOUNTS)) {
    const acc = SUBADMIN_ACCOUNTS[accountKey];
    if (safeEqual(pass, acc.pass)) {
      return { role: "subadmin", username: acc.name };
    }
  }

  return null;
}

export function verifyAdminPassword(password: string): "superadmin" | "subadmin" | null {
  const result = verifyAdminCredentials(password);
  return result ? result.role : null;
}

export function createAdminSessionToken(role: "superadmin" | "subadmin" = "superadmin", username?: string): string {
  const expiresAt = Math.floor(Date.now() / 1000) + ADMIN_SESSION_SECONDS;
  const name = username || (role === "superadmin" ? "المدير الرئيسي" : "مشرف مساعد");
  const secret = role === "subadmin" ? (subAdminPassword || adminPassword) : adminPassword;
  const encodedName = Buffer.from(name).toString("base64url");
  const signature = createHmac("sha256", secret).update(`${role}.${expiresAt}.${encodedName}`).digest("base64url");
  return `${role}.${expiresAt}.${encodedName}.${signature}`;
}

export function getAdminIdentity(req: Request): { role: "superadmin" | "subadmin"; username: string } | null {
  const authHeader = req.headers.authorization;
  if (authHeader && safeEqual(authHeader, expectedHeader)) return { role: "superadmin", username: "د. محمود المهدي (المدير الرئيسي)" };
  if (expectedSubHeader && authHeader && safeEqual(authHeader, expectedSubHeader)) return { role: "subadmin", username: "مشرف مساعد" };

  const token = req.cookies?.[ADMIN_COOKIE];
  if (typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length === 2) {
    const [expiresRaw, suppliedSignature] = parts;
    const expiresAt = Number(expiresRaw);
    if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000) || !suppliedSignature) return null;
    const expectedSignature = createHmac("sha256", adminPassword).update(expiresRaw).digest("base64url");
    return safeEqual(suppliedSignature, expectedSignature) ? { role: "superadmin", username: "د. محمود المهدي (المدير الرئيسي)" } : null;
  }

  if (parts.length === 3) {
    const [role, expiresRaw, suppliedSignature] = parts;
    const expiresAt = Number(expiresRaw);
    if ((role !== "superadmin" && role !== "subadmin") || !Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000) || !suppliedSignature) {
      return null;
    }
    const secret = role === "subadmin" ? (subAdminPassword || adminPassword) : adminPassword;
    const expectedSignature = createHmac("sha256", secret).update(`${role}.${expiresRaw}`).digest("base64url");
    return safeEqual(suppliedSignature, expectedSignature) ? { role: role as any, username: role === "superadmin" ? "المدير الرئيسي" : "مشرف مساعد" } : null;
  }

  if (parts.length === 4) {
    const [role, expiresRaw, encodedName, suppliedSignature] = parts;
    const expiresAt = Number(expiresRaw);
    if ((role !== "superadmin" && role !== "subadmin") || !Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000) || !suppliedSignature) {
      return null;
    }
    const secret = role === "subadmin" ? (subAdminPassword || adminPassword) : adminPassword;
    const expectedSignature = createHmac("sha256", secret).update(`${role}.${expiresRaw}.${encodedName}`).digest("base64url");
    if (!safeEqual(suppliedSignature, expectedSignature)) return null;
    const username = Buffer.from(encodedName, "base64url").toString("utf-8");
    return { role: role as any, username };
  }

  return null;
}

export function getAdminRole(req: Request): "superadmin" | "subadmin" | null {
  const identity = getAdminIdentity(req);
  return identity ? identity.role : null;
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
