-- Fix realtime publication and message direction issues
-- 1. Ensure whatsapp_messages table is in realtime publication with full replica identity
-- 2. Add trigger for reliable realtime notifications
-- 3. Fix phone number normalization consistency

-- Enable REPLICA IDENTITY FULL for reliable realtime events
ALTER TABLE public.whatsapp_messages REPLICA IDENTITY FULL;

-- Add whatsapp_messages to supabase_realtime publication if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'whatsapp_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
  END IF;
END $$;

-- Also ensure whatsapp_webhook_events is in publication for debugging
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'whatsapp_webhook_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_webhook_events;
  END IF;
END $$;

-- Create a dedicated realtime channel for message notifications
-- This bypasses RLS issues by using pg_notify
CREATE OR REPLACE FUNCTION public.notify_whatsapp_message_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  payload jsonb;
BEGIN
  -- Build notification payload with all relevant fields
  IF TG_OP = 'INSERT' THEN
    payload := jsonb_build_object(
      'event', 'INSERT',
      'id', NEW.id,
      'direction', NEW.direction,
      'recipient_phone', NEW.recipient_phone,
      'lead_id', NEW.lead_id,
      'message_type', NEW.message_type,
      'content', NEW.content,
      'status', NEW.status,
      'meta_message_id', NEW.meta_message_id,
      'created_at', NEW.created_at
    );
  ELSIF TG_OP = 'UPDATE' THEN
    payload := jsonb_build_object(
      'event', 'UPDATE',
      'id', NEW.id,
      'direction', NEW.direction,
      'recipient_phone', NEW.recipient_phone,
      'lead_id', NEW.lead_id,
      'message_type', NEW.message_type,
      'content', NEW.content,
      'status', NEW.status,
      'meta_message_id', NEW.meta_message_id,
      'created_at', NEW.created_at,
      'old_status', OLD.status,
      'old_direction', OLD.direction
    );
ELSIF TG_OP = 'DELETE' THEN
    payload := jsonb_build_object(
      'event', 'DELETE',
      'id', OLD.id,
      'recipient_phone', OLD.recipient_phone
    );
  END IF;
  
  -- Notify on a channel specific to the recipient phone for efficient filtering
  PERFORM pg_notify('whatsapp_message_' || COALESCE(NEW.recipient_phone, OLD.recipient_phone), payload::text);
  -- Also notify on a global channel for conversation list updates
  PERFORM pg_notify('whatsapp_messages_global', payload::text);
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS whatsapp_message_realtime_notify ON public.whatsapp_messages;

-- Create trigger for INSERT, UPDATE, DELETE
CREATE TRIGGER whatsapp_message_realtime_notify
  AFTER INSERT OR UPDATE OR DELETE ON public.whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_whatsapp_message_change();

-- Grant execute on the notify function
GRANT EXECUTE ON FUNCTION public.notify_whatsapp_message_change() TO service_role;

-- Fix the lead lookup consistency: ensure webhook and sendReply use same normalization
-- The webhook already uses normalizeRecipient() which matches the trigger logic
-- But sendReply searches by whatsapp column with multiple formats
-- This is fine, but let's ensure the trigger handles all formats correctly

-- Update the trigger to be more robust (already correct, but ensuring)
DROP TRIGGER IF EXISTS leads_whatsapp_normalized ON public.leads;
CREATE TRIGGER leads_whatsapp_normalized
  BEFORE INSERT OR UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_leads_whatsapp_normalized();

-- Add index for faster realtime filtering by recipient_phone
CREATE INDEX IF NOT EXISTS whatsapp_messages_recipient_phone_id_idx
  ON public.whatsapp_messages (recipient_phone, id DESC);

-- Ensure the get_whatsapp_conversation_messages RPC uses the correct ordering
-- It already orders by created_at DESC, which is correct

-- Fix: Ensure direction values are strictly enforced
-- The CHECK constraint already exists, but let's verify
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'whatsapp_messages_direction_check'
    AND conrelid = 'public.whatsapp_messages'::regclass
  ) THEN
    ALTER TABLE public.whatsapp_messages
    ADD CONSTRAINT whatsapp_messages_direction_check
    CHECK (direction IN ('inbound', 'outbound'));
  END IF;
END $$;

-- Fix: Ensure status values are strictly enforced
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'whatsapp_messages_status_check'
    AND conrelid = 'public.whatsapp_messages'::regclass
  ) THEN
    ALTER TABLE public.whatsapp_messages
    ADD CONSTRAINT whatsapp_messages_status_check
    CHECK (status IN ('queued', 'sending', 'sent', 'delivered', 'read', 'failed', 'received'));
  END IF;
END $$;