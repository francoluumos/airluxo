import { useState } from 'react';

// Loads the photo; if it fails, falls back to a tinted gradient + monogram
// so the layout never breaks (and looks deliberate offline).
export default function CarImage({ car, className = '', rounded = '' }) {
  const [state, setState] = useState('loading'); // loading | ok | err

  return (
    <div className={`relative overflow-hidden bg-mist ${rounded} ${className}`}>
      {state !== 'err' && (
        <img
          src={car.image}
          alt={`${car.make} ${car.model}`}
          loading="lazy"
          onLoad={() => setState('ok')}
          onError={() => setState('err')}
          className={`h-full w-full object-cover transition-[transform,opacity] duration-700 ease-[var(--ease-lux)] ${
            state === 'ok' ? 'opacity-100' : 'opacity-0'
          } group-hover:scale-[1.06]`}
        />
      )}

      {state === 'loading' && <div className="absolute inset-0 shimmer" />}

      {state === 'err' && (
        <div
          className="absolute inset-0 flex items-end p-5"
          style={{
            background: `radial-gradient(120% 120% at 70% 0%, ${car.tint}, #0b0b0c 90%)`,
          }}
        >
          <div className="font-display text-cloud/90">
            <div className="text-[2.6rem] leading-none">{car.make[0]}{car.model[0]}</div>
            <div className="mt-1 text-xs tracking-[0.2em] uppercase text-cloud/55">
              {car.make}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
