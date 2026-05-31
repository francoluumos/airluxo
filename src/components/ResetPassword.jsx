import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import { Icon } from './Icons.jsx';

// Landing page for the password-recovery link from the reset email.
// Supabase (detectSessionInUrl) parses the recovery token from the URL hash and
// establishes a temporary recovery session; we then let the user set a new
// password via supabase.auth.updateUser. Rendered top-level on ?reset=1.
export default function ResetPassword() {
  const [phase, setPhase] = useState('checking'); // checking | ready | done | error
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let done = false;
    const ready = () => { if (!done) { done = true; setPhase('ready'); } };
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) ready();
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) ready(); });
    // if no recovery session shows up, the link was bad/expired
    const t = setTimeout(() => setPhase((p) => (p === 'checking' ? 'error' : p)), 5000);
    return () => { sub.subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (pw.length < 8) { setErr('Use at least 8 characters.'); return; }
    if (pw !== pw2) { setErr('The two passwords don’t match.'); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) setErr(error.message || 'Could not update the password.');
    else setPhase('done');
  }

  return (
    <div className="grid min-h-screen place-items-center bg-paper px-5">
      <div className="grain" />
      <div className="w-full max-w-md">
        <div className="wordmark text-center text-2xl">AIR<span className="text-gold">LUXO</span></div>

        {phase === 'checking' && (
          <p className="mt-8 flex items-center justify-center gap-2 text-sm text-stone">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-mist border-t-ink" /> Verifying your reset link…
          </p>
        )}

        {phase === 'error' && (
          <div className="mt-8 rounded-2xl border border-mist bg-cloud p-6 text-center">
            <h1 className="font-display text-2xl">Link expired</h1>
            <p className="mt-2 text-sm text-stone">This password-reset link is invalid or has expired. Request a new one from the partner login.</p>
            <a href="/" className="ring-lux mt-5 inline-block rounded-full bg-ink px-6 py-3 text-sm font-bold text-cloud transition-colors hover:bg-void">Back to AIRLUXO</a>
          </div>
        )}

        {phase === 'done' && (
          <div className="mt-8 rounded-2xl border border-mist bg-cloud p-6 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-go/12 text-go"><Icon.Check width={28} height={28} /></div>
            <h1 className="font-display mt-5 text-2xl">Password updated</h1>
            <p className="mt-2 text-sm text-stone">You can now sign in with your new password.</p>
            <a href="/" className="ring-lux mt-5 inline-block rounded-full bg-ink px-6 py-3 text-sm font-bold text-cloud transition-colors hover:bg-void">Go to sign in</a>
          </div>
        )}

        {phase === 'ready' && (
          <form onSubmit={submit} className="mt-8">
            <h1 className="font-display text-center text-2xl">Set a new password</h1>
            <p className="mt-2 text-center text-sm text-stone">Choose a new password for your AIRLUXO partner account.</p>
            <div className="mt-6 space-y-3">
              <Field label="New password" value={pw} onChange={setPw} />
              <Field label="Confirm new password" value={pw2} onChange={setPw2} />
            </div>
            {err && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>}
            <button type="submit" disabled={busy} className="ring-lux mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink py-4 text-sm font-bold text-cloud transition-colors hover:bg-void disabled:opacity-60">
              {busy ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-cloud/30 border-t-cloud" /> : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      <span className="flex items-center gap-3 rounded-2xl border border-mist bg-cloud px-4 py-3.5 transition-colors focus-within:border-ink">
        <span className="text-stone"><Icon.Lock width={16} height={16} /></span>
        <input type="password" value={value} onChange={(e) => onChange(e.target.value)} placeholder="At least 8 characters" className="w-full bg-transparent text-sm outline-none placeholder:text-stone" />
      </span>
    </label>
  );
}
