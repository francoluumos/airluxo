// AIRLUXO — booking-confirm
// Emails the GUEST a branded booking confirmation. Called (fire-and-forget) by
// the client right after a booking insert, alongside booking-notify (partner)
// and booking-webhook. Reads the booking server-side with the service role,
// then sends via Resend.
//
// Secrets: RESEND_API_KEY (required to actually send), RESEND_FROM (optional,
// defaults to Resend's shared sandbox sender). No-ops gracefully if unset.
// verify_jwt OFF — guests create bookings unauthenticated.

import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const chf = (n: number) => `CHF ${Number(n).toLocaleString("de-CH")}`;
const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

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

  const to = b.guest_email;
  if (!to) return json({ error: "guest email not found" }, 404);

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return json({ skipped: "RESEND_API_KEY not set" });

  const from = Deno.env.get("RESEND_FROM") || "AIRLUXO <onboarding@resend.dev>";
  const dates = b.end_date && b.end_date !== b.start_date ? `${b.start_date} → ${b.end_date}` : b.start_date;
  const addons = [
    b.cross_border ? "Cross-border travel" : null,
    b.delivery ? `Delivery${b.delivery_address ? ` to ${b.delivery_address}` : ""}` : null,
  ].filter(Boolean).join(" · ") || "—";

  const html = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:auto;color:#0b0b0c">
      <div style="font-weight:600;letter-spacing:0.06em;font-size:20px;margin-bottom:6px">AIR<span style="color:#b89150">LUXO</span></div>
      <h2 style="font-weight:700;font-size:22px;margin:18px 0 4px">Your booking is in, ${esc(b.guest_name)}.</h2>
      <p style="color:#76746d;font-size:14px;line-height:1.5;margin:0 0 18px">
        We've received your request for the <strong style="color:#0b0b0c">${esc(b.car_label)}</strong>.
        The host will confirm availability shortly — you'll get a final confirmation by email once they accept.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:6px 0;color:#a8a59b">Car</td><td style="padding:6px 0;text-align:right">${esc(b.car_label)}</td></tr>
        <tr><td style="padding:6px 0;color:#a8a59b">Dates</td><td style="padding:6px 0;text-align:right">${esc(dates)}</td></tr>
        <tr><td style="padding:6px 0;color:#a8a59b">Rate</td><td style="padding:6px 0;text-align:right">${esc(b.rate_label)} ×${esc(b.quantity)}</td></tr>
        <tr><td style="padding:6px 0;color:#a8a59b">Add-ons</td><td style="padding:6px 0;text-align:right">${esc(addons)}</td></tr>
        <tr><td style="padding:10px 0;border-top:1px solid #e7e4db;font-weight:700">Total</td><td style="padding:10px 0;border-top:1px solid #e7e4db;text-align:right;font-weight:700">${chf(b.total_amount)}</td></tr>
      </table>
      <p style="color:#76746d;font-size:13px;line-height:1.5;margin:18px 0 0">
        Reference: <span style="font-family:ui-monospace,monospace">${esc(b.id)}</span><br/>
        Questions? Just reply to this email.
      </p>
      <p style="color:#a8a59b;font-size:12px;margin-top:22px;border-top:1px solid #e7e4db;padding-top:14px">
        AIRLUXO · Switzerland's marketplace for extraordinary cars · Geneva
      </p>
    </div>`;

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to,
      subject: `Booking received — ${b.car_label} (${dates})`,
      html,
      reply_to: Deno.env.get("RESEND_REPLY_TO") || undefined,
    }),
  });
  if (!r.ok) return json({ error: `Resend ${r.status}: ${(await r.text()).slice(0, 300)}` }, 502);
  return json({ sent: true, to });
});
