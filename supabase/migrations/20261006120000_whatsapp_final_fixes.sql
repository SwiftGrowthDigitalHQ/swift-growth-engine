-- WhatsApp production safety deltas.
-- This migration is separate from the original feature migrations so it can be
-- applied whether those migrations are already recorded remotely or still pending.

-- WhatsApp profile details are optional; inbound contacts may not provide them.
ALTER TABLE public.leads
  ALTER COLUMN name DROP NOT NULL,
  ALTER COLUMN business_type DROP NOT NULL,
  ALTER COLUMN city DROP NOT NULL;

-- Evaluate one contact against all active rules, or only one selected batch.
-- Manual memberships remain manual and stale automatic memberships are removed.
CREATE OR REPLACE FUNCTION public.evaluate_contact_batch_rules(
  p_lead_id uuid,
  p_batch_id uuid DEFAULT NULL
)
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
  matched_batch_ids uuid[] := ARRAY[]::uuid[];
  inserted_count integer;
BEGIN
  SELECT * INTO lead_rec FROM public.leads WHERE id = p_lead_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  FOR rule_rec IN
    SELECT r.id AS rule_id, r.batch_id, r.field, r.operator, r.value
    FROM public.contact_batch_rules r
    JOIN public.contact_batches b ON b.id = r.batch_id
    WHERE r.is_active AND b.is_active
      AND (p_batch_id IS NULL OR r.batch_id = p_batch_id)
  LOOP
    match_found := false;
    field_value := NULL;

    CASE rule_rec.field
      WHEN 'business_type' THEN field_value := lead_rec.business_type;
      WHEN 'city' THEN field_value := lead_rec.city;
      WHEN 'source' THEN field_value := lead_rec.source;
      WHEN 'status' THEN field_value := lead_rec.status;
      WHEN 'whatsapp_opt_in_source' THEN field_value := lead_rec.whatsapp_opt_in_source;
      ELSE field_value := NULL;
    END CASE;

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
          match_found := false;
        ELSE
          match_found := false;
      END CASE;
    ELSE
      CASE rule_rec.operator
        WHEN 'is_not_set' THEN
          match_found := true;
        WHEN 'is_set' THEN
          match_found := false;
        ELSE
          match_found := false;
      END CASE;
    END IF;

    IF match_found THEN
      matched_batch_ids := array_append(matched_batch_ids, rule_rec.batch_id);
      INSERT INTO public.contact_batch_members (batch_id, lead_id, membership_source)
      VALUES (rule_rec.batch_id, p_lead_id, 'rule')
      ON CONFLICT (batch_id, lead_id) DO NOTHING;
      GET DIAGNOSTICS inserted_count = ROW_COUNT;
      IF inserted_count > 0 THEN
        RETURN QUERY SELECT rule_rec.batch_id, rule_rec.rule_id;
      END IF;
    END IF;
  END LOOP;

  DELETE FROM public.contact_batch_members AS member
  WHERE member.lead_id = p_lead_id
    AND member.membership_source = 'rule'
    AND (p_batch_id IS NULL OR member.batch_id = p_batch_id)
    AND NOT (member.batch_id = ANY(matched_batch_ids));

  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_contact_batch_rules(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_contact_batch_rules(uuid, uuid) TO service_role;

-- Keep the existing RPC used by inbound messages and contact updates.
CREATE OR REPLACE FUNCTION public.evaluate_batch_rules_for_contact(p_lead_id uuid)
RETURNS TABLE (batch_id uuid, rule_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.evaluate_contact_batch_rules(p_lead_id, NULL);
$$;

REVOKE ALL ON FUNCTION public.evaluate_batch_rules_for_contact(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_batch_rules_for_contact(uuid) TO service_role;

-- Re-evaluate every contact against rules for one batch, including new matches.
CREATE OR REPLACE FUNCTION public.re_evaluate_batch_rules_for_batch(p_batch_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lead_rec RECORD;
  assigned_count integer := 0;
  contact_assigned_count integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.contact_batches WHERE id = p_batch_id) THEN
    RAISE EXCEPTION 'Batch not found';
  END IF;

  FOR lead_rec IN SELECT id FROM public.leads LOOP
    SELECT count(*)::integer
      INTO contact_assigned_count
      FROM public.evaluate_contact_batch_rules(lead_rec.id, p_batch_id);
    assigned_count := assigned_count + contact_assigned_count;
  END LOOP;

  RETURN assigned_count;
END;
$$;

REVOKE ALL ON FUNCTION public.re_evaluate_batch_rules_for_batch(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.re_evaluate_batch_rules_for_batch(uuid) TO service_role;
