import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Redirect, Route, Switch, useLocation } from "wouter";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeToggle } from "@/components/ThemeToggle";

function safeLazy<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T } | T>
) {
  return lazy(() =>
    factory()
      .then((module) => ("default" in module ? module : { default: module as T }))
      .catch((error) => {
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
        throw error;
      })
  );
}

const ScrollProgress = safeLazy(() => import("@/components/ScrollProgress").then(m => ({ default: m.ScrollProgress })));
const AcademyHome = safeLazy(() => import("@/components/AcademyHome").then(m => ({ default: m.AcademyHome })));

const AdminDashboard = safeLazy(() => import("@/components/AdminDashboard"));
const SubAdminDashboard = safeLazy(() => import("@/components/SubAdminDashboard").then(m => ({ default: m.SubAdminDashboard })));
const BaccalaureatePage = safeLazy(() => import("@/pages/BaccalaureatePage"));
const UniversityPage = safeLazy(() => import("@/pages/UniversityPage"));
const CurriculumPage = safeLazy(() => import("@/pages/CurriculumPage"));
const PlatformPage = safeLazy(() => import("@/pages/PlatformPage"));
const ParentPortalPage = safeLazy(() => import("@/pages/ParentPortalPage"));
const NotFound = safeLazy(() => import("@/pages/not-found"));

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

  useEffect(() => {
    sessionStorage.removeItem("chunk_reload_retry");
  }, []);

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
                <Route path="/booking">
                  <Redirect to="/" />
                </Route>
                <Route path="/center-booking">
                  <Redirect to="/" />
                </Route>
                <Route path="/kids">
                  <Redirect to="/platform?action=register" />
                </Route>
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
