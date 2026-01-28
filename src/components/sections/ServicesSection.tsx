import { 
  Globe, 
  Target, 
  Search, 
  MessageCircle, 
  TrendingUp,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

const services = [
  {
    icon: Globe,
    title: "Website Design & Development",
    description: "Fast, mobile-friendly websites that convert visitors into customers. Built for your business goals.",
  },
  {
    icon: Target,
    title: "Google & Meta Ads",
    description: "Strategic paid ads on Google and Instagram that bring real leads, not just clicks.",
  },
  {
    icon: Search,
    title: "Local SEO & Google Ranking",
    description: "Get found when customers search for your services. Rank higher on Google Maps and Search.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp Marketing & Automation",
    description: "Turn inquiries into customers with automated WhatsApp follow-ups and broadcasts.",
  },
  {
    icon: TrendingUp,
    title: "Social Media Growth",
    description: "Engaging Reels, creatives and content that builds your brand and attracts customers.",
  },
];

export function ServicesSection() {
  return (
    <section className="py-20 md:py-28 relative bg-card">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-6 text-primary">
            Complete <span className="text-gradient">Growth Solutions</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything your business needs to get more customers online. 
            We handle the technical stuff, you focus on your business.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {services.map((service, index) => (
            <div
              key={index}
              className="group p-6 md:p-8 rounded-2xl bg-background border border-border hover:border-accent/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-6 group-hover:bg-accent/20 transition-colors">
                <service.icon className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-display font-semibold mb-3 text-primary">
                {service.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {service.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <a href="/services">
            <Button variant="outline" size="lg">
              View All Services
              <ArrowRight className="w-4 h-4" />
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
