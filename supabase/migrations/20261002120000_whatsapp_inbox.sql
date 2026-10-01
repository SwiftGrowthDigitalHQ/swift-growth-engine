-- WhatsApp Inbox: Add indexes and conversation view for efficient conversation listing
-- This migration is additive and does not modify existing tables or data.

-- Index for efficient conversation grouping by phone + latest message
CREATE INDEX IF NOT EXISTS whatsapp_messages_phone_created_idx
  ON public.whatsapp_messages (recipient_phone, created_at DESC);

-- Index for efficient unread counting (inbound messages with 'received' status)
CREATE INDEX IF NOT EXISTS whatsapp_messages_inbound_unread_idx
  ON public.whatsapp_messages (recipient_phone, created_at DESC)
  WHERE direction = 'inbound' AND status = 'received';

-- Index for lead-based conversation lookups
CREATE INDEX IF NOT EXISTS whatsapp_messages_lead_direction_created_idx
  ON public.whatsapp_messages (lead_id, direction, created_at DESC);

-- Conversation view: aggregates messages by phone number for conversation list
-- STAGE 1: Conversation aggregates (no nested aggregates)
-- STAGE 2: Latest message per phone (DISTINCT ON)
-- STAGE 3: Join aggregates with latest message and leads
CREATE OR REPLACE VIEW public.whatsapp_conversations
WITH (security_invoker = true)
AS
WITH agg AS (
  SELECT
    m.recipient_phone,
    count(*) AS total_messages,
    count(*) FILTER (WHERE m.direction = 'inbound') AS inbound_count,
    count(*) FILTER (WHERE m.direction = 'outbound') AS outbound_count,
    count(*) FILTER (WHERE m.direction = 'inbound' AND m.status = 'received') AS unread_count,
    max(m.created_at) AS last_message_at,
    max(m.created_at) FILTER (WHERE m.direction = 'inbound') AS last_inbound_at,
    max(m.created_at) FILTER (WHERE m.direction = 'outbound') AS last_outbound_at
  FROM public.whatsapp_messages AS m
  GROUP BY m.recipient_phone
),
latest AS (
  SELECT DISTINCT ON (m.recipient_phone)
    m.recipient_phone,
    m.id AS last_message_id,
    m.content AS last_message_content,
    m.message_type AS last_message_type,
    m.direction AS last_message_direction,
    m.status AS last_message_status,
    m.lead_id,
    m.contact_name
  FROM public.whatsapp_messages AS m
  ORDER BY m.recipient_phone, m.created_at DESC, m.id DESC
)
SELECT
  agg.recipient_phone,
  latest.lead_id,
  latest.contact_name,
  l.name AS lead_name,
  l.business_type AS lead_business_type,
  l.city AS lead_city,
  l.whatsapp AS lead_whatsapp,
  agg.total_messages,
  agg.inbound_count,
  agg.outbound_count,
  agg.unread_count,
  agg.last_message_at,
  agg.last_inbound_at,
  agg.last_outbound_at,
  latest.last_message_id,
  latest.last_message_content,
  latest.last_message_type,
  latest.last_message_direction,
  latest.last_message_status
FROM agg
JOIN latest ON latest.recipient_phone = agg.recipient_phone
LEFT JOIN public.leads AS l ON l.id = latest.lead_id;

GRANT SELECT ON public.whatsapp_conversations TO authenticated, service_role;

-- Function to get conversation messages with pagination
CREATE OR REPLACE FUNCTION public.get_whatsapp_conversation_messages(
  p_phone text,
  p_limit integer DEFAULT 50,
  p_before timestamptz DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  campaign_id uuid,
  campaign_recipient_id uuid,
  lead_id uuid,
  direction text,
  recipient_phone text,
  contact_name text,
  message_type text,
  content jsonb,
  status text,
  meta_message_id text,
  meta_timestamp timestamptz,
  request_metadata jsonb,
  response_metadata jsonb,
  error_metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  lead_name text,
  lead_business_type text,
  lead_city text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id,
    m.campaign_id,
    m.campaign_recipient_id,
    m.lead_id,
    m.direction,
    m.recipient_phone,
    m.contact_name,
    m.message_type,
    m.content,
    m.status,
    m.meta_message_id,
    m.meta_timestamp,
    m.request_metadata,
    m.response_metadata,
    m.error_metadata,
    m.created_at,
    m.updated_at,
    l.name AS lead_name,
    l.business_type AS lead_business_type,
    l.city AS lead_city
  FROM public.whatsapp_messages AS m
  LEFT JOIN public.leads AS l ON l.id = m.lead_id
  WHERE m.recipient_phone = p_phone
    AND (p_before IS NULL OR m.created_at < p_before)
  ORDER BY m.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
$$;

REVOKE ALL ON FUNCTION public.get_whatsapp_conversation_messages(text, integer, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_whatsapp_conversation_messages(text, integer, timestamptz) TO service_role;