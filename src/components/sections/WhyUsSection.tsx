import { 
  Target, 
  Shield, 
  MapPin, 
  Wallet, 
  Users
} from "lucide-react";

const reasons = [
  {
    icon: Target,
    title: "Result-Oriented Approach",
    description: "We focus on getting you real customers, not vanity metrics. Every rupee spent is tracked.",
  },
  {
    icon: Shield,
    title: "No Fake Leads or Followers",
    description: "We don't believe in shortcuts. Only genuine inquiries from people interested in your services.",
  },
  {
    icon: MapPin,
    title: "Local Business Specialists",
    description: "We understand Indian local markets. From clinics to restaurants, we know what works here.",
  },
  {
    icon: Wallet,
    title: "Affordable & Transparent Pricing",
    description: "Clear pricing with no hidden fees. You always know where your money is going.",
  },
  {
    icon: Users,
    title: "Founder-Led Support",
    description: "Work directly with Sonu, our founder. No junior staff, no runaround. Direct access always.",
  },
];

export function WhyUsSection() {
  return (
    <section className="py-20 md:py-28 bg-card relative">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-6 text-foreground">
            Why <span className="text-primary">Swiftgrowthdigital</span>?
          </h2>
          <p className="text-lg text-muted-foreground">
            We're not like other agencies. Here's what makes us different.
          </p>
        </div>

        {/* Reasons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {reasons.map((reason, index) => (
            <div
              key={index}
              className="group flex gap-4 p-6 rounded-xl bg-secondary border border-border hover:border-primary/30 hover-lift transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/30 group-hover:scale-110 transition-all duration-300">
                <reason.icon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-display font-semibold mb-2 text-foreground group-hover:text-primary transition-colors duration-300">
                  {reason.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {reason.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
