import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { AnalyticsScripts } from "@/components/AnalyticsScripts";
import { SoundProvider } from "@/hooks/use-sound";
import { ScrollProgressIndicator } from "@/components/ScrollProgressIndicator";
import { ScrollToTop } from "@/components/ScrollToTop";
import { RouteProgressBar } from "@/components/RouteProgressBar";
import { SeoCanonical } from "@/components/SeoCanonical";
import { isSupabaseConfigured, supabaseConfigurationIssues } from "@/integrations/supabase/client";
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
import Ventures from "./pages/Ventures";
import NotFound from "./pages/NotFound";
import { PrivacyPolicy, TermsOfService, DataDeletion, CookiePolicy, RefundPolicy } from "./pages/LegalPages";

const WhatsAppAdmin = lazy(() => import("./pages/WhatsAppAdmin"));

const queryClient = new QueryClient();

function SupabaseConfigurationRequired() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <section className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 md:p-8" role="alert">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">Local setup required</p>
        <h1 className="text-2xl font-display font-bold text-foreground">WhatsApp admin needs Supabase configuration</h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          Supabase sign-in and admin data are unavailable because these settings are missing or invalid: <code className="rounded bg-muted px-1.5 py-0.5">{supabaseConfigurationIssues.join(", ")}</code>. Add them to an ignored <code className="rounded bg-muted px-1.5 py-0.5">.env.local</code> file, then restart the Vite server.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg border border-border bg-background p-4 text-sm text-foreground"><code>VITE_SUPABASE_URL=https://oyrpeyjogtpbtbdvcjgs.supabase.co{"\n"}VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key</code></pre>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Use the project's public publishable or anon key here. Never put a Supabase service-role key or Meta access token in frontend configuration.
        </p>
        <Link className="mt-6 inline-flex rounded-sm text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" to="/">Return to the website</Link>
      </section>
    </main>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <SoundProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SeoCanonical />
          <AnalyticsScripts />
          <RouteProgressBar />
          <ScrollProgressIndicator />
          <ScrollToTop />
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
            <Route path="/ventures" element={<Ventures />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/data-deletion" element={<DataDeletion />} />
            <Route path="/cookie-policy" element={<CookiePolicy />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="/admin/whatsapp" element={isSupabaseConfigured ? <Suspense fallback={<main className="min-h-screen bg-background p-8 text-muted-foreground">Loading admin…</main>}><WhatsAppAdmin /></Suspense> : <SupabaseConfigurationRequired />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </SoundProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
