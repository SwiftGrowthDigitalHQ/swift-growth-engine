import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { UnifiedChatWidget } from "@/components/UnifiedChatWidget";
import { Check, ArrowRight, MessageCircle, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";

const ClinicMarketing = () => {
  const whatsappLink = "https://wa.me/919229721835?text=Hi%2C%20I%20run%20a%20clinic%20and%20want%20to%20grow%20my%20patient%20base";

  const problems = [
    "Patients can't find your clinic on Google",
    "Too much competition from nearby clinics",
    "Depending only on word-of-mouth referrals",
    "No online booking or inquiry system",
    "Wasting money on ads that don't work",
  ];

  const solutions = [
    "Rank #1 on Google Maps for clinic searches",
    "Professional website that builds trust",
    "Google Ads for high-intent patients",
    "WhatsApp booking automation",
    "Review management to build reputation",
    "Social media presence with health tips",
  ];

  const results = [
    { metric: "3x", label: "More Patient Inquiries" },
    { metric: "50%", label: "Reduction in No-Shows" },
    { metric: "#1", label: "Google Maps Ranking" },
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
                <Stethoscope className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">For Clinics & Hospitals</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6">
                Get More <span className="text-gradient">Patients</span>
                <br />
                For Your Clinic
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
                Whether you're a dental clinic, medical practice, or hospital - 
                we help you attract more patients from Google and build trust online.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                  <Button variant="whatsapp" size="xl">
                    <MessageCircle className="w-5 h-5" />
                    Get Free Clinic Audit
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
                Ready to Grow Your Clinic?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Get a free audit of your clinic's online presence and discover 
                exactly how to attract more patients.
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

export default ClinicMarketing;
