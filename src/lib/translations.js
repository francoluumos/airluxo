import { supabase } from './supabase.js';
import { en } from '../locales/en.js';

// Stable hash of the English source string → lets us detect "stale" translations
// (the source changed since it was translated). djb2.
export function hashStr(s) {
  let h = 5381;
  const str = String(s || '');
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return String(h);
}

// All non-English translation rows (admin coverage view; RLS allows public read).
export async function fetchTranslations() {
  const { data, error } = await supabase.from('translations').select('locale,key,value,source_hash,auto');
  if (error) throw error;
  return data ?? [];
}

// Save a single human edit (auto=false → reviewed).
export async function saveTranslation(locale, key, value) {
  const { error } = await supabase.from('translations').upsert(
    { locale, key, value, source_hash: hashStr(en[key]), auto: false, updated_at: new Date().toISOString() },
    { onConflict: 'locale,key' },
  );
  if (error) throw error;
}

// AI-translate a batch of { key, text } items → { key: translation }.
export async function aiTranslate(locale, items) {
  const { data, error } = await supabase.functions.invoke('translate', { body: { locale, items } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.translations || {};
}

// Write a batch of AI results (auto=true → flagged as machine, pending review).
export async function saveTranslationsBatch(locale, map) {
  const rows = Object.entries(map).map(([key, value]) => ({
    locale, key, value, source_hash: hashStr(en[key]), auto: true, updated_at: new Date().toISOString(),
  }));
  if (!rows.length) return;
  const { error } = await supabase.from('translations').upsert(rows, { onConflict: 'locale,key' });
  if (error) throw error;
}
