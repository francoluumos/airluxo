// AIRLUXO — availability
// Returns busy date ranges (active bookings + internal blocks) so the guest's
// date picker can grey them out, and the marketplace can filter the fleet by
// availability. Only date ranges are exposed — no guest PII or block reasons.
// verify_jwt OFF.
//
// Body:
//   { listing_id }  -> { busy: [{ start, end }, ...] }            (one car)
//   { all: true }   -> { byListing: { <id>: [{ start, end }] } }  (whole fleet)

import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const isActive = (status: string) => status !== "Declined" && status !== "Cancelled";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { listing_id, all } = await req.json();
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // ---- whole-fleet mode: busy ranges keyed by listing_id ----
    if (all) {
      const [{ data: bookings }, { data: blocks }] = await Promise.all([
        db.from("bookings").select("listing_id, start_date, end_date, status"),
        db.from("car_blocks").select("listing_id, start_date, end_date"),
      ]);
      const byListing: Record<string, { start: string; end: string }[]> = {};
      const push = (id: string, start: string, end: string) => {
        if (!id || !start) return;
        (byListing[id] ||= []).push({ start, end: end || start });
      };
      (bookings || []).filter((b) => isActive(b.status)).forEach((b) => push(b.listing_id, b.start_date, b.end_date));
      (blocks || []).forEach((b) => push(b.listing_id, b.start_date, b.end_date));
      return json({ byListing });
    }

    // ---- single-car mode (unchanged) ----
    if (!listing_id) return json({ error: "listing_id required" }, 400);
    const [{ data: bookings }, { data: blocks }] = await Promise.all([
      db.from("bookings").select("start_date, end_date, status").eq("listing_id", listing_id),
      db.from("car_blocks").select("start_date, end_date").eq("listing_id", listing_id),
    ]);
    const busy = [
      ...(bookings || []).filter((b) => isActive(b.status)).map((b) => ({ start: b.start_date, end: b.end_date || b.start_date })),
      ...(blocks || []).map((b) => ({ start: b.start_date, end: b.end_date })),
    ];
    return json({ busy });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
