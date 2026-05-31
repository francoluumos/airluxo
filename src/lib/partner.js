import { supabase } from './supabase.js';

// Update the signed-in partner's own profile (RLS scopes to auth.uid()).
export async function updatePartner(patch) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { error } = await supabase.from('partners').update(patch).eq('id', user.id);
  if (error) throw error;
}

// ---- partner locations (multi-site) ----
export async function fetchLocations() {
  const { data, error } = await supabase
    .from('partner_locations')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createLocation(loc) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('partner_locations')
    .insert({ ...loc, partner_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateLocation(id, patch) {
  const { data, error } = await supabase
    .from('partner_locations')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteLocation(id) {
  const { error } = await supabase.from('partner_locations').delete().eq('id', id);
  if (error) throw error;
}
