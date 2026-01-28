import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { trackConversion } from "@/lib/analytics";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type QuickQuestion = {
  label: string;
  value: string;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/swiftbot-chat`;

const businessTypeQuestions: QuickQuestion[] = [
  { label: "🏥 Clinic / Hospital", value: "I run a Clinic or Hospital" },
  { label: "🏠 Real Estate", value: "I'm in the Real Estate business" },
  { label: "🍽️ Restaurant / Cloud Kitchen", value: "I have a Restaurant or Cloud Kitchen" },
  { label: "🏪 Other Local Business", value: "I have another local business" },
];

const serviceQuestions: QuickQuestion[] = [
  { label: "📈 Getting more leads", value: "I need help with getting more leads for my business" },
  { label: "🌐 Website & branding", value: "I need help with website design and branding" },
  { label: "📣 Google / Instagram ads", value: "I want to run Google or Instagram ads" },
  { label: "🎁 Free growth audit", value: "I want a free growth audit for my business" },
];

export function UnifiedChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasShownAutoOpen, setHasShownAutoOpen] = useState(false);
  const [showQuickQuestions, setShowQuickQuestions] = useState<"business" | "service" | null>("business");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! 👋 Welcome to Swiftgrowthdigital. I'm here to help you grow your business. Let's start — what type of business do you have?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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

  const handleQuickQuestion = async (question: QuickQuestion, type: "business" | "service") => {
    const userMessage: Message = { role: "user", content: question.value };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    
    if (type === "business") {
      setShowQuickQuestions("service");
      // Add a follow-up question
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Great! And what do you need help with today?",
          },
        ]);
      }, 500);
    } else {
      setShowQuickQuestions(null);
      setIsLoading(true);
      try {
        await streamChat(newMessages);
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: error instanceof Error ? error.message : "Sorry, something went wrong. Please WhatsApp us directly at 9229721835!",
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

    setShowQuickQuestions(null);
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
          content: error instanceof Error ? error.message : "Sorry, something went wrong. Please try again or WhatsApp us directly!",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const whatsappLink = "https://wa.me/919229721835?text=Hi%2C%20I%20want%20to%20grow%20my%20business";

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={handleOpen}
        className={`fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 md:w-16 md:h-16 bg-whatsapp rounded-full shadow-lg hover:scale-110 transition-transform duration-300 ${
          isOpen ? "hidden" : ""
        }`}
        aria-label="Chat with us"
      >
        <MessageCircle className="w-7 h-7 md:w-8 md:h-8 text-whatsapp-foreground" />
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full bg-whatsapp/50 animate-ping" style={{ animationDuration: "2s" }} />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[calc(100vw-48px)] max-w-[380px] h-[520px] max-h-[75vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-whatsapp text-whatsapp-foreground">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-sm">Swiftgrowthdigital</h3>
                <p className="text-xs opacity-90">Usually replies within minutes</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
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
                    msg.role === "user" ? "bg-primary" : "bg-whatsapp"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="w-4 h-4 text-primary-foreground" />
                  ) : (
                    <Bot className="w-4 h-4 text-whatsapp-foreground" />
                  )}
                </div>
                <div
                  className={`max-w-[75%] p-3 rounded-2xl ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-card border border-border text-card-foreground rounded-bl-sm"
                  }`}
                >
                  <div className="text-sm prose prose-sm prose-invert max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-whatsapp flex items-center justify-center">
                  <Bot className="w-4 h-4 text-whatsapp-foreground" />
                </div>
                <div className="bg-card border border-border p-3 rounded-2xl rounded-bl-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          {showQuickQuestions && !isLoading && (
            <div className="px-4 py-3 border-t border-border bg-secondary/50">
              <div className="grid grid-cols-2 gap-2">
                {(showQuickQuestions === "business" ? businessTypeQuestions : serviceQuestions).map((q) => (
                  <button
                    key={q.value}
                    onClick={() => handleQuickQuestion(q, showQuickQuestions)}
                    className="flex items-center justify-between px-3 py-2 text-xs font-medium text-left bg-card border border-border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  >
                    <span>{q.label}</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* WhatsApp CTA */}
          <div className="px-4 py-2 border-t border-border bg-card">
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2 text-xs font-medium text-whatsapp hover:underline"
            >
              <MessageCircle className="w-4 h-4" />
              Chat directly on WhatsApp
            </a>
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-border bg-card">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2.5 bg-secondary border border-border rounded-full text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isLoading}
                maxLength={500}
              />
              <Button type="submit" size="icon" className="rounded-full" disabled={isLoading || !input.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
