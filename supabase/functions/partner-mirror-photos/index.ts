// AIRLUXO — partner-mirror-photos
// Mirror a partner's car pictures from external (scraped) URLs into our own storage,
// under a tidy per-partner / per-listing folder: brand-assets/<partnerId>/cars/<listingId>/.
// Keeps photo {type, caption}; rewrites url + photo_url (hero) to the bucket URLs. Already
// mirrored or non-fetchable photos are left as-is. Idempotent.
//
// verify_jwt OFF — auth checked here (admin JWT OR service-role key).
// Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
// Body: { partner_id, listing_id? }  →  { listings, mirrored, skipped, errors }

import { createClient } from "jsr:@supabase/supabase-js@2";
import { fetchImageSafe } from "../_shared/safefetch.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const BUCKET = "brand-assets";
const extFor = (ct: string) => (ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : ct.includes("avif") ? "avif" : ct.includes("svg") ? "svg" : "jpg");
// A URL already living in our bucket — don't re-mirror it.
const alreadyOurs = (u: string) => /\/storage\/v1\/object\/public\/brand-assets\//i.test(u || "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    let authed = bearer && bearer === serviceKey;
    if (!authed && bearer) {
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: `Bearer ${bearer}` } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        const sc = createClient(supabaseUrl, serviceKey);
        const { data: adm } = await sc.from("app_admins").select("user_id").eq("user_id", user.id).maybeSingle();
        authed = !!adm;
      }
    }
    if (!authed) return json({ error: "Not authorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const partnerId = String(body.partner_id || "").trim();
    const listingId = body.listing_id ? String(body.listing_id).trim() : null;
    if (!partnerId) return json({ error: "partner_id required" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    let q = admin.from("listings").select("id, photos, photo_url").eq("partner_id", partnerId);
    if (listingId) q = q.eq("id", listingId);
    const { data: listings, error: lErr } = await q;
    if (lErr) return json({ error: lErr.message }, 500);

    let mirrored = 0, skipped = 0, errors = 0, touched = 0;

    for (const l of (listings || [])) {
      const photos = Array.isArray(l.photos) ? l.photos : [];
      if (!photos.length) continue;
      const next: any[] = [];
      let changed = false;
      let idx = 0;
      for (const p of photos) {
        const url = typeof p === "string" ? p : (p?.url || "");
        const type = typeof p === "object" ? (p.type || "") : "";
        const caption = typeof p === "object" ? (p.caption || "") : "";
        if (!url || alreadyOurs(url)) { next.push(typeof p === "string" ? { url, type, caption } : p); skipped += url ? 1 : 0; idx++; continue; }
        const img = await fetchImageSafe(url);
        if (!img) { next.push(typeof p === "string" ? { url, type, caption } : p); errors++; idx++; continue; }
        const path = `${partnerId}/cars/${l.id}/${idx}-${crypto.randomUUID().slice(0, 8)}.${extFor(img.contentType)}`;
        const up = await admin.storage.from(BUCKET).upload(path, img.bytes, { contentType: img.contentType, upsert: true });
        if (up.error) { next.push(typeof p === "string" ? { url, type, caption } : p); errors++; idx++; continue; }
        const publicUrl = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
        next.push({ url: publicUrl, type, caption });
        mirrored++; changed = true; idx++;
      }
      if (changed) {
        const hero = (next.find((x) => x.type === "hero") || next[0])?.url || l.photo_url || null;
        const { error: uErr } = await admin.from("listings").update({ photos: next, photo_url: hero }).eq("id", l.id);
        if (uErr) errors++; else touched++;
      }
    }

    return json({ listings: touched, mirrored, skipped, errors });
  } catch (e) {
    return json({ error: (e as Error).message || "mirror failed" }, 500);
  }
});
