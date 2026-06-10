import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { Icon } from './Icons.jsx';
import { useT } from './../lib/i18n.jsx';

// Lightweight on-brand product tour. Spotlights a target element (the box-shadow
// trick: one fixed div over the target whose huge spread-shadow dims everything
// else), shows a step card beside it, and dims+centres for target-less steps.
//
// steps: [{ target?: cssSelector, section?: navId, title, body, placement? }]
// onNavigate(section) switches the dashboard view before a step is shown.
// onClose = leave the tour (skip). onFinish = completed the last step.

const PAD = 8;
const reduceMotion = typeof window !== 'undefined' && window.matchMedia
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// A rect only if the element is actually on-screen and has size; otherwise null so
// the step falls back to a centered card (e.g. nav items in an off-canvas sidebar
// on mobile). Prevents a spotlight drawn off-screen.
function visibleRect(el) {
  const r = el.getBoundingClientRect();
  const vw = window.innerWidth, vh = window.innerHeight;
  if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.right < 0 || r.top > vh || r.left > vw) return null;
  return r;
}

// Position the card next to the target (using its measured size), clamped to the
// viewport. Target-less / mobile → centered, in the upper third (sits higher).
function cardPosition(rect, placement, size) {
  const vw = window.innerWidth, vh = window.innerHeight;
  // Clear the spotlight (which extends PAD beyond the target) plus breathing room,
  // so the card never touches the highlighted element or the sidebar behind it.
  const w = size.w, h = size.h, m = PAD + 18;
  if (vw < 640) {
    // Mobile: full-width card. With a spotlight, dock it to the bottom (a sheet) so
    // it never covers the highlighted item; target-less steps sit in the upper third.
    const mw = vw - 24;
    const top = rect ? Math.max(16, vh - h - 16) : Math.max(16, vh * 0.16);
    return { left: 12, top, width: mw };
  }
  if (!rect) {
    return { left: Math.max(12, (vw - w) / 2), top: Math.max(16, Math.min(vh - h - 16, vh * 0.16)), width: w };
  }
  let pl = placement;
  if (!pl) {
    pl = (vw - rect.right > w + 2 * m) ? 'right'
      : (rect.left > w + 2 * m) ? 'left'
        : (vh - rect.bottom > h + 2 * m) ? 'bottom' : 'top';
  }
  let top, left;
  if (pl === 'right') { left = rect.right + m; top = rect.top + rect.height / 2 - h / 2; }
  else if (pl === 'left') { left = rect.left - m - w; top = rect.top + rect.height / 2 - h / 2; }
  else if (pl === 'top') { top = rect.top - m - h; left = rect.left + rect.width / 2 - w / 2; }
  else { top = rect.bottom + m; left = rect.left + rect.width / 2 - w / 2; }
  left = Math.min(Math.max(12, left), vw - w - 12);
  top = Math.min(Math.max(12, top), vh - h - 12);
  return { left, top, width: w };
}

export default function Tour({ steps, onClose, onFinish, onNavigate }) {
  const t = useT();
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const [size, setSize] = useState({ w: Math.min(360, (typeof window !== 'undefined' ? window.innerWidth : 360) - 24), h: 200 });
  const cardRef = useRef(null);
  const step = steps[i];

  const finish = useCallback(() => onFinish(), [onFinish]);
  const next = useCallback(() => setI((n) => (n + 1 < steps.length ? n + 1 : (finish(), n))), [steps.length, finish]);
  const back = useCallback(() => setI((n) => Math.max(0, n - 1)), []);

  // Resolve the step's target: switch section, then poll for the element (~1.5s).
  useEffect(() => {
    let cancelled = false; let timer;
    setRect(null);
    if (step?.section && onNavigate) onNavigate(step.section);
    if (!step?.target) return;
    let tries = 0;
    // Poll until the element is actually on-screen (not just present) — covers the
    // mobile nav drawer sliding in. Give up after ~2s → centered fallback.
    const find = () => {
      if (cancelled) return;
      const el = document.querySelector(step.target);
      const r = el ? visibleRect(el) : null;
      if (r) {
        el.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
        timer = setTimeout(() => { if (!cancelled && el) setRect(visibleRect(el)); }, reduceMotion ? 0 : 220);
        return;
      }
      if (tries++ < 40) timer = setTimeout(find, 50);
    };
    find();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [i, step, onNavigate]);

  // Keep the spotlight glued to the target on scroll/resize.
  useEffect(() => {
    if (!step?.target) return;
    const onMove = () => { const el = document.querySelector(step.target); if (el) setRect(visibleRect(el)); };
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => { window.removeEventListener('resize', onMove); window.removeEventListener('scroll', onMove, true); };
  }, [i, step]);

  // Keyboard: Esc leaves, arrows navigate.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, next, back]);

  // Measure the card so positioning uses its real size (runs before paint).
  const ready = !step?.target || !!rect;
  useLayoutEffect(() => {
    if (!ready || !cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    setSize((s) => (Math.abs(s.h - r.height) > 1 || Math.abs(s.w - r.width) > 1 ? { w: r.width, h: r.height } : s));
  }, [i, ready, rect]);

  if (!step) return null;
  const pos = cardPosition(rect, step.placement, size);
  const last = i === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true">
      {/* Blocks interaction with the dashboard behind the tour. */}
      <div className="absolute inset-0" />

      {/* Spotlight (or full dim while resolving / for centered steps). Distinct
          keys so React swaps the nodes instantly instead of cross-fading the
          transition between them (which briefly thinned the dim on Next). */}
      {rect ? (
        <div
          key="tour-spotlight"
          className="pointer-events-none absolute rounded-[14px]"
          style={{
            left: rect.left - PAD, top: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2,
            boxShadow: '0 0 0 2px rgba(184,145,80,0.9), 0 0 0 9999px rgba(11,11,12,0.55)',
            transition: reduceMotion ? 'none' : 'left .25s cubic-bezier(0.22,1,0.36,1), top .25s cubic-bezier(0.22,1,0.36,1), width .25s cubic-bezier(0.22,1,0.36,1), height .25s cubic-bezier(0.22,1,0.36,1)',
          }}
        />
      ) : (
        <div key="tour-dim" className="absolute inset-0 bg-ink/55" />
      )}

      {/* Step card — only once its anchored position is known (no centered flash). */}
      {ready && (
        <motion.div
          ref={cardRef}
          key={i}
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          className="absolute rounded-2xl border border-mist bg-paper p-5 shadow-2xl"
          style={{ left: pos.left, top: pos.top, width: pos.width }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="eyebrow text-gold">{t('partner.tour.step', { n: i + 1, total: steps.length })}</div>
            <button onClick={onClose} className="ring-lux -mr-1 -mt-1 grid h-7 w-7 place-items-center rounded-full text-stone transition-colors hover:bg-mist/60" aria-label={t('partner.tour.leaveGuide')}>
              <Icon.X width={14} height={14} />
            </button>
          </div>
          <h3 className="font-display mt-2 text-lg leading-tight">{step.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-stone">{step.body}</p>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex gap-1.5">
              {steps.map((_, n) => (
                <span key={n} className={`h-1.5 rounded-full transition-all ${n === i ? 'w-4 bg-ink' : 'w-1.5 bg-mist'}`} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {i > 0 && (
                <button onClick={back} className="ring-lux rounded-full px-3 py-1.5 text-xs font-semibold text-stone transition-colors hover:text-ink">{t('partner.tour.back')}</button>
              )}
              <button onClick={next} className="ring-lux rounded-full bg-ink px-4 py-1.5 text-xs font-bold text-cloud transition-colors hover:bg-void">
                {last ? t('partner.tour.finish') : t('partner.tour.next')}
              </button>
            </div>
          </div>

          <button onClick={onClose} className="ring-lux mt-3 block w-full text-center text-[0.7rem] font-semibold text-stone transition-colors hover:text-ink">
            {t('partner.tour.skip')}
          </button>
        </motion.div>
      )}
    </div>
  );
}
