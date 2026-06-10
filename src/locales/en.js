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

  // Auth modal (log in / sign up)
  'auth.checkEmail': 'Check your email.',
  'auth.sentLink': 'We sent a sign-in link to {email}. Open it on this device to continue.',
  'auth.done': 'Done',
  'auth.almostThere': 'Almost there.',
  'auth.welcome': 'Welcome to AIRLUXO.',
  'auth.subBooking': 'Log in or sign up to confirm your booking.',
  'auth.subDefault': 'Log in or create an account to book and save cars.',
  'auth.continueGoogle': 'Continue with Google',
  'auth.or': 'or',
  'auth.email': 'Email',
  'auth.continueEmail': 'Continue with email',
  'auth.termsPre': 'By continuing you agree to our',
  'auth.privacyPolicy': 'Privacy & Cookie Policy',

  // Home — marketing sections + footer
  'home.featured': 'Featured in Lugano',
  'home.fullyInsured': 'Fully insured',
  'home.zeroExcessOption': 'CHF 0 excess option',
  'home.whereToFind': 'Where to find them',
  'home.becomePartner': 'Become a partner',
  'footer.tagline': "Switzerland's marketplace for extraordinary cars. Made in Geneva.",
  'footer.newsletterHeading': 'New arrivals, rare drives',
  'footer.newsletterSub': 'Join the list. No spam — unsubscribe anytime.',
  'footer.privacy': 'Privacy',
  'footer.terms': 'Terms',
  'footer.cookies': 'Cookies',

  // ===== Partner dashboard =====
  // Chrome (header / sidebar — always visible)
  'partner.portal': 'Partner portal',
  'partner.liveStatus': 'Live · Supabase',
  'partner.car': 'car',
  'partner.cars': 'cars',
  'partner.perDay': '/day',
  'partner.common.refresh': 'Refresh',
  'partner.common.add': '+ Add',
  'partner.common.details': 'Details →',
  'partner.common.viewAll': 'View all →',
  'partner.common.save': 'Save',
  'partner.common.cancel': 'Cancel',

  // Payouts (Stripe Connect) banner
  'partner.payouts.title': 'Set up payouts',
  'partner.payouts.desc': 'Connect a Stripe account to receive your earnings. AIRLUXO settles each booking to you automatically, minus the {pct}% commission.',
  'partner.payouts.openedTab': 'Complete the steps in the new Stripe tab, then click Refresh.',
  'partner.payouts.notActive': 'Not active yet — finish every Stripe step, then refresh again.',
  'partner.payouts.errStart': 'Could not start onboarding.',
  'partner.payouts.errRefresh': 'Could not refresh status.',
  'partner.payouts.continue': 'Continue setup',
  'partner.payouts.connect': 'Connect with Stripe',

  // Overview tab
  'partner.errLoad': 'Could not load your data.',
  'partner.kpi.activeListings': 'Active listings',
  'partner.kpi.bookings': 'Bookings',
  'partner.kpi.netEarnings': 'Net earnings · {month}',
  'partner.kpi.fleetUtilisation': 'Fleet utilisation',
  'partner.kpi.listFirstCar': 'List your first car',
  'partner.kpi.liveOnMarket': 'Live on the marketplace',
  'partner.kpi.awaitingReply': '{n} awaiting your reply',
  'partner.kpi.allCaughtUp': 'All caught up',
  'partner.kpi.firstMonth': 'first month of trips',
  'partner.kpi.vsPrevMonth': '{delta}% vs prev. month',
  'partner.kpi.thisMonth': 'this month',
  'partner.overview.netPayouts6mo': 'Net payouts · 6 months',
  'partner.overview.recentBookings': 'Recent bookings',
  'partner.overview.noBookings': "No bookings yet — they'll appear here the moment a guest reserves.",
};
