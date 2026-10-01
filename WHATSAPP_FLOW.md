# WhatsApp Campaign Flow

```text
ADMIN
  ↓
WHATSAPP ADMIN (/admin/whatsapp)
  ↓
CONTACTS (Leads with WhatsApp consent)
  ↓
CONSENT VALIDATION
  • whatsapp_opt_in = true
  • whatsapp_opt_out = false
  • whatsapp_opt_in_at IS NOT NULL
  • whatsapp_opt_in_source IS NOT NULL AND TRIM() != ''
  ↓
APPROVED TEMPLATE (Meta status = APPROVED)
  ↓
CAMPAIGN CREATION
  • Validate template exists & approved
  • Validate all recipients have consent
  • Create whatsapp_campaigns record (status: 'queued')
  • Create whatsapp_campaign_recipients records (status: 'queued')
  • Invalid numbers → status: 'failed' immediately
  ↓
CAMPAIGN RECIPIENT QUEUE (status: 'queued')
  ↓
WORKER (whatsapp-campaign-worker)
  • Triggered by pg_cron every minute
  • Auth: x-whatsapp-worker-secret header
  • Calls suppress_whatsapp_ineligible_recipients()
  • Calls claim_whatsapp_campaign_recipients(5)
    - FOR UPDATE SKIP LOCKED (atomic claim)
    - Re-checks consent before claiming
  ↓
META WHATSAPP CLOUD API
  POST https://graph.facebook.com/{VERSION}/{PHONE_NUMBER_ID}/messages
  {
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": "PHONE_NUMBER",
    "type": "template",
    "template": {
      "name": "TEMPLATE_NAME",
      "language": { "code": "LANGUAGE_CODE" },
      "components": [...]
    }
  }
  Headers: Authorization: Bearer {WHATSAPP_ACCESS_TOKEN}
  ↓
META RESPONSE
  200 OK → { "messages": [{ "id": "wamid.XXXX" }] }
  → Save meta_message_id (wamid)
  → Update status: 'sent'
  → Save request/response metadata
  
  4xx/5xx → Save error details
  → Update status: 'failed'
  → Save failure_reason
  ↓
WHATSAPP DELIVERY
  ↓
META WEBHOOK (whatsapp-webhook)
  POST https://www.swiftgrowthdigital.com/api/webhooks/whatsapp
  → Vercel Rewrite → Supabase Edge Function
  → Verify X-Hub-Signature-256 (META_APP_SECRET)
  → Validate payload structure
  → Process events:
    
    INCOMING MESSAGE:
    → Store in whatsapp_messages (direction: inbound, status: received)
    → Detect STOP/UNSUBSCRIBE → Auto opt-out lead
    → Update whatsapp_last_message_at
    
    STATUS UPDATE (sent/delivered/read/failed):
    → Create deduplicated whatsapp_webhook_events (event_key)
    → Call apply_whatsapp_message_status() RPC
    → Update whatsapp_messages status + timestamps
    → Update whatsapp_campaign_recipients status + timestamps
    
    ACCOUNT ERROR:
    → Log in whatsapp_webhook_events
  ↓
DATABASE UPDATES
  whatsapp_messages:
  - status: queued → sending → sent → delivered → read
  - meta_message_id, meta_timestamp
  - request_metadata, response_metadata, error_metadata
  
  whatsapp_campaign_recipients:
  - status: queued → sending → sent → delivered → read
  - sent_at, delivered_at, read_at, failed_at
  - failure_reason (on failure)
  
  whatsapp_webhook_events:
  - event_key (unique), event_type, meta_message_id
  - message_status, event_timestamp
  - metadata, received_at, processed_at
  
  whatsapp_campaigns:
  - status: queued → sending → completed
  - completed_at when all recipients processed
  
  leads:
  - whatsapp_last_message_at
  - whatsapp_opt_out, whatsapp_opt_out_at (on STOP)
  ↓
CAMPAIGN ANALYTICS (whatsapp_campaign_analytics view)
  • Total recipients
  • Queued / Sending / Sent / Delivered / Read / Failed
  • Delivery Rate: (delivered + read) / (sent + delivered + read + failed) * 100
  • Read Rate: read / (delivered + read) * 100
  • Failure Rate: failed / total * 100
  ↓
ANALYTICS DASHBOARD
  • Overview cards
  • Campaign summary table
  • Per-campaign recipient detail table
  • Filters: status, date, campaign
```

## Key Database Functions

### `claim_whatsapp_campaign_recipients(p_limit)`
- Atomically claims up to `p_limit` queued recipients
- Uses `FOR UPDATE SKIP LOCKED` for concurrency
- Re-checks consent via subquery on `leads`
- Returns template details for sending

### `suppress_whatsapp_ineligible_recipients()`
- Marks queued recipients as failed if consent withdrawn
- Runs before each worker batch

### `apply_whatsapp_message_status()`
- Idempotent status transition enforcement
- Updates both message and campaign recipient records
- Handles terminal states correctly (won't overwrite `read` with `delivered`)

## Status Lifecycle

```
Campaign:        draft → queued → sending → completed/failed/cancelled
                 (only queued/sending processed by worker)

Recipient:       queued → sending → sent → delivered → read
                                      ↘ failed (terminal)

Message:         queued → sending → sent → delivered → read
                                      ↘ failed (terminal)

Webhook Event:   received → processed
```