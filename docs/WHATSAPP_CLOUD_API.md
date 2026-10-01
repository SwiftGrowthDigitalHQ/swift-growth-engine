# SwiftGrowthDigital WhatsApp Cloud API

## Architecture and endpoint

This integration uses Meta's WhatsApp Cloud API from Supabase Edge Functions. Browser code only uses the customer-facing Click-to-Chat link; it never receives a Meta token.

- Meta message API: `POST https://graph.facebook.com/{WHATSAPP_API_VERSION}/{WHATSAPP_PHONE_NUMBER_ID}/messages`
- Webhook function: `https://yhfcziouwodhjvukgjhr.supabase.co/functions/v1/whatsapp-webhook`
- Public callback after the Vercel rewrite is deployed: `https://www.swiftgrowthdigital.com/api/webhooks/whatsapp`
- Admin dashboard: `https://www.swiftgrowthdigital.com/admin/whatsapp`

Vercel proxies `/api/webhooks/whatsapp` to the Supabase webhook function. This callback is a backend route; it is unrelated to the public Click-to-Chat link. Vercel and Supabase deployments must both be active before the public URL is used in Meta.

The webhook verifies Meta's GET challenge and validates POST request signatures using `META_APP_SECRET` and `X-Hub-Signature-256`. It stores deduplicated incoming-message and status events. The campaign worker claims consent-checked recipients from Postgres, sends approved templates to Meta, stores Meta message IDs and API metadata, and applies delivered/read/failed webhook status changes idempotently. It does not retry ambiguous network outcomes automatically because a retry could send a duplicate.

Campaign sending requires the `whatsapp-campaign-worker` Edge Function to be called on a schedule. Supabase does not create that schedule by deploying an Edge Function; configure the cron job in the steps below.

## 1. Prepare the Meta business assets

1. In [Meta for Developers](https://developers.facebook.com/), create or select the Meta app that owns this WhatsApp integration and add the WhatsApp product.
2. In WhatsApp > API Setup, select the WhatsApp Business Account and registered business phone number. Record the WABA ID and the Phone Number ID shown by Meta. The Phone Number ID is the API path identifier; it is not the phone number displayed to customers.
3. Complete business verification and any business/app review Meta requires for the intended production use and access level. Meta's dashboard shows the current review state and required steps for each business/app.
4. For a server integration, create a System User in Meta Business Settings, assign the app and WhatsApp assets it needs, and generate a System User access token for the app with the required WhatsApp permissions. Meta documents user tokens as short-lived and System User tokens as the production option; use an expiry policy available to the business and rotate the token when required. Do not use a temporary dashboard token for production.
5. The API operations in this project use `whatsapp_business_messaging` to send messages and `whatsapp_business_management` to read template/account configuration. Do not add `business_management` unless you separately introduce calls that access the business portfolio; the current code does not make those calls. Meta App Review and advanced access requirements depend on the app's production use and are shown in the current App Dashboard.

See Meta's current [Cloud API collection and permission notes](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api), [Get Started collection](https://www.postman.com/meta/whatsapp-business-platform/folder/1bczlus/get-started), and [Cloud API developer documentation](https://developers.facebook.com/docs/whatsapp/cloud-api/).

## 2. Configure secrets in Supabase

Set these values in Supabase Project Settings > Edge Functions > Secrets. The access token, app secret, webhook verification token, and worker secret must remain server-side. Do not add real values to `.env`, Vercel browser variables, source files, SQL migrations, or Git.

| Secret | Purpose |
| --- | --- |
| `WHATSAPP_ACCESS_TOKEN` | Meta System User access token used for authenticated Cloud API requests |
| `WHATSAPP_PHONE_NUMBER_ID` | Registered sender Phone Number ID |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | WABA ID that owns the sender and approved templates |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Private string Meta sends back during callback verification; choose your own strong value |
| `META_APP_SECRET` | Meta app secret used to validate webhook signatures |
| `WHATSAPP_API_VERSION` | A currently supported Graph API version, formatted `vNN.N`; choose and maintain it from Meta's current API version information |
| `WHATSAPP_WEBHOOK_PUBLIC_URL` | `https://www.swiftgrowthdigital.com/api/webhooks/whatsapp` |
| `WHATSAPP_WORKER_SECRET` | Strong random value used only by the scheduled campaign worker |

Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to deployed Edge Functions. The existing browser settings remain `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`, and `VITE_SUPABASE_PUBLISHABLE_KEY`; the publishable key is not a WhatsApp credential.

`.env.example` lists variable names only. It is a reference file and does not configure deployed Supabase secrets.

## 3. Deploy the database and functions

From the project root, after linking the Supabase CLI to project `yhfcziouwodhjvukgjhr` and configuring the secrets:

```sh
supabase db push
supabase functions deploy whatsapp-webhook
supabase functions deploy whatsapp-service
supabase functions deploy whatsapp-campaign-worker
supabase functions deploy submit-lead
```

Deploy the Vercel project containing the `/api/webhooks/whatsapp` external rewrite. Configure Meta with the public callback only after both Supabase and Vercel deployments are live. The callback must use HTTPS.

## 4. Configure and subscribe the webhook

1. In the Meta app dashboard, open Webhooks and select the WhatsApp Business Account object.
2. Set Callback URL to `https://www.swiftgrowthdigital.com/api/webhooks/whatsapp`.
3. Enter the same value stored in Supabase as `WHATSAPP_WEBHOOK_VERIFY_TOKEN`. Meta's verification GET request is accepted only when `hub.mode=subscribe` and the token matches; the endpoint returns Meta's `hub.challenge` unchanged.
4. Subscribe to the `messages` webhook field. This field contains incoming messages and outbound message status notifications (`sent`, `delivered`, `read`, and `failed`). The function rejects POSTs without a valid app-secret signature.
5. Subscribe the Meta app to the WABA so that Meta sends notifications for the account. Meta's Cloud API collection documents `POST /{WABA-ID}/subscribed_apps`; the System User token used for this operation needs `whatsapp_business_management`.
6. Confirm the Configuration / Webhook Status page reports the real Graph API phone-number check and a reachable webhook route. The route probe sends an intentionally invalid verification token and expects the webhook's 403 response; it never places the configured verification secret in a URL.

See Meta's [Webhooks setup](https://www.postman.com/meta/whatsapp-business-platform/folder/lboq68h/webhooks), [WABA webhook subscriptions](https://www.postman.com/meta/whatsapp-business-platform/folder/ozgs3jn/webhook-subscriptions), and [webhook payload reference](https://www.postman.com/meta/whatsapp-business-platform/folder/tduohwq/webhook-payload-reference).

## 5. Create and approve message templates

Create templates in WhatsApp Manager for the same WABA as the configured Phone Number ID. Choose the appropriate category and language, add the required header/body/button components and examples, and submit them for Meta review. Syncing in the admin dashboard reads the current template list from Meta; campaign creation only allows templates Meta currently reports as `APPROVED`.

Template component JSON in the campaign form supplies values for the selected template's placeholders. It is passed through as Cloud API template components. Meta remains the authority for whether its component values match the approved template. The Cloud API send payload uses the current name/language/components format; namespace is stored if Meta returns it but is omitted from current Cloud API sends.

See the [Cloud API template send request](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api?entity=request-13382743-ba924e99-3d98-4954-b4e3-73a519939c33) and [WhatsApp message template documentation](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates/).

## 6. Set up the campaign schedule

Campaign creation only queues recipients. A scheduled worker drains up to five recipients per invocation. Set the same strong `WHATSAPP_WORKER_SECRET` in the Edge Function secrets and Supabase Vault. Store the project's publishable key in Vault as `supabase_publishable_key` for the Supabase API gateway header. Enable the `pg_cron`, `pg_net`, and Vault extensions in the Supabase project if they are not already available, then create a cron job that invokes the worker every minute:

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

Create the Vault secret named `whatsapp_worker_secret` using the Supabase Vault interface; its value must exactly match `WHATSAPP_WORKER_SECRET` in Edge Function secrets. Do not put the secret value in the SQL editor query. Verify the cron job is active and inspect its run history before creating a live campaign. If the project does not provide these extensions, use an external scheduler to POST to the worker endpoint with the `x-whatsapp-worker-secret` header.

Use the project's publishable API key for the cron request's `apikey` value. The worker still requires the separate strong secret checked in the function.

## 7. Give an administrator access

The existing project has no admin authentication area. The WhatsApp dashboard uses Supabase Auth and requires the signed-in user's **app metadata** to contain `{"role":"admin"}`. Assign that role only to trusted administrator accounts in Supabase Auth / user management. Do not put the role in user-editable metadata. The Edge Function independently verifies the authenticated user and role before any management action.

Open `/admin/whatsapp`, sign in, sync templates, review lead consent, and select opted-in contacts when creating a campaign. Existing leads default to no marketing consent. The public contact and audit forms collect separate, unchecked consent. A matching inbound `STOP`, `UNSUBSCRIBE`, `CANCEL`, `END`, or `QUIT` text message records opt-out. Admin-recorded re-consent requires a source/evidence note.

## 8. Validation and production limits

- The public webhook GET route can be verified in Meta only after deployment and the secrets above are configured. POST signatures are checked against the raw request body using the Meta app secret.
- Meta API connectivity in the admin page is based on an authenticated Graph API phone-number request, not on environment-variable presence alone. Webhook reachability is probed over HTTPS.
- A Meta API success with a returned `wamid` is recorded as `sent`; `delivered`, `read`, and Meta-reported `failed` are set from actual webhook events. Network errors are recorded as failed with an explicit unknown-outcome reason and are not retried automatically.
- Campaigns are limited to 5,000 explicitly selected contacts per creation request. Numbers are normalized/validated before queueing, and consent with a recorded source and timestamp is checked both at campaign creation and immediately before each send.
- Meta credentials, a production WABA/number, an approved template, app/business access, deployed functions, and an enabled schedule are required for real integration verification. Without them, the dashboard reports configuration pending and no campaign is sent.

For current token, version, message, and permission requirements use Meta's [official WhatsApp Cloud API collection](https://www.postman.com/meta/whatsapp-business-platform/collection/wlk6lh4/whatsapp-cloud-api), [Meta WhatsApp Cloud API guide](https://developers.facebook.com/docs/whatsapp/cloud-api/), and the Meta App Dashboard. Requirements can vary by business, app mode, and current Meta policy.

Platform references: [Supabase Edge Function secrets](https://supabase.com/docs/guides/functions/secrets), [Supabase scheduled Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions), [Supabase Edge Function deployment](https://supabase.com/docs/guides/functions/quickstart), and [Vercel external rewrites](https://vercel.com/docs/routing/rewrites).
