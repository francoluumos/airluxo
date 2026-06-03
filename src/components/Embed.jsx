import { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import CarCard from './CarCard.jsx';
import CarDetail from './CarDetail.jsx';
import { fetchPartnerListings, fetchPreviewListings } from '../lib/listings.js';

// Dark theme: override the palette CSS variables; every Tailwind token
// (bg-paper, text-ink, …) re-skins automatically, including the booking modal.
const DARK_VARS = {
  '--color-paper': '#0b0b0c',
  '--color-cloud': '#161618',
  '--color-ink': '#f6f5f1',
  '--color-mist': '#2a2a2e',
  '--color-stone': '#a8a59b',
  colorScheme: 'dark',
};

// White-label embed: shows one partner's fleet + the full AIRLUXO booking flow.
// Mounted when the app is opened with ?embed=<partnerId>&theme=light|dark
// (typically in an iframe on the partner's site). Bookings settle through AIRLUXO.
export default function Embed({ partnerId, previewToken }) {
  const dark = new URLSearchParams(window.location.search).get('theme') === 'dark';
  const [cars, setCars] = useState(null);
  const [active, setActive] = useState(null);

  useEffect(() => {
    let on = true;
    // Prospect sales-preview (token) reads the hidden cars via the gated RPC;
    // a normal partner embed reads their public listings.
    const load = previewToken
      ? fetchPreviewListings(partnerId, previewToken)
      : fetchPartnerListings(partnerId);
    load
      .then((r) => { if (on) setCars(r); })
      .catch(() => { if (on) setCars([]); });
    return () => { on = false; };
  }, [partnerId, previewToken]);

  useEffect(() => {
    document.body.style.overflow = active ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [active]);

  return (
    <div style={dark ? DARK_VARS : undefined} className="min-h-screen bg-paper text-ink px-4 py-6 sm:px-6">
      {previewToken && (
        <div className="mx-auto mb-5 max-w-md rounded-full border border-gold/30 bg-gold/10 px-4 py-2 text-center text-xs font-semibold text-gold">
          Sales preview — this storefront isn’t live yet
        </div>
      )}
      {cars === null ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="aspect-[4/3] rounded-[var(--radius-card)] border border-mist shimmer" />)}
        </div>
      ) : cars.length === 0 ? (
        <div className="py-24 text-center text-stone">No cars available right now.</div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cars.map((c) => <CarCard key={c.id} car={c} onOpen={setActive} />)}
        </div>
      )}

      <div className="mt-7 text-center text-xs text-stone">
        Powered by <span className="wordmark text-ink">AIR<span className="text-gold">LUXO</span></span>
      </div>

      <AnimatePresence>
        {active && <CarDetail car={active} onClose={() => setActive(null)} />}
      </AnimatePresence>
    </div>
  );
}
