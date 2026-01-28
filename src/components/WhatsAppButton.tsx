import { MessageCircle } from "lucide-react";

export function WhatsAppButton() {
  const whatsappLink = "https://wa.me/919229721835?text=Hi%2C%20I%20want%20to%20grow%20my%20business";

  return (
    <a
      href={whatsappLink}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 md:w-16 md:h-16 bg-whatsapp rounded-full shadow-lg animate-pulse-glow hover:scale-110 transition-transform duration-300"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="w-7 h-7 md:w-8 md:h-8 text-whatsapp-foreground" />
    </a>
  );
}
