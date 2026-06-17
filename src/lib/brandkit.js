import { supabase } from './supabase.js';

// Partner brand kit (colours / fonts / logo) — themes the storefront + preview over
// AIRLUXO's UI/UX (only colours + fonts + logo change). Shape:
//   { colors: { primary, accent, bg, text, card }, fonts: { display, body, url }, logo_url }

// Public read for storefront/preview theming.
export async function fetchBrandKit(partnerId) {
  const { data, error } = await supabase.rpc('partner_brand_kit', { p_partner_id: partnerId });
  if (error) return {};
  return data || {};
}

// Admin (review/apply): set a partner's live brand kit.
export async function setPartnerBrandKit(partnerId, brandKit) {
  const { error } = await supabase.rpc('admin_set_partner_brand_kit', { p_id: partnerId, p_brand_kit: brandKit });
  if (error) throw error;
}

// Partner self-update (Design tab).
export async function updateMyBrandKit(brandKit) {
  const { data, error } = await supabase.rpc('partner_update_brand_kit', { p_brand_kit: brandKit });
  if (error) throw error;
  return data;
}

export async function listIngestJobs() {
  const { data, error } = await supabase.rpc('admin_list_ingest_jobs');
  if (error) throw error;
  return data ?? [];
}

// Map a brand kit to CSS-variable overrides for the storefront root. Only colours +
// fonts change; AIRLUXO's components/layout stay. Returns undefined when empty.
export function brandKitToVars(kit) {
  if (!kit || typeof kit !== 'object') return undefined;
  const c = kit.colors || {};
  const f = kit.fonts || {};
  const vars = {};
  // The champagne accent (--color-gold) is the brand highlight; map it to the partner's primary.
  if (c.primary) { vars['--color-gold'] = c.primary; vars['--color-gold-soft'] = c.accent || c.primary; }
  else if (c.accent) { vars['--color-gold'] = c.accent; vars['--color-gold-soft'] = c.accent; }
  if (c.bg) vars['--color-paper'] = c.bg;
  if (c.text) vars['--color-ink'] = c.text;
  if (c.card) vars['--color-cloud'] = c.card;
  if (f.display) vars['--font-display'] = `"${f.display}", "Clash Display", ui-sans-serif, system-ui, sans-serif`;
  if (f.body) vars['--font-sans'] = `"${f.body}", "Satoshi", ui-sans-serif, system-ui, sans-serif`;
  return Object.keys(vars).length ? vars : undefined;
}

// Inject a partner font stylesheet once (a Google Fonts / fontshare URL in the kit).
export function loadBrandFont(url) {
  if (!url || typeof document === 'undefined') return;
  if (document.querySelector(`link[data-brandfont="${CSS.escape(url)}"]`)) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = url;
  l.setAttribute('data-brandfont', url);
  document.head.appendChild(l);
}
