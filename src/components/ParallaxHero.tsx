import { ReactNode } from "react";
import { useParallax } from "@/hooks/use-parallax";

interface ParallaxHeroProps {
  children: ReactNode;
  className?: string;
}

export function ParallaxHero({ children, className = "" }: ParallaxHeroProps) {
  const parallaxSlow = useParallax(0.15);
  const parallaxMedium = useParallax(0.25);

  return (
    <section className={`relative overflow-hidden ${className}`}>
      {/* Background Glow with parallax */}
      <div className="absolute inset-0 bg-hero-glow" />
      <div 
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"
        style={{ transform: `translateY(${parallaxSlow}px)` }}
      />
      <div 
        className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl"
        style={{ transform: `translateY(${parallaxMedium}px)` }}
      />
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-[100px]"
        style={{ transform: `translate(-50%, calc(-50% + ${parallaxSlow * 0.5}px))` }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </section>
  );
}
