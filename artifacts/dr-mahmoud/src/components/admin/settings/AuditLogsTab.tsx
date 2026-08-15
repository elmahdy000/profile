import React from "react";
import { Loader2, X } from "lucide-react";

export interface AuditLogItem {
  id: number;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditLogsTabProps {
  auditLogs: AuditLogItem[];
  loadingAuditLogs: boolean;
  fetchAuditLogs: () => void;
  selectedAuditLog: AuditLogItem | null;
  setSelectedAuditLog: React.Dispatch<React.SetStateAction<AuditLogItem | null>>;
}

export const AuditLogsTab: React.FC<AuditLogsTabProps> = ({
  auditLogs,
  loadingAuditLogs,
  fetchAuditLogs,
  selectedAuditLog,
  setSelectedAuditLog,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div>
          <h3 className="text-lg font-bold text-foreground">
            📋 سجل عمليات وإجراءات المشرفين (Audit Logs)
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            تتبع كامل بكل الإجراءات والتعديلات والعمليات التي تمت على المنصة ومُجري كل عملية بالوقت والدقيقة.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchAuditLogs}
          disabled={loadingAuditLogs}
          className="rounded-xl border border-border px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted/50 transition flex items-center gap-1.5"
        >
          {loadingAuditLogs ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            "🔄 تحديث السجل"
          )}
        </button>
      </div>

      {loadingAuditLogs ? (
        <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-xs font-semibold">
            جاري جلب سجل العمليات...
          </span>
        </div>
      ) : auditLogs.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-xs text-muted-foreground">
          لا توجد عمليات مسجلة حتى الآن.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-muted/50 text-muted-foreground font-bold border-b border-border">
                <tr>
                  <th className="p-3">الوقت والتاريخ</th>
                  <th className="p-3">المُنفِّذ (Role)</th>
                  <th className="p-3">نوع الإجراء</th>
                  <th className="p-3">التفاصيل والوصف</th>
                  <th className="p-3 text-left">عنوان IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {auditLogs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedAuditLog(log)}
                    className="hover:bg-primary/5 cursor-pointer transition-colors group"
                    title="انقر لعرض التفاصيل الكاملة للإجراء في نافذة مخصصة"
                  >
                    <td className="p-3 font-semibold text-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleDateString("ar-EG")} -{" "}
                      {new Date(log.createdAt).toLocaleTimeString("ar-EG", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-extrabold border ${
                          log.actorRole === "superadmin"
                            ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200"
                        }`}
                      >
                        {log.actorRole === "superadmin"
                          ? "Super Admin"
                          : "Subadmin"}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-foreground whitespace-nowrap dir-ltr text-right">
                      {log.action}
                    </td>
                    <td className="p-3 text-foreground/80 leading-relaxed max-w-md truncate group-hover:text-primary font-medium">
                      {log.details || "—"}
                    </td>
                    <td className="p-3 text-left font-mono text-[11px] text-muted-foreground whitespace-nowrap dir-ltr">
                      {log.ipAddress || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AUDIT LOG DETAILS MODAL */}
      {selectedAuditLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 dir-rtl">
          <div className="w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/80 bg-muted/30 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary/10 text-primary font-black text-sm">
                  📋
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-foreground">
                    تفاصيل الإجراء المُسجل
                  </h3>
                  <p className="text-xs text-muted-foreground dir-ltr text-right font-mono">
                    ID #{selectedAuditLog.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAuditLog(null)}
                className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 text-xs font-medium">
              <div className="grid grid-cols-2 gap-3 bg-muted/20 p-3.5 rounded-2xl border border-border/60">
                <div>
                  <span className="block text-muted-foreground text-[11px] font-bold mb-0.5">
                    تاريخ ووقت الإجراء
                  </span>
                  <span className="font-bold text-foreground dir-rtl">
                    {new Date(selectedAuditLog.createdAt).toLocaleDateString(
                      "ar-EG",
                    )}{" "}
                    -{" "}
                    {new Date(selectedAuditLog.createdAt).toLocaleTimeString(
                      "ar-EG",
                      { hour: "2-digit", minute: "2-digit", second: "2-digit" },
                    )}
                  </span>
                </div>
                <div>
                  <span className="block text-muted-foreground text-[11px] font-bold mb-0.5">
                    عنوان IP المنفذ
                  </span>
                  <span className="font-mono font-bold text-primary dir-ltr block text-right">
                    {selectedAuditLog.ipAddress || "—"}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="block text-muted-foreground text-[11px] font-bold mb-1">
                    نوع الإجراء (Action Type)
                  </span>
                  <span className="inline-block px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-xl font-bold font-mono text-xs dir-ltr">
                    {selectedAuditLog.action}
                  </span>
                </div>

                <div>
                  <span className="block text-muted-foreground text-[11px] font-bold mb-1">
                    العنصر المستهدف (Target)
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-muted text-foreground font-bold rounded-lg uppercase">
                      {selectedAuditLog.targetType}
                    </span>
                    {selectedAuditLog.targetId && (
                      <span className="font-mono text-muted-foreground font-bold">
                        [ID: {selectedAuditLog.targetId}]
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-border/60">
                  <span className="block text-muted-foreground text-[11px] font-bold">
                    تفاصيل العملية والتغييرات بالتفصيل (Full Change Log):
                  </span>
                  <div className="p-4 bg-muted/40 rounded-2xl border border-border/80 text-foreground leading-relaxed font-semibold text-xs space-y-2 whitespace-pre-wrap">
                    {selectedAuditLog.details
                      ? selectedAuditLog.details.split(" | ").map((part, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="text-primary font-black">•</span>
                            <span>{part}</span>
                          </div>
                        ))
                      : "لا توجد تفاصيل إضافية مسجلة لهذا الإجراء."}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-border/80 bg-muted/20 px-6 py-3.5 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedAuditLog(null)}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition shadow-xs cursor-pointer"
              >
                إغلاق Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
