import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { UnifiedChatWidget } from "@/components/UnifiedChatWidget";
import { Check, ArrowRight, MessageCircle, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedSection } from "@/hooks/use-scroll-animation";

const RestaurantMarketing = () => {
  const whatsappLink = "https://wa.me/919229721835?text=Hi%2C%20I%20run%20a%20restaurant%2Fcloud%20kitchen%20and%20want%20more%20orders";

  const problems = [
    "Zomato and Swiggy taking huge commissions",
    "Not enough direct orders",
    "No repeat customers coming back",
    "Social media but no real orders from it",
    "Competitors ranking higher on food apps",
  ];

  const solutions = [
    "Direct ordering website (no commissions)",
    "WhatsApp ordering system",
    "Google Ads for hungry customers nearby",
    "Instagram marketing with food reels",
    "Review management on Google & Zomato",
    "Loyalty program automation",
  ];

  const results = [
    { metric: "70%", label: "More Direct Orders" },
    { metric: "0%", label: "Commission on Direct" },
    { metric: "3x", label: "More Repeat Customers" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        {/* Hero */}
        <section className="py-16 md:py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-hero-glow" />
          <div className="container mx-auto px-4 relative z-10">
            <AnimatedSection className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
                <UtensilsCrossed className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">For Restaurants & Cloud Kitchens</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6">
                Get More <span className="text-gradient">Direct Orders</span>
                <br />
                Skip the Commissions
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
                Stop paying 25-30% to Zomato and Swiggy. Build your own ordering system 
                and keep all the profits for your restaurant.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                  <Button variant="whatsapp" size="xl">
                    <MessageCircle className="w-5 h-5" />
                    Get Free Restaurant Audit
                  </Button>
                </a>
              </div>
            </AnimatedSection>
          </div>
        </section>

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
                    Tired of...
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
                    Our Solution
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
                Ready to Grow Your Restaurant?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Get a free audit and discover how to get more orders 
                without paying heavy commissions.
              </p>
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                <Button variant="hero" size="xl">
                  <MessageCircle className="w-5 h-5" />
                  WhatsApp for Free Audit
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </a>
            </AnimatedSection>
          </div>
        </section>
      </main>
      <Footer />
      <UnifiedChatWidget />
    </div>
  );
};

export default RestaurantMarketing;
