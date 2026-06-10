# VAC Click2Call — Step-by-Step Setup & Usage Guide

## Prerequisites

- MediLead CMS server running (Node.js backend on port 5000)
- VAC Dialer server running on your network (on-premise)
- VAC API token provided by the VAC vendor
- PostgreSQL database with the `vac_agent_id` migration applied

---

## Step 1: Run the Database Migration

This adds the `vac_agent_id` column to the users table (only needed once):

```bash
cd server
npm run migrate:vac-agent
```

Expected output:
```
✓ Added vac_agent_id column to users table
✓ Index idx_users_vac_agent_id created
Migration complete: VAC Agent ID
```

---

## Step 2: Configure Server Environment Variables

Open `server/.env` and set the VAC configuration:

```env
# ─── VAC Dialer Integration ───
VAC_SERVER_URL=http://192.168.10.100        # Your VAC server IP (HTTP, no trailing slash)
VAC_API_TOKEN=your_actual_vac_token         # Bearer token from VAC vendor
VAC_WEBHOOK_SECRET=a_shared_secret_string   # Secret for webhook authentication
VAC_ALLOWED_IPS=192.168.10.100,127.0.0.1   # IPs allowed to send webhooks
VAC_TIMEOUT_MS=10000                        # API timeout (10 seconds default)
```

**How to get these values:**
- `VAC_SERVER_URL` — Ask your VAC vendor for the server IP/hostname
- `VAC_API_TOKEN` — The vendor provides this Bearer token for API authentication
- `VAC_WEBHOOK_SECRET` — Create any strong random string and share it with the VAC vendor for webhook config
- `VAC_ALLOWED_IPS` — The IP address of the VAC server (so only it can send webhooks)

---

## Step 3: Assign VAC Agent IDs to Users

Each telecaller needs a VAC Agent ID (the extension number they use on the VAC Dialer).

### Option A: Via User Management UI (Admin)

1. Log in as Super Admin
2. Go to **User Management** (`/user-management`)
3. Edit a user
4. Set their **VAC Agent ID** field (e.g., `1001`, `1002`, etc.)
5. Save

### Option B: Via API (for bulk setup)

```bash
curl -X PUT http://localhost:5000/api/auth/users/3 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vac_agent_id": "1001"}'
```

**Important:** The VAC Agent ID must match the agent/extension configured in the VAC Dialer system.

---

## Step 4: Configure Webhooks on the VAC Server

Ask your VAC vendor to configure these webhook URLs:

### Call Popup Webhook (incoming call notification)
```
URL: http://YOUR_CMS_SERVER_IP:5000/api/calls/vac/webhook/popup
Method: POST
Headers: X-VAC-Secret: your_shared_secret_string
Body (form-urlencoded):
  - phone_number: customer phone number
  - user: agent ID (e.g., 1001)
```

### Call Completion Webhook (call ended)
```
URL: http://YOUR_CMS_SERVER_IP:5000/api/calls/vac/webhook/completion
Method: POST
Headers: X-VAC-Secret: your_shared_secret_string
Body (form-urlencoded):
  - phone_number: customer phone number
  - agent: agent ID
  - duration: call duration in seconds
  - recording_url: URL to call recording
  - dispo: disposition code (A=Answered, B=Busy/Missed, etc.)
  - start_time: 2026-05-15 10:00:00
  - end_time: 2026-05-15 10:00:34
```

---

## Step 5: Restart the Server

After configuring `.env`:

```bash
cd server
npm run dev    # development
# or
npm start      # production
```

---

## Step 6: Verify Integration Status

Check if everything is configured correctly:

```bash
curl http://localhost:5000/api/calls/vac/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected response:
```json
{
  "status": "success",
  "data": {
    "vac_configured": true,
    "agent_configured": true,
    "agent_id": "1001"
  }
}
```

If `vac_configured` is `false` — check your `.env` VAC variables.
If `agent_configured` is `false` — the logged-in user doesn't have a VAC Agent ID set.

---

## How to Use Click2Call (End User Flow)

### Making an Outbound Call

1. **Agent logs into VAC Dialer** (the vendor's dialer web interface) — this is REQUIRED
2. Agent opens MediLead CMS
3. Navigate to any page with phone numbers:
   - **Calls** page (`/vendor-call-logs`) — click the phone icon on any call record
   - **Call Dashboard** (`/calls`) — click the phone icon on any call record
4. Click the **phone icon** button next to a number
5. The system will:
   - Call the VAC API to initiate the dial
   - Ring the agent's phone first
   - Once the agent picks up, connect to the customer
   - Show a success toast: "Call Initiated — Calling 9876543210..."
   - Log the call in the system

### Receiving an Inbound Call

1. When a customer calls in, VAC sends a webhook to your CMS
2. The agent sees a **Call Popup** notification in the bottom-right corner with:
   - Caller's phone number
   - Matched patient/lead info (if the number is in the system)
   - Call history stats
3. The call is automatically logged in `telephony_call_logs`
4. When the call ends, VAC sends the completion webhook with duration + recording URL

---

## Troubleshooting

### Error: "Agent is not logged into the VAC Dialer"
- **Cause:** The agent must be logged into the VAC Dialer interface (the vendor's web app) before using Click2Call
- **Fix:** Open the VAC Dialer in another browser tab and log in with your agent credentials

### Error: "No VAC Agent ID configured for your account"
- **Cause:** The user doesn't have a `vac_agent_id` set in their profile
- **Fix:** Admin should go to User Management → Edit the user → Set the VAC Agent ID

### Error: "VAC Dialer integration is not configured"
- **Cause:** `VAC_SERVER_URL` or `VAC_API_TOKEN` is missing in `server/.env`
- **Fix:** Add the correct values and restart the server

### Error: "Cannot reach VAC server"
- **Cause:** Network issue between your CMS server and the VAC server
- **Fix:** Check that the VAC server IP is reachable from your CMS server:
  ```bash
  curl http://192.168.10.100/VAC/API/api.php?operation=storageapi
  ```

### Webhooks not working (no incoming call popups)
- Check that the VAC server can reach your CMS server on port 5000
- Verify the `X-VAC-Secret` header matches `VAC_WEBHOOK_SECRET` in your `.env`
- Check server logs: `tail -f server/logs/*.log`

---

## API Reference (for developers)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/calls/vac/click2call` | POST | JWT | Initiate outbound call |
| `/api/calls/vac/hangup` | POST | JWT | End current call |
| `/api/calls/vac/disposition` | POST | JWT | Set call disposition |
| `/api/calls/vac/transfer` | POST | JWT | Transfer call (blind/attended) |
| `/api/calls/vac/status` | GET | JWT | Check VAC integration status |
| `/api/calls/vac/webhook/popup` | POST | Secret/IP | VAC incoming call webhook |
| `/api/calls/vac/webhook/completion` | POST | Secret/IP | VAC call completion webhook |

### Click2Call Request
```json
POST /api/calls/vac/click2call
{
  "phone_number": "9876543210"
}
```

### Click2Call Response (success)
```json
{
  "status": "success",
  "message": "Call initiated successfully",
  "data": {
    "call_id": 42,
    "code": "C42",
    "phone_number": "9876543210",
    "direction": "outbound",
    "call_status": "initiated",
    "lead_id": 15,
    "lead_name": "Rajesh Kumar",
    "vac_message": "dial CALL INITIATED"
  }
}
```

---

## Architecture Diagram

```
┌─────────────────┐         ┌──────────────────┐         ┌──────────────┐
│  React Frontend │  POST   │  Express Backend  │   GET   │  VAC Server  │
│  (Browser)      │ ──────> │  (Node.js:5000)   │ ──────> │  (On-Prem)   │
│                 │  JWT    │                   │  Bearer │              │
│  Click "Call"   │         │  /api/calls/vac/  │  Token  │  /VAC/API/   │
│  button         │         │  click2call       │         │  api.php     │
└─────────────────┘         └──────────────────┘         └──────────────┘
                                     │                          │
                                     │  Socket.IO               │ Webhook POST
                                     │  (real-time)             │
                                     ▼                          ▼
                            ┌──────────────────┐      ┌──────────────────┐
                            │  Call Popup UI    │      │  /api/calls/vac/ │
                            │  Toast messages   │      │  webhook/popup   │
                            │  Call log refresh │      │  webhook/complete│
                            └──────────────────┘      └──────────────────┘
```

---

*Last updated: June 2026*
