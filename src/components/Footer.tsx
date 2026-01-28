import { Link } from "react-router-dom";
import { Phone, Mail, MapPin } from "lucide-react";

export function Footer() {
  const whatsappLink = "https://wa.me/919229721835?text=Hi%2C%20I%20want%20to%20grow%20my%20business";

  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="inline-block">
              <span className="text-2xl font-display font-bold text-gradient">
                Swiftgrowth<span className="text-foreground">digital</span>
              </span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We build complete growth systems for local businesses. Website + Ads + SEO + WhatsApp that brings real customers.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold text-foreground">Quick Links</h4>
            <div className="flex flex-col gap-2">
              <Link to="/services" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Our Services
              </Link>
              <Link to="/pricing" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Pricing
              </Link>
              <Link to="/free-audit" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Free Growth Audit
              </Link>
              <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Contact Us
              </Link>
            </div>
          </div>

          {/* Industries */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold text-foreground">Industries</h4>
            <div className="flex flex-col gap-2">
              <Link to="/clinic-marketing" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Clinic Marketing
              </Link>
              <Link to="/real-estate-marketing" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Real Estate Marketing
              </Link>
              <Link to="/restaurant-marketing" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Restaurant & Cloud Kitchen
              </Link>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold text-foreground">Contact</h4>
            <div className="flex flex-col gap-3">
              <a 
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-muted-foreground hover:text-whatsapp transition-colors text-sm"
              >
                <Phone className="w-4 h-4" />
                +91 9229721835
              </a>
              <a 
                href="mailto:hello@swiftgrowthdigital.com"
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm"
              >
                <Mail className="w-4 h-4" />
                hello@swiftgrowthdigital.com
              </a>
              <div className="flex items-start gap-2 text-muted-foreground text-sm">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>India</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            © 2024 Swiftgrowthdigital. All rights reserved.
          </p>
          <p className="text-muted-foreground text-sm">
            Founded by <span className="text-primary font-medium">Sonu</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
