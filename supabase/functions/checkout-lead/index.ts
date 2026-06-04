// AIRLUXO — checkout-lead
// Captures a booking lead when a guest types their email at the checkout details
// step (basis for the abandoned-booking recovery flow). Writes via the service role
// so the browser never touches the table. verify_jwt OFF — guests are anonymous.
// Body: { email, listing_id, car_label?, start_date?, end_date? }
//
// This is a record of soft-opt-in: the user was actively booking and the form (the
// details step) offers a marketing opt-in. The recovery email only ever reminds
// about this same car and carries a one-click unsubscribe.

import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const validEmail = (e: string) => {
  const at = e.indexOf("@");
  const dot = e.lastIndexOf(".");
  return at > 0 && dot > at + 1 && dot < e.length - 1 && !e.includes(" ");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const email = String(body.email || "").trim().toLowerCase();
  const listing_id = body.listing_id ? String(body.listing_id) : null;
  if (!validEmail(email) || !listing_id) return json({ skipped: "need email + listing_id" });

  const fields = {
    car_label: body.car_label ? String(body.car_label) : null,
    start_date: body.start_date ? String(body.start_date) : null,
    end_date: body.end_date ? String(body.end_date) : null,
  };

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Refresh an existing open lead for this email+car, else create one. (Manual
  // upsert because the unique index is on lower(email) — not targetable by PostgREST.)
  const { data: existing } = await admin
    .from("checkout_leads")
    .select("id")
    .eq("email", email)
    .eq("listing_id", listing_id)
    .maybeSingle();

  if (existing) {
    await admin.from("checkout_leads").update({ ...fields, created_at: new Date().toISOString() }).eq("id", existing.id);
  } else {
    await admin.from("checkout_leads").insert({ email, listing_id, ...fields });
  }

  return json({ ok: true });
});
