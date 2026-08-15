import React from "react";
import { Plus, ArrowUp, ArrowDown, Trash2 } from "lucide-react";

export interface PricingTabProps {
  pricing: any[];
  setPricing: React.Dispatch<React.SetStateAction<any[]>>;
  selPlanIdx: number | null;
  setSelPlanIdx: React.Dispatch<React.SetStateAction<number | null>>;
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

export const PricingTab: React.FC<PricingTabProps> = ({
  pricing,
  setPricing,
  selPlanIdx,
  setSelPlanIdx,
  moveItem,
  deleteItem,
  setIsSaved,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-border/30 pb-3">
        <h3 className="text-lg font-bold text-foreground">
          إعدادات أسعار المسارات (Pricing Plans)
        </h3>
        <button
          onClick={() => {
            const newPlan = {
              id: "plan_" + Date.now(),
              name: "باقة جديدة",
              subtitle: "تفاصيل الفئة المستهدفة",
              headline: "تعلم قوي بمشاريع عملية",
              desc: "",
              badge: "",
              featured: false,
              features: ["ميزة 1", "ميزة 2"],
            };
            setPricing([...pricing, newPlan]);
            setSelPlanIdx(pricing.length);
            setIsSaved(false);
          }}
          className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-bold rounded-xl px-4 py-2 text-xs flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" /> إضافة باقة جديدة
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* List */}
        <div className="md:col-span-1 space-y-2 border-l border-border/30 pl-4 max-h-[500px] overflow-y-auto">
          {pricing.map((plan, index) => (
            <div
              key={plan.id || index}
              onClick={() => setSelPlanIdx(index)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                selPlanIdx === index
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-background border-border hover:bg-muted/80 text-muted-foreground"
              }`}
            >
              <div className="truncate">
                <span className="text-sm font-bold block truncate">
                  {plan.name || "بدون عنوان"}
                </span>
                <span className="text-[10px] text-muted-foreground truncate block">
                  {plan.subtitle}
                </span>
              </div>

              <div
                className="flex items-center gap-1 flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() =>
                    moveItem(pricing, setPricing, index, "up", setSelPlanIdx)
                  }
                  className="p-1 hover:text-foreground transition-colors"
                  disabled={index === 0}
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() =>
                    moveItem(pricing, setPricing, index, "down", setSelPlanIdx)
                  }
                  className="p-1 hover:text-foreground transition-colors"
                  disabled={index === pricing.length - 1}
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() =>
                    deleteItem(pricing, setPricing, index, setSelPlanIdx)
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
          {selPlanIdx !== null && pricing[selPlanIdx] ? (
            <div className="space-y-4 bg-background p-5 rounded-2xl border border-border">
              <h4 className="font-bold text-foreground border-b border-border/20 pb-2">
                تعديل تفاصيل الباقة
              </h4>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    اسم الباقة
                  </label>
                  <input
                    type="text"
                    value={pricing[selPlanIdx].name || ""}
                    onChange={(e) => {
                      const copy = [...pricing];
                      copy[selPlanIdx].name = e.target.value;
                      setPricing(copy);
                      setIsSaved(false);
                    }}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 font-sans">
                    معرف الباقة (ID فريد بالإنجليزية)
                  </label>
                  <input
                    type="text"
                    value={pricing[selPlanIdx].id || ""}
                    onChange={(e) => {
                      const copy = [...pricing];
                      copy[selPlanIdx].id = e.target.value.replace(
                        /[^a-zA-Z0-9_-]/g,
                        "",
                      );
                      setPricing(copy);
                      setIsSaved(false);
                    }}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-sans"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    العنوان الفرعي (Subtitle)
                  </label>
                  <input
                    type="text"
                    value={pricing[selPlanIdx].subtitle || ""}
                    onChange={(e) => {
                      const copy = [...pricing];
                      copy[selPlanIdx].subtitle = e.target.value;
                      setPricing(copy);
                      setIsSaved(false);
                    }}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    السطر الترويجي (Headline)
                  </label>
                  <input
                    type="text"
                    value={pricing[selPlanIdx].headline || ""}
                    onChange={(e) => {
                      const copy = [...pricing];
                      copy[selPlanIdx].headline = e.target.value;
                      setPricing(copy);
                      setIsSaved(false);
                    }}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    شارة مميزة (Badge)
                  </label>
                  <input
                    type="text"
                    value={pricing[selPlanIdx].badge || ""}
                    onChange={(e) => {
                      const copy = [...pricing];
                      copy[selPlanIdx].badge = e.target.value;
                      setPricing(copy);
                      setIsSaved(false);
                    }}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    placeholder="مثال: الأكثر طلباً"
                  />
                </div>
                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="planFeatured"
                    checked={!!pricing[selPlanIdx].featured}
                    onChange={(e) => {
                      const copy = [...pricing];
                      copy[selPlanIdx].featured = e.target.checked;
                      setPricing(copy);
                      setIsSaved(false);
                    }}
                    className="w-4 h-4 rounded text-primary focus:ring-primary bg-background border-border"
                  />
                  <label
                    htmlFor="planFeatured"
                    className="text-xs font-semibold text-foreground cursor-pointer select-none"
                  >
                    تمييز هذه الباقة (Featured)
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  وصف إضافي (اختياري)
                </label>
                <input
                  type="text"
                  value={pricing[selPlanIdx].desc || ""}
                  onChange={(e) => {
                    const copy = [...pricing];
                    copy[selPlanIdx].desc = e.target.value;
                    setPricing(copy);
                    setIsSaved(false);
                  }}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  المميزات (اكتب كل ميزة في سطر منفصل)
                </label>
                <textarea
                  value={
                    pricing[selPlanIdx].features
                      ? pricing[selPlanIdx].features.join("\n")
                      : ""
                  }
                  onChange={(e) => {
                    const copy = [...pricing];
                    copy[selPlanIdx].features = e.target.value
                      .split("\n")
                      .filter((line) => line.trim() !== "");
                    setPricing(copy);
                    setIsSaved(false);
                  }}
                  rows={5}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-sans"
                  placeholder="مميزات الكورس..."
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-center p-8 border border-dashed border-border rounded-2xl bg-background">
              <p className="text-muted-foreground text-sm">
                اختر باقة أسعار من القائمة لتعديلها أو أضف باقة جديدة.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
