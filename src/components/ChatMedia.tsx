import React, { useState } from "react";
import { Download, X, AlertCircle, Loader2, ChevronLeft, FileText } from "lucide-react";

/**
 * Controlled media container component for WhatsApp chat
 * Ensures media (image/video/document) maintains fixed dimensions
 * and never causes layout distortion
 */

interface ChatMediaImageProps {
  src: string;
  alt: string;
  caption?: string | null;
  timestamp: string;
  downloadUrl: string;
  isOutbound: boolean;
  statusIcon?: React.ReactNode;
}

export function ChatMediaImage({
  src,
  alt,
  caption,
  timestamp,
  downloadUrl,
  isOutbound,
  statusIcon,
}: ChatMediaImageProps) {
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);
  const [showLightbox, setShowLightbox] = useState(false);

  const handleImageLoad = () => setImgLoading(false);
  const handleImageError = () => setImgError(true);

  if (imgError) {
    return (
      <div className="w-80 h-80 max-w-full rounded-lg bg-muted flex items-center justify-center p-4 overflow-hidden border border-border">
        <div className="text-center text-muted-foreground">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">Unable to load image</p>
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
          >
            <Download className="w-3 h-3" /> Download
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative w-80 h-80 max-w-full rounded-lg overflow-hidden bg-muted flex-shrink-0 group border border-border">
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover cursor-zoom-in display-block"
          loading="lazy"
          onLoad={handleImageLoad}
          onError={handleImageError}
          onClick={() => setShowLightbox(true)}
          style={{ opacity: imgLoading ? 0.5 : 1, transition: "opacity 0.2s" }}
        />
        {imgLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {/* Timestamp overlay - bottom right */}
        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-white text-[10px] flex items-center gap-1 pointer-events-none">
          <span>{new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          {isOutbound && statusIcon}
        </div>
        {/* Caption overlay - bottom left */}
        {caption && (
          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-white text-xs max-w-xs truncate pointer-events-none">
            {caption}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {showLightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onClick={() => setShowLightbox(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
        >
          <button
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white"
            onClick={() => setShowLightbox(false)}
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img
              src={src}
              alt={alt}
              className="max-w-[90vw] max-h-[90vh] object-contain display-block"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <button
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white"
            onClick={(e) => {
              e.stopPropagation();
              window.open(downloadUrl, "_blank");
            }}
            aria-label="Download"
          >
            <Download className="w-6 h-6" />
          </button>
          <div className="absolute bottom-4 left-4 right-4 text-white text-sm text-center">
            <p>{new Date(timestamp).toLocaleTimeString()}</p>
            {caption && <p className="text-white/70 mt-1">{caption}</p>}
          </div>
        </div>
      )}
    </>
  );
}

interface ChatMediaVideoProps {
  src: string;
  caption?: string | null;
  downloadUrl: string;
  timestamp: string;
  isOutbound: boolean;
  statusIcon?: React.ReactNode;
}

export function ChatMediaVideo({
  src,
  caption,
  downloadUrl,
  timestamp,
  isOutbound,
  statusIcon,
}: ChatMediaVideoProps) {
  return (
    <div className="space-y-2">
      <div className="relative w-80 h-80 max-w-full rounded-lg overflow-hidden bg-muted flex-shrink-0 group border border-border">
        <video
          src={src}
          controls
          className="w-full h-full object-cover display-block"
        />
        {/* Timestamp overlay - bottom right */}
        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-white text-[10px] flex items-center gap-1 pointer-events-none">
          <span>{new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          {isOutbound && statusIcon}
        </div>
        {/* Caption overlay - bottom left */}
        {caption && (
          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-white text-xs max-w-xs truncate pointer-events-none">
            {caption}
          </div>
        )}
      </div>
      <a
        href={downloadUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <Download className="w-3 h-3" /> Download
      </a>
    </div>
  );
}

interface ChatMediaDocumentProps {
  src: string;
  filename?: string | null;
  mimeType?: string | null;
  caption?: string | null;
  downloadUrl: string;
  sha256?: string | null;
}

export function ChatMediaDocument({
  src,
  filename,
  mimeType,
  caption,
  downloadUrl,
  sha256,
}: ChatMediaDocumentProps) {
  const isPdf = mimeType === "application/pdf";

  return (
    <div className="space-y-2">
      <div className="w-80 h-80 max-w-full rounded-lg overflow-hidden bg-card border border-border flex flex-col">
        {isPdf ? (
          <iframe
            src={src}
            className="w-full h-full flex-1"
            title={filename ?? "PDF Document"}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
            <FileText className="w-16 h-16 text-muted-foreground mb-3" />
            <p className="text-sm font-medium truncate max-w-xs">{filename ?? "Document"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {mimeType?.split("/")?.[1]?.toUpperCase() ?? "File"}
            </p>
            {sha256 && (
              <p className="text-xs text-muted-foreground mt-1">{sha256.slice(0, 16)}…</p>
            )}
          </div>
        )}
      </div>
      {caption && <p className="text-xs text-muted-foreground max-w-xs">{caption}</p>}
      <a
        href={downloadUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <Download className="w-3 h-3" /> Download
      </a>
    </div>
  );
}

interface ChatMediaAudioProps {
  src: string;
  downloadUrl: string;
}

export function ChatMediaAudio({ src, downloadUrl }: ChatMediaAudioProps) {
  return (
    <div className="space-y-2">
      <audio src={src} controls className="w-80 max-w-full display-block" />
      <a
        href={downloadUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <Download className="w-3 h-3" /> Download
      </a>
    </div>
  );
}

interface ChatMediaStickerProps {
  src: string;
  downloadUrl: string;
}

export function ChatMediaSticker({ src, downloadUrl }: ChatMediaStickerProps) {
  return (
    <div className="space-y-2">
      <img src={src} alt="Sticker" className="w-40 h-40 max-w-full display-block" />
      <a
        href={downloadUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <Download className="w-3 h-3" /> Download
      </a>
    </div>
  );
}
