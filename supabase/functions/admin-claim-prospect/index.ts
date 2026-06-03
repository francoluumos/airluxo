// AIRLUXO — admin-claim-prospect
// Converts a prospect into a live partner: swaps the placeholder email for the
// partner's real one, flips is_prospect=false (a trigger makes their cars live in
// the marketplace), marks the pipeline Won, and returns a password-setup link to
// send the partner. Admin-only; prospect-only. verify_jwt ON.
// Body: { partner_id, email (real partner email), origin }

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
    const partnerId = String(body.partner_id || "");
    const email = String(body.email || "").trim().toLowerCase();
    if (!partnerId || !email) return json({ error: "partner_id and email required" }, 400);

    const { data: p } = await admin.from("partners").select("id, is_prospect").eq("id", partnerId).maybeSingle();
    if (!p || !p.is_prospect) return json({ error: "Not a prospect" }, 400);

    // Claim the placeholder account with the partner's real email (immediate, no
    // confirmation mail). Fails clearly if that email is already in use.
    const { error: upErr } = await admin.auth.admin.updateUserById(partnerId, { email, email_confirm: true });
    if (upErr) return json({ error: `Could not set email: ${upErr.message}` }, 409);

    // Go live: a trigger flips their listings' is_prospect too, so the cars surface
    // in the marketplace immediately.
    const { error: pErr } = await admin.from("partners")
      .update({ is_prospect: false, pipeline_stage: "won", prospect_contact_email: email, went_live_at: new Date().toISOString() })
      .eq("id", partnerId);
    if (pErr) return json({ error: pErr.message }, 500);
    await admin.from("partner_events").insert({ partner_id: partnerId, kind: "went_live" });

    // Password-setup link for the partner to take ownership.
    const origin = String(body.origin || "").replace(/\/$/, "");
    const { data: link } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: origin ? { redirectTo: `${origin}/?reset=1` } : undefined,
    });

    return json({ ok: true, email, login_link: link?.properties?.action_link ?? null });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
