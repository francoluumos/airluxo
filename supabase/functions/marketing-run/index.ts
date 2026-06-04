// AIRLUXO — marketing-run
// Generic lifecycle-flow runner. One function, many flows (flow definitions below).
// Each flow has a recipient RPC (service_role-only) + a template. Invoked per-flow
// by pg_cron with { flow }. Idempotent via marketing_sends; consent-gated by the RPC.
// Auth: verify_jwt OFF, but the Authorization bearer must equal the service-role key.
//
// To add a flow: write a marketing_recipients_<flow>() RPC + add an entry to FLOWS +
// schedule a cron job posting { flow }. (Birthday keeps its own function.)

import { createClient } from "jsr:@supabase/supabase-js@2";
import { emailShell, unsubHeaders, button, rows, chf, esc, BRAND } from "../_shared/email.ts";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });

const firstName = (full: unknown) => (String(full || "").trim().split(/\s+/)[0] || "there");
const p = (html: string) => `<p style="font-size:14px;color:${BRAND.stone};line-height:1.6;margin:0 0 16px">${html}</p>`;

type Recipient = Record<string, unknown>;
type Tpl = { preheader: string; heading: string; bodyHtml: string };

const FLOWS: Record<string, {
  rpc: string;
  subject: (r: Recipient, ctx: Recipient) => string;
  render: (r: Recipient, ctx: Recipient) => Tpl;
  prep?: (admin: ReturnType<typeof createClient>) => Promise<Recipient | null>;
  onSent?: (admin: ReturnType<typeof createClient>, r: Recipient) => Promise<void>;
}> = {
  post_trip: {
    rpc: "marketing_recipients_post_trip",
    subject: (r) => `How was the ${r.car_label || "drive"}?`,
    render: (r) => ({
      preheader: "We'd love to hear how your drive went.",
      heading: `How was the ${esc(r.car_label || "drive")}, ${esc(firstName(r.full_name))}?`,
      bodyHtml:
        p(`We hope your time with the <strong style="color:${BRAND.ink}">${esc(r.car_label || "car")}</strong> was unforgettable.`) +
        p("If you have a moment, just reply and tell us how it went — it helps us and the host. Your loyalty points from the trip are already waiting for the next one.") +
        `<p style="margin:4px 0 0">${button("https://airluxo.ch", "Book your next drive")}</p>`,
    }),
  },
  winback: {
    rpc: "marketing_recipients_winback",
    subject: () => "Your next drive is waiting",
    render: (r) => ({
      preheader: "The collection has grown since your last drive.",
      heading: `Your next drive is waiting, ${esc(firstName(r.full_name))}.`,
      bodyHtml:
        p("It's been a while since your last AIRLUXO drive. The collection has grown — new marques, new machines, the same effortless booking.") +
        `<p style="margin:4px 0 0">${button("https://airluxo.ch", "See what's new")}</p>`,
    }),
  },
  wishlist: {
    rpc: "marketing_recipients_wishlist",
    subject: () => "Still thinking about your saved cars?",
    render: (r) => {
      const count = Number(r.saved_count || 0);
      const others = count > 1 ? ` and ${count - 1} other${count - 1 > 1 ? "s" : ""}` : "";
      const saved = r.saved_car ? `<strong style="color:${BRAND.ink}">${esc(r.saved_car)}</strong>${others}` : "a few cars";
      return {
        preheader: "The rarest cars book quickly.",
        heading: `Still thinking about it, ${esc(firstName(r.full_name))}?`,
        bodyHtml:
          p(`You saved ${saved} to your list. The rarest cars book quickly — lock in your dates before someone else does.`) +
          `<p style="margin:4px 0 0">${button("https://airluxo.ch", "View your saved cars")}</p>`,
      };
    },
  },
  new_models: {
    rpc: "marketing_recipients_new_models",
    prep: async (admin) => {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data } = await admin
        .from("listings")
        .select("make, model, price_per_day")
        .eq("is_prospect", false)
        .eq("status", "Available")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(6);
      return data && data.length ? { cars: data } : null;
    },
    subject: () => "New in the collection",
    render: (r, ctx) => {
      const cars = (ctx.cars as Array<Record<string, unknown>>) || [];
      const intro = r.full_name ? `${esc(firstName(r.full_name))}, fresh arrivals just joined AIRLUXO:` : "Fresh arrivals just joined AIRLUXO:";
      return {
        preheader: "Fresh arrivals just joined the collection.",
        heading: "New in the collection",
        bodyHtml:
          p(intro) +
          rows(cars.map((c) => [`${c.make} ${c.model}`, `from ${chf(c.price_per_day)}/day`])) +
          `<p style="margin:16px 0 0">${button("https://airluxo.ch", "Browse the collection")}</p>`,
      };
    },
  },
  // Abandoned-booking recovery. One reminder per lead about the SAME car only.
  abandoned: {
    rpc: "marketing_recipients_abandoned",
    subject: (r) => `Still interested in the ${r.car_label || "car"}?`,
    render: (r) => {
      const car = esc(r.car_label || "car");
      const dates = r.start_date ? ` for ${esc(r.start_date)}${r.end_date && r.end_date !== r.start_date ? ` → ${esc(r.end_date)}` : ""}` : "";
      return {
        preheader: "Your selection is saved — pick up where you left off.",
        heading: `Still interested in the ${car}?`,
        bodyHtml:
          p(`You were a step away from booking the <strong style="color:${BRAND.ink}">${car}</strong>${dates}. Your selection is saved — pick up where you left off whenever you're ready.`) +
          `<p style="margin:4px 0 0">${button("https://airluxo.ch", "Resume your booking")}</p>`,
      };
    },
    onSent: async (admin, r) => {
      if (r.lead_id) await admin.from("checkout_leads").update({ recovered_at: new Date().toISOString() }).eq("id", r.lead_id);
    },
  },
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (bearer !== srk) return json({ error: "Forbidden" }, 403);

  let flow: string | undefined;
  try { ({ flow } = await req.json()); } catch { return json({ error: "Invalid JSON" }, 400); }
  const def = flow ? FLOWS[flow] : undefined;
  if (!def) return json({ error: `Unknown flow: ${flow}` }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, srk);
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return json({ skipped: "RESEND_API_KEY not set" });
  const from = Deno.env.get("RESEND_FROM") || "AirLuxo News <noreply@send.airluxo.ch>";
  const base = Deno.env.get("SUPABASE_URL")!;

  let ctx: Recipient = {};
  if (def.prep) {
    const prepped = await def.prep(admin);
    if (!prepped) return json({ ok: true, flow, skipped: "nothing to send", sent: 0 });
    ctx = prepped;
  }

  const { data: recipients, error } = await admin.rpc(def.rpc);
  if (error) return json({ error: error.message }, 500);

  let sent = 0, skipped = 0, failed = 0;
  for (const r of (recipients ?? []) as Recipient[]) {
    const email = String(r.email || "").trim().toLowerCase();
    if (!email) { skipped++; continue; }
    const subject = def.subject(r, ctx);

    const { data: claim, error: claimErr } = await admin
      .from("marketing_sends")
      .insert({ flow, email, customer_id: (r.id as string) ?? null, subject })
      .select("id")
      .maybeSingle();
    if (claimErr || !claim) { skipped++; continue; }

    const unsubscribeUrl = `${base}/functions/v1/newsletter-unsubscribe?token=${r.unsubscribe_token}`;
    const t = def.render(r, ctx);
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from, to: email, subject,
          headers: unsubHeaders(unsubscribeUrl),
          html: emailShell({ preheader: t.preheader, heading: t.heading, bodyHtml: t.bodyHtml, unsubscribeUrl }),
        }),
      });
      if (!res.ok) throw new Error(`Resend ${res.status}`);
      sent++;
      if (def.onSent) await def.onSent(admin, r);
    } catch (_e) {
      await admin.from("marketing_sends").delete().eq("id", claim.id);
      failed++;
    }
  }

  return json({ ok: true, flow, candidates: recipients?.length ?? 0, sent, skipped, failed });
});
