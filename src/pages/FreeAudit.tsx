import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { SwiftBot } from "@/components/SwiftBot";
import { Gift, Check, ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackConversion } from "@/lib/analytics";

const FreeAudit = () => {
  const [formData, setFormData] = useState({
    name: "",
    businessType: "",
    city: "",
    whatsapp: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Track conversion event
    trackConversion.freeAuditSubmit(formData.businessType, formData.city);

    // Create WhatsApp message with form data
    const message = encodeURIComponent(
      `Hi! I want a FREE Growth Audit.\n\nName: ${formData.name}\nBusiness: ${formData.businessType}\nCity: ${formData.city}\nWhatsApp: ${formData.whatsapp}`
    );
    
    // Open WhatsApp with the message
    window.open(`https://wa.me/919229721835?text=${message}`, "_blank");
    setIsSubmitting(false);
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
      <main className="pt-20">
        {/* Hero */}
        <section className="py-16 md:py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-hero-glow" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                {/* Left - Content */}
                <div className="space-y-6">
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
                </div>

                {/* Right - Form */}
                <div className="p-6 md:p-8 rounded-2xl bg-card border border-border">
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
                        value={formData.whatsapp}
                        onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                        className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Enter your WhatsApp number"
                      />
                    </div>
                    
                    <Button
                      type="submit"
                      variant="whatsapp"
                      size="lg"
                      className="w-full mt-4"
                      disabled={isSubmitting}
                    >
                      <MessageCircle className="w-5 h-5" />
                      Get Free Audit on WhatsApp
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                  </form>
                  
                  <p className="text-xs text-muted-foreground text-center mt-4">
                    No payment required. No spam. Just value.
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

export default FreeAudit;
