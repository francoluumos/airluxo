import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Icon } from './Icons.jsx';
import CarCard from './CarCard.jsx';
import LicenceCapture from './LicenceCapture.jsx';
import { useAuth } from '../lib/auth.jsx';
import { supabase } from '../lib/supabase.js';
import { fetchSavedCars, removeFavourite } from '../lib/favourites.js';
import { uploadListingPhoto } from '../lib/listings.js';
import { setNewsletter } from '../lib/newsletter.js';
import { openConsentSettings } from '../lib/consent.js';
import { searchSwissAddress } from '../lib/geocode.js';
import { chf } from '../lib/format.js';
import { tierForTrips, nextTier, pointsToChf } from '../lib/loyalty.js';

const TABS = [
  { key: 'trips', label: 'My trips' },
  { key: 'rewards', label: 'Membership' },
  { key: 'saved', label: 'Saved' },
  { key: 'licence', label: 'Licence' },
  { key: 'account', label: 'Account' },
];

const fmtDate = (s) => (s ? new Date(s).toLocaleDateString('de-CH', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const todayISO = () => new Date().toISOString().slice(0, 10);

export default function CustomerAccount({ initialTab = 'trips', onExit, onOpenCar }) {
  const { customer } = useAuth();
  const [tab, setTab] = useState(initialTab);
  useEffect(() => { setTab(initialTab); }, [initialTab]);

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-40 border-b border-mist bg-paper/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-[1100px] items-center justify-between px-5 sm:px-8">
          <button onClick={onExit} className="ring-lux wordmark text-[1.35rem] text-ink">AIR<span className="text-gold">LUXO</span></button>
          <button onClick={onExit} className="ring-lux flex items-center gap-1.5 text-sm font-semibold text-stone transition-colors hover:text-ink">
            <Icon.Arrow width={15} height={15} className="rotate-180" /> Back to site
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-5 py-8 sm:px-8 sm:py-12">
        <h1 className="font-display text-[clamp(1.8rem,4vw,2.6rem)] leading-tight">
          {customer?.full_name ? `Hi, ${customer.full_name.split(' ')[0]}.` : 'Your account.'}
        </h1>

        <div className="mt-6 flex gap-1 overflow-x-auto border-b border-mist">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`ring-lux relative whitespace-nowrap px-4 py-3 text-sm font-semibold transition-colors ${tab === t.key ? 'text-ink' : 'text-stone hover:text-ink'}`}
            >
              {t.label}
              {tab === t.key && <motion.span layoutId="acct-tab" className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-ink" />}
            </button>
          ))}
        </div>

        <div className="mt-8">
          {tab === 'trips' && <Trips />}
          {tab === 'rewards' && <Rewards />}
          {tab === 'saved' && <Saved onOpenCar={onOpenCar} />}
          {tab === 'licence' && <Licence />}
          {tab === 'account' && <Account onExit={onExit} />}
        </div>
      </main>
    </div>
  );
}

/* ── Trips ─────────────────────────────────────────────────────────────── */
function Trips() {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    supabase.from('bookings').select('*').order('start_date', { ascending: false })
      .then(({ data }) => setRows(data ?? []));
  }, []);

  if (rows === null) return <Loading />;
  if (!rows.length) return <Empty icon={<Icon.Calendar width={26} height={26} />} title="No trips yet." sub="When you book a car it’ll show up here." />;

  const t = todayISO();
  const upcoming = rows.filter((b) => (b.end_date || b.start_date) >= t);
  const past = rows.filter((b) => (b.end_date || b.start_date) < t);

  return (
    <div className="space-y-8">
      {!!upcoming.length && <TripGroup title="Upcoming" rows={upcoming} />}
      {!!past.length && <TripGroup title="Past" rows={past} />}
    </div>
  );
}

function TripGroup({ title, rows }) {
  return (
    <section>
      <h2 className="eyebrow text-stone">{title}</h2>
      <div className="mt-3 space-y-3">
        {rows.map((b) => (
          <div key={b.id} className="flex items-center justify-between gap-4 rounded-2xl border border-mist bg-cloud px-5 py-4">
            <div className="min-w-0">
              <div className="truncate font-display text-lg">{b.car_label || 'Your car'}</div>
              <div className="mt-1 text-sm text-stone">
                {fmtDate(b.start_date)}{b.end_date && b.end_date !== b.start_date ? ` → ${fmtDate(b.end_date)}` : ''}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="font-display tnum">{chf(b.total_amount)}</div>
              <StatusPill status={b.status} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatusPill({ status }) {
  const map = {
    Confirmed: 'bg-go/12 text-go', Pending: 'bg-gold/15 text-gold',
    Cancelled: 'bg-red-100 text-red-700', Completed: 'bg-mist text-stone',
  };
  return <span className={`mt-1 inline-block rounded-full px-2.5 py-1 text-[0.7rem] font-bold ${map[status] || 'bg-mist text-stone'}`}>{status}</span>;
}

/* ── Membership (loyalty) ──────────────────────────────────────────────── */
function Rewards() {
  const { customer } = useAuth();
  const [trips, setTrips] = useState(null);
  useEffect(() => {
    let active = true;
    supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'Completed')
      .then(({ count }) => { if (active) setTrips(count ?? 0); })
      .catch(() => { if (active) setTrips(0); });
    return () => { active = false; };
  }, []);

  if (trips === null) return <Loading />;

  const points = customer?.loyalty_points ?? 0;
  const tier = tierForTrips(trips);
  const nxt = nextTier(trips);
  const worth = pointsToChf(points);
  const span = nxt ? nxt.tier.minTrips - tier.minTrips : 1;
  const pct = nxt ? Math.min(100, Math.max(0, Math.round(((trips - tier.minTrips) / span) * 100))) : 100;

  return (
    <div className="max-w-2xl space-y-8">
      {/* membership card */}
      <div className="spotlight relative overflow-hidden rounded-[var(--radius-card)] border border-graphite bg-void p-7 text-cloud">
        <div className="flex items-start justify-between">
          <div>
            <div className="eyebrow text-gold-soft">AIRLUXO Member</div>
            <div className="font-display mt-2 text-3xl">{tier.label}</div>
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-cloud/10">
            <Icon.Star width={18} height={18} className="text-gold-soft" />
          </span>
        </div>
        <div className="mt-8 flex items-end justify-between">
          <div>
            <div className="font-display text-4xl tnum text-gold-soft">{points.toLocaleString('de-CH')}</div>
            <div className="mt-1 text-[0.7rem] uppercase tracking-wider text-ash">
              points{worth ? ` · ~${chf(worth)} value` : ''}
            </div>
          </div>
          <div className="text-right text-xs text-ash">{trips} {trips === 1 ? 'trip' : 'trips'} completed</div>
        </div>
      </div>

      {/* progress to next tier */}
      {nxt ? (
        <div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">{tier.label}</span>
            <span className="text-stone">{nxt.tripsAway} more {nxt.tripsAway === 1 ? 'trip' : 'trips'} → {nxt.tier.label}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-mist">
            <div className="h-full rounded-full bg-gold transition-[width] duration-700" style={{ width: `${pct}%` }} />
          </div>
        </div>
      ) : (
        <p className="text-sm font-semibold text-gold">You’ve reached {tier.label} — our highest tier. Thank you for driving with us.</p>
      )}

      {/* current benefits */}
      <section>
        <SectionTitle>Your {tier.label} benefits</SectionTitle>
        <ul className="mt-3 space-y-2">
          {tier.perks.map((p) => (
            <li key={p} className="flex items-center gap-2.5 rounded-xl border border-mist bg-cloud px-4 py-3 text-sm font-medium text-ink">
              <Icon.Check width={16} height={16} className="shrink-0 text-go" /> {p}
            </li>
          ))}
        </ul>
      </section>

      {/* next-tier teaser */}
      {nxt && (
        <section>
          <SectionTitle>Unlock at {nxt.tier.label}</SectionTitle>
          <ul className="mt-3 space-y-2">
            {nxt.tier.perks.map((p) => (
              <li key={p} className="flex items-center gap-2.5 rounded-xl border border-dashed border-mist px-4 py-3 text-sm text-stone">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-stone/50" /> {p}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-stone">
        You earn points on every completed trip. Referrals and redeeming points for upgrades &amp; credits are coming soon.
      </p>
    </div>
  );
}

/* ── Saved ─────────────────────────────────────────────────────────────── */
function Saved({ onOpenCar }) {
  const [cars, setCars] = useState(null);
  const load = useCallback(() => { fetchSavedCars().then(setCars); }, []);
  useEffect(() => { load(); }, [load]);

  async function unsave(id) {
    setCars((c) => c.filter((x) => x.id !== id));
    try { await removeFavourite(id); } catch { load(); }
  }

  if (cars === null) return <Loading />;
  if (!cars.length) return <Empty icon={<Icon.Star width={26} height={26} />} title="Nothing saved yet." sub="Tap the heart on a car to save it for later." />;

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {cars.map((car) => (
        <CarCard key={car.id} car={car} onOpen={onOpenCar || (() => {})} isFav onToggleFav={() => unsave(car.id)} />
      ))}
    </div>
  );
}

/* ── Licence ───────────────────────────────────────────────────────────── */
function Licence() {
  const { customer, user, refreshCustomer } = useAuth();
  const [editing, setEditing] = useState(false);
  const l = customer?.licence;
  const verified = customer?.licence_verified && l;

  async function save(lic) {
    // upsert (not update): a partner-identity session has no customers row yet,
    // and update().eq() would silently match 0 rows.
    const { error } = await supabase.from('customers')
      .upsert({ id: user.id, email: user.email, licence: lic, licence_verified: true }, { onConflict: 'id' });
    if (error) throw error;
    await refreshCustomer();
    setEditing(false);
  }

  if (verified && !editing) {
    return (
      <div className="max-w-md rounded-2xl border border-mist bg-cloud p-6">
        <div className="flex items-center gap-2 text-go"><Icon.Check width={18} height={18} /> <span className="font-semibold">Verified licence on file</span></div>
        <dl className="mt-4 space-y-2 text-sm">
          <Row k="Name" v={[l.first_name, l.last_name].filter(Boolean).join(' ')} />
          <Row k="Categories" v={Array.isArray(l.categories) ? l.categories.join(', ') : ''} />
          <Row k="Valid from" v={l.valid_from} />
          <Row k="Number" v={l.number} />
        </dl>
        <p className="mt-4 text-xs text-stone">We use this to prefill your bookings.</p>
        <button onClick={() => setEditing(true)} className="ring-lux mt-4 rounded-full border border-mist px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-mist/40">
          Replace licence
        </button>
      </div>
    );
  }

  return (
    <div>
      {!verified && <Empty.Note>Add your driver’s licence once and we’ll prefill it on every booking — verify now, book fast.</Empty.Note>}
      <div className="mt-4"><LicenceCapture initial={l} onSaved={save} saveLabel={verified ? 'Update licence' : 'Save licence'} /></div>
      {verified && <button onClick={() => setEditing(false)} className="ring-lux mt-3 text-sm font-semibold text-stone hover:text-ink">Cancel</button>}
    </div>
  );
}

/* ── Account ───────────────────────────────────────────────────────────── */
function Account({ onExit }) {
  const { customer, user, signOut, refreshCustomer } = useAuth();
  return (
    <div className="max-w-md space-y-10">
      <PersonalInfo customer={customer} user={user} refreshCustomer={refreshCustomer} />
      <EmailPrefs customer={customer} user={user} refreshCustomer={refreshCustomer} />
      <PrivacySection user={user} signOut={signOut} onExit={onExit} />
    </div>
  );
}

function PersonalInfo({ customer, user, refreshCustomer }) {
  const [form, setForm] = useState({ full_name: '', phone: '' });
  const [address, setAddress] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setForm({ full_name: customer?.full_name || '', phone: customer?.phone || '' });
    setAddress(customer?.address || null);
  }, [customer]);

  async function uploadAvatar(file) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadListingPhoto(file);
      await supabase.from('customers').upsert({ id: user.id, email: user.email, avatar_url: url }, { onConflict: 'id' });
      await refreshCustomer();
    } catch { /* ignore */ } finally { setUploading(false); }
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true); setSaved(false);
    const { error } = await supabase.from('customers')
      .upsert({ id: user.id, email: user.email, full_name: form.full_name.trim() || null, phone: form.phone.trim() || null, address }, { onConflict: 'id' });
    setBusy(false);
    if (!error) { setSaved(true); refreshCustomer(); }
  }

  return (
    <section>
      <SectionTitle>Personal info</SectionTitle>
      <div className="mt-4 flex items-center gap-4">
        <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-ink text-xl font-bold text-cloud">
          {customer?.avatar_url
            ? <img src={customer.avatar_url} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
            : (customer?.full_name || customer?.email || 'A').trim().slice(0, 1).toUpperCase()}
        </div>
        <label className="ring-lux cursor-pointer rounded-full border border-mist px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-mist/40">
          {uploading ? 'Uploading…' : 'Change photo'}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadAvatar(e.target.files?.[0])} />
        </label>
      </div>

      <form onSubmit={save} className="mt-5 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Full name" value={form.full_name} onChange={(v) => setForm((f) => ({ ...f, full_name: v }))} placeholder="Franco Steiner" />
          <Field label="Phone" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} placeholder="+41 79 …" />
        </div>
        <Field label="Login email" value={customer?.email || user?.email || ''} disabled />
        <AddressField value={address} onPick={setAddress} />
        <div className="flex items-center gap-3 pt-1">
          <button type="submit" disabled={busy} className="ring-lux rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-cloud transition-colors hover:bg-void disabled:opacity-50">
            {busy ? 'Saving…' : 'Save changes'}
          </button>
          {saved && <span className="text-sm font-semibold text-go">Saved ✓</span>}
        </div>
      </form>
    </section>
  );
}

function EmailPrefs({ customer, user, refreshCustomer }) {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { setOn(!!customer?.marketing_opt_in); }, [customer]);

  async function toggle() {
    const next = !on;
    setOn(next); setBusy(true); setErr('');
    try {
      await setNewsletter(customer?.email || user?.email, next);
      await supabase.from('customers').upsert({ id: user.id, email: user.email, marketing_opt_in: next }, { onConflict: 'id' });
      refreshCustomer();
    } catch (e) {
      setOn(!next); // revert
      setErr(e.message || 'Could not update your preference.');
    } finally { setBusy(false); }
  }

  return (
    <section>
      <SectionTitle>Email preferences</SectionTitle>
      <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-mist bg-cloud px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-ink">Newsletter</div>
          <div className="mt-0.5 text-xs text-stone">New arrivals, rare drives and members-only releases.</div>
        </div>
        <Toggle on={on} busy={busy} onClick={toggle} />
      </div>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      <p className="mt-3 text-xs text-stone">Booking confirmations and trip updates are transactional and always sent.</p>
    </section>
  );
}

function PrivacySection({ user, signOut, onExit }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function del() {
    setBusy(true); setErr('');
    try {
      const { data, error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
      if (error || data?.error) throw new Error(error?.message || data?.error);
      await signOut();
      onExit?.();
    } catch (e) {
      setErr(e.message || 'Could not delete your account.');
      setBusy(false);
    }
  }

  return (
    <section>
      <SectionTitle>Privacy &amp; cookies</SectionTitle>
      <div className="mt-4 space-y-2.5">
        <button onClick={openConsentSettings} className="ring-lux flex w-full items-center justify-between rounded-xl border border-mist bg-cloud px-4 py-3 text-sm font-semibold text-ink transition-colors hover:bg-mist/40">
          Manage cookies <Icon.Arrow width={16} height={16} className="text-stone" />
        </button>
        <a href="?privacy" className="ring-lux flex w-full items-center justify-between rounded-xl border border-mist bg-cloud px-4 py-3 text-sm font-semibold text-ink transition-colors hover:bg-mist/40">
          Privacy &amp; Cookie Policy <Icon.ArrowUpRight width={16} height={16} className="text-stone" />
        </a>
      </div>

      <div className="mt-8 rounded-2xl border border-red-200 bg-red-50/50 p-5">
        <div className="text-sm font-bold text-red-700">Delete account</div>
        <p className="mt-1 text-xs text-red-700/80">Permanently removes your profile, saved cars and licence. Past bookings are kept for the rental partner but no longer linked to you. This can’t be undone.</p>
        {confirming ? (
          <div className="mt-3 flex items-center gap-2">
            <button onClick={del} disabled={busy} className="ring-lux rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-60">
              {busy ? 'Deleting…' : 'Yes, delete everything'}
            </button>
            <button onClick={() => setConfirming(false)} disabled={busy} className="ring-lux rounded-full px-4 py-2 text-sm font-semibold text-stone hover:text-ink">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)} className="ring-lux mt-3 rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100">
            Delete my account
          </button>
        )}
        {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
      </div>

      <button type="button" onClick={async () => { await signOut(); onExit?.(); }} className="ring-lux mt-8 text-sm font-semibold text-stone underline-offset-4 hover:text-ink hover:underline">
        Log out
      </button>
    </section>
  );
}

/* ── Saved address autocomplete (Swiss geo) ────────────────────────────── */
function AddressField({ value, onPick }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  useEffect(() => { setQ(value?.label || ''); }, [value]);

  useEffect(() => {
    if (q.length < 3 || q === value?.label) { setResults([]); return; }
    let active = true;
    const t = setTimeout(async () => {
      const r = await searchSwissAddress(q);
      if (active) { setResults(r); setOpen(true); }
    }, 250);
    return () => { active = false; clearTimeout(t); };
  }, [q, value]);

  return (
    <div className="relative">
      <span className="mb-1.5 block text-sm font-semibold">Saved address <span className="font-normal text-stone">(optional)</span></span>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        placeholder="Start typing a Swiss address…"
        className="ring-lux w-full rounded-xl border border-mist bg-cloud px-4 py-3 text-sm outline-none transition-colors focus:border-ink placeholder:text-stone"
      />
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-mist bg-paper py-1 shadow-xl">
          {results.map((r, i) => (
            <button key={i} type="button" onClick={() => { onPick(r); setQ(r.label); setOpen(false); }}
              className="ring-lux block w-full px-4 py-2 text-left text-sm transition-colors hover:bg-mist/50">
              {r.label}
            </button>
          ))}
        </div>
      )}
      {value?.label && <p className="mt-1 text-xs text-stone">Used to prefill delivery on bookings.</p>}
    </div>
  );
}

/* ── shared bits ───────────────────────────────────────────────────────── */
// Matches the partner dashboard's SubLabel for a uniform look.
function SectionTitle({ children }) {
  return <div className="mb-3 text-[0.7rem] font-bold uppercase tracking-wider text-stone">{children}</div>;
}

function Toggle({ on, busy, onClick }) {
  return (
    <button onClick={onClick} disabled={busy} role="switch" aria-checked={on}
      className={`ring-lux relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${on ? 'bg-go' : 'bg-mist'}`}>
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
  );
}

function Row({ k, v }) {
  if (!v) return null;
  return <div className="flex justify-between gap-4"><dt className="text-stone">{k}</dt><dd className="font-medium text-ink">{v}</dd></div>;
}

// Mirrors the partner dashboard's FormInput so both forms look identical.
function Field({ label, value, onChange, placeholder, type, disabled }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      <input
        type={type} value={value} disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)} placeholder={placeholder}
        className="ring-lux w-full rounded-xl border border-mist bg-cloud px-4 py-3 text-sm outline-none transition-colors focus:border-ink placeholder:text-stone disabled:opacity-60"
      />
    </label>
  );
}

function Loading() {
  return <div className="grid place-items-center py-16"><span className="h-6 w-6 animate-spin rounded-full border-2 border-mist border-t-ink" /></div>;
}

function Empty({ icon, title, sub }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-mist py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-mist/50 text-stone">{icon}</div>
      <h3 className="font-display mt-4 text-xl">{title}</h3>
      <p className="mt-1.5 max-w-xs text-sm text-stone">{sub}</p>
    </div>
  );
}
Empty.Note = function Note({ children }) {
  return <p className="max-w-md rounded-2xl border border-mist bg-cloud px-5 py-4 text-sm text-stone">{children}</p>;
};
