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
  useListCurriculums,
  useCreateCurriculum,
  useUpdateCurriculum,
  useDeleteCurriculum,
  useListVideos,
  useCreateVideo,
  useUpdateVideo,
  useDeleteVideo,
  setAuthTokenGetter,
  getListBookingsQueryOptions,
  getListBookingsQueryKey,
  getListCoursesQueryKey,
  getListPodcastsQueryKey,
  getListCurriculumsQueryKey,
  getListVideosQueryKey,
} from "@workspace/api-client-react";
import type { Booking, Course, Podcast, Curriculum, Video } from "@workspace/api-client-react";
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
  Library,
  ArrowUp,
  ArrowDown,
  Video as VideoIcon,
  Play,
  Download,
} from "lucide-react";
import { AdminSettings } from "./AdminSettings";

const getYoutubeThumbnail = (url: string) => {
  try {
    if (!url) return "";
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `https://img.youtube.com/vi/${match[2]}/hqdefault.jpg`;
    }
    const playlistMatch = url.match(/[?&]list=([^#\&\?]+)/);
    if (playlistMatch) {
      return "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=400&q=80";
    }
  } catch (e) {}
  return "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=400&q=80";
};

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState("");
  const [activeTab, setActiveTab] = useState<"bookings" | "courses" | "podcasts" | "curriculums" | "videos" | "settings">("bookings");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("all");
  const [selectedVideoCategoryFilter, setSelectedVideoCategoryFilter] = useState<string>("all");

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
  const curriculumsQuery = useListCurriculums({
    query: { enabled: isAuthenticated } as any,
  });
  const videosQuery = useListVideos({
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

  const createCurriculumMutation = useCreateCurriculum();
  const updateCurriculumMutation = useUpdateCurriculum();
  const deleteCurriculumMutation = useDeleteCurriculum();

  const createVideoMutation = useCreateVideo();
  const updateVideoMutation = useUpdateVideo();
  const deleteVideoMutation = useDeleteVideo();

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

  // Curriculum Modal state & fields
  const [isCurriculumModalOpen, setIsCurriculumModalOpen] = useState(false);
  const [curriculumModalMode, setCurriculumModalMode] = useState<"add" | "edit">("add");
  const [selectedCurriculumId, setSelectedCurriculumId] = useState<number | null>(null);
  const [curriculumForm, setCurriculumForm] = useState({
    subject: "C++",
    title: "",
    description: "",
    images: Array(10).fill("") as string[],
    order: 0,
  });
  const [uploadingSlotIndex, setUploadingSlotIndex] = useState<number | null>(null);

  // Video Modal state & fields
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [videoModalMode, setVideoModalMode] = useState<"add" | "edit">("add");
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [videoForm, setVideoForm] = useState({
    category: "سي بلس بلس C++",
    title: "",
    description: "",
    youtubeUrl: "",
    type: "video" as "video" | "playlist",
    order: 0,
    isProtected: false,
    accessKey: "",
  });
  const [previewVideo, setPreviewVideo] = useState<Video | null>(null);

  const getYouTubeVideoId = (url: string): string | null => {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
      /youtube\.com\/live\/([A-Za-z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const getYouTubePlaylistId = (url: string): string | null => {
    if (!url) return null;
    const match = url.match(/[?&]list=([^#\&\?]+)/);
    return match ? match[1] : null;
  };

  // Open Video Modal
  const openVideoModal = (mode: "add" | "edit", video?: Video) => {
    setVideoModalMode(mode);
    if (mode === "edit" && video) {
      setSelectedVideoId(video.id);
      setVideoForm({
        category: video.category,
        title: video.title,
        description: video.description || "",
        youtubeUrl: video.youtubeUrl,
        type: video.type as "video" | "playlist",
        order: video.order,
        isProtected: (video as any).isProtected ?? false,
        accessKey: (video as any).accessKey || "",
      });
    } else {
      setSelectedVideoId(null);
      setVideoForm({
        category: "سي بلس بلس C++",
        title: "",
        description: "",
        youtubeUrl: "",
        type: "video",
        order: 0,
        isProtected: false,
        accessKey: "",
      });
    }
    setIsVideoModalOpen(true);
  };

  // Open Curriculum Modal
  const openCurriculumModal = (mode: "add" | "edit", curriculum?: Curriculum) => {
    setCurriculumModalMode(mode);
    if (mode === "edit" && curriculum) {
      setSelectedCurriculumId(curriculum.id);
      // Pad existing images up to exactly 10 items
      const paddedImages = [...curriculum.images];
      while (paddedImages.length < 10) {
        paddedImages.push("");
      }
      paddedImages.length = 10;

      setCurriculumForm({
        subject: curriculum.subject,
        title: curriculum.title,
        description: curriculum.description || "",
        images: paddedImages,
        order: curriculum.order,
      });
    } else {
      setSelectedCurriculumId(null);
      setCurriculumForm({
        subject: "C++",
        title: "",
        description: "",
        images: Array(10).fill(""),
        order: 0,
      });
    }
    setUploadingSlotIndex(null);
    setIsCurriculumModalOpen(true);
  };

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

  // Submit Curriculum Form
  const handleCurriculumSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Filter out empty slots
    const filteredImages = curriculumForm.images.filter((img) => img && img.trim() !== "");
    if (filteredImages.length === 0) {
      alert("يرجى إضافة صورة واحدة على الأقل للدرس");
      return;
    }

    const payload = {
      subject: curriculumForm.subject,
      title: curriculumForm.title,
      description: curriculumForm.description || undefined,
      images: filteredImages,
      order: Number(curriculumForm.order),
    };

    try {
      if (curriculumModalMode === "edit" && selectedCurriculumId !== null) {
        await updateCurriculumMutation.mutateAsync({
          id: selectedCurriculumId,
          data: payload,
        });
      } else {
        await createCurriculumMutation.mutateAsync({
          data: payload,
        });
      }
      queryClient.invalidateQueries({ queryKey: getListCurriculumsQueryKey() });
      setIsCurriculumModalOpen(false);
    } catch (err) {
      alert("خطأ أثناء حفظ الدرس");
    }
  };

  // Upload image for a specific slot index (0-9)
  const handleSlotImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingSlotIndex(idx);
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
        throw new Error("Failed to upload image " + file.name);
      }

      const data = await response.json();
      if (data.url) {
        setCurriculumForm((prev) => {
          const newImages = [...prev.images];
          newImages[idx] = data.url;
          return {
            ...prev,
            images: newImages,
          };
        });
      }
    } catch (err) {
      console.error(err);
      alert(`حدث خطأ أثناء تحميل الصورة ${file.name}`);
    } finally {
      setUploadingSlotIndex(null);
    }
  };

  const handleCurriculumDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من رغبتك في حذف هذا الدرس؟")) return;
    try {
      await deleteCurriculumMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListCurriculumsQueryKey() });
    } catch (err) {
      alert("خطأ أثناء حذف الدرس");
    }
  };

  const handleVideoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoForm.title || !videoForm.youtubeUrl) {
      alert("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    const payload = {
      category: videoForm.category,
      title: videoForm.title,
      description: videoForm.description || undefined,
      youtubeUrl: videoForm.youtubeUrl,
      type: videoForm.type,
      order: Number(videoForm.order),
      isProtected: videoForm.isProtected,
      accessKey: videoForm.isProtected ? videoForm.accessKey || undefined : undefined,
    };

    try {
      if (videoModalMode === "edit" && selectedVideoId !== null) {
        await updateVideoMutation.mutateAsync({
          id: selectedVideoId,
          data: payload,
        });
      } else {
        await createVideoMutation.mutateAsync({
          data: payload,
        });
      }
      queryClient.invalidateQueries({ queryKey: getListVideosQueryKey() });
      setIsVideoModalOpen(false);
    } catch (err) {
      alert("خطأ أثناء حفظ الفيديو");
    }
  };

  const handleVideoDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من رغبتك في حذف هذا الفيديو/القائمة؟")) return;
    try {
      await deleteVideoMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListVideosQueryKey() });
    } catch (err) {
      alert("خطأ أثناء حذف الفيديو/القائمة");
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

  const handleExportCSV = () => {
    if (!bookingsQuery.data || bookingsQuery.data.length === 0) return;
    const headers = ["ID", "الاسم", "رقم الهاتف", "تفاصيل الرسالة", "الحالة", "تاريخ الطلب"];
    const rows = bookingsQuery.data.map(b => [
      b.id,
      b.name,
      b.phone,
      b.message.replace(/\n/g, " | "),
      b.status === "confirmed" ? "مؤكد" : b.status === "completed" ? "مكتمل" : "قيد الانتظار",
      new Date(b.createdAt).toLocaleString("ar-EG")
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bookings_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
              onClick={() => setActiveTab("curriculums")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-right text-sm font-medium transition-all ${
                activeTab === "curriculums"
                  ? "bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/10"
                  : "hover:bg-muted/60 text-muted-foreground hover:text-foreground/80"
              }`}
            >
              <Library className="w-5 h-5" />
              <span>المناهج التعليمية</span>
            </button>

             <button
              onClick={() => setActiveTab("videos")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-right text-sm font-medium transition-all ${
                activeTab === "videos"
                  ? "bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/10"
                  : "hover:bg-muted/60 text-muted-foreground hover:text-foreground/80"
              }`}
            >
              <VideoIcon className="w-5 h-5" />
              <span>الفيديوهات والقوائم</span>
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">إدارة الحجوزات</h2>
                  <p className="text-xs text-muted-foreground mt-1">تلقي ومتابعة طلبات التسجيل للطلاب</p>
                </div>
                {bookingsQuery.data && bookingsQuery.data.length > 0 && (
                  <button
                    onClick={handleExportCSV}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-4 py-2.5 text-xs transition-all flex items-center gap-2 self-start sm:self-auto shrink-0 shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/20"
                  >
                    <Download className="w-4 h-4" />
                    تصدير الحجوزات (CSV)
                  </button>
                )}
              </div>

              {!bookingsQuery.isLoading && bookingsQuery.data && bookingsQuery.data.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[#0b111e]/40 border border-white/[0.06] rounded-2xl p-4 flex flex-col justify-between">
                    <span className="text-xs text-slate-400">إجمالي الحجوزات</span>
                    <span className="text-2xl font-bold text-white mt-2">{bookingsQuery.data.length}</span>
                  </div>
                  <div className="bg-[#0b111e]/40 border border-white/[0.06] rounded-2xl p-4 flex flex-col justify-between">
                    <span className="text-xs text-slate-400">قيد الانتظار</span>
                    <span className="text-2xl font-bold text-cyan-400 mt-2">
                      {bookingsQuery.data.filter(b => b.status === "pending").length}
                    </span>
                  </div>
                  <div className="bg-[#0b111e]/40 border border-white/[0.06] rounded-2xl p-4 flex flex-col justify-between">
                    <span className="text-xs text-slate-400">حجوزات مؤكدة</span>
                    <span className="text-2xl font-bold text-green-400 mt-2">
                      {bookingsQuery.data.filter(b => b.status === "confirmed").length}
                    </span>
                  </div>
                  <div className="bg-[#0b111e]/40 border border-white/[0.06] rounded-2xl p-4 flex flex-col justify-between">
                    <span className="text-xs text-slate-400">حجوزات مكتملة</span>
                    <span className="text-2xl font-bold text-blue-400 mt-2">
                      {bookingsQuery.data.filter(b => b.status === "completed").length}
                    </span>
                  </div>
                </div>
              )}

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

          {activeTab === "curriculums" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">إدارة المناهج التعليمية</h2>
                  <p className="text-xs text-muted-foreground mt-1">رفع وتنظيم دروس المناهج والمواد كمعارض صور</p>
                </div>
                <button
                  onClick={() => openCurriculumModal("add")}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl px-4 py-2.5 text-sm transition-all shadow-lg shadow-primary/10 hover:shadow-primary/20 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> إضافة درس جديد
                </button>
              </div>

              {/* Subject Filters */}
              {curriculumsQuery.data && curriculumsQuery.data.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pb-2">
                  <button
                    onClick={() => setSelectedSubjectFilter("all")}
                    className={`px-3 py-1.5 rounded-xl text-xs transition-colors font-medium border ${
                      selectedSubjectFilter === "all"
                        ? "bg-primary/15 text-primary border-primary/30 font-bold"
                        : "bg-card/40 text-muted-foreground border-border/80 hover:text-foreground/90"
                    }`}
                  >
                    الكل ({curriculumsQuery.data.length})
                  </button>
                  {Array.from(new Set(curriculumsQuery.data.map(c => c.subject))).map((subj) => {
                    const count = curriculumsQuery.data!.filter(c => c.subject === subj).length;
                    return (
                      <button
                        key={subj}
                        onClick={() => setSelectedSubjectFilter(subj)}
                        className={`px-3 py-1.5 rounded-xl text-xs transition-colors font-medium border ${
                          selectedSubjectFilter === subj
                            ? "bg-primary/15 text-primary border-primary/30 font-bold"
                            : "bg-card/40 text-muted-foreground border-border/80 hover:text-foreground/90"
                        }`}
                      >
                        {subj} ({count})
                      </button>
                    );
                  })}
                </div>
              )}

              {curriculumsQuery.isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-card/20 border border-border rounded-3xl">
                  <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground text-sm">جاري تحميل الدروس والمناهج...</p>
                </div>
              ) : curriculumsQuery.data?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-card/20 border border-border rounded-3xl text-center px-4">
                  <Library className="w-12 h-12 text-slate-600 mb-4" />
                  <p className="text-muted-foreground font-medium">لا توجد دروس أو مناهج مضافة</p>
                  <p className="text-slate-600 text-xs mt-1">يمكنك إضافة الدروس والمناهج على شكل مجموعات صور وسيقوم النظام بعرضها للطلاب</p>
                  <button
                    onClick={() => openCurriculumModal("add")}
                    className="mt-4 bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-4 py-2 rounded-xl text-xs transition-colors"
                  >
                    إضافة أول درس الآن
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {curriculumsQuery.data
                    ?.filter(c => selectedSubjectFilter === "all" || c.subject === selectedSubjectFilter)
                    ?.map((curriculum) => (
                      <div
                        key={curriculum.id}
                        className="bg-card/40 border border-border/60 hover:border-border rounded-2xl p-6 transition-all flex flex-col gap-4"
                      >
                        {/* Upper Section */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                {curriculum.subject}
                              </span>
                              <span className="text-[10px] text-slate-500">الترتيب: {curriculum.order}</span>
                            </div>
                            <h3 className="font-bold text-white text-lg mt-1">{curriculum.title}</h3>
                            {curriculum.description && (
                              <p className="text-xs text-muted-foreground">{curriculum.description}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0 self-stretch md:self-auto justify-end">
                            <button
                              onClick={() => openCurriculumModal("edit", curriculum)}
                              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-foreground/80 rounded-xl text-xs transition-colors flex items-center gap-1.5 border border-slate-700/50"
                            >
                              <Edit2 className="w-3.5 h-3.5" /> تعديل
                            </button>
                            <button
                              onClick={() => handleCurriculumDelete(curriculum.id)}
                              className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs transition-colors border border-red-500/20"
                              title="حذف الدرس"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Images Preview Section */}
                        <div>
                          <span className="block text-[10px] font-semibold text-muted-foreground mb-2">معاينة صفحات/صور الدرس ({curriculum.images.length})</span>
                          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-850 scrollbar-track-transparent">
                            {curriculum.images.map((img, idx) => (
                              <div
                                key={idx}
                                className="relative w-20 h-24 rounded-lg overflow-hidden border border-border bg-slate-900 flex-shrink-0 group"
                              >
                                <img
                                  src={img}
                                  alt={`Slide ${idx + 1}`}
                                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                />
                                <span className="absolute bottom-1 right-1 bg-black/60 text-[9px] px-1 rounded text-white font-mono">
                                  {idx + 1}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "videos" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">إدارة فيديوهات وقوائم اليوتيوب</h2>
                  <p className="text-xs text-muted-foreground mt-1">عرض وتنظيم شروحات المناهج وكورسات البرمجة مباشرة من قناتك</p>
                </div>
                <button
                  onClick={() => openVideoModal("add")}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl px-4 py-2.5 text-sm transition-all shadow-lg shadow-primary/10 hover:shadow-primary/20 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> إضافة فيديو / قائمة
                </button>
              </div>

              {/* Category Filters */}
              {videosQuery.data && videosQuery.data.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pb-2">
                  <button
                    onClick={() => setSelectedVideoCategoryFilter("all")}
                    className={`px-3 py-1.5 rounded-xl text-xs transition-colors font-medium border ${
                      selectedVideoCategoryFilter === "all"
                        ? "bg-primary/15 text-primary border-primary/30 font-bold"
                        : "bg-card/40 text-muted-foreground border-border/80 hover:text-foreground/90"
                    }`}
                  >
                    الكل ({videosQuery.data.length})
                  </button>
                  {Array.from(new Set(videosQuery.data.map(v => v.category))).map((cat) => {
                    const count = videosQuery.data!.filter(v => v.category === cat).length;
                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedVideoCategoryFilter(cat)}
                        className={`px-3 py-1.5 rounded-xl text-xs transition-colors font-medium border ${
                          selectedVideoCategoryFilter === cat
                            ? "bg-primary/15 text-primary border-primary/30 font-bold"
                            : "bg-card/40 text-muted-foreground border-border/80 hover:text-foreground/90"
                        }`}
                      >
                        {cat} ({count})
                      </button>
                    );
                  })}
                </div>
              )}

              {videosQuery.isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-card/20 border border-border rounded-3xl">
                  <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground text-sm">جاري تحميل الفيديوهات...</p>
                </div>
              ) : videosQuery.data?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-card/20 border border-border rounded-3xl text-center px-4">
                  <VideoIcon className="w-12 h-12 text-slate-600 mb-4" />
                  <p className="text-muted-foreground font-medium">لا توجد فيديوهات أو قوائم تشغيل مضافة</p>
                  <p className="text-slate-600 text-xs mt-1">يمكنك إضافة شروحاتك وقوائم تشغيل اليوتيوب وسيتم عرضها للطلاب بشكل رائع</p>
                  <button
                    onClick={() => openVideoModal("add")}
                    className="mt-4 bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-4 py-2 rounded-xl text-xs transition-colors"
                  >
                    إضافة أول فيديو الآن
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {videosQuery.data
                    ?.filter(v => selectedVideoCategoryFilter === "all" || v.category === selectedVideoCategoryFilter)
                    ?.map((video) => (
                      <div
                        key={video.id}
                        className="bg-card/40 border border-border/60 hover:border-border rounded-2xl overflow-hidden transition-all flex flex-col group"
                      >
                        {/* Video Thumbnail */}
                        <div className="relative aspect-video bg-slate-900 overflow-hidden border-b border-border/40">
                          <img
                            src={getYoutubeThumbnail(video.youtubeUrl)}
                            alt={video.title}
                            className="w-full h-full object-cover opacity-75 group-hover:opacity-90 group-hover:scale-105 transition-all duration-300"
                          />
                          {/* Play Overlay */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                            <button
                              onClick={() => setPreviewVideo(video)}
                              className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-all duration-300 hover:bg-primary/95"
                              title="معاينة وتشغيل الفيديو"
                            >
                              <Play className="w-5 h-5 fill-current ms-0.5" />
                            </button>
                          </div>
                          <div className="absolute top-3 right-3 flex items-center gap-1.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border backdrop-blur-md ${
                              video.type === "playlist"
                                ? "bg-amber-500/20 text-amber-400 border-amber-500/35"
                                : "bg-red-500/20 text-red-400 border-red-500/35"
                            }`}>
                              {video.type === "playlist" ? "قائمة تشغيل" : "فيديو منفرد"}
                            </span>
                            {video.isProtected && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border backdrop-blur-md bg-purple-500/20 text-purple-400 border-purple-500/35 flex items-center gap-1">
                                <Lock className="w-3 h-3 text-purple-400" /> محمي
                              </span>
                            )}
                          </div>
                          <div className="absolute bottom-3 left-3 bg-black/75 text-[10px] font-mono px-2 py-0.5 rounded text-slate-300">
                            ترتيب: {video.order}
                          </div>
                        </div>

                        {/* Video Metadata */}
                        <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                          <div className="space-y-2">
                            <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold px-2 py-0.5 rounded-md">
                              {video.category}
                            </span>
                            <h3 className="font-bold text-white text-base line-clamp-2 mt-1">{video.title}</h3>
                            {video.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">{video.description}</p>
                            )}
                          </div>

                          <div className="flex flex-col gap-2.5 border-t border-border/40 pt-4 mt-auto">
                            <div className="flex items-center justify-between">
                              <button
                                onClick={() => setPreviewVideo(video)}
                                className="text-[11px] text-primary hover:underline flex items-center gap-1 font-semibold"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" /> تشغيل المعاينة
                              </button>
                              <a
                                href={video.youtubeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-muted-foreground hover:text-white hover:underline flex items-center gap-1 font-medium"
                              >
                                <ExternalLink className="w-3 h-3" /> يوتيوب
                              </a>
                            </div>
                            <div className="flex items-center justify-end gap-1.5 border-t border-border/20 pt-2">
                              <button
                                onClick={() => openVideoModal("edit", video)}
                                className="p-2 bg-slate-800 hover:bg-slate-700 text-foreground/80 rounded-xl transition-colors border border-slate-700/50 flex-1 flex justify-center items-center gap-1 text-xs"
                                title="تعديل"
                              >
                                <Edit2 className="w-3 h-3" /> تعديل
                              </button>
                              <button
                                onClick={() => handleVideoDelete(video.id)}
                                className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors border border-red-500/20 flex-1 flex justify-center items-center gap-1 text-xs"
                                title="حذف"
                              >
                                <Trash2 className="w-3 h-3" /> حذف
                              </button>
                            </div>
                          </div>
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

      {/* Curriculum Modal Form */}
      {isCurriculumModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-md"
            onClick={() => setIsCurriculumModalOpen(false)}
          />
          <div className="bg-card border border-border w-full max-w-2xl rounded-3xl p-6 relative z-10 max-h-[90vh] overflow-y-auto shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-lg font-bold text-white">
                {curriculumModalMode === "edit" ? "تعديل الدرس" : "إضافة درس جديد للمنهج"}
              </h3>
              <button
                onClick={() => setIsCurriculumModalOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-muted-foreground hover:text-foreground/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCurriculumSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">المادة / لغة البرمجة</label>
                  <input
                    type="text"
                    required
                    list="subjects-list"
                    value={curriculumForm.subject}
                    onChange={(e) => setCurriculumForm({ ...curriculumForm, subject: e.target.value })}
                    placeholder="مثال: C++، Python، Java"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary text-sm"
                  />
                  <datalist id="subjects-list">
                    <option value="C++" />
                    <option value="Python" />
                    <option value="Java" />
                    <option value="HTML & CSS" />
                    <option value="JavaScript" />
                    <option value="Scratch" />
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">ترتيب العرض</label>
                  <input
                    type="number"
                    required
                    value={curriculumForm.order}
                    onChange={(e) => setCurriculumForm({ ...curriculumForm, order: Number(e.target.value) })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary text-sm"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">عنوان الدرس</label>
                  <input
                    type="text"
                    required
                    value={curriculumForm.title}
                    onChange={(e) => setCurriculumForm({ ...curriculumForm, title: e.target.value })}
                    placeholder="مثال: الدرس الأول: المتغيرات وأنواع البيانات"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary text-sm"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">الوصف (اختياري)</label>
                  <textarea
                    value={curriculumForm.description}
                    onChange={(e) => setCurriculumForm({ ...curriculumForm, description: e.target.value })}
                    placeholder="اكتب وصفاً أو ملاحظات إضافية حول هذا الدرس..."
                    rows={3}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary text-sm resize-none"
                  />
                </div>

                <div className="md:col-span-2 space-y-4">
                  <label className="block text-xs font-semibold text-muted-foreground">صور/صفحات الدرس (10 خانات صور مرقمة)</label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto p-2 border border-border/40 rounded-2xl bg-background/20">
                    {Array.from({ length: 10 }).map((_, idx) => {
                      const currentUrl = curriculumForm.images[idx] || "";
                      return (
                        <div key={idx} className="bg-slate-900/60 border border-border/50 rounded-xl p-3 space-y-2 relative">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-primary">شريحة {idx + 1}</span>
                            {currentUrl && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newImages = [...curriculumForm.images];
                                  newImages[idx] = "";
                                  setCurriculumForm({ ...curriculumForm, images: newImages });
                                }}
                                className="text-[10px] text-red-400 hover:text-red-300 font-semibold"
                              >
                                حذف الصورة
                              </button>
                            )}
                          </div>

                          <div className="aspect-[4/3] w-full bg-slate-950 rounded-lg overflow-hidden border border-border/40 flex items-center justify-center relative">
                            {currentUrl ? (
                              <img src={currentUrl} alt={`Slide ${idx + 1}`} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[10px] text-slate-500">فارغة</span>
                            )}
                            {uploadingSlotIndex === idx && (
                              <div className="absolute inset-0 bg-black/80 flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                <span className="text-[10px] text-white">جاري الرفع...</span>
                              </div>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <div className="relative">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleSlotImageUpload(e, idx)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                disabled={uploadingSlotIndex !== null}
                              />
                              <button
                                type="button"
                                className="w-full bg-[#121A27] hover:bg-slate-800 text-foreground border border-border rounded-lg py-1.5 text-[10px] font-medium transition-all"
                              >
                                تحميل صورة
                              </button>
                            </div>
                            
                            <input
                              type="text"
                              value={currentUrl}
                              onChange={(e) => {
                                const newImages = [...curriculumForm.images];
                                newImages[idx] = e.target.value;
                                setCurriculumForm({ ...curriculumForm, images: newImages });
                              }}
                              placeholder="أو اكتب رابط الصورة هنا..."
                              className="w-full bg-background border border-border rounded-lg px-2.5 py-1 text-white text-[10px] focus:outline-none focus:border-primary"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 justify-end border-t border-border pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsCurriculumModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-foreground/80 rounded-xl text-xs transition-colors border border-slate-700/50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={createCurriculumMutation.isPending || updateCurriculumMutation.isPending}
                  className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs transition-colors shadow-lg shadow-primary/10 flex items-center gap-1.5"
                >
                  {(createCurriculumMutation.isPending || updateCurriculumMutation.isPending) && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  حفظ البيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Video Modal Form */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-md"
            onClick={() => setIsVideoModalOpen(false)}
          />
          <div className="bg-card border border-border w-full max-w-2xl rounded-3xl p-6 relative z-10 max-h-[90vh] overflow-y-auto shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-lg font-bold text-white">
                {videoModalMode === "edit" ? "تعديل الفيديو / القائمة" : "إضافة فيديو أو قائمة يوتيوب"}
              </h3>
              <button
                onClick={() => setIsVideoModalOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-muted-foreground hover:text-foreground/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleVideoSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">التصنيف</label>
                  <input
                    type="text"
                    required
                    list="video-categories"
                    value={videoForm.category}
                    onChange={(e) => setVideoForm({ ...videoForm, category: e.target.value })}
                    placeholder="مثال: سي بلس بلس C++، هياكل البيانات"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary text-sm"
                  />
                  <datalist id="video-categories">
                    <option value="سي بلس بلس C++" />
                    <option value="هياكل البيانات Data Structures" />
                    <option value="برمجة ثانوية عامة" />
                    <option value="برمجة للمبتدئين" />
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">نوع المحتوى</label>
                  <select
                    value={videoForm.type}
                    onChange={(e) => setVideoForm({ ...videoForm, type: e.target.value as "video" | "playlist" })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary text-sm"
                  >
                    <option value="video">فيديو منفرد</option>
                    <option value="playlist">قائمة تشغيل كاملة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">الترتيب</label>
                  <input
                    type="number"
                    required
                    value={videoForm.order}
                    onChange={(e) => setVideoForm({ ...videoForm, order: Number(e.target.value) })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary text-sm"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">رابط يوتيوب (URL)</label>
                  <input
                    type="url"
                    required
                    value={videoForm.youtubeUrl}
                    onChange={(e) => setVideoForm({ ...videoForm, youtubeUrl: e.target.value })}
                    placeholder="مثال: https://www.youtube.com/watch?v=... أو https://www.youtube.com/playlist?list=..."
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary text-sm text-left"
                    dir="ltr"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">العنوان</label>
                  <input
                    type="text"
                    required
                    value={videoForm.title}
                    onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                    placeholder="مثال: أساسيات لغة C++ ومفهوم المتغيرات"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary text-sm"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">الوصف (اختياري)</label>
                  <textarea
                    value={videoForm.description}
                    onChange={(e) => setVideoForm({ ...videoForm, description: e.target.value })}
                    placeholder="اكتب وصفاً مختصراً لمحتوى هذا الفيديو أو قائمة التشغيل..."
                    rows={3}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary text-sm resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2 md:col-span-2">
                  <input
                    type="checkbox"
                    id="isProtected"
                    checked={videoForm.isProtected}
                    onChange={(e) => setVideoForm({ ...videoForm, isProtected: e.target.checked })}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-2 bg-background"
                  />
                  <label htmlFor="isProtected" className="text-xs font-semibold text-white cursor-pointer select-none">
                    تشفير وحماية هذا الفيديو (يطلب كود تفعيل للمشاهدة بعد أول فيديو مجاني)
                  </label>
                </div>

                {videoForm.isProtected && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">كود التفعيل لتشغيل الفيديو (Access Key)</label>
                    <input
                      type="text"
                      required
                      value={videoForm.accessKey}
                      onChange={(e) => setVideoForm({ ...videoForm, accessKey: e.target.value })}
                      placeholder="مثال: CPP_COURSE_2026 أو KEY_XXXX"
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary text-sm"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      سيحتاج الطالب لإدخال هذا الكود لمرة واحدة لفك القفل عن الفيديو (وجميع الفيديوهات اللاحقة التي تستخدم نفس الكود).
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 justify-end border-t border-border pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsVideoModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-foreground/80 rounded-xl text-xs transition-colors border border-slate-700/50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={createVideoMutation.isPending || updateVideoMutation.isPending}
                  className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs transition-colors shadow-lg shadow-primary/10 flex items-center gap-1.5"
                >
                  {(createVideoMutation.isPending || updateVideoMutation.isPending) && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  حفظ البيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Video Preview Modal */}
      {previewVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
            onClick={() => setPreviewVideo(null)}
          />
          <div className="bg-[#090D16] border border-white/10 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl relative z-10 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-slate-950/30">
              <div className="space-y-0.5 max-w-[85%]">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                  معاينة: {previewVideo.type === "playlist" ? "قائمة تشغيل" : "فيديو منفرد"}
                </span>
                <h3 className="text-base font-bold text-white line-clamp-1">{previewVideo.title}</h3>
              </div>
              <button
                onClick={() => setPreviewVideo(null)}
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-foreground/70 hover:text-foreground transition-all border border-white/5"
              >
                ✕
              </button>
            </div>
            <div className="relative w-full aspect-video bg-black">
              {(() => {
                const vidId = getYouTubeVideoId(previewVideo.youtubeUrl);
                const playlistId = getYouTubePlaylistId(previewVideo.youtubeUrl);
                let embedUrl = "";
                if (previewVideo.type === "playlist" && playlistId) {
                  embedUrl = `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1&rel=0`;
                } else if (vidId) {
                  embedUrl = `https://www.youtube.com/embed/${vidId}?autoplay=1&rel=0`;
                }
                return embedUrl ? (
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={embedUrl}
                    title={previewVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                    <VideoIcon className="w-16 h-16 text-red-500 mb-2" />
                    <p className="text-muted-foreground text-sm">تعذر تحميل رابط معاينة الفيديو.</p>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
