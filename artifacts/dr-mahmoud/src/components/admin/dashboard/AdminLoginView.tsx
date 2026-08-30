import React from "react";
import { ShieldCheck, Eye, EyeOff, Loader2, ChevronRight } from "lucide-react";

export interface AdminLoginViewProps {
  passwordInput: string;
  setPasswordInput: (val: string) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  isLoggingIn: boolean;
  authError: string;
  setAuthError: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  passwordInput,
  setPasswordInput,
  showPassword,
  setShowPassword,
  isLoggingIn,
  authError,
  setAuthError,
  onSubmit,
}) => {
  return (
    <main
      className="relative min-h-screen w-full overflow-y-auto flex items-center justify-center bg-[#07111F] px-4 py-8 dir-rtl text-[#F8FAFC] selection:bg-[#2563EB] selection:text-white"
      dir="rtl"
    >
      {/* Subtle background radial spotlight & dot pattern */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#3B82F6]/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* Centered Admin Login Card */}
      <div className="relative w-full max-w-[500px] rounded-[24px] border border-[#223552] bg-[#0D1B2E] p-7 sm:p-10 shadow-[0_24px_70px_rgba(0,0,0,0.28)] transition-all">
        {/* Header & Dr. Mahmoud Elmahdy Branding */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative mb-4 flex items-center justify-center">
            <img
              src="/logo.webp"
              alt="د. محمود المهدي"
              width={72}
              height={72}
              className="h-16 w-16 sm:h-18 sm:w-18 shrink-0 rounded-full border-2 border-[#2563EB]/40 object-cover shadow-lg"
            />
            <span
              className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#0D1B2E] bg-[#2563EB] text-white shadow-xs"
              title="لوحة الإدارة"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#2563EB]/30 bg-[#2563EB]/10 px-3 py-1 text-[11px] font-bold text-[#60A5FA] mb-2.5">
            <span>بوابة إدارة المنصة</span>
          </div>

          <h1 className="text-2xl sm:text-[30px] font-extrabold tracking-tight text-[#F8FAFC] leading-tight">
            لوحة إدارة المنصة
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-[#3B82F6] mt-1">
            د. محمود المهدي — منصة البرمجة وعلوم الحاسب
          </p>
          <p className="text-xs text-[#94A3B8] mt-2 max-w-[380px] leading-relaxed">
            دخول المسؤولين المصرح لهم فقط. هذه البوابة مخصصة لإدارة الطلاب والمحتوى والاختبارات والمدفوعات.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6" noValidate>
          <div className="space-y-2 text-right">
            <div className="flex items-center justify-between">
              <label
                htmlFor="admin-password"
                className="block text-xs font-bold text-[#F8FAFC]"
              >
                كلمة مرور المسؤول
              </label>
              <span className="text-[11px] text-[#64748B]">
                أدخل كلمة المرور الخاصة بلوحة الإدارة
              </span>
            </div>
            <div className="relative flex items-center">
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (authError) setAuthError("");
                }}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                aria-invalid={Boolean(authError)}
                aria-describedby={
                  authError ? "admin-password-error" : undefined
                }
                className="h-[58px] w-full rounded-[12px] border border-[#2B3D5B] bg-[#071426] pl-12 pr-4 text-center font-mono text-lg font-bold tracking-widest text-[#F8FAFC] placeholder-[#64748B] outline-none transition-all focus:border-[#3B82F6] focus:ring-3 focus:ring-[#3B82F6]/14"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={
                  showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
                }
                aria-pressed={showPassword}
                className="absolute left-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-[#2563EB]/15 hover:text-[#60A5FA] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            {authError && (
              <div
                id="admin-password-error"
                role="alert"
                aria-live="polite"
                className="mt-2.5 flex items-start gap-2.5 rounded-[12px] border border-[#7F1D1D] bg-[#3F1820] p-3 text-xs font-semibold text-[#FCA5A5] text-right"
              >
                <ShieldCheck className="h-4 w-4 shrink-0 text-[#FCA5A5] mt-0.5" />
                <span>{authError}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoggingIn || !passwordInput.trim()}
            className="h-[58px] w-full rounded-[12px] bg-[#2563EB] hover:bg-[#1D4ED8] active:translate-y-[1px] text-white font-bold text-sm sm:text-base transition-all duration-150 disabled:bg-[#334155] disabled:text-[#94A3B8] disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#3B82F6]"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>جارٍ التحقق...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-5 w-5" />
                <span>دخول لوحة الإدارة</span>
              </>
            )}
          </button>
        </form>


        {/* Footer Security Notice & Return to Main Site */}
        <div className="mt-8 pt-5 border-t border-[#223552] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <a
            href="/"
            className="flex items-center gap-1.5 font-bold text-[#94A3B8] hover:text-[#F8FAFC] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] rounded-md px-1 py-0.5"
          >
            <ChevronRight className="h-4 w-4" />
            <span>العودة إلى الموقع</span>
          </a>
          <div className="flex flex-col items-center gap-2 sm:items-end">
            <a
              href="/subadmin"
              className="flex items-center gap-1.5 font-bold text-[#60A5FA]/70 hover:text-[#60A5FA] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] rounded-md px-1 py-0.5"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>بوابة المشرف المساعد</span>
            </a>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#64748B]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#2563EB]" />
              <span>اتصال آمن ومشفّر</span>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
};
