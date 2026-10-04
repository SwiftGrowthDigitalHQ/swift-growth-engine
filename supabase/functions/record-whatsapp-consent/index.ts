import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" } });
}

function normalizePhone(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse(405, { error: "Method not allowed" });

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > 10_000) return jsonResponse(413, { error: "Request is too large" });

  try {
    const rawBody = await request.arrayBuffer();
    if (rawBody.byteLength > 10_000) return jsonResponse(413, { error: "Request is too large" });
    const payload: unknown = JSON.parse(new TextDecoder().decode(rawBody));
    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
      return jsonResponse(400, { error: "Invalid request" });
    }
    const input = payload as Record<string, unknown>;
    const source = typeof input.source === "string" ? input.source.trim().slice(0, 100) : "website";
    const whatsappOptIn = input.whatsapp_opt_in === true;

    if (!whatsappOptIn) {
      return jsonResponse(400, { error: "WhatsApp opt-in must be true" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Database configuration is missing");

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

    // For anonymous consent recording, we create or update a lead
    // We don't have a phone number here, so we'll just record the consent event
    // The actual lead creation with phone happens on form submit or webhook
    
    // Record the consent event in webhook_events for tracking
    const eventKey = `consent:${source}:${Date.now()}:${Math.random().toString(36).slice(2, 9)}`;
    const { error: eventError } = await supabase.from("whatsapp_webhook_events").insert({
      event_key: eventKey,
      event_type: "consent_recorded",
      metadata: {
        source,
        whatsapp_opt_in: true,
        recorded_at: new Date().toISOString(),
      },
    });

    if (eventError) {
      console.error("Consent event recording error:", eventError);
      return jsonResponse(500, { error: "Consent could not be recorded" });
    }

    return jsonResponse(200, { success: true, message: "Consent recorded" });
  } catch (error) {
    console.error("WhatsApp consent recording failed:", error);
    return jsonResponse(500, { error: "Consent recording failed" });
  }
});