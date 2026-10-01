import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { UnifiedChatWidget } from "@/components/UnifiedChatWidget";
import { PageTransition } from "@/components/PageTransition";
import { Gift, Check, ArrowRight, MessageCircle, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackConversion } from "@/lib/analytics";
import { WHATSAPP_CONTACT_URL } from "@/lib/whatsapp";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { AnimatedSection } from "@/hooks/use-scroll-animation";

const FreeAudit = () => {
  const [formData, setFormData] = useState({
    name: "",
    businessType: "",
    city: "",
    whatsapp: "",
    whatsapp_opt_in: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate WhatsApp number
      const cleanedWhatsapp = formData.whatsapp.replace(/\D/g, '');
      if (cleanedWhatsapp.length < 10) {
        toast.error('Please enter a valid WhatsApp number');
        setIsSubmitting(false);
        return;
      }

      // Submit lead to database
      const { data, error } = await supabase.functions.invoke('submit-lead', {
        body: {
          name: formData.name.trim(),
          business_type: formData.businessType,
          city: formData.city.trim(),
          whatsapp: cleanedWhatsapp,
          whatsapp_opt_in: formData.whatsapp_opt_in,
          source: 'free_audit',
        },
      });

      if (error) throw error;

      // Track conversion event
      trackConversion.freeAuditSubmit(formData.businessType, formData.city);

      setIsSuccess(true);
      toast.success('Your audit request has been submitted!');

    } catch (err) {
      toast.error('Something went wrong. Please try again or contact us on WhatsApp.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const benefits = [
    "Complete analysis of your current online presence",
    "Competitor comparison in your local market",
    "Specific recommendations for your business",
    "Estimated budget and ROI projection",
    "Custom action plan delivered on WhatsApp",
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        <main className="pt-20">
        {/* Hero */}
        <section className="py-16 md:py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-hero-glow" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                {/* Left - Content */}
                <AnimatedSection direction="left" className="space-y-6">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                    <Gift className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Worth ₹2,999 - FREE</span>
                  </div>
                  
                  <h1 className="text-4xl md:text-5xl font-display font-bold">
                    Get Your <span className="text-gradient">FREE</span>
                    <br />
                    Business Growth Audit
                  </h1>
                  
                  <p className="text-lg text-muted-foreground">
                    Discover exactly what's stopping your business from growing online. 
                    Get a personalized action plan delivered directly on WhatsApp.
                  </p>

                  <ul className="space-y-3">
                    {benefits.map((benefit, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </AnimatedSection>

                {/* Right - Form */}
                <AnimatedSection direction="right" delay={150}>
                  <div className="p-6 md:p-8 rounded-2xl bg-card border border-border">
                    {isSuccess ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                          <CheckCircle className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="text-xl font-display font-bold text-foreground mb-2">
                          Thank You! 🎉
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          Your free audit request has been received.
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Start a WhatsApp conversation whenever you’re ready.
                        </p>
                        <a className="mt-5 inline-flex" href={WHATSAPP_CONTACT_URL} target="_blank" rel="noopener noreferrer">
                          <Button variant="whatsapp"><MessageCircle className="mr-2 h-4 w-4" /> Chat on WhatsApp</Button>
                        </a>
                      </div>
                    ) : (
                      <>
                        <h2 className="text-2xl font-display font-bold text-foreground mb-6">
                          Claim Your Free Audit
                        </h2>
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Your Name *
                            </label>
                            <input
                              type="text"
                              required
                              maxLength={100}
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder="Enter your name"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Business Type *
                            </label>
                            <select
                              required
                              value={formData.businessType}
                              onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                              className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="">Select your business type</option>
                              <option value="Clinic/Hospital">Clinic / Hospital</option>
                              <option value="Dental Clinic">Dental Clinic</option>
                              <option value="Real Estate">Real Estate</option>
                              <option value="Restaurant">Restaurant</option>
                              <option value="Cloud Kitchen">Cloud Kitchen</option>
                              <option value="Retail Shop">Retail Shop</option>
                              <option value="Service Business">Service Business</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              City *
                            </label>
                            <input
                              type="text"
                              required
                              maxLength={100}
                              value={formData.city}
                              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                              className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder="Enter your city"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              WhatsApp Number *
                            </label>
                            <input
                              type="tel"
                              required
                              maxLength={15}
                              value={formData.whatsapp}
                              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                              className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder="Enter your WhatsApp number"
                            />
                          </div>

                          <label className="flex items-start gap-3 rounded-lg border border-border bg-background/40 p-3 text-sm">
                            <Checkbox
                              checked={formData.whatsapp_opt_in}
                              onCheckedChange={(checked) => setFormData({ ...formData, whatsapp_opt_in: checked === true })}
                              disabled={isSubmitting}
                              className="mt-0.5"
                            />
                            <span className="text-muted-foreground">
                              I agree to receive marketing updates from SwiftGrowthDigital on WhatsApp. This is optional; I can ask to stop messages at any time.
                            </span>
                          </label>
                          
                          <Button
                            type="submit"
                            variant="whatsapp"
                            size="lg"
                            className="w-full mt-4"
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Submitting...
                              </>
                            ) : (
                              <>
                                <MessageCircle className="w-5 h-5" />
                                Get Free Audit on WhatsApp
                                <ArrowRight className="w-5 h-5" />
                              </>
                            )}
                          </Button>
                        </form>
                        
                        <p className="text-xs text-muted-foreground text-center mt-4">
                          No payment required. No spam. Just value.
                        </p>
                      </>
                    )}
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

export default FreeAudit;
