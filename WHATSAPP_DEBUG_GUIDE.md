# WhatsApp Messages Not Showing - Debugging Guide

## Problem Summary

- ✅ Messages sent from admin panel say "not provide"
- ✅ Webhook receives messages from customer (Webhook Status tab shows "received")
- ✅ Customer sees message on their WhatsApp
- ✅ Customer replies on WhatsApp
- ❌ Customer's reply NOT showing in admin Messages tab

## Root Cause Analysis

### Issue 1: First Conversation Not Auto-Selected ✅ FIXED

**Before:** Messages tab open karne par koi conversation automatically select nahi hota tha. User ko manually conversation click karna padta tha.

**Fixed:** Ab first conversation automatically select ho jaata hai when messages tab loads.

### Issue 2: Message Loading Verification

Added console logging to identify kya data aa raha hai. Open browser console (F12) and look for:

```
[WhatsApp] fetch_messages response: {
  phone: "+91XXXXXXXXXX",
  hasError: false,
  dataKeys: ["messages", "hasMore", "nextCursor"],
  messagesCount: 25
}

[WhatsApp] messages after reverse: 25 messages [
  { id: "...", type: "text", created_at: "2026-10-03T10:21:00Z" },
  { id: "...", type: "text", created_at: "2026-10-03T10:20:00Z" },
  ...
]
```

### Issue 3: Realtime Message Subscription

Check console for:

```
[WhatsApp Realtime] Subscribed to whatsapp_messages
[WhatsApp Realtime] Received event: { eventType: "INSERT", hasNew: true, hasOld: false }
```

## Debugging Steps

### Step 1: Check Messages Load on Tab Open

1. Open **Messages** tab in `/admin/whatsapp`
2. Open **Browser DevTools** (F12)
3. Go to **Console** tab
4. Look for `[WhatsApp] fetch_messages response` logs
5. If you see it:
   - ✅ Messages API working
   - Check `messagesCount` - if 0, no messages in DB for that conversation
   - If > 0, messages should show in chat

### Step 2: Check Realtime Subscription

1. In Console, look for `[WhatsApp Realtime] Subscribed` message
2. If you DON'T see it:
   - ❌ Realtime subscription failed
   - Check network tab for errors
   - Restart browser tab

### Step 3: Check If New Messages Arrive

1. Open Messages tab
2. Have customer send a test message via WhatsApp
3. In Console, look for `[WhatsApp Realtime] Received event`
4. If you see it:
   - ✅ Webhook → Supabase → Realtime working
   - But if message doesn't show on screen, it's a state update issue
5. If you DON'T see it:
   - ❌ Realtime subscription not working or webhook not saving to DB

### Step 4: Manual Refresh Test

1. Messages tab open, conversations loaded
2. Click **Refresh** button (top right)
3. Watch Console:
   - Should see `[WhatsApp] fetch_messages response` again
   - Check if `messagesCount` increased
4. If messages appear after refresh:
   - ✅ Data is in Supabase
   - ❌ Realtime subscription isn't working
   - Problem: Webhook events received but not adding to chat in real-time

## Expected Console Output (Working Scenario)

```
[WhatsApp] fetch_messages response: {
  phone: "+91XXXXXXXXXX",
  hasError: false,
  dataKeys: ["messages", "hasMore", "nextCursor"],
  messagesCount: 5
}

[WhatsApp] messages after reverse: 5 messages [...]

[WhatsApp Realtime] Subscribed to whatsapp_messages

[WhatsApp Realtime] Received event: { eventType: "INSERT", hasNew: true, hasOld: false }

[WhatsApp Realtime] Received event: { eventType: "UPDATE", hasNew: true, hasOld: true }
(status update - delivered/read)
```

## What to Check in Supabase

### 1. Check Messages Table

```sql
SELECT * FROM whatsapp_messages 
WHERE recipient_phone = '+91XXXXXXXXXX'
ORDER BY created_at DESC
LIMIT 20;
```

Should show:
- ✅ Outbound messages (from admin)
- ✅ Inbound messages (from customer)
- ✅ Correct created_at timestamps
- ✅ Correct direction (outbound/inbound)
- ✅ Correct status (sent/delivered/read/received)

### 2. Check Webhook Events Table

```sql
SELECT * FROM whatsapp_webhook_events
WHERE event_type = 'incoming_message'
ORDER BY received_at DESC
LIMIT 10;
```

Should show incoming customer messages.

### 3. Check Message Processing

If webhook events exist but messages don't appear in messages table:
- ❌ Edge Function not processing webhooks
- ❌ Database write failing

## Common Issues & Solutions

### Issue: "messagesCount: 0" in console

**Possible Causes:**
1. No messages exchanged with this contact yet
2. Phone number format mismatch (use `get_conversation` with exact same format as contact)
3. Messages deleted from database
4. Wrong conversation selected

**Fix:**
- Verify phone number is correct
- Send test message from admin
- Check if it appears after refresh

### Issue: Messages don't appear immediately but appear after refresh

**Problem:** Realtime subscription not working

**Causes:**
1. Supabase realtime disabled in database
2. Row-level security (RLS) blocking realtime
3. Browser WebSocket connection blocked
4. Supabase service issue

**Fix:**
- Check browser DevTools → Network tab → look for websocket connection
- If red X: network blocked or service down
- Try incognito mode (cache issue)
- Restart browser tab

### Issue: Customer message shows in Webhook but not in Messages tab

**Problem:** Webhook received but not saved to DB or realtime not working

**Causes:**
1. Edge Function processing webhook but not saving
2. Realtime subscription exists but not listening to changes
3. Message in DB but filtered out by phone number logic

**Fix:**
- Check Supabase logs for Edge Function errors
- Manual refresh to see if message appears (if yes, realtime issue)
- Check whatsapp_webhook_events table to confirm event received

### Issue: Auto-select first conversation not working

**Problem:** Conversation list loaded but no auto-select happening

**Cause:** This was a bug, now fixed. If still happening:

**Fix:**
- Clear browser cache
- Hard refresh (Ctrl+F5)
- Rebuild application

## Testing Checklist

Before reporting issue, verify:

- [ ] Conversations list loads
- [ ] Clicking conversation selects it
- [ ] Console shows `[WhatsApp] fetch_messages response` with messagesCount > 0
- [ ] Messages render in chat
- [ ] Refresh button works and reloads messages
- [ ] Console shows `[WhatsApp Realtime] Subscribed`
- [ ] Send test message from admin panel
- [ ] Message appears immediately (realtime) OR after refresh
- [ ] Customer replies to message
- [ ] Reply shows in Webhook Status tab
- [ ] Reply shows in Messages tab (immediately or after refresh)
- [ ] Console shows `[WhatsApp Realtime] Received event` when customer sends

## Still Not Working?

If after these checks messages still don't show:

### Information to provide:

1. Screenshot of Console tab with logs
2. Webhook Status tab - confirm events showing "received"
3. Messages sent from admin panel show status (sent/delivered)?
4. Browser & OS
5. Steps to reproduce

### Check Edge Function Logs:

Go to Supabase Dashboard:
- Project → Edge Functions → whatsapp-service
- Logs tab → filter by "get_conversation"
- Check for errors

---

**Auto-Select Fixed:** ✅ Yes - First conversation now auto-selected on mount
**Logging Added:** ✅ Yes - See all data flow in console
**Status:** Ready for testing

Open `/admin/whatsapp`, click **Messages** tab, and watch the browser console!
