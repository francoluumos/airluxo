import { useState } from 'react';
import { Icon } from './Icons.jsx';
import { useAuth } from '../lib/auth.jsx';

// AIRLUXO founder / admin back office. Rendered on admin.airluxo.ch (or ?admin
// while the subdomain DNS isn't wired). The security boundary is server-side:
// every admin read/write goes through is_admin()-checked RLS / edge functions —
// this UI gate is just UX, not protection.

const NAV = [
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'partners', label: 'Partners' },
  { key: 'customers', label: 'Customers' },
  { key: 'finance', label: 'Finance' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'overview', label: 'Overview' },
];

export default function FounderApp() {
  const { loading, session, isAdmin } = useAuth();
  if (loading) return <Splash />;
  if (!session) return <AdminLogin />;
  if (!isAdmin) return <NotAuthorized />;
  return <FounderShell />;
}

function Splash() {
  return (
    <div className="grid min-h-screen place-items-center bg-void">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-graphite border-t-gold-soft" />
    </div>
  );
}

function AdminLogin() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    const { error } = await signIn(email.trim(), pw);
    setBusy(false);
    if (error) setErr(error.message || 'Sign-in failed.');
    // on success the session changes and FounderApp re-renders into the shell
  }

  return (
    <div className="spotlight grid min-h-screen place-items-center bg-void px-5 text-cloud">
      <form onSubmit={submit} className="w-full max-w-sm rounded-[var(--radius-card)] border border-graphite bg-coal p-7">
        <div className="wordmark text-xl">AIR<span className="text-gold">LUXO</span></div>
        <div className="eyebrow mt-1 text-ash">Founder access</div>
        <div className="mt-6 space-y-3">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email"
            className="ring-lux w-full rounded-xl border border-graphite bg-void px-4 py-3 text-sm text-cloud outline-none transition-colors focus:border-gold-soft placeholder:text-ash" />
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password"
            className="ring-lux w-full rounded-xl border border-graphite bg-void px-4 py-3 text-sm text-cloud outline-none transition-colors focus:border-gold-soft placeholder:text-ash" />
        </div>
        {err && <p className="mt-3 text-sm text-red-400">{err}</p>}
        <button type="submit" disabled={busy}
          className="ring-lux mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-cloud py-3 text-sm font-bold text-ink transition-colors hover:bg-paper disabled:opacity-60">
          {busy ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink" /> : 'Sign in'}
        </button>
        <p className="mt-4 text-center text-xs text-ash">Restricted to AIRLUXO administrators.</p>
      </form>
    </div>
  );
}

function NotAuthorized() {
  const { signOut, user } = useAuth();
  return (
    <div className="grid min-h-screen place-items-center bg-void px-5 text-cloud">
      <div className="max-w-sm rounded-[var(--radius-card)] border border-graphite bg-coal p-7 text-center">
        <div className="grid h-12 w-12 place-items-center justify-self-center rounded-full bg-cloud/10">
          <Icon.X width={20} height={20} className="text-ash" />
        </div>
        <h1 className="font-display mt-4 text-xl">Not an admin account</h1>
        <p className="mt-2 text-sm text-ash">
          {user?.email ? <><span className="text-cloud">{user.email}</span> isn't authorised for the founder area.</> : 'This account isn’t authorised for the founder area.'}
        </p>
        <button onClick={signOut} className="ring-lux mt-5 rounded-xl border border-graphite px-5 py-2.5 text-sm font-semibold text-cloud transition-colors hover:bg-cloud/5">
          Sign out
        </button>
      </div>
    </div>
  );
}

function FounderShell() {
  const { signOut, user } = useAuth();
  const [section, setSection] = useState('pipeline');

  return (
    <div className="flex min-h-screen bg-paper text-ink">
      {/* sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-graphite bg-void px-4 py-6 text-cloud sm:flex">
        <div className="wordmark px-2 text-lg">AIR<span className="text-gold">LUXO</span></div>
        <div className="eyebrow mt-1 px-2 text-ash">Founder</div>
        <nav className="mt-8 flex-1 space-y-1">
          {NAV.map((n) => (
            <button key={n.key} onClick={() => setSection(n.key)}
              className={`ring-lux block w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${section === n.key ? 'bg-cloud/10 text-cloud' : 'text-ash hover:bg-cloud/5 hover:text-cloud'}`}>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-graphite pt-4">
          <div className="truncate px-2 text-xs text-ash">{user?.email}</div>
          <button onClick={signOut} className="ring-lux mt-2 w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-ash transition-colors hover:bg-cloud/5 hover:text-cloud">
            Sign out
          </button>
        </div>
      </aside>

      {/* main */}
      <main className="flex-1 px-5 py-8 sm:px-10 sm:py-12">
        {/* mobile section switch */}
        <div className="mb-6 flex gap-1 overflow-x-auto sm:hidden">
          {NAV.map((n) => (
            <button key={n.key} onClick={() => setSection(n.key)}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold ${section === n.key ? 'bg-ink text-cloud' : 'border border-mist text-stone'}`}>
              {n.label}
            </button>
          ))}
        </div>

        {section === 'pipeline' ? <PipelinePlaceholder /> : <SectionPlaceholder label={NAV.find((n) => n.key === section)?.label} />}
      </main>
    </div>
  );
}

// Phase 1 will replace this with the CRM board (Lead → Preview built → Shared →
// Negotiating → Won → Lost) + "New prospect".
function PipelinePlaceholder() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[clamp(1.6rem,3vw,2.2rem)] leading-tight">Prospect pipeline</h1>
          <p className="mt-1 text-sm text-stone">Create a preview for a potential partner, build their fleet, share it, then claim it live.</p>
        </div>
        <button disabled className="rounded-full bg-ink/40 px-5 py-2.5 text-sm font-semibold text-cloud opacity-60" title="Coming in Phase 1">+ New prospect</button>
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {['Lead', 'Preview built', 'Shared', 'Negotiating', 'Won', 'Lost'].map((stage) => (
          <div key={stage} className="rounded-2xl border border-dashed border-mist bg-cloud/60 p-3">
            <div className="text-[0.7rem] font-bold uppercase tracking-wider text-stone">{stage}</div>
            <div className="mt-3 grid h-24 place-items-center text-xs text-stone/60">—</div>
          </div>
        ))}
      </div>
      <p className="mt-6 text-xs text-stone">Phase 0 shipped the secure admin shell. The pipeline board + create-prospect land in Phase 1.</p>
    </div>
  );
}

function SectionPlaceholder({ label }) {
  return (
    <div>
      <h1 className="font-display text-[clamp(1.6rem,3vw,2.2rem)] leading-tight">{label}</h1>
      <div className="mt-8 grid place-items-center rounded-2xl border border-dashed border-mist py-20 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-mist/50 text-stone"><Icon.Gauge width={22} height={22} /></div>
        <p className="mt-4 max-w-xs text-sm text-stone">{label} lands in a later phase of the founder dashboard.</p>
      </div>
    </div>
  );
}
