# Deploy MediLead CMS to Render

This guide covers deploying both the **frontend** (React + Vite) and **backend** (Express + Socket.IO + PostgreSQL) to [Render](https://render.com).

## Architecture Overview

```
┌──────────────────────┐         ┌──────────────────────┐         ┌──────────────────────┐
│   Static Site        │         │   Web Service        │         │   Aiven PostgreSQL   │
│   (Frontend)         │ ──────> │   (Backend API)      │ ──────> │   (Managed DB)       │
│   React + Vite       │  API    │   Express + Socket.IO│  SSL    │   PostgreSQL         │
│   Static Site        │ calls   │   Web Service        │         │   (Aiven or local)   │
└──────────────────────┘         └──────────────────────┘         └──────────────────────┘
```

You will create **2 services** on Render:
1. **Web Service** — backend API (Express)
2. **Static Site** — frontend (React/Vite)

The database is hosted on **Aiven** (external PostgreSQL with SSL).

---

## Prerequisites

- A [Render account](https://render.com) (free tier works)
- Your code pushed to a **GitHub** repository
- The repo should contain both `server/` and root frontend code
- Aiven PostgreSQL database with CA certificate (`server/certs/ca.pem`)

---

## Step 2: Deploy Backend (Web Service)

### 2.1 Create the Web Service

1. In Render Dashboard, click **New** → **Web Service**
2. Connect your GitHub repository
3. Configure:
   - **Name:** `medilead-api`
   - **Region:** Same as your database
   - **Branch:** `main`
   - **Root Directory:** `server`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node src/index.js`
   - **Plan:** Free (for testing) or Starter ($7/mo for production)

### 2.2 Set Environment Variables

In the **Environment** tab, add these variables:

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | |
| `PORT` | `10000` | Render assigns port automatically, use 10000 |
| `DATABASE_URL` | `postgres://<user>:<password>@<host>:<port>/<db>?sslmode=require` | Your PostgreSQL connection string |
| `DB_SSL` | `true` | Enable SSL for Aiven |
| `DB_SSL_CA_CERT` | `./certs/ca.pem` | Path to CA certificate |
| `JWT_SECRET` | *(generate a random 64-char string)* | See note below |
| `JWT_EXPIRES_IN` | `24h` | |
| `CORS_ORIGIN` | `https://medilead-cms.onrender.com` | Your frontend URL (set after Step 3) |
| `DB_POOL_MAX` | `20` | Aiven connection limit |
| `DB_POOL_MIN` | `2` | |
| `LOG_LEVEL` | `info` | |

> **Generate JWT_SECRET:** Run this in your terminal:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

### 2.3 Run Database Migration

After the backend deploys successfully:

1. Go to your web service → **Shell** tab (or use Render's **Manual Deploy** with a different start command)
2. Run migration and seed:

   **Option A — Using Render Shell:**
   ```bash
   node src/config/migrate.js
   node src/seeds/seed.js
   ```

   **Option B — Temporarily change Start Command:**
   1. Go to **Settings** → change Start Command to:
      ```
      node src/config/migrate.js && node src/seeds/seed.js && node src/index.js
      ```
   2. Trigger a **Manual Deploy** → **Deploy latest commit**
   3. After it runs once, **change the Start Command back** to `node src/index.js`
   4. Trigger another deploy

### 2.4 Verify Backend

Once deployed, test your API:
```
https://medilead-api.onrender.com/api/health
```
You should see:
```json
{
  "status": "ok",
  "timestamp": "...",
  "database": "connected",
  "uptime": ...,
  "environment": "production"
}
```

---

## Step 3: Deploy Frontend (Static Site)

### 3.1 Create the Static Site

1. In Render Dashboard, click **New** → **Static Site**
2. Connect the **same GitHub repository**
3. Configure:
   - **Name:** `medilead-cms`
   - **Branch:** `main`
   - **Root Directory:** *(leave empty — it's the repo root)*
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`

### 3.2 Set Environment Variables

In the **Environment** tab, add these variables:

| Key | Value | Notes |
|-----|-------|-------|
| `VITE_API_URL` | `/api` | Use relative path (frontend proxies to backend) |
| `VITE_APP_NAME` | `MediLead CMS` | |
| `VITE_APP_ENV` | `production` | |
| `VITE_SOCKET_URL` | `https://medilead-api.onrender.com` | Backend URL for Socket.IO (no `/api`) |

> **Important:** `VITE_*` variables are embedded at build time. If you change them, you must **redeploy** (trigger a new build) for changes to take effect.

### 3.3 Verify Frontend

Once deployed, visit:
```
https://medilead-cms.onrender.com
```

You should see the login page. Log in with the seeded credentials:
- **Admin:** `admin@medilead.com` / `Admin@123`
- **Telecaller:** `telecaller@medilead.com` / `Telecaller@123`

---

## Step 4: Update CORS_ORIGIN on Backend

Now that you know your frontend URL, go back to your **backend web service** → **Environment** tab and update:

```
CORS_ORIGIN=https://medilead-cms.onrender.com
```

This allows the frontend to make API requests and connect via Socket.IO.

---

## Step 5: Final Verification

Test the full flow:

1. **Backend health check:**
   `https://medilead-api.onrender.com/api/health` → should return `"status": "ok"`

2. **Frontend loads:**
   `https://medilead-cms.onrender.com` → should show login page

3. **Login works:**
   Log in with seeded credentials → should redirect to dashboard

4. **Socket.IO connects:**
   Open browser DevTools → Network tab → filter by `WS` → you should see a WebSocket connection to the backend

---

## Free Tier Limitations

| Limitation | Impact |
|-----------|--------|
| **Spin down after 15 min inactivity** | First request after idle takes ~30s to wake up |
| **750 hours/month** per service | Enough for 1 service running 24/7; 2 services = ~15 days |
| **No custom domains** on free tier | You get `*.onrender.com` URLs |
| **Database on Aiven** | Separate billing/limits on Aiven (not affected by Render free tier) |

> **Recommendation:** For production, use the **Starter** plan ($7/mo per service) to avoid spin-down and get custom domains.

---

## Custom Domain Setup (Optional)

### For the frontend:
1. Go to your Static Site → **Settings** → **Custom Domains**
2. Add your domain (e.g., `cms.yourdomain.com`)
3. Add a CNAME DNS record pointing to the Render URL

### For the backend:
1. Go to your Web Service → **Settings** → **Custom Domains**
2. Add your domain (e.g., `api.yourdomain.com`)
3. Update `CORS_ORIGIN` on the backend to match
4. Update `VITE_API_URL` and `VITE_SOCKET_URL` on the frontend to use the new domain
5. Redeploy the frontend

---

## Troubleshooting

### CORS errors in browser console
- Ensure `CORS_ORIGIN` on the backend matches your frontend URL exactly (including `https://`)
- No trailing slash

### API returns 404
- Check that `VITE_API_URL` ends with `/api`
- Verify backend is running (check Render logs)

### Database connection failed
- Ensure `DATABASE_URL` includes `?sslmode=require` for Aiven
- Verify `DB_SSL=true` is set in environment variables
- Check that `server/certs/ca.pem` exists (the CA certificate)
- Test connection: `node -e "require('./src/config/database').healthCheck().then(console.log)"`

### Socket.IO not connecting
- Ensure `VITE_SOCKET_URL` is set to the backend URL without `/api`
- Check that `CORS_ORIGIN` includes the frontend URL

### Build fails on Render
- Check that `package.json` has all dependencies listed
- Ensure Node version compatibility (Render uses Node 18+ by default)

### First request is slow
- Free tier services spin down after 15 min of inactivity
- First request takes ~30s while the service wakes up
- Upgrade to Starter plan to avoid this

---

## Quick Reference: URLs After Deployment

| Service | URL |
|---------|-----|
| Frontend | `https://medilead-cms.onrender.com` |
| Backend API | `https://medilead-api.onrender.com/api` |
| Health Check | `https://medilead-api.onrender.com/api/health` |
| Database | Aiven PostgreSQL (external, accessed via SSL) |
