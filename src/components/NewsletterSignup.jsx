import { useState } from 'react';
import { subscribeNewsletter, isValidEmail } from '../lib/newsletter.js';

// Newsletter signup — single-field email capture that feeds the Resend Audience.
// Inverted=true styles it for dark surfaces; default styles for the light footer.
export default function NewsletterSignup({ source = 'footer', inverted = false }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle'); // idle | loading | done | error
  const [msg, setMsg] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    const value = email.trim();
    if (!isValidEmail(value)) {
      setState('error');
      setMsg('Please enter a valid email.');
      return;
    }
    setState('loading');
    setMsg('');
    try {
      await subscribeNewsletter(value, source);
      setState('done');
      setEmail('');
    } catch {
      setState('error');
      setMsg('Something went wrong. Please try again.');
    }
  }

  if (state === 'done') {
    return (
      <p className={`text-sm ${inverted ? 'text-ash' : 'text-stone'}`}>
        <span className="text-gold">✓</span> You're on the list — watch your inbox.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className={`flex items-center gap-2 rounded-[14px] border ${inverted ? 'border-graphite bg-coal' : 'border-mist bg-cloud'} p-1.5`}>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (state === 'error') setState('idle'); }}
          placeholder="Your email"
          aria-label="Email address"
          className={`min-w-0 flex-1 bg-transparent px-3 py-1.5 text-sm outline-none placeholder:text-stone ${inverted ? 'text-cloud' : 'text-ink'}`}
        />
        <button
          type="submit"
          disabled={state === 'loading'}
          className="ring-lux shrink-0 rounded-[10px] bg-ink px-4 py-2 text-sm font-medium text-cloud transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {state === 'loading' ? '…' : 'Subscribe'}
        </button>
      </div>
      {state === 'error' && <p className="mt-2 text-xs text-stone">{msg}</p>}
    </form>
  );
}
