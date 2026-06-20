import { useI18n } from '../lib/i18n.jsx';

// AIRLUXO's own legal pages (Impressum + AGB) for the marketing site, bilingual DE/EN.
// Datenschutz is the existing PrivacyPolicy (?privacy). NOTE: address + UID below are
// placeholders — confirm the registered company details before launch.
const COMPANY = {
  name: 'AIRLUXO SA',
  street: '',                 // TODO confirm registered street + no.
  city: 'Genf / Geneva',
  country: 'Schweiz / Switzerland',
  uid: 'CHE-123.456.789',     // TODO confirm UID/MWST
  email: 'hello@airluxo.ch',
  repBy: '',                  // TODO confirm represented-by
};

const DOCS = {
  impressum: {
    de: (k) => `Impressum

${k.name}
${[k.street, k.city, k.country].filter(Boolean).join('\n')}

${k.uid ? 'UID / MWST: ' + k.uid + '\n' : ''}E-Mail: ${k.email}
${k.repBy ? 'Vertreten durch: ' + k.repBy + '\n' : ''}
Verantwortlich für den Inhalt dieser Website ist ${k.name}. Wir bemühen uns um korrekte und aktuelle Informationen, übernehmen jedoch keine Haftung für Inhalte externer Links.`,
    en: (k) => `Legal notice (Impressum)

${k.name}
${[k.street, k.city, k.country].filter(Boolean).join('\n')}

${k.uid ? 'VAT / UID: ' + k.uid + '\n' : ''}Email: ${k.email}
${k.repBy ? 'Represented by: ' + k.repBy + '\n' : ''}
${k.name} is responsible for the content of this website. We strive to keep information accurate and current but accept no liability for the content of external links.`,
  },
  agb: {
    de: (k) => `Allgemeine Geschäftsbedingungen (AGB)

Diese AGB regeln die Nutzung der AIRLUXO-Plattform durch Vermietungspartner. AIRLUXO stellt Partnern eine Website, ein Buchungs- und Zahlungssystem (Stripe) sowie ein Management-Dashboard bereit.

1. Leistungen — AIRLUXO erstellt und betreibt die Partner-Website und das Dashboard; der Partner verwaltet Fahrzeuge, Preise und Verfügbarkeiten.
2. Abonnement & Kommission — Es gelten die im Buchungsprozess angezeigten Abonnementspreise und Kommissionssätze (siehe Konditionen).
3. Zahlungen & Auszahlungen — Gästezahlungen werden über Stripe abgewickelt; Auszahlungen erfolgen auf das IBAN des Partners nach jeder Miete.
4. Pflichten des Partners — korrekte Fahrzeug- und Preisangaben, gültige Versicherung, Einhaltung des anwendbaren Rechts.
5. Laufzeit & Kündigung — keine Mindestbindung, sofern nicht anders vereinbart.
6. Haftung — AIRLUXO haftet nicht für Schäden aus der Vermietung zwischen Partner und Gast.
7. Anwendbares Recht — es gilt schweizerisches Recht; Gerichtsstand ist der Sitz von ${k.name}.

Diese AGB sind eine Vorlage und vor der Veröffentlichung rechtlich zu prüfen.`,
    en: (k) => `Terms & Conditions

These terms govern partners' use of the AIRLUXO platform. AIRLUXO provides partners with a website, a booking & payment system (Stripe) and a management dashboard.

1. Services — AIRLUXO builds and operates the partner website and dashboard; the partner manages vehicles, prices and availability.
2. Subscription & commission — the subscription prices and commission rates shown at sign-up apply (see Pricing).
3. Payments & payouts — guest payments are processed via Stripe; payouts are made to the partner's IBAN after each trip.
4. Partner obligations — accurate vehicle and price data, valid insurance, compliance with applicable law.
5. Term & cancellation — no minimum commitment unless otherwise agreed.
6. Liability — AIRLUXO is not liable for damages arising from the rental between partner and guest.
7. Governing law — Swiss law applies; place of jurisdiction is the seat of ${k.name}.

These terms are a template and must be legally reviewed before publishing.`,
  },
};

export default function LegalPage({ which = 'impressum' }) {
  const { locale } = useI18n();
  const lang = locale === 'en' ? 'en' : 'de';
  const doc = DOCS[which] || DOCS.impressum;
  const text = doc[lang](COMPANY);
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-40 border-b border-mist bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[60px] max-w-[820px] items-center justify-between px-5">
          <a href="/" className="wordmark text-lg">AIR<span className="text-gold">LUXO</span></a>
          <a href="/" className="text-sm font-semibold text-stone transition-colors hover:text-ink">← {lang === 'de' ? 'Zurück' : 'Back'}</a>
        </div>
      </header>
      <main className="mx-auto max-w-[820px] px-5 py-16">
        <pre className="whitespace-pre-wrap font-sans text-[0.98rem] leading-relaxed text-ink/85">{text}</pre>
      </main>
    </div>
  );
}
