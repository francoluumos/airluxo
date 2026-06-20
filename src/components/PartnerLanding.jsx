import { useEffect } from 'react';
import { motion } from 'motion/react';
import { useI18n } from '../lib/i18n.jsx';
import { PLANS, PLAN_ORDER } from '../lib/plans.js';

// AIRLUXO public site — PARTNER-ACQUISITION mode (Phase 1). airluxo.ch shows this value
// proposition aimed at luxury-car rental companies; the consumer booking marketplace is
// hidden behind VITE_CONSUMER_LIVE until Phase 2. Bilingual DE (default) + EN — the same
// `locale` the rest of the app uses; the toggle here flips it globally.

const rise = { hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.2, 0.7, 0.2, 1] } } };
const stagger = { show: { transition: { staggerChildren: 0.08 } } };

const COPY = {
  de: {
    nav: { platform: 'Plattform', terms: 'Konditionen', roadmap: 'Roadmap', login: 'Partner-Login', cta: 'Gespräch buchen' },
    hero: {
      eyebrow: 'Für die Luxus-Autovermietungen der Schweiz',
      h1a: 'Ihre Vermietung,', h1b: 'online in Tagen.',
      lead: 'AIRLUXO baut Ihnen eine erstklassige Buchungs-Website, ein sicheres Payment-Gateway und ein Management-Dashboard — in Ihrer Marke, auf unserer Engine. Sie behalten die Schlüssel, wir betreiben die Technik.',
      cta1: 'Meine Website bauen', cta2: 'So funktioniert’s',
    },
    shift: {
      eyebrow: 'Der Wandel',
      h2: 'Ihre Autos sind aussergewöhnlich. Ihr Buchungserlebnis sollte es auch sein.',
      big: 'Wer einen Lamborghini mietet, will keine DM, kein PDF und keine Banküberweisung.',
      p: 'Gäste erwarten: stöbern, Daten wählen, bezahlen, bestätigen — in Minuten, auf einer Seite, die so edel wirkt wie das Auto. Die meisten Luxusvermieter arbeiten mit generischen Vorlagen, WhatsApp und manueller Administration. Diese Reibung kostet Buchungen.',
      cards: [
        ['Generisches Wix / Insta-DMs', 'Keine Echtzeit-Verfügbarkeit, keine Online-Zahlung, keine Vertrauenssignale.'],
        ['Manuelle Administration', 'Kalender im Kopf, Rechnungen von Hand, Kautionen am Telefon hinterhergejagt.'],
        ['Verlorene Premium-Gäste', 'Kaufbereite Fahrer springen ab, wenn die Buchung nicht sofort und sicher ist.'],
      ],
    },
    deliver: {
      eyebrow: 'Was wir liefern',
      h2: 'Eine komplette Luxus-Vermietungsplattform — in Ihrer Marke.',
      cards: [
        ['Ihre Website', 'Eine auf Luxus-Autovermietung spezialisierte Seite in Ihren Farben, Schriften und Ihrem Logo — Hero, Flotte, Fahrzeugdetail, alles. In Tagen aus Ihrer bestehenden Seite gebaut, auf Ihrer eigenen Domain.'],
        ['Payment-Gateway', 'Sichere Online-Zahlungen & Kautionen integriert (Stripe). Gäste zahlen vorab; Auszahlungen auf Ihr IBAN nach jeder Miete. Kein Hinterherjagen von Überweisungen.'],
        ['Partner-Dashboard', 'Ein Ort für Inserate, Preise, Verfügbarkeit, Buchungen und Auszahlungen — mit Echtzeit-Kalendersync und Analytics.'],
      ],
      note: 'Layout, Buchungsfluss und Sicherheit sind AIRLUXOs bewährtes System. Nur die Marke ist Ihre — es sieht aus wie Sie und funktioniert wie eine Plattform, die Jahre gebraucht hätte.',
    },
    dash: {
      eyebrow: 'Das Partner-Dashboard',
      h2: 'Ihre ganze Flotte von einem Bildschirm.',
      p: 'Alles in Selbstbedienung — kein Entwickler, keine Agentur, kein Warten auf uns.',
      feats: [
        ['Inserate & Fotos', 'Fahrzeuge mit Spezifikationen, Galerien und Studio-Thumbnails hinzufügen — oder die ganze Flotte in einem Schritt importieren.'],
        ['Preise & Regeln', 'Tagespreise, Kautionen, Kilometer, grenzüberschreitend und Lieferung festlegen — pro Auto, zu Ihren Bedingungen.'],
        ['Buchungen & Kalender', 'Echtzeit-Verfügbarkeit, ICS-Sync, sofortige Bestätigungen — keine Doppelbuchungen.'],
        ['Auszahlungen & Analytics', 'Einnahmen, Auslastung und Trends sehen; Auszahlungen auf Ihr IBAN nach jeder Miete.'],
      ],
    },
    terms: {
      eyebrow: 'Einfache Konditionen · Abonnemente',
      h2: 'Fair, transparent, keine Bindung.',
      popular: 'Beliebteste', mo: '/Mt.', commission: 'Kommission',
      sub: { free: 'Bis 3 Autos · Einstieg', pro: 'Bis 25 Autos · für wachsende Flotten', max: 'Unbegrenzte Autos · für grosse Anbieter' },
      feats: {
        free: ['KI-Studio-Thumbnails', 'Kalendersync (ICS)', 'Standard-Platzierung'],
        pro: ['Priorisierte Platzierung', 'Performance-Analytics', 'Schnellere Auszahlungen'],
        max: ['Featured-Platzierung', 'Team-Mitglieder · API', 'Dedizierter Support'],
      },
      note: 'Gäste zahlen eine kleine Servicegebühr — nicht Sie. Keine Inseratsgebühren, keine Bindung, Auszahlungen auf Ihr IBAN nach jeder Miete.',
    },
    onboard: {
      eyebrow: 'Von Ihrer Seite zu live — in Tagen',
      h2: 'Vier Schritte. Den Grossteil übernehmen wir.',
      steps: [
        ['Seite teilen', 'Wir lesen Marke, Flotte und Texte automatisch.'],
        ['Wir bauen', 'Ihre Marken-Website + Dashboard, mit Ihren Autos befüllt.'],
        ['Sie prüfen', 'Preise, Fotos und Texte anpassen — Freigabe per privater Vorschau.'],
        ['Live gehen', 'Auf Ihrer eigenen Domain veröffentlichen. Buchungen & Zahlungen starten.'],
      ],
    },
    roadmap: {
      eyebrow: 'Auf der Roadmap', soon: 'Demnächst',
      h2: 'Nach dem Start wird’s nur stärker.',
      cards: [
        ['AIRLUXO-Marktplatz', 'Bald listen wir Ihre Flotte zusätzlich auf airluxo.ch — sichtbar für geprüfte Schweizer Fahrer, die etwas Selteneres als eine Limousine suchen.'],
        ['Mobile Übergabe-App', 'Digitale Annahme & Rückgabe auf dem Handy: Foto-Schadensprotokoll, Tank & Kilometer, Führerausweis-Scan und E-Signatur — beweissicher für jede Abholung und Rückgabe.'],
        ['Smart Pricing', 'Dynamische Tagespreise nach Nachfrage, Saison und Events — Ihre Autos erzielen automatisch den richtigen Preis.'],
      ],
      note: 'Ihr Abonnement wächst mit der Plattform — neue Tools kommen zu den Partnern, sobald sie live gehen.',
    },
    cta: {
      eyebrow: 'Lassen Sie uns bauen',
      h2a: 'Sehen Sie Ihren Auftritt,', h2b: 'live, in Ihrer Marke.',
      lead: 'Wir bauen eine private Vorschau Ihrer Marken-Website — Ihre Autos, Ihre Farben — bevor Sie sich zu irgendetwas verpflichten.',
      cta1: 'Gespräch buchen', cta2: 'airluxo.ch besuchen',
    },
    footer: { tagline: 'Ihre Marke. Unsere Engine.', rights: 'Alle Rechte vorbehalten.' },
  },
  en: {
    nav: { platform: 'Platform', terms: 'Pricing', roadmap: 'Roadmap', login: 'Partner login', cta: 'Book a call' },
    hero: {
      eyebrow: 'For Switzerland’s luxury-car rental companies',
      h1a: 'Your rental brand,', h1b: 'online in days.',
      lead: 'AIRLUXO builds you a premium booking website, a secure payment gateway and a management dashboard — in your brand, on our engine. You keep the keys; we run the tech.',
      cta1: 'Build my site', cta2: 'See how it works',
    },
    shift: {
      eyebrow: 'The shift',
      h2: 'Your cars are exceptional. Your booking experience should be too.',
      big: 'Renters of a Lamborghini don’t want a DM, a PDF and a bank transfer.',
      p: 'They expect to browse, choose dates, pay and confirm — in minutes, on a site that feels as premium as the car. Most luxury rental companies run on generic templates, WhatsApp and manual admin. That friction costs bookings.',
      cards: [
        ['Generic Wix / Insta DMs', 'No real-time availability, no online payment, no trust signals.'],
        ['Manual admin', 'Calendars in your head, invoices by hand, deposits chased over the phone.'],
        ['Lost premium guests', 'High-intent drivers drop off when booking isn’t instant and secure.'],
      ],
    },
    deliver: {
      eyebrow: 'What we deliver',
      h2: 'A complete luxury rental platform — in your brand.',
      cards: [
        ['Your website', 'A luxury-car-rental-specific site in your colours, fonts and logo — hero, fleet, car detail, the lot. Built from your existing site in days, on your own domain.'],
        ['Payment gateway', 'Secure online payments & deposits built in (Stripe). Guests pay upfront; payouts land in your IBAN after each trip. No more chasing transfers.'],
        ['Partner dashboard', 'One place to manage listings, prices, availability, bookings and payouts — with real-time calendar sync and analytics.'],
      ],
      note: 'The layout, booking flow and security are AIRLUXO’s proven system. Only the brand is yours — so it looks like you, and works like a platform that took years to build.',
    },
    dash: {
      eyebrow: 'The partner dashboard',
      h2: 'Run your whole fleet from one screen.',
      p: 'Everything self-serve — no developer, no agency, no waiting on us.',
      feats: [
        ['Listings & photos', 'Add cars with specs, galleries and studio thumbnails — or import your whole fleet in one go.'],
        ['Pricing & rules', 'Set daily rates, deposits, mileage, cross-border and delivery — per car, your terms.'],
        ['Bookings & calendar', 'Real-time availability, ICS sync, instant confirmations — no double-bookings.'],
        ['Payouts & analytics', 'See earnings, utilisation and trends; payouts to your IBAN after each trip.'],
      ],
    },
    terms: {
      eyebrow: 'Simple terms · subscriptions',
      h2: 'Fair, transparent, no lock-in.',
      popular: 'Most popular', mo: '/mo', commission: 'commission',
      sub: { free: 'Up to 3 cars · get started', pro: 'Up to 25 cars · for growing fleets', max: 'Unlimited cars · for large operators' },
      feats: {
        free: ['AI studio thumbnails', 'Calendar sync (ICS)', 'Standard placement'],
        pro: ['Priority placement', 'Performance analytics', 'Faster payouts'],
        max: ['Featured placement', 'Team members · API', 'Dedicated support'],
      },
      note: 'Guests pay a small service fee — not you. No listing fees, no lock-in, payouts to your IBAN after every trip.',
    },
    onboard: {
      eyebrow: 'From your site to live — in days',
      h2: 'Four steps. We do the heavy lifting.',
      steps: [
        ['Share your site', 'We read your brand, fleet and copy automatically.'],
        ['We build it', 'Your branded site + dashboard, populated with your cars.'],
        ['You review', 'Tweak prices, photos and text — sign off on a private preview.'],
        ['Go live', 'Publish on your own domain. Start taking bookings & payments.'],
      ],
    },
    roadmap: {
      eyebrow: 'On the roadmap', soon: 'Coming',
      h2: 'It only gets more powerful after you’re live.',
      cards: [
        ['AIRLUXO marketplace', 'Soon we’ll also list your fleet on airluxo.ch — featured to vetted Swiss drivers looking for something rarer than a sedan.'],
        ['Mobile handover app', 'Digital pick-up & return on your phone: photo damage log, fuel & mileage, licence scan and e-signature — a dispute-proof record for every handover.'],
        ['Smart pricing', 'Dynamic daily rates by demand, season and events — your cars earn the right price automatically.'],
      ],
      note: 'Your subscription grows with the platform — new tools roll out to partners as they ship.',
    },
    cta: {
      eyebrow: 'Let’s build it',
      h2a: 'See your storefront,', h2b: 'live, in your brand.',
      lead: 'We’ll build a private preview of your branded site — your cars, your colours — before you commit a thing.',
      cta1: 'Book a call', cta2: 'Visit airluxo.ch',
    },
    footer: { tagline: 'Your brand. Our engine.', rights: 'All rights reserved.' },
  },
};

const MAILTO = 'mailto:hello@airluxo.ch?subject=AIRLUXO%20Partnership';

function Section({ id, dark, children }) {
  return (
    <section id={id} className={dark ? 'bg-ink text-paper' : 'bg-paper text-ink'}>
      <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}
        className="mx-auto max-w-[1160px] px-5 py-20 sm:px-8 lg:py-28">{children}</motion.div>
    </section>
  );
}
const Eyebrow = ({ children }) => <motion.div variants={rise} className="eyebrow text-stone">{children}</motion.div>;

export default function PartnerLanding({ onPartner }) {
  const { locale, setLocale } = useI18n();
  const lang = locale === 'en' ? 'en' : 'de'; // marketing copy is DE/EN; anything else → German (Swiss default)
  const c = COPY[lang];

  useEffect(() => { document.body.style.overflow = ''; }, []);

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* nav */}
      <header className="sticky top-0 z-50 border-b border-graphite bg-ink/80 text-paper backdrop-blur-xl">
        <div className="mx-auto flex h-[64px] max-w-[1240px] items-center justify-between px-5 sm:px-8">
          <a href="#top" className="wordmark text-xl">AIR<span className="text-gold">LUXO</span></a>
          <nav className="hidden items-center gap-7 text-sm font-medium text-ash md:flex">
            <a href="#deliver" className="transition-colors hover:text-paper">{c.nav.platform}</a>
            <a href="#terms" className="transition-colors hover:text-paper">{c.nav.terms}</a>
            <a href="#roadmap" className="transition-colors hover:text-paper">{c.nav.roadmap}</a>
          </nav>
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-full border border-graphite text-xs font-bold">
              {['de', 'en'].map((lc) => (
                <button key={lc} onClick={() => setLocale(lc)}
                  className={`rounded-full px-2.5 py-1 uppercase transition-colors ${lang === lc ? 'bg-gold text-ink' : 'text-ash hover:text-paper'}`}>{lc}</button>
              ))}
            </div>
            <button onClick={onPartner} className="ring-lux hidden text-sm font-semibold text-ash transition-colors hover:text-paper sm:block">{c.nav.login}</button>
            <a href={MAILTO} className="ring-lux rounded-full bg-gold px-4 py-2 text-sm font-bold text-ink transition-colors hover:bg-gold-soft">{c.nav.cta}</a>
          </div>
        </div>
      </header>

      {/* hero */}
      <section id="top" className="relative overflow-hidden bg-void text-paper">
        <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 70% 0%, #15151a 0%, #060607 60%)' }} />
        <motion.div variants={stagger} initial="hidden" animate="show" className="relative mx-auto max-w-[1160px] px-5 py-28 sm:px-8 lg:py-36">
          <Eyebrow>{c.hero.eyebrow}</Eyebrow>
          <motion.h1 variants={rise} className="font-display mt-5 text-[clamp(2.7rem,6vw,5rem)] font-semibold leading-[0.96]">
            {c.hero.h1a}<br /><span className="italic text-gold">{c.hero.h1b}</span>
          </motion.h1>
          <motion.p variants={rise} className="mt-6 max-w-2xl text-[1.05rem] leading-relaxed text-ash">{c.hero.lead}</motion.p>
          <motion.div variants={rise} className="mt-9 flex flex-wrap gap-3">
            <a href={MAILTO} className="ring-lux rounded-full bg-gold px-7 py-3.5 text-sm font-bold text-ink transition-transform hover:-translate-y-0.5">{c.hero.cta1} →</a>
            <a href="#deliver" className="ring-lux rounded-full border border-graphite px-7 py-3.5 text-sm font-bold text-paper transition-colors hover:border-ash">{c.hero.cta2}</a>
          </motion.div>
        </motion.div>
      </section>

      {/* the shift */}
      <Section id="shift">
        <Eyebrow>{c.shift.eyebrow}</Eyebrow>
        <motion.h2 variants={rise} className="font-display mt-3 max-w-[20ch] text-[clamp(1.9rem,4.2vw,3.2rem)] leading-[1.02]">{c.shift.h2}</motion.h2>
        <div className="mt-12 grid gap-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <motion.div variants={rise}>
            <p className="font-display max-w-[20ch] text-[clamp(1.5rem,3vw,2.3rem)] font-semibold leading-[1.08] tracking-tight">{c.shift.big}</p>
            <p className="mt-5 max-w-[48ch] text-stone">{c.shift.p}</p>
          </motion.div>
          <motion.div variants={rise} className="grid gap-3.5">
            {c.shift.cards.map(([h, p]) => (
              <div key={h} className="rounded-[var(--radius-card)] border border-mist bg-cloud p-6">
                <h3 className="font-display text-lg">{h}</h3><p className="mt-1.5 text-sm text-stone">{p}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* what we deliver */}
      <Section id="deliver" dark>
        <Eyebrow>{c.deliver.eyebrow}</Eyebrow>
        <motion.h2 variants={rise} className="font-display mt-3 text-[clamp(1.9rem,4.2vw,3.2rem)] leading-[1.02]">{c.deliver.h2}</motion.h2>
        <motion.div variants={rise} className="mt-11 grid gap-6 md:grid-cols-3">
          {c.deliver.cards.map(([h, p], i) => (
            <div key={h} className="rounded-[var(--radius-card)] border border-graphite bg-coal p-7">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gold/15 font-display text-lg font-bold text-gold">{['◆', '⛨', '▤'][i]}</div>
              <h3 className="font-display mt-4 text-xl">{h}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-ash">{p}</p>
            </div>
          ))}
        </motion.div>
        <motion.p variants={rise} className="mt-8 max-w-[64ch] text-ash">{c.deliver.note}</motion.p>
      </Section>

      {/* dashboard */}
      <Section id="dashboard">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <motion.div variants={rise}>
            <Eyebrow>{c.dash.eyebrow}</Eyebrow>
            <h2 className="font-display mt-3 max-w-[14ch] text-[clamp(1.9rem,4.2vw,3.2rem)] leading-[1.02]">{c.dash.h2}</h2>
            <p className="mt-4 max-w-[42ch] text-stone">{c.dash.p}</p>
          </motion.div>
          <motion.div variants={rise}>
            {c.dash.feats.map(([h, p], i) => (
              <div key={h} className="flex items-start gap-4 border-t border-mist py-5">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold/14 font-display font-bold text-gold">{String(i + 1).padStart(2, '0')}</div>
                <div><h3 className="font-display text-base">{h}</h3><p className="mt-1 text-sm text-stone">{p}</p></div>
              </div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* terms */}
      <Section id="terms">
        <Eyebrow>{c.terms.eyebrow}</Eyebrow>
        <motion.h2 variants={rise} className="font-display mt-3 text-[clamp(1.9rem,4.2vw,3.2rem)] leading-[1.02]">{c.terms.h2}</motion.h2>
        <motion.div variants={rise} className="mt-11 grid gap-5 md:grid-cols-3">
          {PLAN_ORDER.map((id) => {
            const p = PLANS[id]; const pop = !!p.popular;
            return (
              <div key={id} className={`relative flex flex-col rounded-[var(--radius-card)] border p-7 ${pop ? 'border-gold shadow-[0_30px_70px_-50px_rgba(184,145,80,.7)]' : 'border-mist'} bg-cloud`}>
                {pop && <span className="absolute -top-3 left-7 rounded-full bg-gold px-3 py-1 text-[0.62rem] font-bold uppercase tracking-wider text-ink">{c.terms.popular}</span>}
                <div className="eyebrow text-stone">{p.name}</div>
                <div className="font-display mt-1.5 text-[2.6rem] font-semibold leading-none">CHF&nbsp;{p.price}<span className="text-base font-medium text-stone"> {c.terms.mo}</span></div>
                <div className="mt-1 text-sm font-bold text-gold">{p.commission}% {c.terms.commission}</div>
                <p className="mt-3 text-sm text-stone">{c.terms.sub[id]}</p>
                <ul className="mt-4 grid gap-2 text-sm text-stone">
                  {c.terms.feats[id].map((f) => <li key={f}><span className="text-gold">—&nbsp;</span>{f}</li>)}
                </ul>
              </div>
            );
          })}
        </motion.div>
        <motion.p variants={rise} className="mt-6 text-sm text-stone">{c.terms.note}</motion.p>
      </Section>

      {/* onboarding */}
      <Section id="onboard" dark>
        <Eyebrow>{c.onboard.eyebrow}</Eyebrow>
        <motion.h2 variants={rise} className="font-display mt-3 text-[clamp(1.9rem,4.2vw,3.2rem)] leading-[1.02]">{c.onboard.h2}</motion.h2>
        <motion.div variants={rise} className="mt-11 grid gap-6 md:grid-cols-4">
          {c.onboard.steps.map(([h, p], i) => (
            <div key={h} className="rounded-[var(--radius-card)] border border-graphite bg-coal p-6">
              <div className="font-display text-3xl font-semibold text-gold">{i + 1}</div>
              <h3 className="font-display mt-2 text-base">{h}</h3><p className="mt-1.5 text-sm text-ash">{p}</p>
            </div>
          ))}
        </motion.div>
      </Section>

      {/* roadmap */}
      <Section id="roadmap">
        <Eyebrow>{c.roadmap.eyebrow}</Eyebrow>
        <motion.h2 variants={rise} className="font-display mt-3 max-w-[22ch] text-[clamp(1.9rem,4.2vw,3.2rem)] leading-[1.02]">{c.roadmap.h2}</motion.h2>
        <motion.div variants={rise} className="mt-11 grid gap-6 md:grid-cols-3">
          {c.roadmap.cards.map(([h, p]) => (
            <div key={h} className="rounded-[var(--radius-card)] border border-mist bg-cloud p-7">
              <span className="rounded-full border border-gold/40 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-wider text-gold">{c.roadmap.soon}</span>
              <h3 className="font-display mt-4 text-xl">{h}</h3><p className="mt-2.5 text-sm leading-relaxed text-stone">{p}</p>
            </div>
          ))}
        </motion.div>
        <motion.p variants={rise} className="mt-6 text-sm text-stone">{c.roadmap.note}</motion.p>
      </Section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-void text-paper">
        <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 0%, #15151a 0%, #060607 60%)' }} />
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.4 }} className="relative mx-auto max-w-[1160px] px-5 py-28 text-center sm:px-8">
          <Eyebrow>{c.cta.eyebrow}</Eyebrow>
          <motion.h2 variants={rise} className="font-display mt-4 text-[clamp(2.4rem,5.5vw,4.4rem)] leading-[0.98]">{c.cta.h2a}<br /><span className="italic text-gold">{c.cta.h2b}</span></motion.h2>
          <motion.p variants={rise} className="mx-auto mt-5 max-w-2xl text-ash">{c.cta.lead}</motion.p>
          <motion.div variants={rise} className="mt-9 flex flex-wrap justify-center gap-3">
            <a href={MAILTO} className="ring-lux rounded-full bg-gold px-7 py-3.5 text-sm font-bold text-ink transition-transform hover:-translate-y-0.5">{c.cta.cta1} →</a>
            <button onClick={onPartner} className="ring-lux rounded-full border border-graphite px-7 py-3.5 text-sm font-bold text-paper transition-colors hover:border-ash">{c.nav.login}</button>
          </motion.div>
          <motion.p variants={rise} className="mt-10 text-sm text-ash">hello@airluxo.ch · airluxo.ch · {lang === 'de' ? 'Schweiz' : 'Switzerland'}</motion.p>
        </motion.div>
      </section>

      <footer className="border-t border-mist bg-paper">
        <div className="mx-auto flex max-w-[1160px] flex-col items-center justify-between gap-3 px-5 py-8 text-xs text-stone sm:flex-row sm:px-8">
          <span className="wordmark text-base text-ink">AIR<span className="text-gold">LUXO</span></span>
          <span>{c.footer.tagline}</span>
          <span>© {new Date().getFullYear()} AIRLUXO · {c.footer.rights}</span>
        </div>
      </footer>
    </div>
  );
}
