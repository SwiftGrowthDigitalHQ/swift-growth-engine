-- Emergency fix for realtime message visibility
-- Problem: Authenticated users with admin role cannot see realtime updates because:
-- 1. RLS policy requires app_metadata.role = 'admin'
-- 2. But JWT might not include app_metadata properly during realtime subscriptions
-- 3. Or the admin role might not be set in Supabase Auth

-- Solution: Allow any authenticated admin to read messages
-- This is safe because the policy still checks for admin role before allowing access

-- First, update the messages policy to be more explicit
DROP POLICY IF EXISTS "WhatsApp admins can view messages" ON public.whatsapp_messages;

CREATE POLICY "Admins can select messages for realtime"
  ON public.whatsapp_messages
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Also update webhook events policy
DROP POLICY IF EXISTS "WhatsApp admins can view webhook events" ON public.whatsapp_webhook_events;

CREATE POLICY "Admins can select webhook events"
  ON public.whatsapp_webhook_events
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Ensure GRANT is in place for realtime subscriptions
GRANT SELECT ON public.whatsapp_messages TO authenticated;
GRANT SELECT ON public.whatsapp_webhook_events TO authenticated;
GRANT SELECT ON public.leads TO authenticated;
