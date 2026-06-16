import { supabase } from './supabase.js';

// Prospect pipeline (founder dashboard). All calls are admin-gated server-side
// (is_admin() in the RPCs / edge function).

export const STAGES = [
  { key: 'lead', label: 'Lead' },
  { key: 'preview_built', label: 'Preview built' },
  { key: 'shared', label: 'Shared' },
  { key: 'negotiating', label: 'Negotiating' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
];

// Partnership status for the Partners section, derived from is_prospect + stage.
export const PARTNER_STATUS = {
  prospecting: 'Prospecting',
  won: 'Won',
  lost: 'Lost',
};
export function partnerStatus(p) {
  if (p.is_prospect) return p.pipeline_stage === 'lost' ? 'lost' : 'prospecting';
  return 'won'; // claimed or organic — a live partner
}

// All partners (prospects + live) for the founder Partners section.
export async function listPartners() {
  const { data, error } = await supabase.rpc('admin_list_partners');
  if (error) throw error;
  return data ?? [];
}

// Full info sheet for one partner (status, locations, bookings, financials,
// top cars, timeline).
export async function partnerDetail(id) {
  const { data, error } = await supabase.rpc('admin_partner_detail', { p_id: id });
  if (error) throw error;
  return data;
}

// Archive / unarchive (soft, reversible — also hides their cars from the marketplace).
export async function archivePartner(id, archived) {
  const { error } = await supabase.rpc('admin_archive_partner', { p_id: id, p_archived: archived });
  if (error) throw error;
}

// Founder Customers section.
export async function listCustomers() {
  const { data, error } = await supabase.rpc('admin_list_customers');
  if (error) throw error;
  return data ?? [];
}
export async function customerDetail(id) {
  const { data, error } = await supabase.rpc('admin_customer_detail', { p_id: id });
  if (error) throw error;
  return data;
}

// Permanent delete (refused server-side if the partner has bookings → archive instead).
export async function deletePartner(id) {
  const { data, error } = await supabase.functions.invoke('admin-delete-partner', { body: { partner_id: id } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

// Edit a partner. `email` maps to the contact email (prospect) or the login email
// (live partner) server-side.
export async function updatePartner(id, fields) {
  const { data, error } = await supabase.functions.invoke('admin-update-partner', {
    body: { partner_id: id, ...fields },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function listProspects() {
  const { data, error } = await supabase.rpc('admin_list_prospects');
  if (error) throw error;
  return data ?? [];
}

export async function createProspect(payload) {
  const { data, error } = await supabase.functions.invoke('admin-create-prospect', { body: payload });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.prospect;
}

export async function setProspectStage(id, stage) {
  const { error } = await supabase.rpc('admin_set_prospect_stage', { p_id: id, p_stage: stage });
  if (error) throw error;
}

// AI-enrich a lead from its website (Gemini reads the site + web-searches the gaps).
// Returns { company_name, street, street_number, zip, city, country, email, phone,
// vat_number, links:[{platform,url}] } — the founder reviews before saving.
export async function enrichProspect(url) {
  const { data, error } = await supabase.functions.invoke('enrich-prospect', { body: { url } });
  if (error) {
    // Surface the function's real error body (FunctionsHttpError hides it behind a generic message).
    let msg = error.message;
    try { const body = await error.context?.json(); if (body?.error) msg = body.error; } catch { /* keep generic */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data.data;
}

// Timestamped note log on a lead (kind='note' in partner_events).
export async function listProspectNotes(id) {
  const { data, error } = await supabase.rpc('admin_list_prospect_notes', { p_id: id });
  if (error) throw error;
  return data ?? [];
}
export async function addProspectNote(id, text) {
  const { data, error } = await supabase.rpc('admin_add_prospect_note', { p_id: id, p_text: text });
  if (error) throw error;
  return (data ?? [])[0];
}

// The main-site origin to build the fleet on (strip the admin. subdomain so the
// partner dashboard isn't served from the admin app).
export function siteOrigin() {
  const o = window.location.origin;
  return o.includes('://admin.') ? o.replace('://admin.', '://') : o;
}

// Returns a magic link that opens the prospect's partner dashboard (to build the
// fleet). Open it in a new tab.
export async function impersonateProspect(id) {
  const { data, error } = await supabase.functions.invoke('admin-impersonate-prospect', {
    body: { partner_id: id, origin: siteOrigin() },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.link;
}

// Claim a prospect into a live partner account (sets the real email, flips it live,
// returns a password-setup link to send the partner). { ok, email, login_link }.
export async function claimProspect(id, email) {
  const { data, error } = await supabase.functions.invoke('admin-claim-prospect', {
    body: { partner_id: id, email, origin: siteOrigin() },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
