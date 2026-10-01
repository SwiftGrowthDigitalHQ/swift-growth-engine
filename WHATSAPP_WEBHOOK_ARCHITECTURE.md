# WhatsApp Webhook Architecture

## Overview
This document describes the webhook architecture for receiving Meta WhatsApp Cloud API events (message status updates, incoming messages, errors).

## Architecture Diagram

```
┌─────────────────┐     HTTPS POST/GET      ┌──────────────────────────┐
│   Meta/WhatsApp │ ──────────────────────► │  https://www.swiftgrowth │
│   Cloud API     │                         │  digital.com/api/webhooks│
└─────────────────┘                         │  /whatsapp               │
                                            └───────────┬──────────────┘
                                                        │ Vercel Rewrite
                                                        ▼
                                            ┌──────────────────────────┐
                                            │  Supabase Edge Function  │
                                            │  whatsapp-webhook        │
                                            │  (yhfcziouwodhjvukgjhr.  │
                                            │   supabase.co/functions/ │
                                            │   v1/whatsapp-webhook)   │
                                            └───────────┬──────────────┘
                                                        │
                            ┌───────────────────────────┼───────────────────────────┐
                            ▼                           ▼                           ▼
                   ┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
                   │ Incoming        │         │ Status Updates  │         │ Account Errors  │
                   │ Messages        │         │ (sent/delivered/│         │                 │
                   │                 │         │  read/failed)   │         │                 │
                   └────────┬────────┘         └────────┬────────┘         └────────┬────────┘
                            │                           │                           │
                            ▼                           ▼                           ▼
                   ┌─────────────────────────────────────────────────────────────────┐
                   │                    Supabase Database                            │
                   │  • whatsapp_webhook_events (raw events + deduplication)        │
                   │  • whatsapp_messages (message status + metadata)               │
                   │  • whatsapp_campaign_recipients (campaign-level status)        │
                   │  • leads (opt-out on STOP messages)                            │
                   └─────────────────────────────────────────────────────────────────┘
```

## URL Configuration

### Production Webhook URL (Meta Dashboard)
```
https://www.swiftgrowthdigital.com/api/webhooks/whatsapp
```

### Actual Edge Function Endpoint
```
https://yhfcziouwodhjvukgjhr.supabase.co/functions/v1/whatsapp-webhook
```

### Vercel Rewrite Rule (`vercel.json`)
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

## Webhook Verification (GET)

**Meta sends:**
```
GET /api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=CHALLENGE_STRING
```

**Function validates:**
1. `hub.mode === "subscribe"`
2. `hub.verify_token` matches `WHATSAPP_WEBHOOK_VERIFY_TOKEN` secret (constant-time comparison)
3. Returns `hub.challenge` as plain text with 200 OK

**Security:** Never logs the real verify token. Health check uses an invalid token to probe reachability.

## Webhook Processing (POST)

### Signature Verification
1. Reads raw request body
2. Computes HMAC-SHA256 using `META_APP_SECRET`
3. Compares with `X-Hub-Signature-256` header (constant-time)
4. Rejects with 401 if invalid

### Payload Validation
```typescript
// Required structure
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "WABA_ID",
    "changes": [{
      "field": "messages",
      "value": {
        "metadata": {
          "phone_number_id": "PHONE_NUMBER_ID",
          "display_phone_number": "15551234567"
        },
        "contacts": [...],      // Optional - for incoming messages
        "messages": [...],      // Incoming messages
        "statuses": [...],      // Status updates
        "errors": [...]         // Account errors
      }
    }]
  }]
}
```

**Validates:**
- `object === "whatsapp_business_account"`
- `entry[].id` matches `WHATSAPP_BUSINESS_ACCOUNT_ID` (if configured)
- `value.metadata.phone_number_id` matches `WHATSAPP_PHONE_NUMBER_ID`

### Event Processing

#### Incoming Messages
- Stores in `whatsapp_messages` with `direction: "inbound"`, `status: "received"`
- Creates/updates lead `whatsapp_last_message_at`
- Detects opt-out keywords: `STOP`, `UNSUBSCRIBE`, `CANCEL`, `END`, `QUIT` (case-insensitive)
- Auto-sets `whatsapp_opt_out = true`, clears opt-in fields on opt-out

#### Status Updates
Supported statuses: `sent`, `delivered`, `read`, `failed`

**Processing flow:**
1. Creates deduplicated event in `whatsapp_webhook_events` using `event_key`
2. Calls `apply_whatsapp_message_status()` RPC function
3. Updates `whatsapp_messages` status + timestamps
4. Updates `whatsapp_campaign_recipients` status + timestamps
5. Marks webhook event as `processed_at`

**Status transitions (enforced by RPC):**
```
queued → sending → sent → delivered → read
                    ↘ failed (terminal)
```

#### Deduplication
- `event_key` unique constraint prevents duplicate processing
- Format: `status:{message_id}:{status}:{timestamp}:{recipient_id}`
- Meta may retry webhooks - duplicates safely ignored

## Database Functions

### `apply_whatsapp_message_status()`
```sql
apply_whatsapp_message_status(
  p_meta_message_id text,
  p_status text,           -- 'sent' | 'delivered' | 'read' | 'failed'
  p_event_timestamp timestamptz,
  p_error_metadata jsonb,
  p_response_metadata jsonb
)
```
- Idempotent status updates
- Enforces valid state transitions
- Updates both `whatsapp_messages` and `whatsapp_campaign_recipients`
- Records timestamps for each status change

## Security

### Secrets (Server-side only)
| Secret | Purpose |
|--------|---------|
| `META_APP_SECRET` | Verify webhook signatures |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | GET challenge validation |
| `WHATSAPP_WEBHOOK_PUBLIC_URL` | Health check probe target |

### Access Control
- Edge Function: `verify_jwt = false` (public endpoint)
- Database: RLS policies restrict to admin role
- Service role used for all database operations

## Testing

### Local Testing with ngrok
```bash
# Start ngrok tunnel to local Supabase (if running locally)
ngrok http 54321

# Or test against deployed function
curl -X GET "https://yhfcziouwodhjvukgjhr.supabase.co/functions/v1/whatsapp-webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test123"
```

### Health Check Probe
The admin dashboard health check probes webhook reachability by sending an invalid verify token and expecting a 403 response.

## Troubleshooting

### Webhook not receiving events
1. Check Meta Dashboard > Webhooks > WhatsApp Business Account
2. Verify callback URL: `https://www.swiftgrowthdigital.com/api/webhooks/whatsapp`
3. Verify `hub.verify_token` matches `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
4. Check Vercel rewrite is deployed
5. Check Supabase Edge Function logs

### Signature verification failing
1. Ensure `META_APP_SECRET` is set correctly in Supabase secrets
2. Check raw body is used (not parsed JSON)
3. Verify `X-Hub-Signature-256` header format: `sha256=...`

### Events not appearing in database
1. Check `whatsapp_webhook_events` table for raw events
2. Check function logs for processing errors
3. Verify `apply_whatsapp_message_status` RPC permissions (service_role only)

### Duplicate events
- Normal - Meta retries webhooks
- Deduplication via `event_key` unique constraint
- Check `processed_at` column for processing status