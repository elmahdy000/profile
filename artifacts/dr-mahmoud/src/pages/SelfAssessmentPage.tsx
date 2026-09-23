import React, { useEffect } from "react";
import { Link } from "wouter";
import { Sparkles, ArrowRight, ShieldCheck, Home } from "lucide-react";
import { SelfAssessmentTab } from "@/components/platform/tabs/SelfAssessmentTab";
import { Button } from "@/components/ui/button";

export default function SelfAssessmentPage() {
  useEffect(() => {
    document.title = "خدمة التقييم الذاتي الفوري | د. محمود المهدي";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "اختبر نفسك وقيّم مستواك في أي وحدة أو درس من منهج البرمجة مع د. محمود المهدي. تصحيح لحظي وشرح كامل للإجابات الصحيحة."
      );
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col" dir="rtl">
      {/* Top Navbar */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <span className="font-black text-sm text-slate-900 dark:text-white block leading-tight">
                  د. محمود المهدي
                </span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold block">
                  منصة التقييم الذاتي
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/platform">
              <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold border-slate-200">
                منصة الطلاب
              </Button>
            </Link>
            <Link href="/">
              <Button size="sm" className="rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white">
                <Home className="h-3.5 w-3.5 ml-1" />
                الرئيسية
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <SelfAssessmentTab />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-400">
        منصة د. محمود المهدي التعليمية • جميع الحقوق محفوظة {new Date().getFullYear()} ©
      </footer>
    </div>
  );
}
