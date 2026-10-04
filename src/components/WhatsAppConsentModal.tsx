import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, MessageCircle, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { WHATSAPP_CONTACT_URL } from "@/lib/whatsapp";
import { trackConversion } from "@/lib/analytics";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WhatsAppConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConsentGiven: () => void;
  source: string;
  ctaText?: string;
  whatsappUrl?: string;
  message?: string;
}

const CONSENT_TEXT = "I agree to receive marketing updates from SwiftGrowthDigital on WhatsApp. This is optional; I can ask to stop messages at any time.";

export function WhatsAppConsentModal({
  isOpen,
  onClose,
  onConsentGiven,
  source,
  ctaText = "Continue to WhatsApp",
  whatsappUrl = WHATSAPP_CONTACT_URL,
  message,
}: WhatsAppConsentModalProps) {
  const [consentChecked, setConsentChecked] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setConsentChecked(false);
      setError(null);
      document.body.style.overflow = "hidden";
      setTimeout(() => firstInputRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableElements || focusableElements.length === 0) return;
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleContinue = async () => {
    if (!consentChecked) {
      setError("Please confirm your WhatsApp marketing consent to continue.");
      return;
    }

    setIsRecording(true);
    setError(null);

    try {
      if (!supabase) throw new Error("Supabase not configured");

      const { error } = await supabase.functions.invoke("record-whatsapp-consent", {
        body: {
          source,
          whatsapp_opt_in: true,
        },
      });

      if (error) throw new Error(error.message || "Failed to record consent");

      trackConversion.whatsappConsentGiven(source);
      onConsentGiven();

      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      onClose();
    } catch (err) {
      console.error("WhatsApp consent recording failed:", err);
      setError(err instanceof Error ? err.message : "Failed to record consent. Please try again.");
    } finally {
      setIsRecording(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-modal-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 id="consent-modal-title" className="text-lg font-display font-semibold text-foreground">
            Stay connected on WhatsApp
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Before we connect you, we need your permission to send marketing updates.
          </p>

          <label className="flex items-start gap-3 rounded-lg border border-border bg-background/40 p-3 text-sm cursor-pointer">
            <Checkbox
              ref={firstInputRef}
              id="whatsapp-consent-checkbox"
              checked={consentChecked}
              onCheckedChange={(checked) => {
                setConsentChecked(checked === true);
                if (checked) setError(null);
              }}
              disabled={isRecording}
              className="mt-0.5 flex-shrink-0"
            />
            <span className="text-muted-foreground break-words">{CONSENT_TEXT}</span>
          </label>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              variant="outline"
              className="w-full sm:flex-1"
              onClick={onClose}
              disabled={isRecording}
            >
              Cancel
            </Button>
            <Button
              variant="whatsapp"
              className="w-full sm:flex-1"
              onClick={handleContinue}
              disabled={isRecording || !consentChecked}
            >
              {isRecording ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <MessageCircle className="w-4 h-4" />
                  {ctaText}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

import { useState } from "react";
import { AlertCircle } from "lucide-react";