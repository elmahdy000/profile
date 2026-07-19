export interface VideoItem {
  id?: number;
  courseId?: number | null;
  category: string;
  stage?: string | null;
  stages?: string[];
  subject?: string | null;
  learningMode?: "online" | "offline" | "both";
  tags?: string[];
  title: string;
  description?: string | null;
  youtubeUrl: string;
  type: "video" | "playlist";
  order: number;
  isProtected?: boolean;
  isPublished?: boolean;
  durationText?: string | null;
  lessonsCount?: number | null;
  level?: string | null;
  pdfFileId?: number | null;
  attachments?: Array<{
    id: number;
    title: string;
    description?: string | null;
    category?: string;
    stage?: string | null;
    subject?: string | null;
    originalName?: string;
    mimeType?: string;
    sizeBytes?: number;
    order?: number;
  }>;
  quizId?: number | null;
}

export function getYouTubeVideoId(url: string): string | null {
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
}

export function getYouTubePlaylistId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/[?&]list=([^#\&\?]+)/);
  return match ? match[1] : null;
}

export function getYoutubeThumbnail(url: string): string {
  const vidId = getYouTubeVideoId(url);
  if (vidId) {
    return `https://img.youtube.com/vi/${vidId}/hqdefault.jpg`;
  }
  return "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=800&q=80";
}

export function isStreamUrl(url?: string): boolean {
  return !!url && (url.startsWith("/api/videos/") || url.startsWith("/uploads/"));
}

export const fallbackVideos: VideoItem[] = [
  {
    id: 101,
    category: "سي بلس بلس C++",
    title: "كورس تعلم البرمجة للمبتدئين بلغة C++ من الصفر",
    description:
      "شرح شامل وأساسي لأسس البرمجة وتصميم الخوارزميات وتطبيقها بلغة سي بلس بلس لطلاب الجامعات والمدارس.",
    youtubeUrl:
      "https://www.youtube.com/playlist?list=PL43pGnjiVwgS6cQW6a-8Hj4_N292f7XwX",
    type: "playlist",
    order: 1,
  },
  {
    id: 102,
    category: "هياكل البيانات Data Structures",
    title: "شرح هياكل البيانات بالتفصيل Data Structures & Algorithms",
    description:
      "المفاهيم المتقدمة لهياكل البيانات مثل الأشجار والقوائم المرتبطة والرسوم البيانية وتطبيقاتها البرمجية.",
    youtubeUrl:
      "https://www.youtube.com/playlist?list=PL43pGnjiVwgTq0Kwt-jP_Gndn1154cQk2",
    type: "playlist",
    order: 2,
  },
  {
    id: 103,
    category: "برمجة ثانوية عامة",
    title: "تأسيس البرمجة وعلوم الحاسب لطلاب المدارس والثانوية العامة",
    description:
      "بوابتك للدخول إلى عالم التكنولوجيا وصناعة التطبيقات والمواقع في سن مبكرة.",
    youtubeUrl:
      "https://www.youtube.com/playlist?list=PL43pGnjiVwgSxY6b5O_Hmsj-0YhT_a4R3",
    type: "playlist",
    order: 3,
  },
  {
    id: 104,
    category: "برمجة للمبتدئين",
    title: "كيف تبدأ البرمجة بالطريقة الصحيحة وتتجنب الأخطاء الشائعة؟",
    description:
      "نصائح وتوجيهات هامة لكل طالب يرغب في بدء رحلته في عالم التطوير وتصميم البرمجيات.",
    youtubeUrl: "https://www.youtube.com/watch?v=M-5T8T2p5gQ",
    type: "video",
    order: 4,
  },
];
