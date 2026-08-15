import React from "react";
import type { Booking } from "@workspace/api-client-react";
import {
  Calendar,
  Clock,
  CheckCircle2,
  GraduationCap,
  Download,
  Phone,
  MessageCircle,
  Check,
  Trash2,
} from "lucide-react";

export type BookingFilterType = "pending" | "confirmed" | "completed" | "all";

interface BookingsTabProps {
  bookingsQuery: {
    data?: Booking[];
    isLoading: boolean;
  };
  bookingFilter: BookingFilterType;
  setBookingFilter: (filter: BookingFilterType) => void;
  handleExportCSV: () => void;
  handleBookingStatusUpdate: (id: number, status: string) => void;
  handleBookingDelete: (id: number) => void;
}

export const BookingsTab: React.FC<BookingsTabProps> = ({
  bookingsQuery,
  bookingFilter,
  setBookingFilter,
  handleExportCSV,
  handleBookingStatusUpdate,
  handleBookingDelete,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">إدارة الحجوزات</h2>
          <p className="text-xs text-muted-foreground mt-1">
            تلقي ومتابعة طلبات التسجيل للطلاب
          </p>
        </div>
        {bookingsQuery.data && bookingsQuery.data.length > 0 && (
          <button
            onClick={handleExportCSV}
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold rounded-xl px-4 py-2.5 text-xs transition-all flex items-center gap-2 self-start sm:self-auto shrink-0 shadow-lg shadow-secondary/10 hover:shadow-secondary/20"
          >
            <Download className="w-4 h-4" />
            تصدير الحجوزات (CSV)
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between bg-card p-3 rounded-2xl border border-border">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setBookingFilter("pending")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              bookingFilter === "pending"
                ? "bg-amber-500 text-white shadow-xs"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            حجوزات قيد الانتظار ({bookingsQuery.data?.filter((b) => b.status === "pending").length || 0})
          </button>

          <button
            type="button"
            onClick={() => setBookingFilter("confirmed")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              bookingFilter === "confirmed"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            حجوزات مسجلة ومؤكدة ({bookingsQuery.data?.filter((b) => b.status === "confirmed").length || 0})
          </button>

          <button
            type="button"
            onClick={() => setBookingFilter("completed")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              bookingFilter === "completed"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            مكتملة ({bookingsQuery.data?.filter((b) => b.status === "completed").length || 0})
          </button>

          <button
            type="button"
            onClick={() => setBookingFilter("all")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              bookingFilter === "all"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            عرض الكل ({bookingsQuery.data?.length || 0})
          </button>
        </div>
      </div>

      {!bookingsQuery.isLoading &&
        bookingsQuery.data &&
        bookingsQuery.data.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div
              onClick={() => setBookingFilter("all")}
              className={`cursor-pointer transition-all bg-gradient-to-br from-card to-card/60 border rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden ${
                bookingFilter === "all" ? "border-primary ring-2 ring-primary/20" : "border-border/70"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">إجمالي الحجوزات</span>
                <span className="p-1.5 rounded-lg bg-primary/10 text-primary"><Calendar className="w-4 h-4" /></span>
              </div>
              <span className="text-3xl font-extrabold text-foreground mt-3">
                {bookingsQuery.data.length}
              </span>
            </div>
            <div
              onClick={() => setBookingFilter("pending")}
              className={`cursor-pointer transition-all bg-gradient-to-br from-amber-500/5 to-card border rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden ${
                bookingFilter === "pending" ? "border-amber-500 ring-2 ring-amber-500/20" : "border-amber-500/20"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-500">قيد الانتظار (جديد)</span>
                <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500"><Clock className="w-4 h-4" /></span>
              </div>
              <span className="text-3xl font-extrabold text-amber-500 mt-3">
                {bookingsQuery.data.filter((b) => b.status === "pending").length}
              </span>
            </div>
            <div
              onClick={() => setBookingFilter("confirmed")}
              className={`cursor-pointer transition-all bg-gradient-to-br from-emerald-500/5 to-card border rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden ${
                bookingFilter === "confirmed" ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-emerald-500/20"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-500">حجوزات مسجلة ومؤكدة</span>
                <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500"><CheckCircle2 className="w-4 h-4" /></span>
              </div>
              <span className="text-3xl font-extrabold text-emerald-500 mt-3">
                {bookingsQuery.data.filter((b) => b.status === "confirmed").length}
              </span>
            </div>
            <div
              onClick={() => setBookingFilter("completed")}
              className={`cursor-pointer transition-all bg-gradient-to-br from-blue-500/5 to-card border rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden ${
                bookingFilter === "completed" ? "border-blue-500 ring-2 ring-blue-500/20" : "border-blue-500/20"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-400">حجوزات مكتملة</span>
                <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400"><GraduationCap className="w-4 h-4" /></span>
              </div>
              <span className="text-3xl font-extrabold text-blue-400 mt-3">
                {bookingsQuery.data.filter((b) => b.status === "completed").length}
              </span>
            </div>
          </div>
        )}

      {bookingsQuery.isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card border border-border shadow-lg rounded-2xl p-6 animate-pulse"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex-1 space-y-3 w-full">
                  <div className="flex items-center gap-3">
                    <div className="h-6 bg-muted rounded-full w-32" />
                    <div className="h-5 bg-muted rounded-full w-16" />
                  </div>
                  <div className="h-4 bg-muted rounded-lg w-40" />
                  <div className="h-10 bg-muted rounded-xl w-full" />
                  <div className="h-3 bg-muted rounded w-36" />
                </div>
                <div className="flex items-center gap-2 self-end md:self-auto">
                  <div className="h-9 bg-muted rounded-xl w-9" />
                  <div className="h-9 bg-muted rounded-xl w-9" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : bookingsQuery.data?.filter((b) => bookingFilter === "all" || b.status === bookingFilter).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-gradient-to-b from-card/40 to-card/10 border border-border/80 rounded-3xl text-center px-4 shadow-inner">
          <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mb-4 border border-primary/20 shadow-lg shadow-primary/5">
            <Calendar className="w-8 h-8 text-primary" />
          </div>
          <p className="text-foreground font-extrabold text-lg">
            لا توجد حجوزات في هذا التبويب
          </p>
          <p className="text-muted-foreground text-xs mt-1.5 max-w-sm leading-relaxed">
            عند تسجيل الطلاب بالمنصة ينتقل الحجز تلقائياً من شاشة الانتظار إلى شاشة الحجوزات المؤكدة
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5" dir="rtl">
          {bookingsQuery.data
            ?.filter((b) => bookingFilter === "all" || b.status === bookingFilter)
            .slice()
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((booking) => {
              const cleanPhone = booking.phone.replace(/[^\d+]/g, "");
              const formattedPhone = cleanPhone.startsWith("0") ? `2${cleanPhone}` : cleanPhone;
              const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(`مرحباً ${booking.name} 👋، تواصل من منصة د. محمود المهدي بشأن طلب الحجز الخاص بك.`)}`;

              const d = new Date(booking.createdAt);
              const dateStr = d.toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
              const timeStr = d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", hour12: true });

              return (
                <div
                  key={booking.id}
                  className={`bg-card border transition-all duration-200 rounded-xl p-3.5 shadow-sm hover:shadow-md flex flex-col justify-between gap-3 text-right ${
                    booking.status === "pending"
                      ? "border-amber-500/40 bg-gradient-to-br from-amber-500/[0.04] to-card"
                      : booking.status === "confirmed"
                      ? "border-emerald-500/40 bg-gradient-to-br from-emerald-500/[0.04] to-card"
                      : "border-border/80 hover:border-border"
                  }`}
                >
                  {/* Header: Name + Status Badge */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black text-xs border border-primary/20 shrink-0">
                          {booking.name.slice(0, 1) || "ط"}
                        </span>
                        <div className="min-w-0">
                          <h3 className="font-black text-foreground text-sm leading-tight truncate">
                            {booking.name}
                          </h3>
                          <span className="text-muted-foreground text-[11px] font-mono flex items-center gap-1 mt-0.5" dir="ltr">
                            <Clock className="w-3 h-3 text-primary shrink-0" />
                            <span>{dateStr} • {timeStr}</span>
                          </span>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 inline-flex items-center gap-1 ${
                          booking.status === "confirmed"
                            ? "bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30"
                            : booking.status === "completed"
                            ? "bg-blue-500/15 text-blue-500 dark:text-blue-400 border border-blue-500/30"
                            : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          booking.status === "confirmed" ? "bg-emerald-500" : booking.status === "completed" ? "bg-blue-500" : "bg-amber-500"
                        }`} />
                        {booking.status === "confirmed"
                          ? "مؤكد"
                          : booking.status === "completed"
                          ? "مكتمل"
                          : "جديد"}
                      </span>
                    </div>

                    {/* Phone & Whatsapp Action */}
                    <div className="flex items-center justify-between gap-2 bg-muted/30 p-2 rounded-lg border border-border/40 text-xs">
                      <a
                        href={`tel:${booking.phone}`}
                        className="text-foreground/90 font-mono font-bold hover:text-primary transition-colors dir-ltr inline-flex items-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                        {booking.phone}
                      </a>
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/20 transition-all shrink-0"
                      >
                        <MessageCircle className="w-3 h-3" />
                        واتساب
                      </a>
                    </div>

                    {/* Booking Message if present */}
                    {booking.message && (
                      <div className="text-foreground/80 text-xs bg-card/80 rounded-lg p-2 border border-border/50 max-h-20 overflow-y-auto leading-relaxed">
                        {booking.message}
                      </div>
                    )}
                  </div>

                  {/* Footer Action Buttons */}
                  <div className="flex items-center justify-end gap-1.5 border-t border-border/50 pt-2 mt-1">
                    {booking.status === "pending" && (
                      <button
                        onClick={() => handleBookingStatusUpdate(booking.id, "confirmed")}
                        className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold rounded-lg text-xs transition-all flex items-center gap-1"
                        title="تأكيد الحجز"
                      >
                        <Check className="w-3.5 h-3.5" />
                        تأكيد
                      </button>
                    )}
                    {booking.status === "confirmed" && (
                      <button
                        onClick={() => handleBookingStatusUpdate(booking.id, "completed")}
                        className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-600 dark:text-blue-400 font-bold rounded-lg text-xs transition-all flex items-center gap-1"
                        title="وضع علامة مكتمل"
                      >
                        <Check className="w-3.5 h-3.5" />
                        إكتمال
                      </button>
                    )}
                    <button
                      onClick={() => handleBookingDelete(booking.id)}
                      className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 dark:text-red-400 rounded-lg transition-all"
                      title="حذف طلب الحجز"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};
