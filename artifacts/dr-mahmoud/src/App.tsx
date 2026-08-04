import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Switch, Route, useLocation } from "wouter";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeToggle } from "@/components/ThemeToggle";

const ScrollProgress = lazy(() => import("@/components/ScrollProgress").then(m => ({ default: m.ScrollProgress })));
const AcademyHome = lazy(() => import("@/components/AcademyHome").then(m => ({ default: m.AcademyHome })));

const AdminDashboard = lazy(() => import("@/components/AdminDashboard"));
const SubAdminDashboard = lazy(() => import("@/components/SubAdminDashboard").then(m => ({ default: m.SubAdminDashboard })));
const BaccalaureatePage = lazy(() => import("@/pages/BaccalaureatePage"));
const KidsPage = lazy(() => import("@/pages/KidsPage"));
const UniversityPage = lazy(() => import("@/pages/UniversityPage"));
const CurriculumPage = lazy(() => import("@/pages/CurriculumPage"));
const PlatformPage = lazy(() => import("@/pages/PlatformPage"));
const ParentPortalPage = lazy(() => import("@/pages/ParentPortalPage"));
const NotFound = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes cache validity
      gcTime: 1000 * 60 * 15, // Keep unused data for 15 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function HomePage() {
  useEffect(() => {
    document.title = "د. محمود المهدي | مدرس برمجة البكالوريا المصرية أونلاين";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'شرح وتأسيس البرمجة لطلاب البكالوريا المصرية أولى وتانية ثانوي مع د. محمود المهدي، ماجستير نظم المعلومات. حصص أونلاين لكل محافظات مصر، منصة تعليمية، اختبارات وتدريبات ومتابعة مستمرة.');
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
  const [location] = useLocation();
  const pageAlreadyHasThemeToggle = location === "/" || location === "/platform";

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div className="font-sans min-h-screen text-foreground bg-background overflow-x-hidden selection:bg-accent selection:text-white">
            <Suspense fallback={<PageLoader />}>
              <Switch>
                <Route path="/admin" component={AdminDashboard} />
                <Route path="/subadmin" component={SubAdminDashboard} />
                <Route path="/baccalaureate" component={BaccalaureatePage} />
                <Route path="/kids" component={KidsPage} />
                <Route path="/university" component={UniversityPage} />
                <Route path="/curriculum" component={CurriculumPage} />
                <Route path="/platform" component={PlatformPage} />
                <Route path="/parent" component={ParentPortalPage} />
                <Route path="/" component={HomePage} />
                <Route component={NotFound} />
              </Switch>
            </Suspense>
          </div>
          {!pageAlreadyHasThemeToggle && (
            <ThemeToggle className="fixed bottom-4 left-4 z-[70] sm:bottom-6 sm:left-6" />
          )}
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
