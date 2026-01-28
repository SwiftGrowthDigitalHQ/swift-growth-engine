import { Link } from "react-router-dom";
import { Phone, Mail, MapPin } from "lucide-react";

// YouTube, Instagram, LinkedIn icons
const YouTubeIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

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
              Complete digital growth system for Indian businesses. Website + Ads + SEO + WhatsApp that brings real customers.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-4 pt-2">
              <a
                href="https://youtube.com/@swiftgrowthdigital"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-red-500 transition-colors"
                aria-label="YouTube"
              >
                <YouTubeIcon />
              </a>
              <a
                href="https://instagram.com/swiftgrowthdigital"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-pink-500 transition-colors"
                aria-label="Instagram"
              >
                <InstagramIcon />
              </a>
              <a
                href="https://linkedin.com/company/swiftgrowthdigital"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-blue-500 transition-colors"
                aria-label="LinkedIn"
              >
                <LinkedInIcon />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold text-foreground">Quick Links</h4>
            <div className="flex flex-col gap-2">
              <Link to="/" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Home
              </Link>
              <Link to="/services" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Services
              </Link>
              <Link to="/blog" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Blog
              </Link>
              <Link to="/case-studies" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Case Studies
              </Link>
              <Link to="/pricing" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Pricing
              </Link>
              <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Contact
              </Link>
            </div>
          </div>

          {/* Industries */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold text-foreground">Industries</h4>
            <div className="flex flex-col gap-2">
              <Link to="/clinic-marketing" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Clinic & Healthcare
              </Link>
              <Link to="/real-estate-marketing" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Real Estate
              </Link>
              <Link to="/restaurant-marketing" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Restaurant & Cloud Kitchen
              </Link>
              <Link to="/local-business-marketing" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Local Businesses
              </Link>
              <Link to="/education-marketing" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Education & Coaching
              </Link>
              <Link to="/salon-marketing" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Salon & Beauty
              </Link>
              <Link to="/service-business-marketing" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Service Businesses
              </Link>
              <Link to="/ecommerce-marketing" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                E-commerce & Shopify
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
            © {new Date().getFullYear()} Swiftgrowthdigital. All rights reserved.
          </p>
          <p className="text-muted-foreground text-sm">
            Founded by <span className="text-primary font-medium">Sonu</span>
          </p>
        </div>
      </div>
    </footer>
  );
}