import { ArrowRight, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden bg-accent/5">
      {/* Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-accent/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-8">
            <Gift className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">Limited Time Offer</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-6 text-primary">
            Get Your <span className="text-gradient">FREE Growth Audit</span>
            <br />
            Worth ₹2,999
          </h2>
          
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            Discover exactly what's stopping your business from growing online. 
            Get a personalized action plan delivered on WhatsApp.
          </p>
          
          <a href="/free-audit">
            <Button variant="whatsapp" size="xl">
              Get Free Audit Now
              <ArrowRight className="w-5 h-5" />
            </Button>
          </a>
          
          <p className="mt-6 text-sm text-muted-foreground">
            No payment required. No obligations. Just pure value.
          </p>
        </div>
      </div>
    </section>
  );
}
