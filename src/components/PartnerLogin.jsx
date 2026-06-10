import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from './Icons.jsx';
import CarImage from './CarImage.jsx';
import { CARS } from '../lib/data.js';
import { useAuth } from '../lib/auth.jsx';
import { useT } from '../lib/i18n.jsx';

export default function PartnerLogin({ onBack, onAuthed }) {
  const { signIn, signUp, resetPassword } = useAuth();
  const t = useT();
  const [mode, setMode] = useState('signin'); // signin | signup | forgot
  const [form, setForm] = useState({ company: '', contact: '', city: 'Geneva', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [checkEmail, setCheckEmail] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const showcase = CARS[2]; // Ferrari Roma

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'forgot') {
        const { error } = await resetPassword(form.email.trim());
        if (error) throw error;
        setResetSent(true);
      } else if (mode === 'signin') {
        const { error } = await signIn(form.email.trim(), form.password);
        if (error) throw error;
        onAuthed();
      } else {
        const { data, error } = await signUp(form.email.trim(), form.password, {
          company_name: form.company.trim(),
          contact_name: form.contact.trim(),
          city: form.city,
        });
        if (error) throw error;
        // If the project requires email confirmation there is no session yet.
        if (data.session) onAuthed();
        else setCheckEmail(true);
      }
    } catch (err) {
      setError(err.message || t('partner.login.errGeneric'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      {/* left: form */}
      <div className="relative flex flex-col bg-paper">
        <div className="flex items-center justify-between px-7 py-6">
          <button onClick={onBack} className="ring-lux flex items-center gap-2.5 text-ink">
            <span className="wordmark text-[1.35rem]">AIR<span className="text-gold">LUXO</span></span>
          </button>
          <button onClick={onBack} className="ring-lux flex items-center gap-1.5 text-sm font-semibold text-stone transition-colors hover:text-ink">
            <Icon.Arrow width={15} height={15} className="rotate-180" /> {t('account.backToSite')}
          </button>
        </div>

        <div className="flex flex-1 items-center px-7 sm:px-12 lg:px-16">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md py-10"
          >
            {checkEmail ? (
              <ConfirmEmail email={form.email} onBack={() => { setCheckEmail(false); setMode('signin'); }} />
            ) : resetSent ? (
              <ResetSent email={form.email} onBack={() => { setResetSent(false); setMode('signin'); }} />
            ) : (
              <>
                <div className="eyebrow text-gold">{t('partner.portal')}</div>
                <h1 className="font-display mt-3 text-[clamp(2rem,4vw,2.8rem)] leading-[1.0]">
                  {mode === 'signin' ? t('partner.login.titleSignin') : mode === 'signup' ? t('partner.login.titleSignup') : t('partner.login.titleForgot')}
                </h1>
                <p className="mt-3 text-stone">
                  {mode === 'signin'
                    ? t('partner.login.subSignin')
                    : mode === 'signup'
                      ? t('partner.login.subSignup')
                      : t('partner.login.subForgot')}
                </p>

                {/* tabs */}
                {mode !== 'forgot' && (
                  <div className="mt-7 inline-flex rounded-full border border-mist bg-cloud p-1">
                    <Tab active={mode === 'signin'} onClick={() => { setMode('signin'); setError(''); }}>{t('partner.login.tabSignin')}</Tab>
                    <Tab active={mode === 'signup'} onClick={() => { setMode('signup'); setError(''); }}>{t('partner.login.tabSignup')}</Tab>
                  </div>
                )}

                <form onSubmit={submit} className="mt-7 space-y-4">
                  <AnimatePresence initial={false}>
                    {mode === 'signup' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 overflow-hidden"
                      >
                        <Input label={t('partner.login.company')} icon={<Icon.Car />} placeholder={t('partner.login.companyPlaceholder')} value={form.company} onChange={set('company')} required />
                        <div className="grid grid-cols-2 gap-3">
                          <Input label={t('partner.login.yourName')} icon={<Icon.Seat />} placeholder={t('partner.login.yourNamePlaceholder')} value={form.contact} onChange={set('contact')} />
                          <Select label={t('partner.login.city')} value={form.city} onChange={set('city')} options={['Geneva', 'Zürich', 'Lugano', 'Lausanne', 'Basel', 'Bern', 'St. Moritz', 'Zermatt', 'Gstaad']} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Input label={t('partner.login.workEmail')} type="email" icon={<Icon.ArrowUpRight />} placeholder={t('partner.login.workEmailPlaceholder')} value={form.email} onChange={set('email')} required />
                  {mode !== 'forgot' && (
                    <div>
                      <Input label={t('partner.login.password')} type="password" icon={<Icon.Lock />} placeholder={t('partner.login.passwordPlaceholder')} value={form.password} onChange={set('password')} required minLength={6} />
                      {mode === 'signin' && (
                        <button type="button" onClick={() => { setMode('forgot'); setError(''); }} className="ring-lux mt-2 text-sm font-semibold text-stone transition-colors hover:text-ink">
                          {t('partner.login.forgotPassword')}
                        </button>
                      )}
                    </div>
                  )}

                  {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={busy}
                    className="ring-lux group flex w-full items-center justify-center gap-2 rounded-2xl bg-ink py-4 text-sm font-bold text-cloud transition-colors hover:bg-void disabled:opacity-60"
                  >
                    {busy ? <Spinner /> : (
                      <>
                        {mode === 'signin' ? t('partner.login.enterDashboard') : mode === 'signup' ? t('partner.login.tabSignup') : t('partner.login.sendResetLink')}
                        <Icon.Arrow width={16} height={16} className="transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </form>

                <p className="mt-7 text-sm text-stone">
                  {mode === 'signin' ? (
                    <>{t('partner.login.newCompanyPre')}{' '}
                      <button onClick={() => { setMode('signup'); setError(''); }} className="ring-lux font-semibold text-ink underline-offset-4 hover:underline">{t('partner.login.createPartnerAccount')}</button>
                    </>
                  ) : mode === 'forgot' ? (
                    <>{t('partner.login.rememberedPre')}{' '}
                      <button onClick={() => { setMode('signin'); setError(''); }} className="ring-lux font-semibold text-ink underline-offset-4 hover:underline">{t('partner.login.backToSignin')}</button>
                    </>
                  ) : (
                    <>{t('partner.login.alreadyOnboardPre')}{' '}
                      <button onClick={() => { setMode('signin'); setError(''); }} className="ring-lux font-semibold text-ink underline-offset-4 hover:underline">{t('partner.login.tabSignin')}</button>
                    </>
                  )}
                </p>
              </>
            )}
          </motion.div>
        </div>
      </div>

      {/* right: visual */}
      <div className="relative hidden overflow-hidden bg-void lg:block">
        <CarImage car={showcase} className="absolute inset-0 h-full w-full opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/30 to-void/10" />
        <div className="spotlight absolute inset-0" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="self-end rounded-2xl border border-graphite bg-void/55 px-5 py-4 text-cloud backdrop-blur">
            <div className="text-[0.7rem] uppercase tracking-wider text-ash">{t('partner.login.liveOnAirluxo')}</div>
            <div className="font-display mt-1 text-3xl tnum">{t('partner.login.companiesCount')}</div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-go"><Icon.ArrowUpRight width={13} height={13} /> {t('partner.login.carsEarning')}</div>
          </div>
          <div className="text-cloud">
            <div className="eyebrow text-gold-soft">{t('partner.login.partnerSinceDayOne')}</div>
            <blockquote className="font-display mt-4 max-w-md text-[1.8rem] leading-[1.15]">
              {t('partner.login.quote')}
            </blockquote>
            <div className="mt-5 flex items-center gap-3 text-sm text-ash">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-cloud font-display text-ink">FM</span>
              Florian Müller · Léman Motors, Geneva
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfirmEmail({ email, onBack }) {
  const t = useT();
  return (
    <div className="text-center sm:text-left">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-go/12 text-go sm:mx-0">
        <Icon.Check width={30} height={30} />
      </div>
      <h1 className="font-display mt-6 text-[clamp(1.8rem,3.6vw,2.4rem)] leading-tight">{t('partner.login.confirmEmailTitle')}</h1>
      <p className="mt-3 text-stone">
        {t('partner.login.confirmEmailPre')} <span className="font-semibold text-ink">{email}</span>.
        {' '}{t('partner.login.confirmEmailPost')}
      </p>
      <button onClick={onBack} className="ring-lux mt-7 rounded-full bg-ink px-6 py-3 text-sm font-bold text-cloud transition-colors hover:bg-void">
        {t('partner.login.backToSignin')}
      </button>
    </div>
  );
}

function ResetSent({ email, onBack }) {
  const t = useT();
  return (
    <div className="text-center sm:text-left">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-go/12 text-go sm:mx-0">
        <Icon.ArrowUpRight width={30} height={30} />
      </div>
      <h1 className="font-display mt-6 text-[clamp(1.8rem,3.6vw,2.4rem)] leading-tight">{t('partner.login.checkEmailTitle')}</h1>
      <p className="mt-3 text-stone">
        {t('partner.login.resetSentPre')} <span className="font-semibold text-ink">{email}</span> {t('partner.login.resetSentPost')}
      </p>
      <button onClick={onBack} className="ring-lux mt-7 rounded-full bg-ink px-6 py-3 text-sm font-bold text-cloud transition-colors hover:bg-void">
        {t('partner.login.backToSignin')}
      </button>
    </div>
  );
}

function Tab({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`ring-lux rounded-full px-5 py-2 text-sm font-semibold transition-colors ${active ? 'bg-ink text-cloud' : 'text-stone hover:text-ink'}`}
    >
      {children}
    </button>
  );
}

function Input({ label, icon, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      <span className="flex items-center gap-3 rounded-2xl border border-mist bg-cloud px-4 py-3.5 transition-colors focus-within:border-ink">
        <span className="text-stone">{icon}</span>
        <input {...props} className="w-full bg-transparent text-sm outline-none placeholder:text-stone" />
      </span>
    </label>
  );
}

function Select({ label, options, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      <select {...props} className="ring-lux w-full rounded-2xl border border-mist bg-cloud px-4 py-3.5 text-sm outline-none transition-colors focus:border-ink">
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-cloud/30 border-t-cloud" />
  );
}
