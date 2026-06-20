import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-destructive/10 border border-destructive/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-3">حصل خطأ غير متوقع</h1>
            <p className="text-foreground/55 mb-8 text-sm leading-relaxed">
              حصلت مشكلة في تحميل الصفحة. حاول تعيد التحميل أو تواصل معنا إذا المشكلة استمرت.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => window.location.reload()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
              >
                <RefreshCw className="w-4 h-4 me-2" />
                إعادة التحميل
              </Button>
              <Button asChild variant="outline" className="border-white/20 hover:border-primary/40">
                <a href="https://wa.me/201044348610" target="_blank" rel="noreferrer">
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
