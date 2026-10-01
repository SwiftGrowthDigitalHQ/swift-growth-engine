import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  errorDetails,
  getWhatsAppConfig,
  graphApiBase,
  isRecord,
} from "../_shared/whatsapp.ts";

function equalStrings(left: string, right: string): boolean {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index++) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

function response(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function getAdminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Worker database configuration is missing");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function getFailureReason(details: Record<string, unknown>): string {
  const value = details.message ?? details.title;
  return typeof value === "string" ? value.slice(0, 500) : "Meta rejected the WhatsApp message";
}

async function setFailure(
  supabase: ReturnType<typeof getAdminClient>,
  messageId: string,
  recipientId: string,
  details: Record<string, unknown>,
  httpStatus?: number,
) {
  const { error: messageError } = await supabase.from("whatsapp_messages").update({
    status: "failed",
    error_metadata: details,
    ...(httpStatus ? { response_metadata: { http_status: httpStatus } } : {}),
  }).eq("id", messageId);
  const { error: recipientError } = await supabase.from("whatsapp_campaign_recipients").update({
    status: "failed",
    failure_reason: getFailureReason(details),
    failed_at: new Date().toISOString(),
  }).eq("id", recipientId);
  if (messageError || recipientError) throw new Error("Failed WhatsApp send state could not be stored");
}

async function reconcileEarlyStatuses(supabase: ReturnType<typeof getAdminClient>, metaMessageId: string) {
  const { data: events, error } = await supabase.from("whatsapp_webhook_events")
    .select("message_status,event_timestamp,metadata")
    .eq("meta_message_id", metaMessageId)
    .eq("event_type", "message_status")
    .order("received_at", { ascending: true });
  if (error) throw new Error("Early WhatsApp delivery statuses could not be reconciled");
  for (const event of events ?? []) {
    const metadata = isRecord(event.metadata) ? event.metadata : {};
    const errors = Array.isArray(metadata.errors) ? { errors: metadata.errors } : {};
    const { error: applyError } = await supabase.rpc("apply_whatsapp_message_status", {
      p_meta_message_id: metaMessageId,
      p_status: event.message_status,
      p_event_timestamp: event.event_timestamp,
      p_error_metadata: errors,
      p_response_metadata: metadata,
    });
    if (applyError) throw new Error("Early WhatsApp delivery status could not be applied");
  }
}

async function processRecipient(supabase: ReturnType<typeof getAdminClient>, recipient: Record<string, unknown>) {
  const recipientId = String(recipient.recipient_id);
  const leadId = String(recipient.lead_id);
  const campaignId = String(recipient.campaign_id);
  const phone = String(recipient.recipient_phone);
  const templateName = String(recipient.template_name);
  const templateLanguage = String(recipient.template_language);
  const templateComponents = Array.isArray(recipient.template_components) ? recipient.template_components : [];

  // Recheck consent immediately before an external send. Consent can be withdrawn after queueing.
  const { data: lead, error: consentError } = await supabase.from("leads")
    .select("whatsapp_opt_in,whatsapp_opt_out,whatsapp_opt_in_at,whatsapp_opt_in_source")
    .eq("id", leadId)
    .maybeSingle();
  if (consentError) throw new Error("Recipient consent could not be rechecked");
  if (!lead || !lead.whatsapp_opt_in || lead.whatsapp_opt_out || !lead.whatsapp_opt_in_at || !lead.whatsapp_opt_in_source?.trim()) {
    const reason = lead?.whatsapp_opt_out ? "Contact opted out before the message was sent" : "WhatsApp consent is no longer recorded";
    await supabase.from("whatsapp_campaign_recipients").update({
      status: "failed", failure_reason: reason, failed_at: new Date().toISOString(),
    }).eq("id", recipientId);
    return "failed";
  }

  const requestBody = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: phone,
    type: "template",
    template: {
      name: templateName,
      language: { code: templateLanguage },
      ...(templateComponents.length ? { components: templateComponents } : {}),
    },
  };
  const { data: message, error: insertError } = await supabase.from("whatsapp_messages").insert({
    campaign_id: campaignId,
    campaign_recipient_id: recipientId,
    lead_id: leadId,
    direction: "outbound",
    recipient_phone: phone,
    message_type: "template",
    content: { name: templateName, language: templateLanguage, components: templateComponents },
    status: "sending",
    request_metadata: requestBody,
  }).select("id").single();
  if (insertError || !message) throw new Error("WhatsApp send attempt could not be recorded");

  const config = getWhatsAppConfig();
  if (!config.accessToken || !config.phoneNumberId || !config.apiVersion || !/^v\d+\.\d+$/.test(config.apiVersion)) {
    await setFailure(supabase, message.id, recipientId, { reason: "configuration_missing", message: "WhatsApp API configuration is incomplete" });
    return "failed";
  }

  let apiResponse: Response;
  let body: unknown;
  try {
    apiResponse = await fetch(`${graphApiBase(config.apiVersion)}/${encodeURIComponent(config.phoneNumberId)}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(20_000),
    });
    try {
      body = await apiResponse.json();
    } catch {
      body = null;
    }
  } catch {
    await setFailure(supabase, message.id, recipientId, {
      reason: "network_error",
      message: "Network outcome is unknown. Check Meta before retrying to avoid sending a duplicate.",
    });
    return "failed";
  }

  if (!apiResponse.ok) {
    const details = isRecord(body) ? errorDetails(body.error) : { message: "Meta API rejected the WhatsApp message" };
    await setFailure(supabase, message.id, recipientId, details, apiResponse.status);
    return "failed";
  }

  const messages = isRecord(body) && Array.isArray(body.messages) ? body.messages : [];
  const metaMessageId = isRecord(messages[0]) && typeof messages[0].id === "string" ? messages[0].id : null;
  if (!metaMessageId) {
    await setFailure(supabase, message.id, recipientId, {
      reason: "missing_meta_message_id",
      message: "Meta response did not include a message ID; confirm delivery status in Meta before retrying.",
    }, apiResponse.status);
    return "failed";
  }

  const responseMetadata: Record<string, unknown> = { http_status: apiResponse.status };
  const acceptedContacts = isRecord(body) && Array.isArray(body.contacts) ? body.contacts : null;
  if (acceptedContacts) responseMetadata.contact_count = acceptedContacts.length;
  if (isRecord(messages[0]) && typeof messages[0].message_status === "string") {
    responseMetadata.message_status = messages[0].message_status;
  }
  const { error: savedError } = await supabase.from("whatsapp_messages").update({
    meta_message_id: metaMessageId,
    status: "sent",
    meta_timestamp: new Date().toISOString(),
    response_metadata: responseMetadata,
  }).eq("id", message.id);
  if (savedError) throw new Error("Meta accepted a message but its message ID could not be stored");

  const { error: recipientError } = await supabase.from("whatsapp_campaign_recipients").update({
    status: "sent", sent_at: new Date().toISOString(), failure_reason: null,
  }).eq("id", recipientId);
  if (recipientError) throw new Error("Meta accepted a message but its campaign status could not be stored");
  await supabase.from("leads").update({ whatsapp_last_message_at: new Date().toISOString() }).eq("id", leadId);
  await reconcileEarlyStatuses(supabase, metaMessageId);
  return "sent";
}

async function finalizeCampaigns(supabase: ReturnType<typeof getAdminClient>) {
  const { data: campaigns, error } = await supabase.from("whatsapp_campaigns")
    .select("id")
    .in("status", ["queued", "sending"])
    .limit(200);
  if (error) throw new Error("Campaign queue status could not be checked");
  for (const campaign of campaigns ?? []) {
    const { count, error: pendingError } = await supabase.from("whatsapp_campaign_recipients")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign.id)
      .in("status", ["queued", "sending"]);
    if (pendingError) throw new Error("Campaign completion could not be checked");
    if (count === 0) {
      await supabase.from("whatsapp_campaigns").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", campaign.id);
    }
  }
}

async function runWorker() {
  const config = getWhatsAppConfig();
  if (!config.accessToken || !config.phoneNumberId || !config.apiVersion || !/^v\d+\.\d+$/.test(config.apiVersion)) {
    return response(503, { error: "WhatsApp worker configuration is incomplete" });
  }
  const supabase = getAdminClient();
  const { data: run, error: runInsertError } = await supabase.from("whatsapp_worker_runs").insert({ status: "running" }).select("id").single();
  if (runInsertError || !run) throw new Error("Worker run could not be recorded");
  try {
    const { error: suppressionError } = await supabase.rpc("suppress_whatsapp_ineligible_recipients");
    if (suppressionError) throw new Error("Campaign consent checks could not be completed");
    const { data: recipients, error: claimError } = await supabase.rpc("claim_whatsapp_campaign_recipients", { p_limit: 5 });
    if (claimError) throw new Error("WhatsApp campaign queue could not be claimed");

    let sent = 0;
    let failed = 0;
    for (const recipient of (recipients ?? []) as Record<string, unknown>[]) {
      try {
        const status = await processRecipient(supabase, recipient);
        if (status === "sent") sent++;
        else failed++;
      } catch (error) {
        failed++;
        console.error(JSON.stringify({ event: "whatsapp_campaign_recipient_processing_failed", error: error instanceof Error ? error.message : "unknown" }));
        // A recipient already claimed is deliberately not auto-retried: the send outcome may be ambiguous.
      }
    }
    await finalizeCampaigns(supabase);
    const { error: runUpdateError } = await supabase.from("whatsapp_worker_runs").update({
      status: "completed",
      claimed_count: recipients?.length ?? 0,
      sent_count: sent,
      failed_count: failed,
      completed_at: new Date().toISOString(),
    }).eq("id", run.id);
    if (runUpdateError) throw new Error("Worker run result could not be stored");
    console.info(JSON.stringify({ event: "whatsapp_campaign_batch_processed", claimed: recipients?.length ?? 0, sent, failed }));
    return response(200, { processed: recipients?.length ?? 0 });
  } catch (error) {
    await supabase.from("whatsapp_worker_runs").update({ status: "failed", error_code: "batch_failed", completed_at: new Date().toISOString() }).eq("id", run.id);
    throw error;
  }
}

serve(async (request) => {
  if (request.method !== "POST") return response(405, { error: "Method not allowed" });
  const configuredSecret = Deno.env.get("WHATSAPP_WORKER_SECRET");
  const suppliedSecret = request.headers.get("x-whatsapp-worker-secret") || "";
  if (!configuredSecret || !equalStrings(configuredSecret, suppliedSecret)) {
    console.warn(JSON.stringify({ event: "whatsapp_worker_auth_rejected" }));
    return response(401, { error: "Unauthorized" });
  }
  try {
    return await runWorker();
  } catch (error) {
    console.error(JSON.stringify({ event: "whatsapp_campaign_worker_failed", error: error instanceof Error ? error.message : "unknown" }));
    return response(503, { error: "Campaign worker could not complete this batch" });
  }
});
