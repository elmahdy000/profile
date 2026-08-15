import React from "react";
import {
  Building2,
  Users,
  MapPin,
  Clock,
  TrendingUp,
  Award,
  Sparkles,
  AlertTriangle,
  CalendarDays,
} from "lucide-react";
import { type OfflineCenterItem, findScheduleConflicts } from "./CentersTab";

export interface CenterStatData {
  centerId: string;
  name: string;
  area: string;
  timeStr: string;
  daysStr: string;
  grade: string;
  color: string;
  studentCount: number;
  percentage: number;
  hasConflict?: boolean;
}

interface CenterStatsCardsProps {
  centers: OfflineCenterItem[];
  centerCounts?: Record<string, number>;
  totalOfflineCount?: number;
}

const COLOR_STYLES: Record<string, { bg: string; border: string; text: string; iconBg: string; barBg: string }> = {
  emerald: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30 hover:border-emerald-500/60",
    text: "text-emerald-400",
    iconBg: "bg-emerald-500/20 text-emerald-300",
    barBg: "bg-emerald-500",
  },
  blue: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/30 hover:border-blue-500/60",
    text: "text-blue-400",
    iconBg: "bg-blue-500/20 text-blue-300",
    barBg: "bg-blue-500",
  },
  indigo: {
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/30 hover:border-indigo-500/60",
    text: "text-indigo-400",
    iconBg: "bg-indigo-500/20 text-indigo-300",
    barBg: "bg-indigo-500",
  },
  purple: {
    bg: "bg-purple-500/10",
    border: "border-purple-500/30 hover:border-purple-500/60",
    text: "text-purple-400",
    iconBg: "bg-purple-500/20 text-purple-300",
    barBg: "bg-purple-500",
  },
  amber: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30 hover:border-amber-500/60",
    text: "text-amber-400",
    iconBg: "bg-amber-500/20 text-amber-300",
    barBg: "bg-amber-500",
  },
};

export const CenterStatsCards: React.FC<CenterStatsCardsProps> = ({
  centers,
  centerCounts = {},
  totalOfflineCount = 0,
}) => {
  const conflicts = findScheduleConflicts(centers);

  // Calculate stats per center
  const statsList: CenterStatData[] = centers.map((c) => {
    // Find matching count by checking center name substring matches
    let count = 0;
    Object.entries(centerCounts).forEach(([cNameKey, val]) => {
      if (
        cNameKey.toLowerCase().includes(c.name.toLowerCase()) ||
        c.name.toLowerCase().includes(cNameKey.toLowerCase()) ||
        cNameKey.includes(c.name.split(" ")[0])
      ) {
        count += val;
      }
    });

    const percentage = totalOfflineCount > 0 ? Math.round((count / totalOfflineCount) * 100) : 0;
    const hasConflict = conflicts.some(
      (conf) => conf.itemA.id === c.id || conf.itemB.id === c.id
    );

    return {
      centerId: c.id,
      name: c.name,
      area: c.area,
      timeStr: c.timeStr,
      daysStr: c.daysStr,
      grade: c.grade,
      color: c.color || "blue",
      studentCount: count,
      percentage,
      hasConflict,
    };
  });

  // Sort centers by student count descending
  const sortedStats = [...statsList].sort((a, b) => b.studentCount - a.studentCount);
  const topCenterId = sortedStats.length > 0 && sortedStats[0].studentCount > 0 ? sortedStats[0].centerId : null;

  return (
    <div className="space-y-4 text-right" dir="rtl">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-3">
        <div>
          <h4 className="text-base font-black text-foreground flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            إحصائيات إقبال وتوزيع الطلاب بالسناتر
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            كروت تفصيلية توضح عدد ونسبة الطلاب المسجلين بكل سنتر ومواعيد الحضور المتاحة.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto bg-primary/10 border border-primary/20 rounded-xl px-3 py-1.5">
          <Users className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs font-bold text-muted-foreground">إجمالي طلاب السناتر:</span>
          <strong className="text-sm font-black text-primary">{totalOfflineCount} طالب</strong>
        </div>
      </div>

      {/* Center Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {sortedStats.map((stat, idx) => {
          const colorTheme = COLOR_STYLES[stat.color] || COLOR_STYLES.blue;
          const isTopCenter = stat.centerId === topCenterId;

          return (
            <div
              key={stat.centerId || idx}
              className={`relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md flex flex-col justify-between space-y-4 ${
                stat.hasConflict
                  ? "border-rose-500/60 bg-rose-500/5 ring-1 ring-rose-500/30"
                  : colorTheme.border
              }`}
            >
              {/* Top Accent Glow */}
              <div className={`absolute top-0 right-0 left-0 h-1.5 ${stat.hasConflict ? "bg-rose-500" : colorTheme.barBg}`} />

              {/* Card Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-md border ${colorTheme.iconBg}`}>
                    {stat.area}
                  </span>
                  {isTopCenter && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                      <Award className="h-3 w-3 text-amber-400" /> الأغلى إقبالاً
                    </span>
                  )}
                  {stat.hasConflict && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-rose-500" /> تعارض مواعيد
                    </span>
                  )}
                </div>

                <h5 className="text-sm font-black text-foreground leading-snug line-clamp-2">
                  {stat.name}
                </h5>
              </div>

              {/* Student Count & Percentage */}
              <div className="rounded-xl border border-border/60 bg-muted/40 p-3 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-primary" /> عدد الحجوزات:
                  </span>
                  <div className="text-left">
                    <span className={`text-xl font-black ${colorTheme.text}`}>
                      {stat.studentCount}
                    </span>
                    <span className="text-xs text-muted-foreground font-semibold"> طالب</span>
                  </div>
                </div>

                {/* Percentage Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                    <span>نسبة الإقبال:</span>
                    <span className="font-mono">{stat.percentage}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${colorTheme.barBg}`}
                      style={{ width: `${Math.max(5, stat.percentage)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Time & Days Footer */}
              <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold text-muted-foreground border-t border-border/40 pt-2.5">
                <div className="flex items-center gap-1 truncate">
                  <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span className="truncate">{stat.timeStr}</span>
                </div>
                <div className="flex items-center gap-1 truncate">
                  <CalendarDays className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <span className="truncate">{stat.daysStr}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
