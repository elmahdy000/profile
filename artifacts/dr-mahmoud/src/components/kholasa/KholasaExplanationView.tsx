import { useState, useMemo } from "react";
import {
  BookOpen,
  Sparkles,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Search,
  Clock,
  FileText,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Code2,
  Layers,
  Map as MapIcon,
  HelpCircle,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { BidiStatement } from "./BidiStatement";
import type { KholasaMaterial, KholasaStructuredSection } from "./types";

interface KholasaExplanationViewProps {
  material: KholasaMaterial;
  onNavigateTab?: (tab: string) => void;
  darkSurface?: boolean;
}

export function KholasaExplanationView({
  material,
  onNavigateTab,
}: KholasaExplanationViewProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState<"normal" | "large" | "xlarge">("normal");
  const [searchTerm, setSearchTerm] = useState("");
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Extract raw text or structured sections
  const rawText =
    material.explanation ||
    material.summaryData?.explanation ||
    material.summaryData?.explanationText ||
    "";

  const structuredSections = Array.isArray(material.structuredSections)
    ? material.structuredSections
    : [];

  const hasContent = Boolean(rawText.trim() || structuredSections.length > 0);

  // Word count and reading time
  const readingStats = useMemo(() => {
    let allWords = 0;
    if (rawText) {
      allWords += rawText.trim().split(/\s+/).filter(Boolean).length;
    }
    structuredSections.forEach((sec) => {
      allWords += (sec.title + " " + sec.body + " " + (sec.keyTakeaway || ""))
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
    });
    const minutes = Math.max(1, Math.ceil(allWords / 130)); // ~130 words per minute Arabic reading speed
    return { words: allWords, minutes };
  }, [rawText, structuredSections]);

  const handleCopyAll = () => {
    let fullContent = `${material.unit} - ${material.lesson}\n\n`;
    if (rawText) {
      fullContent += rawText;
    } else {
      structuredSections.forEach((s, idx) => {
        fullContent += `\n[${idx + 1}] ${s.title}\n${s.body}\n`;
        if (s.keyTakeaway) fullContent += `خلاصة هامة: ${s.keyTakeaway}\n`;
      });
    }

    navigator.clipboard.writeText(fullContent).then(() => {
      setCopied(true);
      toast({ title: "تم نسخ نص الشرح بنجاح ✓" });
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const fontSizeClass =
    fontSize === "xlarge"
      ? "text-base sm:text-lg leading-9 sm:leading-10"
      : fontSize === "large"
      ? "text-sm sm:text-base leading-8 sm:leading-9"
      : "text-xs sm:text-sm leading-7 sm:leading-8";

  // Parse raw text into structured blocks
  const parsedBlocks = useMemo(() => {
    if (!rawText.trim()) return [];

    const lines = rawText.split("\n");
    const blocks: Array<{
      type: "h1" | "h2" | "h3" | "callout_idea" | "callout_rule" | "callout_alert" | "callout_example" | "code" | "list_item" | "paragraph";
      content: string;
      raw: string;
    }> = [];

    let inCode = false;
    let codeBuffer: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.startsWith("```")) {
        if (inCode) {
          blocks.push({
            type: "code",
            content: codeBuffer.join("\n"),
            raw: codeBuffer.join("\n"),
          });
          codeBuffer = [];
          inCode = false;
        } else {
          inCode = true;
        }
        continue;
      }

      if (inCode) {
        codeBuffer.push(line);
        continue;
      }

      if (!trimmed) continue;

      // Headings
      if (trimmed.startsWith("# ")) {
        blocks.push({ type: "h1", content: trimmed.replace(/^#\s*/, ""), raw: trimmed });
      } else if (trimmed.startsWith("## ")) {
        blocks.push({ type: "h2", content: trimmed.replace(/^##\s*/, ""), raw: trimmed });
      } else if (trimmed.startsWith("### ")) {
        blocks.push({ type: "h3", content: trimmed.replace(/^###\s*/, ""), raw: trimmed });
      }
      // Callout: Ideas / Smart Tips
      else if (
        trimmed.startsWith("💡") ||
        trimmed.startsWith("[فكرة]") ||
        trimmed.startsWith("[ملحوظة]") ||
        trimmed.startsWith("[إضاءة]")
      ) {
        const clean = trimmed.replace(/^(💡|\[فكرة\]|\[ملحوظة\]|\[إضاءة\])\s*/, "");
        blocks.push({ type: "callout_idea", content: clean, raw: trimmed });
      }
      // Callout: Rules / Definitions / Takeaways
      else if (
        trimmed.startsWith("📌") ||
        trimmed.startsWith("[قاعدة]") ||
        trimmed.startsWith("[مفهوم]") ||
        trimmed.startsWith("[الخلاصة]")
      ) {
        const clean = trimmed.replace(/^(📌|\[قاعدة\]|\[مفهوم\]|\[الخلاصة\])\s*/, "");
        blocks.push({ type: "callout_rule", content: clean, raw: trimmed });
      }
      // Callout: Warnings / Pitfalls
      else if (
        trimmed.startsWith("⚠️") ||
        trimmed.startsWith("[تنبيه]") ||
        trimmed.startsWith("[تحذير]") ||
        trimmed.startsWith("[انتبه]")
      ) {
        const clean = trimmed.replace(/^(⚠️|\[تنبيه\]|\[تحذير\]|\[انتبه\])\s*/, "");
        blocks.push({ type: "callout_alert", content: clean, raw: trimmed });
      }
      // Callout: Examples
      else if (
        trimmed.startsWith("🎯") ||
        trimmed.startsWith("[مثال]") ||
        trimmed.startsWith("[تطبيق]")
      ) {
        const clean = trimmed.replace(/^(🎯|\[مثال\]|\[تطبيق\])\s*/, "");
        blocks.push({ type: "callout_example", content: clean, raw: trimmed });
      }
      // List items
      else if (
        /^[-*•]\s+/.test(trimmed) ||
        /^\d+[\.\)]\s+/.test(trimmed) ||
        /^(أول حاجة|تاني حاجة|تالت حاجة|رابع حاجة|خامس حاجة)\s+/.test(trimmed)
      ) {
        const clean = trimmed.replace(/^([-*•]|\d+[\.\)])\s+/, "");
        blocks.push({ type: "list_item", content: clean, raw: trimmed });
      }
      // Smart Auto-callouts for friendly colloquial markers
      else if (trimmed.startsWith("الخلاصة اللي لازم تثبت عندك:") || trimmed.startsWith("الخلاصة:")) {
        blocks.push({ type: "callout_rule", content: trimmed, raw: trimmed });
      }
      else if (trimmed.startsWith("احفظ الفرق") || trimmed.startsWith("هنا لازم تفرق") || trimmed.startsWith("وده الفرق اللي لازم يكون ثابت عندك:")) {
        blocks.push({ type: "callout_alert", content: trimmed, raw: trimmed });
      }
      else if (trimmed.startsWith("وبكده نكون لمّينا")) {
        blocks.push({ type: "callout_example", content: trimmed, raw: trimmed });
      }
      // General paragraph
      else {
        blocks.push({ type: "paragraph", content: trimmed, raw: trimmed });
      }
    }

    if (inCode && codeBuffer.length > 0) {
      blocks.push({ type: "code", content: codeBuffer.join("\n"), raw: codeBuffer.join("\n") });
    }

    return blocks;
  }, [rawText]);

  // Filter blocks by search if applied
  const filteredBlocks = useMemo(() => {
    if (!searchTerm.trim()) return parsedBlocks;
    const q = searchTerm.trim().toLowerCase();
    return parsedBlocks.filter((b) => b.content.toLowerCase().includes(q));
  }, [parsedBlocks, searchTerm]);

  return (
    <div className={`space-y-5 text-right ${isFocusMode ? "max-w-4xl mx-auto py-2" : ""}`} dir="rtl">
      {/* Top Controls & Reading Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card p-3.5 sm:p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-3 py-1.5 text-xs font-black">
            <GraduationCap className="h-4 w-4" />
            <span>الشرح الشامل للدرس</span>
          </div>

          {/* Reading Stats */}
          {hasContent && (
            <div className="inline-flex items-center gap-1 rounded-xl bg-muted/60 text-muted-foreground px-2.5 py-1.5 text-[11px] font-bold">
              <Clock className="h-3.5 w-3.5" />
              <span>⏱️ قراءة: ~{readingStats.minutes} دقيقة</span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Font Size Selector */}
          <div className="inline-flex items-center rounded-xl border border-border bg-background p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setFontSize("normal")}
              className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                fontSize === "normal"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted"
              }`}
              title="حجم خط عادي"
            >
              A
            </button>
            <button
              type="button"
              onClick={() => setFontSize("large")}
              className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                fontSize === "large"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted"
              }`}
              title="حجم خط كبير"
            >
              A+
            </button>
            <button
              type="button"
              onClick={() => setFontSize("xlarge")}
              className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                fontSize === "xlarge"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted"
              }`}
              title="حجم خط كبير جداً"
            >
              A++
            </button>
          </div>

          {/* Copy Button */}
          {hasContent && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyAll}
              className="h-8 rounded-xl text-xs font-bold gap-1 cursor-pointer"
              title="نسخ الشرح بالكامل"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{copied ? "تم النسخ" : "نسخ الشرح"}</span>
            </Button>
          )}

          {/* Focus Mode Button */}
          {hasContent && (
            <Button
              type="button"
              variant={isFocusMode ? "default" : "outline"}
              size="sm"
              onClick={() => setIsFocusMode((v) => !v)}
              className="h-8 rounded-xl text-xs font-bold gap-1 cursor-pointer"
              title={isFocusMode ? "الخروج من وضع القراءة المركزة" : "وضع القراءة المركزة"}
            >
              {isFocusMode ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{isFocusMode ? "إلغاء التركيز" : "تركيز"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Optional In-Text Search */}
      {hasContent && parsedBlocks.length > 5 && (
        <div className="relative">
          <Search className="absolute right-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث في نقاط ومحاور الشرح..."
            className="w-full h-9 rounded-xl border border-border bg-background pr-10 pl-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      )}

      {/* Main Content Area */}
      {hasContent ? (
        <article className="rounded-2xl border border-border/80 bg-card p-5 sm:p-8 space-y-6 shadow-xs">
          {/* Header of the lesson inside the reader */}
          <header className="border-b border-border/60 pb-5 space-y-2">
            <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
              <span>{material.unit}</span>
              <span className="text-border">•</span>
              <span>الدرس {material.lessonOrder || 1}</span>
            </span>
            <h1 className="text-lg sm:text-2xl font-black text-foreground tracking-tight leading-snug">
              <BidiStatement text={material.lesson} />
            </h1>
          </header>

          {/* If we have parsed text blocks */}
          {rawText.trim() ? (
            <div className={`space-y-4 ${fontSizeClass} text-foreground/90`}>
              {filteredBlocks.map((block, idx) => {
                switch (block.type) {
                  case "h1":
                    return (
                      <div
                        key={idx}
                        className="pt-4 pb-2 border-b-2 border-primary/20 flex items-center gap-2.5"
                      >
                        <span className="h-6 w-1.5 rounded-full bg-primary shrink-0" />
                        <h2 className="text-base sm:text-xl font-black text-foreground">
                          <BidiStatement text={block.content} />
                        </h2>
                      </div>
                    );

                  case "h2":
                    return (
                      <div key={idx} className="pt-3 pb-1 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                        <h3 className="text-sm sm:text-lg font-extrabold text-blue-600 dark:text-blue-400">
                          <BidiStatement text={block.content} />
                        </h3>
                      </div>
                    );

                  case "h3":
                    return (
                      <h4 key={idx} className="pt-2 text-xs sm:text-base font-bold text-foreground/90">
                        <BidiStatement text={block.content} />
                      </h4>
                    );

                  case "callout_idea":
                    return (
                      <div
                        key={idx}
                        className="my-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5 text-amber-950 dark:text-amber-200 space-y-1.5 shadow-xs"
                      >
                        <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-amber-700 dark:text-amber-300">
                          <Lightbulb className="h-4 w-4 shrink-0 text-amber-500" />
                          <span>إضاءة / فكرة ذكية 💡</span>
                        </div>
                        <div className="text-xs sm:text-sm leading-7">
                          <BidiStatement text={block.content} />
                        </div>
                      </div>
                    );

                  case "callout_rule":
                    return (
                      <div
                        key={idx}
                        className="my-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 sm:p-5 text-blue-950 dark:text-blue-200 space-y-1.5 shadow-xs"
                      >
                        <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                          <Bookmark className="h-4 w-4 shrink-0 text-blue-500" />
                          <span>قاعدة ذهبية / مفهوم أساسي 📌</span>
                        </div>
                        <div className="text-xs sm:text-sm leading-7 font-medium">
                          <BidiStatement text={block.content} />
                        </div>
                      </div>
                    );

                  case "callout_alert":
                    return (
                      <div
                        key={idx}
                        className="my-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 sm:p-5 text-rose-950 dark:text-rose-200 space-y-1.5 shadow-xs"
                      >
                        <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-rose-700 dark:text-rose-300">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
                          <span>انتبه جيداً ⚠️</span>
                        </div>
                        <div className="text-xs sm:text-sm leading-7">
                          <BidiStatement text={block.content} />
                        </div>
                      </div>
                    );

                  case "callout_example":
                    return (
                      <div
                        key={idx}
                        className="my-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 sm:p-5 text-emerald-950 dark:text-emerald-200 space-y-1.5 shadow-xs"
                      >
                        <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                          <span>مثال تطبيقي 🎯</span>
                        </div>
                        <div className="text-xs sm:text-sm leading-7">
                          <BidiStatement text={block.content} />
                        </div>
                      </div>
                    );

                  case "code":
                    return (
                      <div
                        key={idx}
                        className="my-3 rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 p-4 sm:p-5 overflow-x-auto text-left font-mono text-xs sm:text-sm shadow-md"
                        dir="ltr"
                      >
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <Code2 className="h-3.5 w-3.5 text-blue-400" /> Code Snippet
                          </span>
                        </div>
                        <pre className="whitespace-pre overflow-x-auto font-mono">
                          <code>{block.content}</code>
                        </pre>
                      </div>
                    );

                  case "list_item":
                    return (
                      <div key={idx} className="flex items-start gap-2.5 my-1.5 pr-2">
                        <span className="h-2 w-2 rounded-full bg-primary/70 shrink-0 mt-2.5" />
                        <span className="flex-1">
                          <BidiStatement text={block.content} />
                        </span>
                      </div>
                    );

                  case "paragraph":
                  default:
                    return (
                      <p key={idx} className="my-3.5 leading-relaxed text-foreground/90">
                        <BidiStatement text={block.content} />
                      </p>
                    );
                }
              })}
            </div>
          ) : null}

          {/* Structured Sections (only fallback if raw text explanation is not provided) */}
          {!rawText.trim() && structuredSections.length > 0 && (
            <div className="space-y-6 pt-4 border-t border-border/50">
              {structuredSections.map((sec, idx) => (
                <section
                  key={sec.id || idx}
                  className="rounded-2xl border border-border/70 bg-muted/20 p-5 sm:p-6 space-y-3.5 transition hover:border-primary/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary text-primary-foreground text-xs font-black shrink-0">
                      {idx + 1}
                    </span>
                    <h3 className="text-sm sm:text-base font-black text-foreground">
                      <BidiStatement text={sec.title} />
                    </h3>
                  </div>

                  <div className={`text-foreground/90 whitespace-pre-line ${fontSizeClass}`}>
                    <BidiStatement text={sec.body} />
                  </div>

                  {sec.codeExample && (
                    <div
                      className="rounded-xl border border-slate-700 bg-slate-900 text-slate-100 p-3.5 overflow-x-auto text-left font-mono text-xs"
                      dir="ltr"
                    >
                      <pre>
                        <code>{sec.codeExample}</code>
                      </pre>
                    </div>
                  )}

                  {sec.keyTakeaway && (
                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-3.5 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                      <div>
                        <span className="font-black ml-1">خلاصة المحور:</span>
                        <BidiStatement text={sec.keyTakeaway} />
                      </div>
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </article>
      ) : (
        /* Empty State: Distinctive, encouraging notice when admin hasn't added text yet */
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-8 sm:p-12 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BookOpen className="h-8 w-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-base sm:text-lg font-black text-foreground">
              شرح الدرس قيد التجهيز والنشر ✍️
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              يقوم المعلم حالياً بإعداد وتنسيق المحتوى التفصيلي لهذا الدرس ({material.lesson}).
              سيكون متاحاً هنا بتنسيق تفاعلي مميز قريباً!
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            {onNavigateTab && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigateTab("definitions")}
                  className="rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
                >
                  <BookOpen className="h-3.5 w-3.5 text-primary" />
                  التعريفات والمفاهيم
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigateTab("mindmap")}
                  className="rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
                >
                  <MapIcon className="h-3.5 w-3.5 text-amber-500" />
                  الخرائط الذهنية
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigateTab("questions")}
                  className="rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
                >
                  <HelpCircle className="h-3.5 w-3.5 text-blue-500" />
                  بنك الأسئلة
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
