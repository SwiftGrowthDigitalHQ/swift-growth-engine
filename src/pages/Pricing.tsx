import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { SwiftBot } from "@/components/SwiftBot";
import { Check, ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Starter",
    price: "₹8,999",
    suffix: "+/month",
    description: "Perfect for small businesses just getting started with online marketing.",
    features: [
      "Basic Website (5 pages)",
      "Mobile responsive design",
      "Google My Business Setup",
      "Basic SEO Setup",
      "WhatsApp Button Integration",
      "Contact Form",
      "Monthly Performance Report",
      "Email Support",
    ],
    notIncluded: [
      "Google/Meta Ads Management",
      "WhatsApp Automation",
      "Social Media Management",
    ],
    popular: false,
  },
  {
    name: "Growth",
    price: "₹19,999",
    suffix: "/month",
    description: "Our most popular plan for businesses serious about getting more customers.",
    features: [
      "Professional Website (10 pages)",
      "Google Ads Management",
      "Meta/Instagram Ads Management",
      "Local SEO & Google Ranking",
      "WhatsApp Automation Setup",
      "Weekly Performance Reports",
      "Dedicated Account Manager",
      "Priority Phone Support",
      "Monthly Strategy Call",
    ],
    notIncluded: [
      "Social Media Content Creation",
    ],
    popular: true,
  },
  {
    name: "Scale",
    price: "₹39,999",
    suffix: "+/month",
    description: "Complete growth system for established businesses ready to scale.",
    features: [
      "Premium Custom Website",
      "Multi-Platform Ads (Google + Meta + YouTube)",
      "Advanced SEO Strategy",
      "WhatsApp CRM Integration",
      "Social Media Management",
      "Reels & Video Content (4/month)",
      "Lead Tracking Dashboard",
      "Priority Support (24hr response)",
      "Weekly Strategy Calls",
      "Quarterly Business Reviews",
    ],
    notIncluded: [],
    popular: false,
  },
];

const Pricing = () => {
  const whatsappLink = "https://wa.me/919229721835?text=Hi%2C%20I'm%20interested%20in%20your%20services";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        {/* Hero */}
        <section className="py-16 md:py-24 relative">
          <div className="absolute inset-0 bg-hero-glow" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6">
                Simple, <span className="text-gradient">Transparent Pricing</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Choose a plan that fits your business needs. All prices are for service fees only.
                <br />
                <span className="text-sm">Ads budget is always separate and managed transparently.</span>
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {plans.map((plan, index) => (
                <div
                  key={index}
                  className={`relative p-6 md:p-8 rounded-2xl border transition-all duration-300 ${
                    plan.popular
                      ? "bg-gradient-card border-primary glow-primary lg:scale-105"
                      : "bg-card border-border hover:border-primary/30"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-primary rounded-full text-sm font-semibold text-primary-foreground">
                      Most Popular
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-xl font-display font-semibold text-foreground mb-2">
                      {plan.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4 min-h-[40px]">
                      {plan.description}
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-display font-bold text-foreground">
                        {plan.price}
                      </span>
                      <span className="text-muted-foreground">{plan.suffix}</span>
                    </div>
                  </div>

                  <div className="space-y-4 mb-8">
                    <p className="text-sm font-medium text-foreground">What's included:</p>
                    <ul className="space-y-2">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    {plan.notIncluded.length > 0 && (
                      <>
                        <p className="text-sm font-medium text-muted-foreground pt-2">Not included:</p>
                        <ul className="space-y-2">
                          {plan.notIncluded.map((feature, i) => (
                            <li key={i} className="flex items-start gap-2 opacity-50">
                              <span className="w-4 h-4 flex-shrink-0 text-center">-</span>
                              <span className="text-sm text-muted-foreground">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>

                  <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                    <Button
                      variant={plan.popular ? "whatsapp" : "outline"}
                      className="w-full"
                      size="lg"
                    >
                      {plan.popular && <MessageCircle className="w-4 h-4" />}
                      Get Started
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </a>
                </div>
              ))}
            </div>

            {/* Note */}
            <div className="max-w-3xl mx-auto mt-12 p-6 rounded-xl bg-secondary border border-border">
              <h3 className="font-display font-semibold text-foreground mb-2">Important Notes:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Ads budget is always separate and decided based on your goals</li>
                <li>• We recommend starting with minimum ₹15,000/month ads budget</li>
                <li>• Custom plans available for unique requirements</li>
                <li>• No long-term contracts - month-to-month billing</li>
                <li>• GST extra as applicable</li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
                Not Sure Which Plan is Right?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Get a free consultation and we'll help you choose the best plan for your business.
              </p>
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                <Button variant="hero" size="xl">
                  <MessageCircle className="w-5 h-5" />
                  Get Free Consultation
                </Button>
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
      <SwiftBot />
    </div>
  );
};

export default Pricing;
