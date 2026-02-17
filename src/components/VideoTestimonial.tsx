import { useState } from 'react';
import { Play, X } from 'lucide-react';
import { trackConversion } from '@/lib/analytics';
import { cn } from '@/lib/utils';

interface VideoTestimonialProps {
  videoId?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  title: string;
  clientName: string;
  business: string;
  className?: string;
}

export function VideoTestimonial({
  videoId,
  videoUrl,
  thumbnailUrl,
  title,
  clientName,
  business,
  className,
}: VideoTestimonialProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = () => {
    setIsPlaying(true);
    trackConversion.videoTestimonialPlayed(clientName);
  };

  const handleClose = () => {
    setIsPlaying(false);
  };

  // Generate YouTube embed URL
  const getEmbedUrl = () => {
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    }
    if (videoUrl?.includes('youtube.com') || videoUrl?.includes('youtu.be')) {
      const id = videoUrl.includes('youtu.be')
        ? videoUrl.split('/').pop()
        : new URL(videoUrl).searchParams.get('v');
      return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
    }
    return videoUrl;
  };

  const getThumbnail = () => {
    if (thumbnailUrl) return thumbnailUrl;
    if (videoId) return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    return '/favicon.ico';
  };

  return (
    <>
      {/* Video Card */}
      <div
        className={cn(
          'group relative bg-card rounded-2xl border border-border overflow-hidden cursor-pointer hover:border-primary/50 transition-all duration-300',
          className
        )}
        onClick={handlePlay}
      >
        {/* Thumbnail */}
        <div className="aspect-video relative">
          <img
            src={getThumbnail()}
            alt={title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-background/30 group-hover:bg-background/20 transition-colors" />
          
          {/* Play Button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Play className="w-7 h-7 text-primary-foreground ml-1" fill="currentColor" />
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <h4 className="font-display font-semibold text-foreground mb-1">{title}</h4>
          <p className="text-sm text-muted-foreground">
            {clientName} • {business}
          </p>
        </div>
      </div>

      {/* Video Modal */}
      {isPlaying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
            {videoUrl && !videoId ? (
              <video
                src={videoUrl}
                controls
                autoPlay
                className="w-full h-full"
              />
            ) : (
              <iframe
                src={getEmbedUrl()}
                title={title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-background/80 text-foreground flex items-center justify-center hover:bg-background transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

