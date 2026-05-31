// Product analytics via PostHog — consent-gated and no-op until configured.
// Tracking only starts after the visitor accepts analytics cookies AND a
// VITE_POSTHOG_KEY is set; otherwise every call here is a silent no-op.
//
// Env: VITE_POSTHOG_KEY (required to send), VITE_POSTHOG_HOST (default EU cloud).
import { getConsent } from './consent.js';

const KEY = import.meta.env.VITE_POSTHOG_KEY;
const HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com';

let ph = null;
let initing = false;

// Start PostHog if (and only if) analytics consent is granted and a key exists.
export async function initAnalytics() {
  if (ph || initing) return;
  if (!KEY || getConsent() !== 'accepted') return;
  initing = true;
  try {
    const mod = await import('posthog-js');
    ph = mod.default;
    ph.init(KEY, {
      api_host: HOST,
      capture_pageview: true,
      autocapture: true,
      persistence: 'localStorage+cookie',
      person_profiles: 'identified_only',
    });
  } catch {
    ph = null;
  } finally {
    initing = false;
  }
}

// Send an event (no-op until initialised). Never pass PII (emails, licence data).
export function track(event, props) {
  try { if (ph) ph.capture(event, props || {}); } catch { /* ignore */ }
}

// Called when the visitor withdraws/declines consent.
export function disableAnalytics() {
  try {
    if (ph) { ph.opt_out_capturing?.(); ph.reset?.(); }
  } catch { /* ignore */ }
}
