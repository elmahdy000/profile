import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { VideoItem } from "@/lib/video";

export function UnlockModal({
  item,
  refetch,
  onClose,
  onSuccess,
}: {
  item: VideoItem;
  refetch: () => Promise<any>;
  onClose: () => void;
  onSuccess: (unlockedItem: VideoItem) => void;
}) {
  const [keyInput, setKeyInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const { toast } = useToast();

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) return;

    setIsVerifying(true);
    setErrorMsg("");

    try {
      const existing = localStorage.getItem("dr_mahmoud_unlock_keys") || "";
      const keysArray = existing
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);

      const newKeyClean = keyInput.trim();
      const updatedKeys = [...keysArray];
      if (!updatedKeys.includes(newKeyClean)) {
        updatedKeys.push(newKeyClean);
      }

      localStorage.setItem("dr_mahmoud_unlock_keys", updatedKeys.join(","));

      const refetchResult = await refetch();
      const updatedVideos = refetchResult.data;

      const updatedItem = updatedVideos?.find((v: any) => v.id === item.id);

      if (updatedItem && updatedItem.youtubeUrl !== "locked") {
        toast({
          title: "تم تفعيل المحاضرة بنجاح 🎉",
          description: `المحاضرة "${item.title}" متاحة للمشاهدة الآن.`,
        });
        onSuccess(updatedItem as VideoItem);
      } else {
        localStorage.setItem("dr_mahmoud_unlock_keys", keysArray.join(","));
        setErrorMsg(
          "كود التفعيل غير صحيح أو غير متوافق مع هذا الفيديو. يرجى التحقق منه والمحاولة مرة أخرى."
        );
        toast({
          variant: "destructive",
          title: "فشل تفعيل المحاضرة ❌",
          description: "كود التفعيل المدخل غير صحيح لهذا الفيديو.",
        });
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("حدث خطأ أثناء الاتصال بالسيرفر. يرجى المحاولة لاحقاً.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-md bg-card border border-border rounded-3xl overflow-hidden shadow-2xl p-6 md:p-8 flex flex-col gap-6 text-right"
          dir="rtl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            ✕
          </button>

          <div className="flex flex-col items-center text-center gap-3 mt-2">
            <div className="w-16 h-16 rounded-full bg-secondary/10 border border-secondary/30 flex items-center justify-center text-secondary shadow-lg shadow-secondary/5">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-foreground">محتوى مدفوع ومحمي 🔒</h3>
            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
              هذه المحاضرة جزء من المحتوى الخاص بمشتركي الكورس المدفوع. يرجى إدخال كود التفعيل المخصص لك لتتمكن من مشاهدتها.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="activationCode" className="text-xs font-bold text-foreground/80 block">
                كود التفعيل (Access Key)
              </label>
              <input
                type="text"
                id="activationCode"
                required
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="أدخل الكود هنا (مثال: c++-course-key-xyz)"
                className="w-full h-11 px-4 rounded-xl border border-border bg-background focus:outline-none focus:border-primary text-sm transition-all text-center font-mono placeholder:text-muted-foreground/40 text-foreground"
              />
              {errorMsg && (
                <p className="text-[11px] text-red-500 font-bold leading-relaxed">{errorMsg}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isVerifying}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري التحقق من الكود...
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  تفعيل ومشاهدة الآن
                </>
              )}
            </Button>
          </form>

          <div className="border-t border-border pt-4 flex flex-col gap-2">
            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              لم تحصل على كود تفعيل بعد؟ لا تقلق، يمكنك التواصل مع د. محمود مباشرة للحجز والحصول على الكود فوراً.
            </p>
            <Button
              asChild
              variant="outline"
              className="w-full border-secondary/20 hover:border-secondary/50 hover:bg-secondary/10 text-secondary font-bold h-11 rounded-xl transition-all"
            >
              <a
                href={`https://wa.me/201044348610?text=${encodeURIComponent(
                  `أهلاً دكتور محمود، أود الاشتراك في الكورس وتفعيل المحاضرة: "${item.title}"`
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                تواصل لحجز الكورس عبر واتساب
              </a>
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
