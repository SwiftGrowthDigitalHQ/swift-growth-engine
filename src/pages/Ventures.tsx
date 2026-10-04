import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { UnifiedChatWidget } from "@/components/UnifiedChatWidget";
import { PageTransition } from "@/components/PageTransition";
import { ArrowRight, Zap, Target, Globe, BookOpen, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AnimatedSection } from "@/hooks/use-scroll-animation";
import { WhatsAppCTA } from "@/components/WhatsAppCTA";
import { Link } from "react-router-dom";

const products = [
  {
    id: "sangtx",
    name: "SangTX",
    status: "LIVE PRODUCT",
    category: "News & Media Platform",
    description: "SangTX is a digital news platform focused on delivering local and regional news through a modern mobile-first experience.",
    features: [
      "News Management\nCreate, edit, schedule and publish articles with a rich editor, tags, SEO fields and featured images.",
      "Categories\nOrganize your content into news categories with custom slugs, sort order and SEO metadata.",
      "Breaking News\nPublish urgent breaking news in the top ticker with start/end times and custom link targets.",
      "Media Library\nUpload, manage and reuse images across articles with metadata, alt text and usage tracking.",
      "SEO Management\nPer-page meta titles, descriptions, Open Graph, canonical URLs and structured data.",
    ],
    icon: Globe,
    ctaText: "Visit SangTX →",
    ctaUrl: "https://sangtx.com",
  },
  {
    id: "libriofy",
    name: "Libriofy",
    status: "LIVE PRODUCT",
    category: "Library Management Platform",
    description: "Libriofy is a digital platform designed to simplify library management and help libraries manage their operations through modern software.",
    features: [
      "Visual Seat Map\nInteractive seat grid with real-time availability and slot-based allocation.",
      "Automated Payments\nCollect payments, track history, and auto-activate seats on confirmation.",
      "Smart Renewals\nAuto reminders before expiry. Seats release automatically on lapse.",
      "QR Attendance\nStudents check in via QR code or mobile. No-show detection built in.",
      "Waiting List\nFIFO queue with auto-notifications and timed confirmation windows.",
      "Self-Service Admission\nStudents register online — pick plan, slot, seat, and pay instantly.",
      "Revenue Analytics\nTrack occupancy, revenue trends, and get smart pricing suggestions.",
      "Smart Notifications\nBooking, payment, renewal, and expiry alerts — all automated.",
    ],
    icon: BookOpen,
    ctaText: "Visit Libriofy →",
    ctaUrl: "https://libriofy.com",
  },
];

function ProductCard({ product }: { product: typeof products[0] }) {
  return (
    <AnimatedSection className="h-full flex flex-col">
      <Card className="h-full flex flex-col bg-card border border-border card-glow hover-lift">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <product.icon className="w-6 h-6 text-primary" />
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 whitespace-nowrap">
              {product.status}
            </span>
          </div>
          <CardTitle className="text-2xl font-display font-bold text-foreground">{product.name}</CardTitle>
          <CardDescription className="text-muted-foreground">{product.category}</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col pt-4">
          <p className="text-muted-foreground leading-relaxed mb-6 flex-1">{product.description}</p>
          <div className="space-y-3 mb-6">
            {product.features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3 text-sm text-muted-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span className="break-words">{feature}</span>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-border">
            <a
              href={product.ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="hero" size="lg" className="w-full">
                {product.ctaText}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </AnimatedSection>
  );
}

const Ventures = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        <main>
          {/* Our Products */}
          <section className="pt-20 pb-16 md:py-24 bg-background" aria-labelledby="products-heading">
            <div className="container mx-auto px-4">
              <AnimatedSection className="max-w-3xl mx-auto text-center mb-16">
                <h2 id="products-heading" className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-6 text-foreground">
                  Our Products
                </h2>
                <p className="text-lg text-muted-foreground">
                  Digital products built to solve real-world problems.
                </p>
              </AnimatedSection>

              {/* Products Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
                {products.map((product, index) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          </section>

          {/* Product Philosophy / Our Approach */}
          <section className="py-16 md:py-24 bg-card" aria-labelledby="approach-heading">
            <div className="container mx-auto px-4">
              <AnimatedSection className="max-w-3xl mx-auto text-center mb-16">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">OUR APPROACH</span>
                </div>
                <h2 id="approach-heading" className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-6 text-foreground">
                  From Ideas to Real Products
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  We turn practical ideas into digital products, validate them through real-world use, and continuously improve them based on what users actually need.
                </p>
              </AnimatedSection>
            </div>
          </section>

          {/* Two Ways We Build */}
          <section className="py-16 md:py-24 bg-background" aria-labelledby="ways-heading">
            <div className="container mx-auto px-4">
              <AnimatedSection className="max-w-3xl mx-auto text-center mb-16">
                <h2 id="ways-heading" className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-6 text-foreground">
                  Two Ways We Build
                </h2>
              </AnimatedSection>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
                {/* Client Work */}
                <AnimatedSection>
                  <Card className="h-full bg-card border border-border card-glow hover-lift">
                    <CardHeader>
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                        <Target className="w-6 h-6 text-primary" />
                      </div>
                      <CardTitle className="text-2xl font-display font-bold text-foreground">CLIENT WORK</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col pt-4">
                      <p className="text-muted-foreground leading-relaxed mb-6 flex-1">
                        We help businesses build websites, software, marketing systems and digital experiences.
                      </p>
                      <Link to="/case-studies">
                        <Button variant="outline" size="lg" className="w-full">
                          See Client Case Studies
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </AnimatedSection>

                {/* Our Products */}
                <AnimatedSection>
                  <Card className="h-full bg-primary/5 border-primary/30 card-glow hover-lift">
                    <CardHeader>
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                        <Zap className="w-6 h-6 text-primary" />
                      </div>
                      <CardTitle className="text-2xl font-display font-bold text-foreground">OUR PRODUCTS</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col pt-4">
                      <p className="text-muted-foreground leading-relaxed mb-6 flex-1">
                        We also build and operate our own digital products to solve real problems through technology.
                      </p>
                      <Link to="/ventures">
                        <Button variant="outline" size="lg" className="w-full">
                          Explore Our Products
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </AnimatedSection>
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="py-16 md:py-24 relative overflow-hidden bg-secondary" aria-labelledby="cta-heading">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/10 rounded-full blur-3xl" />
            
            <div className="container mx-auto px-4 relative z-10">
              <AnimatedSection className="max-w-3xl mx-auto text-center">
                <h2 id="cta-heading" className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-6 text-foreground">
                  Have an Idea Worth Building?
                </h2>
                <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
                  Let&apos;s turn a practical idea into something useful.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link to="/contact">
                    <Button variant="hero" size="xl">
                      Start a Project
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                  </Link>
                  <WhatsAppCTA
                    source="ventures_footer"
                    variant="whatsapp"
                    size="xl"
                    icon={<MessageCircle className="w-5 h-5" />}
                  >
                    Talk on WhatsApp
                  </WhatsAppCTA>
                </div>
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

export default Ventures;