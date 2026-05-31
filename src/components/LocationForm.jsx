import { useState, useRef, useEffect } from 'react';
import { searchSwissAddress } from '../lib/geocode.js';

const COUNTRIES = ['Switzerland', 'Liechtenstein', 'France', 'Germany', 'Italy', 'Austria'];
const inputCls = 'ring-lux w-full rounded-lg border border-mist bg-paper px-3 py-2 text-sm outline-none transition-colors focus:border-ink placeholder:text-stone';

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[0.62rem] font-semibold uppercase tracking-wider text-stone">{label}</span>
      {children}
    </label>
  );
}

// Reusable structured address block with Swiss address autocomplete (geo.admin.ch).
// `value` carries { street, street_number, zip, city, country, lat, lng, address }.
export function AddressFields({ value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-2.5">
      <Field label="Find address">
        <AddressAutocomplete
          onSelect={(p) => set({
            address: p.address, street: p.street, street_number: p.street_number,
            zip: p.zip, city: p.city, country: p.country, lat: p.lat, lng: p.lng,
          })}
        />
      </Field>
      <div className="grid grid-cols-[1fr_5rem] gap-2">
        <Field label="Street"><input value={value.street || ''} onChange={(e) => set({ street: e.target.value })} className={inputCls} /></Field>
        <Field label="No."><input value={value.street_number || ''} onChange={(e) => set({ street_number: e.target.value })} className={inputCls} /></Field>
      </div>
      <div className="grid grid-cols-[5rem_1fr] gap-2">
        <Field label="ZIP"><input value={value.zip || ''} onChange={(e) => set({ zip: e.target.value })} className={inputCls} /></Field>
        <Field label="City"><input value={value.city || ''} onChange={(e) => set({ city: e.target.value })} className={inputCls} /></Field>
      </div>
      <Field label="Country">
        <select value={value.country || 'Switzerland'} onChange={(e) => set({ country: e.target.value })} className={inputCls}>
          {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </Field>
    </div>
  );
}

// Pick-up location editor: a labelled site with address + contact details.
// `value` is the location object; `onChange` receives the whole updated object.
export default function LocationForm({ value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-2.5">
      <Field label="Label">
        <input value={value.label || ''} onChange={(e) => set({ label: e.target.value })} placeholder="e.g. Geneva HQ" className={inputCls} />
      </Field>

      <AddressFields value={value} onChange={onChange} />

      <div className="grid grid-cols-2 gap-2">
        <Field label="Phone"><input type="tel" value={value.phone || ''} onChange={(e) => set({ phone: e.target.value })} placeholder="+41 …" className={inputCls} /></Field>
        <Field label="Email"><input type="email" value={value.email || ''} onChange={(e) => set({ email: e.target.value })} placeholder="site@…" className={inputCls} /></Field>
      </div>
    </div>
  );
}

function AddressAutocomplete({ onSelect }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const tRef = useRef(null);
  const skipRef = useRef(false); // don't re-search the value we just auto-filled

  useEffect(() => {
    if (skipRef.current) { skipRef.current = false; setLoading(false); return; }
    if (q.trim().length < 3) { setResults([]); setLoading(false); return; }
    setLoading(true);
    clearTimeout(tRef.current);
    tRef.current = setTimeout(async () => {
      const r = await searchSwissAddress(q);
      setResults(r); setOpen(true); setLoading(false);
    }, 280);
    return () => clearTimeout(tRef.current);
  }, [q]);

  return (
    <div className="relative">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        placeholder="Start typing a Swiss address…"
        className={inputCls}
        autoComplete="off"
      />
      {loading && <span className="absolute right-3 top-2.5 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-mist border-t-ink" />}
      {open && results.length > 0 && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-auto rounded-xl border border-mist bg-cloud py-1 shadow-xl">
            {results.map((r, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => { skipRef.current = true; onSelect(r); setQ(r.label); setResults([]); setOpen(false); }}
                  className="ring-lux block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-paper"
                >
                  {r.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
