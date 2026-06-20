import { useState, useEffect, Fragment } from 'react';
import { Icon } from './Icons.jsx';
import { useAuth } from '../lib/auth.jsx';
import { chf } from '../lib/format.js';
import { tierForTrips } from '../lib/loyalty.js';
import { listSubscribers, setNewsletter } from '../lib/newsletter.js';
import { MARKETING_FLOWS, marketingOverview, setFlowActive, previewFlow } from '../lib/marketing.js';
import { AddressFields } from './LocationForm.jsx';
import { listWatchlist, upsertWatchlist, deleteWatchlist, listInspiration, addInspirationLink, deleteInspiration, runScrape, listDrafts, setDraftStatus, setDraftCaption, scheduleDraft, listContentPosts } from '../lib/content.js';
import { en, SUPPORTED_LOCALES } from '../locales/en.js';
import { fetchTranslations, saveTranslation, aiTranslate, saveTranslationsBatch, hashStr } from '../lib/translations.js';
import { STAGES, listProspects, createProspect, setProspectStage, impersonateProspect, claimProspect, siteOrigin, listPartners, updatePartner, partnerDetail, archivePartner, deletePartner, listCustomers, customerDetail, PARTNER_STATUS, partnerStatus, enrichProspect, listProspectNotes, addProspectNote, adminOverview, adminFinancials, bookingsExport, securityStatus, runSecurityAudit, cronStatus } from '../lib/prospects.js';
import { startIngest, latestIngestJob, partnerBrandReview, applyListingPhotos, createPartnerListing, setPartnerBrandKit, normalizeKit, brandKitToVars, loadBrandFont, uploadBrandAsset } from '../lib/brandkit.js';
import { setPartnerSite, slugify, mapSiteConfig, mergeLayout, setPartnerLegal, addPartnerDomain, listPartnerDomains, setDomainVerified, removePartnerDomain } from '../lib/site.js';
import { LEGAL_FIELDS, seedLegal, buildLegalPages } from '../lib/legal.js';

const fmtDate = (s) => (s ? new Date(s).toLocaleDateString('de-CH', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const fmtDateTime = (s) => (s ? new Date(s).toLocaleString('de-CH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

// Breadcrumb trail for the in-dashboard drill-down views (lead → brand & pitch).
function Crumbs({ items }) {
  return (
    <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-sm">
      {items.map((it, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="text-mist">/</span>}
          {it.onClick
            ? <button type="button" onClick={it.onClick} className="font-semibold text-stone transition-colors hover:text-ink">{it.label}</button>
            : <span className="font-semibold text-ink">{it.label}</span>}
        </Fragment>
      ))}
    </nav>
  );
}

// AIRLUXO founder / admin back office. Rendered on admin.airluxo.ch (or ?admin
// while the subdomain DNS isn't wired). The security boundary is server-side:
// every admin read/write goes through is_admin()-checked RLS / edge functions —
// this UI gate is just UX, not protection.

const NAV = [
  { key: 'overview', label: 'Overview' },
  { key: 'finance', label: 'Finance' },
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'partners', label: 'Partners' },
  { key: 'customers', label: 'Customers' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'content', label: 'Content' },
  { key: 'translations', label: 'Translations' },
  { key: 'docs', label: 'Docs' },
  { key: 'developer', label: 'Developer' },
];

// Local Playwright HTML report server (started by `npm run test:report` or
// automatically after a push via the pre-push hook). Port 9380 is AIRLUXO's
// pinned report port (distinct from Playwright's shared 9323 default, so this
// button always shows AIRLUXO's report even when another project's report
// server is running — see the port registry in TESTING.md). Override at build
// time with VITE_PLAYWRIGHT_REPORT_URL if you host the report somewhere reachable.
const REPORT_URL = import.meta.env.VITE_PLAYWRIGHT_REPORT_URL || 'http://localhost:9380';
const CI_RUNS_URL = 'https://github.com/francoluumos/airluxo/actions/workflows/e2e.yml';

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
  const [section, setSection] = useState('overview');

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

        {section === 'overview' ? <Overview />
          : section === 'finance' ? <Finance />
          : section === 'pipeline' ? <Pipeline />
          : section === 'partners' ? <Partners />
          : section === 'customers' ? <Customers />
          : section === 'marketing' ? <Marketing />
          : section === 'content' ? <Content />
          : section === 'translations' ? <Translations />
          : section === 'docs' ? <DocsHub />
          : section === 'developer' ? <Developer />
          : <SectionPlaceholder label={NAV.find((n) => n.key === section)?.label} />}
      </main>
    </div>
  );
}

// Developer tools (founder-only). First section: the Playwright E2E report.
function Developer() {
  const [copied, setCopied] = useState(false);
  const copyCmd = async () => {
    try { await navigator.clipboard.writeText('npm run test:report'); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* ignore */ }
  };
  return (
    <div className="w-full">
      <h1 className="font-display text-2xl">Developer</h1>
      <p className="mt-1 text-sm text-stone">Internal tooling. Not shown to partners or customers.</p>

      <div className="mt-7 rounded-[var(--radius-card)] border border-mist bg-cloud p-6">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-paper text-ink"><Icon.Check width={18} height={18} /></span>
          <div>
            <h2 className="font-display text-lg leading-none">Testing — Playwright</h2>
            <p className="mt-1 text-xs text-stone">The end-to-end suite (smoke · auth · marketplace · booking · partner) across 5 browsers.</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <a href={REPORT_URL} target="_blank" rel="noreferrer" className="ring-lux inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-cloud transition-colors hover:bg-void">
            Open latest report <Icon.ArrowUpRight width={15} height={15} />
          </a>
          <a href={CI_RUNS_URL} target="_blank" rel="noreferrer" className="ring-lux inline-flex items-center gap-2 rounded-full border border-mist px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink">
            CI test runs <Icon.ArrowUpRight width={14} height={14} />
          </a>
        </div>

        <div className="mt-5 rounded-xl border border-mist bg-paper p-3.5 text-xs leading-relaxed text-stone">
          <p><span className="font-semibold text-ink">Open latest report</span> opens the local report server (<code className="rounded bg-mist/60 px-1 py-0.5">{REPORT_URL}</code>). It's served automatically after each <code className="rounded bg-mist/60 px-1 py-0.5">git push</code>, or start it yourself:</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="rounded-lg border border-mist bg-cloud px-2.5 py-1.5 text-ink">npm run test:report</code>
            <button onClick={copyCmd} className="ring-lux rounded-full border border-mist px-3 py-1 text-[0.7rem] font-semibold text-stone transition-colors hover:border-ink hover:text-ink">{copied ? 'Copied ✓' : 'Copy'}</button>
          </div>
          <p className="mt-2"><span className="font-semibold text-ink">CI test runs</span> opens GitHub Actions, where every push/PR uploads its report (downloadable, 14-day history) — reachable from anywhere.</p>
        </div>
      </div>

      <SecurityAudit />
      <CronJobs />
    </div>
  );
}

function statusPill(s) {
  const ok = /succeed|success|ready|completed/i.test(s || '');
  const bad = /fail|error/i.test(s || '');
  const cls = ok ? 'bg-go/15 text-go' : bad ? 'bg-red-100 text-red-700' : 'bg-mist text-stone';
  return <span className={`rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${cls}`}>{s || '—'}</span>;
}

// Developer → Cron & jobs: scheduled jobs, run history, and pg_net HTTP responses (catches
// crons that "succeed" while their edge function actually failed — e.g. 401 missing Vault key).
function CronJobs() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const load = () => { setLoading(true); setErr(''); cronStatus().then((d) => { setData(d); setLoading(false); }).catch((e) => { setErr(e.message); setLoading(false); }); };
  useEffect(() => { load(); }, []);

  const jobs = data?.jobs || [];
  const runs = data?.runs || [];
  const http = data?.http || [];
  const ingest = data?.ingest || [];
  const badHttp = http.filter((h) => h.status_code && (h.status_code < 200 || h.status_code >= 300));

  return (
    <div className="mt-7 rounded-[var(--radius-card)] border border-mist bg-cloud p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-paper text-ink"><Icon.Check width={18} height={18} /></span>
          <div>
            <h2 className="font-display text-lg leading-none">Cron &amp; background jobs</h2>
            <p className="mt-1 text-xs text-stone">Scheduled jobs, run history, and HTTP responses — to surface silent failures.</p>
          </div>
        </div>
        <button onClick={load} className="ring-lux rounded-full border border-mist px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-ink">Refresh</button>
      </div>
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
      {loading ? <p className="mt-4 text-sm text-stone">Loading…</p> : (
        <div className="mt-5 space-y-6">
          {badHttp.length > 0 && (
            <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-700">
              <span className="font-bold">{badHttp.length} recent non-2xx HTTP response{badHttp.length === 1 ? '' : 's'}</span> — a cron can report “succeeded” while its function fails (e.g. <b>401</b> = the Vault service-role key isn’t set). See the HTTP table below.
            </div>
          )}

          <div>
            <h3 className="mb-2 text-sm font-bold text-ink">Scheduled jobs ({jobs.length})</h3>
            <div className="overflow-x-auto rounded-xl border border-mist bg-paper">
              <table className="w-full text-sm">
                <thead className="bg-cloud text-left text-[0.7rem] uppercase tracking-wide text-stone"><tr>
                  <th className="p-2">Job</th><th className="p-2">Schedule</th><th className="p-2">Active</th>
                </tr></thead>
                <tbody>
                  {jobs.map((j) => (
                    <tr key={j.jobid} className="border-t border-mist">
                      <td className="p-2 font-semibold text-ink">{j.jobname}</td>
                      <td className="p-2 font-mono text-xs text-stone">{j.schedule}</td>
                      <td className="p-2">{j.active ? <span className="rounded-full bg-go/15 px-2 py-0.5 text-[0.7rem] font-semibold text-go">on</span> : <span className="rounded-full bg-mist px-2 py-0.5 text-[0.7rem] font-semibold text-stone">off</span>}</td>
                    </tr>
                  ))}
                  {jobs.length === 0 && <tr><td colSpan={3} className="p-3 text-center text-xs text-stone">No cron jobs.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-bold text-ink">Recent runs ({runs.length})</h3>
            <div className="max-h-72 overflow-auto rounded-xl border border-mist bg-paper">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-cloud text-left text-[0.7rem] uppercase tracking-wide text-stone"><tr>
                  <th className="p-2">Job</th><th className="p-2">Status</th><th className="p-2">When</th><th className="p-2">Message</th>
                </tr></thead>
                <tbody>
                  {runs.map((r, i) => (
                    <tr key={i} className="border-t border-mist">
                      <td className="p-2 text-ink">{r.jobname}</td>
                      <td className="p-2">{statusPill(r.status)}</td>
                      <td className="p-2 whitespace-nowrap text-xs text-stone">{fmtDateTime(r.start_time)}</td>
                      <td className="p-2 max-w-[20rem] truncate text-xs text-stone" title={r.return_message}>{r.return_message}</td>
                    </tr>
                  ))}
                  {runs.length === 0 && <tr><td colSpan={4} className="p-3 text-center text-xs text-stone">No runs recorded.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-bold text-ink">HTTP responses ({http.length}) <span className="font-normal text-stone">— cron → edge-function results</span></h3>
            <div className="max-h-72 overflow-auto rounded-xl border border-mist bg-paper">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-cloud text-left text-[0.7rem] uppercase tracking-wide text-stone"><tr>
                  <th className="p-2">Code</th><th className="p-2">When</th><th className="p-2">Error</th>
                </tr></thead>
                <tbody>
                  {http.map((h, i) => {
                    const ok = h.status_code >= 200 && h.status_code < 300;
                    return (
                      <tr key={i} className="border-t border-mist">
                        <td className="p-2"><span className={`rounded-full px-2 py-0.5 text-[0.7rem] font-bold ${ok ? 'bg-go/15 text-go' : 'bg-red-100 text-red-700'}`}>{h.status_code || '—'}</span></td>
                        <td className="p-2 whitespace-nowrap text-xs text-stone">{fmtDateTime(h.created)}</td>
                        <td className="p-2 max-w-[24rem] truncate text-xs text-stone" title={h.error_msg}>{h.error_msg}</td>
                      </tr>
                    );
                  })}
                  {http.length === 0 && <tr><td colSpan={3} className="p-3 text-center text-xs text-stone">No HTTP responses recorded.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {ingest.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-bold text-ink">Partner ingest jobs ({ingest.length})</h3>
              <div className="max-h-60 overflow-auto rounded-xl border border-mist bg-paper">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-cloud text-left text-[0.7rem] uppercase tracking-wide text-stone"><tr>
                    <th className="p-2">Status</th><th className="p-2">When</th><th className="p-2">Error</th>
                  </tr></thead>
                  <tbody>
                    {ingest.map((i) => (
                      <tr key={i.id} className="border-t border-mist">
                        <td className="p-2">{statusPill(i.status)}</td>
                        <td className="p-2 whitespace-nowrap text-xs text-stone">{fmtDateTime(i.created_at)}</td>
                        <td className="p-2 max-w-[24rem] truncate text-xs text-red-600" title={i.error}>{i.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="text-[0.7rem] text-stone">Full edge-function logs: Supabase dashboard → Edge Functions → Logs.</p>
        </div>
      )}
    </div>
  );
}

const SEV_RANK = { high: 0, medium: 1, low: 2 };
const STATUS_STYLE = {
  pass: 'bg-go/15 text-go', warn: 'bg-gold/15 text-gold',
  fail: 'bg-red-100 text-red-700', manual: 'bg-mist text-stone',
};
const STATUS_LABEL = { pass: 'Pass', warn: 'Warn', fail: 'Fail', manual: 'Manual' };

function SecurityAudit() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [running, setRunning] = useState(false);

  const load = () => securityStatus().then(setD).catch((e) => { setErr(e.message); setD(false); });
  useEffect(() => { load(); }, []);

  async function rerun() {
    setRunning(true); setErr('');
    try { await runSecurityAudit(); await load(); }
    catch (e) { setErr(e.message || 'Could not run the audit.'); }
    finally { setRunning(false); }
  }

  const latest = d && d.latest;
  const findings = (latest && latest.findings) || [];
  // Action items first (fail → warn → manual), each by severity; passes last.
  const order = { fail: 0, warn: 1, manual: 2, pass: 3 };
  const sorted = [...findings].sort((a, b) =>
    (order[a.status] - order[b.status]) || ((SEV_RANK[a.severity] ?? 9) - (SEV_RANK[b.severity] ?? 9)));

  return (
    <div className="mt-7 rounded-[var(--radius-card)] border border-mist bg-cloud p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-paper text-ink"><Icon.Shield width={18} height={18} /></span>
          <div>
            <h2 className="font-display text-lg leading-none">Security</h2>
            <p className="mt-1 text-xs text-stone">Automated checks on RLS, policies, definer functions & config. Re-runs daily; remediation tasks below.</p>
          </div>
        </div>
        <button onClick={rerun} disabled={running} className="ring-lux shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-bold text-cloud transition-colors hover:bg-void disabled:opacity-60">
          {running ? 'Running…' : 'Run check now'}
        </button>
      </div>

      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
      {d === null && <div className="grid place-items-center py-10"><span className="h-5 w-5 animate-spin rounded-full border-2 border-mist border-t-ink" /></div>}

      {latest && (
        <>
          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-go/15 px-2.5 py-1 font-semibold text-go">{latest.passed} pass</span>
            <span className="rounded-full bg-gold/15 px-2.5 py-1 font-semibold text-gold">{latest.warnings} warn</span>
            <span className="rounded-full bg-red-100 px-2.5 py-1 font-semibold text-red-700">{latest.failures} fail</span>
            <span className="rounded-full bg-mist px-2.5 py-1 font-semibold text-stone">{latest.manual} manual</span>
            <span className="ml-auto self-center text-stone">Last run {fmtDateTime(latest.ran_at)}</span>
          </div>

          <div className="mt-4 space-y-2">
            {sorted.map((f) => (
              <div key={f.key} className="rounded-xl border border-mist bg-paper p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-semibold text-ink">{f.title}</div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider ${STATUS_STYLE[f.status] || ''}`}>{STATUS_LABEL[f.status] || f.status}</span>
                </div>
                <p className="mt-1 text-xs text-stone">{f.detail}</p>
                {Array.isArray(f.items) && f.items.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {f.items.map((it, i) => <span key={i} className="rounded-md bg-mist/60 px-1.5 py-0.5 font-mono text-[0.65rem] text-ink">{it}</span>)}
                  </div>
                )}
                {f.status !== 'pass' && f.remediation && (
                  <p className="mt-2 text-xs text-stone"><span className="font-semibold text-ink">Fix:</span> {f.remediation}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// CRM pipeline board: prospects as cards in stage columns. Create = a private
// preview workspace (placeholder partner). Phase 2 adds build-the-fleet + hide
// from marketplace; Phase 4 the claim-to-live.
/* ── Shared table pagination ───────────────────────────────────────────── */
// Reusable client-side pager. Call it unconditionally (before any early return).
// Resets to page 1 whenever the item count changes (e.g. a filter narrows the list).
function usePager(items, size = 25) {
  const [page, setPage] = useState(0);
  const total = items ? items.length : 0;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(page, pageCount - 1);
  useEffect(() => { setPage(0); }, [total]);
  const slice = items ? items.slice(safePage * size, safePage * size + size) : [];
  return { page: safePage, setPage, pageCount, total, slice, size };
}

function TablePager({ pager }) {
  const { page, setPage, pageCount, total, size } = pager;
  if (total <= size) return null;
  return (
    <div className="mt-3 flex items-center justify-between gap-3">
      <span className="text-xs text-stone">{page * size + 1}–{Math.min((page + 1) * size, total)} of {total}</span>
      <div className="flex items-center gap-2">
        <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
          className="ring-lux grid h-8 w-8 place-items-center rounded-full border border-mist text-ink transition-colors hover:border-ink disabled:opacity-40"><Icon.Arrow width={15} height={15} className="rotate-180" /></button>
        <span className="text-xs font-semibold tnum text-stone">Page {page + 1} / {pageCount}</span>
        <button onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1}
          className="ring-lux grid h-8 w-8 place-items-center rounded-full border border-mist text-ink transition-colors hover:border-ink disabled:opacity-40"><Icon.Arrow width={15} height={15} /></button>
      </div>
    </div>
  );
}

/* ── Content ───────────────────────────────────────────────────────────── */
const CONTENT_TABS = [
  { key: 'inspiration', label: 'Inspiration' },
  { key: 'drafts', label: 'Drafts' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'settings', label: 'Settings' },
];
const clip = (s, n = 60) => { const t = (s || '').trim(); return t.length > n ? t.slice(0, n) + '…' : t; };
const tnum = (v) => (v == null ? '—' : Number(v).toLocaleString('de-CH'));

function Content() {
  const [tab, setTab] = useState('settings');
  return (
    <div>
      <div>
        <h1 className="font-display text-[clamp(1.6rem,3vw,2.2rem)] leading-tight">Content</h1>
        <p className="mt-1 text-sm text-stone">Mine emotional inspiration, generate AIRLUXO reels & carousels, approve, and schedule. Start by adding creators to your watchlist in Settings.</p>
      </div>
      <div className="mt-4 inline-flex rounded-full border border-mist bg-cloud p-1">
        {CONTENT_TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`ring-lux rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${tab === t.key ? 'bg-ink text-cloud' : 'text-stone hover:text-ink'}`}>{t.label}</button>
        ))}
      </div>
      <div className="mt-5">
        {tab === 'inspiration' ? <ContentInspiration />
          : tab === 'drafts' ? <ContentDrafts />
          : tab === 'schedule' ? <ContentSchedule />
          : <ContentSettings />}
      </div>
    </div>
  );
}

function ContentTableShell({ minWidth = 760, headers, children }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-mist bg-cloud">
      <table className="w-full text-sm" style={{ minWidth: `${minWidth}px` }}>
        <thead>
          <tr className="border-b border-mist text-left text-[0.65rem] uppercase tracking-wider text-stone">
            {headers.map((h) => <th key={h} className="px-4 py-3 font-bold">{h}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function ContentInspiration() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const load = () => listInspiration().then(setRows).catch((e) => { setErr(e.message); setRows([]); });
  useEffect(() => { load(); }, []);
  const pager = usePager(rows, 25);

  async function addLink(e) {
    e.preventDefault();
    const u = url.trim();
    if (!u) return;
    setBusy(true); setErr('');
    try { await addInspirationLink(u, note.trim() || null); setUrl(''); setNote(''); await load(); }
    catch (e2) { setErr(e2.message || 'Could not add link.'); }
    finally { setBusy(false); }
  }
  async function remove(id) {
    try { await deleteInspiration(id); await load(); } catch (e2) { setErr(e2.message); }
  }

  if (rows === null) return <div className="grid place-items-center py-16"><span className="h-5 w-5 animate-spin rounded-full border-2 border-mist border-t-ink" /></div>;
  return (
    <div>
      <form onSubmit={addLink} className="mb-4 flex flex-wrap items-end gap-2">
        <label className="block flex-1">
          <span className="mb-1 block text-xs font-semibold text-stone">Add a reel/post by link</span>
          <input value={url} onChange={(e) => setUrl(e.target.value)} type="url" placeholder="https://www.instagram.com/reel/…" className="ring-lux w-full rounded-xl border border-mist bg-cloud px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-ink placeholder:text-stone" />
        </label>
        <label className="block flex-1">
          <span className="mb-1 block text-xs font-semibold text-stone">Note (optional)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="why it's a reference" className="ring-lux w-full rounded-xl border border-mist bg-cloud px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-ink placeholder:text-stone" />
        </label>
        <button type="submit" disabled={busy || !url.trim()} className="ring-lux shrink-0 rounded-full bg-ink px-4 py-2.5 text-sm font-bold text-cloud transition-colors hover:bg-void disabled:opacity-50">{busy ? 'Adding…' : 'Add link'}</button>
      </form>
      {err && <p className="mb-3 text-sm text-red-600">{err}</p>}
      <ContentTableShell minWidth={900} headers={['Source', 'Caption', 'Views', 'Likes', 'Comments', 'Score', 'Posted', 'Watch']}>
        {rows.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-stone">No inspiration yet — paste a link above, or add creators in Settings for the daily scan.</td></tr>}
        {pager.slice.map((r) => (
          <tr key={r.id} className="border-b border-mist/60 bg-paper last:border-0">
            <td className="px-4 py-3 font-semibold">
              {r.reel_url ? <a href={r.reel_url} target="_blank" rel="noreferrer" className="text-ink hover:underline">{r.source_handle ? `@${r.source_handle}` : 'link ↗'}</a> : `@${r.source_handle || '—'}`}
              {r.source === 'manual' && <span className="ml-1.5 rounded-full bg-gold/15 px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-gold">manual</span>}
            </td>
            <td className="px-4 py-3 text-stone">{clip(r.note || r.caption)}</td>
            <td className="px-4 py-3 tnum text-stone">{tnum(r.views)}</td>
            <td className="px-4 py-3 tnum text-stone">{tnum(r.likes)}</td>
            <td className="px-4 py-3 tnum text-stone">{tnum(r.comments)}</td>
            <td className="px-4 py-3 tnum font-semibold">{r.work_score == null ? '—' : Number(r.work_score).toFixed(1)}</td>
            <td className="px-4 py-3 text-stone">{r.posted_at ? fmtDate(r.posted_at) : '—'}</td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-1.5">
                {r.reel_url ? <a href={r.reel_url} target="_blank" rel="noreferrer" className="ring-lux inline-block rounded-lg border border-mist px-2.5 py-1 text-xs font-semibold text-ink transition-colors hover:border-ink">▶ Watch</a> : <span className="text-stone">—</span>}
                <button onClick={() => remove(r.id)} title="Remove inspiration" className="ring-lux rounded-lg px-1.5 py-1 text-xs font-semibold text-red-600 transition-colors hover:underline">✕</button>
              </div>
            </td>
          </tr>
        ))}
      </ContentTableShell>
      <TablePager pager={pager} />
    </div>
  );
}

const CONTENT_CHANNELS = ['Instagram', 'TikTok', 'YouTube'];

function ContentDrafts() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState('open'); // open = generated|approved
  const load = () => listDrafts().then(setRows).catch((e) => { setErr(e.message); setRows([]); });
  useEffect(() => { load(); }, []);

  if (rows === null) return <div className="grid place-items-center py-16"><span className="h-5 w-5 animate-spin rounded-full border-2 border-mist border-t-ink" /></div>;
  const open = rows.filter((r) => r.status === 'generated' || r.status === 'approved');
  const shown = filter === 'open' ? open : rows;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        {[['open', `Needs review (${open.length})`], ['all', `All (${rows.length})`]].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`ring-lux rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${filter === k ? 'bg-ink text-cloud' : 'border border-mist text-stone hover:border-ink'}`}>{l}</button>
        ))}
      </div>
      {err && <p className="mb-3 text-sm text-red-600">{err}</p>}
      {shown.length === 0 && <p className="rounded-2xl border border-dashed border-mist py-12 text-center text-sm text-stone/60">No drafts here — generated reels & carousels land in this queue for approval.</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {shown.map((d) => <DraftCard key={d.id} d={d} onChanged={load} onErr={setErr} />)}
      </div>
    </div>
  );
}

function DraftCard({ d, onChanged, onErr }) {
  const assets = Array.isArray(d.asset_urls) ? d.asset_urls : [];
  const [caption, setCaption] = useState(d.caption || '');
  const [targets, setTargets] = useState(['Instagram']);
  const [when, setWhen] = useState('');
  const [busy, setBusy] = useState('');
  const [frame, setFrame] = useState(0);
  const [zoom, setZoom] = useState(false);
  const prevFrame = () => setFrame((f) => (f - 1 + assets.length) % assets.length);
  const nextFrame = () => setFrame((f) => (f + 1) % assets.length);
  const dirty = caption !== (d.caption || '');
  const actionable = d.status === 'generated' || d.status === 'approved';
  const badge = { generated: 'bg-mist text-stone', approved: 'bg-go/15 text-go', rejected: 'bg-red-100 text-red-700', scheduled: 'bg-gold/15 text-gold', posted: 'bg-go/15 text-go', failed: 'bg-red-100 text-red-700' };

  const toggle = (c) => setTargets((t) => (t.includes(c) ? t.filter((x) => x !== c) : [...t, c]));
  async function saveCaption() { setBusy('cap'); onErr(''); try { await setDraftCaption(d.id, caption); await onChanged(); } catch (e) { onErr(e.message); } finally { setBusy(''); } }
  async function reject() { setBusy('rej'); onErr(''); try { await setDraftStatus(d.id, 'rejected'); await onChanged(); } catch (e) { onErr(e.message); } finally { setBusy(''); } }
  async function approve() {
    if (!targets.length) { onErr('Pick at least one channel.'); return; }
    if (!when) { onErr('Pick a date & time.'); return; }
    setBusy('app'); onErr('');
    try {
      if (dirty) await setDraftCaption(d.id, caption);
      await scheduleDraft(d.id, new Date(when).toISOString(), targets);
      await onChanged();
    } catch (e) { onErr(e.message); } finally { setBusy(''); }
  }

  return (
    <div className="rounded-2xl border border-mist bg-cloud p-3">
      <div className="relative aspect-[9/16] max-h-80 overflow-hidden rounded-xl bg-ink/5">
        {assets[frame]
          ? (d.format === 'reel'
            ? <video src={assets[frame]} controls playsInline className="h-full w-full object-contain" />
            : <button type="button" onClick={() => setZoom(true)} className="ring-lux block h-full w-full cursor-zoom-in"><img src={assets[frame]} alt="" className="h-full w-full object-contain" /></button>)
          : <div className="grid h-full place-items-center text-xs text-stone/50">No preview</div>}
        {d.format !== 'reel' && assets[frame] && <span className="pointer-events-none absolute right-1.5 top-1.5 rounded-md bg-ink/60 px-1.5 py-0.5 text-[0.6rem] font-semibold text-cloud">⤢ enlarge</span>}
        {assets.length > 1 && (
          <>
            <button type="button" onClick={prevFrame} className="ring-lux absolute left-1 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-ink/55 text-cloud hover:bg-ink/75">‹</button>
            <button type="button" onClick={nextFrame} className="ring-lux absolute right-1 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-ink/55 text-cloud hover:bg-ink/75">›</button>
            <div className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-1">
              {assets.map((_, i) => <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === frame ? 'bg-cloud' : 'bg-cloud/40'}`} />)}
            </div>
          </>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold capitalize">{d.format}</span>
        <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold capitalize ${badge[d.status] || 'bg-mist text-stone'}`}>{d.status}</span>
        {d.virality_score != null && <span className="rounded-full bg-go/12 px-2 py-0.5 font-semibold text-go">viral {Number(d.virality_score).toFixed(0)}</span>}
        {d.hook_score != null && <span className="rounded-full bg-gold/15 px-2 py-0.5 font-semibold text-gold">hook {Number(d.hook_score).toFixed(0)}</span>}
        {assets.length > 1 && <span className="text-stone">{assets.length} frames</span>}
      </div>
      <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} placeholder="Caption…"
        className="ring-lux mt-2 w-full rounded-xl border border-mist bg-paper px-3 py-2 text-sm outline-none transition-colors focus:border-ink placeholder:text-stone" />
      {dirty && actionable && <button onClick={saveCaption} disabled={!!busy} className="ring-lux mt-1 text-xs font-semibold text-ink hover:underline disabled:opacity-50">{busy === 'cap' ? 'Saving…' : 'Save caption'}</button>}

      {actionable && (
        <>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CONTENT_CHANNELS.map((c) => (
              <button key={c} onClick={() => toggle(c)}
                className={`ring-lux rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${targets.includes(c) ? 'bg-ink text-cloud' : 'border border-mist text-stone hover:border-ink'}`}>{c}</button>
            ))}
          </div>
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)}
            className="ring-lux mt-2 w-full rounded-xl border border-mist bg-paper px-3 py-2 text-sm outline-none transition-colors focus:border-ink" />
          <div className="mt-2 flex gap-2">
            <button onClick={reject} disabled={!!busy} className="ring-lux rounded-full border border-red-300 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50">{busy === 'rej' ? '…' : 'Reject'}</button>
            <button onClick={approve} disabled={!!busy} className="ring-lux flex-1 rounded-full bg-go py-2 text-xs font-bold text-cloud transition-opacity hover:opacity-90 disabled:opacity-50">{busy === 'app' ? 'Scheduling…' : 'Approve & schedule'}</button>
          </div>
        </>
      )}

      {zoom && assets[frame] && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-ink/80 p-4 backdrop-blur-sm" onClick={() => setZoom(false)}>
          <img src={assets[frame]} alt="" className="max-h-[90vh] max-w-[92vw] rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
          <button type="button" onClick={() => setZoom(false)} className="ring-lux absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-cloud/90 text-ink">✕</button>
          {assets.length > 1 && (
            <div className="absolute inset-x-0 bottom-6 flex items-center justify-center gap-3" onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={prevFrame} className="ring-lux grid h-9 w-9 place-items-center rounded-full bg-cloud/90 text-ink">‹</button>
              <span className="text-xs font-semibold text-cloud">{frame + 1} / {assets.length}</span>
              <button type="button" onClick={nextFrame} className="ring-lux grid h-9 w-9 place-items-center rounded-full bg-cloud/90 text-ink">›</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ContentSchedule() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { listContentPosts().then(setRows).catch((e) => { setErr(e.message); setRows([]); }); }, []);
  const pager = usePager(rows, 25);
  const badge = { scheduled: 'bg-gold/15 text-gold', publishing: 'bg-gold/15 text-gold', posted: 'bg-go/15 text-go', failed: 'bg-red-100 text-red-700' };
  if (rows === null) return <div className="grid place-items-center py-16"><span className="h-5 w-5 animate-spin rounded-full border-2 border-mist border-t-ink" /></div>;
  return (
    <div>
      {err && <p className="mb-3 text-sm text-red-600">{err}</p>}
      <ContentTableShell minWidth={620} headers={['Scheduled for', 'Channels', 'Status', 'Posted']}>
        {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-stone">Nothing scheduled — approved drafts get queued here.</td></tr>}
        {pager.slice.map((r) => (
          <tr key={r.id} className="border-b border-mist/60 bg-paper last:border-0">
            <td className="px-4 py-3 font-semibold">{r.scheduled_for ? fmtDateTime(r.scheduled_for) : '—'}</td>
            <td className="px-4 py-3 text-stone">{Array.isArray(r.targets) ? r.targets.join(', ') : '—'}</td>
            <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[0.7rem] font-bold capitalize ${badge[r.status] || 'bg-mist text-stone'}`}>{r.status}</span></td>
            <td className="px-4 py-3 text-stone">{r.posted_at ? fmtDateTime(r.posted_at) : '—'}</td>
          </tr>
        ))}
      </ContentTableShell>
      <TablePager pager={pager} />
    </div>
  );
}

function ContentSettings() {
  const [rows, setRows] = useState(null);
  const [handle, setHandle] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [scan, setScan] = useState('');
  const load = () => listWatchlist().then(setRows).catch((e) => { setErr(e.message); setRows([]); });
  useEffect(() => { load(); }, []);

  async function scanNow() {
    setScan('running'); setErr('');
    try { const r = await runScrape(); setScan(`Scanned — ${r.scraped ?? 0} reels from ${r.handles ?? 0} accounts. See Inspiration.`); }
    catch (e) { setErr(e.message || 'Scan failed.'); setScan(''); }
  }

  async function add(e) {
    e.preventDefault();
    const h = handle.trim().replace(/^@/, '');
    if (!h) return;
    setBusy(true); setErr('');
    try { await upsertWatchlist({ handle: h, note: note.trim() || null }); setHandle(''); setNote(''); await load(); }
    catch (e2) { setErr(e2.message || 'Could not add.'); }
    finally { setBusy(false); }
  }
  async function toggle(r) {
    try { await upsertWatchlist({ id: r.id, platform: r.platform, handle: r.handle, note: r.note, active: !r.active }); await load(); }
    catch (e2) { setErr(e2.message); }
  }
  async function remove(id) {
    try { await deleteWatchlist(id); await load(); } catch (e2) { setErr(e2.message); }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <SubLabel>Instagram watchlist</SubLabel>
          <p className="mt-1 text-sm text-stone">Creators you love + seeds for discovery. The daily scan mines their public reels and ranks what works — inspiration only, never reposted.</p>
        </div>
        <button onClick={scanNow} disabled={scan === 'running'} className="ring-lux shrink-0 rounded-full border border-mist bg-cloud px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-ink disabled:opacity-60">{scan === 'running' ? 'Scanning…' : 'Scan now'}</button>
      </div>
      {scan && scan !== 'running' && <p className="mt-2 text-xs text-go">{scan}</p>}

      <form onSubmit={add} className="mt-4 flex flex-wrap items-end gap-2">
        <label className="block flex-1">
          <span className="mb-1 block text-xs font-semibold text-stone">Handle</span>
          <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@creator" className="ring-lux w-full rounded-xl border border-mist bg-cloud px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-ink placeholder:text-stone" />
        </label>
        <label className="block flex-1">
          <span className="mb-1 block text-xs font-semibold text-stone">Note (optional)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="why you like them" className="ring-lux w-full rounded-xl border border-mist bg-cloud px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-ink placeholder:text-stone" />
        </label>
        <button type="submit" disabled={busy || !handle.trim()} className="ring-lux shrink-0 rounded-full bg-ink px-4 py-2.5 text-sm font-bold text-cloud transition-colors hover:bg-void disabled:opacity-50">{busy ? 'Adding…' : 'Add'}</button>
      </form>
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

      <div className="mt-5 space-y-2">
        {rows === null && <div className="grid place-items-center py-10"><span className="h-5 w-5 animate-spin rounded-full border-2 border-mist border-t-ink" /></div>}
        {rows && rows.length === 0 && <p className="text-sm text-stone">No creators yet — add one above.</p>}
        {rows && rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3 rounded-xl border border-mist bg-cloud px-3.5 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-ink">@{r.handle} {!r.active && <span className="ml-1 rounded-full bg-mist px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-stone">paused</span>}</div>
              {r.note && <div className="truncate text-xs text-stone">{r.note}</div>}
            </div>
            <button onClick={() => toggle(r)} className="ring-lux shrink-0 rounded-lg border border-mist px-2.5 py-1 text-xs font-semibold text-ink transition-colors hover:border-ink">{r.active ? 'Pause' : 'Resume'}</button>
            <button onClick={() => remove(r.id)} className="ring-lux shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 transition-colors hover:underline">Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Overview ──────────────────────────────────────────────────────────── */
const OV_PERIODS = [{ days: 7, label: '7 days' }, { days: 30, label: '30 days' }, { days: 90, label: '90 days' }];

// Tiny inline sparkline for a daily series.
function Sparkline({ values, color = 'var(--color-ink, #0b0b0c)' }) {
  const vals = values && values.length ? values : [0, 0];
  const max = Math.max(...vals, 1);
  const w = 100, h = 26;
  const step = vals.length > 1 ? w / (vals.length - 1) : w;
  const pts = vals.map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * (h - 2) - 1).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-7 w-full">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function deltaPct(cur, prev) {
  if (!prev) return cur > 0 ? 100 : 0;
  return ((cur - prev) / prev) * 100;
}

function OvKpi({ label, cur, prev, series, money, color }) {
  const d = deltaPct(cur, prev);
  const up = d >= 0;
  const flat = Math.abs(d) < 0.5;
  return (
    <div className="rounded-2xl border border-mist bg-cloud p-4">
      <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-stone">{label}</div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <div className="font-display text-2xl tnum">{money ? chf(cur) : cur}</div>
        <div className={`mb-0.5 text-xs font-semibold tnum ${flat ? 'text-stone' : up ? 'text-go' : 'text-red-600'}`}>
          {flat ? '±0%' : `${up ? '↑' : '↓'} ${Math.abs(d).toFixed(0)}%`}
        </div>
      </div>
      <div className="mt-2"><Sparkline values={series} color={color} /></div>
      <div className="mt-1 text-[0.65rem] text-stone">vs {money ? chf(prev) : prev} previous</div>
    </div>
  );
}

function Overview() {
  const [days, setDays] = useState(7);
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    setD(null); setErr('');
    adminOverview(days).then(setD).catch((e) => { setErr(e.message); setD(false); });
  }, [days]);

  const daily = (d && d.daily) || [];
  const ser = (k) => daily.map((row) => Number(row[k]) || 0);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(1.6rem,3vw,2.2rem)] leading-tight">Overview</h1>
          <p className="mt-1 text-sm text-stone">What we’re adding each day — leads, partners, customers and bookings — vs the previous {days} days.</p>
        </div>
        <div className="inline-flex shrink-0 rounded-full border border-mist bg-cloud p-1">
          {OV_PERIODS.map((p) => (
            <button key={p.days} onClick={() => setDays(p.days)}
              className={`ring-lux rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${days === p.days ? 'bg-ink text-cloud' : 'text-stone hover:text-ink'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {err && <p className="mt-4 text-sm text-red-600">{err}</p>}
      {d === null && <div className="grid place-items-center py-20"><span className="h-6 w-6 animate-spin rounded-full border-2 border-mist border-t-ink" /></div>}

      {d && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <OvKpi label="New leads" cur={d.current.leads} prev={d.previous.leads} series={ser('leads')} color="#b8893f" />
          <OvKpi label="New partners" cur={d.current.partners} prev={d.previous.partners} series={ser('partners')} color="#0b0b0c" />
          <OvKpi label="New customers" cur={d.current.customers} prev={d.previous.customers} series={ser('customers')} color="#2563eb" />
          <OvKpi label="Bookings" cur={d.current.bookings} prev={d.previous.bookings} series={ser('bookings')} color="#16a34a" />
          <OvKpi label="GMV" cur={Number(d.current.gmv)} prev={Number(d.previous.gmv)} series={ser('gmv')} money color="#16a34a" />
        </div>
      )}

      {d && <p className="mt-4 text-xs text-stone">Day buckets in Europe/Zurich. GMV excludes declined & cancelled bookings.</p>}
    </div>
  );
}

/* ── Finance ───────────────────────────────────────────────────────────── */
const FIN_PERIODS = [{ days: 7, label: '7 days' }, { days: 30, label: '30 days' }, { days: 90, label: '90 days' }, { days: 36500, label: 'All' }];

// Lazy-load xlsx (keeps it out of the main bundle) and download a workbook.
async function downloadSheet(filename, rows) {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, filename);
}

function FinStat({ label, value, sub, accent }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? 'border-ink/15 bg-ink text-cloud' : 'border-mist bg-cloud'}`}>
      <div className={`text-[0.65rem] font-semibold uppercase tracking-wider ${accent ? 'text-cloud/70' : 'text-stone'}`}>{label}</div>
      <div className="font-display mt-1 text-2xl tnum">{value}</div>
      {sub && <div className={`mt-0.5 text-[0.65rem] ${accent ? 'text-cloud/60' : 'text-stone'}`}>{sub}</div>}
    </div>
  );
}

function Finance() {
  const [days, setDays] = useState(30);
  const [fin, setFin] = useState(null);
  const [err, setErr] = useState('');
  const [rows, setRows] = useState(null);
  const [exporting, setExporting] = useState('');
  const pager = usePager(rows, 25);

  useEffect(() => {
    setFin(null); setErr('');
    adminFinancials(days).then(setFin).catch((e) => { setErr(e.message); setFin(false); });
  }, [days]);
  useEffect(() => { bookingsExport(5000).then(setRows).catch(() => setRows([])); }, []);

  async function exportBookings() {
    setExporting('bookings');
    try {
      const data = (rows && rows.length ? rows : await bookingsExport(5000));
      await downloadSheet('airluxo-bookings.xlsx', data.map((b) => ({
        Date: fmtDate(b.created_at), Status: b.status, Partner: b.company_name || '',
        Customer: b.customer || '', Car: b.car_label || '', From: b.start_date || '', To: b.end_date || '',
        Plan: b.plan, Base: Number(b.base_amount) || 0, 'Add-ons': Number(b.addons_amount) || 0,
        'Service fee': Number(b.service_fee) || 0, Discount: Number(b.discount_amount) || 0,
        'Loyalty credit': Number(b.loyalty_credit) || 0, Total: Number(b.total_amount) || 0,
        'Host commission (est)': Number(b.host_commission_est) || 0,
      })));
    } catch (e) { setErr(e.message); } finally { setExporting(''); }
  }
  async function exportPartners() {
    setExporting('partners');
    try {
      const ps = await listPartners();
      await downloadSheet('airluxo-partners.xlsx', ps.map((p) => ({
        Company: p.company_name || '', Status: partnerStatus(p), Plan: p.plan || 'free',
        Cars: Number(p.car_count) || 0, Email: p.login_email || p.prospect_contact_email || '',
        Phone: p.phone || '', City: p.prospect_city || '', VAT: p.prospect_vat || '',
        Website: p.prospect_website || '', Source: p.prospect_source || '',
        Joined: fmtDate(p.created_at), Archived: p.archived_at ? fmtDate(p.archived_at) : '',
      })));
    } catch (e) { setErr(e.message); } finally { setExporting(''); }
  }
  async function exportCustomers() {
    setExporting('customers');
    try {
      const cs = await listCustomers();
      await downloadSheet('airluxo-customers.xlsx', cs.map((c) => ({
        Name: c.full_name || '', Email: c.email || '', Phone: c.phone || '',
        Bookings: Number(c.bookings_count) || 0, Completed: Number(c.completed_count) || 0,
        'Gross spend': Number(c.gross) || 0, 'Loyalty points': Number(c.loyalty_points) || 0,
        'Licence verified': c.licence_verified ? 'yes' : 'no',
        'Marketing opt-in': c.marketing_opt_in ? 'yes' : 'no', Joined: fmtDate(c.created_at),
      })));
    } catch (e) { setErr(e.message); } finally { setExporting(''); }
  }

  const exportBtn = 'ring-lux flex items-center gap-1.5 rounded-full border border-mist bg-cloud px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:border-ink disabled:opacity-50';

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(1.6rem,3vw,2.2rem)] leading-tight">Finance</h1>
          <p className="mt-1 text-sm text-stone">What we earn (subscriptions + booking fees) and spend (discounts, credits). Figures marked est. use each partner’s current plan rate.</p>
        </div>
        <div className="inline-flex shrink-0 rounded-full border border-mist bg-cloud p-1">
          {FIN_PERIODS.map((p) => (
            <button key={p.days} onClick={() => setDays(p.days)}
              className={`ring-lux rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${days === p.days ? 'bg-ink text-cloud' : 'text-stone hover:text-ink'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {err && <p className="mt-4 text-sm text-red-600">{err}</p>}
      {fin === null && <div className="grid place-items-center py-20"><span className="h-6 w-6 animate-spin rounded-full border-2 border-mist border-t-ink" /></div>}

      {fin && (
        <>
          <div className="mt-6">
            <SubLabel>Revenue · this period</SubLabel>
            <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <FinStat label="Net earnings · est." value={chf(fin.net)} sub="fees + commission − spend" accent />
              <FinStat label="Subscriptions · MRR" value={chf(fin.subscriptions.mrr)} sub={`${fin.subscriptions.pro} Pro · ${fin.subscriptions.max} Max · ${fin.subscriptions.free} Free`} />
              <FinStat label="Service fees" value={chf(fin.revenue.service_fees)} sub={`${fin.revenue.bookings} bookings`} />
              <FinStat label="Host commission · est." value={chf(fin.revenue.host_commission)} sub={`GMV ${chf(fin.revenue.gmv)}`} />
            </div>
          </div>
          <div className="mt-5">
            <SubLabel>Spend · this period</SubLabel>
            <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <FinStat label="Discounts given" value={chf(fin.spend.discounts)} />
              <FinStat label="Loyalty credits" value={chf(fin.spend.loyalty_credits)} />
              <FinStat label="Affiliate commission" value={chf(fin.spend.affiliate_commission)} sub="recorded, not deducted" />
            </div>
          </div>
        </>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <SubLabel>Booking history</SubLabel>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportBookings} disabled={!!exporting} className={exportBtn}><Icon.ArrowUpRight width={14} height={14} /> {exporting === 'bookings' ? 'Exporting…' : 'Bookings (Excel)'}</button>
          <button onClick={exportPartners} disabled={!!exporting} className={exportBtn}><Icon.ArrowUpRight width={14} height={14} /> {exporting === 'partners' ? 'Exporting…' : 'Partners (Excel)'}</button>
          <button onClick={exportCustomers} disabled={!!exporting} className={exportBtn}><Icon.ArrowUpRight width={14} height={14} /> {exporting === 'customers' ? 'Exporting…' : 'Customers (Excel)'}</button>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-mist bg-cloud">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-mist text-left text-[0.65rem] uppercase tracking-wider text-stone">
              {['Date', 'Partner', 'Customer', 'Car', 'Status', 'Base', 'Add-ons', 'Service', 'Disc.', 'Total', 'Comm. est'].map((h) => (
                <th key={h} className="px-4 py-3 font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows === null && <tr><td colSpan={11} className="px-4 py-6 text-center text-stone">Loading…</td></tr>}
            {rows && rows.length === 0 && <tr><td colSpan={11} className="px-4 py-6 text-center text-stone">No bookings yet.</td></tr>}
            {pager.slice.map((b, i) => (
              <tr key={i} className="border-b border-mist/60 bg-paper last:border-0">
                <td className="whitespace-nowrap px-4 py-3 text-stone">{fmtDate(b.created_at)}</td>
                <td className="px-4 py-3">{b.company_name || '—'}</td>
                <td className="px-4 py-3 text-stone">{b.customer || '—'}</td>
                <td className="px-4 py-3 text-stone">{b.car_label || '—'}</td>
                <td className="whitespace-nowrap px-4 py-3"><span className="rounded-full bg-cloud px-2 py-0.5 text-xs">{b.status}</span></td>
                <td className="px-4 py-3 tnum text-stone">{chf(b.base_amount)}</td>
                <td className="px-4 py-3 tnum text-stone">{chf(b.addons_amount)}</td>
                <td className="px-4 py-3 tnum text-stone">{chf(b.service_fee)}</td>
                <td className="px-4 py-3 tnum text-stone">{chf(b.discount_amount)}</td>
                <td className="px-4 py-3 tnum font-semibold">{chf(b.total_amount)}</td>
                <td className="px-4 py-3 tnum text-go">{chf(b.host_commission_est)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePager pager={pager} />
    </div>
  );
}

function Pipeline() {
  const [rows, setRows] = useState(null);
  const [creating, setCreating] = useState(false);
  const [claiming, setClaiming] = useState(null);
  const [dragOver, setDragOver] = useState(null); // stage key being dragged over
  const [open, setOpen] = useState(null); // prospect opened as a full view (drill-down)
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

  // A lead opened from the board takes over the main area (next to the menu), with
  // breadcrumbs back to the pipeline — instead of a modal.
  if (open) return <LeadDetailView p={open} onBack={() => { setOpen(null); load(); }} />;

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
                  <ProspectCard key={p.id} p={p} onClaim={setClaiming} onDeleted={load} onOpen={setOpen} onDragEnd={() => setDragOver(null)} />
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

function ProspectCard({ p, onClaim, onDeleted, onOpen, onDragEnd }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [dragging, setDragging] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
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

  async function doDelete() {
    setDelBusy(true); setErr('');
    try { await deletePartner(p.id); onDeleted?.(); }
    catch (e) { setErr(e.message || 'Could not delete.'); setDelBusy(false); setConfirming(false); }
  }

  return (
    <div
      draggable={!confirming}
      onDragStart={(e) => { e.dataTransfer.setData('text/plain', p.id); e.dataTransfer.effectAllowed = 'move'; setDragging(true); }}
      onDragEnd={() => { setDragging(false); onDragEnd?.(); }}
      className={`group relative cursor-grab rounded-2xl border border-mist bg-cloud p-3 shadow-[0_10px_30px_-24px_rgba(11,11,12,0.5)] transition-opacity active:cursor-grabbing ${dragging ? 'opacity-40' : ''}`}
    >
      <button
        type="button"
        onClick={() => onOpen(p)}
        title="Open lead"
        className="ring-lux absolute right-8 top-1.5 z-10 grid h-6 w-6 place-items-center rounded-md text-stone/50 opacity-0 transition-all hover:rotate-45 hover:text-ink group-hover:opacity-100"
      ><Icon.Gear width={15} height={15} /></button>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        title="Delete lead"
        className="ring-lux absolute right-1.5 top-1.5 z-10 grid h-6 w-6 place-items-center rounded-md text-stone/50 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
      >✕</button>
      {confirming && (
        <div className="absolute inset-0 z-20 grid place-items-center rounded-2xl bg-paper/95 p-3 text-center backdrop-blur-[1px]">
          <div>
            <p className="text-xs font-semibold text-ink">Delete this lead permanently?</p>
            {err && <p className="mt-1 text-[0.7rem] text-red-600">{err}</p>}
            <div className="mt-2 flex justify-center gap-2">
              <button type="button" onClick={() => { setConfirming(false); setErr(''); }} disabled={delBusy}
                className="ring-lux rounded-lg border border-mist px-2.5 py-1 text-xs font-semibold text-ink transition-colors hover:border-ink disabled:opacity-60">Cancel</button>
              <button type="button" onClick={doDelete} disabled={delBusy}
                className="ring-lux rounded-lg border border-red-300 px-2.5 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60">{delBusy ? 'Deleting…' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
      <button type="button" onClick={() => onOpen(p)} className="ring-lux block text-left font-display text-sm leading-tight hover:underline">{p.company_name}</button>
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

// Firecrawl ingest panel inside the lead modal: paste/keep the website, "Analyze
// website" → extract brand kit + USP + tech stack + car images. Polls the async fleet
// crawl until ready. The founder reviews + applies the result in U6 (review/apply).
const INGEST_LABELS = {
  queued: 'Queued', scraping: 'Reading homepage…', crawling: 'Homepage ready — fetching more car images…',
  enriching: 'Refining…', ready: 'Ready to review', failed: 'Failed',
};
const isIngestRunning = (s) => ['queued', 'scraping', 'crawling', 'enriching'].includes(s);
// The brand kit + USP are reviewable as soon as the homepage scrape lands (status past
// 'scraping'); the fleet crawl only adds more images in the background.
const isReviewable = (s) => ['crawling', 'enriching', 'ready'].includes(s);

function IngestPanel({ partnerId, website, onReview }) {
  const [job, setJob] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    latestIngestJob(partnerId).then((j) => { if (alive) setJob(j); }).catch(() => {});
    return () => { alive = false; };
  }, [partnerId]);

  // Poll while a crawl is still running (the cron finalizes it server-side).
  useEffect(() => {
    if (!job || !isIngestRunning(job.status)) return;
    const t = setInterval(() => {
      latestIngestJob(partnerId).then((j) => { if (j) setJob(j); }).catch(() => {});
    }, 4000);
    return () => clearInterval(t);
  }, [partnerId, job?.status]);

  async function analyze() {
    if (!website || !website.trim()) { setErr('Add a website first.'); return; }
    setBusy(true); setErr('');
    try { setJob(await startIngest(partnerId, website.trim())); }
    catch (e) { setErr(e.message || 'Could not analyze the website.'); }
    finally { setBusy(false); }
  }

  const status = job?.status;
  const imgCount = Array.isArray(job?.images) ? job.images.length : 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-stone">Brand &amp; site ingest</span>
        <div className="flex items-center gap-2">
          {job && isReviewable(status) && onReview && (
            <button type="button" onClick={onReview}
              className="ring-lux rounded-full border border-ink px-4 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-cloud">
              Review &amp; apply
            </button>
          )}
          <button type="button" onClick={analyze} disabled={busy || ['queued', 'scraping'].includes(status)}
            className="ring-lux rounded-full bg-ink px-4 py-1.5 text-xs font-semibold text-cloud transition-colors hover:bg-void disabled:opacity-60">
            {busy ? 'Starting…' : (job ? 'Re-analyze website' : 'Analyze website')}
          </button>
        </div>
      </div>
      {job && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone">
          <span className={`rounded-full px-2 py-0.5 font-semibold ${status === 'failed' ? 'bg-red-50 text-red-600' : status === 'ready' ? 'bg-go/10 text-go' : 'bg-cloud text-ink'}`}>
            {INGEST_LABELS[status] || status}
            {isIngestRunning(status) && <span className="ml-1 animate-pulse">●</span>}
          </span>
          {imgCount > 0 && <span>{imgCount} car {imgCount === 1 ? 'image' : 'images'}</span>}
          {job.screenshot_url && (
            <a href={job.screenshot_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-ink hover:underline">
              Screenshot <Icon.ArrowUpRight width={13} height={13} />
            </a>
          )}
          {job.error && <span className="text-red-600">{job.error}</span>}
          {job.created_at && <span>· {fmtDateTime(job.created_at)}</span>}
        </div>
      )}
      <p className="mt-1.5 text-[0.7rem] text-stone">Extracts brand colours, fonts, logo, USP, tech stack &amp; car images. Review &amp; apply in the prospect&apos;s brand panel.</p>
      {err && <p className="mt-1 text-[0.7rem] text-red-600">{err}</p>}
    </div>
  );
}

function ColorField({ label, value, onChange }) {
  const safe = /^#[0-9a-fA-F]{6}$/.test(value || '') ? value : '#000000';
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-stone">{label}</span>
      <div className="flex items-center gap-2">
        <input type="color" value={safe} onChange={(e) => onChange(e.target.value)} className="h-9 w-10 shrink-0 cursor-pointer rounded border border-mist bg-cloud" />
        <input value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="#RRGGBB"
          className="ring-lux w-full rounded-xl border border-mist bg-cloud px-3 py-2 text-sm outline-none transition-colors focus:border-ink" />
      </div>
    </label>
  );
}

function CarField({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[0.7rem] font-semibold text-stone">{label}</span>
      <input value={value || ''} onChange={(e) => onChange(e.target.value)}
        className="ring-lux w-full rounded-lg border border-mist bg-paper px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-ink" />
    </label>
  );
}
function CarSelect({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[0.7rem] font-semibold text-stone">{label}</span>
      <select value={value || ''} onChange={(e) => onChange(e.target.value)}
        className="ring-lux w-full rounded-lg border border-mist bg-paper px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-ink">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

// Strip empty fields → the kit shape brandKitToVars/Embed expect.
function cleanKit(k) {
  const colors = {};
  for (const key of ['primary', 'accent', 'bg', 'text']) if (k.colors?.[key]) colors[key] = k.colors[key].trim();
  const fonts = {};
  if (k.fonts?.display) fonts.display = k.fonts.display.trim();
  if (k.fonts?.body) fonts.body = k.fonts.body.trim();
  if (k.fonts?.url) fonts.url = k.fonts.url.trim();
  const out = { colors, fonts };
  if (k.logo_url) out.logo_url = k.logo_url.trim();
  return out;
}

// U6: founder reviews the extracted brand kit + USP + tech stack + scraped car images,
// edits, and applies — setting the live brand_kit (themes the preview/storefront) and
// attaching photo galleries to the partner's cars.
function ReviewView({ partnerId, companyName, onBack, toPipeline }) {
  const [data, setData] = useState(null);
  const [kit, setKit] = useState({ colors: {}, fonts: {}, logo_url: '' });
  const [assigns, setAssigns] = useState([]); // parallel to data.job.images
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [savingKit, setSavingKit] = useState(false);
  const [savingImgs, setSavingImgs] = useState(false);
  const [slug, setSlug] = useState('');
  const [published, setPublished] = useState(false);
  const [layout, setLayoutState] = useState(mergeLayout(null)); // per-partner section/layout flags
  const [newLogoUrl, setNewLogoUrl] = useState('');            // brand-strip: paste-a-logo-URL field
  const [uploadingLogo, setUploadingLogo] = useState(false);  // brand-strip: file upload in flight
  const [showLogoPicker, setShowLogoPicker] = useState(false);// brand-strip: scraped-image picker open
  const [savingSite, setSavingSite] = useState(false);
  const [legal, setLegal] = useState({});
  const [savingLegal, setSavingLegal] = useState(false);
  const [domains, setDomains] = useState([]);
  const [newHost, setNewHost] = useState('');
  const [busyDomain, setBusyDomain] = useState(false);
  const [newCar, setNewCar] = useState(null); // null = closed; else the car-form fields
  const [savingCar, setSavingCar] = useState(false);
  const [carRows, setCarRows] = useState([]); // editable copy of the extracted car table
  const [carSel, setCarSel] = useState(new Set());
  const [creatingCars, setCreatingCars] = useState(false);

  // Re-pull the review payload (after creating/attaching cars) and reset image selection.
  async function reloadReview() {
    const d = await partnerBrandReview(partnerId);
    setData(d);
    setAssigns((d?.job?.images || []).map(() => ({ selected: false, listingId: '', type: 'interior' })));
    setCarRows(d?.job?.cars || []);
    setCarSel(new Set());
    return d;
  }

  useEffect(() => {
    let alive = true;
    partnerBrandReview(partnerId).then((d) => {
      if (!alive) return;
      setData(d);
      const live = d?.brand_kit && Object.keys(d.brand_kit).length;
      setKit(normalizeKit(live ? d.brand_kit : d?.brand_kit_raw));
      const imgs = d?.job?.images || [];
      setAssigns(imgs.map(() => ({ selected: false, listingId: '', type: 'interior' })));
      setCarRows(d?.job?.cars || []);
      setSlug(d?.slug || slugify(d?.company_name || ''));
      setPublished(!!d?.site_published);
      setLayoutState(mergeLayout((d?.site_config || {}).layout));
      setLegal(seedLegal(d?.legal, d?.company_name, (d?.partner_pages || {}).contact));
      setLoading(false);
    }).catch((e) => { setErr(e.message || 'Could not load.'); setLoading(false); });
    listPartnerDomains(partnerId).then((r) => alive && setDomains(r)).catch(() => {});
    return () => { alive = false; };
  }, [partnerId]);

  useEffect(() => { if (kit.fonts?.url) loadBrandFont(kit.fonts.url); }, [kit.fonts?.url]);

  const setColor = (key) => (v) => setKit((s) => ({ ...s, colors: { ...s.colors, [key]: v } }));
  const setFont = (key) => (e) => setKit((s) => ({ ...s, fonts: { ...s.fonts, [key]: e.target.value } }));
  const setAssign = (i, patch) => setAssigns((s) => s.map((a, j) => (j === i ? { ...a, ...patch } : a)));

  const images = data?.job?.images || [];
  const listings = data?.listings || [];
  const pages = data?.partner_pages || {};
  const tech = data?.tech_stack || {};
  const previewLink = data ? `${siteOrigin()}/?embed=${partnerId}&preview=${data.preview_token}` : '#';
  const previewVars = brandKitToVars(cleanKit(kit)) || {};

  async function applyKit() {
    setSavingKit(true); setErr(''); setMsg('');
    try { await setPartnerBrandKit(partnerId, cleanKit(kit)); setMsg('Brand kit applied — live on the preview.'); }
    catch (e) { setErr(e.message || 'Could not apply the brand kit.'); }
    finally { setSavingKit(false); }
  }

  async function applyImages() {
    const groups = {};
    assigns.forEach((a, i) => { if (a.selected && a.listingId && images[i]) (groups[a.listingId] ||= []).push({ url: images[i].url, type: a.type, caption: '' }); });
    const carIds = Object.keys(groups);
    if (carIds.length === 0) { setErr('Select images and assign each to a car first.'); return; }
    setSavingImgs(true); setErr(''); setMsg('');
    try {
      for (const lid of carIds) await applyListingPhotos(lid, groups[lid]);
      setMsg(`Photos applied to ${carIds.length} ${carIds.length === 1 ? 'car' : 'cars'}.`);
      await reloadReview();
    } catch (e) { setErr(e.message || 'Could not apply photos.'); }
    finally { setSavingImgs(false); }
  }

  // Selected scraped images → a photos[] gallery (first selected = hero unless tagged).
  function selectedPhotos() {
    const picked = assigns.map((a, i) => ({ ...a, i })).filter((a) => a.selected && images[a.i]);
    const anyHero = picked.some((a) => a.type === 'hero');
    return picked.map((a, n) => ({ url: images[a.i].url, type: (!anyHero && n === 0) ? 'hero' : a.type, caption: '' }));
  }

  const BLANK_CAR = { make: '', model: '', year: '', category: 'Sport', price_per_day: '', power: '', seats: '2', gearbox: 'Auto', fuel: 'Petrol', exterior_color: '', interior_color: '', mileage_per_day: '250', city: '', description: '' };

  async function createCar() {
    if (!newCar?.make?.trim() && !newCar?.model?.trim()) { setErr('Add at least a make or model.'); return; }
    setSavingCar(true); setErr(''); setMsg('');
    try {
      await createPartnerListing(partnerId, newCar, selectedPhotos());
      setNewCar(null);
      await reloadReview();
      setMsg('Car added to the fleet.');
    } catch (e) { setErr(e.message || 'Could not create the car.'); }
    finally { setSavingCar(false); }
  }

  // Editable extracted-car table → bulk-create listings.
  const setCarRow = (i, patch) => setCarRows((s) => s.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const toggleCar = (i) => setCarSel((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });

  async function createCarsBulk() {
    const idxs = [...carSel];
    if (!idxs.length) { setErr('Select cars to create.'); return; }
    setCreatingCars(true); setErr(''); setMsg('');
    try {
      for (const i of idxs) {
        const c = carRows[i];
        const fields = {
          make: c.make, model: c.model, year: c.year, price_per_day: c.price_per_day,
          power: c.power, seats: c.seats, gearbox: c.transmission || c.gearbox, fuel: c.fuel, category: 'Sport',
        };
        const photos = c.image_url ? [{ url: c.image_url, type: 'hero', caption: '' }] : [];
        await createPartnerListing(partnerId, fields, photos);
      }
      setMsg(`Created ${idxs.length} ${idxs.length === 1 ? 'car' : 'cars'} from the scraped table.`);
      await reloadReview();
    } catch (e) { setErr(e.message || 'Could not create the cars.'); }
    finally { setCreatingCars(false); }
  }

  async function savePublish(makeLive) {
    if (!slug.trim()) { setErr('Set a site address (slug) first.'); return; }
    setSavingSite(true); setErr(''); setMsg('');
    try {
      const siteCfg = { ...mapSiteConfig(data?.site_config, pages, data?.company_name), layout };
      await setPartnerSite(partnerId, slug.trim(), siteCfg, makeLive);
      setPublished(makeLive);
      setMsg(makeLive ? 'Site published — live at the public address.' : 'Site unpublished.');
    } catch (e) { setErr(/duplicate|unique/i.test(e.message || '') ? 'That address is taken — pick another slug.' : (e.message || 'Could not update the site.')); }
    finally { setSavingSite(false); }
  }

  const siteUrl = `${siteOrigin()}/p/${slug || '…'}`;

  async function addDomain() {
    if (!newHost.trim()) return;
    setBusyDomain(true); setErr(''); setMsg('');
    try { await addPartnerDomain(partnerId, newHost.trim()); setNewHost(''); setDomains(await listPartnerDomains(partnerId)); setMsg('Domain added — point its DNS, then mark verified.'); }
    catch (e) { setErr(/duplicate|unique/i.test(e.message || '') ? 'That domain is already registered.' : (e.message || 'Could not add the domain.')); }
    finally { setBusyDomain(false); }
  }
  async function toggleVerified(d) {
    setBusyDomain(true); setErr('');
    try { await setDomainVerified(d.id, !d.verified); setDomains(await listPartnerDomains(partnerId)); }
    catch (e) { setErr(e.message || 'Could not update.'); }
    finally { setBusyDomain(false); }
  }
  async function dropDomain(d) {
    setBusyDomain(true); setErr('');
    try { await removePartnerDomain(d.id); setDomains(await listPartnerDomains(partnerId)); }
    catch (e) { setErr(e.message || 'Could not remove.'); }
    finally { setBusyDomain(false); }
  }

  async function saveLegal() {
    setSavingLegal(true); setErr(''); setMsg('');
    try { await setPartnerLegal(partnerId, legal, buildLegalPages(legal)); setMsg('Legal pages generated & saved (Impressum · Datenschutz · AGB).'); }
    catch (e) { setErr(e.message || 'Could not save legal pages.'); }
    finally { setSavingLegal(false); }
  }

  const techChips = [
    tech.cms && `CMS: ${tech.cms}`,
    Array.isArray(tech.payments) && tech.payments.length && `Pay: ${tech.payments.join(', ')}`,
    tech.booking && `Booking: ${tech.booking}`,
    tech.ecommerce && `Shop: ${tech.ecommerce}`,
    Array.isArray(tech.analytics) && tech.analytics.length && `Analytics: ${tech.analytics.join(', ')}`,
  ].filter(Boolean);
  const selectedCount = assigns.filter((a) => a.selected).length;

  return (
    <div className="w-full">
      <Crumbs items={[{ label: 'Pipeline', onClick: toPipeline }, { label: companyName || data?.company_name || 'Lead', onClick: onBack }, { label: 'Brand & pitch' }]} />
      <div className="rounded-[var(--radius-card)] border border-mist bg-paper p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl">Brand &amp; pitch — {data?.company_name || companyName || ''}</h2>
            <p className="mt-1 text-xs text-stone">Review the extracted brand kit, USP and car images, then apply. Applying the kit themes the preview live.</p>
          </div>
          <a href={previewLink} target="_blank" rel="noreferrer" className="ring-lux shrink-0 rounded-lg border border-mist px-2.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-ink">Preview ↗</a>
        </div>

        {loading ? <p className="mt-6 text-sm text-stone">Loading…</p> : (
          <div className="mt-5 space-y-6">
            {/* Brand kit */}
            <section className="grid gap-5 md:grid-cols-2">
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-ink">Brand kit</h3>
                <div className="grid grid-cols-2 gap-3">
                  <ColorField label="Primary" value={kit.colors.primary} onChange={setColor('primary')} />
                  <ColorField label="Accent" value={kit.colors.accent} onChange={setColor('accent')} />
                  <ColorField label="Background" value={kit.colors.bg} onChange={setColor('bg')} />
                  <ColorField label="Text" value={kit.colors.text} onChange={setColor('text')} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <AdminField label="Display font" value={kit.fonts.display || ''} onChange={setFont('display')} placeholder="Montserrat" />
                  <AdminField label="Body font" value={kit.fonts.body || ''} onChange={setFont('body')} placeholder="Inter" />
                </div>
                <AdminField label="Font stylesheet URL" value={kit.fonts.url || ''} onChange={setFont('url')} placeholder="https://fonts.googleapis.com/css2?…" />
                <AdminField label="Logo URL" value={kit.logo_url || ''} onChange={(e) => setKit((s) => ({ ...s, logo_url: e.target.value }))} placeholder="https://…/logo.svg" />
                <button type="button" onClick={applyKit} disabled={savingKit}
                  className="ring-lux w-full rounded-full bg-ink py-2.5 text-sm font-semibold text-cloud transition-colors hover:bg-void disabled:opacity-60">
                  {savingKit ? 'Applying…' : 'Apply brand kit (go live)'}
                </button>
              </div>

              {/* Live preview + intel */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-ink">Preview</h3>
                <div style={previewVars} className="overflow-hidden rounded-xl border border-mist">
                  <div className="bg-paper p-4">
                    {kit.logo_url
                      ? <img src={kit.logo_url} alt="logo" className="mb-3 h-7 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      : <div className="mb-3 font-display text-lg text-ink">{data?.company_name}</div>}
                    <div className="font-display text-2xl text-gold">Drive something extraordinary</div>
                    <p className="mt-1 text-sm text-ink/70">{pages.usp || 'Your fleet, on the AIRLUXO engine.'}</p>
                    <button className="mt-3 rounded-full bg-gold px-4 py-1.5 text-xs font-semibold text-paper">Book now</button>
                  </div>
                </div>
                {pages.usp && <p className="text-xs text-stone"><span className="font-semibold text-ink">USP:</span> {pages.usp}</p>}
                {techChips.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {techChips.map((c, i) => <span key={i} className="rounded-full bg-cloud px-2 py-0.5 text-[0.7rem] font-semibold text-ink">{c}</span>)}
                  </div>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {data?.job?.screenshot_url && (
                    <a href={data.job.screenshot_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-ink hover:underline">
                      Original site screenshot <Icon.ArrowUpRight width={13} height={13} />
                    </a>
                  )}
                  {data?.drive_folder_url && (
                    <a href={data.drive_folder_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-ink hover:underline">
                      Car images in Drive <Icon.ArrowUpRight width={13} height={13} />
                    </a>
                  )}
                </div>
              </div>
            </section>

            {/* Cars & images — build the fleet from the scraped photos */}
            <section className="border-t border-mist pt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-ink">Cars &amp; images <span className="font-normal text-stone">({listings.length} {listings.length === 1 ? 'car' : 'cars'} · {images.length} images · {selectedCount} selected)</span></h3>
                {data?.job?.status === 'crawling' && <span className="text-xs text-stone animate-pulse">fetching more…</span>}
              </div>

              {/* Scraped car table — AI-extracted from the fleet page; edit then bulk-create */}
              {carRows.length > 0 && (
                <div className="mt-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone">Scraped cars ({carRows.length}) — edit, select, create</span>
                    <button type="button" onClick={createCarsBulk} disabled={creatingCars || carSel.size === 0}
                      className="ring-lux rounded-full bg-ink px-4 py-1.5 text-xs font-semibold text-cloud transition-colors hover:bg-void disabled:opacity-50">
                      {creatingCars ? 'Creating…' : `Create ${carSel.size || ''} selected`}
                    </button>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-mist">
                    <table className="w-full text-sm">
                      <thead className="bg-cloud text-left text-[0.7rem] uppercase tracking-wide text-stone">
                        <tr>
                          <th className="p-2"><input type="checkbox" checked={carSel.size === carRows.length && carRows.length > 0} onChange={(e) => setCarSel(e.target.checked ? new Set(carRows.map((_, i) => i)) : new Set())} /></th>
                          <th className="p-2">Photo</th><th className="p-2">Make</th><th className="p-2">Model</th>
                          <th className="p-2">Year</th><th className="p-2">CHF/day</th><th className="p-2">Power</th>
                          <th className="p-2">Seats</th><th className="p-2">Gearbox</th><th className="p-2">Fuel</th>
                        </tr>
                      </thead>
                      <tbody>
                        {carRows.map((c, i) => {
                          const tin = 'w-full min-w-[4.5rem] rounded border border-mist bg-paper px-1.5 py-1 text-xs outline-none focus:border-ink';
                          return (
                            <tr key={i} className={`border-t border-mist ${carSel.has(i) ? 'bg-cloud/40' : ''}`}>
                              <td className="p-2 align-middle"><input type="checkbox" checked={carSel.has(i)} onChange={() => toggleCar(i)} /></td>
                              <td className="p-2">{c.image_url ? <img src={c.image_url} alt="" className="h-9 w-14 rounded object-cover" onError={(e) => { e.currentTarget.style.opacity = '0.3'; }} /> : <span className="text-stone">—</span>}</td>
                              <td className="p-1"><input value={c.make || ''} onChange={(e) => setCarRow(i, { make: e.target.value })} className={tin} /></td>
                              <td className="p-1"><input value={c.model || ''} onChange={(e) => setCarRow(i, { model: e.target.value })} className={tin} /></td>
                              <td className="p-1"><input value={c.year || ''} onChange={(e) => setCarRow(i, { year: e.target.value })} className={`${tin} min-w-[3.5rem]`} /></td>
                              <td className="p-1"><input value={c.price_per_day || ''} onChange={(e) => setCarRow(i, { price_per_day: e.target.value })} className={`${tin} min-w-[4rem]`} /></td>
                              <td className="p-1"><input value={c.power || ''} onChange={(e) => setCarRow(i, { power: e.target.value })} className={`${tin} min-w-[3.5rem]`} /></td>
                              <td className="p-1"><input value={c.seats || ''} onChange={(e) => setCarRow(i, { seats: e.target.value })} className={`${tin} min-w-[3rem]`} /></td>
                              <td className="p-1"><input value={c.transmission || c.gearbox || ''} onChange={(e) => setCarRow(i, { transmission: e.target.value })} className={tin} /></td>
                              <td className="p-1"><input value={c.fuel || ''} onChange={(e) => setCarRow(i, { fuel: e.target.value })} className={tin} /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-1.5 text-[0.7rem] text-stone">AI-extracted from the fleet page — review/fix, select, then create. Each becomes a listing (its photo = card image) in the preview &amp; website. Re-analyze to refresh.</p>
                </div>
              )}

              {/* Existing fleet */}
              {listings.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                  {listings.map((l) => {
                    const ph = Array.isArray(l.photos) ? l.photos.length : 0;
                    return (
                      <div key={l.id} className="flex items-center gap-2 rounded-xl border border-mist bg-cloud p-2">
                        {l.photo_url ? <img src={l.photo_url} alt="" className="h-10 w-14 shrink-0 rounded-md object-cover" /> : <div className="grid h-10 w-14 shrink-0 place-items-center rounded-md bg-paper text-[0.6rem] text-stone">no img</div>}
                        <div className="min-w-0">
                          <div className="truncate text-xs font-semibold text-ink">{[l.make, l.model].filter(Boolean).join(' ') || 'Car'}</div>
                          <div className="text-[0.7rem] text-stone">{ph} photo{ph === 1 ? '' : 's'}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Scraped images → select, tag, build a car */}
              {images.length === 0
                ? <p className="mt-3 text-xs text-stone">No images extracted yet.</p>
                : (
                  <>
                    <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
                      {images.map((im, i) => (
                        <div key={i} className={`overflow-hidden rounded-xl border ${assigns[i]?.selected ? 'border-ink ring-2 ring-ink/20' : 'border-mist'}`}>
                          <button type="button" onClick={() => setAssign(i, { selected: !assigns[i]?.selected })} className="block w-full">
                            <img src={im.url} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" onError={(e) => { e.currentTarget.style.opacity = '0.3'; }} />
                          </button>
                          <div className="space-y-1 p-1.5">
                            <select value={assigns[i]?.type || 'interior'} onChange={(e) => setAssign(i, { type: e.target.value, selected: true })}
                              className="ring-lux w-full rounded-md border border-mist bg-cloud px-1 py-1 text-[0.7rem] outline-none focus:border-ink">
                              <option value="hero">Hero</option>
                              <option value="interior">Interior</option>
                              <option value="detail">Detail</option>
                            </select>
                            {listings.length > 0 && (
                              <select value={assigns[i]?.listingId || ''} onChange={(e) => setAssign(i, { listingId: e.target.value, selected: !!e.target.value })}
                                className="ring-lux w-full rounded-md border border-mist bg-cloud px-1 py-1 text-[0.7rem] outline-none focus:border-ink">
                                <option value="">— attach to —</option>
                                {listings.map((l) => <option key={l.id} value={l.id}>{[l.make, l.model].filter(Boolean).join(' ') || 'Car'}</option>)}
                              </select>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => setNewCar(BLANK_CAR)} disabled={selectedCount === 0}
                        className="ring-lux rounded-full bg-ink px-5 py-2 text-sm font-semibold text-cloud transition-colors hover:bg-void disabled:opacity-50">
                        + New car from {selectedCount || ''} selected
                      </button>
                      {listings.length > 0 && (
                        <button type="button" onClick={applyImages} disabled={savingImgs}
                          className="ring-lux rounded-full border border-ink px-5 py-2 text-sm font-semibold text-ink transition-colors hover:bg-cloud disabled:opacity-60">
                          {savingImgs ? 'Attaching…' : 'Attach selected to existing'}
                        </button>
                      )}
                    </div>
                    <p className="mt-1.5 text-[0.7rem] text-stone">Select a car&apos;s photos (tag one “Hero” = the card image), then create the car — it shows in the storefront preview &amp; the website listings.</p>
                  </>
                )}

              {/* New-car inline form */}
              {newCar && (
                <div className="mt-4 rounded-xl border border-ink/30 bg-cloud p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-ink">New car {selectedCount > 0 && <span className="font-normal text-stone">· {selectedCount} photo{selectedCount === 1 ? '' : 's'}</span>}</h4>
                    <button type="button" onClick={() => setNewCar(null)} className="text-xs font-semibold text-stone hover:text-ink">Cancel</button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
                    <CarField label="Make" value={newCar.make} onChange={(v) => setNewCar((s) => ({ ...s, make: v }))} />
                    <CarField label="Model" value={newCar.model} onChange={(v) => setNewCar((s) => ({ ...s, model: v }))} />
                    <CarField label="Year" value={newCar.year} onChange={(v) => setNewCar((s) => ({ ...s, year: v }))} />
                    <CarField label="Price / day (CHF)" value={newCar.price_per_day} onChange={(v) => setNewCar((s) => ({ ...s, price_per_day: v }))} />
                    <CarSelect label="Category" value={newCar.category} onChange={(v) => setNewCar((s) => ({ ...s, category: v }))} options={['Sport', 'Luxury', 'SUV', 'Convertible', 'Sedan', 'Electric']} />
                    <CarField label="Power (hp)" value={newCar.power} onChange={(v) => setNewCar((s) => ({ ...s, power: v }))} />
                    <CarField label="Seats" value={newCar.seats} onChange={(v) => setNewCar((s) => ({ ...s, seats: v }))} />
                    <CarSelect label="Gearbox" value={newCar.gearbox} onChange={(v) => setNewCar((s) => ({ ...s, gearbox: v }))} options={['Auto', 'Manual']} />
                    <CarSelect label="Fuel" value={newCar.fuel} onChange={(v) => setNewCar((s) => ({ ...s, fuel: v }))} options={['Petrol', 'Diesel', 'Hybrid', 'Electric']} />
                    <CarField label="Exterior colour" value={newCar.exterior_color} onChange={(v) => setNewCar((s) => ({ ...s, exterior_color: v }))} />
                    <CarField label="Interior colour" value={newCar.interior_color} onChange={(v) => setNewCar((s) => ({ ...s, interior_color: v }))} />
                    <CarField label="Free km / day" value={newCar.mileage_per_day} onChange={(v) => setNewCar((s) => ({ ...s, mileage_per_day: v }))} />
                    <CarField label="City" value={newCar.city} onChange={(v) => setNewCar((s) => ({ ...s, city: v }))} />
                  </div>
                  <label className="mt-2 block">
                    <span className="mb-1 block text-[0.7rem] font-semibold text-stone">Description</span>
                    <textarea value={newCar.description} onChange={(e) => setNewCar((s) => ({ ...s, description: e.target.value }))} rows={2}
                      className="ring-lux w-full rounded-lg border border-mist bg-paper px-2.5 py-1.5 text-sm outline-none focus:border-ink" />
                  </label>
                  <button type="button" onClick={createCar} disabled={savingCar}
                    className="ring-lux mt-3 rounded-full bg-ink px-5 py-2 text-sm font-semibold text-cloud transition-colors hover:bg-void disabled:opacity-60">
                    {savingCar ? 'Creating…' : 'Create car'}
                  </button>
                </div>
              )}
            </section>

            {/* Legal (Swiss Impressum / privacy / terms) */}
            <section className="border-t border-mist pt-4">
              <h3 className="text-sm font-bold text-ink">Legal (Impressum)</h3>
              <p className="mt-1 text-xs text-stone">Swiss Impressum · Datenschutz · AGB, generated from these fields. A starting template — review legally before publishing.</p>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                {LEGAL_FIELDS.map(([key, label]) => (
                  <label key={key} className="block">
                    <span className="mb-1 block text-[0.7rem] font-semibold text-stone">{label}</span>
                    <input value={legal[key] || ''} onChange={(e) => setLegal((s) => ({ ...s, [key]: e.target.value }))}
                      className="ring-lux w-full rounded-lg border border-mist bg-cloud px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-ink" />
                  </label>
                ))}
              </div>
              <button type="button" onClick={saveLegal} disabled={savingLegal}
                className="ring-lux mt-3 rounded-full border border-ink px-5 py-2 text-sm font-semibold text-ink transition-colors hover:bg-cloud disabled:opacity-60">
                {savingLegal ? 'Saving…' : 'Generate & save legal pages'}
              </button>
            </section>

            {/* Publish the white-label site */}
            <section className="border-t border-mist pt-4">
              <h3 className="text-sm font-bold text-ink">Website {published ? <span className="ml-1 rounded-full bg-go/10 px-2 py-0.5 text-[0.7rem] font-semibold text-go">Live</span> : <span className="ml-1 rounded-full bg-cloud px-2 py-0.5 text-[0.7rem] font-semibold text-stone">Draft</span>}</h3>
              <p className="mt-1 text-xs text-stone">Publishes a full site (home · fleet · about · contact) themed with the brand kit, seeded from the extracted copy. Edit the text later in the partner dashboard.</p>
              <div className="mt-2 flex flex-wrap items-end gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-stone">Public address</span>
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-stone">/p/</span>
                    <input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="company-name"
                      className="ring-lux rounded-xl border border-mist bg-cloud px-3 py-2 outline-none transition-colors focus:border-ink" />
                  </div>
                </label>
                <button type="button" onClick={() => savePublish(true)} disabled={savingSite}
                  className="ring-lux rounded-full bg-ink px-5 py-2 text-sm font-semibold text-cloud transition-colors hover:bg-void disabled:opacity-60">
                  {savingSite ? 'Saving…' : (published ? 'Update & republish' : 'Publish site')}
                </button>
                {published && (
                  <button type="button" onClick={() => savePublish(false)} disabled={savingSite}
                    className="ring-lux rounded-full border border-mist px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-ink disabled:opacity-60">
                    Unpublish
                  </button>
                )}
                <a href={siteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-ink hover:underline">
                  {siteUrl.replace(/^https?:\/\//, '')} <Icon.ArrowUpRight width={13} height={13} />
                </a>
              </div>
            </section>

            {/* Per-partner layout — toggles + hero variant (saved on publish/republish) */}
            <section className="border-t border-mist pt-4">
              <h3 className="text-sm font-bold text-ink">Layout</h3>
              <p className="mt-1 text-xs text-stone">Tune <span className="font-semibold text-ink">this partner&apos;s</span> site only — other partners and the marketplace are unaffected. Saved when you publish / republish.</p>
              <div className="mt-3 space-y-2">
                {[
                  ['stats', 'Hero stats row', 'Marketplace counts (240+ cars, 36 companies) — usually off for a single partner.'],
                  ['marquee', 'Brand strip', 'The scrolling luxury-brand names under the hero.'],
                  ['map', 'Fleet map', '“The fleet across Switzerland” map section.'],
                ].map(([k, label, hint]) => (
                  <label key={k} className="flex cursor-pointer items-start gap-3">
                    <input type="checkbox" checked={!!layout.show[k]}
                      onChange={() => setLayoutState((l) => ({ ...l, show: { ...l.show, [k]: !l.show[k] } }))}
                      className="mt-0.5 h-4 w-4 accent-ink" />
                    <span className="leading-tight">
                      <span className="block text-sm font-semibold text-ink">{label}</span>
                      <span className="block text-xs text-stone">{hint}</span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="mt-4">
                <span className="mb-1.5 block text-xs font-semibold text-stone">Hero layout</span>
                <div className="flex gap-2">
                  {[['split', 'Split (with image)'], ['centered', 'Centered (no image)']].map(([v, label]) => (
                    <button key={v} type="button" onClick={() => setLayoutState((l) => ({ ...l, hero: v }))}
                      className={`ring-lux rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${layout.hero === v ? 'border-ink bg-ink text-cloud' : 'border-mist bg-cloud text-ink hover:border-ink'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brand strip — text names (default) vs the partner's own logo set. */}
              <div className="mt-4">
                <span className="mb-1.5 block text-xs font-semibold text-stone">Brand strip</span>
                <div className="flex gap-2">
                  {[['text', 'Text names'], ['logos', 'Logos']].map(([v, label]) => (
                    <button key={v} type="button" onClick={() => setLayoutState((l) => ({ ...l, marquee: v }))}
                      className={`ring-lux rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${layout.marquee === v ? 'border-ink bg-ink text-cloud' : 'border-mist bg-cloud text-ink hover:border-ink'}`}>
                      {label}
                    </button>
                  ))}
                </div>

                {layout.marquee === 'logos' && (
                  <div className="mt-3 space-y-3">
                    {layout.brandLogos.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {layout.brandLogos.map((url) => (
                          <div key={url} className="group relative flex h-12 w-20 items-center justify-center rounded-lg border border-mist bg-cloud p-1.5">
                            <img src={url} alt="" className="max-h-full max-w-full object-contain" />
                            <button type="button" aria-label="Remove"
                              onClick={() => setLayoutState((l) => ({ ...l, brandLogos: l.brandLogos.filter((u) => u !== url) }))}
                              className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-ink text-cloud group-hover:flex">
                              <Icon.X width={11} height={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-xs text-stone">No logos yet — add from the scraped images, paste a URL, or upload files.</p>}

                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => setShowLogoPicker((s) => !s)}
                        className="ring-lux rounded-full border border-mist bg-cloud px-3 py-1.5 text-xs font-semibold text-ink hover:border-ink">
                        {showLogoPicker ? 'Close picker' : 'Pick from scraped'}
                      </button>
                      <label className="ring-lux cursor-pointer rounded-full border border-mist bg-cloud px-3 py-1.5 text-xs font-semibold text-ink hover:border-ink">
                        {uploadingLogo ? 'Uploading…' : 'Upload files'}
                        <input type="file" accept="image/*" multiple className="hidden" disabled={uploadingLogo}
                          onChange={async (e) => {
                            const files = Array.from(e.target.files || []); e.target.value = '';
                            if (!files.length) return;
                            setUploadingLogo(true); setErr('');
                            try {
                              const urls = [];
                              for (const f of files) urls.push(await uploadBrandAsset(partnerId, f, 'brand-logos'));
                              setLayoutState((l) => ({ ...l, brandLogos: Array.from(new Set([...l.brandLogos, ...urls])) }));
                            } catch (e2) { setErr(e2.message || 'Upload failed.'); }
                            finally { setUploadingLogo(false); }
                          }} />
                      </label>
                      <div className="flex items-center gap-1">
                        <input value={newLogoUrl} onChange={(e) => setNewLogoUrl(e.target.value)} placeholder="https://…/logo.png"
                          className="ring-lux w-48 rounded-xl border border-mist bg-cloud px-3 py-1.5 text-xs outline-none transition-colors focus:border-ink" />
                        <button type="button" disabled={!newLogoUrl.trim()}
                          onClick={() => { const u = newLogoUrl.trim(); if (u) { setLayoutState((l) => ({ ...l, brandLogos: Array.from(new Set([...l.brandLogos, u])) })); setNewLogoUrl(''); } }}
                          className="ring-lux rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-cloud disabled:opacity-50">Add</button>
                      </div>
                    </div>

                    {showLogoPicker && (
                      <div className="grid grid-cols-6 gap-2 rounded-xl border border-mist bg-paper p-2 sm:grid-cols-8">
                        {(data?.job?.images || []).map((img, i) => {
                          const url = typeof img === 'string' ? img : img.url;
                          const on = layout.brandLogos.includes(url);
                          return (
                            <button key={i} type="button"
                              onClick={() => setLayoutState((l) => ({ ...l, brandLogos: on ? l.brandLogos.filter((u) => u !== url) : Array.from(new Set([...l.brandLogos, url])) }))}
                              className={`flex h-12 items-center justify-center rounded-lg border bg-cloud p-1 ${on ? 'border-ink ring-2 ring-ink' : 'border-mist hover:border-ink'}`}>
                              <img src={url} alt="" className="max-h-full max-w-full object-contain" />
                            </button>
                          );
                        })}
                        {(data?.job?.images || []).length === 0 && <p className="col-span-full py-2 text-center text-xs text-stone">No scraped images on this partner yet.</p>}
                      </div>
                    )}
                    <p className="text-[0.7rem] text-stone">Logos save when you publish / republish. They scroll in the strip under the hero (same height).</p>
                  </div>
                )}
              </div>
            </section>

            {/* Own-domain (multi-tenant CNAME) */}
            <section className="border-t border-mist pt-4">
              <h3 className="text-sm font-bold text-ink">Own domain</h3>
              <p className="mt-1 text-xs text-stone">Point the partner&apos;s domain here: add it, set a <span className="font-semibold text-ink">CNAME → cname.vercel-dns.com</span> at their registrar + add it in the Vercel project, then mark verified. Verified domains serve the published site.</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input value={newHost} onChange={(e) => setNewHost(e.target.value.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, ''))} placeholder="cars.partner.ch"
                  className="ring-lux rounded-xl border border-mist bg-cloud px-3 py-2 text-sm outline-none transition-colors focus:border-ink" />
                <button type="button" onClick={addDomain} disabled={busyDomain || !newHost.trim()}
                  className="ring-lux rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cloud transition-colors hover:bg-void disabled:opacity-60">Add domain</button>
              </div>
              {domains.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {domains.map((d) => (
                    <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-mist bg-cloud px-3 py-2 text-sm">
                      <span className="font-semibold text-ink">{d.hostname}</span>
                      <span className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${d.verified ? 'bg-go/10 text-go' : 'bg-paper text-stone'}`}>{d.verified ? 'Verified' : 'Pending DNS'}</span>
                        <button type="button" onClick={() => toggleVerified(d)} disabled={busyDomain} className="ring-lux rounded-lg border border-mist px-2 py-1 text-xs font-semibold text-ink hover:border-ink disabled:opacity-60">{d.verified ? 'Unverify' : 'Mark verified'}</button>
                        <button type="button" onClick={() => dropDomain(d)} disabled={busyDomain} className="ring-lux rounded-lg border border-mist px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60">Remove</button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-[0.7rem] text-stone">For full isolation a partner can get a dedicated Vercel project — see docs/partner-site/own-domain-deploy.md.</p>
            </section>

            {err && <p className="text-sm text-red-600">{err}</p>}
            {msg && <p className="text-sm text-go">{msg}</p>}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button type="button" onClick={onBack} className="ring-lux rounded-full border border-mist px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink">← Back to lead</button>
        </div>
      </div>
    </div>
  );
}

// The gear on a pipeline card: full lead info, editable. Reads the prospect_* fields
// the pipeline already loaded; saves through admin-update-partner.
function LeadDetailView({ p, onBack }) {
  const [review, setReview] = useState(false);
  const [saved, setSaved] = useState(false);
  const [f, setF] = useState({
    company_name: p.company_name || '',
    contact_name: p.prospect_contact_name || '',
    contact_phone: p.prospect_contact_phone || '',
    contact_email: p.prospect_contact_email || '',
    source: p.prospect_source || '',
    notes: p.prospect_notes || '',
    website: p.prospect_website || '', vat: p.prospect_vat || '',
    street: p.prospect_street || '', street_number: p.prospect_street_number || '',
    zip: p.prospect_zip || '', city: p.prospect_city || '',
    country: p.prospect_country || 'Switzerland',
    lat: p.prospect_lat ?? null, lng: p.prospect_lng ?? null, address: '',
    links: p.prospect_links || [],
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const stage = STAGES.find((s) => s.key === (p.pipeline_stage || 'lead'));
  const previewLink = `${siteOrigin()}/?embed=${p.id}&preview=${p.preview_token}`;

  async function submit(e) {
    e.preventDefault();
    if (!f.company_name.trim()) { setErr('Company name is required.'); return; }
    setBusy(true); setErr('');
    try {
      await updatePartner(p.id, {
        company_name: f.company_name, contact_name: f.contact_name,
        phone: f.contact_phone, email: f.contact_email, source: f.source, notes: f.notes,
        website: f.website, vat: f.vat,
        street: f.street, street_number: f.street_number, zip: f.zip, city: f.city,
        country: f.country, lat: f.lat, lng: f.lng, links: f.links,
      });
      setBusy(false); setSaved(true);
    } catch (e2) { setErr(e2.message || 'Could not save.'); setBusy(false); }
  }

  // Drill one level deeper into the brand & pitch review (own breadcrumb back to here).
  if (review) return <ReviewView partnerId={p.id} companyName={f.company_name || p.company_name} onBack={() => setReview(false)} toPipeline={onBack} />;

  return (
    <div className="w-full">
      <Crumbs items={[{ label: 'Pipeline', onClick: onBack }, { label: p.company_name || 'Lead' }]} />
      <form onSubmit={submit} className="rounded-[var(--radius-card)] border border-mist bg-paper p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl">{p.company_name}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone">
              <span className="rounded-full bg-cloud px-2 py-0.5 font-semibold text-ink">{stage?.label || 'Lead'}</span>
              <span>{p.car_count} {Number(p.car_count) === 1 ? 'car' : 'cars'}</span>
              {p.created_at && <span>· added {fmtDate(p.created_at)}</span>}
            </p>
          </div>
          <a href={previewLink} target="_blank" rel="noreferrer" className="ring-lux shrink-0 rounded-lg border border-mist px-2.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-ink">Preview ↗</a>
        </div>

        <div className="mt-4 grid gap-x-5 gap-y-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <AdminField label="Company name *" value={f.company_name} onChange={set('company_name')} />
          </div>

          {/* Left column — contact + identity */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <AdminField label="Contact name" value={f.contact_name} onChange={set('contact_name')} />
              <AdminField label="Contact phone" value={f.contact_phone} onChange={(e) => setF((s) => ({ ...s, contact_phone: e.target.value.replace(/\s+/g, '') }))} />
            </div>
            <AdminField label="Contact email" value={f.contact_email} onChange={set('contact_email')} type="email" />
            <WebsiteField value={f.website} onChange={(v) => setF((s) => ({ ...s, website: v }))} onEnriched={(d) => setF((s) => enrichPatch(s, d))} />
            <div className="grid grid-cols-2 gap-3">
              <AdminField label="VAT / UID" value={f.vat} onChange={set('vat')} placeholder="CHE-123.456.789" />
              <AdminField label="Source" value={f.source} onChange={set('source')} placeholder="Referral, event…" />
            </div>
          </div>

          {/* Right column — address */}
          <div className="space-y-3">
            <AddressFields value={f} onChange={(v) => setF((s) => ({ ...s, ...v }))} white />
          </div>

          <div className="border-t border-mist pt-3 md:col-span-2">
            <LinksEditor value={f.links} onChange={(links) => setF((s) => ({ ...s, links }))} />
          </div>

          <div className="border-t border-mist pt-3 md:col-span-2">
            <IngestPanel partnerId={p.id} website={f.website} onReview={() => setReview(true)} />
          </div>

          <div className="grid gap-5 border-t border-mist pt-3 md:col-span-2 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-stone">Notes (summary)</span>
              <textarea value={f.notes} onChange={set('notes')} rows={4}
                className="ring-lux w-full rounded-xl border border-mist bg-cloud px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-ink placeholder:text-stone" />
            </label>
            <NotesLog prospectId={p.id} />
          </div>
        </div>

        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
        <div className="mt-5 flex items-center gap-3">
          <button type="button" onClick={onBack} className="ring-lux rounded-full border border-mist px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink">← Back</button>
          <button type="submit" disabled={busy} className="ring-lux flex-1 rounded-full bg-ink py-2.5 text-sm font-semibold text-cloud transition-colors hover:bg-void disabled:opacity-60">{busy ? 'Saving…' : 'Save'}</button>
          {saved && <span className="shrink-0 text-sm font-semibold text-go">Saved ✓</span>}
        </div>
      </form>
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
  const [f, setF] = useState({
    company_name: '', contact_name: '', contact_email: '', contact_phone: '', source: '',
    website: '', vat: '',
    street: '', street_number: '', zip: '', city: '', country: 'Switzerland', lat: null, lng: null, address: '',
    links: [],
  });
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
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius-card)] border border-mist bg-paper p-6">
        <h2 className="font-display text-xl">New prospect</h2>
        <p className="mt-1 text-sm text-stone">Creates a private preview workspace — no partner email needed.</p>
        <div className="mt-4 space-y-3">
          <AdminField label="Company name *" value={f.company_name} onChange={set('company_name')} placeholder="Geneva Prestige Cars" />
          <div className="grid grid-cols-2 gap-3">
            <AdminField label="Contact name" value={f.contact_name} onChange={set('contact_name')} />
            <AdminField label="Contact phone" value={f.contact_phone} onChange={(e) => setF((s) => ({ ...s, contact_phone: e.target.value.replace(/\s+/g, '') }))} />
          </div>
          <AdminField label="Contact email" value={f.contact_email} onChange={set('contact_email')} type="email" />
          <WebsiteField value={f.website} onChange={(v) => setF((p) => ({ ...p, website: v }))} onEnriched={(d) => setF((p) => enrichPatch(p, d))} />
          <div className="grid grid-cols-2 gap-3">
            <AdminField label="VAT / UID" value={f.vat} onChange={set('vat')} placeholder="CHE-123.456.789" />
            <AdminField label="Source" value={f.source} onChange={set('source')} placeholder="Referral, event…" />
          </div>
          <div className="border-t border-mist pt-3">
            <AddressFields value={f} onChange={(v) => setF((p) => ({ ...p, ...v }))} white />
          </div>
          <div className="border-t border-mist pt-3">
            <LinksEditor value={f.links} onChange={(links) => setF((p) => ({ ...p, links }))} />
          </div>
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

  const withStatus = (rows || []).map((p) => ({ ...p, status: partnerStatus(p) }));
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
  const pager = usePager(filtered, 25);

  if (rows === null) return <div className="grid place-items-center py-20"><span className="h-6 w-6 animate-spin rounded-full border-2 border-mist border-t-ink" /></div>;

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
            {pager.slice.map((p) => (
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
      <TablePager pager={pager} />

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
    street: p.prospect_street || '', street_number: p.prospect_street_number || '',
    zip: p.prospect_zip || '', city: p.prospect_city || '',
    country: p.prospect_country || 'Switzerland',
    lat: p.prospect_lat ?? null, lng: p.prospect_lng ?? null, address: '',
    links: p.prospect_links || [],
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
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius-card)] border border-mist bg-paper p-6">
        <h2 className="font-display text-xl">Edit — {p.company_name}</h2>
        <div className="mt-4 space-y-3">
          <AdminField label="Company name" value={f.company_name} onChange={set('company_name')} />
          <div className="grid grid-cols-2 gap-3">
            <AdminField label="Contact name" value={f.contact_name} onChange={set('contact_name')} />
            <AdminField label="Phone" value={f.phone} onChange={(e) => setF((s) => ({ ...s, phone: e.target.value.replace(/\s+/g, '') }))} />
          </div>
          <AdminField label={p.is_prospect ? 'Contact email' : 'Login email'} value={f.email} onChange={set('email')} type="email" />
          <div className="border-t border-mist pt-3">
            <AddressFields value={f} onChange={(v) => setF((s) => ({ ...s, ...v }))} white />
          </div>
          <div className="border-t border-mist pt-3">
            <LinksEditor value={f.links} onChange={(links) => setF((s) => ({ ...s, links }))} />
          </div>
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

function SubLabel({ children, className = '' }) {
  return <div className={`text-[0.7rem] font-bold uppercase tracking-wider text-stone ${className}`}>{children}</div>;
}

function eventLabel(e) {
  if (e.kind === 'created') return 'Prospect created';
  if (e.kind === 'went_live') return 'Went live 🎉';
  if (e.kind === 'stage') { const s = STAGES.find((x) => x.key === e.detail); return `Moved to ${s?.label || e.detail}`; }
  if (e.kind === 'note') return e.detail || 'Note';
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

const LINK_PLATFORMS = ['Instagram', 'LinkedIn', 'Facebook', 'TikTok', 'X', 'YouTube', 'Other'];

const isLikelyUrl = (s) => /\.[a-z]{2,}/i.test((s || '').trim());

// Merge AI-enriched data into the form, filling ONLY empty fields (never overwrites
// what's already typed). Socials are appended if that platform isn't present yet.
function enrichPatch(prev, d) {
  const keep = (cur, val) => (cur && String(cur).trim() ? cur : (val || cur || ''));
  const have = new Set((prev.links || []).map((l) => l.platform));
  const fresh = (d.links || []).filter((l) => l.url && !have.has(l.platform));
  return {
    ...prev,
    company_name: keep(prev.company_name, d.company_name),
    contact_email: keep(prev.contact_email, d.email),
    contact_phone: keep(prev.contact_phone, d.phone),
    vat: keep(prev.vat, d.vat_number),
    street: keep(prev.street, d.street),
    street_number: keep(prev.street_number, d.street_number),
    zip: keep(prev.zip, d.zip),
    city: keep(prev.city, d.city),
    country: prev.country || d.country || 'Switzerland',
    links: [...(prev.links || []), ...fresh],
  };
}

// Website input with an inline "AI enrich" button that appears once a URL is typed.
// onEnriched(data) receives the structured details to merge into the form.
function WebsiteField({ value, onChange, onEnriched }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function run() {
    setBusy(true); setErr('');
    try { onEnriched(await enrichProspect(value)); }
    catch (e) { setErr(e.message || 'Could not enrich from this site.'); }
    finally { setBusy(false); }
  }
  return (
    <div>
      <span className="mb-1 block text-xs font-semibold text-stone">Website</span>
      <div className="flex items-center gap-2">
        <input value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="https://…" type="url"
          className="ring-lux w-full rounded-xl border border-mist bg-cloud px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-ink placeholder:text-stone" />
        {isLikelyUrl(value) && (
          <button type="button" onClick={run} disabled={busy} title="Auto-fill the form from this website"
            className="ring-lux shrink-0 rounded-full bg-ink px-4 py-2.5 text-sm font-bold text-cloud transition-colors hover:bg-void disabled:opacity-50">
            {busy ? 'Reading…' : '✨ AI fill'}
          </button>
        )}
      </div>
      {err && <p className="mt-1 text-[0.7rem] text-red-600">{err}</p>}
    </div>
  );
}

// Timestamped note log for a lead: add an entry + see history newest-first.
function NotesLog({ prospectId }) {
  const [notes, setNotes] = useState(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { listProspectNotes(prospectId).then(setNotes).catch(() => setNotes([])); }, [prospectId]);

  async function add() {
    const t = text.trim();
    if (!t) return;
    setBusy(true); setErr('');
    try {
      const row = await addProspectNote(prospectId, t);
      setNotes((ns) => [row, ...(ns || [])]);
      setText('');
    } catch (e) { setErr(e.message || 'Could not add note.'); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <span className="mb-1 block text-xs font-semibold text-stone">Activity log</span>
      <div className="flex items-start gap-2">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Log a call, email, meeting…"
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); add(); } }}
          className="ring-lux w-full rounded-xl border border-mist bg-cloud px-3 py-2 text-sm outline-none transition-colors focus:border-ink placeholder:text-stone" />
        <button type="button" onClick={add} disabled={busy || !text.trim()}
          className="ring-lux shrink-0 rounded-xl bg-ink px-3 py-2 text-xs font-semibold text-cloud transition-colors hover:bg-void disabled:opacity-60">{busy ? '…' : 'Log'}</button>
      </div>
      {err && <p className="mt-1 text-[0.7rem] text-red-600">{err}</p>}
      <div className="mt-2 max-h-44 space-y-2 overflow-auto">
        {notes === null && <p className="text-xs text-stone/60">Loading…</p>}
        {notes && notes.length === 0 && <p className="text-xs text-stone/60">No notes logged yet.</p>}
        {notes && notes.map((n) => (
          <div key={n.id} className="rounded-lg border border-mist bg-cloud px-3 py-2">
            <div className="whitespace-pre-wrap text-sm text-ink">{n.text}</div>
            <div className="mt-0.5 text-[0.65rem] text-stone">{fmtDateTime(n.at)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Multi-select web / social links: pick platforms, fill a URL for each.
// `value` is an array of { platform, url }; `onChange` gets the updated array.
function LinksEditor({ value, onChange }) {
  const links = value || [];
  const add = (platform) => onChange([...links, { platform, url: '' }]);
  const setUrl = (i, url) => onChange(links.map((l, j) => (j === i ? { ...l, url } : l)));
  const remove = (i) => onChange(links.filter((_, j) => j !== i));
  return (
    <div>
      <span className="mb-1 block text-xs font-semibold text-stone">Web & socials</span>
      <div className="flex flex-wrap gap-1.5">
        {LINK_PLATFORMS.map((p) => (
          <button key={p} type="button" onClick={() => add(p)}
            className="ring-lux rounded-full border border-mist px-2.5 py-1 text-xs font-semibold text-ink transition-colors hover:border-ink">
            + {p}
          </button>
        ))}
      </div>
      {links.length > 0 && (
        <div className="mt-2 space-y-2">
          {links.map((l, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-16 shrink-0 truncate text-xs font-semibold text-stone">{l.platform}</span>
              <input value={l.url} onChange={(e) => setUrl(i, e.target.value)} placeholder="https://…"
                className="ring-lux flex-1 rounded-xl border border-mist bg-cloud px-3 py-2 text-sm outline-none transition-colors focus:border-ink placeholder:text-stone" />
              <button type="button" onClick={() => remove(i)} className="ring-lux shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 transition-colors hover:underline">Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Customers ─────────────────────────────────────────────────────────── */
function Customers() {
  const [rows, setRows] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => { listCustomers().then(setRows).catch((e) => { setErr(e.message); setRows([]); }); }, []);

  const ql = q.trim().toLowerCase();
  const filtered = ql ? (rows || []).filter((c) => [c.full_name, c.email, c.phone].some((v) => (v || '').toLowerCase().includes(ql))) : (rows || []);
  const pager = usePager(filtered, 25);

  if (rows === null) return <div className="grid place-items-center py-20"><span className="h-6 w-6 animate-spin rounded-full border-2 border-mist border-t-ink" /></div>;

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
            {pager.slice.map((c) => (
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
      <TablePager pager={pager} />
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
        <span className="text-stone">Newsletter {c.marketing_opt_in
          ? <b className="text-go">opted in{c.marketing_opt_in_at ? ` · ${fmtDate(c.marketing_opt_in_at)}` : ''}{c.marketing_opt_in_source ? ` · via ${c.marketing_opt_in_source}` : ''}</b>
          : c.marketing_opt_out_at
            ? <b className="text-stone">unsubscribed · {fmtDate(c.marketing_opt_out_at)}</b>
            : <b className="text-stone">off</b>}</span>
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

function Marketing() {
  const [tab, setTab] = useState('flows');
  const TABS = [['flows', 'Flows'], ['subscribers', 'Subscribers']];
  return (
    <div>
      <h1 className="font-display text-[clamp(1.6rem,3vw,2.2rem)] leading-tight">Marketing</h1>
      <p className="mt-1 text-sm text-stone">Lifecycle email flows and the newsletter subscriber list.</p>
      <div className="mt-4 inline-flex rounded-full border border-mist bg-cloud p-1">
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${tab === k ? 'bg-ink text-cloud' : 'text-stone hover:text-ink'}`}>{label}</button>
        ))}
      </div>
      <div className="mt-5">{tab === 'flows' ? <MarketingFlows /> : <Subscribers />}</div>
    </div>
  );
}

function MarketingFlows() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState('');
  const [previewing, setPreviewing] = useState(null);
  const [preview, setPreview] = useState(null); // { label, subject, html }
  function load() { marketingOverview().then(setData).catch((e) => { setErr(e.message); setData({ jobs: [], stats: [], recent: [] }); }); }
  useEffect(() => { load(); }, []);

  async function openPreview(f) {
    setPreviewing(f.flow); setErr('');
    try {
      const r = await previewFlow(f.flow);
      setPreview({ label: f.label, subject: r.subject, html: r.html });
    } catch (e) { setErr(e.message || 'Could not load preview.'); }
    finally { setPreviewing(null); }
  }

  if (data === null) return <div className="grid place-items-center py-20"><span className="h-6 w-6 animate-spin rounded-full border-2 border-mist border-t-ink" /></div>;

  const jobByName = Object.fromEntries((data.jobs || []).map((j) => [j.jobname, j]));
  const statByFlow = Object.fromEntries((data.stats || []).map((s) => [s.flow, s]));

  async function toggle(flow) {
    const job = jobByName[flow.jobname];
    if (!job) return;
    setBusy(flow.jobname); setErr('');
    try {
      await setFlowActive(flow.jobname, !job.active);
      load();
    } catch (e) { setErr(e.message || 'Could not update.'); }
    finally { setBusy(null); }
  }

  return (
    <div>
      {err && <p className="mb-3 text-sm text-red-600">{err}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {MARKETING_FLOWS.map((f) => {
          const job = jobByName[f.jobname];
          const stat = statByFlow[f.flow];
          const active = job?.active;
          return (
            <div key={f.flow} className="rounded-2xl border border-mist bg-cloud p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-lg">{f.label}</span>
                    {job ? (
                      <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold ${active ? 'bg-go/15 text-go' : 'bg-mist text-stone'}`}>{active ? 'Active' : 'Paused'}</span>
                    ) : <span className="rounded-full bg-mist px-2 py-0.5 text-[0.65rem] font-bold text-stone">Not scheduled</span>}
                  </div>
                  <p className="mt-1 text-sm text-stone">{f.desc}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button onClick={() => openPreview(f)} disabled={previewing === f.flow}
                    className="ring-lux rounded-full border border-mist px-3 py-1 text-xs font-semibold text-stone transition-colors hover:border-ink hover:text-ink disabled:opacity-50">
                    {previewing === f.flow ? '…' : 'Preview'}
                  </button>
                  {job && (
                    <button onClick={() => toggle(f)} disabled={busy === f.jobname}
                      className="ring-lux rounded-full border border-mist px-3 py-1 text-xs font-semibold text-stone transition-colors hover:border-ink hover:text-ink disabled:opacity-50">
                      {busy === f.jobname ? '…' : active ? 'Pause' : 'Resume'}
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-stone">
                <span>{f.cadence}</span>
                <span>Sent all-time <b className="text-ink tnum">{stat?.total ?? 0}</b></span>
                <span>Last 30d <b className="text-ink tnum">{stat?.last_30d ?? 0}</b></span>
                <span>Last sent <b className="text-ink">{stat?.last_sent ? fmtDate(stat.last_sent) : '—'}</b></span>
              </div>
            </div>
          );
        })}
      </div>

      <SubLabel className="mt-7">Recent sends</SubLabel>
      <div className="mt-2 overflow-x-auto rounded-2xl border border-mist bg-cloud">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-mist text-left text-[0.65rem] uppercase tracking-wider text-stone">
              <th className="px-4 py-3 font-bold">Flow</th>
              <th className="px-4 py-3 font-bold">Recipient</th>
              <th className="px-4 py-3 font-bold">Subject</th>
              <th className="px-4 py-3 font-bold">Sent</th>
            </tr>
          </thead>
          <tbody>
            {(data.recent || []).map((r, i) => (
              <tr key={i} className="border-b border-mist/60">
                <td className="px-4 py-3 font-semibold capitalize">{r.flow}</td>
                <td className="px-4 py-3 text-stone">{r.email}</td>
                <td className="px-4 py-3 text-stone">{r.subject || '—'}</td>
                <td className="px-4 py-3 text-stone">{fmtDateTime(r.sent_at)}</td>
              </tr>
            ))}
            {(data.recent || []).length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-stone">No marketing emails sent yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {preview && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/45 p-4 backdrop-blur-sm" onClick={() => setPreview(null)}>
          <div className="flex max-h-[88vh] w-full max-w-[600px] flex-col overflow-hidden rounded-[20px] border border-mist bg-paper shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-mist bg-cloud px-5 py-3">
              <div className="min-w-0">
                <div className="eyebrow text-gold">{preview.label} preview</div>
                <div className="truncate text-sm font-semibold">{preview.subject}</div>
              </div>
              <button onClick={() => setPreview(null)} className="ring-lux grid h-9 w-9 shrink-0 place-items-center rounded-full border border-mist text-stone transition-colors hover:bg-mist/50"><Icon.X width={16} height={16} /></button>
            </div>
            <iframe title="Email preview" srcDoc={preview.html} className="h-[72vh] w-full border-0 bg-white" />
          </div>
        </div>
      )}
    </div>
  );
}

function Subscribers() {
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { listSubscribers().then(setRows).catch((e) => { setErr(e.message); setRows([]); }); }, []);

  if (rows === null) return <div className="grid place-items-center py-20"><span className="h-6 w-6 animate-spin rounded-full border-2 border-mist border-t-ink" /></div>;

  const ql = q.trim().toLowerCase();
  const filtered = ql ? rows.filter((s) => [s.email, s.customer_name, s.source].some((v) => (v || '').toLowerCase().includes(ql))) : rows;
  const subbed = rows.filter((s) => s.subscribed).length;

  async function toggle(s) {
    const next = !s.subscribed;
    setBusyId(s.id); setErr('');
    try {
      await setNewsletter(s.email, next, 'admin');
      setRows((rs) => rs.map((r) => r.id === s.id ? { ...r, subscribed: next, opt_out_at: next ? r.opt_out_at : new Date().toISOString(), opt_in_at: next ? new Date().toISOString() : r.opt_in_at } : r));
    } catch (e) { setErr(e.message || 'Could not update.'); }
    finally { setBusyId(null); }
  }

  function exportCsv() {
    const cols = ['id', 'email', 'subscribed', 'source', 'opt_in_at', 'opt_out_at', 'customer_id', 'customer_name', 'created_at'];
    const esc = (v) => {
      let s = v == null ? '' : String(v);
      // Neutralise spreadsheet formula injection: a leading =,+,-,@,tab or CR makes
      // Excel/Sheets evaluate the cell. Prefix with ' so it's treated as text.
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const body = rows.map((r) => cols.map((c) => esc(r[c])).join(',')).join('\n');
    const blob = new Blob([cols.join(',') + '\n' + body], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'airluxo-newsletter-subscribers.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone">Newsletter subscribers — the single source of truth (Resend mirrors this). {subbed} subscribed · {rows.length - subbed} unsubscribed · {rows.length} total.</p>
        <div className="flex items-center gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search email, name, source…"
            className="ring-lux w-full max-w-xs rounded-full border border-mist bg-cloud px-4 py-2 text-sm outline-none transition-colors focus:border-ink placeholder:text-stone sm:w-56" />
          <button onClick={exportCsv} disabled={!rows.length}
            className="ring-lux shrink-0 rounded-full border border-mist bg-cloud px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-ink disabled:opacity-50">Export CSV</button>
        </div>
      </div>
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

      <div className="mt-5 overflow-x-auto rounded-2xl border border-mist bg-cloud">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-mist text-left text-[0.65rem] uppercase tracking-wider text-stone">
              <th className="px-4 py-3 font-bold">Email</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 font-bold">Source</th>
              <th className="px-4 py-3 font-bold">Customer</th>
              <th className="px-4 py-3 font-bold">Opt-in</th>
              <th className="px-4 py-3 font-bold"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-b border-mist/60">
                <td className="px-4 py-3 font-semibold">{s.email}</td>
                <td className="px-4 py-3">
                  {s.subscribed
                    ? <span className="rounded-full bg-go/15 px-2.5 py-1 text-[0.7rem] font-bold text-go">Subscribed</span>
                    : <span className="rounded-full bg-mist px-2.5 py-1 text-[0.7rem] font-bold text-stone">Unsubscribed</span>}
                </td>
                <td className="px-4 py-3 text-stone">{s.source || '—'}</td>
                <td className="px-4 py-3 text-stone">{s.customer_name || (s.customer_id ? 'Linked' : <span className="text-stone/40">Lead</span>)}</td>
                <td className="px-4 py-3 text-stone">{s.subscribed ? (s.opt_in_at ? fmtDate(s.opt_in_at) : '—') : (s.opt_out_at ? `out · ${fmtDate(s.opt_out_at)}` : '—')}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => toggle(s)} disabled={busyId === s.id}
                    className="ring-lux rounded-full border border-mist px-3 py-1 text-xs font-semibold text-stone transition-colors hover:border-ink hover:text-ink disabled:opacity-50">
                    {busyId === s.id ? '…' : s.subscribed ? 'Unsubscribe' : 'Resubscribe'}
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-stone">{rows.length ? 'No subscribers match.' : 'No subscribers yet.'}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Translations() {
  const KEYS = Object.keys(en);
  const TARGETS = SUPPORTED_LOCALES.filter((l) => l.code !== 'en');
  const [locale, setLocale] = useState('de');
  const [rows, setRows] = useState(null); // key -> { value, source_hash, auto }
  const [edits, setEdits] = useState({});
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  function load(loc) {
    setRows(null);
    fetchTranslations().then((all) => {
      const map = {};
      all.filter((r) => r.locale === loc).forEach((r) => { map[r.key] = r; });
      setRows(map); setEdits({});
    }).catch((e) => { setErr(e.message); setRows({}); });
  }
  useEffect(() => { load(locale); }, [locale]);
  const pager = usePager(KEYS, 25);

  if (rows === null) return <div className="grid place-items-center py-20"><span className="h-6 w-6 animate-spin rounded-full border-2 border-mist border-t-ink" /></div>;

  const status = (k) => { const r = rows[k]; if (!r) return 'missing'; return r.source_hash !== hashStr(en[k]) ? 'stale' : 'ok'; };
  const done = KEYS.filter((k) => status(k) === 'ok').length;
  const pct = Math.round((done / KEYS.length) * 100);
  const pending = KEYS.filter((k) => status(k) !== 'ok');

  async function saveOne(key) {
    const v = (edits[key] ?? rows[key]?.value ?? '').trim();
    if (!v) return;
    setBusy(key); setErr('');
    try { await saveTranslation(locale, key, v); load(locale); }
    catch (e) { setErr(e.message); } finally { setBusy(''); }
  }
  async function aiOne(key) {
    setBusy(key); setErr('');
    try { const map = await aiTranslate(locale, [{ key, text: en[key] }]); if (map[key] != null) setEdits((d) => ({ ...d, [key]: map[key] })); }
    catch (e) { setErr(e.message); } finally { setBusy(''); }
  }
  async function fillPending() {
    if (!pending.length) return;
    setBusy('bulk'); setErr('');
    // Translate in small chunks with retry — one big request makes the Gemini
    // call time out / return non-JSON (the edge fn then 502/422s). Each chunk is
    // saved as it succeeds, so progress persists and re-clicking resumes the rest.
    const BATCH = 20;
    const retry = async (items, tries = 3) => {
      let last;
      for (let a = 1; a <= tries; a++) {
        try { return await aiTranslate(locale, items); }
        catch (e) { last = e; await new Promise((r) => setTimeout(r, 1200 * a)); }
      }
      throw last;
    };
    try {
      let failed = 0;
      for (let i = 0; i < pending.length; i += BATCH) {
        const slice = pending.slice(i, i + BATCH);
        let map;
        try { map = await retry(slice.map((k) => ({ key: k, text: en[k] }))); }
        catch { failed += slice.length; continue; }
        if (Object.keys(map).length) await saveTranslationsBatch(locale, map);
      }
      load(locale);
      if (failed) setErr(`${failed} couldn’t be translated this pass — click AI-fill again to retry them.`);
    } catch (e) { setErr(e.message); } finally { setBusy(''); }
  }

  const badge = { ok: 'bg-go/15 text-go', stale: 'bg-gold/15 text-gold', missing: 'bg-mist text-stone' };
  const label = { ok: 'Translated', stale: 'Stale', missing: 'Missing' };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[clamp(1.6rem,3vw,2.2rem)] leading-tight">Translations</h1>
          <p className="mt-1 text-sm text-stone">English is the source (in code). Edit or AI-generate the other languages here — the site loads them live. {done}/{KEYS.length} keys ({pct}%) translated in {SUPPORTED_LOCALES.find((l) => l.code === locale)?.enLabel}.</p>
        </div>
        <button onClick={fillPending} disabled={!!busy || !pending.length}
          className="ring-lux shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-bold text-cloud transition-colors hover:bg-void disabled:opacity-50">
          {busy === 'bulk' ? 'Translating…' : `AI-fill ${pending.length} missing/stale`}
        </button>
      </div>

      <div className="mt-4 inline-flex rounded-full border border-mist bg-cloud p-1">
        {TARGETS.map((l) => (
          <button key={l.code} onClick={() => setLocale(l.code)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${locale === l.code ? 'bg-ink text-cloud' : 'text-stone hover:text-ink'}`}>{l.enLabel}</button>
        ))}
      </div>
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

      <div className="mt-5 overflow-x-auto rounded-2xl border border-mist bg-cloud">
        <table className="w-full min-w-[860px] table-fixed text-sm">
          <thead>
            <tr className="border-b border-mist text-left text-[0.65rem] uppercase tracking-wider text-stone">
              <th className="w-[14%] px-4 py-3 font-bold">Key</th>
              <th className="w-[10%] px-4 py-3 font-bold">Status</th>
              <th className="w-[24%] px-4 py-3 font-bold">English</th>
              <th className="w-[38%] px-4 py-3 font-bold">{SUPPORTED_LOCALES.find((l) => l.code === locale)?.enLabel}</th>
              <th className="w-[14%] px-4 py-3 font-bold"></th>
            </tr>
          </thead>
          <tbody>
            {pager.slice.map((k) => {
              const st = status(k);
              const val = edits[k] ?? rows[k]?.value ?? '';
              const dirty = edits[k] != null && edits[k] !== (rows[k]?.value ?? '');
              return (
                <tr key={k} className="border-b border-mist/60 align-top">
                  <td className="px-4 py-3"><code className="text-[0.7rem] text-stone">{k}</code></td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[0.6rem] font-bold ${badge[st]}`}>{label[st]}</span></td>
                  <td className="px-4 py-3 text-stone">{en[k]}</td>
                  <td className="px-4 py-3">
                    <textarea value={val} onChange={(e) => setEdits((d) => ({ ...d, [k]: e.target.value }))}
                      rows={Math.min(8, Math.max(2, Math.ceil((val.length || en[k].length || 0) / 42)))}
                      className="ring-lux w-full resize-y rounded-lg border border-mist bg-paper px-2.5 py-1.5 text-sm leading-snug outline-none focus:border-ink" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => aiOne(k)} disabled={!!busy} title="Translate with AI"
                        className="ring-lux rounded-full border border-mist px-2.5 py-1 text-[0.7rem] font-semibold text-gold transition-colors hover:border-gold disabled:opacity-50">{busy === k ? '…' : '✦'}</button>
                      <button onClick={() => saveOne(k)} disabled={!!busy || !dirty}
                        className="ring-lux rounded-full bg-ink px-2.5 py-1 text-[0.7rem] font-bold text-cloud transition-colors hover:bg-void disabled:opacity-40">Save</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <TablePager pager={pager} />
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
