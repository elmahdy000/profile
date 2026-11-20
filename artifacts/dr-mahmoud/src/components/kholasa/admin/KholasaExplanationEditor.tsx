import { useState, useMemo } from "react";
import {
  FileText,
  Eye,
  Edit3,
  Lightbulb,
  Bookmark,
  AlertTriangle,
  CheckCircle2,
  Code2,
  List,
  Heading1,
  Heading2,
  Trash2,
  Sparkles,
  Copy,
  Check,
  Clock,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { KholasaExplanationView } from "../KholasaExplanationView";
import type { KholasaMaterial } from "../types";

interface KholasaExplanationEditorProps {
  material: KholasaMaterial;
  onChange: (updatedExplanation: string) => void;
}

export function KholasaExplanationEditor({
  material,
  onChange,
}: KholasaExplanationEditorProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"edit" | "preview" | "split">("split");
  const [copied, setCopied] = useState(false);

  const value =
    material.explanation ||
    material.summaryData?.explanation ||
    material.summaryData?.explanationText ||
    "";

  const readingTime = useMemo(() => {
    const words = value.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 130));
  }, [value]);

  const insertSnippet = (prefix: string, placeholder = "اكتب النص هنا...", suffix = "\n") => {
    const textarea = document.getElementById("explanation-textarea") as HTMLTextAreaElement | null;
    if (!textarea) {
      onChange(value ? `${value}\n${prefix}${placeholder}${suffix}` : `${prefix}${placeholder}${suffix}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end) || placeholder;
    const replacement = `${prefix}${selected}${suffix}`;
    const next = value.substring(0, start) + replacement + value.substring(end);
    onChange(next);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 50);
  };

  const handleInsertTemplate = () => {
    if (value.trim() && !confirm("هل تريد استبدال النص الحالي بقالب الشرح النموذجي؟")) {
      return;
    }

    const sampleTemplate = `# 📘 مقدمة ومحاور الدرس
في هذا الدرس نتعرف على المفاهيم الجوهرية والأسس العملية الخاصة بـ ${material.lesson}.

## 🔹 المحور الأول: المفهوم والأساس العلمي
يتناول هذا المحور الأفكار الرئيسية مع ربطها بالأمثلة الواقعية.
- النقطة الأولى: شرح المفهوم بصورة مباشرة ومبسطة.
- النقطة الثانية: كيف يعمل النظام وما هي مراحله المتتابعة.

💡 [فكرة ذكية]: احرص على تذكر الرابط بين هذا المفهوم والتطبيقات العملية في حياتنا اليومية.

## 🔹 المحور الثاني: القواعد والخطوات العملية
📌 [قاعدة ذهبية]: كل خطوة في هذه العملية تعتمد تماماً على دقة مخرجات الخطوة التي تسبقها.

🎯 [مثال تطبيقي]: عند تطبيق هذه الفكرة في بيئة الإنتاج، نلاحظ سرعة الاستجابة وكفاءة الأداء.

⚠️ [تنبيه هام]: تجنب الخلط بين هذا المصطلح والمصطلحات المشابهة التي قد ترد في امتحانات الوزارة.

# 🏁 خلاصة الدرس
قم بمراجعة كروت التعريفات والخرائط الذهنية المرفقة بعد قراءة هذا الشرح لترسيخ الفهم والاستعداد لبنك الأسئلة.`;

    onChange(sampleTemplate);
    toast({ title: "تم إدراج القالب النموذجي للشرح ✓" });
  };

  const previewMaterial: KholasaMaterial = {
    ...material,
    explanation: value,
    summaryData: {
      ...material.summaryData,
      explanation: value,
      explanationText: value,
    },
  };

  return (
    <div className="space-y-4 text-right" dir="rtl">
      {/* Top Helper Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 text-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-blue-900">
              محرر شرح الدرس المنسق ({material.lesson})
            </h3>
            <p className="text-[11px] text-blue-700/80 mt-0.5">
              اكتب أو الصق نص الشرح وسيقوم النظام بتنسيقه تلقائياً للطالب في كروت ومحاور ذكية.
            </p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1.5">
          <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-0.5 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab("edit")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                activeTab === "edit"
                  ? "bg-primary text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>التحرير فقط</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("split")}
              className={`hidden md:flex px-3 py-1.5 rounded-lg transition cursor-pointer items-center gap-1 ${
                activeTab === "split"
                  ? "bg-primary text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>تقسيم الشاشة</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                activeTab === "preview"
                  ? "bg-primary text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>معاينة الطالب</span>
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleInsertTemplate}
            className="h-8 rounded-xl text-[11px] font-bold gap-1 cursor-pointer bg-white text-blue-700 border-blue-200 hover:bg-blue-50"
            title="إدراج نموذج شرح منسق كدليل"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>قالب جاهز</span>
          </Button>
        </div>
      </div>

      {/* Formatting Quick Toolbar */}
      {(activeTab === "edit" || activeTab === "split") && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-2 text-xs">
          <span className="text-[11px] font-bold text-slate-500 ml-1">إدراج سريع:</span>

          <button
            type="button"
            onClick={() => insertSnippet("# ", "عنوان رئيسي جديد")}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <Heading1 className="h-3 w-3 text-primary" /> عنوان رئيسي
          </button>

          <button
            type="button"
            onClick={() => insertSnippet("## ", "عنوان فرعي")}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <Heading2 className="h-3 w-3 text-blue-600" /> عنوان فرعي
          </button>

          <button
            type="button"
            onClick={() => insertSnippet("💡 ", "اكتب هنا الفكرة أو الإضاءة الذكية...")}
            className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100 cursor-pointer"
          >
            <Lightbulb className="h-3 w-3 text-amber-500" /> كارت فكرة 💡
          </button>

          <button
            type="button"
            onClick={() => insertSnippet("📌 ", "اكتب هنا القاعدة الذهبية أو المفهوم الأساسي...")}
            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-800 hover:bg-blue-100 cursor-pointer"
          >
            <Bookmark className="h-3 w-3 text-blue-500" /> كارت قاعدة 📌
          </button>

          <button
            type="button"
            onClick={() => insertSnippet("🎯 ", "اكتب هنا مثالاً تطبيقياً توضيحياً...")}
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
          >
            <CheckCircle2 className="h-3 w-3 text-emerald-500" /> كارت مثال 🎯
          </button>

          <button
            type="button"
            onClick={() => insertSnippet("⚠️ ", "اكتب هنا تنبيهاً أو خطأ شائعاً يجب الحذر منه...")}
            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-800 hover:bg-rose-100 cursor-pointer"
          >
            <AlertTriangle className="h-3 w-3 text-rose-500" /> كارت تنبيه ⚠️
          </button>

          <button
            type="button"
            onClick={() => insertSnippet("- ", "عنصر تعداد")}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <List className="h-3 w-3" /> نقطة •
          </button>

          <button
            type="button"
            onClick={() => insertSnippet("```\n", "// كود برمجي هنا\n", "\n```\n")}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <Code2 className="h-3 w-3 text-slate-600" /> كود برمجي
          </button>
        </div>
      )}

      {/* Editor & Preview Area */}
      <div className={`grid gap-4 ${activeTab === "split" ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
        {/* Editor Box */}
        {(activeTab === "edit" || activeTab === "split") && (
          <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 bg-slate-50 text-[11px] text-slate-500">
              <span className="font-bold">مساحة إدخال الشرح (Markdown / نصوص مدعومة):</span>
              <div className="flex items-center gap-3 font-mono">
                <span>{value.trim().split(/\s+/).filter(Boolean).length} كلمة</span>
                <span>•</span>
                <span>⏱️ ~{readingTime} دقيقة قراءة</span>
              </div>
            </div>

            <textarea
              id="explanation-textarea"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="اكتب هنا الشرح التفصيلي للدرس، أو استخدم أزرار الإدراج السريع بالأعلى لإضافة العناوين وكروت الأفكار والقواعد والأمثلة..."
              rows={activeTab === "split" ? 18 : 22}
              className="w-full p-4 text-xs sm:text-sm leading-7 font-sans text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
              dir="rtl"
            />
          </div>
        )}

        {/* Live Preview Box */}
        {(activeTab === "preview" || activeTab === "split") && (
          <div className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50/50 shadow-xs overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 bg-slate-100/70 text-[11px] text-slate-600">
              <span className="font-bold flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-primary" />
                المعاينة الحية (كيف سيراها الطالب):
              </span>
              <span className="text-[10px] text-slate-400">تحديث فوري أثناء الكتابة</span>
            </div>

            <div className="p-4 overflow-y-auto max-h-[600px]">
              <KholasaExplanationView material={previewMaterial} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
