import React from "react";
import { Sparkles, BookOpen } from "lucide-react";
import { checkIsAssessmentQuestion, type AssessmentBadgeData } from "./assessmentQuestionsData";

interface AssessmentQuestionBadgeProps {
  question: any;
  className?: string;
}

export const AssessmentQuestionBadge: React.FC<AssessmentQuestionBadgeProps> = ({ question, className = "" }) => {
  const badgeInfo: AssessmentBadgeData | null = checkIsAssessmentQuestion(question);
  if (!badgeInfo) return null;

  const isDirect = badgeInfo.isDirect;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[10.5px] font-bold transition-colors select-none shrink-0 ${
        isDirect
          ? "bg-amber-50/90 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300/70 dark:border-amber-700/60"
          : "bg-sky-50/90 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60"
      } ${className}`}
      title={isDirect ? "سؤال رسمي من نماذج تقييمات وزارة التربية والتعليم" : "فكرة معتمدة متطابقة مع تقييمات الوزارة"}
    >
      {isDirect ? (
        <Sparkles className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
      ) : (
        <BookOpen className="h-3 w-3 text-sky-600 dark:text-sky-400 shrink-0" />
      )}
      <span className="leading-tight">{badgeInfo.label}</span>
    </span>
  );
};
