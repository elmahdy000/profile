import React from "react";
import { Plus, ArrowUp, ArrowDown, Trash2, Loader2, UploadCloud } from "lucide-react";

export interface ServicesTabProps {
  services: any[];
  setServices: React.Dispatch<React.SetStateAction<any[]>>;
  selServiceIdx: number | null;
  setSelServiceIdx: React.Dispatch<React.SetStateAction<number | null>>;
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

export const ServicesTab: React.FC<ServicesTabProps> = ({
  services,
  setServices,
  selServiceIdx,
  setSelServiceIdx,
  moveItem,
  deleteItem,
  handleFileUpload,
  isUploading,
  setIsSaved,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-border/30 pb-3">
        <h3 className="text-lg font-bold text-foreground font-outfit">
          البرامج والخدمات التعليمية
        </h3>
        <button
          onClick={() => {
            const newService = {
              title: "برنامج جديد",
              description: "تفاصيل ووصف الكورس الجديد هنا...",
              img: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&q=70",
              icon: "MonitorPlay",
            };
            setServices([...services, newService]);
            setSelServiceIdx(services.length);
            setIsSaved(false);
          }}
          className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-bold rounded-xl px-4 py-2 text-xs flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" /> إضافة برنامج جديد
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* List */}
        <div className="md:col-span-1 space-y-2 border-l border-border/30 pl-4 max-h-[500px] overflow-y-auto">
          {services.map((service, index) => (
            <div
              key={index}
              onClick={() => setSelServiceIdx(index)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                selServiceIdx === index
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-background border-border hover:bg-muted/80 text-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                {service.img && (
                  <img
                    src={service.img}
                    className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                    alt=""
                  />
                )}
                <span className="text-sm font-bold truncate">
                  {service.title || "بدون عنوان"}
                </span>
              </div>

              <div
                className="flex items-center gap-1 flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() =>
                    moveItem(services, setServices, index, "up", setSelServiceIdx)
                  }
                  className="p-1 hover:text-foreground transition-colors"
                  disabled={index === 0}
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() =>
                    moveItem(
                      services,
                      setServices,
                      index,
                      "down",
                      setSelServiceIdx,
                    )
                  }
                  className="p-1 hover:text-foreground transition-colors"
                  disabled={index === services.length - 1}
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() =>
                    deleteItem(services, setServices, index, setSelServiceIdx)
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
          {selServiceIdx !== null && services[selServiceIdx] ? (
            <div className="space-y-4 bg-background p-5 rounded-2xl border border-border">
              <h4 className="font-bold text-foreground border-b border-border/20 pb-2">
                تعديل تفاصيل البرنامج
              </h4>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    عنوان البرنامج
                  </label>
                  <input
                    type="text"
                    value={services[selServiceIdx].title || ""}
                    onChange={(e) => {
                      const copy = [...services];
                      copy[selServiceIdx].title = e.target.value;
                      setServices(copy);
                      setIsSaved(false);
                    }}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    الأيقونة (Lucide Icon)
                  </label>
                  <select
                    value={services[selServiceIdx].icon || "MonitorPlay"}
                    onChange={(e) => {
                      const copy = [...services];
                      copy[selServiceIdx].icon = e.target.value;
                      setServices(copy);
                      setIsSaved(false);
                    }}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-sans"
                  >
                    <option value="MonitorPlay">MonitorPlay (شاشة ألعاب)</option>
                    <option value="Terminal">Terminal (شاشة كود)</option>
                    <option value="Lightbulb">Lightbulb (لمبة إبداع)</option>
                    <option value="FileText">FileText (ملفات ونصوص)</option>
                    <option value="GraduationCap">GraduationCap (قبعة تخرج)</option>
                    <option value="Code2">Code2 (رمز كود)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  صورة البرنامج (رابط أو رفع)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={services[selServiceIdx].img || ""}
                    onChange={(e) => {
                      const copy = [...services];
                      copy[selServiceIdx].img = e.target.value;
                      setServices(copy);
                      setIsSaved(false);
                    }}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    dir="ltr"
                  />
                  <div className="relative flex-shrink-0">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        handleFileUpload(e, "", (url) => {
                          const copy = [...services];
                          copy[selServiceIdx].img = url;
                          setServices(copy);
                          setIsSaved(false);
                        });
                      }}
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

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  الوصف / التفاصيل
                </label>
                <textarea
                  value={services[selServiceIdx].description || ""}
                  onChange={(e) => {
                    const copy = [...services];
                    copy[selServiceIdx].description = e.target.value;
                    setServices(copy);
                    setIsSaved(false);
                  }}
                  rows={4}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-center p-8 border border-dashed border-border rounded-2xl bg-background">
              <p className="text-muted-foreground text-sm">
                اختر برنامجاً من القائمة الجانبية لتعديله أو أضف برنامجاً جديداً.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
