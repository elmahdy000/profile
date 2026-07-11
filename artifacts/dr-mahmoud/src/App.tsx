import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Switch, Route } from "wouter";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ScrollProgress } from "@/components/ScrollProgress";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { Services } from "@/components/Services";
import { WhyChooseMe } from "@/components/WhyChooseMe";
import { Courses } from "@/components/Courses";
import { TeachingStyle } from "@/components/TeachingStyle";
import { Portfolio } from "@/components/Portfolio";
import { Articles } from "@/components/Articles";
import { Testimonials } from "@/components/Testimonials";
import { FAQ } from "@/components/FAQ";
import { Pricing } from "@/components/Pricing";
import { Podcast } from "@/components/Podcast";
import { YoutubeSection } from "@/components/YoutubeSection";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";
import { FloatingButtons } from "@/components/FloatingButtons";
import AdminDashboard from "@/components/AdminDashboard";

import BaccalaureatePage from "@/pages/BaccalaureatePage";
import KidsPage from "@/pages/KidsPage";
import UniversityPage from "@/pages/UniversityPage";
import CurriculumPage from "@/pages/CurriculumPage";
import NotFound from "@/pages/not-found";

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
    <>
      <ScrollProgress />
      <Navbar />
      <main>
        <Hero />
        <About />
        <Services />
        <WhyChooseMe />
        <Courses />
        <TeachingStyle />
        <Portfolio />
        <Articles />
        <Testimonials />
        <Podcast />
        <YoutubeSection />
        <Pricing />
        <FAQ />
        <Contact />
      </main>
      <Footer />
      <FloatingButtons />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div className="font-sans min-h-screen text-foreground bg-background overflow-x-hidden selection:bg-accent selection:text-white">
            <Switch>
              <Route path="/admin" component={AdminDashboard} />
              <Route path="/baccalaureate" component={BaccalaureatePage} />
              <Route path="/kids" component={KidsPage} />
              <Route path="/university" component={UniversityPage} />
              <Route path="/curriculum" component={CurriculumPage} />
              <Route path="/" component={HomePage} />
              <Route component={NotFound} />
            </Switch>
          </div>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
