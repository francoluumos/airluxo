import { supabase } from './supabase.js';

// Submit a "what car should be up next?" vote on a partner's white-label site. Anonymous —
// the write goes through the suggest-car edge function (service role); the browser never
// touches the table. Email is optional (lets the partner follow up when the car lands).
export async function submitCarSuggestion({ partnerId, brand, type, email }) {
  if (!partnerId) throw new Error('Missing partner.');
  if (!brand) throw new Error('Pick a brand.');
  const { data, error } = await supabase.functions.invoke('suggest-car', {
    body: { partner_id: partnerId, brand, type: type || null, email: email || null },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
