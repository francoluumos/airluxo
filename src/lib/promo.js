import { supabase } from './supabase.js';

// Validate a promo/referral code against a subtotal (guest-facing preview).
// Backed by the SECURITY DEFINER validate_promo RPC. The authoritative discount
// is recomputed server-side in stripe-create-payment — this is just for display.
// Returns { valid, discount, label, reason }.
export async function validatePromo(code, subtotal) {
  const c = String(code || '').trim();
  if (!c) return { valid: false, reason: 'empty' };
  const { data, error } = await supabase.rpc('validate_promo', { p_code: c, p_subtotal: subtotal });
  if (error) return { valid: false, reason: 'error' };
  const row = Array.isArray(data) ? data[0] : data;
  return row || { valid: false, reason: 'not_found' };
}

// Friendly message for an invalid code.
export function promoReasonText(reason) {
  return {
    not_found: "That code isn't valid.",
    inactive: 'That code is no longer active.',
    expired: 'That code has expired.',
    not_started: "That code isn't active yet.",
    max_uses: 'That code has reached its limit.',
    error: 'Could not check that code — try again.',
  }[reason] || "That code isn't valid.";
}
