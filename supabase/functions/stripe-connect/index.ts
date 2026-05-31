// AIRLUXO — stripe-connect
// Onboards a partner to Stripe Connect (Express) so they can receive payouts,
// and reports their account status. verify_jwt is ON (partner-authenticated).
//
// Secret required: STRIPE_SECRET_KEY
//
// Actions (POST JSON):
//   { action: "onboard", origin }  -> { url }  (Stripe onboarding link)
//   { action: "status" }           -> { connected, charges_enabled, details_submitted }

import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function stripe(path: string, params?: Record<string, string>, method = "POST") {
  const sk = Deno.env.get("STRIPE_SECRET_KEY");
  if (!sk) throw new Error("STRIPE_SECRET_KEY not configured");
  const qs = params ? new URLSearchParams(params).toString() : "";
  const r = await fetch(
    `https://api.stripe.com/v1/${path}${method === "GET" && qs ? `?${qs}` : ""}`,
    {
      method,
      headers: { Authorization: `Bearer ${sk}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: method === "POST" ? qs : undefined,
    },
  );
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || `Stripe ${r.status}`);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Not signed in" }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: partner } = await admin
      .from("partners").select("id, company_name, stripe_account_id").eq("id", user.id).maybeSingle();
    if (!partner) return json({ error: "Partner profile not found" }, 404);

    const { action, origin } = await req.json();

    if (action === "status") {
      if (!partner.stripe_account_id) return json({ connected: false, charges_enabled: false });
      const acct = await stripe(`accounts/${partner.stripe_account_id}`, undefined, "GET");
      await admin.from("partners").update({ stripe_charges_enabled: !!acct.charges_enabled }).eq("id", partner.id);
      return json({ connected: true, charges_enabled: !!acct.charges_enabled, details_submitted: !!acct.details_submitted });
    }

    // action: onboard
    let accountId = partner.stripe_account_id;
    if (!accountId) {
      const acct = await stripe("accounts", {
        type: "express",
        country: "CH",
        email: user.email || "",
        "capabilities[card_payments][requested]": "true",
        "capabilities[transfers][requested]": "true",
        "business_profile[name]": partner.company_name || "AIRLUXO partner",
      });
      accountId = acct.id;
      await admin.from("partners").update({ stripe_account_id: accountId }).eq("id", partner.id);
    }

    const base = origin || "https://airluxo.app";
    const link = await stripe("account_links", {
      account: accountId!,
      refresh_url: `${base}?stripe=refresh`,
      return_url: `${base}?stripe=return`,
      type: "account_onboarding",
    });
    return json({ url: link.url });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
