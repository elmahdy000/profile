import { ParentsTab } from "./admin/dashboard/ParentsTab";
import { SubscriptionsTab } from "./admin/SubscriptionsTab";

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
  getListBookingsQueryKey,
  getListCoursesQueryKey,
  getListPodcastsQueryKey,
  getListCurriculumsQueryKey,
  getListVideosQueryKey,
} from "@workspace/api-client-react";
import type {
  Booking,
  Course,
  Podcast,
  Curriculum,
  Video,
} from "@workspace/api-client-react";
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
  ArrowDown,
  Video as VideoIcon,
  Upload,
  Play,
  Download,
  Users,
  FileText,
  HelpCircle,
  RefreshCw,
  Menu,
  Eye,
  EyeOff,
  ShieldCheck,
  Clock,
  CheckCircle2,
  GraduationCap,
  Phone,
  MessageCircle,
  BarChart3,
  ClipboardCheck,
  FileCheck2,
} from "lucide-react";
import { AdminSettings } from "./AdminSettings";
import { AdminLearning, type AdminLearningTab } from "./AdminLearning";
import { StudentAnalyticsTab } from "./admin/learning/StudentAnalyticsTab";
import { AdminSidebarNav } from "./admin/dashboard/AdminSidebarNav";
import { PodcastsTab } from "./admin/dashboard/PodcastsTab";
import { CoursesTab } from "./admin/dashboard/CoursesTab";
import { CurriculumsTab } from "./admin/dashboard/CurriculumsTab";
import { VideosTab } from "./admin/dashboard/VideosTab";
import { UploadVideoTab } from "./admin/dashboard/UploadVideoTab";
import { CourseModal } from "./admin/dashboard/CourseModal";
import { PodcastModal } from "./admin/dashboard/PodcastModal";
import { CurriculumModal } from "./admin/dashboard/CurriculumModal";
import { VideoModal } from "./admin/dashboard/VideoModal";
import { PreviewVideoModal } from "./admin/dashboard/PreviewVideoModal";
import { AdminLoginView } from "./admin/dashboard/AdminLoginView";
import { useToast } from "@/hooks/use-toast";
import {
  SidebarItem,
  StatusBadge,
  IconButton,
  PrimaryButton,
  SecondaryButton,
  DangerButton,
  PreviewButton,
  KPICard,
} from "@/components/ui/admin-ui";
import { ADMIN_TOKENS } from "@/lib/admin-design-tokens";
import { CascadingStageSelector } from "@/components/ui/CascadingStageSelector";
import {
  ACADEMIC_TRACKS,
  getStagesForTrack,
  resolveTrackId,
} from "@/data/academic";

const getYoutubeThumbnail = (url: string) => {
  try {
    if (!url) return "";
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
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
  useEffect(() => {
    const previousTitle = document.title;
    const robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const previousRobots = robots?.content;
    document.title = "لوحة إدارة المنصة | د. محمود المهدي";
    robots?.setAttribute("content", "noindex, nofollow");
    return () => {
      document.title = previousTitle;
      if (robots && previousRobots) robots.content = previousRobots;
    };
  }, []);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState("");
  const [activeTab, setActiveTab] = useState<
    | "courses"
    | "podcasts"
    | "curriculums"
    | "videos"
    | "upload-video"
    | "learning"
    | "student-analytics"
    | "subscriptions"
    | "parents"
    | "settings"
  >("learning");
  const [learningSubTab, setLearningSubTab] = useState<AdminLearningTab>("students");
  const [bookingFilter, setBookingFilter] = useState<"pending" | "confirmed" | "completed" | "all">("pending");
  const [selectedSubjectFilter, setSelectedSubjectFilter] =
    useState<string>("all");
  const [selectedVideoCategoryFilter, setSelectedVideoCategoryFilter] =
    useState<string>("all");
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [videoUploadStats, setVideoUploadStats] = useState<{
    loadedBytes: number;
    totalBytes: number;
    speedMBps: number;
    remainingSeconds: number;
  } | null>(null);
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [isVideoDragging, setIsVideoDragging] = useState(false);
  const [isThumbnailUploading, setIsThumbnailUploading] = useState(false);
  const [selectedVideoPreviewUrl, setSelectedVideoPreviewUrl] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);
  const [adminRole, setAdminRole] = useState<"superadmin" | "subadmin">("superadmin");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isMobileSidebarOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMobileSidebarOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isMobileSidebarOpen]);

  useEffect(() => {
    localStorage.removeItem("dr_mahmoud_admin_pwd");
    fetch("/api/admin/me", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) {
          setIsAuthenticated(false);
          return;
        }
        const data = await response.json();
        if (data.authenticated) {
          setIsAuthenticated(true);
          if (data.role) setAdminRole(data.role);
        } else {
          setIsAuthenticated(false);
        }
      })
      .catch(() => setIsAuthenticated(false))
      .finally(() => setIsInitializing(false));
  }, []);

  useEffect(() => {
    if (!selectedVideoFile) {
      setSelectedVideoPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(selectedVideoFile);
    setSelectedVideoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedVideoFile]);

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
      const response = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput }),
      });
      if (!response.ok) throw new Error("invalid password");
      const data = await response.json();
      if (data.role) setAdminRole(data.role);
      setAuthTokenGetter(null);
      setIsAuthenticated(true);
      setPasswordInput("");
      await queryClient.invalidateQueries();
    } catch (err: any) {
      setAuthError("كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى.");
      setAuthTokenGetter(null);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    await fetch("/api/admin/logout", {
      method: "POST",
      credentials: "include",
    }).catch(() => undefined);
    setAuthTokenGetter(null);
    setIsAuthenticated(false);
    setPasswordInput("");
    queryClient.clear();
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
    category: "baccalaureate",
    stages: [] as string[],
    isPublished: false,
    tags: "",
    img: "",
  });

  // Podcast Modal state & fields
  const [isPodcastModalOpen, setIsPodcastModalOpen] = useState(false);
  const [podcastModalMode, setPodcastModalMode] = useState<"add" | "edit">(
    "add",
  );
  const [selectedPodcastId, setSelectedPodcastId] = useState<number | null>(
    null,
  );
  const [podcastForm, setPodcastForm] = useState({
    title: "",
    desc: "",
    duration: "",
    youtubeUrl: "",
    audioUrl: "",
  });

  // Curriculum Modal state & fields
  const [isCurriculumModalOpen, setIsCurriculumModalOpen] = useState(false);
  const [curriculumModalMode, setCurriculumModalMode] = useState<
    "add" | "edit"
  >("add");
  const [selectedCurriculumId, setSelectedCurriculumId] = useState<
    number | null
  >(null);
  const [curriculumForm, setCurriculumForm] = useState({
    courseId: "",
    stage: "",
    subject: "C++",
    title: "",
    description: "",
    images: Array(10).fill("") as string[],
    order: 0,
  });
  const [uploadingSlotIndex, setUploadingSlotIndex] = useState<number | null>(
    null,
  );

  // Video Modal state & fields
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [videoModalMode, setVideoModalMode] = useState<"add" | "edit">("add");
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [videoForm, setVideoForm] = useState({
    courseId: "",
    stage: "أولى بكالوريا",
    stages: ["أولى بكالوريا"] as string[],
    learningMode: "online" as "online" | "offline" | "both",
    category: "سي بلس بلس C++",
    subject: "",
    tags: "",
    title: "",
    description: "",
    youtubeUrl: "",
    thumbnailUrl: "",
    type: "video" as "video" | "playlist",
    order: 1,
    isProtected: false,
    isPublished: true,
    accessKey: "",
    durationText: "",
    lessonsCount: "",
    level: "",
    attachmentFileIds: [] as string[],
    quizId: "",
  });
  const selectedVideoCourse = coursesQuery.data?.find(
    (course) => String(course.id) === videoForm.courseId,
  );
  const availableVideoStages = selectedVideoCourse?.stages?.length
    ? selectedVideoCourse.stages
    : getStagesForTrack(selectedVideoCourse?.category);

  const [learningFiles, setLearningFiles] = useState<
    {
      id: number;
      title: string;
      category: string;
      stage?: string | null;
      subject?: string | null;
      originalName?: string;
      sizeBytes?: number;
      mimeType?: string;
    }[]
  >([]);
  const [learningQuizzes, setLearningQuizzes] = useState<
    { id: number; title: string; courseId?: number | null; videoId?: number | null; scope?: string }[]
  >([]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchLinkedResources = async () => {
      try {
        const [filesRes, quizzesRes] = await Promise.all([
          fetch("/api/admin/learning/files", { credentials: "include" }).then(
            (r) => r.json(),
          ),
          fetch("/api/admin/learning/quizzes", { credentials: "include" }).then(
            (r) => r.json(),
          ),
        ]);
        if (Array.isArray(filesRes)) setLearningFiles(filesRes);
        if (Array.isArray(quizzesRes)) setLearningQuizzes(quizzesRes);
      } catch (err) {
        // silently fail — resources will load on next tab switch
      }
    };
    fetchLinkedResources();
  }, [isAuthenticated, activeTab]); // reload when activeTab changes, e.g. if they upload files and switch back to videos
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

  const getNextLessonNumber = (
    category: string,
    learningMode: "online" | "offline" | "both",
    stages: string[] = [],
  ) => {
    const matching = (videosQuery.data || []).filter(
      (video) =>
        video.category.trim().toLowerCase() === category.trim().toLowerCase() &&
        (video.learningMode || "online") === learningMode &&
        (stages.length === 0 || (video.stages || (video.stage ? [video.stage] : [])).some((stage) => stages.includes(stage))),
    );
    return (
      Math.max(0, ...matching.map((video) => Number(video.order) || 0)) + 1
    );
  };

  const useLatestLessonSettings = () => {
    const latest = [...(videosQuery.data || [])].sort((a, b) => b.id - a.id)[0];
    if (!latest) return;
    const learningMode = latest.learningMode || "online";
    setVideoForm((current) => ({
      ...current,
      courseId: latest.courseId != null ? String(latest.courseId) : "",
      stage: latest.stage || "أولى بكالوريا",
      stages: latest.stages?.length
        ? latest.stages
        : latest.stage
          ? [latest.stage]
          : ["أولى بكالوريا"],
      category: latest.category,
      subject: latest.subject || "",
      learningMode,
      type: latest.type as "video" | "playlist",
      order: getNextLessonNumber(latest.category, learningMode),
      isProtected: latest.isProtected,
      accessKey: latest.accessKey || "",
      level: latest.level || "",
      title: "",
      description: "",
      youtubeUrl: "",
      thumbnailUrl: "",
      tags: "",
      attachmentFileIds: [],
      quizId: "",
    }));
    setSelectedVideoFile(null);
    toast({
      variant: "success",
      title: "تم تجهيز الدرس التالي",
      description: "راجع اسم الدرس ورقمه وارفع الفيديو.",
    });
  };

  // Open Video Modal
  const openVideoModal = (mode: "add" | "edit", video?: Video) => {
    setVideoModalMode(mode);
    if (mode === "edit" && video) {
      setSelectedVideoId(video.id);
      setVideoForm({
        courseId: video.courseId != null ? String(video.courseId) : "",
        stage: video.stage || "",
        stages: video.stages?.length
          ? video.stages
          : video.stage
            ? [video.stage]
            : [],
        learningMode: video.learningMode || "online",
        category: video.category,
        subject: video.subject || "",
        tags: (video.tags || []).join(", "),
        title: video.title,
        description: video.description || "",
        youtubeUrl: video.youtubeUrl,
        thumbnailUrl: (video as any).thumbnailUrl || "",
        type: video.type as "video" | "playlist",
        order: video.order,
        isProtected: (video as any).isProtected ?? false,
        isPublished: (video as any).isPublished ?? true,
        accessKey: (video as any).accessKey || "",
        durationText: (video as any).durationText || "",
        lessonsCount:
          (video as any).lessonsCount != null
            ? String((video as any).lessonsCount)
            : "",
        level: (video as any).level || "",
        attachmentFileIds:
          Array.isArray((video as any).attachments) &&
          (video as any).attachments.length
            ? (video as any).attachments.map((file: any) => String(file.id))
            : (video as any).pdfFileId != null
              ? [String((video as any).pdfFileId)]
              : [],
        quizId:
          (video as any).quizId != null ? String((video as any).quizId) : "",
      });
    } else {
      const defaultCourse = coursesQuery.data?.[0];
      const defaultCategory = defaultCourse?.title || "";
      const defaultLearningMode = "online" as const;
      setSelectedVideoId(null);
      setVideoForm({
        courseId: defaultCourse ? String(defaultCourse.id) : "",
        stage: "",
        stages: [],
        learningMode: defaultLearningMode,
        category: defaultCategory,
        subject: "",
        tags: "",
        title: "",
        description: "",
        youtubeUrl: "",
        thumbnailUrl: "",
        type: "video",
        order: getNextLessonNumber(defaultCategory, defaultLearningMode),
        isProtected: false,
        isPublished: true,
        accessKey: "",
        durationText: "",
        lessonsCount: "",
        level: "",
        attachmentFileIds: [],
        quizId: "",
      });
    }
    setSelectedVideoFile(null);
    setIsVideoModalOpen(true);
    setActiveTab("upload-video");
  };

  // Open Curriculum Modal
  const openCurriculumModal = (
    mode: "add" | "edit",
    curriculum?: Curriculum,
  ) => {
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
        courseId: curriculum.courseId != null ? String(curriculum.courseId) : "",
        stage: curriculum.stage || "",
        subject: curriculum.subject,
        title: curriculum.title,
        description: curriculum.description || "",
        images: paddedImages,
        order: curriculum.order,
      });
    } else {
      setSelectedCurriculumId(null);
      setCurriculumForm({
        courseId: "",
        stage: "",
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
        stages: course.stages || [],
        isPublished: course.isPublished,
        tags: course.tags.join(", "),
        img: course.img,
      });
    } else {
      setSelectedCourseId(null);
      setCourseForm({
        title: "",
        age: "",
        duration: "",
        sessions: "",
        level: "",
        category: "baccalaureate",
        stages: [],
        isPublished: false,
        tags: "",
        img: "",
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
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({ title: "صورة غير مدعومة", description: "استخدم JPG أو PNG أو WebP.", variant: "destructive" });
      return;
    }

    setIsUploadingImage(true);
    let uploadFile = file;
    try {
      const image = await createImageBitmap(file);
      const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      context?.drawImage(image, 0, 0, canvas.width, canvas.height);
      image.close();
      const blob = context
        ? await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.9))
        : null;
      if (blob && blob.size < file.size) {
        uploadFile = new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" });
      }
    } catch {
      // Keep the original image when the browser cannot optimize it.
    }
    const formData = new FormData();
    formData.append("image", uploadFile);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const data = await response.json();
      if (data.url) {
        setCourseForm((prev) => ({ ...prev, img: data.url }));
        toast({ variant: "success", title: "تم تجهيز صورة الكورس", description: uploadFile.size < file.size ? "تم ضغط الصورة مع الحفاظ على الجودة." : "تم رفع الصورة بنجاح." });
      }
    } catch (err) {
      toast({
        title: "خطأ",
        description:
          "حدث خطأ أثناء تحميل الصورة. يرجى التأكد من أن الملف صورة وأقل من 5 ميجابايت.",
        variant: "destructive",
      });
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
        credentials: "include",
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
      toast({
        title: "خطأ",
        description:
          err.message ||
          "حدث خطأ أثناء تحميل الملف الصوتي. يرجى التأكد من أن الملف بصيغة صوتية مناسبة (مثل MP3) وبحجم أقل من 150 ميجابايت.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAudio(false);
    }
  };

  // Submit Course Form
  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseForm.title.trim()) return;
    if (courseForm.isPublished && (!courseForm.img || courseForm.stages.length === 0)) {
      toast({
        title: "الكورس غير جاهز للنشر",
        description: "اختر مرحلة واحدة على الأقل وأضف صورة غلاف، أو احفظه كمسودة.",
        variant: "warning",
      });
      return;
    }
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
      stages: courseForm.stages,
      isPublished: courseForm.isPublished,
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
      toast({
        variant: "success",
        title: "تم",
        description:
          courseModalMode === "edit"
            ? "تم تحديث الكورس بنجاح"
            : "تم إضافة الكورس بنجاح",
      });
    } catch (err) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ الكورس",
        variant: "destructive",
      });
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
      toast({
        variant: "success",
        title: "تم",
        description:
          podcastModalMode === "edit"
            ? "تم تحديث الحلقة بنجاح"
            : "تم إضافة الحلقة بنجاح",
      });
    } catch (err) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ الحلقة",
        variant: "destructive",
      });
    }
  };

  // Submit Curriculum Form
  const handleCurriculumSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Filter out empty slots
    const filteredImages = curriculumForm.images.filter(
      (img) => img && img.trim() !== "",
    );
    if (filteredImages.length === 0) {
      toast({
        title: "تنبيه",
        description: "يرجى إضافة صورة واحدة على الأقل للدرس",
        variant: "warning",
      });
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
      toast({
        variant: "success",
        title: "تم",
        description:
          curriculumModalMode === "edit"
            ? "تم تحديث الدرس بنجاح"
            : "تم إضافة الدرس بنجاح",
      });
    } catch (err) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ الدرس",
        variant: "destructive",
      });
    }
  };

  // Upload image for a specific slot index (0-9)
  const handleSlotImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    idx: number,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingSlotIndex(idx);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
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
      toast({
        title: "خطأ",
        description: `حدث خطأ أثناء تحميل الصورة ${file.name}`,
        variant: "destructive",
      });
    } finally {
      setUploadingSlotIndex(null);
    }
  };

  const handleCurriculumDelete = async (id: number) => {
    try {
      await deleteCurriculumMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListCurriculumsQueryKey() });
      toast({
        variant: "success",
        title: "تم",
        description: "تم حذف الدرس بنجاح",
      });
    } catch (err) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف الدرس",
        variant: "destructive",
      });
    }
  };

  const handleThumbnailImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "حجم الصورة كبير",
        description: "الحد الأقصى لصورة الغلاف 10 MB.",
      });
      e.target.value = "";
      return;
    }
    setIsThumbnailUploading(true);
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setVideoForm((prev) => ({ ...prev, thumbnailUrl: data.url }));
        toast({
          variant: "success",
          title: "تم رفع صورة الغلاف بنجاح",
        });
      } else {
        throw new Error(data.error || "فشل رفع الصورة");
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "خطأ في رفع الصورة",
        description: err.message || "حدث خطأ أثناء رفع غلاف الفيديو.",
      });
    } finally {
      setIsThumbnailUploading(false);
      e.target.value = "";
    }
  };

  const selectVideoFile = (file: File | null) => {
    setIsVideoDragging(false);
    if (file && !["video/mp4", "video/webm", "video/quicktime", "video/ogg"].includes(file.type)) {
      toast({ variant: "destructive", title: "صيغة الفيديو غير مدعومة", description: "استخدم MP4 أو WebM أو MOV أو OGG." });
      return;
    }
    if (file && file.size > 1024 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "حجم الفيديو كبير",
        description: "الحد الأقصى 1 GB. حوّل الفيديو إلى MP4 (H.264) بجودة 1080p أو 720p قبل الرفع.",
      });
      return;
    }
    setSelectedVideoFile(file);
    if (file) setVideoForm((current) => ({ ...current, youtubeUrl: "" }));
  };

  const handleVideoFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    selectVideoFile(e.target.files?.[0] ?? null);
    e.target.value = "";
  };

  const uploadSelectedVideo = async (): Promise<string | null> => {
    const file = selectedVideoFile;
    if (!file) return null;

    setIsVideoUploading(true);
    setVideoUploadProgress(0);
    setVideoUploadStats({
      loadedBytes: 0,
      totalBytes: file.size,
      speedMBps: 0,
      remainingSeconds: 0,
    });

    const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB per chunk
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const resumeKey = `video_upload_${file.name}_${file.size}_${file.lastModified}`;
    const startTime = Date.now();

    try {
      let uploadId = localStorage.getItem(resumeKey);
      let uploadedChunkSet = new Set<number>();

      // 1. Try to resume existing session if available
      if (uploadId) {
        try {
          const statusRes = await fetch(`/api/upload/video/status/${uploadId}`, {
            credentials: "include",
          });
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (Array.isArray(statusData.uploadedChunks)) {
              uploadedChunkSet = new Set(statusData.uploadedChunks);
            }
          } else {
            uploadId = null;
          }
        } catch {
          uploadId = null;
        }
      }

      // 2. Initialize new upload session if not resuming
      if (!uploadId) {
        const initRes = await fetch("/api/upload/video/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            filename: file.name,
            fileSize: file.size,
            totalChunks,
          }),
        });

        if (!initRes.ok) {
          throw new Error("تعذر بدء جلسة رفع الفيديو المقسم");
        }

        const initData = await initRes.json();
        uploadId = initData.uploadId;
        if (!uploadId) throw new Error("تعذر الحصول على معرّف رفع الفيديو");
        localStorage.setItem(resumeKey, uploadId);
      }

      let totalUploadedBytes = Array.from(uploadedChunkSet).reduce((sum, chunkIdx) => {
        const start = chunkIdx * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        return sum + (end - start);
      }, 0);

      // 3. Upload chunks sequentially with auto-retry
      for (let i = 0; i < totalChunks; i++) {
        if (uploadedChunkSet.has(i)) continue;

        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunkBlob = file.slice(start, end);
        const chunkSize = end - start;

        let retries = 0;
        let success = false;

        while (retries < 5 && !success) {
          try {
            await new Promise<void>((resolve, reject) => {
              const formData = new FormData();
              formData.append("uploadId", uploadId!);
              formData.append("chunkIndex", String(i));
              formData.append("chunk", chunkBlob, `chunk-${i}`);

              const req = new XMLHttpRequest();
              req.open("POST", "/api/upload/video/chunk");
              req.withCredentials = true;
              req.timeout = 5 * 60 * 1000;

              req.upload.onprogress = (evt) => {
                if (evt.lengthComputable) {
                  const currentTotalLoaded = totalUploadedBytes + evt.loaded;
                  const percent = Math.min(99, Math.round((currentTotalLoaded / file.size) * 100));
                  setVideoUploadProgress(percent);

                  const elapsedSec = (Date.now() - startTime) / 1000;
                  const speedBytesPerSec = elapsedSec > 0 ? currentTotalLoaded / elapsedSec : 0;
                  const speedMBps = Number((speedBytesPerSec / (1024 * 1024)).toFixed(2));
                  const remainingBytes = file.size - currentTotalLoaded;
                  const remainingSeconds = speedBytesPerSec > 0 ? Math.ceil(remainingBytes / speedBytesPerSec) : 0;

                  setVideoUploadStats({
                    loadedBytes: currentTotalLoaded,
                    totalBytes: file.size,
                    speedMBps,
                    remainingSeconds,
                  });
                }
              };

              req.onload = () => {
                if (req.status >= 200 && req.status < 300) resolve();
                else reject(new Error(`Chunk ${i} upload failed (status ${req.status})`));
              };
              req.onerror = () => reject(new Error("انقطع الاتصال أثناء رفع جزء الفيديو"));
              req.ontimeout = () => reject(new Error("انتهت مهلة جزء الفيديو"));

              req.send(formData);
            });

            success = true;
            totalUploadedBytes += chunkSize;
            uploadedChunkSet.add(i);
          } catch (err) {
            retries++;
            if (retries >= 5) {
              throw err;
            }
            await new Promise((r) => setTimeout(r, 1500));
          }
        }
      }

      // 4. Finish and assemble chunks
      setVideoUploadProgress(99);
      const finishRes = await fetch("/api/upload/video/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ uploadId }),
      });

      if (!finishRes.ok) {
        const errData = await finishRes.json().catch(() => ({}));
        throw new Error(errData.error || "تعذر تجميع أجزاء الفيديو على الخادم");
      }

      const finishData = await finishRes.json();
      localStorage.removeItem(resumeKey);

      setVideoUploadProgress(100);
      setVideoUploadStats({
        loadedBytes: file.size,
        totalBytes: file.size,
        speedMBps: 0,
        remainingSeconds: 0,
      });

      if (finishData.url) {
        const uploadedUrl = finishData.url;
        setVideoForm((prev) => ({
          ...prev,
          youtubeUrl: uploadedUrl,
        }));
        setSelectedVideoFile(null);
        toast({
          variant: "success",
          title: "تم رفع الفيديو بنجاح 🎬",
          description: "تمت معالجة وتجميع أجزاء الفيديو بنجاح. راجع البيانات واضغط حفظ الفيديو.",
        });
        return String(uploadedUrl);
      }
      return null;
    } catch (err) {
      toast({
        title: "تعذر رفع الفيديو",
        description: err instanceof Error ? err.message : `حدث خطأ أثناء تحميل الفيديو ${file.name}`,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsVideoUploading(false);
      setVideoUploadProgress(0);
      setVideoUploadStats(null);
    }
  };

  const handleVideoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const missingVideoFields = [
      !videoForm.title.trim() && "اسم الدرس",
      !videoForm.courseId && "الكورس",
      videoForm.stages.length === 0 && "المرحلة",
      videoForm.type === "playlist" && videoForm.order < 1 && "رقم الدرس في قائمة التشغيل",
    ].filter(Boolean) as string[];
    if (missingVideoFields.length > 0) {
      toast({
        title: "بيانات رفع الفيديو ناقصة",
        description: `أكمل: ${missingVideoFields.join("، ")}.`,
        variant: "warning",
      });
      return;
    }
    const duplicateNumber = (videosQuery.data || []).find(
      (video) =>
        video.id !== selectedVideoId &&
        ((video.courseId != null &&
          String(video.courseId) === videoForm.courseId) ||
          video.category.trim().toLowerCase() ===
            videoForm.category.trim().toLowerCase()) &&
        (video.learningMode || "online") === videoForm.learningMode &&
        (video.stages || (video.stage ? [video.stage] : [])).some((stage) =>
          videoForm.stages.includes(stage),
        ) &&
        video.order === Number(videoForm.order),
    );
    if (duplicateNumber) {
      toast({
        title: "رقم الدرس مستخدم",
        description: `الدرس «${duplicateNumber.title}» واخد الرقم ده. اضغط اقترح التالي.`,
        variant: "warning",
      });
      return;
    }

    let videoSource = videoForm.youtubeUrl.trim();
    if (!videoSource && selectedVideoFile) {
      videoSource = (await uploadSelectedVideo()) || "";
    }
    if (!videoSource) {
      toast({
        title: "مصدر الفيديو مطلوب",
        description:
          "ارفع ملف فيديو من جهازك، أو اكتب رابط يوتيوب أو رابط خارجي.",
        variant: "warning",
      });
      return;
    }

    const payload = {
      courseId: Number(videoForm.courseId),
      category: videoForm.category,
      stage: videoForm.stages[0] || undefined,
      stages: videoForm.stages,
      learningMode: videoForm.learningMode,
      subject: videoForm.subject || undefined,
      tags: videoForm.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      title: videoForm.title,
      description: videoForm.description || undefined,
      youtubeUrl: videoSource,
      thumbnailUrl: videoForm.thumbnailUrl || undefined,
      type: videoForm.type,
      order: Number(videoForm.order),
      isProtected: videoForm.isProtected,
      isPublished: videoForm.isPublished,
      accessKey: videoForm.isProtected
        ? videoForm.accessKey || undefined
        : undefined,
      durationText: videoForm.durationText || undefined,
      lessonsCount: videoForm.lessonsCount
        ? Number(videoForm.lessonsCount)
        : undefined,
      level: videoForm.level || undefined,
      attachmentFileIds: videoForm.attachmentFileIds.map(Number),
      pdfFileId: videoForm.attachmentFileIds.length
        ? Number(videoForm.attachmentFileIds[0])
        : null,
      quizId: videoForm.quizId ? Number(videoForm.quizId) : null,
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
      toast({
        variant: "success",
        title: "تم",
        description:
          videoModalMode === "edit"
            ? "تم تحديث الفيديو بنجاح"
            : "تم إضافة الفيديو بنجاح",
      });
    } catch (err) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ الفيديو",
        variant: "destructive",
      });
    }
  };

  const handleVideoDelete = async (id: number) => {
    try {
      await deleteVideoMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListVideosQueryKey() });
      toast({
        variant: "success",
        title: "تم",
        description: "تم حذف الفيديو بنجاح",
      });
    } catch (err) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف الفيديو",
        variant: "destructive",
      });
    }
  };

  // Delete handlers
  const handleCourseDelete = async (id: number) => {
    try {
      await deleteCourseMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey() });
      toast({
        variant: "success",
        title: "تم",
        description: "تم حذف الكورس بنجاح",
      });
    } catch (err) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف الكورس",
        variant: "destructive",
      });
    }
  };

  const handlePodcastDelete = async (id: number) => {
    try {
      await deletePodcastMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListPodcastsQueryKey() });
      toast({
        variant: "success",
        title: "تم",
        description: "تم حذف الحلقة بنجاح",
      });
    } catch (err) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف الحلقة",
        variant: "destructive",
      });
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
      toast({
        variant: "success",
        title: "تم",
        description: "تم تحديث حالة الحجز بنجاح",
      });
    } catch (err) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث حالة الحجز",
        variant: "destructive",
      });
    }
  };

  const handleBookingDelete = async (id: number) => {
    try {
      await deleteBookingMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
      toast({
        variant: "success",
        title: "تم",
        description: "تم حذف الحجز بنجاح",
      });
    } catch (err) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف الحجز",
        variant: "destructive",
      });
    }
  };

  const handleExportCSV = () => {
    if (!bookingsQuery.data || bookingsQuery.data.length === 0) return;
    const headers = [
      "ID",
      "الاسم",
      "رقم الهاتف",
      "تفاصيل الرسالة",
      "الحالة",
      "تاريخ الطلب",
    ];
    const rows = bookingsQuery.data.map((b) => [
      b.id,
      b.name,
      b.phone,
      b.message.replace(/\n/g, " | "),
      b.status === "confirmed"
        ? "مؤكد"
        : b.status === "completed"
          ? "مكتمل"
          : "قيد الانتظار",
      new Date(b.createdAt).toLocaleString("ar-EG"),
    ]);
    const csvContent =
      "\uFEFF" +
      [
        headers.join(","),
        ...rows.map((e) =>
          e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","),
        ),
      ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `bookings_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Show spinner during session hydration from localstorage
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Render Login view if not authenticated
  if (!isAuthenticated) {
    return (
      <AdminLoginView
        passwordInput={passwordInput}
        setPasswordInput={setPasswordInput}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        isLoggingIn={isLoggingIn}
        authError={authError}
        setAuthError={setAuthError}
        onSubmit={handleLogin}
      />
    );
  }

  return (
    <div className="admin-dashboard-shell min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-900 dark:text-[#F8FAFC] dir-rtl flex flex-col lg:flex-row">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-white px-4 py-3 shadow-sm lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:border-primary hover:text-primary"
              aria-label="فتح قائمة الإدارة"
              aria-expanded={isMobileSidebarOpen}
              aria-controls="admin-mobile-sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-primary">
              <Lock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-foreground sm:text-xl">
                لوحة تحكم د. محمود المهدي
              </h1>
              <p className="hidden text-xs text-muted-foreground sm:block">
                إدارة محتوى الكورسات، البودكاست والحجوزات
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
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

      <AdminSidebarNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        learningSubTab={learningSubTab}
        setLearningSubTab={setLearningSubTab}
        isMobileSidebarOpen={isMobileSidebarOpen}
        setIsMobileSidebarOpen={setIsMobileSidebarOpen}
        openVideoModal={openVideoModal}
        handleLogout={handleLogout}
        bookingsCount={
          bookingsQuery.data &&
          bookingsQuery.data.filter((b) => b.status === "pending").length > 0
            ? bookingsQuery.data.filter((b) => b.status === "pending").length
            : bookingsQuery.data?.length || undefined
        }
        coursesCount={coursesQuery.data?.length}
        podcastsCount={podcastsQuery.data?.length}
        curriculumsCount={curriculumsQuery.data?.length}
        videosCount={videosQuery.data?.length}
        adminRole={adminRole}
      />

      <main className="flex-1 min-w-0 min-h-screen px-4 py-6 md:px-8 lg:px-10 lg:py-8">
        <div className="w-full max-w-[1400px] mx-auto">

            {/* Top Desktop Executive Header */}
            <div className="hidden lg:flex items-center justify-between gap-4 mb-6 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0B63CE] text-white flex items-center justify-center font-black text-sm shadow-sm">
                  د.م
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-black text-slate-900">أكاديمية د. محمود المهدي</h2>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> السيرفر نشط
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">لوحة التحكم التنفيذية وإدارة محتوى الأكاديمية</p>
                </div>
              </div>

              {/* Action shortcuts */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openCourseModal("add")}
                  className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0B63CE] text-xs font-bold transition-all flex items-center gap-1.5 border border-blue-200/60"
                >
                  <Plus className="w-3.5 h-3.5" /> كورس جديد
                </button>
                <button
                  type="button"
                  onClick={() => {
                    openVideoModal("add");
                    setActiveTab("upload-video");
                  }}
                  className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-all flex items-center gap-1.5 border border-emerald-200/60"
                >
                  <Upload className="w-3.5 h-3.5" /> رفع فيديو
                </button>
                <button
                  type="button"
                  onClick={() => openPodcastModal("add")}
                  className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-all flex items-center gap-1.5 border border-purple-200/60"
                >
                  <Mic className="w-3.5 h-3.5" /> بودكاست
                </button>
                <a
                  href="/"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-200"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> الموقع
                </a>
              </div>
            </div>

            <div key={activeTab} className="animate-[fadeIn_0.2s_ease-in-out]">
              {activeTab === "courses" && (
                <CoursesTab
                  coursesQuery={coursesQuery}
                  openCourseModal={openCourseModal}
                  handleCourseDelete={handleCourseDelete}
                />
              )}

              {activeTab === "podcasts" && (
                <PodcastsTab
                  podcastsQuery={podcastsQuery}
                  openPodcastModal={openPodcastModal}
                  handlePodcastDelete={handlePodcastDelete}
                />
              )}

              {activeTab === "curriculums" && (
                <CurriculumsTab
                  curriculumsQuery={curriculumsQuery}
                  selectedSubjectFilter={selectedSubjectFilter}
                  setSelectedSubjectFilter={setSelectedSubjectFilter}
                  openCurriculumModal={openCurriculumModal}
                  handleCurriculumDelete={handleCurriculumDelete}
                />
              )}

              {activeTab === "videos" && (
                <VideosTab
                  videosQuery={videosQuery}
                  selectedVideoCategoryFilter={selectedVideoCategoryFilter}
                  setSelectedVideoCategoryFilter={setSelectedVideoCategoryFilter}
                  openVideoModal={openVideoModal}
                  handleVideoDelete={handleVideoDelete}
                  setPreviewVideo={setPreviewVideo}
                  getYoutubeThumbnail={getYoutubeThumbnail}
                />
              )}

              {activeTab === "upload-video" && (
                <UploadVideoTab
                  videoForm={videoForm}
                  setVideoForm={setVideoForm}
                  handleVideoSubmit={handleVideoSubmit}
                  selectedVideoFile={selectedVideoFile}
                  setSelectedVideoFile={setSelectedVideoFile}
                  isVideoDragging={isVideoDragging}
                  setIsVideoDragging={setIsVideoDragging}
                  selectVideoFile={selectVideoFile}
                  handleVideoFileSelection={handleVideoFileSelection}
                  isVideoUploading={isVideoUploading}
                  videoUploadProgress={videoUploadProgress}
                  videoUploadStats={videoUploadStats}
                  isThumbnailUploading={isThumbnailUploading}
                  handleThumbnailImageUpload={handleThumbnailImageUpload}
                  getNextLessonNumber={getNextLessonNumber}
                  coursesQuery={coursesQuery}
                  learningFiles={learningFiles}
                  createVideoMutation={createVideoMutation}
                  updateVideoMutation={updateVideoMutation}
                  setActiveTab={setActiveTab}
                />
              )}

              {activeTab === "settings" && <AdminSettings role={adminRole} />}
              {activeTab === "learning" && <AdminLearning role={adminRole} initialTab={learningSubTab} />}
              {activeTab === "student-analytics" && <StudentAnalyticsTab />}
              {activeTab === "subscriptions" && <SubscriptionsTab />}
              {activeTab === "parents" && <ParentsTab role={adminRole} />}
            </div>
          </div>
        </main>

      <CourseModal
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        mode={courseModalMode}
        form={courseForm}
        setForm={setCourseForm}
        onSubmit={handleCourseSubmit}
        isUploadingImage={isUploadingImage}
        handleImageUpload={handleImageUpload}
        createMutation={createCourseMutation}
        updateMutation={updateCourseMutation}
      />

      <PodcastModal
        isOpen={isPodcastModalOpen}
        onClose={() => setIsPodcastModalOpen(false)}
        mode={podcastModalMode}
        form={podcastForm}
        setForm={setPodcastForm}
        onSubmit={handlePodcastSubmit}
        isUploadingAudio={isUploadingAudio}
        handleAudioUpload={handleAudioUpload}
        createMutation={createPodcastMutation}
        updateMutation={updatePodcastMutation}
      />

      <CurriculumModal
        isOpen={isCurriculumModalOpen}
        onClose={() => setIsCurriculumModalOpen(false)}
        mode={curriculumModalMode}
        form={curriculumForm}
        setForm={setCurriculumForm}
        onSubmit={handleCurriculumSubmit}
        uploadingSlotIndex={uploadingSlotIndex}
        handleSlotImageUpload={handleSlotImageUpload}
        createMutation={createCurriculumMutation}
        updateMutation={updateCurriculumMutation}
      />

      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        mode={videoModalMode}
        form={videoForm}
        setForm={setVideoForm}
        onSubmit={handleVideoSubmit}
        videosQuery={videosQuery}
        useLatestLessonSettings={useLatestLessonSettings}
        getNextLessonNumber={getNextLessonNumber}
        coursesQuery={coursesQuery}
        learningFiles={learningFiles}
        learningQuizzes={learningQuizzes}
        selectedVideoId={selectedVideoId}
        isThumbnailUploading={isThumbnailUploading}
        handleThumbnailImageUpload={handleThumbnailImageUpload}
        isVideoUploading={isVideoUploading}
        videoUploadProgress={videoUploadProgress}
        videoUploadStats={videoUploadStats}
        selectedVideoFile={selectedVideoFile}
        setSelectedVideoFile={setSelectedVideoFile}
        selectedVideoPreviewUrl={selectedVideoPreviewUrl}
        uploadSelectedVideo={uploadSelectedVideo}
        handleVideoFileSelection={handleVideoFileSelection}
        createMutation={createVideoMutation}
        updateMutation={updateVideoMutation}
      />

      <PreviewVideoModal
        previewVideo={previewVideo}
        onClose={() => setPreviewVideo(null)}
        getYouTubeVideoId={getYouTubeVideoId}
        getYouTubePlaylistId={getYouTubePlaylistId}
      />
    </div>
  );
}

