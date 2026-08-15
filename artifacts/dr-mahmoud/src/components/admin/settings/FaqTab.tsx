import React from "react";
import { Plus, ArrowUp, ArrowDown, Trash2 } from "lucide-react";

export interface FaqTabProps {
  faq: any[];
  setFaq: React.Dispatch<React.SetStateAction<any[]>>;
  selFaqIdx: number | null;
  setSelFaqIdx: React.Dispatch<React.SetStateAction<number | null>>;
  moveItem: (
    list: any[],
    setList: React.Dispatch<React.SetStateAction<any[]>>,
    idx: number,
    dir: "up" | "down",
    setIdx?: React.Dispatch<React.SetStateAction<number | null>>,
  ) => void;
  deleteItem: (
    list: any[],
    setList: React.Dispatch<React.SetStateAction<any[]>>,
    idx: number,
    setIdx?: React.Dispatch<React.SetStateAction<number | null>>,
  ) => void;
  setIsSaved: (val: boolean) => void;
}

export const FaqTab: React.FC<FaqTabProps> = ({
  faq,
  setFaq,
  selFaqIdx,
  setSelFaqIdx,
  moveItem,
  deleteItem,
  setIsSaved,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-border/30 pb-3">
        <h3 className="text-lg font-bold text-foreground">
          إعدادات الأسئلة الشائعة (FAQ)
        </h3>
        <button
          onClick={() => {
            const newFaq = {
              q: "سؤال جديد؟",
              a: "الإجابة هنا...",
            };
            setFaq([...faq, newFaq]);
            setSelFaqIdx(faq.length);
            setIsSaved(false);
          }}
          className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-bold rounded-xl px-4 py-2 text-xs flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" /> إضافة سؤال جديد
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* List */}
        <div className="md:col-span-1 space-y-2 border-l border-border/30 pl-4 max-h-[500px] overflow-y-auto">
          {faq.map((item, index) => (
            <div
              key={index}
              onClick={() => setSelFaqIdx(index)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                selFaqIdx === index
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-background border-border hover:bg-muted/80 text-muted-foreground"
              }`}
            >
              <span className="text-sm font-bold truncate block">
                {item.q || "بدون سؤال"}
              </span>

              <div
                className="flex items-center gap-1 flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() =>
                    moveItem(faq, setFaq, index, "up", setSelFaqIdx)
                  }
                  className="p-1 hover:text-foreground transition-colors"
                  disabled={index === 0}
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() =>
                    moveItem(faq, setFaq, index, "down", setSelFaqIdx)
                  }
                  className="p-1 hover:text-foreground transition-colors"
                  disabled={index === faq.length - 1}
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() =>
                    deleteItem(faq, setFaq, index, setSelFaqIdx)
                  }
                  className="p-1 text-red-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Edit Detail */}
        <div className="md:col-span-2">
          {selFaqIdx !== null && faq[selFaqIdx] ? (
            <div className="space-y-4 bg-background p-5 rounded-2xl border border-border">
              <h4 className="font-bold text-foreground border-b border-border/20 pb-2">
                تعديل تفاصيل السؤال
              </h4>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  السؤال
                </label>
                <input
                  type="text"
                  value={faq[selFaqIdx].q || ""}
                  onChange={(e) => {
                    const copy = [...faq];
                    copy[selFaqIdx].q = e.target.value;
                    setFaq(copy);
                    setIsSaved(false);
                  }}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  الإجابة
                </label>
                <textarea
                  value={faq[selFaqIdx].a || ""}
                  onChange={(e) => {
                    const copy = [...faq];
                    copy[selFaqIdx].a = e.target.value;
                    setFaq(copy);
                    setIsSaved(false);
                  }}
                  rows={5}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-center p-8 border border-dashed border-border rounded-2xl bg-background">
              <p className="text-muted-foreground text-sm">
                اختر سؤالاً من القائمة لتعديله أو أضف سؤالاً جديداً.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
