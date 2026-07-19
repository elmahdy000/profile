import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  variantIcons,
  variantIconColors,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const resolvedVariant = variant || "default"
        const Icon = variantIcons[resolvedVariant] || variantIcons.default
        const iconColor = variantIconColors[resolvedVariant] || variantIconColors.default

        return (
          <Toast key={id} variant={variant} {...props}>
            {/* Icon */}
            <div
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconColor}`}
              style={{
                background:
                  resolvedVariant === "destructive"
                    ? "rgba(239,68,68,0.12)"
                    : resolvedVariant === "success"
                      ? "rgba(16,185,129,0.12)"
                      : resolvedVariant === "warning"
                        ? "rgba(245,158,11,0.12)"
                        : "rgba(var(--primary-rgb,59,130,246),0.1)",
              }}
            >
              <Icon className="h-4 w-4" />
            </div>

            {/* Content */}
            <div className="grid flex-1 gap-0.5">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>

            {/* Action slot */}
            {action}

            <ToastClose />

            {/* Animated accent bar at the bottom */}
            <div
              className="absolute bottom-0 left-0 h-[3px] w-full rounded-b-xl opacity-60"
              style={{
                background:
                  resolvedVariant === "destructive"
                    ? "linear-gradient(90deg,#ef4444,#f87171)"
                    : resolvedVariant === "success"
                      ? "linear-gradient(90deg,#10b981,#34d399)"
                      : resolvedVariant === "warning"
                        ? "linear-gradient(90deg,#f59e0b,#fbbf24)"
                        : "linear-gradient(90deg,hsl(var(--primary)),hsl(var(--primary)/0.6))",
              }}
            />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
