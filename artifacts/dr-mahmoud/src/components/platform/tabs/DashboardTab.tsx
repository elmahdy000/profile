import {
  BookOpen,
  ClipboardCheck,
  BarChart3,
  Trophy,
  Play,
  ChevronLeft,
  FileText,
  CheckCircle2,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTrackForStage } from "@/data/academic";
import type { Student, LearningFile, Quiz, VideoSummary, ProgressRow } from "@/types/platform";
import { EmptyState, StatisticCard } from "../StudentDashboardUI";
import { PaymentBanner } from "./PaymentBanner";

export function DashboardTab({
  student,
  files,
  quizzes,
  videos,
  progress,
  dataLoading,
  dataError,
  onRetry,
  onOpen,
}: {
  student: Student;
  files: LearningFile[];
  quizzes: Quiz[];
  videos: VideoSummary[];
  progress: ProgressRow[];
  dataLoading: boolean;
  dataError: string;
  onRetry: () => void;
  onOpen: (tab: "lessons" | "compiler" | "files" | "quizzes") => void;
}) {
  const academicTrack = getTrackForStage(student.grade);
  const progressByVideo = new Map(progress.map((row) => [row.videoId, row]));
  const averageProgress = videos.length
    ? Math.round(
        videos.reduce(
          (sum, video) => sum + (progressByVideo.get(video.id)?.progress || 0),
          0,
        ) / videos.length,
      )
    : 0;
  const continueRow = [...progress]
    .filter(
      (row) =>
        row.progress > 0 &&
        row.progress < 100 &&
        videos.some((video) => video.id === row.videoId),
    )
    .sort(
      (a, b) =>
        new Date(b.updatedAt || 0).getTime() -
        new Date(a.updatedAt || 0).getTime(),
    )[0];
  const continueVideo =
    videos.find((video) => video.id === continueRow?.videoId) || videos[0];
  const continueProgress = continueVideo
    ? progressByVideo.get(continueVideo.id)?.progress || 0
    : 0;
  const evaluationScore = Math.round((averageProgress * 0.5) + (quizzes.length > 0 ? 50 : 0));
  const overallRating = evaluationScore >= 90 ? "ممتاز 🌟" : evaluationScore >= 75 ? "جيد جداً 🔥" : evaluationScore >= 50 ? "مستواك متوسط 👍" : "تحتاج للمزيد من المذاكرة 💪";

  const stats = [
    {
      label: "دروس متاحة",
      value: String(videos.length),
      icon: BookOpen,
      helper: "مخصصة لمرحلتك",
    },
    {
      label: "اختبارات متاحة",
      value: String(quizzes.length),
      icon: ClipboardCheck,
      helper: "جاهزة للحل",
    },
    { label: "إجمالي المشاهدة", value: `${averageProgress}%`, icon: BarChart3, helper: "عبر كل الدروس" },
    { label: "التقييم العام", value: overallRating, icon: Trophy, helper: `مستوى الإنجاز: ${evaluationScore}%` },
  ];
  if (dataLoading)
    return (
      <div
        className="space-y-6 p-4 md:p-8"
        aria-label="جاري تحميل محتوى المنصة"
      >
        <div className="h-20 animate-pulse rounded-2xl bg-muted" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-2xl bg-muted"
            />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-3xl bg-muted" />
      </div>
    );
  return (
    <div className="space-y-7 text-right" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[24px] font-extrabold text-foreground md:text-[28px] leading-tight">
            مرحبًا، {student.name}
          </h1>
          <p className="mt-1.5 text-[13px] leading-6 text-muted-foreground">
            {academicTrack
              ? `${academicTrack.title} — محتواك مرتب حسب كورساتك ومرحلتك.`
              : "كمّل من مكان ما وقفت، وخليك ثابت على خطتك."}
          </p>
        </div>
        <span
          className={`w-fit rounded-full px-3 py-1.5 text-[11px] font-bold ${
            student.learningMode === "offline"
              ? "bg-violet-500/10 text-violet-400 border border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-400"
              : "bg-primary/10 text-primary border border-primary/20"
          }`}
        >
          {student.learningMode === "offline"
            ? "نظامك: أوفلاين"
            : "نظامك: أونلاين"}
        </span>
      </div>
      {dataError && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-destructive sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{dataError}</span>
          <Button
            type="button"
            variant="outline"
            onClick={onRetry}
            className="font-bold"
          >
            حاول تاني
          </Button>
        </div>
      )}
      {student.paymentStatus !== "paid" && (
        <PaymentBanner paymentStatus={student.paymentStatus || "unpaid"} onUploaded={() => window.location.reload()} />
      )}
      <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => <StatisticCard key={stat.label} {...stat} />)}
      </div>
      {(() => {
        const categoryMap = new Map<string, { total: number; progressSum: number; completed: number }>();
        for (const video of videos) {
          const cat = video.category || "عام";
          const row = progressByVideo.get(video.id);
          const pct = row?.progress ?? 0;
          const existing = categoryMap.get(cat) ?? { total: 0, progressSum: 0, completed: 0 };
          categoryMap.set(cat, {
            total: existing.total + 1,
            progressSum: existing.progressSum + pct,
            completed: existing.completed + (pct >= 90 ? 1 : 0),
          });
        }
        const categories = Array.from(categoryMap.entries());
        if (categories.length < 2) return null;
        return (
          <section aria-label="تقدمك في الكورسات">
            <h2 className="mb-3 text-[15px] font-extrabold text-foreground">تقدمك في الكورسات</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {categories.map(([cat, data]) => {
                const avg = Math.round(data.progressSum / data.total);
                const isComplete = data.completed === data.total && data.total > 0;
                return (
                  <div
                    key={cat}
                    className={`rounded-2xl border p-4 text-right shadow-sm ${isComplete ? "border-emerald-500/40 bg-emerald-500/10 dark:border-emerald-700 dark:bg-emerald-900/20" : "border-border bg-card"}`}
                  >
                    <div className="mb-2.5 flex items-center justify-between gap-2">
                      <p className="truncate text-[13px] font-bold text-foreground">{cat}</p>
                      {isComplete && (
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          <Trophy className="h-3 w-3" /> مكتمل
                        </span>
                      )}
                    </div>
                    <div className="h-[6px] overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${avg}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                      <span>{avg}%</span>
                      <span>{data.completed}/{data.total} دروس</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })()}
      <div className="grid gap-5 grid-cols-1 xl:grid-cols-[1.5fr_.7fr]">
        <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-md">
          <div className="grid grid-cols-1 sm:grid-cols-[.9fr_1.1fr]">
            <div className="relative min-h-52 bg-accent">
              <img
                src={academicTrack?.image || "/university-cs-path.webp"}
                alt={academicTrack?.imageAlt || "الدرس اللي بتذاكره"}
                className="h-full w-full object-cover opacity-60"
              />
              {continueVideo && (
                <button
                  onClick={() => onOpen("lessons")}
                  aria-label={`شغّل ${continueVideo.title}`}
                  className="absolute inset-0 m-auto grid h-14 w-14 place-items-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 transition-transform duration-200 hover:scale-110"
                >
                  <Play className="h-6 w-6 fill-current" />
                </button>
              )}
            </div>
            <div className="flex flex-col justify-center p-5 text-right">
              <span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary">
                {continueProgress > 0 ? "كمّل من مكان ما وقفت" : "ابدأ رحلتك"}
              </span>
              <h2 className="mt-2.5 text-lg font-extrabold text-foreground md:text-xl leading-snug">
                {continueVideo?.title || "محتواك هيظهر هنا قريب"}
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                {continueVideo
                  ? `${continueVideo.subject || continueVideo.category} — تقدمك بيتحفظ تلقائي على حسابك.`
                  : "لسه مفيش دروس منشورة ليك. أول ما المحتوى يتضاف هتلاقيه هنا."}
              </p>
              <div className="mt-4 h-[7px] overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${continueProgress}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[11px] font-medium text-muted-foreground">
                <span>{continueProgress}% من الدرس</span>
                <span>{averageProgress}% إجمالي التقدم</span>
              </div>
              {continueVideo && <Button onClick={() => onOpen("lessons")} className="mt-4 h-11 w-fit font-bold">{continueProgress > 0 ? "كمّل الدرس" : "ابدأ أول درس"} <ChevronLeft className="h-4 w-4" /></Button>}
            </div>
          </div>
        </article>
        <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-extrabold text-foreground">الخطوة اللي بعدها</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            اختصار لأحدث حاجة متاحة ليك.
          </p>
          <div className="mt-5 space-y-4">
            {quizzes[0] && (
              <button
                onClick={() => onOpen("quizzes")}
                className="flex w-full items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-right transition-colors hover:bg-amber-500/20"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-500/20 text-amber-500 dark:text-amber-400"><ClipboardCheck className="h-[18px] w-[18px]" /></span>
                <span className="min-w-0">
                  <strong className="block text-[13px] font-bold text-foreground truncate">{quizzes[0].title}</strong>
                  <small className="text-[11px] text-muted-foreground">
                    {quizzes[0].questions.length} أسئلة — ابدأ لما تكون جاهز
                  </small>
                </span>
              </button>
            )}
            {files[0] && (
              <button
                onClick={() => onOpen("files")}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3.5 text-right transition-colors hover:bg-muted"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><FileText className="h-[18px] w-[18px]" /></span>
                <span className="min-w-0">
                  <strong className="block text-[13px] font-bold text-foreground truncate">{files[0].title}</strong>
                  <small className="text-[11px] text-muted-foreground">
                    أحدث ملف متاح للتحميل
                  </small>
                </span>
              </button>
            )}
            {!quizzes.length && !files.length && (
              <div className="rounded-xl border border-dashed border-border p-5 text-center text-[13px] text-muted-foreground">
                <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-emerald-500" />
                مفيش مهام مطلوبة منك دلوقتي. ركّز في دروسك براحتك.
              </div>
            )}
          </div>
        </article>
      </div>
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-foreground">أحدث الملفات</h2>
          <button
            onClick={() => onOpen("files")}
            className="font-bold text-primary"
          >
            عرض الكل
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {files.slice(0, 4).map((file) => (
            <article key={file.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/20">
              <div className="grid h-[88px] place-items-center rounded-xl bg-primary/10">
                <FileText className="h-8 w-8 text-primary/35" />
              </div>
              <h3 className="mt-3 line-clamp-1 text-[13px] font-bold text-foreground">{file.title}</h3>
              <a
                href={`/api/learning/files/${file.id}/preview`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex h-9 items-center justify-center gap-2 rounded-lg bg-primary/10 text-[12px] font-bold text-primary transition-colors hover:bg-primary/15"
              >
                <FileText className="h-4 w-4" /> عرض الملف
              </a>
            </article>
          ))}
        </div>
        {files.length === 0 && (
          <EmptyState icon={FolderOpen} title="لا توجد ملفات مرفوعة" description="ستظهر مذكرات وأكواد الكورسات هنا بعد اعتمادها لحسابك." />
        )}
      </div>
    </div>
  );
}
