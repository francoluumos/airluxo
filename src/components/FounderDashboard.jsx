import { useState, useEffect, Fragment } from 'react';
import { Icon } from './Icons.jsx';
import { useAuth } from '../lib/auth.jsx';
import { chf } from '../lib/format.js';
import { tierForTrips } from '../lib/loyalty.js';
import { STAGES, listProspects, createProspect, setProspectStage, impersonateProspect, claimProspect, siteOrigin, listPartners, updatePartner, partnerDetail, archivePartner, deletePartner, listCustomers, customerDetail, PARTNER_STATUS, partnerStatus } from '../lib/prospects.js';

const fmtDate = (s) => (s ? new Date(s).toLocaleDateString('de-CH', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const fmtDateTime = (s) => (s ? new Date(s).toLocaleString('de-CH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

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
  { key: 'docs', label: 'Docs' },
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

        {section === 'pipeline' ? <Pipeline />
          : section === 'partners' ? <Partners />
          : section === 'customers' ? <Customers />
          : section === 'docs' ? <DocsHub />
          : <SectionPlaceholder label={NAV.find((n) => n.key === section)?.label} />}
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

/* ── Partners ──────────────────────────────────────────────────────────── */
function Partners() {
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');

  const load = () => listPartners().then(setRows).catch((e) => { setErr(e.message); setRows([]); });
  useEffect(() => { load(); }, []);

  if (rows === null) return <div className="grid place-items-center py-20"><span className="h-6 w-6 animate-spin rounded-full border-2 border-mist border-t-ink" /></div>;

  const withStatus = rows.map((p) => ({ ...p, status: partnerStatus(p) }));
  const active = withStatus.filter((p) => !p.archived_at);
  const archived = withStatus.filter((p) => p.archived_at);
  const counts = { all: active.length, prospecting: 0, won: 0, lost: 0, archived: archived.length };
  active.forEach((p) => { counts[p.status] += 1; });
  const byStatus = filter === 'archived' ? archived : filter === 'all' ? active : active.filter((p) => p.status === filter);
  const ql = q.trim().toLowerCase();
  const filtered = ql
    ? byStatus.filter((p) => [p.company_name, p.contact_name, (p.is_prospect ? p.prospect_contact_email : p.login_email), p.phone]
      .some((v) => (v || '').toLowerCase().includes(ql)))
    : byStatus;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[clamp(1.6rem,3vw,2.2rem)] leading-tight">Partners</h1>
          <p className="mt-1 text-sm text-stone">Every partner and prospect, with their partnership status. Click a row for the full sheet.</p>
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search company, contact, email…"
          className="ring-lux w-full max-w-xs rounded-full border border-mist bg-cloud px-4 py-2 text-sm outline-none transition-colors focus:border-ink placeholder:text-stone sm:w-64" />
      </div>
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

      <div className="mt-5 flex flex-wrap gap-2">
        {[['all', 'All'], ['prospecting', 'Prospecting'], ['won', 'Won'], ['lost', 'Lost'], ['archived', 'Archived']].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`ring-lux rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${filter === k ? 'bg-ink text-cloud' : 'border border-mist text-stone hover:border-ink'}`}>
            {l} <span className="opacity-60">{counts[k] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-mist bg-cloud">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-mist text-left text-[0.65rem] uppercase tracking-wider text-stone">
              <th className="px-4 py-3 font-bold">Company</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 font-bold">Email</th>
              <th className="px-4 py-3 font-bold">Phone</th>
              <th className="px-4 py-3 font-bold">Contact</th>
              <th className="px-4 py-3 font-bold">Cars</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <Fragment key={p.id}>
                <tr onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                  className={`cursor-pointer border-b border-mist/60 transition-colors hover:bg-mist/30 ${expandedId === p.id ? 'bg-mist/30' : ''}`}>
                  <td className="px-4 py-3 font-semibold">
                    <span className="mr-1.5 inline-block text-stone">{expandedId === p.id ? '▾' : '▸'}</span>{p.company_name}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-stone">{(p.is_prospect ? p.prospect_contact_email : p.login_email) || '—'}</td>
                  <td className="px-4 py-3 text-stone tnum">{p.phone || '—'}</td>
                  <td className="px-4 py-3 text-stone">{p.contact_name || '—'}</td>
                  <td className="px-4 py-3 tnum text-stone">{p.car_count}</td>
                </tr>
                {expandedId === p.id && (
                  <tr className="border-b border-mist/60 bg-paper">
                    <td colSpan={6} className="px-4 pb-6 pt-1">
                      <PartnerDetail p={p} onEdit={() => setEditing(p)} onChanged={load} onDelete={() => setDeleting(p)} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-stone">No partners in this view.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && <PartnerEditModal p={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {deleting && <DeletePartnerModal p={deleting} onClose={() => setDeleting(null)} onArchived={() => { setDeleting(null); load(); }} onDeleted={() => { setDeleting(null); load(); }} />}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = { prospecting: 'bg-gold/15 text-gold', won: 'bg-go/12 text-go', lost: 'bg-mist text-stone' };
  return <span className={`rounded-full px-2.5 py-1 text-[0.7rem] font-bold ${map[status] || 'bg-mist text-stone'}`}>{PARTNER_STATUS[status] || status}</span>;
}

function PartnerEditModal({ p, onClose, onSaved }) {
  const [f, setF] = useState({
    company_name: p.company_name || '',
    contact_name: p.contact_name || '',
    phone: p.phone || '',
    email: (p.is_prospect ? p.prospect_contact_email : p.login_email) || '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    try { await updatePartner(p.id, f); onSaved(); }
    catch (e2) { setErr(e2.message || 'Could not save.'); setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-5 backdrop-blur-sm" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="w-full max-w-md rounded-[var(--radius-card)] border border-mist bg-paper p-6">
        <h2 className="font-display text-xl">Edit — {p.company_name}</h2>
        <div className="mt-4 space-y-3">
          <AdminField label="Company name" value={f.company_name} onChange={set('company_name')} />
          <div className="grid grid-cols-2 gap-3">
            <AdminField label="Contact name" value={f.contact_name} onChange={set('contact_name')} />
            <AdminField label="Phone" value={f.phone} onChange={set('phone')} />
          </div>
          <AdminField label={p.is_prospect ? 'Contact email' : 'Login email'} value={f.email} onChange={set('email')} type="email" />
        </div>
        {!p.is_prospect && <p className="mt-2 text-xs text-stone">This is the partner's login email — changing it updates how they sign in.</p>}
        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onClose} className="ring-lux rounded-full border border-mist px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink">Cancel</button>
          <button type="submit" disabled={busy} className="ring-lux flex-1 rounded-full bg-ink py-2.5 text-sm font-semibold text-cloud transition-colors hover:bg-void disabled:opacity-60">{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}

function PartnerDetail({ p, onEdit, onChanged, onDelete }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [busyArch, setBusyArch] = useState(false);
  useEffect(() => {
    let on = true;
    partnerDetail(p.id).then((x) => { if (on) setD(x); }).catch((e) => { if (on) { setErr(e.message); setD(false); } });
    return () => { on = false; };
  }, [p.id]);

  async function toggleArchive() {
    setBusyArch(true);
    try { await archivePartner(p.id, !p.archived_at); onChanged(); }
    finally { setBusyArch(false); }
  }

  if (d === null) return <div className="grid place-items-center py-6"><span className="h-5 w-5 animate-spin rounded-full border-2 border-mist border-t-ink" /></div>;
  if (!d) return <p className="py-3 text-sm text-red-600">{err || 'Could not load.'}</p>;

  const { partner, locations, cars, bookings, financials, top_cars, timeline } = d;
  const stripeOk = partner.stripe_connected && partner.stripe_charges_enabled;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm">
        <span className="text-stone">Plan <b className="capitalize text-ink">{partner.plan}</b></span>
        <span className="text-stone">Stripe {stripeOk ? <b className="text-go">connected</b> : <b className="text-gold">not connected</b>}</span>
        <span className="text-stone">Joined <b className="text-ink">{fmtDate(partner.created_at)}</b></span>
        {partner.went_live_at && <span className="text-stone">Live since <b className="text-ink">{fmtDate(partner.went_live_at)}</b></span>}
        {partner.source && <span className="text-stone">Source <b className="text-ink">{partner.source}</b></span>}
        <button onClick={onEdit} className="ring-lux ml-auto text-xs font-semibold text-ink hover:underline">Edit details</button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="GMV (gross)" value={chf(financials.gross)} />
        <Stat label="Our earnings · est." value={chf(financials.est_our_earnings)} />
        <Stat label="Partner net · est." value={chf(financials.est_partner_net)} />
        <Stat label="Bookings" value={bookings.total} />
        <Stat label="Discounts given" value={chf(financials.discounts)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <SubLabel>Bookings by status</SubLabel>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {[['Pending', bookings.pending], ['Confirmed', bookings.confirmed], ['On trip', bookings.on_trip], ['Completed', bookings.completed], ['Declined', bookings.declined], ['Cancelled', bookings.cancelled]].map(([l, n]) => (
              <span key={l} className="rounded-full border border-mist bg-cloud px-2.5 py-1"><b className="tnum">{n}</b> <span className="text-stone">{l}</span></span>
            ))}
          </div>
          <p className="mt-2 text-xs text-stone">Fleet: {cars.total} cars · {cars.available} available · {cars.draft} draft. Last booking {bookings.last_booking_at ? fmtDate(bookings.last_booking_at) : '—'}.</p>
        </div>
        <div>
          <SubLabel>Top cars</SubLabel>
          <div className="mt-2 space-y-1.5">
            {top_cars.length ? top_cars.map((c, i) => (
              <div key={i} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{c.car}</span>
                <span className="shrink-0 tnum text-stone">{c.bookings}× · {chf(c.revenue)}</span>
              </div>
            )) : <p className="text-xs text-stone">No bookings yet.</p>}
          </div>
        </div>
      </div>

      <div>
        <SubLabel>Pick-up locations</SubLabel>
        <div className="mt-2 space-y-1 text-sm text-stone">
          {locations.length
            ? locations.map((l, i) => <div key={i}>{[l.label, l.city, l.address].filter(Boolean).join(' · ')}</div>)
            : <span className="text-xs">None added yet.</span>}
        </div>
      </div>

      <div>
        <SubLabel>Timeline</SubLabel>
        <ol className="mt-3 space-y-3 border-l border-mist pl-4">
          {timeline.length ? [...timeline].reverse().map((e, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[1.36rem] top-1.5 h-2 w-2 rounded-full bg-gold" />
              <div className="text-sm font-semibold text-ink">{eventLabel(e)}</div>
              <div className="text-xs text-stone">{fmtDateTime(e.at)}</div>
            </li>
          )) : <li className="text-xs text-stone">No events yet.</li>}
        </ol>
      </div>

      <div className="flex items-center gap-4 border-t border-mist pt-4">
        <button onClick={toggleArchive} disabled={busyArch} className="ring-lux text-xs font-semibold text-stone transition-colors hover:text-ink disabled:opacity-60">
          {busyArch ? '…' : p.archived_at ? 'Unarchive' : 'Archive'}
        </button>
        <button onClick={onDelete} className="ring-lux text-xs font-semibold text-red-600 transition-colors hover:underline">Delete</button>
      </div>
    </div>
  );
}

function DeletePartnerModal({ p, onClose, onArchived, onDeleted }) {
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  async function archive() {
    setBusy('archive'); setErr('');
    try { await archivePartner(p.id, true); onArchived(); }
    catch (e) { setErr(e.message || 'Could not archive.'); setBusy(''); }
  }
  async function del() {
    setBusy('delete'); setErr('');
    try { await deletePartner(p.id); onDeleted(); }
    catch (e) { setErr(e.message || 'Could not delete.'); setBusy(''); }
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/55 p-5 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-[var(--radius-card)] border border-mist bg-paper p-6">
        <h2 className="font-display text-xl">Delete {p.company_name}?</h2>
        <p className="mt-2 text-sm text-stone">This permanently removes the partner, their cars, locations and preview. It can't be undone.</p>
        <div className="mt-4 rounded-2xl border border-mist bg-cloud p-3 text-sm">
          <span className="font-semibold text-ink">Archive instead?</span> <span className="text-stone">Archiving hides them and their cars from the marketplace but keeps everything recoverable.</span>
        </div>
        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
        <div className="mt-5 space-y-2">
          <button onClick={archive} disabled={!!busy} className="ring-lux w-full rounded-full bg-ink py-2.5 text-sm font-semibold text-cloud transition-colors hover:bg-void disabled:opacity-60">
            {busy === 'archive' ? 'Archiving…' : 'Archive instead'}
          </button>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} disabled={!!busy} className="ring-lux rounded-full border border-mist px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink">Cancel</button>
            <button onClick={del} disabled={!!busy} className="ring-lux flex-1 rounded-full border border-red-300 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60">
              {busy === 'delete' ? 'Deleting…' : 'Delete permanently'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-mist bg-cloud p-3">
      <div className="text-[0.65rem] uppercase tracking-wider text-stone">{label}</div>
      <div className="font-display mt-1 text-lg tnum">{value}</div>
    </div>
  );
}

function SubLabel({ children }) {
  return <div className="text-[0.7rem] font-bold uppercase tracking-wider text-stone">{children}</div>;
}

function eventLabel(e) {
  if (e.kind === 'created') return 'Prospect created';
  if (e.kind === 'went_live') return 'Went live 🎉';
  if (e.kind === 'stage') { const s = STAGES.find((x) => x.key === e.detail); return `Moved to ${s?.label || e.detail}`; }
  return e.kind;
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

/* ── Customers ─────────────────────────────────────────────────────────── */
function Customers() {
  const [rows, setRows] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => { listCustomers().then(setRows).catch((e) => { setErr(e.message); setRows([]); }); }, []);

  if (rows === null) return <div className="grid place-items-center py-20"><span className="h-6 w-6 animate-spin rounded-full border-2 border-mist border-t-ink" /></div>;

  const ql = q.trim().toLowerCase();
  const filtered = ql ? rows.filter((c) => [c.full_name, c.email, c.phone].some((v) => (v || '').toLowerCase().includes(ql))) : rows;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[clamp(1.6rem,3vw,2.2rem)] leading-tight">Customers</h1>
          <p className="mt-1 text-sm text-stone">Everyone who’s signed up — bookings, revenue, loyalty and marketing. Click a row for the full sheet.</p>
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone…"
          className="ring-lux w-full max-w-xs rounded-full border border-mist bg-cloud px-4 py-2 text-sm outline-none transition-colors focus:border-ink placeholder:text-stone sm:w-64" />
      </div>
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

      <div className="mt-5 overflow-x-auto rounded-2xl border border-mist bg-cloud">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-mist text-left text-[0.65rem] uppercase tracking-wider text-stone">
              <th className="px-4 py-3 font-bold">Name</th>
              <th className="px-4 py-3 font-bold">Email</th>
              <th className="px-4 py-3 font-bold">Bookings</th>
              <th className="px-4 py-3 font-bold">Revenue</th>
              <th className="px-4 py-3 font-bold">Tier</th>
              <th className="px-4 py-3 font-bold">News</th>
              <th className="px-4 py-3 font-bold">Joined</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <Fragment key={c.id}>
                <tr onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                  className={`cursor-pointer border-b border-mist/60 transition-colors hover:bg-mist/30 ${expandedId === c.id ? 'bg-mist/30' : ''}`}>
                  <td className="px-4 py-3 font-semibold">
                    <span className="mr-1.5 inline-block text-stone">{expandedId === c.id ? '▾' : '▸'}</span>{c.full_name || '—'}
                  </td>
                  <td className="px-4 py-3 text-stone">{c.email || '—'}</td>
                  <td className="px-4 py-3 tnum text-stone">{c.bookings_count}</td>
                  <td className="px-4 py-3 tnum text-stone">{chf(c.gross)}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-mist px-2.5 py-1 text-[0.7rem] font-bold text-stone">{tierForTrips(c.completed_count).label}</span></td>
                  <td className="px-4 py-3">{c.marketing_opt_in ? <span className="text-go">✓</span> : <span className="text-stone/40">—</span>}</td>
                  <td className="px-4 py-3 text-stone">{fmtDate(c.created_at)}</td>
                </tr>
                {expandedId === c.id && (
                  <tr className="border-b border-mist/60 bg-paper">
                    <td colSpan={7} className="px-4 pb-6 pt-1"><CustomerDetail id={c.id} /></td>
                  </tr>
                )}
              </Fragment>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-stone">No customers match.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CustomerDetail({ id }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let on = true;
    customerDetail(id).then((x) => { if (on) setD(x); }).catch((e) => { if (on) { setErr(e.message); setD(false); } });
    return () => { on = false; };
  }, [id]);

  if (d === null) return <div className="grid place-items-center py-6"><span className="h-5 w-5 animate-spin rounded-full border-2 border-mist border-t-ink" /></div>;
  if (!d) return <p className="py-3 text-sm text-red-600">{err || 'Could not load.'}</p>;

  const { customer: c, completed_count, referrals_made, bookings, financials, top_cars } = d;
  const tier = tierForTrips(completed_count);
  const addr = c.address?.label || [c.address?.street, c.address?.zip, c.address?.city].filter(Boolean).join(', ');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm">
        <span className="text-stone">Tier <b className="text-ink">{tier.label}</b></span>
        <span className="text-stone">Joined <b className="text-ink">{fmtDate(c.created_at)}</b></span>
        <span className="text-stone">Newsletter {c.marketing_opt_in ? <b className="text-go">opted in</b> : <b className="text-stone">off</b>}</span>
        <span className="text-stone">Licence {c.licence_verified ? <b className="text-go">verified</b> : <b className="text-stone">none</b>}</span>
        {c.birth_date && <span className="text-stone">Birthday <b className="text-ink">{c.birth_date}</b></span>}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Bookings" value={bookings.total} />
        <Stat label="Revenue (gross)" value={chf(financials.gross)} />
        <Stat label="Points" value={(c.loyalty_points ?? 0).toLocaleString('de-CH')} />
        <Stat label="Referrals made" value={referrals_made} />
        <Stat label="Completed trips" value={completed_count} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <SubLabel>Bookings by status</SubLabel>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {[['Pending', bookings.pending], ['Confirmed', bookings.confirmed], ['On trip', bookings.on_trip], ['Completed', bookings.completed], ['Declined', bookings.declined], ['Cancelled', bookings.cancelled]].map(([l, n]) => (
              <span key={l} className="rounded-full border border-mist bg-cloud px-2.5 py-1"><b className="tnum">{n}</b> <span className="text-stone">{l}</span></span>
            ))}
          </div>
          <p className="mt-2 text-xs text-stone">Last booking {bookings.last_booking_at ? fmtDate(bookings.last_booking_at) : '—'}.</p>
        </div>
        <div>
          <SubLabel>Top cars rented</SubLabel>
          <div className="mt-2 space-y-1.5">
            {top_cars.length ? top_cars.map((car, i) => (
              <div key={i} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{car.car}</span>
                <span className="shrink-0 tnum text-stone">{car.bookings}× · {chf(car.revenue)}</span>
              </div>
            )) : <p className="text-xs text-stone">No bookings yet.</p>}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <SubLabel>Contact</SubLabel>
          <div className="mt-2 space-y-1 text-sm text-stone">
            <div>{c.email}</div>
            {c.phone && <div>{c.phone}</div>}
            {addr && <div>{addr}</div>}
          </div>
        </div>
        <div>
          <SubLabel>Referral</SubLabel>
          <div className="mt-2 space-y-1 text-sm text-stone">
            {c.referral_code && <div>Code <b className="text-ink tracking-wider">{c.referral_code}</b></div>}
            <div>Referred by {c.referred_by ? <b className="text-ink">{c.referred_by.name || c.referred_by.email}</b> : '—'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DocsHub() {
  const docs = [
    { key: 'admin', title: 'Admin dashboard', desc: 'Founder dashboard guide, live system status & changelog.' },
    { key: 'partner', title: 'Partner dashboard', desc: 'The rental-partner guide & changelog.' },
    { key: 'customer', title: 'Customer', desc: 'The guest booking experience & changelog.' },
  ];
  return (
    <div>
      <h1 className="font-display text-[clamp(1.6rem,3vw,2.2rem)] leading-tight">Documentation</h1>
      <p className="mt-1 text-sm text-stone">Guides, system status and changelogs for each part of AIRLUXO — kept in sync with every change.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {docs.map((d) => (
          <a key={d.key} href={`/?docs=${d.key}`} target="_blank" rel="noreferrer"
            className="ring-lux rounded-2xl border border-mist bg-cloud p-5 transition-colors hover:border-ink">
            <div className="font-display text-lg">{d.title}</div>
            <p className="mt-1 text-sm text-stone">{d.desc}</p>
            <div className="mt-4 text-xs font-semibold text-gold">Open guide &amp; changelog ↗</div>
          </a>
        ))}
      </div>
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
