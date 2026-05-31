import { supabase } from './supabase.js';

// Internal car holds (maintenance / owner use). partner_id is set by a trigger.
export async function fetchMyBlocks() {
  const { data, error } = await supabase
    .from('car_blocks')
    .select('*')
    .order('start_date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createBlock(payload) {
  const { error } = await supabase.from('car_blocks').insert(payload);
  if (error) throw error;
}

export async function deleteBlock(id) {
  const { error } = await supabase.from('car_blocks').delete().eq('id', id);
  if (error) throw error;
}
