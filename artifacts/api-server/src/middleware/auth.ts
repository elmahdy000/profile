import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import type { Request, Response, NextFunction } from "express";
import { db, subadminAccountsTable, siteSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

let cachedAdminPass: string | null = null;
let cachedSubAdminPass: string | null = null;
let lastPassFetch = 0;
let lastSubPassFetch = 0;

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
  const now = Date.now();
  if (cachedSubAdminPass !== null && now - lastSubPassFetch < 5000) {
    return cachedSubAdminPass;
  }
  try {
    const [row] = await db
      .select({ value: siteSettingsTable.value })
      .from(siteSettingsTable)
      .where(eq(siteSettingsTable.key, "subadmin_password_hash"))
      .limit(1);
    if (row?.value) {
      cachedSubAdminPass = row.value;
      lastSubPassFetch = now;
      return row.value;
    }
  } catch (e) {
    // DB fallback
  }
  cachedSubAdminPass = process.env.SUBADMIN_PASSWORD ?? "";
  lastSubPassFetch = now;
  return cachedSubAdminPass;
}

export function clearAdminPassCache() {
  cachedAdminPass = null;
  cachedSubAdminPass = null;
  lastPassFetch = 0;
  lastSubPassFetch = 0;
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

  // Exactly two named accounts are allowed. The username selects which
  // credential may be checked, preventing one password from silently falling
  // through to another role.
  if (user === "mahmoud" && verifyStoredPassword(pass, adminPassword)) {
    return { role: "superadmin", username: "د. محمود المهدي (المدير الرئيسي)" };
  }
  if (user === "ahmed" && subAdminPassword && verifyStoredPassword(pass, subAdminPassword)) {
    return { role: "subadmin", username: "أحمد (المشرف المساعد)" };
  }

  try {
    const [dbSubadmin] = await db
      .select()
      .from(subadminAccountsTable)
      .where(eq(subadminAccountsTable.username, user))
      .limit(1);

    if (dbSubadmin && dbSubadmin.isActive && verifyStoredPassword(pass, dbSubadmin.passwordHash)) {
      return { role: "subadmin", username: dbSubadmin.displayName || dbSubadmin.username };
    }
  } catch (e) {
    // Ignore DB error fallback
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
  // Security: always derive a role-specific secret so a subadmin token can never
  // be mistaken for a superadmin token, even when SUBADMIN_PASSWORD is not set.
  const baseSecret = role === "subadmin" && subAdminPassword ? subAdminPassword : adminPassword;
  const secret = `${role}:${baseSecret}`;
  const encodedName = Buffer.from(name).toString("base64url");
  const signature = createHmac("sha256", secret).update(`v2.${role}.${expiresAt}.${encodedName}`).digest("base64url");
  return `v2.${role}.${expiresAt}.${encodedName}.${signature}`;
}

export function getAdminIdentity(req: Request): { role: "superadmin" | "subadmin"; username: string } | null {
  const token = req.cookies?.[ADMIN_COOKIE];
  if (typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length === 5) {
    const [version, role, expiresRaw, encodedName, suppliedSignature] = parts;
    const expiresAt = Number(expiresRaw);
    if (version !== "v2" || (role !== "superadmin" && role !== "subadmin") || !Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000) || !suppliedSignature) {
      return null;
    }
    // Build candidate secrets using the role-prefixed scheme (matches createAdminSessionToken)
    const possibleBases: string[] = Array.from(
      new Set(
        [
          cachedAdminPass,
          process.env.ADMIN_PASSWORD,
          cachedSubAdminPass,
          process.env.SUBADMIN_PASSWORD,
          process.env.SUBADMIN_AHMED_PASS,
          process.env.SUBADMIN_ASSISTANT_PASS,
        ].filter((s): s is string => Boolean(s) && typeof s === "string"),
      ),
    );
    // For each base, derive the role-prefixed secret (new scheme)
    const candidateSecrets: string[] = possibleBases.map((base) => `${role}:${base}`);

    const payload = `v2.${role}.${expiresRaw}.${encodedName}`;
    const isValid = candidateSecrets.some((secret) => {
      const expectedSignature = createHmac("sha256", secret).update(payload).digest("base64url");
      return safeEqual(suppliedSignature, expectedSignature);
    });
    if (!isValid) return null;
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

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!cachedAdminPass) {
    await getDynamicAdminPassword().catch(() => {});
  }
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
