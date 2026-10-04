import { useState } from "react";
import { MessageCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppConsentModal } from "@/components/WhatsAppConsentModal";
import { WHATSAPP_CONTACT_URL } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

interface WhatsAppCTAProps {
  children?: React.ReactNode;
  className?: string;
  variant?: "whatsapp" | "hero" | "outline";
  size?: "sm" | "md" | "lg" | "xl";
  source: string;
  whatsappUrl?: string;
  onClick?: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export function WhatsAppCTA({
  children = "WhatsApp Now",
  className = "",
  variant = "whatsapp",
  size = "md",
  source,
  whatsappUrl = WHATSAPP_CONTACT_URL,
  onClick,
  disabled = false,
  icon,
  iconRight,
}: WhatsAppCTAProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => {
    if (disabled) return;
    if (onClick) onClick();
    setIsModalOpen(true);
  };

  const handleConsentGiven = () => {
    setIsModalOpen(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={cn(className, "max-w-full")}
        onClick={handleOpenModal}
        disabled={disabled}
      >
        {icon && <span className="mr-2 flex-shrink-0">{icon}</span>}
        {children}
        {iconRight && <span className="ml-2 flex-shrink-0">{iconRight}</span>}
      </Button>

      <WhatsAppConsentModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onConsentGiven={handleConsentGiven}
        source={source}
        whatsappUrl={whatsappUrl}
      />
    </>
  );
}