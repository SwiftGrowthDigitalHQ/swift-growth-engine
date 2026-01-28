import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { UnifiedChatWidget } from "@/components/UnifiedChatWidget";
import { Check, ArrowRight, MessageCircle, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";

const EcommerceMarketing = () => {
  const whatsappLink = "https://wa.me/919229721835?text=Hi%2C%20I%20run%20an%20e-commerce%20store%20and%20want%20to%20grow%20sales";

  const problems = [
    "Traffic but no conversions",
    "High ad spend with low ROAS",
    "Abandoned carts piling up",
    "Competitors stealing your customers",
    "No repeat purchase system",
  ];

  const solutions = [
    "High-converting product pages",
    "Google Shopping & Meta Ads optimization",
    "WhatsApp for cart recovery & support",
    "Retargeting to bring customers back",
    "Email & SMS automation for repeat sales",
    "Conversion rate optimization (CRO)",
  ];

  const results = [
    { metric: "3x", label: "Return on Ad Spend" },
    { metric: "40%", label: "Recovered Carts" },
    { metric: "2x", label: "Repeat Purchases" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        {/* Hero */}
        <section className="py-16 md:py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-hero-glow" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
                <ShoppingCart className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">For E-commerce & Shopify</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6">
                Get More <span className="text-gradient">Sales</span>
                <br />
                For Your Online Store
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
                Whether you're on Shopify, WooCommerce, or your own platform - 
                we help you turn visitors into customers and customers into fans.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                  <Button variant="whatsapp" size="xl">
                    <MessageCircle className="w-5 h-5" />
                    Get Free Store Audit
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Results */}
        <section className="py-16 bg-card">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto">
              {results.map((result, i) => (
                <div key={i} className="text-center">
                  <div className="text-4xl md:text-5xl font-display font-bold text-gradient mb-2">
                    {result.metric}
                  </div>
                  <p className="text-sm text-muted-foreground">{result.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Problems & Solutions */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12">
              {/* Problems */}
              <div className="p-8 rounded-2xl bg-destructive/5 border border-destructive/20">
                <h3 className="text-2xl font-display font-bold text-foreground mb-6">
                  Sound Familiar?
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

              {/* Solutions */}
              <div className="p-8 rounded-2xl bg-primary/5 border border-primary/20">
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
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-primary opacity-10" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
                Ready to Grow Your Store?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Get a free audit of your e-commerce store and discover 
                exactly how to increase your sales.
              </p>
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                <Button variant="hero" size="xl">
                  <MessageCircle className="w-5 h-5" />
                  WhatsApp for Free Audit
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <UnifiedChatWidget />
    </div>
  );
};

export default EcommerceMarketing;
