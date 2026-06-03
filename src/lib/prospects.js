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
