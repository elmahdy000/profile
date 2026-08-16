import React, { useEffect, useState } from "react";
import {
  ShieldCheck,
  Phone,
  RefreshCw,
  Loader2,
  X,
  CheckCircle2,
  Clock,
  Plus,
  Edit2,
  Trash2,
  KeyRound,
  User,
  Search,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export type ParentRow = {
  id: number;
  name: string;
  phone: string;
  parentCode: string;
  createdAt: string;
  lastSessionExpiresAt: string | null;
  student: {
    id: number;
    name: string | null;
    phone: string | null;
    grade: string | null;
    status: string | null;
  } | null;
};

export type StudentOption = {
  id: number;
  name: string;
  phone: string;
  grade?: string | null;
};

function formatArabicDate(dateString?: string | null): string {
  if (!dateString) return "—";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-EG", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export function ParentsTab({ role = "superadmin" }: { role?: "superadmin" | "subadmin" }) {
  const { toast } = useToast();
  const [parents, setParents] = useState<ParentRow[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingParent, setEditingParent] = useState<ParentRow | null>(null);

  // Form fields
  const [nameInput, setNameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [studentIdInput, setStudentIdInput] = useState<number | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/parents", { credentials: "include" });
      if (!res.ok) throw new Error("فشل تحميل بيانات أولياء الأمور");
      const data = await res.json();
      setParents(data.parents ?? []);
      setTotal(data.total ?? 0);
    } catch (e: any) {
      setError(e.message || "خطأ غير متوقع");
    } finally {
      setIsLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      const res = await fetch("/api/admin/students", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students ?? data ?? []);
      }
    } catch (e) {
      // Ignore
    }
  };

  useEffect(() => {
    load();
    loadStudents();
  }, []);

  const handleCreateParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput || !phoneInput || !studentIdInput) {
      toast({ title: "تنبيه", description: "يرجى ملء جميع الحقول المطلوبة واختيار الطالب", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/parents", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameInput,
          phone: phoneInput,
          studentId: studentIdInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل إنشاء حساب ولي الأمر");
      toast({ variant: "success", title: "تم إنشاء حساب ولي الأمر 🚀", description: `كود الدخول: ${data.parent.parentCode}` });
      setShowCreateModal(false);
      setNameInput("");
      setPhoneInput("");
      setStudentIdInput("");
      load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParent || !nameInput || !phoneInput || !studentIdInput) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/parents/${editingParent.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameInput,
          phone: phoneInput,
          studentId: studentIdInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل تعديل حساب ولي الأمر");
      toast({ variant: "success", title: "تم التعديل بنجاح ✏️", description: data.message });
      setEditingParent(null);
      setNameInput("");
      setPhoneInput("");
      setStudentIdInput("");
      load();
    } catch (err: any) {
      toast({ title: "خطأ في التعديل", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegenerateCode = async (parent: ParentRow) => {
    if (!confirm(`هل أنت تأكد من توليد كود دخول جديد لولي الأمر: ${parent.name}؟`)) return;
    try {
      const res = await fetch(`/api/admin/parents/${parent.id}/regenerate-code`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل إعادة توليد الكود");
      toast({ variant: "success", title: "تم توليد كود جديد 🔑", description: `الكود الجديد: ${data.parentCode}` });
      load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteParent = async (parent: ParentRow) => {
    if (!confirm(`⚠️ هل أنت متأكد تماماً من حذف حساب ولي الأمر: ${parent.name}؟`)) return;
    try {
      const res = await fetch(`/api/admin/parents/${parent.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل حذف حساب ولي الأمر");
      toast({ variant: "success", title: "تم الحذف", description: data.message });
      load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const openEditModal = (p: ParentRow) => {
    setEditingParent(p);
    setNameInput(p.name);
    setPhoneInput(p.phone);
    setStudentIdInput(p.student ? p.student.id : "");
  };

  const filtered = parents.filter((p) => {
    const q = search.toLowerCase();
    return (
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      p.parentCode.toLowerCase().includes(q) ||
      (p.student?.name ?? "").toLowerCase().includes(q) ||
      (p.student?.phone ?? "").includes(q)
    );
  });

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#0F172A] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#0866D9]" />
            إدارة حسابات أولياء الأمور (Full CRUD)
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            إجمالي المسجلين: <strong>{total}</strong> ولي أمر — يمكنك إضافة وتعديل وحذف وتوليد أكواد الدخول.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="بحث بالاسم أو الرقم أو الكود..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9 pl-4 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0866D9] w-64"
            />
          </div>
          <button
            onClick={() => {
              setNameInput("");
              setPhoneInput("");
              setStudentIdInput("");
              setShowCreateModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            إضافة ولي أمر جديد
          </button>
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0866D9]/10 text-[#0866D9] text-xs font-bold hover:bg-[#0866D9]/20 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            تحديث
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[#0866D9]" />
          <span className="mr-2 text-sm text-slate-500">جاري التحميل...</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <X className="w-4 h-4 shrink-0" />
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200">
          <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">
            {search ? "لا توجد نتائج مطابقة للبحث" : "لم يسجّل أي ولي أمر حتى الآن"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_1.3fr_1fr_2fr_1.2fr_1.2fr_1.3fr] min-w-[1160px] gap-0 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] font-bold text-slate-500">
            <span>ولي الأمر</span>
            <span>رقم الهاتف</span>
            <span>الكود</span>
            <span>الطالب المرتبط</span>
            <span>تاريخ التسجيل</span>
            <span>حالة الجلسة</span>
            <span className="text-left pl-2">الإجراءات (CRUD)</span>
          </div>

          <div className="divide-y divide-slate-100 min-w-[1160px]">
            {filtered.map((parent) => {
              const isActive = parent.lastSessionExpiresAt
                ? new Date(parent.lastSessionExpiresAt) > new Date()
                : false;
              return (
                <div
                  key={parent.id}
                  className="grid grid-cols-[2fr_1.3fr_1fr_2fr_1.2fr_1.2fr_1.3fr] gap-0 px-4 py-3.5 items-center hover:bg-slate-50 transition-colors text-xs"
                >
                  {/* Parent name */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#0866D9]/10 text-[#0866D9] font-black flex items-center justify-center text-xs shrink-0">
                      {parent.name.substring(0, 2)}
                    </div>
                    <span className="font-bold text-slate-900 truncate">{parent.name}</span>
                  </div>

                  {/* Phone */}
                  <div className="flex items-center gap-1 text-slate-600 font-mono">
                    <Phone className="w-3 h-3 shrink-0 text-slate-400" />
                    {parent.phone}
                  </div>

                  {/* Code */}
                  <span className="font-mono text-[11px] bg-blue-50 text-blue-700 border border-blue-200 font-bold px-2 py-1 rounded-lg w-fit">
                    {parent.parentCode}
                  </span>

                  {/* Student */}
                  {parent.student ? (
                    <div>
                      <span className="font-bold text-slate-900 block">{parent.student.name ?? "—"}</span>
                      <span className="text-slate-400 font-mono text-[10px]">{parent.student.phone ?? ""}</span>
                      {parent.student.grade && (
                        <span className="text-[10px] text-[#0866D9] bg-[#0866D9]/10 px-1.5 py-0.5 rounded-md font-bold mt-0.5 inline-block">
                          {parent.student.grade}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}

                  {/* Registration date */}
                  <span className="text-slate-500 text-[11px]">{formatArabicDate(parent.createdAt)}</span>

                  {/* Last session */}
                  <div className="flex flex-col gap-0.5">
                    {parent.lastSessionExpiresAt ? (
                      <>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full w-fit ${
                            isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {isActive ? "نشط الآن" : "دخول سابق"}
                        </span>
                      </>
                    ) : (
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        لم يدخل بعد
                      </span>
                    )}
                  </div>

                  {/* CRUD Actions */}
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => handleRegenerateCode(parent)}
                      title="توليد كود دخول جديد"
                      className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => openEditModal(parent)}
                      title="تعديل بيانات ولي الأمر"
                      className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {role === "superadmin" && (
                      <button
                        onClick={() => handleDeleteParent(parent)}
                        title="حذف حساب ولي الأمر"
                        className="p-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          </div>

          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-400">
            يتم عرض {filtered.length} من أصل {total} ولي أمر
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                إضافة حساب ولي أمر جديد
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateParent} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-700 mb-1">اسم ولي الأمر بالكامل *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أحمد محمد علي"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">رقم هاتف ولي الأمر (للدخول والمتابعة) *</label>
                <input
                  type="text"
                  required
                  placeholder="01012345678"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dir-ltr text-right"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">اختيار الطالب المرتبط به *</label>
                <select
                  required
                  value={studentIdInput}
                  onChange={(e) => setStudentIdInput(e.target.value ? Number(e.target.value) : "")}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- اختر الطالب --</option>
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.phone}) {st.grade ? `- ${st.grade}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "إنشاء وإستخراج الكود"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingParent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-600" />
                تعديل بيانات ولي الأمر
              </h3>
              <button onClick={() => setEditingParent(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateParent} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-700 mb-1">اسم ولي الأمر</label>
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">رقم الهاتف</label>
                <input
                  type="text"
                  required
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dir-ltr text-right"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">الطالب المرتبط</label>
                <select
                  required
                  value={studentIdInput}
                  onChange={(e) => setStudentIdInput(e.target.value ? Number(e.target.value) : "")}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- اختر الطالب --</option>
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.phone}) {st.grade ? `- ${st.grade}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingParent(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ التعديلات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
