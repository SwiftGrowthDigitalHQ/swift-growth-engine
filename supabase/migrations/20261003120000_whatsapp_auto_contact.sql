-- WhatsApp Auto-Contact: Add normalized WhatsApp column and unique constraint
-- This migration enables automatic contact creation from inbound WhatsApp messages
-- by providing a deduplication key for the leads table.

-- Add normalized WhatsApp column to leads table
-- This stores the phone number in normalized format (e.g., "919709774756")
-- matching the normalizeRecipient() function output
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS whatsapp_normalized text;

-- Populate whatsapp_normalized for existing rows using the same logic as normalizeRecipient()
-- 10-digit numbers get "91" prefix (India), others keep as-is (international)
UPDATE public.leads
SET whatsapp_normalized = CASE
  WHEN regexp_replace(whatsapp, '\D', '', 'g') ~ '^\d{10}$' THEN '91' || regexp_replace(whatsapp, '\D', '', 'g')
  ELSE regexp_replace(whatsapp, '\D', '', 'g')
END
WHERE whatsapp_normalized IS NULL AND whatsapp IS NOT NULL;

-- Create unique index on whatsapp_normalized for deduplication
-- Only enforce uniqueness where the normalized value is not null
CREATE UNIQUE INDEX IF NOT EXISTS leads_whatsapp_normalized_unique_idx
  ON public.leads (whatsapp_normalized)
  WHERE whatsapp_normalized IS NOT NULL;

-- Create function to auto-update whatsapp_normalized on insert/update
CREATE OR REPLACE FUNCTION public.set_leads_whatsapp_normalized()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.whatsapp IS NOT NULL THEN
    NEW.whatsapp_normalized := CASE
      WHEN regexp_replace(NEW.whatsapp, '\D', '', 'g') ~ '^\d{10}$'
        THEN '91' || regexp_replace(NEW.whatsapp, '\D', '', 'g')
      ELSE regexp_replace(NEW.whatsapp, '\D', '', 'g')
    END;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to maintain whatsapp_normalized
DROP TRIGGER IF EXISTS leads_whatsapp_normalized ON public.leads;
CREATE TRIGGER leads_whatsapp_normalized
  BEFORE INSERT OR UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.set_leads_whatsapp_normalized();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.set_leads_whatsapp_normalized() TO service_role;

-- Add index for faster lookups by normalized WhatsApp (if not covered by unique index)
-- The unique index already serves this purpose, but keeping for clarity
-- CREATE INDEX IF NOT EXISTS leads_whatsapp_normalized_idx ON public.leads (whatsapp_normalized);

-- Add source value for WhatsApp auto-created contacts
-- The existing leads table uses 'source' column, default 'contact_form'
-- We'll use 'whatsapp_inbound' for auto-created contacts from webhook