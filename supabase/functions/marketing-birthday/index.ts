// AIRLUXO — marketing-birthday
// Lifecycle flow: emails subscribed customers a branded birthday note (with a
// tasteful member gesture) on their birthday. Invoked daily by pg_cron. Idempotent
// via marketing_sends (flow,email,sent_on unique). Honours the consent SSOT.
//
// Auth: verify_jwt OFF, but requires the Authorization bearer to equal the service
// role key — so only the cron job (or an admin with the key) can trigger sends.
// Secrets: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (auto), RESEND_API_KEY, RESEND_FROM.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { emailShell, unsubHeaders, button, esc, BRAND } from "../_shared/email.ts";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });

const FLOW = "birthday";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (bearer !== srk) return json({ error: "Forbidden" }, 403);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, srk);
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return json({ skipped: "RESEND_API_KEY not set" });
  const from = Deno.env.get("RESEND_FROM") || "AirLuxo News <noreply@send.airluxo.ch>";
  const base = Deno.env.get("SUPABASE_URL")!;

  const { data: recipients, error } = await admin.rpc("marketing_birthday_recipients");
  if (error) return json({ error: error.message }, 500);

  let sent = 0, skipped = 0, failed = 0;
  for (const r of recipients ?? []) {
    const email = String(r.email || "").trim().toLowerCase();
    if (!email) { skipped++; continue; }
    const subject = "Happy birthday from AIRLUXO";

    // Claim the send (idempotent). A unique-violation means we already sent today.
    const { data: claim, error: claimErr } = await admin
      .from("marketing_sends")
      .insert({ flow: FLOW, email, customer_id: r.id, subject })
      .select("id")
      .maybeSingle();
    if (claimErr || !claim) { skipped++; continue; }

    const firstName = (r.full_name || "").trim().split(/\s+/)[0] || "there";
    const unsubscribeUrl = `${base}/functions/v1/newsletter-unsubscribe?token=${r.unsubscribe_token}`;
    const bodyHtml = `
      <p style="font-size:14px;color:${BRAND.stone};line-height:1.6;margin:0 0 16px">
        From everyone at AIRLUXO — we hope the year ahead is full of remarkable drives.
      </p>
      <p style="font-size:14px;color:${BRAND.stone};line-height:1.6;margin:0 0 20px">
        As our gift, enjoy a complimentary category upgrade on your next booking. Just reply to this email and we'll arrange it.
      </p>
      <p style="margin:0">${button("https://airluxo.ch", "Browse the collection")}</p>`;

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: email,
          subject,
          headers: unsubHeaders(unsubscribeUrl),
          html: emailShell({
            preheader: "A little something for your birthday.",
            heading: `Happy birthday, ${esc(firstName)}.`,
            bodyHtml,
            unsubscribeUrl,
          }),
        }),
      });
      if (!res.ok) throw new Error(`Resend ${res.status}`);
      sent++;
    } catch (_e) {
      // Roll back the claim so the next run can retry this recipient.
      await admin.from("marketing_sends").delete().eq("id", claim.id);
      failed++;
    }
  }

  return json({ ok: true, flow: FLOW, candidates: recipients?.length ?? 0, sent, skipped, failed });
});
