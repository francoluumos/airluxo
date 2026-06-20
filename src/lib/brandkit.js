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

// Upload a brand asset (logo / car picture) into the partner's folder in the brand-assets
// bucket and return its public URL. Folder convention: <partnerId>/<folder>/<file>.
// Admin-only writes are enforced by the bucket's storage policy.
export async function uploadBrandAsset(partnerId, file, folder = 'brand-logos') {
  const safeFolder = /^[a-z0-9/_-]+$/i.test(folder) ? folder : 'brand-logos';
  const ext = ((file.name || '').split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'png';
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `${partnerId}/${safeFolder}/${Date.now()}-${rand}.${ext}`;
  const { error } = await supabase.storage.from('brand-assets').upload(path, file, { contentType: file.type || 'image/png', upsert: false });
  if (error) throw error;
  return supabase.storage.from('brand-assets').getPublicUrl(path).data.publicUrl;
}

// Mirror a partner's car pictures from external (scraped) URLs into our brand-assets
// bucket, under <partnerId>/cars/<listingId>/. Idempotent. Returns a summary.
export async function mirrorPartnerPhotos(partnerId, listingId = null) {
  const { data, error } = await supabase.functions.invoke('partner-mirror-photos', { body: { partner_id: partnerId, listing_id: listingId } });
  if (error) throw new Error(data?.error || error.message || 'Mirror failed.');
  if (data?.error) throw new Error(data.error);
  return data;
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

// Full review payload for the admin review/apply screen (live + proposed kit, USP/copy,
// tech stack, the partner's listings, and the latest job's scraped images).
export async function partnerBrandReview(partnerId) {
  const { data, error } = await supabase.rpc('admin_partner_brand_review', { p_partner_id: partnerId });
  if (error) throw error;
  return data;
}

// Attach a photos gallery (hero + interior/detail) to one listing.
export async function applyListingPhotos(listingId, photos) {
  const { error } = await supabase.rpc('admin_apply_listing_photos', { p_listing_id: listingId, p_photos: photos });
  if (error) throw error;
}

// Build a prospect's fleet from the review: create a listing (admin) with core fields + photos.
export async function createPartnerListing(partnerId, fields, photos) {
  const { data, error } = await supabase.rpc('admin_create_listing', { p_partner_id: partnerId, p_fields: fields, p_photos: photos });
  if (error) throw error;
  return data;
}

// Normalize a raw Firecrawl/impeccable brand kit into the editable shape the review UI
// + brandKitToVars use: { colors:{primary,accent,bg,text}, fonts:{display,body,url}, logo_url }.
// Firecrawl returns colors with varied keys and fonts as a [{role,family}] array.
export function normalizeKit(kit) {
  const k = kit && typeof kit === 'object' ? kit : {};
  const c = k.colors || {};
  let display = '', body = '';
  if (Array.isArray(k.fonts)) {
    display = (k.fonts.find((f) => /head|display|title/i.test(f.role || ''))?.family) || k.fonts[0]?.family || '';
    body = (k.fonts.find((f) => /body|text|para/i.test(f.role || ''))?.family) || k.fonts[1]?.family || display;
  } else if (k.fonts && typeof k.fonts === 'object') {
    display = k.fonts.display || k.fonts.heading || '';
    body = k.fonts.body || k.fonts.text || '';
  }
  return {
    colors: {
      primary: c.primary || c.brand || '',
      accent: c.accent || c.link || c.secondary || '',
      bg: c.bg || c.background || '',
      text: c.text || c.textPrimary || c.foreground || '',
    },
    fonts: { display, body, url: (k.fonts && k.fonts.url) || '' },
    logo_url: k.logo_url || k.logo || '',
  };
}

// --- Palette derivation. The storefront uses a family of neutral tokens (paper=page
// bg, cloud=raised surface/cards/inputs/chips, mist=hairline borders, stone=muted text,
// ink=primary text). Theming only paper+ink leaves cloud/mist/stone at AIRLUXO's LIGHT
// defaults — so a partner with a dark bg gets white cards + white text + white lines.
// Instead we DERIVE the neutral ramp from the partner's bg↔text pair by mixing, which
// self-orients for dark OR light brands (cloud sits just off the bg toward text, borders
// a bit further, muted text is the text dimmed toward the bg).
function hexToRgb(hex) {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  if (h.length >= 6) h = h.slice(0, 6);
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const toHex = (rgb) => '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
// Mix colour a toward b by t (0..1). Both hex; returns hex.
function mix(a, b, t) {
  const [ar, ag, ab] = hexToRgb(a), [br, bg, bb] = hexToRgb(b);
  return toHex([ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t]);
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
  const bg = isColor(c.bg) ? c.bg.trim() : null;
  const text = isColor(c.text) ? c.text.trim() : null;
  if (bg) vars['--color-paper'] = bg;
  if (text) vars['--color-ink'] = text;
  // Derive the neutral ramp coherently when we have both anchors (covers dark + light).
  if (bg && text) {
    vars['--color-cloud'] = isColor(c.card) ? c.card.trim() : mix(bg, text, 0.07); // raised surfaces / inputs / chips
    // `void` is the hover shade of the primary `bg-ink` button (text on it = cloud). It must
    // track ink (the button bg), NOT the page bg — else on a dark theme bg-ink(light) hovers
    // to a dark void while text-cloud stays dark → the label vanishes. So: ink dimmed → bg.
    vars['--color-void'] = mix(text, bg, 0.14);
    vars['--color-mist'] = mix(bg, text, 0.16);  // hairline borders / dividers
    vars['--color-stone'] = mix(text, bg, 0.40); // muted / secondary text
  } else if (isColor(c.card)) {
    vars['--color-cloud'] = c.card.trim();
  }
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
