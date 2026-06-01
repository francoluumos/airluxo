import { supabase } from './supabase.js';

// Create a reservation. partner_id + car_label are set server-side by a trigger,
// so we only send listing-facing data. Works for anonymous guests (no account).
export async function createBooking(payload) {
  // Generate the id client-side: anonymous guests have no SELECT policy on
  // bookings, so we can't read the row back (.select() would 401). Insert with
  // return=minimal and use the known id for the notification.
  const id = crypto.randomUUID();
  const { error } = await supabase.from('bookings').insert({ id, ...payload });
  if (error) throw error;
  // fire-and-forget: email the partner (no-op if RESEND_API_KEY isn't set)
  supabase.functions.invoke('booking-notify', { body: { booking_id: id } }).catch(() => {});
  // fire-and-forget: email the guest a confirmation (no-op if RESEND_API_KEY isn't set)
  supabase.functions.invoke('booking-confirm', { body: { booking_id: id } }).catch(() => {});
  // fire-and-forget: deliver to the partner's webhook (no-op if none configured)
  supabase.functions.invoke('booking-webhook', { body: { booking_id: id, event: 'booking.created' } }).catch(() => {});
  return { id, ...payload };
}

// All bookings for the signed-in partner's cars (RLS scopes to the owner).
export async function fetchMyBookings() {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Busy date ranges for a listing (active bookings + internal blocks), for the
// guest's date picker. Returns [{ start, end }] — no PII.
export async function fetchAvailability(listingId) {
  const { data, error } = await supabase.functions.invoke('availability', { body: { listing_id: listingId } });
  if (error) throw error;
  return data?.busy ?? [];
}

// Busy ranges for the whole fleet, keyed by listing_id — lets the marketplace
// filter cars by availability for a chosen date window. Returns {} on failure.
export async function fetchFleetAvailability() {
  const { data, error } = await supabase.functions.invoke('availability', { body: { all: true } });
  if (error) return {};
  return data?.byListing ?? {};
}

export async function updateBookingStatus(id, status) {
  const { data, error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
