import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { SwiftBot } from "@/components/SwiftBot";
import { ContactForm } from "@/components/ContactForm";
import { Phone, Mail, MapPin, MessageCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const Contact = () => {
  const whatsappLink = "https://wa.me/919229721835?text=Hi%2C%20I%20want%20to%20grow%20my%20business";

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
                Let's <span className="text-gradient">Talk Growth</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Ready to grow your business? We're here to help. 
                Reach out via WhatsApp for the fastest response.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Options */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-8">
              {/* Contact Form */}
              <div className="p-8 rounded-2xl bg-card border border-border">
                <h3 className="text-2xl font-display font-bold text-foreground mb-6">
                  Send Us a Message
                </h3>
                <ContactForm source="contact_page" />
              </div>

              {/* Other Contact Methods */}
              <div className="space-y-6">
                {/* Primary - WhatsApp */}
                <div className="p-6 rounded-2xl bg-gradient-card border border-primary glow-primary">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-whatsapp flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-7 h-7 text-whatsapp-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-display font-bold text-foreground mb-2">
                        WhatsApp (Recommended)
                      </h3>
                      <p className="text-muted-foreground mb-4 text-sm">
                        Get the fastest response. We usually reply within 1 hour during business hours.
                      </p>
                      <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                        <Button variant="whatsapp" size="sm">
                          <MessageCircle className="w-4 h-4" />
                          Chat on WhatsApp
                        </Button>
                      </a>
                      <p className="text-sm text-muted-foreground mt-3">
                        +91 9229721835
                      </p>
                    </div>
                  </div>
                </div>

                {/* Phone */}
                <a 
                  href="tel:+919229721835"
                  className="block p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-display font-semibold text-foreground mb-1">
                        Call Us
                      </h4>
                      <p className="text-muted-foreground">+91 9229721835</p>
                    </div>
                  </div>
                </a>

                {/* Email */}
                <a 
                  href="mailto:hello@swiftgrowthdigital.com"
                  className="block p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-display font-semibold text-foreground mb-1">
                        Email Us
                      </h4>
                      <p className="text-muted-foreground">hello@swiftgrowthdigital.com</p>
                    </div>
                  </div>
                </a>

                {/* Hours */}
                <div className="p-6 rounded-xl bg-card border border-border">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-6 h-6 text-primary" />
                    </div>
                    <div>
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

                {/* Location */}
                <div className="p-6 rounded-xl bg-card border border-border">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-primary" />
                    </div>
                    <div>
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
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 bg-card">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-display font-bold text-foreground text-center mb-12">
                Common Questions
              </h2>
              <div className="space-y-6">
                <div className="p-6 rounded-xl bg-background border border-border">
                  <h4 className="font-display font-semibold text-foreground mb-2">
                    How quickly will you respond?
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    We typically respond within 1 hour on WhatsApp during business hours. For emails, expect a response within 24 hours.
                  </p>
                </div>
                <div className="p-6 rounded-xl bg-background border border-border">
                  <h4 className="font-display font-semibold text-foreground mb-2">
                    Do you work with businesses outside India?
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    Currently, we focus on serving local businesses within India. This helps us deliver better results as we understand the local market well.
                  </p>
                </div>
                <div className="p-6 rounded-xl bg-background border border-border">
                  <h4 className="font-display font-semibold text-foreground mb-2">
                    Is the consultation really free?
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    Yes! The initial consultation and growth audit is completely free. We'll analyze your current situation and provide actionable recommendations with no obligations.
                  </p>
                </div>
              </div>
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

export default Contact;
