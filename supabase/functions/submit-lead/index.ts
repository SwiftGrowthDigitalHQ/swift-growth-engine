import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, business_type, city, whatsapp, source } = await req.json();

    // Validate required fields
    if (!name || !business_type || !city || !whatsapp) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate WhatsApp number format
    const cleanedWhatsapp = whatsapp.replace(/\D/g, '');
    if (cleanedWhatsapp.length < 10) {
      return new Response(
        JSON.stringify({ error: "Invalid WhatsApp number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Insert lead into database
    const { data: lead, error: insertError } = await supabase
      .from("leads")
      .insert({
        name: name.trim(),
        business_type: business_type.trim(),
        city: city.trim(),
        whatsapp: cleanedWhatsapp,
        source: source || 'contact_form',
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert lead:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save lead" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate WhatsApp follow-up message
    const followUpMessage = encodeURIComponent(
      `Hi ${name}, thanks for contacting Swiftgrowthdigital! 🙏\n\n` +
      `We received your request for ${business_type} marketing in ${city}.\n\n` +
      `Our team will share a FREE growth plan shortly. Meanwhile, feel free to ask any questions!\n\n` +
      `- Team Swiftgrowthdigital`
    );

    const whatsappFollowUpUrl = `https://wa.me/91${cleanedWhatsapp}?text=${followUpMessage}`;

    console.log(`Lead captured: ${name} (${business_type}) from ${city}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Lead captured successfully",
        lead_id: lead.id,
        whatsapp_followup_url: whatsappFollowUpUrl,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Submit lead error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
