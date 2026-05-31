import { Icon } from './Icons.jsx';

export default function Nav({ onHome, onPartner, dark = false }) {
  const tone = dark
    ? { text: 'text-cloud', sub: 'text-ash hover:text-cloud', line: 'border-graphite', btn: 'bg-cloud text-ink hover:bg-paper' }
    : { text: 'text-ink', sub: 'text-stone hover:text-ink', line: 'border-mist', btn: 'bg-ink text-cloud hover:bg-void' };

  return (
    <header className={`sticky top-0 z-50 border-b ${tone.line} backdrop-blur-xl ${dark ? 'bg-void/70' : 'bg-paper/75'}`}>
      <div className="mx-auto flex h-[68px] max-w-[1240px] items-center justify-between px-5 sm:px-8">
        <button onClick={onHome} className={`ring-lux flex items-center gap-2.5 ${tone.text}`}>
          <span className="wordmark text-[1.35rem]">
            AIR<span className="text-gold">LUXO</span>
          </span>
        </button>

        <nav className={`hidden items-center gap-8 text-sm font-medium md:flex ${tone.sub}`}>
          <button onClick={onHome} className="ring-lux transition-colors">Explore</button>
          <a href="#how" className="ring-lux transition-colors">How it works</a>
          <a href="#partner" className="ring-lux transition-colors">For rental companies</a>
        </nav>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onPartner}
            className={`ring-lux hidden text-sm font-semibold sm:block ${tone.sub} transition-colors`}
          >
            Partner login
          </button>
          <button
            onClick={onPartner}
            className={`ring-lux rounded-full px-4 py-2 text-sm font-semibold transition-colors ${tone.btn}`}
          >
            List your cars
          </button>
        </div>
      </div>
    </header>
  );
}
