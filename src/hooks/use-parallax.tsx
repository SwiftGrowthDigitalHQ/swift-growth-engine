import { useState, useEffect, useCallback } from "react";

export function useParallax(speed: number = 0.5) {
  const [offset, setOffset] = useState(0);

  const handleScroll = useCallback(() => {
    setOffset(window.scrollY * speed);
  }, [speed]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return offset;
}

interface ParallaxLayerProps {
  speed?: number;
  children: React.ReactNode;
  className?: string;
}

export function ParallaxLayer({ speed = 0.5, children, className = "" }: ParallaxLayerProps) {
  const offset = useParallax(speed);

  return (
    <div
      className={className}
      style={{ transform: `translateY(${offset}px)` }}
    >
      {children}
    </div>
  );
}
