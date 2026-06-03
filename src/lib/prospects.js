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
