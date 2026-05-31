// AIRLUXO — booking-webhook
// Delivers booking events to the partner's configured outbound webhook URL.
// Called fire-and-forget by the client on booking create / status change, and
// directly (with { test:true }) from the dashboard "Send test event" button.
//
// Payload is HMAC-SHA256 signed with the partner's webhook_secret so they can
// verify authenticity: header  X-AIRLUXO-Signature: sha256=<hex>.
// verify_jwt OFF (guests create bookings unauthenticated); test mode reads the
// partner's JWT from the Authorization header to identify them.

import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function hmac(secret: string, body: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function bookingPayload(b: Record<string, unknown>) {
  return {
    id: b.id, status: b.status, payment_status: b.payment_status,
    car: b.car_label, listing_id: b.listing_id,
    guest: { name: b.guest_name, email: b.guest_email, phone: b.guest_phone },
    start_date: b.start_date, end_date: b.end_date, pickup_time: b.pickup_time, return_time: b.return_time,
    rate: { label: b.rate_label, quantity: b.quantity },
    addons: { cross_border: b.cross_border, delivery: b.delivery, delivery_address: b.delivery_address },
    amounts: { base: b.base_amount, addons: b.addons_amount, service_fee: b.service_fee, total: b.total_amount, currency: "CHF" },
  };
}

const SAMPLE = {
  id: "00000000-0000-0000-0000-000000000000", status: "Pending", payment_status: "authorized",
  car: "Lamborghini Huracán", listing_id: "00000000-0000-0000-0000-000000000000",
  guest: { name: "Test Guest", email: "guest@example.com", phone: "+41 79 000 00 00" },
  start_date: "2026-06-02", end_date: "2026-06-05", pickup_time: "10:00", return_time: "10:00",
  rate: { label: "Per day", quantity: 3 },
  addons: { cross_border: false, delivery: false, delivery_address: null },
  amounts: { base: 2070, addons: 0, service_fee: 248, total: 2318, currency: "CHF" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { booking_id?: string; event?: string; test?: boolean };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let partnerId: string | null = null;
  let event = body.event || "booking.updated";
  let payload: unknown;

  if (body.test) {
    // identify the partner from their dashboard JWT
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
    if (!token) return json({ error: "unauthorized" }, 401);
    const { data: { user } } = await db.auth.getUser(token);
    if (!user) return json({ error: "unauthorized" }, 401);
    partnerId = user.id;
    event = "webhook.test";
    payload = SAMPLE;
  } else {
    if (!body.booking_id) return json({ error: "booking_id required" }, 400);
    const { data: b } = await db.from("bookings").select("*").eq("id", body.booking_id).maybeSingle();
    if (!b) return json({ error: "booking not found" }, 404);
    partnerId = b.partner_id;
    payload = bookingPayload(b);
  }

  const { data: p } = await db.from("partners").select("webhook_url, webhook_secret, webhook_enabled").eq("id", partnerId).maybeSingle();
  if (!p || !p.webhook_enabled || !p.webhook_url) return json({ skipped: "webhook not configured" });

  const envelope = JSON.stringify({ event, delivery_id: crypto.randomUUID(), sent_at: new Date().toISOString(), booking: payload });
  const headers: Record<string, string> = { "Content-Type": "application/json", "X-AIRLUXO-Event": event };
  if (p.webhook_secret) headers["X-AIRLUXO-Signature"] = `sha256=${await hmac(p.webhook_secret, envelope)}`;

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(p.webhook_url, { method: "POST", headers, body: envelope, signal: ctrl.signal });
    clearTimeout(t);
    return json({ delivered: r.ok, status: r.status });
  } catch (e) {
    return json({ delivered: false, error: String((e as Error)?.message || e) });
  }
});
