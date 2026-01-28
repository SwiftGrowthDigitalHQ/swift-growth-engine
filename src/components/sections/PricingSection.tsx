import { Check, ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedSection } from "@/hooks/use-scroll-animation";

const plans = [
  {
    name: "Starter",
    price: "₹8,999",
    suffix: "+/month",
    description: "Perfect for small businesses just getting started online.",
    features: [
      "Basic Website (5 pages)",
      "Google My Business Setup",
      "Basic SEO Setup",
      "WhatsApp Integration",
      "Monthly Report",
    ],
    popular: false,
  },
  {
    name: "Growth",
    price: "₹19,999",
    suffix: "/month",
    description: "Most popular choice for serious business growth.",
    features: [
      "Professional Website (10 pages)",
      "Google Ads Management",
      "Meta/Instagram Ads",
      "Local SEO & Google Ranking",
      "WhatsApp Automation",
      "Weekly Reports",
      "Dedicated Account Manager",
    ],
    popular: true,
  },
  {
    name: "Scale",
    price: "₹39,999",
    suffix: "+/month",
    description: "Complete growth system for established businesses.",
    features: [
      "Premium Custom Website",
      "Multi-Platform Ads",
      "Advanced SEO Strategy",
      "WhatsApp CRM Integration",
      "Social Media Management",
      "Lead Tracking Dashboard",
      "Priority Support",
      "Monthly Strategy Calls",
    ],
    popular: false,
  },
];

export function PricingSection() {
  const whatsappLink = "https://wa.me/919229721835?text=Hi%2C%20I'm%20interested%20in%20your%20services";

  return (
    <section className="py-20 md:py-28 relative">
      <div className="container mx-auto px-4">
        {/* Header */}
        <AnimatedSection className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-6">
            Simple, <span className="text-gradient">Transparent Pricing</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Choose a plan that fits your business. Ads budget is separate.
            <br />
            <span className="text-sm">We build the system, not fake numbers.</span>
          </p>
        </AnimatedSection>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <AnimatedSection
              key={index}
              delay={index * 150}
            >
              <div
                className={`relative p-6 md:p-8 rounded-2xl border transition-all duration-300 h-full ${
                  plan.popular
                    ? "bg-gradient-card border-primary glow-primary scale-105"
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
                  <p className="text-sm text-muted-foreground mb-4">
                    {plan.description}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-display font-bold text-foreground">
                      {plan.price}
                    </span>
                    <span className="text-muted-foreground">{plan.suffix}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

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
            </AnimatedSection>
          ))}
        </div>

        {/* Note */}
        <AnimatedSection className="text-center mt-8" delay={450}>
          <p className="text-sm text-muted-foreground">
            * Ads budget is separate and managed transparently. Custom plans available for enterprise needs.
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
