import { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import { Icon } from './Icons.jsx';
import { verifyLicence, createLicenceSession, getLicenceSession } from '../lib/licence.js';

const EMPTY = { first_name: '', last_name: '', birth_date: '', valid_from: '', categories: '', number: '' };

// Self-contained driver's-licence capture: scan/upload (Gemini OCR) or a phone
// QR hand-off, with editable fields. Calls onSaved(licence) when the user saves.
// Mirrors the booking KYC flow (CarDetail) so the experience is identical.
export default function LicenceCapture({ initial, onSaved, saveLabel = 'Save licence' }) {
  const [licence, setLicence] = useState(initial ? { ...EMPTY, ...initial } : EMPTY);
  const [verifying, setVerifying] = useState(false);
  const [scanned, setScanned] = useState(!!initial?.number);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef(null);
  const pollRef = useRef(false);

  const isDesktop = typeof window !== 'undefined' && window.matchMedia
    && window.matchMedia('(pointer: fine)').matches && !window.matchMedia('(pointer: coarse)').matches;

  useEffect(() => () => { pollRef.current = false; }, []);

  const setField = (k) => (v) => setLicence((l) => ({ ...l, [k]: v }));
  const fromResult = (f) => ({
    first_name: f.first_name || '', last_name: f.last_name || '',
    birth_date: f.birth_date || '', valid_from: f.valid_from || '',
    categories: (f.categories || []).join(', '), number: f.number || '',
  });

  async function scan(file) {
    if (!file) return;
    setErr(''); setVerifying(true);
    try {
      setLicence(fromResult(await verifyLicence(file)));
      setScanned(true);
    } catch (e) {
      setErr(e.message || 'Could not read the licence — enter the details manually.');
    } finally { setVerifying(false); }
  }

  async function startPhoneHandoff() {
    setErr('');
    try {
      const id = await createLicenceSession();
      const url = `${window.location.origin}/?licence=${id}`;
      setQrDataUrl(await QRCode.toDataURL(url, { margin: 1, width: 240, color: { dark: '#0b0b0c', light: '#ffffff' } }));
      pollRef.current = true;
      poll(id);
    } catch (e) { setErr(e.message || 'Could not start the phone hand-off.'); }
  }

  async function poll(id) {
    while (pollRef.current) {
      await new Promise((r) => setTimeout(r, 2500));
      if (!pollRef.current) break;
      try {
        const s = await getLicenceSession(id);
        if (s.status === 'done' && s.result) {
          setLicence(fromResult(s.result));
          setScanned(true);
          pollRef.current = false;
          setQrDataUrl(null);
        }
      } catch { /* keep polling */ }
    }
  }

  async function save() {
    setErr('');
    if (!licence.first_name.trim() || !licence.number.trim()) {
      setErr('Scan your licence, or enter at least your name and licence number.');
      return;
    }
    setSaving(true);
    try {
      await onSaved({
        first_name: licence.first_name.trim() || null,
        last_name: licence.last_name.trim() || null,
        birth_date: licence.birth_date.trim() || null,
        valid_from: licence.valid_from.trim() || null,
        categories: licence.categories.split(',').map((s) => s.trim()).filter(Boolean),
        number: licence.number.trim() || null,
      });
    } catch (e) {
      setErr(e.message || 'Could not save your licence.');
    } finally { setSaving(false); }
  }

  return (
    <div className="max-w-md">
      <div className="flex items-center justify-between">
        <div className="text-[0.65rem] uppercase tracking-wider text-stone">Driver's licence</div>
        {scanned && <span className="flex items-center gap-1 text-[0.65rem] font-bold text-go"><Icon.Check width={12} height={12} /> Scanned</span>}
      </div>

      {qrDataUrl ? (
        <div className="mt-3 flex flex-col items-center rounded-xl border border-mist bg-cloud p-4 text-center">
          <img src={qrDataUrl} alt="Scan with your phone" className="h-40 w-40 rounded" />
          <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-ink"><span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-mist border-t-ink" /> Waiting for your phone…</div>
          <p className="mt-1 max-w-xs text-xs text-stone">Scan this with your phone's camera, photograph your licence, and the details appear here automatically.</p>
          <button type="button" onClick={() => { pollRef.current = false; setQrDataUrl(null); }} className="ring-lux mt-2 text-xs font-semibold text-stone hover:text-ink">Cancel</button>
        </div>
      ) : (
        <>
          <p className="mt-2 text-xs text-stone">{isDesktop ? 'Scan your licence with your phone — the details autofill here.' : 'Scan your licence — we autofill the details for you to check.'}</p>
          <button type="button" onClick={isDesktop ? startPhoneHandoff : () => fileRef.current?.click()} disabled={verifying} className="ring-lux mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-mist bg-cloud py-3 text-sm font-semibold text-ink transition-colors hover:border-ink disabled:opacity-60">
            {verifying ? (<><span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-mist border-t-ink" /> Reading licence…</>) : (<><Icon.Shield width={16} height={16} /> {isDesktop ? 'Continue on your phone' : (scanned ? 'Rescan licence' : 'Scan / upload licence')}</>)}
          </button>
          {isDesktop && <button type="button" onClick={() => fileRef.current?.click()} className="ring-lux mt-2 w-full text-center text-xs font-semibold text-stone hover:text-ink">or upload a file from this computer</button>}
        </>
      )}
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={(e) => scan(e.target.files?.[0])} className="hidden" />

      <div className="mt-3 grid grid-cols-2 gap-2">
        <LicInput label="First name" value={licence.first_name} onChange={setField('first_name')} />
        <LicInput label="Last name" value={licence.last_name} onChange={setField('last_name')} />
        <LicInput label="Birth date" value={licence.birth_date} onChange={setField('birth_date')} placeholder="YYYY-MM-DD" />
        <LicInput label="Valid from" value={licence.valid_from} onChange={setField('valid_from')} placeholder="YYYY-MM-DD" />
        <LicInput label="Categories" value={licence.categories} onChange={setField('categories')} placeholder="B, A1" />
        <LicInput label="Licence no." value={licence.number} onChange={setField('number')} />
      </div>

      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

      <button onClick={save} disabled={saving} className="ring-lux mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink py-3.5 text-sm font-bold text-cloud transition-colors hover:bg-void disabled:opacity-60">
        {saving ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-cloud/30 border-t-cloud" /> : <>{saveLabel} <Icon.Check width={16} height={16} /></>}
      </button>
      <p className="mt-2 text-xs text-stone">Stored securely on your account and used to prefill future bookings.</p>
    </div>
  );
}

function LicInput({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[0.7rem] font-semibold text-stone">{label}</span>
      <input
        value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="ring-lux w-full rounded-lg border border-mist bg-cloud px-3 py-2 text-sm outline-none transition-colors focus:border-ink placeholder:text-stone"
      />
    </label>
  );
}
