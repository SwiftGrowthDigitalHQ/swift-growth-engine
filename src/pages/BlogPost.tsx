import { useParams, Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { UnifiedChatWidget } from '@/components/UnifiedChatWidget';
import { PageTransition } from '@/components/PageTransition';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Clock, User, Share2, MessageCircle } from 'lucide-react';
import { trackConversion } from '@/lib/analytics';
import { AnimatedSection } from '@/hooks/use-scroll-animation';

// Blog posts data with full content
const blogPostsData: Record<string, {
  title: string;
  excerpt: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
  image: string;
  content: string;
  relatedSlugs: string[];
}> = {
  'local-business-leads-online': {
    title: 'How Local Businesses Can Get More Leads Online in 2024',
    excerpt: 'Discover proven strategies for Indian local businesses to generate quality leads through digital marketing.',
    category: 'Lead Generation',
    author: 'Sonu',
    date: '2024-01-15',
    readTime: '8 min read',
    image: '/favicon.png',
    content: `
# How Local Businesses Can Get More Leads Online in 2024

The digital landscape for local businesses in India has transformed dramatically. If you're a clinic owner, real estate agent, or restaurant owner, this guide will help you understand how to generate quality leads online.

## Why Digital Marketing Matters for Local Businesses

Gone are the days when a signboard and newspaper ads were enough. Today, 70% of customers search online before visiting a local business. Here's what you need:

### 1. Google My Business Optimization
Your Google My Business listing is often the first thing potential customers see. Make sure to:
- Add complete business information
- Upload high-quality photos
- Respond to reviews promptly
- Post updates regularly

### 2. Local SEO Strategy
Ranking for "near me" searches can bring consistent leads. Focus on:
- Location-specific keywords in your website
- Local citations and directory listings
- Customer reviews on Google

### 3. WhatsApp Marketing
In India, WhatsApp is the preferred communication channel. Set up:
- WhatsApp Business account
- Quick replies for common questions
- Automated greeting messages
- Broadcast lists for promotions

### 4. Social Media Presence
Instagram and Facebook work well for local businesses:
- Share behind-the-scenes content
- Post customer testimonials
- Run local awareness ads

## Getting Started

The best approach is to start with one channel and master it before moving to others. For most local businesses, we recommend starting with Google My Business + WhatsApp.

**Need help setting up your digital marketing?** Contact Swiftgrowthdigital for a free growth audit.
    `,
    relatedSlugs: ['google-ads-clinics-india', 'whatsapp-marketing-small-business', 'local-seo-near-me-search'],
  },
  'google-ads-clinics-india': {
    title: 'Google Ads for Clinics in India: Complete Guide',
    excerpt: 'Learn how dental clinics and medical practices can use Google Ads to attract more patients.',
    category: 'Healthcare Marketing',
    author: 'Sonu',
    date: '2024-01-10',
    readTime: '10 min read',
    image: '/favicon.png',
    content: `
# Google Ads for Clinics in India: Complete Guide

Running a successful clinic requires a steady stream of new patients. Google Ads can help you reach people actively searching for healthcare services in your area.

## Why Google Ads Work for Clinics

When someone searches "dentist near me" or "best skin clinic in Mumbai", they're ready to book. Google Ads puts you at the top of these searches.

## Setting Up Your First Campaign

### Step 1: Choose the Right Campaign Type
For clinics, we recommend:
- Search campaigns for direct appointments
- Local campaigns for Google Maps visibility

### Step 2: Keyword Research
Focus on:
- Treatment-specific keywords (teeth whitening, root canal)
- Location + service keywords (dentist in Andheri)
- Problem-based keywords (tooth pain treatment)

### Step 3: Budget Planning
Start with ₹500-1000 per day. Monitor for 2 weeks before making changes.

### Step 4: Create Compelling Ads
Your ads should include:
- Specific treatments offered
- Location information
- Call-to-action (Book Now, Call Today)
- Trust signals (years of experience, qualified doctors)

## Measuring Success

Track these metrics:
- Cost per lead (aim for ₹200-500 per inquiry)
- Conversion rate (clicks to appointments)
- Return on ad spend

## Common Mistakes to Avoid

1. Targeting too broad an area
2. Not using negative keywords
3. Ignoring mobile users
4. Not tracking conversions

**Want expert help?** Swiftgrowthdigital specializes in healthcare marketing. Get your free audit today.
    `,
    relatedSlugs: ['local-business-leads-online', 'local-seo-near-me-search'],
  },
  'real-estate-lead-generation': {
    title: 'Real Estate Lead Generation: Facebook vs Google Ads',
    excerpt: 'Which platform works better for real estate in India? We compare Meta Ads and Google Ads for property leads.',
    category: 'Real Estate',
    author: 'Sonu',
    date: '2024-01-05',
    readTime: '7 min read',
    image: '/favicon.png',
    content: `
# Real Estate Lead Generation: Facebook vs Google Ads

As a real estate professional, choosing the right advertising platform can make or break your marketing ROI. Let's compare Facebook and Google for property leads.

## Facebook Ads for Real Estate

### Pros:
- Visual platform perfect for property showcases
- Detailed targeting (income, interests, life events)
- Lower cost per impression
- Great for awareness and brand building

### Cons:
- Leads may not be actively searching
- Higher volume, lower intent
- Requires good creative content

## Google Ads for Real Estate

### Pros:
- High-intent leads (people searching for properties)
- Location-specific targeting
- Better conversion rates typically
- Works well for urgent buyers

### Cons:
- Higher cost per click
- More competitive
- Requires ongoing optimization

## Our Recommendation

Use both, but differently:
- **Google Ads**: For active buyers searching specific locations/projects
- **Facebook Ads**: For new project launches and brand awareness

## Budget Split

For most real estate clients, we recommend:
- 60% Google Ads (direct leads)
- 40% Facebook Ads (awareness + retargeting)

## Lead Nurturing is Key

Regardless of platform, have a system to follow up:
- WhatsApp automation for instant response
- CRM to track lead status
- Site visit scheduling system

**Need help?** Our real estate marketing packages start from ₹19,999/month.
    `,
    relatedSlugs: ['local-business-leads-online', 'whatsapp-marketing-small-business'],
  },
  'restaurant-cloud-kitchen-marketing': {
    title: 'Restaurant & Cloud Kitchen Marketing: Get More Orders',
    excerpt: 'Effective marketing strategies for restaurants and cloud kitchens to drive orders.',
    category: 'Restaurant Marketing',
    author: 'Sonu',
    date: '2024-01-01',
    readTime: '9 min read',
    image: '/favicon.png',
    content: `
# Restaurant & Cloud Kitchen Marketing: Get More Orders

The food industry is highly competitive. Here's how to stand out and get more direct orders.

## The Aggregator Problem

Zomato and Swiggy take 25-30% commission. While they bring orders, your profit margins suffer. The solution? Build your direct ordering channel.

## Marketing Strategies That Work

### 1. Instagram Marketing
Food is visual. Instagram is perfect for restaurants:
- Post daily food photos
- Share cooking reels
- Show kitchen behind-the-scenes
- Customer testimonials

### 2. WhatsApp Ordering System
Set up WhatsApp for orders:
- Create a digital menu
- Quick reply buttons for ordering
- Broadcast lists for daily specials
- Loyalty rewards tracking

### 3. Google My Business
For local discovery:
- Add menu with prices
- Post offers regularly
- Respond to all reviews
- Add photos of dishes

### 4. Targeted Ads
Run ads to your delivery radius:
- Instagram story ads with food videos
- Google Ads for "food delivery near me"
- Retargeting ads for website visitors

## Building Customer Loyalty

Direct customers are valuable. Keep them coming back:
- Birthday/anniversary discounts
- Loyalty points program
- Exclusive WhatsApp deals
- Feedback rewards

## Measuring Success

Track:
- Direct orders vs aggregator orders
- Customer acquisition cost
- Repeat order rate
- Average order value

**Ready to grow?** We've helped restaurants increase direct orders by 200%. Get your free consultation.
    `,
    relatedSlugs: ['local-business-leads-online', 'whatsapp-marketing-small-business'],
  },
  'whatsapp-marketing-small-business': {
    title: "WhatsApp Marketing for Small Businesses: A Beginner's Guide",
    excerpt: 'How to use WhatsApp Business API for lead generation and customer engagement.',
    category: 'WhatsApp Marketing',
    author: 'Sonu',
    date: '2023-12-28',
    readTime: '6 min read',
    image: '/favicon.png',
    content: `
# WhatsApp Marketing for Small Businesses: A Beginner's Guide

With over 500 million users in India, WhatsApp is the most powerful marketing channel for local businesses. Here's how to use it effectively.

## WhatsApp Business vs WhatsApp Business API

### WhatsApp Business (Free)
Good for:
- Small businesses
- Manual customer communication
- Basic automation (greeting, away messages)

### WhatsApp Business API
Better for:
- Growing businesses
- Automated follow-ups
- Bulk messaging (broadcasts)
- Integration with CRM

## Getting Started

### Step 1: Set Up Your Profile
- Business name and description
- Operating hours
- Address and website
- Catalog of products/services

### Step 2: Create Quick Replies
Save templates for:
- Greeting messages
- Pricing inquiries
- Location/directions
- Booking confirmations

### Step 3: Use Labels
Organize contacts:
- New leads
- Follow-up required
- Converted customers
- VIP clients

## Marketing Strategies

### Broadcast Lists
Send offers to interested customers:
- Weekly specials
- Festival greetings
- New service announcements

### Status Updates
Use WhatsApp Status like Instagram Stories:
- Behind-the-scenes content
- Customer testimonials
- Limited-time offers

### Click-to-WhatsApp Ads
Run Facebook/Instagram ads that open WhatsApp directly:
- Higher response rates
- Personal conversations
- Better lead quality

## Best Practices

1. Always get permission before messaging
2. Don't spam - quality over quantity
3. Respond quickly (within 5 minutes ideally)
4. Use media - photos, videos, voice notes
5. Keep messages personal

**Need automation?** We set up WhatsApp marketing systems for businesses. Contact us on WhatsApp!
    `,
    relatedSlugs: ['local-business-leads-online', 'restaurant-cloud-kitchen-marketing'],
  },
  'local-seo-near-me-search': {
    title: "Local SEO: How to Rank for 'Near Me' Searches",
    excerpt: "Master local SEO and appear in 'near me' searches. Google My Business optimization tips.",
    category: 'SEO',
    author: 'Sonu',
    date: '2023-12-20',
    readTime: '8 min read',
    image: '/favicon.png',
    content: `
# Local SEO: How to Rank for 'Near Me' Searches

"Dentist near me", "restaurant near me", "gym near me" - these searches have exploded. Here's how to rank for them.

## Understanding Local SEO

Local SEO is different from regular SEO. It focuses on:
- Google Maps ranking
- Local Pack (3-pack results)
- Location-specific searches

## Key Ranking Factors

### 1. Google My Business (40% of ranking)
Your GMB listing is crucial:
- Complete all information
- Choose correct categories
- Add photos weekly
- Get and respond to reviews
- Post updates regularly

### 2. Reviews (25% of ranking)
Reviews signal trust:
- Ask happy customers for reviews
- Respond to ALL reviews (good and bad)
- Aim for 50+ reviews
- Recent reviews matter more

### 3. On-Page SEO (15% of ranking)
Optimize your website:
- Location in title tags
- City name in content
- Local schema markup
- NAP consistency (Name, Address, Phone)

### 4. Citations (10% of ranking)
Get listed on:
- Justdial
- Sulekha
- IndiaMART
- Industry directories

### 5. Website Factors (10% of ranking)
Technical basics:
- Mobile-friendly
- Fast loading
- Secure (HTTPS)
- Local content

## Quick Wins

1. Claim and verify your GMB listing
2. Add 10+ high-quality photos
3. Ask 5 customers for reviews this week
4. Create a location page on your website
5. Get listed on 3-5 local directories

## Measuring Progress

Track:
- GMB insights (views, clicks, calls)
- Keyword rankings for local terms
- Organic traffic from your city
- Phone calls and directions requests

**Want to rank higher?** Our local SEO packages start from ₹8,999/month. Get your free audit!
    `,
    relatedSlugs: ['google-ads-clinics-india', 'local-business-leads-online'],
  },
};

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? blogPostsData[slug] : null;

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const title = post?.title || '';
    
    const shareUrls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
    };

    window.open(shareUrls[platform], '_blank');
  };

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <PageTransition>
          <main className="pt-20">
            <div className="container mx-auto px-4 py-24 text-center">
              <h1 className="text-4xl font-display font-bold mb-4">Article Not Found</h1>
              <p className="text-muted-foreground mb-8">
                Sorry, we couldn't find the article you're looking for.
              </p>
              <Link to="/blog">
                <Button>
                  <ArrowLeft className="w-4 h-4" />
                  Back to Blog
                </Button>
              </Link>
            </div>
          </main>
        </PageTransition>
        <Footer />
      </div>
    );
  }

  const relatedPosts = post.relatedSlugs
    .map((s) => ({ slug: s, ...blogPostsData[s] }))
    .filter((p) => p.title);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        <main className="pt-20">
        {/* Hero */}
        <section className="py-12 md:py-16 border-b border-border">
          <div className="container mx-auto px-4">
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Blog
            </Link>

            <AnimatedSection className="max-w-3xl">
              <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full mb-4">
                {post.category}
              </span>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-6">
                {post.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>{post.author}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(post.date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{post.readTime}</span>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* Content */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-3 gap-12">
              {/* Article */}
              <AnimatedSection className="lg:col-span-2" delay={100}>
                <article>
                <div className="aspect-video rounded-2xl bg-secondary mb-8 overflow-hidden">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="prose prose-invert prose-lg max-w-none">
                  {post.content.split('\n').map((paragraph, i) => {
                    if (paragraph.startsWith('# ')) {
                      return null; // Skip H1, already shown above
                    }
                    if (paragraph.startsWith('## ')) {
                      return (
                        <h2 key={i} className="text-2xl font-display font-bold text-foreground mt-8 mb-4">
                          {paragraph.replace('## ', '')}
                        </h2>
                      );
                    }
                    if (paragraph.startsWith('### ')) {
                      return (
                        <h3 key={i} className="text-xl font-display font-semibold text-foreground mt-6 mb-3">
                          {paragraph.replace('### ', '')}
                        </h3>
                      );
                    }
                    if (paragraph.startsWith('- ')) {
                      return (
                        <li key={i} className="text-muted-foreground ml-4">
                          {paragraph.replace('- ', '')}
                        </li>
                      );
                    }
                    if (paragraph.trim().startsWith('**') && paragraph.trim().endsWith('**')) {
                      return (
                        <p key={i} className="font-semibold text-foreground">
                          {paragraph.replace(/\*\*/g, '')}
                        </p>
                      );
                    }
                    if (paragraph.trim()) {
                      return (
                        <p key={i} className="text-muted-foreground leading-relaxed mb-4">
                          {paragraph}
                        </p>
                      );
                    }
                    return null;
                  })}
                </div>

                {/* Share */}
                <div className="mt-12 pt-8 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-4">Share this article:</p>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShare('whatsapp')}
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShare('facebook')}
                    >
                      Facebook
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShare('linkedin')}
                    >
                      LinkedIn
                    </Button>
                  </div>
                </div>
                </article>
              </AnimatedSection>

              {/* Sidebar */}
              <AnimatedSection delay={200} direction="right">
                <aside className="space-y-8">
                {/* CTA */}
                <div className="bg-gradient-card rounded-2xl border border-primary/30 p-6">
                  <h3 className="text-lg font-display font-bold mb-3">
                    Need Help Growing Your Business?
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Get a FREE growth audit and customized marketing plan.
                  </p>
                  <a
                    href="https://wa.me/919229721835?text=Hi%2C%20I%20read%20your%20blog%20and%20want%20to%20discuss%20my%20business"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="whatsapp" className="w-full">
                      <MessageCircle className="w-4 h-4" />
                      Chat on WhatsApp
                    </Button>
                  </a>
                </div>

                {/* Related Posts */}
                {relatedPosts.length > 0 && (
                  <div>
                    <h3 className="text-lg font-display font-bold mb-4">Related Articles</h3>
                    <div className="space-y-4">
                      {relatedPosts.map((related) => (
                        <Link
                          key={related.slug}
                          to={`/blog/${related.slug}`}
                          className="block p-4 bg-card rounded-xl border border-border hover:border-primary/50 transition-colors"
                        >
                          <span className="text-xs text-primary font-medium">{related.category}</span>
                          <h4 className="font-display font-semibold text-foreground mt-1 line-clamp-2">
                            {related.title}
                          </h4>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                </aside>
              </AnimatedSection>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-card border-t border-border">
          <div className="container mx-auto px-4">
            <AnimatedSection className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl font-display font-bold mb-4">
                Ready to Implement These Strategies?
              </h2>
              <p className="text-muted-foreground mb-6">
                Let Swiftgrowthdigital handle your digital marketing while you focus on running your business.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="https://wa.me/919229721835?text=Hi%2C%20I%20want%20a%20free%20growth%20audit"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="whatsapp" size="lg">
                    <MessageCircle className="w-5 h-5" />
                    Get Free Audit
                  </Button>
                </a>
                <Link to="/case-studies">
                  <Button variant="outline" size="lg">
                    View Case Studies
                  </Button>
                </Link>
              </div>
            </AnimatedSection>
          </div>
        </section>
      </main>
      </PageTransition>
      <Footer />
      <UnifiedChatWidget />
    </div>
  );
};

export default BlogPost;
