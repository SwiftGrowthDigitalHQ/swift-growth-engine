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
      return jsonResponse(400, { error: "Invalid form submission" });
    }
    const input = payload as Record<string, unknown>;
    const name = typeof input.name === "string" ? input.name.trim() : "";
    const businessType = typeof input.business_type === "string" ? input.business_type.trim() : "";
    const city = typeof input.city === "string" ? input.city.trim() : "";
    const rawPhone = typeof input.whatsapp === "string" ? input.whatsapp : "";
    const source = typeof input.source === "string" ? input.source.trim().slice(0, 100) : "contact_form";
    const optedIn = input.whatsapp_opt_in === true;
    const phoneDigits = rawPhone.replace(/\D/g, "");
    const whatsapp = phoneDigits.length === 10 ? `91${phoneDigits}` : phoneDigits;

    if (!name || !businessType || !city || !rawPhone || name.length > 100 || businessType.length > 100 || city.length > 100) {
      return jsonResponse(400, { error: "Please complete each required field" });
    }
    if (!/^\d{8,15}$/.test(whatsapp)) return jsonResponse(400, { error: "Enter a valid WhatsApp number" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Lead database configuration is missing");
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: lead, error } = await supabase.from("leads").insert({
      name,
      business_type: businessType,
      city,
      whatsapp,
      source: source || "contact_form",
      whatsapp_opt_in: optedIn,
      whatsapp_opt_in_at: optedIn ? new Date().toISOString() : null,
      whatsapp_opt_in_source: optedIn ? `website:${source || "contact_form"}` : null,
      whatsapp_opt_out: false,
    }).select("id").single();
    if (error || !lead) {
      console.error(JSON.stringify({ event: "lead_submission_database_error" }));
      return jsonResponse(500, { error: "Your request could not be saved. Please try again." });
    }

    return jsonResponse(200, { success: true, lead_id: lead.id });
  } catch (error) {
    console.error(JSON.stringify({ event: "lead_submission_failed", error: error instanceof Error ? error.message : "unknown" }));
    return jsonResponse(500, { error: "Your request could not be submitted. Please try again." });
  }
});
