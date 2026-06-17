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

// Kick off a Firecrawl ingest for a prospect (brand kit + USP/copy + tech stack + car
// images). Returns the created/updated job; the fleet crawl finalizes via cron.
export async function startIngest(partnerId, url) {
  const { data, error } = await supabase.functions.invoke('partner-ingest', { body: { partner_id: partnerId, url } });
  if (error) throw new Error(data?.error || error.message || 'Ingest failed.');
  if (data?.error) throw new Error(data.error);
  return data?.job ?? null;
}

// The most recent ingest job for a partner (for the Pipeline status line / polling).
export async function latestIngestJob(partnerId) {
  const { data, error } = await supabase.rpc('admin_latest_ingest_job', { p_partner_id: partnerId });
  if (error) throw error;
  return Array.isArray(data) ? (data[0] ?? null) : (data ?? null);
}

// --- Validation: brand-kit values are partner-controllable, so never interpolate
// them raw into CSS / a <link href>. Drop anything that doesn't match a strict shape.
const HEX = /^#[0-9a-fA-F]{3,8}$/;
const RGBHSL = /^(?:rgb|hsl)a?\(\s*[0-9.,%/\s]+\)$/i;
const isColor = (v) => typeof v === 'string' && (HEX.test(v.trim()) || RGBHSL.test(v.trim()));
const isFontName = (v) => typeof v === 'string' && /^[A-Za-z0-9 _-]{1,64}$/.test(v.trim());
// Only these hosts may serve a partner font stylesheet.
const FONT_HOSTS = new Set(['fonts.googleapis.com', 'fonts.gstatic.com', 'api.fontshare.com', 'use.typekit.net']);
function safeFontUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' || u.username || u.password) return null;
    return FONT_HOSTS.has(u.hostname) ? u.toString() : null;
  } catch { return null; }
}

// Map a brand kit to CSS-variable overrides for the storefront root. Only colours +
// fonts change; AIRLUXO's components/layout stay. Invalid values are dropped (never
// interpolated raw → no CSS injection). Returns undefined when empty.
export function brandKitToVars(kit) {
  if (!kit || typeof kit !== 'object') return undefined;
  const c = kit.colors || {};
  const f = kit.fonts || {};
  const vars = {};
  const primary = isColor(c.primary) ? c.primary.trim() : null;
  const accent = isColor(c.accent) ? c.accent.trim() : null;
  // The champagne accent (--color-gold) is the brand highlight; map it to the partner's primary.
  if (primary) { vars['--color-gold'] = primary; vars['--color-gold-soft'] = accent || primary; }
  else if (accent) { vars['--color-gold'] = accent; vars['--color-gold-soft'] = accent; }
  if (isColor(c.bg)) vars['--color-paper'] = c.bg.trim();
  if (isColor(c.text)) vars['--color-ink'] = c.text.trim();
  if (isColor(c.card)) vars['--color-cloud'] = c.card.trim();
  if (isFontName(f.display)) vars['--font-display'] = `"${f.display.trim()}", "Clash Display", ui-sans-serif, system-ui, sans-serif`;
  if (isFontName(f.body)) vars['--font-sans'] = `"${f.body.trim()}", "Satoshi", ui-sans-serif, system-ui, sans-serif`;
  return Object.keys(vars).length ? vars : undefined;
}

// Inject a partner font stylesheet once — only from an allowlisted https font host.
export function loadBrandFont(url) {
  if (typeof document === 'undefined') return;
  const safe = safeFontUrl(url);
  if (!safe) return;
  if (document.querySelector(`link[data-brandfont="${CSS.escape(safe)}"]`)) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = safe;
  l.setAttribute('data-brandfont', safe);
  document.head.appendChild(l);
}
