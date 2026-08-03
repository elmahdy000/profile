import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import type { Request, Response, NextFunction } from "express";
import { db, subadminAccountsTable, siteSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

let cachedAdminPass: string | null = null;
let cachedSubAdminPass: string | null = null;
let lastPassFetch = 0;

export async function getDynamicAdminPassword(): Promise<string> {
  const now = Date.now();
  if (cachedAdminPass && now - lastPassFetch < 5000) {
    return cachedAdminPass;
  }
  try {
    const [row] = await db
      .select({ value: siteSettingsTable.value })
      .from(siteSettingsTable)
      .where(eq(siteSettingsTable.key, "admin_password_hash"))
      .limit(1);
    if (row?.value) {
      cachedAdminPass = row.value;
      lastPassFetch = now;
      return row.value;
    }
  } catch (e) {
    // DB fallback
  }
  cachedAdminPass = process.env.ADMIN_PASSWORD ?? "";
  lastPassFetch = now;
  return cachedAdminPass;
}

export async function getDynamicSubAdminPassword(): Promise<string> {
  try {
    const [row] = await db
      .select({ value: siteSettingsTable.value })
      .from(siteSettingsTable)
      .where(eq(siteSettingsTable.key, "subadmin_password_hash"))
      .limit(1);
    if (row?.value) {
      return row.value;
    }
  } catch (e) {
    // DB fallback
  }
  return process.env.SUBADMIN_PASSWORD ?? "";
}

export function clearAdminPassCache() {
  cachedAdminPass = null;
  cachedSubAdminPass = null;
  lastPassFetch = 0;
}

const getAdminPassword = () => cachedAdminPass ?? process.env.ADMIN_PASSWORD ?? "";
const getSubAdminPassword = () => cachedSubAdminPass ?? process.env.SUBADMIN_PASSWORD ?? "";

// قائمة المشرفين المساعدين المعتمدين بالأسماء والباسوردات الخاص بهم
export const SUBADMIN_ACCOUNTS: Record<string, { name: string; pass: string }> = {};
if (process.env.SUBADMIN_AHMED_PASS) {
  SUBADMIN_ACCOUNTS.ahmed = { name: "أحمد (المشرف المساعد)", pass: process.env.SUBADMIN_AHMED_PASS };
}
if (process.env.SUBADMIN_ASSISTANT_PASS) {
  SUBADMIN_ACCOUNTS.assistant = { name: "مساعد الإدارة 2", pass: process.env.SUBADMIN_ASSISTANT_PASS };
}

if (!getAdminPassword()) {
  throw new Error(
    "ADMIN_PASSWORD environment variable is required but was not provided.",
  );
}

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

const PASSWORD_PREFIX = "scrypt";

export function hashAdminPassword(password: string): string {
  const salt = randomBytes(16).toString("base64url");
  const derived = scryptSync(password, salt, 64).toString("base64url");
  return `${PASSWORD_PREFIX}$${salt}$${derived}`;
}

function verifyStoredPassword(input: string, stored: string): boolean {
  if (!stored.startsWith(`${PASSWORD_PREFIX}$`)) return safeEqual(input, stored);
  const [, salt, expected] = stored.split("$");
  if (!salt || !expected) return false;
  const actual = scryptSync(input, salt, 64).toString("base64url");
  return safeEqual(actual, expected);
}

export type AdminAuthResult = {
  role: "superadmin" | "subadmin";
  username: string;
};

export async function verifyAdminCredentialsAsync(passwordInput: string, usernameInput?: string): Promise<AdminAuthResult | null> {
  const pass = passwordInput.trim();
  const user = (usernameInput || "").trim().toLowerCase();

  const adminPassword = await getDynamicAdminPassword();
  const subAdminPassword = await getDynamicSubAdminPassword();

  // 1. فحص المدير الرئيسي
  if (verifyStoredPassword(pass, adminPassword)) {
    return { role: "superadmin", username: "د. محمود المهدي (المدير الرئيسي)" };
  }

  // 2. فحص باسورد المشرف المساعد العام (إذا وُجد)
  if (subAdminPassword && verifyStoredPassword(pass, subAdminPassword)) {
    return { role: "subadmin", username: "مشرف مساعد" };
  }

  // 3. فحص الحسابات المسماة الثابتة (ahmed / assistant)
  if (user && SUBADMIN_ACCOUNTS[user] && verifyStoredPassword(pass, SUBADMIN_ACCOUNTS[user].pass)) {
    return { role: "subadmin", username: SUBADMIN_ACCOUNTS[user].name };
  }
  for (const accountKey of Object.keys(SUBADMIN_ACCOUNTS)) {
    const acc = SUBADMIN_ACCOUNTS[accountKey];
    if (verifyStoredPassword(pass, acc.pass)) {
      return { role: "subadmin", username: acc.name };
    }
  }

  // 4. فحص الحسابات الديناميكية المحفوظة في قاعدة البيانات (subadmin_accounts)
  try {
    const dbRows = await db.select().from(subadminAccountsTable).where(eq(subadminAccountsTable.isActive, true));
    for (const acc of dbRows) {
      if (user && user === acc.username.toLowerCase() && verifyStoredPassword(pass, acc.passwordHash)) {
        return { role: "subadmin", username: `${acc.displayName} (@${acc.username})` };
      }
      if (!user && verifyStoredPassword(pass, acc.passwordHash)) {
        return { role: "subadmin", username: `${acc.displayName} (@${acc.username})` };
      }
    }
  } catch (e) {
    // DB fallback
  }

  return null;
}

export function verifyAdminPassword(password: string): "superadmin" | "subadmin" | null {
  const adminPassword = getAdminPassword();
  const subAdminPassword = getSubAdminPassword();
  const pass = password.trim();
  if (verifyStoredPassword(pass, adminPassword)) return "superadmin";
  if (subAdminPassword && verifyStoredPassword(pass, subAdminPassword)) return "subadmin";
  return null;
}

export function createAdminSessionToken(role: "superadmin" | "subadmin" = "superadmin", username?: string): string {
  const adminPassword = getAdminPassword();
  const subAdminPassword = getSubAdminPassword();
  const expiresAt = Math.floor(Date.now() / 1000) + ADMIN_SESSION_SECONDS;
  const name = username || (role === "superadmin" ? "المدير الرئيسي" : "مشرف مساعد");
  const secret = role === "subadmin" ? (subAdminPassword || adminPassword) : adminPassword;
  const encodedName = Buffer.from(name).toString("base64url");
  const signature = createHmac("sha256", secret).update(`${role}.${expiresAt}.${encodedName}`).digest("base64url");
  return `${role}.${expiresAt}.${encodedName}.${signature}`;
}

export function getAdminIdentity(req: Request): { role: "superadmin" | "subadmin"; username: string } | null {
  const adminPassword = getAdminPassword();
  const subAdminPassword = getSubAdminPassword();
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const supplied = authHeader.slice("Bearer ".length);
    if (verifyStoredPassword(supplied, adminPassword)) {
      return { role: "superadmin", username: "د. محمود المهدي (المدير الرئيسي)" };
    }
    if (subAdminPassword && verifyStoredPassword(supplied, subAdminPassword)) {
      return { role: "subadmin", username: "مشرف مساعد" };
    }
  }
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
