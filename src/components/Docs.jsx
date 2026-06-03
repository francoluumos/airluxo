// AIRLUXO documentation renderer — partner / customer / admin, keyed by ?docs=<which>.
// Content + changelogs live in src/lib/docs.js (keep those updated with every change).

import { DOCS } from '../lib/docs.js';

const SWITCHER = [
  { key: 'partner', label: 'Partner' },
  { key: 'customer', label: 'Customer' },
  { key: 'admin', label: 'Admin' },
];

const STATE_STYLE = {
  live: 'bg-go/12 text-go',
  beta: 'bg-gold/15 text-gold',
  planned: 'bg-mist text-stone',
  deferred: 'bg-mist text-stone',
};
const STATE_LABEL = { live: 'Live', beta: 'Beta', planned: 'Planned', deferred: 'Deferred' };

function Section({ s }) {
  return (
    <section id={s.id} className="scroll-mt-24 border-t border-mist pt-10">
      <h2 className="font-display text-[1.7rem] leading-tight">{s.title}</h2>
      {s.intro && <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-stone">{s.intro}</p>}
      {s.items.length > 0 && (
        <div className="mt-5 space-y-3">
          {s.items.map((it) => (
            <div key={it.h} className="rounded-2xl border border-mist bg-cloud p-4">
              <div className="text-sm font-semibold">{it.h}</div>
              <p className="mt-1 text-sm leading-relaxed text-stone">{it.p}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function Docs({ which = 'partner' }) {
  const doc = DOCS[which] || DOCS.partner;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-10 border-b border-mist bg-paper/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <a href="/" className="ring-lux wordmark text-xl">AIR<span className="text-gold">LUXO</span></a>
          <div className="flex flex-wrap gap-1.5">
            {SWITCHER.map((s) => (
              <a key={s.key} href={`/?docs=${s.key}`}
                className={`ring-lux rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${s.key === doc.key ? 'bg-ink text-cloud' : 'border border-mist text-stone hover:border-ink'}`}>
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <div className="eyebrow text-gold">{doc.eyebrow}</div>
        <h1 className="font-display mt-2 text-[clamp(2rem,5vw,3rem)] leading-[1.02]">{doc.h1}</h1>
        <p className="mt-4 max-w-2xl text-[1.02rem] leading-relaxed text-stone">{doc.intro}</p>

        <nav className="mt-8 flex flex-wrap gap-2">
          {doc.status && <a href="#status" className="ring-lux rounded-full border border-mist bg-cloud px-3.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-ink">System status</a>}
          {doc.sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="ring-lux rounded-full border border-mist bg-cloud px-3.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-ink">{s.title}</a>
          ))}
          <a href="#changelog" className="ring-lux rounded-full border border-ink bg-ink px-3.5 py-1.5 text-xs font-semibold text-cloud transition-colors hover:bg-void">Changelog</a>
        </nav>

        <div className="mt-10 space-y-10">
          {doc.status && (
            <section id="status" className="scroll-mt-24">
              <h2 className="font-display text-[1.7rem] leading-tight">System status</h2>
              <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-stone">What’s live, in beta, planned or deferred across the platform.</p>
              <div className="mt-5 space-y-2">
                {doc.status.map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-4 rounded-2xl border border-mist bg-cloud px-4 py-3">
                    <div>
                      <div className="text-sm font-semibold">{row.label}</div>
                      {row.note && <div className="mt-0.5 text-xs text-stone">{row.note}</div>}
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.7rem] font-bold ${STATE_STYLE[row.state] || STATE_STYLE.planned}`}>{STATE_LABEL[row.state] || row.state}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {doc.sections.map((s) => <Section key={s.id} s={s} />)}

          <section id="changelog" className="scroll-mt-24 border-t border-mist pt-10">
            <h2 className="font-display text-[1.7rem] leading-tight">Changelog</h2>
            <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-stone">Every change, newest first.</p>
            <div className="mt-6 space-y-7">
              {doc.changelog.map((rel) => (
                <div key={rel.date + rel.version} className="relative border-l-2 border-mist pl-5">
                  <div className="absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-gold bg-paper" />
                  <div className="flex items-baseline gap-3">
                    <span className="font-display text-lg">{rel.version}</span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-stone tnum">{rel.date}</span>
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {rel.items.map((it, i) => (
                      <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-stone">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gold" />
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>

        <footer className="mt-16 border-t border-mist pt-6 text-xs text-stone">
          AIRLUXO {doc.label} documentation · <a href="/" className="ring-lux font-semibold text-ink hover:text-gold">Back to AIRLUXO</a>
        </footer>
      </main>
    </div>
  );
}
