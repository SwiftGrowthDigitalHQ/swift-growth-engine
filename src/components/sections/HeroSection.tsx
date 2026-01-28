import { ArrowRight, MessageCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  const whatsappLink = "https://wa.me/919229721835?text=Hi%2C%20I%20want%20to%20grow%20my%20business";

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden bg-background">
      {/* Background Glow - sky blue theme */}
      <div className="absolute inset-0 bg-hero-glow" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center animate-slide-up">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Zap className="w-4 h-4 text-secondary" />
            <span className="text-sm font-medium text-foreground">
              Trusted by 100+ Local Businesses
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-display font-bold leading-tight mb-6 text-foreground">
            We Don't Just Run Ads.
            <br />
            <span className="bg-gradient-sky bg-clip-text text-transparent">We Build Complete</span>
            <br />
            <span className="bg-gradient-sky bg-clip-text text-transparent">Growth Systems.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Website + Ads + SEO + WhatsApp that brings{" "}
            <span className="text-secondary font-semibold">real customers</span> to your business.
            No fake leads. No empty promises.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
              <Button variant="whatsapp" size="xl">
                <MessageCircle className="w-5 h-5" />
                WhatsApp Now
              </Button>
            </a>
            <a href="/free-audit">
              <Button variant="hero" size="xl">
                Get Free Growth Audit
                <ArrowRight className="w-5 h-5" />
              </Button>
            </a>
          </div>

          {/* Trust Indicators */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-whatsapp" />
              <span className="text-sm font-medium">24hr Response</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-secondary" />
              <span className="text-sm font-medium">Founder-Led Support</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-sm font-medium">No Lock-in Contracts</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
