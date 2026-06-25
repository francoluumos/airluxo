// AIRLUXO — suggest-car
// Public "what car should be up next?" poll on a partner's white-label site. Writes via
// the service role so the browser never touches car_suggestions. verify_jwt OFF — anonymous
// visitors can submit. Body: { partner_id, brand, type?, email? }.
//
// Secrets: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (auto).

import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const validEmail = (e: string) => {
  const at = e.indexOf("@");
  const dot = e.lastIndexOf(".");
  return at > 0 && dot > at + 1 && dot < e.length - 1 && !e.includes(" ");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const partnerId = String(body.partner_id || "").trim();
  if (!UUID.test(partnerId)) return json({ error: "A valid partner is required." }, 400);

  const brand = String(body.brand || "").trim().slice(0, 60);
  if (!brand) return json({ error: "Pick a brand." }, 400);

  const type = String(body.type || "").trim().slice(0, 40) || null;

  let email: string | null = String(body.email || "").trim().toLowerCase().slice(0, 160) || null;
  if (email && !validEmail(email)) return json({ error: "That email looks off." }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Guard: only accept suggestions for a partner whose site is actually published, so the
  // endpoint can't be used to seed rows against arbitrary partner ids.
  const { data: pub } = await admin
    .from("partner_assets")
    .select("partner_id")
    .eq("partner_id", partnerId)
    .eq("site_published", true)
    .maybeSingle();
  if (!pub) return json({ error: "Unknown partner." }, 404);

  const { error } = await admin
    .from("car_suggestions")
    .insert({ partner_id: partnerId, brand, type, email });
  if (error) return json({ error: `db: ${error.message}` }, 500);

  return json({ ok: true });
});
