import { useState, useEffect, useCallback } from 'react';
import { useReducedMotion } from 'motion/react';
import { useI18n } from '../lib/i18n.jsx';

// Real screenshots of the partner backend dashboard (optimised, in /public/partner-preview).
const SHOTS = [
  { src: '/partner-preview/overview.jpg', de: 'Überblick — Buchungen, Auslastung & Auszahlungen', en: 'Overview — bookings, utilisation & payouts' },
  { src: '/partner-preview/fleet.jpg', de: 'Meine Flotte — jedes Inserat in Ihrer Hand', en: 'My fleet — every listing at a glance' },
  { src: '/partner-preview/bookings.jpg', de: 'Buchungen — bestätigen oder ablehnen', en: 'Bookings — confirm or decline' },
  { src: '/partner-preview/calendar.jpg', de: 'Kalender — ICS-Sync, keine Doppelbuchungen', en: 'Calendar — ICS sync, no double bookings' },
  { src: '/partner-preview/earnings.jpg', de: 'Auszahlungen — netto auf Ihr IBAN', en: 'Payouts — net to your IBAN' },
];

const Chevron = ({ dir }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points={dir === 'left' ? '15 18 9 12 15 6' : '9 18 15 12 9 6'} />
  </svg>
);

export default function DashboardCarousel() {
  const { locale } = useI18n();
  const reduce = useReducedMotion();
  const lang = locale === 'en' ? 'en' : 'de';
  const n = SHOTS.length;
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const go = useCallback((d) => setI((p) => (p + d + n) % n), [n]);

  // Auto-advance, paused on hover/focus and disabled for reduced-motion users.
  useEffect(() => {
    if (reduce || paused) return;
    const t = setInterval(() => setI((p) => (p + 1) % n), 5000);
    return () => clearInterval(t);
  }, [reduce, paused, n]);

  return (
    <div
      className="mt-14"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* browser window chrome */}
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-graphite/70 bg-ink shadow-[0_50px_120px_-60px_rgba(0,0,0,0.9)]">
        <div className="flex items-center gap-3 border-b border-graphite/70 px-4 py-3">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-graphite" />
            <span className="h-2.5 w-2.5 rounded-full bg-graphite" />
            <span className="h-2.5 w-2.5 rounded-full bg-graphite" />
          </span>
          <span className="mx-auto rounded-full bg-void px-3 py-1 text-[0.7rem] tracking-wide text-ash">app.airluxo.ch/partner</span>
        </div>

        {/* viewport */}
        <div className="relative overflow-hidden">
          <div
            className="flex"
            style={{
              transform: `translateX(-${i * 100}%)`,
              transition: reduce ? 'none' : 'transform 0.7s cubic-bezier(0.2,0.7,0.2,1)',
            }}
          >
            {SHOTS.map((s, idx) => (
              <img
                key={s.src}
                src={s.src}
                alt={s[lang]}
                loading={idx === 0 ? 'eager' : 'lazy'}
                draggable="false"
                className="block w-full shrink-0 select-none"
              />
            ))}
          </div>

          <button
            type="button"
            aria-label={lang === 'en' ? 'Previous screen' : 'Vorheriger Screen'}
            onClick={() => go(-1)}
            className="ring-lux absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-graphite/70 bg-void/70 text-paper backdrop-blur transition-colors hover:border-gold"
          >
            <Chevron dir="left" />
          </button>
          <button
            type="button"
            aria-label={lang === 'en' ? 'Next screen' : 'Nächster Screen'}
            onClick={() => go(1)}
            className="ring-lux absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-graphite/70 bg-void/70 text-paper backdrop-blur transition-colors hover:border-gold"
          >
            <Chevron dir="right" />
          </button>
        </div>
      </div>

      {/* caption + progress dots */}
      <div className="mt-5 flex items-center justify-between gap-4">
        <p className="text-sm text-ash">{SHOTS[i][lang]}</p>
        <div className="flex shrink-0 gap-2">
          {SHOTS.map((s, idx) => (
            <button
              key={s.src}
              type="button"
              aria-label={`${lang === 'en' ? 'Go to screen' : 'Zu Screen'} ${idx + 1}`}
              aria-current={idx === i}
              onClick={() => setI(idx)}
              className={`h-2 rounded-full transition-all ${idx === i ? 'w-6 bg-gold' : 'w-2 bg-graphite hover:bg-ash'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
