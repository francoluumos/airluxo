#!/usr/bin/env node
// One-off: AI-translate all partner.* dashboard keys to DE/FR/IT via the existing
// `translate` Supabase edge function, then emit:
//   - scripts/i18n-fill-output.json  (the raw {locale:{key:value}} map, for review)
//   - scripts/i18n-fill.sql          (upserts into public.translations, run via the Supabase MCP)
//
// We translate here (anon key can call the edge function) but SAVE via the MCP
// (owner, bypasses the translations-table RLS) — the anon key can't write the table.
//
//   node scripts/i18n-fill.mjs --test   # 3 keys, DE only — smoke-check the edge function
//   node scripts/i18n-fill.mjs          # all partner.* keys × de/fr/it

import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { en } from '../src/locales/en.js';

const root = new URL('..', import.meta.url);
const envText = readFileSync(new URL('.env', root), 'utf8');
const env = Object.fromEntries(
  envText.split('\n').filter((l) => l.trim() && !l.trim().startsWith('#')).map((l) => {
    const i = l.indexOf('=');
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
  }),
);
const URL_ = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!URL_ || !KEY) { console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY'); process.exit(1); }

// The translate function is admin-gated (signed-in user in app_admins). Sign in
// with the founder/admin creds from .e2e.env so functions.invoke carries the JWT.
let e2e = {};
try {
  const t = readFileSync(new URL('.e2e.env', root), 'utf8');
  e2e = Object.fromEntries(t.split('\n').filter((l) => l.trim() && !l.trim().startsWith('#')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
} catch { /* none */ }
const ADMIN_EMAIL = e2e.E2E_PARTNER_EMAIL;
const ADMIN_PASSWORD = e2e.E2E_PARTNER_PASSWORD;

// djb2 — must match hashStr() in src/lib/translations.js so the founder coverage
// table sees these as fresh (not stale) translations.
const djb2 = (s) => { let h = 5381; const str = String(s || ''); for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0; return String(h); };

const test = process.argv.includes('--test');
const allKeys = Object.keys(en).filter((k) => k.startsWith('partner.'));
const keys = test ? allKeys.slice(0, 3) : allKeys;
const locales = test ? ['de'] : ['de', 'fr', 'it'];
const BATCH = 20;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Use the supabase-js client (handles the new publishable-key auth format the
// raw fetch + Bearer does not) — same path the founder dashboard uses.
const supabase = createClient(URL_, KEY);

if (ADMIN_EMAIL && ADMIN_PASSWORD) {
  const { error } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  if (error) { console.error(`Sign-in failed: ${error.message}`); process.exit(1); }
  console.error(`Signed in as ${ADMIN_EMAIL}`);
} else {
  console.error('No admin creds in .e2e.env — the translate function will reject (admin-gated).');
}

async function translateBatch(locale, items) {
  const { data, error } = await supabase.functions.invoke('translate', { body: { locale, items } });
  if (error) throw new Error(`invoke error: ${error.message || error}`);
  if (data?.error) throw new Error(`fn error: ${data.error}`);
  return data?.translations || {};
}

// Retry a batch (transient Gemini 502s / occasional JSON-parse misses), then
// give up on just that batch and continue so one bad batch can't kill the run.
async function translateBatchRetry(locale, items, tries = 4) {
  let last;
  for (let a = 1; a <= tries; a++) {
    try { return await translateBatch(locale, items); }
    catch (e) { last = e; console.error(`    retry ${a}/${tries} (${locale}): ${String(e.message).slice(0, 80)}`); await sleep(1500 * a); }
  }
  console.error(`    BATCH FAILED (${locale}), continuing: ${String(last?.message).slice(0, 80)}`);
  return {};
}

// Resume: reuse any already-translated keys from a prior run so a re-run only
// fills the gaps (failed batches) instead of re-translating everything.
const out = {};
try { Object.assign(out, JSON.parse(readFileSync(new URL('scripts/i18n-fill-output.json', root), 'utf8'))); } catch { /* fresh */ }

const failed = {};
for (const locale of locales) {
  out[locale] ||= {};
  failed[locale] = [];
  const todo = keys.filter((k) => !(k in out[locale]));
  if (!todo.length) { console.error(`  ${locale}: already complete (${Object.keys(out[locale]).length})`); continue; }
  for (let i = 0; i < todo.length; i += BATCH) {
    const slice = todo.slice(i, i + BATCH);
    const items = slice.map((k) => ({ key: k, text: en[k] }));
    const map = await translateBatchRetry(locale, items);
    Object.assign(out[locale], map);
    slice.forEach((k) => { if (!(k in map)) failed[locale].push(k); });
    console.error(`  ${locale}: ${Object.keys(out[locale]).length}/${keys.length}`);
  }
}

writeFileSync(new URL('scripts/i18n-fill-output.json', root), JSON.stringify(out, null, 2));

const esc = (s) => String(s).replace(/'/g, "''");
let sql = '';
for (const locale of Object.keys(out)) {
  const rows = Object.entries(out[locale]).map(
    ([k, v]) => `  ('${locale}', '${esc(k)}', '${esc(v)}', '${djb2(en[k] || '')}', true, now())`,
  );
  if (!rows.length) continue;
  sql += `insert into public.translations (locale, key, value, source_hash, auto, updated_at) values\n${rows.join(',\n')}\non conflict (locale, key) do update set value = excluded.value, source_hash = excluded.source_hash, auto = excluded.auto, updated_at = excluded.updated_at;\n\n`;
}
writeFileSync(new URL('scripts/i18n-fill.sql', root), sql);

// Save to public.translations via the signed-in admin client — same path as the
// founder dashboard's saveTranslationsBatch (auto=true → flagged machine, pending
// review). RLS permits admin upserts. Skip with --no-save.
if (!process.argv.includes('--no-save')) {
  let saved = 0;
  for (const locale of Object.keys(out)) {
    const rows = Object.entries(out[locale]).map(([key, value]) => ({
      locale, key, value, source_hash: djb2(en[key]), auto: true, updated_at: new Date().toISOString(),
    }));
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const { error } = await supabase.from('translations').upsert(chunk, { onConflict: 'locale,key' });
      if (error) { console.error(`  save ${locale} ERROR: ${error.message}`); break; }
      saved += chunk.length;
    }
    console.error(`  saved ${locale}: ${Object.keys(out[locale]).length}`);
  }
  console.error(`Saved ${saved} rows to public.translations.`);
}

const counts = Object.fromEntries(Object.entries(out).map(([l, m]) => [l, Object.keys(m).length]));
console.error(`\nDone. keys=${keys.length} locales=${locales.join(',')} → ${JSON.stringify(counts)}`);
const missTotal = Object.values(failed).reduce((a, b) => a + b.length, 0);
if (missTotal) console.error(`Missing (failed batches): ${JSON.stringify(Object.fromEntries(Object.entries(failed).map(([l, a]) => [l, a.length])))}`);
console.error('Wrote scripts/i18n-fill-output.json + scripts/i18n-fill.sql');
