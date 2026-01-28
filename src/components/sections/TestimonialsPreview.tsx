import { Star, Quote, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const featuredTestimonials = [
  {
    name: "Dr. Rajesh Sharma",
    business: "City Dental Care, Mumbai",
    category: "Clinic",
    result: "3x more patients",
    review: "Before Swiftgrowthdigital, we relied only on referrals. Now we get 25+ new patient inquiries every month from Google.",
    avatar: "RS",
  },
  {
    name: "Vikram Singh",
    business: "Sunrise Developers, Noida",
    category: "Real Estate",
    result: "200+ qualified leads/month",
    review: "Swiftgrowthdigital's Facebook ads strategy gave us 3x better leads at half the cost. Their CRM integration is a game-changer.",
    avatar: "VS",
  },
  {
    name: "Ravi Patel",
    business: "Punjabi Tadka, Surat",
    category: "Restaurant",
    result: "70% direct orders",
    review: "We were paying 30% to Swiggy and Zomato. Now most orders come directly to us. Saved lakhs in commissions!",
    avatar: "RP",
  },
];

export function TestimonialsPreview() {
  return (
    <section className="py-20 md:py-28 bg-card relative">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border mb-6">
            <Star className="w-4 h-4 text-primary fill-primary" />
            <span className="text-sm font-medium text-muted-foreground">100+ Happy Clients</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-6">
            What Our <span className="text-gradient">Clients Say</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Real results from real business owners across India.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {featuredTestimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-background rounded-2xl border border-border p-6 hover:border-primary/30 transition-all duration-300"
            >
              <Quote className="w-8 h-8 text-primary/30 mb-4" />
              <p className="text-muted-foreground leading-relaxed mb-6">
                "{testimonial.review}"
              </p>
              <div className="inline-block px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full mb-4">
                ✓ {testimonial.result}
              </div>
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-primary fill-primary" />
                ))}
              </div>
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="font-display font-semibold text-foreground text-sm">
                    {testimonial.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {testimonial.business}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Link to="/testimonials">
            <Button variant="outline" size="lg">
              View All Testimonials
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
