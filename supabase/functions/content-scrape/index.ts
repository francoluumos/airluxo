// AIRLUXO — content-scrape
// Mines the active watchlist via Apify (Instagram Reel Scraper REST), ranks reels by
// a "what works" score, and upserts them into content_inspiration. Runs autonomously
// on a daily cron (service-role bearer) and on demand from the admin "Scan now" button
// (admin JWT). verify_jwt OFF — auth is checked here (service-role key OR app_admins).
//
// Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, APIFY_API.
// Body: { limit_per_handle?: number }

import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const n = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
// "What works" score: comments weigh most (intent), then likes, then reach. Recency-decayed.
function workScore(views: number, likes: number, comments: number, postedAt: string | null): number {
  const base = 3 * comments + likes + 0.05 * views;
  let recency = 1;
  if (postedAt) {
    const days = (Date.now() - new Date(postedAt).getTime()) / 86400000;
    if (Number.isFinite(days)) recency = Math.max(0.3, 1 - days / 120); // ~4-month decay floor 0.3
  }
  return Math.round(base * recency * 10) / 10;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    // Auth: cron (service-role key) OR an admin user.
    let authed = bearer && bearer === serviceKey;
    if (!authed && bearer) {
      const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: `Bearer ${bearer}` } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        const sc = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
        const { data: adm } = await sc.from("app_admins").select("user_id").eq("user_id", user.id).maybeSingle();
        authed = !!adm;
      }
    }
    if (!authed) return json({ error: "Not authorized" }, 401);

    const apifyToken = Deno.env.get("APIFY_API");
    if (!apifyToken) return json({ error: "APIFY_API is not configured" }, 500);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
    const { data: watch } = await admin.from("content_watchlist").select("handle").eq("active", true).eq("platform", "instagram");
    const handles = (watch || []).map((w) => String(w.handle).replace(/^@/, "").trim()).filter(Boolean);
    if (handles.length === 0) return json({ ok: true, scraped: 0, note: "watchlist empty" });

    const body = await req.json().catch(() => ({}));
    const resultsLimit = Math.max(1, Math.min(60, Number(body.limit_per_handle) || 20));

    // Apify Instagram Reel Scraper — run synchronously and get dataset items.
    let items: any[] = [];
    const res = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-reel-scraper/run-sync-get-dataset-items?token=${apifyToken}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: handles, resultsLimit }) },
    );
    if (!res.ok) return json({ error: `Apify error ${res.status}: ${(await res.text()).slice(0, 200)}` }, 502);
    items = await res.json();
    if (!Array.isArray(items)) items = [];

    const rows = items.map((it) => {
      const views = n(it.videoViewCount ?? it.videoPlayCount ?? it.playCount ?? it.views);
      const likes = n(it.likesCount ?? it.likes);
      const comments = n(it.commentsCount ?? it.comments);
      const postedAt = it.timestamp || it.takenAt || null;
      return {
        reel_url: it.url || it.reelUrl || null,
        source_handle: it.ownerUsername || it.username || null,
        caption: it.caption || it.text || null,
        hashtags: Array.isArray(it.hashtags) ? it.hashtags : [],
        views, likes, comments,
        posted_at: postedAt,
        audio_title: it.musicInfo?.song_name || it.musicInfo?.artist_name || null,
        work_score: workScore(views, likes, comments, postedAt),
        source: "scraped",
        scraped_at: new Date().toISOString(),
      };
    }).filter((r) => r.reel_url);

    if (rows.length === 0) return json({ ok: true, scraped: 0, note: "no reels returned" });

    // Upsert; do not clobber a manual note/source flag (handled by content-inspiration-ingest
    // convention — here we only set source='scraped' on rows we mined).
    const { error } = await admin.from("content_inspiration").upsert(rows, { onConflict: "reel_url", ignoreDuplicates: false });
    if (error) return json({ error: error.message }, 500);

    return json({ ok: true, scraped: rows.length, handles: handles.length });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
