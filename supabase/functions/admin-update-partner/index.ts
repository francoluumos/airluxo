// AIRLUXO — admin-update-partner
// Edit a partner's details from the founder dashboard. The "email" field maps to
// the right place: for a prospect it's the contact email; for a live partner it's
// the actual login email (auth), which needs the service role. Admin-only.
// verify_jwt ON. Body: { partner_id, company_name?, contact_name?, phone?, email?,
//   street?, street_number?, zip?, city?, country?, lat?, lng?, links?: [{platform,url}],
//   source?, notes? }

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
    const partnerId = String(body.partner_id || "");
    if (!partnerId) return json({ error: "partner_id required" }, 400);

    const { data: p } = await admin.from("partners").select("id, is_prospect").eq("id", partnerId).maybeSingle();
    if (!p) return json({ error: "Partner not found" }, 404);

    const patch: Record<string, unknown> = {};
    if (typeof body.company_name === "string" && body.company_name.trim()) patch.company_name = body.company_name.trim();
    if (body.contact_name !== undefined) {
      const cn = String(body.contact_name || "").trim() || null;
      patch.contact_name = cn;
      // Prospects display prospect_contact_name (pipeline) — keep both in sync.
      if (p.is_prospect) patch.prospect_contact_name = cn;
    }
    // Phone mirrors email: prospect → contact phone, live partner → partners.phone.
    if (body.phone !== undefined) {
      const phone = String(body.phone || "").trim() || null;
      if (p.is_prospect) patch.prospect_contact_phone = phone;
      else patch.phone = phone;
    }

    // Structured address + web/social links (stored on partners for any partner).
    if (body.street !== undefined) patch.prospect_street = String(body.street || "").trim() || null;
    if (body.street_number !== undefined) patch.prospect_street_number = String(body.street_number || "").trim() || null;
    if (body.zip !== undefined) patch.prospect_zip = String(body.zip || "").trim() || null;
    if (body.city !== undefined) patch.prospect_city = String(body.city || "").trim() || null;
    if (body.country !== undefined) patch.prospect_country = String(body.country || "").trim() || null;
    if (body.lat !== undefined) patch.prospect_lat = body.lat ?? null;
    if (body.lng !== undefined) patch.prospect_lng = body.lng ?? null;
    if (body.links !== undefined) patch.prospect_links = cleanLinks(body.links);

    // Prospect CRM fields (founder pipeline only).
    if (body.source !== undefined) patch.prospect_source = String(body.source || "").trim() || null;
    if (body.notes !== undefined) patch.prospect_notes = String(body.notes || "").trim() || null;

    const email = body.email !== undefined ? String(body.email || "").trim().toLowerCase() : null;
    if (email) {
      patch.prospect_contact_email = email;
      if (!p.is_prospect) {
        // Live partner → this IS their login email. Only touch auth if it changed
        // (re-setting the same email can error and would abort the whole save).
        const { data: cur } = await admin.auth.admin.getUserById(partnerId);
        if ((cur?.user?.email || "").toLowerCase() !== email) {
          const { error: upErr } = await admin.auth.admin.updateUserById(partnerId, { email, email_confirm: true });
          if (upErr) return json({ error: `Could not update login email: ${upErr.message}` }, 409);
        }
      }
    }

    if (Object.keys(patch).length) {
      const { error: pErr } = await admin.from("partners").update(patch).eq("id", partnerId);
      if (pErr) return json({ error: pErr.message }, 500);
    }

    return json({ ok: true });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
