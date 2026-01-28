import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Testimonial {
  name: string;
  business: string;
  location: string;
  rating: number;
  result: string;
  review: string;
  avatar: string;
  category: string;
  image?: string;
}

interface TestimonialCarouselProps {
  testimonials: Testimonial[];
  autoPlay?: boolean;
  interval?: number;
  className?: string;
}

export function TestimonialCarousel({
  testimonials,
  autoPlay = true,
  interval = 5000,
  className,
}: TestimonialCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!autoPlay) return;

    const timer = setInterval(() => {
      handleNext();
    }, interval);

    return () => clearInterval(timer);
  }, [currentIndex, autoPlay, interval]);

  const handlePrev = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
    setTimeout(() => setIsAnimating(false), 500);
  };

  const handleNext = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
    setTimeout(() => setIsAnimating(false), 500);
  };

  const currentTestimonial = testimonials[currentIndex];

  return (
    <div className={cn('relative', className)}>
      {/* Main Card */}
      <div className="relative overflow-hidden">
        <div
          className="bg-gradient-card rounded-3xl border border-border p-8 md:p-12 transition-all duration-500"
          key={currentIndex}
        >
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Content */}
            <div className="space-y-6">
              <Quote className="w-12 h-12 text-primary/30" />
              
              <p className="text-lg md:text-xl text-foreground leading-relaxed">
                "{currentTestimonial.review}"
              </p>

              {/* Result Badge */}
              <div className="inline-block px-4 py-2 bg-primary/10 text-primary font-semibold rounded-full">
                ✓ {currentTestimonial.result}
              </div>

              {/* Rating */}
              <div className="flex gap-1">
                {[...Array(currentTestimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-primary fill-primary" />
                ))}
              </div>

              {/* Author */}
              <div className="flex items-center gap-4 pt-4 border-t border-border">
                <div className="w-14 h-14 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                  {currentTestimonial.avatar}
                </div>
                <div>
                  <p className="font-display font-bold text-foreground text-lg">
                    {currentTestimonial.name}
                  </p>
                  <p className="text-muted-foreground">
                    {currentTestimonial.business}, {currentTestimonial.location}
                  </p>
                </div>
              </div>
            </div>

            {/* Image Placeholder */}
            <div className="hidden md:block">
              <div className="aspect-square rounded-2xl bg-secondary/50 flex items-center justify-center">
                {currentTestimonial.image ? (
                  <img
                    src={currentTestimonial.image}
                    alt={currentTestimonial.name}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <div className="text-center p-8">
                    <div className="w-24 h-24 rounded-full bg-gradient-primary mx-auto mb-4 flex items-center justify-center text-primary-foreground font-bold text-3xl">
                      {currentTestimonial.avatar}
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {currentTestimonial.category}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        {/* Dots */}
        <div className="flex gap-2">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-300',
                index === currentIndex
                  ? 'w-8 bg-primary'
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              )}
            />
          ))}
        </div>

        {/* Arrows */}
        <div className="flex gap-2">
          <button
            onClick={handlePrev}
            className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center hover:bg-secondary/80 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <button
            onClick={handleNext}
            className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center hover:bg-secondary/80 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
