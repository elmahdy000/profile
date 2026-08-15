import React from "react";
import {
  Download,
  Activity,
  GraduationCap,
  BarChart3,
  ClipboardCheck,
  MessageCircle,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface RecoveryRequest {
  id: number;
  studentName: string;
  phone: string;
  accessCode?: string | null;
  status: string;
}

interface LearningAnalytics {
  summary: {
    totalStudents: number;
    approvedStudents: number;
    activeStudents: number;
    inactiveStudents: number;
    completedLessons: number;
    averageProgress: number;
    quizPassRate: number;
    paidStudents?: number;
    pendingReviewPayments?: number;
  };
}

export interface ReportsTabProps {
  analytics: LearningAnalytics | null;
  recoveryRequests: RecoveryRequest[];
  resolveRecoveryRequest: (id: number) => Promise<void>;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
  analytics,
  recoveryRequests,
  resolveRecoveryRequest,
}) => {
  if (!analytics) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <a
          href="/api/admin/learning/analytics/export"
          download
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          <Download className="h-4 w-4" /> تصدير بيانات الطلاب CSV
        </a>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [
            "طلاب نشطين آخر 14 يوم",
            analytics.summary.activeStudents,
            Activity,
            "bg-emerald-50 text-emerald-700",
          ],
          [
            "طلاب محتاجين متابعة",
            analytics.summary.inactiveStudents,
            GraduationCap,
            "bg-amber-50 text-amber-700",
          ],
          [
            "متوسط تقدم الدروس",
            `${analytics.summary.averageProgress}%`,
            BarChart3,
            "bg-blue-50 text-blue-700",
          ],
          [
            "نسبة نجاح الاختبارات",
            `${analytics.summary.quizPassRate}%`,
            ClipboardCheck,
            "bg-violet-50 text-violet-700",
          ],
        ].map(([label, value, Icon, color]: any) => (
          <article
            key={String(label)}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <strong className="text-2xl font-black">{String(value)}</strong>
                <p className="mt-1 text-xs font-bold text-slate-600">
                  {String(label)}
                </p>
              </div>
              <span
                className={`grid h-11 w-11 place-items-center rounded-xl ${String(
                  color,
                )}`}
              >
                <Icon className="h-5 w-5" />
              </span>
            </div>
          </article>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-black">طلبات استرجاع الكود</h3>
          <p className="text-xs text-slate-500">
            راجع بيانات الطالب وابعتله الكود على رقم واتساب المسجل.
          </p>
        </div>
        <div className="space-y-2">
          {recoveryRequests.filter((request) => request.status === "pending")
            .length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">
              مفيش طلبات استرجاع معلقة
            </p>
          ) : (
            recoveryRequests
              .filter((request) => request.status === "pending")
              .map((request) => {
                const message = `أهلًا ${request.studentName}، كود دخول منصة د. محمود المهدي الخاص بيك هو: ${
                  request.accessCode || ""
                }`;
                return (
                  <article
                    key={request.id}
                    className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <strong>{request.studentName}</strong>
                      <p className="text-xs text-slate-500" dir="ltr">
                        {request.phone}
                      </p>
                      <span className="mt-1 block font-mono text-xs font-bold text-primary">
                        {request.accessCode}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={`https://wa.me/${request.phone.replace(
                          /^0/,
                          "20",
                        )}?text=${encodeURIComponent(message)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#25D366] px-4 text-xs font-bold text-white"
                      >
                        <MessageCircle className="h-4 w-4" /> إرسال الكود
                      </a>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveRecoveryRequest(request.id)}
                      >
                        <Check className="h-4 w-4" /> تم التواصل
                      </Button>
                    </div>
                  </article>
                );
              })
          )}
        </div>
      </section>
    </div>
  );
};
