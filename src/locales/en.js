// AIRLUXO — English source catalog (the canonical keys + source text).
// English is the source of truth and ships in the bundle; DE/FR/IT translations
// live in Supabase (public.translations) and are AI-generated / human-reviewed in
// the founder Translation section. Add a key here, use it via t('key'), and it
// shows up in the admin coverage table automatically.
//
// Interpolation: use {name} placeholders; t('key', { name }) fills them.

// `label` = native name (shown in the customer-facing language switcher);
// `enLabel` = English name (shown in the English founder dashboard).
export const SUPPORTED_LOCALES = [
  { code: 'en', label: 'English', enLabel: 'English' },
  { code: 'de', label: 'Deutsch', enLabel: 'German' },
  { code: 'fr', label: 'Français', enLabel: 'French' },
  { code: 'it', label: 'Italiano', enLabel: 'Italian' },
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

  // Marketplace chrome (nav + account menu)
  'site.explore': 'Explore',
  'site.howItWorks': 'How it works',
  'site.forCompanies': 'For rental companies',
  'site.listYourCars': 'List your cars',
  'menu.myTrips': 'My trips',
  'menu.saved': 'Saved',
  'menu.account': 'Account',
  'menu.logOut': 'Log out',
  'menu.logInSignUp': 'Log in or sign up',
  'menu.partnerDashboard': 'Partner dashboard',

  // Home — hero + search
  'home.heroLine1': 'Drive the',
  'home.heroLine2': 'extraordinary.',
  'home.heroSubtitle': "The marketplace where Switzerland's finest luxury-car rental companies meet drivers who want something rarer than a sedan. Insured, vetted, delivered.",
  'home.where': 'Where',
  'home.when': 'When',
  'home.searchPlaceholder': 'Search make, model, colour or city…',
  'home.collection': 'The collection',

  // Booking flow (car detail)
  'booking.backToFleet': 'Back to fleet',
  'booking.reserveNow': 'Reserve now',
  'booking.continue': 'Continue',
  'booking.confirmContinue': 'Confirm & continue',
  'booking.yourDetailsStep': 'Your details · Step 1 of 2',
  'booking.addons': 'Add-ons',
  'booking.damageProtection': 'Damage protection',
  'booking.protectionNoteDeposit': 'Reduces your excess to CHF 0 — no {deposit} security deposit to put down.',
  'booking.protectionNote': 'Reduces your damage excess to CHF 0 for the trip.',
  'booking.crossBorderTrip': 'Cross-border trip',
  'booking.deliveryCollection': 'Delivery & collection',
  'booking.crossBorderSurcharge': 'Cross-border surcharge',
  'booking.afterHours': 'After-hours handover',
  'booking.protectionZeroExcess': 'Damage protection · zero excess',
  'booking.serviceFee': 'AIRLUXO service fee',
  'booking.total': 'Total',
  'booking.memberCredit': 'Member credit · points',
  'booking.usePoints': 'Use my {points} points',
  'booking.reservationRequested': 'Reservation requested',
  'booking.statusSent': 'Sent to the host — they’ll confirm shortly.',
  'booking.statusAuthorised': 'Your card is authorised now — charged only when the host confirms.',
  'booking.statusLicence': 'Your licence details are shared with the host to verify the driver.',
  'booking.statusDates': 'Select your dates to continue.',
  'booking.statusHours': 'Choose a pick-up time within opening hours.',
  'booking.statusDeliveryAddr': 'Enter a delivery address to continue.',
  'booking.statusNoCharge': "You won't be charged yet.",
};
