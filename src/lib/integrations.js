import { supabase, SUPABASE_URL, SUPABASE_KEY } from './supabase.js';
import { updatePartner } from './partner.js';

// Cryptographically-random opaque token (client-side, public-safe).
function randomToken(prefix) {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}_${hex}`;
}

/* ---------------- Webhook (outbound) ---------------- */

export const newWebhookSecret = () => randomToken('whsec');

export async function saveWebhook({ url, enabled, secret }) {
  const patch = { webhook_url: url ? url.trim() : null, webhook_enabled: !!enabled };
  if (secret !== undefined) patch.webhook_secret = secret;
  await updatePartner(patch);
}

// Fire-and-forget delivery of a booking event (used after create / status change).
export function fireBookingWebhook(bookingId, event) {
  supabase.functions.invoke('booking-webhook', { body: { booking_id: bookingId, event } }).catch(() => {});
}

// Send a sample payload to the partner's configured endpoint; returns delivery result.
export async function sendTestWebhook() {
  const { data, error } = await supabase.functions.invoke('booking-webhook', { body: { test: true } });
  if (error) throw error;
  return data;
}

/* ---------------- Calendar subscription (ICS feed) ---------------- */

export const newCalendarToken = () => randomToken('cal');

// Ensure the partner has a calendar token; returns the subscribe-able feed URL.
export async function ensureCalendarFeed(partner) {
  let token = partner?.calendar_token;
  if (!token) {
    token = newCalendarToken();
    await updatePartner({ calendar_token: token });
  }
  return calendarFeedUrl(token);
}

export function calendarFeedUrl(token) {
  if (!token) return '';
  // apikey is the public anon key (already shipped in the bundle); calendar
  // clients can't send headers, so both token + apikey go in the query string.
  return `${SUPABASE_URL}/functions/v1/calendar-feed?token=${token}&apikey=${SUPABASE_KEY}`;
}
