import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare, Send, RefreshCw, ChevronDown, ChevronUp, Download, X, Loader2, AlertCircle, Check, MessageCircleMore, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type WhatsAppConversation = Database["public"]["Views"]["whatsapp_conversations"]["Row"];
type WhatsAppMessage = Database["public"]["Tables"]["whatsapp_messages"]["Row"] & {
  lead_name?: string | null;
  lead_business_type?: string | null;
  lead_city?: string | null;
};

type MediaContent = {
  image?: { id: string; mime_type?: string; sha256?: string; caption?: string };
  video?: { id: string; mime_type?: string; sha256?: string; caption?: string };
  document?: { id: string; filename?: string; mime_type?: string; sha256?: string; caption?: string };
  audio?: { id: string; mime_type?: string; sha256?: string };
  sticker?: { id: string; mime_type?: string; sha256?: string };
};

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString() : "—";
const formatTime = (value?: string | null) => value ? new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

function getMessagePreview(message: WhatsAppMessage): string {
  const type = message.message_type;
  const content = message.content as MediaContent | null;
  if (type === "text" && content?.text) {
    const body = content.text.body ?? "";
    return body.length > 80 ? body.slice(0, 80) + "…" : body;
  }
  if (type === "image") return "📷 Image";
  if (type === "video") return "🎥 Video";
  if (type === "document") return `📄 ${content?.document?.filename ?? "Document"}`;
  if (type === "audio") return "🎵 Audio";
  if (type === "sticker") return "🎭 Sticker";
  if (type === "location") return "📍 Location";
  if (type === "contacts") return "👤 Contact";
  if (type === "interactive") return "🔘 Interactive";
  if (type === "reaction") return "↩️ Reaction";
  return type || "Message";
}

function getStatusIcon(status: string) {
  switch (status) {
    case "sent": return <Check className="w-3 h-3 text-muted-foreground" />;
    case "delivered": return <Check className="w-3 h-3 text-blue-500" />;
    case "read": return <Check className="w-3 h-3 text-emerald-500" />;
    case "failed": return <AlertCircle className="w-3 h-3 text-destructive" />;
    default: return <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />;
  }
}

function renderMessageContent(message: WhatsAppMessage) {
  const type = message.message_type;
  const content = message.content as MediaContent | null;

  if (type === "text" && content?.text) {
    return <div className="whitespace-pre-wrap text-sm">{content.text.body}</div>;
  }

  if (type === "image" && content?.image) {
    const mediaUrl = `/api/whatsapp/media/${message.id}`;
    return (
      <div className="space-y-1">
        <img
          src={mediaUrl}
          alt={content.image.caption ?? "Image"}
          className="max-w-xs rounded-lg border border-border"
          loading="lazy"
        />
        {content.image.caption && <p className="text-xs text-muted-foreground">{content.image.caption}</p>}
      </div>
    );
  }

  if (type === "video" && content?.video) {
    const mediaUrl = `/api/whatsapp/media/${message.id}`;
    return (
      <div className="space-y-1">
        <video src={mediaUrl} controls className="max-w-xs rounded-lg border border-border" />
        {content.video.caption && <p className="text-xs text-muted-foreground">{content.video.caption}</p>}
      </div>
    );
  }

  if (type === "document" && content?.document) {
    const mediaUrl = `/api/whatsapp/media/${message.id}`;
    return (
      <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 border border-border rounded-lg hover:bg-muted transition-colors">
        <Paperclip className="w-5 h-5 text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{content.document.filename ?? "Document"}</p>
          <p className="text-xs text-muted-foreground">
            {content.document.mime_type ?? "application/octet-stream"}
            {content.document.sha256 && ` · ${content.document.sha256.slice(0, 16)}…`}
          </p>
        </div>
        <Download className="w-4 h-4 text-muted-foreground" />
      </a>
    );
  }

  if (type === "audio" && content?.audio) {
    const mediaUrl = `/api/whatsapp/media/${message.id}`;
    return (
      <div className="space-y-1">
        <audio src={mediaUrl} controls className="w-full max-w-xs" />
      </div>
    );
  }

  if (type === "sticker" && content?.sticker) {
    const mediaUrl = `/api/whatsapp/media/${message.id}`;
    return <img src={mediaUrl} alt="Sticker" className="w-16 h-16 rounded" />;
  }

  if (type === "location" && content?.location) {
    return (
      <div className="p-2 border border-border rounded-lg text-sm">
        <p className="font-medium">📍 Location</p>
        <p className="text-xs text-muted-foreground">Lat: {content.location.latitude}, Long: {content.location.longitude}</p>
        {content.location.name && <p className="text-xs text-muted-foreground">{content.location.name}</p>}
        {content.location.address && <p className="text-xs text-muted-foreground">{content.location.address}</p>}
      </div>
    );
  }

  if (type === "contacts" && content?.contacts) {
    return (
      <div className="p-2 border border-border rounded-lg text-sm">
        <p className="font-medium">👤 Contact Card</p>
        {Array.isArray(content.contacts) && content.contacts.map((c, i) => (
          <div key={i} className="text-xs text-muted-foreground">
            {c.name?.formatted_name ?? "Unknown"}
            {c.phones?.[0]?.phone && ` — ${c.phones[0].phone}`}
          </div>
        ))}
      </div>
    );
  }

  if (type === "interactive" && content?.interactive) {
    return (
      <div className="p-2 border border-border rounded-lg text-sm">
        <p className="font-medium">🔘 Interactive</p>
        <p className="text-xs text-muted-foreground">{content.interactive.type ?? "Unknown"}</p>
      </div>
    );
  }

  if (type === "reaction" && content?.reaction) {
    return (
      <div className="text-sm text-muted-foreground">
        {content.reaction.emoji ?? "↩️"} Reaction
      </div>
    );
  }

  return <div className="text-xs text-muted-foreground">Unsupported message type: {type}</div>;
}

function ConversationItem({
  conversation,
  isSelected,
  onClick,
  unreadCount,
}: {
  conversation: WhatsAppConversation;
  isSelected: boolean;
  onClick: () => void;
  unreadCount: number;
}) {
  const displayName = conversation.lead_name ?? conversation.contact_name ?? `Unknown (+${conversation.recipient_phone})`;
  const businessInfo = conversation.lead_business_type && conversation.lead_city
    ? `${conversation.lead_business_type} · ${conversation.lead_city}`
    : conversation.lead_business_type ?? conversation.lead_city ?? null;

  const preview = conversation.last_message_content
    ? getMessagePreview({
        ...conversation,
        message_type: conversation.last_message_type ?? "",
        content: conversation.last_message_content,
      } as WhatsAppMessage)
    : "No messages";

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left ${
        isSelected
          ? "bg-primary/10 border-l-2 border-primary"
          : "hover:bg-muted/50"
      }`}
    >
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=25D366&color=fff`} />
        <AvatarFallback className="bg-whatsapp text-white text-xs font-medium">
          {displayName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium truncate">{displayName}</p>
          <span className="text-xs text-muted-foreground whitespace-nowrap">{formatTime(conversation.last_message_at)}</span>
        </div>
        {businessInfo && <p className="text-xs text-muted-foreground truncate">{businessInfo}</p>}
        <div className="flex items-center justify-between gap-2 mt-1">
          <p className="text-sm text-muted-foreground truncate flex-1">{preview}</p>
          {unreadCount > 0 && (
            <Badge variant="default" className="bg-primary text-primary-foreground text-xs px-2 py-0.5">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}

function MessageBubble({
  message,
  isOutbound,
}: {
  message: WhatsAppMessage;
  isOutbound: boolean;
}) {
  const time = formatTime(message.created_at);

  return (
    <div className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[70%] ${isOutbound ? "rounded-tr-none" : "rounded-tl-none"} rounded-2xl px-4 py-2 ${
        isOutbound ? "bg-primary text-primary-foreground" : "bg-muted"
      }`}>
        <div className="text-sm">{renderMessageContent(message)}</div>
        <div className={`flex items-center gap-1 mt-1 text-[10px] ${isOutbound ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
          <span>{time}</span>
          {isOutbound && getStatusIcon(message.status)}
        </div>
      </div>
    </div>
  );
}

export function WhatsAppInbox() {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [conversationPage, setConversationPage] = useState(0);
  const [hasMoreConversations, setHasMoreConversations] = useState(true);
  const [totalConversations, setTotalConversations] = useState(0);
  const [messagePage, setMessagePage] = useState(0);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [windowExpired, setWindowExpired] = useState(false);
  const [windowExpiresAt, setWindowExpiresAt] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationListRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async (page = 0, append = false) => {
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-service", {
        body: { action: "list_conversations", page, pageSize: 30 },
      });
      if (error) throw new Error(error.message ?? "Failed to load conversations");
      const newConversations = (data?.conversations as WhatsAppConversation[] | undefined) ?? [];
      if (append) {
        setConversations((prev) => [...prev, ...newConversations]);
      } else {
        setConversations(newConversations);
      }
      setTotalConversations(data?.total ?? 0);
      setHasMoreConversations(newConversations.length === 30);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load conversations");
    }
  }, []);

  const fetchMessages = useCallback(async (phone: string, page = 0, append = false) => {
    if (!phone) return;
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-service", {
        body: { action: "get_conversation", phone, limit: 50, before: page > 0 ? messages[0]?.created_at : undefined },
      });
      if (error) throw new Error(error.message ?? "Failed to load messages");
      const newMessages = ((data?.messages as WhatsAppMessage[] | undefined) ?? []).reverse();
      if (append) {
        setMessages((prev) => [...newMessages, ...prev]);
      } else {
        setMessages(newMessages);
      }
      setHasMoreMessages(newMessages.length === 50);

      // Check window status from latest inbound message
      const latestInbound = newMessages
        .filter((m) => m.direction === "inbound")
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      
      if (latestInbound) {
        const inboundTime = new Date(latestInbound.created_at).getTime();
        const now = Date.now();
        const windowMs = 24 * 60 * 60 * 1000;
        const expired = now - inboundTime > windowMs;
        const expiresAt = new Date(inboundTime + windowMs).toISOString();
        
        setWindowExpired(expired);
        setWindowExpiresAt(expiresAt);
      } else {
        setWindowExpired(true);
        setWindowExpiresAt(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load messages");
    }
  }, [messages]);

  const sendReply = useCallback(async () => {
    if (!selectedPhone || !replyText.trim() || sending) return;
    const text = replyText.trim();
    setReplyText("");
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-service", {
        body: { action: "send_reply", phone: selectedPhone, body: text },
      });
      if (error) throw new Error(error.message ?? "Failed to send reply");
      // Update window state from response if available
      if (data?.windowExpiresAt) {
        setWindowExpiresAt(data.windowExpiresAt);
        setWindowExpired(false);
      }
      // Refresh messages to show the new outbound message
      await fetchMessages(selectedPhone);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to send reply";
      setError(message);
      // Check if it's a window expiration error
      if (message.includes("window has expired") || message.includes("window expired")) {
        setWindowExpired(true);
      }
      setReplyText(text); // Restore text on error
    } finally {
      setSending(false);
    }
  }, [selectedPhone, replyText, sending, fetchMessages]);

  const markAsRead = useCallback(async () => {
    if (!selectedPhone) return;
    try {
      await supabase.functions.invoke("whatsapp-service", {
        body: { action: "mark_read", phone: selectedPhone },
      });
      // Update local message statuses
      setMessages((prev) => prev.map((m) =>
        m.direction === "inbound" && m.status === "received" && m.recipient_phone === selectedPhone
          ? { ...m, status: "read" as const }
          : m
      ));
    } catch (e) {
      console.error("Failed to mark as read:", e);
    }
  }, [selectedPhone]);

  const loadMoreConversations = useCallback(() => {
    if (!loading && hasMoreConversations) {
      fetchConversations(conversationPage + 1, true);
      setConversationPage((p) => p + 1);
    }
  }, [conversationPage, loading, hasMoreConversations, fetchConversations]);

  const loadMoreMessages = useCallback(() => {
    if (!loading && hasMoreMessages && selectedPhone) {
      fetchMessages(selectedPhone, messagePage + 1, true);
      setMessagePage((p) => p + 1);
    }
  }, [messagePage, loading, hasMoreMessages, selectedPhone, fetchMessages]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedPhone) {
      fetchMessages(selectedPhone);
      markAsRead();
    } else {
      setMessages([]);
    }
  }, [selectedPhone, fetchMessages, markAsRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const listEl = conversationListRef.current;
    if (!listEl) return;
    const handleScroll = () => {
      if (listEl.scrollTop + listEl.clientHeight >= listEl.scrollHeight - 100) {
        loadMoreConversations();
      }
    };
    listEl.addEventListener("scroll", handleScroll, { passive: true });
    return () => listEl.removeEventListener("scroll", handleScroll);
  }, [loadMoreConversations]);

  const handleConversationClick = (phone: string) => {
    setSelectedPhone(phone);
    setMessagePage(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendReply();
    }
  };

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[500px] overflow-hidden">
      {/* Conversation List */}
      <div
        ref={conversationListRef}
        className="w-full lg:w-96 border-r border-border bg-card flex flex-col overflow-hidden"
      >
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold">Conversations</h3>
          <Badge variant="outline" className="text-xs">{totalConversations}</Badge>
        </div>
        <ScrollArea className="flex-1">
          <div
            className="p-2 space-y-1"
            onScroll={loadMoreConversations}
          >
            {conversations.length === 0 && !loading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No conversations yet
              </div>
            ) : (
              conversations.map((conv) => (
                <ConversationItem
                  key={conv.recipient_phone}
                  conversation={conv}
                  isSelected={selectedPhone === conv.recipient_phone}
                  onClick={() => handleConversationClick(conv.recipient_phone)}
                  unreadCount={conv.unread_count ?? 0}
                />
              ))
            )}
            {loading && <div className="p-4 text-center text-muted-foreground text-sm">Loading…</div>}
            {hasMoreConversations && !loading && (
              <div className="p-4 text-center">
                <Button variant="ghost" size="sm" onClick={loadMoreConversations} disabled={loading}>
                  Load more
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Conversation Detail */}
      <div className="flex-1 flex flex-col min-w-0">
{selectedPhone ? (
          <div>
            <div className="p-3 border-b border-border bg-card flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">
                    {messages.find((m) => m.recipient_phone === selectedPhone)?.contact_name ??
                      conversations.find((c) => c.recipient_phone === selectedPhone)?.lead_name ??
                      conversations.find((c) => c.recipient_phone === selectedPhone)?.contact_name ??
                      `+${selectedPhone}`}
                  </p>
                  {windowExpired && (
                    <Badge variant="destructive" className="text-xs">Window Expired</Badge>
                  )}
                  {!windowExpired && windowExpiresAt && (
                    <Badge variant="secondary" className="text-xs">
                      Replyable until {new Date(windowExpiresAt).toLocaleTimeString()}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">+{selectedPhone}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {messages.filter((m) => m.direction === "inbound" && m.status === "received" && m.recipient_phone === selectedPhone).length} unread
                </Badge>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4" onScroll={loadMoreMessages}>
                {messages.length === 0 && !loading ? (
                  <div className="text-center text-muted-foreground py-8">No messages in this conversation</div>
                ) : (
                  <>
                    {hasMoreMessages && (
                      <div className="text-center pt-2">
                        <Button variant="ghost" size="sm" onClick={loadMoreMessages} disabled={loading}>
                          <ChevronUp className="w-4 h-4 mr-1" />
                          Load earlier
                        </Button>
                      </div>
                    )}
                    {messages.map((msg) => (
                      <MessageBubble
                        key={msg.id}
                        message={msg}
                        isOutbound={msg.direction === "outbound"}
                      />
                    ))}
                    {loading && <div className="text-center text-muted-foreground text-sm">Loading…</div>}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>
            </ScrollArea>

            {/* Composer */}
            <div className="border-t border-border bg-card p-3">
              {windowExpired && (
                <div className="mb-2 p-2 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  Customer service window expired. Free-form replies are not allowed. 
                  Use an approved WhatsApp template from the Campaigns tab.
                </div>
              )}
              <div className="flex items-end gap-2">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={windowExpired ? "Window expired — use a template from Campaigns tab" : "Type a message…"}
                  rows={1}
                  className="flex-1 min-h-[44px] max-h-32 resize-none"
                  disabled={sending || !selectedPhone || windowExpired}
                />
                <Button
                  onClick={sendReply}
                  disabled={sending || !replyText.trim() || !selectedPhone || windowExpired}
                  className="h-10"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-card">
            <div className="text-center text-muted-foreground">
              <MessageCircleMore className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg">Select a conversation</p>
              <p className="text-sm">Choose a conversation from the list to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}