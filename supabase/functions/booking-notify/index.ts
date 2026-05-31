// AIRLUXO — booking-notify
// Emails the partner when a new booking is created. Called (fire-and-forget) by
// the client right after a booking insert. Reads the booking + partner email
// server-side with the service role, then sends via Resend.
//
// Secrets: RESEND_API_KEY (required to actually send), RESEND_FROM (optional,
// defaults to Resend's shared sandbox sender). No-ops gracefully if unset.

import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const chf = (n: number) => `CHF ${Number(n).toLocaleString("de-CH")}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let booking_id: string | undefined;
  try { ({ booking_id } = await req.json()); } catch { return json({ error: "Invalid JSON" }, 400); }
  if (!booking_id) return json({ error: "booking_id required" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: b } = await supabase.from("bookings").select("*").eq("id", booking_id).maybeSingle();
  if (!b) return json({ error: "booking not found" }, 404);

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return json({ skipped: "RESEND_API_KEY not set" });

  const { data: u } = await supabase.auth.admin.getUserById(b.partner_id);
  const to = u?.user?.email;
  if (!to) return json({ error: "partner email not found" }, 404);

  const from = Deno.env.get("RESEND_FROM") || "AIRLUXO <onboarding@resend.dev>";
  const dates = b.end_date && b.end_date !== b.start_date ? `${b.start_date} → ${b.end_date}` : b.start_date;
  const addons = [
    b.cross_border ? "Cross-border" : null,
    b.delivery ? `Delivery${b.delivery_address ? ` to ${b.delivery_address}` : ""}` : null,
  ].filter(Boolean).join(", ") || "—";

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:auto">
      <h2 style="font-weight:700">New booking · ${b.car_label}</h2>
      <p style="color:#555">You have a new reservation on AIRLUXO. Review and confirm it in your partner dashboard.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:6px 0;color:#888">Guest</td><td style="padding:6px 0;text-align:right">${b.guest_name} · ${b.guest_email}${b.guest_phone ? ` · ${b.guest_phone}` : ""}</td></tr>
        <tr><td style="padding:6px 0;color:#888">Dates</td><td style="padding:6px 0;text-align:right">${dates}</td></tr>
        <tr><td style="padding:6px 0;color:#888">Rate</td><td style="padding:6px 0;text-align:right">${b.rate_label} ×${b.quantity}</td></tr>
        <tr><td style="padding:6px 0;color:#888">Add-ons</td><td style="padding:6px 0;text-align:right">${addons}</td></tr>
        <tr><td style="padding:10px 0;border-top:1px solid #eee;font-weight:700">Total paid by guest</td><td style="padding:10px 0;border-top:1px solid #eee;text-align:right;font-weight:700">${chf(b.total_amount)}</td></tr>
      </table>
      <p style="color:#999;font-size:12px;margin-top:18px">AIRLUXO · status: ${b.status}</p>
    </div>`;

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject: `New booking — ${b.car_label} (${dates})`, html }),
  });
  if (!r.ok) return json({ error: `Resend ${r.status}: ${(await r.text()).slice(0, 300)}` }, 502);
  return json({ sent: true, to });
});
