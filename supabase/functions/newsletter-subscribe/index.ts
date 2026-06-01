// AIRLUXO — newsletter-subscribe
// Adds an email to a Resend Audience (the newsletter list) and sends a short
// welcome. Called from the public newsletter signup form. verify_jwt OFF.
//
// Secrets:
//   RESEND_API_KEY      (required) — Resend API key.
//   RESEND_AUDIENCE_ID  (required) — the Audience to add contacts to.
//   RESEND_FROM         (optional) — sender; defaults to "AirLuxo News <noreply@send.airluxo.ch>".
//   RESEND_REPLY_TO     (optional) — reply-to address.
// No-ops gracefully (200 { skipped }) if the required secrets are unset.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

// Conservative RFC-5322-ish check — good enough to reject obvious junk.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let email: string | undefined;
  let source: string | undefined;
  try { ({ email, source } = await req.json()); } catch { return json({ error: "Invalid JSON" }, 400); }

  email = (email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return json({ error: "A valid email is required." }, 400);

  const apiKey = Deno.env.get("RESEND_API_KEY");
  const audienceId = Deno.env.get("RESEND_AUDIENCE_ID");
  if (!apiKey || !audienceId) return json({ skipped: "Resend not configured" });

  // Add (or re-add) the contact to the audience. Resend treats this as upsert;
  // a 409/duplicate is success from the user's perspective.
  const add = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, unsubscribed: false }),
  });
  if (!add.ok && add.status !== 409) {
    const detail = (await add.text()).slice(0, 300);
    // Treat "already exists" style errors as success; surface anything else.
    if (!/exist|already/i.test(detail)) return json({ error: `Resend ${add.status}: ${detail}` }, 502);
  }

  // Best-effort welcome email — never blocks the subscription result.
  const from = Deno.env.get("RESEND_FROM") || "AirLuxo News <noreply@send.airluxo.ch>";
  try {
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
  } catch { /* welcome email is non-critical */ }

  return json({ subscribed: true, source: source || "site" });
});
