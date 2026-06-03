// AIRLUXO — admin-delete-partner
// Permanently delete a partner (e.g. a test/abandoned prospect): removes their
// listings, locations, events, the partners row, and the auth user. REFUSES if the
// partner has any bookings — archive instead, to preserve booking history.
// Admin-only. verify_jwt ON. Body: { partner_id }

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
    if (partnerId === user.id) return json({ error: "You can't delete your own account here." }, 400);

    const { data: p } = await admin.from("partners").select("id").eq("id", partnerId).maybeSingle();
    if (!p) return json({ error: "Partner not found" }, 404);

    // Safety: never hard-delete a partner with booking history — archive instead.
    const { count } = await admin.from("bookings").select("id", { count: "exact", head: true }).eq("partner_id", partnerId);
    if ((count ?? 0) > 0) {
      return json({ error: `This partner has ${count} booking(s). Archive it instead to keep the history.`, has_bookings: true }, 409);
    }

    // Clean up children, then the partners row, then the auth user.
    await admin.from("car_blocks").delete().eq("partner_id", partnerId);
    await admin.from("listings").delete().eq("partner_id", partnerId);
    await admin.from("partner_locations").delete().eq("partner_id", partnerId);
    await admin.from("partner_events").delete().eq("partner_id", partnerId);
    await admin.from("partners").delete().eq("id", partnerId);
    const { error: dErr } = await admin.auth.admin.deleteUser(partnerId);
    if (dErr) return json({ error: `Could not delete account: ${dErr.message}` }, 500);

    return json({ ok: true });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
