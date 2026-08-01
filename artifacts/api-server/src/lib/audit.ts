import { db, auditLogsTable } from "@workspace/db";
import { getAdminIdentity, getAdminRole } from "../middleware/auth";

export async function logAudit(
  req: any,
  action: string,
  targetType: string,
  targetId?: string | number | null,
  details?: string | null
) {
  try {
    const identity = getAdminIdentity(req);
    const role = identity?.role || getAdminRole(req) || "unknown";
    const actorName = identity?.username || (role === "superadmin" ? "د. محمود (المدير)" : "مشرف");
    const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "";
    const fullDetails = `[بواسطة: ${actorName}] ${details || ""}`.trim();
    await db.insert(auditLogsTable).values({
      actorRole: role,
      action,
      targetType,
      targetId: targetId ? String(targetId) : null,
      details: fullDetails,
      ipAddress: Array.isArray(ip) ? ip[0] : String(ip),
    });
  } catch (err) {
    console.error("Failed to log audit entry:", err);
  }
}
