// AIRLUXO — admin-impersonate-prospect
// Returns a magic link that signs the admin in AS a prospect's placeholder partner
// account, so they can build the fleet via the normal partner dashboard (full
// reuse, no separate editor). Admin-only; only works for is_prospect partners.
// verify_jwt ON. Body: { partner_id, origin }  (origin = the main-site origin to
// land on, e.g. https://staging.airluxo.ch — NOT the admin subdomain).

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
    if (!partnerId) return json({ error: "partner_id required" }, 400);

    // Only ever impersonate a prospect — never a real partner.
    const { data: p } = await admin.from("partners").select("id, is_prospect").eq("id", partnerId).maybeSingle();
    if (!p || !p.is_prospect) return json({ error: "Not a prospect" }, 400);

    const { data: u } = await admin.auth.admin.getUserById(partnerId);
    const email = u?.user?.email;
    if (!email) return json({ error: "Prospect account not found" }, 404);

    // Land on the partner dashboard of the main site (?partner deep-link).
    const origin = String(body.origin || "").replace(/\/$/, "");
    const redirectTo = origin ? `${origin}/?partner` : undefined;
    const { data: link, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: redirectTo ? { redirectTo } : undefined,
    });
    if (error) return json({ error: error.message }, 500);

    return json({ link: link?.properties?.action_link ?? null });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
