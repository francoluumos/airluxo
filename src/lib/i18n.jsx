import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './supabase.js';
import { en, SUPPORTED_LOCALES } from '../locales/en.js';

// Lightweight i18n. English is the bundled source; DE/FR/IT come from Supabase
// (public.translations) and are merged over English at runtime. t(key, vars) falls
// back to English, then to the key itself, so missing translations never break the UI.

const SUPPORTED = SUPPORTED_LOCALES.map((l) => l.code);
const STORE_KEY = 'airluxo:locale';

function detect() {
  try { const s = localStorage.getItem(STORE_KEY); if (s && SUPPORTED.includes(s)) return s; } catch { /* ignore */ }
  const langs = (typeof navigator !== 'undefined' && navigator.languages) || [];
  for (const l of langs) { const code = String(l).slice(0, 2).toLowerCase(); if (SUPPORTED.includes(code)) return code; }
  return 'en';
}

function interpolate(str, vars) {
  if (!vars) return str;
  return String(str).replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
}

const Ctx = createContext(null);

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(detect);
  const [overrides, setOverrides] = useState({});
  const [ready, setReady] = useState(detect() === 'en');

  // Load DB translations for the active non-English locale.
  useEffect(() => {
    let cancelled = false;
    if (locale === 'en') { setOverrides({}); setReady(true); return; }
    setReady(false);
    supabase.from('translations').select('key,value').eq('locale', locale).then(({ data }) => {
      if (cancelled) return;
      const map = {};
      (data || []).forEach((r) => { map[r.key] = r.value; });
      setOverrides(map);
      setReady(true);
    });
    return () => { cancelled = true; };
  }, [locale]);

  const setLocale = useCallback((code) => {
    if (!SUPPORTED.includes(code)) return;
    try { localStorage.setItem(STORE_KEY, code); } catch { /* ignore */ }
    setLocaleState(code);
    // Persist to the signed-in profile (best-effort; RLS scopes to self, wrong table no-ops).
    supabase.auth.getUser().then(({ data }) => {
      const uid = data?.user?.id;
      if (!uid) return;
      supabase.from('customers').update({ locale: code }).eq('id', uid).then(() => {});
      supabase.from('partners').update({ locale: code }).eq('id', uid).then(() => {});
    });
  }, []);

  const t = useCallback((key, vars) => interpolate(overrides[key] ?? en[key] ?? key, vars), [overrides]);

  const value = useMemo(() => ({ locale, setLocale, t, ready, supported: SUPPORTED_LOCALES }), [locale, setLocale, t, ready]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useI18n must be used within I18nProvider');
  return c;
}

export function useT() { return useI18n().t; }
