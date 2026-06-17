import { supabase } from './supabase.js';

// Partner white-label site: home sections (hero/USP, about, benefits, contact) + nav,
// themed by the brand kit, served at a public slug. Content seeds from the ingested
// USP/copy (partner_pages) and is founder/partner editable; publish is founder-gated.

export function slugify(s) {
  return String(s || '')
    .toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 48);
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
