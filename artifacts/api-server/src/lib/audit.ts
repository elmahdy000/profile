import { db, auditLogsTable } from "@workspace/db";
import { getAdminIdentity, getAdminRole } from "../middleware/auth";

export type AuditActor = {
  role: "superadmin" | "subadmin";
  username: string;
};

export async function logAudit(
  req: any,
  action: string,
  targetType: string,
  targetId?: string | number | null,
  details?: string | null,
  actorOverride?: AuditActor | null,
) {
  try {
    // LOGIN replaces the cookie only after credentials are verified. Without an
    // explicit actor, an existing cookie can incorrectly attribute the new
    // login to the previously signed-in account.
    const identity = actorOverride || getAdminIdentity(req);
    const role = identity?.role || getAdminRole(req) || "unknown";
    const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "";
    await db.insert(auditLogsTable).values({
      actorRole: role,
      action,
      targetType,
      targetId: targetId ? String(targetId) : null,
      // The actor role already has its own column. Keeping identity text here
      // duplicated the table UI and made old encoding failures much noisier.
      details: details?.trim() || null,
      ipAddress: Array.isArray(ip) ? ip[0] : String(ip),
    });
  } catch (err) {
    console.error("Failed to log audit entry:", err);
  }
}
