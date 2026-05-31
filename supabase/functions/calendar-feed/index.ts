// AIRLUXO — calendar-feed
// Outputs a partner's bookings as an ICS calendar feed for Google/Apple/Outlook.
// Auth is via a private ?token= (the partner's calendar_token); verify_jwt is OFF
// because calendar clients fetch this URL with no Authorization header.

import { createClient } from "jsr:@supabase/supabase-js@2";

const BS = String.fromCharCode(92); // backslash, kept out of source literals
const LF = String.fromCharCode(10);
const CRLF = String.fromCharCode(13) + String.fromCharCode(10);
const esc = (s: unknown) =>
  String(s ?? "")
    .split(BS).join(BS + BS)
    .split(";").join(BS + ";")
    .split(",").join(BS + ",")
    .split(String.fromCharCode(13)).join("")
    .split(String.fromCharCode(10)).join(BS + "n");

Deno.serve(async (req) => {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return new Response("Missing token", { status: 400 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: partner } = await supabase
    .from("partners")
    .select("id, company_name")
    .eq("calendar_token", token)
    .maybeSingle();
  if (!partner) return new Response("Invalid token", { status: 403 });

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*")
    .eq("partner_id", partner.id)
    .order("start_date", { ascending: true });

  const ymd = (s: string) => s.replaceAll("-", "");
  const addDay = (s: string) => {
    const d = new Date(`${s}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10).replaceAll("-", "");
  };
  const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const statusMap: Record<string, string> = {
    Confirmed: "CONFIRMED", "On trip": "CONFIRMED", Completed: "CONFIRMED",
    Pending: "TENTATIVE", Declined: "CANCELLED", Cancelled: "CANCELLED",
  };

  const lines: string[] = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//AIRLUXO//Bookings//EN",
    "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:AIRLUXO — ${esc(partner.company_name)}`,
  ];
  for (const b of bookings ?? []) {
    const dtEnd = b.end_date && b.end_date !== b.start_date ? ymd(b.end_date) : addDay(b.start_date);
    const desc = [
      `Guest: ${b.guest_name}`,
      `Email: ${b.guest_email}`,
      `Phone: ${b.guest_phone || "—"}`,
      `Rate: ${b.rate_label} x${b.quantity}`,
      `Total: CHF ${b.total_amount}`,
      b.delivery ? `Delivery: ${b.delivery_address || "yes"}` : null,
      b.cross_border ? "Cross-border: yes" : null,
    ].filter(Boolean).join(LF);

    lines.push(
      "BEGIN:VEVENT",
      `UID:${b.id}@airluxo`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(b.start_date)}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      `SUMMARY:${esc(`${b.car_label} — ${b.guest_name} (${b.status})`)}`,
      `DESCRIPTION:${esc(desc)}`,
      `STATUS:${statusMap[b.status] || "TENTATIVE"}`,
    );
    if (b.delivery_address) lines.push(`LOCATION:${esc(b.delivery_address)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");

  return new Response(lines.join(CRLF), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="airluxo.ics"',
      "Cache-Control": "no-cache",
    },
  });
});
