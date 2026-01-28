import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { UnifiedChatWidget } from "@/components/UnifiedChatWidget";
import { PageTransition } from "@/components/PageTransition";
import {
  Globe, 
  Target, 
  Search, 
  MessageCircle, 
  TrendingUp,
  ArrowRight,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedSection } from "@/hooks/use-scroll-animation";

const services = [
  {
    icon: Globe,
    title: "Website Design & Development",
    description: "Fast, mobile-friendly websites that convert visitors into customers.",
    features: [
      "Mobile-first responsive design",
      "Fast loading speed",
      "SEO-optimized structure",
      "WhatsApp integration",
      "Easy to update content",
      "Custom forms & CTAs",
    ],
  },
  {
    icon: Target,
    title: "Google & Meta Ads",
    description: "Strategic paid advertising that brings real leads to your business.",
    features: [
      "Google Search & Display Ads",
      "Facebook & Instagram Ads",
      "Targeted local campaigns",
      "A/B testing & optimization",
      "Monthly performance reports",
      "Budget management",
    ],
  },
  {
    icon: Search,
    title: "Local SEO & Google Ranking",
    description: "Get found when customers search for your services in your area.",
    features: [
      "Google My Business optimization",
      "Local keyword targeting",
      "Citation building",
      "Review management",
      "Map pack ranking",
      "Monthly ranking reports",
    ],
  },
  {
    icon: MessageCircle,
    title: "WhatsApp Marketing & Automation",
    description: "Turn inquiries into customers with automated WhatsApp systems.",
    features: [
      "WhatsApp Business setup",
      "Automated responses",
      "Broadcast campaigns",
      "Lead nurturing sequences",
      "Catalog integration",
      "Quick reply templates",
    ],
  },
  {
    icon: TrendingUp,
    title: "Social Media Growth",
    description: "Build your brand with engaging content that attracts customers.",
    features: [
      "Reels & video content",
      "Graphic design & creatives",
      "Content calendar",
      "Engagement strategy",
      "Hashtag research",
      "Monthly analytics",
    ],
  },
];

const Services = () => {
  const whatsappLink = "https://wa.me/919229721835?text=Hi%2C%20I'm%20interested%20in%20your%20services";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        <main className="pt-20">
          {/* Hero */}
          <section className="py-16 md:py-24 relative">
            <div className="absolute inset-0 bg-hero-glow" />
            <div className="container mx-auto px-4 relative z-10">
              <AnimatedSection className="max-w-3xl mx-auto text-center">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6">
                  Our <span className="text-gradient">Services</span>
                </h1>
                <p className="text-lg text-muted-foreground">
                  Complete digital marketing solutions to grow your local business. 
                  From website to ads to WhatsApp - we handle everything.
                </p>
              </AnimatedSection>
            </div>
          </section>

          {/* Services List */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="space-y-16">
                {services.map((service, index) => (
                  <AnimatedSection
                    key={index}
                    direction={index % 2 === 0 ? "left" : "right"}
                    delay={100}
                  >
                    <div
                      className={`flex flex-col lg:flex-row gap-8 lg:gap-16 items-center ${
                        index % 2 === 1 ? "lg:flex-row-reverse" : ""
                      }`}
                    >
                      {/* Content */}
                      <div className="flex-1 space-y-6">
                        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                          <service.icon className="w-7 h-7 text-primary" />
                        </div>
                        <h2 className="text-3xl font-display font-bold text-foreground">
                          {service.title}
                        </h2>
                        <p className="text-lg text-muted-foreground">
                          {service.description}
                        </p>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {service.features.map((feature, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <Check className="w-5 h-5 text-primary flex-shrink-0" />
                              <span className="text-sm text-muted-foreground">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Visual */}
                      <div className="flex-1 w-full">
                        <div className="aspect-video rounded-2xl bg-gradient-card border border-border flex items-center justify-center">
                          <service.icon className="w-20 h-20 text-primary/30" />
                        </div>
                      </div>
                    </div>
                  </AnimatedSection>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="py-16 md:py-24">
            <div className="container mx-auto px-4">
              <AnimatedSection className="max-w-3xl mx-auto text-center">
                <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
                  Ready to Grow Your Business?
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Get a free consultation and discover which services are right for you.
                </p>
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                  <Button variant="whatsapp" size="xl">
                    <MessageCircle className="w-5 h-5" />
                    WhatsApp Now
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </a>
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

export default Services;
