import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListBookings,
  useUpdateBookingStatus,
  useDeleteBooking,
  useListCourses,
  useCreateCourse,
  useUpdateCourse,
  useDeleteCourse,
  useListPodcasts,
  useCreatePodcast,
  useUpdatePodcast,
  useDeletePodcast,
  setAuthTokenGetter,
  getListBookingsQueryOptions,
  getListBookingsQueryKey,
  getListCoursesQueryKey,
  getListPodcastsQueryKey,
} from "@workspace/api-client-react";
import type { Booking, Course, Podcast } from "@workspace/api-client-react";
import {
  Lock,
  BookOpen,
  Mic,
  Calendar,
  LogOut,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Loader2,
  ExternalLink,
  ChevronRight,
  Settings,
} from "lucide-react";
import { AdminSettings } from "./AdminSettings";

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState("");
  const [activeTab, setActiveTab] = useState<"bookings" | "courses" | "podcasts" | "settings">("bookings");

  // Local storage cache for the admin session
  useEffect(() => {
    const savedPassword = localStorage.getItem("dr_mahmoud_admin_pwd");
    if (savedPassword) {
      setAuthTokenGetter(() => savedPassword);
      setIsAuthenticated(true);
    }
  }, []);

  // API hooks
  // If not authenticated, we pass enabled: false to prevent queries firing on mount
  const bookingsQuery = useListBookings({
    query: { enabled: isAuthenticated } as any,
  });
  const coursesQuery = useListCourses({
    query: { enabled: isAuthenticated } as any,
  });
  const podcastsQuery = useListPodcasts({
    query: { enabled: isAuthenticated } as any,
  });

  // Mutations
  const updateBookingStatusMutation = useUpdateBookingStatus();
  const deleteBookingMutation = useDeleteBooking();

  const createCourseMutation = useCreateCourse();
  const updateCourseMutation = useUpdateCourse();
  const deleteCourseMutation = useDeleteCourse();

  const createPodcastMutation = useCreatePodcast();
  const updatePodcastMutation = useUpdatePodcast();
  const deletePodcastMutation = useDeletePodcast();

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput) return;
    setIsLoggingIn(true);
    setAuthError("");

    try {
      // Set the token temporarily
      setAuthTokenGetter(() => passwordInput);
      
      // Attempt to fetch bookings to verify the password
      const result = await queryClient.fetchQuery(
        getListBookingsQueryOptions()
      );

      if (result) {
        setIsAuthenticated(true);
        localStorage.setItem("dr_mahmoud_admin_pwd", passwordInput);
      }
    } catch (err: any) {
      setAuthError("كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى.");
      setAuthTokenGetter(null);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem("dr_mahmoud_admin_pwd");
    setAuthTokenGetter(null);
    setIsAuthenticated(false);
    setPasswordInput("");
  };

  // Course Modal state & fields
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [courseModalMode, setCourseModalMode] = useState<"add" | "edit">("add");
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [courseForm, setCourseForm] = useState({
    title: "",
    age: "",
    duration: "",
    sessions: "",
    level: "",
    category: "kids",
    tags: "",
    img: "",
  });

  // Podcast Modal state & fields
  const [isPodcastModalOpen, setIsPodcastModalOpen] = useState(false);
  const [podcastModalMode, setPodcastModalMode] = useState<"add" | "edit">("add");
  const [selectedPodcastId, setSelectedPodcastId] = useState<number | null>(null);
  const [podcastForm, setPodcastForm] = useState({
    title: "",
    desc: "",
    duration: "",
    youtubeUrl: "",
    audioUrl: "",
  });

  // Open Course Modal
  const openCourseModal = (mode: "add" | "edit", course?: Course) => {
    setCourseModalMode(mode);
    if (mode === "edit" && course) {
      setSelectedCourseId(course.id);
      setCourseForm({
        title: course.title,
        age: course.age,
        duration: course.duration,
        sessions: course.sessions,
        level: course.level,
        category: course.category,
        tags: course.tags.join(", "),
        img: course.img,
      });
    } else {
      setSelectedCourseId(null);
      setCourseForm({
        title: "",
        age: "من 4 إلى 18 سنة",
        duration: "3 أشهر",
        sessions: "12 حصة",
        level: "مبتدئ",
        category: "kids",
        tags: "أطفال, برمجة, Scratch",
        img: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=600",
      });
    }
    setIsCourseModalOpen(true);
  };

  // Open Podcast Modal
  const openPodcastModal = (mode: "add" | "edit", podcast?: Podcast) => {
    setPodcastModalMode(mode);
    if (mode === "edit" && podcast) {
      setSelectedPodcastId(podcast.id);
      setPodcastForm({
        title: podcast.title,
        desc: podcast.desc,
        duration: podcast.duration,
        youtubeUrl: podcast.youtubeUrl || "",
        audioUrl: podcast.audioUrl || "",
      });
    } else {
      setSelectedPodcastId(null);
      setPodcastForm({
        title: "",
        desc: "",
        duration: "15:00",
        youtubeUrl: "",
        audioUrl: "",
      });
    }
    setIsPodcastModalOpen(true);
  };

  // Image Upload handler for courses
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("dr_mahmoud_admin_pwd") || ""}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const data = await response.json();
      if (data.url) {
        setCourseForm((prev) => ({ ...prev, img: data.url }));
      }
    } catch (err) {
      alert("حدث خطأ أثناء تحميل الصورة. يرجى التأكد من أن الملف صورة وأقل من 5 ميجابايت.");
    } finally {
      setIsUploadingImage(false);
    }
  };
  // Audio Upload handler for podcasts
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAudio(true);
    const formData = new FormData();
    formData.append("audio", file);

    try {
      const response = await fetch("/api/upload/audio", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("dr_mahmoud_admin_pwd") || ""}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to upload audio");
      }

      const data = await response.json();
      if (data.url) {
        setPodcastForm((prev) => ({ ...prev, audioUrl: data.url }));
      }
    } catch (err: any) {
      alert(err.message || "حدث خطأ أثناء تحميل الملف الصوتي. يرجى التأكد من أن الملف بصيغة صوتية مناسبة (مثل MP3) وبحجم أقل من 150 ميجابايت.");
    } finally {
      setIsUploadingAudio(false);
    }
  };

  // Submit Course Form
  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tagsArray = courseForm.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      title: courseForm.title,
      age: courseForm.age,
      duration: courseForm.duration,
      sessions: courseForm.sessions,
      level: courseForm.level,
      category: courseForm.category,
      tags: tagsArray,
      img: courseForm.img,
    };

    try {
      if (courseModalMode === "edit" && selectedCourseId !== null) {
        await updateCourseMutation.mutateAsync({
          id: selectedCourseId,
          data: payload,
        });
      } else {
        await createCourseMutation.mutateAsync({
          data: payload,
        });
      }
      queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey() });
      setIsCourseModalOpen(false);
    } catch (err) {
      alert("خطأ أثناء حفظ الكورس");
    }
  };

  // Submit Podcast Form
  const handlePodcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: podcastForm.title,
      desc: podcastForm.desc,
      duration: podcastForm.duration,
      youtubeUrl: podcastForm.youtubeUrl || undefined,
      audioUrl: podcastForm.audioUrl || undefined,
    };

    try {
      if (podcastModalMode === "edit" && selectedPodcastId !== null) {
        await updatePodcastMutation.mutateAsync({
          id: selectedPodcastId,
          data: payload,
        });
      } else {
        await createPodcastMutation.mutateAsync({
          data: payload,
        });
      }
      queryClient.invalidateQueries({ queryKey: getListPodcastsQueryKey() });
      setIsPodcastModalOpen(false);
    } catch (err) {
      alert("خطأ أثناء حفظ الحلقة");
    }
  };

  // Delete handlers
  const handleCourseDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من رغبتك في حذف هذا الكورس؟")) return;
    try {
      await deleteCourseMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey() });
    } catch (err) {
      alert("خطأ أثناء حذف الكورس");
    }
  };

  const handlePodcastDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من رغبتك في حذف هذه الحلقة؟")) return;
    try {
      await deletePodcastMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListPodcastsQueryKey() });
    } catch (err) {
      alert("خطأ أثناء حذف الحلقة");
    }
  };

  // Booking handlers
  const handleBookingStatusUpdate = async (id: number, status: string) => {
    try {
      await updateBookingStatusMutation.mutateAsync({
        id,
        data: { status },
      });
      queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
    } catch (err) {
      alert("خطأ أثناء تحديث حالة الحجز");
    }
  };

  const handleBookingDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا الحجز؟")) return;
    try {
      await deleteBookingMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
    } catch (err) {
      alert("خطأ أثناء حذف الحجز");
    }
  };

  // Render Login view if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 dir-rtl">
        {/* Decorative elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />

        <div className="w-full max-w-md bg-card/60 backdrop-blur-xl border border-border rounded-3xl p-8 relative overflow-hidden shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-primary to-cyan-300 rounded-2xl flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20 mb-4 animate-pulse">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-white font-outfit">بوابة المسؤول</h1>
            <p className="text-sm text-muted-foreground mt-2">يرجى إدخال رمز التحقق للوصول إلى لوحة التحكم</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-2">كلمة المرور</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-background/80 border border-border text-white rounded-xl px-4 py-3.5 focus:outline-none focus:border-primary transition-colors placeholder-slate-700 text-center text-lg tracking-widest font-sans"
              />
              {authError && (
                <p className="text-red-400 text-xs mt-2 text-right">{authError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-gradient-to-r from-primary to-cyan-600 hover:from-primary/90 hover:to-cyan-600 text-primary-foreground font-bold rounded-xl py-3.5 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 flex items-center justify-center gap-2"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جاري التحقق...
                </>
              ) : (
                "دخول لوحة التحكم"
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <a
              href="/"
              className="text-xs text-slate-500 hover:text-foreground/90 flex items-center justify-center gap-1 transition-colors"
            >
              <ChevronRight className="w-4 h-4" /> العودة للموقع الرئيسي
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col dir-rtl">
      {/* Top Admin Header */}
      <header className="bg-card/60 backdrop-blur-xl border-b border-border sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-primary">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">لوحة تحكم د. محمود المهدي</h1>
              <p className="text-xs text-muted-foreground">إدارة محتوى الكورسات، البودكاست والحجوزات</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 border border-border rounded-xl text-xs hover:bg-muted/50 transition-colors flex items-center gap-1.5"
            >
              <ExternalLink className="w-4 h-4" /> عرض الموقع
            </a>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl text-xs transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" /> تسجيل الخروج
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col lg:flex-row gap-8">
        {/* Navigation Sidebar */}
        <aside className="lg:w-64 flex-shrink-0">
          <div className="bg-card/40 border border-border/80 rounded-2xl p-4 sticky top-24 space-y-2">
            <button
              onClick={() => setActiveTab("bookings")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-right text-sm font-medium transition-all ${
                activeTab === "bookings"
                  ? "bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/10"
                  : "hover:bg-muted/60 text-muted-foreground hover:text-foreground/80"
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span>الحجوزات</span>
              {bookingsQuery.data && bookingsQuery.data.filter(b => b.status === "pending").length > 0 && (
                <span className={`mr-auto px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === "bookings" ? "bg-background text-primary" : "bg-primary text-primary-foreground"}`}>
                  {bookingsQuery.data.filter(b => b.status === "pending").length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("courses")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-right text-sm font-medium transition-all ${
                activeTab === "courses"
                  ? "bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/10"
                  : "hover:bg-muted/60 text-muted-foreground hover:text-foreground/80"
              }`}
            >
              <BookOpen className="w-5 h-5" />
              <span>الكورسات</span>
            </button>

            <button
              onClick={() => setActiveTab("podcasts")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-right text-sm font-medium transition-all ${
                activeTab === "podcasts"
                  ? "bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/10"
                  : "hover:bg-muted/60 text-muted-foreground hover:text-foreground/80"
              }`}
            >
              <Mic className="w-5 h-5" />
              <span>البودكاست</span>
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-right text-sm font-medium transition-all ${
                activeTab === "settings"
                  ? "bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/10"
                  : "hover:bg-muted/60 text-muted-foreground hover:text-foreground/80"
              }`}
            >
              <Settings className="w-5 h-5" />
              <span>إعدادات الموقع</span>
            </button>
          </div>
        </aside>

        {/* Dynamic Panel Content */}
        <main className="flex-1">
          {activeTab === "bookings" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">إدارة الحجوزات</h2>
                  <p className="text-xs text-muted-foreground mt-1">تلقي ومتابعة طلبات التسجيل للطلاب</p>
                </div>
              </div>

              {bookingsQuery.isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-card/20 border border-border rounded-3xl">
                  <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground text-sm">جاري تحميل الحجوزات...</p>
                </div>
              ) : bookingsQuery.data?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-card/20 border border-border rounded-3xl text-center px-4">
                  <Calendar className="w-12 h-12 text-slate-600 mb-4" />
                  <p className="text-muted-foreground font-medium">لا توجد حجوزات مسجلة حتى الآن</p>
                  <p className="text-slate-600 text-xs mt-2">عند قيام الطلاب بالتسجيل ستظهر طلباتهم هنا</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {bookingsQuery.data?.map((booking) => (
                    <div
                      key={booking.id}
                      className="bg-card/40 border border-border/60 hover:border-border rounded-2xl p-6 transition-all relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
                    >
                      {/* Left side details */}
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-bold text-white text-lg">{booking.name}</h3>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              booking.status === "confirmed"
                                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                : booking.status === "completed"
                                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                : "bg-primary/10 text-primary border border-primary/20"
                            }`}
                          >
                            {booking.status === "confirmed"
                              ? "مؤكد"
                              : booking.status === "completed"
                              ? "مكتمل"
                              : "قيد الانتظار"}
                          </span>
                        </div>
                        <p className="text-foreground/90 text-sm font-sans" dir="ltr">{booking.phone}</p>
                        <p className="text-muted-foreground text-sm bg-background/40 rounded-xl p-3 border border-border/50 mt-2 whitespace-pre-wrap">
                          {booking.message}
                        </p>
                        <p className="text-slate-600 text-[10px]">
                          تاريخ الطلب: {new Date(booking.createdAt).toLocaleString("ar-EG")}
                        </p>
                      </div>

                      {/* Quick Action controls */}
                      <div className="flex items-center gap-2 flex-shrink-0 self-stretch md:self-auto justify-end border-t md:border-t-0 border-border/60 pt-4 md:pt-0">
                        {booking.status === "pending" && (
                          <button
                            onClick={() => handleBookingStatusUpdate(booking.id, "confirmed")}
                            className="p-2.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 rounded-xl transition-all"
                            title="تأكيد الحجز"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        {booking.status === "confirmed" && (
                          <button
                            onClick={() => handleBookingStatusUpdate(booking.id, "completed")}
                            className="p-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 rounded-xl transition-all"
                            title="وضع علامة مكتمل"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleBookingDelete(booking.id)}
                          className="p-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl transition-all"
                          title="حذف الحجز"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "courses" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">إدارة الكورسات</h2>
                  <p className="text-xs text-muted-foreground mt-1">إضافة وتحديث باقة البرامج التدريبية</p>
                </div>
                <button
                  onClick={() => openCourseModal("add")}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl px-4 py-2.5 text-sm transition-all shadow-lg shadow-primary/10 hover:shadow-primary/20 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> إضافة كورس
                </button>
              </div>

              {coursesQuery.isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-card/20 border border-border rounded-3xl">
                  <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground text-sm">جاري تحميل الكورسات...</p>
                </div>
              ) : coursesQuery.data?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-card/20 border border-border rounded-3xl text-center px-4">
                  <BookOpen className="w-12 h-12 text-slate-600 mb-4" />
                  <p className="text-muted-foreground font-medium">لا توجد كورسات مضافة</p>
                  <button
                    onClick={() => openCourseModal("add")}
                    className="mt-4 text-xs text-primary hover:text-primary flex items-center gap-1"
                  >
                    إضافة أول كورس الآن <ChevronRight className="w-4 h-4 rotate-180" />
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {coursesQuery.data?.map((course) => (
                    <div
                      key={course.id}
                      className="bg-card/30 border border-border/80 rounded-2xl overflow-hidden flex flex-col justify-between"
                    >
                      <div className="relative h-48 bg-background">
                        <img
                          src={course.img}
                          alt={course.title}
                          className="w-full h-full object-cover opacity-70"
                        />
                        <div className="absolute top-3 right-3 bg-background/80 backdrop-blur-md border border-border px-3 py-1 rounded-full text-xs font-bold text-primary">
                          {course.category}
                        </div>
                      </div>

                      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                        <div className="space-y-2">
                          <h3 className="font-bold text-white text-lg">{course.title}</h3>
                          <div className="flex flex-wrap gap-1.5">
                            {course.tags.map((tag, idx) => (
                              <span key={idx} className="bg-slate-800 text-foreground/90 text-[10px] px-2 py-0.5 rounded-md">
                                {tag}
                              </span>
                            ))}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-2 border-t border-border/50">
                            <div>السن: {course.age}</div>
                            <div>المدة: {course.duration}</div>
                            <div>الحصص: {course.sessions}</div>
                            <div>المستوى: {course.level}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 border-t border-border/80 pt-3">
                          <button
                            onClick={() => openCourseModal("edit", course)}
                            className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-foreground/80 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 border border-slate-700/50"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> تعديل
                          </button>
                          <button
                            onClick={() => handleCourseDelete(course.id)}
                            className="py-2 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs transition-colors border border-red-500/20"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "podcasts" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">إدارة البودكاست</h2>
                  <p className="text-xs text-muted-foreground mt-1">رفع وتحديث الحلقات النقاشية والبودكاست</p>
                </div>
                <button
                  onClick={() => openPodcastModal("add")}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl px-4 py-2.5 text-sm transition-all shadow-lg shadow-primary/10 hover:shadow-primary/20 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> إضافة حلقة
                </button>
              </div>

              {podcastsQuery.isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-card/20 border border-border rounded-3xl">
                  <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground text-sm">جاري تحميل الحلقات...</p>
                </div>
              ) : podcastsQuery.data?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-card/20 border border-border rounded-3xl text-center px-4">
                  <Mic className="w-12 h-12 text-slate-600 mb-4" />
                  <p className="text-muted-foreground font-medium">لا توجد حلقات مضافة</p>
                  <button
                    onClick={() => openPodcastModal("add")}
                    className="mt-4 text-xs text-primary hover:text-primary flex items-center gap-1"
                  >
                    إضافة أول حلقة الآن <ChevronRight className="w-4 h-4 rotate-180" />
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {podcastsQuery.data?.map((ep) => (
                    <div
                      key={ep.id}
                      className="bg-card/40 border border-border/60 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
                    >
                      <div className="space-y-1.5 flex-1">
                        <h3 className="font-bold text-white text-lg">{ep.title}</h3>
                        <p className="text-muted-foreground text-sm line-clamp-2">{ep.desc}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-500 pt-2">
                          <span>المدة: {ep.duration}</span>
                          {ep.youtubeUrl && <span className="text-primary/80">رابط يوتيوب متاح</span>}
                          {ep.audioUrl && <span className="text-green-400/80">رابط الصوت متاح</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 self-stretch md:self-auto justify-end border-t md:border-t-0 border-border/60 pt-4 md:pt-0">
                        <button
                          onClick={() => openPodcastModal("edit", ep)}
                          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-foreground/80 rounded-xl text-xs transition-colors flex items-center gap-1.5 border border-slate-700/50"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> تعديل
                        </button>
                        <button
                          onClick={() => handlePodcastDelete(ep.id)}
                          className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs transition-colors border border-red-500/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "settings" && <AdminSettings />}
        </main>
      </div>

      {/* Course Modal Form */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-md"
            onClick={() => setIsCourseModalOpen(false)}
          />
          <div className="bg-card border border-border w-full max-w-2xl rounded-3xl p-6 relative z-10 max-h-[90vh] overflow-y-auto shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-lg font-bold text-white">
                {courseModalMode === "edit" ? "تعديل الكورس" : "إضافة كورس جديد"}
              </h3>
              <button
                onClick={() => setIsCourseModalOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-muted-foreground hover:text-foreground/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCourseSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">اسم الكورس</label>
                  <input
                    type="text"
                    required
                    value={courseForm.title}
                    onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">الفئة العمرية</label>
                  <input
                    type="text"
                    required
                    value={courseForm.age}
                    onChange={(e) => setCourseForm({ ...courseForm, age: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">مدة البرنامج</label>
                  <input
                    type="text"
                    required
                    value={courseForm.duration}
                    onChange={(e) => setCourseForm({ ...courseForm, duration: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">عدد الحصص</label>
                  <input
                    type="text"
                    required
                    value={courseForm.sessions}
                    onChange={(e) => setCourseForm({ ...courseForm, sessions: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">المستوى</label>
                  <input
                    type="text"
                    required
                    value={courseForm.level}
                    onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">التصنيف الرئيسي</label>
                  <select
                    value={courseForm.category}
                    onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary text-sm"
                  >
                    <option value="kids">المسار البرمجي للأطفال</option>
                    <option value="python">برمجة بايثون والذكاء الاصطناعي</option>
                    <option value="db">علوم البيانات وقواعد البيانات</option>
                    <option value="mobile">تطوير تطبيقات الجوال</option>
                    <option value="ai">تقنيات الذكاء الاصطناعي التوليدي</option>
                    <option value="university">المناهج البرمجية الجامعية</option>
                    <option value="icdl">التحول الرقمي و ICDL</option>
                  </select>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="block text-xs font-semibold text-muted-foreground">صورة الكورس</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[10px] text-slate-500 mb-1">خيار 1: تحميل صورة من جهازك</span>
                      <div className="relative border border-dashed border-border hover:border-primary/50 rounded-xl p-3 bg-background/40 transition-colors flex flex-col items-center justify-center min-h-[90px]">
                        {isUploadingImage ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                            <span className="text-xs text-muted-foreground">جاري الرفع...</span>
                          </div>
                        ) : (
                          <>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <span className="text-xs text-muted-foreground text-center">انقر هنا أو اسحب الصورة لرفعها</span>
                            <span className="text-[10px] text-slate-600 mt-1">PNG, JPG حتى 5MB</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500 mb-1">خيار 2: رابط صورة مباشر</span>
                      <input
                        type="text"
                        required
                        value={courseForm.img}
                        onChange={(e) => setCourseForm({ ...courseForm, img: e.target.value })}
                        placeholder="https://example.com/image.jpg"
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary text-sm h-[90px]"
                      />
                    </div>
                  </div>
                  {courseForm.img && (
                    <div className="flex items-center gap-3 p-2 bg-background/20 border border-border rounded-xl mt-2">
                      <img
                        src={courseForm.img}
                        alt="Preview"
                        className="w-12 h-12 rounded-lg object-cover border border-border"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=600";
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="block text-xs font-semibold text-foreground/90 truncate">{courseForm.img}</span>
                        <span className="block text-[10px] text-green-400">جاهز ومعاين</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">الوسوم (مفصولة بفواصل)</label>
                  <input
                    type="text"
                    required
                    value={courseForm.tags}
                    onChange={(e) => setCourseForm({ ...courseForm, tags: e.target.value })}
                    placeholder="برمجة, أطفال, بايثون"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 justify-end border-t border-border pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsCourseModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-foreground/80 rounded-xl text-xs transition-colors border border-slate-700/50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={createCourseMutation.isPending || updateCourseMutation.isPending}
                  className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs transition-colors shadow-lg shadow-primary/10 flex items-center gap-1.5"
                >
                  {(createCourseMutation.isPending || updateCourseMutation.isPending) && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  حفظ البيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Podcast Modal Form */}
      {isPodcastModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-md"
            onClick={() => setIsPodcastModalOpen(false)}
          />
          <div className="bg-card border border-border w-full max-w-2xl rounded-3xl p-6 relative z-10 max-h-[90vh] overflow-y-auto shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-lg font-bold text-white">
                {podcastModalMode === "edit" ? "تعديل الحلقة" : "إضافة حلقة جديدة"}
              </h3>
              <button
                onClick={() => setIsPodcastModalOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-muted-foreground hover:text-foreground/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePodcastSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">عنوان الحلقة</label>
                <input
                  type="text"
                  required
                  value={podcastForm.title}
                  onChange={(e) => setPodcastForm({ ...podcastForm, title: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">وصف الحلقة</label>
                <textarea
                  required
                  rows={4}
                  value={podcastForm.desc}
                  onChange={(e) => setPodcastForm({ ...podcastForm, desc: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary text-sm resize-none"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">مدة الحلقة (دقيقة:ثانية)</label>
                  <input
                    type="text"
                    required
                    value={podcastForm.duration}
                    onChange={(e) => setPodcastForm({ ...podcastForm, duration: e.target.value })}
                    placeholder="12:30"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">رابط يوتيوب (اختياري)</label>
                  <input
                    type="text"
                    value={podcastForm.youtubeUrl}
                    onChange={(e) => setPodcastForm({ ...podcastForm, youtubeUrl: e.target.value })}
                    placeholder="https://youtube.com/..."
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary text-sm"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="block text-xs font-semibold text-muted-foreground">ملف الصوت للحلقة</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[10px] text-slate-500 mb-1">خيار 1: تحميل ملف صوتي من جهازك</span>
                      <div className="relative border border-dashed border-border hover:border-primary/50 rounded-xl p-3 bg-background/40 transition-colors flex flex-col items-center justify-center min-h-[90px]">
                        {isUploadingAudio ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                            <span className="text-xs text-muted-foreground">جاري الرفع...</span>
                          </div>
                        ) : (
                          <>
                            <input
                              type="file"
                              accept="audio/*"
                              onChange={handleAudioUpload}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <span className="text-xs text-muted-foreground text-center">انقر هنا أو اسحب الملف لرفعه</span>
                            <span className="text-[10px] text-slate-600 mt-1">MP3, WAV حتى 150MB</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500 mb-1">خيار 2: رابط ملف صوتي مباشر</span>
                      <input
                        type="text"
                        value={podcastForm.audioUrl}
                        onChange={(e) => setPodcastForm({ ...podcastForm, audioUrl: e.target.value })}
                        placeholder="https://domain.com/audio.mp3"
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary text-sm h-[90px]"
                      />
                    </div>
                  </div>
                  {podcastForm.audioUrl && (
                    <div className="flex items-center gap-3 p-2 bg-background/20 border border-border rounded-xl mt-2">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                        <Mic className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="block text-xs font-semibold text-foreground/90 truncate">{podcastForm.audioUrl}</span>
                        <span className="block text-[10px] text-green-400">تم اختيار الملف الصوتي بنجاح</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 justify-end border-t border-border pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsPodcastModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-foreground/80 rounded-xl text-xs transition-colors border border-slate-700/50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={createPodcastMutation.isPending || updatePodcastMutation.isPending}
                  className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs transition-colors shadow-lg shadow-primary/10 flex items-center gap-1.5"
                >
                  {(createPodcastMutation.isPending || updatePodcastMutation.isPending) && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  حفظ البيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
