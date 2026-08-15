import React from "react";
import { Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Attempt {
  id: number;
  studentName: string;
  quizTitle: string;
  score: number;
  passed: boolean;
  createdAt: string;
}

export interface ResultsTabProps {
  attempts: Attempt[];
  resultSearch: string;
  setResultSearch: (val: string) => void;
  exportResults: () => void;
}

const Empty = ({ text }: { text: string }) => (
  <div className="py-8 text-center text-sm font-semibold text-muted-foreground">
    {text}
  </div>
);

export const ResultsTab: React.FC<ResultsTabProps> = ({
  attempts,
  resultSearch,
  setResultSearch,
  exportResults,
}) => {
  const filteredAttempts = attempts.filter(
    (attempt) =>
      !resultSearch ||
      attempt.studentName.toLowerCase().includes(resultSearch.toLowerCase()) ||
      attempt.quizTitle.toLowerCase().includes(resultSearch.toLowerCase()),
  );

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative w-full sm:max-w-sm">
          <Search className="absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
          <input
            value={resultSearch}
            onChange={(event) => setResultSearch(event.target.value)}
            placeholder="ابحث باسم الطالب أو الاختبار..."
            className="input-admin pr-9"
          />
        </label>
        <Button
          type="button"
          variant="outline"
          disabled={!filteredAttempts.length}
          onClick={exportResults}
        >
          <Download className="h-4 w-4" /> تصدير CSV
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="p-4 text-right">الطالب</th>
              <th className="p-4 text-right">الاختبار</th>
              <th className="p-4">النتيجة</th>
              <th className="p-4">الحالة</th>
              <th className="p-4">التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {filteredAttempts.map((a) => (
              <tr key={a.id} className="border-t hover:bg-muted/70">
                <td className="p-4 font-bold">{a.studentName}</td>
                <td className="p-4">{a.quizTitle}</td>
                <td className="p-4 text-center font-black">{a.score}%</td>
                <td className="p-4 text-center">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      a.passed ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                    }`}
                  >
                    {a.passed ? "ناجح" : "لم ينجح"}
                  </span>
                </td>
                <td className="p-4 text-center text-muted-foreground">
                  {new Date(a.createdAt).toLocaleDateString("ar-EG")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filteredAttempts.length && (
          <div className="p-10">
            <Empty
              text={
                attempts.length
                  ? "لا توجد نتائج مطابقة للبحث"
                  : "لا توجد نتائج اختبارات بعد"
              }
            />
          </div>
        )}
      </div>
    </div>
  );
};
