import { useState, useRef } from 'react';
import { Icon } from './Icons.jsx';
import { verifyLicence, submitLicenceSession } from '../lib/licence.js';

// Phone-only page opened by scanning the QR on the desktop booking flow
// (?licence=<sessionId>). Captures the licence, extracts fields, and submits
// them back to the desktop session.
export default function MobileLicence({ sessionId }) {
  const [step, setStep] = useState('capture'); // capture | review | done
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [f, setF] = useState({ first_name: '', last_name: '', birth_date: '', valid_from: '', categories: '', number: '' });
  const fileRef = useRef(null);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function onFile(file) {
    if (!file) return;
    setErr(''); setBusy(true);
    try {
      const r = await verifyLicence(file);
      setF({
        first_name: r.first_name || '', last_name: r.last_name || '',
        birth_date: r.birth_date || '', valid_from: r.valid_from || '',
        categories: (r.categories || []).join(', '), number: r.number || '',
      });
      setStep('review');
    } catch (e) {
      setErr(e.message || 'Could not read the licence — enter the details manually.');
      setStep('review');
    } finally { setBusy(false); }
  }

  async function send() {
    setErr('');
    if (!f.first_name.trim() || !f.last_name.trim() || !f.number.trim()) { setErr('Name and licence number are required.'); return; }
    setBusy(true);
    try {
      await submitLicenceSession(sessionId, {
        first_name: f.first_name.trim() || null,
        last_name: f.last_name.trim() || null,
        birth_date: f.birth_date.trim() || null,
        valid_from: f.valid_from.trim() || null,
        categories: f.categories.split(',').map((s) => s.trim()).filter(Boolean),
        number: f.number.trim() || null,
      });
      setStep('done');
    } catch (e) { setErr(e.message || 'Could not send — please try again.'); }
    finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="grain" />
      <div className="mx-auto max-w-md px-5 py-8">
        <div className="flex items-center gap-2.5">
          <span className="wordmark text-[1.3rem]">AIR<span className="text-gold">LUXO</span></span>
        </div>

        {step === 'capture' && (
          <div className="mt-10">
            <div className="eyebrow text-gold">Driver's licence</div>
            <h1 className="font-display mt-2 text-3xl leading-tight">Scan your licence</h1>
            <p className="mt-2 text-stone">Take a clear photo of the front of your driver's licence. We'll read the details and send them to your booking on the other device.</p>
            <button onClick={() => fileRef.current?.click()} disabled={busy} className="ring-lux mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink py-4 text-sm font-bold text-cloud transition-colors hover:bg-void disabled:opacity-60">
              {busy ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-cloud/30 border-t-cloud" /> : <><Icon.Shield width={17} height={17} /> Take photo of licence</>}
            </button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={(e) => onFile(e.target.files?.[0])} className="hidden" />
            <p className="mt-3 text-center text-xs text-stone">Your photo isn't stored — only the read details are shared with the host.</p>
            {err && <p className="mt-3 text-center text-sm text-red-600">{err}</p>}
          </div>
        )}

        {step === 'review' && (
          <div className="mt-8">
            <div className="eyebrow text-gold">Check the details</div>
            <h1 className="font-display mt-2 text-2xl leading-tight">Does this look right?</h1>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Field label="First name" value={f.first_name} onChange={set('first_name')} />
              <Field label="Last name" value={f.last_name} onChange={set('last_name')} />
              <Field label="Birth date" value={f.birth_date} onChange={set('birth_date')} placeholder="YYYY-MM-DD" />
              <Field label="Valid from" value={f.valid_from} onChange={set('valid_from')} placeholder="YYYY-MM-DD" />
              <Field label="Categories" value={f.categories} onChange={set('categories')} placeholder="B, A1" />
              <Field label="Licence no." value={f.number} onChange={set('number')} />
            </div>
            {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
            <div className="mt-5 flex gap-3">
              <button onClick={() => { setStep('capture'); setErr(''); }} className="ring-lux rounded-2xl border border-mist px-5 py-3.5 text-sm font-semibold text-ink transition-colors hover:border-ink">Retake</button>
              <button onClick={send} disabled={busy} className="ring-lux flex flex-1 items-center justify-center gap-2 rounded-2xl bg-ink py-3.5 text-sm font-bold text-cloud transition-colors hover:bg-void disabled:opacity-60">
                {busy ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-cloud/30 border-t-cloud" /> : <>Send to my booking <Icon.Arrow width={16} height={16} /></>}
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="mt-16 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-go text-cloud"><Icon.Check width={30} height={30} /></div>
            <h1 className="font-display mt-5 text-2xl">All set.</h1>
            <p className="mt-2 text-stone">Your licence details were sent. Return to your computer to finish the booking — you can close this tab.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[0.6rem] uppercase tracking-wider text-stone">{label}</span>
      <input value={value} onChange={onChange} placeholder={placeholder} className="ring-lux w-full rounded-lg border border-mist bg-cloud px-3 py-2.5 text-sm outline-none transition-colors focus:border-ink placeholder:text-stone" />
    </label>
  );
}
