import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Switch, Route } from "wouter";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ScrollProgress } from "@/components/ScrollProgress";
import { AcademyHome } from "@/components/AcademyHome";

const AdminDashboard = lazy(() => import("@/components/AdminDashboard"));
const BaccalaureatePage = lazy(() => import("@/pages/BaccalaureatePage"));
const KidsPage = lazy(() => import("@/pages/KidsPage"));
const UniversityPage = lazy(() => import("@/pages/UniversityPage"));
const CurriculumPage = lazy(() => import("@/pages/CurriculumPage"));
const PlatformPage = lazy(() => import("@/pages/PlatformPage"));
const NotFound = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient();

function HomePage() {
  useEffect(() => {
    document.title = "د. محمود المهدي | بوابتك لاحتراف البرمجة وأونلاين";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'د. محمود المهدي — طريقك لاحتراف البرمجة وعلوم الحاسب وأونلاين. تأسيس عملي من الصفر للجامعات والمدارس والثانوية العامة.');
    }
  }, []);

  return (
    <><ScrollProgress /><AcademyHome /></>
  );
}

function PageLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-background" role="status" aria-label="جاري تحميل الصفحة">
      <span className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div className="font-sans min-h-screen text-foreground bg-background overflow-x-hidden selection:bg-accent selection:text-white">
            <Suspense fallback={<PageLoader />}>
              <Switch>
                <Route path="/admin" component={AdminDashboard} />
                <Route path="/baccalaureate" component={BaccalaureatePage} />
                <Route path="/kids" component={KidsPage} />
                <Route path="/university" component={UniversityPage} />
                <Route path="/curriculum" component={CurriculumPage} />
                <Route path="/platform" component={PlatformPage} />
                <Route path="/" component={HomePage} />
                <Route component={NotFound} />
              </Switch>
            </Suspense>
          </div>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
