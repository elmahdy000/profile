import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string; showDetails: boolean }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "", showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const isChunkError = /Failed to fetch dynamically imported module|Loading chunk|Importing a module script failed/i.test(
      error?.message || ""
    );
    if (isChunkError) {
      const hasReloaded = sessionStorage.getItem("chunk_reload_retry");
      if (!hasReloaded) {
        sessionStorage.setItem("chunk_reload_retry", "true");
        window.location.reload();
      }
    }
    return { hasError: true, message: error.message || "حدث خطأ غير متوقع" };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: "", showDetails: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8" dir="rtl">
          <div className="text-center max-w-md w-full">
            <div className="w-16 h-16 bg-destructive/10 border border-destructive/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-3">حصل خطأ غير متوقع</h1>
            <p className="text-foreground/55 mb-6 text-sm leading-relaxed">
              حصلت مشكلة في تحميل الصفحة. حاول تعيد التحميل أو تواصل معنا إذا استمرت المشكلة.
            </p>

            {this.state.message && (
              <div className="mb-6 text-right">
                <button
                  type="button"
                  onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mx-auto mb-2 cursor-pointer"
                >
                  <span>{this.state.showDetails ? "إخفاء التفاصيل الفنية" : "عرض التفاصيل الفنية"}</span>
                  {this.state.showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                {this.state.showDetails && (
                  <pre className="p-3 bg-muted rounded-xl text-[11px] font-mono text-destructive overflow-x-auto text-left border border-border" dir="ltr">
                    {this.state.message}
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={this.handleRetry}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
              >
                <RefreshCw className="w-4 h-4 me-2" />
                إعادة التحميل
              </Button>
              <Button asChild variant="outline" className="border-border hover:border-primary/40">
                <a href="https://wa.me/201066711545" target="_blank" rel="noreferrer">
                  تواصل معنا
                </a>
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

