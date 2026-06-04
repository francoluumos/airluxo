// AIRLUXO — newsletter-unsubscribe
// Token-based one-click unsubscribe for marketing email (RFC 8058). The token is
// the subscriber's unsubscribe_token; no auth needed (that's how unsubscribe links
// work). Writes the SSOT (subscribed=false → trigger stamps opt_out_at) and mirrors
// Resend. GET shows a branded confirmation page; POST is the mail-client one-click.
// verify_jwt OFF.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { emailShell, BRAND } from "../_shared/email.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const html = (body: string, status = 200) =>
  new Response(body, { status, headers: { ...cors, "Content-Type": "text/html; charset=utf-8" } });

async function mirrorResendOff(email: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const audienceId = Deno.env.get("RESEND_AUDIENCE_ID");
  if (!apiKey || !audienceId) return;
  try {
    await fetch(`https://api.resend.com/audiences/${audienceId}/contacts/${encodeURIComponent(email)}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ unsubscribed: true }),
    });
  } catch { /* best-effort */ }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const token = new URL(req.url).searchParams.get("token") || "";
  if (!token) return html(page("Invalid link", "This unsubscribe link is missing its token."), 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: sub } = await admin
    .from("newsletter_subscribers")
    .select("email, subscribed")
    .eq("unsubscribe_token", token)
    .maybeSingle();

  // Don't reveal whether a token is valid — always respond success-shaped.
  if (sub?.email && sub.subscribed) {
    await admin.from("newsletter_subscribers").update({ subscribed: false }).eq("unsubscribe_token", token);
    await mirrorResendOff(sub.email);
  } else {
    // Maybe it's an abandoned-booking recovery token — suppress that email's leads.
    const { data: lead } = await admin
      .from("checkout_leads")
      .select("email")
      .eq("unsubscribe_token", token)
      .maybeSingle();
    if (lead?.email) {
      await admin.from("checkout_leads").update({ unsubscribed: true }).eq("email", lead.email);
    }
  }

  // One-click POST from the mail client expects a bare 200.
  if (req.method === "POST") return new Response("ok", { status: 200, headers: cors });

  return html(page("You've been unsubscribed", "You won't receive AIRLUXO marketing emails anymore. Booking confirmations and trip updates are transactional and still sent. Changed your mind? You can re-subscribe anytime from your account."));
});

function page(heading: string, body: string): string {
  return emailShell({
    heading,
    bodyHtml: `<p style="font-size:14px;color:${BRAND.stone};line-height:1.6;margin:0">${body}</p>`,
  });
}
