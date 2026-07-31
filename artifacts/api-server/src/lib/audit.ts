import { db, auditLogsTable } from "@workspace/db";
import { getAdminRole } from "../middleware/auth";

export async function logAudit(
  req: any,
  action: string,
  targetType: string,
  targetId?: string | number | null,
  details?: string | null
) {
  try {
    const role = getAdminRole(req) || "unknown";
    const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "";
    await db.insert(auditLogsTable).values({
      actorRole: role,
      action,
      targetType,
      targetId: targetId ? String(targetId) : null,
      details: details || null,
      ipAddress: Array.isArray(ip) ? ip[0] : String(ip),
    });
  } catch (err) {
    console.error("Failed to log audit entry:", err);
  }
}
