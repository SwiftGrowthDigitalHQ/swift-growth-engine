import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getWhatsAppConfig,
  graphApiBase,
  isRecord,
  normalizeRecipient,
  sha256,
} from "../_shared/whatsapp.ts";

const MAX_MEDIA_SIZE = 50 * 1024 * 1024; // 50MB

// Disable JWT verification for this function to allow token-based media access
// without requiring Supabase Authorization header. The token-based auth is handled
// by verifyMediaToken() using HMAC-signed short-lived tokens.
export const config = {
  verify_jwt: false,
};

const PUBLIC_ORIGINS = new Set([
  "https://www.swiftgrowthdigital.com",
  "https://swiftgrowthdigital.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Vary": "Origin",
  };
  if (origin && PUBLIC_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }
  return headers;
}

function jsonResponse(status: number, body: Record<string, unknown>, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function getSupabaseCredentials() {
  return {
    url: Deno.env.get("SUPABASE_URL"),
    anonKey: Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY"),
    serviceRoleKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

async function requireAdmin(request: Request) {
  const credentials = getSupabaseCredentials();
  if (!credentials.url || !credentials.anonKey || !credentials.serviceRoleKey) {
    throw new Response("Service configuration unavailable", { status: 503 });
  }
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) throw new Response("Authentication required", { status: 401 });
  const accessToken = authorization.slice("Bearer ".length).trim();
  if (!accessToken) throw new Response("Authentication required", { status: 401 });
  const authClient = createClient(credentials.url, credentials.anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await authClient.auth.getUser(accessToken);
  if (error || !data.user) throw new Response("Authentication required", { status: 401 });
  if (data.user.app_metadata?.role !== "admin") throw new Response("Administrator access required", { status: 403 });
  const adminClient = createClient(credentials.url, credentials.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { user: data.user, supabase: adminClient };
}

// Verify media access token (HMAC-based short-lived token)
async function verifyMediaToken(token: string, messageId: string): Promise<boolean> {
  const secret = Deno.env.get("MEDIA_ACCESS_TOKEN_SECRET") || Deno.env.get("META_APP_SECRET");
  if (!secret) return false;
  
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  
  const [payloadB64, timestampStr, signature] = parts;
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return false;
  
  // Token expires after 1 hour
  if (Date.now() - timestamp > 60 * 60 * 1000) return false;
  
  // Verify HMAC
  const expectedPayload = `${payloadB64}.${timestampStr}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expectedSig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(expectedPayload)));
  const expectedSigHex = [...expectedSig].map((b) => b.toString(16).padStart(2, "0")).join("");
  
  return signature === expectedSigHex;
}

async function getMessageMediaInfo(supabase: ReturnType<typeof createClient>, messageId: string) {
  const { data: message, error } = await supabase.from("whatsapp_messages")
    .select("id, direction, recipient_phone, message_type, content, meta_message_id")
    .eq("id", messageId)
    .maybeSingle();

  if (error || !message) return { error: "Message not found", status: 404 };
  if (message.direction !== "inbound") return { error: "Media can only be retrieved for inbound messages", status: 403 };

  const content = message.content as Record<string, unknown> | null;
  if (!content) return { error: "Message has no content", status: 400 };

  const type = typeof message.message_type === "string" ? message.message_type : "";
  
  let mediaId: string | null = null;
  let mimeType: string | null = null;
  let filename: string | null = null;
  let caption: string | null = null;

  if (type === "image" && isRecord(content.image)) {
    mediaId = typeof content.image.id === "string" ? content.image.id : null;
    mimeType = typeof content.image.mime_type === "string" ? content.image.mime_type : "image/jpeg";
    filename = typeof content.image.caption === "string" && content.image.caption.length > 0
      ? content.image.caption.slice(0, 100) + ".jpg"
      : "image.jpg";
    caption = typeof content.image.caption === "string" ? content.image.caption : null;
  } else if (type === "video" && isRecord(content.video)) {
    mediaId = typeof content.video.id === "string" ? content.video.id : null;
    mimeType = typeof content.video.mime_type === "string" ? content.video.mime_type : "video/mp4";
    filename = "video.mp4";
    caption = typeof content.video.caption === "string" ? content.video.caption : null;
  } else if (type === "document" && isRecord(content.document)) {
    mediaId = typeof content.document.id === "string" ? content.document.id : null;
    mimeType = typeof content.document.mime_type === "string" ? content.document.mime_type : "application/octet-stream";
    filename = typeof content.document.filename === "string" ? content.document.filename : "document";
    caption = typeof content.document.caption === "string" ? content.document.caption : null;
  } else if (type === "audio" && isRecord(content.audio)) {
    mediaId = typeof content.audio.id === "string" ? content.audio.id : null;
    mimeType = typeof content.audio.mime_type === "string" ? content.audio.mime_type : "audio/ogg";
    filename = "audio.ogg";
  } else if (type === "sticker" && isRecord(content.sticker)) {
    mediaId = typeof content.sticker.id === "string" ? content.sticker.id : null;
    mimeType = typeof content.sticker.mime_type === "string" ? content.sticker.mime_type : "image/webp";
    filename = "sticker.webp";
  } else {
    return { error: "Message type does not contain downloadable media", status: 400 };
  }

  if (!mediaId) return { error: "Media ID not found in message", status: 400 };

  return { mediaId, mimeType, filename, caption, type, messageId: message.id };
}

async function streamMediaFromMeta(
  mediaId: string,
  mimeType: string,
  filename: string,
  config: ReturnType<typeof getWhatsAppConfig>,
  origin: string | null,
  download: boolean = false
): Promise<Response> {
  // Get media URL from Meta
  const mediaUrl = `${graphApiBase(config.apiVersion)}/${encodeURIComponent(mediaId)}`;
  const mediaResponse = await fetch(mediaUrl, {
    headers: { Authorization: `Bearer ${config.accessToken}` },
    signal: AbortSignal.timeout(15_000),
  });

  if (!mediaResponse.ok) {
    const errBody = await mediaResponse.json().catch(() => ({}));
    const details = isRecord(errBody) ? errBody.error : { message: "Failed to get media URL" };
    return jsonResponse(502, { error: "Failed to get media URL: " + (details?.message ?? "unknown error") }, origin);
  }

  const mediaData = await mediaResponse.json();
  const mediaDownloadUrl = isRecord(mediaData) && typeof mediaData.url === "string" ? mediaData.url : null;
  if (!mediaDownloadUrl) return jsonResponse(502, { error: "Media URL not found in Meta response" }, origin);

  // Download media with size limit
  const downloadResponse = await fetch(mediaDownloadUrl, {
    headers: { Authorization: `Bearer ${config.accessToken}` },
    signal: AbortSignal.timeout(30_000),
  });

  if (!downloadResponse.ok) return jsonResponse(502, { error: "Failed to download media" }, origin);

  const contentLength = downloadResponse.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_MEDIA_SIZE) {
    return jsonResponse(413, { error: "Media file exceeds size limit" }, origin);
  }

  const mediaBytes = await downloadResponse.arrayBuffer();
  if (mediaBytes.byteLength > MAX_MEDIA_SIZE) {
    return jsonResponse(413, { error: "Media file exceeds size limit" }, origin);
  }

  const actualMimeType = downloadResponse.headers.get("content-type") ?? mimeType;
  const disposition = download ? "attachment" : "inline";

  return new Response(new Uint8Array(mediaBytes), {
    status: 200,
    headers: {
      "Content-Type": actualMimeType,
      "Content-Disposition": `${disposition}; filename="${filename?.replace(/"/g, "") || "media"}"`,
      "Content-Length": mediaBytes.byteLength.toString(),
      "Cache-Control": "private, max-age=3600",
      ...corsHeaders(origin),
    },
  });
}

serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (request.method !== "GET") return jsonResponse(405, { error: "Method not allowed" }, origin);
  if (origin && !PUBLIC_ORIGINS.has(origin)) return jsonResponse(403, { error: "Origin is not allowed" }, origin);

  const url = new URL(request.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  
  // Handle token-based media access: /api/whatsapp/media/token/<token>
  if (pathParts.length >= 3 && pathParts[pathParts.length - 2] === "token") {
    const token = pathParts[pathParts.length - 1];
    const download = url.searchParams.get("download") === "true";
    
    // Parse token: payload.timestamp.signature
    const parts = token.split(".");
    if (parts.length !== 3) return jsonResponse(400, { error: "Invalid token format" }, origin);
    
    const [payloadB64, timestampStr] = parts;
    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp) || Date.now() - timestamp > 60 * 60 * 1000) {
      return jsonResponse(401, { error: "Token expired" }, origin);
    }
    
    let payload: { messageId: string; userId: string };
    try {
      payload = JSON.parse(atob(payloadB64));
    } catch {
      return jsonResponse(400, { error: "Invalid token payload" }, origin);
    }
    
    const valid = await verifyMediaToken(token, payload.messageId);
    if (!valid) return jsonResponse(401, { error: "Invalid token" }, origin);
    
    const credentials = getSupabaseCredentials();
    if (!credentials.url || !credentials.serviceRoleKey) {
      return jsonResponse(503, { error: "Service configuration unavailable" }, origin);
    }
    const supabase = createClient(credentials.url, credentials.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    
    const config = getWhatsAppConfig();
    if (!config.accessToken || !config.apiVersion || !/^v\d+\.\d+$/.test(config.apiVersion)) {
      return jsonResponse(503, { error: "WhatsApp API configuration incomplete" }, origin);
    }
    
    const mediaInfo = await getMessageMediaInfo(supabase, payload.messageId);
    if ("error" in mediaInfo) {
      return jsonResponse(mediaInfo.status, { error: mediaInfo.error }, origin);
    }
    
    return streamMediaFromMeta(mediaInfo.mediaId, mediaInfo.mimeType, mediaInfo.filename, config, origin, download);
  }
  
  // Handle legacy admin-authenticated media access: /api/whatsapp/media/<messageId>
  if (pathParts.length >= 2 && pathParts[pathParts.length - 2] === "media") {
    const messageId = pathParts[pathParts.length - 1];
    
    try {
      const { user, supabase } = await requireAdmin(request);
      
      const config = getWhatsAppConfig();
      if (!config.accessToken || !config.apiVersion || !/^v\d+\.\d+$/.test(config.apiVersion)) {
        return jsonResponse(503, { error: "WhatsApp API configuration incomplete" }, origin);
      }
      
      const mediaInfo = await getMessageMediaInfo(supabase, messageId);
      if ("error" in mediaInfo) {
        return jsonResponse(mediaInfo.status, { error: mediaInfo.error }, origin);
      }
      
      const download = url.searchParams.get("download") === "true";
      return streamMediaFromMeta(mediaInfo.mediaId, mediaInfo.mimeType, mediaInfo.filename, config, origin, download);
    } catch (error) {
      if (error instanceof Response) return error;
      const message = error instanceof Error ? error.message : "Media request failed";
      console.error(JSON.stringify({ event: "whatsapp_media_request_failed", error: message }));
      return jsonResponse(500, { error: "Media request failed" }, origin);
    }
  }
  
  return jsonResponse(404, { error: "Not found" }, origin);
  });