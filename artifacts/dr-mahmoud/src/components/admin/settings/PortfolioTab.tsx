import React from "react";
import { Plus, ArrowUp, ArrowDown, Trash2, Loader2, UploadCloud } from "lucide-react";

export interface PortfolioTabProps {
  portfolio: any[];
  setPortfolio: React.Dispatch<React.SetStateAction<any[]>>;
  selPortfolioIdx: number | null;
  setSelPortfolioIdx: React.Dispatch<React.SetStateAction<number | null>>;
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
  handleFileUpload: (
    e: React.ChangeEvent<HTMLInputElement>,
    key: string,
    callback?: (url: string) => void,
  ) => void;
  isUploading: boolean;
  setIsSaved: (val: boolean) => void;
}

export const PortfolioTab: React.FC<PortfolioTabProps> = ({
  portfolio,
  setPortfolio,
  selPortfolioIdx,
  setSelPortfolioIdx,
  moveItem,
  deleteItem,
  handleFileUpload,
  isUploading,
  setIsSaved,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-border/30 pb-3">
        <h3 className="text-lg font-bold text-foreground">
          إعدادات معرض الأعمال (Portfolio)
        </h3>
        <button
          onClick={() => {
            const newItem = {
              category: "Programming",
              title: "مشروع جديد للطلاب",
              img: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&q=70",
            };
            setPortfolio([...portfolio, newItem]);
            setSelPortfolioIdx(portfolio.length);
            setIsSaved(false);
          }}
          className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-bold rounded-xl px-4 py-2 text-xs flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" /> إضافة عمل جديد
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* List */}
        <div className="md:col-span-1 space-y-2 border-l border-border/30 pl-4 max-h-[500px] overflow-y-auto">
          {portfolio.map((item, index) => (
            <div
              key={index}
              onClick={() => setSelPortfolioIdx(index)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                selPortfolioIdx === index
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-background border-border hover:bg-muted/80 text-muted-foreground"
              }`}
            >
              <div className="truncate flex items-center gap-2">
                {item.img && (
                  <img
                    src={item.img}
                    alt=""
                    className="w-8 h-8 rounded object-cover flex-shrink-0"
                  />
                )}
                <div className="truncate text-right">
                  <span className="text-sm font-bold block truncate">
                    {item.title || "بدون عنوان"}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate block">
                    {item.category}
                  </span>
                </div>
              </div>

              <div
                className="flex items-center gap-1 flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() =>
                    moveItem(
                      portfolio,
                      setPortfolio,
                      index,
                      "up",
                      setSelPortfolioIdx,
                    )
                  }
                  className="p-1 hover:text-foreground transition-colors"
                  disabled={index === 0}
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() =>
                    moveItem(
                      portfolio,
                      setPortfolio,
                      index,
                      "down",
                      setSelPortfolioIdx,
                    )
                  }
                  className="p-1 hover:text-foreground transition-colors"
                  disabled={index === portfolio.length - 1}
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() =>
                    deleteItem(
                      portfolio,
                      setPortfolio,
                      index,
                      setSelPortfolioIdx,
                    )
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
          {selPortfolioIdx !== null && portfolio[selPortfolioIdx] ? (
            <div className="space-y-4 bg-background p-5 rounded-2xl border border-border">
              <h4 className="font-bold text-foreground border-b border-border/20 pb-2">
                تعديل تفاصيل العمل
              </h4>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  عنوان العمل (Title)
                </label>
                <input
                  type="text"
                  value={portfolio[selPortfolioIdx].title || ""}
                  onChange={(e) => {
                    const copy = [...portfolio];
                    copy[selPortfolioIdx].title = e.target.value;
                    setPortfolio(copy);
                    setIsSaved(false);
                  }}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  القسم / الفئة (Category)
                </label>
                <select
                  value={portfolio[selPortfolioIdx].category || "Programming"}
                  onChange={(e) => {
                    const copy = [...portfolio];
                    copy[selPortfolioIdx].category = e.target.value;
                    setPortfolio(copy);
                    setIsSaved(false);
                  }}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-sans"
                >
                  <option value="Kids">الأطفال (Kids)</option>
                  <option value="Programming">برمجة (Programming)</option>
                  <option value="AI">ذكاء اصطناعي (AI)</option>
                  <option value="Educational">تعليمي (Educational)</option>
                  <option value="Web">ويب (Web)</option>
                  <option value="Academic">أكاديمي (Academic)</option>
                  <option value="Media">ميديا (Media)</option>
                  <option value="Branding">براندنج (Branding)</option>
                  <option value="Showcase">مشاريع الطلاب (Showcase)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  صورة العمل (Image URL)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={portfolio[selPortfolioIdx].img || ""}
                    onChange={(e) => {
                      const copy = [...portfolio];
                      copy[selPortfolioIdx].img = e.target.value;
                      setPortfolio(copy);
                      setIsSaved(false);
                    }}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    dir="ltr"
                  />
                  <div className="relative flex-shrink-0">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        handleFileUpload(e, "", (url) => {
                          const copy = [...portfolio];
                          copy[selPortfolioIdx].img = url;
                          setPortfolio(copy);
                          setIsSaved(false);
                        })
                      }
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isUploading}
                    />
                    <button
                      type="button"
                      className="h-full px-4 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded-xl flex items-center gap-2 transition-colors font-bold text-xs"
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UploadCloud className="w-4 h-4" />
                      )}
                      <span>رفع صورة</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-center p-8 border border-dashed border-border rounded-2xl bg-background">
              <p className="text-muted-foreground text-sm">
                اختر عملاً من القائمة لتعديله أو أضف عملاً جديداً.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
