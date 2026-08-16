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
    danger: "border-red-200 bg-red-50 text-red-600",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    info: "border-[#BFDBFE] bg-[#EFF6FF] text-[#2563EB]",
  }[variant];

  const buttonStyle = {
    danger: "bg-red-600 hover:bg-red-700 text-white",
    warning: "bg-amber-600 hover:bg-amber-700 text-white",
    info: "bg-[#2563EB] hover:bg-[#1D4ED8] text-white",
  }[variant];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onCancel}
      />

      {/* Dialog Box */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-2xl transition-all text-[#0F172A]">
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${headerColors}`}>
            <AlertTriangle className="h-6 w-6" />
          </div>

          <div className="flex-1 space-y-1 text-right">
            <h3 className="text-base font-bold text-[#0F172A]">{title}</h3>
            {studentName && (
              <div className="inline-block rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] px-2.5 py-0.5 text-xs font-semibold text-[#2563EB] dir-ltr text-right">
                {studentName}
              </div>
            )}
            <p className="text-xs text-[#475569] leading-relaxed pt-1">{description}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#E2E8F0] pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isLoading}
            className="h-9 border-[#E2E8F0] bg-white text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC]"
          >
            {cancelLabel}
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
            className={`h-9 px-5 text-xs font-semibold shadow-xs transition-all ${buttonStyle}`}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin ml-1.5" /> : null}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
