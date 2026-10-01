# WhatsApp Production Setup Guide

## Prerequisites

### Meta Business Assets
1. **Meta App** with WhatsApp product added
2. **WhatsApp Business Account (WABA)** verified
3. **Phone Number** registered and verified
4. **System User** with `whatsapp_business_messaging` and `whatsapp_business_management` permissions
5. **System User Access Token** (long-lived, not temporary dashboard token)
6. **Approved Message Templates** in WhatsApp Manager

### Supabase Project
- Project ID: `yhfcziouwodhjvukgjhr`
- Database with migrations applied
- Edge Functions deployed
- Secrets configured

### Vercel Project
- Domain: `www.swiftgrowthdigital.com`
- Rewrite rule for webhook proxy

## Step 1: Configure Meta App

### 1.1 Create/Select Meta App
- Go to [Meta for Developers](https://developers.facebook.com/)
- Create or select app, add "WhatsApp" product

### 1.2 WhatsApp Business Account Setup
- In WhatsApp > API Setup, select WABA and phone number
- Record: **WABA ID**, **Phone Number ID** (not the display number)

### 1.3 Business Verification
- Complete business verification in Meta Business Settings
- Submit for review if required for production access

### 1.4 System User Token
- Meta Business Settings > Users > System Users
- Create or select system user
- Assign app and WhatsApp assets
- Generate token with:
  - `whatsapp_business_messaging`
  - `whatsapp_business_management`
- **Save token securely** - only shown once

### 1.5 Webhook Configuration
- App Dashboard > Webhooks > WhatsApp Business Account
- Callback URL: `https://www.swiftgrowthdigital.com/api/webhooks/whatsapp`
- Verify Token: Use value from `WHATSAPP_WEBHOOK_VERIFY_TOKEN` secret
- Subscribe to: `messages` field
- Save and verify

### 1.6 Subscribe App to WABA
```bash
curl -X POST "https://graph.facebook.com/v20.0/{WABA_ID}/subscribed_apps" \
  -H "Authorization: Bearer {SYSTEM_USER_TOKEN}" \
  -H "Content-Type: application/json"
```

## Step 2: Configure Supabase Secrets

Go to Supabase Dashboard > Project Settings > Edge Functions > Secrets

| Secret | Value | Source |
|--------|-------|--------|
| `WHATSAPP_ACCESS_TOKEN` | System User token from Meta | Step 1.4 |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone Number ID from Meta | Step 1.2 |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | WABA ID from Meta | Step 1.2 |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Strong random string (32+ chars) | Generate new |
| `META_APP_SECRET` | App Secret from Meta App Dashboard | Meta App > Settings > Basic |
| `WHATSAPP_API_VERSION` | `v20.0` (or current stable) | Meta API versioning |
| `WHATSAPP_WEBHOOK_PUBLIC_URL` | `https://www.swiftgrowthdigital.com/api/webhooks/whatsapp` | Fixed |
| `WHATSAPP_WORKER_SECRET` | Strong random string (32+ chars) | Generate new |

**Generate secrets:**
```bash
# Generate secure random strings
openssl rand -hex 32
```

## Step 3: Deploy Database Migrations

```bash
# Link to Supabase project
supabase link --project-ref yhfcziouwodhjvukgjhr

# Push migrations
supabase db push
```

**Verify tables created:**
- `whatsapp_templates`
- `whatsapp_campaigns`
- `whatsapp_campaign_recipients`
- `whatsapp_messages`
- `whatsapp_webhook_events`
- `whatsapp_worker_runs`
- `leads` (with whatsapp_* columns)

## Step 4: Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy whatsapp-webhook
supabase functions deploy whatsapp-service
supabase functions deploy whatsapp-campaign-worker
supabase functions deploy submit-lead

# Verify deployment
supabase functions list
```

## Step 5: Configure Vercel

### 5.1 Deploy Vercel Project
- Connect GitHub repository
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`

### 5.2 Environment Variables (Vercel)
Only public variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

### 5.3 Verify Rewrite Rule
`vercel.json` must contain:
```json
{
  "rewrites": [
    {
      "source": "/api/webhooks/whatsapp",
      "destination": "https://yhfcziouwodhjvukgjhr.supabase.co/functions/v1/whatsapp-webhook"
    }
  ]
}
```

### 5.4 Custom Domain
- Add `www.swiftgrowthdigital.com` in Vercel Domains
- Configure DNS (CNAME to `cname.vercel-dns.com`)
- Ensure HTTPS works

## Step 6: Configure Worker Scheduler

### Option A: Supabase pg_cron (Recommended)

**Enable extensions:**
Supabase Dashboard > Database > Extensions > Enable:
- `pg_cron`
- `pg_net`
- `vault`

**Create Vault secrets:**
Supabase Dashboard > Database > Vault
- `whatsapp_worker_secret` = value from `WHATSAPP_WORKER_SECRET`
- `supabase_publishable_key` = your project's anon/publishable key

**Create cron job** (run in SQL Editor):
```sql
select cron.schedule(
  'swiftgrowth-whatsapp-campaign-worker',
  '* * * * *',
  $$
    select net.http_post(
      url := 'https://yhfcziouwodhjvukgjhr.supabase.co/functions/v1/whatsapp-campaign-worker',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey',
        (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_publishable_key' limit 1),
        'x-whatsapp-worker-secret',
        (select decrypted_secret from vault.decrypted_secrets where name = 'whatsapp_worker_secret' limit 1)
      ),
      body := '{}'::jsonb
    );
  $$
);
```

**Verify:**
```sql
select * from cron.job;
select * from cron.job_run_details order by start_time desc limit 5;
```

### Option B: External Scheduler
Use GitHub Actions, cron-job.org, or similar to POST to worker endpoint every minute.

## Step 7: Create Admin User

### 7.1 Supabase Auth
- Go to Supabase Dashboard > Authentication > Users
- Create user or use existing
- Set `app_metadata.role = "admin"` (not `user_metadata`)

**SQL to set admin role:**
```sql
update auth.users
set raw_app_meta_data = jsonb_set(
  coalesce(raw_app_meta_data, '{}'),
  '{role}',
  '"admin"'
)
where email = 'your-admin@email.com';
```

### 7.2 Test Login
- Visit `https://www.swiftgrowthdigital.com/admin/whatsapp`
- Sign in with admin credentials
- Should see WhatsApp Management dashboard

## Step 8: Sync Templates

1. In WhatsApp Admin > Templates tab
2. Click "Sync from Meta"
3. Verify approved templates appear with `APPROVED` status
4. Only `APPROVED` templates can be used for campaigns

## Step 9: Test End-to-End Flow

### 9.1 Add Test Contact
- Go to Contacts tab
- Find or create a lead with valid phone number
- Click "Record opt-in" and provide consent source
- Verify contact shows as eligible

### 9.2 Create Test Campaign
- Go to Campaigns tab
- Enter campaign name
- Select approved template
- Select opted-in contact(s)
- Click "Queue campaign"
- Verify success message with queued count

### 9.3 Trigger Worker
- Wait for cron job (up to 1 minute) or manually trigger:
```bash
curl -X POST "https://yhfcziouwodhjvukgjhr.supabase.co/functions/v1/whatsapp-campaign-worker" \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_PUBLISHABLE_KEY" \
  -H "x-whatsapp-worker-secret: YOUR_WORKER_SECRET" \
  -d '{}'
```

### 9.4 Verify Delivery
- Check Campaigns tab for status updates
- Check Messages tab for message records with Meta message IDs
- Check Webhook Events tab for `sent`/`delivered`/`read` events
- Check Analytics tab for delivery/read rates

### 9.5 Test Opt-Out
- Send "STOP" from test phone to WhatsApp number
- Verify contact shows as opted out in Contacts tab
- Verify future campaigns exclude this contact

## Step 10: Production Verification Checklist

### Frontend
- [ ] Build succeeds (`npm run build`)
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] Admin login works
- [ ] Non-admin access denied
- [ ] All tabs load data

### Supabase
- [ ] Migrations applied
- [ ] RLS policies active
- [ ] Functions deployed
- [ ] Secrets configured
- [ ] Vault secrets created (for pg_cron)

### Meta
- [ ] App configured with WhatsApp
- [ ] Business verification complete
- [ ] System User token active
- [ ] Phone number verified
- [ ] At least one `APPROVED` template
- [ ] Webhook verified and subscribed
- [ ] App subscribed to WABA

### Worker
- [ ] Scheduler active (pg_cron or external)
- [ ] Worker secret matches
- [ ] Worker runs visible in `whatsapp_worker_runs`
- [ ] Queued recipients processed

### Webhook
- [ ] GET verification works
- [ ] POST signature verification works
- [ ] Real Meta events received
- [ ] Events stored in `whatsapp_webhook_events`
- [ ] Status updates propagate to messages/recipients

### Database
- [ ] Message IDs saved (`meta_message_id`)
- [ ] Statuses update: `queued` → `sent` → `delivered` → `read`
- [ ] Campaign analytics match raw data
- [ ] Opt-out respected

## Troubleshooting

### Campaign stuck in "queued"
- Check worker scheduler is running
- Check `whatsapp_worker_runs` for recent runs
- Check worker function logs for errors
- Verify `WHATSAPP_WORKER_SECRET` matches

### Messages not sending
- Check Meta API health in Configuration tab
- Verify access token not expired
- Check phone number ID matches
- Check template is `APPROVED`

### Webhook not receiving
- Check Vercel rewrite deployed
- Check Supabase function logs
- Verify Meta webhook subscription active
- Check `META_APP_SECRET` correct

### Opt-out not working
- Verify incoming message webhook processes `STOP`
- Check `whatsapp_opt_out` column updates
- Verify campaign creation filters opted-out contacts

## Maintenance

### Rotate Secrets
- Meta System User token: Per Meta policy (typically 60-90 days)
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`: On suspicion of compromise
- `META_APP_SECRET`: Rotate in Meta, update Supabase
- `WHATSAPP_WORKER_SECRET`: Rotate periodically

### Monitor
- Worker run success/failure rates
- Message delivery rates
- Failed message reasons
- Webhook processing latency

### Database Maintenance
- Archive old webhook events periodically
- Monitor table sizes
- Review `whatsapp_worker_runs` for patterns