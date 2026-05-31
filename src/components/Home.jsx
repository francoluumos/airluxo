import { useMemo, useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import Nav from './Nav.jsx';
import CarCard from './CarCard.jsx';
import CarImage from './CarImage.jsx';
import { Icon } from './Icons.jsx';
import { CARS, CATEGORIES, CITIES, STEPS, FEES } from '../lib/data.js';
import { fetchPublicListings, mapListing, fetchFleetPins } from '../lib/listings.js';
import { fetchFleetAvailability } from '../lib/bookings.js';
import { chf } from '../lib/format.js';
import { track } from '../lib/analytics.js';
import { openConsentSettings } from '../lib/consent.js';
import { searchSwissPlaces } from '../lib/geocode.js';
import FleetMap, { CITY_COORDS } from './FleetMap.jsx';

// Great-circle distance in km between two {lat,lng} points.
function distanceKm(a, b) {
  if (!a || !b) return Infinity;
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
// A car's coordinates: precise pick-up coords, else its city centroid, else null.
function carCoord(c) {
  if (typeof c.lat === 'number' && typeof c.lng === 'number') return { lat: c.lat, lng: c.lng };
  const cc = CITY_COORDS[c.location];
  return cc ? { lat: cc[0], lng: cc[1] } : null;
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const rise = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

export default function Home({ onOpenCar, onPartner }) {
  const [cat, setCat] = useState('All');
  const [q, setQ] = useState('');
  const [cars, setCars] = useState(null); // null = loading
  const [avail, setAvail] = useState({}); // listing_id -> [{ start, end }] busy ranges
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [date, setDate] = useState({ mode: 'any', start: '', end: '', flexKey: 'weekend' });
  const [showFilters, setShowFilters] = useState(false);
  const [heroCal, setHeroCal] = useState(false);
  const [fleetCal, setFleetCal] = useState(false);
  const [near, setNear] = useState(null); // { label, lat, lng } from the free-text "Where" search
  const hero = CARS[1]; // Huracán — fixed marketing visual

  useEffect(() => {
    let active = true;
    Promise.all([fetchPublicListings(), fetchFleetPins().catch(() => [])])
      .then(([rows, pins]) => {
        if (!active) return;
        const byId = Object.fromEntries((pins || []).map((p) => [p.listing_id, p]));
        setCars(rows.map(mapListing).map((c) => (byId[c.id] ? { ...c, lat: byId[c.id].lat, lng: byId[c.id].lng } : c)));
      })
      .catch(() => { if (active) setCars([]); });
    fetchFleetAvailability().then((m) => { if (active) setAvail(m); }).catch(() => {});
    return () => { active = false; };
  }, []);

  const setFilter = (k, v) => setFilters((p) => ({ ...p, [k]: v }));

  // option lists + bounds derived from the live fleet
  const opts = useMemo(() => {
    const list = cars ?? [];
    const uniq = (arr) => [...new Set(arr.filter(Boolean))];
    return {
      brands: uniq(list.map((c) => c.make)).sort(),
      colours: uniq(list.map((c) => c.exterior_color)).sort(),
      gearboxes: uniq(list.map((c) => c.gearbox)).sort(),
      fuels: uniq(list.map((c) => c.fuel)).sort(),
      seats: uniq(list.map((c) => c.seats)).filter((n) => n).sort((a, b) => a - b),
      cities: uniq(list.map((c) => c.location)).sort(),
      maxPower: Math.max(400, ...list.map((c) => c.power || 0)),
      priceCeil: Math.max(500, ...list.map((c) => c.pricePerDay || 0)),
    };
  }, [cars]);

  // effective date window for availability filtering
  const dateWindow = useMemo(() => {
    if (date.mode === 'exact' && date.start && date.end) return { start: date.start, end: date.end, strict: true };
    if (date.mode === 'flexible') return { ...flexWindow(date.flexKey), strict: false };
    return null;
  }, [date]);

  const activeCount =
    (filters.city !== 'All Switzerland' ? 1 : 0) +
    (filters.brand !== 'All' ? 1 : 0) +
    (filters.colour !== 'All' ? 1 : 0) +
    (filters.gearbox !== 'All' ? 1 : 0) +
    (filters.fuel !== 'All' ? 1 : 0) +
    (filters.seats !== 'All' ? 1 : 0) +
    (filters.minPower > 0 ? 1 : 0) +
    (filters.maxPrice > 0 && filters.maxPrice < opts.priceCeil ? 1 : 0) +
    (filters.crossBorder ? 1 : 0) +
    (filters.delivery ? 1 : 0);

  const fleet = useMemo(() => {
    const cap = !filters.maxPrice || filters.maxPrice >= opts.priceCeil ? Infinity : filters.maxPrice;
    const list = (cars ?? []).filter((c) => {
      if (!(cat === 'All' || c.category === cat)) return false;
      // exact-city filter only applies when no proximity ("near") search is active
      if (!near && !(filters.city === 'All Switzerland' || c.location === filters.city)) return false;
      if (!(filters.brand === 'All' || c.make === filters.brand)) return false;
      if (!(filters.colour === 'All' || c.exterior_color === filters.colour)) return false;
      if (!(filters.gearbox === 'All' || c.gearbox === filters.gearbox)) return false;
      if (!(filters.fuel === 'All' || c.fuel === filters.fuel)) return false;
      if (!(filters.seats === 'All' || String(c.seats) === filters.seats)) return false;
      if ((c.power || 0) < filters.minPower) return false;
      if (c.pricePerDay > cap) return false;
      if (filters.crossBorder && !c.cross_border_allowed) return false;
      if (filters.delivery && !c.delivery_available) return false;
      if (q && !`${c.make} ${c.model} ${c.location} ${c.exterior_color || ''}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (dateWindow) {
        const busy = avail[c.id] || [];
        if (dateWindow.strict) {
          // exact range: must be free for the entire stay
          if (busy.some((b) => dateWindow.start <= b.end && b.start <= dateWindow.end)) return false;
        } else {
          // flexible window: must have at least one free day in the period
          if (coversAll(busy, dateWindow.start, dateWindow.end)) return false;
        }
      }
      return true;
    });
    // proximity: when a place is searched, sort nearest-first (city centroid fallback)
    if (near) {
      return list
        .map((c) => ({ ...c, _dist: distanceKm(near, carCoord(c)) }))
        .sort((a, b) => a._dist - b._dist);
    }
    return list;
  }, [cars, cat, q, filters, dateWindow, avail, opts.priceCeil, near]);

  const resetFilters = () => { setFilters(DEFAULT_FILTERS); setDate({ mode: 'any', start: '', end: '', flexKey: 'weekend' }); setNear(null); };

  // "Where" free-text search selected a place → proximity-sort + log the demand signal
  const handleNear = (place) => {
    setNear(place);
    if (place) {
      setFilter('city', 'All Switzerland');
      track('search_performed', { city: place.label, lat: place.lat, lng: place.lng, source: 'hero' });
    }
  };

  // analytics: a car opened from the marketplace
  const openCar = (car) => {
    track('car_viewed', { listing_id: car.id, make: car.make, model: car.model, city: car.location, price_per_day: car.pricePerDay, source: 'marketplace' });
    onOpenCar(car);
  };

  return (
    <div className="min-h-screen">
      <Nav onHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })} onPartner={onPartner} />

      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-[1240px] items-center gap-10 px-5 pb-10 pt-14 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pb-16 lg:pt-20">
          <motion.div variants={stagger} initial="hidden" animate="show">
            <motion.div variants={rise} className="eyebrow flex items-center gap-2.5 text-stone">
              <span className="h-1.5 w-1.5 rounded-full bg-go" />
              Switzerland · 8 cantons · one marketplace
            </motion.div>

            <motion.h1
              variants={rise}
              className="font-display mt-5 text-[clamp(2.9rem,6.4vw,5.2rem)] font-semibold leading-[0.94]"
            >
              Drive the
              <br />
              <span className="italic text-gold">extraordinary.</span>
            </motion.h1>

            <motion.p variants={rise} className="mt-6 max-w-md text-[1.05rem] leading-relaxed text-stone">
              The marketplace where Switzerland's finest luxury-car rental companies meet
              drivers who want something rarer than a sedan. Insured, vetted, delivered.
            </motion.p>

            {/* search panel */}
            <motion.div
              variants={rise}
              className="mt-9 rounded-[20px] border border-mist bg-cloud p-2 shadow-[0_30px_70px_-40px_rgba(11,11,12,0.45)]"
            >
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-[1.15fr_1.15fr_auto]">
                <div className="relative flex items-center gap-3 rounded-[14px] px-4 py-2.5">
                  <span className="text-stone"><Icon.Pin /></span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[0.65rem] uppercase tracking-[0.15em] text-stone">Where</div>
                    <PlaceSearch value={near} onSelect={handleNear} />
                  </div>
                </div>
                <div className="relative sm:border-l sm:border-mist">
                  <button
                    type="button"
                    onClick={() => setHeroCal((s) => !s)}
                    className="ring-lux flex w-full items-center gap-3 rounded-[14px] px-4 py-2.5 text-left transition-colors hover:bg-paper"
                  >
                    <span className="text-stone"><Icon.Calendar /></span>
                    <span className="min-w-0">
                      <span className="block text-[0.65rem] uppercase tracking-[0.15em] text-stone">When</span>
                      <span className="block truncate text-sm font-semibold">{dateLabel(date)}</span>
                    </span>
                  </button>
                  {heroCal && <DatePopover value={date} onChange={setDate} onClose={() => setHeroCal(false)} />}
                </div>
                <a
                  href="#fleet"
                  onClick={() => track('search_performed', { city: near?.label || filters.city, date_mode: date.mode, results_count: fleet.length, source: 'hero_button' })}
                  className="ring-lux mt-1 flex items-center justify-center gap-2 rounded-[14px] bg-ink px-6 py-3.5 text-sm font-bold text-cloud transition-colors hover:bg-void sm:mt-0"
                >
                  <Icon.Search width={16} height={16} /> Search
                </a>
              </div>
            </motion.div>

            <motion.div variants={rise} className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-3">
              <Stat k="240+" v="cars listed" />
              <Stat k="36" v="rental companies" />
              <Stat k="4.96★" v="avg. trip rating" />
            </motion.div>
          </motion.div>

          {/* hero visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
            className="relative"
          >
            <div className="group relative aspect-[4/5] overflow-hidden rounded-[28px] border border-mist sm:aspect-[5/5]">
              <CarImage car={hero} className="h-full w-full" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5 text-cloud">
                <div className="eyebrow text-cloud/70">Featured in Lugano</div>
                <div className="font-display text-2xl">{hero.make} {hero.model}</div>
              </div>
            </div>

            {/* floating chips */}
            <motion.div
              animate={{ y: [0, -9, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -left-3 top-7 rounded-2xl border border-mist bg-cloud/95 px-4 py-3 shadow-xl backdrop-blur sm:-left-7"
            >
              <div className="text-[0.7rem] uppercase tracking-wider text-stone">from</div>
              <div className="font-display text-xl tnum">{chf(hero.pricePerDay)}<span className="text-sm text-stone">/day</span></div>
            </motion.div>
            <motion.div
              animate={{ y: [0, 9, 0] }}
              transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -right-3 bottom-16 flex items-center gap-2.5 rounded-2xl border border-mist bg-cloud/95 px-4 py-3 shadow-xl backdrop-blur sm:-right-6"
            >
              <Icon.Shield className="text-go" width={20} height={20} />
              <div className="text-xs font-semibold leading-tight">Fully insured<br /><span className="text-stone font-normal">CHF 0 excess option</span></div>
            </motion.div>
          </motion.div>
        </div>

        {/* brand marquee */}
        <div className="relative border-y border-mist py-4">
          <div className="flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
            <div className="marquee-track flex shrink-0 items-center gap-12 pr-12">
              {[...MARQUEE, ...MARQUEE].map((b, i) => (
                <span key={i} className="font-display whitespace-nowrap text-lg text-stone/70">{b}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ FLEET ============ */}
      <section id="fleet" className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 lg:py-24">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="eyebrow text-gold">The collection</div>
            <h2 className="font-display mt-2 text-[clamp(2rem,4vw,3rem)] leading-[1.02]">
              Cars worth the detour.
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`ring-lux rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  cat === c
                    ? 'border-ink bg-ink text-cloud'
                    : 'border-mist bg-cloud text-stone hover:border-stone hover:text-ink'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* search row */}
        <div className="mt-7 flex items-center gap-3 rounded-full border border-mist bg-cloud px-4 py-2.5">
          <Icon.Search width={17} height={17} className="text-stone" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search make, model, colour or city…"
            className="ring-lux w-full bg-transparent text-sm outline-none placeholder:text-stone"
          />
          <span className="hidden shrink-0 text-xs text-stone sm:block tnum">{cars === null ? '…' : `${fleet.length} available`}</span>
        </div>

        {/* filter toolbar */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setFleetCal((s) => !s)}
              className={`ring-lux flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${date.mode !== 'any' ? 'border-ink bg-ink text-cloud' : 'border-mist bg-cloud text-ink hover:border-ink'}`}
            >
              <Icon.Calendar width={15} height={15} /> {dateLabel(date)}
            </button>
            {fleetCal && <DatePopover value={date} onChange={setDate} onClose={() => setFleetCal(false)} />}
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((s) => !s)}
            className={`ring-lux flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${activeCount ? 'border-ink bg-ink text-cloud' : 'border-mist bg-cloud text-ink hover:border-ink'}`}
          >
            <Icon.Grid width={15} height={15} /> Filters{activeCount ? ` · ${activeCount}` : ''}
          </button>
          {near && (
            <button type="button" onClick={() => setNear(null)} className="ring-lux flex items-center gap-1.5 rounded-full border border-gold bg-gold/10 px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-gold/20">
              <Icon.Pin width={14} height={14} className="text-gold" /> Near {near.label} <Icon.X width={13} height={13} className="text-stone" />
            </button>
          )}
          {(activeCount > 0 || date.mode !== 'any' || near) && (
            <button type="button" onClick={resetFilters} className="ring-lux rounded-full px-3 py-2 text-sm font-semibold text-stone transition-colors hover:text-ink">
              Clear all
            </button>
          )}
          <span className="ml-auto shrink-0 text-xs text-stone tnum">{cars === null ? '' : `${fleet.length} ${fleet.length === 1 ? 'car' : 'cars'}`}</span>
        </div>

        {showFilters && <FilterPanel filters={filters} setFilter={setFilter} opts={opts} onCity={(v) => { setFilter('city', v); if (v !== 'All Switzerland') setNear(null); }} />}

        {cars === null ? (
          <div className="mt-9 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="aspect-[4/3] rounded-[var(--radius-card)] border border-mist shimmer" />
            ))}
          </div>
        ) : (
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="mt-9 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {fleet.map((car) => (
              <CarCard key={car.id} car={car} onOpen={openCar} />
            ))}
          </motion.div>
        )}

        {cars !== null && fleet.length === 0 && (
          <div className="mt-12 rounded-2xl border border-dashed border-mist py-16 text-center text-stone">
            No cars match that filter — try widening your search.
          </div>
        )}
      </section>

      {/* ============ MAP ============ */}
      <section id="map" className="mx-auto max-w-[1240px] px-5 pb-16 sm:px-8 lg:pb-24">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="eyebrow text-gold">Where to find them</div>
            <h2 className="font-display mt-2 text-[clamp(1.8rem,3.4vw,2.6rem)] leading-[1.04]">
              The fleet across Switzerland.
            </h2>
          </div>
          <p className="max-w-xs text-sm text-stone sm:text-right">
            Tap a pin to filter the collection by city. Cars are shown at their pick-up location.
          </p>
        </div>
        <div className="mt-7">
          <FleetMap
            cars={cars ?? []}
            onCity={(c) => {
              track('map_pin_clicked', { city: c });
              setFilter('city', c);
              document.getElementById('fleet')?.scrollIntoView({ behavior: 'smooth' });
            }}
          />
        </div>
      </section>

      {/* ============ HOW IT WORKS (dark) ============ */}
      <section id="how" className="relative bg-void text-cloud spotlight">
        <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 lg:py-28">
          <div className="max-w-2xl">
            <div className="eyebrow text-gold-soft">For rental companies</div>
            <h2 className="font-display mt-3 text-[clamp(2.2rem,4.6vw,3.6rem)] leading-[1.0]">
              Your fleet, fully booked.
            </h2>
            <p className="mt-5 max-w-lg text-ash">
              AIRLUXO turns idle inventory into income. You set the price and the rules —
              we handle the demand, the vetting and the payments.
            </p>
          </div>

          <div className="mt-14 grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-graphite bg-graphite md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="bg-coal p-8">
                <div className="font-display text-5xl text-gold-soft/80">{s.n}</div>
                <h3 className="font-display mt-6 text-xl">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ash">{s.body}</p>
              </div>
            ))}
          </div>

          {/* fee transparency */}
          <div className="mt-10 flex flex-col items-start justify-between gap-6 rounded-[var(--radius-card)] border border-graphite bg-gradient-to-br from-coal to-void p-8 md:flex-row md:items-center">
            <div className="flex items-center gap-5">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-gold/30 bg-gold/10 text-gold-soft">
                <Icon.Wallet width={24} height={24} />
              </div>
              <div>
                <div className="font-display text-xl">Transparent commission</div>
                <p className="mt-1 max-w-md text-sm text-ash">
                  No listing fees. No subscriptions. AIRLUXO earns a flat{' '}
                  <span className="font-semibold text-gold-soft">{Math.round(FEES.hostCommission * 100)}%</span>{' '}
                  host commission, paid only when a car is booked.
                </p>
              </div>
            </div>
            <button
              onClick={onPartner}
              className="ring-lux group flex shrink-0 items-center gap-2 rounded-full bg-cloud px-6 py-3.5 text-sm font-bold text-ink transition-colors hover:bg-gold-soft"
            >
              Open partner portal
              <Icon.Arrow width={16} height={16} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </section>

      {/* ============ PARTNER CTA ============ */}
      <section id="partner" className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="eyebrow text-gold">Become a partner</div>
            <h2 className="font-display mt-3 text-[clamp(2.2rem,4.6vw,3.6rem)] leading-[1.0]">
              List a car by Friday.<br />Get paid by Monday.
            </h2>
            <p className="mt-5 max-w-md text-stone">
              Join 36 Swiss rental companies already earning on AIRLUXO. Onboarding takes
              under ten minutes and your first listing is reviewed within a day.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={onPartner} className="ring-lux rounded-full bg-ink px-7 py-3.5 text-sm font-bold text-cloud transition-colors hover:bg-void">
                Start listing
              </button>
              <a href="#fleet" className="ring-lux rounded-full border border-mist bg-cloud px-7 py-3.5 text-sm font-bold text-ink transition-colors hover:border-ink">
                Browse the fleet
              </a>
            </div>
            <ul className="mt-9 grid gap-3 sm:grid-cols-2">
              {PERKS.map((p) => (
                <li key={p} className="flex items-center gap-2.5 text-sm text-ink">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-go/12 text-go"><Icon.Check width={13} height={13} /></span>
                  {p}
                </li>
              ))}
            </ul>
          </div>

          {/* mini earnings card */}
          <div className="relative">
            <div className="rounded-[var(--radius-card)] border border-mist bg-cloud p-7 shadow-[0_40px_80px_-50px_rgba(11,11,12,0.5)]">
              <div className="flex items-center justify-between">
                <span className="eyebrow text-stone">Estimated monthly net</span>
                <span className="rounded-full bg-go/12 px-2.5 py-1 text-xs font-bold text-go">+ live</span>
              </div>
              <div className="font-display mt-3 text-[3rem] leading-none tnum">{chf(38900)}</div>
              <div className="mt-1 text-sm text-stone">for a 4-car premium fleet at 70% utilisation</div>

              {/* sparkline */}
              <svg viewBox="0 0 320 90" className="mt-6 w-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#b89150" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#b89150" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0,70 L55,60 L110,64 L165,42 L220,30 L275,18 L320,10 L320,90 L0,90 Z" fill="url(#g)" />
                <path d="M0,70 L55,60 L110,64 L165,42 L220,30 L275,18 L320,10" fill="none" stroke="#b89150" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>

              <div className="mt-5 flex items-center justify-between border-t border-mist pt-4 text-sm">
                <span className="text-stone">AIRLUXO commission</span>
                <span className="font-semibold tnum">{Math.round(FEES.hostCommission * 100)}% · {chf(1170)}</span>
              </div>
            </div>
            <div className="absolute -right-3 -top-3 hidden rotate-3 rounded-2xl bg-ink px-4 py-2.5 text-xs font-bold text-cloud shadow-xl sm:block">
              Paid out in 24h
            </div>
          </div>
        </div>
      </section>

      <Footer onPartner={onPartner} />
    </div>
  );
}

const MARQUEE = ['Porsche', 'Ferrari', 'Lamborghini', 'Bentley', 'McLaren', 'Aston Martin', 'Range Rover', 'Mercedes-AMG', 'Maserati', 'Audi Sport'];
const PERKS = ['Set your own pricing', 'CHF 0-excess insurance', '24h payouts', 'Verified drivers only'];

function Field({ icon, label, children, border }) {
  return (
    <div className={`flex items-center gap-3 rounded-[14px] px-4 py-2.5 ${border ? 'sm:border-l sm:border-mist' : ''}`}>
      <span className="text-stone">{icon}</span>
      <div className="min-w-0">
        <div className="text-[0.65rem] uppercase tracking-[0.15em] text-stone">{label}</div>
        {children}
      </div>
    </div>
  );
}

function Stat({ k, v }) {
  return (
    <div>
      <div className="font-display text-2xl tnum">{k}</div>
      <div className="text-xs uppercase tracking-wider text-stone">{v}</div>
    </div>
  );
}

function Footer({ onPartner }) {
  return (
    <footer className="border-t border-mist bg-paper">
      <div className="mx-auto max-w-[1240px] px-5 py-14 sm:px-8">
        <div className="flex flex-col justify-between gap-10 md:flex-row">
          <div className="max-w-xs">
            <div className="wordmark text-2xl">AIR<span className="text-gold">LUXO</span></div>
            <p className="mt-3 text-sm text-stone">
              Switzerland's marketplace for extraordinary cars. Made in Geneva.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <FooterCol title="Drive" links={['Explore fleet', 'Cities', 'Gift drives', 'Insurance']} />
            <FooterCol title="Host" links={['Become a partner', 'Partner login', 'Pricing', 'Resources']} onClick={onPartner} />
            <FooterCol title="Company" links={['About', 'Careers', 'Contact', 'Legal']} />
          </div>
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-mist pt-6 text-xs text-stone sm:flex-row sm:items-center">
          <span>© 2026 AIRLUXO SA · CHE-123.456.789</span>
          <span className="flex items-center gap-1.5">
            <a href="/?privacy" target="_blank" rel="noreferrer" className="ring-lux transition-colors hover:text-ink">Privacy</a> ·
            <span>Terms</span> ·
            <button type="button" onClick={openConsentSettings} className="ring-lux transition-colors hover:text-ink">Cookies</button>
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links, onClick }) {
  return (
    <div>
      <div className="eyebrow text-ink">{title}</div>
      <ul className="mt-4 space-y-2.5 text-sm text-stone">
        {links.map((l) => (
          <li key={l}>
            <button onClick={onClick} className="ring-lux text-left transition-colors hover:text-ink">{l}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ============ filters + date browsing ============ */

const DEFAULT_FILTERS = {
  city: 'All Switzerland', brand: 'All', colour: 'All', gearbox: 'All',
  fuel: 'All', seats: 'All', minPower: 0, maxPrice: 0, crossBorder: false, delivery: false,
};
const FLEX_PRESETS = [
  { key: 'weekend', label: 'This weekend' },
  { key: 'week', label: 'Next 7 days' },
  { key: 'month', label: 'Next 30 days' },
  { key: 'season', label: 'Next 90 days' },
];

const fmtISO = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
function fmtShort(iso) {
  if (!iso) return '';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
function flexWindow(key) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  let end = new Date(today);
  if (key === 'weekend') {
    const toSat = (6 - today.getDay() + 7) % 7;
    start.setDate(today.getDate() + toSat);
    end = new Date(start); end.setDate(start.getDate() + 1);
  } else if (key === 'week') end.setDate(today.getDate() + 7);
  else if (key === 'month') end.setDate(today.getDate() + 30);
  else if (key === 'season') end.setDate(today.getDate() + 90);
  return { start: fmtISO(start), end: fmtISO(end) };
}
// true when every day in [start,end] is inside some busy range (car has no free day)
function coversAll(busy, startISO, endISO) {
  if (!busy.length) return false;
  const end = new Date(`${endISO}T00:00:00`);
  for (let d = new Date(`${startISO}T00:00:00`); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = fmtISO(d);
    if (!busy.some((b) => iso >= b.start && iso <= b.end)) return false;
  }
  return true;
}
function dateLabel(date) {
  if (date.mode === 'exact' && date.start) return date.end && date.end !== date.start ? `${fmtShort(date.start)} – ${fmtShort(date.end)}` : fmtShort(date.start);
  if (date.mode === 'flexible') return FLEX_PRESETS.find((p) => p.key === date.flexKey)?.label || 'Flexible';
  return 'Any dates';
}

function DatePopover({ value, onChange, onClose }) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute left-0 top-full z-50 mt-2 w-[300px] max-w-[calc(100vw-2.5rem)] rounded-2xl border border-mist bg-cloud p-3 text-ink shadow-2xl">
        <div className="mb-3 grid grid-cols-3 gap-1 rounded-full bg-paper p-1">
          {[['any', 'Any'], ['exact', 'Exact'], ['flexible', 'Flexible']].map(([m, l]) => (
            <button key={m} type="button" onClick={() => onChange({ ...value, mode: m })}
              className={`ring-lux rounded-full py-1.5 text-xs font-semibold transition-colors ${value.mode === m ? 'bg-ink text-cloud' : 'text-stone hover:text-ink'}`}>{l}</button>
          ))}
        </div>

        {value.mode === 'any' && (
          <p className="px-1 pb-2 pt-1 text-xs leading-relaxed text-stone">
            Browsing the whole collection. Pick <span className="font-semibold text-ink">Exact</span> dates for a specific trip, or <span className="font-semibold text-ink">Flexible</span> to see what's free across a wider window.
          </p>
        )}

        {value.mode === 'exact' && (
          <>
            <RangeCalendar start={value.start} end={value.end} onPick={(s, e) => onChange({ ...value, mode: 'exact', start: s, end: e })} />
            <p className="mt-2 px-1 text-[0.7rem] text-stone">{value.start ? (value.end ? 'Shows cars free for the whole stay.' : 'Now pick your return date.') : 'Pick your pick-up date.'}</p>
          </>
        )}

        {value.mode === 'flexible' && (
          <div className="space-y-1">
            {FLEX_PRESETS.map((p) => (
              <button key={p.key} type="button" onClick={() => onChange({ ...value, mode: 'flexible', flexKey: p.key })}
                className={`ring-lux flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-colors ${value.flexKey === p.key ? 'border-ink bg-ink text-cloud' : 'border-mist bg-paper text-ink hover:border-ink'}`}>
                {p.label}
                {value.flexKey === p.key && <Icon.Check width={14} height={14} />}
              </button>
            ))}
            <p className="px-1 pt-1 text-[0.7rem] text-stone">Shows cars with availability somewhere in the window.</p>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between border-t border-mist pt-2.5">
          <button type="button" onClick={() => onChange({ mode: 'any', start: '', end: '', flexKey: value.flexKey })} className="ring-lux text-xs font-semibold text-stone transition-colors hover:text-ink">Reset</button>
          <button type="button" onClick={onClose} className="ring-lux rounded-full bg-ink px-4 py-1.5 text-xs font-bold text-cloud transition-colors hover:bg-void">Done</button>
        </div>
      </div>
    </>
  );
}

function RangeCalendar({ start, end, onPick }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [cursor, setCursor] = useState(() => {
    const d = start ? new Date(`${start}T00:00:00`) : new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const first = new Date(cursor.y, cursor.m, 1);
  const startDow = (first.getDay() + 6) % 7; // Monday-first
  const days = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells = [...Array(startDow).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const iso = (d) => fmtISO(new Date(cursor.y, cursor.m, d));
  const move = (delta) => setCursor((c) => { const d = new Date(c.y, c.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  const click = (d) => {
    const s = iso(d);
    if (!start || (start && end)) { onPick(s, ''); return; } // start a fresh range
    if (s < start) { onPick(s, ''); return; }                // moved start earlier
    onPick(start, s);                                        // set end
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => move(-1)} className="ring-lux grid h-7 w-7 place-items-center rounded-full text-lg leading-none text-stone transition-colors hover:bg-paper hover:text-ink">‹</button>
        <span className="text-sm font-semibold">{first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</span>
        <button type="button" onClick={() => move(1)} className="ring-lux grid h-7 w-7 place-items-center rounded-full text-lg leading-none text-stone transition-colors hover:bg-paper hover:text-ink">›</button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[0.6rem] uppercase tracking-wider text-stone">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i} className="py-1">{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const s = iso(d);
          const past = new Date(cursor.y, cursor.m, d) < today;
          const edge = s === start || s === end;
          const within = start && end && s > start && s < end;
          return (
            <button key={i} type="button" disabled={past} onClick={() => click(d)}
              className={`ring-lux h-8 rounded-lg text-xs font-medium transition-colors ${
                past ? 'cursor-not-allowed text-stone/35' : edge ? 'bg-ink text-cloud' : within ? 'bg-gold/15 text-ink' : 'text-ink hover:bg-paper'
              }`}>
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Free-text Swiss place search (geo.admin.ch) for the hero "Where" field.
function PlaceSearch({ value, onSelect }) {
  const [q, setQ] = useState(value?.label || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const tRef = useRef(null);
  const skip = useRef(false);

  useEffect(() => { setQ(value?.label || ''); }, [value]);

  useEffect(() => {
    if (skip.current) { skip.current = false; return; }
    if (q.trim().length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    clearTimeout(tRef.current);
    tRef.current = setTimeout(async () => {
      setResults(await searchSwissPlaces(q));
      setOpen(true);
      setLoading(false);
    }, 250);
    return () => clearTimeout(tRef.current);
  }, [q]);

  const choose = (p) => { skip.current = true; onSelect(p); setQ(p.label); setResults([]); setOpen(false); };
  const clear = () => { skip.current = true; onSelect(null); setQ(''); setResults([]); setOpen(false); };

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder="All Switzerland"
          autoComplete="off"
          className="w-full bg-transparent text-sm font-semibold text-ink outline-none placeholder:font-semibold placeholder:text-ink"
        />
        {loading && <span className="inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-mist border-t-ink" />}
        {q && !loading && <button type="button" onClick={clear} className="ring-lux shrink-0 text-stone transition-colors hover:text-ink"><Icon.X width={14} height={14} /></button>}
      </div>
      {open && results.length > 0 && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <ul className="absolute left-0 top-full z-50 mt-2 max-h-64 w-[260px] overflow-auto rounded-2xl border border-mist bg-cloud py-1 shadow-2xl">
            {results.map((r, i) => (
              <li key={i}>
                <button type="button" onClick={() => choose(r)} className="ring-lux flex w-full items-center gap-2 px-3.5 py-2 text-left text-sm transition-colors hover:bg-paper">
                  <Icon.Pin width={13} height={13} className="text-gold" /> {r.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function FilterPanel({ filters, setFilter, opts, onCity }) {
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      className="mt-3 rounded-[var(--radius-card)] border border-mist bg-cloud p-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Picker label="Pick-up location" value={filters.city} onChange={onCity || ((v) => setFilter('city', v))} options={['All Switzerland', ...CITIES]} />
        <Picker label="Brand" value={filters.brand} onChange={(v) => setFilter('brand', v)} options={['All', ...opts.brands]} />
        <Picker label="Colour" value={filters.colour} onChange={(v) => setFilter('colour', v)} options={['All', ...opts.colours]} />
        <Picker label="Transmission" value={filters.gearbox} onChange={(v) => setFilter('gearbox', v)} options={['All', ...opts.gearboxes]} />
        <Picker label="Fuel" value={filters.fuel} onChange={(v) => setFilter('fuel', v)} options={['All', ...opts.fuels]} />
        <Picker label="Seats" value={filters.seats} onChange={(v) => setFilter('seats', v)} options={['All', ...opts.seats.map(String)]} />
        <Slider label="Min. power" value={filters.minPower} max={opts.maxPower} step={20} onChange={(v) => setFilter('minPower', v)} fmt={(v) => (v ? `${v}+ hp` : 'Any')} />
        <Slider label="Max. price / day" value={filters.maxPrice || opts.priceCeil} max={opts.priceCeil} step={50} onChange={(v) => setFilter('maxPrice', v)} fmt={(v) => (v >= opts.priceCeil ? 'Any' : chf(v))} />
        <div className="flex flex-col justify-end gap-2">
          <Toggle label="Cross-border OK" checked={filters.crossBorder} onChange={(v) => setFilter('crossBorder', v)} />
          <Toggle label="Delivery available" checked={filters.delivery} onChange={(v) => setFilter('delivery', v)} />
        </div>
      </div>
    </motion.div>
  );
}

function Picker({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-wider text-stone">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="ring-lux w-full rounded-xl border border-mist bg-paper px-3 py-2.5 text-sm font-medium outline-none transition-colors focus:border-ink">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function Slider({ label, value, max, step, onChange, fmt }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-[0.65rem] font-semibold uppercase tracking-wider text-stone">
        <span>{label}</span><span className="text-ink tnum">{fmt(value)}</span>
      </span>
      <input type="range" min={0} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="ring-lux mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-mist accent-gold" />
    </label>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-mist bg-paper px-3.5 py-2.5">
      <span className="text-sm font-medium">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="ring-lux h-4 w-4 accent-ink" />
    </label>
  );
}
