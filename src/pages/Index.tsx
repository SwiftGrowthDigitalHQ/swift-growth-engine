import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { UnifiedChatWidget } from "@/components/UnifiedChatWidget";
import { HeroSection } from "@/components/sections/HeroSection";
import { ServicesSection } from "@/components/sections/ServicesSection";
import { WhyUsSection } from "@/components/sections/WhyUsSection";
import { PricingSection } from "@/components/sections/PricingSection";
import { CTASection } from "@/components/sections/CTASection";
import { TestimonialsPreview } from "@/components/sections/TestimonialsPreview";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <ServicesSection />
        <WhyUsSection />
        <TestimonialsPreview />
        <PricingSection />
        <CTASection />
      </main>
      <Footer />
      <UnifiedChatWidget />
    </div>
  );
};

export default Index;
