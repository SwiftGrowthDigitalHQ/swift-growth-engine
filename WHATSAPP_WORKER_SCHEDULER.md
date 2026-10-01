# WhatsApp Worker Scheduler

## Overview
The campaign worker (`whatsapp-campaign-worker` Edge Function) must be triggered on a schedule to process queued campaign recipients. Supabase does not automatically schedule Edge Functions - this must be configured separately.

## Scheduler Options

### Option 1: Supabase pg_cron (Recommended for Supabase-hosted projects)

**Prerequisites:**
- Enable `pg_cron`, `pg_net`, and `vault` extensions in Supabase
- Store secrets in Supabase Vault

**Setup:**
1. Enable extensions in Supabase Dashboard > Database > Extensions
2. Create Vault secrets:
   - `whatsapp_worker_secret` - Must match `WHATSAPP_WORKER_SECRET` Edge Function secret
   - `supabase_publishable_key` - Your project's publishable (anon) key
3. Run the following SQL in Supabase SQL Editor:

```sql
-- Create the cron job to run every minute
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

**Verification:**
```sql
-- Check if job is scheduled
select * from cron.job;

-- Check run history
select * from cron.job_run_details order by start_time desc limit 10;
```

**To remove:**
```sql
select cron.unschedule('swiftgrowth-whatsapp-campaign-worker');
```

### Option 2: Vercel Cron Jobs

If using Vercel for hosting, add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/whatsapp-worker",
      "schedule": "* * * * *"
    }
  ]
}
```

Create `/src/app/api/cron/whatsapp-worker/route.ts`:
```typescript
import { NextResponse } from "next/server";

export async function GET() {
  const workerUrl = "https://yhfcziouwodhjvukgjhr.supabase.co/functions/v1/whatsapp-campaign-worker";
  const workerSecret = process.env.WHATSAPP_WORKER_SECRET;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!workerSecret || !publishableKey) {
    return NextResponse.json({ error: "Missing configuration" }, { status: 500 });
  }

  try {
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": publishableKey,
        "x-whatsapp-worker-secret": workerSecret,
      },
      body: JSON.stringify({}),
    });

    const result = await response.json();
    return NextResponse.json({ success: response.ok, ...result });
  } catch (error) {
    return NextResponse.json({ error: "Worker invocation failed" }, { status: 500 });
  }
}
```

### Option 3: External Scheduler (GitHub Actions, cron-job.org, etc.)

**GitHub Actions Example:**
```yaml
name: WhatsApp Campaign Worker
on:
  schedule:
    - cron: '* * * * *'  # Every minute
jobs:
  trigger-worker:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger WhatsApp Campaign Worker
        run: |
          curl -X POST "https://yhfcziouwodhjvukgjhr.supabase.co/functions/v1/whatsapp-campaign-worker" \
            -H "Content-Type: application/json" \
            -H "apikey: ${{ secrets.SUPABASE_PUBLISHABLE_KEY }}" \
            -H "x-whatsapp-worker-secret: ${{ secrets.WHATSAPP_WORKER_SECRET }}" \
            -d '{}'
```

## Worker Configuration

**Edge Function Secrets Required:**
- `WHATSAPP_WORKER_SECRET` - Strong random string (32+ chars)

**Worker Behavior:**
- Claims up to 5 recipients per invocation (`p_limit: 5`)
- Re-checks consent immediately before sending
- Sends via Meta Graph API
- Stores Meta message ID (`wamid`)
- Updates recipient status to `sent`
- Reconciles early webhook statuses
- Finalizes campaigns with no pending recipients
- Records execution in `whatsapp_worker_runs`

**Failure Handling:**
- Network errors: Marked as failed with "unknown outcome" reason (NOT auto-retried)
- Meta API errors: Recorded with error code/message
- Consent withdrawn after queueing: Marked as failed
- Worker run failures: Logged in `whatsapp_worker_runs` with error_code

## Monitoring

**Check worker health via admin dashboard:**
- Configuration tab shows "Campaign scheduler: Active/No recent run"
- Worker runs tab shows recent executions with sent/failed counts

**Database queries:**
```sql
-- Recent worker runs
select * from whatsapp_worker_runs order by started_at desc limit 10;

-- Queued recipients waiting for worker
select count(*) from whatsapp_campaign_recipients where status = 'queued';

-- Campaigns stuck in queued/sending
select * from whatsapp_campaigns where status in ('queued', 'sending');
```

## Production Checklist

- [ ] `pg_cron`, `pg_net`, `vault` extensions enabled in Supabase
- [ ] Vault secrets created: `whatsapp_worker_secret`, `supabase_publishable_key`
- [ ] Cron job created and active
- [ ] `WHATSAPP_WORKER_SECRET` set in Edge Function secrets
- [ ] Worker runs visible in `whatsapp_worker_runs` table
- [ ] Campaigns progress from `queued` → `sending` → `sent` → `delivered`/`read`