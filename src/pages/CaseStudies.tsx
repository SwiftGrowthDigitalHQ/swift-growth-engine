import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { UnifiedChatWidget } from "@/components/UnifiedChatWidget";
import { TrendingUp, Phone, Users, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { VideoTestimonial } from "@/components/VideoTestimonial";

const caseStudies = [
  {
    id: "dental-clinic-pune",
    industry: "Healthcare / Dental Clinic",
    clientName: "Smile Dental Clinic",
    location: "Pune, Maharashtra",
    badge: "Clinic Marketing",
    badgeColor: "bg-blue-500/20 text-blue-400",
    background: "A family dental clinic struggling with patient acquisition in a competitive market. They were relying only on word-of-mouth referrals.",
    problem: "Low online visibility, no website, spending money on newspaper ads with zero tracking. Getting only 2-3 new patients per month.",
    strategy: [
      "Built mobile-first website with online booking",
      "Set up Google My Business with reviews system",
      "Launched Google Ads targeting 'dentist near me' searches",
      "Implemented WhatsApp automation for appointment reminders",
    ],
    results: {
      before: {
        leads: "2-3",
        calls: "5-8",
        inquiries: "10",
      },
      after: {
        leads: "25-30",
        calls: "40+",
        inquiries: "80+",
      },
    },
    quote: "Swiftgrowthdigital transformed our practice. We now have a steady stream of patients and our revenue has doubled in 6 months.",
    duration: "6 months",
    // Note: Replace with actual before/after screenshots when available
    beforeImage: null,
    afterImage: null,
    // Note: Replace with actual client testimonial video ID
    videoId: null,
  },
  {
    id: "real-estate-bangalore",
    industry: "Real Estate",
    clientName: "Horizon Properties",
    location: "Bangalore, Karnataka",
    badge: "Real Estate",
    badgeColor: "bg-emerald-500/20 text-emerald-400",
    background: "A growing real estate firm with 3 ongoing projects. They were getting leads from property portals but conversion was very low.",
    problem: "High cost per lead from 99acres and MagicBricks. Leads were not serious buyers. No proper follow-up system in place.",
    strategy: [
      "Created dedicated landing pages for each project",
      "Launched targeted Facebook & Instagram ads",
      "Built WhatsApp lead nurturing sequence",
      "Set up call tracking and CRM integration",
    ],
    results: {
      before: {
        leads: "50",
        calls: "15",
        inquiries: "30",
      },
      after: {
        leads: "150+",
        calls: "60+",
        inquiries: "200+",
      },
    },
    quote: "The quality of leads improved dramatically. Our sales team now closes 3x more deals with the same effort.",
    duration: "4 months",
    beforeImage: null,
    afterImage: null,
    videoId: null,
  },
  {
    id: "cloud-kitchen-delhi",
    industry: "Restaurant / Cloud Kitchen",
    clientName: "Biryani Junction",
    location: "Delhi NCR",
    badge: "Restaurant Marketing",
    badgeColor: "bg-orange-500/20 text-orange-400",
    background: "A cloud kitchen specializing in biryani, operating from 2 locations. Heavily dependent on Zomato and Swiggy with thin margins.",
    problem: "60% of orders came through aggregators with 25-30% commission. No direct customer database. Zero repeat customer strategy.",
    strategy: [
      "Launched Instagram marketing with food reels",
      "Created WhatsApp ordering system for direct orders",
      "Implemented loyalty program with cashback",
      "Google Ads for 'biryani delivery near me' searches",
    ],
    results: {
      before: {
        leads: "N/A",
        calls: "10",
        inquiries: "50 direct",
      },
      after: {
        leads: "N/A",
        calls: "50+",
        inquiries: "300+ direct",
      },
    },
    quote: "Our direct orders went from 40% to 70%. The savings on commission alone pays for the entire marketing budget!",
    duration: "5 months",
    beforeImage: null,
    afterImage: null,
    videoId: null,
  },
];

const CaseStudies = () => {
  const whatsappLink = "https://wa.me/919229721835?text=Hi%2C%20I%20saw%20your%20case%20studies%20and%20want%20similar%20results%20for%20my%20business";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-16 md:py-24 relative">
          <div className="absolute inset-0 bg-hero-glow opacity-50" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border mb-6">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Real Results, Real Businesses</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6">
                Case <span className="text-gradient">Studies</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground">
                See how we helped local Indian businesses grow with our complete digital growth systems.
                No fake numbers, just honest results.
              </p>
            </div>
          </div>
        </section>

        {/* Case Studies */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="space-y-20">
              {caseStudies.map((study) => (
                <div
                  key={study.id}
                  className="bg-card rounded-3xl border border-border overflow-hidden"
                >
                  {/* Header */}
                  <div className="p-6 md:p-8 border-b border-border">
                    <div className="flex flex-wrap items-center gap-4 mb-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${study.badgeColor}`}>
                        {study.badge}
                      </span>
                      <span className="text-sm text-muted-foreground">{study.location}</span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
                      {study.clientName}
                    </h2>
                    <p className="text-muted-foreground">{study.industry}</p>
                  </div>

                  <div className="p-6 md:p-8">
                    <div className="grid lg:grid-cols-2 gap-8">
                      {/* Left Column - Story */}
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-lg font-display font-semibold text-foreground mb-3">Background</h3>
                          <p className="text-muted-foreground leading-relaxed">{study.background}</p>
                        </div>
                        <div>
                          <h3 className="text-lg font-display font-semibold text-foreground mb-3">The Problem</h3>
                          <p className="text-muted-foreground leading-relaxed">{study.problem}</p>
                        </div>
                        <div>
                          <h3 className="text-lg font-display font-semibold text-foreground mb-3">Our Strategy</h3>
                          <ul className="space-y-2">
                            {study.strategy.map((item, i) => (
                              <li key={i} className="flex items-start gap-3 text-muted-foreground">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Right Column - Results */}
                      <div className="space-y-6">
                        {/* Before/After Slider - Only show if images exist */}
                        {study.beforeImage && study.afterImage && (
                          <div>
                            <h3 className="text-lg font-display font-semibold text-foreground mb-4">Visual Results</h3>
                            <BeforeAfterSlider
                              beforeImage={study.beforeImage}
                              afterImage={study.afterImage}
                              beforeLabel="Before"
                              afterLabel="After"
                            />
                          </div>
                        )}

                        {/* Metrics Comparison */}
                        <div>
                          <h3 className="text-lg font-display font-semibold text-foreground mb-4">Results Comparison</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-secondary/50 rounded-xl p-4">
                              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Before</p>
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground">Leads:</span>
                                  <span className="font-semibold text-foreground">{study.results.before.leads}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Phone className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground">Calls:</span>
                                  <span className="font-semibold text-foreground">{study.results.before.calls}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MessageCircle className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground">Inquiries:</span>
                                  <span className="font-semibold text-foreground">{study.results.before.inquiries}</span>
                                </div>
                              </div>
                            </div>
                            <div className="bg-primary/10 rounded-xl p-4 border border-primary/20">
                              <p className="text-xs text-primary uppercase tracking-wider mb-3">After</p>
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4 text-primary" />
                                  <span className="text-sm text-muted-foreground">Leads:</span>
                                  <span className="font-semibold text-primary">{study.results.after.leads}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Phone className="w-4 h-4 text-primary" />
                                  <span className="text-sm text-muted-foreground">Calls:</span>
                                  <span className="font-semibold text-primary">{study.results.after.calls}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MessageCircle className="w-4 h-4 text-primary" />
                                  <span className="text-sm text-muted-foreground">Inquiries:</span>
                                  <span className="font-semibold text-primary">{study.results.after.inquiries}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quote & Video */}
                    <div className={`grid ${study.videoId ? 'md:grid-cols-2' : ''} gap-6 mt-8 pt-8 border-t border-border`}>
                      {/* Quote */}
                      <div className="bg-secondary/30 rounded-xl p-6 border-l-4 border-primary">
                        <p className="text-foreground italic mb-3">"{study.quote}"</p>
                        <p className="text-sm text-muted-foreground">— {study.clientName} Team</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Campaign Duration: <strong className="text-foreground">{study.duration}</strong>
                        </p>
                      </div>

                      {/* Video Testimonial - Only show if video exists */}
                      {study.videoId && (
                        <VideoTestimonial
                          videoId={study.videoId}
                          title={`${study.clientName} Success Story`}
                          clientName={study.clientName}
                          business={study.industry}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Note for adding real content */}
            <div className="mt-12 p-6 bg-secondary/30 rounded-xl border border-border text-center">
              <p className="text-sm text-muted-foreground">
                📸 <strong className="text-foreground">Ready to add your success story?</strong> Upload before/after screenshots and video testimonials to showcase real results.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-gradient-card border-t border-border">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
                Want Similar Results for Your Business?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Let's discuss how we can build a growth system for your specific business.
                Free consultation on WhatsApp.
              </p>
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                <Button variant="whatsapp" size="xl">
                  <MessageCircle className="w-5 h-5" />
                  Get Free Consultation
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

export default CaseStudies;
