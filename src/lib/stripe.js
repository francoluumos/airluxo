import { loadStripe } from '@stripe/stripe-js';
import { supabase } from './supabase.js';

let _stripePromise;
// Returns a Stripe.js promise, or null if no publishable key is configured
// (payments are then skipped and bookings work without them).
export function getStripe() {
  const pk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  if (!pk) return null;
  if (!_stripePromise) _stripePromise = loadStripe(pk);
  return _stripePromise;
}

// Create a manual-capture PaymentIntent for a booking.
// Returns { skip: true } if the car's partner isn't connected to Stripe yet,
// otherwise { clientSecret, paymentIntentId }.
export async function createPaymentIntent({ listingId, rateId, quantity, crossBorder, delivery, protection, startDate, endDate, pickupTime, returnTime, promoCode, redeemPoints }) {
  const { data, error } = await supabase.functions.invoke('stripe-create-payment', {
    body: { listing_id: listingId, rate_id: rateId, quantity, cross_border: crossBorder, delivery, protection, start_date: startDate, end_date: endDate, pickup_time: pickupTime, return_time: returnTime, promo_code: promoCode, redeem_points: redeemPoints },
  });
  if (error) throw error;
  return data;
}

// Partner confirm/decline: captures or cancels the authorized payment + sets status.
export async function partnerSettle(bookingId, status, refundCents) {
  const body = { booking_id: bookingId, status };
  if (refundCents != null) body.refund_cents = refundCents;
  const { data, error } = await supabase.functions.invoke('stripe-capture', { body });
  if (error) throw error;
  return data;
}

// Start Stripe Connect (Express) onboarding — returns a hosted onboarding URL.
export async function startPayoutOnboarding() {
  const { data, error } = await supabase.functions.invoke('stripe-connect', {
    body: { action: 'onboard', origin: window.location.origin },
  });
  if (error) throw error;
  if (!data?.url) throw new Error(data?.error || 'Could not start onboarding.');
  return data.url;
}

// Refresh the partner's payout status from Stripe (also persisted on the partner row).
export async function refreshPayoutStatus() {
  const { data, error } = await supabase.functions.invoke('stripe-connect', {
    body: { action: 'status', origin: window.location.origin },
  });
  if (error) throw error;
  return data;
}
