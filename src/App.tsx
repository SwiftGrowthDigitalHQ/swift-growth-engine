import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AnalyticsScripts } from "@/components/AnalyticsScripts";
import { SoundProvider } from "@/hooks/use-sound";
import { ScrollProgressIndicator } from "@/components/ScrollProgressIndicator";
import Index from "./pages/Index";
import Services from "./pages/Services";
import Pricing from "./pages/Pricing";
import FreeAudit from "./pages/FreeAudit";
import Contact from "./pages/Contact";
import ClinicMarketing from "./pages/ClinicMarketing";
import RealEstateMarketing from "./pages/RealEstateMarketing";
import RestaurantMarketing from "./pages/RestaurantMarketing";
import EducationMarketing from "./pages/EducationMarketing";
import SalonMarketing from "./pages/SalonMarketing";
import LocalBusinessMarketing from "./pages/LocalBusinessMarketing";
import ServiceBusinessMarketing from "./pages/ServiceBusinessMarketing";
import EcommerceMarketing from "./pages/EcommerceMarketing";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import CaseStudies from "./pages/CaseStudies";
import Testimonials from "./pages/Testimonials";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <SoundProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AnalyticsScripts />
          <ScrollProgressIndicator />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/services" element={<Services />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/free-audit" element={<FreeAudit />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/clinic-marketing" element={<ClinicMarketing />} />
            <Route path="/real-estate-marketing" element={<RealEstateMarketing />} />
            <Route path="/restaurant-marketing" element={<RestaurantMarketing />} />
            <Route path="/education-marketing" element={<EducationMarketing />} />
            <Route path="/salon-marketing" element={<SalonMarketing />} />
            <Route path="/local-business-marketing" element={<LocalBusinessMarketing />} />
            <Route path="/service-business-marketing" element={<ServiceBusinessMarketing />} />
            <Route path="/ecommerce-marketing" element={<EcommerceMarketing />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/case-studies" element={<CaseStudies />} />
            <Route path="/testimonials" element={<Testimonials />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </SoundProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
