import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  errorDetails,
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
const MAX_REQUEST_BYTES = 64_000;

function isPublicWebhookUrl(value?: string): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "www.swiftgrowthdigital.com" && url.pathname === "/api/webhooks/whatsapp" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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

function requiredConfig(config: ReturnType<typeof getWhatsAppConfig>): string[] {
  const missing: string[] = [];
  if (!config.accessToken) missing.push("access_token");
  if (!config.phoneNumberId) missing.push("phone_number_id");
  if (!config.businessAccountId) missing.push("business_account_id");
  if (!config.verifyToken) missing.push("webhook_verify_token");
  if (!config.appSecret) missing.push("meta_app_secret");
  if (!config.apiVersion || !/^v\d+\.\d+$/.test(config.apiVersion)) missing.push("api_version");
  if (!isPublicWebhookUrl(config.webhookUrl)) missing.push("webhook_url");
  if (!config.workerSecret) missing.push("worker_secret");
  return missing;
}

async function graphRequest(url: string, token: string, init: RequestInit = {}): Promise<{ response: Response; body: unknown }> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    signal: AbortSignal.timeout(12_000),
  });
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { response, body };
}

async function getHealth(config: ReturnType<typeof getWhatsAppConfig>, supabase: ReturnType<typeof createClient>) {
  const missing = requiredConfig(config);
  const phone: Record<string, unknown> = { configured: Boolean(config.phoneNumberId), verified: false };
  let apiConnected = false;
  let apiError: Record<string, unknown> | null = null;
  if (config.accessToken && config.phoneNumberId && config.apiVersion && /^v\d+\.\d+$/.test(config.apiVersion)) {
    try {
      const url = `${graphApiBase(config.apiVersion)}/${encodeURIComponent(config.phoneNumberId)}?fields=id,display_phone_number,verified_name,quality_rating`;
      const { response, body } = await graphRequest(url, config.accessToken);
      apiConnected = response.ok && isRecord(body) && body.id === config.phoneNumberId;
      phone.verified = apiConnected;
      if (!apiConnected && isRecord(body)) apiError = errorDetails(body.error);
    } catch {
      apiError = { message: "Meta API could not be reached" };
    }
  }

  let webhookReachable = false;
  if (isPublicWebhookUrl(config.webhookUrl) && config.verifyToken && config.appSecret) {
    try {
      const callback = new URL(config.webhookUrl);
      if (callback.protocol === "https:") {
        callback.searchParams.set("hub.mode", "subscribe");
        callback.searchParams.set("hub.verify_token", "swiftgrowth-invalid-health-probe");
        callback.searchParams.set("hub.challenge", "swiftgrowth-health-check");
        const response = await fetch(callback, { method: "GET", signal: AbortSignal.timeout(7_000), redirect: "error" });
        const body = await response.text();
        webhookReachable = response.status === 403 && body.includes("Webhook verification failed");
      }
    } catch {
      webhookReachable = false;
    }
  }

  const [templatesResult, workerResult] = await Promise.all([
    supabase.from("whatsapp_templates").select("id", { count: "exact", head: true }).eq("status", "APPROVED"),
    supabase.from("whatsapp_worker_runs").select("status,started_at,completed_at").order("started_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const databaseReady = !templatesResult.error && !workerResult.error;
  if (!databaseReady) missing.push("database_schema");
  const lastWorkerRun = workerResult.data;
  const workerRecentlyActive = Boolean(lastWorkerRun?.status === "completed" && lastWorkerRun.completed_at && Date.now() - new Date(lastWorkerRun.completed_at).getTime() < 5 * 60_000);
  return {
    apiConnected,
    phoneNumberConfigured: phone.configured,
    phoneNumberVerified: phone.verified,
    businessAccountConfigured: Boolean(config.businessAccountId),
    webhookConfigured: Boolean(config.verifyToken && config.appSecret && isPublicWebhookUrl(config.webhookUrl)),
    webhookReachable,
    apiVersionValid: Boolean(config.apiVersion && /^v\d+\.\d+$/.test(config.apiVersion)),
    approvedTemplateCount: templatesResult.count ?? 0,
    databaseReady,
    workerSecretConfigured: Boolean(config.workerSecret),
    workerRecentlyActive,
    workerLastStatus: lastWorkerRun?.status ?? null,
    workerLastRunAt: lastWorkerRun?.completed_at ?? lastWorkerRun?.started_at ?? null,
    configurationComplete: missing.length === 0 && apiConnected && webhookReachable && databaseReady && workerRecentlyActive && (templatesResult.count ?? 0) > 0,
    missing,
    apiError,
  };
}

async function refreshTemplates(config: ReturnType<typeof getWhatsAppConfig>, supabase: ReturnType<typeof createClient>) {
  if (!config.accessToken || !config.businessAccountId || !config.apiVersion || !/^v\d+\.\d+$/.test(config.apiVersion)) {
    throw new Error("WhatsApp API configuration is incomplete");
  }
  const base = graphApiBase(config.apiVersion);
  let after: string | null = null;
  const templates: Record<string, unknown>[] = [];
  for (let page = 0; page < 20; page++) {
    const pageUrl = new URL(`${base}/${encodeURIComponent(config.businessAccountId)}/message_templates`);
    pageUrl.searchParams.set("fields", "id,name,language,status,category,components");
    pageUrl.searchParams.set("limit", "100");
    if (after) pageUrl.searchParams.set("after", after);
    const { response, body } = await graphRequest(pageUrl.toString(), config.accessToken);
    if (!response.ok || !isRecord(body)) throw new Error("Meta template list request failed");
    if (Array.isArray(body.data)) templates.push(...body.data.filter(isRecord));
    const paging = isRecord(body.paging) ? body.paging : null;
    const cursors = paging && isRecord(paging.cursors) ? paging.cursors : null;
    const nextAfter = cursors && typeof cursors.after === "string" ? cursors.after : null;
    after = paging && typeof paging.next === "string" ? nextAfter : null;
    if (!after) break;
  }

  const rows = templates
    .filter((template) => typeof template.name === "string" && typeof template.language === "string" && typeof template.status === "string")
    .map((template) => ({
      meta_template_id: typeof template.id === "string" ? template.id : null,
      waba_id: config.businessAccountId,
      name: template.name,
      language: template.language,
      namespace: typeof template.namespace === "string" ? template.namespace : null,
      category: typeof template.category === "string" ? template.category : null,
      status: template.status,
      components: Array.isArray(template.components) ? template.components : [],
      synced_at: new Date().toISOString(),
    }));
  for (let offset = 0; offset < rows.length; offset += 100) {
    const { error } = await supabase.from("whatsapp_templates").upsert(rows.slice(offset, offset + 100), { onConflict: "waba_id,name,language" });
    if (error) throw new Error("Approved WhatsApp templates could not be stored");
  }
  const { data, error } = await supabase.from("whatsapp_templates").select("id,name,language,namespace,category,status,components,synced_at").order("name").order("language");
  if (error) throw new Error("WhatsApp templates could not be loaded");
  return { synced: rows.length, templates: data ?? [] };
}

async function listContacts(supabase: ReturnType<typeof createClient>, page: number) {
  const pageSize = 100;
  const from = page * pageSize;
  const { data, count, error } = await supabase.from("leads")
    .select("id,name,business_type,city,whatsapp,whatsapp_opt_in,whatsapp_opt_in_at,whatsapp_opt_in_source,whatsapp_opt_out,whatsapp_opt_out_at,created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) throw new Error("WhatsApp contacts could not be loaded");
  return { contacts: data ?? [], total: count ?? 0, page, pageSize };
}

async function listConversations(supabase: ReturnType<typeof createClient>, page: number, pageSize: number) {
  const from = page * pageSize;
  const { data, count, error } = await supabase.from("whatsapp_conversations")
    .select("*", { count: "exact" })
    .order("last_message_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) throw new Error("WhatsApp conversations could not be loaded");
  return { conversations: data ?? [], total: count ?? 0, page, pageSize };
}

async function getConversation(supabase: ReturnType<typeof createClient>, phone: string, limit: number, before?: string) {
  const normalizedPhone = typeof phone === "string" ? normalizeRecipient(phone) : null;
  if (!normalizedPhone) throw new Error("Invalid phone number");
  const { data, error } = await supabase.rpc("get_whatsapp_conversation_messages", {
    p_phone: normalizedPhone,
    p_limit: limit,
    p_before: before ?? null,
  });
  if (error) throw new Error("Conversation messages could not be loaded");
  return { messages: data ?? [] };
}

function getMessagePreview(message: Record<string, unknown>): string {
  const type = typeof message.message_type === "string" ? message.message_type : "";
  const content = message.content as Record<string, unknown> | null;
  if (type === "text" && isRecord(content) && isRecord(content.text)) {
    const body = typeof content.text.body === "string" ? content.text.body : "";
    return body.length > 80 ? body.slice(0, 80) + "…" : body;
  }
  if (type === "image") return "📷 Image";
  if (type === "video") return "🎥 Video";
  if (type === "document") {
    const filename = isRecord(content) && isRecord(content.document) && typeof content.document.filename === "string"
      ? content.document.filename
      : "Document";
    return `📄 ${filename}`;
  }
  if (type === "audio") return "🎵 Audio";
  if (type === "sticker") return "🎭 Sticker";
  if (type === "location") return "📍 Location";
  if (type === "contacts") return "👤 Contact";
  if (type === "interactive") return "🔘 Interactive";
  if (type === "reaction") return "↩️ Reaction";
  return type || "Message";
}

async function sendReply(
  input: Record<string, unknown>,
  userId: string,
  config: ReturnType<typeof getWhatsAppConfig>,
  supabase: ReturnType<typeof createClient>,
) {
  const phone = typeof input.phone === "string" ? input.phone.trim() : "";
  const body = typeof input.body === "string" ? input.body.trim() : "";
  if (!phone || !body) throw new Error("Phone and message body are required");
  if (body.length > 4096) throw new Error("Message exceeds maximum length");

  const normalizedPhone = normalizeRecipient(phone);
  if (!normalizedPhone) throw new Error("Invalid recipient phone number");

  if (!config.accessToken || !config.phoneNumberId || !config.apiVersion || !/^v\d+\.\d+$/.test(config.apiVersion)) {
    throw new Error("WhatsApp API configuration is incomplete");
  }

  // Check 24-hour customer service window
  const { data: latestInbound, error: inboundError } = await supabase.from("whatsapp_messages")
    .select("created_at, meta_message_id")
    .eq("recipient_phone", normalizedPhone)
    .eq("direction", "inbound")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (inboundError) throw new Error("Failed to check conversation window");

  const now = new Date();
  const windowHours = 24;
  const windowMs = windowHours * 60 * 60 * 1000;
  let windowExpired = false;
  let latestInboundAt: string | null = null;

  if (latestInbound) {
    latestInboundAt = latestInbound.created_at;
    const inboundTime = new Date(latestInbound.created_at).getTime();
    if (now.getTime() - inboundTime > windowMs) {
      windowExpired = true;
    }
  } else {
    // No inbound messages = window expired (no conversation context)
    windowExpired = true;
  }

  if (windowExpired) {
    throw new Error(
      "Customer service window has expired. Free-form text replies are not allowed. " +
      "Use an approved WhatsApp template via the Campaigns tab."
    );
  }

  // Find or create lead for this phone
  const local = normalizedPhone.slice(-10);
  const candidates = [...new Set([normalizedPhone, local, `+${normalizedPhone}`, `+91${local}`, `91${local}`])];
  const { data: lead, error: leadError } = await supabase.from("leads")
    .select("id, name")
    .in("whatsapp", candidates)
    .limit(1)
    .maybeSingle();
  if (leadError) throw new Error("Lead lookup failed");

  const leadId = lead?.id ?? null;

  // Insert outbound message record first
  const requestBody = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalizedPhone,
    type: "text",
    text: { body: input.body },
  };

  const { data: message, error: insertError } = await supabase.from("whatsapp_messages").insert({
    direction: "outbound",
    recipient_phone: normalizedPhone,
    contact_name: lead?.name ?? null,
    lead_id: leadId,
    message_type: "text",
    content: { text: { body: input.body } },
    status: "sending",
    request_metadata: requestBody,
    meta_timestamp: new Date().toISOString(),
  }).select("id").single();

  if (insertError || !message) throw new Error("Outbound message could not be recorded");

  // Send via Meta Graph API
  let apiResponse: Response;
  let apiBody: unknown;
  try {
    apiResponse = await fetch(`${graphApiBase(config.apiVersion)}/${encodeURIComponent(config.phoneNumberId)}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(20_000),
    });
    try {
      apiBody = await apiResponse.json();
    } catch {
      apiBody = null;
    }
  } catch {
    await supabase.from("whatsapp_messages").update({
      status: "failed",
      error_metadata: { reason: "network_error", message: "Network error sending message" },
    }).eq("id", message.id);
    throw new Error("Network error sending message");
  }

  if (!apiResponse.ok) {
    const details = isRecord(apiBody) ? errorDetails(apiBody.error) : { message: "Meta API rejected the message" };
    await supabase.from("whatsapp_messages").update({
      status: "failed",
      error_metadata: details,
      response_metadata: { http_status: apiResponse.status },
    }).eq("id", message.id);
    throw new Error("Meta API rejected the message: " + (details.message ?? "unknown error"));
  }

  const messages = isRecord(apiBody) && Array.isArray(apiBody.messages) ? apiBody.messages : [];
  const metaMessageId = isRecord(messages[0]) && typeof messages[0].id === "string" ? messages[0].id : null;
  if (!metaMessageId) {
    await supabase.from("whatsapp_messages").update({
      status: "failed",
      error_metadata: { reason: "missing_meta_message_id", message: "Meta response missing message ID" },
      response_metadata: { http_status: apiResponse.status },
    }).eq("id", message.id);
    throw new Error("Meta response missing message ID");
  }

  const responseMetadata: Record<string, unknown> = { http_status: apiResponse.status };
  const acceptedContacts = isRecord(apiBody) && Array.isArray(apiBody.contacts) ? apiBody.contacts : null;
  if (acceptedContacts) responseMetadata.contact_count = acceptedContacts.length;
  if (isRecord(messages[0]) && typeof messages[0].message_status === "string") {
    responseMetadata.message_status = messages[0].message_status;
  }

  const { error: updateError } = await supabase.from("whatsapp_messages").update({
    meta_message_id: metaMessageId,
    status: "sent",
    meta_timestamp: new Date().toISOString(),
    response_metadata: responseMetadata,
  }).eq("id", message.id);

  if (updateError) throw new Error("Message sent but state could not be updated");

  if (leadId) {
    await supabase.from("leads").update({ whatsapp_last_message_at: new Date().toISOString() }).eq("id", leadId);
  }

  return { 
    messageId: message.id, 
    metaMessageId, 
    status: "sent",
    windowExpiresAt: latestInboundAt ? new Date(new Date(latestInboundAt).getTime() + windowMs).toISOString() : null
  };
}

async function getMedia(
  input: Record<string, unknown>,
  config: ReturnType<typeof getWhatsAppConfig>,
  supabase: ReturnType<typeof createClient>,
) {
  const messageId = typeof input.messageId === "string" ? input.messageId : "";
  if (!messageId) throw new Error("Message ID is required");

  const { data: message, error } = await supabase.from("whatsapp_messages")
    .select("id, direction, recipient_phone, message_type, content, meta_message_id")
    .eq("id", messageId)
    .maybeSingle();

  if (error) throw new Error("Message not found");
  if (!message) throw new Error("Message not found");
  if (message.direction !== "inbound") throw new Error("Media can only be retrieved for inbound messages");

  const content = message.content as Record<string, unknown> | null;
  if (!content) throw new Error("Message has no content");

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
    throw new Error("Message type does not contain downloadable media");
  }

  if (!mediaId) throw new Error("Media ID not found in message");

  if (!config.accessToken || !config.apiVersion || !/^v\d+\.\d+$/.test(config.apiVersion)) {
    throw new Error("WhatsApp API configuration incomplete");
  }

  // Get media URL from Meta
  const mediaUrl = `${graphApiBase(config.apiVersion)}/${encodeURIComponent(mediaId)}`;
  const mediaResponse = await fetch(mediaUrl, {
    headers: { Authorization: `Bearer ${config.accessToken}` },
    signal: AbortSignal.timeout(15_000),
  });

  if (!mediaResponse.ok) {
    const errBody = await mediaResponse.json().catch(() => ({}));
    const details = isRecord(errBody) ? errorDetails(errBody.error) : { message: "Failed to get media URL" };
    throw new Error("Failed to get media URL: " + (details.message ?? "unknown error"));
  }

  const mediaData = await mediaResponse.json();
  const mediaDownloadUrl = isRecord(mediaData) && typeof mediaData.url === "string" ? mediaData.url : null;
  if (!mediaDownloadUrl) throw new Error("Media URL not found in Meta response");

  // Download media with size limit
  const downloadResponse = await fetch(mediaDownloadUrl, {
    headers: { Authorization: `Bearer ${config.accessToken}` },
    signal: AbortSignal.timeout(30_000),
  });

  if (!downloadResponse.ok) throw new Error("Failed to download media");

  const contentLength = downloadResponse.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_MEDIA_SIZE) {
    throw new Error("Media file exceeds size limit");
  }

  const mediaBytes = await downloadResponse.arrayBuffer();
  if (mediaBytes.byteLength > MAX_MEDIA_SIZE) {
    throw new Error("Media file exceeds size limit");
  }

  const actualMimeType = downloadResponse.headers.get("content-type") ?? mimeType;

  return new Response(new Uint8Array(mediaBytes), {
    status: 200,
    headers: {
      "Content-Type": actualMimeType,
      "Content-Disposition": `inline; filename="${filename?.replace(/"/g, "") || "media"}"`,
      "Content-Length": mediaBytes.byteLength.toString(),
      "Cache-Control": "private, max-age=3600",
    },
  });
}

async function markRead(
  input: Record<string, unknown>,
  config: ReturnType<typeof getWhatsAppConfig>,
  supabase: ReturnType<typeof createClient>,
) {
  const phone = typeof input.phone === "string" ? input.phone.trim() : "";
  const normalizedPhone = phone ? normalizeRecipient(phone) : null;
  if (!normalizedPhone) throw new Error("Valid phone number is required");

  if (!config.accessToken || !config.phoneNumberId || !config.apiVersion || !/^v\d+\.\d+$/.test(config.apiVersion)) {
    throw new Error("WhatsApp API configuration is incomplete");
  }

  // Get the latest unread inbound message for this phone
  const { data: latestUnread, error: unreadError } = await supabase.from("whatsapp_messages")
    .select("id, meta_message_id, created_at")
    .eq("recipient_phone", normalizedPhone)
    .eq("direction", "inbound")
    .eq("status", "received")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (unreadError) throw new Error("Failed to find unread messages");
  if (!latestUnread || !latestUnread.meta_message_id) {
    // No unread messages with valid Meta message ID - just update local status
    const { error: localError } = await supabase.from("whatsapp_messages")
      .update({ status: "read" })
      .eq("recipient_phone", normalizedPhone)
      .eq("direction", "inbound")
      .eq("status", "received");
    if (localError) throw new Error("Messages could not be marked as read locally");
    return { updated: true, metaRead: false, reason: "no_meta_message_id" };
  }

  // Call Meta Graph API to mark as read
  const markReadUrl = `${graphApiBase(config.apiVersion)}/${encodeURIComponent(config.phoneNumberId)}/messages`;
  let metaResponse: Response;
  try {
    metaResponse = await fetch(markReadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: latestUnread.meta_message_id,
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // Meta API unavailable - update locally but report failure
    const { error: localError } = await supabase.from("whatsapp_messages")
      .update({ status: "read" })
      .eq("recipient_phone", normalizedPhone)
      .eq("direction", "inbound")
      .eq("status", "received");
    if (localError) throw new Error("Messages could not be marked as read locally");
    return { updated: true, metaRead: false, reason: "meta_api_unavailable" };
  }

  if (!metaResponse.ok) {
    const errorBody = await metaResponse.json().catch(() => ({}));
    const details = isRecord(errorBody) ? errorDetails(errorBody.error) : { message: "Meta mark-read failed" };
    // Update locally anyway since admin has seen the message
    const { error: localError } = await supabase.from("whatsapp_messages")
      .update({ status: "read" })
      .eq("recipient_phone", normalizedPhone)
      .eq("direction", "inbound")
      .eq("status", "received");
    if (localError) throw new Error("Messages could not be marked as read locally");
    return { 
      updated: true, 
      metaRead: false, 
      reason: "meta_api_rejected",
      metaError: details.message ?? "Meta mark-read rejected"
    };
  }

  // Meta succeeded - update local status
  const { error: localError } = await supabase.from("whatsapp_messages")
    .update({ status: "read" })
    .eq("recipient_phone", normalizedPhone)
    .eq("direction", "inbound")
    .eq("status", "received");
  if (localError) throw new Error("Messages could not be marked as read locally");

  return { updated: true, metaRead: true };
}

function validComponents(value: unknown): value is Record<string, unknown>[] {
  if (value === undefined || value === null) return true;
  if (!Array.isArray(value) || value.length > 10) return false;
  const allowedComponents = new Set(["header", "body", "button"]);
  const allowedParameters = new Set(["text", "currency", "date_time", "image", "video", "document", "location", "payload"]);
  return value.every((component) => {
    if (!isRecord(component) || typeof component.type !== "string" || !allowedComponents.has(component.type.toLowerCase())) return false;
    if (component.parameters === undefined) return true;
    return Array.isArray(component.parameters) && component.parameters.length <= 100 && component.parameters.every((parameter) =>
      isRecord(parameter) && typeof parameter.type === "string" && allowedParameters.has(parameter.type.toLowerCase())
    );
  });
}

async function createCampaign(
  input: Record<string, unknown>,
  userId: string,
  supabase: ReturnType<typeof createClient>,
) {
  const name = typeof input.name === "string" ? input.name.trim().slice(0, 120) : "";
  const templateId = typeof input.templateId === "string" ? input.templateId : "";
  const requestedIds = Array.isArray(input.contactIds) ? input.contactIds : [];
  const idsAreValid = requestedIds.every((id) => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id));
  const selectedIds = idsAreValid ? [...new Set(requestedIds as string[])] : [];
  if (!name || !templateId || !idsAreValid || selectedIds.length === 0 || selectedIds.length > 5000) {
    throw new Error("Choose a campaign name, an approved template, and between 1 and 5,000 eligible contacts");
  }
  if (!validComponents(input.components)) throw new Error("Template components must be valid JSON matching the Meta template component format");

  const { data: template, error: templateError } = await supabase.from("whatsapp_templates")
    .select("id,name,language,status,waba_id")
    .eq("id", templateId)
    .eq("status", "APPROVED")
    .maybeSingle();
  if (templateError || !template) throw new Error("Select a template currently approved in Meta WhatsApp Manager");

  const contacts: Record<string, unknown>[] = [];
  for (let offset = 0; offset < selectedIds.length; offset += 500) {
    const { data, error } = await supabase.from("leads")
      .select("id,whatsapp,whatsapp_opt_in,whatsapp_opt_in_at,whatsapp_opt_in_source,whatsapp_opt_out")
      .in("id", selectedIds.slice(offset, offset + 500))
      .eq("whatsapp_opt_in", true)
      .eq("whatsapp_opt_out", false)
      .not("whatsapp_opt_in_at", "is", null)
      .not("whatsapp_opt_in_source", "is", null);
    if (error) throw new Error("Recipient consent could not be verified");
    contacts.push(...(data ?? []).filter((contact) => typeof contact.whatsapp_opt_in_source === "string" && contact.whatsapp_opt_in_source.trim().length > 0));
  }
  if (contacts.length !== selectedIds.length) throw new Error("Every campaign recipient must be a lead with recorded WhatsApp marketing consent");

  const { data: campaign, error: campaignError } = await supabase.from("whatsapp_campaigns").insert({
    name,
    template_id: templateId,
    template_components: input.components ?? [],
    status: "queued",
    created_by: userId,
  }).select("id").single();
  if (campaignError || !campaign) throw new Error("WhatsApp campaign could not be created");

  const recipients = contacts.map((contact) => {
    const number = typeof contact.whatsapp === "string" ? normalizeRecipient(contact.whatsapp) : null;
    return {
      campaign_id: campaign.id,
      lead_id: contact.id,
      recipient_phone: number || String(contact.whatsapp || ""),
      status: number ? "queued" : "failed",
      failure_reason: number ? null : "Invalid recipient number; use a valid country code and phone number",
      ...(!number ? { failed_at: new Date().toISOString() } : {}),
    };
  });
  for (let offset = 0; offset < recipients.length; offset += 500) {
    const { error } = await supabase.from("whatsapp_campaign_recipients").insert(recipients.slice(offset, offset + 500));
    if (error) {
      await supabase.from("whatsapp_campaigns").delete().eq("id", campaign.id);
      throw new Error("WhatsApp campaign recipients could not be queued");
    }
  }
  const queued = recipients.filter((recipient) => recipient.status === "queued").length;
  if (queued === 0) {
    await supabase.from("whatsapp_campaigns").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", campaign.id);
  }
  return { campaignId: campaign.id, totalRecipients: recipients.length, queued, failed: recipients.length - queued };
}

async function handleAction(
  input: Record<string, unknown>,
  user: { id: string },
  supabase: ReturnType<typeof createClient>,
) {
  const action = input.action;
  const config = getWhatsAppConfig();
  if (action === "health") return getHealth(config, supabase);
  if (action === "refresh_templates") return refreshTemplates(config, supabase);

  if (action === "list_templates") {
    const { data, error } = await supabase.from("whatsapp_templates").select("id,name,language,namespace,category,status,components,synced_at").order("name").order("language");
    if (error) throw new Error("WhatsApp templates could not be loaded");
    return { templates: data ?? [] };
  }
  if (action === "list_contacts") {
    const page = typeof input.page === "number" && Number.isInteger(input.page) ? Math.max(0, Math.min(10_000, input.page)) : 0;
    return listContacts(supabase, page);
  }
  if (action === "update_contact_consent") {
    const leadId = typeof input.leadId === "string" ? input.leadId : "";
    const optIn = input.optIn === true;
    const source = typeof input.consentSource === "string" ? input.consentSource.trim().slice(0, 250) : "";
    if (!leadId || (optIn && !source)) throw new Error("An evidence source is required to record WhatsApp opt-in");
    const update = optIn
      ? { whatsapp_opt_in: true, whatsapp_opt_in_at: new Date().toISOString(), whatsapp_opt_in_source: source, whatsapp_opt_out: false, whatsapp_opt_out_at: null }
      : { whatsapp_opt_in: false, whatsapp_opt_in_at: null, whatsapp_opt_in_source: null, whatsapp_opt_out: true, whatsapp_opt_out_at: new Date().toISOString() };
    const { error } = await supabase.from("leads").update(update).eq("id", leadId);
    if (error) throw new Error("WhatsApp contact consent could not be updated");
    return { updated: true };
  }
  if (action === "create_campaign") return createCampaign(input, user.id, supabase);
  if (action === "list_campaigns") {
    const { data, error } = await supabase.from("whatsapp_campaign_analytics").select("*").order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error("Campaign analytics could not be loaded");
    return { campaigns: data ?? [] };
  }
  if (action === "list_messages") {
    const { data, error } = await supabase.from("whatsapp_messages")
      .select("id,campaign_id,lead_id,direction,recipient_phone,contact_name,message_type,content,status,meta_message_id,meta_timestamp,error_metadata,created_at")
      .order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error("WhatsApp messages could not be loaded");
    return { messages: data ?? [] };
  }
  if (action === "list_webhook_events") {
    const { data, error } = await supabase.from("whatsapp_webhook_events")
      .select("id,event_type,meta_message_id,message_status,event_timestamp,metadata,received_at,processed_at")
      .order("received_at", { ascending: false }).limit(200);
    if (error) throw new Error("WhatsApp webhook events could not be loaded");
    return { events: data ?? [] };
  }
  if (action === "list_conversations") {
    const page = typeof input.page === "number" && Number.isInteger(input.page) ? Math.max(0, Math.min(10_000, input.page)) : 0;
    const pageSize = typeof input.pageSize === "number" && Number.isInteger(input.pageSize) ? Math.min(Math.max(1, input.pageSize), 100) : 30;
    return listConversations(supabase, page, pageSize);
  }
  if (action === "get_conversation") {
    const phone = typeof input.phone === "string" ? input.phone : "";
    const limit = typeof input.limit === "number" && Number.isInteger(input.limit) ? Math.min(Math.max(1, input.limit), 200) : 50;
    const before = typeof input.before === "string" ? input.before : undefined;
    return getConversation(supabase, phone, limit, before);
  }
  if (action === "send_reply") {
    const config = getWhatsAppConfig();
    return sendReply(input, user.id, config, supabase);
  }
  if (action === "get_media") {
    const config = getWhatsAppConfig();
    return getMedia(input, config, supabase);
  }
  if (action === "mark_read") {
    const config = getWhatsAppConfig();
    return markRead(input, config, supabase);
  }
  throw new Error("Unsupported WhatsApp management action");
}

serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (request.method !== "POST") return jsonResponse(405, { error: "Method not allowed" }, origin);
  if (origin && !PUBLIC_ORIGINS.has(origin)) return jsonResponse(403, { error: "Origin is not allowed" }, origin);
  const length = Number(request.headers.get("content-length") || "0");
  if (length > MAX_REQUEST_BYTES) return jsonResponse(413, { error: "Request payload is too large" }, origin);

  try {
    const rawBody = await request.arrayBuffer();
    if (rawBody.byteLength > MAX_REQUEST_BYTES) return jsonResponse(413, { error: "Request payload is too large" }, origin);
    const input: unknown = JSON.parse(new TextDecoder().decode(rawBody));
    if (!isRecord(input)) return jsonResponse(400, { error: "Invalid request" }, origin);
    const { user, supabase } = await requireAdmin(request);
    const result = await handleAction(input, user, supabase);
    if (result instanceof Response) return result;
    return jsonResponse(200, { success: true, ...result }, origin);
  } catch (error) {
    if (error instanceof Response) return jsonResponse(error.status, { error: await error.text() }, origin);
    const message = error instanceof Error ? error.message : "WhatsApp request failed";
    console.error(JSON.stringify({ event: "whatsapp_admin_action_failed", action: "request", error: message }));
    const status = /configuration is incomplete|Choose a campaign|Select a template|components must be valid|Every campaign recipient|evidence source|recipient number/i.test(message) ? 400 : 500;
    return jsonResponse(status, { error: status === 400 ? message : "WhatsApp operation could not be completed" }, origin);
  }
});
