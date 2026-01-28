import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";

export function RouteProgressBar() {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    // Only trigger on actual route changes
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      
      // Start loading animation
      setIsLoading(true);
      setProgress(0);

      // Animate progress
      const timer1 = setTimeout(() => setProgress(30), 50);
      const timer2 = setTimeout(() => setProgress(60), 150);
      const timer3 = setTimeout(() => setProgress(80), 300);
      const timer4 = setTimeout(() => setProgress(100), 400);
      const timer5 = setTimeout(() => {
        setIsLoading(false);
        setProgress(0);
      }, 500);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
        clearTimeout(timer5);
      };
    }
  }, [location.pathname]);

  if (!isLoading && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-transparent">
      <div
        className="h-full bg-gradient-to-r from-primary via-primary to-whatsapp transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          boxShadow: progress > 0 ? '0 0 10px hsl(25 95% 53% / 0.8), 0 0 20px hsl(25 95% 53% / 0.4)' : 'none',
        }}
      />
      {/* Animated glow dot at the end */}
      {progress > 0 && progress < 100 && (
        <div
          className="absolute top-0 h-1 w-20 bg-gradient-to-r from-transparent to-white/50 animate-pulse"
          style={{
            left: `calc(${progress}% - 80px)`,
            transition: 'left 0.2s ease-out',
          }}
        />
      )}
    </div>
  );
}
