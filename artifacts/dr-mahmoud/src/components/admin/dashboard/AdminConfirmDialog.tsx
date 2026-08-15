import React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface AdminConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  studentName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AdminConfirmDialog({
  isOpen,
  title,
  description,
  studentName,
  confirmLabel = "تأكيد الإجراء",
  cancelLabel = "إلغاء",
  variant = "danger",
  isLoading = false,
  onConfirm,
  onCancel,
}: AdminConfirmDialogProps) {
  if (!isOpen) return null;

  const headerColors = {
    danger: "border-rose-500/30 bg-rose-500/10 text-rose-400",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    info: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  }[variant];

  const buttonStyle = {
    danger: "bg-rose-600 hover:bg-rose-700 text-white",
    warning: "bg-amber-600 hover:bg-amber-700 text-white",
    info: "bg-[#1677FF] hover:bg-[#4096FF] text-white",
  }[variant];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
        onClick={onCancel}
      />

      {/* Dialog Box */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-700/80 bg-[#131E31] p-6 shadow-2xl transition-all text-[#F8FAFC]">
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${headerColors}`}>
            <AlertTriangle className="h-6 w-6" />
          </div>

          <div className="flex-1 space-y-1 text-right">
            <h3 className="text-lg font-extrabold text-[#F8FAFC]">{title}</h3>
            {studentName && (
              <div className="inline-block rounded-lg bg-slate-800/80 px-2.5 py-1 text-xs font-bold text-[#1677FF] dir-ltr text-right">
                {studentName}
              </div>
            )}
            <p className="text-xs text-[#CBD5E1] leading-relaxed pt-1">{description}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isLoading}
            className="h-10 border-slate-700 bg-slate-800/80 text-xs font-bold text-[#CBD5E1] hover:bg-slate-700 hover:text-white"
          >
            {cancelLabel}
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
            className={`h-10 px-5 text-xs font-extrabold shadow-md transition-all ${buttonStyle}`}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin ml-1.5" /> : null}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
