import { ArrowRight, Globe, BookOpen, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { AnimatedSection } from "@/hooks/use-scroll-animation";

const ventures = [
  {
    id: "sangtx",
    name: "SangTX",
    status: "LIVE PRODUCT",
    category: "News & Media Platform",
    description: "A digital news platform focused on delivering local and regional news through a modern mobile-first experience.",
    icon: Globe,
  },
  {
    id: "libriofy",
    name: "Libriofy",
    status: "LIVE PRODUCT",
    category: "Library Management Platform",
    description: "A digital platform designed to simplify library management and help libraries manage their operations through modern software.",
    icon: BookOpen,
  },
];

function VenturePreviewCard({ venture }: { venture: typeof ventures[0] }) {
  return (
    <AnimatedSection>
      <Card className="h-full bg-card border border-border card-glow hover-lift">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <venture.icon className="w-6 h-6 text-primary" />
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 whitespace-nowrap">
              {venture.status}
            </span>
          </div>
          <CardTitle className="text-xl font-display font-bold text-foreground">{venture.name}</CardTitle>
          <CardDescription className="text-muted-foreground">{venture.category}</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-muted-foreground leading-relaxed mb-6">{venture.description}</p>
          <Link to="/ventures">
            <Button variant="outline" size="sm" className="w-full">
              View Venture
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </AnimatedSection>
  );
}

export function VenturesPreview() {
  return (
    <section className="py-20 md:py-28 bg-background relative">
      <div className="container mx-auto px-4">
        {/* Header */}
        <AnimatedSection className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Zap className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-sm font-medium text-foreground">OUR VENTURES</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-6 text-foreground">
            More Than <span className="bg-gradient-orange bg-clip-text text-transparent">an Agency</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            We don&apos;t just build digital solutions for clients.
            <br />
            We build our own products too.
          </p>
        </AnimatedSection>

        {/* Ventures Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
          {ventures.map((venture, index) => (
            <VenturePreviewCard key={venture.id} venture={venture} />
          ))}
        </div>

        {/* CTA */}
        <AnimatedSection className="text-center mt-12" delay={500}>
          <Link to="/ventures">
            <Button variant="outline" size="lg">
              View All Ventures
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </AnimatedSection>
      </div>
    </section>
  );
}