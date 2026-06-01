import { useState } from 'react';
import { motion } from 'motion/react';
import { Icon } from './Icons.jsx';
import { useAuth } from '../lib/auth.jsx';

// Combined log-in / sign-up modal (Airbnb-style). One flow serves new and
// returning users: Google OAuth, or an email magic link. A clearly-marked slot
// is left for a future phone-OTP tab (see BACKLOG). Mounted once in App Shell.
export default function AuthModal({ intent, onClose }) {
  const { signInWithGoogle, sendEmailLink } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState('');      // '' | 'google' | 'email'
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const booking = intent?.kind === 'book';

  async function google() {
    setError(''); setBusy('google');
    const { error } = await signInWithGoogle(intent);
    if (error) { setError(error.message); setBusy(''); }
    // success → browser redirects to Google, then back to the app.
  }

  async function email_(e) {
    e.preventDefault();
    setError(''); setBusy('email');
    const { error } = await sendEmailLink(email.trim(), intent);
    setBusy('');
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-ink/45 px-4 py-10 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] overflow-hidden rounded-[26px] border border-mist bg-paper shadow-2xl"
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-mist px-5 py-4">
          <span className="text-sm font-bold text-ink">Log in or sign up</span>
          <button onClick={onClose} aria-label="Close" className="ring-lux grid h-9 w-9 place-items-center rounded-full border border-mist text-stone transition-colors hover:bg-mist/50">
            <Icon.X width={16} height={16} />
          </button>
        </div>

        <div className="px-6 py-7 sm:px-8">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-go/12 text-go">
                <Icon.Check width={30} height={30} />
              </div>
              <h2 className="font-display mt-5 text-2xl">Check your email.</h2>
              <p className="mt-3 text-sm text-stone">
                We sent a sign-in link to <span className="font-semibold text-ink">{email}</span>.
                Open it on this device to continue.
              </p>
              <button onClick={onClose} className="ring-lux mt-7 rounded-full bg-ink px-6 py-3 text-sm font-bold text-cloud transition-colors hover:bg-void">
                Done
              </button>
            </div>
          ) : (
            <>
              <h2 className="font-display text-[1.7rem] leading-tight">
                {booking ? 'Almost there.' : 'Welcome to AIRLUXO.'}
              </h2>
              <p className="mt-2 text-sm text-stone">
                {booking
                  ? 'Log in or sign up to confirm your booking.'
                  : 'Log in or create an account to book and save cars.'}
              </p>

              {/* Google */}
              <button
                onClick={google}
                disabled={!!busy}
                className="ring-lux mt-6 flex w-full items-center justify-center gap-3 rounded-2xl border border-mist bg-cloud py-3.5 text-sm font-semibold text-ink transition-colors hover:bg-mist/40 disabled:opacity-60"
              >
                {busy === 'google' ? <Spinner dark /> : <GoogleMark />}
                Continue with Google
              </button>

              {/* divider */}
              <div className="my-5 flex items-center gap-4 text-xs font-semibold uppercase tracking-wider text-stone">
                <span className="h-px flex-1 bg-mist" /> or <span className="h-px flex-1 bg-mist" />
              </div>

              {/* email magic link */}
              <form onSubmit={email_} className="space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-ink">Email</span>
                  <span className="flex items-center gap-3 rounded-2xl border border-mist bg-cloud px-4 py-3.5 transition-colors focus-within:border-ink">
                    <span className="text-stone"><MailGlyph /></span>
                    <input
                      type="email" required value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-stone"
                    />
                  </span>
                </label>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
                )}

                <button
                  type="submit" disabled={!!busy}
                  className="ring-lux flex w-full items-center justify-center gap-2 rounded-2xl bg-ink py-3.5 text-sm font-bold text-cloud transition-colors hover:bg-void disabled:opacity-60"
                >
                  {busy === 'email' ? <Spinner /> : <>Continue with email <Icon.Arrow width={15} height={15} /></>}
                </button>
              </form>

              <p className="mt-6 text-center text-xs leading-relaxed text-stone">
                By continuing you agree to our{' '}
                <a href="?privacy" className="font-semibold text-ink underline-offset-2 hover:underline">Privacy &amp; Cookie Policy</a>.
              </p>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95L3.97 7.28C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

function MailGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </svg>
  );
}

function Spinner({ dark }) {
  return <span className={`inline-block h-4 w-4 animate-spin rounded-full border-2 ${dark ? 'border-ink/25 border-t-ink' : 'border-cloud/30 border-t-cloud'}`} />;
}
