import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase.js';

const AuthCtx = createContext(null);

// Where to send the user back after an OAuth / magic-link round-trip. We persist
// the pending intent (e.g. "finish booking this car") across the redirect so the
// flow can resume once the session lands. Read + cleared with takeAuthIntent().
const INTENT_KEY = 'airluxo:auth_intent';

function saveIntent(intent) {
  try { if (intent) sessionStorage.setItem(INTENT_KEY, JSON.stringify(intent)); } catch { /* ignore */ }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [partner, setPartner] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authModal, setAuthModal] = useState(null); // null | { intent }

  // bootstrap + subscribe to auth changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Load both profile rows for the signed-in user. A user is a partner if a
  // `partners` row exists and a customer if a `customers` row exists (can be
  // both). Public logins (Google / email magic-link) that have neither profile
  // are treated as customers, so we auto-create the row on first sign-in.
  const loadProfiles = useCallback(async (user) => {
    const uid = user?.id;
    if (!uid) { setPartner(null); setCustomer(null); return; }
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from('partners').select('*').eq('id', uid).maybeSingle(),
      supabase.from('customers').select('*').eq('id', uid).maybeSingle(),
    ]);
    setPartner(p ?? null);
    let cust = c;
    // No customer row yet → auto-provision one for non-partner (public) sessions.
    if (!cust && !p) cust = await upsertCustomer(user);
    // Book-then-account: when a guest books logged-out, the scanned licence is saved
    // on the booking, not the profile. On sign-in, adopt it so the profile reflects it.
    if (cust && !cust.licence_verified) cust = await adoptLicenceFromBooking(user, cust);
    setCustomer(cust ?? null);
  }, []);

  useEffect(() => {
    loadProfiles(session?.user ?? null);
  }, [session?.user?.id, loadProfiles]);

  const value = {
    session,
    user: session?.user ?? null,
    partner,
    customer,
    isPartner: !!partner,
    isCustomer: !!customer,
    loading,

    // ── Customer auth (Airbnb-style, passwordless) ──────────────────────────
    // Google OAuth. Redirects away and back to the app origin; detectSessionInUrl
    // (see supabase.js) picks up the session on return.
    signInWithGoogle: (intent) => {
      saveIntent(intent);
      return supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
    },
    // Email magic link / OTP. Sends a sign-in link to the address; same address
    // signs up new users and logs in returning ones.
    sendEmailLink: (email, intent) => {
      saveIntent(intent);
      return supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin, data: { role: 'customer' } },
      });
    },
    // Create / refresh the customer row for the current user (idempotent upsert).
    ensureCustomer: async (meta) => {
      const created = await upsertCustomer(session?.user ?? null, meta);
      if (created) setCustomer(created);
      return created;
    },
    refreshCustomer: () => loadProfiles(session?.user ?? null),

    // Read + clear a pending post-auth intent (e.g. resume a booking).
    takeAuthIntent: () => {
      try {
        const raw = sessionStorage.getItem(INTENT_KEY);
        if (!raw) return null;
        sessionStorage.removeItem(INTENT_KEY);
        return JSON.parse(raw);
      } catch { return null; }
    },

    // ── Global auth-modal control ───────────────────────────────────────────
    authModal,
    openAuth: (intent = null) => setAuthModal({ intent }),
    closeAuth: () => setAuthModal(null),

    // ── Partner auth (existing email + password portal) ─────────────────────
    signIn: (email, password) =>
      supabase.auth.signInWithPassword({ email, password }),
    signUp: (email, password, meta) =>
      supabase.auth.signUp({ email, password, options: { data: meta } }),
    resetPassword: (email) =>
      supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/?reset=1` }),
    updatePassword: (password) => supabase.auth.updateUser({ password }),
    signOut: () => supabase.auth.signOut(),
    refreshPartner: () => loadProfiles(session?.user ?? null),
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

// Back-fill a verified driver's licence from a prior booking into the customer
// profile. Needed for the book-then-account flow: a guest scans their licence and
// it's stored on the booking (bookings.licence), but finalize() only writes it to
// the profile when already logged in — so a guest-then-login leaves the profile
// blank. On sign-in we adopt the most recent verified-licence booking under the
// same email. Idempotent: skipped once licence_verified is true. RLS-safe: the
// customer can read their own bookings (email match) and update their own row.
async function adoptLicenceFromBooking(user, customer) {
  if (!user?.email || customer?.licence_verified) return customer;
  const { data: bk } = await supabase
    .from('bookings')
    .select('licence')
    .eq('guest_email', user.email)
    .eq('licence_verified', true)
    .not('licence', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!bk?.licence) return customer;
  const { data, error } = await supabase
    .from('customers')
    .update({ licence: bk.licence, licence_verified: true })
    .eq('id', user.id)
    .select()
    .maybeSingle();
  if (error) { console.error('[airluxo] licence back-fill failed', error.message); return customer; }
  return data ?? customer;
}

// Upsert a customers row from the auth user + optional overrides. Returns the row.
async function upsertCustomer(user, meta = {}) {
  if (!user?.id) return null;
  const m = user.user_metadata ?? {};
  const row = {
    id: user.id,
    email: user.email ?? meta.email ?? null,
    full_name: meta.full_name ?? m.full_name ?? m.name ?? null,
    phone: meta.phone ?? user.phone ?? null,
    avatar_url: meta.avatar_url ?? m.avatar_url ?? m.picture ?? null,
  };
  const { data, error } = await supabase
    .from('customers')
    .upsert(row, { onConflict: 'id' })
    .select()
    .maybeSingle();
  if (error) { console.error('[airluxo] ensureCustomer failed', error.message); return null; }
  return data ?? null;
}

export const useAuth = () => useContext(AuthCtx);
