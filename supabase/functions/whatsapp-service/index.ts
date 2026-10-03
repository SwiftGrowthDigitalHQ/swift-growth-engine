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
const MAX_UPLOAD_FILE_SIZE = 16 * 1024 * 1024; // Keep base64 uploads within the Edge Function memory budget.

const MEDIA_LIMITS: Record<string, { maxSize: number; allowedMimeTypes: string[]; allowedExtensions: string[] }> = {
  image: { maxSize: 5 * 1024 * 1024, allowedMimeTypes: ["image/jpeg", "image/png"], allowedExtensions: [".jpg", ".jpeg", ".png"] },
  video: { maxSize: 16 * 1024 * 1024, allowedMimeTypes: ["video/mp4", "video/3gpp", "video/quicktime"], allowedExtensions: [".mp4", ".3gp", ".mov"] },
  audio: { maxSize: 16 * 1024 * 1024, allowedMimeTypes: ["audio/ogg", "audio/mp4", "audio/mpeg", "audio/amr", "audio/wav"], allowedExtensions: [".ogg", ".m4a", ".mp3", ".amr", ".wav"] },
  document: { maxSize: MAX_UPLOAD_FILE_SIZE, allowedMimeTypes: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "text/plain"], allowedExtensions: [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt"] },
};

const PUBLIC_ORIGINS = new Set([
  "https://www.swiftgrowthdigital.com",
  "https://swiftgrowthdigital.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);
const MAX_REQUEST_BYTES = 64_000;
const MAX_UPLOAD_REQUEST_BYTES = Math.ceil(MAX_UPLOAD_FILE_SIZE / 3) * 4 + MAX_REQUEST_BYTES;

async function readRequestBody(request: Request, maxBytes: number): Promise<Uint8Array | null> {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

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

async function listConversations(supabase: ReturnType<typeof createClient>, page: number, pageSize: number, search?: string, cursor?: string) {
  let query = supabase.from("whatsapp_conversations")
    .select("*", { count: "exact" })
    .order("last_message_at", { ascending: false })
    .order("recipient_phone", { ascending: false })
    .limit(pageSize + 1);

  if (cursor) {
    const [cursorTime, cursorPhone] = cursor.split("|");
    if (cursorTime && cursorPhone) {
      query = query.or(`last_message_at.lt.${cursorTime},and(last_message_at.eq.${cursorTime},recipient_phone.lt.${cursorPhone})`);
    }
  }

  if (search && search.trim()) {
    const term = search.trim();
    query = query.or(`recipient_phone.ilike.%${term}%,lead_name.ilike.%${term}%,contact_name.ilike.%${term}%,lead_business_type.ilike.%${term}%,lead_city.ilike.%${term}%`);
  }

  const { data, count, error } = await query;
  if (error) throw new Error("WhatsApp conversations could not be loaded");

  const conversations = (data ?? []).slice(0, pageSize);
  const hasMore = (data ?? []).length > pageSize;
  let nextCursor: string | null = null;
  if (hasMore && conversations.length > 0) {
    const last = conversations[conversations.length - 1];
    nextCursor = `${last.last_message_at}|${last.recipient_phone}`;
  }

  return { conversations, total: count ?? 0, nextCursor, hasMore };
}

async function getConversation(supabase: ReturnType<typeof createClient>, phone: string, limit: number, before?: string) {
  const normalizedPhone = typeof phone === "string" ? normalizeRecipient(phone) : null;
  if (!normalizedPhone) throw new Error("Invalid phone number");

  const query = supabase.rpc("get_whatsapp_conversation_messages", {
    p_phone: normalizedPhone,
    p_limit: limit,
    p_before: before ?? null,
  });

  const { data, error } = await query;
  if (error) throw new Error("Conversation messages could not be loaded");

  const messages = (data ?? []).reverse();
  const hasMore = messages.length === limit;
  let nextCursor: string | null = null;
  if (hasMore && messages.length > 0) {
    const oldest = messages[0];
    nextCursor = `${oldest.created_at}|${oldest.id}`;
  }

  return { messages, hasMore, nextCursor };
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
  const replyToMessageId = typeof input.replyToMessageId === "string" ? input.replyToMessageId : undefined;
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
    windowExpired = true;
  }

  if (windowExpired) {
    throw new Error(
      "Customer service window has expired. Free-form text replies are not allowed. " +
      "Use an approved WhatsApp template via the Campaigns tab."
    );
  }

  // Find or create lead for this phone using whatsapp_normalized for consistency with webhook
  const { data: lead, error: leadError } = await supabase.from("leads")
    .select("id, name")
    .eq("whatsapp_normalized", normalizedPhone)
    .maybeSingle();
  if (leadError) throw new Error("Lead lookup failed");

  const leadId = lead?.id ?? null;

  // Insert outbound message record first
  const requestBody: Record<string, unknown> = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalizedPhone,
    type: "text",
    text: { body: input.body },
  };

  if (replyToMessageId) {
    requestBody.context = { message_id: replyToMessageId };
  }

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

async function validateMediaFile(file: { name: string; type: string; size: number }, mediaType: string): Promise<{ valid: boolean; error?: string }> {
  const limits = MEDIA_LIMITS[mediaType];
  if (!limits) return { valid: false, error: `Unsupported media type: ${mediaType}` };

  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
  if (!limits.allowedExtensions.includes(extension)) {
    return { valid: false, error: `Invalid file extension for ${mediaType}. Allowed: ${limits.allowedExtensions.join(", ")}` };
  }

  if (!limits.allowedMimeTypes.includes(file.type)) {
    return { valid: false, error: `Invalid MIME type for ${mediaType}. Allowed: ${limits.allowedMimeTypes.join(", ")}` };
  }

  if (file.size > limits.maxSize) {
    return { valid: false, error: `File size exceeds limit for ${mediaType}. Max: ${Math.round(limits.maxSize / 1024 / 1024)} MB` };
  }

  return { valid: true };
}

async function uploadMediaToMeta(
  file: Uint8Array,
  mimeType: string,
  filename: string,
  config: ReturnType<typeof getWhatsAppConfig>,
): Promise<string> {
  if (!config.accessToken || !config.phoneNumberId || !config.apiVersion || !/^v\d+\.\d+$/.test(config.apiVersion)) {
    throw new Error("WhatsApp API configuration is incomplete");
  }

  const formData = new FormData();
  const blob = new Blob([file], { type: mimeType });
  formData.append("file", blob, filename);
  formData.append("messaging_product", "whatsapp");
  formData.append("type", mimeType);

  const response = await fetch(`${graphApiBase(config.apiVersion)}/${encodeURIComponent(config.phoneNumberId)}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.accessToken}` },
    body: formData,
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const details = isRecord(errorBody) ? errorDetails(errorBody.error) : { message: "Media upload failed" };
    throw new Error("Media upload failed: " + (details.message ?? "unknown error"));
  }

  const body = await response.json();
  if (!isRecord(body) || typeof body.id !== "string") {
    throw new Error("Media upload response missing media ID");
  }

  return body.id;
}

async function sendMediaMessage(
  input: Record<string, unknown>,
  userId: string,
  config: ReturnType<typeof getWhatsAppConfig>,
  supabase: ReturnType<typeof createClient>,
) {
  const phone = typeof input.phone === "string" ? input.phone.trim() : "";
  const mediaType = typeof input.mediaType === "string" ? input.mediaType : "";
  const mediaId = typeof input.mediaId === "string" ? input.mediaId : "";
  const caption = typeof input.caption === "string" ? input.caption.trim() : "";
  const filename = typeof input.filename === "string" ? input.filename : "";
  const mimeType = typeof input.mimeType === "string" ? input.mimeType : "";
  const replyToMessageId = typeof input.replyToMessageId === "string" ? input.replyToMessageId : undefined;

  if (!phone || !mediaType || !mediaId) throw new Error("Phone, media type, and media ID are required");

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
    windowExpired = true;
  }

  if (windowExpired) {
    throw new Error(
      "Customer service window has expired. Free-form media replies are not allowed. " +
      "Use an approved WhatsApp template via the Campaigns tab."
    );
  }

  // Find or create lead for this phone using whatsapp_normalized for consistency with webhook
  const { data: lead, error: leadError } = await supabase.from("leads")
    .select("id, name")
    .eq("whatsapp_normalized", normalizedPhone)
    .maybeSingle();
  if (leadError) throw new Error("Lead lookup failed");

  const leadId = lead?.id ?? null;

  let content: Record<string, unknown>;
  let requestBody: Record<string, unknown>;

  if (mediaType === "image") {
    content = { image: { id: mediaId, caption, mime_type: mimeType } };
    requestBody = { messaging_product: "whatsapp", recipient_type: "individual", to: normalizedPhone, type: "image", image: { id: mediaId, caption } };
  } else if (mediaType === "video") {
    content = { video: { id: mediaId, caption, mime_type: mimeType } };
    requestBody = { messaging_product: "whatsapp", recipient_type: "individual", to: normalizedPhone, type: "video", video: { id: mediaId, caption } };
  } else if (mediaType === "document") {
    content = { document: { id: mediaId, filename, caption, mime_type: mimeType } };
    requestBody = { messaging_product: "whatsapp", recipient_type: "individual", to: normalizedPhone, type: "document", document: { id: mediaId, filename, caption } };
  } else if (mediaType === "audio") {
    content = { audio: { id: mediaId, mime_type: mimeType } };
    requestBody = { messaging_product: "whatsapp", recipient_type: "individual", to: normalizedPhone, type: "audio", audio: { id: mediaId } };
  } else {
    throw new Error(`Unsupported media type: ${mediaType}`);
  }

  if (replyToMessageId) {
    requestBody.context = { message_id: replyToMessageId };
  }

  // Insert outbound message record first
  const { data: message, error: insertError } = await supabase.from("whatsapp_messages").insert({
    direction: "outbound",
    recipient_phone: normalizedPhone,
    contact_name: lead?.name ?? null,
    lead_id: leadId,
    message_type: mediaType,
    content,
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
    windowExpiresAt: latestInboundAt ? new Date(new Date(latestInboundAt).getTime() + windowMs).toISOString() : null,
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

async function listWebhookEvents(supabase: ReturnType<typeof createClient>, page: number, pageSize: number, eventType?: string, messageStatus?: string, search?: string) {
  const from = page * pageSize;
  let query = supabase.from("whatsapp_webhook_events")
    .select("id,event_type,meta_message_id,message_status,event_timestamp,metadata,received_at,processed_at", { count: "exact" })
    .order("received_at", { ascending: false });

  if (eventType) query = query.eq("event_type", eventType);
  if (messageStatus) query = query.eq("message_status", messageStatus);
  if (search && search.trim()) {
    query = query.ilike("meta_message_id", `%${search.trim()}%`);
  }

  const { data, count, error } = await query.range(from, from + pageSize - 1);
  if (error) throw new Error("WhatsApp webhook events could not be loaded");
  return { events: data ?? [], total: count ?? 0, page, pageSize };
}

// Batch management functions
async function listBatches(supabase: ReturnType<typeof createClient>, page: number, pageSize: number, search?: string) {
  const from = page * pageSize;
  let query = supabase.from("contact_batches")
    .select("id,name,slug,description,is_active,created_by,created_at,updated_at", { count: "exact" })
    .order("created_at", { ascending: false });

  if (search && search.trim()) {
    query = query.or(`name.ilike.%${search.trim()}%,slug.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%`);
  }

  const { data, count, error } = await query.range(from, from + pageSize - 1);
  if (error) throw new Error("Contact batches could not be loaded");
  return { batches: data ?? [], total: count ?? 0, page, pageSize };
}

async function getBatch(supabase: ReturnType<typeof createClient>, batchId: string) {
  const { data, error } = await supabase.from("contact_batches")
    .select("id,name,slug,description,is_active,created_by,created_at,updated_at")
    .eq("id", batchId)
    .maybeSingle();
  if (error) throw new Error("Batch could not be loaded");
  if (!data) throw new Error("Batch not found");
  return { batch: data };
}

async function getBatchStats(supabase: ReturnType<typeof createClient>, batchId: string) {
  const { data, error } = await supabase.rpc("get_contact_batch_stats", { p_batch_id: batchId });
  if (error) throw new Error("Batch stats could not be loaded");
  return { stats: data?.[0] ?? {} };
}

async function getBatchMembers(supabase: ReturnType<typeof createClient>, batchId: string, page: number, pageSize: number, search?: string) {
  const from = page * pageSize;
  let query = supabase.from("contact_batch_members")
    .select(`
      lead_id,
      created_at,
      leads!inner (
        id,
        name,
        business_type,
        city,
        whatsapp,
        whatsapp_opt_in,
        whatsapp_opt_in_at,
        whatsapp_opt_in_source,
        whatsapp_opt_out,
        whatsapp_opt_out_at,
        source,
        status,
        created_at
      )
    `, { count: "exact" })
    .eq("batch_id", batchId)
    .order("created_at", { ascending: false });

  if (search && search.trim()) {
    const term = search.trim();
    query = query.or(`leads.name.ilike.%${term}%,leads.whatsapp.ilike.%${term}%,leads.business_type.ilike.%${term}%,leads.city.ilike.%${term}%`);
  }

  const { data, count, error } = await query.range(from, from + pageSize - 1);
  if (error) throw new Error("Batch members could not be loaded");
  const members = (data ?? []).map((row: Record<string, unknown>) => ({
    lead_id: row.lead_id,
    added_at: row.created_at,
    ...row.leads as Record<string, unknown>
  }));
  return { members, total: count ?? 0, page, pageSize };
}

async function createBatch(
  input: Record<string, unknown>,
  userId: string,
  supabase: ReturnType<typeof createClient>,
) {
  const name = typeof input.name === "string" ? input.name.trim().slice(0, 120) : "";
  const slug = typeof input.slug === "string" ? input.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 80) : "";
  const description = typeof input.description === "string" ? input.description.trim().slice(0, 500) : "";
  const isActive = input.isActive === true;

  if (!name || !slug) throw new Error("Batch name and slug are required");
  if (slug.length < 2) throw new Error("Slug must be at least 2 characters");

  const { data: existing } = await supabase.from("contact_batches").select("id").eq("slug", slug).maybeSingle();
  if (existing) throw new Error("A batch with this slug already exists");

  const { data, error } = await supabase.from("contact_batches").insert({
    name,
    slug,
    description: description || null,
    is_active: isActive,
    created_by: userId,
  }).select("id,name,slug,description,is_active,created_by,created_at,updated_at").single();
  if (error) throw new Error("Batch could not be created");
  return { batch: data };
}

async function updateBatch(
  input: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>,
) {
  const batchId = typeof input.batchId === "string" ? input.batchId : "";
  const name = typeof input.name === "string" ? input.name.trim().slice(0, 120) : "";
  const slug = typeof input.slug === "string" ? input.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 80) : "";
  const description = typeof input.description === "string" ? input.description.trim().slice(0, 500) : "";
  const isActive = input.isActive === true;

  if (!batchId) throw new Error("Batch ID is required");
  if (!name || !slug) throw new Error("Batch name and slug are required");

  const { data: existing } = await supabase.from("contact_batches").select("id").eq("slug", slug).neq("id", batchId).maybeSingle();
  if (existing) throw new Error("A batch with this slug already exists");

  const { data, error } = await supabase.from("contact_batches").update({
    name,
    slug,
    description: description || null,
    is_active: isActive,
  }).eq("id", batchId).select("id,name,slug,description,is_active,created_by,created_at,updated_at").single();
  if (error) throw new Error("Batch could not be updated");
  if (!data) throw new Error("Batch not found");
  return { batch: data };
}

async function deleteBatch(
  input: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>,
) {
  const batchId = typeof input.batchId === "string" ? input.batchId : "";
  if (!batchId) throw new Error("Batch ID is required");
  const { error } = await supabase.from("contact_batches").delete().eq("id", batchId);
  if (error) throw new Error("Batch could not be deleted");
  return { deleted: true };
}

async function addBatchMembers(
  input: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>,
) {
  const batchId = typeof input.batchId === "string" ? input.batchId : "";
  const leadIds = Array.isArray(input.leadIds) ? input.leadIds : [];
  const validIds = leadIds.filter((id) => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id));
  if (!batchId || validIds.length === 0) throw new Error("Batch ID and at least one valid lead ID are required");
  if (validIds.length > 5000) throw new Error("Cannot add more than 5,000 contacts at once");

  // Check batch exists
  const { data: batch, error: batchError } = await supabase.from("contact_batches").select("id").eq("id", batchId).maybeSingle();
  if (batchError || !batch) throw new Error("Batch not found");

  // Check leads exist
  const { data: leads, error: leadsError } = await supabase.from("leads").select("id").in("id", validIds);
  if (leadsError) throw new Error("Some leads could not be verified");
  const foundIds = new Set((leads ?? []).map((l) => l.id));
  const missingIds = validIds.filter((id) => !foundIds.has(id));
  if (missingIds.length > 0) throw new Error(`${missingIds.length} lead(s) not found`);

  // Insert members (ignore duplicates via PK constraint)
  const members = validIds.map((leadId) => ({ batch_id: batchId, lead_id: leadId }));
  const { error } = await supabase.from("contact_batch_members").upsert(members, { onConflict: "batch_id,lead_id", ignoreDuplicates: true });
  if (error) throw new Error("Batch members could not be added");

  return { added: validIds.length };
}

async function removeBatchMembers(
  input: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>,
) {
  const batchId = typeof input.batchId === "string" ? input.batchId : "";
  const leadIds = Array.isArray(input.leadIds) ? input.leadIds : [];
  const validIds = leadIds.filter((id) => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id));
  if (!batchId || validIds.length === 0) throw new Error("Batch ID and at least one valid lead ID are required");

  const { error } = await supabase.from("contact_batch_members").delete().eq("batch_id", batchId).in("lead_id", validIds);
  if (error) throw new Error("Batch members could not be removed");
  return { removed: validIds.length };
}

async function createCampaignFromBatches(
  input: Record<string, unknown>,
  userId: string,
  supabase: ReturnType<typeof createClient>,
) {
  const name = typeof input.name === "string" ? input.name.trim().slice(0, 120) : "";
  const templateId = typeof input.templateId === "string" ? input.templateId : "";
  const batchIds = Array.isArray(input.batchIds) ? input.batchIds : [];
  const validBatchIds = batchIds.filter((id) => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id));
  if (!name || !templateId || validBatchIds.length === 0) throw new Error("Campaign name, approved template, and at least one batch are required");
  if (!validComponents(input.components)) throw new Error("Template components must be valid JSON matching the Meta template component format");

  const { data: template, error: templateError } = await supabase.from("whatsapp_templates")
    .select("id,name,language,status,waba_id")
    .eq("id", templateId)
    .eq("status", "APPROVED")
    .maybeSingle();
  if (templateError || !template) throw new Error("Select a template currently approved in Meta WhatsApp Manager");

  // Resolve audience from batches server-side
  const { data: audience, error: audienceError } = await supabase.rpc("resolve_batch_audience", { p_batch_ids: validBatchIds });
  if (audienceError) throw new Error("Could not resolve batch audience");

  const uniqueAudience = [...new Map((audience ?? []).map((a: Record<string, unknown>) => [a.lead_id, a])).values()];
  if (uniqueAudience.length === 0) throw new Error("No eligible contacts found in selected batches");

  const { data: campaign, error: campaignError } = await supabase.from("whatsapp_campaigns").insert({
    name,
    template_id: templateId,
    template_components: input.components ?? [],
    status: "queued",
    created_by: userId,
  }).select("id").single();
  if (campaignError || !campaign) throw new Error("WhatsApp campaign could not be created");

  const recipients = uniqueAudience.map((contact: Record<string, unknown>) => ({
    campaign_id: campaign.id,
    lead_id: contact.lead_id as string,
    recipient_phone: normalizeRecipient(contact.recipient_phone as string) || (contact.recipient_phone as string),
    status: "queued",
  }));
  for (let offset = 0; offset < recipients.length; offset += 500) {
    const { error } = await supabase.from("whatsapp_campaign_recipients").insert(recipients.slice(offset, offset + 500));
    if (error) {
      await supabase.from("whatsapp_campaigns").delete().eq("id", campaign.id);
      throw new Error("WhatsApp campaign recipients could not be queued");
    }
  }
  return { campaignId: campaign.id, totalRecipients: recipients.length, queued: recipients.length, failed: 0 };
}

// Batch assignment rules functions
async function listBatchRules(supabase: ReturnType<typeof createClient>, batchId: string) {
  const { data, error } = await supabase.from("contact_batch_rules")
    .select("id,batch_id,field,operator,value,is_active,created_by,created_at,updated_at")
    .eq("batch_id", batchId)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Batch rules could not be loaded");
  return { rules: data ?? [] };
}

async function createBatchRule(
  input: Record<string, unknown>,
  userId: string,
  supabase: ReturnType<typeof createClient>,
) {
  const batchId = typeof input.batchId === "string" ? input.batchId : "";
  const field = typeof input.field === "string" ? input.field : "";
  const operator = typeof input.operator === "string" ? input.operator : "";
  const value = typeof input.value === "string" ? input.value : "";
  const isActive = input.isActive === true;

  if (!batchId || !field || !operator) throw new Error("Batch ID, field, and operator are required");

  const allowedFields = ["business_type", "city", "source", "status", "whatsapp_opt_in_source"];
  if (!allowedFields.includes(field)) throw new Error("Invalid field. Allowed: " + allowedFields.join(", "));

  const allowedOperators = ["equals", "not_equals", "contains", "starts_with", "is_set", "is_not_set"];
  if (!allowedOperators.includes(operator)) throw new Error("Invalid operator. Allowed: " + allowedOperators.join(", "));

  // For is_set/is_not_set operators, value is not required
  if (!["is_set", "is_not_set"].includes(operator) && !value) throw new Error("Value is required for this operator");

  const { data: existing } = await supabase.from("contact_batch_rules")
    .select("id").eq("batch_id", batchId).eq("field", field).eq("operator", operator).eq("value", value).maybeSingle();
  if (existing) throw new Error("A rule with this field, operator, and value already exists for this batch");

  const { data, error } = await supabase.from("contact_batch_rules").insert({
    batch_id: batchId,
    field,
    operator,
    value,
    is_active: isActive,
    created_by: userId,
  }).select("id,batch_id,field,operator,value,is_active,created_by,created_at,updated_at").single();
  if (error) throw new Error("Batch rule could not be created");
  return { rule: data };
}

async function updateBatchRule(
  input: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>,
) {
  const ruleId = typeof input.ruleId === "string" ? input.ruleId : "";
  const field = typeof input.field === "string" ? input.field : "";
  const operator = typeof input.operator === "string" ? input.operator : "";
  const value = typeof input.value === "string" ? input.value : "";
  const isActive = input.isActive === true;

  if (!ruleId) throw new Error("Rule ID is required");

  const allowedFields = ["business_type", "city", "source", "status", "whatsapp_opt_in_source"];
  if (field && !allowedFields.includes(field)) throw new Error("Invalid field. Allowed: " + allowedFields.join(", "));

  const allowedOperators = ["equals", "not_equals", "contains", "starts_with", "is_set", "is_not_set"];
  if (operator && !allowedOperators.includes(operator)) throw new Error("Invalid operator. Allowed: " + allowedOperators.join(", "));

  if (!["is_set", "is_not_set"].includes(operator) && !value) throw new Error("Value is required for this operator");

  const { data, error } = await supabase.from("contact_batch_rules").update({
    field: field || undefined,
    operator: operator || undefined,
    value: value || undefined,
    is_active: isActive,
  }).eq("id", ruleId).select("id,batch_id,field,operator,value,is_active,created_by,created_at,updated_at").single();
  if (error) throw new Error("Batch rule could not be updated");
  if (!data) throw new Error("Rule not found");
  return { rule: data };
}

async function deleteBatchRule(supabase: ReturnType<typeof createClient>, ruleId: string, batchId: string) {
  const { error } = await supabase.from("contact_batch_rules").delete().eq("id", ruleId).eq("batch_id", batchId);
  if (error) throw new Error("Batch rule could not be deleted");
  return { deleted: true };
}

async function evaluateBatchRulesForContact(supabase: ReturnType<typeof createClient>, leadId: string) {
  const { data, error } = await supabase.rpc("evaluate_batch_rules_for_contact", { p_lead_id: leadId });
  if (error) throw new Error("Batch rules evaluation failed");
  return { assignments: data ?? [] };
}

async function reEvaluateAllBatchRules(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase.rpc("re_evaluate_all_batch_rules");
  if (error) throw new Error("Batch rules re-evaluation failed");
  return { assignedCount: data ?? 0 };
}

async function reEvaluateBatchRules(supabase: ReturnType<typeof createClient>, batchId: string) {
  const { data, error } = await supabase.rpc("re_evaluate_batch_rules_for_batch", { p_batch_id: batchId });
  if (error) throw new Error("Batch rules re-evaluation failed");
  return { assignedCount: data ?? 0 };
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
    
    // Rule evaluation errors must be visible to the admin instead of returning a false success.
    await evaluateBatchRulesForContact(supabase, leadId);
    
    return { updated: true };
  }
  if (action === "update_lead") {
    const leadId = typeof input.leadId === "string" ? input.leadId : "";
    if (!leadId) throw new Error("Lead ID is required");
    
    const allowedFields = ["name", "business_type", "city", "source", "status", "notes", "whatsapp"];
    const update: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (input[field] !== undefined) {
        if (typeof input[field] === "string") {
          const value = input[field].trim();
          update[field] = ["name", "business_type", "city"].includes(field) && value === "" ? null : value;
        } else {
          update[field] = input[field];
        }
      }
    }
    if (Object.keys(update).length === 0) throw new Error("No valid fields to update");
    
    // Normalize whatsapp if provided
    if (update.whatsapp) {
      const normalized = normalizeRecipient(update.whatsapp as string);
      if (!normalized) throw new Error("Invalid WhatsApp number format");
      update.whatsapp = `+${normalized}`;
      update.whatsapp_normalized = normalized;
    }
    
    const { error } = await supabase.from("leads").update(update).eq("id", leadId);
    if (error) throw new Error("Lead could not be updated");
    
    // Rule evaluation errors must be visible to the admin instead of returning a false success.
    await evaluateBatchRulesForContact(supabase, leadId);
    
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
    const page = typeof input.page === "number" && Number.isInteger(input.page) ? Math.max(0, Math.min(10_000, input.page)) : 0;
    const pageSize = typeof input.pageSize === "number" && Number.isInteger(input.pageSize) ? Math.min(Math.max(1, input.pageSize), 100) : 50;
    const eventType = typeof input.eventType === "string" ? input.eventType : undefined;
    const messageStatus = typeof input.messageStatus === "string" ? input.messageStatus : undefined;
    const search = typeof input.search === "string" ? input.search.trim() : undefined;
    return listWebhookEvents(supabase, page, pageSize, eventType, messageStatus, search);
  }
  if (action === "list_conversations") {
    const page = typeof input.page === "number" && Number.isInteger(input.page) ? Math.max(0, Math.min(10_000, input.page)) : 0;
    const pageSize = typeof input.pageSize === "number" && Number.isInteger(input.pageSize) ? Math.min(Math.max(1, input.pageSize), 100) : 30;
    const search = typeof input.search === "string" ? input.search.trim() : undefined;
    const cursor = typeof input.cursor === "string" ? input.cursor : undefined;
    return listConversations(supabase, page, pageSize, search, cursor);
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
  if (action === "upload_media") {
    const config = getWhatsAppConfig();
    const fileBase64 = typeof input.fileBase64 === "string" ? input.fileBase64 : "";
    const filename = typeof input.filename === "string" ? input.filename : "";
    const mimeType = typeof input.mimeType === "string" ? input.mimeType : "";
    const mediaType = typeof input.mediaType === "string" ? input.mediaType : "";
    if (!fileBase64 || !filename || !mimeType || !mediaType) throw new Error("File data, filename, MIME type, and media type are required");
    const fileBytes = Uint8Array.from(atob(fileBase64), (c) => c.charCodeAt(0));
    const validation = await validateMediaFile({ name: filename, type: mimeType, size: fileBytes.length }, mediaType);
    if (!validation.valid) throw new Error(validation.error ?? "Invalid file");
    const mediaId = await uploadMediaToMeta(fileBytes, mimeType, filename, config);
    return { mediaId };
  }
  if (action === "send_media") {
    const config = getWhatsAppConfig();
    return sendMediaMessage(input, user.id, config, supabase);
  }
  if (action === "get_media") {
    const config = getWhatsAppConfig();
    return getMedia(input, config, supabase);
  }
  if (action === "mark_read") {
    const config = getWhatsAppConfig();
    return markRead(input, config, supabase);
  }
  // Batch management actions
  if (action === "list_batches") {
    const page = typeof input.page === "number" && Number.isInteger(input.page) ? Math.max(0, Math.min(10_000, input.page)) : 0;
    const pageSize = typeof input.pageSize === "number" && Number.isInteger(input.pageSize) ? Math.min(Math.max(1, input.pageSize), 100) : 30;
    const search = typeof input.search === "string" ? input.search.trim() : undefined;
    return listBatches(supabase, page, pageSize, search);
  }
  if (action === "get_batch") {
    const batchId = typeof input.batchId === "string" ? input.batchId : "";
    if (!batchId) throw new Error("Batch ID is required");
    return getBatch(supabase, batchId);
  }
  if (action === "get_batch_stats") {
    const batchId = typeof input.batchId === "string" ? input.batchId : "";
    if (!batchId) throw new Error("Batch ID is required");
    return getBatchStats(supabase, batchId);
  }
  if (action === "get_batch_members") {
    const batchId = typeof input.batchId === "string" ? input.batchId : "";
    const page = typeof input.page === "number" && Number.isInteger(input.page) ? Math.max(0, Math.min(10_000, input.page)) : 0;
    const pageSize = typeof input.pageSize === "number" && Number.isInteger(input.pageSize) ? Math.min(Math.max(1, input.pageSize), 100) : 50;
    const search = typeof input.search === "string" ? input.search.trim() : undefined;
    if (!batchId) throw new Error("Batch ID is required");
    return getBatchMembers(supabase, batchId, page, pageSize, search);
  }
  if (action === "create_batch") {
    return createBatch(input, user.id, supabase);
  }
  if (action === "update_batch") {
    return updateBatch(input, supabase);
  }
  if (action === "delete_batch") {
    return deleteBatch(input, supabase);
  }
  if (action === "add_batch_members") {
    return addBatchMembers(input, supabase);
  }
  if (action === "remove_batch_members") {
    return removeBatchMembers(input, supabase);
  }
  if (action === "create_campaign_from_batches") {
    return createCampaignFromBatches(input, user.id, supabase);
  }
  // Batch assignment rules actions
  if (action === "list_batch_rules") {
    const batchId = typeof input.batchId === "string" ? input.batchId : "";
    if (!batchId) throw new Error("Batch ID is required");
    return listBatchRules(supabase, batchId);
  }
  if (action === "create_batch_rule") {
    return createBatchRule(input, user.id, supabase);
  }
  if (action === "update_batch_rule") {
    return updateBatchRule(input, supabase);
  }
  if (action === "delete_batch_rule") {
    const ruleId = typeof input.ruleId === "string" ? input.ruleId : "";
    const batchId = typeof input.batchId === "string" ? input.batchId : "";
    if (!ruleId || !batchId) throw new Error("Rule ID and Batch ID are required");
    return deleteBatchRule(supabase, ruleId, batchId);
  }
  if (action === "evaluate_batch_rules") {
    const leadId = typeof input.leadId === "string" ? input.leadId : "";
    if (!leadId) throw new Error("Lead ID is required");
    return evaluateBatchRulesForContact(supabase, leadId);
  }
  if (action === "re_evaluate_all_batch_rules") {
    return reEvaluateAllBatchRules(supabase);
  }
  if (action === "re_evaluate_batch_rules") {
    const batchId = typeof input.batchId === "string" ? input.batchId : "";
    if (!batchId) throw new Error("Batch ID is required");
    return reEvaluateBatchRules(supabase, batchId);
  }
  if (action === "get_contact_batch_memberships") {
    const leadIds = Array.isArray(input.leadIds) ? input.leadIds : [];
    const validIds = leadIds.filter((id) => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id));
    if (validIds.length === 0) return { memberships: {} };
    
    const { data, error } = await supabase
      .from("contact_batch_members")
      .select(`
        lead_id,
        batch_id,
        membership_source,
        contact_batches!inner (
          id,
          name
        )
      `)
      .in("lead_id", validIds);
    
    if (error) throw new Error("Contact batch memberships could not be loaded");
    
    const memberships: Record<string, { id: string; name: string; membership_source: "manual" | "rule" }[]> = {};
    for (const row of (data ?? []) as Record<string, unknown>[]) {
      const leadId = row.lead_id as string;
      const batch = row.contact_batches as { id: string; name: string };
      const membershipSource = row.membership_source as "manual" | "rule";
      if (!memberships[leadId]) {
        memberships[leadId] = [];
      }
      memberships[leadId].push({
        id: batch.id,
        name: batch.name,
        membership_source: membershipSource,
      });
    }
    
    return { memberships };
  }
  // Media token generation for secure media access
  if (action === "get_media_token") {
    const messageId = typeof input.messageId === "string" ? input.messageId : "";
    if (!messageId) throw new Error("Message ID is required");
    
    // Verify the message exists and is inbound
    const { data: message, error } = await supabase.from("whatsapp_messages")
      .select("id, direction, message_type, content")
      .eq("id", messageId)
      .maybeSingle();
    if (error || !message) throw new Error("Message not found");
    if (message.direction !== "inbound") throw new Error("Media tokens only available for inbound messages");
    
    const content = message.content as Record<string, unknown> | null;
    if (!content) throw new Error("Message has no content");
    
    const type = typeof message.message_type === "string" ? message.message_type : "";
    let hasMedia = false;
    if (type === "image" && isRecord(content.image)) hasMedia = true;
    else if (type === "video" && isRecord(content.video)) hasMedia = true;
    else if (type === "document" && isRecord(content.document)) hasMedia = true;
    else if (type === "audio" && isRecord(content.audio)) hasMedia = true;
    else if (type === "sticker" && isRecord(content.sticker)) hasMedia = true;
    
    if (!hasMedia) throw new Error("Message does not contain media");
    
    // Generate short-lived token (1 hour expiry)
    const secret = Deno.env.get("MEDIA_ACCESS_TOKEN_SECRET") || Deno.env.get("META_APP_SECRET");
    if (!secret) throw new Error("Media token secret not configured");
    
    const timestamp = Date.now();
    const payload = btoa(JSON.stringify({ messageId, userId: user.id }));
    const tokenData = `${payload}.${timestamp}`;
    
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(tokenData)));
    const signatureHex = [...signature].map((b) => b.toString(16).padStart(2, "0")).join("");
    
    const token = `${payload}.${timestamp}.${signatureHex}`;
    
    return { token, expiresAt: new Date(timestamp + 60 * 60 * 1000).toISOString() };
  }
  throw new Error("Unsupported WhatsApp management action");
}

serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (request.method !== "POST") return jsonResponse(405, { error: "Method not allowed" }, origin);
  if (origin && !PUBLIC_ORIGINS.has(origin)) return jsonResponse(403, { error: "Origin is not allowed" }, origin);
  try {
    const { user, supabase } = await requireAdmin(request);
    const length = Number(request.headers.get("content-length") || "0");
    if (length > MAX_UPLOAD_REQUEST_BYTES) return jsonResponse(413, { error: "Request payload is too large" }, origin);
    const rawBody = await readRequestBody(request, MAX_UPLOAD_REQUEST_BYTES);
    if (!rawBody) return jsonResponse(413, { error: "Request payload is too large" }, origin);
    const input: unknown = JSON.parse(new TextDecoder().decode(rawBody));
    if (!isRecord(input)) return jsonResponse(400, { error: "Invalid request" }, origin);
    if (input.action !== "upload_media" && rawBody.byteLength > MAX_REQUEST_BYTES) {
      return jsonResponse(413, { error: "Request payload is too large" }, origin);
    }
    const result = await handleAction(input, user, supabase);
    if (result instanceof Response) return result;
    return jsonResponse(200, { success: true, ...result }, origin);
  } catch (error) {
    if (error instanceof Response) return jsonResponse(error.status, { error: await error.text() }, origin);
    const message = error instanceof Error ? error.message : "WhatsApp request failed";
    console.error(JSON.stringify({ event: "whatsapp_admin_action_failed", action: "request", error: message }));
    const status = /configuration is incomplete|Choose a campaign|Select a template|components must be valid|Every campaign recipient|evidence source|recipient number|window has expired|file size exceeds limit|invalid file extension|invalid MIME type|unsupported media type|file data, MIME type/i.test(message) ? 400 : 500;
    return jsonResponse(status, { error: status === 400 ? message : "WhatsApp operation could not be completed" }, origin);
  }
});
