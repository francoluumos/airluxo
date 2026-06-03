import { supabase } from './supabase.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (email) => EMAIL_RE.test(String(email || '').trim());

// Subscribe an email to the AIRLUXO newsletter. Supabase (newsletter_subscribers)
// is the source of truth; the edge function mirrors to Resend. Pass customerId to
// link the subscriber to a customer account when known.
export async function subscribeNewsletter(email, source = 'site', customerId = null) {
  const value = String(email || '').trim().toLowerCase();
  if (!isValidEmail(value)) throw new Error('A valid email is required.');
  const { data, error } = await supabase.functions.invoke('newsletter-subscribe', {
    body: { email: value, source, customer_id: customerId || undefined },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

// Set the newsletter subscription state for an email (true = subscribe,
// false = unsubscribe). Writes the SSOT and mirrors the Resend contact.
export async function setNewsletter(email, subscribed, source = 'profile', customerId = null) {
  const value = String(email || '').trim().toLowerCase();
  if (!isValidEmail(value)) throw new Error('A valid email is required.');
  const { data, error } = await supabase.functions.invoke('newsletter-subscribe', {
    body: { email: value, subscribed, source, customer_id: customerId || undefined },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

// Read the signed-in customer's own subscription state (RLS: self-read by email).
export async function mySubscription(email) {
  const value = String(email || '').trim().toLowerCase();
  if (!isValidEmail(value)) return null;
  const { data } = await supabase
    .from('newsletter_subscribers')
    .select('subscribed, opt_in_at, source')
    .eq('email', value)
    .maybeSingle();
  return data ?? null;
}

// Founder cockpit: the full subscriber list (customers + leads). Admin-gated RPC.
export async function listSubscribers() {
  const { data, error } = await supabase.rpc('admin_list_subscribers');
  if (error) throw error;
  return data ?? [];
}
