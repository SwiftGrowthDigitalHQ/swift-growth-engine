import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Submit Lead Edge Function
 * 
 * 📝 INTERNAL NOTE: WhatsApp API integration ready. Activate by adding API credentials.
 * 
 * Required secrets for WhatsApp API mode:
 * - WHATSAPP_PROVIDER: "aisensy" | "interakt" | "wati"
 * - WHATSAPP_API_KEY: Your provider API key
 * - WHATSAPP_SENDER_ID: Your WhatsApp Business number
 * - WHATSAPP_TEMPLATE_ID: Template ID (optional)
 * 
 * Without these: Falls back to WhatsApp redirect URLs (current behavior preserved)
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_WHATSAPP = "919229721835";

// WhatsApp API provider endpoints
const PROVIDER_ENDPOINTS = {
  aisensy: "https://backend.aisensy.com/campaign/t1/api/v2",
  interakt: "https://api.interakt.ai/v1/public/message",
  wati: "https://live-server.wati.io/api/v1/sendTemplateMessage",
};

// Check if WhatsApp API credentials are configured
function hasWhatsAppApiCredentials(): boolean {
  const provider = Deno.env.get("WHATSAPP_PROVIDER");
  const apiKey = Deno.env.get("WHATSAPP_API_KEY");
  const senderId = Deno.env.get("WHATSAPP_SENDER_ID");
  return !!(provider && apiKey && senderId);
}

// Get WhatsApp provider configuration
function getWhatsAppConfig() {
  return {
    provider: Deno.env.get("WHATSAPP_PROVIDER") as "aisensy" | "interakt" | "wati",
    apiKey: Deno.env.get("WHATSAPP_API_KEY"),
    senderId: Deno.env.get("WHATSAPP_SENDER_ID"),
    templateId: Deno.env.get("WHATSAPP_TEMPLATE_ID"),
  };
}

// Send WhatsApp message via API
async function sendWhatsAppViaApi(
  phone: string,
  message: string,
  config: ReturnType<typeof getWhatsAppConfig>
): Promise<{ success: boolean; response?: unknown; error?: string }> {
  try {
    let response: Response;
    
    switch (config.provider) {
      case "aisensy":
        response = await fetch(`${PROVIDER_ENDPOINTS.aisensy}/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-AiSensy-API-Key": config.apiKey!,
          },
          body: JSON.stringify({
            to: phone,
            type: "text",
            message: { text: message },
          }),
        });
        break;
        
      case "interakt":
        response = await fetch(PROVIDER_ENDPOINTS.interakt, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Basic ${config.apiKey}`,
          },
          body: JSON.stringify({
            countryCode: "+91",
            phoneNumber: phone.replace(/^91/, ""),
            type: "Text",
            data: { message },
          }),
        });
        break;
        
      case "wati":
        response = await fetch(`${PROVIDER_ENDPOINTS.wati}?whatsappNumber=${phone}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            template_name: config.templateId || "default",
            broadcast_name: "lead_notification",
            parameters: [{ name: "message", value: message }],
          }),
        });
        break;
        
      default:
        return { success: false, error: `Unknown provider: ${config.provider}` };
    }
    
    const data = await response.json();
    return { success: response.ok, response: data };
  } catch (error) {
    console.error("[WhatsApp API] Error:", error);
    return { success: false, error: error instanceof Error ? error.message : "API call failed" };
  }
}

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

    // Prepare WhatsApp messages
    const userAutoReplyText = 
      `Hi ${name.trim()}! 👋\n\n` +
      `Thanks for contacting *Swiftgrowthdigital*! 🚀\n\n` +
      `We've received your request for ${business_type} marketing in ${city}.\n\n` +
      `✅ Our growth expert will reach out within 1 hour during business hours.\n\n` +
      `In the meantime, feel free to ask any questions!\n\n` +
      `- Team Swiftgrowthdigital`;

    const adminNotificationText = 
      `🔔 *NEW LEAD ALERT*\n\n` +
      `👤 Name: ${name.trim()}\n` +
      `🏢 Business: ${business_type}\n` +
      `📍 City: ${city.trim()}\n` +
      `📱 WhatsApp: +91${cleanedWhatsapp}\n` +
      `📋 Source: ${source || 'contact_form'}\n\n` +
      `🔗 Click to contact: wa.me/91${cleanedWhatsapp}`;

    // Check if WhatsApp API is available
    const useApi = hasWhatsAppApiCredentials();
    let whatsappMethod: "api" | "redirect" = "redirect";
    let apiResults: { userSent?: boolean; adminSent?: boolean } = {};

    if (useApi) {
      // 📝 WhatsApp API integration active
      console.log(`[Submit Lead] WhatsApp API credentials found. Sending automated messages.`);
      
      const config = getWhatsAppConfig();
      
      // Send auto-reply to user
      const userResult = await sendWhatsAppViaApi(`91${cleanedWhatsapp}`, userAutoReplyText, config);
      apiResults.userSent = userResult.success;
      
      if (userResult.success) {
        console.log(`[Submit Lead] User auto-reply sent successfully`);
      } else {
        console.warn(`[Submit Lead] User auto-reply failed:`, userResult.error);
      }
      
      // Send notification to admin
      const adminResult = await sendWhatsAppViaApi(ADMIN_WHATSAPP, adminNotificationText, config);
      apiResults.adminSent = adminResult.success;
      
      if (adminResult.success) {
        console.log(`[Submit Lead] Admin notification sent successfully`);
      } else {
        console.warn(`[Submit Lead] Admin notification failed:`, adminResult.error);
      }
      
      whatsappMethod = "api";
    } else {
      // 📝 INTERNAL NOTE: WhatsApp API integration ready. Activate by adding API credentials.
      console.log(`[Submit Lead] No WhatsApp API credentials. Using redirect fallback.`);
    }

    // Generate WhatsApp redirect URLs (always provided as backup/fallback)
    const userWhatsappUrl = `https://wa.me/91${cleanedWhatsapp}?text=${encodeURIComponent(userAutoReplyText)}`;
    const adminWhatsappUrl = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(adminNotificationText)}`;

    console.log(`✅ Lead captured: ${name} (${business_type}) from ${city} - ID: ${lead.id} - Method: ${whatsappMethod}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Lead captured successfully",
        lead_id: lead.id,
        whatsapp_method: whatsappMethod,
        api_results: useApi ? apiResults : undefined,
        // Always provide redirect URLs (for fallback or manual action)
        user_whatsapp_url: userWhatsappUrl,
        admin_whatsapp_url: adminWhatsappUrl,
        lead_details: {
          name: name.trim(),
          business_type: business_type.trim(),
          city: city.trim(),
        },
        // Internal note for developers
        _note: useApi 
          ? `WhatsApp API active via ${getWhatsAppConfig().provider}`
          : "WhatsApp API integration ready. Activate by adding API credentials."
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
