// AIRLUXO — newsletter-subscribe
// Single write path for newsletter consent. Supabase (newsletter_subscribers) is
// the source of truth; Resend is a downstream mirror (best-effort). Called from
// the footer signup, checkout opt-in, and the account toggle. verify_jwt OFF —
// anyone can subscribe/unsubscribe their own email (unsubscribe links need no auth);
// writes go through here (service role) so the browser never touches the table.
//
// Body: { email, subscribed?=true, source?, customer_id? }
// Secrets:
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY  (auto) — SSOT write.
//   RESEND_API_KEY / RESEND_AUDIENCE_ID       (optional) — mirror + welcome.
//   RESEND_FROM / RESEND_REPLY_TO             (optional).

import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

// Conservative check — good enough to reject obvious junk.
const validEmail = (e: string) => {
  const at = e.indexOf("@");
  const dot = e.lastIndexOf(".");
  return at > 0 && dot > at + 1 && dot < e.length - 1 && !e.includes(" ");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let email: string | undefined;
  let source: string | undefined;
  let customerId: string | undefined;
  let subscribed = true; // default: subscribe. Pass false to opt out.
  try {
    const body = await req.json();
    email = body.email; source = body.source; customerId = body.customer_id;
    if (body.subscribed === false) subscribed = false;
  } catch { return json({ error: "Invalid JSON" }, 400); }

  email = (email || "").trim().toLowerCase();
  if (!validEmail(email)) return json({ error: "A valid email is required." }, 400);

  // 1) Source of truth: upsert into newsletter_subscribers. Only set source/
  //    customer_id when provided so an unsubscribe never wipes them. The trigger
  //    stamps opt_in_at / opt_out_at.
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const row: Record<string, unknown> = { email, subscribed };
  if (subscribed && source) row.source = source;
  if (customerId) row.customer_id = customerId;
  const { error: dbErr } = await admin
    .from("newsletter_subscribers")
    .upsert(row, { onConflict: "email" });
  if (dbErr) return json({ error: `db: ${dbErr.message}` }, 500);

  // 2) Mirror to Resend (best-effort — never blocks the SSOT result).
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const audienceId = Deno.env.get("RESEND_AUDIENCE_ID");
  if (!apiKey || !audienceId) {
    return json({ ok: true, subscribed, mirrored: false });
  }

  try {
    if (!subscribed) {
      const off = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts/${encodeURIComponent(email)}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ unsubscribed: true }),
      });
      if (!off.ok && off.status !== 404) return json({ ok: true, subscribed, mirrored: false });
      return json({ ok: true, subscribed: false, mirrored: true });
    }

    // Add (or re-add) the contact. Resend upserts; a 409/duplicate is success.
    await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email, unsubscribed: false }),
    });

    // Best-effort welcome email.
    const from = Deno.env.get("RESEND_FROM") || "AirLuxo News <noreply@send.airluxo.ch>";
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: email,
        reply_to: Deno.env.get("RESEND_REPLY_TO") || undefined,
        subject: "Welcome to AIRLUXO",
        html: `
          <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:520px;margin:auto;color:#0b0b0c">
            <div style="font-weight:600;letter-spacing:0.06em;font-size:20px">AIR<span style="color:#b89150">LUXO</span></div>
            <h2 style="font-weight:700;font-size:21px;margin:18px 0 6px">You're on the list.</h2>
            <p style="color:#76746d;font-size:14px;line-height:1.6;margin:0">
              Thanks for subscribing. We'll share new arrivals, rare drives and the occasional
              members-only release — never spam. You can unsubscribe from any email at any time.
            </p>
            <p style="color:#a8a59b;font-size:12px;margin-top:22px;border-top:1px solid #e7e4db;padding-top:14px">
              AIRLUXO · Switzerland's marketplace for extraordinary cars · Geneva
            </p>
          </div>`,
      }),
    });
  } catch { /* mirror is non-critical — Supabase already has the truth */ }

  return json({ ok: true, subscribed, mirrored: true });
});
