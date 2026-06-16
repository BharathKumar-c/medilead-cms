# Email Draft to VAC Vendor — Webhook Integration Details

---

**Subject:** Webhook API Details for CMS Integration — Call Popup & Call Completion

---

Hi Team,

Please find below the webhook API details for integrating the VAC Dialer with our CMS application. We need three webhooks configured:

---

## 1. Call Popup Webhook (Incoming Call Notification)

Trigger this when a call reaches the agent's extension (at ring time, before answer).

```
URL:     http://192.168.10.125:5000/api/calls/vac/webhook/popup
Method:  POST
Content-Type: application/x-www-form-urlencoded
```

**Required Header:**
```
X-VAC-Secret: 53796b5d6b698e3dc8783e85d317f91914434baa0c8e0b3226404e7c84dd6bd9
```

**Request Body Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| phone_number | string | Yes | Customer's phone number (e.g., 9876543210) |
| user | string | Yes | Agent extension/ID (e.g., 1001) |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Call popup processed",
  "call_id": 42
}
```

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Missing required fields (phone_number or user) |
| 403 | Invalid or missing X-VAC-Secret header |
| 500 | Server error |

---

## 2. Call Answered Webhook (Call Started)

Trigger this when the agent answers the call (call transitions from ringing to connected).

```
URL:     http://192.168.10.125:5000/api/calls/vac/webhook/answer
Method:  POST
Content-Type: application/x-www-form-urlencoded
```

**Required Header:**
```
X-VAC-Secret: 53796b5d6b698e3dc8783e85d317f91914434baa0c8e0b3226404e7c84dd6bd9
```

**Request Body Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| phone_number | string | Yes | Customer's phone number |
| agent | string | Yes | Agent extension/ID (e.g., 1001) |
| start_time | string | No | Call start time (YYYY-MM-DD HH:MM:SS) |
| campaign_name | string | No | Campaign name if applicable |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Call answer recorded",
  "call_id": 42
}
```

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Missing phone_number |
| 403 | Invalid or missing X-VAC-Secret header |
| 500 | Server error |

---

## 3. Call Completion Webhook (Call Ended)

Trigger this when the call ends (after hangup).

```
URL:     http://192.168.10.125:5000/api/calls/vac/webhook/completion
Method:  POST
Content-Type: application/x-www-form-urlencoded
```

**Required Header:**
```
X-VAC-Secret: 53796b5d6b698e3dc8783e85d317f91914434baa0c8e0b3226404e7c84dd6bd9
```

**Request Body Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| phone_number | string | Yes | Customer's phone number |
| agent | string | Yes | Agent extension/ID (e.g., 1001) |
| duration | string | Yes | Call duration in seconds (e.g., "34") |
| recording_url | string | No | Full URL to the call recording file |
| dispo | string | No | Disposition code (A=Answered, B=Busy/Missed) |
| start_time | string | No | Call start time (YYYY-MM-DD HH:MM:SS) |
| end_time | string | No | Call end time (YYYY-MM-DD HH:MM:SS) |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Call completion recorded",
  "call_id": 42
}
```

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Missing phone_number |
| 403 | Invalid or missing X-VAC-Secret header |
| 500 | Server error |

---

## Authentication

We use a **static shared secret** via the `X-VAC-Secret` HTTP header. No HMAC computation needed.

**Secret value:**
```
53796b5d6b698e3dc8783e85d317f91914434baa0c8e0b3226404e7c84dd6bd9
```

Simply include this as a header in every webhook request. Our server validates it by direct string comparison.

---

## Unique Call Identifier

The `call_id` returned in our response is our system's unique identifier for the call. You can use this to correlate popup → completion events if needed.

On your side, if you have a unique call/session ID, you can include it as an extra field in the body — we store the full payload.

---

## Sample Request (cURL)

### Call Popup Example:
```bash
curl -X POST http://192.168.10.125:5000/api/calls/vac/webhook/popup \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "X-VAC-Secret: 53796b5d6b698e3dc8783e85d317f91914434baa0c8e0b3226404e7c84dd6bd9" \
  -d "phone_number=9876543210&user=1001"
```

### Call Answered Example:
```bash
curl -X POST http://192.168.10.125:5000/api/calls/vac/webhook/answer \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "X-VAC-Secret: 53796b5d6b698e3dc8783e85d317f91914434baa0c8e0b3226404e7c84dd6bd9" \
  -d "phone_number=9876543210&agent=1001&start_time=2026-06-10 10:00:00"
```

### Call Completion Example:
```bash
curl -X POST http://192.168.10.125:5000/api/calls/vac/webhook/completion \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "X-VAC-Secret: 53796b5d6b698e3dc8783e85d317f91914434baa0c8e0b3226404e7c84dd6bd9" \
  -d "phone_number=9876543210&agent=1001&duration=34&recording_url=http://192.168.10.100/recordings/call123.wav&dispo=A&start_time=2026-06-10 10:00:00&end_time=2026-06-10 10:00:34"
```

### PHP Example (for your reference):
```php
<?php
$secret = '53796b5d6b698e3dc8783e85d317f91914434baa0c8e0b3226404e7c84dd6bd9';
$url = 'http://192.168.10.125:5000/api/calls/vac/webhook/popup';

$data = http_build_query([
    'phone_number' => '9876543210',
    'user' => '1001',
]);

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/x-www-form-urlencoded',
    'X-VAC-Secret: ' . $secret,
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP $httpCode: $response\n";
?>
```

---

## Key Notes

1. **Protocol:** HTTP (not HTTPS) — as per on-premise setup
2. **Timing:** Please send the Call Popup webhook at **ring time** (when the call reaches the extension), not after the agent answers. This allows us to show the popup before pickup.
3. **Call Answered:** Please send the Call Answered webhook when the agent **answers** the call (transitions from ringing to connected). This allows our CMS to update the popup state in real-time.
4. **Agent field:** The `user`/`agent` value must match the agent extension numbers we use for Click2Call (1001, 1002, etc.)
5. **Both directions:** Please fire webhooks for both inbound AND outbound calls if possible
6. **Our server:** IP `192.168.10.125`, Port `5000` — please ensure your server can reach this endpoint over the network

Please confirm once configured, and we can run a test together.

Thanks,
[Your Name]

---

## For Your Reference (Not to Include in Email)

### Where this secret lives in your codebase:
- File: `server/.env`
- Variable: `VAC_WEBHOOK_SECRET`
- Current value: `53796b5d6b698e3dc8783e85d317f91914434baa0c8e0b3226404e7c84dd6bd9`

### How the secret was generated:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### If you ever need to rotate the secret:
1. Generate a new one with the command above
2. Update `VAC_WEBHOOK_SECRET` in `server/.env`
3. Restart the server
4. Share the new value with the vendor

### How to test the webhook locally (before vendor configures):
```bash
curl -X POST http://localhost:5000/api/calls/vac/webhook/popup -H "Content-Type: application/x-www-form-urlencoded" -H "X-VAC-Secret: 53796b5d6b698e3dc8783e85d317f91914434baa0c8e0b3226404e7c84dd6bd9" -d "phone_number=9876543210&user=1001"
```

You should get back:
```json
{"success":true,"message":"Call popup processed","call_id":...}
```
And see a notification popup in the CMS if you're logged in as a user with vac_agent_id = "1001".
