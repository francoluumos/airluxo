import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from './Icons.jsx';
import { useAuth } from '../lib/auth.jsx';

// Airbnb-style account menu: a hamburger + avatar pill that opens a dropdown.
// Logged-out → log in / sign up + list-your-cars. Logged-in → trips / saved /
// account + sign out. Uses the auth context directly; `onAccount(tab)` and
// `onPartner` are navigation callbacks from the Shell.
export default function AccountMenu({ onAccount, onPartner, dark = false }) {
  const { session, customer, isPartner, openAuth, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const go = (fn) => () => { setOpen(false); fn(); };
  const tone = dark
    ? { border: 'border-graphite', text: 'text-cloud', hover: 'hover:bg-graphite/40' }
    : { border: 'border-mist', text: 'text-ink', hover: 'hover:bg-mist/50' };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`ring-lux flex items-center gap-2 rounded-full border ${tone.border} ${dark ? 'bg-void/40' : 'bg-cloud'} py-1.5 pl-3 pr-1.5 transition-shadow hover:shadow-md`}
        aria-label="Account menu"
      >
        <Icon.Menu width={16} height={16} className={dark ? 'text-cloud' : 'text-ink'} />
        <Avatar customer={customer} signedIn={!!session} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-mist bg-paper py-2 text-ink shadow-2xl"
          >
            {session ? (
              <>
                <div className="px-4 pb-2 pt-1">
                  <div className="truncate text-sm font-bold">{customer?.full_name || 'Your account'}</div>
                  {customer?.email && <div className="truncate text-xs text-stone">{customer.email}</div>}
                </div>
                <Divider />
                <Item onClick={go(() => onAccount('trips'))}>My trips</Item>
                <Item onClick={go(() => onAccount('saved'))}>Saved</Item>
                <Item onClick={go(() => onAccount('account'))}>Account</Item>
                <Divider />
                <Item onClick={go(onPartner)}>{isPartner ? 'Partner dashboard' : 'List your cars'}</Item>
                <Item onClick={go(signOut)}>Log out</Item>
              </>
            ) : (
              <>
                <Item bold onClick={go(() => openAuth())}>Log in or sign up</Item>
                <Divider />
                <Item onClick={go(onPartner)}>List your cars</Item>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Avatar({ customer, signedIn }) {
  if (customer?.avatar_url) {
    return <img src={customer.avatar_url} alt="" referrerPolicy="no-referrer" className="h-7 w-7 rounded-full object-cover" />;
  }
  const initials = signedIn
    ? (customer?.full_name || customer?.email || '?').trim().slice(0, 1).toUpperCase()
    : null;
  return (
    <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-[0.7rem] font-bold text-cloud">
      {initials || <Icon.Seat width={14} height={14} />}
    </span>
  );
}

function Item({ children, onClick, bold }) {
  return (
    <button
      onClick={onClick}
      className={`ring-lux block w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-mist/50 ${bold ? 'font-bold' : 'font-medium text-stone hover:text-ink'}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="my-1.5 h-px bg-mist" />;
}
