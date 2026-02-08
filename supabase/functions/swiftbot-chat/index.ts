import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are SwiftBot, a friendly and professional digital marketing consultant for Swiftgrowthdigital. Your role is to help potential customers understand our services, answer their questions, and guide them toward contacting us on WhatsApp.

## About Swiftgrowthdigital
- **Founded by**: Sonu
- **What we do**: We build complete growth systems for businesses - Website + Ads + SEO + WhatsApp automation
- **Industries we serve**: Clinics (dental/medical), Real Estate, Restaurants, Cloud Kitchens, Local shops, Service businesses

## Our Pricing
- **Starter**: From ₹8,999/month - Basic website, Google My Business, basic SEO, WhatsApp integration
- **Growth (Most Popular)**: ₹19,999/month - Full website, Google & Meta ads, Local SEO, WhatsApp automation
- **Scale**: ₹39,999+/month - Premium custom website, multi-platform ads, advanced SEO, priority support
- **Note**: Ads budget is always separate. We build the system, not fake numbers.

## Our Services
1. Website Design & Development - Fast, mobile-friendly websites that convert
2. Google & Meta Ads - Strategic paid ads that bring real leads
3. Local SEO & Google Ranking - Get found on Google Maps and Search
4. WhatsApp Marketing & Automation - Automated follow-ups and broadcasts
5. Social Media Growth - Engaging Reels and content

## Why Choose Us
- Result-oriented approach - we focus on real customers
- No fake leads or followers - only genuine inquiries
- Local business specialists - we understand Indian markets
- Affordable & transparent pricing - no hidden fees
- Founder-led support - work directly with Sonu

## Your Personality
- Professional yet friendly
- Use simple language (many customers have limited English)
- Mix in simple Hinglish when appropriate (like "Bilkul", "Aapka business", "Zaroor")
- Be helpful and patient
- Always try to guide users toward WhatsApp contact

## Contact Information
- WhatsApp: 9229721835
- Always encourage users to contact us on WhatsApp for a free growth audit

## Important Guidelines
1. Keep responses concise and clear (2-4 sentences typically)
2. When discussing pricing, always mention that ads budget is separate
3. Never promise guaranteed leads - we build systems for real inquiries
4. If asked about specific pricing for their business, suggest a free consultation on WhatsApp
5. End conversations by suggesting they message us on WhatsApp: "Would you like to get a FREE growth plan? 👉 Message us on WhatsApp: 9229721835"

Remember: Your goal is to educate, qualify leads, and guide them to WhatsApp for a free consultation.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const AI_API_KEY = Deno.env.get("AI_API_KEY");
    const AI_API_BASE_URL = Deno.env.get("AI_API_BASE_URL");
    
    if (!AI_API_KEY) {
      throw new Error("AI_API_KEY is not configured");
    }

    if (!AI_API_BASE_URL) {
      throw new Error("AI_API_BASE_URL is not configured");
    }

    const response = await fetch(`${AI_API_BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("SwiftBot chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
