# WhatsApp Implementation Audit

## Project Overview
- Repository: `swift-growth-engine`
- Supabase Project: `yhfcziouwodhjvukgjhr`
- Production URL: `https://www.swiftgrowthdigital.com`
- WhatsApp Admin Route: `/admin/whatsapp`

---

## Existing Functionality

### 1. Database Schema (Migrations)
**File: `supabase/migrations/20261001120000_whatsapp_cloud_api.sql`**

**Tables Created:**
- `whatsapp_templates` - Stores Meta templates with status, components, WABA ID
- `whatsapp_campaigns` - Campaign records with status, template reference
- `whatsapp_campaign_recipients` - Individual recipients per campaign with status tracking
- `whatsapp_messages` - Message records with Meta message ID, status, metadata
- `whatsapp_webhook_events` - Webhook event log with idempotency via `event_key`
- `whatsapp_worker_runs` - Worker execution history

**Leads Table Extensions:**
- `whatsapp_opt_in` (boolean, default false)
- `whatsapp_opt_in_at` (timestamptz)
- `whatsapp_opt_in_source` (text)
- `whatsapp_opt_out` (boolean, default false)
- `whatsapp_opt_out_at` (timestamptz)
- `whatsapp_last_message_at` (timestamptz)

**Key Functions:**
- `claim_whatsapp_campaign_recipients(p_limit)` - Atomic claim with `FOR UPDATE SKIP LOCKED`
- `suppress_whatsapp_ineligible_recipients()` - Marks ineligible queued recipients as failed
- `apply_whatsapp_message_status()` - Idempotent status updates from webhooks
- `whatsapp_campaign_analytics` view - Aggregated campaign metrics

**Indexes:**
- `leads_whatsapp_eligibility_idx` on (opt_in, opt_out, created_at)
- `leads_whatsapp_number_idx` on normalized phone
- `whatsapp_templates_status_idx` on (status, name)
- `whatsapp_campaigns_status_created_idx` on (status, created_at)
- `whatsapp_campaign_recipients_queue_idx` partial on (status, created_at) WHERE status='queued'
- `whatsapp_campaign_recipients_campaign_status_idx` on (campaign_id, status)
- `whatsapp_messages_status_created_idx` on (status, created_at)
- `whatsapp_messages_lead_created_idx` on (lead_id, created_at)
- `whatsapp_webhook_events_received_idx` on received_at DESC
- `whatsapp_webhook_events_message_idx` partial on (meta_message_id, received_at)
- `whatsapp_worker_runs_started_idx` on started_at DESC

**RLS Policies:**
- All WhatsApp tables restricted to `role='admin'` in app_metadata
- Leads: admin SELECT/UPDATE only
- Service role has full access

### 2. Edge Functions

#### `whatsapp-service` (admin API)
**File: `supabase/functions/whatsapp-service/index.ts`**

Actions implemented:
- `health` - Full configuration check including Meta API, webhook, worker
- `refresh_templates` - Syncs templates from Meta Graph API
- `list_templates` - Lists stored templates
- `list_contacts` - Paginated leads with consent fields
- `update_contact_consent` - Opt-in/opt-out with evidence source
- `create_campaign` - Validates template, consent, creates campaign + recipients
- `list_campaigns` - Returns analytics view
- `list_messages` - Recent message records
- `list_webhook_events` - Recent webhook events

**Security:**
- JWT verification required (`verify_jwt = true`)
- Admin role check via `app_metadata.role === 'admin'`
- Service role client for database operations
- CORS restricted to known origins
- Request size limits

#### `whatsapp-webhook`
**File: `supabase/functions/whatsapp-webhook/index.ts`**

Features:
- GET verification with `hub.verify_token` constant-time comparison
- POST signature verification using `META_APP_SECRET` and `X-Hub-Signature-256`
- Payload validation: `object === 'whatsapp_business_account'`, WABA ID match, phone number ID match
- Processes incoming messages (text, media, etc.)
- Processes status updates: `sent`, `delivered`, `read`, `failed`
- Handles `STOP`/`UNSUBSCRIBE`/etc. → auto opt-out
- Idempotent event storage via unique `event_key`
- Records raw webhook events with metadata

**Security:**
- No JWT verification (`verify_jwt = false`)
- Signature verification mandatory
- Service role client

#### `whatsapp-campaign-worker`
**File: `supabase/functions/whatsapp-campaign-worker/index.ts`**

Features:
- Authenticated via `x-whatsapp-worker-secret` header
- Calls `suppress_whatsapp_ineligible_recipients()` before claiming
- Claims up to 5 recipients per batch via `claim_whatsapp_campaign_recipients(5)`
- Re-checks consent immediately before sending
- Sends template messages via Meta Graph API
- Stores Meta message ID (`wamid`)
- Updates recipient and message status to `sent`
- Reconciles early webhook statuses for the message
- Finalizes campaigns with no pending recipients
- Records worker run with counts

**Batch Size:** 5 recipients per invocation

#### `submit-lead`
**File: `supabase/functions/submit-lead/index.ts`**

Creates leads with optional WhatsApp opt-in from contact forms.

### 3. Frontend - WhatsAppAdmin Page
**File: `src/pages/WhatsAppAdmin.tsx`**

Tabs:
1. **Overview** - Dashboard cards + Configuration status + Campaign table
2. **Configuration** - Health check details
3. **Templates** - List + "Sync from Meta" button
4. **Contacts** - Paginated table with opt-in/opt-out actions
5. **Campaigns** - Create form + Campaign analytics table
6. **Messages** - Message history table
7. **Webhook** - Webhook event log table

**Auth:**
- Supabase Auth session
- Admin check: `session.user.app_metadata?.role === 'admin'`
- Redirects non-admin users

**Campaign Creation:**
- Select approved template
- Select contacts (multi-page, retains selection)
- Template components JSON input
- Validates eligibility (opt-in, no opt-out, source, timestamp)

### 4. Webhook Architecture
**Vercel Rewrite:** `/api/webhooks/whatsapp` → `https://yhfcziouwodhjvukgjhr.supabase.co/functions/v1/whatsapp-webhook`

Meta Dashboard should use: `https://www.swiftgrowthdigital.com/api/webhooks/whatsapp`

### 5. Worker Scheduler (Documented but NOT Implemented)
**Documented in `docs/WHATSAPP_CLOUD_API.md`:**
```sql
select cron.schedule(
  'swiftgrowth-whatsapp-campaign-worker',
  '* * * * *',
  $$
    select net.http_post(...)
  $$
);
```
Requires: `pg_cron`, `pg_net`, `vault` extensions + Vault secrets

**Status:** NOT deployed/configured in Supabase

### 6. Configuration
**`.env.example`** lists required secrets (server-side only):
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_BUSINESS_ACCOUNT_ID`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- `META_APP_SECRET`
- `WHATSAPP_API_VERSION`
- `WHATSAPP_WEBHOOK_PUBLIC_URL`
- `WHATSAPP_WORKER_SECRET`

**`.env`** (local) only has VITE_* public vars - correct.

---

## Missing / Incomplete

### 1. Campaign Analytics Page (Separate from Campaigns tab)
- No dedicated `/admin/whatsapp/analytics` or Analytics tab
- Campaign table shows basic metrics but no detailed recipient table with filters

### 2. Worker Scheduler
- No `pg_cron` job deployed
- Campaigns will stay in `queued` forever without external trigger

### 3. TypeScript Types
- `src/integrations/supabase/types.ts` only has `leads` table
- Missing: `whatsapp_templates`, `whatsapp_campaigns`, `whatsapp_campaign_recipients`, `whatsapp_messages`, `whatsapp_webhook_events`, `whatsapp_worker_runs`, `whatsapp_campaign_analytics` view

### 4. Consent Validation Edge Cases
- `normalizeRecipient` prepends `91` for 10-digit numbers
- Doesn't handle numbers already starting with `91` or other country codes correctly in all cases
- Should validate country code logic more carefully

### 5. Campaign Recipient Selection UX
- No search/filter on contacts tab (only pagination)
- No "select all eligible on page" or "select all across pages"

### 6. Error Handling / Retry Logic
- Worker doesn't auto-retry network failures (by design - documented)
- No manual retry UI for failed recipients
- No campaign-level retry

### 6. Webhook Event Details View
- Webhook table shows list but no "view payload" modal

### 7. Message Detail View
- Messages table shows list but no detail view

### 8. Campaign Detail View
- No drill-down from campaign table to recipient list with statuses

### 9. Test Coverage
- Only trivial example test exists
- No integration tests for worker, webhook, campaign flow

### 10. Documentation Files Required
- `WHATSAPP_WORKER_SCHEDULER.md` - Not created
- `WHATSAPP_WEBHOOK_ARCHITECTURE.md` - Not created
- `WHATSAPP_PRODUCTION_SETUP.md` - Not created (though `docs/WHATSAPP_CLOUD_API.md` covers most)
- `WHATSAPP_FLOW.md` - Not created
- `WHATSAPP_FINAL_AUDIT.md` - Not created

---

## Security Risks

### Low Risk
- `.gitignore` excludes `supabase/functions/.env*` - good
- No secrets in frontend code - good
- Admin role verification on both frontend and backend - good
- Webhook signature verification - good
- Worker secret authentication - good
- Constant-time string comparison for secrets - good

### Potential Issues
1. **Webhook URL validation in health check** - Uses invalid token probe, expects 403. Clever but relies on specific error message text.
2. **CORS origins** - Hardcoded in `whatsapp-service`. Should be configurable via secret.
3. **Phone normalization** - `normalizeRecipient` assumes India (+91) for 10-digit numbers. May not work for other countries.

---

## Database Dependencies
- `pg_cron`, `pg_net`, `vault` extensions required for scheduler
- Supabase Vault for worker secret storage

---

## Deployment Dependencies
1. Supabase Edge Functions deployed with secrets
2. Vercel deployment with rewrite rule
3. Meta App configured with webhook URL
4. Meta Business Verification complete
5. System User token with `whatsapp_business_messaging` + `whatsapp_business_management`
6. `pg_cron` job created in Supabase SQL editor

---

## Webhook Architecture Summary
```
Meta → GET/POST https://www.swiftgrowthdigital.com/api/webhooks/whatsapp
     → Vercel Rewrite → Supabase Edge Function: whatsapp-webhook
     → Validates signature (META_APP_SECRET)
     → Processes events
     → Stores in whatsapp_webhook_events
     → Calls apply_whatsapp_message_status() RPC
     → Updates whatsapp_messages + whatsapp_campaign_recipients
```

---

## Worker Scheduler Architecture Summary
```
pg_cron (every minute) → net.http_post → 
  https://yhfcziouwodhjvukgjhr.supabase.co/functions/v1/whatsapp-campaign-worker
  Headers: apikey (publishable key), x-whatsapp-worker-secret
  → Worker claims recipients → Sends via Meta API → Updates DB
```

---

## Files Needing Modification / Creation

### Database
- [ ] Add missing indexes (see Phase 17)
- [ ] Verify RLS policies cover all access patterns

### Backend (Edge Functions)
- [ ] Fix `normalizeRecipient` for international numbers
- [ ] Add manual retry endpoint for failed recipients
- [ ] Add campaign detail endpoint (recipients with status)

### Frontend
- [ ] Add Analytics tab with detailed campaign analytics
- [ ] Add search/filter to Contacts tab
- [ ] Add "Select all eligible" to Campaigns tab
- [ ] Add Webhook event detail modal
- [ ] Add Message detail modal
- [ ] Add Campaign detail view with recipient table
- [ ] Update TypeScript types from Supabase

### Infrastructure
- [ ] Deploy `pg_cron` job for worker
- [ ] Configure Vault secrets
- [ ] Enable required Supabase extensions

### Documentation
- [ ] Create all required .md files

---

## Test Results (Pending)
All Phase 22 tests need to be executed after implementation completion.