-- WhatsApp Contact Batches / Segments
-- Enables reusable contact audiences for campaigns
-- Replaces manual one-by-one contact selection

-- Batch table: stores segment definitions
CREATE TABLE public.contact_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Batch members: many-to-many relationship between batches and leads
CREATE TABLE public.contact_batch_members (
  batch_id uuid NOT NULL REFERENCES public.contact_batches(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (batch_id, lead_id)
);

-- Index for fast batch member lookups
CREATE INDEX IF NOT EXISTS contact_batch_members_batch_id_idx ON public.contact_batch_members (batch_id);
CREATE INDEX IF NOT EXISTS contact_batch_members_lead_id_idx ON public.contact_batch_members (lead_id);

-- Trigger to update updated_at on contact_batches
CREATE OR REPLACE FUNCTION public.set_contact_batches_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER contact_batches_updated_at
  BEFORE UPDATE ON public.contact_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.set_contact_batches_updated_at();

-- RLS policies
ALTER TABLE public.contact_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_batch_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "WhatsApp admins can manage batches"
  ON public.contact_batches FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "WhatsApp admins can view batch members"
  ON public.contact_batch_members FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "WhatsApp admins can manage batch members"
  ON public.contact_batch_members FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Grant permissions
GRANT SELECT ON public.contact_batches TO authenticated, service_role;
GRANT SELECT ON public.contact_batch_members TO authenticated, service_role;

-- Function to get batch stats (total, eligible, opted-out counts)
CREATE OR REPLACE FUNCTION public.get_contact_batch_stats(p_batch_id uuid)
RETURNS TABLE (
  total_contacts integer,
  opted_in_contacts integer,
  opted_out_contacts integer,
  without_whatsapp integer,
  eligible_contacts integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(l.id)::integer AS total_contacts,
    COUNT(l.id) FILTER (WHERE l.whatsapp_opt_in AND NOT l.whatsapp_opt_out)::integer AS opted_in_contacts,
    COUNT(l.id) FILTER (WHERE l.whatsapp_opt_out)::integer AS opted_out_contacts,
    COUNT(l.id) FILTER (WHERE l.whatsapp IS NULL OR l.whatsapp = '')::integer AS without_whatsapp,
    COUNT(l.id) FILTER (
      WHERE l.whatsapp_opt_in
        AND NOT l.whatsapp_opt_out
        AND l.whatsapp_opt_in_at IS NOT NULL
        AND NULLIF(btrim(l.whatsapp_opt_in_source), '') IS NOT NULL
        AND l.whatsapp IS NOT NULL
        AND l.whatsapp <> ''
    )::integer AS eligible_contacts
  FROM public.contact_batch_members bm
  JOIN public.leads l ON l.id = bm.lead_id
  WHERE bm.batch_id = p_batch_id;
$$;

REVOKE ALL ON FUNCTION public.get_contact_batch_stats(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_contact_batch_stats(uuid) TO service_role;

-- Function to resolve eligible lead IDs for given batch IDs (server-side audience resolution)
CREATE OR REPLACE FUNCTION public.resolve_batch_audience(p_batch_ids uuid[])
RETURNS TABLE (lead_id uuid, recipient_phone text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    l.id AS lead_id,
    l.whatsapp AS recipient_phone
  FROM public.contact_batch_members bm
  JOIN public.leads l ON l.id = bm.lead_id
  WHERE bm.batch_id = ANY(p_batch_ids)
    AND l.whatsapp_opt_in
    AND NOT l.whatsapp_opt_out
    AND l.whatsapp_opt_in_at IS NOT NULL
    AND NULLIF(btrim(l.whatsapp_opt_in_source), '') IS NOT NULL
    AND l.whatsapp IS NOT NULL
    AND l.whatsapp <> '';
$$;

REVOKE ALL ON FUNCTION public.resolve_batch_audience(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_batch_audience(uuid[]) TO service_role;