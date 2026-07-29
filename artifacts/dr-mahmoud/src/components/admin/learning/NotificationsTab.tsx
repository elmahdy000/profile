import { useState } from "react";
import { MessageCircle, Loader2 } from "lucide-react";

type Props = {
  students: Array<{ grade?: string | null }>;
  onSend: (form: { title: string; message: string; type: string; targetGrade: string }) => Promise<void>;
};

export function NotificationsTab({ students, onSend }: Props) {
  const [broadcastForm, setBroadcastForm] = useState({
    title: "",
    message: "",
    type: "info",
    targetGrade: "all",
  });
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const handleSubmit = async () => {
    if (!broadcastForm.title.trim() || !broadcastForm.message.trim()) return;
    setIsBroadcasting(true);
    try {
      await onSend(broadcastForm);
      setBroadcastForm({ title: "", message: "", type: "info", targetGrade: "all" });
    } finally {
      setIsBroadcasting(false);
    }
  };

  const availableGrades = Array.from(new Set(students.filter((s) => s.grade).map((s) => s.grade!)));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <MessageCircle className="h-5 w-5 text-primary" />
          </span>
          <div>
            <h3 className="text-base font-black text-slate-900">إرسال إشعار للطلاب</h3>
            <p className="text-xs text-slate-500">الإشعار بيظهر فورًا في حساب الطالب داخل المنصة</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">عنوان الإشعار *</label>
            <input
              value={broadcastForm.title}
              onChange={(e) => setBroadcastForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="مثال: درس جديد اتضاف!"
              className="input-admin"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">نص الرسالة *</label>
            <textarea
              rows={3}
              value={broadcastForm.message}
              onChange={(e) => setBroadcastForm((f) => ({ ...f, message: e.target.value }))}
              placeholder="اكتب تفاصيل الإشعار هنا..."
              className="input-admin resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">نوع الإشعار</label>
              <select
                value={broadcastForm.type}
                onChange={(e) => setBroadcastForm((f) => ({ ...f, type: e.target.value }))}
                className="input-admin"
              >
                <option value="info">📘 معلومات</option>
                <option value="success">✅ نجاح / خبر سار</option>
                <option value="warning">⚠️ تنبيه</option>
                <option value="lesson">🎬 درس جديد</option>
                <option value="course">📚 كورس</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">المرحلة المستهدفة</label>
              <select
                value={broadcastForm.targetGrade}
                onChange={(e) => setBroadcastForm((f) => ({ ...f, targetGrade: e.target.value }))}
                className="input-admin"
              >
                <option value="all">🌐 كل الطلاب المعتمدين</option>
                {availableGrades.map((grade) => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="button"
            disabled={isBroadcasting || !broadcastForm.title.trim() || !broadcastForm.message.trim()}
            onClick={handleSubmit}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground shadow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isBroadcasting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> جاري الإرسال...</>
            ) : (
              "إرسال الإشعار للطلاب 🚀"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
