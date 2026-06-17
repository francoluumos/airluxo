// AIRLUXO — partner-ingest-update
// The write-back contract for the agent pass (U5): after an ingest, a Claude agent runs
// the impeccable/vision audit on the stored screenshot to refine the brand kit (fix
// false defaults like the unstyled link-blue, recover the logo), exports the car images
// to a per-partner luumos.io Google Drive folder, and POSTs the result here. We write
// the refined kit into brand_kit_raw (the founder-reviewed PROPOSAL — applying it live
// stays a founder action in the review/apply UI), plus an improved USP/copy and the
// Drive folder URL, and flip the job to ready.
//
// verify_jwt OFF — auth = service-role key (the agent) OR an admin user.
// Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
// Body: { partner_id, brand_kit?, partner_pages?, drive_folder_url?, design_notes?, job_status? }

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

    const body = await req.json().catch(() => ({}));
    const partnerId = String(body.partner_id || "").trim();
    if (!partnerId) return json({ error: "partner_id required" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);

    // Merge the refined proposal onto the existing partner record (only provided keys).
    const patch: Record<string, unknown> = {};
    if (body.brand_kit && typeof body.brand_kit === "object") {
      patch.brand_kit_raw = { ...body.brand_kit, source: "impeccable", design_notes: body.design_notes || null };
    }
    if (body.partner_pages && typeof body.partner_pages === "object") patch.partner_pages = body.partner_pages;
    if (typeof body.drive_folder_url === "string" && body.drive_folder_url) patch.drive_folder_url = body.drive_folder_url;

    if (Object.keys(patch).length) {
      const { error } = await admin.from("partners").update(patch).eq("id", partnerId);
      if (error) return json({ error: error.message }, 500);
    }

    // Advance the latest job (enriching → ready) so the admin review reflects the pass.
    const status = body.job_status || "ready";
    const { data: job } = await admin.from("partner_ingest_jobs")
      .select("id").eq("partner_id", partnerId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (job?.id) await admin.from("partner_ingest_jobs").update({ status }).eq("id", job.id);

    return json({ ok: true, partner_id: partnerId, updated: Object.keys(patch) });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
