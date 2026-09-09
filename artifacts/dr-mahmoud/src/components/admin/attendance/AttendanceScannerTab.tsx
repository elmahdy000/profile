import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import jsQR from "jsqr";
import {
  Camera,
  CameraOff,
  QrCode,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Bell,
  Send,
  Printer,
  Sparkles,
  Phone,
  Calendar,
  Layers,
  MapPin,
  Volume2,
  VolumeX,
  FileSpreadsheet,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OFFICIAL_CENTERS, OFFICIAL_SLOTS, normalizeSlotName } from "../learning/StudentDrawer";
import { defaultOfflineCenters } from "../settings/CentersTab";

export interface GroupBreakdownItem {
  centerName: string;
  appointmentSlot: string;
  totalEnrolled: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  unmarkedCount: number;
  makeupCount: number;
  attendanceRate: number;
}

interface AttendanceRecord {
  id: number;
  studentId: number;
  name: string;
  phone: string;
  accessCode: string;
  grade: string;
  center: string | null;
  appointmentSlot?: string | null;
  enrolledSlot?: string | null;
  enrolledCenter?: string | null;
  isCrossGroup?: boolean;
  learningMode: string;
  parentPhone: string | null;
  attendanceId: number | null;
  date: string;
  status: "present" | "absent" | "late" | "unmarked";
  checkInTime: string | null;
  notes: string | null;
  parentNotified: boolean;
  parentName: string | null;
  parentAccountPhone: string | null;
  hasParentAccount: boolean;
}

interface AttendanceStats {
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  unmarkedCount: number;
  attendanceRate: number;
}

interface LastScannedStudent {
  name: string;
  phone: string;
  accessCode: string;
  grade: string;
  center?: string | null;
  appointmentSlot?: string | null;
  enrolledSlot?: string | null;
  enrolledCenter?: string | null;
  isCrossGroup?: boolean;
  checkInTime: string;
  status: "present" | "late";
  parentNotified: boolean;
  parentName?: string | null;
  parentPhone?: string | null;
  notes?: string | null;
}

function playScanSound(type: "success" | "warning" | "error" = "success") {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "success") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === "warning") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(330, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } else {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch {
    // Ignore audio permission or restriction issues
  }
}

function triggerHaptic() {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([60, 40, 60]);
    }
  } catch {
    // Ignore haptics issues
  }
}

export function AttendanceScannerTab({ role = "subadmin" }: { role?: "superadmin" | "subadmin" }) {
  const { toast } = useToast();

  // Mode: "scanner" or "sheet"
  const [activeTab, setActiveTab] = useState<"scanner" | "sheet">("scanner");

  // Date Selection (defaults to Africa/Cairo today YYYY-MM-DD)
  const todayStr = useMemo(() => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Cairo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }, []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Camera & Scanner State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isContinuousMode, setIsContinuousMode] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isProcessingScan, setIsProcessingScan] = useState<boolean>(false);
  const [manualInput, setManualInput] = useState<string>("");
  const [lastScanned, setLastScanned] = useState<LastScannedStudent | null>(null);
  const [recentScans, setRecentScans] = useState<LastScannedStudent[]>([]);

  // Active Session Selection for Scanner (Center & Time Slot)
  const [selectedCenter, setSelectedCenter] = useState<string>("all");
  const [selectedSlot, setSelectedSlot] = useState<string>("all");

  // Daily Sheet State
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [groupBreakdown, setGroupBreakdown] = useState<GroupBreakdownItem[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    totalStudents: 0,
    presentCount: 0,
    absentCount: 0,
    lateCount: 0,
    unmarkedCount: 0,
    attendanceRate: 0,
  });
  const [isLoadingRecords, setIsLoadingRecords] = useState<boolean>(false);

  // Filter & Search State for Daily Sheet
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [centerFilter, setCenterFilter] = useState<string>("all");
  const [slotFilter, setSlotFilter] = useState<string>("all");

  // Refs for video & canvas loop
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastScannedCodeRef = useRef<{ code: string; time: number } | null>(null);

  // Available grades for dropdown filters
  const availableGrades = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.grade) set.add(r.grade);
    });
    return Array.from(set);
  }, [records]);

  // Available centers (Official + Registered)
  const availableCenters = useMemo(() => {
    const set = new Set<string>();
    OFFICIAL_CENTERS.forEach((c) => set.add(c.name));
    records.forEach((r) => {
      if (r.center) set.add(r.center);
    });
    groupBreakdown.forEach((g) => {
      if (g.centerName && g.centerName !== "بدون سنتر محدد") set.add(g.centerName);
    });
    return Array.from(set);
  }, [records, groupBreakdown]);

  // Available appointment slots dynamically filtered by center
  const availableSlots = useMemo(() => {
    const set = new Set<string>();
    if (selectedCenter !== "all") {
      defaultOfflineCenters
        .filter((c) => c.name.includes(selectedCenter) || selectedCenter.includes(c.name))
        .forEach((c) => set.add(`${c.daysStr} (${c.timeStr})`));
      groupBreakdown
        .filter((g) => g.centerName.includes(selectedCenter) || selectedCenter.includes(g.centerName))
        .forEach((g) => {
          if (g.appointmentSlot && g.appointmentSlot !== "بدون موعد محدد") set.add(g.appointmentSlot);
        });
    } else {
      OFFICIAL_SLOTS.forEach((s) => set.add(s));
      groupBreakdown.forEach((g) => {
        if (g.appointmentSlot && g.appointmentSlot !== "بدون موعد محدد") set.add(g.appointmentSlot);
      });
    }
    records.forEach((r) => {
      if (r.appointmentSlot && r.appointmentSlot !== "غير محدد" && r.appointmentSlot !== "بدون موعد محدد") {
        set.add(r.appointmentSlot);
      }
      if (r.enrolledSlot && r.enrolledSlot !== "غير محدد" && r.enrolledSlot !== "بدون موعد محدد") {
        set.add(r.enrolledSlot);
      }
    });
    return Array.from(set);
  }, [selectedCenter, groupBreakdown, records]);

  // Live Attendance Counters for currently selected active group session
  const activeSessionStats = useMemo(() => {
    if (selectedCenter !== "all" || selectedSlot !== "all") {
      const matchingGroups = groupBreakdown.filter((g) => {
        const matchesCenter = selectedCenter === "all" || g.centerName.includes(selectedCenter) || selectedCenter.includes(g.centerName);
        const matchesSlot = selectedSlot === "all" || normalizeSlotName(g.appointmentSlot) === normalizeSlotName(selectedSlot);
        return matchesCenter && matchesSlot;
      });

      if (matchingGroups.length > 0) {
        let enrolled = 0;
        let present = 0;
        let absent = 0;
        let late = 0;
        let unmarked = 0;
        let makeup = 0;
        matchingGroups.forEach((g) => {
          enrolled += g.totalEnrolled;
          present += g.presentCount;
          absent += g.absentCount;
          late += g.lateCount;
          unmarked += g.unmarkedCount;
          makeup += g.makeupCount;
        });
        const rate = enrolled > 0 ? Math.round(((present + late) / enrolled) * 100) : (present > 0 ? 100 : 0);
        return { enrolled, present, absent, late, unmarked, makeup, rate, isFiltered: true };
      }
    }

    return {
      enrolled: stats.totalStudents,
      present: stats.presentCount,
      absent: stats.absentCount,
      late: stats.lateCount,
      unmarked: stats.unmarkedCount,
      makeup: 0,
      rate: stats.attendanceRate,
      isFiltered: false,
    };
  }, [selectedCenter, selectedSlot, groupBreakdown, stats]);

  // Load Daily Attendance Sheet
  const loadDailySheet = useCallback(async (date: string) => {
    setIsLoadingRecords(true);
    try {
      const res = await fetch(`/api/admin/attendance/daily?date=${encodeURIComponent(date)}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("فشل في تحميل يومية الحضور والغياب");
      }
      const data = await res.json();
      setRecords(data.records || []);
      setGroupBreakdown(data.groupBreakdown || []);
      setStats(data.stats || data.summary || {
        totalStudents: 0,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        unmarkedCount: 0,
        attendanceRate: 0,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "خطأ في تحميل البيانات",
        description: err.message,
      });
    } finally {
      setIsLoadingRecords(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadDailySheet(selectedDate);
  }, [selectedDate, loadDailySheet]);

  // Handle Scanning / Submitting QR code or student identifier
  const handleProcessCode = useCallback(async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;

    // Cooldown check for the same code (prevent duplicate trigger within 3.5 seconds)
    const now = Date.now();
    if (
      lastScannedCodeRef.current &&
      lastScannedCodeRef.current.code === code &&
      now - lastScannedCodeRef.current.time < 3500
    ) {
      return;
    }
    lastScannedCodeRef.current = { code, time: now };

    setIsProcessingScan(true);

    try {
      const res = await fetch("/api/admin/attendance/scan", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrCode: code,
          date: selectedDate,
          status: "present",
          centerName: selectedCenter !== "all" ? selectedCenter : undefined,
          appointmentSlot: selectedSlot !== "all" ? selectedSlot : undefined,
          notifyParent: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (soundEnabled) playScanSound("error");
        toast({
          variant: "destructive",
          title: "تعذر تسجيل الحضور",
          description: data.error || "كود الطالب غير صحيح أو غير موجود",
        });
        return;
      }

      if (data.alreadyRecorded || data.alreadyMarked) {
        if (soundEnabled) playScanSound("warning");
        toast({
          title: "تم التسجيل مسبقاً ⚠️",
          description: `الطالب ${data.student?.name} مسجل حضور بالفعل اليوم الساعة ${data.attendance?.checkInTime}`,
        });
      } else if (data.isCrossGroup) {
        if (soundEnabled) playScanSound("warning");
        triggerHaptic();
        toast({
          title: "حصة تعويضية / مجموعة مختلفة 🔄",
          description: `الطالب (${data.student?.name}) موعده الأصلي: [${data.enrolledSlot}] - تم تسجيل حضوره في هذه المجموعة (${data.activeSlot})`,
        });
      } else {
        if (soundEnabled) playScanSound("success");
        triggerHaptic();
        toast({
          title: "تم تسجيل الحضور بنجاح 🟢",
          description: `${data.student?.name} - ${data.student?.grade || ""}`,
        });
      }

      const scannedItem: LastScannedStudent = {
        name: data.student.name,
        phone: data.student.phone,
        accessCode: data.student.accessCode,
        grade: data.student.grade,
        center: data.student.centerName || data.student.center,
        appointmentSlot: data.activeSlot || data.attendance?.appointmentSlot,
        enrolledSlot: data.enrolledSlot,
        enrolledCenter: data.enrolledCenter,
        isCrossGroup: Boolean(data.isCrossGroup),
        checkInTime: data.attendance?.checkInTime,
        status: data.attendance?.status || "present",
        parentNotified: Boolean(data.parentNotified),
        parentName: data.parent?.name,
        parentPhone: data.parent?.phone,
        notes: data.attendance?.notes,
      };

      setLastScanned(scannedItem);
      setRecentScans((prev) => [scannedItem, ...prev.filter((p) => p.accessCode !== scannedItem.accessCode).slice(0, 9)]);

      // Silently refresh the daily sheet
      void loadDailySheet(selectedDate);
    } catch (err: any) {
      if (soundEnabled) playScanSound("error");
      toast({
        variant: "destructive",
        title: "خطأ في الاتصال بالخادم",
        description: err.message,
      });
    } finally {
      setIsProcessingScan(false);
      setManualInput("");
    }
  }, [selectedDate, selectedCenter, selectedSlot, soundEnabled, toast, loadDailySheet]);

  // Start Camera Feed
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "تم رفض إذن الوصول للكاميرا. برجاء السماح بالوصول من إعدادات المتصفح."
          : "تعذر تشغيل الكاميرا. تأكد من عدم استخدامها بواسطة تطبيق آخر."
      );
      setIsCameraActive(false);
    }
  }, [facingMode]);

  // Stop Camera Feed
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Frame Processing Loop using Native BarcodeDetector (fastest) with jsQR fallback
  useEffect(() => {
    if (!isCameraActive) return;

    let isScanning = true;
    const hasBarcodeDetector = typeof window !== "undefined" && "BarcodeDetector" in window;
    let barcodeDetector: any = null;

    if (hasBarcodeDetector) {
      try {
        barcodeDetector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
      } catch (e) {
        barcodeDetector = null;
      }
    }

    const scanLoop = async () => {
      if (!isScanning) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && video.readyState === video.HAVE_ENOUGH_DATA && !isProcessingScan) {
        // Fast path 1: Native BarcodeDetector
        if (barcodeDetector) {
          try {
            const barcodes = await barcodeDetector.detect(video);
            if (barcodes && barcodes.length > 0) {
              const rawValue = barcodes[0].rawValue;
              if (rawValue) {
                void handleProcessCode(rawValue);
              }
            }
          } catch (e) {
            // Fallback to canvas jsQR
          }
        } else if (canvas) {
          // Fast path 2: jsQR Canvas analysis
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "dontInvert",
            });

            if (qrCode && qrCode.data) {
              void handleProcessCode(qrCode.data);
            }
          }
        }
      }

      if (isScanning) {
        animationFrameRef.current = requestAnimationFrame(scanLoop);
      }
    };

    animationFrameRef.current = requestAnimationFrame(scanLoop);

    return () => {
      isScanning = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isCameraActive, isProcessingScan, handleProcessCode]);

  // Clean up camera on unmount or tab change
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Change student status manually from the sheet
  const handleUpdateStatus = async (
    studentId: number,
    newStatus: "present" | "absent" | "late",
    notify = false
  ) => {
    try {
      const res = await fetch("/api/admin/attendance/manual-status", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          date: selectedDate,
          status: newStatus,
          notifyParent: notify,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل في تحديث حالة الطالب");
      }

      toast({
        title: "تم تحديث الحالة بنجاح",
        description: `تم تعيين حالة الطالب إلى (${
          newStatus === "present" ? "حاضر" : newStatus === "absent" ? "غائب" : "متأخر"
        })${data.parentNotified ? " وإشعار ولي الأمر 📲" : ""}`,
      });

      void loadDailySheet(selectedDate);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: err.message,
      });
    }
  };

  // Bulk mark unmarked students as absent (supports scoping by stage, center, or group slot)
  const handleBulkMarkAbsent = async () => {
    if (stats.unmarkedCount === 0) {
      toast({ title: "لا يوجد طلاب متبقين لتسجيل غيابهم" });
      return;
    }

    const scopeDesc = slotFilter !== "all"
      ? `لمجموعة [${slotFilter}]`
      : centerFilter !== "all"
      ? `لسنتر [${centerFilter}]`
      : "لكافة الطلاب المتبقين في كشف اليومية";

    const confirmMsg = `هل تريد تسجيل الغياب للطلاب المتبقين ${scopeDesc} ليوم ${selectedDate}؟`;
    if (!window.confirm(confirmMsg)) return;

    const notifyParents = window.confirm("هل ترغب في إرسال إشعار غياب فوري لأولياء الأمور المسجلين أيضاً؟");

    try {
      const res = await fetch("/api/admin/attendance/bulk-absent", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          grade: gradeFilter !== "all" ? gradeFilter : undefined,
          center: centerFilter !== "all" ? centerFilter : undefined,
          slot: slotFilter !== "all" ? slotFilter : undefined,
          notifyParents,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل في تسجيل الغياب الجماعي");
      }

      toast({
        title: "تم تسجيل الغياب الجماعي بنجاح",
        description: `تم تحويل ${data.markedAbsentCount} طالب إلى غائب${
          data.parentsNotifiedCount ? ` وإشعار ${data.parentsNotifiedCount} ولي أمر` : ""
        }`,
      });

      void loadDailySheet(selectedDate);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: err.message,
      });
    }
  };

  // Filtered records for the sheet
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Search
      const query = searchQuery.trim().toLowerCase();
      if (query) {
        const matchesName = r.name?.toLowerCase().includes(query);
        const matchesPhone = r.phone?.includes(query);
        const matchesCode = r.accessCode?.toLowerCase().includes(query);
        const matchesCenter = r.center?.toLowerCase().includes(query);
        const matchesSlot = r.appointmentSlot?.toLowerCase().includes(query);
        if (!matchesName && !matchesPhone && !matchesCode && !matchesCenter && !matchesSlot) {
          return false;
        }
      }

      // Status
      if (statusFilter !== "all" && r.status !== statusFilter) {
        return false;
      }

      // Grade
      if (gradeFilter !== "all" && r.grade !== gradeFilter) {
        return false;
      }

      // Center
      if (centerFilter !== "all" && r.center !== centerFilter && r.enrolledCenter !== centerFilter) {
        return false;
      }

      // Slot
      if (slotFilter !== "all") {
        const targetSlot = normalizeSlotName(slotFilter);
        const slotMatches = normalizeSlotName(r.appointmentSlot) === targetSlot || normalizeSlotName(r.enrolledSlot) === targetSlot;
        if (!slotMatches) return false;
      }

      return true;
    });
  }, [records, searchQuery, statusFilter, gradeFilter, centerFilter, slotFilter]);

  // Export / Print
  const handlePrintSheet = () => {
    window.print();
  };

  return (
    <div className="attendance-scanner-workspace space-y-6 text-[#0F172A]" dir="rtl">
      {/* 1. Header & Quick Controls */}
      <div className="flex flex-col gap-4 border-b border-[#E2E8F0] pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60">
              <QrCode className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-[#0F172A]">
                تسجيل الحضور والغياب (QR Scan)
              </h1>
              <p className="text-xs text-[#64748B] mt-0.5">
                مسح فوري سريع لكود الطالب بالكاميرا، تسجيل الحضور، إشعار ولي الأمر، وكشف الغياب اليومي
              </p>
            </div>
          </div>
        </div>

        {/* Date Selector & Mode Switch */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-white border border-[#E2E8F0] px-3 py-1.5 rounded-xl shadow-xs">
            <Calendar className="h-4 w-4 text-[#64748B]" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
            />
            {selectedDate !== todayStr && (
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md"
              >
                اليوم
              </button>
            )}
          </div>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            title={soundEnabled ? "كتم صوت الـ Beep" : "تشغيل صوت الـ Beep"}
            className={`p-2.5 rounded-xl border transition-colors ${
              soundEnabled
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-slate-100 border-slate-200 text-slate-500"
            }`}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {/* Refresh */}
          <button
            type="button"
            onClick={() => void loadDailySheet(selectedDate)}
            disabled={isLoadingRecords}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-all shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingRecords ? "animate-spin text-blue-600" : ""}`} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* 2. Top Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-[#E2E8F0]">
        <button
          type="button"
          onClick={() => setActiveTab("scanner")}
          className={`flex items-center gap-2 pb-3.5 px-2 text-sm font-black border-b-2 transition-all ${
            activeTab === "scanner"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Camera className="h-4 w-4" />
          <span>الماسح السريع (Live QR Camera)</span>
          <span className="px-2 py-0.5 text-[10px] rounded-full bg-blue-100 text-blue-700 font-bold">
            سريع ومباشر
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("sheet")}
          className={`flex items-center gap-2 pb-3.5 px-2 text-sm font-black border-b-2 transition-all ${
            activeTab === "sheet"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>يومية الحضور والغياب الكاملة</span>
          <span className="px-2 py-0.5 text-[10px] rounded-full bg-slate-100 text-slate-700 font-bold">
            {records.length} طالب
          </span>
        </button>
      </div>

      {/* 3. KPI Stats Bar (Always visible) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>إجمالي الطلاب</span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-xl font-black text-slate-900">{stats.totalStudents}</div>
          <span className="text-[11px] text-slate-400">طالب مسجل</span>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-bold mb-1">
            <span>الحاضرون 🟢</span>
            <UserCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-800">{stats.presentCount}</div>
          <span className="text-[11px] font-bold text-emerald-600">نسبة الحضور: {stats.attendanceRate}%</span>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-red-700 text-xs font-bold mb-1">
            <span>الغياب 🔴</span>
            <UserX className="h-4 w-4 text-red-600" />
          </div>
          <div className="text-xl font-black text-red-800">{stats.absentCount}</div>
          <span className="text-[11px] text-red-600">طالب غائب</span>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-amber-700 text-xs font-bold mb-1">
            <span>المتأخرون 🟡</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-800">{stats.lateCount}</div>
          <span className="text-[11px] text-amber-600">طالب متأخر</span>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-blue-700 text-xs font-bold mb-1">
            <span>بانتظار التسجيل ⏳</span>
            <AlertTriangle className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-xl font-black text-blue-800">{stats.unmarkedCount}</div>
          <span className="text-[11px] text-blue-600">لم يسجل بعد</span>
        </div>

        <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-3.5 shadow-xs flex flex-col justify-center">
          <button
            type="button"
            onClick={handleBulkMarkAbsent}
            disabled={stats.unmarkedCount === 0}
            className="w-full py-2 px-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
          >
            <UserX className="h-3.5 w-3.5" />
            <span>تسجيل المتبقين غياب</span>
          </button>
        </div>
      </div>

      {/* 4. Scanner Tab Content */}
      {activeTab === "scanner" && (
        <div className="space-y-4">
          {/* Active Center & Appointment Slot Selector Bar */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white rounded-3xl p-4 shadow-xl border border-blue-500/20">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Selectors */}
              <div className="flex flex-wrap items-center gap-3 flex-1">
                {/* Center Selector */}
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-2 rounded-2xl border border-white/10 flex-1 min-w-[200px]">
                  <span className="p-1.5 rounded-xl bg-blue-500/30 text-blue-300">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-blue-200 block">سنتر الحصة النشط:</label>
                    <select
                      value={selectedCenter}
                      onChange={(e) => {
                        setSelectedCenter(e.target.value);
                        setSelectedSlot("all");
                      }}
                      className="w-full bg-transparent text-white text-xs font-bold outline-none cursor-pointer mt-0.5"
                    >
                      <option value="all" className="bg-slate-900 text-white">جميع السناتر (تلقائي بحسب قيد الطالب)</option>
                      {availableCenters.map((c) => (
                        <option key={c} value={c} className="bg-slate-900 text-white">{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Slot / Group Selector */}
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-2 rounded-2xl border border-white/10 flex-1 min-w-[200px]">
                  <span className="p-1.5 rounded-xl bg-purple-500/30 text-purple-300">
                    <Clock className="h-4 w-4" />
                  </span>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-purple-200 block">موعد الحصة / المجموعة:</label>
                    <select
                      value={selectedSlot}
                      onChange={(e) => setSelectedSlot(e.target.value)}
                      className="w-full bg-transparent text-white text-xs font-bold outline-none cursor-pointer mt-0.5"
                    >
                      <option value="all" className="bg-slate-900 text-white">جميع المواعيد والمجموعات</option>
                      {availableSlots.map((s) => (
                        <option key={s} value={s} className="bg-slate-900 text-white">{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Live Group Session Counters */}
              <div className="flex items-center justify-around sm:justify-end gap-2 sm:gap-4 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 shrink-0">
                <div className="text-center px-1">
                  <span className="block text-[10px] text-blue-200 font-bold">مسجلو المجموعة</span>
                  <span className="text-sm font-black text-white">{activeSessionStats.enrolled}</span>
                </div>
                <div className="h-6 w-px bg-white/20" />
                <div className="text-center px-1">
                  <span className="block text-[10px] text-emerald-300 font-bold">حضر 🟢</span>
                  <span className="text-sm font-black text-emerald-400">{activeSessionStats.present}</span>
                </div>
                <div className="h-6 w-px bg-white/20" />
                <div className="text-center px-1">
                  <span className="block text-[10px] text-red-300 font-bold">متبقي 🔴</span>
                  <span className="text-sm font-black text-red-400">{activeSessionStats.unmarked + activeSessionStats.absent}</span>
                </div>
                {activeSessionStats.makeup > 0 && (
                  <>
                    <div className="h-6 w-px bg-white/20" />
                    <div className="text-center px-1">
                      <span className="block text-[10px] text-purple-300 font-bold">تعويض 🔄</span>
                      <span className="text-sm font-black text-purple-300">+{activeSessionStats.makeup}</span>
                    </div>
                  </>
                )}
                <div className="h-6 w-px bg-white/20" />
                <div className="text-center px-1">
                  <span className="block text-[10px] text-amber-300 font-bold">نسبة الحضور</span>
                  <span className="text-sm font-black text-amber-300">{activeSessionStats.rate}%</span>
                </div>
              </div>
            </div>

            {/* Active Mode Notice */}
            <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-wrap items-center justify-between text-[11px] text-slate-300">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {selectedCenter !== "all" || selectedSlot !== "all" ? (
                  <span>
                    الماسح نشط حالياً لمجموعة: <b>{selectedCenter !== "all" ? selectedCenter : "كل السناتر"}</b> — <b>{selectedSlot !== "all" ? selectedSlot : "كل المواعيد"}</b>
                  </span>
                ) : (
                  <span>الماسح نشط لكافة المجموعات والسناتر مع تسجيل المجموعة تلقائياً بحسب قيد الطالب</span>
                )}
              </span>
              <span className="text-slate-400">
                أي طالب من مجموعة أخرى يتم مسحه يُسجل كحضور تعويضي وينبهك النظام فوراً ⚠️
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Camera Viewfinder (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="relative overflow-hidden rounded-3xl border-2 border-slate-800 bg-black aspect-[4/3] flex flex-col items-center justify-center shadow-xl">
                {/* Hidden Canvas for QR parsing */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Video Feed */}
                <video
                  ref={videoRef}
                  className={`w-full h-full object-cover ${isCameraActive ? "block" : "hidden"}`}
                />

                {/* Camera Inactive Overlay */}
                {!isCameraActive && (
                  <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-3">
                    <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                      <CameraOff className="h-8 w-8" />
                    </div>
                    <div className="max-w-xs">
                      <h3 className="text-base font-black text-white">الكاميرا متوقفة</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        اضغط على زر تشغيل الكاميرا لبدء فحص كروت الطلاب وتسجيل الحضور آلياً وبسرعة فائقة.
                      </p>
                    </div>
                    {cameraError && (
                      <div className="p-3 bg-red-900/40 border border-red-700/60 rounded-xl text-xs text-red-300 max-w-sm">
                        {cameraError}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-all"
                    >
                      <Camera className="h-4 w-4" />
                      <span>تشغيل الكاميرا الآن</span>
                    </button>
                  </div>
                )}

                {/* Active Scanner Frame & Neon Targeting Grid */}
                {isCameraActive && (
                  <>
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="relative w-64 h-64 sm:w-72 sm:h-72 border-2 border-emerald-400/80 rounded-3xl shadow-[0_0_20px_rgba(52,211,153,0.3)] flex items-center justify-center overflow-hidden">
                        {/* Corner Accents */}
                        <div className="absolute top-2 right-2 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                        <div className="absolute top-2 left-2 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                        <div className="absolute bottom-2 right-2 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
                        <div className="absolute bottom-2 left-2 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />

                        {/* Animated Laser Scanning Line */}
                        <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-pulse" />

                        <div className="text-center bg-black/60 backdrop-blur-xs px-3 py-1 rounded-full border border-emerald-500/40 text-[11px] font-bold text-emerald-300">
                          وجّه الكاميرا نحو كود الطالب
                        </div>
                      </div>
                    </div>

                    {/* Top Bar Floating Controls */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-auto">
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-emerald-400 text-xs font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        ماسح نشط 60fps
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setFacingMode((prev) => (prev === "environment" ? "user" : "environment"))}
                          className="p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white hover:bg-black/80 transition-all text-xs flex items-center gap-1"
                          title="تبديل الكاميرا (الأمامية / الخلفية)"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span className="text-[11px] font-medium hidden sm:inline">تبديل</span>
                        </button>

                        <button
                          type="button"
                          onClick={stopCamera}
                          className="p-2 rounded-xl bg-red-600/80 backdrop-blur-md border border-red-500 text-white hover:bg-red-700 transition-all text-xs flex items-center gap-1"
                        >
                          <CameraOff className="h-3.5 w-3.5" />
                          <span className="text-[11px] font-medium hidden sm:inline">إيقاف</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Scanning Processing Spinner */}
                {isProcessingScan && (
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20 space-y-2">
                    <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-bold text-emerald-300">جاري تسجيل الحضور وإشعار ولي الأمر...</span>
                  </div>
                )}
              </div>

              {/* Manual QR / Student Code or Phone Input Fallback */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (manualInput.trim()) {
                      void handleProcessCode(manualInput.trim());
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <div className="relative flex-1">
                    <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      placeholder="إدخال يدوي: كود الطالب أو رقم الهاتف أو STD-..."
                      className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold text-slate-800 outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!manualInput.trim() || isProcessingScan}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>تسجيل</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column: Scanned Result Card & Live History (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Last Scanned Student Highlight Card */}
              {lastScanned ? (
                <div className="rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-white to-white p-5 shadow-lg relative overflow-hidden">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-lg font-black shadow-md shadow-emerald-500/20">
                        <CheckCircle2 className="h-7 w-7" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-900 leading-tight">
                          {lastScanned.name}
                        </h3>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                          تم تسجيل الحضور اليوم 🟢
                        </span>
                      </div>
                    </div>

                    <span className="text-xs font-black text-slate-700 bg-slate-100 px-2.5 py-1 rounded-xl">
                      {lastScanned.checkInTime}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100 my-2">
                    <div>
                      <span className="text-[11px] text-slate-400 block">المرحلة / الصف:</span>
                      <span className="font-bold text-slate-800">{lastScanned.grade || "غير محدد"}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">السنتر / الحضور:</span>
                      <span className="font-bold text-slate-800">{lastScanned.center || "أونلاين / عام"}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">مجموعة الحضور:</span>
                      <span className="font-bold text-blue-700 truncate block">{lastScanned.appointmentSlot || "غير محدد"}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">كود الطالب:</span>
                      <span className="font-bold font-mono text-blue-600">{lastScanned.accessCode}</span>
                    </div>
                  </div>

                  {/* Cross Group Alert Badge if Makeup */}
                  {lastScanned.isCrossGroup && (
                    <div className="my-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 text-xs font-bold flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      <div>
                        <span>حصة تعويضية 🔄: موعد الطالب الأصلي </span>
                        <strong className="underline decoration-amber-500 font-black">
                          [{lastScanned.enrolledSlot || "غير محدد"}]
                        </strong>
                        <span> وتم تسجيل حضوره في هذه المجموعة</span>
                      </div>
                    </div>
                  )}

                  {/* Parent Notification Status */}
                  <div className="mt-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                    <div className={`p-2 rounded-xl shrink-0 ${
                      lastScanned.parentNotified
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-600"
                    }`}>
                      <Bell className="h-4 w-4" />
                    </div>
                    <div className="text-xs">
                      {lastScanned.parentNotified ? (
                        <div>
                          <strong className="text-emerald-700 font-bold block">
                            تم إشعار ولي الأمر فورياً بنجاح 📲
                          </strong>
                          <span className="text-slate-500 text-[11px]">
                            {lastScanned.parentName || "حساب ولي الأمر المسجل"} ({lastScanned.parentPhone})
                          </span>
                        </div>
                      ) : (
                        <div>
                          <strong className="text-slate-600 font-bold block">
                            لا يوجد حساب ولي أمر مسجل لهذا الطالب
                          </strong>
                          <span className="text-slate-400 text-[11px]">
                            يمكن لولي الأمر التسجيل بكود الطالب لتلقي إشعارات الحضور
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center flex flex-col items-center justify-center text-slate-400 min-h-[220px]">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700">بانتظار مسح أول طالب</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    عند توجيه الكاميرا لكود الطالب ستظهر بياناته هنا فورياً وسيتم حفظ الحضور في قاعدة البيانات وإشعار ولي أمره.
                  </p>
                </div>
              )}

            {/* Recent Scans History */}
            <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-blue-600" />
                  <span>آخر الطلاب الحاضرين اليوم ({recentScans.length})</span>
                </h4>
              </div>

              {recentScans.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  لم يتم مسح أي كود حتى الآن اليوم
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                  {recentScans.map((student, idx) => (
                    <div key={`${student.accessCode}-${idx}`} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0 flex-1">
                        <strong className="block text-slate-900 font-bold truncate">
                          {student.name}
                        </strong>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span>{student.grade}</span>
                          {student.parentNotified && (
                            <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                              • إشعار ولي الأمر 📲
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-left shrink-0">
                        <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {student.checkInTime}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )}

      {/* 5. Daily Attendance Sheet Tab Content */}
      {activeTab === "sheet" && (
        <div className="space-y-4">
          {/* Group Breakdown Cards Grid (حضور المجموعات والسناتر) */}
          {groupBreakdown.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
                    <Layers className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      حضور المجموعات والسناتر اليوم ({groupBreakdown.length} مجموعة)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      انقر على أي كارت مجموعة لتصفية الجدول وحصر تسجيل الغياب عليها فوراً
                    </p>
                  </div>
                </div>

                {(centerFilter !== "all" || slotFilter !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setCenterFilter("all");
                      setSlotFilter("all");
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-xl transition-all self-start sm:self-auto"
                  >
                    إلغاء تصفية المجموعة (عرض الكل) ✕
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {groupBreakdown.map((grp) => {
                  const isSelected = centerFilter === grp.centerName && slotFilter === grp.appointmentSlot;
                  return (
                    <div
                      key={`${grp.centerName}-${grp.appointmentSlot}`}
                      onClick={() => {
                        if (isSelected) {
                          setCenterFilter("all");
                          setSlotFilter("all");
                        } else {
                          setCenterFilter(grp.centerName);
                          setSlotFilter(grp.appointmentSlot);
                        }
                      }}
                      className={`cursor-pointer rounded-2xl p-3.5 transition-all border text-right relative overflow-hidden ${
                        isSelected
                          ? "bg-blue-50/90 border-blue-500 shadow-md ring-2 ring-blue-500/30"
                          : "bg-slate-50/60 border-slate-200 hover:border-blue-300 hover:bg-white hover:shadow-xs"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <strong className="block text-xs font-black text-slate-900 truncate">
                            {grp.centerName}
                          </strong>
                          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                            <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate">{grp.appointmentSlot}</span>
                          </span>
                        </div>
                        {grp.makeupCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[10px] font-black shrink-0">
                            +{grp.makeupCount} تعويض
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs py-1.5 border-t border-slate-200/60 mt-2">
                        <span className="text-slate-500 font-bold text-[11px]">
                          المسجلين: <b className="text-slate-800 font-black">{grp.totalEnrolled}</b>
                        </span>
                        <span className="text-emerald-700 font-black text-[11px]">
                          حضر: {grp.presentCount + grp.lateCount}
                        </span>
                        <span className="text-red-700 font-black text-[11px]">
                          متبقي/غائب: {grp.absentCount + grp.unmarkedCount}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-200/70 h-1.5 rounded-full overflow-hidden mt-1.5">
                        <div
                          className={`h-full transition-all rounded-full ${
                            grp.attendanceRate >= 80
                              ? "bg-emerald-500"
                              : grp.attendanceRate >= 50
                              ? "bg-amber-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, grp.attendanceRate))}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400 font-bold">
                        <span>نسبة الحضور</span>
                        <span className="text-slate-700 font-black">{grp.attendanceRate}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filters & Action Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              {/* Search Bar */}
              <div className="relative min-w-[180px] flex-1">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث بالاسم، الكود، أو الهاتف..."
                  className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold text-slate-800 outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 outline-none"
              >
                <option value="all">كل الحالات ({records.length})</option>
                <option value="present">حاضر 🟢 ({stats.presentCount})</option>
                <option value="absent">غائب 🔴 ({stats.absentCount})</option>
                <option value="late">متأخر 🟡 ({stats.lateCount})</option>
                <option value="unmarked">لم يسجل ⚪ ({stats.unmarkedCount})</option>
              </select>

              {/* Grade Filter */}
              {availableGrades.length > 0 && (
                <select
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="all">جميع المراحل</option>
                  {availableGrades.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              )}

              {/* Center Filter */}
              {availableCenters.length > 0 && (
                <select
                  value={centerFilter}
                  onChange={(e) => setCenterFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="all">جميع السناتر</option>
                  {availableCenters.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              )}

              {/* Slot / Group Filter */}
              {availableSlots.length > 0 && (
                <select
                  value={slotFilter}
                  onChange={(e) => setSlotFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 outline-none max-w-[200px]"
                >
                  <option value="all">جميع المواعيد / المجموعات</option>
                  {availableSlots.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Print & Bulk Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrintSheet}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-xs transition-all"
              >
                <Printer className="h-3.5 w-3.5 text-slate-500" />
                <span>طباعة الكشف</span>
              </button>

              <button
                type="button"
                onClick={handleBulkMarkAbsent}
                disabled={stats.unmarkedCount === 0}
                className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
              >
                <UserX className="h-3.5 w-3.5" />
                <span>
                  {slotFilter !== "all" || centerFilter !== "all" ? "تحويل المتبقين بالمجموعة لغياب" : `تحويل المتبقين لغياب (${stats.unmarkedCount})`}
                </span>
              </button>
            </div>
          </div>

          {/* Students Daily Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-black">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">الطالب</th>
                    <th className="py-3 px-4">كود الطالب</th>
                    <th className="py-3 px-4">المرحلة / الصف</th>
                    <th className="py-3 px-4">السنتر والمجموعة</th>
                    <th className="py-3 px-4">حالة الحضور</th>
                    <th className="py-3 px-4">وقت الحضور</th>
                    <th className="py-3 px-4">حساب ولي الأمر</th>
                    <th className="py-3 px-4 text-center">إجراءات سريعة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 font-bold">
                        {isLoadingRecords ? "جاري تحميل يومية الحضور..." : "لا توجد سجلات مطابقة للبحث أو الفلتر"}
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((record, index) => (
                      <tr
                        key={record.studentId}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          record.status === "present"
                            ? "bg-emerald-50/20"
                            : record.status === "absent"
                            ? "bg-red-50/20"
                            : record.status === "late"
                            ? "bg-amber-50/20"
                            : ""
                        }`}
                      >
                        <td className="py-3 px-4 text-slate-400 font-mono">{index + 1}</td>

                        {/* Student Info */}
                        <td className="py-3 px-4">
                          <strong className="block text-slate-900 font-bold">{record.name}</strong>
                          <span className="text-[11px] text-slate-400 font-mono">{record.phone}</span>
                        </td>

                        {/* Access Code */}
                        <td className="py-3 px-4 font-mono font-bold text-blue-600">
                          {record.accessCode}
                        </td>

                        {/* Grade */}
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {record.grade || "—"}
                        </td>

                        {/* Center & Slot */}
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {record.center ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 text-slate-800 font-bold">
                                <MapPin className="h-3 w-3 text-emerald-600" />
                                {record.center}
                              </span>
                              {record.appointmentSlot && (
                                <span className="block text-[10px] text-slate-500 font-mono truncate max-w-[200px]">
                                  {record.appointmentSlot}
                                </span>
                              )}
                              {record.isCrossGroup && (
                                <span className="inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                                  تعويض (الأصل: {record.enrolledSlot})
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">أونلاين</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-4">
                          {record.status === "present" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                              <CheckCircle2 className="h-3 w-3" /> حاضر
                            </span>
                          )}
                          {record.status === "absent" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-100 text-red-800 font-bold text-[11px]">
                              <XCircle className="h-3 w-3" /> غائب
                            </span>
                          )}
                          {record.status === "late" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-bold text-[11px]">
                              <Clock className="h-3 w-3" /> متأخر
                            </span>
                          )}
                          {record.status === "unmarked" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-bold text-[11px]">
                              لم يُسجل بعد
                            </span>
                          )}
                        </td>

                        {/* Check-in Time */}
                        <td className="py-3 px-4 text-slate-600 font-mono font-bold text-[11px]">
                          {record.checkInTime || "—"}
                        </td>

                        {/* Parent Account & Notification */}
                        <td className="py-3 px-4">
                          {record.hasParentAccount ? (
                            <div>
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                                <Bell className="h-3 w-3" /> مسجل: {record.parentName}
                              </span>
                              {record.parentNotified && (
                                <span className="block text-[10px] text-slate-400 mt-0.5">
                                  تم إرسال إشعار 📲
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">غير مسجل</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(record.studentId, "present", true)}
                              title="تسجيل حاضر وإشعار ولي الأمر"
                              className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all ${
                                record.status === "present"
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "text-slate-600 hover:text-emerald-700 hover:bg-white"
                              }`}
                            >
                              حاضر
                            </button>

                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(record.studentId, "late", true)}
                              title="تسجيل متأخر"
                              className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all ${
                                record.status === "late"
                                  ? "bg-amber-500 text-white shadow-xs"
                                  : "text-slate-600 hover:text-amber-700 hover:bg-white"
                              }`}
                            >
                              متأخر
                            </button>

                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(record.studentId, "absent", true)}
                              title="تسجيل غائب وإشعار ولي الأمر"
                              className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all ${
                                record.status === "absent"
                                  ? "bg-red-600 text-white shadow-xs"
                                  : "text-slate-600 hover:text-red-700 hover:bg-white"
                              }`}
                            >
                              غائب
                            </button>

                            {(record.parentPhone || record.phone) && (
                              <button
                                type="button"
                                onClick={() => {
                                  const raw = record.parentPhone || record.phone;
                                  const clean = (raw || "").replace(/\D/g, "");
                                  const phoneWithCountry = clean.startsWith("20") ? clean : clean.startsWith("0") ? `20${clean.slice(1)}` : `20${clean}`;
                                  const statusText = record.status === "present" ? "حاضر ✓" : record.status === "absent" ? "غائب ✕" : record.status === "late" ? "متأخر ⏳" : "لم يُسجل بعد";
                                  const msg = `السلام عليكم ورحمة الله، من أكاديمية د. محمود المهدي:\nنحيطكم علماً بحالة حضور الطالب (${record.name}) لحصة اليوم (${selectedDate}): [${statusText}].\nنتمنى له دوام التوفيق والتميز.`;
                                  window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(msg)}`, "_blank");
                                }}
                                title="إرسال إشعار مباشر لولي الأمر عبر واتساب"
                                className="px-2 py-1 rounded-lg font-bold text-[11px] text-emerald-700 hover:bg-emerald-50 transition-all flex items-center gap-1"
                              >
                                <Phone className="h-3 w-3 text-emerald-600" />
                                <span>واتساب</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
