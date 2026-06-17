import { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import Home from './Home.jsx';
import CarDetail from './CarDetail.jsx';
import AuthModal from './AuthModal.jsx';
import { useAuth } from '../lib/auth.jsx';
import { brandKitToVars, loadBrandFont } from '../lib/brandkit.js';
import { fetchPublicSite, fetchPublicSiteByHost } from '../lib/site.js';

// Public white-label partner site: the FULL AIRLUXO homepage (hero + search + fleet +
// car detail + booking), scoped to the partner's cars and re-skinned with their brand
// kit (colours/fonts/logo) + legal. It's the same <Home> component the marketplace uses,
// so it stays a 1:1 copy. Served at /p/<slug> and on the partner's own domain (by host).
export default function PartnerSite({ slugOrKey, host }) {
  const { authModal, closeAuth } = useAuth();
  const [site, setSite] = useState(undefined); // undefined = loading, null = not found
  const [active, setActive] = useState(null);

  useEffect(() => {
    let on = true;
    const load = host ? fetchPublicSiteByHost(host) : fetchPublicSite(slugOrKey);
    load.then((s) => on && setSite(s)).catch(() => on && setSite(null));
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

  const rootStyle = brandKitToVars(site.brand_kit || {}) || undefined;
  const partner = {
    id: site.partner_id,
    company_name: site.company_name,
    logo_url: (site.brand_kit || {}).logo_url || '',
    legal_pages: site.legal_pages || {},
    slug: site.slug,
    hero: (site.site_config || {}).sections?.hero || null, // { headline (USP), sub, cta }
  };

  return (
    <div style={rootStyle}>
      <Home partner={partner} onOpenCar={setActive} onPartner={() => {}} onAccount={() => {}} />
      <AnimatePresence>
        {active && <CarDetail car={active} onClose={() => setActive(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {authModal && <AuthModal intent={authModal.intent} onClose={closeAuth} />}
      </AnimatePresence>
    </div>
  );
}
