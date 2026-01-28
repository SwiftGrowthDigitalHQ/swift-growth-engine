import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_WHATSAPP = "919229721835";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, business_type, city, whatsapp, source } = await req.json();

    // Validate required fields
    if (!name || !business_type || !city || !whatsapp) {
      return new Response(
        JSON.stringify({ error: "Missing required fields", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate and clean WhatsApp number
    const cleanedWhatsapp = whatsapp.replace(/\D/g, '');
    if (cleanedWhatsapp.length < 10) {
      return new Response(
        JSON.stringify({ error: "Invalid WhatsApp number", code: "INVALID_PHONE" }),
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
        JSON.stringify({ error: "Failed to save lead", code: "DB_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate WhatsApp URLs
    const userAutoReplyMessage = encodeURIComponent(
      `Hi ${name.trim()}! 👋\n\n` +
      `Thanks for contacting *Swiftgrowthdigital*! 🚀\n\n` +
      `We've received your request for ${business_type} marketing in ${city}.\n\n` +
      `✅ Our growth expert will reach out within 1 hour during business hours.\n\n` +
      `In the meantime, feel free to ask any questions!\n\n` +
      `- Team Swiftgrowthdigital`
    );

    const adminNotificationMessage = encodeURIComponent(
      `🔔 *NEW LEAD ALERT*\n\n` +
      `👤 Name: ${name.trim()}\n` +
      `🏢 Business: ${business_type}\n` +
      `📍 City: ${city.trim()}\n` +
      `📱 WhatsApp: +91${cleanedWhatsapp}\n` +
      `📋 Source: ${source || 'contact_form'}\n\n` +
      `🔗 Click to contact: wa.me/91${cleanedWhatsapp}`
    );

    const userWhatsappUrl = `https://wa.me/91${cleanedWhatsapp}?text=${userAutoReplyMessage}`;
    const adminWhatsappUrl = `https://wa.me/${ADMIN_WHATSAPP}?text=${adminNotificationMessage}`;

    console.log(`✅ Lead captured: ${name} (${business_type}) from ${city} - ID: ${lead.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Lead captured successfully",
        lead_id: lead.id,
        user_whatsapp_url: userWhatsappUrl,
        admin_whatsapp_url: adminWhatsappUrl,
        lead_details: {
          name: name.trim(),
          business_type: business_type.trim(),
          city: city.trim(),
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Submit lead error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", code: "SERVER_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
