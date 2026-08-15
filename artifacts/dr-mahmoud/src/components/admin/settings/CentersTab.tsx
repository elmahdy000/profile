import React, { useState } from "react";
import { SETTINGS_KEYS } from "@/hooks/useSiteSettings";
import { MapPin, Clock, Plus, Trash2, Edit2, Check, ArrowUp, ArrowDown, Save, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface OfflineCenterItem {
  id: string;
  name: string;
  area: string;
  grade: string;
  timeStr: string;
  daysStr: string;
  color: string;
}

export function normalizeDays(daysStr: string): string[] {
  const clean = daysStr.trim().toLowerCase();
  const days: string[] = [];
  if (clean.includes("سبت")) days.push("سبت");
  if (clean.includes("أحد") || clean.includes("حد")) days.push("أحد");
  if (clean.includes("اتنين") || clean.includes("إثنين") || clean.includes("اثنين")) days.push("اثنين");
  if (clean.includes("تلات") || clean.includes("ثلاثاء")) days.push("ثلاثاء");
  if (clean.includes("أربع") || clean.includes("اربع") || clean.includes("أربعاء")) days.push("أربعاء");
  if (clean.includes("خميس")) days.push("خميس");
  if (clean.includes("جمعة")) days.push("جمعة");
  return days;
}

export function normalizeTime(timeStr: string): string {
  return timeStr
    .trim()
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString())
    .replace(/\s+/g, "")
    .toLowerCase();
}

export function findScheduleConflicts(centers: OfflineCenterItem[]): { itemA: OfflineCenterItem; itemB: OfflineCenterItem; commonDays: string[]; time: string }[] {
  const conflicts: { itemA: OfflineCenterItem; itemB: OfflineCenterItem; commonDays: string[]; time: string }[] = [];

  for (let i = 0; i < centers.length; i++) {
    for (let j = i + 1; j < centers.length; j++) {
      const a = centers[i];
      const b = centers[j];
      const daysA = normalizeDays(a.daysStr);
      const daysB = normalizeDays(b.daysStr);
      const commonDays = daysA.filter((day) => daysB.includes(day));

      if (commonDays.length > 0) {
        const timeA = normalizeTime(a.timeStr);
        const timeB = normalizeTime(b.timeStr);
        if (timeA && timeB && timeA === timeB) {
          conflicts.push({ itemA: a, itemB: b, commonDays, time: a.timeStr });
        }
      }
    }
  }

  return conflicts;
}

export const defaultOfflineCenters: OfflineCenterItem[] = [
  {
    id: "rafal-academy-3pm",
    name: "سنتر رافال أكاديمي (Rafal Academy)",
    area: "بجوار الثانوية العسكرية",
    grade: "تانية ثانوي",
    timeStr: "3:00 عصراً",
    daysStr: "حسب جدول المجموعات بالسنتر",
    color: "emerald",
  },
  {
    id: "zag-academy",
    name: "سنتر زاج أكاديمي (Zag Academy)",
    area: "منطقة الفلل",
    grade: "تانية ثانوي",
    timeStr: "5:00 مساءً",
    daysStr: "سبت - اتنين - أربع",
    color: "blue",
  },
  {
    id: "eduverse-2nd",
    name: "سنتر إديوفيرس (EduVerse)",
    area: "منطقة الفلل",
    grade: "تانية ثانوي",
    timeStr: "3:30 عصراً",
    daysStr: "سبت - اتنين - أربع",
    color: "indigo",
  },
  {
    id: "hassan-somida-2nd",
    name: "سنتر حسن صميدة",
    area: "منطقة الحناوي",
    grade: "تانية ثانوي",
    timeStr: "6:30 مساءً",
    daysStr: "حد - تلات - خميس",
    color: "purple",
  },
];

interface CentersTabProps {
  centers: OfflineCenterItem[];
  setCenters: React.Dispatch<React.SetStateAction<OfflineCenterItem[]>>;
  onSave: () => void;
}

export const CentersTab: React.FC<CentersTabProps> = ({
  centers,
  setCenters,
  onSave,
}) => {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<OfflineCenterItem>({
    id: "",
    name: "",
    area: "",
    grade: "",
    timeStr: "",
    daysStr: "",
    color: "blue",
  });

  const handleStartEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditForm({ ...centers[idx] });
  };

  const handleSaveItem = () => {
    if (editingIdx === null) return;
    const updated = [...centers];
    updated[editingIdx] = { ...editForm };
    setCenters(updated);
    setEditingIdx(null);
  };

  const handleAddNew = () => {
    const newItem: OfflineCenterItem = {
      id: "center-" + Date.now(),
      name: "سنتر جديد",
      area: "منطقة الفلل",
      grade: "الكل",
      timeStr: "5:00 مساءً",
      daysStr: "سبت - اتنين - أربع",
      color: "blue",
    };
    const updated = [...centers, newItem];
    setCenters(updated);
    setEditingIdx(updated.length - 1);
    setEditForm(newItem);
  };

  const handleDelete = (idx: number) => {
    const updated = centers.filter((_, i) => i !== idx);
    setCenters(updated);
    if (editingIdx === idx) setEditingIdx(null);
  };

  const handleMove = (idx: number, dir: "up" | "down") => {
    const targetIdx = dir === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= centers.length) return;
    const updated = [...centers];
    [updated[idx], updated[targetIdx]] = [updated[targetIdx], updated[idx]];
    setCenters(updated);
  };

  const conflicts = findScheduleConflicts(centers);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            إدارة مواعيد وسناتر الحضور (الزقازيق)
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            إضافة وتعديل وحذف وأوقات الحضور بالسناتر المتاحة. تظهر التعديلات فوراً في الموقع واستمارة التسجيل.
          </p>
        </div>
        <Button
          type="button"
          onClick={handleAddNew}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl px-4 py-2 flex items-center gap-1.5 shrink-0"
        >
          <Plus className="h-4 w-4" /> إضافة سنتر جديد
        </Button>
      </div>

      {conflicts.length > 0 && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 space-y-2 text-rose-300">
          <div className="flex items-center gap-2 font-black text-sm text-rose-400">
            <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 animate-pulse" />
            تنبيه وجود تعارض في مواعيد السناتر!
          </div>
          <div className="space-y-1 text-xs font-bold leading-relaxed">
            {conflicts.map((conf, cIdx) => (
              <p key={cIdx}>
                • تعارض بين <strong>{conf.itemA.name}</strong> و <strong>{conf.itemB.name}</strong> في يوم ({conf.commonDays.join("، ")}) الساعة <strong>{conf.time}</strong>!
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {centers.map((c, idx) => {
          const isEditing = editingIdx === idx;
          const hasConflict = conflicts.some(
            (conf) => conf.itemA.id === c.id || conf.itemB.id === c.id
          );
          return (
            <div
              key={c.id || idx}
              className={`rounded-2xl border bg-card p-4 shadow-sm transition-all relative space-y-3 ${
                hasConflict
                  ? "border-rose-500/60 bg-rose-500/5 ring-2 ring-rose-500/20"
                  : isEditing
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border hover:border-primary/40"
              }`}
            >
              {isEditing ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="text-xs font-bold text-primary">تعديل معلومات السنتر #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => setEditingIdx(null)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      إلغاء
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] font-bold text-muted-foreground mb-1">اسم السنتر</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs font-bold text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground mb-1">المنطقة / المكان</label>
                        <input
                          type="text"
                          value={editForm.area}
                          onChange={(e) => setEditForm({ ...editForm, area: e.target.value })}
                          className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground mb-1">المرحلة / الملاحظة</label>
                        <input
                          type="text"
                          value={editForm.grade}
                          onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })}
                          className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground mb-1">الأيام المحددة</label>
                        <input
                          type="text"
                          value={editForm.daysStr}
                          onChange={(e) => setEditForm({ ...editForm, daysStr: e.target.value })}
                          placeholder="مثال: سبت - اتنين - أربع"
                          className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground mb-1">وقت وتوقيت الحصة</label>
                        <input
                          type="text"
                          value={editForm.timeStr}
                          onChange={(e) => setEditForm({ ...editForm, timeStr: e.target.value })}
                          placeholder="مثال: 5:00 مساءً"
                          className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={handleSaveItem}
                      className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl mt-2 flex items-center justify-center gap-1.5"
                    >
                      <Check className="h-4 w-4" /> حفظ تعديل هذا السنتر
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                          {c.area}
                        </span>
                        {c.grade && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                            {c.grade}
                          </span>
                        )}
                        {hasConflict && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-rose-500 shrink-0" />
                            تعارض في المواعيد!
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-black text-foreground">{c.name}</h4>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMove(idx, "up")}
                        disabled={idx === 0}
                        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(idx, "down")}
                        disabled={idx === centers.length - 1}
                        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(idx)}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(idx)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-border/60 pt-2.5 text-xs text-muted-foreground space-y-1 font-semibold">
                    <div className="flex items-center gap-1.5 text-foreground">
                      <span>• الأيام:</span> <strong className="text-primary">{c.daysStr}</strong>
                    </div>
                    <div className="flex items-center gap-1.5 text-foreground">
                      <span>• الوقت:</span> <strong>{c.timeStr}</strong>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-4 border-t border-border flex justify-end">
        <Button
          type="button"
          onClick={onSave}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm px-6 h-11 rounded-xl flex items-center gap-2 shadow-md"
        >
          <Save className="h-4 w-4" /> حفظ كافة تعديلات السناتر والمواعيد
        </Button>
      </div>
    </div>
  );
};
