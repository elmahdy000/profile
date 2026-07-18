import { Router, type IRouter } from "express";
import {
  ADMIN_COOKIE,
  adminSessionCookieOptions,
  createAdminSessionToken,
  isAdminRequest,
  verifyAdminPassword,
} from "../middleware/auth";
import { fixedWindowRateLimit } from "../middleware/rate-limit";

const router: IRouter = Router();
const adminLoginLimit = fixedWindowRateLimit({ name: "admin-login", limit: 8, windowMs: 15 * 60 * 1000 });

router.post("/admin/login", adminLoginLimit, (req, res) => {
  const password = String(req.body.password ?? "");
  if (!verifyAdminPassword(password)) {
    res.status(401).json({ error: "كلمة المرور غير صحيحة" });
    return;
  }
  res.cookie(ADMIN_COOKIE, createAdminSessionToken(), adminSessionCookieOptions());
  res.json({ success: true });
});

router.get("/admin/me", (req, res) => {
  if (!isAdminRequest(req)) {
    res.status(401).json({ authenticated: false });
    return;
  }
  res.json({ authenticated: true });
});

router.post("/admin/logout", (_req, res) => {
  res.clearCookie(ADMIN_COOKIE, { path: "/" });
  res.json({ success: true });
});

export default router;
