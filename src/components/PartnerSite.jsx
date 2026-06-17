import { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import CarCard from './CarCard.jsx';
import CarDetail from './CarDetail.jsx';
import { fetchPartnerListings } from '../lib/listings.js';
import { brandKitToVars, loadBrandFont } from '../lib/brandkit.js';
import { fetchPublicSite, fetchPublicSiteByHost, mapSiteConfig } from '../lib/site.js';
import { LEGAL_TABS } from '../lib/legal.js';

// Public white-label partner site: a partner's full home (hero/USP, about, benefits,
// contact) + their fleet + the AIRLUXO booking flow, themed by their brand kit over
// AIRLUXO's UI/UX (only colours/fonts/logo change). Served at /p/<slug> (and on the
// partner's own domain via host resolution, U12). Only published sites resolve.
export default function PartnerSite({ slugOrKey, host }) {
  const [site, setSite] = useState(undefined); // undefined = loading, null = not found
  const [cars, setCars] = useState(null);
  const [active, setActive] = useState(null);
  const [legalView, setLegalView] = useState(null); // 'impressum' | 'privacy' | 'terms'

  useEffect(() => {
    let on = true;
    const load = host ? fetchPublicSiteByHost(host) : fetchPublicSite(slugOrKey);
    load.then((s) => {
      if (!on) return;
      setSite(s);
      if (s?.partner_id) fetchPartnerListings(s.partner_id).then((r) => on && setCars(r)).catch(() => on && setCars([]));
    }).catch(() => on && setSite(null));
    return () => { on = false; };
  }, [slugOrKey, host]);

  useEffect(() => { if (site?.brand_kit?.fonts?.url) loadBrandFont(site.brand_kit.fonts.url); }, [site]);
  useEffect(() => { document.body.style.overflow = active ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [active]);

  if (site === undefined) return <div className="grid min-h-screen place-items-center bg-paper text-stone">Loading…</div>;
  if (!site) return (
    <div className="grid min-h-screen place-items-center bg-paper px-6 text-center">
      <div>
        <div className="font-display text-2xl text-ink">Site not found</div>
        <a href="https://airluxo.ch" className="mt-3 inline-block text-sm text-gold hover:underline">airluxo.ch</a>
      </div>
    </div>
  );

  const kit = site.brand_kit || {};
  const cfg = mapSiteConfig(site.site_config, {}, site.company_name);
  const { hero, about, benefits, contact } = cfg.sections;
  const rootStyle = brandKitToVars(kit) || undefined;
  const navLabels = { fleet: 'Fleet', about: 'About', contact: 'Contact' };
  const hasContact = contact?.email || contact?.phone || contact?.address;
  const lp = site.legal_pages || {};
  const legalPages = LEGAL_TABS.filter(([k]) => (lp[k] || '').trim());

  return (
    <div style={rootStyle} className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-mist bg-paper/90 px-5 py-3 backdrop-blur sm:px-8">
        {kit.logo_url
          ? <img src={kit.logo_url} alt={site.company_name} className="h-8 max-w-[50%] object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          : <span className="font-display text-lg">{site.company_name}</span>}
        <nav className="flex items-center gap-5 text-sm font-semibold">
          {cfg.nav.map((n) => <a key={n} href={`#${n}`} className="hidden text-ink/70 transition-colors hover:text-ink sm:inline">{navLabels[n] || n}</a>)}
          <a href="#fleet" className="rounded-full bg-gold px-4 py-1.5 text-xs font-semibold text-paper">{hero.cta || 'Book now'}</a>
        </nav>
      </header>

      <section className="px-5 py-16 text-center sm:px-8 sm:py-24">
        <h1 className="mx-auto max-w-3xl font-display text-4xl leading-tight text-ink sm:text-5xl">{hero.headline}</h1>
        {hero.sub && <p className="mx-auto mt-4 max-w-xl text-lg text-ink/70">{hero.sub}</p>}
        <a href="#fleet" className="mt-8 inline-block rounded-full bg-gold px-7 py-3 text-sm font-semibold text-paper transition-transform hover:scale-[1.03]">{hero.cta || 'Browse the fleet'}</a>
      </section>

      <section id="fleet" className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <h2 className="mb-6 font-display text-2xl text-ink">Our fleet</h2>
        {cars === null
          ? <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="aspect-[4/3] rounded-[var(--radius-card)] border border-mist shimmer" />)}</div>
          : cars.length === 0
            ? <p className="py-12 text-center text-stone">No cars available right now.</p>
            : <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{cars.map((c) => <CarCard key={c.id} car={c} onOpen={setActive} />)}</div>}
      </section>

      {about?.body && (
        <section id="about" className="mx-auto max-w-3xl px-5 py-12 text-center sm:px-8">
          <h2 className="mb-4 font-display text-2xl text-ink">{about.title || 'About us'}</h2>
          <p className="whitespace-pre-line text-ink/75">{about.body}</p>
        </section>
      )}

      {Array.isArray(benefits) && benefits.length > 0 && (
        <section className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
          <div className="grid gap-6 sm:grid-cols-3">
            {benefits.map((b, i) => (
              <div key={i} className="rounded-[var(--radius-card)] border border-mist bg-cloud p-6 text-center">
                <div className="font-display text-lg text-gold">{b.title}</div>
                {b.body && <p className="mt-2 text-sm text-ink/70">{b.body}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {hasContact && (
        <section id="contact" className="mx-auto max-w-3xl px-5 py-12 text-center sm:px-8">
          <h2 className="mb-4 font-display text-2xl text-ink">Get in touch</h2>
          <div className="space-y-1 text-ink/75">
            {contact.address && <p>{contact.address}</p>}
            {contact.phone && <p><a href={`tel:${contact.phone}`} className="hover:text-ink">{contact.phone}</a></p>}
            {contact.email && <p><a href={`mailto:${contact.email}`} className="hover:text-ink">{contact.email}</a></p>}
          </div>
        </section>
      )}

      <footer className="mt-8 border-t border-mist px-5 py-8 text-center text-xs text-stone sm:px-8">
        {legalPages.length > 0 && (
          <div className="mb-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
            {legalPages.map(([key, label]) => (
              <button key={key} type="button" onClick={() => setLegalView(key)} className="font-semibold text-ink/70 transition-colors hover:text-ink">{label}</button>
            ))}
          </div>
        )}
        <div>© {new Date().getFullYear()} {site.company_name}</div>
        <div className="mt-2">Powered by <span className="wordmark text-ink">AIR<span className="text-gold">LUXO</span></span></div>
      </footer>

      {legalView && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-ink/60 p-5 backdrop-blur-sm" onClick={() => setLegalView(null)}>
          <div onClick={(e) => e.stopPropagation()} className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-[var(--radius-card)] border border-mist bg-paper p-6">
            <pre className="whitespace-pre-wrap font-sans text-sm text-ink/85">{(site.legal_pages || {})[legalView] || ''}</pre>
            <div className="mt-4 text-right">
              <button type="button" onClick={() => setLegalView(null)} className="ring-lux rounded-full border border-mist px-5 py-2 text-sm font-semibold text-ink transition-colors hover:border-ink">Close</button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>{active && <CarDetail car={active} onClose={() => setActive(null)} />}</AnimatePresence>
    </div>
  );
}
