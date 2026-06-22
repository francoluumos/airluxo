// AIRLUXO — reel-analyze
// Reverse-engineers a viral Instagram Reel into a reusable FORMAT blueprint for the
// reel-reverse-engineer skill. Scrapes the reel via Apify, uploads the video to the
// Gemini Files API, and asks Gemini for a full visual + emotional + structural
// breakdown (NOT the variant scripts — the skill generates those locally).
//
// Keys stay server-side: Apify (APIFY_API) + Gemini (GEMINI_API_KEY) never leave Supabase.
// verify_jwt OFF — auth is checked here (service-role key OR an app_admins user), same as content-scrape.
//
// Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, APIFY_API, GEMINI_API_KEY
//          (+ optional GEMINI_VIDEO_MODEL, default gemini-2.5-flash).
// Body: { reel_url: string }
// Returns: { ok, metadata: {...}, analysis: {...} }

import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const n = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

// Pull the first {...} JSON object out of Gemini's text (it may wrap it in prose / fences).
function parseJson(text: string): any | null {
  if (!text) return null;
  try { return JSON.parse(text); } catch { /* fall through */ }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch { /* noop */ }
  }
  return null;
}

const MAX_VIDEO_BYTES = 80 * 1024 * 1024; // 80MB guard

// The reverse-engineer prompt — lift the repeatable craft, not the content.
const ANALYSIS_PROMPT = `I'm reverse-engineering this Reel to rebuild its FORMAT for a luxury car brand (AIRLUXO — emotional reels of luxury cars and the people driving them). I do not care about its specific content, only the repeatable craft.

Return ONLY a JSON object (no prose, no markdown fences) with exactly these keys:
{
  "transcript": [ { "t": "0.0-2.5", "type": "voiceover|onscreen|lyrics", "text": string } ],
  "hook": { "opening_words": string|null, "opening_visual": string, "word_count": number, "scroll_stopper": string },
  "visual_guideline": {
    "shots": [ { "t": "0.0-2.0", "framing": "wide|medium|close|detail", "camera_move": string, "angle": "low|eye|high", "lens_feel": string, "subject": string } ],
    "color_grade": string,
    "lighting": string,
    "recurring_details": [ string ],
    "text_overlays": [ { "placement": string, "style": string, "animation": string } ]
  },
  "pacing": { "total_seconds": number, "avg_shot_seconds": number, "rhythm": string, "beat_sync": string, "transitions": [ string ] },
  "audio": { "music_energy": string, "drop_or_peak_at": string, "sound_design": string, "mood": string },
  "emotional_arc": { "start_feeling": string, "peak_feeling": string, "end_feeling": string, "money_moment": string },
  "structure": { "sections": [ { "name": "hook|build|payoff|cta", "t": "0.0-3.0", "note": string } ], "transformation": string, "cta": string },
  "key_insight": string
}

Transcribe every word with timestamps. Be specific and concrete in every field. If something is absent (e.g. no voiceover), use an empty array or null. Never invent metrics.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    // Auth: cron (service-role key) OR an admin user — same pattern as content-scrape.
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
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return json({ error: "GEMINI_API_KEY is not configured" }, 500);

    const body = await req.json().catch(() => ({}));
    const reelUrl = String(body.reel_url || "").trim();
    if (!/^https?:\/\/(www\.)?instagram\.com\//i.test(reelUrl)) {
      return json({ error: "A valid Instagram reel_url is required" }, 400);
    }

    // ---- 1. Apify scrape (single reel) ---------------------------------------
    async function apify(actor: string, input: unknown): Promise<any[]> {
      const r = await fetch(
        `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${apifyToken}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) },
      );
      if (!r.ok) throw new Error(`Apify ${actor} ${r.status}: ${(await r.text()).slice(0, 160)}`);
      const items = await r.json();
      return Array.isArray(items) ? items : [];
    }

    let items: any[] = [];
    try {
      items = await apify("apify~instagram-reel-scraper", { directUrls: [reelUrl], resultsLimit: 1 });
      if (items.length === 0) items = await apify("apify~instagram-scraper", { directUrls: [reelUrl], resultsType: "posts", resultsLimit: 1 });
    } catch (e) {
      return json({ error: String((e as Error)?.message || e) }, 502);
    }
    const it = items[0];
    if (!it) return json({ error: "Apify returned no item for that reel URL" }, 404);

    const videoUrl: string | null = it.videoUrl || it.video_url || it.videoUrlHd || null;
    if (!videoUrl) return json({ error: "No videoUrl in Apify result", sample_keys: Object.keys(it) }, 502);
    const shortCode = it.shortCode || it.code || "reel";
    const metadata = {
      reel_url: reelUrl,
      handle: it.ownerUsername || it.username || it.owner?.username || null,
      caption: (it.caption || it.text || "").slice(0, 500) || null,
      views: n(it.videoViewCount ?? it.videoPlayCount ?? it.playCount ?? it.views),
      likes: n(it.likesCount ?? it.likes),
      comments: n(it.commentsCount ?? it.comments),
      posted_at: it.timestamp || it.takenAt || null,
      audio_title: it.musicInfo?.song_name || it.musicInfo?.artist_name || null,
      short_code: shortCode,
    };

    // ---- 2. Download the video bytes -----------------------------------------
    const vid = await fetch(videoUrl);
    if (!vid.ok) return json({ error: `Video download failed ${vid.status}` }, 502);
    const len = Number(vid.headers.get("content-length") || 0);
    if (len && len > MAX_VIDEO_BYTES) return json({ error: `Video too large (${Math.round(len / 1e6)}MB)` }, 413);
    const bytes = new Uint8Array(await vid.arrayBuffer());
    if (bytes.length > MAX_VIDEO_BYTES) return json({ error: "Video too large" }, 413);
    const mimeType = vid.headers.get("content-type")?.split(";")[0] || "video/mp4";

    // ---- 3. Upload to the Gemini Files API (resumable) -----------------------
    const startRes = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "X-Goog-Upload-Protocol": "resumable",
          "X-Goog-Upload-Command": "start",
          "X-Goog-Upload-Header-Content-Length": String(bytes.length),
          "X-Goog-Upload-Header-Content-Type": mimeType,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ file: { display_name: String(shortCode) } }),
      },
    );
    const uploadUrl = startRes.headers.get("x-goog-upload-url");
    if (!uploadUrl) return json({ error: `Gemini upload init failed ${startRes.status}: ${(await startRes.text()).slice(0, 160)}` }, 502);

    const upRes = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Length": String(bytes.length), "X-Goog-Upload-Offset": "0", "X-Goog-Upload-Command": "upload, finalize" },
      body: bytes,
    });
    if (!upRes.ok) return json({ error: `Gemini upload failed ${upRes.status}: ${(await upRes.text()).slice(0, 160)}` }, 502);
    let file = (await upRes.json())?.file;
    if (!file?.name) return json({ error: "Gemini upload returned no file" }, 502);

    // Poll until the video finishes processing (ACTIVE) — short reels clear fast.
    for (let i = 0; i < 30 && file.state === "PROCESSING"; i++) {
      await sleep(2000);
      const pr = await fetch(`https://generativelanguage.googleapis.com/v1beta/${file.name}?key=${apiKey}`);
      file = await pr.json();
    }
    if (file.state !== "ACTIVE") return json({ error: `Gemini file not ready (state ${file.state})` }, 504);

    // ---- 4. Analyse with Gemini ----------------------------------------------
    const primary = Deno.env.get("GEMINI_VIDEO_MODEL") || "gemini-2.5-flash";
    const models = [...new Set([primary, "gemini-2.0-flash"])];
    const payload = JSON.stringify({
      contents: [{ parts: [{ fileData: { mimeType: file.mimeType, fileUri: file.uri } }, { text: ANALYSIS_PROMPT }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 8192, responseMimeType: "application/json" },
    });
    const RETRYABLE = new Set([429, 500, 502, 503, 504]);
    let resp: Response | null = null;
    let lastErr = "";
    outer:
    for (const model of models) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const r = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            { method: "POST", headers: { "Content-Type": "application/json" }, body: payload },
          );
          if (r.ok) { resp = r; break outer; }
          lastErr = `${r.status}: ${(await r.text()).slice(0, 200)}`;
          if (!RETRYABLE.has(r.status)) break;
          await sleep(700 * (attempt + 1));
        } catch (e) {
          lastErr = String((e as Error)?.message || e);
          await sleep(700 * (attempt + 1));
        }
      }
    }

    // Best-effort cleanup of the uploaded file (don't block the response on it).
    fetch(`https://generativelanguage.googleapis.com/v1beta/${file.name}?key=${apiKey}`, { method: "DELETE" }).catch(() => {});

    if (!resp) return json({ error: `Gemini error ${lastErr}` }, 503);
    const gem = await resp.json();
    const text = (gem?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "").trim();
    const analysis = parseJson(text);
    if (!analysis) return json({ error: "Gemini returned no parseable analysis", raw: text.slice(0, 400) }, 502);

    return json({ ok: true, metadata, analysis });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
