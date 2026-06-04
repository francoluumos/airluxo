// AIRLUXO — booking-notify
// Emails the PARTNER when a new booking is created. Called (fire-and-forget) by
// the client right after a booking insert. Reads the booking + partner email
// server-side with the service role, renders via the shared email shell, sends
// through Resend.
//
// Secrets: RESEND_API_KEY (required to send), RESEND_FROM (optional). No-ops
// gracefully if unset.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { emailShell, rows, button, chf, BRAND } from "../_shared/email.ts";

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

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return json({ skipped: "RESEND_API_KEY not set" });

  const { data: u } = await supabase.auth.admin.getUserById(b.partner_id);
  const to = u?.user?.email;
  if (!to) return json({ error: "partner email not found" }, 404);

  const dates = b.end_date && b.end_date !== b.start_date ? `${b.start_date} → ${b.end_date}` : b.start_date;
  const addons = [
    b.cross_border ? "Cross-border" : null,
    b.delivery ? `Delivery${b.delivery_address ? ` to ${b.delivery_address}` : ""}` : null,
  ].filter(Boolean).join(", ") || "—";
  const contact = `${b.guest_name} · ${b.guest_email}${b.guest_phone ? ` · ${b.guest_phone}` : ""}`;

  const bodyHtml = `
    <p style="font-size:14px;color:${BRAND.stone};line-height:1.6;margin:0 0 16px">
      You have a new reservation. Review and confirm it in your partner dashboard — confirming charges the guest and locks the dates.
    </p>
    ${rows([
      ["Guest", contact],
      ["Dates", String(dates ?? "")],
      ["Rate", `${b.rate_label} ×${b.quantity}`],
      ["Add-ons", addons],
      ["Total paid by guest", chf(b.total_amount), { total: true }],
    ])}
    <p style="margin:22px 0 0">${button("https://airluxo.ch/?partner", "Open partner dashboard")}</p>`;

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: Deno.env.get("RESEND_FROM") || "AirLuxo News <noreply@send.airluxo.ch>",
      to,
      reply_to: Deno.env.get("RESEND_REPLY_TO") || undefined,
      subject: `New booking — ${b.car_label} (${dates})`,
      html: emailShell({
        preheader: `${b.guest_name} booked the ${b.car_label} — review and confirm.`,
        heading: `New booking · ${b.car_label}`,
        bodyHtml,
        footnote: `Booking status: ${b.status}.`,
      }),
    }),
  });
  if (!r.ok) return json({ error: `Resend ${r.status}: ${(await r.text()).slice(0, 300)}` }, 502);
  return json({ sent: true, to });
});
