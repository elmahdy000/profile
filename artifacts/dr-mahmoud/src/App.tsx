import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

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
import { Testimonials } from "@/components/Testimonials";
import { FAQ } from "@/components/FAQ";
import { Pricing } from "@/components/Pricing";
import { Podcast } from "@/components/Podcast";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";
import { FloatingButtons } from "@/components/FloatingButtons";
import AdminDashboard from "@/components/AdminDashboard";

const queryClient = new QueryClient();

function App() {
  const isAdmin = window.location.pathname === "/admin";

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div className="font-sans min-h-screen text-foreground bg-background overflow-x-hidden selection:bg-accent selection:text-white">
            {isAdmin ? (
              <AdminDashboard />
            ) : (
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
                  <Testimonials />
                  <Podcast />
                  <Pricing />
                  <FAQ />
                  <Contact />
                </main>
                <Footer />
                <FloatingButtons />
              </>
            )}
          </div>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
