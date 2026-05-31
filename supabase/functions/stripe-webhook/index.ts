// AIRLUXO — stripe-webhook
// Keeps bookings.payment_status in sync with Stripe events (belt-and-suspenders
// alongside the capture/cancel calls). verify_jwt is OFF; authenticity is checked
// via the Stripe signature.
//
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
// Configure the endpoint in Stripe → Developers → Webhooks pointing at this URL,
// subscribing to payment_intent.* events.

import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "jsr:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  httpClient: Stripe.createFetchHttpClient(),
  apiVersion: "2024-06-20",
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();

const STATUS: Record<string, string> = {
  "payment_intent.amount_capturable_updated": "authorized",
  "payment_intent.succeeded": "captured",
  "payment_intent.canceled": "canceled",
  "payment_intent.payment_failed": "failed",
};

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!sig || !secret) return new Response("Webhook not configured", { status: 400 });

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, secret, undefined, cryptoProvider);
  } catch (e) {
    return new Response(`Bad signature: ${String((e as Error)?.message || e)}`, { status: 400 });
  }

  const next = STATUS[event.type];
  const pi = event.data?.object as { id?: string };
  if (next && pi?.id) {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await admin.from("bookings").update({ payment_status: next }).eq("stripe_payment_intent_id", pi.id);
  }
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
