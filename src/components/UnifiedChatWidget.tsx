import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Bot, User, Loader2, Sparkles, ArrowRight, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { trackConversion } from "@/lib/analytics";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type QuickOption = {
  label: string;
  value: string;
  icon: string;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/swiftbot-chat`;

// Initial quick options (promotional entry)
const initialQuickOptions: QuickOption[] = [
  { icon: "📈", label: "I want more leads", value: "I want to get more leads for my business" },
  { icon: "💰", label: "Tell me about pricing", value: "Tell me about your pricing and packages" },
  { icon: "📊", label: "Show case studies & results", value: "Show me your case studies and results" },
  { icon: "🎁", label: "I want a free growth audit", value: "I want a free growth audit for my business" },
];

// Business type options for qualification
const businessTypeOptions: QuickOption[] = [
  { icon: "🏥", label: "Clinic / Hospital", value: "I run a Clinic or Hospital" },
  { icon: "🏠", label: "Real Estate", value: "I'm in the Real Estate business" },
  { icon: "🍽️", label: "Restaurant / Cloud Kitchen", value: "I have a Restaurant or Cloud Kitchen" },
  { icon: "🏪", label: "Other Local Business", value: "I have another type of local business" },
];

// Goal options for qualification
const goalOptions: QuickOption[] = [
  { icon: "📞", label: "More calls & WhatsApp leads", value: "I want more calls and WhatsApp leads" },
  { icon: "🌐", label: "Website & branding", value: "I need help with website and branding" },
  { icon: "📣", label: "Google / Instagram ads", value: "I want to run Google or Instagram ads" },
];

type QualificationStep = "initial" | "business" | "goal" | "qualified" | null;

export function UnifiedChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasShownAutoOpen, setHasShownAutoOpen] = useState(false);
  const [qualificationStep, setQualificationStep] = useState<QualificationStep>("initial");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi 👋 Welcome to Swiftgrowthdigital.\n\nHow can we help grow your business today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showWhatsAppCTA, setShowWhatsAppCTA] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-open after 30 seconds (only once)
  useEffect(() => {
    if (hasShownAutoOpen) return;
    const timer = setTimeout(() => {
      if (!isOpen) {
        setIsOpen(true);
        setHasShownAutoOpen(true);
        trackConversion.whatsappChatStart("auto_open");
      }
    }, 30000);
    return () => clearTimeout(timer);
  }, [isOpen, hasShownAutoOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    trackConversion.whatsappChatStart("manual_open");
  };

  const streamChat = useCallback(async (userMessages: Message[]) => {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: userMessages }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        throw new Error("Too many requests. Please try again in a moment.");
      }
      if (resp.status === 402) {
        throw new Error("Service temporarily unavailable. Please try again later.");
      }
      throw new Error("Failed to get response");
    }

    if (!resp.body) throw new Error("No response body");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantContent = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantContent += content;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant" && prev.length > 1) {
                return prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, content: assistantContent } : m
                );
              }
              return [...prev, { role: "assistant", content: assistantContent }];
            });
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    return assistantContent;
  }, []);

  const handleQuickOption = async (option: QuickOption) => {
    const userMessage: Message = { role: "user", content: option.value };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    if (qualificationStep === "initial") {
      // Move to business type question
      setQualificationStep("business");
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Great! To help you better, what type of business do you have?",
          },
        ]);
      }, 400);
    } else if (qualificationStep === "business") {
      // Move to goal question
      setQualificationStep("goal");
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Perfect! What's your main goal right now?",
          },
        ]);
      }, 400);
    } else if (qualificationStep === "goal") {
      // User is now qualified - show growth system message and WhatsApp CTA
      setQualificationStep("qualified");
      setShowWhatsAppCTA(true);
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "We build **complete growth systems** for businesses like yours:\n\n✅ Website + Ads + SEO + WhatsApp\n\nOur clients typically see **3-5x more leads** within 60 days.\n\nWould you like a **free growth plan** customized for your business?",
          },
        ]);
      }, 400);
    } else {
      // Already qualified - use AI for responses
      setQualificationStep(null);
      setIsLoading(true);
      try {
        await streamChat(newMessages);
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: error instanceof Error ? error.message : "Sorry, something went wrong. Please try again!",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setQualificationStep(null);
    const userMessage: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      await streamChat(newMessages);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: error instanceof Error ? error.message : "Sorry, something went wrong. Please try again!",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const whatsappLink = "https://wa.me/919229721835?text=Hi%2C%20I%20want%20a%20free%20growth%20plan%20for%20my%20business";

  const getCurrentQuickOptions = (): QuickOption[] => {
    switch (qualificationStep) {
      case "initial":
        return initialQuickOptions;
      case "business":
        return businessTypeOptions;
      case "goal":
        return goalOptions;
      default:
        return [];
    }
  };

  const quickOptions = getCurrentQuickOptions();

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={handleOpen}
        className={`fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 md:w-16 md:h-16 bg-primary rounded-full shadow-xl hover:scale-110 transition-all duration-300 group ${
          isOpen ? "hidden" : ""
        }`}
        aria-label="Chat with SwiftBot"
      >
        <Sparkles className="w-7 h-7 md:w-8 md:h-8 text-primary-foreground" />
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping" style={{ animationDuration: "2s" }} />
        {/* Tooltip */}
        <span className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-card border border-border rounded-lg text-xs font-medium text-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
          Chat with SwiftBot
        </span>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[calc(100vw-48px)] max-w-[400px] h-[560px] max-h-[80vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-sm">Swiftgrowthdigital</h3>
                <p className="text-xs opacity-90">Usually replies within minutes</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-primary-foreground/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === "user" ? "bg-secondary" : "bg-primary"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="w-4 h-4 text-secondary-foreground" />
                  ) : (
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  )}
                </div>
                <div
                  className={`max-w-[75%] p-3 rounded-2xl ${
                    msg.role === "user"
                      ? "bg-secondary text-secondary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                >
                  <div className="text-sm prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="bg-muted p-3 rounded-2xl rounded-bl-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Options */}
          {quickOptions.length > 0 && !isLoading && (
            <div className="px-4 py-3 border-t border-border bg-secondary/30">
              <div className="grid grid-cols-1 gap-2">
                {quickOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleQuickOption(option)}
                    className="flex items-center justify-between px-4 py-2.5 text-sm font-medium text-left bg-card border border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group"
                  >
                    <span className="flex items-center gap-2">
                      <span>{option.icon}</span>
                      <span>{option.label}</span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* WhatsApp CTA (only after qualification) */}
          {showWhatsAppCTA && !isLoading && (
            <div className="px-4 py-3 border-t border-border bg-card">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackConversion.whatsappChatStart("qualified_handoff")}
                className="flex items-center justify-center gap-2 w-full py-3 bg-[hsl(142,70%,45%)] hover:bg-[hsl(142,70%,40%)] text-white font-semibold rounded-xl transition-colors"
              >
                <MessageSquare className="w-5 h-5" />
                Chat on WhatsApp for Free Plan
              </a>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-border bg-card">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2.5 bg-secondary border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                disabled={isLoading}
                maxLength={500}
              />
              <Button type="submit" size="icon" className="rounded-xl" disabled={isLoading || !input.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
