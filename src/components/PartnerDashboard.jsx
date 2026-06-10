import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from './Icons.jsx';
import { useAuth } from '../lib/auth.jsx';
import {
  fetchMyListings, createListing, deleteListing, updateListing, uploadListingPhoto, uploadListingVideo, importListings, generateCarDescription,
} from '../lib/listings.js';
import { downloadTemplate, exportFleet, parseFleetFile } from '../lib/fleetio.js';
import { makeStudioThumbnail, extractCarDetails } from '../lib/thumbnail.js';
import { lookupSpecs } from '../lib/carSpecs.js';
import { FEES } from '../lib/data.js';
import { PLAN_LIST, planOf, carLimit, commissionRate } from '../lib/plans.js';
import { fetchMyBookings, updateBookingStatus } from '../lib/bookings.js';
import { fetchMyBlocks, createBlock, deleteBlock } from '../lib/blocks.js';
import { startPayoutOnboarding, refreshPayoutStatus, partnerSettle } from '../lib/stripe.js';
import { updatePartner, fetchLocations, createLocation, deleteLocation } from '../lib/partner.js';
import { chf, num } from '../lib/format.js';
import { useT, useI18n } from '../lib/i18n.jsx';
import Tour from './Tour.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';
import LocationForm, { AddressFields } from './LocationForm.jsx';
import { newWebhookSecret, saveWebhook, sendTestWebhook, fireBookingWebhook, ensureCalendarFeed, calendarFeedUrl } from '../lib/integrations.js';

const EMPTY_LOC = { label: '', address: '', street: '', street_number: '', zip: '', city: '', country: 'Switzerland', lat: null, lng: null, phone: '', email: '', opening_hours: null, allow_after_hours: false, after_hours_fee: '' };
const LOC_TEXT_KEYS = ['label', 'address', 'street', 'street_number', 'zip', 'city', 'country', 'phone', 'email'];
// Build a clean partner_locations row from an editor draft (strips ids, coerces types).
function buildLocPayload(d) {
  const p = {};
  for (const k of LOC_TEXT_KEYS) { const v = d[k]; p[k] = typeof v === 'string' && v.trim() === '' ? null : (typeof v === 'string' ? v.trim() : v ?? null); }
  p.lat = d.lat ?? null;
  p.lng = d.lng ?? null;
  p.opening_hours = d.opening_hours || null;
  p.allow_after_hours = !!d.allow_after_hours;
  p.after_hours_fee = d.allow_after_hours && d.after_hours_fee ? Number(d.after_hours_fee) : null;
  return p;
}
const locLine = (l) => [l.street, l.street_number].filter(Boolean).join(' ') || l.address || '';
const EMPTY_ADDR = { street: '', street_number: '', zip: '', city: '', country: 'Switzerland', lat: null, lng: null, address: '' };
const addrOrNull = (a) => (a && (a.street || a.city || a.zip || a.address)) ? a : null;
const toLocDraft = (l) => ({ ...EMPTY_LOC, ...l, after_hours_fee: l.after_hours_fee != null ? String(l.after_hours_fee) : '' });

// First-run setup guide. Each step optionally switches `section` (the dashboard
// view) and spotlights a `target` (data-tour attribute). Target-less steps centre.
const PARTNER_TOUR = [
  { titleKey: 'partner.tour.s1title', bodyKey: 'partner.tour.s1body' },
  { target: '[data-tour="add-car"]', section: 'overview', placement: 'right', titleKey: 'partner.tour.s2title', bodyKey: 'partner.tour.s2body' },
  { target: '[data-tour="location"]', section: 'location', placement: 'right', titleKey: 'partner.tour.s3title', bodyKey: 'partner.tour.s3body' },
  { target: '[data-tour="bookings"]', section: 'bookings', placement: 'right', titleKey: 'partner.tour.s4title', bodyKey: 'partner.tour.s4body' },
  { target: '[data-tour="calendar"]', section: 'calendar', placement: 'right', titleKey: 'partner.tour.s5title', bodyKey: 'partner.tour.s5body' },
  { target: '[data-tour="earnings"]', section: 'earnings', placement: 'right', titleKey: 'partner.tour.s6title', bodyKey: 'partner.tour.s6body' },
  { target: '[data-tour="settings"]', section: 'settings', placement: 'right', titleKey: 'partner.tour.s7title', bodyKey: 'partner.tour.s7body' },
  { titleKey: 'partner.tour.s8title', bodyKey: 'partner.tour.s8body' },
];

const NAV = [
  { id: 'overview', label: 'Overview', icon: Icon.Grid },
  { id: 'fleet', label: 'My fleet', icon: Icon.Car },
  { id: 'location', label: 'Location', icon: Icon.Pin },
  { id: 'bookings', label: 'Bookings', icon: Icon.Calendar2 },
  { id: 'calendar', label: 'Calendar', icon: Icon.Calendar },
  { id: 'earnings', label: 'Earnings', icon: Icon.Wallet },
  { id: 'plans', label: 'Plans', icon: Icon.Bolt },
  { id: 'settings', label: 'Settings', icon: Icon.Gear },
];

export default function PartnerDashboard({ onExit }) {
  const { partner, user, signOut } = useAuth();
  const t = useT();
  const [view, setView] = useState('overview');
  const [addOpen, setAddOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  const [listings, setListings] = useState(null); // null = loading
  const [bookings, setBookings] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [err, setErr] = useState('');

  // Car-limit guard: at the plan's limit, send the partner to Plans instead of Add.
  const carCap = carLimit(partner?.plan);
  const openAdd = () => {
    if (carCap != null && (listings?.length || 0) >= carCap) setView('plans');
    else setAddOpen(true);
  };

  const reload = useCallback(async () => {
    try {
      setErr('');
      const [ls, bs, bk] = await Promise.all([fetchMyListings(), fetchMyBookings(), fetchMyBlocks()]);
      setListings(ls);
      setBookings(bs);
      setBlocks(bk);
    } catch (e) {
      setErr(e.message || t('partner.errLoad'));
      setListings([]);
      setBookings([]);
      setBlocks([]);
    }
  }, [t]);

  useEffect(() => { reload(); }, [reload]);

  // Auto-start the setup guide once for a new partner (never finished/skipped it).
  useEffect(() => {
    if (!partner) return;
    let seen = false;
    try { seen = localStorage.getItem('airluxo:partner-tour') === 'done'; } catch { /* ignore */ }
    if (!partner.onboarded_at && !seen) setTourOpen(true);
  }, [partner]);

  // Finishing or skipping both end the guide and stamp it so it won't auto-reappear.
  const endTour = useCallback(() => {
    setTourOpen(false);
    setNavOpen(false);
    try { localStorage.setItem('airluxo:partner-tour', 'done'); } catch { /* ignore */ }
    updatePartner({ onboarded_at: new Date().toISOString() }).catch(() => {});
  }, []);

  // Tour navigation: switch section, and on mobile open the off-canvas nav so the
  // sidebar targets (nav items, "List a car") can be spotlighted.
  const tourNavigate = useCallback((section) => {
    setView(section);
    if (window.innerWidth < 1024) setNavOpen(true);
  }, []);

  const companyName = partner?.company_name || 'Your rental company';
  const initials = companyName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  async function handleSignOut() {
    await signOut();
    onExit();
  }

  return (
    <div className="flex min-h-screen bg-paper">
      {/* ===== Sidebar ===== */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-void text-cloud transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${navOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-6 py-6">
          <button onClick={onExit} className="ring-lux flex items-center gap-2.5">
            <span className="wordmark text-[1.3rem]">AIR<span className="text-gold-soft">LUXO</span></span>
          </button>
          <button onClick={() => setNavOpen(false)} className="ring-lux text-ash lg:hidden"><Icon.X /></button>
        </div>

        <div className="mx-4 rounded-2xl border border-graphite bg-coal p-4">
          <div className="flex items-center gap-3">
            {partner?.avatar_url
              ? <img src={partner.avatar_url} alt="" className="h-10 w-10 shrink-0 rounded-full border border-graphite object-cover" />
              : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold-soft font-display text-ink">{initials}</span>}
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">{companyName}</div>
              <div className="truncate text-xs text-ash">{partner?.city || user?.email}</div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 border-t border-graphite pt-3 text-xs text-ash">
            <span className="h-1.5 w-1.5 rounded-full bg-go" /> {t('partner.verifiedPartner')}
          </div>
        </div>

        <nav className="mt-6 flex-1 space-y-1 px-4">
          {NAV.map((n) => {
            const Ic = n.icon;
            const active = view === n.id;
            return (
              <button
                key={n.id}
                data-tour={n.id}
                onClick={() => { setView(n.id); setNavOpen(false); }}
                className={`ring-lux flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-colors ${active ? 'bg-cloud text-ink' : 'text-ash hover:bg-coal hover:text-cloud'}`}
              >
                <Ic width={18} height={18} className={active ? 'text-gold' : ''} />
                {t(`nav.${n.id}`)}
                {n.id === 'fleet' && Array.isArray(listings) && listings.length > 0 && (
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-[0.7rem] tnum ${active ? 'bg-ink/10 text-ink' : 'bg-coal text-ash'}`}>{listings.length}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4">
          <button data-tour="add-car" onClick={openAdd} className="ring-lux flex w-full items-center justify-center gap-2 rounded-xl bg-gold-soft py-3 text-sm font-bold text-ink transition-colors hover:bg-gold">
            <Icon.Plus width={17} height={17} /> {t('partner.listCar')}
          </button>
          <div className="mt-2"><LanguageSwitcher className="w-full" /></div>
          <button onClick={handleSignOut} className="ring-lux mt-2 w-full rounded-xl py-2.5 text-center text-xs font-semibold text-ash transition-colors hover:text-cloud">
            {t('partner.signOut')}
          </button>
        </div>
      </aside>

      {navOpen && <div onClick={() => setNavOpen(false)} className="fixed inset-0 z-30 bg-ink/40 lg:hidden" />}

      {/* ===== Main ===== */}
      <main className="flex-1 overflow-hidden">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-mist bg-paper/80 px-5 py-4 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setNavOpen(true)} className="ring-lux text-ink lg:hidden"><Icon.Menu /></button>
            <div>
              <div className="eyebrow text-stone">{t('partner.portal')}</div>
              <h1 className="font-display text-xl leading-none">{t(`nav.${view}`)}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 rounded-full border border-mist bg-cloud px-3 py-1.5 text-xs font-semibold text-ink sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-go" /> {t('partner.liveStatus')}
            </span>
            <button onClick={openAdd} className="ring-lux flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cloud transition-colors hover:bg-void">
              <Icon.Plus width={15} height={15} /> <span className="hidden sm:inline">{t('partner.listCar')}</span>
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-[1100px] px-5 py-8 sm:px-8">
          {err && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
          )}
          <PayoutsBanner />
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              {view === 'overview' && <Overview listings={listings} bookings={bookings} onAdd={openAdd} setView={setView} />}
              {view === 'fleet' && <Fleet listings={listings} blocks={blocks} onAdd={openAdd} reload={reload} />}
              {view === 'location' && <LocationView />}
              {view === 'bookings' && <Bookings bookings={bookings} blocks={blocks} reload={reload} />}
              {view === 'calendar' && <Calendar bookings={bookings} blocks={blocks} />}
              {view === 'earnings' && <Earnings bookings={bookings} />}
              {view === 'plans' && <Plans listings={listings} />}
              {view === 'settings' && <SettingsView onReplayTour={() => setTourOpen(true)} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {addOpen && <AddCar onClose={() => setAddOpen(false)} onCreated={reload} />}
      </AnimatePresence>

      {tourOpen && (
        <Tour steps={PARTNER_TOUR.map((s) => ({ ...s, title: t(s.titleKey), body: t(s.bodyKey) }))} onNavigate={tourNavigate} onClose={endTour} onFinish={endTour} />
      )}
    </div>
  );
}

/* ---------------- Payouts (Stripe Connect) banner ---------------- */
function PayoutsBanner() {
  const { partner, refreshPartner } = useAuth();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  if (!partner || partner.stripe_charges_enabled) return null;
  const connected = !!partner.stripe_account_id;

  async function onboard() {
    setBusy(true); setMsg('');
    try {
      const url = await startPayoutOnboarding();
      window.open(url, '_blank', 'noopener');
      setMsg(t('partner.payouts.openedTab'));
    } catch (e) { setMsg(e.message || t('partner.payouts.errStart')); }
    finally { setBusy(false); }
  }
  async function refresh() {
    setBusy(true); setMsg('');
    try {
      const s = await refreshPayoutStatus();
      await refreshPartner();
      if (!s.charges_enabled) setMsg(t('partner.payouts.notActive'));
    } catch (e) { setMsg(e.message || t('partner.payouts.errRefresh')); }
    finally { setBusy(false); }
  }

  return (
    <div className="mb-6 rounded-[var(--radius-card)] border border-gold/40 bg-gold/10 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gold/30 bg-gold/15 text-gold"><Icon.Wallet width={20} height={20} /></span>
          <div>
            <div className="font-display text-base">{t('partner.payouts.title')}</div>
            <p className="mt-0.5 max-w-md text-sm text-stone">{t('partner.payouts.desc', { pct: Math.round(commissionRate(partner?.plan) * 100) })}</p>
            {msg && <p className="mt-2 text-xs font-medium text-ink">{msg}</p>}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button onClick={onboard} disabled={busy} className="ring-lux rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-cloud transition-colors hover:bg-void disabled:opacity-60">{busy ? '…' : connected ? t('partner.payouts.continue') : t('partner.payouts.connect')}</button>
          {connected && <button onClick={refresh} disabled={busy} className="ring-lux rounded-full border border-ink/25 px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink disabled:opacity-60">{t('partner.common.refresh')}</button>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Overview ---------------- */
// Dates are localised via Intl with Swiss locale tags (de-CH / fr-CH / it-CH).
const LOCALE_TAG = { en: 'en-GB', de: 'de-CH', fr: 'fr-CH', it: 'it-CH' };
const localeTag = (loc) => LOCALE_TAG[loc] || 'en-GB';
const monthShort = (loc, monthIndex) => new Date(2021, monthIndex, 1).toLocaleDateString(localeTag(loc), { month: 'short' });
// Monday-first short weekday names (Nov 1 2021 was a Monday).
const weekdayShorts = (loc) => [1, 2, 3, 4, 5, 6, 7].map((d) => new Date(2021, 10, d).toLocaleDateString(localeTag(loc), { weekday: 'short' }));
const weekdayLongs = (loc) => [1, 2, 3, 4, 5, 6, 7].map((d) => new Date(2021, 10, d).toLocaleDateString(localeTag(loc), { weekday: 'long' }));
const netOf = (b, rate = FEES.hostCommission) => (Number(b.base_amount || 0) + Number(b.addons_amount || 0)) * (1 - rate);

// Real partner metrics derived from bookings (+ listings for utilisation).
// `rate` is the partner's plan commission (defaults to the base rate).
function computeMetrics(bookings, listings, rate = FEES.hostCommission, loc = 'en') {
  const active = (bookings ?? []).filter((b) => b.status !== 'Declined' && b.status !== 'Cancelled');
  const now = new Date(); now.setHours(0, 0, 0, 0);

  // last 6 months of net payouts, bucketed by trip start month
  const buckets = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, m: monthShort(loc, d.getMonth()), v: 0 });
  }
  const byKey = Object.fromEntries(buckets.map((b) => [b.key, b]));
  for (const b of active) {
    if (!b.start_date) continue;
    const sd = new Date(`${b.start_date}T00:00:00`);
    const k = `${sd.getFullYear()}-${sd.getMonth()}`;
    if (byKey[k]) byKey[k].v += netOf(b, rate);
  }
  const series = buckets.map((b) => ({ m: b.m, v: Math.round(b.v) }));
  const net = series.at(-1).v;
  const prev = series.at(-2)?.v ?? 0;
  const delta = prev > 0 ? ((net - prev) / prev) * 100 : null;

  // utilisation this month = booked car-days / (cars × days in month)
  const cars = (listings ?? []).length;
  const y = now.getFullYear(), mo = now.getMonth();
  const daysInMonth = new Date(y, mo + 1, 0).getDate();
  const mStart = new Date(y, mo, 1), mEnd = new Date(y, mo, daysInMonth);
  let bookedDays = 0;
  for (const b of active) {
    if (!b.start_date) continue;
    const s = new Date(`${b.start_date}T00:00:00`);
    const e = new Date(`${b.end_date || b.start_date}T00:00:00`);
    const from = s < mStart ? mStart : s;
    const to = e > mEnd ? mEnd : e;
    if (to < from) continue;
    bookedDays += Math.round((to - from) / 86400000) + 1;
  }
  const capacity = cars * daysInMonth;
  const utilisation = capacity > 0 ? Math.min(100, Math.round((bookedDays / capacity) * 100)) : 0;

  return { net, delta, series, utilisation, monthLabel: monthShort(loc, mo) };
}

function Overview({ listings, bookings, onAdd, setView }) {
  const { partner } = useAuth();
  const t = useT();
  const { locale } = useI18n();
  const loading = listings === null;
  const total = loading ? 0 : listings.length;
  const active = loading ? 0 : listings.filter((c) => c.status === 'Available' || c.status === 'Booked').length;
  const bk = bookings ?? [];
  const pending = bk.filter((b) => b.status === 'Pending').length;
  const m = computeMetrics(bookings, listings, commissionRate(partner?.plan), locale);
  const deltaTxt = m.delta == null ? t('partner.kpi.firstMonth') : t('partner.kpi.vsPrevMonth', { delta: `${m.delta >= 0 ? '+' : ''}${m.delta.toFixed(0)}` });

  return (
    <div className="space-y-7">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label={t('partner.kpi.activeListings')} value={loading ? '—' : `${active} / ${total}`} sub={total === 0 ? t('partner.kpi.listFirstCar') : t('partner.kpi.liveOnMarket')} good={total > 0} icon={<Icon.Car />} />
        <Kpi label={t('partner.kpi.bookings')} value={bookings === null ? '—' : num(bk.length)} sub={pending > 0 ? t('partner.kpi.awaitingReply', { n: pending }) : t('partner.kpi.allCaughtUp')} good={pending > 0} icon={<Icon.Calendar2 />} />
        <Kpi label={t('partner.kpi.netEarnings', { month: m.monthLabel })} value={chf(m.net)} sub={deltaTxt} good={m.net > 0} icon={<Icon.Wallet />} />
        <Kpi label={t('partner.kpi.fleetUtilisation')} value={`${m.utilisation}%`} sub={`${t('partner.kpi.thisMonth')} · ${total} ${total === 1 ? t('partner.car') : t('partner.cars')}`} good={m.utilisation > 0} icon={<Icon.Gauge />} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Panel title={t('partner.overview.netPayouts6mo')} action={<button onClick={() => setView('earnings')} className="ring-lux text-xs font-semibold text-stone hover:text-ink">{t('partner.common.details')}</button>}>
          <BarChart data={m.series} />
        </Panel>

        <Panel title={t('nav.fleet')} action={<button onClick={onAdd} className="ring-lux text-xs font-semibold text-gold hover:text-ink">{t('partner.common.add')}</button>}>
          {loading ? (
            <SkeletonRows />
          ) : total === 0 ? (
            <EmptyFleet onAdd={onAdd} compact />
          ) : (
            <div className="space-y-3">
              {listings.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{c.make} {c.model}</div>
                    <div className="text-xs text-stone tnum">{c.city || '—'} · {chf(c.price_per_day)}{t('partner.perDay')}</div>
                  </div>
                  <StatusPill status={c.status} />
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel title={t('partner.overview.recentBookings')} action={<button onClick={() => setView('bookings')} className="ring-lux text-xs font-semibold text-stone hover:text-ink">{t('partner.common.viewAll')}</button>}>
        {bookings === null ? (
          <SkeletonRows />
        ) : bk.length === 0 ? (
          <div className="py-6 text-center text-sm text-stone">{t('partner.overview.noBookings')}</div>
        ) : (
          <BookingsTable rows={bk.slice(0, 4)} compact />
        )}
      </Panel>
    </div>
  );
}

function EmbedCard() {
  const { partner } = useAuth();
  const t = useT();
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState('light');
  if (!partner) return null;
  const url = `${window.location.origin}/?embed=${partner.id}${theme === 'dark' ? '&theme=dark' : ''}`;
  const snippet = `<iframe src="${url}" style="width:100%;height:880px;border:0" title="AIRLUXO booking"></iframe>`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(snippet); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ }
  };
  return (
    <Panel title={t('partner.embed.title')}>
      <p className="text-sm text-stone">{t('partner.embed.desc')}</p>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-[0.65rem] uppercase tracking-wider text-stone">{t('partner.embed.theme')}</span>
        <div className="inline-flex rounded-full border border-mist bg-cloud p-1">
          {['light', 'dark'].map((mode) => (
            <button key={mode} onClick={() => setTheme(mode)} className={`ring-lux rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors ${theme === mode ? 'bg-ink text-cloud' : 'text-stone hover:text-ink'}`}>{mode === 'dark' ? t('partner.embed.themeDark') : t('partner.embed.themeLight')}</button>
          ))}
        </div>
      </div>

      <code className="mt-3 block overflow-x-auto whitespace-pre rounded-xl border border-mist bg-paper px-3 py-2.5 text-xs text-stone">{snippet}</code>
      <div className="mt-3 flex items-center gap-3">
        <button onClick={copy} className="ring-lux rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cloud transition-colors hover:bg-void">{copied ? t('partner.common.copied') : t('partner.embed.copy')}</button>
        <a href={url} target="_blank" rel="noreferrer" className="ring-lux text-sm font-semibold text-stone transition-colors hover:text-ink">{t('partner.embed.preview')}</a>
      </div>
    </Panel>
  );
}

/* ---------------- Settings (integrations) ---------------- */
function SettingsView({ onReplayTour }) {
  const t = useT();
  return (
    <div className="max-w-5xl space-y-6">
      <ProfileCard />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Panel title={t('partner.settings.guideTitle')}>
          <p className="text-sm text-stone">{t('partner.settings.guideDesc')}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <a href="/?docs" target="_blank" rel="noreferrer" className="ring-lux inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cloud transition-colors hover:bg-void">
              {t('partner.settings.openGuide')} <Icon.ArrowUpRight width={14} height={14} />
            </a>
            {onReplayTour && (
              <button onClick={onReplayTour} className="ring-lux inline-flex items-center gap-2 rounded-full border border-mist px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-ink">
                {t('partner.settings.replayGuide')}
              </button>
            )}
          </div>
        </Panel>
        <ChangePasswordCard />
        <WebhookCard />
        <CalendarCard />
        <EmbedCard />
      </div>
    </div>
  );
}

function SubLabel({ children }) {
  return <div className="mb-2 text-[0.7rem] font-bold uppercase tracking-wider text-stone">{children}</div>;
}

function ProfileCard() {
  const { partner, user, refreshPartner } = useAuth();
  const t = useT();
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const avatarRef = useRef(null);

  useEffect(() => {
    if (!partner) return;
    setF({
      company_name: partner.company_name || '', contact_name: partner.contact_name || '',
      website: partner.website || '', phone: partner.phone || '',
      support_name: partner.support_name || '', support_email: partner.support_email || '', support_phone: partner.support_phone || '',
      billing_name: partner.billing_name || '', billing_email: partner.billing_email || '', billing_phone: partner.billing_phone || '',
      invoice_email: partner.invoice_email || '', vat_number: partner.vat_number || '',
      company_address: partner.company_address || { ...EMPTY_ADDR, city: partner.city || '' },
      billing_address: partner.billing_address || { ...EMPTY_ADDR },
      billing_same_as_company: partner.billing_same_as_company ?? true,
    });
  }, [partner]);

  if (!f) return null;
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const since = partner.created_at || user?.created_at;
  const memberSince = since ? new Date(since).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '—';
  const payout = partner.stripe_charges_enabled
    ? { label: t('partner.profile.payoutConnected'), dot: 'bg-go', color: 'text-go' }
    : partner.stripe_account_id
      ? { label: t('partner.profile.payoutOnboarding'), dot: 'bg-gold', color: 'text-gold' }
      : { label: t('partner.profile.payoutNotConnected'), dot: 'bg-stone', color: 'text-stone' };
  const initials = (f.company_name || 'A').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  async function pickAvatar(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setMsg(null);
    try {
      const url = await uploadListingPhoto(file);
      await updatePartner({ avatar_url: url });
      await refreshPartner();
    } catch (err) { setMsg({ ok: false, text: err.message || t('partner.profile.errUpload') }); }
    finally { setBusy(false); }
  }
  async function removeAvatar() {
    setBusy(true); setMsg(null);
    try { await updatePartner({ avatar_url: null }); await refreshPartner(); } catch { /* ignore */ } finally { setBusy(false); }
  }

  async function save() {
    setBusy(true); setMsg(null);
    try {
      const txt = (v) => (typeof v === 'string' && v.trim() === '' ? null : (typeof v === 'string' ? v.trim() : v));
      const company = addrOrNull(f.company_address);
      const patch = {
        company_name: txt(f.company_name), contact_name: txt(f.contact_name),
        website: txt(f.website), phone: txt(f.phone),
        support_name: txt(f.support_name), support_email: txt(f.support_email), support_phone: txt(f.support_phone),
        billing_name: txt(f.billing_name), billing_email: txt(f.billing_email), billing_phone: txt(f.billing_phone),
        invoice_email: txt(f.invoice_email), vat_number: txt(f.vat_number),
        company_address: company,
        billing_same_as_company: !!f.billing_same_as_company,
        billing_address: f.billing_same_as_company ? company : addrOrNull(f.billing_address),
        city: f.company_address?.city || partner.city || null, // keep simple city in sync
      };
      await updatePartner(patch);
      await refreshPartner();
      setMsg({ ok: true, text: t('partner.profile.saved') }); setTimeout(() => setMsg(null), 2200);
    } catch (e) { setMsg({ ok: false, text: e.message || t('partner.profile.errSave') }); }
    finally { setBusy(false); }
  }

  return (
    <Panel title={t('partner.profile.title')}>
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          {partner.avatar_url
            ? <img src={partner.avatar_url} alt="" className="h-16 w-16 shrink-0 rounded-full border border-mist object-cover" />
            : <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gold-soft font-display text-xl text-ink">{initials}</span>}
          <div>
            <div className="text-sm font-semibold">{t('partner.profile.picture')}</div>
            <p className="text-xs text-stone">{t('partner.profile.pictureHint')}</p>
            <div className="mt-2 flex items-center gap-3">
              <input ref={avatarRef} type="file" accept="image/*" onChange={pickAvatar} className="hidden" />
              <button onClick={() => avatarRef.current?.click()} disabled={busy} className="ring-lux rounded-full border border-mist bg-cloud px-3.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-ink disabled:opacity-50">{partner.avatar_url ? t('partner.profile.change') : t('partner.profile.upload')}</button>
              {partner.avatar_url && <button onClick={removeAvatar} disabled={busy} className="ring-lux text-xs font-semibold text-red-600 transition-colors hover:underline disabled:opacity-50">{t('partner.profile.remove')}</button>}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border border-mist bg-cloud px-4 py-3">
          <div>
            <div className="text-[0.62rem] font-semibold uppercase tracking-wider text-stone">{t('partner.profile.memberSince')}</div>
            <div className="text-sm font-semibold">{memberSince}</div>
          </div>
          <div>
            <div className="text-[0.62rem] font-semibold uppercase tracking-wider text-stone">{t('partner.profile.payouts')}</div>
            <div className={`flex items-center gap-1.5 text-sm font-semibold ${payout.color}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${payout.dot}`} /> {payout.label}
            </div>
          </div>
          {!partner.stripe_charges_enabled && <span className="text-xs text-stone">{t('partner.profile.setupPayoutsPre')} <span className="font-semibold text-ink">{t('nav.earnings')}</span> {t('partner.profile.setupPayoutsPost')}</span>}
        </div>

        <div>
          <SubLabel>{t('partner.profile.company')}</SubLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormInput label={t('partner.profile.companyName')} value={f.company_name} onChange={set('company_name')} />
            <FormInput label={t('partner.profile.contactPerson')} value={f.contact_name} onChange={set('contact_name')} />
            <FormInput label={t('partner.profile.website')} value={f.website} onChange={set('website')} placeholder="https://…" />
            <FormInput label={t('partner.profile.companyPhone')} value={f.phone} onChange={set('phone')} placeholder="+41 …" />
            <FormInput label={t('partner.profile.loginEmail')} value={user?.email || ''} disabled />
          </div>
          <div className="mt-3 rounded-xl border border-mist bg-cloud p-3">
            <SubLabel>{t('partner.profile.companyAddress')}</SubLabel>
            <AddressFields value={f.company_address} onChange={(v) => setF((p) => ({ ...p, company_address: v }))} />
          </div>
        </div>

        <div className="border-t border-mist pt-4">
          <SubLabel>{t('partner.profile.supportContact')}</SubLabel>
          <p className="-mt-1 mb-2 text-xs text-stone">{t('partner.profile.supportHint')}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <FormInput label={t('partner.profile.name')} value={f.support_name} onChange={set('support_name')} />
            <FormInput label={t('partner.profile.email')} type="email" value={f.support_email} onChange={set('support_email')} placeholder="support@…" />
            <FormInput label={t('partner.profile.phone')} value={f.support_phone} onChange={set('support_phone')} placeholder="+41 …" />
          </div>
        </div>

        <div className="border-t border-mist pt-4">
          <SubLabel>{t('partner.profile.billing')}</SubLabel>
          <p className="-mt-1 mb-2 text-xs text-stone">{t('partner.profile.billingHint')}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <FormInput label={t('partner.profile.billingContact')} value={f.billing_name} onChange={set('billing_name')} />
            <FormInput label={t('partner.profile.billingEmail')} type="email" value={f.billing_email} onChange={set('billing_email')} placeholder="billing@…" />
            <FormInput label={t('partner.profile.billingPhone')} value={f.billing_phone} onChange={set('billing_phone')} placeholder="+41 …" />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <FormInput label={t('partner.profile.invoiceOnlyEmail')} type="email" value={f.invoice_email} onChange={set('invoice_email')} placeholder={t('partner.profile.invoicePlaceholder')} />
            <FormInput label={t('partner.profile.vatNumber')} value={f.vat_number} onChange={set('vat_number')} placeholder="CHE-123.456.789" />
          </div>
          <label className="mt-3 flex cursor-pointer items-center gap-2.5">
            <input type="checkbox" checked={f.billing_same_as_company} onChange={(e) => setF((p) => ({ ...p, billing_same_as_company: e.target.checked }))} className="ring-lux h-4 w-4 accent-ink" />
            <span className="text-sm font-semibold">{t('partner.profile.billingSameAsCompany')}</span>
          </label>
          {!f.billing_same_as_company && (
            <div className="mt-3 rounded-xl border border-mist bg-cloud p-3">
              <SubLabel>{t('partner.profile.billingAddress')}</SubLabel>
              <AddressFields value={f.billing_address} onChange={(v) => setF((p) => ({ ...p, billing_address: v }))} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-mist pt-4">
          <button onClick={save} disabled={busy} className="ring-lux rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-cloud transition-colors hover:bg-void disabled:opacity-50">{busy ? t('partner.profile.saving') : t('partner.profile.saveProfile')}</button>
          {msg && <span className={`text-xs font-semibold ${msg.ok ? 'text-go' : 'text-red-600'}`}>{msg.text}</span>}
        </div>
      </div>
    </Panel>
  );
}

function ChangePasswordCard() {
  const { updatePassword } = useAuth();
  const t = useT();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }

  async function save() {
    setMsg(null);
    if (pw.length < 8) { setMsg({ ok: false, text: t('partner.pw.errLen') }); return; }
    if (pw !== pw2) { setMsg({ ok: false, text: t('partner.pw.errMatch') }); return; }
    setBusy(true);
    const { error } = await updatePassword(pw);
    setBusy(false);
    if (error) setMsg({ ok: false, text: error.message || t('partner.pw.errUpdate') });
    else { setMsg({ ok: true, text: t('partner.pw.updated') }); setPw(''); setPw2(''); }
  }

  return (
    <Panel title={t('partner.pw.title')}>
      <p className="text-sm text-stone">{t('partner.pw.desc')}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <FormInput label={t('partner.pw.new')} type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder={t('partner.pw.atLeast8')} />
        <FormInput label={t('partner.pw.confirm')} type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder={t('partner.pw.repeat')} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button onClick={save} disabled={busy || !pw} className="ring-lux rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cloud transition-colors hover:bg-void disabled:opacity-50">{busy ? t('partner.profile.saving') : t('partner.pw.update')}</button>
        {msg && <span className={`text-xs font-semibold ${msg.ok ? 'text-go' : 'text-red-600'}`}>{msg.text}</span>}
      </div>
    </Panel>
  );
}

function WebhookCard() {
  const { partner, refreshPartner } = useAuth();
  const t = useT();
  const [url, setUrl] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [test, setTest] = useState(null);
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!partner) return;
    setUrl(partner.webhook_url || '');
    setEnabled(!!partner.webhook_enabled);
    setSecret(partner.webhook_secret || '');
  }, [partner]);

  async function save() {
    setBusy(true); setSaved(false); setTest(null);
    try {
      let s = secret;
      if (enabled && url && !s) { s = newWebhookSecret(); setSecret(s); }
      await saveWebhook({ url, enabled, secret: s || null });
      await refreshPartner();
      setSaved(true); setTimeout(() => setSaved(false), 1800);
    } catch { /* ignore */ } finally { setBusy(false); }
  }
  async function runTest() {
    setBusy(true); setTest(null);
    try { setTest(await sendTestWebhook()); }
    catch (e) { setTest({ error: e.message || 'Failed' }); }
    finally { setBusy(false); }
  }
  const copySecret = async () => { try { await navigator.clipboard.writeText(secret); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ } };

  return (
    <Panel title={t('partner.webhook.title')}>
      <p className="text-sm text-stone">{t('partner.webhook.desc')}</p>
      <div className="mt-3 space-y-3">
        <FormInput label={t('partner.webhook.endpointUrl')} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.yoursite.com/airluxo/bookings" />
        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-mist bg-cloud px-3.5 py-2.5">
          <span className="text-sm font-semibold">{t('partner.webhook.enabled')}</span>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="ring-lux h-4 w-4 accent-ink" />
        </label>
        {secret && (
          <div className="rounded-xl border border-mist bg-cloud p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[0.65rem] uppercase tracking-wider text-stone">{t('partner.webhook.signingSecret')}</span>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <button onClick={() => setShowSecret((s) => !s)} className="ring-lux text-stone transition-colors hover:text-ink">{showSecret ? t('partner.webhook.hide') : t('partner.webhook.reveal')}</button>
                <button onClick={copySecret} className="ring-lux text-stone transition-colors hover:text-ink">{copied ? t('partner.common.copied') : t('partner.webhook.copy')}</button>
                <button onClick={() => setSecret(newWebhookSecret())} className="ring-lux text-stone transition-colors hover:text-ink">{t('partner.webhook.regenerate')}</button>
              </div>
            </div>
            <code className="mt-1.5 block truncate text-xs text-ink">{showSecret ? secret : '•'.repeat(32)}</code>
            <p className="mt-1.5 text-[0.7rem] leading-relaxed text-stone">{t('partner.webhook.signaturePre')} <code>X-AIRLUXO-Signature: sha256=HMAC(secret, rawBody)</code>. {t('partner.webhook.signaturePost')}</p>
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button onClick={save} disabled={busy} className="ring-lux rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cloud transition-colors hover:bg-void disabled:opacity-50">{saved ? t('partner.common.savedCheck') : t('partner.common.save')}</button>
        <button onClick={runTest} disabled={busy || !url} className="ring-lux rounded-full border border-mist px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-ink disabled:opacity-50">{t('partner.webhook.sendTest')}</button>
        {test && (
          test.error ? <span className="text-xs font-semibold text-red-600">{t('partner.webhook.testFailed', { error: test.error })}</span>
          : test.skipped ? <span className="text-xs text-stone">{t('partner.webhook.saveEnabledFirst')}</span>
          : test.delivered ? <span className="text-xs font-semibold text-go">{t('partner.webhook.delivered', { status: test.status })}</span>
          : <span className="text-xs font-semibold text-red-600">{t('partner.webhook.endpointReturned', { status: test.status || t('partner.webhook.anError') })}</span>
        )}
      </div>
    </Panel>
  );
}

function CalendarCard() {
  const { partner, refreshPartner } = useAuth();
  const t = useT();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { if (partner?.calendar_token) setUrl(calendarFeedUrl(partner.calendar_token)); }, [partner]);

  async function enable() {
    setBusy(true);
    try { setUrl(await ensureCalendarFeed(partner)); await refreshPartner(); } finally { setBusy(false); }
  }
  const copy = async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ } };

  return (
    <Panel title={t('partner.calsub.title')}>
      <p className="text-sm text-stone">{t('partner.calsub.desc')}</p>
      {url ? (
        <>
          <code className="mt-3 block overflow-x-auto whitespace-pre rounded-xl border border-mist bg-paper px-3 py-2.5 text-xs text-stone">{url}</code>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button onClick={copy} className="ring-lux rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cloud transition-colors hover:bg-void">{copied ? t('partner.common.copied') : t('partner.calsub.copyUrl')}</button>
            <a href={url} target="_blank" rel="noreferrer" className="ring-lux text-sm font-semibold text-stone transition-colors hover:text-ink">{t('partner.calsub.openIcs')}</a>
          </div>
          <p className="mt-2 text-[0.7rem] text-stone">{t('partner.calsub.pasteNote')}</p>
        </>
      ) : (
        <button onClick={enable} disabled={busy} className="ring-lux mt-3 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cloud transition-colors hover:bg-void disabled:opacity-50">{busy ? t('partner.calsub.generating') : t('partner.calsub.generate')}</button>
      )}
    </Panel>
  );
}

/* ---------------- Fleet (real CRUD) ---------------- */
function Fleet({ listings, blocks, onAdd, reload }) {
  const t = useT();
  const [busyId, setBusyId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [blocking, setBlocking] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  if (listings === null) {
    return <div className="grid gap-4 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-[210px] rounded-[var(--radius-card)] border border-mist bg-cloud shimmer" />)}</div>;
  }

  async function remove(id) {
    setBusyId(id);
    try { await deleteListing(id); await reload(); } finally { setBusyId(null); }
  }
  async function cycleStatus(c) {
    const order = ['Available', 'Booked', 'Maintenance'];
    const next = order[(order.indexOf(c.status) + 1) % order.length];
    setBusyId(c.id);
    try { await updateListing(c.id, { status: next }); await reload(); } finally { setBusyId(null); }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone">
          {listings.length === 0 ? t('partner.fleet.none') : t(listings.length === 1 ? 'partner.fleet.countOne' : 'partner.fleet.countMany', { n: listings.length })}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setImportOpen(true)} className="ring-lux flex items-center gap-1.5 rounded-full border border-mist bg-cloud px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:border-ink"><Icon.ArrowUpRight width={14} height={14} className="rotate-180" /> {t('partner.fleet.import')}</button>
          <button onClick={() => exportFleet(listings, 'csv')} disabled={!listings?.length} className="ring-lux flex items-center gap-1.5 rounded-full border border-mist bg-cloud px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:border-ink disabled:opacity-50"><Icon.ArrowUpRight width={14} height={14} /> {t('partner.fleet.export')}</button>
          <button onClick={onAdd} className="ring-lux flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cloud transition-colors hover:bg-void"><Icon.Plus width={15} height={15} /> {t('partner.listCar')}</button>
        </div>
      </div>

      {listings.length === 0 ? (
        <EmptyFleet onAdd={onAdd} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {listings.map((c) => {
            const carBlocks = (blocks || []).filter((bk) => bk.listing_id === c.id);
            return (
            <div key={c.id} className="overflow-hidden rounded-[var(--radius-card)] border border-mist bg-cloud">
              <div className="relative aspect-[16/9] bg-mist">
                {c.photo_url ? (
                  <img src={c.photo_url} alt={`${c.make} ${c.model}`} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-end bg-gradient-to-br from-coal to-void p-4">
                    <span className="font-display text-2xl text-cloud/85">{c.make} {c.model}</span>
                  </div>
                )}
                <button onClick={() => setEditing(c)} title={t('partner.fleet.editDetails')} className="ring-lux absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-cloud/90 text-ink shadow-md backdrop-blur transition-colors hover:bg-cloud"><Icon.Gear width={16} height={16} /></button>
                <div className="absolute right-3 top-3"><StatusPill status={c.status} /></div>
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <BrandLogo make={c.make} />
                    <div className="min-w-0">
                    <div className="font-display text-lg leading-tight break-words">{c.make} {c.model}</div>
                    <div className="mt-0.5 text-xs text-stone tnum">{c.category} · {c.city || '—'}{c.year ? ` · ${c.year}` : ''}</div>
                    {(c.exterior_color || c.interior_color || c.fuel || c.cross_border_allowed || carBlocks.length > 0) && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {c.fuel && <span className="rounded-full border border-mist px-2 py-0.5 text-[0.65rem] font-semibold text-stone">{c.fuel}</span>}
                        {c.exterior_color && <span className="rounded-full border border-mist px-2 py-0.5 text-[0.65rem] font-semibold text-stone">{c.exterior_color}</span>}
                        {c.interior_color && <span className="rounded-full border border-mist px-2 py-0.5 text-[0.65rem] font-semibold text-stone">{t('partner.fleet.interiorSuffix', { color: c.interior_color })}</span>}
                        {c.cross_border_allowed && <span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[0.65rem] font-semibold text-gold">{t('partner.fleet.crossBorder')}</span>}
                        {carBlocks.length > 0 && <span className="rounded-full border border-stone/30 bg-mist px-2 py-0.5 text-[0.65rem] font-semibold text-stone">{t(carBlocks.length === 1 ? 'partner.fleet.blockedPeriodsOne' : 'partner.fleet.blockedPeriodsMany', { n: carBlocks.length })}</span>}
                      </div>
                    )}
                    </div>
                  </div>
                  <div className="shrink-0 pl-3 text-right">
                    <div className="font-display text-lg tnum">{chf(c.price_per_day)}</div>
                    <div className="text-[0.7rem] uppercase tracking-wider text-stone">{t('partner.fleet.day')}</div>
                  </div>
                </div>

                <div className="mt-5 flex gap-2 border-t border-mist pt-4">
                  <button onClick={() => setBlocking(c)} className="ring-lux flex-1 rounded-lg border border-mist py-2 text-xs font-semibold text-ink transition-colors hover:border-ink">{t('partner.fleet.block')}</button>
                  <button onClick={() => cycleStatus(c)} disabled={busyId === c.id} className="ring-lux flex-1 rounded-lg border border-mist py-2 text-xs font-semibold text-ink transition-colors hover:border-ink disabled:opacity-50">{t('partner.fleet.status')}</button>
                  <button onClick={() => remove(c.id)} disabled={busyId === c.id} className="ring-lux flex-1 rounded-lg border border-mist py-2 text-xs font-semibold text-red-600 transition-colors hover:border-red-400 hover:bg-red-50 disabled:opacity-50">{busyId === c.id ? '…' : t('partner.fleet.delete')}</button>
                </div>
              </div>
            </div>
            );
          })}

          <button onClick={onAdd} className="ring-lux flex min-h-[210px] flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border border-dashed border-mist text-stone transition-colors hover:border-ink hover:text-ink">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-mist/60"><Icon.Plus /></span>
            <span className="text-sm font-semibold">{t('partner.fleet.listAnother')}</span>
          </button>
        </div>
      )}

      <AnimatePresence>
        {editing && <EditCar car={editing} onClose={() => setEditing(null)} onSaved={reload} />}
        {blocking && <BlockModal car={blocking} blocks={(blocks || []).filter((bk) => bk.listing_id === blocking.id)} onClose={() => setBlocking(null)} onSaved={reload} />}
        {importOpen && <ImportModal onClose={() => setImportOpen(false)} onDone={reload} />}
      </AnimatePresence>
    </div>
  );
}

function EmptyFleet({ onAdd, compact }) {
  const t = useT();
  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-mist text-center ${compact ? 'py-8' : 'py-20'}`}>
      <span className="grid h-14 w-14 place-items-center rounded-full bg-paper text-stone"><Icon.Car width={24} height={24} /></span>
      <h3 className="font-display mt-4 text-lg">{t('partner.fleet.emptyTitle')}</h3>
      <p className="mt-1 max-w-xs px-4 text-sm text-stone">{t('partner.fleet.emptyDesc')}</p>
      <button onClick={onAdd} className="ring-lux mt-5 flex items-center gap-1.5 rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-cloud transition-colors hover:bg-void">
        <Icon.Plus width={15} height={15} /> {t('partner.listCar')}
      </button>
    </div>
  );
}

function SkeletonRows() {
  return <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-9 rounded-lg shimmer" />)}</div>;
}

/* ---------------- Bookings (real) ---------------- */
function Bookings({ bookings, blocks, reload }) {
  const t = useT();
  const dl = localeTag(useI18n().locale);
  if (bookings === null) {
    return <div className="rounded-[var(--radius-card)] border border-mist bg-cloud p-5"><SkeletonRows /></div>;
  }
  return (
    <div className="space-y-5">
      <p className="text-sm text-stone">
        {bookings.length === 0 ? t('partner.bookings.none') : t(bookings.length === 1 ? 'partner.bookings.countOne' : 'partner.bookings.countMany', { n: bookings.length })}
      </p>
      {bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-mist py-20 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-paper text-stone"><Icon.Calendar2 width={24} height={24} /></span>
          <h3 className="font-display mt-4 text-lg">{t('partner.bookings.emptyTitle')}</h3>
          <p className="mt-1 max-w-xs px-4 text-sm text-stone">{t('partner.bookings.emptyDesc')}</p>
        </div>
      ) : (
        <Panel noPad><BookingsTable rows={bookings} reload={reload} /></Panel>
      )}

      {blocks && blocks.length > 0 && (
        <Panel title={t('partner.bookings.internalBlocks')}>
          <div className="space-y-3">
            {blocks.map((b) => (
              <div key={b.id} className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{b.car_label || t('partner.bookings.car')} <span className="font-normal text-stone">· {b.reason || t('partner.bookings.blocked')}</span></div>
                  <div className="text-xs text-stone tnum">{fmtDate(b.start_date, dl)} → {fmtDate(b.end_date, dl)}{b.blocked_by ? ` · ${t('partner.bookings.by', { who: b.blocked_by })}` : ''}</div>
                </div>
                <span className="rounded-full bg-mist px-2.5 py-1 text-[0.7rem] font-bold text-stone">{t('partner.bookings.blocked')}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

/* ---------------- Calendar (in-app month view + ICS subscribe) ---------------- */
function CalPopover({ children }) {
  return (
    <div className="pointer-events-none absolute left-0 top-full z-30 mt-1 hidden w-52 rounded-lg border border-mist bg-cloud p-2.5 text-left shadow-xl group-hover/ev:block">
      {children}
    </div>
  );
}

function Calendar({ bookings, blocks }) {
  const { partner } = useAuth();
  const t = useT();
  const { locale } = useI18n();
  const dl = localeTag(locale);
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [copied, setCopied] = useState(false);

  const rows = bookings ?? [];
  const pad = (n) => String(n).padStart(2, '0');
  const monthStart = new Date(cursor.y, cursor.m, 1);
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const leadBlanks = (monthStart.getDay() + 6) % 7; // Monday-first
  const monthName = monthStart.toLocaleDateString(dl, { month: 'long', year: 'numeric' });
  const monthPrefix = `${cursor.y}-${pad(cursor.m + 1)}`;

  const iso = (d) => `${monthPrefix}-${pad(d)}`;
  const bookingsOn = (d) => {
    const day = iso(d);
    return rows.filter((b) => {
      const e = b.end_date && b.end_date >= b.start_date ? b.end_date : b.start_date;
      return day >= b.start_date && day <= e;
    });
  };
  const blockRows = blocks ?? [];
  const blocksOn = (d) => {
    const day = iso(d);
    return blockRows.filter((b) => day >= b.start_date && day <= b.end_date);
  };

  const cells = [];
  for (let i = 0; i < leadBlanks; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);

  const chipColor = (s) =>
    s === 'Pending' ? 'bg-gold/20 text-gold'
      : (s === 'Declined' || s === 'Cancelled') ? 'bg-mist text-stone line-through'
      : 'bg-ink text-cloud';

  const feedUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-feed?token=${partner?.calendar_token || ''}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(feedUrl); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ }
  };

  const monthBookings = rows
    .filter((b) => b.start_date.startsWith(monthPrefix) || (b.end_date && b.end_date.startsWith(monthPrefix)))
    .sort((a, b) => a.start_date.localeCompare(b.start_date));

  return (
    <div className="space-y-6">
      <div className="rounded-[var(--radius-card)] border border-mist bg-cloud p-5">
        <div className="flex items-center gap-2"><Icon.Calendar width={16} height={16} className="text-gold" /><h3 className="font-display text-base">{t('partner.cal.syncTitle')}</h3></div>
        <p className="mt-1.5 text-sm text-stone">{t('partner.cal.syncDesc')}</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <code className="flex-1 truncate rounded-xl border border-mist bg-paper px-3 py-2.5 text-xs text-stone">{feedUrl}</code>
          <button onClick={copy} className="ring-lux shrink-0 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-cloud transition-colors hover:bg-void">{copied ? t('partner.common.copied') : t('partner.cal.copyLink')}</button>
        </div>
        <p className="mt-2 text-xs text-stone">{t('partner.cal.syncHint1')} <span className="font-semibold text-ink">{t('partner.cal.fromUrl')}</span>{t('partner.cal.syncHint2')} <span className="font-semibold text-ink">{t('partner.cal.newSubscription')}</span>.</p>
      </div>

      <div className="rounded-[var(--radius-card)] border border-mist bg-cloud p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg">{monthName}</h3>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setCursor((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }))} className="ring-lux grid h-8 w-8 place-items-center rounded-full border border-mist text-ink transition-colors hover:border-ink"><Icon.Arrow width={15} height={15} className="rotate-180" /></button>
            <button onClick={() => { const d = new Date(); setCursor({ y: d.getFullYear(), m: d.getMonth() }); }} className="ring-lux rounded-full border border-mist px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-ink">{t('partner.cal.today')}</button>
            <button onClick={() => setCursor((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }))} className="ring-lux grid h-8 w-8 place-items-center rounded-full border border-mist text-ink transition-colors hover:border-ink"><Icon.Arrow width={15} height={15} /></button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-px rounded-xl border border-mist bg-mist">
          {weekdayShorts(locale).map((d, i) => (
            <div key={i} className="bg-paper py-2 text-center text-[0.65rem] font-bold uppercase tracking-wider text-stone">{d}</div>
          ))}
          {cells.map((d, i) => {
            if (d === null) return <div key={`b${i}`} className="min-h-[5rem] bg-cloud/40" />;
            const list = bookingsOn(d);
            const blist = blocksOn(d);
            return (
              <div key={d} className="min-h-[5rem] bg-cloud p-1.5">
                <div className="text-xs font-semibold text-stone tnum">{d}</div>
                <div className="mt-1 space-y-1">
                  {list.slice(0, 2).map((b) => (
                    <div key={b.id} className="group/ev relative">
                      <div className={`truncate rounded px-1.5 py-0.5 text-[0.6rem] font-semibold ${chipColor(b.status)}`}>{b.car_label}</div>
                      <CalPopover>
                        <div className="text-xs font-bold text-ink">{b.car_label}</div>
                        <div className="mt-1 space-y-0.5 text-[0.65rem] text-stone">
                          <div>{b.guest_name}</div>
                          <div className="tnum">{fmtDate(b.start_date, dl)}{b.end_date && b.end_date !== b.start_date ? ` → ${fmtDate(b.end_date, dl)}` : ''}{b.pickup_time ? ` · ${b.pickup_time}` : ''}</div>
                          <div><span className="font-semibold text-ink tnum">{chf(b.total_amount)}</span> · {statusLabel(t, b.status)}</div>
                        </div>
                      </CalPopover>
                    </div>
                  ))}
                  {list.length > 2 && <div className="text-[0.6rem] font-semibold text-stone">{t('partner.cal.moreCount', { n: list.length - 2 })}</div>}
                  {blist.slice(0, 2).map((b) => (
                    <div key={b.id} className="group/ev relative">
                      <div className="flex items-center gap-1 truncate rounded border border-dashed border-stone/40 bg-mist px-1.5 py-0.5 text-[0.6rem] font-semibold text-stone">⦸ <span className="truncate">{b.car_label || t('partner.bookings.blocked')}</span></div>
                      <CalPopover>
                        <div className="text-xs font-bold text-ink">{b.car_label || t('partner.bookings.car')}</div>
                        <div className="mt-1 space-y-0.5 text-[0.65rem] text-stone">
                          <div className="font-semibold text-stone">{t('partner.cal.internalBlock')}</div>
                          <div>{b.reason || t('partner.bookings.blocked')}</div>
                          <div className="tnum">{fmtDate(b.start_date, dl)} → {fmtDate(b.end_date, dl)}</div>
                          {b.blocked_by && <div>{t('partner.bookings.by', { who: b.blocked_by })}</div>}
                        </div>
                      </CalPopover>
                    </div>
                  ))}
                  {blist.length > 2 && <div className="text-[0.6rem] font-semibold text-stone">{t('partner.cal.blockedCount', { n: blist.length - 2 })}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {bookings === null ? (
        <div className="rounded-[var(--radius-card)] border border-mist bg-cloud p-5"><SkeletonRows /></div>
      ) : monthBookings.length > 0 && (
        <Panel title={t(monthBookings.length === 1 ? 'partner.cal.monthBookingsOne' : 'partner.cal.monthBookingsMany', { month: monthName, n: monthBookings.length })}>
          <div className="space-y-3">
            {monthBookings.map((b) => (
              <div key={b.id} className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{b.car_label} <span className="font-normal text-stone">· {b.guest_name}</span></div>
                  <div className="text-xs text-stone tnum">{fmtDate(b.start_date, dl)}{b.end_date && b.end_date !== b.start_date ? ` → ${fmtDate(b.end_date, dl)}` : ''}</div>
                </div>
                <StatusPill status={b.status} />
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

/* ---------------- Location & opening hours ---------------- */
const DAYS = [['mon', 'Monday'], ['tue', 'Tuesday'], ['wed', 'Wednesday'], ['thu', 'Thursday'], ['fri', 'Friday'], ['sat', 'Saturday'], ['sun', 'Sunday']];
const DEFAULT_HOURS = DAYS.reduce((o, [k]) => { o[k] = { closed: k === 'sun', open: '08:00', close: '18:00' }; return o; }, {});

function hoursSummary(l, t) {
  if (!l.opening_hours) return t('partner.location.openAnyTime');
  const open = DAYS.filter(([k]) => l.opening_hours[k] && !l.opening_hours[k].closed).length;
  const after = l.allow_after_hours ? `${t('partner.location.afterHoursOk')}${l.after_hours_fee ? ` (${chf(l.after_hours_fee)})` : ''}` : '';
  return `${t(open === 1 ? 'partner.location.daysPerWeekOne' : 'partner.location.daysPerWeekMany', { n: open })}${after}`;
}

function LocationView() {
  const t = useT();
  const [locations, setLocations] = useState([]);
  const [editing, setEditing] = useState(null); // 'new' | location id | null
  const [draft, setDraft] = useState(EMPTY_LOC);
  const [locBusy, setLocBusy] = useState(false);
  const [err, setErr] = useState('');
  const reloadLocs = async () => { try { setLocations(await fetchLocations()); } catch { /* ignore */ } };
  useEffect(() => { reloadLocs(); }, []);

  const startAdd = () => { setDraft({ ...EMPTY_LOC }); setEditing('new'); setErr(''); };
  const startEdit = (l) => { setDraft(toLocDraft(l)); setEditing(l.id); setErr(''); };
  const cancel = () => { setEditing(null); setDraft(EMPTY_LOC); setErr(''); };

  async function save() {
    if (!draft.address?.trim() && !draft.label?.trim()) { setErr(t('partner.location.errLabelOrAddress')); return; }
    setLocBusy(true); setErr('');
    try {
      const payload = buildLocPayload(draft);
      if (editing === 'new') await createLocation(payload);
      else await updateLocation(editing, payload);
      await reloadLocs();
      cancel();
    } catch (e) { setErr(e.message || t('partner.location.errSave')); }
    finally { setLocBusy(false); }
  }
  async function removeLocation(id) {
    setLocBusy(true);
    try { await deleteLocation(id); await reloadLocs(); } finally { setLocBusy(false); }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Panel title={t('partner.location.title')}>
        {locations.length > 0 && (
          <div className="mb-4 space-y-2">
            {locations.map((l) => (
              <div key={l.id}>
                {editing === l.id ? (
                  <LocationEditor draft={draft} setDraft={setDraft} onSave={save} onCancel={cancel} busy={locBusy} err={err} title={t('partner.location.editTitle')} />
                ) : (
                  <div className="flex items-start justify-between gap-3 rounded-xl border border-mist bg-cloud px-3.5 py-2.5">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{l.label || l.city || t('partner.location.locationFallback')}</div>
                      <div className="truncate text-xs text-stone">{[locLine(l), l.zip && l.city ? `${l.zip} ${l.city}` : l.city, l.country && l.country !== 'Switzerland' ? l.country : null].filter(Boolean).join(' · ') || '—'}</div>
                      {(l.phone || l.email) && <div className="truncate text-xs text-stone">{[l.phone, l.email].filter(Boolean).join(' · ')}</div>}
                      <div className="mt-0.5 text-[0.7rem] text-stone">{hoursSummary(l, t)}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <button onClick={() => startEdit(l)} disabled={locBusy} className="ring-lux text-xs font-semibold text-ink transition-colors hover:text-gold disabled:opacity-50">{t('partner.common.edit')}</button>
                      <button onClick={() => removeLocation(l.id)} disabled={locBusy} className="ring-lux text-xs font-semibold text-red-600 transition-colors hover:underline disabled:opacity-50">{t('partner.common.remove')}</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {editing === 'new' ? (
          <LocationEditor draft={draft} setDraft={setDraft} onSave={save} onCancel={cancel} busy={locBusy} err={err} title={t('partner.location.newTitle')} />
        ) : editing === null ? (
          <button onClick={startAdd} className="ring-lux flex items-center gap-1.5 rounded-full border border-mist bg-cloud px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-ink"><Icon.Plus width={14} height={14} /> {t('partner.location.addLocation')}</button>
        ) : null}
        <p className="mt-2 text-xs text-stone">{t('partner.location.hint')}</p>
      </Panel>
    </div>
  );
}

function LocationEditor({ draft, setDraft, onSave, onCancel, busy, err, title }) {
  const t = useT();
  return (
    <div className="rounded-xl border border-mist bg-cloud p-3.5">
      <div className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-stone">{title}</div>
      <LocationForm value={draft} onChange={setDraft} />
      <div className="mt-3">
        <OpeningHoursEditor value={draft} onChange={setDraft} />
      </div>
      {err && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{err}</div>}
      <div className="mt-3 flex items-center gap-2">
        <button onClick={onSave} disabled={busy} className="ring-lux flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cloud transition-colors hover:bg-void disabled:opacity-50">{busy ? t('partner.profile.saving') : t('partner.location.saveLocation')}</button>
        <button onClick={onCancel} className="ring-lux rounded-full border border-mist px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-ink">{t('partner.common.cancel')}</button>
      </div>
    </div>
  );
}

function OpeningHoursEditor({ value, onChange }) {
  const t = useT();
  const { locale } = useI18n();
  const dayNames = weekdayLongs(locale);
  const hours = value.opening_hours;
  const enabled = !!hours;
  const setHours = (h) => onChange({ ...value, opening_hours: h });
  const setDay = (k, field, val) => setHours({ ...hours, [k]: { ...(hours[k] || {}), [field]: val } });
  return (
    <div className="rounded-xl border border-mist bg-paper p-3.5">
      <label className="flex cursor-pointer items-center justify-between">
        <span className="text-sm font-semibold">{t('partner.location.setHours')}</span>
        <input type="checkbox" checked={enabled} onChange={(e) => onChange({ ...value, opening_hours: e.target.checked ? { ...DEFAULT_HOURS } : null })} className="ring-lux h-4 w-4 accent-ink" />
      </label>
      {!enabled && <p className="mt-1 text-xs text-stone">{t('partner.location.noHours')}</p>}
      {enabled && (
        <>
          <div className="mt-3 space-y-2">
            {DAYS.map(([k], i) => {
              const d = hours[k] || { closed: false, open: '08:00', close: '18:00' };
              return (
                <div key={k} className="flex flex-wrap items-center gap-3">
                  <span className="w-20 text-sm font-semibold capitalize">{dayNames[i]}</span>
                  <label className="flex items-center gap-1.5 text-xs text-stone">
                    <input type="checkbox" checked={!!d.closed} onChange={(e) => setDay(k, 'closed', e.target.checked)} className="ring-lux h-4 w-4 accent-ink" /> {t('partner.location.closed')}
                  </label>
                  {!d.closed && (
                    <div className="flex items-center gap-2">
                      <input type="time" value={d.open || '08:00'} onChange={(e) => setDay(k, 'open', e.target.value)} className="ring-lux rounded-lg border border-mist bg-cloud px-2 py-1.5 text-sm outline-none transition-colors focus:border-ink" />
                      <span className="text-stone">–</span>
                      <input type="time" value={d.close || '18:00'} onChange={(e) => setDay(k, 'close', e.target.value)} className="ring-lux rounded-lg border border-mist bg-cloud px-2 py-1.5 text-sm outline-none transition-colors focus:border-ink" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <label className="mt-3 flex cursor-pointer items-center justify-between border-t border-mist pt-3">
            <span className="text-sm font-semibold">{t('partner.location.allowAfterHours')}</span>
            <input type="checkbox" checked={!!value.allow_after_hours} onChange={(e) => onChange({ ...value, allow_after_hours: e.target.checked })} className="ring-lux h-4 w-4 accent-ink" />
          </label>
          {value.allow_after_hours && (
            <div className="mt-2"><FormInput label={t('partner.location.afterHoursFee')} type="number" value={value.after_hours_fee ?? ''} onChange={(e) => onChange({ ...value, after_hours_fee: e.target.value })} placeholder="e.g. 80" /></div>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- Plans (subscription tiers) ---------------- */
function Plans({ listings }) {
  const { partner } = useAuth();
  const t = useT();
  const current = partner?.plan || 'free';
  const cur = planOf(current);
  const limit = carLimit(current);
  const [msg, setMsg] = useState('');
  const carCount = Array.isArray(listings) ? listings.length : 0;
  const full = limit != null && carCount >= limit;
  return (
    <div className="space-y-6">
      <div className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs ${full ? 'border-gold/40 bg-gold/10 text-ink' : 'border-mist bg-cloud text-stone'}`}>
        {t('partner.plans.youreOn')} <span className="font-semibold text-ink">{cur.name}</span> · {carCount}{limit != null ? ` / ${limit}` : ''} {carCount === 1 ? t('partner.car') : t('partner.cars')} · <span className="font-semibold text-ink">{cur.commission}%</span> {t('partner.plans.commission')}{full ? t('partner.plans.reachedLimit') : '.'}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {PLAN_LIST.map((p) => {
          const isCurrent = p.id === current;
          const carsLabel = p.carLimit ? t('partner.plans.upToCars', { n: p.carLimit }) : t('partner.plans.unlimitedCars');
          return (
            <div key={p.id} className={`relative flex flex-col rounded-[var(--radius-card)] border p-6 ${p.popular ? 'border-ink shadow-[0_30px_60px_-40px_rgba(11,11,12,0.4)]' : 'border-mist'} bg-cloud`}>
              {p.popular && <span className="absolute -top-2.5 left-6 rounded-full bg-gold px-2.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-ink">{t('partner.plans.mostPopular')}</span>}
              <div className="eyebrow text-stone">{p.tagline}</div>
              <h3 className="font-display mt-1 text-2xl">{p.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-4xl tnum">{p.price === 0 ? 'CHF 0' : chf(p.price)}</span>
                <span className="text-sm text-stone">{t('partner.plans.perMonth')}</span>
              </div>
              <div className="mt-1 text-sm font-semibold text-gold">{t('partner.plans.commissionCars', { pct: p.commission, cars: carsLabel })}</div>
              <ul className="mt-5 mb-6 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-ink"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-go/12 text-go"><Icon.Check width={13} height={13} /></span>{f}</li>
                ))}
              </ul>
              <button
                onClick={() => !isCurrent && setMsg(t('partner.plans.contactMsg', { name: p.name }))}
                disabled={isCurrent}
                className={`ring-lux mt-auto w-full rounded-2xl py-3.5 text-sm font-bold transition-colors ${isCurrent ? 'cursor-default border border-mist text-stone' : p.popular ? 'bg-ink text-cloud hover:bg-void' : 'border border-ink text-ink hover:bg-ink hover:text-cloud'}`}
              >
                {isCurrent ? t('partner.plans.currentPlan') : t('partner.plans.switchTo', { name: p.name })}
              </button>
            </div>
          );
        })}
      </div>
      {msg && <div className="rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-ink">{msg}</div>}
    </div>
  );
}

/* ---------------- Earnings (from real bookings) ---------------- */
function Earnings({ bookings }) {
  const { partner } = useAuth();
  const t = useT();
  const { locale } = useI18n();
  const rate = commissionRate(partner?.plan);
  const rows = (bookings ?? []).filter((b) => b.status !== 'Declined' && b.status !== 'Cancelled');
  const gross = rows.reduce((a, b) => a + Number(b.base_amount) + Number(b.addons_amount || 0), 0);
  const fee = Math.round(gross * rate);
  const net = gross - fee;
  return (
    <div className="space-y-7">
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label={t('partner.earnings.gross')} value={chf(gross)} sub={t(rows.length === 1 ? 'partner.earnings.reservationsOne' : 'partner.earnings.reservationsMany', { n: rows.length })} icon={<Icon.Calendar2 />} />
        <Kpi label={t('partner.earnings.commission', { pct: Math.round(rate * 100) })} value={`– ${chf(fee)}`} sub={t('partner.earnings.planSub', { plan: planOf(partner?.plan).name })} icon={<Icon.Wallet />} />
        <Kpi label={t('partner.earnings.netPayout')} value={chf(net)} sub={t('partner.earnings.settledIban')} good icon={<Icon.ArrowUpRight />} />
      </div>
      <Panel title={t('partner.overview.netPayouts6mo')}><BarChart data={computeMetrics(bookings, [], rate, locale).series} /></Panel>
    </div>
  );
}


/* ---------------- shared pieces ---------------- */
function Kpi({ label, value, sub, good, sample, icon }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-mist bg-cloud p-5">
      <div className="flex items-center justify-between text-stone">
        <span className="eyebrow flex items-center gap-1.5">{label}{sample && <span className="rounded bg-mist px-1 py-0.5 text-[0.55rem] tracking-wider">SAMPLE</span>}</span>
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-paper text-ink">{icon}</span>
      </div>
      <div className="font-display mt-4 text-[2rem] leading-none tnum">{value}</div>
      <div className={`mt-2 flex items-center gap-1 text-xs ${good ? 'text-go' : 'text-stone'}`}>{good && <Icon.ArrowUpRight width={12} height={12} />} {sub}</div>
    </div>
  );
}

function Panel({ title, action, badge, children, noPad }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-mist bg-cloud">
      {title && (
        <div className="flex items-center justify-between border-b border-mist px-5 py-4">
          <h3 className="font-display flex items-center gap-2 text-base">{title}{badge && <span className="rounded bg-mist px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-stone">{badge}</span>}</h3>
          {action}
        </div>
      )}
      <div className={noPad ? '' : 'p-5'}>{children}</div>
    </div>
  );
}

const BRAND_DOMAINS = {
  porsche: 'porsche.com', ferrari: 'ferrari.com', lamborghini: 'lamborghini.com',
  'mercedes-amg': 'mercedes-benz.com', 'mercedes-benz': 'mercedes-benz.com', mercedes: 'mercedes-benz.com',
  bmw: 'bmw.com', audi: 'audi.com', bentley: 'bentleymotors.com', 'aston martin': 'astonmartin.com',
  mclaren: 'mclaren.com', 'range rover': 'landrover.com', 'land rover': 'landrover.com',
  maserati: 'maserati.com', 'rolls-royce': 'rolls-roycemotorcars.com', 'rolls royce': 'rolls-roycemotorcars.com',
  tesla: 'tesla.com', jaguar: 'jaguar.com', lexus: 'lexus.com', volkswagen: 'vw.com', vw: 'vw.com',
  toyota: 'toyota.com', volvo: 'volvocars.com', jeep: 'jeep.com', mini: 'mini.com', alpine: 'alpinecars.com',
};

// Brand logo derived from the make (auto-set during photo recognition).
// Real logo via Clearbit, with a monogram fallback if it can't load.
function BrandLogo({ make }) {
  const key = (make || '').trim().toLowerCase();
  // match even when the make includes the model (e.g. "Mercedes-Benz AMG GT 4-Door")
  const brandKey = BRAND_DOMAINS[key]
    ? key
    : Object.keys(BRAND_DOMAINS).sort((a, b) => b.length - a.length).find((b) => key.startsWith(b));
  const domain = brandKey ? BRAND_DOMAINS[brandKey] : undefined;
  const [failed, setFailed] = useState(false);
  const initials = (make || '?').split(/[\s-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  if (domain && !failed) {
    return (
      <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-mist bg-cloud">
        <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`} alt={`${make} logo`} onError={() => setFailed(true)} className="h-7 w-7 object-contain" />
      </span>
    );
  }
  return <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ink font-display text-xs text-cloud">{initials}</span>;
}

// Status values are stored/sent in English; these map them to a display label key.
const STATUS_KEYS = {
  Booked: 'booked', Available: 'available', Maintenance: 'maintenance', Draft: 'draft',
  Confirmed: 'confirmed', 'On trip': 'onTrip', Completed: 'completed',
  Pending: 'pending', Declined: 'declined', Cancelled: 'cancelled',
};
const statusLabel = (t, s) => (STATUS_KEYS[s] ? t(`partner.status.${STATUS_KEYS[s]}`) : s);

function StatusPill({ status }) {
  const t = useT();
  const map = {
    Booked: 'bg-ink text-cloud', Available: 'bg-go/12 text-go', Maintenance: 'bg-mist text-stone', Draft: 'bg-mist text-stone',
    Confirmed: 'bg-go/12 text-go', 'On trip': 'bg-ink text-cloud', Completed: 'bg-mist text-stone',
  };
  return <span className={`rounded-full px-2.5 py-1 text-[0.7rem] font-bold ${map[status] || 'bg-mist text-stone'}`}>{statusLabel(t, status)}</span>;
}

function PaymentBadge({ status }) {
  const t = useT();
  const map = {
    authorized: { key: 'partner.payment.authorized', cls: 'bg-gold/15 text-gold' },
    captured: { key: 'partner.payment.captured', cls: 'bg-go/15 text-go' },
    canceled: { key: 'partner.payment.canceled', cls: 'bg-mist text-stone' },
    failed: { key: 'partner.payment.failed', cls: 'bg-red-100 text-red-600' },
    refunded: { key: 'partner.payment.refunded', cls: 'bg-mist text-stone' },
    partially_refunded: { key: 'partner.payment.partial', cls: 'bg-gold/15 text-gold' },
  };
  const m = map[status];
  if (!m) return null; // 'none' or unknown → no badge
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[0.7rem] font-bold ${m.cls}`}>{t(m.key)}</span>;
}

const BOOKING_STATUSES = ['Pending', 'Confirmed', 'On trip', 'Completed', 'Declined', 'Cancelled'];
const fmtDate = (s, dl = 'en-GB') => (s ? new Date(`${s}T00:00:00`).toLocaleDateString(dl, { day: 'numeric', month: 'short' }) : '—');

function BookingsTable({ rows, reload, compact }) {
  const { partner } = useAuth();
  const t = useT();
  const dl = localeTag(useI18n().locale);
  const rate = commissionRate(partner?.plan);
  const [busyId, setBusyId] = useState(null);
  const [pending, setPending] = useState(null);

  // plain status update (no money move)
  async function change(id, status) {
    setBusyId(id);
    try { await updateBookingStatus(id, status); fireBookingWebhook(id, 'booking.updated'); await reload?.(); } finally { setBusyId(null); }
  }
  // money moves (capture / release / refund) go through a confirmation modal
  function requestChange(b, status) {
    const pay = b.payment_status;
    const money =
      (status === 'Confirmed' && pay === 'authorized')
      || ((status === 'Declined' || status === 'Cancelled') && (pay === 'authorized' || pay === 'captured' || pay === 'partially_refunded'));
    if (money) setPending({ booking: b, status });
    else change(b.id, status);
  }

  return (
    <>
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-mist text-[0.7rem] uppercase tracking-wider text-stone">
            <th className="px-5 py-3 font-semibold">{t('partner.bookings.colBooking')}</th>
            <th className="px-5 py-3 font-semibold">{t('partner.bookings.colCarGuest')}</th>
            {!compact && <th className="px-5 py-3 font-semibold">{t('partner.bookings.colDates')}</th>}
            <th className="px-5 py-3 text-right font-semibold">{t('partner.bookings.colGross')}</th>
            {!compact && <th className="px-5 py-3 text-right font-semibold">{t('partner.bookings.colFee')}</th>}
            <th className="px-5 py-3 text-right font-semibold">{t('partner.bookings.colNet')}</th>
            <th className="px-5 py-3 text-center font-semibold">{t('partner.bookings.colPayment')}</th>
            <th className="px-5 py-3 text-right font-semibold">{t('partner.bookings.colStatus')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => {
            const gross = Number(b.base_amount) + Number(b.addons_amount || 0);
            const fee = Math.round(gross * rate);
            const dates = b.end_date && b.end_date !== b.start_date ? `${fmtDate(b.start_date, dl)} → ${fmtDate(b.end_date, dl)}` : fmtDate(b.start_date, dl);
            return (
              <tr key={b.id} className="border-b border-mist/70 last:border-0 transition-colors hover:bg-paper/60">
                <td className="px-5 py-3.5 font-semibold tnum">{b.id.slice(0, 8).toUpperCase()}</td>
                <td className="px-5 py-3.5">
                  <div className="font-semibold">{b.car_label || '—'}</div>
                  <div className="text-xs text-stone">{b.guest_name}{compact ? '' : ` · ${b.rate_label} ×${b.quantity}`}</div>
                  {!compact && b.licence_verified && (
                    <div className="mt-0.5 flex items-center gap-1 text-[0.65rem] font-semibold text-go">
                      <Icon.Shield width={11} height={11} /> {t('partner.bookings.licence')}{b.licence?.number ? ` · ${b.licence.number}` : ''}{b.licence?.categories?.length ? ` · ${b.licence.categories.join('/')}` : ''}
                    </div>
                  )}
                </td>
                {!compact && <td className="px-5 py-3.5 text-stone tnum">{dates}</td>}
                <td className="px-5 py-3.5 text-right tnum">{chf(gross)}</td>
                {!compact && <td className="px-5 py-3.5 text-right text-stone tnum">– {chf(fee)}</td>}
                <td className="px-5 py-3.5 text-right font-semibold tnum">{chf(gross - fee)}</td>
                <td className="px-5 py-3.5 text-center"><PaymentBadge status={b.payment_status} /></td>
                <td className="px-5 py-3.5 text-right">
                  {compact ? (
                    <StatusPill status={b.status} />
                  ) : (
                    <select value={b.status} disabled={busyId === b.id} onChange={(e) => requestChange(b, e.target.value)} className="ring-lux rounded-full border border-mist bg-cloud px-2.5 py-1 text-[0.7rem] font-bold text-ink outline-none transition-colors focus:border-ink disabled:opacity-50">
                      {BOOKING_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(t, s)}</option>)}
                    </select>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
      <AnimatePresence>
        {pending && <StatusChangeModal pending={pending} onClose={() => setPending(null)} onDone={reload} />}
      </AnimatePresence>
    </>
  );
}

function StatusChangeModal({ pending, onClose, onDone }) {
  const t = useT();
  const { booking: b, status } = pending;
  const sLabel = statusLabel(t, status);
  const pay = b.payment_status;
  const total = Number(b.total_amount);
  const isCapture = status === 'Confirmed' && pay === 'authorized';
  const isRelease = (status === 'Declined' || status === 'Cancelled') && pay === 'authorized';
  const isRefund = (status === 'Declined' || status === 'Cancelled') && (pay === 'captured' || pay === 'partially_refunded');

  const [mode, setMode] = useState('full'); // full | fee | none
  const [fee, setFee] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const feeNum = Math.max(0, Math.min(total, Number(fee) || 0));
  const refundAmount = mode === 'full' ? total : mode === 'fee' ? Math.max(0, total - feeNum) : 0;

  async function confirm() {
    setBusy(true); setErr('');
    try {
      await partnerSettle(b.id, status, isRefund ? Math.round(refundAmount * 100) : undefined);
      fireBookingWebhook(b.id, 'booking.updated');
      await onDone();
      onClose();
    } catch (e) { setErr(e.message || t('partner.statusModal.errGeneric')); setBusy(false); }
  }

  const Opt = ({ id, label, hint }) => (
    <button type="button" onClick={() => setMode(id)} className={`ring-lux flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors ${mode === id ? 'border-ink bg-ink/5' : 'border-mist hover:border-stone'}`}>
      <span className="font-semibold">{label}</span>
      <span className="text-xs text-stone tnum">{hint}</span>
    </button>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-ink/45 p-4 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} onClick={(e) => e.stopPropagation()} className="my-auto w-full max-w-md overflow-hidden rounded-[24px] border border-mist bg-paper shadow-2xl">
        <div className="flex items-center justify-between border-b border-mist bg-cloud px-6 py-4">
          <div>
            <div className="eyebrow text-gold">{t('partner.statusModal.confirmChange')}</div>
            <h3 className="font-display text-lg">{b.car_label} → {sLabel}</h3>
          </div>
          <button onClick={onClose} className="ring-lux grid h-9 w-9 place-items-center rounded-full border border-mist text-stone transition-colors hover:bg-mist/50"><Icon.X width={16} height={16} /></button>
        </div>

        <div className="space-y-4 p-6">
          {isCapture && (
            <p className="text-sm text-stone">{t('partner.statusModal.capturePre')} <span className="font-semibold text-ink">{t('partner.statusModal.captureMid', { amount: chf(total) })}</span> {t('partner.statusModal.capturePost')}</p>
          )}
          {isRelease && (
            <p className="text-sm text-stone">{t('partner.statusModal.releasePre')} <span className="font-semibold text-ink">{t('partner.statusModal.releaseMid')}</span>. {t('partner.statusModal.releasePost', { status: sLabel })}</p>
          )}
          {isRefund && (
            <>
              <p className="text-sm text-stone">{t('partner.statusModal.refundPre')} <span className="font-semibold text-ink">{t('partner.statusModal.refundMid', { amount: chf(total) })}</span>. {t('partner.statusModal.refundPost')}</p>
              <div className="space-y-2">
                <Opt id="full" label={t('partner.statusModal.fullRefund')} hint={chf(total)} />
                <Opt id="fee" label={t('partner.statusModal.keepFee')} hint={t('partner.statusModal.refundHint', { amount: chf(refundAmount) })} />
                {mode === 'fee' && (
                  <div className="pl-1"><FormInput label={t('partner.statusModal.feeToKeep')} type="number" placeholder="e.g. 200" value={fee} onChange={(e) => setFee(e.target.value)} /></div>
                )}
                <Opt id="none" label={t('partner.statusModal.noRefund')} hint={t('partner.statusModal.guestKeepsNothing')} />
              </div>
              <p className="text-xs text-stone">{t('partner.statusModal.settledNote')}</p>
            </>
          )}

          {err && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>}

          <div className="flex gap-3">
            <button onClick={onClose} className="ring-lux rounded-xl border border-mist px-5 py-3 text-sm font-semibold text-ink transition-colors hover:border-ink">{t('partner.statusModal.back')}</button>
            <button onClick={confirm} disabled={busy} className="ring-lux flex flex-1 items-center justify-center gap-2 rounded-xl bg-ink py-3 text-sm font-bold text-cloud transition-colors hover:bg-void disabled:opacity-60">
              {busy ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-cloud/30 border-t-cloud" />
                : isCapture ? t('partner.statusModal.chargeConfirm', { amount: chf(total) })
                : isRelease ? t('partner.statusModal.releaseHold', { status: sLabel })
                : refundAmount > 0 ? t('partner.statusModal.refundAnd', { amount: chf(refundAmount), status: sLabel })
                : t('partner.statusModal.noRefundStatus', { status: sLabel })}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function BarChart({ data }) {
  const max = Math.max(...data.map((d) => d.v));
  return (
    <div className="flex h-44 items-end gap-2.5 sm:gap-4">
      {data.map((d, i) => {
        const h = (d.v / max) * 100;
        const last = i === data.length - 1;
        return (
          <div key={d.m} className="group flex flex-1 flex-col items-center gap-2">
            <div className="relative flex w-full flex-1 items-end">
              <motion.div initial={{ height: 0 }} whileInView={{ height: `${h}%` }} viewport={{ once: true }} transition={{ duration: 0.7, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }} className={`w-full rounded-t-md ${last ? 'bg-gold' : 'bg-ink/85 group-hover:bg-ink'}`}>
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-ink px-1.5 py-0.5 text-[0.6rem] font-bold text-cloud opacity-0 transition-opacity group-hover:opacity-100 tnum">{chf(d.v)}</span>
              </motion.div>
            </div>
            <span className="text-[0.7rem] font-semibold text-stone">{d.m}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Add a car (real insert) ---------------- */
const CATS = ['Sport', 'Exotic', 'GT', 'SUV'];
const CITIES = ['Geneva', 'Zürich', 'Lugano', 'Lausanne', 'Basel', 'Bern', 'St. Moritz', 'Zermatt', 'Gstaad'];
const FUELS = ['Petrol', 'Diesel', 'Mild hybrid', 'Plug-in hybrid', 'Electric', 'Hydrogen'];
const STEP_LABEL_KEYS = { 1: 'partner.addcar.step1', 2: 'partner.addcar.step2', 3: 'partner.addcar.step3', 4: 'partner.addcar.step4' };

function AddCar({ onClose, onCreated }) {
  const t = useT();
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [thumbBlob, setThumbBlob] = useState(null);
  const [thumbPreview, setThumbPreview] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [procError, setProcError] = useState('');
  const [prefilledFromPhoto, setPrefilledFromPhoto] = useState(false);
  const fileRef = useRef(null);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [videoErr, setVideoErr] = useState('');
  const videoRef = useRef(null);

  const [f, setF] = useState({
    make: '', model: '', year: '2024', category: 'Sport', city: 'Geneva', location_id: '',
    exterior_color: '', interior_color: '',
    power: '', seats: '2', gearbox: 'Auto', fuel: 'Petrol',
    price_per_day: '', mileage_per_day: '250',
    cross_border_allowed: false, cross_border_fee: '',
    delivery_available: false, delivery_fee: '', delivery_note: '',
    protection_available: false, protection_fee: '', deposit_amount: '',
    description: '',
  });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  // partner pick-up locations (selectable / creatable inline on the pricing step)
  const [locs, setLocs] = useState([]);
  const [newLoc, setNewLoc] = useState(null); // null = closed; else { label, address, city }
  const [locBusy, setLocBusy] = useState(false);
  useEffect(() => { fetchLocations().then(setLocs).catch(() => {}); }, []);

  async function saveNewLoc() {
    if (!newLoc.address?.trim() && !newLoc.label?.trim()) { setError(t('partner.addcar.errLabelOrAddress')); return; }
    setLocBusy(true); setError('');
    try {
      const created = await createLocation(cleanLoc(newLoc));
      setLocs(await fetchLocations());
      setF((p) => ({ ...p, location_id: created.id, city: created.city || p.city }));
      setNewLoc(null);
    } catch (e) { setError(e.message || t('partner.addcar.errCreateLocation')); }
    finally { setLocBusy(false); }
  }

  // specs auto-filled from the curated library (for the prefill note + extra fields)
  const [matched, setMatched] = useState(null);

  // custom rental durations: [{ label, price }]
  const [tiers, setTiers] = useState([]);
  const addTier = () => setTiers((t) => [...t, { label: '', price: '' }]);
  const updTier = (i, k, v) => setTiers((t) => t.map((row, j) => (j === i ? { ...row, [k]: v } : row)));
  const delTier = (i) => setTiers((t) => t.filter((_, j) => j !== i));

  function pickVideo(e) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setVideoErr('');
    if (picked.size > 25 * 1024 * 1024) { setVideoErr(t('partner.addcar.errVideoSize')); return; }
    setVideoFile(picked);
    setVideoPreview(URL.createObjectURL(picked));
  }

  async function pickFile(e) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
    setThumbBlob(null);
    setThumbPreview(null);
    setProcError('');
    setProcessing(true);
    try {
      // generate the studio thumbnail and read the car details in parallel
      const [thumb, details] = await Promise.all([
        makeStudioThumbnail(picked).catch(() => null),
        extractCarDetails(picked).catch(() => ({})),
      ]);
      if (thumb) {
        setThumbBlob(thumb);
        setThumbPreview(URL.createObjectURL(thumb));
      } else {
        setProcError(t('partner.addcar.errThumbnail'));
      }
      if (details && (details.make || details.model || details.exterior_color || details.category)) {
        setF((p) => ({
          ...p,
          make: p.make || details.make || '',
          model: p.model || details.model || '',
          exterior_color: p.exterior_color || details.exterior_color || '',
          category: details.category || p.category,
        }));
        setPrefilledFromPhoto(true);
      }
    } finally {
      setProcessing(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (step === 1) { setStep(2); return; } // photo (optional)
    if (step === 2) {
      if (!f.make.trim() || !f.model.trim()) { setError(t('partner.addcar.errMakeModel')); return; }
      // prefill specs from the curated library (partner can override on the specs step)
      const m = lookupSpecs(f.make, f.model);
      setMatched(m);
      if (m) {
        setF((p) => ({
          ...p,
          power: String(m.power),
          seats: String(m.seats),
          gearbox: m.gearbox,
          fuel: m.fuel,
        }));
      }
      setStep(3); return;
    }
    if (step === 3) { setStep(4); return; }

    if (!f.price_per_day || Number(f.price_per_day) <= 0) { setError(t('partner.addcar.errRate')); return; }

    setBusy(true);
    try {
      let photo_url = null;
      let original_photo_url = null;
      let video_url = null;
      if (file) {
        original_photo_url = await uploadListingPhoto(file);
        // use the generated studio thumbnail as the display image; keep the original
        photo_url = thumbBlob ? await uploadListingPhoto(thumbBlob, 'jpg') : original_photo_url;
      }
      if (videoFile) video_url = await uploadListingVideo(videoFile);
      const rate_tiers = tiers
        .filter((row) => row.label.trim() && Number(row.price) > 0)
        .map((row) => ({ label: row.label.trim(), price: Number(row.price) }));

      await createListing({
        make: f.make.trim(),
        model: f.model.trim(),
        year: f.year ? parseInt(f.year, 10) : null,
        category: f.category,
        city: f.city,
        location_id: f.location_id || null,
        exterior_color: f.exterior_color.trim() || null,
        interior_color: f.interior_color.trim() || null,
        power: f.power ? parseInt(f.power, 10) : null,
        seats: f.seats ? parseInt(f.seats, 10) : null,
        gearbox: f.gearbox,
        fuel: f.fuel,
        accel: matched?.accel ?? null,
        drivetrain: matched?.drivetrain ?? null,
        photo_url,
        original_photo_url,
        video_url,
        price_per_day: Number(f.price_per_day),
        mileage_per_day: f.mileage_per_day ? parseInt(f.mileage_per_day, 10) : 250,
        rate_tiers,
        cross_border_allowed: f.cross_border_allowed,
        cross_border_fee: f.cross_border_allowed && f.cross_border_fee ? Number(f.cross_border_fee) : null,
        delivery_available: f.delivery_available,
        delivery_fee: f.delivery_available && f.delivery_fee ? Number(f.delivery_fee) : null,
        delivery_note: f.delivery_available ? (f.delivery_note.trim() || null) : null,
        protection_available: f.protection_available,
        protection_fee: f.protection_available && f.protection_fee ? Number(f.protection_fee) : null,
        deposit_amount: f.protection_available && f.deposit_amount ? Number(f.deposit_amount) : null,
        description: f.description.trim() || null,
        status: 'Available',
      });
      await onCreated();
      setDone(true);
    } catch (err) {
      const m = err.message || '';
      setError(/CAR_LIMIT/.test(m)
        ? t('partner.addcar.errCarLimit')
        : (m || t('partner.addcar.errSave')));
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-ink/45 p-4 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, y: 28, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.98 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} onClick={(e) => e.stopPropagation()} className="my-auto w-full max-w-lg overflow-hidden rounded-[24px] border border-mist bg-paper shadow-2xl">
        <div className="flex items-center justify-between border-b border-mist bg-cloud px-6 py-4">
          <div>
            <div className="eyebrow text-gold">{done ? t('partner.addcar.saved') : t('partner.addcar.stepOf', { n: step, label: t(STEP_LABEL_KEYS[step]) })}</div>
            <h3 className="font-display text-lg">{done ? t('partner.addcar.listingCreated') : t('partner.listCar')}</h3>
          </div>
          <button onClick={onClose} className="ring-lux grid h-9 w-9 place-items-center rounded-full border border-mist text-stone transition-colors hover:bg-mist/50"><Icon.X width={16} height={16} /></button>
        </div>

        {done ? (
          <div className="px-6 py-12 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 16 }} className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-go text-cloud"><Icon.Check width={30} height={30} /></motion.div>
            <h4 className="font-display mt-5 text-xl">{t('partner.addcar.liveTitle', { make: f.make, model: f.model })}</h4>
            <p className="mx-auto mt-2 max-w-xs text-sm text-stone">{t('partner.addcar.liveDesc')}</p>
            <button onClick={onClose} className="ring-lux mt-6 rounded-full bg-ink px-6 py-3 text-sm font-bold text-cloud transition-colors hover:bg-void">{t('partner.addcar.backToDashboard')}</button>
          </div>
        ) : (
          <form onSubmit={submit} className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
            {step === 1 && (
              <>
                <span className="block text-sm font-semibold">{t('partner.addcar.photoLabel')} <span className="font-normal text-stone">{t('partner.addcar.photoHint')}</span></span>
                <button type="button" onClick={() => fileRef.current?.click()} className="ring-lux relative block w-full overflow-hidden rounded-2xl border border-dashed border-mist bg-cloud text-center transition-colors hover:border-ink">
                  {thumbPreview || preview ? (
                    <img src={thumbPreview || preview} alt="preview" className="h-44 w-full object-cover" />
                  ) : (
                    <div className="grid h-32 place-items-center text-sm text-stone"><div><Icon.Plus className="mx-auto mb-1" /> {t('partner.addcar.uploadPhoto')}</div></div>
                  )}
                  {processing && (
                    <div className="absolute inset-0 grid place-items-center rounded-2xl bg-paper/82 backdrop-blur-sm">
                      <div className="flex flex-col items-center gap-2 text-xs font-semibold text-ink">
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-mist border-t-ink" />
                        {t('partner.addcar.processing')}
                      </div>
                    </div>
                  )}
                  {thumbPreview && !processing && (
                    <span className="absolute left-3 top-3 rounded-full bg-ink/85 px-2.5 py-1 text-[0.65rem] font-bold text-cloud backdrop-blur">{t('partner.addcar.studioThumbnail')}</span>
                  )}
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} className="hidden" />
                {procError && <p className="text-xs text-amber-600">{procError}</p>}
                {prefilledFromPhoto && !processing && (
                  <div className="flex items-start gap-2 rounded-xl border border-gold/30 bg-gold/10 px-3.5 py-2.5 text-xs text-ink">
                    <span className="text-gold">✦</span>
                    <span>{t('partner.addcar.prefilled')}</span>
                  </div>
                )}
                <p className="text-xs text-stone">{t('partner.addcar.noPhoto')}</p>

                {/* optional short video — plays on hover in the marketplace + in the booking view */}
                <div className="pt-1">
                  <span className="block text-sm font-semibold">{t('partner.addcar.videoLabel')} <span className="font-normal text-stone">{t('partner.addcar.videoHint')}</span></span>
                  <button type="button" onClick={() => videoRef.current?.click()} className="ring-lux relative mt-2 block w-full overflow-hidden rounded-2xl border border-dashed border-mist bg-cloud text-center transition-colors hover:border-ink">
                    {videoPreview ? (
                      <video src={videoPreview} className="h-36 w-full object-cover" muted autoPlay loop playsInline />
                    ) : (
                      <div className="grid h-20 place-items-center text-sm text-stone"><div><Icon.Plus className="mx-auto mb-1" width={16} height={16} /> {t('partner.addcar.addClip')}</div></div>
                    )}
                    {videoPreview && <span className="absolute left-3 top-3 rounded-full bg-ink/85 px-2.5 py-1 text-[0.65rem] font-bold text-cloud backdrop-blur">{t('partner.addcar.video')}</span>}
                  </button>
                  <input ref={videoRef} type="file" accept="video/*" onChange={pickVideo} className="hidden" />
                  {videoErr && <p className="mt-1 text-xs text-amber-600">{videoErr}</p>}
                  {videoPreview && <button type="button" onClick={() => { setVideoFile(null); setVideoPreview(null); }} className="ring-lux mt-1 text-xs font-semibold text-red-600 hover:underline">{t('partner.addcar.removeVideo')}</button>}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                {f.make && (
                  <div className="flex items-center gap-2.5 rounded-xl border border-mist bg-cloud px-3.5 py-2.5">
                    <BrandLogo make={f.make} />
                    <span className="text-sm font-semibold">{f.make}{f.model ? ` ${f.model}` : ''}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <FormInput label={t('partner.addcar.make')} placeholder="Porsche" value={f.make} onChange={set('make')} />
                  <FormInput label={t('partner.addcar.model')} placeholder="911 Turbo S" value={f.model} onChange={set('model')} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormInput label={t('partner.addcar.year')} type="number" placeholder="2024" value={f.year} onChange={set('year')} />
                  <FormSelect label={t('partner.addcar.category')} value={f.category} onChange={set('category')} options={CATS} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormInput label={t('partner.addcar.exteriorColour')} placeholder="GT Silver Metallic" value={f.exterior_color} onChange={set('exterior_color')} />
                  <FormInput label={t('partner.addcar.interiorColour')} placeholder="Black leather" value={f.interior_color} onChange={set('interior_color')} />
                </div>
              </>
            )}

            {step === 3 && (
              <>
                {matched && (
                  <div className="flex items-start gap-2 rounded-xl border border-gold/30 bg-gold/10 px-3.5 py-2.5 text-xs text-ink">
                    <span className="text-gold">✦</span>
                    <span>{t('partner.addcar.specsPrefilledPre')} <span className="font-semibold">{matched.name}</span>{t('partner.addcar.specsPrefilledPost')}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <FormInput label={t('partner.addcar.power')} type="number" placeholder="640" value={f.power} onChange={set('power')} />
                  <FormInput label={t('partner.addcar.seats')} type="number" placeholder="2" value={f.seats} onChange={set('seats')} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormSelect label={t('partner.addcar.gearbox')} value={f.gearbox} onChange={set('gearbox')} options={['Auto', 'PDK', 'DCT', 'Manual']} />
                  <FormSelect label={t('partner.addcar.fuel')} value={f.fuel} onChange={set('fuel')} options={FUELS} />
                </div>
                <DescriptionField value={f.description} onChange={(v) => setF((p) => ({ ...p, description: v }))}
                  carFields={{ make: f.make, model: f.model, year: f.year, category: f.category, power: f.power, gearbox: f.gearbox, fuel: f.fuel, exterior_color: f.exterior_color, interior_color: f.interior_color, location: f.city }} />
              </>
            )}

            {step === 4 && (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone">{t('partner.addcar.pickupLocation')}</label>
                  {locs.length > 0 ? (
                    <select
                      value={f.location_id}
                      onChange={(e) => {
                        const id = e.target.value;
                        if (id === '__new') { setNewLoc({ ...EMPTY_LOC }); return; }
                        const sel = locs.find((l) => l.id === id);
                        setF((p) => ({ ...p, location_id: id, city: sel?.city || p.city }));
                      }}
                      className="ring-lux w-full rounded-xl border border-mist bg-paper px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-ink"
                    >
                      <option value="">{t('partner.addcar.selectLocation')}</option>
                      {locs.map((l) => <option key={l.id} value={l.id}>{(l.label || l.city || t('partner.location.locationFallback')) + (locLine(l) ? ` — ${locLine(l)}` : '')}</option>)}
                      <option value="__new">{t('partner.addcar.newLocation')}</option>
                    </select>
                  ) : (
                    <div className="flex items-center justify-between rounded-xl border border-dashed border-mist bg-cloud px-3.5 py-2.5 text-sm text-stone">
                      <span>{t('partner.addcar.noSavedLocations')}</span>
                      <button type="button" onClick={() => setNewLoc({ ...EMPTY_LOC })} className="ring-lux font-semibold text-gold transition-colors hover:text-ink">{t('partner.addcar.addOne')}</button>
                    </div>
                  )}
                  {newLoc && (
                    <div className="mt-2 rounded-xl border border-mist bg-cloud p-3">
                      <LocationForm value={newLoc} onChange={setNewLoc} />
                      <div className="mt-3 flex gap-2">
                        <button type="button" disabled={locBusy} onClick={saveNewLoc} className="ring-lux rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-cloud transition-colors hover:bg-void disabled:opacity-50">{locBusy ? t('partner.addcar.savingLocation') : t('partner.addcar.saveLocation')}</button>
                        <button type="button" onClick={() => setNewLoc(null)} className="ring-lux rounded-lg border border-mist px-3 py-2 text-sm transition-colors hover:border-ink">{t('partner.addcar.cancelLocation')}</button>
                      </div>
                    </div>
                  )}
                  <p className="mt-1.5 text-xs text-stone">{t('partner.addcar.pickupHintPre')} <span className="font-semibold">{t('nav.location')}</span>{t('partner.addcar.pickupHintPost')}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormInput label={t('partner.addcar.dailyRate')} type="number" placeholder="690" value={f.price_per_day} onChange={set('price_per_day')} />
                  <FormInput label={t('partner.addcar.mileagePerDay')} type="number" placeholder="250" value={f.mileage_per_day} onChange={set('mileage_per_day')} />
                </div>

                {/* custom time slots */}
                <div className="rounded-2xl border border-mist bg-cloud p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{t('partner.addcar.customSlots')} <span className="font-normal text-stone">{t('partner.addcar.optional')}</span></span>
                    <button type="button" onClick={addTier} className="ring-lux flex items-center gap-1 text-xs font-semibold text-gold hover:text-ink"><Icon.Plus width={13} height={13} /> {t('partner.addcar.addSlot')}</button>
                  </div>
                  <p className="mt-1 text-xs text-stone">{t('partner.addcar.slotsHint')}</p>
                  {tiers.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {tiers.map((row, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input value={row.label} onChange={(e) => updTier(i, 'label', e.target.value)} placeholder={t('partner.addcar.slotLabelPlaceholder')} className="ring-lux flex-1 rounded-xl border border-mist bg-paper px-3 py-2.5 text-sm outline-none transition-colors focus:border-ink placeholder:text-stone" />
                          <div className="flex items-center rounded-xl border border-mist bg-paper pl-3 transition-colors focus-within:border-ink">
                            <span className="text-xs text-stone">CHF</span>
                            <input value={row.price} onChange={(e) => updTier(i, 'price', e.target.value)} type="number" placeholder="290" className="w-20 bg-transparent px-2 py-2.5 text-sm outline-none placeholder:text-stone" />
                          </div>
                          <button type="button" onClick={() => delTier(i)} className="ring-lux grid h-9 w-9 shrink-0 place-items-center rounded-full border border-mist text-stone transition-colors hover:border-red-400 hover:text-red-600"><Icon.X width={14} height={14} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* cross-border */}
                <div className="rounded-2xl border border-mist bg-cloud p-4">
                  <label className="flex cursor-pointer items-center justify-between">
                    <span className="text-sm font-semibold">{t('partner.addcar.allowCrossBorder')}</span>
                    <input type="checkbox" checked={f.cross_border_allowed} onChange={(e) => setF((p) => ({ ...p, cross_border_allowed: e.target.checked }))} className="ring-lux h-4 w-4 accent-ink" />
                  </label>
                  <AnimatePresence initial={false}>
                    {f.cross_border_allowed && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="pt-3">
                          <FormInput label={t('partner.addcar.crossBorderFee')} type="number" placeholder="150" value={f.cross_border_fee} onChange={set('cross_border_fee')} />
                          <p className="mt-1 text-xs text-stone">{t('partner.addcar.crossBorderHint')}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* delivery */}
                <div className="rounded-2xl border border-mist bg-cloud p-4">
                  <label className="flex cursor-pointer items-center justify-between">
                    <span className="text-sm font-semibold">{t('partner.addcar.delivery')}</span>
                    <input type="checkbox" checked={f.delivery_available} onChange={(e) => setF((p) => ({ ...p, delivery_available: e.target.checked }))} className="ring-lux h-4 w-4 accent-ink" />
                  </label>
                  <AnimatePresence initial={false}>
                    {f.delivery_available && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="space-y-3 pt-3">
                          <FormInput label={t('partner.addcar.deliveryFee')} type="number" placeholder="150" value={f.delivery_fee} onChange={set('delivery_fee')} />
                          <FormInput label={t('partner.addcar.deliveryNote')} placeholder={t('partner.addcar.deliveryNotePlaceholder')} value={f.delivery_note} onChange={set('delivery_note')} />
                          <p className="text-xs text-stone">{t('partner.addcar.deliveryHint')}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* damage protection (partner keeps 100%) */}
                <div className="rounded-2xl border border-mist bg-cloud p-4">
                  <label className="flex cursor-pointer items-center justify-between">
                    <span className="text-sm font-semibold">{t('partner.addcar.protection')}</span>
                    <input type="checkbox" checked={f.protection_available} onChange={(e) => setF((p) => ({ ...p, protection_available: e.target.checked }))} className="ring-lux h-4 w-4 accent-ink" />
                  </label>
                  <AnimatePresence initial={false}>
                    {f.protection_available && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="space-y-3 pt-3">
                          <FormInput label={t('partner.addcar.protectionFee')} type="number" placeholder="250" value={f.protection_fee} onChange={set('protection_fee')} />
                          <FormInput label={t('partner.addcar.depositAmount')} type="number" placeholder="5000" value={f.deposit_amount} onChange={set('deposit_amount')} />
                          <p className="text-xs text-stone">{t('partner.addcar.protectionHint')}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}

            {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

            <div className="flex gap-3 pt-2">
              {step > 1 && <button type="button" onClick={() => { setStep((s) => s - 1); setError(''); }} className="ring-lux rounded-xl border border-mist px-5 py-3 text-sm font-semibold text-ink transition-colors hover:border-ink">{t('partner.addcar.back')}</button>}
              <button type="submit" disabled={busy} className="ring-lux flex flex-1 items-center justify-center gap-2 rounded-xl bg-ink py-3 text-sm font-bold text-cloud transition-colors hover:bg-void disabled:opacity-60">
                {busy ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-cloud/30 border-t-cloud" /> : step < 4 ? <>{t('partner.addcar.continue')} <Icon.Arrow width={15} height={15} /></> : <>{t('partner.addcar.saveListing')} <Icon.Check width={15} height={15} /></>}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ---------------- Edit a car (full edit) ---------------- */
function EditCar({ car, onClose, onSaved }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);
  const [thumbBlob, setThumbBlob] = useState(null);
  const [thumbPreview, setThumbPreview] = useState(null);
  const [processing, setProcessing] = useState(false);
  const fileRef = useRef(null);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [videoErr, setVideoErr] = useState('');
  const [removeVideo, setRemoveVideo] = useState(false);
  const videoRef = useRef(null);

  function pickVideo(e) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setVideoErr('');
    if (picked.size > 25 * 1024 * 1024) { setVideoErr(t('partner.editcar.errVideoSize')); return; }
    setRemoveVideo(false);
    setVideoFile(picked);
    setVideoPreview(URL.createObjectURL(picked));
  }

  const [f, setF] = useState({
    make: car.make || '', model: car.model || '',
    year: car.year != null ? String(car.year) : '',
    category: car.category || 'Sport', city: car.city || 'Geneva',
    exterior_color: car.exterior_color || '', interior_color: car.interior_color || '',
    power: car.power != null ? String(car.power) : '',
    seats: car.seats != null ? String(car.seats) : '',
    gearbox: car.gearbox || 'Auto', fuel: car.fuel || 'Petrol',
    price_per_day: car.price_per_day != null ? String(car.price_per_day) : '',
    mileage_per_day: car.mileage_per_day != null ? String(car.mileage_per_day) : '250',
    status: car.status || 'Available',
    cross_border_allowed: !!car.cross_border_allowed,
    cross_border_fee: car.cross_border_fee != null ? String(car.cross_border_fee) : '',
    delivery_available: !!car.delivery_available,
    delivery_fee: car.delivery_fee != null ? String(car.delivery_fee) : '',
    delivery_note: car.delivery_note || '',
    protection_available: !!car.protection_available,
    protection_fee: car.protection_fee != null ? String(car.protection_fee) : '',
    deposit_amount: car.deposit_amount != null ? String(car.deposit_amount) : '',
    description: car.description || '',
  });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const [tiers, setTiers] = useState(
    Array.isArray(car.rate_tiers) ? car.rate_tiers.map((row) => ({ label: row.label, price: String(row.price) })) : [],
  );
  const addTier = () => setTiers((t) => [...t, { label: '', price: '' }]);
  const updTier = (i, k, v) => setTiers((t) => t.map((row, j) => (j === i ? { ...row, [k]: v } : row)));
  const delTier = (i) => setTiers((t) => t.filter((_, j) => j !== i));

  async function pickFile(e) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setFile(picked); setThumbBlob(null); setThumbPreview(null); setProcessing(true);
    try {
      const thumb = await makeStudioThumbnail(picked);
      setThumbBlob(thumb);
      setThumbPreview(URL.createObjectURL(thumb));
    } catch { /* keep original on failure */ }
    finally { setProcessing(false); }
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!f.make.trim() || !f.model.trim()) { setError(t('partner.editcar.errMakeModel')); return; }
    if (!f.price_per_day || Number(f.price_per_day) <= 0) { setError(t('partner.editcar.errRate')); return; }
    setBusy(true);
    try {
      const patch = {
        make: f.make.trim(), model: f.model.trim(),
        year: f.year ? parseInt(f.year, 10) : null,
        category: f.category, city: f.city,
        exterior_color: f.exterior_color.trim() || null,
        interior_color: f.interior_color.trim() || null,
        power: f.power ? parseInt(f.power, 10) : null,
        seats: f.seats ? parseInt(f.seats, 10) : null,
        gearbox: f.gearbox, fuel: f.fuel,
        price_per_day: Number(f.price_per_day),
        mileage_per_day: f.mileage_per_day ? parseInt(f.mileage_per_day, 10) : 250,
        status: f.status,
        cross_border_allowed: f.cross_border_allowed,
        cross_border_fee: f.cross_border_allowed && f.cross_border_fee ? Number(f.cross_border_fee) : null,
        delivery_available: f.delivery_available,
        delivery_fee: f.delivery_available && f.delivery_fee ? Number(f.delivery_fee) : null,
        delivery_note: f.delivery_available ? (f.delivery_note.trim() || null) : null,
        protection_available: f.protection_available,
        protection_fee: f.protection_available && f.protection_fee ? Number(f.protection_fee) : null,
        deposit_amount: f.protection_available && f.deposit_amount ? Number(f.deposit_amount) : null,
        description: f.description.trim() || null,
        rate_tiers: tiers.filter((row) => row.label.trim() && Number(row.price) > 0).map((row) => ({ label: row.label.trim(), price: Number(row.price) })),
      };
      if (file) {
        const original = await uploadListingPhoto(file);
        patch.original_photo_url = original;
        patch.photo_url = thumbBlob ? await uploadListingPhoto(thumbBlob, 'jpg') : original;
      }
      if (videoFile) patch.video_url = await uploadListingVideo(videoFile);
      else if (removeVideo) patch.video_url = null;
      await updateListing(car.id, patch);
      await onSaved();
      onClose();
    } catch (err) {
      setError(err.message || t('partner.editcar.errSave'));
    } finally { setBusy(false); }
  }

  const currentPhoto = thumbPreview || car.photo_url;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-ink/45 p-4 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, y: 28, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.98 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} onClick={(e) => e.stopPropagation()} className="my-auto w-full max-w-lg overflow-hidden rounded-[24px] border border-mist bg-paper shadow-2xl">
        <div className="flex items-center justify-between border-b border-mist bg-cloud px-6 py-4">
          <div>
            <div className="eyebrow text-gold">{t('partner.editcar.title')}</div>
            <h3 className="font-display text-lg">{car.make} {car.model}</h3>
          </div>
          <button onClick={onClose} className="ring-lux grid h-9 w-9 place-items-center rounded-full border border-mist text-stone transition-colors hover:bg-mist/50"><Icon.X width={16} height={16} /></button>
        </div>

        <form onSubmit={submit} className="max-h-[72vh] space-y-4 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-3">
            <FormInput label={t('partner.addcar.make')} value={f.make} onChange={set('make')} />
            <FormInput label={t('partner.addcar.model')} value={f.model} onChange={set('model')} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FormInput label={t('partner.addcar.year')} type="number" value={f.year} onChange={set('year')} />
            <FormSelect label={t('partner.addcar.category')} value={f.category} onChange={set('category')} options={CATS} />
            <FormSelect label={t('partner.editcar.status')} value={f.status} onChange={set('status')} options={['Available', 'Booked', 'Maintenance', 'Draft']} />
          </div>
          <FormSelect label={t('partner.editcar.pickupCity')} value={f.city} onChange={set('city')} options={CITIES} />
          <div className="grid grid-cols-2 gap-3">
            <FormInput label={t('partner.addcar.exteriorColour')} value={f.exterior_color} onChange={set('exterior_color')} />
            <FormInput label={t('partner.addcar.interiorColour')} value={f.interior_color} onChange={set('interior_color')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label={t('partner.addcar.power')} type="number" value={f.power} onChange={set('power')} />
            <FormInput label={t('partner.addcar.seats')} type="number" value={f.seats} onChange={set('seats')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormSelect label={t('partner.addcar.gearbox')} value={f.gearbox} onChange={set('gearbox')} options={['Auto', 'PDK', 'DCT', 'Manual']} />
            <FormSelect label={t('partner.addcar.fuel')} value={f.fuel} onChange={set('fuel')} options={FUELS} />
          </div>
          <DescriptionField value={f.description} onChange={(v) => setF((p) => ({ ...p, description: v }))}
            carFields={{ make: f.make, model: f.model, year: f.year, category: f.category, power: f.power, gearbox: f.gearbox, fuel: f.fuel, exterior_color: f.exterior_color, interior_color: f.interior_color, location: f.city }} />
          <div className="grid grid-cols-2 gap-3">
            <FormInput label={t('partner.addcar.dailyRate')} type="number" value={f.price_per_day} onChange={set('price_per_day')} />
            <FormInput label={t('partner.addcar.mileagePerDay')} type="number" value={f.mileage_per_day} onChange={set('mileage_per_day')} />
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-semibold">{t('partner.editcar.photo')}</span>
            <button type="button" onClick={() => fileRef.current?.click()} className="ring-lux relative block w-full overflow-hidden rounded-2xl border border-dashed border-mist bg-cloud text-center transition-colors hover:border-ink">
              {currentPhoto ? <img src={currentPhoto} alt="preview" className="h-40 w-full object-cover" /> : <div className="grid h-28 place-items-center text-sm text-stone"><div><Icon.Plus className="mx-auto mb-1" /> {t('partner.editcar.uploadPhoto')}</div></div>}
              {processing && <div className="absolute inset-0 grid place-items-center rounded-2xl bg-paper/82 backdrop-blur-sm"><div className="flex flex-col items-center gap-2 text-xs font-semibold text-ink"><span className="h-5 w-5 animate-spin rounded-full border-2 border-mist border-t-ink" />{t('partner.editcar.processing')}</div></div>}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} className="hidden" />
            <p className="mt-1.5 text-xs text-stone">{t('partner.editcar.photoHint')}</p>
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-semibold">{t('partner.addcar.video')} <span className="font-normal text-stone">{t('partner.addcar.videoHint')}</span></span>
            {(() => { const currentVideo = videoPreview || (!removeVideo ? car.video : null); return (
              <>
                <button type="button" onClick={() => videoRef.current?.click()} className="ring-lux relative block w-full overflow-hidden rounded-2xl border border-dashed border-mist bg-cloud text-center transition-colors hover:border-ink">
                  {currentVideo ? <video src={currentVideo} className="h-36 w-full object-cover" muted autoPlay loop playsInline /> : <div className="grid h-20 place-items-center text-sm text-stone"><div><Icon.Plus className="mx-auto mb-1" width={16} height={16} /> {t('partner.addcar.addClip')}</div></div>}
                </button>
                <input ref={videoRef} type="file" accept="video/*" onChange={pickVideo} className="hidden" />
                {videoErr && <p className="mt-1 text-xs text-amber-600">{videoErr}</p>}
                {currentVideo && <button type="button" onClick={() => { setVideoFile(null); setVideoPreview(null); setRemoveVideo(true); }} className="ring-lux mt-1 text-xs font-semibold text-red-600 hover:underline">{t('partner.addcar.removeVideo')}</button>}
              </>
            ); })()}
          </div>

          <div className="rounded-2xl border border-mist bg-cloud p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{t('partner.addcar.customSlots')}</span>
              <button type="button" onClick={addTier} className="ring-lux flex items-center gap-1 text-xs font-semibold text-gold hover:text-ink"><Icon.Plus width={13} height={13} /> {t('partner.addcar.addSlot')}</button>
            </div>
            {tiers.length > 0 && (
              <div className="mt-3 space-y-2">
                {tiers.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input value={row.label} onChange={(e) => updTier(i, 'label', e.target.value)} placeholder={t('partner.addcar.slotLabelPlaceholder')} className="ring-lux flex-1 rounded-xl border border-mist bg-paper px-3 py-2.5 text-sm outline-none transition-colors focus:border-ink placeholder:text-stone" />
                    <div className="flex items-center rounded-xl border border-mist bg-paper pl-3 transition-colors focus-within:border-ink"><span className="text-xs text-stone">CHF</span><input value={row.price} onChange={(e) => updTier(i, 'price', e.target.value)} type="number" placeholder="290" className="w-20 bg-transparent px-2 py-2.5 text-sm outline-none placeholder:text-stone" /></div>
                    <button type="button" onClick={() => delTier(i)} className="ring-lux grid h-9 w-9 shrink-0 place-items-center rounded-full border border-mist text-stone transition-colors hover:border-red-400 hover:text-red-600"><Icon.X width={14} height={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-mist bg-cloud p-4">
            <label className="flex cursor-pointer items-center justify-between">
              <span className="text-sm font-semibold">{t('partner.addcar.allowCrossBorder')}</span>
              <input type="checkbox" checked={f.cross_border_allowed} onChange={(e) => setF((p) => ({ ...p, cross_border_allowed: e.target.checked }))} className="ring-lux h-4 w-4 accent-ink" />
            </label>
            {f.cross_border_allowed && (
              <div className="pt-3">
                <FormInput label={t('partner.addcar.crossBorderFee')} type="number" value={f.cross_border_fee} onChange={set('cross_border_fee')} />
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-mist bg-cloud p-4">
            <label className="flex cursor-pointer items-center justify-between">
              <span className="text-sm font-semibold">{t('partner.addcar.delivery')}</span>
              <input type="checkbox" checked={f.delivery_available} onChange={(e) => setF((p) => ({ ...p, delivery_available: e.target.checked }))} className="ring-lux h-4 w-4 accent-ink" />
            </label>
            {f.delivery_available && (
              <div className="space-y-3 pt-3">
                <FormInput label={t('partner.addcar.deliveryFee')} type="number" value={f.delivery_fee} onChange={set('delivery_fee')} />
                <FormInput label={t('partner.addcar.deliveryNote')} value={f.delivery_note} onChange={set('delivery_note')} />
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-mist bg-cloud p-4">
            <label className="flex cursor-pointer items-center justify-between">
              <span className="text-sm font-semibold">{t('partner.addcar.protection')}</span>
              <input type="checkbox" checked={f.protection_available} onChange={(e) => setF((p) => ({ ...p, protection_available: e.target.checked }))} className="ring-lux h-4 w-4 accent-ink" />
            </label>
            {f.protection_available && (
              <div className="space-y-3 pt-3">
                <FormInput label={t('partner.addcar.protectionFee')} type="number" value={f.protection_fee} onChange={set('protection_fee')} />
                <FormInput label={t('partner.addcar.depositAmount')} type="number" value={f.deposit_amount} onChange={set('deposit_amount')} />
                <p className="text-xs text-stone">{t('partner.editcar.protectionHint')}</p>
              </div>
            )}
          </div>

          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="ring-lux rounded-xl border border-mist px-5 py-3 text-sm font-semibold text-ink transition-colors hover:border-ink">{t('partner.common.cancel')}</button>
            <button type="submit" disabled={busy} className="ring-lux flex flex-1 items-center justify-center gap-2 rounded-xl bg-ink py-3 text-sm font-bold text-cloud transition-colors hover:bg-void disabled:opacity-60">
              {busy ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-cloud/30 border-t-cloud" /> : <>{t('partner.editcar.saveChanges')} <Icon.Check width={15} height={15} /></>}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

/* ---------------- Block dates (internal hold) ---------------- */
function BlockModal({ car, blocks, onClose, onSaved }) {
  const { partner } = useAuth();
  const t = useT();
  const dl = localeTag(useI18n().locale);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [f, setF] = useState({ start_date: '', end_date: '', blocked_by: partner?.contact_name || partner?.company_name || '', reason: '' });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    setErr('');
    if (!f.start_date || !f.end_date) { setErr(t('partner.block.errDates')); return; }
    if (f.end_date < f.start_date) { setErr(t('partner.block.errOrder')); return; }
    setBusy(true);
    try {
      await createBlock({
        listing_id: car.id,
        start_date: f.start_date,
        end_date: f.end_date,
        blocked_by: f.blocked_by.trim() || null,
        reason: f.reason.trim() || null,
      });
      await onSaved();
      setF((p) => ({ ...p, start_date: '', end_date: '', reason: '' }));
    } catch (e2) { setErr(e2.message || t('partner.block.errSave')); }
    finally { setBusy(false); }
  }
  async function remove(id) {
    setBusy(true);
    try { await deleteBlock(id); await onSaved(); } finally { setBusy(false); }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-ink/45 p-4 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} onClick={(e) => e.stopPropagation()} className="my-auto w-full max-w-md overflow-hidden rounded-[24px] border border-mist bg-paper shadow-2xl">
        <div className="flex items-center justify-between border-b border-mist bg-cloud px-6 py-4">
          <div>
            <div className="eyebrow text-gold">{t('partner.block.eyebrow')}</div>
            <h3 className="font-display text-lg">{car.make} {car.model}</h3>
          </div>
          <button onClick={onClose} className="ring-lux grid h-9 w-9 place-items-center rounded-full border border-mist text-stone transition-colors hover:bg-mist/50"><Icon.X width={16} height={16} /></button>
        </div>

        <div className="space-y-4 p-6">
          <p className="text-sm text-stone">{t('partner.block.desc')}</p>
          <form onSubmit={save} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormInput label={t('partner.block.from')} type="date" value={f.start_date} onChange={set('start_date')} />
              <FormInput label={t('partner.block.to')} type="date" value={f.end_date} onChange={set('end_date')} />
            </div>
            <FormInput label={t('partner.block.blockedBy')} value={f.blocked_by} onChange={set('blocked_by')} placeholder={t('partner.block.blockedByPlaceholder')} />
            <FormInput label={t('partner.block.reason')} value={f.reason} onChange={set('reason')} placeholder={t('partner.block.reasonPlaceholder')} />
            {err && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>}
            <button type="submit" disabled={busy} className="ring-lux flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3 text-sm font-bold text-cloud transition-colors hover:bg-void disabled:opacity-60">
              {busy ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-cloud/30 border-t-cloud" /> : <>{t('partner.block.addBlock')} <Icon.Plus width={15} height={15} /></>}
            </button>
          </form>

          {blocks.length > 0 && (
            <div className="border-t border-mist pt-4">
              <div className="text-[0.65rem] uppercase tracking-wider text-stone">{t('partner.block.existingHolds')}</div>
              <div className="mt-2 space-y-2">
                {blocks.map((b) => (
                  <div key={b.id} className="flex items-center justify-between rounded-xl border border-mist bg-cloud px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold tnum">{fmtDate(b.start_date, dl)} → {fmtDate(b.end_date, dl)}</div>
                      <div className="text-xs text-stone">{b.reason || t('partner.block.blocked')}{b.blocked_by ? ` · ${b.blocked_by}` : ''}</div>
                    </div>
                    <button onClick={() => remove(b.id)} disabled={busy} className="ring-lux shrink-0 text-xs font-semibold text-red-600 transition-colors hover:underline disabled:opacity-50">{t('partner.common.remove')}</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------------- Bulk import (CSV / Excel) ---------------- */
function ImportModal({ onClose, onDone }) {
  const t = useT();
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  async function pick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(''); setBusy(true);
    try { setRows(await parseFleetFile(file)); }
    catch (e2) { setErr(e2.message || t('partner.import.errRead')); }
    finally { setBusy(false); }
  }
  const valid = (rows || []).filter((r) => r.errors.length === 0);
  const invalid = (rows || []).filter((r) => r.errors.length > 0);
  const newCount = valid.filter((r) => !r.data.id).length;
  const updCount = valid.filter((r) => r.data.id).length;

  async function importAll() {
    if (!valid.length) return;
    setBusy(true); setErr('');
    try { const res = await importListings(valid.map((r) => r.data)); await onDone(); setResult(res); }
    catch (e2) { setErr(e2.message || t('partner.import.errFailed')); }
    finally { setBusy(false); }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-ink/45 p-4 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} onClick={(e) => e.stopPropagation()} className="my-auto w-full max-w-lg overflow-hidden rounded-[24px] border border-mist bg-paper shadow-2xl">
        <div className="flex items-center justify-between border-b border-mist bg-cloud px-6 py-4">
          <div>
            <div className="eyebrow text-gold">{result ? t('partner.import.imported') : t('partner.import.bulkImport')}</div>
            <h3 className="font-display text-lg">{t('partner.import.title')}</h3>
          </div>
          <button onClick={onClose} className="ring-lux grid h-9 w-9 place-items-center rounded-full border border-mist text-stone transition-colors hover:bg-mist/50"><Icon.X width={16} height={16} /></button>
        </div>

        {result ? (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-go text-cloud"><Icon.Check width={30} height={30} /></div>
            <h4 className="font-display mt-5 text-xl">{t((result.inserted + result.updated) === 1 ? 'partner.import.savedOne' : 'partner.import.savedMany', { n: result.inserted + result.updated })}</h4>
            <p className="mx-auto mt-2 max-w-xs text-sm text-stone">{t('partner.import.savedDesc', { inserted: result.inserted, updated: result.updated })}</p>
            <button onClick={onClose} className="ring-lux mt-6 rounded-full bg-ink px-6 py-3 text-sm font-bold text-cloud transition-colors hover:bg-void">{t('partner.import.done')}</button>
          </div>
        ) : (
          <div className="space-y-4 p-6">
            <div className="rounded-2xl border border-mist bg-cloud p-4">
              <div className="text-sm font-semibold">{t('partner.import.needFormat')}</div>
              <p className="mt-1 text-xs text-stone">{t('partner.import.formatHintPre')} <span className="font-semibold text-ink">{t('partner.import.formatHintBold')}</span></p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => downloadTemplate('csv')} className="ring-lux rounded-full border border-mist px-3.5 py-2 text-xs font-semibold text-ink transition-colors hover:border-ink">{t('partner.import.csvTemplate')}</button>
                <button onClick={() => downloadTemplate('xlsx')} className="ring-lux rounded-full border border-mist px-3.5 py-2 text-xs font-semibold text-ink transition-colors hover:border-ink">{t('partner.import.excelTemplate')}</button>
              </div>
            </div>

            <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="ring-lux flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-mist bg-cloud py-4 text-sm font-semibold text-ink transition-colors hover:border-ink disabled:opacity-60">
              {busy && !rows ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-mist border-t-ink" /> : <><Icon.Plus width={16} height={16} /> {t('partner.import.chooseFile')}</>}
            </button>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={pick} className="hidden" />

            {rows && (
              <div>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="font-semibold text-go">{t('partner.import.ready', { n: valid.length })}</span>
                  {newCount > 0 && <span className="text-stone">{t('partner.import.new', { n: newCount })}</span>}
                  {updCount > 0 && <span className="text-stone">{t(updCount === 1 ? 'partner.import.updateOne' : 'partner.import.updateMany', { n: updCount })}</span>}
                  {invalid.length > 0 && <span className="font-semibold text-red-600">{t('partner.import.withErrors', { n: invalid.length })}</span>}
                </div>
                <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-xl border border-mist bg-cloud p-2">
                  {rows.map((r) => (
                    <div key={r.row} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-xs">
                      <span className="truncate font-semibold text-ink">{r.data.make || '—'} {r.data.model || ''}</span>
                      {r.errors.length === 0
                        ? <span className="flex shrink-0 items-center gap-1 text-go"><Icon.Check width={12} height={12} /> {r.data.id ? t('partner.import.rowUpdate') : t('partner.import.rowNew')}</span>
                        : <span className="shrink-0 text-right text-red-600">{t('partner.import.rowError', { row: r.row, errors: r.errors.join(', ') })}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {err && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>}

            <button onClick={importAll} disabled={busy || !valid.length} className="ring-lux flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3 text-sm font-bold text-cloud transition-colors hover:bg-void disabled:opacity-60">
              {busy && rows ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-cloud/30 border-t-cloud" /> : <>{t(valid.length === 1 ? 'partner.import.importBtnOne' : 'partner.import.importBtnMany', { n: valid.length || '' })} <Icon.Arrow width={15} height={15} /></>}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// Car description with a small "Generate with AI" button. Shared by Add/Edit.
// `carFields` are the facts sent to the generator (make/model/specs/city).
function DescriptionField({ value, onChange, carFields }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function gen() {
    if (!carFields.make?.trim() || !carFields.model?.trim()) { setErr(t('partner.desc.errMakeModel')); return; }
    setBusy(true); setErr('');
    try { onChange(await generateCarDescription(carFields)); }
    catch (e) { setErr(e.message || t('partner.desc.errGenerate')); }
    finally { setBusy(false); }
  }
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-semibold">{t('partner.desc.label')} <span className="font-normal text-stone">{t('partner.desc.hint')}</span></span>
        <button type="button" onClick={gen} disabled={busy}
          className="ring-lux inline-flex items-center gap-1 rounded-full border border-mist px-2.5 py-1 text-[0.7rem] font-semibold text-gold transition-colors hover:border-gold disabled:opacity-50">
          <span aria-hidden>✦</span> {busy ? t('partner.desc.writing') : t('partner.desc.generate')}
        </button>
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        placeholder={t('partner.desc.placeholder')}
        className="ring-lux w-full resize-y rounded-xl border border-mist bg-cloud px-4 py-3 text-sm outline-none transition-colors focus:border-ink placeholder:text-stone"
      />
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
    </label>
  );
}

function FormInput({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      <input {...props} className="ring-lux w-full rounded-xl border border-mist bg-cloud px-4 py-3 text-sm outline-none transition-colors focus:border-ink placeholder:text-stone" />
    </label>
  );
}

function FormSelect({ label, options, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      <select {...props} className="ring-lux w-full rounded-xl border border-mist bg-cloud px-4 py-3 text-sm outline-none transition-colors focus:border-ink">
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}
