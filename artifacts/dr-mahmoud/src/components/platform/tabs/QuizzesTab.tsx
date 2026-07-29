import { Clock, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Quiz } from "@/types/platform";
import { PageHeader, StatusBadge, EmptyState } from "../StudentDashboardUI";

export function QuizzesTab({
  quizzes,
  onStartQuiz,
}: {
  quizzes: Quiz[];
  onStartQuiz: (quiz: Quiz) => void;
}) {
  return (
    <section className="space-y-7 text-right" dir="rtl">
      <PageHeader title="الاختبارات" description="اختبر فهمك واعرف نتيجتك فورًا." action={<StatusBadge>{quizzes.length} اختبار</StatusBadge>} />
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {quizzes.map((quiz) => (
          <article key={quiz.id} className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/20">
            <span className="rounded-md bg-blue-600/25 px-2.5 py-0.5 text-[12px] font-bold text-white border border-blue-500/30">
              {quiz.category}
            </span>
            {quiz.stage && (
              <span className="mr-2 rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
                {quiz.stage}
              </span>
            )}
            <h3 className="text-lg font-extrabold text-foreground mt-2">{quiz.title}</h3>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-[12px] font-semibold text-muted-foreground">
              <span>{quiz.questionsToShow && quiz.questionsToShow > 0 ? quiz.questionsToShow : quiz.questions.length} سؤال</span>
              <span>·</span>
              <span>النجاح من {quiz.passingScore}%</span>
              {quiz.durationMinutes && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1 font-bold text-white">
                    <Clock className="h-3.5 w-3.5 text-blue-400" /> {quiz.durationMinutes} دقيقة
                  </span>
                </>
              )}
            </div>
            <p className="text-[12px] text-muted-foreground mt-1">
              {quiz.maxAttempts ? `${Math.max(0, quiz.maxAttempts - (quiz.attemptsUsed || 0))} محاولات متبقية من أصل ${quiz.maxAttempts}` : "محاولات بلا حدود"}
            </p>
            {quiz.locked && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-700">{quiz.lockedReason}</p>}
            <Button
              onClick={() => onStartQuiz(quiz)}
              disabled={quiz.locked || (quiz.maxAttempts !== undefined && (quiz.attemptsUsed || 0) >= quiz.maxAttempts)}
              className="mt-5 w-full font-bold"
            >
              {quiz.locked ? quiz.lockedReason || "الاختبار غير متاح" : "ابدأ الاختبار"}
            </Button>
          </article>
        ))}
      </div>
      {quizzes.length === 0 && (
        <EmptyState icon={ClipboardCheck} title="لا توجد اختبارات متاحة" description="سيظهر أي اختبار جديد فور نشره لحسابك." />
      )}
    </section>
  );
}
