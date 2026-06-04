// AIRLUXO — booking-confirm
// Emails the GUEST a branded booking confirmation ("request received"). Called
// (fire-and-forget) by the client right after a booking insert, alongside
// booking-notify (partner) and booking-webhook. Reads the booking server-side
// with the service role, renders via the shared email shell, sends through Resend.
//
// Secrets: RESEND_API_KEY (required to send), RESEND_FROM, RESEND_REPLY_TO (optional).
// No-ops gracefully if unset. verify_jwt OFF — guests create bookings unauthenticated.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { emailShell, rows, chf, esc, BRAND } from "../_shared/email.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let booking_id: string | undefined;
  try { ({ booking_id } = await req.json()); } catch { return json({ error: "Invalid JSON" }, 400); }
  if (!booking_id) return json({ error: "booking_id required" }, 400);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: b } = await supabase.from("bookings").select("*").eq("id", booking_id).maybeSingle();
  if (!b) return json({ error: "booking not found" }, 404);

  const to = b.guest_email;
  if (!to) return json({ error: "guest email not found" }, 404);

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return json({ skipped: "RESEND_API_KEY not set" });

  const dates = b.end_date && b.end_date !== b.start_date ? `${b.start_date} → ${b.end_date}` : b.start_date;
  const addons = [
    b.cross_border ? "Cross-border travel" : null,
    b.delivery ? `Delivery${b.delivery_address ? ` to ${b.delivery_address}` : ""}` : null,
  ].filter(Boolean).join(" · ") || "—";

  const bodyHtml = `
    <p style="font-size:14px;color:${BRAND.stone};line-height:1.6;margin:0 0 16px">
      We've received your request for the <strong style="color:${BRAND.ink}">${esc(b.car_label)}</strong>.
      The host will confirm availability shortly — you'll get a final confirmation and receipt by email once they accept.
    </p>
    ${rows([
      ["Car", String(b.car_label ?? "")],
      ["Dates", String(dates ?? "")],
      ["Rate", `${b.rate_label} ×${b.quantity}`],
      ["Add-ons", addons],
      ["Total", chf(b.total_amount), { total: true }],
    ])}
    <p style="font-size:13px;color:${BRAND.ash};line-height:1.6;margin:18px 0 0">
      Reference <span style="font-family:ui-monospace,Menlo,monospace;color:${BRAND.stone}">${esc(String(b.id).slice(0, 8).toUpperCase())}</span>
    </p>`;

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: Deno.env.get("RESEND_FROM") || "AirLuxo News <noreply@send.airluxo.ch>",
      to,
      reply_to: Deno.env.get("RESEND_REPLY_TO") || undefined,
      subject: `Booking received — ${b.car_label} (${dates})`,
      html: emailShell({
        preheader: `We've got your request for the ${b.car_label} — the host will confirm shortly.`,
        heading: `Your booking is in, ${b.guest_name}.`,
        bodyHtml,
        footnote: "Questions? Just reply to this email.",
      }),
    }),
  });
  if (!r.ok) return json({ error: `Resend ${r.status}: ${(await r.text()).slice(0, 300)}` }, 502);
  return json({ sent: true, to });
});
