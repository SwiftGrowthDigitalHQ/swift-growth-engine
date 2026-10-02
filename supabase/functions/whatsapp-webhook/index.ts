import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getWhatsAppConfig,
  isRecord,
  normalizeRecipient,
  sha256,
  toIsoFromUnixSeconds,
  verifyMetaSignature,
} from "../_shared/whatsapp.ts";

const jsonHeaders = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
const MAX_BODY_BYTES = 1_000_000;

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function equalStrings(left: string, right: string): boolean {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index++) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

function getAdminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Webhook database configuration is missing");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function recordEvent(
  supabase: ReturnType<typeof getAdminClient>,
  event: Record<string, unknown>,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("whatsapp_webhook_events")
    .upsert(event, { onConflict: "event_key", ignoreDuplicates: true })
    .select("id")
    .maybeSingle();
  if (error) throw new Error("Webhook event could not be persisted");
  return Boolean(data?.id);
}

async function markEventProcessed(supabase: ReturnType<typeof getAdminClient>, eventKey: string) {
  const { error } = await supabase.from("whatsapp_webhook_events").update({ processed_at: new Date().toISOString() }).eq("event_key", eventKey);
  if (error) throw new Error("Webhook event processing state could not be stored");
}

async function findOrCreateLeadId(
  supabase: ReturnType<typeof getAdminClient>,
  phone: string,
  profileName: string | null,
): Promise<string> {
  const normalizedPhone = phone; // already normalized by normalizeRecipient()
  
  // Try to find existing lead by normalized WhatsApp
  const { data: existingLead, error: findError } = await supabase
    .from("leads")
    .select("id, name")
    .eq("whatsapp_normalized", normalizedPhone)
    .maybeSingle();
  
  if (findError) throw new Error("Webhook contact lookup failed");
  
  if (existingLead) {
    // Existing lead found - return its ID
    return existingLead.id;
  }
  
  // No existing lead - create new one using upsert to handle race conditions
  // The unique index on whatsapp_normalized will prevent duplicates
  const leadName = profileName && profileName.trim() ? profileName.trim() : "WhatsApp Contact";
  
  const { data: newLead, error: upsertError } = await supabase
    .from("leads")
    .upsert({
      name: leadName,
      business_type: null,
      city: null,
      whatsapp: `+${normalizedPhone}`, // Store with + prefix for display
      whatsapp_normalized: normalizedPhone,
      source: "whatsapp_inbound",
      status: "new",
      whatsapp_opt_in: false,
      whatsapp_opt_out: false,
    }, {
      onConflict: "whatsapp_normalized",
      ignoreDuplicates: false, // We want to get the existing or new row
    })
    .select("id")
    .maybeSingle();
  
  if (upsertError) {
    // If upsert failed due to race condition, try to find the lead again
    const { data: retryLead, error: retryError } = await supabase
      .from("leads")
      .select("id")
      .eq("whatsapp_normalized", normalizedPhone)
      .maybeSingle();
    
    if (retryError || !retryLead) {
      throw new Error("WhatsApp contact could not be created or found");
    }
    return retryLead.id;
  }
  
  if (!newLead) {
    throw new Error("WhatsApp contact creation returned no ID");
  }
  
  console.info(JSON.stringify({ event: "whatsapp_lead_auto_created", phone: normalizedPhone, lead_id: newLead.id }));
  return newLead.id;
}

function eventMetadata(
  entryId: unknown,
  value: Record<string, unknown>,
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  if (typeof entryId === "string") safe.waba_id = entryId;
  if (typeof metadata.phone_number_id === "string") safe.phone_number_id = metadata.phone_number_id;
  if (typeof metadata.display_phone_number === "string") safe.display_phone_number = metadata.display_phone_number;
  if (isRecord(value.conversation)) safe.conversation = value.conversation;
  if (isRecord(value.pricing)) safe.pricing = value.pricing;
  if (Array.isArray(value.errors)) safe.errors = value.errors;
  return safe;
}

async function processIncomingMessage(
  supabase: ReturnType<typeof getAdminClient>,
  contactNames: Map<string, string>,
  message: Record<string, unknown>,
  commonMetadata: Record<string, unknown>,
): Promise<{ recorded: boolean; duplicate: boolean }> {
  if (typeof message.id !== "string" || typeof message.from !== "string" || typeof message.type !== "string") {
    return { recorded: false, duplicate: false };
  }
  const phone = normalizeRecipient(message.from);
  if (!phone) return { recorded: false, duplicate: false };

  const occurredAt = toIsoFromUnixSeconds(message.timestamp);
  const key = `incoming:${message.id}`;
  const inserted = await recordEvent(supabase, {
    event_key: key,
    event_type: "incoming_message",
    meta_message_id: message.id,
    message_status: "received",
    event_timestamp: occurredAt,
    metadata: { ...commonMetadata, direction: "inbound", message_type: message.type },
  });
  const { id: _id, from: _from, timestamp: _timestamp, type: _type, ...content } = message;
  const contactName = contactNames.get(message.from) || null;
  
  // Find or create lead for this phone number
  const leadId = await findOrCreateLeadId(supabase, phone, contactName);
  
  const { error: messageError } = await supabase.from("whatsapp_messages").upsert({
    direction: "inbound",
    recipient_phone: phone,
    contact_name: contactName,
    lead_id: leadId,
    message_type: message.type,
    content,
    status: "received",
    meta_message_id: message.id,
    meta_timestamp: occurredAt,
    response_metadata: commonMetadata,
  }, { onConflict: "meta_message_id", ignoreDuplicates: true });
  if (messageError) throw new Error("Incoming WhatsApp message could not be stored");

  // Update lead's last message timestamp and handle STOP opt-out
  const update: Record<string, unknown> = { whatsapp_last_message_at: occurredAt || new Date().toISOString() };
  const textBody = isRecord(message.text) && typeof message.text.body === "string" ? message.text.body : "";
  if (/^\s*(stop|unsubscribe|cancel|end|quit)\s*[.!]*\s*$/i.test(textBody)) {
    update.whatsapp_opt_out = true;
    update.whatsapp_opt_out_at = occurredAt || new Date().toISOString();
    update.whatsapp_opt_in = false;
    update.whatsapp_opt_in_at = null;
    update.whatsapp_opt_in_source = null;
  }
  const { error: leadError } = await supabase.from("leads").update(update).eq("id", leadId);
  if (leadError) throw new Error("WhatsApp contact state could not be updated");
  
  // Evaluate batch assignment rules for this contact
  try {
    await supabase.rpc("evaluate_batch_rules_for_contact", { p_lead_id: leadId });
  } catch (ruleError) {
    // Log but don't fail the webhook if rule evaluation fails
    console.error(JSON.stringify({ event: "batch_rule_evaluation_failed", lead_id: leadId, error: ruleError instanceof Error ? ruleError.message : "unknown" }));
  }
  
  await markEventProcessed(supabase, key);
  return { recorded: inserted, duplicate: !inserted };
}

async function processStatus(
  supabase: ReturnType<typeof getAdminClient>,
  entryId: unknown,
  metadata: Record<string, unknown>,
  status: Record<string, unknown>,
  commonMetadata: Record<string, unknown>,
): Promise<{ recorded: boolean; duplicate: boolean }> {
  if (typeof status.id !== "string" || typeof status.status !== "string") {
    return { recorded: false, duplicate: false };
  }
  const allowed = new Set(["sent", "delivered", "read", "failed"]);
  if (!allowed.has(status.status)) return { recorded: false, duplicate: false };
  const timestamp = toIsoFromUnixSeconds(status.timestamp);
  const recipient = typeof status.recipient_id === "string" ? status.recipient_id : "";
  const key = `status:${status.id}:${status.status}:${status.timestamp ?? ""}:${recipient}`;
  const statusMetadata: Record<string, unknown> = { ...commonMetadata };
  if (recipient) statusMetadata.recipient_id = recipient;
  if (isRecord(status.conversation)) statusMetadata.conversation = status.conversation;
  if (isRecord(status.pricing)) statusMetadata.pricing = status.pricing;
  if (Array.isArray(status.errors)) statusMetadata.errors = status.errors;

  const inserted = await recordEvent(supabase, {
    event_key: key,
    event_type: "message_status",
    meta_message_id: status.id,
    message_status: status.status,
    event_timestamp: timestamp,
    metadata: statusMetadata,
  });
  const errors = Array.isArray(status.errors) ? status.errors.filter(isRecord) : [];
  const errorMetadata = errors.length
    ? { errors }
    : status.status === "failed" ? { message: "Meta reported delivery failure" } : {};
  const { error } = await supabase.rpc("apply_whatsapp_message_status", {
    p_meta_message_id: status.id,
    p_status: status.status,
    p_event_timestamp: timestamp,
    p_error_metadata: errorMetadata,
    p_response_metadata: {
      ...statusMetadata,
      ...(typeof entryId === "string" ? { waba_id: entryId } : {}),
      ...(typeof metadata.phone_number_id === "string" ? { phone_number_id: metadata.phone_number_id } : {}),
    },
  });
  if (error) throw new Error("WhatsApp message status could not be applied");
  await markEventProcessed(supabase, key);
  return { recorded: inserted, duplicate: !inserted };
}

async function handlePost(request: Request): Promise<Response> {
  const config = getWhatsAppConfig();
  if (!config.appSecret || !config.phoneNumberId) {
    console.error(JSON.stringify({ event: "whatsapp_webhook_configuration_missing", app_secret: Boolean(config.appSecret), phone_number_id: Boolean(config.phoneNumberId) }));
    return jsonResponse(503, { error: "Webhook is not configured" });
  }

  const declaredLength = Number(request.headers.get("content-length") || "0");
  if (declaredLength > MAX_BODY_BYTES) return jsonResponse(413, { error: "Payload too large" });
  const rawBody = new Uint8Array(await request.arrayBuffer());
  if (rawBody.length > MAX_BODY_BYTES) return jsonResponse(413, { error: "Payload too large" });

  const validSignature = await verifyMetaSignature(rawBody, request.headers.get("x-hub-signature-256"), config.appSecret);
  if (!validSignature) {
    console.warn(JSON.stringify({ event: "whatsapp_webhook_signature_rejected" }));
    return jsonResponse(401, { error: "Invalid webhook signature" });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder().decode(rawBody));
  } catch {
    return jsonResponse(400, { error: "Invalid JSON payload" });
  }
  if (!isRecord(payload)) return jsonResponse(400, { error: "Invalid webhook payload" });
  if (payload.object !== "whatsapp_business_account") return jsonResponse(200, { received: true, ignored: true });
  if (!Array.isArray(payload.entry)) return jsonResponse(400, { error: "Invalid webhook payload" });

  try {
    const supabase = getAdminClient();
    let processed = 0;
    let duplicates = 0;

    for (const entry of payload.entry) {
      if (!isRecord(entry) || !Array.isArray(entry.changes)) continue;
      const entryId = entry.id;
      if (typeof entryId === "string" && config.businessAccountId && entryId !== config.businessAccountId) continue;
      for (const change of entry.changes) {
        if (!isRecord(change) || change.field !== "messages" || !isRecord(change.value)) continue;
        const value = change.value;
        if (!isRecord(value.metadata)) continue;
        const metadata = value.metadata;
        if (metadata.phone_number_id !== config.phoneNumberId) continue;
        const commonMetadata = eventMetadata(entryId, value, metadata);

        if (Array.isArray(value.contacts)) {
          const contactNames = new Map<string, string>();
          for (const contact of value.contacts) {
            if (!isRecord(contact) || typeof contact.wa_id !== "string" || !isRecord(contact.profile)) continue;
            if (typeof contact.profile.name === "string") contactNames.set(contact.wa_id, contact.profile.name);
          }
          if (Array.isArray(value.messages)) {
            for (const message of value.messages) {
              if (!isRecord(message)) continue;
              const result = await processIncomingMessage(supabase, contactNames, message, commonMetadata);
              if (result.duplicate) duplicates++;
              if (result.recorded) processed++;
            }
          }
        } else if (Array.isArray(value.messages)) {
          for (const message of value.messages) {
            if (!isRecord(message)) continue;
            const result = await processIncomingMessage(supabase, new Map(), message, commonMetadata);
            if (result.duplicate) duplicates++;
            if (result.recorded) processed++;
          }
        }

        if (Array.isArray(value.statuses)) {
          for (const status of value.statuses) {
            if (!isRecord(status)) continue;
            const result = await processStatus(supabase, entryId, metadata, status, commonMetadata);
            if (result.duplicate) duplicates++;
            if (result.recorded) processed++;
          }
        }

        if (Array.isArray(value.errors)) {
          const errorKey = await sha256(JSON.stringify({ entryId, field: change.field, errors: value.errors }));
          const recorded = await recordEvent(supabase, {
            event_key: `account_error:${errorKey}`,
            event_type: "account_error",
            metadata: { ...commonMetadata, errors: value.errors },
          });
          await markEventProcessed(supabase, `account_error:${errorKey}`);
          if (recorded) processed++;
          else duplicates++;
        }
      }
    }
    console.info(JSON.stringify({ event: "whatsapp_webhook_processed", processed, duplicates }));
    return jsonResponse(200, { received: true });
  } catch (error) {
    console.error(JSON.stringify({ event: "whatsapp_webhook_processing_failed", error: error instanceof Error ? error.message : "unknown" }));
    return jsonResponse(503, { error: "Webhook event could not be persisted" });
  }
}

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  const config = getWhatsAppConfig();
  if (request.method === "GET") {
    if (!config.verifyToken) return jsonResponse(403, { error: "Webhook verification is not configured" });
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token && challenge !== null && equalStrings(token, config.verifyToken)) {
      return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
    }
    return jsonResponse(403, { error: "Webhook verification failed" });
  }
  if (request.method === "POST") return handlePost(request);
  return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, POST, OPTIONS" } });
});
