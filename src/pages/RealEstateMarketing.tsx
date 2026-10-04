import { WHATSAPP_CONTACT_URL } from "@/lib/whatsapp";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { UnifiedChatWidget } from "@/components/UnifiedChatWidget";
import { PageTransition } from "@/components/PageTransition";
import { ParallaxHero } from "@/components/ParallaxHero";
import { Check, ArrowRight, MessageCircle, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedSection } from "@/hooks/use-scroll-animation";
import { WhatsAppCTA } from "@/components/WhatsAppCTA";

const RealEstateMarketing = () => {
  const whatsappLink = WHATSAPP_CONTACT_URL;

  const problems = [
    "Paying for leads that never convert",
    "Competitors dominating online searches",
    "Properties sitting unsold for months",
    "No system to follow up with inquiries",
    "Social media posts getting no engagement",
  ];

  const solutions = [
    "Targeted Google & Facebook ads for buyers",
    "Property listing website with lead capture",
    "WhatsApp automation for instant response",
    "Virtual tour integration",
    "Local SEO for area-specific searches",
    "Retargeting campaigns for warm leads",
  ];

  const results = [
    { metric: "5x", label: "More Quality Leads" },
    { metric: "40%", label: "Lower Cost Per Lead" },
    { metric: "2x", label: "Faster Sales Cycle" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        <main className="pt-20">
        {/* Hero */}
        <ParallaxHero className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <AnimatedSection className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
                <Building className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">For Real Estate</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6">
                Generate <span className="text-gradient">Quality Leads</span>
                <br />
                For Your Properties
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
                Stop wasting money on fake leads. We bring you serious buyers and renters 
                who are ready to make a decision.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <WhatsAppCTA
                  source="real_estate"
                  variant="whatsapp"
                  size="xl"
                  icon={<MessageCircle className="w-5 h-5" />}
                >
                  Get Free Lead Strategy
                </WhatsAppCTA>
              </div>
            </AnimatedSection>
          </div>
        </ParallaxHero>

        {/* Results */}
        <section className="py-16 bg-card">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto">
              {results.map((result, i) => (
                <AnimatedSection key={i} delay={i * 100} className="text-center">
                  <div className="text-4xl md:text-5xl font-display font-bold text-gradient mb-2">
                    {result.metric}
                  </div>
                  <p className="text-sm text-muted-foreground">{result.label}</p>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* Problems & Solutions */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12">
              {/* Problems */}
              <AnimatedSection direction="left">
                <div className="p-8 rounded-2xl bg-destructive/5 border border-destructive/20 h-full">
                  <h3 className="text-2xl font-display font-bold text-foreground mb-6">
                    Struggling With...
                  </h3>
                  <ul className="space-y-4">
                    {problems.map((problem, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="text-destructive mt-1">✗</span>
                        <span className="text-muted-foreground">{problem}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </AnimatedSection>

              {/* Solutions */}
              <AnimatedSection direction="right" delay={150}>
                <div className="p-8 rounded-2xl bg-primary/5 border border-primary/20 h-full">
                  <h3 className="text-2xl font-display font-bold text-foreground mb-6">
                    What We Do
                  </h3>
                  <ul className="space-y-4">
                    {solutions.map((solution, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{solution}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </AnimatedSection>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-primary opacity-10" />
          <div className="container mx-auto px-4 relative z-10">
            <AnimatedSection className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
                Ready to Get More Buyers?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Get a free analysis of your current marketing and discover 
                how to generate more quality leads.
              </p>
              <WhatsAppCTA
                source="real_estate"
                variant="hero"
                size="xl"
                icon={<MessageCircle className="w-5 h-5" />}
                iconRight={<ArrowRight className="w-5 h-5" />}
              >
                WhatsApp for Free Strategy
              </WhatsAppCTA>
            </AnimatedSection>
          </div>
        </section>
      </main>
      </PageTransition>
      <Footer />
      <UnifiedChatWidget />
    </div>
  );
};

export default RealEstateMarketing;
