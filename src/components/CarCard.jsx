import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import CarImage from './CarImage.jsx';
import { Icon } from './Icons.jsx';
import { chf } from '../lib/format.js';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function CarCard({ car, onOpen, isFav, onToggleFav }) {
  const vidRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const hasVideo = !!car.video;

  // Desktop hover: lazily load + play the clip; unload on leave so the grid
  // never downloads video until a card is actually hovered.
  const onEnter = () => {
    if (!hasVideo || prefersReducedMotion()) return;
    const v = vidRef.current;
    if (!v) return;
    if (!v.getAttribute('src')) v.setAttribute('src', car.video);
    setPlaying(true);
    v.play().catch(() => {});
  };
  const onLeave = () => {
    const v = vidRef.current;
    if (v) { v.pause(); v.removeAttribute('src'); v.load(); }
    setPlaying(false);
  };

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(car)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(car); } }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      variants={{
        hidden: { opacity: 0, y: 26 },
        show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
      }}
      className="group ring-lux cursor-pointer text-left rounded-[var(--radius-card)] bg-cloud border border-mist/80 overflow-hidden transition-shadow duration-500 hover:shadow-[0_30px_60px_-30px_rgba(11,11,12,0.35)]"
    >
      <div className="relative">
        <CarImage car={car} className="aspect-[4/3]" />
        {hasVideo && (
          <video
            ref={vidRef}
            muted
            loop
            playsInline
            preload="none"
            className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${playing ? 'opacity-100' : 'opacity-0'}`}
          />
        )}

        {/* top row badges */}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3.5">
          <span className="eyebrow rounded-full bg-cloud/92 px-3 py-1.5 text-ink backdrop-blur">
            {car.category}
          </span>
          <div className="flex items-center gap-2">
            {onToggleFav && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
                aria-label={isFav ? 'Remove from saved' : 'Save car'}
                aria-pressed={!!isFav}
                className="ring-lux grid h-8 w-8 place-items-center rounded-full bg-cloud/95 text-ink shadow-[0_2px_10px_rgba(11,11,12,0.18)] backdrop-blur transition-transform hover:scale-110"
              >
                <Heart filled={isFav} />
              </button>
            )}
            <span className="flex items-center gap-1 rounded-full bg-ink/85 px-2.5 py-1.5 text-[0.7rem] font-bold text-cloud backdrop-blur tnum">
              <Icon.Star className="text-gold-soft" width={12} height={12} />
              {car.rating != null ? car.rating.toFixed(2) : 'New'}
            </span>
          </div>
        </div>

        {/* hover reveal */}
        <div className="pointer-events-none absolute inset-x-3.5 bottom-3.5 flex translate-y-3 items-center gap-1.5 rounded-full bg-cloud/92 px-3.5 py-2 text-xs font-bold text-ink opacity-0 backdrop-blur transition-all duration-500 ease-[var(--ease-lux)] group-hover:translate-y-0 group-hover:opacity-100">
          View & book <Icon.ArrowUpRight width={14} height={14} className="text-gold" />
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-lg leading-tight">
              {car.make} <span className="text-stone">{car.model}</span>
            </h3>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-stone">
              <Icon.Pin width={14} height={14} /> {car.location}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-display text-lg tnum">{chf(car.pricePerDay)}</div>
            <div className="text-[0.7rem] uppercase tracking-wider text-stone">/ day</div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4 border-t border-mist pt-3.5 text-xs text-stone tnum">
          <span className="flex items-center gap-1.5"><Icon.Bolt width={14} height={14} className="text-ink/55" /> {car.power ?? '—'} hp</span>
          <span className="flex items-center gap-1.5"><Icon.Gauge width={14} height={14} className="text-ink/55" /> {car.accel != null ? `${car.accel}s` : '—'}</span>
          <span className="flex items-center gap-1.5"><Icon.Seat width={14} height={14} className="text-ink/55" /> {car.seats ?? '—'}</span>
        </div>
      </div>
    </motion.div>
  );
}

function Heart({ filled }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"
      fill={filled ? '#e0245e' : 'none'} stroke={filled ? '#e0245e' : 'currentColor'} strokeWidth="2">
      <path d="M12 21s-7.5-4.6-10-9.2C.5 8.3 2.2 5 5.5 5c2 0 3.4 1.1 4.5 2.6C11.1 6.1 12.5 5 14.5 5 17.8 5 19.5 8.3 22 11.8 19.5 16.4 12 21 12 21z" strokeLinejoin="round" />
    </svg>
  );
}
