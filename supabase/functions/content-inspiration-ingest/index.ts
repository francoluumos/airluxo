// AIRLUXO — content-inspiration-ingest
// Write-path for mined inspiration. The scheduled generation agent uses the Apify
// MCP to scrape/discover reels, then batch-POSTs the rows here to upsert into
// content_inspiration (idempotent on reel_url). This keeps Apify auth in the
// agent's MCP — no APIFY_TOKEN on Supabase. Service-role auth (machine), verify_jwt OFF.
//
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// Body: { items: [ { reel_url, source_handle?, caption?, hashtags?, views?, likes?,
//          comments?, posted_at?, audio_title?, work_score? } ] }

import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const num = (v: unknown) => (v == null || v === "" ? null : Number(v));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!bearer || bearer !== serviceKey) return json({ error: "Not authorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const items = Array.isArray(body.items) ? body.items : [];
    const rows = items
      .filter((it: any) => typeof it?.reel_url === "string" && it.reel_url)
      .map((it: any) => ({
        reel_url: String(it.reel_url),
        source_handle: it.source_handle || null,
        caption: it.caption || null,
        hashtags: Array.isArray(it.hashtags) ? it.hashtags : [],
        views: num(it.views),
        likes: num(it.likes),
        comments: num(it.comments),
        posted_at: it.posted_at || null,
        audio_title: it.audio_title || null,
        work_score: num(it.work_score),
        source: "scraped",
        scraped_at: new Date().toISOString(),
      }));
    if (rows.length === 0) return json({ error: "items required" }, 422);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
    // Upsert on reel_url; don't clobber a manual note/source flag.
    const { error } = await admin.from("content_inspiration")
      .upsert(rows, { onConflict: "reel_url", ignoreDuplicates: false });
    if (error) return json({ error: error.message }, 500);

    return json({ ok: true, upserted: rows.length });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
