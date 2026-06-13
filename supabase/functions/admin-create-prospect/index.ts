// AIRLUXO — admin-create-prospect
// Creates a "prospect" partner for the sales pipeline: a placeholder auth user
// (no real email needed) whose partners row is flagged is_prospect. Franco builds
// the fleet via the normal dashboard; later it's claimed into a live account.
// Admin-only: the caller must be in app_admins. verify_jwt ON.
//
// Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (all default).
// Body: { company_name (required), contact_name?, contact_email?, contact_phone?, city?,
//         source?, notes?, street?, street_number?, zip?, country?, lat?, lng?,
//         links?: [{ platform, url }] }

import { createClient } from "jsr:@supabase/supabase-js@2";

// Keep only well-formed { platform, url } link rows with a non-empty url.
function cleanLinks(raw: unknown): { platform: string; url: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((l) => ({ platform: String((l as any)?.platform || "").trim(), url: String((l as any)?.url || "").trim() }))
    .filter((l) => l.url)
    .slice(0, 30);
}

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
    const authz = req.headers.get("Authorization") || "";
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authz } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Not signed in" }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: adm } = await admin.from("app_admins").select("user_id").eq("user_id", user.id).maybeSingle();
    if (!adm) return json({ error: "Not authorized" }, 403);

    const body = await req.json().catch(() => ({}));
    const company = String(body.company_name || "").trim();
    if (!company) return json({ error: "company_name required" }, 400);

    // Placeholder user — internal email, no real address needed. company_name in
    // metadata makes handle_new_user route it to a partners row.
    const token = crypto.randomUUID();
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email: `prospect-${token}@prospect.airluxo.ch`,
      email_confirm: true,
      password: `${crypto.randomUUID()}Aa1!`,
      user_metadata: {
        company_name: company,
        contact_name: String(body.contact_name || ""),
        city: String(body.city || ""),
      },
    });
    if (cErr || !created?.user) return json({ error: cErr?.message || "Could not create prospect" }, 500);
    const pid = created.user.id;

    // Enrich the partners row the trigger just created.
    const { data: row, error: uErr } = await admin.from("partners").update({
      is_prospect: true,
      pipeline_stage: "lead",
      prospect_contact_name: body.contact_name || null,
      prospect_contact_email: body.contact_email || null,
      prospect_contact_phone: body.contact_phone || null,
      prospect_source: body.source || null,
      prospect_notes: body.notes || null,
      prospect_street: body.street || null,
      prospect_street_number: body.street_number || null,
      prospect_zip: body.zip || null,
      prospect_city: body.city || null,
      prospect_country: body.country || null,
      prospect_lat: body.lat ?? null,
      prospect_lng: body.lng ?? null,
      prospect_links: cleanLinks(body.links),
    }).eq("id", pid).select("id, company_name, pipeline_stage, preview_token, created_at").maybeSingle();
    if (uErr) return json({ error: uErr.message }, 500);

    await admin.from("partner_events").insert({ partner_id: pid, kind: "created" });

    return json({ prospect: row });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
