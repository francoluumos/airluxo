// Minimal hand-picked stroke icons — 1.6 weight, currentColor
const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export const Icon = {
  Pin: (p) => (
    <svg {...base} {...p}><path d="M12 21s-7-5.2-7-11a7 7 0 0 1 14 0c0 5.8-7 11-7 11Z" /><circle cx="12" cy="10" r="2.4" /></svg>
  ),
  Calendar: (p) => (
    <svg {...base} {...p}><rect x="3.5" y="5" width="17" height="16" rx="2.5" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></svg>
  ),
  Search: (p) => (
    <svg {...base} {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-3.6-3.6" /></svg>
  ),
  Star: (p) => (
    <svg {...base} {...p} fill="currentColor" stroke="none"><path d="M12 3.5l2.47 5.01 5.53.8-4 3.9.94 5.49L12 16.1l-4.94 2.6.94-5.49-4-3.9 5.53-.8L12 3.5Z" /></svg>
  ),
  Arrow: (p) => (
    <svg {...base} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
  ),
  ArrowUpRight: (p) => (
    <svg {...base} {...p}><path d="M7 17 17 7M8 7h9v9" /></svg>
  ),
  Bolt: (p) => (
    <svg {...base} {...p}><path d="M13 3 5 13h6l-1 8 8-10h-6l1-8Z" /></svg>
  ),
  Gauge: (p) => (
    <svg {...base} {...p}><path d="M5 18a7 7 0 1 1 14 0" /><path d="m12 14 3.5-3.5" /><circle cx="12" cy="14" r="1" /></svg>
  ),
  Seat: (p) => (
    <svg {...base} {...p}><path d="M6 19v-2a3 3 0 0 1 3-3h3M7 5v6M7 11h4a2 2 0 0 1 2 2v1M17 14v5" /></svg>
  ),
  Gear: (p) => (
    <svg {...base} {...p}><circle cx="12" cy="12" r="3.2" /><path d="M19.4 15a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.82 2.82l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.46V21a2 2 0 1 1-4 0v-.05a1.6 1.6 0 0 0-1.05-1.46 1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.82-2.82l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.46-.97H3a2 2 0 1 1 0-4h.05a1.6 1.6 0 0 0 1.46-1.05 1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.82-2.82l.06.06a1.6 1.6 0 0 0 1.77.32H9a1.6 1.6 0 0 0 .97-1.46V3a2 2 0 1 1 4 0v.05a1.6 1.6 0 0 0 .97 1.46 1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.82 2.82l-.06.06a1.6 1.6 0 0 0-.32 1.77V9a1.6 1.6 0 0 0 1.46.97H21a2 2 0 1 1 0 4h-.05a1.6 1.6 0 0 0-1.46.97Z" /></svg>
  ),
  Shield: (p) => (
    <svg {...base} {...p}><path d="M12 3 5 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" /><path d="m9.5 12 1.8 1.8 3.2-3.6" /></svg>
  ),
  Grid: (p) => (
    <svg {...base} {...p}><rect x="4" y="4" width="6.5" height="6.5" rx="1.4" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.4" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.4" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.4" /></svg>
  ),
  Car: (p) => (
    <svg {...base} {...p}><path d="M4 13l1.6-4.2A3 3 0 0 1 8.4 7h7.2a3 3 0 0 1 2.8 1.8L20 13M4 13h16v4a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1H7.5v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4Z" /><path d="M7 15.5h.01M17 15.5h.01" /></svg>
  ),
  Wallet: (p) => (
    <svg {...base} {...p}><rect x="3.5" y="6" width="17" height="13" rx="2.5" /><path d="M3.5 10h17M16 14.5h.5" /></svg>
  ),
  Calendar2: (p) => (
    <svg {...base} {...p}><rect x="3.5" y="5" width="17" height="16" rx="2.5" /><path d="M3.5 9.5h17M8 3v4M16 3v4M7.5 13h2M14.5 13h2M7.5 16.5h2" /></svg>
  ),
  Plus: (p) => (
    <svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>
  ),
  Logo: (p) => (
    <svg {...base} {...p} viewBox="0 0 24 24" strokeWidth="1.7"><path d="M3 16.5l4.5-10a1.5 1.5 0 0 1 2.7 0l4.5 10" /><path d="M5.4 12h6.6" /><path d="M16.5 7.5v9M16.5 16.5h4.5" opacity="0.9" /></svg>
  ),
  Check: (p) => (
    <svg {...base} {...p}><path d="m5 12.5 4 4 10-10" /></svg>
  ),
  Lock: (p) => (
    <svg {...base} {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
  ),
  Menu: (p) => (
    <svg {...base} {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
  ),
  X: (p) => (
    <svg {...base} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>
  ),
};
