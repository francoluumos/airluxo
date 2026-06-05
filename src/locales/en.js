// AIRLUXO — English source catalog (the canonical keys + source text).
// English is the source of truth and ships in the bundle; DE/FR/IT translations
// live in Supabase (public.translations) and are AI-generated / human-reviewed in
// the founder Translation section. Add a key here, use it via t('key'), and it
// shows up in the admin coverage table automatically.
//
// Interpolation: use {name} placeholders; t('key', { name }) fills them.

export const SUPPORTED_LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'it', label: 'Italiano' },
];

export const en = {
  // Partner dashboard — navigation
  'nav.overview': 'Overview',
  'nav.fleet': 'My fleet',
  'nav.location': 'Location',
  'nav.bookings': 'Bookings',
  'nav.calendar': 'Calendar',
  'nav.earnings': 'Earnings',
  'nav.plans': 'Plans',
  'nav.settings': 'Settings',
  'partner.listCar': 'List a car',
  'partner.signOut': 'Sign out',
  'partner.verifiedPartner': 'Verified partner',

  // Customer account
  'account.title': 'Your account.',
  'account.greeting': 'Hi, {name}.',
  'account.backToSite': 'Back to site',
  'account.tab.trips': 'My trips',
  'account.tab.rewards': 'Membership',
  'account.tab.saved': 'Saved',
  'account.tab.licence': 'Licence',
  'account.tab.account': 'Account',

  // Common
  'common.language': 'Language',
};
