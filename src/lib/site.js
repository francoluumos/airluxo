import { supabase } from './supabase.js';

// Partner white-label site: home sections (hero/USP, about, benefits, contact) + nav,
// themed by the brand kit, served at a public slug. Content seeds from the ingested
// USP/copy (partner_pages) and is founder/partner editable; publish is founder-gated.

export function slugify(s) {
  return String(s || '')
    .toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 48);
}

// Per-partner layout flags (stored in site_config.layout). These let us tune one
// partner's white-label site — toggle generic/marketplace-flavoured sections and pick a
// hero variant — WITHOUT touching the shared Home (so no other partner or the
// marketplace is affected). Absent flags fall back to these defaults = today's look.
export const DEFAULT_LAYOUT = {
  show: {
    stats: true,    // hero stats row (marketplace counts — usually off for a single partner)
    marquee: true,  // generic luxury brand strip under the hero
    map: true,      // "fleet across Switzerland" map
  },
  hero: 'split',    // 'split' (image beside copy) | 'centered' (copy centred, no hero image)
  heroEyebrow: '',  // small gold kicker above the headline (e.g. "Drive your dream")
  heroMedia: { type: 'none', url: '' }, // centered-hero background: 'none' | 'image' | 'video'
  marquee: 'text',  // brand strip variant: 'text' (brand names) | 'logos' (logo images)
  brandLogos: [],   // logo image URLs shown when marquee === 'logos' (same strip height)
  faq: [],          // partner-site FAQ: [{ q, a }] — renders an accordion before the footer
};

// Sanitise the FAQ list (partner-set content): trim, cap lengths + count, drop empties.
function cleanFaq(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((it) => ({
      q: typeof it?.q === 'string' ? it.q.slice(0, 160) : '',
      a: typeof it?.a === 'string' ? it.a.slice(0, 800) : '',
    }))
    .filter((it) => it.q.trim() || it.a.trim())
    .slice(0, 12);
}

// Keep only a well-formed https/relative URL (brand-kit values are partner-set, so never
// trust them raw — drop javascript:/data: and anything non-string).
function cleanUrl(u) {
  const s = typeof u === 'string' ? u.trim() : '';
  return s && (/^https:\/\//i.test(s) || s.startsWith('/')) ? s : '';
}
function cleanLogoUrls(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(cleanUrl).filter(Boolean).slice(0, 24);
}
function cleanHeroMedia(m) {
  const o = m && typeof m === 'object' ? m : {};
  const url = cleanUrl(o.url);
  const type = o.type === 'image' || o.type === 'video' ? o.type : 'none';
  return url && type !== 'none' ? { type, url } : { type: 'none', url: '' };
}

// Merge a stored layout over the defaults (shallow + nested `show`), tolerating partial
// or missing input. Used by both the editor and the renderer so they agree on the shape.
export function mergeLayout(layout) {
  const l = layout && typeof layout === 'object' ? layout : {};
  return {
    show: { ...DEFAULT_LAYOUT.show, ...(l.show && typeof l.show === 'object' ? l.show : {}) },
    hero: l.hero === 'centered' ? 'centered' : 'split',
    heroEyebrow: typeof l.heroEyebrow === 'string' ? l.heroEyebrow.slice(0, 80) : '',
    heroMedia: cleanHeroMedia(l.heroMedia),
    marquee: l.marquee === 'logos' ? 'logos' : 'text',
    brandLogos: cleanLogoUrls(l.brandLogos),
    faq: cleanFaq(l.faq),
  };
}

// Normalize site_config to the editable shape, seeding empty sections from the ingested
// copy so a freshly-analysed partner already has a draft home page.
export function mapSiteConfig(siteConfig, partnerPages, companyName) {
  const sc = siteConfig && typeof siteConfig === 'object' ? siteConfig : {};
  const pp = partnerPages || {};
  const s = sc.sections || {};
  const contact = pp.contact || {};
  return {
    sections: {
      hero: s.hero || { headline: pp.usp || `Drive with ${companyName || 'us'}`, sub: '', cta: 'Browse the fleet' },
      about: s.about || { title: 'About us', body: pp.about || '' },
      benefits: s.benefits || (Array.isArray(pp.benefits) ? pp.benefits.map((b) => (typeof b === 'string' ? { title: b, body: '' } : b)) : []),
      contact: s.contact || { email: contact.email || '', phone: contact.phone || '', address: contact.address || '' },
    },
    layout: mergeLayout(sc.layout),
    nav: Array.isArray(sc.nav) && sc.nav.length ? sc.nav : ['fleet', 'about', 'contact'],
  };
}

// Admin: set a partner's full site (slug + content + published gate).
export async function setPartnerSite(partnerId, slug, site, published) {
  const { error } = await supabase.rpc('admin_set_partner_site', { p_id: partnerId, p_slug: slug, p_site: site, p_published: published });
  if (error) throw error;
}

// Partner self-edit of their site content.
export async function updateMySite(site) {
  const { data, error } = await supabase.rpc('partner_update_site', { p_site: site });
  if (error) throw error;
  return data;
}

// Public read of a published site by slug (anon-safe). Returns null if not found/published.
export async function fetchPublicSite(key) {
  const { data, error } = await supabase.rpc('public_partner_site', { p_key: key });
  if (error) return null;
  return data || null;
}

// Public read of a published site by a verified custom hostname (anon-safe).
export async function fetchPublicSiteByHost(host) {
  const { data, error } = await supabase.rpc('public_partner_site_by_host', { p_host: host });
  if (error) return null;
  return data || null;
}

// Admin: own-domain management (multi-tenant CNAME + dedicated-Vercel record).
export async function addPartnerDomain(partnerId, hostname, kind = 'cname') {
  const { data, error } = await supabase.rpc('admin_add_partner_domain', { p_partner_id: partnerId, p_hostname: hostname, p_kind: kind });
  if (error) throw error;
  return data;
}
export async function listPartnerDomains(partnerId) {
  const { data, error } = await supabase.rpc('admin_list_partner_domains', { p_partner_id: partnerId });
  if (error) throw error;
  return data ?? [];
}
export async function setDomainVerified(id, verified, vercelProjectId = null) {
  const { error } = await supabase.rpc('admin_set_domain_verified', { p_id: id, p_verified: verified, p_vercel_project_id: vercelProjectId });
  if (error) throw error;
}
export async function removePartnerDomain(id) {
  const { error } = await supabase.rpc('admin_remove_partner_domain', { p_id: id });
  if (error) throw error;
}

// Admin: save a partner's legal-entity data + generated Impressum/privacy/terms.
export async function setPartnerLegal(partnerId, legal, legalPages) {
  const { error } = await supabase.rpc('admin_set_partner_legal', { p_id: partnerId, p_legal: legal, p_legal_pages: legalPages });
  if (error) throw error;
}

// Partner self-edit of their own legal data + pages.
export async function updateMyLegal(legal, legalPages) {
  const { data, error } = await supabase.rpc('partner_update_legal', { p_legal: legal, p_legal_pages: legalPages });
  if (error) throw error;
  return data;
}
