import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * WhatsApp Service Layer - Future-Ready Integration
 * 
 * 📝 INTERNAL NOTE: WhatsApp API integration ready. Activate by adding API credentials.
 * 
 * Supported Providers: AiSensy, Interakt, WATI (configurable via WHATSAPP_PROVIDER)
 * 
 * Required Environment Variables for API mode:
 * - WHATSAPP_PROVIDER: "aisensy" | "interakt" | "wati"
 * - WHATSAPP_API_KEY: Your provider API key
 * - WHATSAPP_SENDER_ID: Your WhatsApp Business number/sender ID
 * - WHATSAPP_TEMPLATE_ID: Template ID for automated messages (optional)
 * 
 * Without credentials: Falls back to WhatsApp redirect URLs (current behavior)
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Provider API endpoints
const PROVIDER_ENDPOINTS = {
  aisensy: "https://backend.aisensy.com/campaign/t1/api/v2",
  interakt: "https://api.interakt.ai/v1/public/message",
  wati: "https://live-server.wati.io/api/v1/sendTemplateMessage",
};

interface WhatsAppRequest {
  phone: string;
  message: string;
  recipientName?: string;
  templateData?: Record<string, string>;
  type: "user_autoreply" | "admin_notification";
}

interface WhatsAppResponse {
  success: boolean;
  method: "api" | "redirect";
  whatsappUrl?: string;
  apiResponse?: unknown;
  error?: string;
}

// Check if WhatsApp API credentials are configured
function hasApiCredentials(): boolean {
  const provider = Deno.env.get("WHATSAPP_PROVIDER");
  const apiKey = Deno.env.get("WHATSAPP_API_KEY");
  const senderId = Deno.env.get("WHATSAPP_SENDER_ID");
  
  return !!(provider && apiKey && senderId);
}

// Get provider configuration
function getProviderConfig() {
  return {
    provider: Deno.env.get("WHATSAPP_PROVIDER") as keyof typeof PROVIDER_ENDPOINTS,
    apiKey: Deno.env.get("WHATSAPP_API_KEY"),
    senderId: Deno.env.get("WHATSAPP_SENDER_ID"),
    templateId: Deno.env.get("WHATSAPP_TEMPLATE_ID"),
  };
}

// Send message via AiSensy API
async function sendViaAiSensy(phone: string, message: string, apiKey: string): Promise<unknown> {
  const response = await fetch(`${PROVIDER_ENDPOINTS.aisensy}/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-AiSensy-API-Key": apiKey,
    },
    body: JSON.stringify({
      to: phone,
      type: "text",
      message: { text: message },
    }),
  });
  return response.json();
}

// Send message via Interakt API
async function sendViaInterakt(phone: string, message: string, apiKey: string, templateId?: string): Promise<unknown> {
  const response = await fetch(PROVIDER_ENDPOINTS.interakt, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${apiKey}`,
    },
    body: JSON.stringify({
      countryCode: "+91",
      phoneNumber: phone,
      type: "Template",
      template: {
        id: templateId || "default_template",
        params: [message],
      },
    }),
  });
  return response.json();
}

// Send message via WATI API
async function sendViaWati(phone: string, templateId: string, apiKey: string, templateParams?: Record<string, string>): Promise<unknown> {
  const response = await fetch(`${PROVIDER_ENDPOINTS.wati}?whatsappNumber=${phone}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      template_name: templateId,
      broadcast_name: "api_broadcast",
      parameters: Object.entries(templateParams || {}).map(([name, value]) => ({ name, value })),
    }),
  });
  return response.json();
}

// Main function to send WhatsApp message
async function sendWhatsAppMessage(request: WhatsAppRequest): Promise<WhatsAppResponse> {
  const { phone, message, type, templateData } = request;
  
  // Check if API credentials are available
  if (!hasApiCredentials()) {
    // Fallback to redirect URL (current behavior)
    console.log(`[WhatsApp Service] No API credentials. Using redirect fallback for ${type}`);
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/91${phone}?text=${encodedMessage}`;
    
    return {
      success: true,
      method: "redirect",
      whatsappUrl,
    };
  }
  
  // API mode - send automated message
  console.log(`[WhatsApp Service] API credentials found. Sending ${type} via API`);
  
  const config = getProviderConfig();
  
  try {
    let apiResponse: unknown;
    
    switch (config.provider) {
      case "aisensy":
        apiResponse = await sendViaAiSensy(phone, message, config.apiKey!);
        break;
      case "interakt":
        apiResponse = await sendViaInterakt(phone, message, config.apiKey!, config.templateId);
        break;
      case "wati":
        apiResponse = await sendViaWati(phone, config.templateId || "default", config.apiKey!, templateData);
        break;
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
    
    console.log(`[WhatsApp Service] API response:`, apiResponse);
    
    return {
      success: true,
      method: "api",
      apiResponse,
    };
  } catch (error) {
    console.error(`[WhatsApp Service] API error:`, error);
    
    // Fallback to redirect on API failure
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/91${phone}?text=${encodedMessage}`;
    
    return {
      success: true,
      method: "redirect",
      whatsappUrl,
      error: error instanceof Error ? error.message : "API call failed",
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();
    
    // Check API status
    if (action === "check_status") {
      const hasCredentials = hasApiCredentials();
      const config = hasCredentials ? getProviderConfig() : null;
      
      return new Response(
        JSON.stringify({
          apiEnabled: hasCredentials,
          provider: config?.provider || null,
          note: hasCredentials 
            ? `WhatsApp API active via ${config?.provider}`
            : "WhatsApp API integration ready. Activate by adding API credentials.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Send message
    if (action === "send") {
      const result = await sendWhatsAppMessage(params as WhatsAppRequest);
      
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: "Invalid action", code: "INVALID_ACTION" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[WhatsApp Service] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", code: "SERVER_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
