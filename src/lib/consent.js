// Minimal cookie/analytics consent store (opt-in, GDPR/Swiss-FADP friendly).
// Value: 'accepted' | 'rejected' | null (not chosen yet).
const KEY = 'airluxo_consent_v1';

export function getConsent() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function setConsent(value) {
  try { localStorage.setItem(KEY, value); } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent('airluxo-consent', { detail: value })); } catch { /* ignore */ }
}

// Let a footer "Cookie settings" link re-open the banner.
export function openConsentSettings() {
  try { window.dispatchEvent(new CustomEvent('airluxo-open-consent')); } catch { /* ignore */ }
}
