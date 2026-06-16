# Self-hosting Postiz on Hostinger (publishing layer, U8)

Postiz is the scheduling/posting service for the content pipeline. It needs a **public
HTTPS URL** (for the platform OAuth callbacks), so it lives on the **Hostinger VPS**, not
the home machine. AIRLUXO's `content-publish` edge function (U8) calls Postiz's public
API to upload media + schedule approved drafts.

> Requires a **Hostinger VPS** (Docker-capable). Shared/web hosting can't run Docker —
> if that's all you have, use Postiz Cloud or a small VPS elsewhere; the rest of this
> doc (API key + secrets + integration) is identical.

---

## 1. DNS
Point a subdomain at the VPS IP (Hostinger DNS, or wherever the domain lives):
```
A   postiz.airluxo.ch   →   <VPS_PUBLIC_IP>
```
(Any domain works; `POSTIZ_BASE_URL` will be `https://postiz.airluxo.ch`.)

## 2. Install Docker on the VPS
SSH in, then:
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # re-login after this
```

## 3. docker-compose.yml
Create `/opt/postiz/docker-compose.yml` (replace the domain + secrets):
```yaml
services:
  postiz:
    image: ghcr.io/gitroomhq/postiz-app:latest
    container_name: postiz
    restart: always
    environment:
      MAIN_URL: "https://postiz.airluxo.ch"
      FRONTEND_URL: "https://postiz.airluxo.ch"
      NEXT_PUBLIC_BACKEND_URL: "https://postiz.airluxo.ch/api"
      JWT_SECRET: "<run: openssl rand -hex 32>"
      DATABASE_URL: "postgresql://postiz:<db-pass>@postiz-postgres:5432/postiz"
      REDIS_URL: "redis://postiz-redis:6379"
      BACKEND_INTERNAL_URL: "http://localhost:3000"
      IS_GENERAL: "true"
      DISABLE_REGISTRATION: "false"   # set true after you create your account
      STORAGE_PROVIDER: "local"
      UPLOAD_DIRECTORY: "/uploads"
      NEXT_PUBLIC_UPLOAD_DIRECTORY: "/uploads"
      # --- provider OAuth creds go here once apps are created (step 6) ---
    volumes:
      - postiz-config:/config/
      - postiz-uploads:/uploads/
    ports:
      - "5000:5000"
    depends_on:
      postiz-postgres: { condition: service_healthy }
      postiz-redis: { condition: service_healthy }

  postiz-postgres:
    image: postgres:17-alpine
    container_name: postiz-postgres
    restart: always
    environment:
      POSTGRES_USER: postiz
      POSTGRES_PASSWORD: <db-pass>
      POSTGRES_DB: postiz
    volumes: [ "postiz-pg:/var/lib/postgresql/data" ]
    healthcheck: { test: ["CMD-SHELL","pg_isready -U postiz"], interval: 10s, timeout: 3s, retries: 5 }

  postiz-redis:
    image: redis:7.2-alpine
    container_name: postiz-redis
    restart: always
    volumes: [ "postiz-redis:/data" ]
    healthcheck: { test: ["CMD","redis-cli","ping"], interval: 10s, timeout: 3s, retries: 5 }

volumes:
  postiz-config:
  postiz-uploads:
  postiz-pg:
  postiz-redis:
```
Start it: `cd /opt/postiz && docker compose up -d`.

## 4. HTTPS reverse proxy
Easiest is Caddy (auto-Let's-Encrypt). On the VPS, `/etc/caddy/Caddyfile`:
```
postiz.airluxo.ch {
    reverse_proxy localhost:5000
}
```
`sudo apt install caddy && sudo systemctl restart caddy` → `https://postiz.airluxo.ch` is live with SSL.
(If Hostinger gives you a panel-managed proxy/SSL instead, point it at port 5000.)

## 5. Create your account + API key
- Open `https://postiz.airluxo.ch`, register the founder account, then set
  `DISABLE_REGISTRATION: "true"` and `docker compose up -d` again to lock it.
- **Settings → Developers → Public API → generate an API key.** That's `POSTIZ_API_KEY`.

## 6. Connect the channels (OAuth)
Each platform needs your own developer app; put its client id/secret in the compose
`environment:` block, restart, then connect in the Postiz UI. Follow Postiz's per-provider
guides (`https://docs.postiz.com/providers`):
- **Instagram** — via a **Facebook developer app** + an Instagram **Business/Creator** account (Instagram Graph API). Add the Facebook app id/secret env vars.
- **TikTok** — TikTok content-posting API app. ⚠️ auto-publish needs an **audited** app; until audited, posts may land as drafts to release manually.
- **YouTube** — Google Cloud project + YouTube Data API OAuth client.
Set each platform's OAuth redirect/callback to `https://postiz.airluxo.ch/...` per its provider page.

## 7. Wire it to AIRLUXO
Add the Supabase secrets (dashboard → Edge Functions → Secrets):
```
POSTIZ_API_KEY  = <the key from step 5>
POSTIZ_BASE_URL = https://postiz.airluxo.ch
```
Then I build **U8** (`content-publish` edge fn + publish cron): for each due `content_posts`
row it uploads the asset via `POST /public/v1/upload`, schedules via `POST /public/v1/posts`
(caption + time + the matched integration ids), and syncs status back to the dashboard.
Constraints to respect (built in): ~**90 posts/hr** self-host rate limit, **50 MB** payload
on `/posts` (so media is pre-uploaded, never inlined).

## 8. Verify
- `https://postiz.airluxo.ch` loads over HTTPS; you can connect at least one channel.
- `curl -H "Authorization: <POSTIZ_API_KEY>" https://postiz.airluxo.ch/public/v1/integrations` lists your connected accounts.
- Once secrets are set, tell me — I deploy U8 and an approved draft auto-publishes on schedule.

## Notes
- Back up the `postiz-pg` volume (your connected-account tokens live there).
- Keep `JWT_SECRET` + DB password out of git.
- Channel map: the AIRLUXO approval queue's channel chips (Instagram/TikTok/YouTube) map to Postiz integration ids in U8.
