// AIRLUXO — Privacy & Cookie Policy (DRAFT — requires legal review before launch).
// Rendered at ?privacy (opened from the cookie banner + footer). Plain content;
// keep it factual and update the processor list as the stack changes.

import { openConsentSettings } from '../lib/consent.js';

const SECTIONS = [
  {
    h: '1. Who we are',
    p: [
      'AIRLUXO ("we", "us") operates a marketplace that connects luxury-car rental companies in Switzerland with drivers. This policy explains what personal data we process, why, and your rights.',
      'Controller: AIRLUXO SA, Geneva, Switzerland. Contact: privacy@airluxo.ch.',
    ],
  },
  {
    h: '2. What we collect',
    p: [
      'Partner account data: company name, contact person, email, phone, address, VAT/UID, billing & support contacts, and payout details handled by our payment provider.',
      'Booking data (guests): name, email, phone, the trip dates and the car booked, and — for driver verification — details read from your driving licence (name, date of birth, validity, permit categories, document number). Licence images are processed only to extract these fields and are NOT stored; only the extracted fields are kept.',
      'Payment data: processed by Stripe. We do not store full card numbers.',
      'Photos/videos you upload for listings, and images you submit for AI thumbnail generation and car/licence detail extraction.',
      'Usage & analytics data: with your consent, pages viewed, searches, cars viewed and booking-step events, plus technical data (device, browser, approximate region). See the Cookies section.',
    ],
  },
  {
    h: '3. Why we use it (legal bases)',
    p: [
      'To provide the service — create accounts, list cars, take and manage bookings, process payments and payouts, and verify drivers (performance of a contract).',
      'To operate, secure and improve the platform (legitimate interests).',
      'For analytics and non-essential cookies (your consent — which you can withdraw at any time).',
      'To comply with legal obligations (e.g. accounting, fraud prevention).',
    ],
  },
  {
    h: '4. Cookies & analytics',
    p: [
      'Essential cookies/storage are needed to run the site (e.g. keeping you signed in, remembering your cookie choice). These are always active.',
      'Analytics cookies (PostHog) help us understand usage — only set after you click "Accept all". If you reject, no analytics cookies are used and no analytics events are sent. We use PostHog EU-region hosting and do not send your name, email or licence data into analytics.',
      'You can change your choice at any time via "Cookie settings" below or in the site footer.',
    ],
  },
  {
    h: '5. Who we share data with (processors)',
    p: [
      'Supabase — database, authentication and file storage.',
      'Stripe — payments and partner payouts.',
      'Google (Gemini API) — to generate studio thumbnails and read car/licence details from images you submit; processed transiently for that purpose.',
      'PostHog (EU) — product analytics, only with your consent.',
      'An email delivery provider — to send transactional emails (e.g. booking notifications, password resets).',
      'Swiss Federal geodata service (geo.admin.ch) — address autocomplete; the address text you type is sent to look up matches.',
      'We do not sell your personal data.',
    ],
  },
  {
    h: '6. International transfers',
    p: [
      'We aim to keep data within Switzerland/the EEA. Where a processor transfers data abroad, we rely on appropriate safeguards (e.g. EU Standard Contractual Clauses and equivalent Swiss mechanisms).',
    ],
  },
  {
    h: '7. How long we keep it',
    p: [
      'We keep personal data only as long as necessary for the purposes above or as required by law (e.g. accounting retention). Booking and verification records are retained for the period needed to operate the rental and meet legal duties; analytics data is retained per our analytics provider’s configured retention.',
    ],
  },
  {
    h: '8. Your rights',
    p: [
      'Subject to applicable law (Swiss FADP and, where relevant, the EU GDPR), you may request access, rectification, deletion, restriction or portability of your data, and object to certain processing. You can withdraw analytics consent at any time.',
      'To exercise your rights, contact privacy@airluxo.ch. You may also lodge a complaint with the Swiss Federal Data Protection and Information Commissioner (FDPIC) or your local EU data-protection authority.',
    ],
  },
  {
    h: '9. Security',
    p: ['We use technical and organisational measures (encryption in transit, access controls) to protect personal data. No method of transmission or storage is completely secure.'],
  },
  {
    h: '10. Children',
    p: ['The service is intended for adults (drivers must hold a valid licence). It is not directed at children.'],
  },
  {
    h: '11. Changes',
    p: ['We may update this policy; material changes will be reflected here with a new "last updated" date.'],
  },
];

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-10 border-b border-mist bg-paper/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4 sm:px-8">
          <a href="/" className="ring-lux wordmark text-xl">AIR<span className="text-gold">LUXO</span></a>
          <span className="text-xs font-semibold uppercase tracking-wider text-stone">Privacy &amp; Cookies</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <div className="eyebrow text-gold">Legal</div>
        <h1 className="font-display mt-2 text-[clamp(2rem,5vw,3rem)] leading-[1.02]">Privacy &amp; Cookie Policy</h1>
        <p className="mt-3 text-sm text-stone">Last updated: 31 May 2026</p>

        {/* lawyer-review disclaimer */}
        <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <span className="font-bold">Draft — pending legal review.</span> This policy is a working draft provided for development purposes. It has not yet been reviewed by a qualified lawyer and must be checked and finalised by legal counsel before AIRLUXO goes live.
        </div>

        <p className="mt-6 max-w-2xl leading-relaxed text-stone">
          This policy describes how AIRLUXO processes personal data of partners and guests, and how we use cookies and analytics.
        </p>

        <div className="mt-8 space-y-8">
          {SECTIONS.map((s) => (
            <section key={s.h} className="border-t border-mist pt-6">
              <h2 className="font-display text-xl leading-tight">{s.h}</h2>
              <div className="mt-3 space-y-2.5">
                {s.p.map((para, i) => (
                  <p key={i} className="text-sm leading-relaxed text-stone">{para}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-mist pt-6 text-sm">
          <button onClick={openConsentSettings} className="ring-lux rounded-full border border-mist bg-cloud px-4 py-2 font-semibold text-ink transition-colors hover:border-ink">Cookie settings</button>
          <a href="/" className="ring-lux font-semibold text-stone transition-colors hover:text-ink">Back to AIRLUXO</a>
        </div>
      </main>
    </div>
  );
}
