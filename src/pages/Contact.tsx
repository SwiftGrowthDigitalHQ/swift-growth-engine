import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { UnifiedChatWidget } from "@/components/UnifiedChatWidget";
import { PageTransition } from "@/components/PageTransition";
import { ContactForm } from "@/components/ContactForm";
import { Phone, Mail, MapPin, MessageCircle, Clock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedSection } from "@/hooks/use-scroll-animation";
import { WhatsAppCTA } from "@/components/WhatsAppCTA";

const Contact = () => {

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
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold mb-3 leading-tight max-w-full">
                Contact <span className="text-gradient inline-block max-w-full break-words">SwiftGrowthDigital</span>
              </h1>
              <p className="mb-5 font-display text-lg sm:text-xl font-semibold text-foreground">Let's Talk Growth</p>
              <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
                Ready to grow your business? Contact our team about website development, software, digital marketing, SEO, automation, and technology services. Reach out via WhatsApp for the fastest response.
              </p>
            </AnimatedSection>
          </div>
        </section>

        {/* Contact Options */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-8">
              {/* Contact Form */}
              <AnimatedSection direction="left">
                <div className="p-6 md:p-8 rounded-2xl bg-card border border-border h-full">
                  <h3 className="text-xl md:text-2xl font-display font-bold text-foreground mb-6">
                    Send Us a Message
                  </h3>
                  <ContactForm source="contact_page" />
                </div>
              </AnimatedSection>

              {/* Other Contact Methods */}
              <div className="space-y-4 md:space-y-6">
                {/* Primary - WhatsApp */}
                <AnimatedSection direction="right" delay={0}>
                  <div className="p-4 md:p-6 rounded-2xl bg-gradient-card border border-primary glow-primary">
                    <div className="flex items-start gap-3 md:gap-4">
                      <div className="w-12 md:w-14 h-12 md:h-14 rounded-xl bg-whatsapp flex items-center justify-center flex-shrink-0">
                        <MessageCircle className="w-6 md:w-7 h-6 md:h-7 text-whatsapp-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg md:text-xl font-display font-bold text-foreground mb-2">
                          WhatsApp (Recommended)
                        </h3>
                        <p className="text-muted-foreground mb-4 text-xs md:text-sm">
                          Get the fastest response. We usually reply within 1 hour during business hours.
                        </p>
                        <WhatsAppCTA
                          source="contact_page"
                          size="sm"
                          icon={<MessageCircle className="w-4 h-4" />}
                          className="w-full max-w-xs sm:max-w-sm"
                        >
                          Chat on WhatsApp
                        </WhatsAppCTA>
                        <p className="text-xs md:text-sm text-muted-foreground mt-3 break-words whitespace-nowrap sm:whitespace-normal">
                          +91 9229721835
                        </p>
                      </div>
                    </div>
                  </div>
                </AnimatedSection>

                {/* Website */}
                <AnimatedSection direction="right" delay={250}>
                  <a
                    href="https://www.swiftgrowthdigital.com/"
                    className="block rounded-xl border border-border bg-card p-4 md:p-6 transition-colors hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="flex items-start gap-3 md:gap-4">
                      <div className="flex h-10 md:h-12 w-10 md:w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Globe className="h-5 md:h-6 w-5 md:w-6 text-primary" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="mb-1 font-display font-semibold text-foreground">Website</h4>
                        <p className="break-words text-muted-foreground">www.swiftgrowthdigital.com</p>
                      </div>
                    </div>
                  </a>
                </AnimatedSection>

                {/* Phone */}
                <AnimatedSection direction="right" delay={100}>
                  <a 
                    href="tel:+919229721835"
                    className="block p-4 md:p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start gap-3 md:gap-4">
                      <div className="w-10 md:w-12 h-10 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-5 md:w-6 h-5 md:h-6 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-display font-semibold text-foreground mb-1">
                          Call Us
                        </h4>
                        <p className="text-muted-foreground break-all">+91 9229721835</p>
                      </div>
                    </div>
                  </a>
                </AnimatedSection>

                {/* Email */}
                <AnimatedSection direction="right" delay={200}>
                  <a 
                    href="mailto:hello@swiftgrowthdigital.com"
                    className="block p-4 md:p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start gap-3 md:gap-4">
                      <div className="w-10 md:w-12 h-10 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-5 md:w-6 h-5 md:h-6 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-display font-semibold text-foreground mb-1">
                          Email Us
                        </h4>
                        <p className="text-muted-foreground break-words">hello@swiftgrowthdigital.com</p>
                      </div>
                    </div>
                  </a>
                </AnimatedSection>

                {/* Hours */}
                <AnimatedSection direction="right" delay={300}>
                  <div className="p-4 md:p-6 rounded-xl bg-card border border-border">
                    <div className="flex items-start gap-3 md:gap-4">
                      <div className="w-10 md:w-12 h-10 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 md:w-6 h-5 md:h-6 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-display font-semibold text-foreground mb-1">
                          Business Hours
                        </h4>
                        <p className="text-muted-foreground text-sm">
                          Monday - Saturday: 10 AM - 7 PM<br />
                          Sunday: Closed
                        </p>
                      </div>
                    </div>
                  </div>
                </AnimatedSection>

                {/* Location */}
                <AnimatedSection direction="right" delay={400}>
                  <div className="p-4 md:p-6 rounded-xl bg-card border border-border">
                    <div className="flex items-start gap-3 md:gap-4">
                      <div className="w-10 md:w-12 h-10 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 md:w-6 h-5 md:h-6 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-display font-semibold text-foreground mb-1">
                          Location
                        </h4>
                        <p className="text-muted-foreground text-sm">
                          We work remotely and serve<br />
                          businesses across India
                        </p>
                      </div>
                    </div>
                  </div>
                </AnimatedSection>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 bg-card">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <AnimatedSection className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-foreground leading-tight">
                  Common Questions
                </h2>
              </AnimatedSection>
              <div className="space-y-6">
                <AnimatedSection delay={0}>
                  <div className="p-6 rounded-xl bg-background border border-border">
                    <h4 className="font-display font-semibold text-foreground mb-2">
                      How quickly will you respond?
                    </h4>
                    <p className="text-muted-foreground text-sm">
                      We typically respond within 1 hour on WhatsApp during business hours. For emails, expect a response within 24 hours.
                    </p>
                  </div>
                </AnimatedSection>
                <AnimatedSection delay={100}>
                  <div className="p-6 rounded-xl bg-background border border-border">
                    <h4 className="font-display font-semibold text-foreground mb-2">
                      Do you work with businesses outside India?
                    </h4>
                    <p className="text-muted-foreground text-sm">
                      Currently, we focus on serving local businesses within India. This helps us deliver better results as we understand the local market well.
                    </p>
                  </div>
                </AnimatedSection>
                <AnimatedSection delay={200}>
                  <div className="p-6 rounded-xl bg-background border border-border">
                    <h4 className="font-display font-semibold text-foreground mb-2">
                      Is the consultation really free?
                    </h4>
                    <p className="text-muted-foreground text-sm">
                      Yes! The initial consultation and growth audit is completely free. We'll analyze your current situation and provide actionable recommendations with no obligations.
                    </p>
                  </div>
                </AnimatedSection>
              </div>
            </div>
          </div>
        </section>
      </main>
      </PageTransition>
      <Footer />
      <UnifiedChatWidget />
    </div>
  );
};

export default Contact;
