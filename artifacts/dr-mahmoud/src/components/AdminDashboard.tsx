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
} from "lucide-react";
import { AdminSettings } from "./AdminSettings";
import { AdminLearning } from "./AdminLearning";
import { useToast } from "@/hooks/use-toast";

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

const EDUCATION_STAGES = [
  "أولى بكالوريا",
  "تانية بكالوريا",
  "جامعة",
  "عام",
] as const;

export default function AdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState("");
  const [activeTab, setActiveTab] = useState<
    | "bookings"
    | "courses"
    | "podcasts"
    | "curriculums"
    | "videos"
    | "learning"
    | "settings"
  >("bookings");
  const [selectedSubjectFilter, setSelectedSubjectFilter] =
    useState<string>("all");
  const [selectedVideoCategoryFilter, setSelectedVideoCategoryFilter] =
    useState<string>("all");
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [selectedVideoPreviewUrl, setSelectedVideoPreviewUrl] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    localStorage.removeItem("dr_mahmoud_admin_pwd");
    fetch("/api/admin/me", { credentials: "include" })
      .then((response) => setIsAuthenticated(response.ok))
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
    category: "kids",
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
    { id: number; title: string }[]
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
        console.error("Error loading resources for linking", err);
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
  ) => {
    const matching = (videosQuery.data || []).filter(
      (video) =>
        video.category.trim().toLowerCase() === category.trim().toLowerCase() &&
        (video.learningMode || "online") === learningMode,
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
      const defaultStage = "أولى بكالوريا";
      const defaultCourse = coursesQuery.data?.[0];
      const defaultCategory = defaultCourse?.title || "";
      const defaultLearningMode = "online" as const;
      setSelectedVideoId(null);
      setVideoForm({
        courseId: defaultCourse ? String(defaultCourse.id) : "",
        stage: defaultStage,
        stages: [defaultStage],
        learningMode: defaultLearningMode,
        category: defaultCategory,
        subject: "",
        tags: "",
        title: "",
        description: "",
        youtubeUrl: "",
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
    setIsVideoModalOpen(true);
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
        credentials: "include",
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
      console.error(err);
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
      toast({ variant: "success", title: "تم", description: "تم حذف الدرس بنجاح" });
    } catch (err) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف الدرس",
        variant: "destructive",
      });
    }
  };

  const handleVideoFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedVideoFile(file);
    e.target.value = "";
  };

  const uploadSelectedVideo = async () => {
    const file = selectedVideoFile;
    if (!file) return;

    setIsVideoUploading(true);
    const formData = new FormData();
    formData.append("video", file);

    try {
      const response = await fetch("/api/upload/video", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload video " + file.name);
      }

      const data = await response.json();
      if (data.url) {
        setVideoForm((prev) => ({
          ...prev,
          youtubeUrl: data.url,
        }));
        setSelectedVideoFile(null);
        toast({
          variant: "success",
          title: "تم رفع الفيديو",
          description: "راجع البيانات وبعدها اضغط حفظ الفيديو.",
        });
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "خطأ",
        description: `حدث خطأ أثناء تحميل الفيديو ${file.name}`,
        variant: "destructive",
      });
    } finally {
      setIsVideoUploading(false);
    }
  };

  const handleVideoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !videoForm.courseId ||
      videoForm.stages.length === 0 ||
      !videoForm.category.trim() ||
      !videoForm.subject.trim() ||
      !videoForm.title.trim() ||
      !videoForm.youtubeUrl.trim() ||
      videoForm.order < 1
    ) {
      toast({
        title: "بيانات ناقصة",
        description:
          "اختار كورس ومرحلة واحدة على الأقل، وكمل اسم ورقم الدرس والفيديو.",
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
      youtubeUrl: videoForm.youtubeUrl,
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
      toast({ variant: "success", title: "تم", description: "تم حذف الفيديو بنجاح" });
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
      toast({ variant: "success", title: "تم", description: "تم حذف الكورس بنجاح" });
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
      toast({ variant: "success", title: "تم", description: "تم حذف الحلقة بنجاح" });
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
      toast({ variant: "success", title: "تم", description: "تم تحديث حالة الحجز بنجاح" });
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
      toast({ variant: "success", title: "تم", description: "تم حذف الحجز بنجاح" });
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
      <div className="min-h-screen flex items-center justify-center bg-background px-4 dir-rtl">
        {/* Decorative elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />

        <div className="w-full max-w-md bg-card/60 backdrop-blur-xl border border-border rounded-3xl p-8 relative overflow-hidden shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20 mb-4 animate-pulse">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-foreground font-outfit">
              بوابة المسؤول
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              يرجى إدخال رمز التحقق للوصول إلى لوحة التحكم
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-2">
                كلمة المرور
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-background/80 border border-border text-foreground rounded-xl px-4 py-3.5 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors placeholder:text-muted-foreground text-center text-lg tracking-widest font-sans"
              />
              {authError && (
                <p className="text-red-400 text-xs mt-2 text-right">
                  {authError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl py-3.5 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 flex items-center justify-center gap-2"
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
              className="text-xs text-muted-foreground hover:text-foreground/90 flex items-center justify-center gap-1 transition-colors"
            >
              <ChevronRight className="w-4 h-4" /> العودة للموقع الرئيسي
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-foreground dir-rtl">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-white px-4 py-3 shadow-sm lg:hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-primary">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                لوحة تحكم د. محمود المهدي
              </h1>
              <p className="text-xs text-muted-foreground">
                إدارة محتوى الكورسات، البودكاست والحجوزات
              </p>
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
      <div className="min-h-screen w-full lg:pr-[260px]">
        {/* Navigation Sidebar */}
        <aside className="fixed inset-y-0 right-0 z-50 hidden w-[260px] border-l border-slate-200 bg-white lg:block">
          <div className="flex h-full flex-col p-5">
            <div className="mb-7 flex items-center gap-3 border-b border-slate-100 pb-5">
              <img
                src="/logo.jpg"
                alt="شعار المنصة"
                className="h-12 w-12 rounded-xl border object-cover"
              />
              <div>
                <strong className="block text-sm font-black">
                  أكاديمية د. محمود
                </strong>
                <span className="text-[11px] text-muted-foreground">
                  لوحة إدارة المنصة
                </span>
              </div>
            </div>
            <nav className="flex-1 space-y-1.5 overflow-y-auto">
              <button
                onClick={() => setActiveTab("bookings")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-right text-sm font-medium transition-all ${
                  activeTab === "bookings"
                    ? "bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/10"
                    : "hover:bg-muted/60 text-muted-foreground hover:text-foreground/80"
                }`}
              >
                <Calendar className="w-5 h-5" />
                <span>الدورات</span>
                {bookingsQuery.data &&
                  bookingsQuery.data.filter((b) => b.status === "pending")
                    .length > 0 && (
                    <span
                      className={`mr-auto px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === "bookings" ? "bg-background text-primary" : "bg-primary text-primary-foreground"}`}
                    >
                      {
                        bookingsQuery.data.filter((b) => b.status === "pending")
                          .length
                      }
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
                onClick={() => setActiveTab("learning")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-right text-sm font-medium transition-all ${
                  activeTab === "learning"
                    ? "bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/10"
                    : "hover:bg-muted/60 text-muted-foreground hover:text-foreground/80"
                }`}
              >
                <Users className="w-5 h-5" />
                <span>إدارة المنصة والطلاب</span>
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
            </nav>
            <div className="mt-5 border-t border-slate-100 pt-4">
              <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <strong className="block text-xs">مدير المنصة</strong>
                  <span className="text-[10px] text-muted-foreground">
                    صلاحيات كاملة
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href="/"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-[11px] font-bold"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> الموقع
                </a>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-1 rounded-lg bg-red-50 px-2 py-2 text-[11px] font-bold text-red-600"
                >
                  <LogOut className="h-3.5 w-3.5" /> خروج
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Dynamic Panel Content */}
        <main className="min-w-0 px-4 py-6 md:px-7 lg:px-9 lg:py-8">
          <div className="mx-auto max-w-[1400px]">
            <div key={activeTab} className="animate-[fadeIn_0.2s_ease-in-out]">
              {activeTab === "bookings" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-foreground">
                        إدارة الحجوزات
                      </h2>
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

                  {!bookingsQuery.isLoading &&
                    bookingsQuery.data &&
                    bookingsQuery.data.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-muted/40 border border-border rounded-2xl p-4 flex flex-col justify-between">
                          <span className="text-xs text-muted-foreground">
                            إجمالي الحجوزات
                          </span>
                          <span className="text-2xl font-bold text-foreground mt-2">
                            {bookingsQuery.data.length}
                          </span>
                        </div>
                        <div className="bg-muted/40 border border-border rounded-2xl p-4 flex flex-col justify-between">
                          <span className="text-xs text-muted-foreground">
                            قيد الانتظار
                          </span>
                          <span className="text-2xl font-bold text-primary mt-2">
                            {
                              bookingsQuery.data.filter(
                                (b) => b.status === "pending",
                              ).length
                            }
                          </span>
                        </div>
                        <div className="bg-muted/40 border border-border rounded-2xl p-4 flex flex-col justify-between">
                          <span className="text-xs text-muted-foreground">
                            حجوزات مؤكدة
                          </span>
                          <span className="text-2xl font-bold text-primary mt-2">
                            {
                              bookingsQuery.data.filter(
                                (b) => b.status === "confirmed",
                              ).length
                            }
                          </span>
                        </div>
                        <div className="bg-muted/40 border border-border rounded-2xl p-4 flex flex-col justify-between">
                          <span className="text-xs text-muted-foreground">
                            حجوزات مكتملة
                          </span>
                          <span className="text-2xl font-bold text-blue-400 mt-2">
                            {
                              bookingsQuery.data.filter(
                                (b) => b.status === "completed",
                              ).length
                            }
                          </span>
                        </div>
                      </div>
                    )}

                  {bookingsQuery.isLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="bg-card border border-border shadow-lg shadow-sm rounded-2xl p-6 animate-pulse"
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
                  ) : bookingsQuery.data?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 bg-gradient-to-b from-card/20 to-transparent border border-border rounded-3xl text-center px-4">
                      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 border border-primary/20">
                        <Calendar className="w-8 h-8 text-primary/60" />
                      </div>
                      <p className="text-foreground font-bold text-lg">
                        لا توجد حجوزات مسجلة حتى الآن
                      </p>
                      <p className="text-muted-foreground text-sm mt-1">
                        عند قيام الطلاب بالتسجيل ستظهر طلباتهم هنا
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {bookingsQuery.data?.map((booking) => (
                        <div
                          key={booking.id}
                          className="bg-card border border-border shadow-lg shadow-sm hover:border-border rounded-2xl p-6 transition-all relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
                        >
                          {/* Left side details */}
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-bold text-foreground text-lg">
                                {booking.name}
                              </h3>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                  booking.status === "confirmed"
                                    ? "bg-primary/10 text-primary border border-primary/20"
                                    : booking.status === "completed"
                                      ? "bg-secondary/10 text-secondary border-secondary/20"
                                      : "bg-muted text-muted-foreground border border-border"
                                }`}
                              >
                                {booking.status === "confirmed"
                                  ? "مؤكد"
                                  : booking.status === "completed"
                                    ? "مكتمل"
                                    : "قيد الانتظار"}
                              </span>
                            </div>
                            <p
                              className="text-foreground/90 text-sm font-sans"
                              dir="ltr"
                            >
                              {booking.phone}
                            </p>
                            <p className="text-muted-foreground text-sm bg-muted/50 rounded-xl p-3 border border-border/60 mt-2 whitespace-pre-wrap">
                              {booking.message}
                            </p>
                            <p className="text-muted-foreground text-[10px]">
                              تاريخ الطلب:{" "}
                              {new Date(booking.createdAt).toLocaleString(
                                "ar-EG",
                              )}
                            </p>
                          </div>

                          {/* Quick Action controls */}
                          <div className="flex items-center gap-2 flex-shrink-0 self-stretch md:self-auto justify-end border-t md:border-t-0 border-border/60 pt-4 md:pt-0">
                            {booking.status === "pending" && (
                              <button
                                onClick={() =>
                                  handleBookingStatusUpdate(
                                    booking.id,
                                    "confirmed",
                                  )
                                }
                                className="p-2.5 bg-secondary/10 hover:bg-secondary/20 border border-secondary/20 text-secondary rounded-xl transition-all"
                                title="تأكيد الحجز"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            {booking.status === "confirmed" && (
                              <button
                                onClick={() =>
                                  handleBookingStatusUpdate(
                                    booking.id,
                                    "completed",
                                  )
                                }
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
                      <h2 className="text-xl font-bold text-foreground">
                        إدارة الكورسات
                      </h2>
                      <p className="text-xs text-muted-foreground mt-1">
                        إضافة وتحديث باقة البرامج التدريبية
                      </p>
                    </div>
                    <button
                      onClick={() => openCourseModal("add")}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl px-4 py-2.5 text-sm transition-all shadow-lg shadow-primary/10 hover:shadow-primary/20 flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> إضافة كورس
                    </button>
                  </div>

                  {coursesQuery.isLoading ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="bg-card border border-border shadow-lg shadow-sm rounded-2xl overflow-hidden animate-pulse"
                        >
                          <div className="h-48 bg-muted" />
                          <div className="p-5 space-y-3">
                            <div className="h-5 bg-muted rounded w-3/4" />
                            <div className="flex gap-1.5">
                              <div className="h-4 bg-muted rounded w-14" />
                              <div className="h-4 bg-muted rounded w-14" />
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
                              <div className="h-3 bg-muted rounded w-20" />
                              <div className="h-3 bg-muted rounded w-20" />
                              <div className="h-3 bg-muted rounded w-20" />
                              <div className="h-3 bg-muted rounded w-20" />
                            </div>
                            <div className="flex gap-2 pt-3 border-t border-border/80">
                              <div className="flex-1 h-8 bg-muted rounded-xl" />
                              <div className="h-8 bg-muted rounded-xl w-10" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : coursesQuery.data?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 bg-gradient-to-b from-card/20 to-transparent border border-border rounded-3xl text-center px-4">
                      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 border border-primary/20">
                        <BookOpen className="w-8 h-8 text-primary/60" />
                      </div>
                      <p className="text-foreground font-bold text-lg">
                        لا توجد كورسات مضافة
                      </p>
                      <p className="text-muted-foreground text-sm mt-1">
                        أضف أول كورس تدريبي ليظهر للطلاب في الموقع
                      </p>
                      <button
                        onClick={() => openCourseModal("add")}
                        className="mt-5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-primary/10"
                      >
                        إضافة أول كورس الآن
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {coursesQuery.data?.map((course) => (
                        <div
                          key={course.id}
                          className="bg-card border border-border shadow-lg shadow-sm rounded-2xl overflow-hidden flex flex-col justify-between"
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
                              <h3 className="font-bold text-foreground text-lg">
                                {course.title}
                              </h3>
                              <div className="flex flex-wrap gap-1.5">
                                {course.tags.map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className="bg-muted text-foreground/90 text-[10px] px-2 py-0.5 rounded-md"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-2 border-t border-border/60">
                                <div>السن: {course.age}</div>
                                <div>المدة: {course.duration}</div>
                                <div>الحصص: {course.sessions}</div>
                                <div>المستوى: {course.level}</div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 border-t border-border/80 pt-3">
                              <button
                                onClick={() => openCourseModal("edit", course)}
                                className="flex-1 py-2 bg-muted hover:bg-muted/80 text-foreground/80 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 border border-border"
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
                      <h2 className="text-xl font-bold text-foreground">
                        إدارة البودكاست
                      </h2>
                      <p className="text-xs text-muted-foreground mt-1">
                        رفع وتحديث الحلقات النقاشية والبودكاست
                      </p>
                    </div>
                    <button
                      onClick={() => openPodcastModal("add")}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl px-4 py-2.5 text-sm transition-all shadow-lg shadow-primary/10 hover:shadow-primary/20 flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> إضافة حلقة
                    </button>
                  </div>

                  {podcastsQuery.isLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="bg-card border border-border shadow-lg shadow-sm rounded-2xl p-6 animate-pulse"
                        >
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div className="flex-1 space-y-3 w-full">
                              <div className="h-6 bg-muted rounded w-48" />
                              <div className="h-4 bg-muted rounded w-full" />
                              <div className="flex gap-4">
                                <div className="h-3 bg-muted rounded w-20" />
                                <div className="h-3 bg-muted rounded w-24" />
                              </div>
                            </div>
                            <div className="flex items-center gap-2 self-end md:self-auto">
                              <div className="h-9 bg-muted rounded-xl w-20" />
                              <div className="h-9 bg-muted rounded-xl w-9" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : podcastsQuery.data?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 bg-gradient-to-b from-card/20 to-transparent border border-border rounded-3xl text-center px-4">
                      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 border border-primary/20">
                        <Mic className="w-8 h-8 text-primary/60" />
                      </div>
                      <p className="text-foreground font-bold text-lg">
                        لا توجد حلقات مضافة
                      </p>
                      <p className="text-muted-foreground text-sm mt-1">
                        أضف أول حلقة بودكاست ليتم عرضها للطلاب
                      </p>
                      <button
                        onClick={() => openPodcastModal("add")}
                        className="mt-5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-primary/10"
                      >
                        إضافة أول حلقة الآن
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {podcastsQuery.data?.map((ep) => (
                        <div
                          key={ep.id}
                          className="bg-card border border-border shadow-lg shadow-sm rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
                        >
                          <div className="space-y-1.5 flex-1">
                            <h3 className="font-bold text-foreground text-lg">
                              {ep.title}
                            </h3>
                            <p className="text-muted-foreground text-sm line-clamp-2">
                              {ep.desc}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                              <span>المدة: {ep.duration}</span>
                              {ep.youtubeUrl && (
                                <span className="text-primary/80">
                                  رابط يوتيوب متاح
                                </span>
                              )}
                              {ep.audioUrl && (
                                <span className="text-secondary/80">
                                  رابط الصوت متاح
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0 self-stretch md:self-auto justify-end border-t md:border-t-0 border-border/60 pt-4 md:pt-0">
                            <button
                              onClick={() => openPodcastModal("edit", ep)}
                              className="px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground/80 rounded-xl text-xs transition-colors flex items-center gap-1.5 border border-border"
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
                      <h2 className="text-xl font-bold text-foreground">
                        إدارة المناهج التعليمية
                      </h2>
                      <p className="text-xs text-muted-foreground mt-1">
                        رفع وتنظيم دروس المناهج والمواد كمعارض صور
                      </p>
                    </div>
                    <button
                      onClick={() => openCurriculumModal("add")}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl px-4 py-2.5 text-sm transition-all shadow-lg shadow-primary/10 hover:shadow-primary/20 flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> إضافة درس جديد
                    </button>
                  </div>

                  {/* Subject Filters */}
                  {curriculumsQuery.data &&
                    curriculumsQuery.data.length > 0 && (
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
                        {Array.from(
                          new Set(curriculumsQuery.data.map((c) => c.subject)),
                        ).map((subj) => {
                          const count = curriculumsQuery.data!.filter(
                            (c) => c.subject === subj,
                          ).length;
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
                    <div className="space-y-4">
                      {[1, 2].map((i) => (
                        <div
                          key={i}
                          className="bg-card border border-border shadow-lg shadow-sm rounded-2xl p-6 animate-pulse"
                        >
                          <div className="flex flex-col gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="h-5 bg-muted rounded w-16" />
                                <div className="h-3 bg-muted rounded w-20" />
                              </div>
                              <div className="h-6 bg-muted rounded w-64" />
                            </div>
                            <div className="flex gap-2.5">
                              {[1, 2, 3, 4].map((j) => (
                                <div
                                  key={j}
                                  className="w-20 h-24 bg-muted rounded-lg"
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : curriculumsQuery.data?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 bg-gradient-to-b from-card/20 to-transparent border border-border rounded-3xl text-center px-4">
                      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 border border-primary/20">
                        <Library className="w-8 h-8 text-primary/60" />
                      </div>
                      <p className="text-foreground font-bold text-lg">
                        لا توجد دروس أو مناهج مضافة
                      </p>
                      <p className="text-muted-foreground text-sm mt-1">
                        يمكنك إضافة الدروس والمناهج على شكل مجموعات صور وسيقوم
                        النظام بعرضها للطلاب
                      </p>
                      <button
                        onClick={() => openCurriculumModal("add")}
                        className="mt-5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-primary/10"
                      >
                        إضافة أول درس الآن
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {curriculumsQuery.data
                        ?.filter(
                          (c) =>
                            selectedSubjectFilter === "all" ||
                            c.subject === selectedSubjectFilter,
                        )
                        ?.map((curriculum) => (
                          <div
                            key={curriculum.id}
                            className="bg-card border border-border shadow-lg shadow-sm hover:border-border rounded-2xl p-6 transition-all flex flex-col gap-4"
                          >
                            {/* Upper Section */}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                    {curriculum.subject}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    الترتيب: {curriculum.order}
                                  </span>
                                </div>
                                <h3 className="font-bold text-foreground text-lg mt-1">
                                  {curriculum.title}
                                </h3>
                                {curriculum.description && (
                                  <p className="text-xs text-muted-foreground">
                                    {curriculum.description}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0 self-stretch md:self-auto justify-end">
                                <button
                                  onClick={() =>
                                    openCurriculumModal("edit", curriculum)
                                  }
                                  className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground/80 rounded-xl text-xs transition-colors flex items-center gap-1.5 border border-border"
                                >
                                  <Edit2 className="w-3.5 h-3.5" /> تعديل
                                </button>
                                <button
                                  onClick={() =>
                                    handleCurriculumDelete(curriculum.id)
                                  }
                                  className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs transition-colors border border-red-500/20"
                                  title="حذف الدرس"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Images Preview Section */}
                            <div>
                              <span className="block text-[10px] font-semibold text-muted-foreground mb-2">
                                معاينة صفحات/صور الدرس (
                                {curriculum.images.length})
                              </span>
                              <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-850 scrollbar-track-transparent">
                                {curriculum.images.map((img, idx) => (
                                  <div
                                    key={idx}
                                    className="relative w-20 h-24 rounded-lg overflow-hidden border border-border bg-muted flex-shrink-0 group"
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
                      <h2 className="text-xl font-bold text-foreground">
                        إدارة فيديوهات وقوائم اليوتيوب
                      </h2>
                      <p className="text-xs text-muted-foreground mt-1">
                        عرض وتنظيم شروحات المناهج وكورسات البرمجة مباشرة من
                        قناتك
                      </p>
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
                      {Array.from(
                        new Set(videosQuery.data.map((v) => v.category)),
                      ).map((cat) => {
                        const count = videosQuery.data!.filter(
                          (v) => v.category === cat,
                        ).length;
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div
                          key={i}
                          className="bg-card border border-border shadow-lg shadow-sm rounded-2xl overflow-hidden animate-pulse"
                        >
                          <div className="aspect-video bg-muted" />
                          <div className="p-5 space-y-3">
                            <div className="h-5 bg-muted rounded w-24" />
                            <div className="h-5 bg-muted rounded w-full" />
                            <div className="h-3 bg-muted rounded w-3/4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : videosQuery.data?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 bg-gradient-to-b from-card/20 to-transparent border border-border rounded-3xl text-center px-4">
                      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 border border-primary/20">
                        <VideoIcon className="w-8 h-8 text-primary/60" />
                      </div>
                      <p className="text-foreground font-bold text-lg">
                        لا توجد فيديوهات أو قوائم تشغيل مضافة
                      </p>
                      <p className="text-muted-foreground text-sm mt-1">
                        يمكنك إضافة شروحاتك وقوائم تشغيل اليوتيوب وسيتم عرضها
                        للطلاب بشكل رائع
                      </p>
                      <button
                        onClick={() => openVideoModal("add")}
                        className="mt-5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-primary/10"
                      >
                        إضافة أول فيديو الآن
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {videosQuery.data
                        ?.filter(
                          (v) =>
                            selectedVideoCategoryFilter === "all" ||
                            v.category === selectedVideoCategoryFilter,
                        )
                        ?.map((video) => (
                          <div
                            key={video.id}
                            className="bg-card border border-border shadow-lg shadow-sm hover:border-border rounded-2xl overflow-hidden transition-all flex flex-col group"
                          >
                            {/* Video Thumbnail */}
                            <div className="relative aspect-video bg-muted overflow-hidden border-b border-border/40">
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
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border backdrop-blur-md ${video.isPublished ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-slate-500/30 text-slate-200 border-slate-400/30"}`}
                                >
                                  {video.isPublished ? "منشور" : "مسودة"}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border backdrop-blur-md ${
                                    video.type === "playlist"
                                      ? "bg-primary/10 text-primary border-primary/20"
                                      : "bg-secondary/10 text-secondary border-secondary/20"
                                  }`}
                                >
                                  {video.type === "playlist"
                                    ? "قائمة تشغيل"
                                    : "فيديو منفرد"}
                                </span>
                                {video.isProtected && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border backdrop-blur-md bg-secondary/10 text-secondary border-secondary/20 flex items-center gap-1">
                                    <Lock className="w-3 h-3 text-secondary" />{" "}
                                    محمي
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
                                <div className="flex flex-wrap gap-1.5">
                                  <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                    {video.stages?.length
                                      ? video.stages
                                          .map((stage) =>
                                            stage === "عام"
                                              ? "كل المراحل"
                                              : stage,
                                          )
                                          .join("، ")
                                      : video.stage || "مرحلة غير محددة"}
                                  </span>
                                  <span
                                    className={`border text-[10px] font-bold px-2 py-0.5 rounded-md ${video.learningMode === "offline" ? "bg-violet-500/10 text-violet-700 border-violet-500/20" : video.learningMode === "both" ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" : "bg-sky-500/10 text-sky-700 border-sky-500/20"}`}
                                  >
                                    {video.learningMode === "offline"
                                      ? "أوفلاين"
                                      : video.learningMode === "both"
                                        ? "أونلاين وأوفلاين"
                                        : "أونلاين"}
                                  </span>
                                  <span className="bg-muted text-foreground/80 border text-[10px] font-bold px-2 py-0.5 rounded-md">
                                    {video.category}
                                  </span>
                                  {video.subject && (
                                    <span className="bg-muted text-foreground/80 border text-[10px] font-bold px-2 py-0.5 rounded-md">
                                      {video.subject}
                                    </span>
                                  )}
                                </div>
                                <h3 className="font-bold text-foreground text-base line-clamp-2 mt-1">
                                  {video.title}
                                </h3>
                                {video.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2">
                                    {video.description}
                                  </p>
                                )}
                                {video.tags && video.tags.length > 0 && (
                                  <p className="text-[10px] text-muted-foreground">
                                    {video.tags.join(" · ")}
                                  </p>
                                )}
                              </div>

                              <div className="flex flex-col gap-2.5 border-t border-border/40 pt-4 mt-auto">
                                <div className="flex items-center justify-between">
                                  <button
                                    onClick={() => setPreviewVideo(video)}
                                    className="text-[11px] text-primary hover:underline flex items-center gap-1 font-semibold"
                                  >
                                    <Play className="w-3.5 h-3.5 fill-current" />{" "}
                                    تشغيل المعاينة
                                  </button>
                                  <a
                                    href={video.youtubeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1 font-medium"
                                  >
                                    <ExternalLink className="w-3 h-3" /> يوتيوب
                                  </a>
                                </div>
                                <div className="flex items-center justify-end gap-1.5 border-t border-border/20 pt-2">
                                  <button
                                    onClick={() =>
                                      openVideoModal("edit", video)
                                    }
                                    className="p-2 bg-muted hover:bg-muted/80 text-foreground/80 rounded-xl transition-colors border border-border flex-1 flex justify-center items-center gap-1 text-xs"
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
              {activeTab === "learning" && <AdminLearning />}
            </div>
          </div>
        </main>
      </div>

      {/* Course Modal Form */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-md"
            onClick={() => setIsCourseModalOpen(false)}
          />
          <div className="bg-card border border-border w-full max-w-4xl rounded-3xl p-6 relative z-10 max-h-[90vh] overflow-y-auto shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-lg font-bold text-foreground">
                {courseModalMode === "edit"
                  ? "تعديل الكورس"
                  : "إضافة كورس جديد"}
              </h3>
              <button
                onClick={() => setIsCourseModalOpen(false)}
                className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCourseSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    اسم الكورس
                  </label>
                  <input
                    type="text"
                    required
                    value={courseForm.title}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, title: e.target.value })
                    }
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    الفئة العمرية
                  </label>
                  <input
                    type="text"
                    required
                    value={courseForm.age}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, age: e.target.value })
                    }
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    مدة البرنامج
                  </label>
                  <input
                    type="text"
                    required
                    value={courseForm.duration}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, duration: e.target.value })
                    }
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    عدد الحصص
                  </label>
                  <input
                    type="text"
                    required
                    value={courseForm.sessions}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, sessions: e.target.value })
                    }
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    المستوى
                  </label>
                  <input
                    type="text"
                    required
                    value={courseForm.level}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, level: e.target.value })
                    }
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    التصنيف الرئيسي
                  </label>
                  <select
                    value={courseForm.category}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, category: e.target.value })
                    }
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                  >
                    <option value="kids">المسار البرمجي للأطفال</option>
                    <option value="python">
                      برمجة بايثون والذكاء الاصطناعي
                    </option>
                    <option value="db">علوم البيانات وقواعد البيانات</option>
                    <option value="mobile">تطوير تطبيقات الجوال</option>
                    <option value="ai">تقنيات الذكاء الاصطناعي التوليدي</option>
                    <option value="university">
                      المناهج البرمجية الجامعية
                    </option>
                    <option value="icdl">التحول الرقمي و ICDL</option>
                  </select>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="block text-xs font-semibold text-muted-foreground">
                    صورة الكورس
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[10px] text-muted-foreground mb-1">
                        خيار 1: تحميل صورة من جهازك
                      </span>
                      <div className="relative border border-dashed border-border hover:border-primary/50 rounded-xl p-3 bg-muted/50 transition-colors flex flex-col items-center justify-center min-h-[90px]">
                        {isUploadingImage ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                            <span className="text-xs text-muted-foreground">
                              جاري الرفع...
                            </span>
                          </div>
                        ) : (
                          <>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <span className="text-xs text-muted-foreground text-center">
                              انقر هنا أو اسحب الصورة لرفعها
                            </span>
                            <span className="text-[10px] text-muted-foreground mt-1">
                              PNG, JPG حتى 5MB
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="block text-[10px] text-muted-foreground mb-1">
                        خيار 2: رابط صورة مباشر
                      </span>
                      <input
                        type="text"
                        required
                        value={courseForm.img}
                        onChange={(e) =>
                          setCourseForm({ ...courseForm, img: e.target.value })
                        }
                        placeholder="https://example.com/image.jpg"
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm h-[90px]"
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
                          (e.target as HTMLImageElement).src =
                            "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=600";
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="block text-xs font-semibold text-foreground/90 truncate">
                          {courseForm.img}
                        </span>
                        <span className="block text-[10px] text-secondary">
                          جاهز ومعاين
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    الوسوم (مفصولة بفواصل)
                  </label>
                  <input
                    type="text"
                    required
                    value={courseForm.tags}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, tags: e.target.value })
                    }
                    placeholder="برمجة, أطفال, بايثون"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 justify-end border-t border-border pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsCourseModalOpen(false)}
                  className="px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground/80 rounded-xl text-xs transition-colors border border-border"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={
                    createCourseMutation.isPending ||
                    updateCourseMutation.isPending
                  }
                  className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs transition-colors shadow-lg shadow-primary/10 flex items-center gap-1.5"
                >
                  {(createCourseMutation.isPending ||
                    updateCourseMutation.isPending) && (
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
              <h3 className="text-lg font-bold text-foreground">
                {podcastModalMode === "edit"
                  ? "تعديل الحلقة"
                  : "إضافة حلقة جديدة"}
              </h3>
              <button
                onClick={() => setIsPodcastModalOpen(false)}
                className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePodcastSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  عنوان الحلقة
                </label>
                <input
                  type="text"
                  required
                  value={podcastForm.title}
                  onChange={(e) =>
                    setPodcastForm({ ...podcastForm, title: e.target.value })
                  }
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  وصف الحلقة
                </label>
                <textarea
                  required
                  rows={4}
                  value={podcastForm.desc}
                  onChange={(e) =>
                    setPodcastForm({ ...podcastForm, desc: e.target.value })
                  }
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm resize-none"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    مدة الحلقة (دقيقة:ثانية)
                  </label>
                  <input
                    type="text"
                    required
                    value={podcastForm.duration}
                    onChange={(e) =>
                      setPodcastForm({
                        ...podcastForm,
                        duration: e.target.value,
                      })
                    }
                    placeholder="12:30"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    رابط يوتيوب (اختياري)
                  </label>
                  <input
                    type="text"
                    value={podcastForm.youtubeUrl}
                    onChange={(e) =>
                      setPodcastForm({
                        ...podcastForm,
                        youtubeUrl: e.target.value,
                      })
                    }
                    placeholder="https://youtube.com/..."
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="block text-xs font-semibold text-muted-foreground">
                    ملف الصوت للحلقة
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[10px] text-muted-foreground mb-1">
                        خيار 1: تحميل ملف صوتي من جهازك
                      </span>
                      <div className="relative border border-dashed border-border hover:border-primary/50 rounded-xl p-3 bg-muted/50 transition-colors flex flex-col items-center justify-center min-h-[90px]">
                        {isUploadingAudio ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                            <span className="text-xs text-muted-foreground">
                              جاري الرفع...
                            </span>
                          </div>
                        ) : (
                          <>
                            <input
                              type="file"
                              accept="audio/*"
                              onChange={handleAudioUpload}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <span className="text-xs text-muted-foreground text-center">
                              انقر هنا أو اسحب الملف لرفعه
                            </span>
                            <span className="text-[10px] text-muted-foreground mt-1">
                              MP3, WAV حتى 150MB
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="block text-[10px] text-muted-foreground mb-1">
                        خيار 2: رابط ملف صوتي مباشر
                      </span>
                      <input
                        type="text"
                        value={podcastForm.audioUrl}
                        onChange={(e) =>
                          setPodcastForm({
                            ...podcastForm,
                            audioUrl: e.target.value,
                          })
                        }
                        placeholder="https://domain.com/audio.mp3"
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm h-[90px]"
                      />
                    </div>
                  </div>
                  {podcastForm.audioUrl && (
                    <div className="flex items-center gap-3 p-2 bg-background/20 border border-border rounded-xl mt-2">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                        <Mic className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="block text-xs font-semibold text-foreground/90 truncate">
                          {podcastForm.audioUrl}
                        </span>
                        <span className="block text-[10px] text-secondary">
                          تم اختيار الملف الصوتي بنجاح
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 justify-end border-t border-border pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsPodcastModalOpen(false)}
                  className="px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground/80 rounded-xl text-xs transition-colors border border-border"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={
                    createPodcastMutation.isPending ||
                    updatePodcastMutation.isPending
                  }
                  className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs transition-colors shadow-lg shadow-primary/10 flex items-center gap-1.5"
                >
                  {(createPodcastMutation.isPending ||
                    updatePodcastMutation.isPending) && (
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
              <h3 className="text-lg font-bold text-foreground">
                {curriculumModalMode === "edit"
                  ? "تعديل الدرس"
                  : "إضافة درس جديد للمنهج"}
              </h3>
              <button
                onClick={() => setIsCurriculumModalOpen(false)}
                className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCurriculumSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    المادة / لغة البرمجة
                  </label>
                  <input
                    type="text"
                    required
                    list="subjects-list"
                    value={curriculumForm.subject}
                    onChange={(e) =>
                      setCurriculumForm({
                        ...curriculumForm,
                        subject: e.target.value,
                      })
                    }
                    placeholder="مثال: C++، Python، Java"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
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
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    ترتيب العرض
                  </label>
                  <input
                    type="number"
                    required
                    value={curriculumForm.order}
                    onChange={(e) =>
                      setCurriculumForm({
                        ...curriculumForm,
                        order: Number(e.target.value),
                      })
                    }
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    عنوان الدرس
                  </label>
                  <input
                    type="text"
                    required
                    value={curriculumForm.title}
                    onChange={(e) =>
                      setCurriculumForm({
                        ...curriculumForm,
                        title: e.target.value,
                      })
                    }
                    placeholder="مثال: الدرس الأول: المتغيرات وأنواع البيانات"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    الوصف (اختياري)
                  </label>
                  <textarea
                    value={curriculumForm.description}
                    onChange={(e) =>
                      setCurriculumForm({
                        ...curriculumForm,
                        description: e.target.value,
                      })
                    }
                    placeholder="اكتب وصفاً أو ملاحظات إضافية حول هذا الدرس..."
                    rows={3}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm resize-none"
                  />
                </div>

                <div className="md:col-span-2 space-y-4">
                  <label className="block text-xs font-semibold text-muted-foreground">
                    صور/صفحات الدرس (10 خانات صور مرقمة)
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto p-2 border border-border/40 rounded-2xl bg-background/20">
                    {Array.from({ length: 10 }).map((_, idx) => {
                      const currentUrl = curriculumForm.images[idx] || "";
                      return (
                        <div
                          key={idx}
                          className="bg-muted/60 border border-border/60 rounded-xl p-3 space-y-2 relative"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-primary">
                              شريحة {idx + 1}
                            </span>
                            {currentUrl && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newImages = [...curriculumForm.images];
                                  newImages[idx] = "";
                                  setCurriculumForm({
                                    ...curriculumForm,
                                    images: newImages,
                                  });
                                }}
                                className="text-[10px] text-red-400 hover:text-red-300 font-semibold"
                              >
                                حذف الصورة
                              </button>
                            )}
                          </div>

                          <div className="aspect-[4/3] w-full bg-muted rounded-lg overflow-hidden border border-border/40 flex items-center justify-center relative">
                            {currentUrl ? (
                              <img
                                src={currentUrl}
                                alt={`Slide ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-[10px] text-muted-foreground">
                                فارغة
                              </span>
                            )}
                            {uploadingSlotIndex === idx && (
                              <div className="absolute inset-0 bg-black/80 flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                <span className="text-[10px] text-white">
                                  جاري الرفع...
                                </span>
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
                                className="w-full bg-[#121A27] hover:bg-muted text-foreground border border-border rounded-lg py-1.5 text-[10px] font-medium transition-all"
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
                                setCurriculumForm({
                                  ...curriculumForm,
                                  images: newImages,
                                });
                              }}
                              placeholder="أو اكتب رابط الصورة هنا..."
                              className="w-full bg-background border border-border rounded-lg px-2.5 py-1 text-foreground text-[10px] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
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
                  className="px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground/80 rounded-xl text-xs transition-colors border border-border"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={
                    createCurriculumMutation.isPending ||
                    updateCurriculumMutation.isPending
                  }
                  className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs transition-colors shadow-lg shadow-primary/10 flex items-center gap-1.5"
                >
                  {(createCurriculumMutation.isPending ||
                    updateCurriculumMutation.isPending) && (
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
          <div className="bg-card border border-border w-full max-w-4xl rounded-3xl p-6 relative z-10 max-h-[90vh] overflow-y-auto shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-lg font-bold text-foreground">
                {videoModalMode === "edit"
                  ? "تعديل بيانات المحتوى التعليمي"
                  : "إضافة محتوى تعليمي جديد"}
              </h3>
              <button
                onClick={() => setIsVideoModalOpen(false)}
                className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleVideoSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 rounded-2xl border bg-muted/30 p-4">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      ["1", "حدد الطلاب"],
                      ["2", "بيانات الدرس"],
                      ["3", "ارفع الفيديو"],
                      ["4", "اربط الملفات"],
                    ].map(([number, label]) => (
                      <div
                        key={number}
                        className="flex items-center gap-2 rounded-xl bg-background p-2 text-xs font-bold"
                      >
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-[10px] text-white">
                          {number}
                        </span>
                        {label}
                      </div>
                    ))}
                  </div>
                  {videoModalMode === "add" &&
                    (videosQuery.data?.length || 0) > 0 && (
                      <button
                        type="button"
                        onClick={useLatestLessonSettings}
                        className="mt-3 w-full rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs font-bold text-primary hover:bg-primary/10"
                      >
                        ⚡ جهّز درس جديد بنفس إعدادات آخر درس
                      </button>
                    )}
                </div>
                <div className="md:col-span-2 mt-1 flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-sm font-black text-white">
                    1
                  </span>
                  <div>
                    <h4 className="font-black">الدرس ده لمين؟</h4>
                    <p className="text-xs text-muted-foreground">
                      حدد المرحلة والكورس ونظام الحضور بدقة.
                    </p>
                  </div>
                </div>
                <fieldset className="md:col-span-2 rounded-xl border bg-muted/20 p-4">
                  <legend className="px-2 text-xs font-bold text-muted-foreground">
                    المراحل الدراسية — اختار مرحلة أو أكتر
                  </legend>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {EDUCATION_STAGES.map((stage) => {
                      const checked = videoForm.stages.includes(stage);
                      return (
                        <label
                          key={stage}
                          className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-3 text-xs font-bold transition ${checked ? "border-primary bg-primary/10 text-primary" : "bg-background hover:border-primary/40"}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const stages = checked
                                ? videoForm.stages.filter(
                                    (item) => item !== stage,
                                  )
                                : [...videoForm.stages, stage];
                              setVideoForm({
                                ...videoForm,
                                stages,
                                stage: stages[0] || "",
                              });
                            }}
                          />
                          {stage === "عام" ? "كل المراحل" : stage}
                        </label>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    الفيديو هيظهر للطالب لو مرحلته موجودة ضمن الاختيارات دي.
                  </p>
                </fieldset>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    الكورس التابع له الفيديو
                  </label>
                  <select
                    required
                    value={videoForm.courseId}
                    onChange={(e) => {
                      const course = coursesQuery.data?.find(
                        (item) => String(item.id) === e.target.value,
                      );
                      setVideoForm({
                        ...videoForm,
                        courseId: e.target.value,
                        category: course?.title || "",
                        order: getNextLessonNumber(
                          course?.title || "",
                          videoForm.learningMode,
                        ),
                      });
                    }}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                  >
                    <option value="">اختر الكورس</option>
                    {coursesQuery.data?.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                  {(coursesQuery.data?.length || 0) === 0 && (
                    <p className="mt-2 rounded-lg bg-amber-500/10 p-2 text-xs text-amber-700">
                      ضيف كورس الأول من تبويب «الكورسات»، وبعدها ارجع ارفع
                      الفيديو.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    نظام عرض السلسلة
                  </label>
                  <select
                    value={videoForm.learningMode}
                    onChange={(e) =>
                      setVideoForm({
                        ...videoForm,
                        learningMode: e.target.value as
                          | "online"
                          | "offline"
                          | "both",
                      })
                    }
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                  >
                    <option value="online">طلاب الأونلاين فقط</option>
                    <option value="offline">طلاب الأوفلاين فقط</option>
                    <option value="both">كل الطلاب</option>
                  </select>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    الحماية بتتطبق من السيرفر، مش مجرد إخفاء في الواجهة.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    المادة
                  </label>
                  <input
                    type="text"
                    required
                    value={videoForm.subject}
                    onChange={(e) =>
                      setVideoForm({ ...videoForm, subject: e.target.value })
                    }
                    placeholder="مثال: البرمجة وعلوم الحاسب"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                  />
                </div>

                <div className="md:col-span-2 mt-3 flex items-center gap-3 border-t pt-4">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-sm font-black text-white">
                    2
                  </span>
                  <div>
                    <h4 className="font-black">بيانات الدرس</h4>
                    <p className="text-xs text-muted-foreground">
                      الاسم ورقم الدرس هما اللي الطالب هيشوفهم.
                    </p>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1 text-right">
                    اسم الدرس
                  </label>
                  <input
                    type="text"
                    required
                    value={videoForm.title}
                    onChange={(e) =>
                      setVideoForm({ ...videoForm, title: e.target.value })
                    }
                    placeholder="مثال: الدرس 3 — المتغيرات وأنواع البيانات"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    نوع المحتوى
                  </label>
                  <select
                    value={videoForm.type}
                    onChange={(e) =>
                      setVideoForm({
                        ...videoForm,
                        type: e.target.value as "video" | "playlist",
                      })
                    }
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                  >
                    <option value="video">فيديو منفرد</option>
                    <option value="playlist">قائمة تشغيل كاملة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    رقم الدرس داخل السلسلة
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      required
                      value={videoForm.order}
                      onChange={(e) =>
                        setVideoForm({
                          ...videoForm,
                          order: Number(e.target.value),
                        })
                      }
                      className="min-w-0 flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setVideoForm({
                          ...videoForm,
                          order: getNextLessonNumber(
                            videoForm.category,
                            videoForm.learningMode,
                          ),
                        })
                      }
                      className="rounded-xl border px-3 text-xs font-bold text-primary hover:bg-primary/5"
                    >
                      اقترح التالي
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    بيتحدد تلقائيًا حسب المرحلة والكورس ونظام الحضور.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    المدة (اختياري)
                  </label>
                  <input
                    type="text"
                    value={videoForm.durationText}
                    onChange={(e) =>
                      setVideoForm({
                        ...videoForm,
                        durationText: e.target.value,
                      })
                    }
                    placeholder="مثال: 12 ساعة"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    عدد الدروس (اختياري)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={videoForm.lessonsCount}
                    onChange={(e) =>
                      setVideoForm({
                        ...videoForm,
                        lessonsCount: e.target.value,
                      })
                    }
                    placeholder="مثال: 24"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    المستوى (اختياري)
                  </label>
                  <select
                    value={videoForm.level}
                    onChange={(e) =>
                      setVideoForm({ ...videoForm, level: e.target.value })
                    }
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                  >
                    <option value="">غير محدد</option>
                    <option value="مبتدئ">مبتدئ</option>
                    <option value="متوسط">متوسط</option>
                    <option value="متقدم">متقدم</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    كلمات مفتاحية
                  </label>
                  <input
                    type="text"
                    value={videoForm.tags}
                    onChange={(e) =>
                      setVideoForm({ ...videoForm, tags: e.target.value })
                    }
                    placeholder="مثال: متغيرات، C++، تدريب عملي"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    افصل بين الكلمات بفاصلة.
                  </p>
                </div>

                <div className="md:col-span-2 mt-3 flex items-center gap-3 border-t pt-4">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-sm font-black text-white">
                    3
                  </span>
                  <div>
                    <h4 className="font-black">الفيديو</h4>
                    <p className="text-xs text-muted-foreground">
                      عاين الملف الأول، وبعدها ارفعه أو استخدم رابط يوتيوب.
                    </p>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-3">
                  <label className="block text-xs font-semibold text-muted-foreground text-right">
                    رابط الفيديو أو تحميل ملف فيديو
                  </label>
                  <div className="grid grid-cols-1 gap-4">
                    {/* Visual drag-drop style upload box / URL box */}
                    <div className="border border-dashed border-border rounded-2xl p-4 bg-muted/30 hover:border-primary/50 transition-colors">
                      <div className="flex flex-col items-center justify-center text-center space-y-2">
                        {isVideoUploading ? (
                          <div className="flex flex-col items-center gap-2 py-4">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <span className="text-xs font-semibold text-foreground">
                              جاري رفع وتشفير الفيديو...
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              الرجاء عدم إغلاق النافذة حتى اكتمال الرفع
                            </span>
                          </div>
                        ) : selectedVideoFile && selectedVideoPreviewUrl ? (
                          <div className="w-full space-y-3 py-2">
                            <video
                              src={selectedVideoPreviewUrl}
                              controls
                              preload="metadata"
                              className="max-h-80 w-full rounded-xl bg-black"
                            />
                            <div className="flex flex-col gap-3 rounded-xl border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0 text-right">
                                <strong className="block truncate text-xs">
                                  {selectedVideoFile.name}
                                </strong>
                                <span className="text-[10px] text-muted-foreground">
                                  {(
                                    selectedVideoFile.size /
                                    1024 /
                                    1024
                                  ).toFixed(1)}{" "}
                                  MB · معاينة محلية قبل الرفع
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedVideoFile(null)}
                                  className="rounded-lg border px-3 py-2 text-xs font-bold"
                                >
                                  إلغاء
                                </button>
                                <button
                                  type="button"
                                  onClick={uploadSelectedVideo}
                                  className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                                >
                                  <Upload className="ml-1 inline h-3.5 w-3.5" />
                                  رفع الفيديو
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : videoForm.youtubeUrl &&
                          (videoForm.youtubeUrl.startsWith("/uploads/") ||
                            videoForm.youtubeUrl.includes("/stream")) ? (
                          <div className="w-full space-y-3 py-2">
                            <div className="flex items-center gap-3 justify-between bg-background border border-border p-3 rounded-xl">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                                  <Check className="w-5 h-5" />
                                </div>
                                <div className="text-right min-w-0">
                                  <span className="block text-xs font-bold text-foreground truncate">
                                    ملف فيديو مرفوع
                                  </span>
                                  <span
                                    className="block text-[10px] text-muted-foreground truncate"
                                    dir="ltr"
                                  >
                                    {videoForm.youtubeUrl}
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setVideoForm((prev) => ({
                                    ...prev,
                                    youtubeUrl: "",
                                  }))
                                }
                                className="text-[10px] text-red-500 hover:text-red-400 font-semibold px-2 py-1 bg-red-500/5 hover:bg-red-500/10 rounded-lg border border-red-500/10 transition-colors"
                              >
                                حذف الملف
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-1">
                              <Upload className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-bold text-foreground">
                              تحميل ملف فيديو من جهازك مباشرة
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              صيغ الفيديو المدعومة (MP4, MKV, AVI)
                            </span>
                            <div className="pt-2">
                              <label className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl px-4 py-2 cursor-pointer transition-colors text-xs inline-flex items-center gap-1.5 shadow-md shadow-primary/10 border border-primary/20">
                                <Upload className="w-3.5 h-3.5" />
                                اختر ملف فيديو
                                <input
                                  type="file"
                                  accept="video/*"
                                  className="hidden"
                                  disabled={isVideoUploading}
                                  onChange={handleVideoFileSelection}
                                />
                              </label>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground">
                        <VideoIcon className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={videoForm.youtubeUrl}
                        onChange={(e) =>
                          setVideoForm({
                            ...videoForm,
                            youtubeUrl: e.target.value,
                          })
                        }
                        placeholder="أو اكتب رابط فيديو يوتيوب أو مسار خارجي مباشر..."
                        className="w-full bg-background border border-border rounded-xl pr-10 pl-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm text-left"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1 text-right">
                    الوصف (اختياري)
                  </label>
                  <textarea
                    value={videoForm.description}
                    onChange={(e) =>
                      setVideoForm({
                        ...videoForm,
                        description: e.target.value,
                      })
                    }
                    placeholder="اكتب وصفاً مختصراً لمحتوى هذا الفيديو أو قائمة التشغيل..."
                    rows={3}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm resize-none"
                  />
                </div>

                <div className="md:col-span-2 mt-3 flex items-center gap-3 border-t pt-4">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-sm font-black text-white">
                    4
                  </span>
                  <div>
                    <h4 className="font-black">ملفات واختبار الدرس</h4>
                    <p className="text-xs text-muted-foreground">
                      اختياري، وتقدر تضيف أكتر من ملف لنفس الدرس.
                    </p>
                  </div>
                </div>

                {/* Professional lesson resources and quiz associations */}
                <div className="grid grid-cols-1 md:grid-cols-[1.4fr_.6fr] gap-4 md:col-span-2">
                  <div className="rounded-xl border bg-muted/20 p-4 text-right">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-bold">
                          <FileText className="w-4 h-4 text-primary" /> مرفقات
                          الدرس
                        </label>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          اختار أكتر من ملف؛ الطالب هيلاقيهم منظمين أسفل
                          الفيديو.
                        </p>
                      </div>
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
                        {videoForm.attachmentFileIds.length} ملف
                      </span>
                    </div>
                    {learningFiles.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-5 text-center text-xs text-muted-foreground">
                        ارفع الملفات الأول من تبويب إدارة المنصة والطلاب.
                      </div>
                    ) : (
                      <div className="max-h-56 space-y-2 overflow-y-auto pl-1">
                        {learningFiles.map((file) => {
                          const checked = videoForm.attachmentFileIds.includes(
                            String(file.id),
                          );
                          return (
                            <label
                              key={file.id}
                              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${checked ? "border-primary bg-primary/10" : "bg-background hover:border-primary/40"}`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setVideoForm({
                                    ...videoForm,
                                    attachmentFileIds: checked
                                      ? videoForm.attachmentFileIds.filter(
                                          (id) => id !== String(file.id),
                                        )
                                      : [
                                          ...videoForm.attachmentFileIds,
                                          String(file.id),
                                        ],
                                  })
                                }
                              />
                              <FileText className="h-4 w-4 shrink-0 text-primary" />
                              <span className="min-w-0 flex-1">
                                <strong className="block truncate text-xs">
                                  {file.title}
                                </strong>
                                <small className="block truncate text-[10px] text-muted-foreground">
                                  {file.stage || "كل المراحل"} · {file.category}
                                  {file.sizeBytes
                                    ? ` · ${(file.sizeBytes / 1024 / 1024).toFixed(1)} MB`
                                    : ""}
                                </small>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border bg-muted/20 p-4 text-right">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1 flex items-center justify-end gap-1.5">
                      اختبار الدرس المرفق (Exercises)
                      <HelpCircle className="w-3.5 h-3.5 text-primary" />
                    </label>
                    <select
                      value={videoForm.quizId}
                      onChange={(e) =>
                        setVideoForm({ ...videoForm, quizId: e.target.value })
                      }
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                    >
                      <option value="">لا يوجد اختبار مرفق</option>
                      {learningQuizzes.map((quiz) => (
                        <option key={quiz.id} value={quiz.id}>
                          {quiz.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-5 rounded-xl border bg-muted/30 p-4 md:col-span-2">
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={videoForm.isPublished}
                      onChange={(e) =>
                        setVideoForm({
                          ...videoForm,
                          isPublished: e.target.checked,
                        })
                      }
                      className="h-4 w-4"
                    />{" "}
                    منشور للطلاب
                  </label>
                  <input
                    type="checkbox"
                    id="isProtected"
                    checked={videoForm.isProtected}
                    onChange={(e) =>
                      setVideoForm({
                        ...videoForm,
                        isProtected: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-2 bg-background"
                  />
                  <label
                    htmlFor="isProtected"
                    className="text-xs font-semibold text-foreground cursor-pointer select-none"
                  >
                    تشفير وحماية هذا الفيديو (يطلب كود تفعيل للمشاهدة بعد أول
                    فيديو مجاني)
                  </label>
                </div>

                {videoForm.isProtected && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      كود التفعيل لتشغيل الفيديو (Access Key)
                    </label>
                    <input
                      type="text"
                      required
                      value={videoForm.accessKey}
                      onChange={(e) =>
                        setVideoForm({
                          ...videoForm,
                          accessKey: e.target.value,
                        })
                      }
                      placeholder="مثال: CPP_COURSE_2026 أو KEY_XXXX"
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                    />
                    <span className="text-[10px] text-muted-foreground mt-1 block">
                      سيحتاج الطالب لإدخال هذا الكود لمرة واحدة لفك القفل عن
                      الفيديو (وجميع الفيديوهات اللاحقة التي تستخدم نفس الكود).
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 justify-end border-t border-border pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsVideoModalOpen(false)}
                  className="px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground/80 rounded-xl text-xs transition-colors border border-border"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={
                    createVideoMutation.isPending ||
                    updateVideoMutation.isPending
                  }
                  className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs transition-colors shadow-lg shadow-primary/10 flex items-center gap-1.5"
                >
                  {(createVideoMutation.isPending ||
                    updateVideoMutation.isPending) && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  {videoModalMode === "edit"
                    ? "حفظ التعديلات"
                    : `نشر الدرس رقم ${videoForm.order}`}
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
          <div className="bg-[#090D16] border border-border w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl relative z-10 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
              <div className="space-y-0.5 max-w-[85%]">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                  معاينة:{" "}
                  {previewVideo.type === "playlist"
                    ? "قائمة تشغيل"
                    : "فيديو منفرد"}
                </span>
                <h3 className="text-base font-bold text-foreground line-clamp-1">
                  {previewVideo.title}
                </h3>
              </div>
              <button
                onClick={() => setPreviewVideo(null)}
                className="w-9 h-9 rounded-xl bg-muted/20 hover:bg-muted/40 flex items-center justify-center text-foreground/70 hover:text-foreground transition-all border border-border"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative w-full aspect-video bg-black">
              {(() => {
                const vidId = getYouTubeVideoId(previewVideo.youtubeUrl);
                const playlistId = getYouTubePlaylistId(
                  previewVideo.youtubeUrl,
                );

                const isStreamUrl =
                  previewVideo.youtubeUrl.startsWith("/uploads/") ||
                  previewVideo.youtubeUrl.includes("/stream");

                if (isStreamUrl) {
                  return (
                    <video
                      className="absolute inset-0 w-full h-full object-contain bg-black"
                      src={previewVideo.youtubeUrl}
                      controls
                      controlsList="nodownload"
                      onContextMenu={(e) => e.preventDefault()}
                      autoPlay
                    />
                  );
                }

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
                    <p className="text-muted-foreground text-sm">
                      تعذر تحميل رابط معاينة الفيديو.
                    </p>
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
