-- Cloud API integration extends the existing leads table and adds only the
-- persistence needed for approved templates, campaigns, messages, and webhooks.
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in_source text,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_out boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_out_at timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_last_message_at timestamptz;

CREATE INDEX IF NOT EXISTS leads_whatsapp_eligibility_idx
  ON public.leads (whatsapp_opt_in, whatsapp_opt_out, created_at DESC);
CREATE INDEX IF NOT EXISTS leads_whatsapp_number_idx
  ON public.leads (regexp_replace(whatsapp, '[^0-9]', '', 'g'));

CREATE TABLE public.whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_template_id text,
  waba_id text NOT NULL,
  name text NOT NULL,
  language text NOT NULL,
  namespace text,
  category text,
  status text NOT NULL,
  components jsonb NOT NULL DEFAULT '[]'::jsonb,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_templates_waba_name_language_key UNIQUE (waba_id, name, language)
);
CREATE INDEX whatsapp_templates_status_idx ON public.whatsapp_templates (status, name);

CREATE TABLE public.whatsapp_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_id uuid NOT NULL REFERENCES public.whatsapp_templates(id) ON DELETE RESTRICT,
  template_components jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('draft', 'queued', 'sending', 'completed', 'failed', 'cancelled')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX whatsapp_campaigns_status_created_idx
  ON public.whatsapp_campaigns (status, created_at DESC);

CREATE TABLE public.whatsapp_campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.whatsapp_campaigns(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  recipient_phone text NOT NULL,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sending', 'sent', 'delivered', 'read', 'failed')),
  failure_reason text,
  claimed_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_campaign_recipients_campaign_lead_key UNIQUE (campaign_id, lead_id)
);
CREATE INDEX whatsapp_campaign_recipients_queue_idx
  ON public.whatsapp_campaign_recipients (status, created_at)
  WHERE status = 'queued';
CREATE INDEX whatsapp_campaign_recipients_campaign_status_idx
  ON public.whatsapp_campaign_recipients (campaign_id, status);

CREATE TABLE public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.whatsapp_campaigns(id) ON DELETE SET NULL,
  campaign_recipient_id uuid UNIQUE REFERENCES public.whatsapp_campaign_recipients(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  recipient_phone text NOT NULL,
  contact_name text,
  message_type text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sending', 'sent', 'delivered', 'read', 'failed', 'received')),
  meta_message_id text UNIQUE,
  meta_timestamp timestamptz,
  request_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX whatsapp_messages_status_created_idx
  ON public.whatsapp_messages (status, created_at DESC);
CREATE INDEX whatsapp_messages_lead_created_idx
  ON public.whatsapp_messages (lead_id, created_at DESC);

CREATE TABLE public.whatsapp_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL UNIQUE,
  event_type text NOT NULL,
  meta_message_id text,
  message_status text,
  event_timestamp timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
CREATE INDEX whatsapp_webhook_events_received_idx
  ON public.whatsapp_webhook_events (received_at DESC);
CREATE INDEX whatsapp_webhook_events_message_idx
  ON public.whatsapp_webhook_events (meta_message_id, received_at DESC)
  WHERE meta_message_id IS NOT NULL;

CREATE TABLE public.whatsapp_worker_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  claimed_count integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  error_code text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX whatsapp_worker_runs_started_idx ON public.whatsapp_worker_runs (started_at DESC);

CREATE OR REPLACE FUNCTION public.set_whatsapp_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER whatsapp_templates_updated_at
  BEFORE UPDATE ON public.whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_whatsapp_updated_at();
CREATE TRIGGER whatsapp_campaigns_updated_at
  BEFORE UPDATE ON public.whatsapp_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_whatsapp_updated_at();
CREATE TRIGGER whatsapp_campaign_recipients_updated_at
  BEFORE UPDATE ON public.whatsapp_campaign_recipients
  FOR EACH ROW EXECUTE FUNCTION public.set_whatsapp_updated_at();
CREATE TRIGGER whatsapp_messages_updated_at
  BEFORE UPDATE ON public.whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_whatsapp_updated_at();

CREATE OR REPLACE FUNCTION public.claim_whatsapp_campaign_recipients(p_limit integer DEFAULT 10)
RETURNS TABLE (
  recipient_id uuid,
  campaign_id uuid,
  lead_id uuid,
  recipient_phone text,
  template_name text,
  template_language text,
  template_namespace text,
  template_components jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH candidates AS (
    SELECT r.id
    FROM public.whatsapp_campaign_recipients AS r
    JOIN public.whatsapp_campaigns AS c ON c.id = r.campaign_id
    WHERE r.status = 'queued'
      AND c.status IN ('queued', 'sending')
      AND r.lead_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.leads AS l
        WHERE l.id = r.lead_id
          AND l.whatsapp_opt_in
          AND NOT l.whatsapp_opt_out
          AND l.whatsapp_opt_in_at IS NOT NULL
          AND NULLIF(btrim(l.whatsapp_opt_in_source), '') IS NOT NULL
      )
    ORDER BY r.created_at, r.id
    FOR UPDATE OF r SKIP LOCKED
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 25)
  ), claimed AS (
    UPDATE public.whatsapp_campaign_recipients AS r
    SET status = 'sending', claimed_at = now(), failure_reason = NULL
    FROM candidates AS x
    WHERE r.id = x.id
    RETURNING r.id, r.campaign_id, r.lead_id, r.recipient_phone
  )
  SELECT claimed.id,
         claimed.campaign_id,
         claimed.lead_id,
         claimed.recipient_phone,
         t.name,
         t.language,
         t.namespace,
         c.template_components
  FROM claimed
  JOIN public.whatsapp_campaigns AS c ON c.id = claimed.campaign_id
  JOIN public.whatsapp_templates AS t ON t.id = c.template_id;
$$;
REVOKE ALL ON FUNCTION public.claim_whatsapp_campaign_recipients(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_whatsapp_campaign_recipients(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.suppress_whatsapp_ineligible_recipients()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.whatsapp_campaign_recipients AS r
  SET status = 'failed',
      failure_reason = CASE
        WHEN NOT EXISTS (SELECT 1 FROM public.leads AS l WHERE l.id = r.lead_id) THEN 'Contact record is no longer available'
        WHEN EXISTS (SELECT 1 FROM public.leads AS l WHERE l.id = r.lead_id AND l.whatsapp_opt_out) THEN 'Contact opted out of WhatsApp messages'
        ELSE 'No valid WhatsApp marketing consent is recorded'
      END,
      failed_at = now()
  FROM public.whatsapp_campaigns AS c
  WHERE r.campaign_id = c.id
    AND c.status IN ('queued', 'sending')
    AND r.status = 'queued'
    AND NOT EXISTS (
      SELECT 1 FROM public.leads AS l
      WHERE l.id = r.lead_id
        AND l.whatsapp_opt_in
        AND NOT l.whatsapp_opt_out
        AND l.whatsapp_opt_in_at IS NOT NULL
        AND NULLIF(btrim(l.whatsapp_opt_in_source), '') IS NOT NULL
    );
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;
REVOKE ALL ON FUNCTION public.suppress_whatsapp_ineligible_recipients() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.suppress_whatsapp_ineligible_recipients() TO service_role;

CREATE OR REPLACE FUNCTION public.apply_whatsapp_message_status(
  p_meta_message_id text,
  p_status text,
  p_event_timestamp timestamptz DEFAULT NULL,
  p_error_metadata jsonb DEFAULT '{}'::jsonb,
  p_response_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (message_id uuid, campaign_recipient_id uuid, lead_id uuid, resolved_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_message public.whatsapp_messages%ROWTYPE;
  next_status text;
BEGIN
  IF p_status NOT IN ('sent', 'delivered', 'read', 'failed') THEN
    RAISE EXCEPTION 'Invalid WhatsApp message status';
  END IF;

  SELECT * INTO current_message
  FROM public.whatsapp_messages AS m
  WHERE m.meta_message_id = p_meta_message_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  next_status := current_message.status;
  IF current_message.status <> 'read' THEN
    IF p_status = 'read' OR p_status = 'delivered' THEN
      next_status := p_status;
    ELSIF current_message.status = 'delivered' THEN
      next_status := 'delivered';
    ELSIF current_message.status = 'failed' AND p_status = 'sent' THEN
      next_status := 'failed';
    ELSIF p_status = 'failed' AND current_message.status IN ('queued', 'sending', 'sent') THEN
      next_status := 'failed';
    ELSIF p_status = 'sent' AND current_message.status IN ('queued', 'sending') THEN
      next_status := 'sent';
    END IF;
  END IF;

  UPDATE public.whatsapp_messages AS m
  SET status = next_status,
      meta_timestamp = CASE
        WHEN next_status <> current_message.status THEN COALESCE(p_event_timestamp, m.meta_timestamp)
        WHEN p_event_timestamp IS NOT NULL AND (m.meta_timestamp IS NULL OR p_event_timestamp > m.meta_timestamp) THEN p_event_timestamp
        ELSE m.meta_timestamp
      END,
      error_metadata = CASE WHEN next_status = 'failed' THEN COALESCE(p_error_metadata, '{}'::jsonb) ELSE m.error_metadata END,
      response_metadata = m.response_metadata || COALESCE(p_response_metadata, '{}'::jsonb)
  WHERE m.id = current_message.id;

  IF current_message.campaign_recipient_id IS NOT NULL THEN
    UPDATE public.whatsapp_campaign_recipients AS r
    SET status = next_status,
        failure_reason = CASE WHEN next_status = 'failed' THEN COALESCE(p_error_metadata ->> 'message', p_error_metadata ->> 'title', 'Meta reported delivery failure') ELSE NULL END,
        sent_at = CASE WHEN next_status IN ('sent', 'delivered', 'read') THEN COALESCE(r.sent_at, p_event_timestamp, now()) ELSE r.sent_at END,
        delivered_at = CASE WHEN next_status IN ('delivered', 'read') THEN COALESCE(r.delivered_at, p_event_timestamp, now()) ELSE r.delivered_at END,
        read_at = CASE WHEN next_status = 'read' THEN COALESCE(r.read_at, p_event_timestamp, now()) ELSE r.read_at END,
        failed_at = CASE WHEN next_status = 'failed' THEN COALESCE(r.failed_at, p_event_timestamp, now()) ELSE r.failed_at END
    WHERE r.id = current_message.campaign_recipient_id;
  END IF;

  RETURN QUERY SELECT current_message.id, current_message.campaign_recipient_id, current_message.lead_id, next_status;
END;
$$;
REVOKE ALL ON FUNCTION public.apply_whatsapp_message_status(text, text, timestamptz, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_whatsapp_message_status(text, text, timestamptz, jsonb, jsonb) TO service_role;

ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_worker_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "WhatsApp admins can manage templates"
  ON public.whatsapp_templates FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "WhatsApp admins can manage campaigns"
  ON public.whatsapp_campaigns FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "WhatsApp admins can view campaign recipients"
  ON public.whatsapp_campaign_recipients FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "WhatsApp admins can view messages"
  ON public.whatsapp_messages FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "WhatsApp admins can view webhook events"
  ON public.whatsapp_webhook_events FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "WhatsApp admins can view worker runs"
  ON public.whatsapp_worker_runs FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "WhatsApp admins can view and update leads"
  ON public.leads FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "WhatsApp admins can update lead consent"
  ON public.leads FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE OR REPLACE VIEW public.whatsapp_campaign_analytics
WITH (security_invoker = true)
AS
SELECT c.id AS campaign_id,
       c.name,
       c.status AS campaign_status,
       c.created_at,
       c.completed_at,
       count(r.id)::integer AS total_recipients,
       count(r.id) FILTER (WHERE r.status = 'queued')::integer AS queued,
       count(r.id) FILTER (WHERE r.status = 'sending')::integer AS sending,
       count(r.id) FILTER (WHERE r.status = 'sent')::integer AS sent,
       count(r.id) FILTER (WHERE r.status = 'delivered')::integer AS delivered,
       count(r.id) FILTER (WHERE r.status = 'read')::integer AS read,
       count(r.id) FILTER (WHERE r.status = 'failed')::integer AS failed,
       round(100.0 * count(r.id) FILTER (WHERE r.status IN ('delivered', 'read')) /
         nullif(count(r.id) FILTER (WHERE r.status IN ('sent', 'delivered', 'read', 'failed')), 0), 2) AS delivery_rate,
       round(100.0 * count(r.id) FILTER (WHERE r.status = 'read') /
         nullif(count(r.id) FILTER (WHERE r.status IN ('delivered', 'read')), 0), 2) AS read_rate
FROM public.whatsapp_campaigns AS c
LEFT JOIN public.whatsapp_campaign_recipients AS r ON r.campaign_id = c.id
GROUP BY c.id;

GRANT SELECT ON public.whatsapp_campaign_analytics TO authenticated, service_role;
