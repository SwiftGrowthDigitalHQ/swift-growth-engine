import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { UnifiedChatWidget } from "@/components/UnifiedChatWidget";
import { Star, Quote, MessageCircle, ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TestimonialCarousel } from "@/components/TestimonialCarousel";
import { VideoTestimonial } from "@/components/VideoTestimonial";
import { AnimatedSection } from "@/hooks/use-scroll-animation";

const testimonials = [
  // Clinic Testimonials
  {
    category: "Clinic",
    name: "Dr. Rajesh Sharma",
    business: "City Dental Care",
    location: "Mumbai",
    rating: 5,
    result: "3x more patients",
    review: "Before Swiftgrowthdigital, we relied only on referrals. Now we get 25+ new patient inquiries every month from Google. The WhatsApp automation saves us so much time in appointment booking.",
    avatar: "RS",
  },
  {
    category: "Clinic",
    name: "Dr. Priya Mehta",
    business: "Skin & Hair Clinic",
    location: "Ahmedabad",
    rating: 5,
    result: "60% more bookings",
    review: "Sonu and team understood our clinic's needs perfectly. The Instagram ads they run bring quality leads who are actually interested in our treatments. Best investment we made!",
    avatar: "PM",
  },
  {
    category: "Clinic",
    name: "Dr. Arun Kumar",
    business: "Ortho Plus Clinic",
    location: "Chennai",
    rating: 5,
    result: "₹2L+ monthly revenue increase",
    review: "Very professional team. They built our website, set up Google ads, and now we rank #1 for 'ortho doctor near me' in our area. The results speak for themselves.",
    avatar: "AK",
  },
  // Real Estate Testimonials
  {
    category: "Real Estate",
    name: "Vikram Singh",
    business: "Sunrise Developers",
    location: "Noida",
    rating: 5,
    result: "200+ qualified leads/month",
    review: "We were spending lakhs on MagicBricks with poor results. Swiftgrowthdigital's Facebook ads strategy gave us 3x better leads at half the cost. Their CRM integration is a game-changer.",
    avatar: "VS",
  },
  {
    category: "Real Estate",
    name: "Anita Reddy",
    business: "Prime Properties",
    location: "Hyderabad",
    rating: 5,
    result: "Closed 12 deals in 3 months",
    review: "The team created separate campaigns for each of our projects. The landing pages they built convert really well. We've stopped all newspaper ads now.",
    avatar: "AR",
  },
  {
    category: "Real Estate",
    name: "Mohammad Faisal",
    business: "Al Falah Constructions",
    location: "Lucknow",
    rating: 5,
    result: "5x ROI on ad spend",
    review: "Honest and transparent pricing. They don't promise fake numbers like other agencies. The leads we get are genuine buyers, and our sales team loves working with them.",
    avatar: "MF",
  },
  // Restaurant Testimonials
  {
    category: "Restaurant",
    name: "Ravi Patel",
    business: "Punjabi Tadka",
    location: "Surat",
    rating: 5,
    result: "70% direct orders",
    review: "We were paying 30% to Swiggy and Zomato. Swiftgrowthdigital helped us build our own ordering system on WhatsApp. Now most orders come directly to us. Saved lakhs in commissions!",
    avatar: "RP",
  },
  {
    category: "Restaurant",
    name: "Deepa Krishnan",
    business: "South Spice Kitchen",
    location: "Bangalore",
    rating: 5,
    result: "2x revenue growth",
    review: "The food reels they create for Instagram get amazing engagement. Our follower count grew from 500 to 15,000 in 6 months, and we're getting orders from all over the city now.",
    avatar: "DK",
  },
  {
    category: "Restaurant",
    name: "Amit Jain",
    business: "Biryani Express (Cloud Kitchen)",
    location: "Delhi",
    rating: 5,
    result: "300+ orders/week directly",
    review: "As a cloud kitchen, we needed to reduce aggregator dependency. The Google Ads + WhatsApp combo they set up works perfectly. Our margins improved by 20%.",
    avatar: "AJ",
  },
];

// Note: Replace with actual video IDs when available
const videoTestimonials: Array<{
  videoId: string | null;
  title: string;
  clientName: string;
  business: string;
}> = [
  {
    videoId: null, // Add real video ID
    title: "How We Grew City Dental's Patient Base 3x",
    clientName: "Dr. Rajesh Sharma",
    business: "City Dental Care",
  },
  {
    videoId: null, // Add real video ID
    title: "Real Estate Success: 200+ Leads Per Month",
    clientName: "Vikram Singh",
    business: "Sunrise Developers",
  },
  {
    videoId: null, // Add real video ID
    title: "Restaurant Direct Orders Jumped to 70%",
    clientName: "Ravi Patel",
    business: "Punjabi Tadka",
  },
];

const categories = ["All", "Clinic", "Real Estate", "Restaurant"];

const Testimonials = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const whatsappLink = "https://wa.me/919229721835?text=Hi%2C%20I%20saw%20your%20testimonials%20and%20want%20to%20discuss%20my%20business";

  const filteredTestimonials = activeCategory === "All" 
    ? testimonials 
    : testimonials.filter(t => t.category === activeCategory);

  const hasVideoTestimonials = videoTestimonials.some(v => v.videoId !== null);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-16 md:py-24 relative">
          <div className="absolute inset-0 bg-hero-glow opacity-50" />
          <div className="container mx-auto px-4 relative z-10">
            <AnimatedSection className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border mb-6">
                <Star className="w-4 h-4 text-primary fill-primary" />
                <span className="text-sm font-medium text-muted-foreground">100+ Happy Clients</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6">
                Client <span className="text-gradient">Testimonials</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground">
                Real reviews from real business owners. See what they say about working with Swiftgrowthdigital.
              </p>
            </AnimatedSection>
          </div>
        </section>

        {/* Featured Carousel */}
        <section className="py-12 md:py-16 border-b border-border">
          <div className="container mx-auto px-4">
            <AnimatedSection>
              <h2 className="text-2xl font-display font-bold text-center mb-8">Featured Reviews</h2>
              <TestimonialCarousel 
                testimonials={testimonials.slice(0, 5)} 
                autoPlay={true}
                interval={6000}
              />
            </AnimatedSection>
          </div>
        </section>

        {/* Video Testimonials - Only show if videos exist */}
        {hasVideoTestimonials && (
          <section className="py-16 md:py-20 bg-card">
            <div className="container mx-auto px-4">
              <AnimatedSection className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border mb-4">
                  <Play className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">Video Testimonials</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
                  Hear From Our <span className="text-gradient">Clients</span>
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Watch real business owners share their growth journey with Swiftgrowthdigital
                </p>
              </AnimatedSection>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {videoTestimonials.filter(v => v.videoId).map((video, index) => (
                  <AnimatedSection key={index} delay={index * 100}>
                    <VideoTestimonial
                      videoId={video.videoId!}
                      title={video.title}
                      clientName={video.clientName}
                      business={video.business}
                    />
                  </AnimatedSection>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Categories Filter */}
        <section className="py-8 border-b border-border">
          <div className="container mx-auto px-4">
            <AnimatedSection className="flex flex-wrap gap-3 justify-center">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    category === activeCategory
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  }`}
                >
                  {category}
                </button>
              ))}
            </AnimatedSection>
          </div>
        </section>

        {/* Testimonials Grid */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTestimonials.map((testimonial, index) => (
                <AnimatedSection key={index} delay={index * 50}>
                  <div className="bg-card rounded-2xl border border-border p-6 hover:border-primary/30 transition-all duration-300 h-full">
                    {/* Client Info */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <p className="font-display font-semibold text-foreground">
                          {testimonial.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {testimonial.business}, {testimonial.location}
                        </p>
                      </div>
                    </div>

                    {/* Quote Icon */}
                    <Quote className="w-8 h-8 text-primary/30 mb-4" />

                    {/* Review */}
                    <p className="text-muted-foreground leading-relaxed mb-6">
                      "{testimonial.review}"
                    </p>

                    {/* Result Badge */}
                    <div className="inline-block px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full mb-4">
                      ✓ {testimonial.result}
                    </div>

                    {/* Rating */}
                    <div className="flex gap-1 mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-primary fill-primary" />
                      ))}
                    </div>

                    {/* Category Tag */}
                    <div>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">
                        {testimonial.category}
                      </span>
                    </div>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-card border-y border-border">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { value: "100+", label: "Happy Clients" },
                { value: "₹10Cr+", label: "Revenue Generated" },
                { value: "50K+", label: "Leads Delivered" },
                { value: "4.9", label: "Average Rating" },
              ].map((stat, i) => (
                <AnimatedSection key={i} delay={i * 100} className="text-center">
                  <p className="text-4xl md:text-5xl font-display font-bold text-gradient mb-2">{stat.value}</p>
                  <p className="text-muted-foreground">{stat.label}</p>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <AnimatedSection className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
                Ready to Be Our Next Success Story?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Join 100+ businesses that trust Swiftgrowthdigital for their digital growth.
                Start with a free consultation today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                  <Button variant="whatsapp" size="xl">
                    <MessageCircle className="w-5 h-5" />
                    Chat on WhatsApp
                  </Button>
                </a>
                <a href="/free-audit">
                  <Button variant="outline" size="xl">
                    Get Free Audit
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </a>
              </div>
            </AnimatedSection>
          </div>
        </section>
      </main>
      <Footer />
      <UnifiedChatWidget />
    </div>
  );
};

export default Testimonials;
