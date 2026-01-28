import { useState, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackConversion } from '@/lib/analytics';

interface WhatsAppWidgetProps {
  phoneNumber?: string;
  welcomeMessage?: string;
  position?: 'left' | 'right';
}

export function WhatsAppWidget({
  phoneNumber = '919229721835',
  welcomeMessage = "Hi! 👋 Welcome to Swiftgrowthdigital. How can we help grow your business today?",
  position = 'right',
}: WhatsAppWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [hasInteracted, setHasInteracted] = useState(false);

  // Auto-open after 30 seconds for new visitors
  useEffect(() => {
    const hasSeenWidget = sessionStorage.getItem('whatsapp_widget_seen');
    if (!hasSeenWidget) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        sessionStorage.setItem('whatsapp_widget_seen', 'true');
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSend = () => {
    if (message.trim()) {
      trackConversion.whatsappChatStart('widget');
      const encodedMessage = encodeURIComponent(message);
      window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, '_blank');
      setMessage('');
      setIsOpen(false);
    }
  };

  const handleQuickMessage = (text: string) => {
    trackConversion.whatsappChatStart('widget_quick');
    const encodedMessage = encodeURIComponent(text);
    window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, '_blank');
    setIsOpen(false);
  };

  const quickReplies = [
    "I want to grow my business",
    "Tell me about pricing",
    "I need a free audit",
    "How do you generate leads?",
  ];

  return (
    <>
      {/* Widget Container */}
      <div
        className={`fixed bottom-24 ${position === 'right' ? 'right-4' : 'left-4'} z-40 transition-all duration-300 ${
          isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <div className="w-[360px] max-w-[calc(100vw-2rem)] bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
          {/* Header */}
          <div className="bg-whatsapp p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-white">Swiftgrowthdigital</p>
                <p className="text-xs text-white/80">Usually replies within minutes</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat Area */}
          <div className="p-4 bg-[#e5ddd5] min-h-[200px]">
            {/* Welcome Message */}
            <div className="bg-white rounded-lg p-3 shadow-sm max-w-[85%] mb-4">
              <p className="text-sm text-gray-800">{welcomeMessage}</p>
              <p className="text-[10px] text-gray-500 mt-1 text-right">
                {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            {/* Quick Replies */}
            <div className="space-y-2">
              <p className="text-xs text-gray-600 text-center mb-2">Quick Questions:</p>
              {quickReplies.map((reply, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickMessage(reply)}
                  className="block w-full text-left bg-white rounded-lg p-3 shadow-sm text-sm text-gray-800 hover:bg-gray-50 transition-colors"
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>

          {/* Input Area */}
          <div className="p-4 bg-card border-t border-border">
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 rounded-full bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              />
              <button
                onClick={handleSend}
                disabled={!message.trim()}
                className="w-10 h-10 rounded-full bg-whatsapp text-white flex items-center justify-center hover:bg-whatsapp/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Powered by WhatsApp Business
            </p>
          </div>
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!hasInteracted) {
            trackConversion.whatsappChatStart('widget_open');
            setHasInteracted(true);
          }
        }}
        className={`fixed bottom-24 ${position === 'right' ? 'right-4' : 'left-4'} z-40 w-14 h-14 rounded-full bg-whatsapp text-white shadow-lg flex items-center justify-center hover:scale-110 transition-all duration-300`}
        aria-label="Open WhatsApp chat"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
      </button>
    </>
  );
}
