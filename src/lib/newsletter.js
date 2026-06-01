import { supabase } from './supabase.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (email) => EMAIL_RE.test(String(email || '').trim());

// Subscribe an email to the AIRLUXO newsletter (Resend Audience, via the
// newsletter-subscribe edge function). No-ops server-side if Resend isn't
// configured, so this resolves cleanly in dev/staging without keys.
export async function subscribeNewsletter(email, source = 'site') {
  const value = String(email || '').trim().toLowerCase();
  if (!isValidEmail(value)) throw new Error('A valid email is required.');
  const { data, error } = await supabase.functions.invoke('newsletter-subscribe', {
    body: { email: value, source },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

// Set the newsletter subscription state for an email (true = subscribe,
// false = unsubscribe). Syncs the Resend Audience contact.
export async function setNewsletter(email, subscribed, source = 'profile') {
  const value = String(email || '').trim().toLowerCase();
  if (!isValidEmail(value)) throw new Error('A valid email is required.');
  const { data, error } = await supabase.functions.invoke('newsletter-subscribe', {
    body: { email: value, subscribed, source },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
