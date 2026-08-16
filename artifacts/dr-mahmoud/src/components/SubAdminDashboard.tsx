import React, { useState, useEffect } from "react";
import {
  Users,
  LogOut,
  ExternalLink,
  Loader2,
  Menu,
  X,
  MapPin,
} from "lucide-react";
import { AdminLearning } from "./AdminLearning";

export function SubAdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    localStorage.removeItem("dr_mahmoud_admin_pwd");
    fetch("/api/admin/me", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) {
          setIsAuthenticated(false);
          return;
        }
        const data = await response.json();
        if (data.authenticated && (data.role === "subadmin" || data.role === "superadmin")) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      })
      .catch(() => setIsAuthenticated(false))
      .finally(() => setIsInitializing(false));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/admin/logout", {
      method: "POST",
      credentials: "include",
    });
    setIsAuthenticated(false);
    window.location.href = "/subadmin";
  };

  if (isInitializing) {
    return (
      <div className="admin-dashboard-shell grid min-h-screen place-items-center bg-[#F6F8FC]">
        <Loader2 className="h-10 w-10 animate-spin text-[#0866D9]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <SubAdminLogin onSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="admin-dashboard-shell min-h-screen w-full bg-[#F6F8FC] text-[#0F172A] font-sans dir-rtl">
      {/* Mobile Drawer Trigger */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-border sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <img src="/logo.webp" alt="Logo" className="h-8 w-8 rounded-lg object-cover" />
          <span className="font-bold text-sm">لوحة الإشراف والتواصل</span>
        </div>
        <button
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="p-2 rounded-xl border border-border bg-muted/40"
        >
          {isMobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="fixed top-0 bottom-0 right-0 z-50 hidden w-[288px] border-l border-[#E4EAF2] bg-white lg:flex flex-col">
        <div className="flex h-full flex-col p-5">
          <div className="mb-6 flex items-center gap-3 border-b border-[#E4EAF2] pb-5">
            <img src="/logo.webp" alt="شعار المنصة" className="h-11 w-11 rounded-xl border border-[#E4EAF2] object-cover" />
            <div>
              <strong className="block text-sm font-black text-[#0F172A]">أكاديمية د. محمود</strong>
              <span className="text-xs text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">لوحة المشرف المساعد</span>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            <span className="block px-3 pb-1 pt-1 text-[11px] font-bold tracking-wider text-[#64748B]">إدارة الطلاب والخدمات</span>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  const params = new URLSearchParams(window.location.search);
                  params.delete("mode");
                  params.delete("status");
                  window.history.replaceState(null, "", `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`);
                  window.dispatchEvent(new Event("popstate"));
                }
              }}
              className="w-full flex items-center gap-3 rounded-xl bg-[#0866D9] text-white px-3.5 py-3 text-xs font-bold shadow-xs hover:bg-[#0756B8] transition-colors"
            >
              <Users className="h-4 w-4" />
              <span>إدارة الطلاب والاشتراكات</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  const params = new URLSearchParams(window.location.search);
                  params.set("mode", "offline");
                  params.delete("status");
                  window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
                  window.dispatchEvent(new Event("popstate"));
                }
              }}
              className="w-full flex items-center gap-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-3 text-xs font-bold shadow-xs transition-colors"
            >
              <MapPin className="h-4 w-4" />
              <span>حجوزات السناتر والمواعيد 📍</span>
            </button>
          </nav>

          <div className="mt-auto border-t border-[#E4EAF2] pt-4 space-y-3">
            <div className="flex items-center gap-3 rounded-xl bg-amber-50 p-3 border border-amber-200">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-amber-500/10 text-amber-700 font-black text-xs">
                مش
              </div>
              <div className="min-w-0 flex-1">
                <strong className="block text-xs font-bold text-[#0F172A] truncate">مشرف مساعد (Subadmin)</strong>
                <span className="text-[11px] text-[#64748B] block truncate">إدارة الطلاب والتفعيل</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-[#E4EAF2] bg-white px-3 py-2 text-xs font-bold text-[#0F172A] hover:bg-[#F6F8FC] transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5 text-[#64748B]" />
                <span>الموقع</span>
              </a>
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-red-50 border border-red-200/60 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100/80 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>خروج</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="min-h-screen w-full lg:mr-[288px] lg:w-[calc(100%-288px)] px-4 py-6 md:px-8 lg:px-10 lg:py-8">
        <div className="w-full max-w-[1400px] mx-auto space-y-6">
          <div className="hidden lg:flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-sm shadow-md shadow-amber-500/20">
                مشرف
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900">لوحة المشرف المساعد المخصصة</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">إدارة تفاعلية للطلاب، الإيصالات، الأجهزة، والإشعارات الجماعية</p>
              </div>
            </div>
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-200"
            >
              <ExternalLink className="w-3.5 h-3.5" /> زيارة الموقع
            </a>
          </div>

          <AdminLearning role="subadmin" />
        </div>
      </main>
    </div>
  );
}

function SubAdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        throw new Error("بيانات الدخول أو كلمة المرور غير صحيحة");
      }

      const data = await res.json();
      if (data.role !== "subadmin") {
        setError("عذرًا، هذه البوابة مخصصة للمشرف المساعد فقط.");
        return;
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || "فشل تسجيل الدخول");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-dashboard-shell grid min-h-screen place-items-center bg-[#F6F8FC] p-4 dir-rtl">
      <div className="w-full max-w-md bg-white border border-[#E4EAF2] rounded-3xl p-8 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-amber-50 border border-amber-200 rounded-2xl mx-auto flex items-center justify-center text-amber-600 font-black text-xl">
            🛡️
          </div>
          <h1 className="text-xl font-black text-[#0F172A]">بوابة المشرف المساعد</h1>
          <p className="text-xs text-[#64748B]">سجل الدخول بحساب المشرف أو كلمة المرور المخصصة لك</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-600 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#0F172A] mb-1.5">اسم المستخدم (مطلوب)</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ahmed"
              className="w-full bg-[#F6F8FC] border border-[#E4EAF2] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0866D9]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#0F172A] mb-1.5">كلمة مرور المشرف</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="أدخل كلمة المرور..."
              className="w-full bg-[#F6F8FC] border border-[#E4EAF2] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0866D9]"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "تسجيل الدخول كـ مشرف"}
          </button>
        </form>
      </div>
    </div>
  );
}
