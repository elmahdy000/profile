import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive" | "warning";
  onConfirm: () => Promise<void> | void;
}

interface ConfirmModalProps {
  modal: ConfirmModalState | null;
  onClose: () => void;
}

export function ConfirmModal({ modal, onClose }: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {modal?.isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] grid place-items-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.94, opacity: 0 }}
            className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-white p-6 shadow-2xl dark:border-border dark:bg-[#111C2E]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${
                modal.variant === "destructive"
                  ? "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400"
                  : modal.variant === "warning"
                  ? "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
                  : "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
              }`}>
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="space-y-1 text-right">
                <h3 className="text-lg font-black text-foreground dark:text-slate-100">
                  {modal.title}
                </h3>
                <p className="text-sm font-medium text-muted-foreground dark:text-slate-300">
                  {modal.message}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-border">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-border bg-white px-4 py-2.5 text-xs font-bold text-muted-foreground transition hover:bg-muted dark:border-slate-700 dark:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
              >
                {modal.cancelText || "إلغاء"}
              </button>
              <button
                type="button"
                onClick={async () => {
                  const action = modal.onConfirm;
                  onClose();
                  await action();
                }}
                className={`rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-md transition cursor-pointer ${
                  modal.variant === "destructive"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-[#2583F7] hover:bg-[#1470DB]"
                }`}
              >
                {modal.confirmText || "تأكيد"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
