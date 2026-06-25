import AccountMenu from './AccountMenu.jsx';
import { useT } from '../lib/i18n.jsx';

export default function Nav({ onHome, onPartner, onAccount, dark = false, partner = null }) {
  const t = useT();
  const tone = dark
    ? { text: 'text-cloud', sub: 'text-ash hover:text-cloud', line: 'border-graphite', btn: 'bg-cloud text-ink hover:bg-paper' }
    : { text: 'text-ink', sub: 'text-stone hover:text-ink', line: 'border-mist', btn: 'bg-ink text-cloud hover:bg-void' };

  return (
    <header className={`sticky top-0 z-50 border-b ${tone.line} backdrop-blur-xl ${dark ? 'bg-void/70' : 'bg-paper/75'}`}>
      <div className="mx-auto flex h-[68px] max-w-[1240px] items-center justify-between px-5 sm:px-8">
        <button onClick={onHome} className={`ring-lux flex items-center gap-2.5 ${tone.text}`}>
          {partner
            ? (partner.logo_url
                ? <img src={partner.logo_url} alt={partner.company_name} className="h-8 max-w-[200px] object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                : <span className="font-display text-[1.2rem]">{partner.company_name}</span>)
            : <span className="wordmark text-[1.35rem]">AIR<span className="text-gold">LUXO</span></span>}
        </button>

        {/* Marketplace nav — host-recruitment links are AIRLUXO-only, hidden on partner sites. */}
        {!partner && (
          <nav className={`hidden items-center gap-8 text-sm font-medium md:flex ${tone.sub}`}>
            <a href="#fleet" className="ring-lux transition-colors">{t('site.explore')}</a>
            <a href="#how" className="ring-lux transition-colors">{t('site.howItWorks')}</a>
            <a href="#partner" className="ring-lux transition-colors">{t('site.forCompanies')}</a>
          </nav>
        )}

        <div className="flex items-center gap-2.5">
          {partner ? (
            // Partner white-label: a brand-gold "Explore" CTA into the fleet (matches the
            // "Book now" pill in the Brand & pitch preview), plus the customer account menu
            // (log in / Saved / trips) — host-recruitment items hidden via `hidePartner`.
            <>
              <a href="#fleet" className="ring-lux rounded-full bg-gold px-5 py-2 text-sm font-semibold text-paper transition-opacity hover:opacity-90">
                {t('site.explore')}
              </a>
              <AccountMenu onAccount={onAccount} dark={dark} hidePartner />
            </>
          ) : (
            <>
              <button
                onClick={onPartner}
                className={`ring-lux hidden rounded-full px-4 py-2 text-sm font-semibold transition-colors sm:block ${tone.btn}`}
              >
                {t('site.listYourCars')}
              </button>
              <AccountMenu onAccount={onAccount} onPartner={onPartner} dark={dark} />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
