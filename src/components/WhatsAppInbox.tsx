import React, { useCallback, useEffect, useRef, useState } from "react";

function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}
import { 
  MessageSquare, Send, RefreshCw, ChevronDown, ChevronUp, Download, X, Loader2, AlertCircle, Check, 
  MessageCircleMore, Paperclip, Search, Smile, Paperclip as PaperclipIcon, ChevronLeft, 
  Expand, Maximize2, RotateCcw, Play, Pause, Volume2, VolumeX 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { useMediaQuery } from "@/hooks/use-media-query";

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

function ImageWithLightbox({ 
  src, 
  alt, 
  caption, 
  messageId, 
  timestamp, 
  downloadUrl, 
  filename 
}: { 
  src: string; 
  alt: string; 
  caption?: string | null; 
  messageId: string; 
  timestamp: string; 
  downloadUrl: string; 
  filename: string;
}) {
  const [showLightbox, setShowLightbox] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);

  const handleImageLoad = () => setImgLoading(false);
  const handleImageError = () => { setImgError(true); setImgLoading(false); };

  if (imgError) {
    return (
      <div className="max-w-xs rounded-lg border border-border bg-muted flex items-center justify-center p-8">
        <div className="text-center text-muted-foreground">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">Unable to load image</p>
          <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2">
            <Download className="w-3 h-3" /> Download instead
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      <img
        src={src}
        alt={alt}
        className="max-w-xs rounded-lg border border-border cursor-zoom-in"
        loading="lazy"
        onLoad={handleImageLoad}
        onError={handleImageError}
        onClick={() => setShowLightbox(true)}
        style={{ opacity: imgLoading ? 0.5 : 1, transition: "opacity 0.2s" }}
      />
      {imgLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg border border-border">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}
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
          <button 
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white"
            onClick={(e) => { e.stopPropagation(); }}
            aria-label="Previous"
            disabled
          >
            <ChevronLeft className="w-6 h-6 text-white/50" />
          </button>
          <button 
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white"
            onClick={(e) => { e.stopPropagation(); }}
            aria-label="Next"
            disabled
          >
            <ChevronLeft className="w-6 h-6 rotate-180 text-white/50" />
          </button>
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img 
              src={src} 
              alt={alt} 
              className="max-w-[90vw] max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <button 
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white"
            onClick={(e) => { e.stopPropagation(); window.open(downloadUrl, "_blank"); }}
            aria-label="Download"
          >
            <Download className="w-6 h-6" />
          </button>
          <div className="absolute bottom-4 left-4 right-4 text-white text-sm text-center">
            <p>{formatTime(timestamp)}</p>
            {caption && <p className="text-white/70 mt-1">{caption}</p>}
          </div>
        </div>
      )}
    </>
  );
}

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

function getMediaUrl(messageId: string, token?: string, download = false): string {
  const baseUrl = `/api/whatsapp/media/token`;
  const params = new URLSearchParams();
  if (download) params.set("download", "true");
  return `${baseUrl}/${token}?${params.toString()}`;
}

function renderMessageContent(message: WhatsAppMessage, mediaTokens: Record<string, { token: string; expiresAt: string }>) {
  const type = message.message_type;
  const content = message.content as MediaContent | null;
  const token = mediaTokens[message.id]?.token;
  const mediaUrl = token ? getMediaUrl(message.id, token) : `/api/whatsapp/media/${message.id}`;
  const downloadUrl = token ? getMediaUrl(message.id, token, true) : `/api/whatsapp/media/${message.id}?download=true`;

  if (type === "text" && content?.text) {
    return <div className="whitespace-pre-wrap text-sm">{content.text.body}</div>;
  }

  if (type === "image" && content?.image) {
    return (
      <div className="space-y-1">
        <ImageWithLightbox
          src={mediaUrl}
          alt={content.image.caption ?? "Image"}
          caption={content.image.caption}
          messageId={message.id}
          timestamp={message.created_at}
          downloadUrl={downloadUrl}
          filename={content.image.caption ? `${content.image.caption.slice(0, 100)}.jpg` : "image.jpg"}
        />
        {content.image.caption && <p className="text-xs text-muted-foreground">{content.image.caption}</p>}
      </div>
    );
  }

  if (type === "video" && content?.video) {
    return (
      <div className="space-y-1">
        <video src={mediaUrl} controls className="max-w-xs rounded-lg border border-border" />
        {content.video.caption && <p className="text-xs text-muted-foreground">{content.video.caption}</p>}
        <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1">
          <Download className="w-3 h-3" /> Download
        </a>
      </div>
    );
  }

  if (type === "document" && content?.document) {
    const isPdf = content.document.mime_type === "application/pdf";
    return (
      <div className="space-y-1">
        {isPdf ? (
          <iframe 
            src={mediaUrl} 
            className="max-w-xs min-h-[200px] rounded-lg border border-border"
            title={content.document.filename ?? "Document"}
          />
        ) : (
          <div className="flex items-center gap-2 p-2 border border-border rounded-lg bg-muted">
            <Paperclip className="w-8 h-8 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{content.document.filename ?? "Document"}</p>
              <p className="text-xs text-muted-foreground">
                {content.document.mime_type ?? "application/octet-stream"}
                {content.document.sha256 && ` · ${content.document.sha256.slice(0, 16)}…`}
              </p>
            </div>
          </div>
        )}
        {content.document.caption && <p className="text-xs text-muted-foreground">{content.document.caption}</p>}
        <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          <Download className="w-3 h-3" /> Download
        </a>
      </div>
    );
  }

  if (type === "audio" && content?.audio) {
    return (
      <div className="space-y-1">
        <audio src={mediaUrl} controls className="w-full max-w-xs" />
        <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          <Download className="w-3 h-3" /> Download
        </a>
      </div>
    );
  }

  if (type === "sticker" && content?.sticker) {
    return (
      <div className="space-y-1">
        <img src={mediaUrl} alt="Sticker" className="w-16 h-16 rounded" />
        <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          <Download className="w-3 h-3" /> Download
        </a>
      </div>
    );
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

const ConversationItem = React.memo(function ConversationItem({
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
});

const MessageBubble = React.memo(function MessageBubble({
  message,
  isOutbound,
  onReply,
  onRetry,
  mediaTokens,
}: {
  message: WhatsAppMessage;
  isOutbound: boolean;
  onReply?: (message: WhatsAppMessage) => void;
  onRetry?: (message: WhatsAppMessage) => void;
  mediaTokens: Record<string, { token: string; expiresAt: string }>;
}) {
  const time = formatTime(message.created_at);

  return (
    <div className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
      <div className={`relative max-w-[70%] ${isOutbound ? "rounded-tr-none" : "rounded-tl-none"} rounded-2xl px-4 py-2 ${
        isOutbound ? "bg-primary text-primary-foreground" : "bg-muted"
      } group`}>
        <div className="text-sm">{renderMessageContent(message, mediaTokens)}</div>
        <div className={`flex items-center gap-1 mt-1 text-[10px] ${isOutbound ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
          <span>{time}</span>
          {isOutbound && getStatusIcon(message.status)}
          {!isOutbound && onReply && (
            <button
              onClick={() => onReply(message)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-black/10"
              aria-label="Reply"
              title="Reply"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
          )}
          {isOutbound && message.status === "failed" && onRetry && (
            <button
              onClick={() => onRetry(message)}
              className="p-0.5 rounded hover:bg-black/10 text-destructive"
              title="Retry"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export function WhatsAppInbox() {
  const { toast } = useToast();
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
  const [conversationCursor, setConversationCursor] = useState<string | null>(null);
  const [messagePage, setMessagePage] = useState(0);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [messageCursor, setMessageCursor] = useState<string | null>(null);
  const [windowExpired, setWindowExpired] = useState(false);
  const [windowExpiresAt, setWindowExpiresAt] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<WhatsAppMessage | null>(null);
  const [mediaPreview, setMediaPreview] = useState<{ file: File; type: string; previewUrl: string; caption: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mediaTokens, setMediaTokens] = useState<Record<string, { token: string; expiresAt: string }>>({});
  const isMobile = useMediaQuery("(max-width: 1023px)");
  const [showConversationList, setShowConversationList] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationListRef = useRef<HTMLDivElement>(null);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const processedMessageIdsRef = useRef<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchConversations = useCallback(async (cursor?: string, append = false) => {
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-service", {
        body: { action: "list_conversations", pageSize: 30, search: searchQuery, cursor },
      });
      if (error) throw new Error(error.message ?? "Failed to load conversations");
      const newConversations = (data?.conversations as WhatsAppConversation[] | undefined) ?? [];
      if (append) {
        setConversations((prev) => [...prev, ...newConversations]);
      } else {
        setConversations(newConversations);
      }
      setTotalConversations(data?.total ?? 0);
      setHasMoreConversations(data?.hasMore ?? false);
      setConversationCursor(data?.nextCursor ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load conversations");
    }
  }, [searchQuery]);

  const EMOJI_CATEGORIES = [
  { name: "Smileys & Emotion", emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👹", "👺", "🤡", "💩", "👻", "💀", "☠️", "👽", "👾", "🤖", "🎃", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾"] },
  { name: "People & Body", emojis: ["👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃", "🧠", "🫀", "🫁", "🦷", "🦴", "👀", "👁️", "👅", "👄", "🫦", "👶", "🧒", "👦", "👧", "🧑", "👱", "👨", "🧔", "👨‍🦰", "👨‍🦱", "👨‍🦳", "👨‍🦲", "👩", "👩‍🦰", "👩‍🦱", "👩‍🦳", "👩‍🦲", "🧓", "👴", "👵", "🙍", "🙎", "🙅", "🙆", "💁", "🙋", "🙇", "🤦", "🤷"] },
  { name: "Animals & Nature", emojis: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐻‍❄️", "🐨", "🐯", "🦁", "🐮", "🐷", "🐽", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦤", "🪶", "🦩", "🦚", "🦜", "🐸", "🐊", "🐢", "🦎", "🐍", "🐲", "🐉", "🦕", "🦖", "🐳", "🐋", "🐬", "🦭", "🐟", "🐠", "🐡", "🦈", "🐙", "🐚", "🐌", "🦋", "🐛", "🐜", "🐝", "🪲", "🐞", "🦗", "🪳", "🦂", "🦟", "🪰", "🪱", "🦠", "💐", "🌸", "💮", "🏵️", "🌹", "🥀", "🌺", "🌻", "🌼", "🌷", "🪷", "🪴", "🌲", "🌳", "🌴", "🌵", "🌾", "🌿", "☘️", "🍀", "🍁", "🍂", "🍃", "🪹", "🪺"] },
  { name: "Food & Drink", emojis: ["🍇", "🍈", "🍉", "🍊", "🍋", "🍌", "🍍", "🥭", "🍎", "🍏", "🍐", "🍑", "🍒", "🍓", "🫐", "🥝", "🍅", "🫒", "🥥", "🥑", "🍆", "🥔", "🥕", "🌽", "🌶️", "🫑", "🥒", "🥬", "🥦", "🧄", "🧅", "🥜", "🫘", "🌰", "🍞", "🥐", "🥖", "🫓", "🥨", "🥯", "🥞", "🧇", "🧈", "🥩", "🍗", "🍖", "🦴", "🌭", "🍔", "🍟", "🍕", "🫓", "🥪", "🥙", "🧆", "🌮", "🌯", "🫔", "🥗", "🍿", "🧈", "🧂", "🥫", "🍱", "🍘", "🍙", "🍚", "🍛", "🍜", "🍝", "🍠", "🍢", "🍣", "🍤", "🍥", "🥮", "🍡", "🍧", "🍨", "🍦", "🥧", "🍰", "🎂", "🍮", "🍭", "🍬", "🍫", "🍩", "🍪", "🌰", "🥜", "🍯", "🍼", "🥛", "☕", "🫖", "🍵", "🍶", "🍾", "🍷", "🍸", "🍹", "🍺", "🍻", "🥂", "🥃", "🫗", "🥤", "🧃", "🧋", "🧉", "🧊"] },
  { name: "Activities", emojis: ["⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "🥅", "⛳", "🪁", "🏹", "🎣", "🤿", "🥊", "🥋", "🛹", "🛷", "⛸️", "🥌", "🎿", "⛷️", "🏂", "🪂", "🏋️", "🤼", "🤸", "⛹️", "🤾", "🏌️", "🏇", "🧘", "🏄", "🏊", "🤽", "🚣", "🏎️", "🏍️", "🚴", "🚵", "🤺", "🥇", "🥈", "🥉", "🏅", "🏆", "🏵️", "🎖️", "🎫", "🎟️", "🎭", "🎨", "🎪", "🎤", "🎧", "🎼", "🎹", "🥁", "🪕", "🎻", "🎺", "🎷", "🎸", "🪕", "🎲", "🎯", "🎳", "🎮", "🎰", "🎱", "🎲", "🎯", "🎳", "🎮", "🎰", "🎱", "🎴", "🃏", "🀄", "🧩"] },
  { name: "Objects", emojis: ["⌚", "📱", "📲", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "🖲️", "🕹️", "🗜️", "💽", "💾", "💿", "📀", "📷", "📸", "📹", "🎥", "📽️", "🎞️", "📞", "☎️", "📟", "📠", "📺", "📻", "🎙️", "🎚️", "🎛️", "🧭", "⏱️", "⏲️", "⏰", "🕰️", "⌛", "⏳", "📡", "🔋", "🔌", "💡", "🔦", "🕯️", "🪔", "🧯", "🛢️", "💸", "💵", "💴", "💶", "💷", "🪙", "💰", "💳", "🧾", "💹", "✉️", "📧", "📨", "📩", "📤", "📥", "📦", "📫", "📪", "📬", "📭", "📮", "🗳️", "✏️", "✒️", "🖋️", "🖊️", "🖌️", "🖍️", "📝", "💼", "📁", "📂", "🗂️", "📅", "📆", "🗒️", "🗓️", "📇", "📈", "📉", "📊", "📋", "📌", "📍", "📎", "🖇️", "📏", "📐", "✂️", "🗃️", "🗄️", "🗑️", "🔒", "🔓", "🔏", "🔐", "🔑", "🗝️", "🔨", "🪓", "⛏️", "⚒️", "🛠️", "🗡️", "⚔️", "💣", "🪃", "🏹", "🛡️", "🪚", "🔧", "🔩", "⚙️", "🗜️", "⚖️", "🦯", "🔗", "⛓️", "🪝", "🧰", "🧲", "🪜", "⚗️", "🧪", "🧫", "🧬", "🔬", "🔭", "📡", "💉", "🩸", "💊", "🩹", "🩺", "🩻"] },
  { name: "Symbols", emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "☮️", "✝️", "☪️", "🕉️", "☸️", "✡️", "🔯", "🕎", "☯️", "☦️", "🛐", "⛎", "♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓", "⛎", "🔀", "🔁", "🔂", "▶️", "⏩", "⏭️", "⏯️", "◀️", "⏪", "⏮️", "🔼", "⏫", "🔽", "⏬", "⏸️", "⏹️", "⏺️", "⏏️", "🎦", "🔅", "🔆", "📶", "📳", "📴", "♀️", "♂️", "⚧", "✖️", "➕", "➖", "➗", "♾️", "‼️", "⁉️", "❓", "❔", "❕", "❗", "〰️", "💱", "💲", "⚕️", "♻️", "⚜️", "🔱", "📛", "🔰", "⭕", "🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "🟤", "⚫", "⚪", "🟥", "🟧", "🟨", "🟩", "🟦", "🟪", "🟫", "⬛", "⬜", "◼️", "◻️", "◾", "◽", "▪️", "▫️", "🔶", "🔷", "🔸", "🔹", "🔺", "🔻", "💠", "🔘", "🔳", "🔲", "🏁", "🚩", "🎌", "🏴", "🏳️", "🏳️‍🌈", "🏳️‍⚧️", "🏴‍☠️", "🇺🇳", "🇦🇫", "🇦🇽", "🇦🇱", "🇩🇿", "🇦🇸", "🇦🇩", "🇦🇴", "🇦🇮", "🇦🇶", "🇦🇬", "🇦🇷", "🇦🇲", "🇦🇼", "🇦🇺", "🇦🇹", "🇦🇿", "🇧🇸", "🇧🇭", "🇧🇩", "🇧🇧", "🇧🇾", "🇧🇪", "🇧🇿", "🇧🇯", "🇧🇲", "🇧🇹", "🇧🇴", "🇧🇦", "🇧🇼", "🇧🇷", "🇮🇴", "🇧🇳", "🇧🇬", "🇧🇫", "🇧🇮", "🇨🇻", "🇰🇭", "🇨🇲", "🇨🇦", "🇨🇾", "🇨🇿", "🇨🇩", "🇨🇫", "🇨🇱", "🇨🇳", "🇨🇴", "🇨🇷", "🇨🇮", "🇭🇷", "🇨🇺", "🇨🇼", "🇨🇾", "🇨🇿", "🇩🇰", "🇩🇯", "🇩🇲", "🇩🇴", "🇪🇨", "🇪🇬", "🇸🇻", "🇬🇶", "🇪🇷", "🇪🇪", "🇪🇹", "🇫🇰", "🇫🇴", "🇫🇯", "🇫🇮", "🇫🇷", "🇬🇫", "🇵🇫", "🇹🇫", "🇬🇦", "🇬🇲", "🇬🇪", "🇩🇪", "🇬🇭", "🇬🇮", "🇬🇷", "🇬🇱", "🇬🇩", "🇬🇵", "🇬🇺", "🇬🇹", "🇬🇬", "🇬🇳", "🇬🇼", "🇬🇾", "🇭🇹", "🇭🇲", "🇻🇦", "🇭🇳", "🇭🇰", "🇭🇺", "🇮🇸", "🇮🇳", "🇮🇩", "🇮🇷", "🇮🇶", "🇮🇪", "🇮🇲", "🇮🇱", "🇮🇹", "🇯🇲", "🇯🇵", "🎌", "🇯🇪", "🇯🇴", "🇰🇿", "🇰🇪", "🇰🇮", "🇽🇰", "🇰🇼", "🇰🇬", "🇱🇦", "🇱🇻", "🇱🇧", "🇱🇸", "🇱🇷", "🇱🇾", "🇱🇮", "🇱🇹", "🇱🇺", "🇲🇴", "🇲🇰", "🇲🇬", "🇲🇼", "🇲🇾", "🇲🇻", "🇲🇱", "🇲🇹", "🇲🇭", "🇲🇶", "🇲🇷", "🇲🇺", "🇾🇹", "🇲🇽", "🇫🇲", "🇲🇨", "🇲🇳", "🇲🇪", "🇲🇸", "🇲🇦", "🇲🇿", "🇲🇲", "🇳🇦", "🇳🇷", "🇳🇵", "🇳🇱", "🇳🇨", "🇳🇿", "🇳🇮", "🇳🇪", "🇳🇬", "🇳🇺", "🇳🇫", "🇰🇵", "🇲🇵", "🇳🇴", "🇴🇲", "🇵🇰", "🇵🇼", "🇵🇸", "🇵🇦", "🇵🇬", "🇵🇾", "🇵🇪", "🇵🇭", "🇵🇳", "🇵🇱", "🇵🇹", "🇵🇷", "🇶🇦", "🇷🇪", "🇷🇴", "🇷🇺", "🇷🇼", "🇧🇱", "🇸🇭", "🇰🇳", "🇱🇨", "🇵🇲", "🇻🇨", "🇼🇸", "🇸🇲", "🇸🇹", "🇸🇦", "🇸🇳", "🇷🇸", "🇸🇨", "🇸🇱", "🇸🇬", "🇸🇽", "🇸🇰", "🇸🇮", "🇸🇧", "🇸🇴", "🇿🇦", "🇬🇸", "🇸🇸", "🇪🇸", "🇱🇰", "🇸🇩", "🇸🇷", "🇸🇯", "🇸🇪", "🇨🇭", "🇸🇾", "🇹🇼", "🇹🇯", "🇹🇿", "🇹🇭", "🇹🇱", "🇹🇬", "🇹🇰", "🇹🇴", "🇹🇹", "🇹🇳", "🇹🇷", "🇹🇲", "🇹🇨", "🇹🇻", "🇺🇬", "🇺🇦", "🇦🇪", "🇬🇧", "🇺🇸", "🇺🇲", "🇺🇾", "🇺🇿", "🇻🇺", "🇻🇦", "🇻🇪", "🇻🇳", "🇼🇫", "🇪🇭", "🇾🇪", "🇿🇲", "🇿🇼"] },
];

const insertEmoji = useCallback((emoji: string) => {
  setReplyText((prev) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      return prev.slice(0, start) + emoji + prev.slice(end);
    }
    return prev + emoji;
  });
  setShowEmojiPicker(false);
  textareaRef.current?.focus();
}, []);

  const fetchMessages = useCallback(async (phone: string, cursor?: string, append = false) => {
    if (!phone) return;
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-service", {
        body: { action: "get_conversation", phone, limit: 50, before: cursor },
      });
      if (error) throw new Error(error.message ?? "Failed to load messages");
      const newMessages = ((data?.messages as WhatsAppMessage[] | undefined) ?? []).reverse();
      if (append) {
        setMessages((prev) => [...newMessages, ...prev]);
      } else {
        setMessages(newMessages);
      }

      // Fetch media tokens for messages with media
      const mediaMessages = newMessages.filter((m) => 
        m.direction === "inbound" && 
        ["image", "video", "document", "audio", "sticker"].includes(m.message_type)
      );
      if (mediaMessages.length > 0) {
        const tokens: Record<string, { token: string; expiresAt: string }> = {};
        for (const msg of mediaMessages) {
          try {
            const { data: tokenData, error } = await supabase.functions.invoke("whatsapp-service", {
              body: { action: "get_media_token", messageId: msg.id },
            });
            if (!error && tokenData?.token) {
              tokens[msg.id] = { token: tokenData.token, expiresAt: tokenData.expiresAt };
            }
          } catch (e) {
            console.warn("Failed to fetch media token for message", msg.id, e);
          }
        }
        if (Object.keys(tokens).length > 0) {
          setMediaTokens((prev) => ({ ...prev, ...tokens }));
        }
      }

      setHasMoreMessages(data?.hasMore ?? false);
      setMessageCursor(data?.nextCursor ?? null);

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
  }, []);

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
      // Update conversation list unread count immediately
      setConversations((prev) =>
        prev.map((c) =>
          c.recipient_phone === selectedPhone
            ? { ...c, unread_count: 0 }
            : c
        )
      );
    } catch (e) {
      console.error("Failed to mark as read:", e);
    }
  }, [selectedPhone]);

  const loadMoreConversations = useCallback(() => {
    if (!loading && hasMoreConversations && conversationCursor) {
      fetchConversations(conversationCursor, true);
    }
  }, [loading, hasMoreConversations, conversationCursor, fetchConversations]);

  const loadMoreMessages = useCallback(() => {
    if (!loading && hasMoreMessages && selectedPhone && messageCursor) {
      fetchMessages(selectedPhone, messageCursor, true);
    }
  }, [loading, hasMoreMessages, selectedPhone, messageCursor, fetchMessages]);

  useEffect(() => {
    fetchConversations();
    // Initialize processed message IDs with current messages to avoid duplicates
    if (selectedPhone) {
      fetchMessages(selectedPhone).then(() => {
        // This will be called after messages are loaded
      });
    }
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedPhone && messages.length > 0) {
      const ids = messages.map((m) => m.id);
      processedMessageIdsRef.current = new Set(ids);
    }
  }, [messages, selectedPhone]);

  useEffect(() => {
    if (selectedPhone) {
      fetchMessages(selectedPhone);
      markAsRead();
    } else {
      setMessages([]);
      setMessageCursor(null);
      setHasMoreMessages(true);
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

  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel("whatsapp_inbox_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_messages",
        },
        (payload) => {
          handleRealtimeMessage(payload);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsRealtimeConnected(true);
          console.log("[Realtime] Subscribed to whatsapp_messages");
        } else if (status === "CHANNEL_ERROR") {
          setIsRealtimeConnected(false);
          console.error("[Realtime] Channel error");
          toast({ title: "Realtime disconnected", description: "Live updates paused. Refresh to reconnect.", variant: "destructive" });
        } else if (status === "TIMED_OUT") {
          setIsRealtimeConnected(false);
          console.warn("[Realtime] Connection timed out");
          toast({ title: "Realtime timeout", description: "Reconnecting…", variant: "default" });
        } else if (status === "CLOSED") {
          setIsRealtimeConnected(false);
          console.log("[Realtime] Connection closed");
        }
      });

    realtimeChannelRef.current = channel;

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
      setIsRealtimeConnected(false);
    };
  }, [toast]);

  const handleRealtimeMessage = useCallback((payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    const message = newRecord as WhatsAppMessage;

    if (eventType === "INSERT") {
      const messageId = message.id;
      if (processedMessageIdsRef.current.has(messageId)) return;
      processedMessageIdsRef.current.add(messageId);

      if (message.direction === "inbound") {
        setConversations((prev) => {
          const existing = prev.find((c) => c.recipient_phone === message.recipient_phone);
          if (existing) {
            return prev.map((c) =>
              c.recipient_phone === message.recipient_phone
                ? {
                    ...c,
                    unread_count: (c.unread_count ?? 0) + 1,
                    last_message_at: message.created_at,
                    last_message_content: message.content,
                    last_message_type: message.message_type,
                    last_message_direction: message.direction,
                    total_messages: (c.total_messages ?? 0) + 1,
                    inbound_count: (c.inbound_count ?? 0) + 1,
                  }
                : c
            );
          }
          return [
            {
              recipient_phone: message.recipient_phone,
              lead_id: message.lead_id,
              contact_name: message.contact_name,
              lead_name: message.lead_name,
              lead_business_type: message.lead_business_type,
              lead_city: message.lead_city,
              total_messages: 1,
              inbound_count: 1,
              outbound_count: 0,
              unread_count: 1,
              last_message_at: message.created_at,
              last_inbound_at: message.created_at,
              last_outbound_at: null,
              last_message_id: message.id,
              last_message_content: message.content,
              last_message_type: message.message_type,
              last_message_direction: message.direction,
              last_message_status: message.status,
            } as WhatsAppConversation,
            ...prev,
          ];
        });

        if (selectedPhone === message.recipient_phone) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === messageId)) return prev;
            return [...prev, message];
          });
        }
      } else if (message.direction === "outbound") {
        setConversations((prev) =>
          prev.map((c) =>
            c.recipient_phone === message.recipient_phone
              ? {
                  ...c,
                  last_message_at: message.created_at,
                  last_message_content: message.content,
                  last_message_type: message.message_type,
                  last_message_direction: message.direction,
                  total_messages: (c.total_messages ?? 0) + 1,
                  outbound_count: (c.outbound_count ?? 0) + 1,
                }
              : c
          )
        );

        if (selectedPhone === message.recipient_phone) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === messageId)) return prev;
            return [...prev, message];
          });
        }
      }
    } else if (eventType === "UPDATE") {
      const messageId = message.id;
      const oldMessage = oldRecord as WhatsAppMessage;

      if (message.direction === "inbound" && oldMessage.status === "received" && message.status === "read") {
        setConversations((prev) =>
          prev.map((c) =>
            c.recipient_phone === message.recipient_phone
              ? { ...c, unread_count: Math.max(0, (c.unread_count ?? 1) - 1) }
              : c
          )
        );
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? message : m))
      );

      if (message.status === "failed" && oldMessage.status !== "failed") {
        toast({ title: "Message failed", description: message.error_metadata ? JSON.stringify(message.error_metadata) : "Unknown error", variant: "destructive" });
      }
    } else if (eventType === "DELETE") {
      const deletedMessage = oldRecord as WhatsAppMessage;
      processedMessageIdsRef.current.delete(deletedMessage.id);
      setMessages((prev) => prev.filter((m) => m.id !== deletedMessage.id));
    }
  }, [selectedPhone, toast]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    let mediaType: string;
    if (file.type.startsWith("image/")) mediaType = "image";
    else if (file.type.startsWith("video/")) mediaType = "video";
    else if (file.type.startsWith("audio/")) mediaType = "audio";
    else mediaType = "document";

    const previewUrl = URL.createObjectURL(file);
    setMediaPreview({ file, type: mediaType, previewUrl, caption: "" });
    fileInputRef.current!.value = "";
  }, []);

  const cancelMediaPreview = useCallback(() => {
    if (mediaPreview?.previewUrl) {
      URL.revokeObjectURL(mediaPreview.previewUrl);
    }
    setMediaPreview(null);
  }, [mediaPreview]);

  const sendMedia = useCallback(async () => {
    if (!selectedPhone || !mediaPreview || uploadProgress !== null) return;
    
    setUploadProgress(0);
    try {
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(mediaPreview.file);
      });

      // Upload to Meta via server
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke("whatsapp-service", {
        body: { action: "upload_media", fileBase64, filename: mediaPreview.file.name, mimeType: mediaPreview.file.type, mediaType: mediaPreview.type },
      });
      if (uploadError) throw new Error(uploadError.message ?? "Upload failed");

      const mediaId = uploadData?.mediaId;
      if (!mediaId) throw new Error("No media ID returned");

      setUploadProgress(50);

      // Send media message
      const { data: sendData, error: sendError } = await supabase.functions.invoke("whatsapp-service", {
        body: { action: "send_media", phone: selectedPhone, mediaType: mediaPreview.type, mediaId, caption: mediaPreview.caption, filename: mediaPreview.file.name, mimeType: mediaPreview.file.type, replyToMessageId: replyingToMessage?.meta_message_id },
      });
      if (sendError) throw new Error(sendError.message ?? "Failed to send media");

      setUploadProgress(100);

      // Update local state
      if (sendData?.windowExpiresAt) {
        setWindowExpiresAt(sendData.windowExpiresAt);
        setWindowExpired(false);
      }
      await fetchMessages(selectedPhone);
      setMediaPreview(null);
      setReplyingToMessage(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to send media";
      setError(message);
      toast({ title: "Send failed", description: message, variant: "destructive" });
    } finally {
      setUploadProgress(null);
    }
  }, [selectedPhone, mediaPreview, replyingToMessage, fetchMessages, toast]);

  const sendReply = useCallback(async () => {
    if (!selectedPhone || (!replyText.trim() && !mediaPreview) || sending) return;
    
    if (mediaPreview) {
      await sendMedia();
      return;
    }

    const text = replyText.trim();
    setReplyText("");
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-service", {
        body: { action: "send_reply", phone: selectedPhone, body: text, replyToMessageId: replyingToMessage?.meta_message_id },
      });
      if (error) throw new Error(error.message ?? "Failed to send reply");
      if (data?.windowExpiresAt) {
        setWindowExpiresAt(data.windowExpiresAt);
        setWindowExpired(false);
      }
      await fetchMessages(selectedPhone);
      setReplyingToMessage(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to send reply";
      setError(message);
      if (message.includes("window has expired") || message.includes("window expired")) {
        setWindowExpired(true);
      }
      setReplyText(text);
      toast({ title: "Send failed", description: message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  }, [selectedPhone, replyText, sending, mediaPreview, replyingToMessage, fetchMessages, toast, sendMedia]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendReply();
    }
  };

  const handleReply = useCallback((message: WhatsAppMessage) => {
    setReplyingToMessage(message);
    textareaRef.current?.focus();
  }, []);

  const cancelReply = useCallback(() => {
    setReplyingToMessage(null);
  }, []);

  const retryMessage = useCallback(async (message: WhatsAppMessage) => {
    if (!selectedPhone || sending) return;
    setSending(true);
    try {
      if (message.message_type === "text") {
        const content = message.content as { text?: { body?: string } } | null;
        const { data, error } = await supabase.functions.invoke("whatsapp-service", {
          body: { action: "send_reply", phone: selectedPhone, body: content?.text?.body ?? "", replyToMessageId: replyingToMessage?.meta_message_id },
        });
        if (error) throw new Error(error.message ?? "Failed to retry");
        if (data?.windowExpiresAt) {
          setWindowExpiresAt(data.windowExpiresAt);
          setWindowExpired(false);
        }
      } else {
        // For media messages, we would need to re-upload - for now just show error
        toast({ title: "Cannot retry", description: "Media messages cannot be retried automatically. Please resend.", variant: "destructive" });
        return;
      }
      await fetchMessages(selectedPhone);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to retry";
      toast({ title: "Retry failed", description: message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  }, [selectedPhone, sending, replyingToMessage, fetchMessages, toast]);

  const handleClickOutside = useCallback((e: React.MouseEvent) => {
    if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
      setShowEmojiPicker(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  const handleConversationClick = (phone: string) => {
    setSelectedPhone(phone);
    setMessageCursor(null);
    setHasMoreMessages(true);
    if (isMobile) {
      setShowConversationList(false);
    }
  };

  const handleBackToList = () => {
    setSelectedPhone(null);
    setShowConversationList(true);
  };

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[500px] overflow-hidden">
      {/* Conversation List */}
      {(showConversationList || !isMobile) && (
        <div
          ref={conversationListRef}
          className={`w-full lg:w-96 border-r border-border bg-card flex flex-col overflow-hidden transition-transform duration-300 ${
            isMobile && !showConversationList ? "fixed inset-0 z-50 lg:static" : ""
          }`}
        >
          <div className="p-3 border-b border-border flex flex-col gap-2">
            <div className="flex items-center justify-between">
              {isMobile && !showConversationList && (
                <Button variant="ghost" size="icon" onClick={handleBackToList} className="h-10 w-10">
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              )}
              <h3 className="font-semibold">Conversations</h3>
              <Badge variant="outline" className="text-xs">{totalConversations}</Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search contacts…"
                value={searchQuery}
                onChange={(e) => debouncedSearch(e.target.value)}
                className="pl-8 text-sm h-8"
              />
            </div>
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
      )}

      {/* Conversation Detail */}
      <div className="flex-1 flex flex-col min-w-0">
      {selectedPhone ? (
          <div>
            <div className="p-3 border-b border-border bg-card flex items-center gap-3">
              {isMobile && (
                <Button variant="ghost" size="icon" onClick={handleBackToList} className="h-10 w-10 lg:hidden">
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              )}
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
                        onReply={msg.direction === "inbound" ? handleReply : undefined}
                        onRetry={msg.direction === "outbound" && msg.status === "failed" ? retryMessage : undefined}
                        mediaTokens={mediaTokens}
                      />
                    ))}
                    {loading && <div className="text-center text-muted-foreground text-sm">Loading…</div>}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>
            </ScrollArea>

            {/* Composer */}
            <div className="border-t border-border bg-card p-3 relative">
              {windowExpired && (
                <div className="mb-2 p-2 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  Customer service window expired. Free-form replies are not allowed. 
                  Use an approved WhatsApp template from the Campaigns tab.
                </div>
              )}

              {/* Reply preview */}
              {replyingToMessage && (
                <div className="mb-2 p-2 bg-muted/50 border border-border rounded-lg flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Replying to</p>
                    <p className="text-sm font-medium truncate">{getMessagePreview(replyingToMessage)}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={cancelReply}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Media preview */}
              {mediaPreview && (
                <div className="mb-2 p-2 bg-muted/50 border border-border rounded-lg space-y-2">
                  <div className="flex items-center gap-3">
                    {mediaPreview.type === "image" && (
                      <img src={mediaPreview.previewUrl} alt="Preview" className="w-16 h-16 rounded-lg object-cover" />
                    )}
                    {mediaPreview.type === "video" && (
                      <video src={mediaPreview.previewUrl} className="w-16 h-16 rounded-lg object-cover" muted />
                    )}
                    {mediaPreview.type === "audio" && (
                      <audio src={mediaPreview.previewUrl} controls className="w-32" />
                    )}
                    {mediaPreview.type === "document" && (
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                        <PaperclipIcon className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{mediaPreview.file.name}</p>
                      <p className="text-xs text-muted-foreground">{(mediaPreview.file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={cancelMediaPreview}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  {["image", "video", "document"].includes(mediaPreview.type) && (
                    <Input
                      type="text"
                      placeholder="Add a caption (optional)"
                      value={mediaPreview.caption}
                      onChange={(e) => setMediaPreview({ ...mediaPreview, caption: e.target.value })}
                      className="text-sm"
                    />
                  )}
                  {uploadProgress !== null && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Uploading…</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-end gap-2">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sending || !selectedPhone || windowExpired || mediaPreview}
                    className="h-10 w-10"
                    aria-label="Attach file"
                  >
                    <PaperclipIcon className="w-5 h-5" />
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={sending || !selectedPhone || windowExpired || mediaPreview}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    disabled={sending || !selectedPhone || windowExpired}
                    className="h-10 w-10"
                    aria-label="Emoji picker"
                  >
                    <Smile className="w-5 h-5" />
                  </Button>
                </div>
                <Textarea
                  ref={textareaRef}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={windowExpired ? "Window expired — use a template from Campaigns tab" : mediaPreview ? "Add a caption…" : "Type a message…"}
                  rows={1}
                  className="flex-1 min-h-[44px] max-h-32 resize-none"
                  disabled={sending || !selectedPhone || windowExpired}
                />
                <Button
                  onClick={sendReply}
                  disabled={sending || (!replyText.trim() && !mediaPreview) || !selectedPhone || windowExpired}
                  className="h-10"
                >
                  {sending || uploadProgress !== null ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>

              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div ref={emojiPickerRef} className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-card border border-border rounded-lg shadow-lg max-h-64 overflow-auto z-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Emoji</span>
                    <Button variant="ghost" size="icon" onClick={() => setShowEmojiPicker(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  {EMOJI_CATEGORIES.map((category) => (
                    <div key={category.name} className="mb-3">
                      <p className="text-xs text-muted-foreground mb-1 px-1">{category.name}</p>
                      <div className="flex flex-wrap gap-1">
                        {category.emojis.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => insertEmoji(emoji)}
                            className="w-8 h-8 rounded text-lg hover:bg-muted transition-colors"
                            aria-label={emoji}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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