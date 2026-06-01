import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Icon } from './Icons.jsx';
import CarCard from './CarCard.jsx';
import { useAuth } from '../lib/auth.jsx';
import { supabase } from '../lib/supabase.js';
import { fetchSavedCars, removeFavourite } from '../lib/favourites.js';
import { chf } from '../lib/format.js';

const TABS = [
  { key: 'trips', label: 'My trips' },
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

        {/* tabs */}
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
          {tab === 'saved' && <Saved onOpenCar={onOpenCar} />}
          {tab === 'licence' && <Licence customer={customer} />}
          {tab === 'account' && <Account onExit={onExit} />}
        </div>
      </main>
    </div>
  );
}

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
    Confirmed: 'bg-go/12 text-go', Pending: 'bg-gold/15 text-gold-deep',
    Cancelled: 'bg-red-100 text-red-700', Completed: 'bg-mist text-stone',
  };
  return <span className={`mt-1 inline-block rounded-full px-2.5 py-1 text-[0.7rem] font-bold ${map[status] || 'bg-mist text-stone'}`}>{status}</span>;
}

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

function Licence({ customer }) {
  const l = customer?.licence;
  if (!customer?.licence_verified || !l) {
    return <Empty icon={<Icon.Shield width={26} height={26} />} title="No licence on file." sub="Verify your driver’s licence during your next booking and we’ll save it here to speed up future trips." />;
  }
  return (
    <div className="max-w-md rounded-2xl border border-mist bg-cloud p-6">
      <div className="flex items-center gap-2 text-go"><Icon.Check width={18} height={18} /> <span className="font-semibold">Verified licence on file</span></div>
      <dl className="mt-4 space-y-2 text-sm">
        <Row k="Name" v={[l.first_name, l.last_name].filter(Boolean).join(' ')} />
        <Row k="Categories" v={Array.isArray(l.categories) ? l.categories.join(', ') : ''} />
        <Row k="Valid from" v={l.valid_from} />
        <Row k="Number" v={l.number} />
      </dl>
      <p className="mt-4 text-xs text-stone">We use this to prefill your bookings. Re-verify any time from the booking flow.</p>
    </div>
  );
}

function Row({ k, v }) {
  if (!v) return null;
  return <div className="flex justify-between gap-4"><dt className="text-stone">{k}</dt><dd className="font-medium text-ink">{v}</dd></div>;
}

function Account({ onExit }) {
  const { customer, user, signOut, refreshCustomer } = useAuth();
  const [form, setForm] = useState({ full_name: '', phone: '' });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => { setForm({ full_name: customer?.full_name || '', phone: customer?.phone || '' }); }, [customer]);

  async function save(e) {
    e.preventDefault();
    setBusy(true); setSaved(false);
    const { error } = await supabase.from('customers')
      .update({ full_name: form.full_name.trim() || null, phone: form.phone.trim() || null })
      .eq('id', user.id);
    setBusy(false);
    if (!error) { setSaved(true); refreshCustomer(); }
  }

  return (
    <form onSubmit={save} className="max-w-md space-y-4">
      <Field label="Full name" value={form.full_name} onChange={(v) => setForm((f) => ({ ...f, full_name: v }))} placeholder="Franco Steiner" />
      <Field label="Phone" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} placeholder="+41 79 123 45 67" />
      <div>
        <span className="mb-1.5 block text-sm font-semibold text-ink">Email</span>
        <div className="rounded-2xl border border-mist bg-mist/30 px-4 py-3.5 text-sm text-stone">{customer?.email || user?.email}</div>
      </div>
      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={busy} className="ring-lux rounded-2xl bg-ink px-6 py-3 text-sm font-bold text-cloud transition-colors hover:bg-void disabled:opacity-60">
          {busy ? 'Saving…' : 'Save changes'}
        </button>
        {saved && <span className="text-sm font-semibold text-go">Saved ✓</span>}
      </div>
      <button type="button" onClick={async () => { await signOut(); onExit?.(); }} className="ring-lux mt-4 text-sm font-semibold text-stone underline-offset-4 hover:text-ink hover:underline">
        Log out
      </button>
    </form>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      <input
        value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="ring-lux w-full rounded-2xl border border-mist bg-cloud px-4 py-3.5 text-sm outline-none transition-colors focus:border-ink placeholder:text-stone"
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
