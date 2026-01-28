import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h1 className="text-4xl md:text-5xl font-display font-bold mb-8">
                Privacy <span className="text-gradient">Policy</span>
              </h1>
              <p className="text-muted-foreground mb-8">
                Last updated: January 2024
              </p>

              <div className="prose prose-invert max-w-none space-y-8">
                <section>
                  <h2 className="text-2xl font-display font-semibold text-foreground mb-4">1. Information We Collect</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    We collect information you provide directly to us, including name, email address, phone number, 
                    business type, and city when you fill out our contact forms, request a free audit, or communicate 
                    with us via WhatsApp.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-display font-semibold text-foreground mb-4">2. How We Use Your Information</h2>
                  <ul className="text-muted-foreground space-y-2">
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      To provide and improve our services
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      To communicate with you about our services
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      To send you marketing communications (with your consent)
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      To analyze website usage and improve user experience
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-display font-semibold text-foreground mb-4">3. Analytics & Tracking</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    We use Google Analytics, Google Tag Manager, and Meta Pixel to analyze website traffic and 
                    understand how visitors interact with our site. These tools may collect information about your 
                    device, browser, and browsing behavior.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-display font-semibold text-foreground mb-4">4. WhatsApp Communication</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    When you contact us via WhatsApp, your phone number and messages are processed by WhatsApp 
                    (owned by Meta). We use WhatsApp Business API to respond to your inquiries. Messages may be 
                    stored for customer service purposes.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-display font-semibold text-foreground mb-4">5. Data Security</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    We implement appropriate security measures to protect your personal information. However, no 
                    method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-display font-semibold text-foreground mb-4">6. Your Rights</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    You have the right to access, correct, or delete your personal information. To exercise these 
                    rights, please contact us via WhatsApp or email.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-display font-semibold text-foreground mb-4">7. Contact Us</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    If you have any questions about this Privacy Policy, please contact us:
                  </p>
                  <ul className="text-muted-foreground mt-4 space-y-2">
                    <li>WhatsApp: +91 9229721835</li>
                    <li>Email: hello@swiftgrowthdigital.com</li>
                  </ul>
                </section>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
