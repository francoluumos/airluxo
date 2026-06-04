// AIRLUXO — booking-invoice
// Emails the GUEST a branded invoice / payment receipt once their card has been
// charged (booking captured → Confirmed). Fired fire-and-forget right after a
// successful capture in stripe-capture. Reads the booking with the service role,
// renders via the shared email shell, sends through Resend.
//
// Secrets: RESEND_API_KEY (required to send), RESEND_FROM (optional), RESEND_REPLY_TO
// (optional). No-ops gracefully if unset. verify_jwt OFF.
//
// NOTE: this is a payment receipt, not a formal Swiss VAT invoice (no VAT reg. no.,
// no per-supply VAT split between the partner's rental and AIRLUXO's fee). Upgrade
// to a compliant tax invoice + sequential numbering before B2B/expense use.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { emailShell, rows, chf, esc, BRAND } from "../_shared/email.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const fmtDate = (d: unknown) => {
  if (!d) return "";
  try { return new Date(String(d)).toLocaleDateString("en-CH", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return String(d); }
};

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
  if (!apiKey) return json({ skipped: "Resend not configured" });
  const to = (b.guest_email || "").trim();
  if (!to) return json({ skipped: "no guest email" });

  const num = (v: unknown) => Number(v ?? 0);
  const ref = String(b.id).slice(0, 8).toUpperCase();
  const period = `${fmtDate(b.start_date)} → ${fmtDate(b.end_date)}`;

  const lineItems: [string, string, { muted?: boolean; strong?: boolean; total?: boolean }?][] = [
    [b.car_label || "Rental", period, { muted: true }],
    ["Rental", chf(b.base_amount)],
  ];
  if (num(b.addons_amount) > 0) lineItems.push(["Add-ons (delivery / cross-border / after-hours)", chf(b.addons_amount)]);
  if (num(b.protection_fee) > 0) lineItems.push(["Damage protection (zero excess)", chf(b.protection_fee)]);
  if (num(b.service_fee) > 0) lineItems.push(["Service fee", chf(b.service_fee)]);
  if (num(b.discount_amount) > 0) lineItems.push([b.promo_code ? `Discount (${b.promo_code})` : "Discount", `– ${chf(b.discount_amount)}`, { muted: true }]);
  if (num(b.loyalty_credit) > 0) lineItems.push(["Member credit", `– ${chf(b.loyalty_credit)}`, { muted: true }]);
  lineItems.push(["Total paid", chf(b.total_amount), { total: true }]);

  const depositNote = num(b.protection_fee) > 0 && num(b.deposit_amount) > 0
    ? `<p style="font-size:13px;color:${BRAND.stone};line-height:1.6;margin:14px 0 0">Your damage protection waives the usual ${chf(b.deposit_amount)} security deposit — nothing further is held on your card.</p>`
    : "";

  const bodyHtml = `
    <p style="font-size:14px;color:${BRAND.stone};line-height:1.6;margin:0 0 16px">
      Your booking is confirmed and your card has been charged. Here's your receipt.
    </p>
    ${rows(lineItems)}
    ${depositNote}
    <p style="font-size:13px;color:${BRAND.ash};line-height:1.6;margin:18px 0 0">
      Reference <span style="font-family:ui-monospace,Menlo,monospace;color:${BRAND.stone}">${esc(ref)}</span>
    </p>`;

  const footnote = "This is a payment receipt for your records, not a formal VAT invoice. Charged in CHF. Questions? Just reply to this email.";

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: Deno.env.get("RESEND_FROM") || "AirLuxo News <noreply@send.airluxo.ch>",
        to,
        reply_to: Deno.env.get("RESEND_REPLY_TO") || undefined,
        subject: `Your AIRLUXO invoice — ${b.car_label || "booking"} (${ref})`,
        html: emailShell({
          preheader: `Receipt for ${b.car_label || "your booking"} — ${chf(b.total_amount)}`,
          heading: "Payment receipt",
          bodyHtml,
          footnote,
        }),
      }),
    });
    if (!r.ok) return json({ error: `Resend ${r.status}: ${(await r.text()).slice(0, 300)}` }, 502);
    return json({ sent: true });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
