import { useState, useEffect } from 'react';
import { Icon } from './Icons.jsx';
import { useAuth } from '../lib/auth.jsx';
import { STAGES, listProspects, createProspect, setProspectStage, impersonateProspect, claimProspect, siteOrigin } from '../lib/prospects.js';

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

      {/* main — min-w-0 lets this flex child shrink below the pipeline's content
          width, so the header stays fixed and only the columns row scrolls. */}
      <main className="min-w-0 flex-1 px-5 py-8 sm:px-10 sm:py-12">
        {/* mobile section switch */}
        <div className="mb-6 flex gap-1 overflow-x-auto sm:hidden">
          {NAV.map((n) => (
            <button key={n.key} onClick={() => setSection(n.key)}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold ${section === n.key ? 'bg-ink text-cloud' : 'border border-mist text-stone'}`}>
              {n.label}
            </button>
          ))}
        </div>

        {section === 'pipeline' ? <Pipeline /> : <SectionPlaceholder label={NAV.find((n) => n.key === section)?.label} />}
      </main>
    </div>
  );
}

// CRM pipeline board: prospects as cards in stage columns. Create = a private
// preview workspace (placeholder partner). Phase 2 adds build-the-fleet + hide
// from marketplace; Phase 4 the claim-to-live.
function Pipeline() {
  const [rows, setRows] = useState(null);
  const [creating, setCreating] = useState(false);
  const [claiming, setClaiming] = useState(null);
  const [dragOver, setDragOver] = useState(null); // stage key being dragged over
  const [err, setErr] = useState('');

  const load = () => listProspects().then(setRows).catch((e) => { setErr(e.message); setRows([]); });
  useEffect(() => { load(); }, []);

  async function move(id, stage) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, pipeline_stage: stage } : r)));
    try { await setProspectStage(id, stage); } catch (e) { setErr(e.message); load(); }
  }

  if (rows === null) {
    return <div className="grid place-items-center py-20"><span className="h-6 w-6 animate-spin rounded-full border-2 border-mist border-t-ink" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(1.6rem,3vw,2.2rem)] leading-tight">Prospect pipeline</h1>
          <p className="mt-1 text-sm text-stone">Create a preview for a potential partner, build their fleet, share it, then claim it live.</p>
        </div>
        <button onClick={() => setCreating(true)} className="ring-lux shrink-0 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-cloud transition-colors hover:bg-void">+ New prospect</button>
      </div>
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

      <div className="mt-8 flex gap-3 overflow-x-auto pb-4">
        {STAGES.map((s) => {
          const cards = rows.filter((r) => (r.pipeline_stage || 'lead') === s.key);
          const over = dragOver === s.key;
          return (
            <div
              key={s.key}
              className="w-64 shrink-0"
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragOver !== s.key) setDragOver(s.key); }}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData('text/plain');
                setDragOver(null);
                if (id) move(id, s.key);
              }}
            >
              <div className="flex items-center justify-between px-1">
                <span className="text-[0.7rem] font-bold uppercase tracking-wider text-stone">{s.label}</span>
                <span className="text-xs text-stone/60">{cards.length}</span>
              </div>
              <div className={`mt-2 min-h-[5rem] space-y-2 rounded-2xl p-1 transition-colors ${over ? 'bg-gold/10 outline-dashed outline-2 outline-gold/40' : ''}`}>
                {cards.map((p) => (
                  <ProspectCard key={p.id} p={p} onClaim={setClaiming} onDragEnd={() => setDragOver(null)} />
                ))}
                {cards.length === 0 && <div className="rounded-2xl border border-dashed border-mist py-8 text-center text-xs text-stone/40">—</div>}
              </div>
            </div>
          );
        })}
      </div>

      {creating && <CreateProspectModal onClose={() => setCreating(false)} onCreated={() => { setCreating(false); load(); }} />}
      {claiming && <ClaimModal p={claiming} onClose={() => setClaiming(null)} onClaimed={() => { setClaiming(null); load(); }} />}
    </div>
  );
}

function ProspectCard({ p, onClaim, onDragEnd }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [dragging, setDragging] = useState(false);
  const previewLink = `${siteOrigin()}/?embed=${p.id}&preview=${p.preview_token}`;
  const contact = [p.prospect_contact_name, p.prospect_contact_email].filter(Boolean).join(' · ');

  async function build() {
    setBusy(true); setErr('');
    try {
      const link = await impersonateProspect(p.id);
      if (link) window.open(link, '_blank', 'noopener');
      else setErr('No builder link returned.');
    } catch (e) {
      setErr(e.message || 'Could not open the builder.');
    } finally { setBusy(false); }
  }

  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.setData('text/plain', p.id); e.dataTransfer.effectAllowed = 'move'; setDragging(true); }}
      onDragEnd={() => { setDragging(false); onDragEnd?.(); }}
      className={`cursor-grab rounded-2xl border border-mist bg-cloud p-3 shadow-[0_10px_30px_-24px_rgba(11,11,12,0.5)] transition-opacity active:cursor-grabbing ${dragging ? 'opacity-40' : ''}`}
    >
      <div className="font-display text-sm leading-tight">{p.company_name}</div>
      {contact && <div className="mt-0.5 truncate text-xs text-stone">{contact}</div>}
      <div className="mt-1.5 text-xs text-stone">{p.car_count} {Number(p.car_count) === 1 ? 'car' : 'cars'}</div>
      <div className="mt-2 flex items-center gap-2">
        <button onClick={build} disabled={busy}
          className="ring-lux flex-1 rounded-lg bg-ink px-2 py-1.5 text-xs font-semibold text-cloud transition-colors hover:bg-void disabled:opacity-60">
          {busy ? '…' : 'Build fleet ↗'}
        </button>
        <a href={previewLink} target="_blank" rel="noreferrer"
          className="ring-lux rounded-lg border border-mist px-2.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-ink">
          Preview ↗
        </a>
      </div>
      {err && <p className="mt-1 text-[0.7rem] text-red-600">{err}</p>}
      <button onClick={() => onClaim(p)} className="ring-lux mt-2 w-full text-center text-[0.7rem] font-semibold text-go transition-colors hover:underline">
        Go live →
      </button>
    </div>
  );
}

function ClaimModal({ p, onClose, onClaimed }) {
  const [email, setEmail] = useState(p.prospect_contact_email || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(null); // { email, login_link }
  const [copied, setCopied] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!email.trim()) { setErr('Partner email is required.'); return; }
    setBusy(true); setErr('');
    try { setDone(await claimProspect(p.id, email.trim())); }
    catch (e2) { setErr(e2.message || 'Could not go live.'); setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-5 backdrop-blur-sm" onClick={done ? onClaimed : onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-[var(--radius-card)] border border-mist bg-paper p-6">
        {done ? (
          <>
            <h2 className="font-display text-xl">{p.company_name} is live 🎉</h2>
            <p className="mt-2 text-sm text-stone">Their cars are now in the marketplace. Send <span className="font-semibold text-ink">{done.email}</span> this link to set a password and take over the account:</p>
            <div className="mt-3 flex items-center gap-2">
              <input readOnly value={done.login_link || ''} className="ring-lux flex-1 truncate rounded-xl border border-mist bg-cloud px-3 py-2.5 text-xs" />
              <button onClick={() => { try { navigator.clipboard.writeText(done.login_link || ''); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ } }}
                className="ring-lux shrink-0 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-cloud transition-colors hover:bg-void">{copied ? 'Copied ✓' : 'Copy'}</button>
            </div>
            <p className="mt-3 text-xs text-stone">They’ll also connect Stripe in their dashboard to receive payouts.</p>
            <button onClick={onClaimed} className="ring-lux mt-5 w-full rounded-full bg-ink py-2.5 text-sm font-semibold text-cloud transition-colors hover:bg-void">Done</button>
          </>
        ) : (
          <form onSubmit={submit}>
            <h2 className="font-display text-xl">Go live — {p.company_name}</h2>
            <p className="mt-1 text-sm text-stone">Claims this preview into a real partner account. The {p.car_count} car{Number(p.car_count) === 1 ? '' : 's'} will appear in the marketplace.</p>
            <div className="mt-4"><AdminField label="Partner's real email *" value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="owner@theircompany.ch" /></div>
            {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={onClose} className="ring-lux rounded-full border border-mist px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink">Cancel</button>
              <button type="submit" disabled={busy} className="ring-lux flex-1 rounded-full bg-go py-2.5 text-sm font-semibold text-cloud transition-opacity hover:opacity-90 disabled:opacity-60">{busy ? 'Going live…' : 'Confirm & go live'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function CreateProspectModal({ onClose, onCreated }) {
  const [f, setF] = useState({ company_name: '', contact_name: '', contact_email: '', contact_phone: '', source: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (!f.company_name.trim()) { setErr('Company name is required.'); return; }
    setBusy(true); setErr('');
    try { await createProspect(f); onCreated(); }
    catch (e2) { setErr(e2.message || 'Could not create prospect.'); setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-5 backdrop-blur-sm" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="w-full max-w-md rounded-[var(--radius-card)] border border-mist bg-paper p-6">
        <h2 className="font-display text-xl">New prospect</h2>
        <p className="mt-1 text-sm text-stone">Creates a private preview workspace — no partner email needed.</p>
        <div className="mt-4 space-y-3">
          <AdminField label="Company name *" value={f.company_name} onChange={set('company_name')} placeholder="Geneva Prestige Cars" />
          <div className="grid grid-cols-2 gap-3">
            <AdminField label="Contact name" value={f.contact_name} onChange={set('contact_name')} />
            <AdminField label="Contact phone" value={f.contact_phone} onChange={set('contact_phone')} />
          </div>
          <AdminField label="Contact email" value={f.contact_email} onChange={set('contact_email')} type="email" />
          <AdminField label="Source" value={f.source} onChange={set('source')} placeholder="Referral, cold outreach, event…" />
        </div>
        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onClose} className="ring-lux rounded-full border border-mist px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink">Cancel</button>
          <button type="submit" disabled={busy} className="ring-lux flex-1 rounded-full bg-ink py-2.5 text-sm font-semibold text-cloud transition-colors hover:bg-void disabled:opacity-60">
            {busy ? 'Creating…' : 'Create prospect'}
          </button>
        </div>
      </form>
    </div>
  );
}

function AdminField({ label, value, onChange, placeholder, type }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-stone">{label}</span>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        className="ring-lux w-full rounded-xl border border-mist bg-cloud px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-ink placeholder:text-stone" />
    </label>
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
