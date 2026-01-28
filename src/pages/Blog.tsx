import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { SwiftBot } from "@/components/SwiftBot";
import { ArrowRight, Calendar, Clock, User } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const blogPosts = [
  {
    slug: "local-business-leads-online",
    title: "How Local Businesses Can Get More Leads Online in 2024",
    excerpt: "Discover proven strategies for Indian local businesses to generate quality leads through digital marketing. From Google Ads to WhatsApp automation.",
    category: "Lead Generation",
    author: "Sonu",
    date: "2024-01-15",
    readTime: "8 min read",
    image: "/placeholder.svg",
  },
  {
    slug: "google-ads-clinics-india",
    title: "Google Ads for Clinics in India: Complete Guide",
    excerpt: "Learn how dental clinics and medical practices can use Google Ads to attract more patients. Step-by-step guide with budget tips.",
    category: "Healthcare Marketing",
    author: "Sonu",
    date: "2024-01-10",
    readTime: "10 min read",
    image: "/placeholder.svg",
  },
  {
    slug: "real-estate-lead-generation",
    title: "Real Estate Lead Generation: Facebook vs Google Ads",
    excerpt: "Which platform works better for real estate in India? We compare Meta Ads and Google Ads for property leads with real data.",
    category: "Real Estate",
    author: "Sonu",
    date: "2024-01-05",
    readTime: "7 min read",
    image: "/placeholder.svg",
  },
  {
    slug: "restaurant-cloud-kitchen-marketing",
    title: "Restaurant & Cloud Kitchen Marketing: Get More Orders",
    excerpt: "Effective marketing strategies for restaurants and cloud kitchens. From Zomato optimization to Instagram Reels that drive orders.",
    category: "Restaurant Marketing",
    author: "Sonu",
    date: "2024-01-01",
    readTime: "9 min read",
    image: "/placeholder.svg",
  },
  {
    slug: "whatsapp-marketing-small-business",
    title: "WhatsApp Marketing for Small Businesses: A Beginner's Guide",
    excerpt: "How to use WhatsApp Business API for lead generation and customer engagement. Automation tips for Indian SMBs.",
    category: "WhatsApp Marketing",
    author: "Sonu",
    date: "2023-12-28",
    readTime: "6 min read",
    image: "/placeholder.svg",
  },
  {
    slug: "local-seo-near-me-search",
    title: "Local SEO: How to Rank for 'Near Me' Searches",
    excerpt: "Master local SEO and appear in 'near me' searches. Google My Business optimization tips for Indian businesses.",
    category: "SEO",
    author: "Sonu",
    date: "2023-12-20",
    readTime: "8 min read",
    image: "/placeholder.svg",
  },
];

const categories = [
  "All",
  "Lead Generation",
  "Healthcare Marketing",
  "Real Estate",
  "Restaurant Marketing",
  "WhatsApp Marketing",
  "SEO",
];

const Blog = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-16 md:py-24 relative">
          <div className="absolute inset-0 bg-hero-glow opacity-50" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6">
                Digital Marketing <span className="text-gradient">Insights</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground">
                Tips, guides, and strategies for growing your local business online.
                Written by Sonu for Indian business owners.
              </p>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="py-8 border-b border-border">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap gap-3 justify-center">
              {categories.map((category) => (
                <button
                  key={category}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    category === "All"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Blog Posts Grid */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {blogPosts.map((post) => (
                <article
                  key={post.slug}
                  className="group bg-card rounded-2xl border border-border overflow-hidden hover:border-primary/50 transition-all duration-300"
                >
                  <div className="aspect-video bg-secondary relative overflow-hidden">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 bg-primary/90 text-primary-foreground text-xs font-medium rounded-full">
                        {post.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        <span>{post.author}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(post.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{post.readTime}</span>
                      </div>
                    </div>
                    <h2 className="text-xl font-display font-semibold mb-3 text-foreground group-hover:text-primary transition-colors">
                      {post.title}
                    </h2>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                      {post.excerpt}
                    </p>
                    <Link
                      to={`/blog/${post.slug}`}
                      className="inline-flex items-center gap-2 text-primary font-medium text-sm hover:gap-3 transition-all"
                    >
                      Read More <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            {/* Load More */}
            <div className="text-center mt-12">
              <Button variant="outline" size="lg">
                Load More Articles
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* Newsletter CTA */}
        <section className="py-16 bg-card border-y border-border">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl font-display font-bold mb-4">
                Get Marketing Tips on WhatsApp
              </h2>
              <p className="text-muted-foreground mb-6">
                Join 500+ business owners who get weekly digital marketing tips directly on WhatsApp.
              </p>
              <a
                href="https://wa.me/919229721835?text=Hi%2C%20I%20want%20to%20subscribe%20to%20marketing%20tips"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="whatsapp" size="lg">
                  Subscribe on WhatsApp
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </a>
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

export default Blog;
