import { Router, type IRouter } from "express";
import fs from "fs";
import path from "path";
import { desc, eq } from "drizzle-orm";
import { auditLogsTable, db, subadminAccountsTable } from "@workspace/db";
import {
  ADMIN_COOKIE,
  adminSessionCookieOptions,
  createAdminSessionToken,
  getAdminRole,
  requireAdmin,
  requireSuperAdmin,
  verifyAdminCredentialsAsync,
} from "../middleware/auth";
import { fixedWindowRateLimit } from "../middleware/rate-limit";
import { logAudit } from "./learning";

const router: IRouter = Router();
const adminLoginLimit = fixedWindowRateLimit({ name: "admin-login", limit: 8, windowMs: 15 * 60 * 1000 });

router.post("/admin/login", adminLoginLimit, async (req, res) => {
  const password = String(req.body.password ?? "");
  const username = String(req.body.username ?? "");
  const auth = await verifyAdminCredentialsAsync(password, username);
  if (!auth) {
    res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
    return;
  }
  res.cookie(ADMIN_COOKIE, createAdminSessionToken(auth.role, auth.username), adminSessionCookieOptions());
  await logAudit(req, "LOGIN", "session", null, `تسجيل دخول ناجح للمستخدم (${auth.username}) بصلاحية ${auth.role === "superadmin" ? "مدير رئيسي" : "مشرف مساعد"}`);
  res.json({ success: true, role: auth.role, username: auth.username });
});

router.get("/admin/me", (req, res) => {
  const role = getAdminRole(req);
  if (!role) {
    res.status(401).json({ authenticated: false });
    return;
  }
  res.json({ authenticated: true, role });
});

router.post("/admin/logout", (req, res) => {
  logAudit(req, "LOGOUT", "session", null, "تسجيل خروج من اللوحة");
  res.clearCookie(ADMIN_COOKIE, { path: "/" });
  res.json({ success: true });
});

// GET /api/admin/audit-logs (View platform activity log)
router.get("/admin/audit-logs", requireAdmin, async (_req, res, next) => {
  try {
    const logs = await db
      .select()
      .from(auditLogsTable)
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(200);
    res.json(logs);
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/change-passwords (Super Admin only: Update ADMIN_PASSWORD or SUBADMIN_PASSWORD in .env)
router.post("/admin/change-passwords", requireSuperAdmin, async (req, res, next) => {
  try {
    const { superAdminPassword, subAdminPassword } = req.body;
    if (!superAdminPassword && !subAdminPassword) {
      res.status(400).json({ error: "يجب كتابة كلمة مرور واحدة على الأقل للتغيير" });
      return;
    }

    const envPath = path.join(process.cwd(), ".env");
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";

    if (superAdminPassword && String(superAdminPassword).trim().length >= 6) {
      const newPass = String(superAdminPassword).trim();
      if (envContent.includes("ADMIN_PASSWORD=")) {
        envContent = envContent.replace(/^ADMIN_PASSWORD=.*$/m, `ADMIN_PASSWORD=${newPass}`);
      } else {
        envContent += `\nADMIN_PASSWORD=${newPass}`;
      }
      process.env.ADMIN_PASSWORD = newPass;
    }

    if (subAdminPassword !== undefined) {
      const newSubPass = String(subAdminPassword).trim();
      if (envContent.includes("SUBADMIN_PASSWORD=")) {
        envContent = envContent.replace(/^SUBADMIN_PASSWORD=.*$/m, `SUBADMIN_PASSWORD=${newSubPass}`);
      } else {
        envContent += `\nSUBADMIN_PASSWORD=${newSubPass}`;
      }
      process.env.SUBADMIN_PASSWORD = newSubPass;
    }

    fs.writeFileSync(envPath, envContent, "utf-8");
    await logAudit(req, "CHANGE_PASSWORDS", "settings", null, "تم تحديث كلمات مرور الإدارة في النظام");

    res.json({ success: true, message: "تم تحديث كلمات المرور بنجاح!" });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/subadmins (Super Admin only: List all dynamic subadmin accounts)
router.get("/admin/subadmins", requireSuperAdmin, async (_req, res, next) => {
  try {
    const dbAccounts = await db
      .select({
        id: subadminAccountsTable.id,
        username: subadminAccountsTable.username,
        displayName: subadminAccountsTable.displayName,
        isActive: subadminAccountsTable.isActive,
        createdAt: subadminAccountsTable.createdAt,
      })
      .from(subadminAccountsTable)
      .orderBy(desc(subadminAccountsTable.createdAt));

    res.json(dbAccounts);
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/subadmins (Super Admin only: Create a new subadmin account)
router.post("/admin/subadmins", requireSuperAdmin, async (req, res, next) => {
  try {
    const username = String(req.body.username ?? "").trim().toLowerCase();
    const displayName = String(req.body.displayName ?? "").trim();
    const password = String(req.body.password ?? "").trim();

    if (!username || !displayName || !password) {
      res.status(400).json({ error: "اسم المستخدم، الاسم الظاهر، وكلمة المرور مطلوبة" });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: "كلمة المرور يجب أن لا تقل عن 6 أحرف" });
      return;
    }

    const [existing] = await db
      .select()
      .from(subadminAccountsTable)
      .where(eq(subadminAccountsTable.username, username))
      .limit(1);

    if (existing) {
      res.status(409).json({ error: "اسم المستخدم مستخدم بالفعل، اختر اسماً آخر" });
      return;
    }

    const [created] = await db
      .insert(subadminAccountsTable)
      .values({
        username,
        displayName,
        passwordHash: password, // Plain text or hashed for straightforward authentication
        isActive: true,
      })
      .returning({
        id: subadminAccountsTable.id,
        username: subadminAccountsTable.username,
        displayName: subadminAccountsTable.displayName,
        isActive: subadminAccountsTable.isActive,
        createdAt: subadminAccountsTable.createdAt,
      });

    await logAudit(req, "CREATE_SUBADMIN", "subadmin", String(created.id), `تم إنشاء حساب مشرف جديد: ${displayName} (${username})`);
    res.json(created);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/subadmins/:id (Super Admin only: Delete a subadmin account)
router.delete("/admin/subadmins/:id", requireSuperAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [deleted] = await db
      .delete(subadminAccountsTable)
      .where(eq(subadminAccountsTable.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "حساب المشرف غير موجود" });
      return;
    }

    await logAudit(req, "DELETE_SUBADMIN", "subadmin", String(id), `تم حذف حساب المشرف: ${deleted.displayName} (${deleted.username})`);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
