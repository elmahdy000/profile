import React from "react";
import { Loader2, CheckCircle2, Eye, EyeOff, Plus, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface SubAdminAccount {
  id: number;
  username: string;
  displayName: string;
  isActive: boolean;
  createdAt: string;
}

export interface AdminAccountsTabProps {
  role?: "superadmin" | "subadmin";
  handlePasswordChange: (e: React.FormEvent) => Promise<void>;
  lastUpdatedInfo: { pass?: string; subPass?: string; time: string } | null;
  superAdminPass: string;
  setSuperAdminPass: (val: string) => void;
  showSuperAdminPass: boolean;
  setShowSuperAdminPass: (val: boolean) => void;
  subAdminPass: string;
  setSubAdminPass: (val: string) => void;
  showSubAdminPass: boolean;
  setShowSubAdminPass: (val: boolean) => void;
  isUpdatingPasswords: boolean;
  showSubAdminModal: boolean;
  setShowSubAdminModal: (val: boolean) => void;
  loadingSubAdminAccounts: boolean;
  subAdminAccounts: SubAdminAccount[];
  fetchSubAdminAccounts: () => void;
  newSubAdminUsername: string;
  setNewSubAdminUsername: (val: string) => void;
  newSubAdminDisplayName: string;
  setNewSubAdminDisplayName: (val: string) => void;
  newSubAdminPassword: string;
  setNewSubAdminPassword: (val: string) => void;
  isCreatingSubAdmin: boolean;
  setIsCreatingSubAdmin: (val: boolean) => void;
}

export const AdminAccountsTab: React.FC<AdminAccountsTabProps> = ({
  role,
  handlePasswordChange,
  lastUpdatedInfo,
  superAdminPass,
  setSuperAdminPass,
  showSuperAdminPass,
  setShowSuperAdminPass,
  subAdminPass,
  setSubAdminPass,
  showSubAdminPass,
  setShowSubAdminPass,
  isUpdatingPasswords,
  showSubAdminModal,
  setShowSubAdminModal,
  loadingSubAdminAccounts,
  subAdminAccounts,
  fetchSubAdminAccounts,
  newSubAdminUsername,
  setNewSubAdminUsername,
  newSubAdminDisplayName,
  setNewSubAdminDisplayName,
  newSubAdminPassword,
  setNewSubAdminPassword,
  isCreatingSubAdmin,
  setIsCreatingSubAdmin,
}) => {
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <div className="border-b border-border/60 pb-3">
        <h3 className="text-lg font-bold text-foreground">
          التحكم في الحسابات وكلمات المرور والصلاحيات
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          إدارة كاملة لكلمات مرور المدير الرئيسي (Super Admin) والمشرف المساعد (Subadmin).
        </p>
      </div>

      {role !== "superadmin" ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-5 text-xs text-amber-900 font-semibold leading-relaxed">
          عذرًا، تغيير كلمات المرور وإدارة الحسابات مقتصر فقط على المدير الرئيسي (Super Admin).
        </div>
      ) : (
        <form
          onSubmit={handlePasswordChange}
          className="space-y-5 max-w-xl bg-card border border-border p-6 rounded-2xl shadow-2xs"
        >
          {lastUpdatedInfo && (
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50/90 dark:bg-emerald-950/50 p-4 space-y-2 text-emerald-950 dark:text-emerald-200 text-xs font-semibold">
              <div className="flex items-center gap-2 font-extrabold text-sm text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span>تم حفظ وتأكيد كلمة المرور بنجاح في قاعدة البيانات!</span>
              </div>
              {lastUpdatedInfo.pass && (
                <p className="dir-rtl">
                  • كلمة مرور المدير الرئيسي الجديدة:{" "}
                  <code className="bg-emerald-200/60 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md font-mono text-emerald-950 dark:text-emerald-100 font-bold">
                    {lastUpdatedInfo.pass}
                  </code>
                </p>
              )}
              {lastUpdatedInfo.subPass && (
                <p className="dir-rtl">
                  • كلمة مرور المشرف المساعد الجديدة:{" "}
                  <code className="bg-emerald-200/60 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md font-mono text-emerald-950 dark:text-emerald-100 font-bold">
                    {lastUpdatedInfo.subPass}
                  </code>
                </p>
              )}
              <span className="block text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-1">
                وقت التحديث: {lastUpdatedInfo.time} — كلمة المرور الآن نشطة ومحفوظة بصفة دائمة ولن تتأثر بفرق التحديثات مستقبلاً.
              </span>
            </div>
          )}

          <div className="space-y-4">
            <div className="rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 p-4 space-y-2">
              <strong className="block text-sm font-bold text-blue-900 dark:text-blue-300">
                كلمة مرور المدير الرئيسي (Super Admin)
              </strong>
              <p className="text-xs text-blue-700 dark:text-blue-400">
                تتيح الوصول لجميع الصلاحيات والإعدادات وحذف الطلاب.
              </p>
              <div className="relative flex items-center">
                <input
                  type={showSuperAdminPass ? "text" : "password"}
                  value={superAdminPass}
                  onChange={(e) => setSuperAdminPass(e.target.value)}
                  placeholder="أدخل كلمة مرور جديدة للـ Super Admin (أو اتركها فارغة)..."
                  className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowSuperAdminPass(!showSuperAdminPass)}
                  className="absolute left-3 text-muted-foreground hover:text-foreground transition-colors p-1"
                  title={showSuperAdminPass ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  {showSuperAdminPass ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 p-4 space-y-2">
              <strong className="block text-sm font-bold text-amber-900 dark:text-amber-300">
                كلمة مرور المشرف المساعد (Subadmin)
              </strong>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                تتيح إدارة الطلاب كاملة والرد والحجوزات والإشعارات وقبول الإيصالات (بدون حذف).
              </p>
              <div className="relative flex items-center">
                <input
                  type={showSubAdminPass ? "text" : "password"}
                  value={subAdminPass}
                  onChange={(e) => setSubAdminPass(e.target.value)}
                  placeholder="أدخل كلمة مرور جديدة للـ Subadmin..."
                  className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowSubAdminPass(!showSubAdminPass)}
                  className="absolute left-3 text-muted-foreground hover:text-foreground transition-colors p-1"
                  title={showSubAdminPass ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  {showSubAdminPass ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isUpdatingPasswords || (!superAdminPass && !subAdminPass)}
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isUpdatingPasswords ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "حفظ وتأكيد كلمات المرور في قاعدة البيانات"
            )}
          </button>
        </form>
      )}

      {/* Dynamic Subadmin Accounts Management Section */}
      {role === "superadmin" && (
        <div className="space-y-4 pt-6 border-t border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-base font-extrabold text-foreground">
                👥 إنشاء وإدارة حسابات المشرفين المساعدين
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                يمكنك إنشاء حسابات منفصلة بأسماء مختلفة وكلمات مرور خاصة بكل مشرف لتوثيق إجراءاته بدقة.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSubAdminModal(true)}
              className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" /> إضافة مشرف مساعد جديد
            </button>
          </div>

          {loadingSubAdminAccounts ? (
            <div className="py-8 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-xs font-bold">جاري تحميل حسابات المشرفين...</span>
            </div>
          ) : subAdminAccounts.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-6 text-center text-xs text-muted-foreground bg-muted/20">
              لا توجد حسابات ديناميكية مضافة بعد. يمكنك إنشاء حساب جديد بالضغط على الزر أعلاه.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-muted/50 text-muted-foreground font-bold border-b border-border">
                    <tr>
                      <th className="p-3">اسم المشرف (الاسم الظاهر)</th>
                      <th className="p-3">اسم المستخدم (Username)</th>
                      <th className="p-3">تاريخ الإنشاء</th>
                      <th className="p-3">الحالة</th>
                      <th className="p-3 text-left">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {subAdminAccounts.map((acc) => (
                      <tr key={acc.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-extrabold text-foreground">
                          👤 {acc.displayName}
                        </td>
                        <td className="p-3 font-mono text-primary font-bold dir-ltr text-right">
                          @{acc.username}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {new Date(acc.createdAt).toLocaleDateString("ar-EG")}
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
                            نشط ومفعّل
                          </span>
                        </td>
                        <td className="p-3 text-left">
                          <button
                            type="button"
                            onClick={async () => {
                              if (
                                !confirm(
                                  `هل أنت تأكد من حذف حساب المشرف (${acc.displayName})؟`,
                                )
                              )
                                return;
                              try {
                                const res = await fetch(
                                  `/api/admin/subadmins/${acc.id}`,
                                  {
                                    method: "DELETE",
                                    credentials: "include",
                                  },
                                );
                                if (!res.ok) throw new Error("فشل حذف الحساب");
                                toast({
                                  variant: "success",
                                  title: "تم حذف حساب المشرف بنجاح",
                                });
                                fetchSubAdminAccounts();
                              } catch (err: any) {
                                toast({
                                  title: "خطأ",
                                  description: err.message,
                                  variant: "destructive",
                                });
                              }
                            }}
                            className="h-8 px-2.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition flex items-center gap-1 ml-auto"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> حذف الحساب
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Create Subadmin Account */}
      {showSubAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs dir-rtl">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                <span>👤</span> إضافة حساب مشرف مساعد جديد
              </h3>
              <button
                type="button"
                onClick={() => setShowSubAdminModal(false)}
                className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsCreatingSubAdmin(true);
                try {
                  const res = await fetch("/api/admin/subadmins", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      username: newSubAdminUsername,
                      displayName: newSubAdminDisplayName,
                      password: newSubAdminPassword,
                    }),
                  });
                  const data = await res.json();
                  if (!res.ok)
                    throw new Error(data.error || "فشل إنشاء حساب المشرف");
                  toast({
                    variant: "success",
                    title: "تم إنشاء حساب المشرف بنجاح 🎉",
                    description: `يمكن للمشرف الدخول باستخدام اسم المستخدم @${newSubAdminUsername}`,
                  });
                  setShowSubAdminModal(false);
                  setNewSubAdminUsername("");
                  setNewSubAdminDisplayName("");
                  setNewSubAdminPassword("");
                  fetchSubAdminAccounts();
                } catch (err: any) {
                  toast({
                    title: "خطأ في الإضافة",
                    description: err.message,
                    variant: "destructive",
                  });
                } finally {
                  setIsCreatingSubAdmin(false);
                }
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-foreground mb-1">
                  اسم المشرف (الاسم الظاهر مثل: أحمد علي)
                </label>
                <input
                  type="text"
                  required
                  value={newSubAdminDisplayName}
                  onChange={(e) => setNewSubAdminDisplayName(e.target.value)}
                  placeholder="مثال: أستاذ أحمد / مساعد 1"
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">
                  اسم المستخدم للدخول (Username بالإنجليزية)
                </label>
                <input
                  type="text"
                  required
                  value={newSubAdminUsername}
                  onChange={(e) => setNewSubAdminUsername(e.target.value)}
                  placeholder="مثال: ahmed_ali"
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm dir-ltr text-right"
                />
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">
                  كلمة المرور (لا تقل عن 6 أحرف)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newSubAdminPassword}
                  onChange={(e) => setNewSubAdminPassword(e.target.value)}
                  placeholder="أدخل كلمة مرور قوية..."
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowSubAdminModal(false)}
                  className="h-10 px-4 rounded-xl border border-border text-foreground font-bold hover:bg-muted"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isCreatingSubAdmin}
                  className="h-10 px-5 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50"
                >
                  {isCreatingSubAdmin ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "إنشاء الحساب 🚀"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
