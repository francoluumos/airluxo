import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useI18n } from '../lib/i18n.jsx';
import { PLANS, PLAN_ORDER } from '../lib/plans.js';
import DashboardCarousel from './DashboardCarousel.jsx';

// AIRLUXO public site — PARTNER-ACQUISITION mode (Phase 1). A premium, dark-editorial
// value proposition for luxury-car rental companies; the consumer marketplace stays hidden
// behind VITE_CONSUMER_LIVE until Phase 2. Bilingual DE (default) + EN via the global i18n
// locale; the language switch lives in the footer; language is browser-auto-detected.
// Design: one cohesive dark theme, controlled type scale, gold accent, restrained motion.

const EASE = [0.23, 1, 0.32, 1];

const COPY = {
  de: {
    nav: { platform: 'Plattform', terms: 'Konditionen', roadmap: 'Roadmap', faq: 'FAQ', login: 'Partner-Login', cta: 'Gespräch buchen' },
    hero: {
      eyebrow: 'Für Luxus-Autovermietungen in der Schweiz',
      h1a: 'Ihre Vermietung,', h1b: 'online in Tagen.',
      lead: 'Eine erstklassige Buchungs-Website, ein sicheres Payment-Gateway und ein Dashboard. In Ihrer Marke, auf unserer Engine.',
      cta1: 'Meine Website bauen', cta2: 'So funktioniert’s',
    },
    shift: {
      h2a: 'Ihre Autos sind aussergewöhnlich.', h2b: 'Ihr Buchungserlebnis sollte es auch sein.',
      lead: 'Wer einen Lamborghini mietet, will keine DM, kein PDF und keine Banküberweisung. Gäste erwarten: stöbern, Daten wählen, bezahlen, bestätigen, in Minuten.',
      rows: [
        ['Generische Vorlagen', 'Keine Echtzeit-Verfügbarkeit, keine Online-Zahlung, keine Vertrauenssignale.'],
        ['Manuelle Administration', 'Kalender im Kopf, Rechnungen von Hand, Kautionen am Telefon hinterhergejagt.'],
        ['Verlorene Premium-Gäste', 'Kaufbereite Fahrer springen ab, wenn die Buchung nicht sofort und sicher ist.'],
      ],
    },
    deliver: {
      h2: 'Eine komplette Plattform, in Ihrer Marke.',
      items: [
        ['Ihre Website', 'Eine auf Luxus-Vermietung spezialisierte Seite in Ihren Farben, Schriften und Ihrem Logo. In Tagen gebaut, auf Ihrer eigenen Domain.'],
        ['Payment-Gateway', 'Sichere Online-Zahlungen und Kautionen (Stripe). Gäste zahlen vorab, Auszahlungen auf Ihr IBAN nach jeder Miete.'],
        ['Partner-Dashboard', 'Inserate, Preise, Verfügbarkeit, Buchungen und Auszahlungen an einem Ort, mit Echtzeit-Kalendersync.'],
      ],
      note: 'Layout, Buchungsfluss und Sicherheit sind unser bewährtes System. Nur die Marke ist Ihre.',
    },
    dash: {
      h2: 'Ihre ganze Flotte von einem Bildschirm.',
      lead: 'Alles in Selbstbedienung. Kein Entwickler, keine Agentur, kein Warten.',
      feats: [
        ['Inserate & Fotos', 'Fahrzeuge mit Spezifikationen und Galerien anlegen, oder die Flotte in einem Schritt importieren.'],
        ['Preise & Regeln', 'Tagespreise, Kautionen, Kilometer und Lieferung festlegen, pro Auto, zu Ihren Bedingungen.'],
        ['Buchungen & Kalender', 'Echtzeit-Verfügbarkeit, ICS-Sync, sofortige Bestätigungen, keine Doppelbuchungen.'],
        ['Auszahlungen & Analytics', 'Einnahmen, Auslastung und Trends sehen. Auszahlungen nach jeder Miete.'],
      ],
    },
    terms: {
      eyebrow: 'Konditionen', h2: 'Fair, transparent, keine Bindung.',
      popular: 'Beliebteste', mo: '/Mt.', commission: 'Kommission',
      sub: { free: 'Bis 3 Autos', pro: 'Bis 25 Autos', max: 'Unbegrenzte Autos' },
      feats: {
        free: ['KI-Studio-Thumbnails', 'Kalendersync (ICS)', 'Standard-Platzierung'],
        pro: ['Priorisierte Platzierung', 'Performance-Analytics', 'Schnellere Auszahlungen'],
        max: ['Featured-Platzierung', 'Team-Mitglieder, API', 'Dedizierter Support'],
      },
      note: 'Die Kommission tragen Sie, nicht Ihre Gäste — sie wird direkt von Ihrer Auszahlung abgezogen. Keine Servicegebühr für Gäste, keine Inseratsgebühren, keine Bindung, Auszahlung auf Ihr IBAN nach jeder Miete.',
    },
    onboard: {
      h2: 'Von Ihrer Seite zu live, in Tagen.',
      steps: [
        ['Seite teilen', 'Wir lesen Marke, Flotte und Texte automatisch.'],
        ['Wir bauen', 'Ihre Website und das Dashboard, mit Ihren Autos befüllt.'],
        ['Sie prüfen', 'Preise, Fotos und Texte anpassen, Freigabe per Vorschau.'],
        ['Live gehen', 'Auf Ihrer Domain veröffentlichen. Buchungen starten.'],
      ],
    },
    roadmap: {
      h2: 'Nach dem Start wird’s nur stärker.', soon: 'Demnächst',
      cards: [
        ['AIRLUXO-Marktplatz', 'Bald listen wir Ihre Flotte zusätzlich auf airluxo.ch, sichtbar für geprüfte Schweizer Fahrer.'],
        ['Mobile Übergabe-App', 'Digitale Annahme und Rückgabe: Foto-Schadensprotokoll, Tank, Kilometer, Führerausweis-Scan, E-Signatur.'],
        ['Smart Pricing', 'Dynamische Tagespreise nach Nachfrage, Saison und Events, automatisch.'],
      ],
    },
    faq: {
      eyebrow: 'FAQ', h2: 'Häufige Fragen',
      items: [
        ['Was kostet AIRLUXO?', 'Ein monatliches Abonnement (Free / Pro / Max, siehe Konditionen) plus eine Kommission pro Buchung, die von Ihrer Auszahlung abgezogen wird. Die Kommission tragen Sie, nicht Ihre Gäste. Keine Inseratsgebühren, keine Einrichtungskosten.'],
        ['Wie lange dauert es, bis ich live bin?', 'In der Regel wenige Tage: Sie teilen Ihre bestehende Seite, wir bauen Ihre Marken-Website und das Dashboard, Sie prüfen, wir gehen live.'],
        ['Behalte ich meine Marke?', 'Ja. Ihre Farben, Schriften, Ihr Logo und Ihre eigene Domain. AIRLUXO liefert nur die Engine darunter.'],
        ['Wie funktionieren Zahlungen und Auszahlungen?', 'Gäste zahlen sicher online vorab (Stripe), inklusive Kaution. Auszahlungen auf Ihr IBAN nach jeder Miete, kein Hinterherjagen von Überweisungen.'],
        ['Gibt es eine Vertragsbindung?', 'Nein. Keine Mindestlaufzeit, monatlich kündbar.'],
        ['Kann ich meine eigene Domain nutzen?', 'Ja. Ihre Website läuft auf Ihrer eigenen Domain (CNAME), nicht auf einer AIRLUXO-Subdomain.'],
      ],
    },
    cta: { h2a: 'Sehen Sie Ihren Auftritt,', h2b: 'live, in Ihrer Marke.', lead: 'Wir bauen eine private Vorschau Ihrer Marken-Website, bevor Sie sich zu etwas verpflichten.', cta1: 'Gespräch buchen' },
    footer: {
      tagline: 'Ihre Marke. Unsere Engine.',
      colPlatform: 'Plattform', colLegal: 'Rechtliches', colContact: 'Kontakt',
      impressum: 'Impressum', privacy: 'Datenschutz', agb: 'AGB',
      rights: 'Alle Rechte vorbehalten.', country: 'Schweiz',
    },
  },
  en: {
    nav: { platform: 'Platform', terms: 'Pricing', roadmap: 'Roadmap', faq: 'FAQ', login: 'Partner login', cta: 'Book a call' },
    hero: {
      eyebrow: 'For luxury-car rental companies in Switzerland',
      h1a: 'Your rental brand,', h1b: 'online in days.',
      lead: 'A premium booking website, a secure payment gateway and a dashboard. In your brand, on our engine.',
      cta1: 'Build my site', cta2: 'See how it works',
    },
    shift: {
      h2a: 'Your cars are exceptional.', h2b: 'Your booking experience should be too.',
      lead: 'Renters of a Lamborghini don’t want a DM, a PDF and a bank transfer. They expect to browse, pick dates, pay and confirm, in minutes.',
      rows: [
        ['Generic templates', 'No real-time availability, no online payment, no trust signals.'],
        ['Manual admin', 'Calendars in your head, invoices by hand, deposits chased over the phone.'],
        ['Lost premium guests', 'High-intent drivers drop off when booking isn’t instant and secure.'],
      ],
    },
    deliver: {
      h2: 'A complete platform, in your brand.',
      items: [
        ['Your website', 'A luxury-rental-specific site in your colours, fonts and logo. Built in days, on your own domain.'],
        ['Payment gateway', 'Secure online payments and deposits (Stripe). Guests pay upfront, payouts to your IBAN after each trip.'],
        ['Partner dashboard', 'Listings, prices, availability, bookings and payouts in one place, with real-time calendar sync.'],
      ],
      note: 'The layout, booking flow and security are our proven system. Only the brand is yours.',
    },
    dash: {
      h2: 'Run your whole fleet from one screen.',
      lead: 'Everything self-serve. No developer, no agency, no waiting.',
      feats: [
        ['Listings & photos', 'Add cars with specs and galleries, or import your whole fleet in one go.'],
        ['Pricing & rules', 'Set daily rates, deposits, mileage and delivery, per car, your terms.'],
        ['Bookings & calendar', 'Real-time availability, ICS sync, instant confirmations, no double-bookings.'],
        ['Payouts & analytics', 'See earnings, utilisation and trends. Payouts after each trip.'],
      ],
    },
    terms: {
      eyebrow: 'Pricing', h2: 'Fair, transparent, no lock-in.',
      popular: 'Most popular', mo: '/mo', commission: 'commission',
      sub: { free: 'Up to 3 cars', pro: 'Up to 25 cars', max: 'Unlimited cars' },
      feats: {
        free: ['AI studio thumbnails', 'Calendar sync (ICS)', 'Standard placement'],
        pro: ['Priority placement', 'Performance analytics', 'Faster payouts'],
        max: ['Featured placement', 'Team members, API', 'Dedicated support'],
      },
      note: 'The commission is on you, not your guests — it’s deducted straight from your payout. No guest service fee, no listing fees, no lock-in, payouts to your IBAN after every trip.',
    },
    onboard: {
      h2: 'From your site to live, in days.',
      steps: [
        ['Share your site', 'We read your brand, fleet and copy automatically.'],
        ['We build it', 'Your website and dashboard, populated with your cars.'],
        ['You review', 'Tweak prices, photos and text, sign off on a preview.'],
        ['Go live', 'Publish on your domain. Start taking bookings.'],
      ],
    },
    roadmap: {
      h2: 'It only gets stronger after you’re live.', soon: 'Coming',
      cards: [
        ['AIRLUXO marketplace', 'Soon we’ll also list your fleet on airluxo.ch, featured to vetted Swiss drivers.'],
        ['Mobile handover app', 'Digital pick-up and return: photo damage log, fuel, mileage, licence scan, e-signature.'],
        ['Smart pricing', 'Dynamic daily rates by demand, season and events, automatically.'],
      ],
    },
    faq: {
      eyebrow: 'FAQ', h2: 'Frequently asked questions',
      items: [
        ['What does AIRLUXO cost?', 'A monthly subscription (Free / Pro / Max — see Pricing) plus a per-booking commission deducted from your payout. The commission is on you, not your guests. No listing fees, no setup costs.'],
        ['How long until I’m live?', 'Usually a few days: share your existing site, we build your branded website and dashboard, you review, we go live.'],
        ['Do I keep my brand?', 'Yes. Your colours, fonts, logo and your own domain. AIRLUXO is just the engine underneath.'],
        ['How do payments and payouts work?', 'Guests pay securely online up front (Stripe), deposit included. Payouts to your IBAN after every trip, no chasing bank transfers.'],
        ['Is there a contract or commitment?', 'No. No minimum term, cancel monthly.'],
        ['Can I use my own domain?', 'Yes. Your site runs on your own domain (CNAME), not an AIRLUXO subdomain.'],
      ],
    },
    cta: { h2a: 'See your storefront,', h2b: 'live, in your brand.', lead: 'We’ll build a private preview of your branded site before you commit to a thing.', cta1: 'Book a call' },
    footer: {
      tagline: 'Your brand. Our engine.',
      colPlatform: 'Platform', colLegal: 'Legal', colContact: 'Contact',
      impressum: 'Imprint', privacy: 'Privacy', agb: 'Terms',
      rights: 'All rights reserved.', country: 'Switzerland',
    },
  },
};

const MAILTO = 'mailto:hello@airluxo.ch?subject=AIRLUXO%20Partnership';

export default function PartnerLanding({ onPartner }) {
  const { locale, setLocale } = useI18n();
  const reduce = useReducedMotion();
  const lang = locale === 'en' ? 'en' : 'de';
  const c = COPY[lang];

  const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
  const item = reduce
    ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.3 } } }
    : { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } };
  const hover = reduce ? {} : { whileHover: { y: -2 }, whileTap: { scale: 0.98 } };
  const [openFaq, setOpenFaq] = useState(0); // landing FAQ accordion (first open)

  // Reusable dark section wrapper with scroll-reveal + stagger.
  const Sec = ({ id, bg = 'bg-ink', children }) => (
    <motion.section id={id} variants={container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }}
      className={`${bg} text-paper`}>
      <div className="mx-auto max-w-[1080px] px-6 py-24 sm:px-8 lg:py-32">{children}</div>
    </motion.section>
  );

  return (
    <div className="min-h-[100dvh] bg-void text-paper">
      {/* header */}
      <header className="sticky top-0 z-50 border-b border-graphite/70 bg-void/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[64px] max-w-[1180px] items-center justify-between px-6 sm:px-8">
          <a href="#top" className="wordmark text-xl text-paper">AIR<span className="text-gold">LUXO</span></a>
          <nav className="hidden items-center gap-8 text-sm font-medium text-ash md:flex">
            <a href="#platform" className="transition-colors hover:text-paper">{c.nav.platform}</a>
            <a href="#terms" className="transition-colors hover:text-paper">{c.nav.terms}</a>
            <a href="#roadmap" className="transition-colors hover:text-paper">{c.nav.roadmap}</a>
            <a href="#faq" className="transition-colors hover:text-paper">{c.nav.faq}</a>
          </nav>
          <div className="flex items-center gap-4">
            <button onClick={onPartner} className="ring-lux hidden text-sm font-semibold text-ash transition-colors hover:text-paper sm:block">{c.nav.login}</button>
            <motion.a {...hover} href={MAILTO} className="ring-lux rounded-full bg-gold px-4 py-2 text-sm font-bold text-ink">{c.nav.cta}</motion.a>
          </div>
        </div>
      </header>

      {/* hero */}
      <section id="top" className="relative flex min-h-[88vh] items-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(110% 80% at 75% -10%, #1b1b22 0%, #060607 58%)' }} />
        <motion.div variants={container} initial="hidden" animate="show" className="relative mx-auto w-full max-w-[1080px] px-6 sm:px-8">
          <motion.div variants={item} className="eyebrow text-ash">{c.hero.eyebrow}</motion.div>
          <motion.h1 variants={item} className="font-display mt-6 text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
            {c.hero.h1a}<br /><span className="italic text-gold">{c.hero.h1b}</span>
          </motion.h1>
          <motion.p variants={item} className="mt-7 max-w-[46ch] text-lg leading-relaxed text-ash">{c.hero.lead}</motion.p>
          <motion.div variants={item} className="mt-10 flex flex-wrap items-center gap-3">
            <motion.a {...hover} href={MAILTO} className="ring-lux rounded-full bg-gold px-7 py-3.5 text-sm font-bold text-ink">{c.hero.cta1}</motion.a>
            <motion.a {...hover} href="#platform" className="ring-lux rounded-full border border-graphite px-7 py-3.5 text-sm font-bold text-paper transition-colors hover:border-ash">{c.hero.cta2}</motion.a>
          </motion.div>
        </motion.div>
      </section>

      {/* the shift — editorial statement + hairline problem list */}
      <Sec id="shift">
        <motion.h2 variants={item} className="font-display max-w-[18ch] text-3xl font-semibold leading-[1.08] tracking-tight sm:text-[2.7rem]">
          {c.shift.h2a}<br /><span className="text-ash">{c.shift.h2b}</span>
        </motion.h2>
        <motion.p variants={item} className="mt-6 max-w-[56ch] text-lg leading-relaxed text-ash">{c.shift.lead}</motion.p>
        <div className="mt-12 border-t border-graphite/70">
          {c.shift.rows.map(([h, p]) => (
            <motion.div variants={item} key={h} className="grid gap-1 border-b border-graphite/70 py-6 sm:grid-cols-[16rem_1fr] sm:gap-8">
              <h3 className="font-display text-lg text-paper">{h}</h3>
              <p className="text-ash">{p}</p>
            </motion.div>
          ))}
        </div>
      </Sec>

      {/* what we deliver — three numbered offerings (no card chrome) */}
      <Sec id="platform" bg="bg-coal">
        <motion.h2 variants={item} className="font-display max-w-[16ch] text-3xl font-semibold tracking-tight sm:text-[2.7rem]">{c.deliver.h2}</motion.h2>
        <div className="mt-14 grid gap-x-10 gap-y-12 md:grid-cols-3">
          {c.deliver.items.map(([h, p], i) => (
            <motion.div variants={item} key={h}>
              <div className="font-display text-2xl font-semibold text-gold">{String(i + 1).padStart(2, '0')}</div>
              <h3 className="font-display mt-4 text-xl text-paper">{h}</h3>
              <p className="mt-3 leading-relaxed text-ash">{p}</p>
            </motion.div>
          ))}
        </div>
        <motion.p variants={item} className="mt-14 max-w-[60ch] border-t border-graphite/70 pt-8 text-lg text-ash">{c.deliver.note}</motion.p>
      </Sec>

      {/* dashboard — split: statement + hairline feature list */}
      <Sec id="dashboard">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <motion.div variants={item}>
            <h2 className="font-display max-w-[12ch] text-3xl font-semibold leading-[1.08] tracking-tight sm:text-[2.7rem]">{c.dash.h2}</h2>
            <p className="mt-5 max-w-[36ch] text-lg text-ash">{c.dash.lead}</p>
          </motion.div>
          <div className="border-t border-graphite/70">
            {c.dash.feats.map(([h, p], i) => (
              <motion.div variants={item} key={h} className="flex gap-5 border-b border-graphite/70 py-5">
                <span className="font-display text-sm font-bold text-gold">{String(i + 1).padStart(2, '0')}</span>
                <div><h3 className="font-display text-base text-paper">{h}</h3><p className="mt-1 text-sm text-ash">{p}</p></div>
              </motion.div>
            ))}
          </div>
        </div>
        <motion.div variants={item}>
          <DashboardCarousel />
        </motion.div>
      </Sec>

      {/* pricing */}
      <Sec id="terms" bg="bg-coal">
        <motion.div variants={item} className="eyebrow text-ash">{c.terms.eyebrow}</motion.div>
        <motion.h2 variants={item} className="font-display mt-3 text-3xl font-semibold tracking-tight sm:text-[2.7rem]">{c.terms.h2}</motion.h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {PLAN_ORDER.map((id) => {
            const p = PLANS[id]; const pop = !!p.popular;
            return (
              <motion.div variants={item} key={id} className={`relative flex flex-col rounded-[var(--radius-card)] border bg-ink p-7 ${pop ? 'border-gold' : 'border-graphite/70'}`}>
                {pop && <span className="absolute -top-3 left-7 rounded-full bg-gold px-3 py-1 text-[0.62rem] font-bold uppercase tracking-wider text-ink">{c.terms.popular}</span>}
                <div className="eyebrow text-ash">{p.name}</div>
                <div className="font-display mt-2 text-4xl font-semibold leading-none text-paper">CHF&nbsp;{p.price}<span className="text-base font-medium text-ash"> {c.terms.mo}</span></div>
                <div className="mt-1.5 text-sm font-bold text-gold">{p.commission}% {c.terms.commission}</div>
                <p className="mt-3 text-sm text-ash">{c.terms.sub[id]}</p>
                <ul className="mt-5 grid gap-2.5 border-t border-graphite/70 pt-5 text-sm text-ash">
                  {c.terms.feats[id].map((f) => <li key={f} className="flex gap-2"><span className="text-gold">+</span>{f}</li>)}
                </ul>
              </motion.div>
            );
          })}
        </div>
        <motion.p variants={item} className="mt-7 max-w-[64ch] text-sm text-ash">{c.terms.note}</motion.p>
      </Sec>

      {/* onboarding — four steps */}
      <Sec id="onboard">
        <motion.h2 variants={item} className="font-display max-w-[16ch] text-3xl font-semibold tracking-tight sm:text-[2.7rem]">{c.onboard.h2}</motion.h2>
        <div className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {c.onboard.steps.map(([h, p], i) => (
            <motion.div variants={item} key={h}>
              <div className="font-display text-3xl font-semibold text-gold">{i + 1}</div>
              <h3 className="font-display mt-3 text-lg text-paper">{h}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ash">{p}</p>
            </motion.div>
          ))}
        </div>
      </Sec>

      {/* roadmap */}
      <Sec id="roadmap" bg="bg-coal">
        <motion.h2 variants={item} className="font-display max-w-[20ch] text-3xl font-semibold tracking-tight sm:text-[2.7rem]">{c.roadmap.h2}</motion.h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {c.roadmap.cards.map(([h, p]) => (
            <motion.div variants={item} key={h} className="rounded-[var(--radius-card)] border border-graphite/70 bg-ink p-7">
              <span className="rounded-full border border-gold/40 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-wider text-gold">{c.roadmap.soon}</span>
              <h3 className="font-display mt-5 text-xl text-paper">{h}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ash">{p}</p>
            </motion.div>
          ))}
        </div>
      </Sec>

      {/* FAQ */}
      <Sec id="faq" bg="bg-ink">
        <motion.div variants={item} className="eyebrow text-gold">{c.faq.eyebrow}</motion.div>
        <motion.h2 variants={item} className="font-display mt-3 text-3xl font-semibold tracking-tight sm:text-[2.7rem]">{c.faq.h2}</motion.h2>
        <div className="mt-12 divide-y divide-graphite/70 border-y border-graphite/70">
          {c.faq.items.map(([q, a], i) => {
            const open = openFaq === i;
            return (
              <motion.div variants={item} key={q}>
                <button type="button" onClick={() => setOpenFaq(open ? -1 : i)}
                  className="ring-lux flex w-full items-center justify-between gap-6 py-6 text-left">
                  <span className="font-display text-lg text-paper sm:text-xl">{q}</span>
                  <span className={`shrink-0 text-2xl font-light text-gold transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
                </button>
                <div className={`grid transition-all duration-300 ${open ? 'grid-rows-[1fr] pb-6 opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <p className="overflow-hidden max-w-[68ch] text-[1.02rem] leading-relaxed text-ash">{a}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </Sec>

      {/* CTA */}
      <section className="relative overflow-hidden bg-void">
        <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(100% 80% at 50% 120%, #1b1b22 0%, #060607 60%)' }} />
        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.35 }} className="relative mx-auto max-w-[1080px] px-6 py-28 text-center sm:px-8 lg:py-36">
          <motion.h2 variants={item} className="font-display text-4xl font-semibold leading-[1.04] tracking-tight sm:text-6xl">{c.cta.h2a}<br /><span className="italic text-gold">{c.cta.h2b}</span></motion.h2>
          <motion.p variants={item} className="mx-auto mt-6 max-w-[46ch] text-lg text-ash">{c.cta.lead}</motion.p>
          <motion.div variants={item} className="mt-10 flex flex-wrap justify-center gap-3">
            <motion.a {...hover} href={MAILTO} className="ring-lux rounded-full bg-gold px-8 py-4 text-sm font-bold text-ink">{c.cta.cta1}</motion.a>
            <motion.button {...hover} onClick={onPartner} className="ring-lux rounded-full border border-graphite px-8 py-4 text-sm font-bold text-paper transition-colors hover:border-ash">{c.nav.login}</motion.button>
          </motion.div>
        </motion.div>
      </section>

      {/* footer — legal, address, language switch */}
      <footer className="border-t border-graphite/70 bg-ink">
        <div className="mx-auto max-w-[1080px] px-6 py-16 sm:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="wordmark text-lg text-paper">AIR<span className="text-gold">LUXO</span></div>
              <p className="mt-3 text-sm text-ash">{c.footer.tagline}</p>
            </div>
            <div>
              <div className="eyebrow text-ash">{c.footer.colPlatform}</div>
              <ul className="mt-4 grid gap-2.5 text-sm text-ash">
                <li><a href="#platform" className="transition-colors hover:text-paper">{c.nav.platform}</a></li>
                <li><a href="#terms" className="transition-colors hover:text-paper">{c.nav.terms}</a></li>
                <li><a href="#roadmap" className="transition-colors hover:text-paper">{c.nav.roadmap}</a></li>
                <li><button onClick={onPartner} className="ring-lux transition-colors hover:text-paper">{c.nav.login}</button></li>
              </ul>
            </div>
            <div>
              <div className="eyebrow text-ash">{c.footer.colLegal}</div>
              <ul className="mt-4 grid gap-2.5 text-sm text-ash">
                <li><a href="/?impressum" className="transition-colors hover:text-paper">{c.footer.impressum}</a></li>
                <li><a href="/?privacy" className="transition-colors hover:text-paper">{c.footer.privacy}</a></li>
                <li><a href="/?agb" className="transition-colors hover:text-paper">{c.footer.agb}</a></li>
              </ul>
            </div>
            <div>
              <div className="eyebrow text-ash">{c.footer.colContact}</div>
              <ul className="mt-4 grid gap-2.5 text-sm text-ash">
                <li><a href={MAILTO} className="transition-colors hover:text-paper">hello@airluxo.ch</a></li>
                <li>AIRLUXO · Franco Steiner</li>
                <li>Golattenmattgasse 21</li>
                <li>5000 Aarau, {c.footer.country}</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-graphite/70 pt-6 text-xs text-ash sm:flex-row">
            <span>© {new Date().getFullYear()} AIRLUXO · {c.footer.rights}</span>
            <div className="flex items-center rounded-full border border-graphite text-xs font-bold">
              {['de', 'en'].map((lc) => (
                <button key={lc} onClick={() => setLocale(lc)}
                  className={`rounded-full px-3 py-1 uppercase transition-colors ${lang === lc ? 'bg-gold text-ink' : 'text-ash hover:text-paper'}`}>{lc}</button>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
