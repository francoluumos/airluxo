import { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import Home from './components/Home.jsx';
import CarDetail from './components/CarDetail.jsx';
import PartnerLogin from './components/PartnerLogin.jsx';
import PartnerDashboard from './components/PartnerDashboard.jsx';
import CustomerAccount from './components/CustomerAccount.jsx';
import AuthModal from './components/AuthModal.jsx';
import { AuthProvider, useAuth } from './lib/auth.jsx';
import MobileLicence from './components/MobileLicence.jsx';
import Embed from './components/Embed.jsx';
import PartnerSite from './components/PartnerSite.jsx';
import PartnerLanding from './components/PartnerLanding.jsx';

// Phase 1 = partner acquisition: airluxo.ch shows the partner value-proposition landing
// and the consumer booking marketplace stays hidden. Flip VITE_CONSUMER_LIVE=true (Phase 2)
// to launch the consumer marketplace. Partner white-label sites + dashboards are unaffected.
const CONSUMER_LIVE = import.meta.env.VITE_CONSUMER_LIVE === 'true';
import Docs from './components/Docs.jsx';
import ResetPassword from './components/ResetPassword.jsx';
import PrivacyPolicy from './components/PrivacyPolicy.jsx';
import CookieBanner from './components/CookieBanner.jsx';
import FounderApp from './components/FounderDashboard.jsx';

function Shell() {
  const { session, loading, authModal, closeAuth } = useAuth();
  // The partner subdomain (partner.airluxo.ch + staging.partner.airluxo.ch) lands directly
  // in the partner area; so does the ?partner deep-link (founder "Build fleet" magic link).
  // Label match so the staging.* prefix resolves too.
  const [route, setRoute] = useState(() =>
    (/(^|\.)partner\.airluxo\.ch$/i.test(window.location.hostname) || new URLSearchParams(window.location.search).has('partner'))
      ? 'partner' : 'home',
  ); // home | partner | account
  const [accountTab, setAccountTab] = useState('trips');
  const [activeCar, setActiveCar] = useState(null);

  // lock body scroll when the car modal or auth modal is open
  useEffect(() => {
    const open = activeCar || authModal;
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [activeCar, authModal]);

  const goHome = () => { setRoute('home'); setActiveCar(null); window.scrollTo(0, 0); };
  const goPartner = () => { window.scrollTo(0, 0); setRoute('partner'); };
  const goAccount = (tab = 'trips') => { setAccountTab(tab); setRoute('account'); window.scrollTo(0, 0); };
  const openCar = (car) => { setRoute('home'); setActiveCar(car); };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper">
        <div className="flex flex-col items-center gap-4">
          <span className="wordmark text-2xl">AIR<span className="text-gold">LUXO</span></span>
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-mist border-t-ink" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grain" />

      {route === 'home' && (
        CONSUMER_LIVE
          ? <Home onOpenCar={setActiveCar} onPartner={goPartner} onAccount={goAccount} />
          : <PartnerLanding onPartner={goPartner} />
      )}

      {/* Partner area is auth-gated: no session → login, session → dashboard */}
      {route === 'partner' && (
        session
          ? <PartnerDashboard onExit={goHome} />
          : <PartnerLogin onBack={goHome} onAuthed={goPartner} />
      )}

      {/* Customer profile (trips / saved / licence / account) */}
      {route === 'account' && (
        <CustomerAccount initialTab={accountTab} onExit={goHome} onOpenCar={openCar} />
      )}

      <AnimatePresence>
        {activeCar && <CarDetail car={activeCar} onClose={() => setActiveCar(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {authModal && <AuthModal intent={authModal.intent} onClose={closeAuth} />}
      </AnimatePresence>
    </>
  );
}

export default function App() {
  const params = new URLSearchParams(window.location.search);
  // Phone hand-off for licence capture: ?licence=<sessionId> renders the mobile page.
  const licenceSession = params.get('licence');
  if (licenceSession) return <MobileLicence sessionId={licenceSession} />;
  // White-label embed for partner sites: ?embed=<partnerId>.
  const embedPartner = params.get('embed');
  if (embedPartner) return <Embed partnerId={embedPartner} previewToken={params.get('preview')} />;
  // Public white-label partner site: /p/<slug>. Wrapped in AuthProvider — it reuses the
  // full Home (booking flow needs customer auth via the AuthModal).
  const siteSlug = window.location.pathname.match(/^\/p\/([^/]+)\/?$/)?.[1];
  if (siteSlug) return <AuthProvider><PartnerSite slugOrKey={decodeURIComponent(siteSlug)} /></AuthProvider>;
  // Multi-tenant own-domain (U12): any host that isn't ours resolves to its partner site.
  const host = window.location.hostname;
  const isOurHost = /(^|\.)airluxo\.ch$/i.test(host) || host.endsWith('.vercel.app') || host === 'localhost' || host === '127.0.0.1';
  if (!isOurHost) return <AuthProvider><PartnerSite host={host} /></AuthProvider>;
  // Partner guide + changelog (opened in a new tab from Settings): ?docs.
  if (params.has('docs')) return <Docs which={params.get('docs') || 'partner'} />;
  // Password-recovery landing from the reset email: ?reset=1 (token in the URL hash).
  if (params.has('reset') || window.location.hash.includes('type=recovery')) return <ResetPassword />;
  // Privacy & cookie policy (opened from the banner + footer): ?privacy.
  if (params.has('privacy')) return <PrivacyPolicy />;

  // Founder / admin back office: admin.airluxo.ch + staging.admin.airluxo.ch (or ?admin).
  // Label match (not startsWith) so the staging.* prefix resolves too. Auth + is_admin()
  // gating lives inside FounderApp.
  const adminMode = /(^|\.)admin\.airluxo\.ch$/i.test(window.location.hostname) || params.has('admin');
  if (adminMode) {
    return (
      <AuthProvider>
        <FounderApp />
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <Shell />
      <CookieBanner />
    </AuthProvider>
  );
}
