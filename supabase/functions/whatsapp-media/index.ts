import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getWhatsAppConfig,
  graphApiBase,
  isRecord,
  normalizeRecipient,
} from "../_shared/whatsapp.ts";

const MAX_MEDIA_SIZE = 50 * 1024 * 1024; // 50MB

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

serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (request.method !== "GET") return jsonResponse(405, { error: "Method not allowed" }, origin);
  if (origin && !PUBLIC_ORIGINS.has(origin)) return jsonResponse(403, { error: "Origin is not allowed" }, origin);

  try {
    const { user, supabase } = await requireAdmin(request);

    const url = new URL(request.url);
    const messageId = url.pathname.split("/").pop();
    if (!messageId) return jsonResponse(400, { error: "Message ID is required" }, origin);

    const { data: message, error } = await supabase.from("whatsapp_messages")
      .select("id, direction, recipient_phone, message_type, content, meta_message_id")
      .eq("id", messageId)
      .maybeSingle();

    if (error) return jsonResponse(500, { error: "Message not found" }, origin);
    if (!message) return jsonResponse(404, { error: "Message not found" }, origin);
    if (message.direction !== "inbound") return jsonResponse(403, { error: "Media can only be retrieved for inbound messages" }, origin);

    const content = message.content as Record<string, unknown> | null;
    if (!content) return jsonResponse(400, { error: "Message has no content" }, origin);

    let mediaId: string | null = null;
    let mimeType: string | null = null;
    let filename: string | null = null;

    const type = typeof message.message_type === "string" ? message.message_type : "";
    if (type === "image" && isRecord(content.image)) {
      mediaId = typeof content.image.id === "string" ? content.image.id : null;
      mimeType = typeof content.image.mime_type === "string" ? content.image.mime_type : "image/jpeg";
      filename = typeof content.image.caption === "string" && content.image.caption.length > 0
        ? content.image.caption.slice(0, 100) + ".jpg"
        : "image.jpg";
    } else if (type === "video" && isRecord(content.video)) {
      mediaId = typeof content.video.id === "string" ? content.video.id : null;
      mimeType = typeof content.video.mime_type === "string" ? content.video.mime_type : "video/mp4";
      filename = "video.mp4";
    } else if (type === "document" && isRecord(content.document)) {
      mediaId = typeof content.document.id === "string" ? content.document.id : null;
      mimeType = typeof content.document.mime_type === "string" ? content.document.mime_type : "application/octet-stream";
      filename = typeof content.document.filename === "string" ? content.document.filename : "document";
    } else if (type === "audio" && isRecord(content.audio)) {
      mediaId = typeof content.audio.id === "string" ? content.audio.id : null;
      mimeType = typeof content.audio.mime_type === "string" ? content.audio.mime_type : "audio/ogg";
      filename = "audio.ogg";
    } else if (type === "sticker" && isRecord(content.sticker)) {
      mediaId = typeof content.sticker.id === "string" ? content.sticker.id : null;
      mimeType = typeof content.sticker.mime_type === "string" ? content.sticker.mime_type : "image/webp";
      filename = "sticker.webp";
    } else {
      return jsonResponse(400, { error: "Message type does not contain downloadable media" }, origin);
    }

    if (!mediaId) return jsonResponse(400, { error: "Media ID not found in message" }, origin);

    const config = getWhatsAppConfig();
    if (!config.accessToken || !config.apiVersion || !/^v\d+\.\d+$/.test(config.apiVersion)) {
      return jsonResponse(503, { error: "WhatsApp API configuration incomplete" }, origin);
    }

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

    return new Response(new Uint8Array(mediaBytes), {
      status: 200,
      headers: {
        "Content-Type": actualMimeType,
        "Content-Disposition": `inline; filename="${filename?.replace(/"/g, "") || "media"}"`,
        "Content-Length": mediaBytes.byteLength.toString(),
        "Cache-Control": "private, max-age=3600",
        ...corsHeaders(origin),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Media request failed";
    console.error(JSON.stringify({ event: "whatsapp_media_request_failed", error: message }));
    return jsonResponse(500, { error: "Media request failed" }, origin);
  }
});