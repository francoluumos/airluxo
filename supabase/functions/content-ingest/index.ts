// AIRLUXO — content-ingest
// Machine ingest for the content pipeline: the generation agent (Claude + Higgsfield)
// uploads finished reels/carousels to the content-media bucket, then POSTs the
// metadata here to create a draft in the approval queue. Auth is service-role
// (machine-to-machine) — the caller's bearer must equal the service-role key,
// same posture as the marketing cron functions. verify_jwt OFF.
//
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// Body: { listing_id?, format ('reel'|'carousel'), concept_brief?, asset_urls: [],
//         caption?, virality_score?, hook_score?, inspiration_ids?: [] }

import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!bearer || bearer !== serviceKey) return json({ error: "Not authorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const format = body.format === "carousel" ? "carousel" : "reel";
    const assets = Array.isArray(body.asset_urls) ? body.asset_urls.filter((u: unknown) => typeof u === "string" && u) : [];
    if (assets.length === 0) return json({ error: "asset_urls required" }, 422);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
    const { data, error } = await admin.from("content_drafts").insert({
      listing_id: body.listing_id || null,
      format,
      concept_brief: body.concept_brief ?? {},
      asset_urls: assets,
      caption: body.caption || null,
      virality_score: body.virality_score ?? null,
      hook_score: body.hook_score ?? null,
      inspiration_ids: Array.isArray(body.inspiration_ids) ? body.inspiration_ids : [],
      status: "generated",
    }).select("id").maybeSingle();
    if (error) return json({ error: error.message }, 500);

    return json({ ok: true, draft_id: data?.id });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
