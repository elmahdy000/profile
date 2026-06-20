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
import { Eduverse } from "@/components/Eduverse";
import { Courses } from "@/components/Courses";
import { TeachingStyle } from "@/components/TeachingStyle";
import { Portfolio } from "@/components/Portfolio";
import { Testimonials } from "@/components/Testimonials";
import { FAQ } from "@/components/FAQ";
import { Pricing } from "@/components/Pricing";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";
import { FloatingButtons } from "@/components/FloatingButtons";

const queryClient = new QueryClient();

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div className="font-sans min-h-screen text-foreground bg-background overflow-x-hidden selection:bg-accent selection:text-white">
            <ScrollProgress />
            <Navbar />
            <main>
              <Hero />
              <About />
              <Services />
              <WhyChooseMe />
              <Eduverse />
              <Courses />
              <TeachingStyle />
              <Portfolio />
              <Testimonials />
              <Pricing />
              <FAQ />
              <Contact />
            </main>
            <Footer />
            <FloatingButtons />
          </div>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
