import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getConsent, setConsent } from '../lib/consent.js';
import { initAnalytics, disableAnalytics } from '../lib/analytics.js';

// Opt-in cookie/analytics consent banner. Shows until the visitor chooses.
// Only essential cookies are used until "Accept" is clicked; analytics
// (PostHog) initialises solely on acceptance.
export default function CookieBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!getConsent()) setOpen(true);
    else if (getConsent() === 'accepted') initAnalytics();
    const reopen = () => setOpen(true);
    window.addEventListener('airluxo-open-consent', reopen);
    return () => window.removeEventListener('airluxo-open-consent', reopen);
  }, []);

  const accept = () => { setConsent('accepted'); initAnalytics(); setOpen(false); };
  const reject = () => { setConsent('rejected'); disableAnalytics(); setOpen(false); };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-0 bottom-0 z-[200] p-3 sm:p-5"
        >
          <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-2xl border border-mist bg-cloud/95 p-5 shadow-2xl backdrop-blur sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1 text-sm text-stone">
              <span className="font-semibold text-ink">We value your privacy.</span>{' '}
              We use essential cookies to run AIRLUXO and, with your consent, analytics cookies to understand how the site is used and improve it. See our{' '}
              <a href="/?privacy" target="_blank" rel="noreferrer" className="ring-lux font-semibold text-ink underline underline-offset-2 hover:text-gold">Privacy &amp; Cookie Policy</a>.
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              <button onClick={reject} className="ring-lux rounded-full border border-mist bg-paper px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink">Reject non-essential</button>
              <button onClick={accept} className="ring-lux rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-cloud transition-colors hover:bg-void">Accept all</button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
