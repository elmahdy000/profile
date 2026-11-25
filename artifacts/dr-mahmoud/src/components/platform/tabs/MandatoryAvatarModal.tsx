import React, { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Image as ImageIcon, Loader2, ShieldAlert, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import type { Student } from "@/types/platform";
import {
  getStudentAuthHeaders,
  isLikelyImageFile,
  MAX_CLIENT_AVATAR_BYTES,
  prepareAvatarUploadFile,
} from "@/lib/studentUploadHelpers";

interface MandatoryAvatarModalProps {
  student: Student;
  onAvatarUploaded: (avatarUrl: string) => void;
}

export function MandatoryAvatarModal({
  student,
  onAvatarUploaded,
}: MandatoryAvatarModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const hasAvatar = Boolean(student.avatarUrl && student.avatarUrl.trim() && student.avatarUrl !== "null");
  if (hasAvatar) return null;

  const handleFilePick = (file?: File) => {
    if (!file) return;
    if (!isLikelyImageFile(file)) {
      toast({
        variant: "destructive",
        title: "صيغة الملف غير مدعومة",
        description: "اختار صورة من الموبايل أو الكاميرا.",
      });
      return;
    }
    if (file.size > MAX_CLIENT_AVATAR_BYTES) {
      toast({
        variant: "destructive",
        title: "حجم الصورة كبير جداً",
        description: "اختار صورة حجمها أقل من 25 ميجا.",
      });
      return;
    }
    setSelectedFile(file);
    setPreviewFailed(false);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      inputRef.current?.click();
      return;
    }
    setUploading(true);
    try {
      const { blob, filename } = await prepareAvatarUploadFile(selectedFile);
      const formData = new FormData();
      formData.append("avatar", blob, filename);
      const res = await fetch("/api/student/avatar", {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: getStudentAuthHeaders(false),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "تعذر رفع الصورة، جرّب تاني");
      }
      toast({
        title: "تم رفع صورتك بنجاح 🎉",
        description: "أهلاً بيك يا بطل! صورتك هتظهر دلوقتي في حسابك ولوحة الشرف.",
      });
      onAvatarUploaded(data.avatarUrl);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "تعذر رفع الصورة",
        description: err.message || "حاول مرة تانية بصورة تانية",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      dir="rtl"
    >
      <div className="w-full max-w-md rounded-3xl border-2 border-blue-500/40 bg-card p-6 shadow-2xl space-y-5 text-right animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-border pb-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            <Camera className="h-6 w-6" />
          </span>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-foreground">
                ارفع صورة واضحة لحسابك 📸
              </h3>
              <span className="rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 px-2 py-0.5 text-[10px] font-black">
                إلزامي
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              أهلاً يا <strong>{student.name}</strong>! عشان تقدر تكمل على المنصة، ارفع صورة شخصية واضحة ليك عشان نميّزك وسط زمايلك في السنتر ولوحة الشرف.
            </p>
          </div>
        </div>

        {/* Preview Circle */}
        <div className="flex flex-col items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.heic,.heif,.avif,.jfif,.bmp,.tif,.tiff"
            className="sr-only"
            onChange={(e) => {
              handleFilePick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="group relative h-36 w-36 rounded-full border-4 border-dashed border-blue-400/70 hover:border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 flex items-center justify-center overflow-hidden transition-all cursor-pointer shadow-md"
          >
            {previewUrl && !previewFailed ? (
              <img
                src={previewUrl}
                alt="معاينة الصورة"
                onError={() => setPreviewFailed(true)}
                className="h-full w-full object-cover"
              />
            ) : selectedFile ? (
              <div className="flex flex-col items-center gap-1 text-emerald-600 dark:text-emerald-400 px-3 text-center">
                <ImageIcon className="h-8 w-8" />
                <span className="text-[11px] font-black leading-tight">تم اختيار الصورة</span>
                <span className="text-[9px] font-medium opacity-80 truncate max-w-[110px]">{selectedFile.name}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-blue-600 dark:text-blue-400 px-3 text-center">
                <Upload className="h-8 w-8 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-black">اضغط لاختيار صورتك</span>
              </div>
            )}
          </button>

          {selectedFile && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
            >
              تغيير الصورة المختارة
            </button>
          )}
        </div>

        {/* Clear Photo Guidelines */}
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200 space-y-1">
          <div className="font-black flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
            <span>شروط الصورة المقبولة:</span>
          </div>
          <ul className="list-disc pr-5 space-y-0.5 text-[11px] font-semibold opacity-90">
            <li>صورة شخصية واضحة لوجهك (مش صورة سوداء أو كرتون أو كتابة).</li>
            <li>الصورة بتظهر في كارنيه السنتر ولوحة الشرف للمتفوقين.</li>
          </ul>
        </div>

        {/* Action Button */}
        <Button
          type="button"
          disabled={uploading}
          onClick={() => void handleUpload()}
          className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-lg shadow-blue-600/20 cursor-pointer flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>جارٍ حفظ الصورة...</span>
            </>
          ) : selectedFile ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              <span>تأكيد وحفظ الصورة والدخول للمنصة 🚀</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>اختار صورتك دلوقتي</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
