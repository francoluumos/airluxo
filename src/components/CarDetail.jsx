import { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import { motion } from 'motion/react';
import CarImage from './CarImage.jsx';
import { Icon } from './Icons.jsx';
import { FEES } from '../lib/data.js';
import { chf } from '../lib/format.js';
import { createBooking, fetchAvailability } from '../lib/bookings.js';
import { fetchListingLogistics } from '../lib/listings.js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripe, createPaymentIntent } from '../lib/stripe.js';
import { verifyLicence, createLicenceSession, getLicenceSession } from '../lib/licence.js';
import { track } from '../lib/analytics.js';
import { useAuth } from '../lib/auth.jsx';
import { supabase } from '../lib/supabase.js';
import { validatePromo, promoReasonText } from '../lib/promo.js';
import { subscribeNewsletter, mySubscription } from '../lib/newsletter.js';
import { POINTS_PER_CHF_REDEEMED } from '../lib/loyalty.js';

export default function CarDetail({ car, onClose }) {
  // Null-safe: the white-label embed renders CarDetail outside AuthProvider, and
  // there we intentionally keep anonymous guest checkout (no login gate).
  const auth = useAuth();
  const user = auth?.user ?? null;
  const customer = auth?.customer ?? null;
  const signInWithGoogle = auth?.signInWithGoogle ?? null;
  const sendEmailLink = auth?.sendEmailLink ?? null;
  const rateOptions = [
    { id: 'day', label: 'Per day', unit: 'day', price: car.pricePerDay },
    ...(car.rate_tiers || []).map((t, i) => ({ id: `t${i}`, label: t.label, unit: t.label, price: t.price })),
  ];
  const [rateId, setRateId] = useState('day');
  const [pickupDate, setPickupDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [pickupTime, setPickupTime] = useState('10:00');
  const [returnTime, setReturnTime] = useState('10:00');
  const [busyRanges, setBusyRanges] = useState([]);
  const [showCal, setShowCal] = useState(false);
  const [crossBorder, setCrossBorder] = useState(false);
  const [delivery, setDelivery] = useState(false);
  const [deliveryAddr, setDeliveryAddr] = useState('');
  const [protection, setProtection] = useState(false);
  const [usePoints, setUsePoints] = useState(false);
  const [booked, setBooked] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle | details | licence | payment
  const [guest, setGuest] = useState({ email: '', phone: '' });
  // Newsletter opt-in. Unchecked by default — affirmative consent (revDSG/GDPR-safe).
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [licence, setLicence] = useState({ first_name: '', last_name: '', birth_date: '', valid_from: '', categories: '', number: '' });
  const [verifying, setVerifying] = useState(false);
  const [licenceScanned, setLicenceScanned] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const licenceRef = useRef(null);
  const pollRef = useRef(false);
  const isDesktop = typeof window !== 'undefined' && window.matchMedia
    && window.matchMedia('(pointer: fine)').matches && !window.matchMedia('(pointer: coarse)').matches;
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  const [serverBreakdown, setServerBreakdown] = useState(null);
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState(null); // applied code: { code, label, discount }
  const [promoErr, setPromoErr] = useState('');
  const [promoBusy, setPromoBusy] = useState(false);
  const [logistics, setLogistics] = useState(null);

  // Prefill the booking from the signed-in customer's profile + licence on file.
  useEffect(() => {
    if (!customer) return;
    setGuest((g) => ({ email: g.email || customer.email || '', phone: g.phone || customer.phone || '' }));
    // Prefill the opt-in if this customer is already subscribed (SSOT lookup).
    if (customer.email) mySubscription(customer.email).then((s) => { if (s?.subscribed) setNewsletterOptIn(true); });
    const l = customer.licence;
    if (customer.licence_verified && l) {
      setLicence({
        first_name: l.first_name || '', last_name: l.last_name || '',
        birth_date: l.birth_date || '', valid_from: l.valid_from || '',
        categories: Array.isArray(l.categories) ? l.categories.join(', ') : '', number: l.number || '',
      });
      setLicenceScanned(true);
    }
  }, [customer]);

  // Opening hours for a given ISO date (keyed mon..sun). null = unknown (no constraint).
  const DOW = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const hoursFor = (iso) => {
    if (!iso || !logistics?.opening_hours) return null;
    const d = logistics.opening_hours[DOW[new Date(`${iso}T00:00:00`).getDay()]];
    return d || null;
  };
  const afterHoursOk = !!logistics?.allow_after_hours;
  // Status of a chosen time vs that day's hours: 'ok' | 'closed' | 'outside' | null
  const timeStatus = (iso, time) => {
    const h = hoursFor(iso);
    if (!h) return null;
    if (h.closed) return afterHoursOk ? 'outside' : 'closed';
    if (time && h.open && h.close && (time < h.open || time > h.close)) {
      return afterHoursOk ? 'outside' : 'closed';
    }
    return 'ok';
  };
  const pickupLabel = logistics?.pickup_address
    ? [logistics.pickup_label, logistics.pickup_address].filter(Boolean).join(' · ')
    : (logistics?.pickup_city || car.location);

  const rate = rateOptions.find((r) => r.id === rateId) || rateOptions[0];
  const isDay = rate.id === 'day';
  const dayCount = (() => {
    if (!isDay || !pickupDate || !returnDate) return 1;
    const d = Math.round((new Date(returnDate) - new Date(pickupDate)) / 86400000);
    return Math.max(1, d);
  })();
  const qty = isDay ? dayCount : 1;
  const datesChosen = isDay ? (!!pickupDate && !!returnDate) : !!pickupDate;
  const startISO = pickupDate || null;
  const endISO = isDay ? (returnDate || pickupDate || null) : (pickupDate || null);
  const pickupStatus = timeStatus(startISO, pickupTime);
  const returnStatus = isDay ? timeStatus(endISO, returnTime) : null;
  // A 'closed' status means the partner takes no after-hours handovers → block it.
  const hoursBlocked = pickupStatus === 'closed' || returnStatus === 'closed';
  const base = rate.price * qty;
  const crossBorderFee = crossBorder && car.cross_border_allowed ? (car.cross_border_fee || 0) : 0;
  const deliveryFee = delivery && car.delivery_available ? (car.delivery_fee || 0) : 0;
  // after-hours surcharge when pickup/return falls outside the location's hours
  const afterHoursApplies = afterHoursOk && (pickupStatus === 'outside' || returnStatus === 'outside');
  const afterHoursFee = afterHoursApplies ? Number(logistics?.after_hours_fee || 0) : 0;
  // Damage protection is a partner-keeps pass-through: it sits outside the subtotal
  // so it carries no AIRLUXO service fee and no host commission (partner keeps 100%).
  const protectionFee = protection && car.protection_available ? (car.protection_fee || 0) : 0;
  const subtotal = base + crossBorderFee + deliveryFee + afterHoursFee;
  const serviceFee = Math.round(subtotal * FEES.guestService);
  const total = subtotal + serviceFee + protectionFee;
  const discount = promo?.discount || 0;
  // Loyalty: a signed-in customer can burn points for an AIRLUXO-funded credit.
  // This is a client estimate (clamped to the total); the authoritative amount is
  // recomputed server-side in stripe-create-payment and read back from `bd`.
  const loyaltyPoints = customer?.loyalty_points || 0;
  const loyaltyCredit = usePoints
    ? Math.min(Math.floor(loyaltyPoints / POINTS_PER_CHF_REDEEMED), Math.max(0, total - discount))
    : 0;
  const discountedTotal = Math.max(0, total - discount - loyaltyCredit);
  const deliveryMissingAddr = delivery && !deliveryAddr.trim();

  // Keep an applied promo's discount honest if the subtotal changes.
  useEffect(() => {
    if (!promo?.code || subtotal <= 0) return;
    let active = true;
    validatePromo(promo.code, subtotal).then((v) => {
      if (!active) return;
      if (v?.valid) setPromo((p) => (p ? { ...p, discount: Number(v.discount) || 0 } : p));
      else setPromo(null);
    });
    return () => { active = false; };
  }, [promo?.code, subtotal]);

  async function applyPromo() {
    setPromoErr('');
    const code = promoInput.trim();
    if (!code) return;
    setPromoBusy(true);
    const v = await validatePromo(code, subtotal);
    setPromoBusy(false);
    if (v?.valid) setPromo({ code: code.toUpperCase(), label: v.label || code.toUpperCase(), discount: Number(v.discount) || 0 });
    else { setPromo(null); setPromoErr(promoReasonText(v?.reason)); }
  }
  function clearPromo() { setPromo(null); setPromoInput(''); setPromoErr(''); }

  function buildPayload(piId, payStatus, bd) {
    return {
      listing_id: car.id,
      user_id: user?.id ?? null,
      guest_name: `${licence.first_name.trim()} ${licence.last_name.trim()}`.trim(),
      guest_email: guest.email.trim(),
      guest_phone: guest.phone.trim(),
      start_date: startISO,
      end_date: endISO,
      pickup_time: pickupTime,
      return_time: isDay ? returnTime : pickupTime,
      rate_label: rate.label,
      quantity: qty,
      cross_border: crossBorder && !!car.cross_border_allowed,
      delivery: delivery && !!car.delivery_available,
      delivery_address: delivery ? (deliveryAddr.trim() || null) : null,
      protection: protection && !!car.protection_available,
      // partner-keeps fee (recorded separately from addons_amount, which is commissionable)
      protection_fee: bd ? (bd.protection_fee ?? 0) : protectionFee,
      // the security deposit this protection waives, recorded for the trip record
      deposit_amount: (protection && car.protection_available) ? (car.deposit_amount || 0) : 0,
      // prefer server-recomputed amounts (authoritative) when a payment ran
      base_amount: bd ? bd.base_amount : base,
      addons_amount: bd ? bd.addons_amount : (crossBorderFee + deliveryFee + afterHoursFee),
      service_fee: bd ? bd.service_fee : serviceFee,
      total_amount: bd ? bd.total_amount : discountedTotal,
      promo_code: bd ? (bd.promo_code ?? null) : (promo?.code || null),
      discount_amount: bd ? (bd.discount_amount ?? 0) : discount,
      affiliate_commission: bd ? (bd.affiliate_commission ?? 0) : 0,
      // only redeem points when the authoritative payment path ran (server validated)
      points_redeemed: bd ? (bd.points_redeemed ?? 0) : 0,
      loyalty_credit: bd ? (bd.loyalty_credit ?? 0) : 0,
      licence_verified: true,
      licence: {
        first_name: licence.first_name.trim() || null,
        last_name: licence.last_name.trim() || null,
        birth_date: licence.birth_date.trim() || null,
        valid_from: licence.valid_from.trim() || null,
        categories: licence.categories.split(',').map((s) => s.trim()).filter(Boolean),
        number: licence.number.trim() || null,
      },
      stripe_payment_intent_id: piId,
      payment_status: payStatus,
      status: 'Pending',
    };
  }

  async function finalize(piId, payStatus, bd) {
    try {
      await createBooking(buildPayload(piId, payStatus, bd));
      track('booking_confirmed', { listing_id: car.id, make: car.make, model: car.model });
      // Newsletter consent (affirmative). Records the subscriber by email in the SSOT
      // (newsletter_subscribers) and mirrors Resend — works for guests too, and links
      // the customer account when signed in.
      if (newsletterOptIn) {
        subscribeNewsletter(guest.email.trim(), 'checkout').catch(() => {});
      }
      // Save the verified licence on file so future bookings are prefilled (best-effort).
      if (user && licenceScanned && licence.number.trim()) {
        supabase.from('customers').update({
          licence_verified: true,
          licence: {
            first_name: licence.first_name.trim() || null,
            last_name: licence.last_name.trim() || null,
            birth_date: licence.birth_date.trim() || null,
            valid_from: licence.valid_from.trim() || null,
            categories: licence.categories.split(',').map((s) => s.trim()).filter(Boolean),
            number: licence.number.trim() || null,
          },
        }).eq('id', user.id).then(() => {});
      }
      setBooked(true);
    } catch (e) {
      setErr(e.message || 'Could not complete the booking.');
    }
  }

  function startReserve() {
    setErr('');
    if (!datesChosen) { setErr('Please select your dates first.'); return; }
    if (hoursBlocked) { setErr('Choose a pick-up time within the location’s opening hours.'); return; }
    // No login gate — guests book unauthenticated; we offer account creation on
    // the confirmation screen (the booking auto-links to it by email).
    track('booking_started', { listing_id: car.id, make: car.make, model: car.model });
    setPhase('details');
  }

  function detailsContinue() {
    setErr('');
    if (deliveryMissingAddr) { setErr('Enter a delivery address.'); return; }
    if (!guest.email.trim() || !guest.phone.trim()) { setErr('Email and phone are required.'); return; }
    track('booking_licence_step', { listing_id: car.id });
    setPhase('licence');
  }

  async function scanLicence(file) {
    if (!file) return;
    setErr('');
    setVerifying(true);
    try {
      const f = await verifyLicence(file);
      setLicence({
        first_name: f.first_name || '',
        last_name: f.last_name || '',
        birth_date: f.birth_date || '',
        valid_from: f.valid_from || '',
        categories: (f.categories || []).join(', '),
        number: f.number || '',
      });
      setLicenceScanned(true);
    } catch (e) {
      setErr(e.message || 'Could not read the licence — enter the details manually.');
    } finally {
      setVerifying(false);
    }
  }

  // Desktop: show a QR that opens the mobile capture page, then poll for the result.
  async function startPhoneHandoff() {
    setErr('');
    try {
      const id = await createLicenceSession();
      const url = `${window.location.origin}/?licence=${id}`;
      const qr = await QRCode.toDataURL(url, { margin: 1, width: 240, color: { dark: '#0b0b0c', light: '#ffffff' } });
      setQrDataUrl(qr);
      pollRef.current = true;
      pollSession(id);
    } catch (e) {
      setErr(e.message || 'Could not start the phone hand-off.');
    }
  }

  async function pollSession(id) {
    while (pollRef.current) {
      await new Promise((r) => setTimeout(r, 2500));
      if (!pollRef.current) break;
      try {
        const s = await getLicenceSession(id);
        if (s.status === 'done' && s.result) {
          const f = s.result;
          setLicence({
            first_name: f.first_name || '', last_name: f.last_name || '',
            birth_date: f.birth_date || '', valid_from: f.valid_from || '',
            categories: (f.categories || []).join(', '), number: f.number || '',
          });
          setLicenceScanned(true);
          pollRef.current = false;
          setQrDataUrl(null);
        }
      } catch { /* keep polling */ }
    }
  }

  useEffect(() => () => { pollRef.current = false; }, []);

  useEffect(() => {
    let active = true;
    fetchAvailability(car.id).then((b) => { if (active) setBusyRanges(b); }).catch(() => {});
    fetchListingLogistics(car.id).then((l) => { if (active) setLogistics(l); }).catch(() => {});
    return () => { active = false; };
  }, [car.id]);

  async function proceed() {
    setErr('');
    if (!licence.first_name.trim() || !licence.last_name.trim() || !licence.number.trim()) {
      setErr('Name and licence number are required.'); return;
    }
    setBusy(true);
    try {
      // No Stripe key configured → book without payment (graceful fallback).
      if (!getStripe()) { await finalize(null, 'none'); return; }
      const res = await createPaymentIntent({
        listingId: car.id,
        rateId,
        quantity: qty,
        crossBorder: crossBorder && !!car.cross_border_allowed,
        delivery: delivery && !!car.delivery_available,
        protection: protection && !!car.protection_available,
        startDate: startISO,
        endDate: endISO,
        pickupTime,
        returnTime: isDay ? returnTime : pickupTime,
        promoCode: promo?.code,
        redeemPoints: usePoints ? loyaltyPoints : 0,
      });
      if (res.unavailable) { setErr('Those dates are no longer available — please pick another range.'); return; }
      // Partner not connected to Stripe yet → book without payment.
      if (res.skip) { await finalize(null, 'none'); return; }
      setClientSecret(res.clientSecret);
      setPaymentIntentId(res.paymentIntentId);
      setServerBreakdown(res.breakdown || null);
      track('booking_payment_step', { listing_id: car.id });
      setPhase('payment');
    } catch (e) {
      setErr(e.message || 'Could not start checkout.');
    } finally {
      setBusy(false);
    }
  }

  const specs = [
    { icon: <Icon.Bolt />, label: 'Power', value: car.power != null ? `${car.power} hp` : '—' },
    { icon: <Icon.Gauge />, label: '0–100 km/h', value: car.accel != null ? `${car.accel}s` : '—' },
    { icon: <Icon.Seat />, label: 'Seats', value: car.seats ?? '—' },
    { icon: <Icon.Gear />, label: 'Gearbox', value: car.gearbox || '—' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] overflow-y-auto bg-ink/45 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="min-h-full px-0 pb-0 pt-10 sm:px-6 sm:py-10">
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="mx-auto min-h-[calc(100vh-2.5rem)] max-w-[1100px] overflow-hidden rounded-t-[26px] border-mist bg-paper shadow-2xl sm:min-h-0 sm:rounded-[26px] sm:border"
        >
          {/* header bar */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-mist bg-cloud/80 px-5 py-3.5 backdrop-blur sm:px-7">
            <button onClick={onClose} className="ring-lux flex items-center gap-2 text-sm font-semibold text-stone transition-colors hover:text-ink">
              <Icon.Arrow width={16} height={16} className="rotate-180" /> Back to fleet
            </button>
            <button onClick={onClose} className="ring-lux grid h-9 w-9 place-items-center rounded-full border border-mist text-stone transition-colors hover:bg-mist/50">
              <Icon.X width={16} height={16} />
            </button>
          </div>

          {/* hero image (+ muted autoplay video when the listing has one) */}
          <div className="group relative aspect-[16/9] sm:aspect-[2.4/1]">
            <CarImage car={car} className="h-full w-full" />
            {car.video && !reduceMotion && (
              <video src={car.video} autoPlay muted loop playsInline preload="auto" className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/65 via-transparent to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between text-cloud sm:left-7 sm:right-7">
              <div>
                <div className="eyebrow text-cloud/70">{car.category} · {car.location}</div>
                <h2 className="font-display mt-1.5 text-[clamp(1.8rem,4vw,3rem)] leading-none">
                  {car.make} {car.model}
                </h2>
              </div>
              <div className="hidden items-center gap-1.5 rounded-full bg-cloud/15 px-3 py-1.5 text-sm font-bold backdrop-blur sm:flex">
                <Icon.Star className="text-gold-soft" width={14} height={14} /> {car.rating != null ? `${car.rating.toFixed(2)} · ${car.trips} trips` : 'New listing'}
              </div>
            </div>
          </div>

          {/* body */}
          <div className="grid gap-8 p-5 sm:p-7 lg:grid-cols-[1.5fr_1fr]">
            {/* left: details */}
            <div>
              {/* spec grid */}
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-mist bg-mist sm:grid-cols-4">
                {specs.map((s) => (
                  <div key={s.label} className="bg-cloud p-4">
                    <span className="text-stone">{s.icon}</span>
                    <div className="font-display mt-2.5 text-lg leading-none tnum">{s.value}</div>
                    <div className="mt-1 text-[0.7rem] uppercase tracking-wider text-stone">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* host */}
              <div className="mt-7 flex items-center gap-4 rounded-2xl border border-mist bg-cloud p-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink font-display text-cloud">
                  {car.host.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-bold">
                    {car.host.name}
                    <span className="rounded-full bg-gold/12 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-gold">Verified host</span>
                  </div>
                  <div className="mt-0.5 text-xs text-stone tnum">
                    {car.host.rating != null ? `★ ${car.host.rating} · ${car.host.trips} trips` : 'New on AIRLUXO'}{car.host.since ? ` · partner since ${car.host.since}` : ''}
                  </div>
                </div>
              </div>

              <p className="mt-7 text-sm leading-relaxed text-stone">
                Delivered to your door anywhere in {car.location} with a full tank and a
                concierge handover. Every AIRLUXO trip includes comprehensive insurance,
                24/7 roadside assistance and {car.mileage_per_day ?? 250} km/day mileage. Reduce your
                excess to CHF 0 at checkout.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {car.fuel && <span className="rounded-full border border-mist bg-cloud px-3.5 py-1.5 text-xs font-semibold text-ink">{car.fuel}</span>}
                {car.exterior_color && <span className="rounded-full border border-mist bg-cloud px-3.5 py-1.5 text-xs font-semibold text-ink">{car.exterior_color}</span>}
                {car.interior_color && <span className="rounded-full border border-mist bg-cloud px-3.5 py-1.5 text-xs font-semibold text-ink">{car.interior_color} interior</span>}
                {[`${car.mileage_per_day ?? 250} km / day`, '24/7 assistance', 'Free cancellation 48h'].map((t) => (
                  <span key={t} className="rounded-full border border-mist bg-cloud px-3.5 py-1.5 text-xs font-semibold text-ink">{t}</span>
                ))}
                {car.delivery_available && <span className="rounded-full border border-gold/30 bg-gold/10 px-3.5 py-1.5 text-xs font-semibold text-gold">Delivery{car.delivery_fee ? ` · +${chf(car.delivery_fee)}` : ''}</span>}
                {car.cross_border_allowed && <span className="rounded-full border border-gold/30 bg-gold/10 px-3.5 py-1.5 text-xs font-semibold text-gold">Cross-border{car.cross_border_fee ? ` · +${chf(car.cross_border_fee)}` : ''}</span>}
              </div>
            </div>

            {/* right: booking */}
            <div className="lg:sticky lg:top-6 lg:self-start">
              <div className="rounded-[var(--radius-card)] border border-mist bg-cloud p-6 shadow-[0_30px_60px_-40px_rgba(11,11,12,0.4)]">
                <div className="flex items-baseline justify-between">
                  <div className="font-display text-2xl tnum">{chf(rate.price)} <span className="text-base font-normal text-stone">/ {rate.unit}</span></div>
                  <div className="flex items-center gap-1 text-sm font-bold tnum"><Icon.Star className="text-gold-soft" width={13} height={13} /> {car.rating != null ? car.rating.toFixed(2) : 'New'}</div>
                </div>

                {/* rate selection */}
                {rateOptions.length > 1 && (
                  <div className="mt-4">
                    <div className="text-[0.65rem] uppercase tracking-wider text-stone">Choose a rate</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {rateOptions.map((o) => {
                        const active = o.id === rateId;
                        return (
                          <button
                            key={o.id}
                            onClick={() => { setRateId(o.id); }}
                            className={`ring-lux rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors tnum ${active ? 'border-ink bg-ink text-cloud' : 'border-mist bg-cloud text-stone hover:border-stone hover:text-ink'}`}
                          >
                            {o.label} · {chf(o.price)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* dates + times */}
                <div className="mt-4">
                  <div className="text-[0.65rem] uppercase tracking-wider text-stone">{isDay ? 'Dates' : 'Date'}</div>
                  <button type="button" onClick={() => setShowCal((s) => !s)} className="ring-lux mt-2 flex w-full items-center justify-between rounded-xl border border-mist bg-cloud px-4 py-3 text-sm transition-colors hover:border-ink">
                    <span className="font-semibold">
                      {datesChosen
                        ? (isDay ? `${fmtShort(pickupDate)} → ${fmtShort(returnDate)} · ${dayCount} ${dayCount === 1 ? 'day' : 'days'}` : fmtShort(pickupDate))
                        : <span className="text-stone">Select dates</span>}
                    </span>
                    <Icon.Calendar width={16} height={16} className="text-stone" />
                  </button>
                  {showCal && (
                    <DatePicker busy={busyRanges} mode={isDay ? 'range' : 'single'} pickup={pickupDate} ret={returnDate} onPick={(p, r) => { setPickupDate(p); setReturnDate(r); }} onClose={() => setShowCal(false)} />
                  )}
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="mb-1 block text-[0.6rem] uppercase tracking-wider text-stone">Pick-up time</span>
                      <input type="time" value={pickupTime} min={!afterHoursOk ? hoursFor(startISO)?.open : undefined} max={!afterHoursOk ? hoursFor(startISO)?.close : undefined} onChange={(e) => setPickupTime(e.target.value)} className="ring-lux w-full rounded-lg border border-mist bg-cloud px-3 py-2 text-sm outline-none transition-colors focus:border-ink" />
                    </label>
                    {isDay && (
                      <label className="block">
                        <span className="mb-1 block text-[0.6rem] uppercase tracking-wider text-stone">Return time</span>
                        <input type="time" value={returnTime} min={!afterHoursOk ? hoursFor(endISO)?.open : undefined} max={!afterHoursOk ? hoursFor(endISO)?.close : undefined} onChange={(e) => setReturnTime(e.target.value)} className="ring-lux w-full rounded-lg border border-mist bg-cloud px-3 py-2 text-sm outline-none transition-colors focus:border-ink" />
                      </label>
                    )}
                  </div>

                  {/* opening-hours guidance */}
                  {logistics?.opening_hours && datesChosen && (() => {
                    const ph = hoursFor(startISO);
                    const open = ph && !ph.closed ? `${ph.open}–${ph.close}` : 'closed';
                    if (hoursBlocked) {
                      return <p className="mt-2 text-xs font-medium text-red-600">Pick-up location is {ph?.closed ? 'closed that day' : `open ${open}`}. Choose a time within opening hours.</p>;
                    }
                    if (pickupStatus === 'outside' || returnStatus === 'outside') {
                      return <p className="mt-2 text-xs text-gold">Outside opening hours — after-hours handover available{logistics.after_hours_fee ? ` (+${chf(logistics.after_hours_fee)}, added to your total)` : ''}.</p>;
                    }
                    return <p className="mt-2 text-xs text-stone">Open {open} on your pick-up day.</p>;
                  })()}

                  {/* pick-up location */}
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-mist bg-cloud px-3.5 py-2.5">
                    <Icon.Pin width={15} height={15} className="mt-0.5 shrink-0 text-gold" />
                    <div className="min-w-0">
                      <div className="text-[0.6rem] uppercase tracking-wider text-stone">Pick-up location</div>
                      <div className="text-sm font-semibold">{pickupLabel}</div>
                    </div>
                  </div>
                </div>

                {/* add-ons */}
                {(car.cross_border_allowed || car.delivery_available || car.protection_available) && (
                  <div className="mt-3 space-y-2">
                    <div className="text-[0.65rem] uppercase tracking-wider text-stone">Add-ons</div>
                    {car.protection_available && (
                      <div className="rounded-xl border border-gold/30 bg-gold/5 px-4 py-2.5">
                        <label className="flex cursor-pointer items-center justify-between">
                          <span className="flex items-center gap-2.5 text-sm font-semibold">
                            <input type="checkbox" checked={protection} onChange={(e) => setProtection(e.target.checked)} className="ring-lux h-4 w-4 accent-ink" />
                            <span className="flex items-center gap-1.5"><Icon.Shield width={15} height={15} className="text-gold" /> Damage protection</span>
                          </span>
                          <span className="text-sm font-semibold tnum text-stone">+{chf(car.protection_fee || 0)}</span>
                        </label>
                        <p className="mt-1.5 text-xs text-stone">
                          {car.deposit_amount
                            ? <>Reduces your excess to CHF 0 — no {chf(car.deposit_amount)} security deposit to put down.</>
                            : <>Reduces your damage excess to CHF 0 for the trip.</>}
                        </p>
                      </div>
                    )}
                    {car.cross_border_allowed && (
                      <label className="flex cursor-pointer items-center justify-between rounded-xl border border-mist bg-cloud px-4 py-2.5">
                        <span className="flex items-center gap-2.5 text-sm font-semibold">
                          <input type="checkbox" checked={crossBorder} onChange={(e) => setCrossBorder(e.target.checked)} className="ring-lux h-4 w-4 accent-ink" />
                          Cross-border trip
                        </span>
                        <span className="text-sm font-semibold tnum text-stone">+{chf(car.cross_border_fee || 0)}</span>
                      </label>
                    )}
                    {car.delivery_available && (
                      <div className="rounded-xl border border-mist bg-cloud px-4 py-2.5">
                        <label className="flex cursor-pointer items-center justify-between">
                          <span className="flex items-center gap-2.5 text-sm font-semibold">
                            <input type="checkbox" checked={delivery} onChange={(e) => setDelivery(e.target.checked)} className="ring-lux h-4 w-4 accent-ink" />
                            Delivery &amp; collection
                          </span>
                          <span className="text-sm font-semibold tnum text-stone">+{chf(car.delivery_fee || 0)}</span>
                        </label>
                        {delivery && (
                          <input
                            value={deliveryAddr}
                            onChange={(e) => setDeliveryAddr(e.target.value)}
                            placeholder="Delivery address in Switzerland"
                            className="ring-lux mt-2.5 w-full rounded-lg border border-mist bg-paper px-3 py-2 text-sm outline-none transition-colors focus:border-ink placeholder:text-stone"
                          />
                        )}
                        {car.delivery_note && <p className="mt-1.5 text-xs text-stone">{car.delivery_note}</p>}
                      </div>
                    )}
                  </div>
                )}

                {/* price breakdown */}
                <div className="mt-5 space-y-2.5 text-sm">
                  <Row label={`${chf(rate.price)} × ${qty} ${isDay ? (qty === 1 ? 'day' : 'days') : rate.label}`} value={chf(base)} />
                  {crossBorderFee > 0 && <Row label="Cross-border surcharge" value={`+${chf(crossBorderFee)}`} muted />}
                  {deliveryFee > 0 && <Row label="Delivery & collection" value={`+${chf(deliveryFee)}`} muted />}
                  {afterHoursFee > 0 && <Row label="After-hours handover" value={`+${chf(afterHoursFee)}`} muted />}
                  {protectionFee > 0 && <Row label="Damage protection · zero excess" value={`+${chf(protectionFee)}`} muted />}
                  <Row
                    label={
                      <span className="flex items-center gap-1.5">
                        AIRLUXO service fee
                        <span className="rounded bg-mist/70 px-1.5 py-0.5 text-[0.65rem] font-bold tnum">{Math.round(FEES.guestService * 100)}%</span>
                      </span>
                    }
                    value={chf(serviceFee)}
                    muted
                  />
                  {discount > 0 && (
                    <div className="flex items-center justify-between text-go">
                      <span className="font-semibold">Discount · {promo.label}</span>
                      <span className="font-semibold tnum">−{chf(discount)}</span>
                    </div>
                  )}
                  {loyaltyCredit > 0 && (
                    <div className="flex items-center justify-between text-go">
                      <span className="font-semibold">Member credit · points</span>
                      <span className="font-semibold tnum">−{chf(loyaltyCredit)}</span>
                    </div>
                  )}
                  {serverBreakdown?.tier_comp > 0 && (
                    <div className="flex items-center justify-between text-go">
                      <span className="font-semibold capitalize">{serverBreakdown.tier} benefit</span>
                      <span className="font-semibold tnum">−{chf(serverBreakdown.tier_comp)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-mist pt-3">
                    <span className="font-display text-base">Total</span>
                    <span className="font-display text-xl tnum">{chf(serverBreakdown?.total_amount ?? discountedTotal)}</span>
                  </div>
                </div>

                {/* promo / referral code */}
                {!booked && phase !== 'payment' && loyaltyPoints > 0 && (
                  <label className="mt-3 flex cursor-pointer items-center justify-between rounded-xl border border-gold/30 bg-gold/5 px-4 py-2.5">
                    <span className="flex items-center gap-2.5 text-sm font-semibold">
                      <input type="checkbox" checked={usePoints} onChange={(e) => setUsePoints(e.target.checked)} className="ring-lux h-4 w-4 accent-ink" />
                      Use my {loyaltyPoints.toLocaleString('de-CH')} points
                    </span>
                    <span className="text-sm font-semibold tnum text-gold">up to −{chf(Math.floor(loyaltyPoints / POINTS_PER_CHF_REDEEMED))}</span>
                  </label>
                )}

                {!booked && phase !== 'payment' && (
                  <PromoField promo={promo} input={promoInput} setInput={setPromoInput} onApply={applyPromo} onClear={clearPromo} busy={promoBusy} err={promoErr} />
                )}

                {booked ? (
                  <div className="mt-4 space-y-3">
                    <div className="flex w-full items-center justify-center gap-2 rounded-2xl bg-go py-4 text-sm font-bold text-cloud"><Icon.Check width={17} height={17} /> Reservation requested</div>
                    {signInWithGoogle && !user && <PostBookingAccount email={guest.email} onGoogle={signInWithGoogle} onEmail={sendEmailLink} />}
                  </div>
                ) : phase === 'payment' && clientSecret ? (
                  <div className="mt-4 border-t border-mist pt-4">
                    <div className="mb-3 text-[0.65rem] uppercase tracking-wider text-stone">Payment · authorise {chf(serverBreakdown?.total_amount ?? discountedTotal)}</div>
                    <PaymentStep clientSecret={clientSecret} onPaid={() => finalize(paymentIntentId, 'authorized', serverBreakdown)} onError={setErr} />
                  </div>
                ) : phase === 'licence' ? (
                  <div className="mt-4 border-t border-mist pt-4">
                    <div className="flex items-center justify-between">
                      <div className="text-[0.65rem] uppercase tracking-wider text-stone">Driver's licence · Step 2 of 2</div>
                      {licenceScanned && <span className="flex items-center gap-1 text-[0.65rem] font-bold text-go"><Icon.Check width={12} height={12} /> Scanned</span>}
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
                        <p className="mt-1 text-xs text-stone">{isDesktop ? 'Scan your licence with your phone — the details autofill here.' : 'Scan your licence — we autofill the details for you to check.'}</p>
                        <button type="button" onClick={isDesktop ? startPhoneHandoff : () => licenceRef.current?.click()} disabled={verifying} className="ring-lux mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-mist bg-cloud py-3 text-sm font-semibold text-ink transition-colors hover:border-ink disabled:opacity-60">
                          {verifying ? (<><span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-mist border-t-ink" /> Reading licence…</>) : (<><Icon.Shield width={16} height={16} /> {isDesktop ? 'Continue on your phone' : (licenceScanned ? 'Rescan licence' : 'Scan / upload licence')}</>)}
                        </button>
                        {isDesktop && <button type="button" onClick={() => licenceRef.current?.click()} className="ring-lux mt-2 w-full text-center text-xs font-semibold text-stone hover:text-ink">or upload a file from this computer</button>}
                      </>
                    )}
                    <input ref={licenceRef} type="file" accept="image/*" capture="environment" onChange={(e) => scanLicence(e.target.files?.[0])} className="hidden" />

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <LicInput label="First name" value={licence.first_name} onChange={(v) => setLicence((l) => ({ ...l, first_name: v }))} />
                      <LicInput label="Last name" value={licence.last_name} onChange={(v) => setLicence((l) => ({ ...l, last_name: v }))} />
                      <LicInput label="Birth date" value={licence.birth_date} onChange={(v) => setLicence((l) => ({ ...l, birth_date: v }))} placeholder="YYYY-MM-DD" />
                      <LicInput label="Valid from" value={licence.valid_from} onChange={(v) => setLicence((l) => ({ ...l, valid_from: v }))} placeholder="YYYY-MM-DD" />
                      <LicInput label="Categories" value={licence.categories} onChange={(v) => setLicence((l) => ({ ...l, categories: v }))} placeholder="B, A1" />
                      <LicInput label="Licence no." value={licence.number} onChange={(v) => setLicence((l) => ({ ...l, number: v }))} />
                    </div>

                    <button onClick={proceed} disabled={busy} className="ring-lux mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink py-4 text-sm font-bold text-cloud transition-colors hover:bg-void disabled:opacity-60">
                      {busy ? (<span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-cloud/30 border-t-cloud" />) : (<>Confirm &amp; continue <Icon.Arrow width={16} height={16} /></>)}
                    </button>
                  </div>
                ) : phase === 'details' ? (
                  <div className="mt-4 border-t border-mist pt-4">
                    <div className="text-[0.65rem] uppercase tracking-wider text-stone">Your details · Step 1 of 2</div>
                    <div className="mt-2.5 space-y-2.5">
                      <input value={guest.email} onChange={(e) => setGuest((g) => ({ ...g, email: e.target.value }))} type="email" placeholder="Email" className="ring-lux w-full rounded-lg border border-mist bg-paper px-3 py-2.5 text-sm outline-none transition-colors focus:border-ink placeholder:text-stone" />
                      <input value={guest.phone} onChange={(e) => setGuest((g) => ({ ...g, phone: e.target.value }))} type="tel" placeholder="Phone" className="ring-lux w-full rounded-lg border border-mist bg-paper px-3 py-2.5 text-sm outline-none transition-colors focus:border-ink placeholder:text-stone" />
                    </div>
                    <p className="mt-2 text-xs text-stone">Your name is taken from your driver's licence in the next step.</p>
                    <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-xs text-stone">
                      <input type="checkbox" checked={newsletterOptIn} onChange={(e) => setNewsletterOptIn(e.target.checked)} className="ring-lux mt-0.5 h-4 w-4 shrink-0 accent-ink" />
                      <span>Send me the AIRLUXO newsletter — new arrivals, member offers and events. Unsubscribe anytime.</span>
                    </label>
                    <button onClick={detailsContinue} disabled={deliveryMissingAddr} className="ring-lux mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink py-4 text-sm font-bold text-cloud transition-colors hover:bg-void disabled:opacity-60">
                      Continue <Icon.Arrow width={16} height={16} />
                    </button>
                  </div>
                ) : (
                  <button onClick={startReserve} disabled={deliveryMissingAddr || !datesChosen || hoursBlocked} className="ring-lux mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink py-4 text-sm font-bold text-cloud transition-colors hover:bg-void disabled:opacity-60">
                    Reserve now <Icon.Arrow width={16} height={16} />
                  </button>
                )}

                {err && <p className="mt-3 text-center text-xs text-red-600">{err}</p>}
                <p className="mt-3 text-center text-xs text-stone">
                  {booked ? 'Sent to the host — they’ll confirm shortly.'
                    : phase === 'payment' ? 'Your card is authorised now — charged only when the host confirms.'
                    : phase === 'licence' ? 'Your licence details are shared with the host to verify the driver.'
                    : !datesChosen ? 'Select your dates to continue.'
                    : hoursBlocked ? 'Choose a pick-up time within opening hours.'
                    : deliveryMissingAddr ? 'Enter a delivery address to continue.'
                    : "You won't be charged yet."}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function PaymentInner({ onPaid, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);

  async function pay() {
    if (!stripe || !elements) return;
    setPaying(true);
    onError('');
    const { error, paymentIntent } = await stripe.confirmPayment({ elements, redirect: 'if_required' });
    setPaying(false);
    if (error) { onError(error.message || 'Payment failed.'); return; }
    if (paymentIntent && (paymentIntent.status === 'requires_capture' || paymentIntent.status === 'succeeded')) {
      onPaid();
    } else {
      onError('Payment could not be completed.');
    }
  }

  return (
    <div>
      <PaymentElement />
      <button
        type="button"
        onClick={pay}
        disabled={!stripe || paying}
        className="ring-lux mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink py-4 text-sm font-bold text-cloud transition-colors hover:bg-void disabled:opacity-60"
      >
        {paying ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-cloud/30 border-t-cloud" /> : <>Pay &amp; reserve <Icon.Arrow width={16} height={16} /></>}
      </button>
    </div>
  );
}

function PaymentStep({ clientSecret, onPaid, onError }) {
  return (
    <Elements
      stripe={getStripe()}
      options={{ clientSecret, appearance: { theme: 'flat', variables: { colorPrimary: '#0b0b0c', borderRadius: '12px', fontFamily: 'inherit' } } }}
    >
      <PaymentInner onPaid={onPaid} onError={onError} />
    </Elements>
  );
}

function fmtShort(iso) {
  if (!iso) return '';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// Calendar with busy dates greyed out. mode 'range' (pickup→return) or 'single'.
function DatePicker({ busy, mode, pickup, ret, onPick, onClose }) {
  const pad = (n) => String(n).padStart(2, '0');
  const todayISO = (() => { const t = new Date(); return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`; })();
  const [cursor, setCursor] = useState(() => { const d = pickup ? new Date(`${pickup}T00:00:00`) : new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });

  const monthStart = new Date(cursor.y, cursor.m, 1);
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const lead = (monthStart.getDay() + 6) % 7;
  const iso = (d) => `${cursor.y}-${pad(cursor.m + 1)}-${pad(d)}`;
  const isBusy = (s) => (busy || []).some((b) => s >= b.start && s <= b.end);
  const rangeHasBusy = (a, b) => {
    let d = new Date(`${a}T00:00:00`); const end = new Date(`${b}T00:00:00`);
    while (d <= end) { const s = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; if (isBusy(s)) return true; d.setDate(d.getDate() + 1); }
    return false;
  };

  function clickDay(s) {
    if (s < todayISO || isBusy(s)) return;
    if (mode === 'single') { onPick(s, ''); onClose(); return; }
    if (!pickup || (pickup && ret)) { onPick(s, ''); return; }      // start a fresh range
    if (s <= pickup) { onPick(s, ''); return; }                      // move start earlier
    if (rangeHasBusy(pickup, s)) { onPick(s, ''); return; }          // range crosses a busy day → restart
    onPick(pickup, s); onClose();
  }

  const cells = [];
  for (let i = 0; i < lead; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
  const monthName = monthStart.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <div className="mt-2 rounded-xl border border-mist bg-cloud p-3">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setCursor((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }))} className="ring-lux grid h-7 w-7 place-items-center rounded-full border border-mist text-ink"><Icon.Arrow width={13} height={13} className="rotate-180" /></button>
        <span className="text-sm font-semibold">{monthName}</span>
        <button type="button" onClick={() => setCursor((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }))} className="ring-lux grid h-7 w-7 place-items-center rounded-full border border-mist text-ink"><Icon.Arrow width={13} height={13} /></button>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1 text-center">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={i} className="text-[0.55rem] font-bold uppercase text-stone">{d}</div>)}
        {cells.map((d, i) => {
          if (d === null) return <div key={`b${i}`} />;
          const s = iso(d);
          const disabled = s < todayISO || isBusy(s);
          const selected = s === pickup || s === ret;
          const within = mode === 'range' && pickup && ret && s > pickup && s < ret;
          return (
            <button
              type="button" key={d} disabled={disabled} onClick={() => clickDay(s)}
              className={`h-8 rounded-md text-xs font-semibold transition-colors ${disabled ? 'cursor-not-allowed text-stone/30 line-through' : selected ? 'bg-ink text-cloud' : within ? 'bg-ink/10 text-ink' : 'text-ink hover:bg-mist'}`}
            >{d}</button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center gap-3 text-[0.6rem] text-stone">
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-ink" /> selected</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-mist" /> unavailable</span>
      </div>
    </div>
  );
}

function LicInput({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[0.6rem] uppercase tracking-wider text-stone">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="ring-lux w-full rounded-lg border border-mist bg-paper px-3 py-2 text-sm outline-none transition-colors focus:border-ink placeholder:text-stone"
      />
    </label>
  );
}

function Row({ label, value, muted }) {
  return (
    <div className={`flex items-center justify-between ${muted ? 'text-stone' : 'text-ink'}`}>
      <span>{label}</span>
      <span className="tnum">{value}</span>
    </div>
  );
}

function PromoField({ promo, input, setInput, onApply, onClear, busy, err }) {
  if (promo) {
    return (
      <div className="mt-3 flex items-center justify-between rounded-xl border border-go/30 bg-go/10 px-3.5 py-2.5">
        <span className="flex items-center gap-2 text-sm font-semibold text-go"><Icon.Check width={15} height={15} /> Code “{promo.code}” applied</span>
        <button type="button" onClick={onClear} className="ring-lux text-xs font-semibold text-stone transition-colors hover:text-ink">Remove</button>
      </div>
    );
  }
  return (
    <div className="mt-3">
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onApply(); } }}
          placeholder="Promo or referral code"
          className="ring-lux flex-1 rounded-xl border border-mist bg-paper px-3 py-2.5 text-sm uppercase outline-none transition-colors focus:border-ink placeholder:normal-case placeholder:text-stone"
        />
        <button type="button" onClick={onApply} disabled={busy || !input.trim()} className="ring-lux rounded-xl border border-ink/25 px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink disabled:opacity-50">
          {busy ? '…' : 'Apply'}
        </button>
      </div>
      {err && <p className="mt-1.5 text-xs text-red-600">{err}</p>}
    </div>
  );
}

// Shown on the booking confirmation to guests who aren't signed in — finish
// account setup (Google or an email link); the booking auto-links by email.
function PostBookingAccount({ email, onGoogle, onEmail }) {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState('');
  async function google() { setBusy('google'); try { await onGoogle({ kind: 'account' }); } catch { setBusy(''); } }
  async function link() {
    if (!email) return;
    setBusy('email');
    const { error } = await onEmail(email, { kind: 'account' });
    setBusy('');
    if (!error) setSent(true);
  }
  if (sent) {
    return (
      <div className="rounded-2xl border border-mist bg-cloud p-4 text-sm text-stone">
        Check your inbox — we sent a sign-in link to <span className="font-semibold text-ink">{email}</span> to set up your account and manage this trip.
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-mist bg-cloud p-4">
      <div className="text-sm font-bold text-ink">Create your account</div>
      <p className="mt-1 text-xs text-stone">Manage this trip, save your details &amp; licence, and book faster next time.</p>
      <div className="mt-3 flex flex-col gap-2">
        <button type="button" onClick={google} disabled={!!busy} className="ring-lux flex items-center justify-center gap-2 rounded-xl border border-mist bg-paper py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-mist/40 disabled:opacity-60">Continue with Google</button>
        <button type="button" onClick={link} disabled={!!busy || !email} className="ring-lux rounded-xl bg-ink py-2.5 text-sm font-bold text-cloud transition-colors hover:bg-void disabled:opacity-60">{busy === 'email' ? 'Sending…' : 'Email me a sign-in link'}</button>
      </div>
    </div>
  );
}

function Stepper({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="ring-lux grid h-8 w-8 place-items-center rounded-full border border-mist text-lg font-bold text-ink transition-colors hover:border-ink"
    >
      {children}
    </button>
  );
}
