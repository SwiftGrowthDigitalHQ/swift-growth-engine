-- WhatsApp Batch Assignment Rules
-- Enables automatic batch assignment based on structured contact fields
-- Tracks membership source (manual vs rule-based)

-- Batch assignment rules table
CREATE TABLE public.contact_batch_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.contact_batches(id) ON DELETE CASCADE,
  field text NOT NULL,
  operator text NOT NULL,
  value text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contact_batch_rules_field_operator_value_batch_id_key UNIQUE (batch_id, field, operator, value)
);

-- Index for fast rule lookups
CREATE INDEX IF NOT EXISTS contact_batch_rules_batch_id_idx ON public.contact_batch_rules (batch_id);
CREATE INDEX IF NOT EXISTS contact_batch_rules_field_idx ON public.contact_batch_rules (field);

-- Add membership_source to contact_batch_members
ALTER TABLE public.contact_batch_members
  ADD COLUMN IF NOT EXISTS membership_source text NOT NULL DEFAULT 'manual'
  CHECK (membership_source IN ('manual', 'rule'));

-- Trigger to update updated_at on contact_batch_rules
CREATE OR REPLACE FUNCTION public.set_contact_batch_rules_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER contact_batch_rules_updated_at
  BEFORE UPDATE ON public.contact_batch_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.set_contact_batch_rules_updated_at();

-- RLS policies
ALTER TABLE public.contact_batch_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "WhatsApp admins can manage batch rules"
  ON public.contact_batch_rules FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Grant permissions
GRANT SELECT ON public.contact_batch_rules TO authenticated, service_role;

-- Function to evaluate rules for a single contact
CREATE OR REPLACE FUNCTION public.evaluate_batch_rules_for_contact(p_lead_id uuid)
RETURNS TABLE (batch_id uuid, rule_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lead_rec RECORD;
  rule_rec RECORD;
  field_value text;
  match_found boolean;
BEGIN
  -- Get the contact/lead
  SELECT * INTO lead_rec FROM public.leads WHERE id = p_lead_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Get all active rules
  FOR rule_rec IN
    SELECT r.id AS rule_id, r.batch_id, r.field, r.operator, r.value
    FROM public.contact_batch_rules r
    JOIN public.contact_batches b ON b.id = r.batch_id
    WHERE r.is_active AND b.is_active
  LOOP
    match_found := false;
    field_value := NULL;

    -- Get the field value from the lead
    CASE rule_rec.field
      WHEN 'business_type' THEN field_value := lead_rec.business_type;
      WHEN 'city' THEN field_value := lead_rec.city;
      WHEN 'source' THEN field_value := lead_rec.source;
      WHEN 'status' THEN field_value := lead_rec.status;
      WHEN 'whatsapp_opt_in_source' THEN field_value := lead_rec.whatsapp_opt_in_source;
      ELSE field_value := NULL;
    END CASE;

    -- Evaluate the rule
    IF field_value IS NOT NULL AND field_value <> '' THEN
      CASE rule_rec.operator
        WHEN 'equals' THEN
          IF field_value = rule_rec.value THEN match_found := true; END IF;
        WHEN 'not_equals' THEN
          IF field_value <> rule_rec.value THEN match_found := true; END IF;
        WHEN 'contains' THEN
          IF field_value ILIKE '%' || rule_rec.value || '%' THEN match_found := true; END IF;
        WHEN 'starts_with' THEN
          IF field_value ILIKE rule_rec.value || '%' THEN match_found := true; END IF;
        WHEN 'is_set' THEN
          match_found := true;
        WHEN 'is_not_set' THEN
          match_found := false; -- field is set, so this doesn't match
        ELSE
          match_found := false;
      END CASE;
    ELSE
      -- Field is NULL or empty
      CASE rule_rec.operator
        WHEN 'is_not_set' THEN
          match_found := true;
        WHEN 'is_set' THEN
          match_found := false;
        ELSE
          match_found := false;
      END CASE;
    END IF;

    -- If rule matches and contact is not already in this batch via rule, add membership
    IF match_found THEN
      -- Check if already a member via rule
      IF NOT EXISTS (
        SELECT 1 FROM public.contact_batch_members
        WHERE batch_id = rule_rec.batch_id AND lead_id = p_lead_id AND membership_source = 'rule'
      ) THEN
        INSERT INTO public.contact_batch_members (batch_id, lead_id, membership_source)
        VALUES (rule_rec.batch_id, p_lead_id, 'rule')
        ON CONFLICT (batch_id, lead_id) DO UPDATE SET membership_source = 'rule';
        
        RETURN QUERY SELECT rule_rec.batch_id, rule_rec.id;
      END IF;
    END IF;
  END LOOP;

  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_batch_rules_for_contact(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_batch_rules_for_contact(uuid) TO service_role;

-- Function to evaluate all rules for all contacts (for bulk re-evaluation)
CREATE OR REPLACE FUNCTION public.re_evaluate_all_batch_rules()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lead_rec RECORD;
  assigned_count integer := 0;
  rule_result RECORD;
BEGIN
  FOR lead_rec IN SELECT id FROM public.leads LOOP
    FOR rule_result IN SELECT * FROM public.evaluate_batch_rules_for_contact(lead_rec.id) LOOP
      assigned_count := assigned_count + 1;
    END LOOP;
  END LOOP;
  RETURN assigned_count;
END;
$$;

REVOKE ALL ON FUNCTION public.re_evaluate_all_batch_rules() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.re_evaluate_all_batch_rules() TO service_role;