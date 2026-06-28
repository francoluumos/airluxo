import { supabase } from './supabase.js';

// Create a reservation. Bookings are written ONLY by the create-booking edge
// function (service role): it recomputes every price/payment field server-side and
// verifies the PaymentIntent, so the client can't tamper with amounts or status.
// partner_id + car_label are set by a DB trigger. Works for anonymous guests.
// Notifications (partner email, guest confirmation, webhook) are fired server-side.
export async function createBooking(payload) {
  const { data, error } = await supabase.functions.invoke('create-booking', { body: payload });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return { id: data.id, ...payload };
}

// Capture a booking lead when the guest enters their email at checkout (basis for
// the abandoned-booking recovery flow). Fire-and-forget; no-op if it can't reach.
export function captureCheckoutLead(payload) {
  supabase.functions.invoke('checkout-lead', { body: payload }).catch(() => {});
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
