// ============================================================
// AIRLUXO — marketplace + partner mock data
// ============================================================

// Platform economics
export const FEES = {
  guestService: 0.12, // % added to guest subtotal (AIRLUXO revenue)
  hostCommission: 0.03, // % withheld from host payout (AIRLUXO revenue)
};

const img = (id, w = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export const CARS = [
  {
    id: 'p911',
    make: 'Porsche',
    model: '911 Carrera 4 GTS',
    year: 2024,
    category: 'Sport',
    pricePerDay: 690,
    location: 'Zürich',
    rating: 4.97,
    trips: 142,
    seats: 4,
    power: 480,
    accel: 3.3,
    drivetrain: 'AWD',
    gearbox: 'PDK',
    image: img('photo-1503376780353-7e6692767b70'),
    tint: '#1c2a3a',
    host: { name: 'Zürich Auto Lounge', rating: 4.96, trips: 1280, since: 2019 },
  },
  {
    id: 'lh',
    make: 'Lamborghini',
    model: 'Huracán EVO',
    year: 2023,
    category: 'Exotic',
    pricePerDay: 1290,
    location: 'Lugano',
    rating: 5.0,
    trips: 73,
    seats: 2,
    power: 640,
    accel: 2.9,
    drivetrain: 'AWD',
    gearbox: 'DCT',
    image: img('photo-1544636331-e26879cd4d9b'),
    tint: '#3a2410',
    host: { name: 'Ticino Exotics', rating: 4.99, trips: 540, since: 2020 },
  },
  {
    id: 'fr',
    make: 'Ferrari',
    model: 'Roma',
    year: 2024,
    category: 'GT',
    pricePerDay: 1150,
    location: 'Geneva',
    rating: 4.94,
    trips: 61,
    seats: 4,
    power: 620,
    accel: 3.4,
    drivetrain: 'RWD',
    gearbox: 'DCT',
    image: img('photo-1592198084033-aade902d1aae'),
    tint: '#3a0f12',
    host: { name: 'Léman Motors', rating: 4.95, trips: 870, since: 2018 },
  },
  {
    id: 'rr',
    make: 'Range Rover',
    model: 'Autobiography LWB',
    year: 2024,
    category: 'SUV',
    pricePerDay: 740,
    location: 'St. Moritz',
    rating: 4.91,
    trips: 98,
    seats: 5,
    power: 530,
    accel: 4.6,
    drivetrain: 'AWD',
    gearbox: 'Auto',
    image: img('photo-1606664515524-ed2f786a0bd6'),
    tint: '#23281f',
    host: { name: 'Alpine Prestige', rating: 4.93, trips: 1110, since: 2017 },
  },
  {
    id: 'bg',
    make: 'Bentley',
    model: 'Continental GT',
    year: 2023,
    category: 'GT',
    pricePerDay: 980,
    location: 'Gstaad',
    rating: 4.98,
    trips: 54,
    seats: 4,
    power: 550,
    accel: 3.6,
    drivetrain: 'AWD',
    gearbox: 'Auto',
    image: img('photo-1631295868223-63265b40d9e4'),
    tint: '#1f2733',
    host: { name: 'Alpine Prestige', rating: 4.93, trips: 1110, since: 2017 },
  },
  {
    id: 'ar8',
    make: 'Audi',
    model: 'R8 V10 performance',
    year: 2022,
    category: 'Exotic',
    pricePerDay: 890,
    location: 'Lausanne',
    rating: 4.9,
    trips: 120,
    seats: 2,
    power: 620,
    accel: 3.1,
    drivetrain: 'AWD',
    gearbox: 'S tronic',
    image: img('photo-1614162692292-7ac56d7f7f1e'),
    tint: '#2b2b2e',
    host: { name: 'Léman Motors', rating: 4.95, trips: 870, since: 2018 },
  },
  {
    id: 'amg',
    make: 'Mercedes-AMG',
    model: 'GT 63 S',
    year: 2024,
    category: 'GT',
    pricePerDay: 820,
    location: 'Basel',
    rating: 4.92,
    trips: 87,
    seats: 4,
    power: 639,
    accel: 3.2,
    drivetrain: 'AWD',
    gearbox: 'Auto',
    image: img('photo-1617531653332-bd46c24f2068'),
    tint: '#1a1a1d',
    host: { name: 'Zürich Auto Lounge', rating: 4.96, trips: 1280, since: 2019 },
  },
  {
    id: 'mc',
    make: 'McLaren',
    model: '720S Spider',
    year: 2022,
    category: 'Exotic',
    pricePerDay: 1390,
    location: 'Zermatt',
    rating: 5.0,
    trips: 41,
    seats: 2,
    power: 720,
    accel: 2.8,
    drivetrain: 'RWD',
    gearbox: 'DCT',
    image: img('photo-1621135802920-133df287f89c'),
    tint: '#2a2310',
    host: { name: 'Ticino Exotics', rating: 4.99, trips: 540, since: 2020 },
  },
];

export const CATEGORIES = ['All', 'Sport', 'Exotic', 'GT', 'SUV'];

export const CITIES = [
  'Zürich', 'Geneva', 'Lugano', 'Lausanne', 'Basel', 'Bern', 'St. Moritz', 'Zermatt', 'Gstaad',
];

export const STEPS = [
  {
    n: '01',
    title: 'List your fleet',
    body: 'Rental companies onboard their cars in minutes — photos, availability, daily rate. You stay in control of pricing.',
  },
  {
    n: '02',
    title: 'We bring the guests',
    body: 'AIRLUXO markets your vehicles to verified, insured drivers across Switzerland and matches them to your calendar.',
  },
  {
    n: '03',
    title: 'Earn on every drive',
    body: 'Get paid out within 24h of each return. AIRLUXO takes a transparent commission — no listing fees, no lock-in.',
  },
];

// ---- Partner portal (logged-in host: Léman Motors) ----
export const PARTNER = {
  name: 'Léman Motors',
  contact: 'Florian — Geneva',
  rating: 4.95,
  joined: 2018,
  responseRate: 99,
};

export const PARTNER_FLEET = [
  { id: 'fr', name: 'Ferrari Roma', plate: 'GE·48210', rate: 1150, status: 'Booked', util: 78, trips: 61 },
  { id: 'ar8', name: 'Audi R8 V10', plate: 'GE·11904', rate: 890, status: 'Available', util: 64, trips: 120 },
  { id: 'gw', name: 'Mercedes G 63', plate: 'GE·77310', rate: 760, status: 'Available', util: 71, trips: 88 },
  { id: 'pt', name: 'Porsche Taycan', plate: 'GE·22087', rate: 540, status: 'Maintenance', util: 0, trips: 35 },
];

export const PARTNER_BOOKINGS = [
  { id: 'BK-2291', car: 'Ferrari Roma', guest: 'A. Brunner', dates: 'Jun 2 → Jun 5', days: 3, gross: 3450, status: 'Confirmed' },
  { id: 'BK-2288', car: 'Audi R8 V10', guest: 'M. Favre', dates: 'May 29 → May 31', days: 2, gross: 1780, status: 'On trip' },
  { id: 'BK-2284', car: 'Mercedes G 63', guest: 'L. Rossi', dates: 'May 24 → May 27', days: 3, gross: 2280, status: 'Completed' },
  { id: 'BK-2279', car: 'Ferrari Roma', guest: 'K. Meier', dates: 'May 18 → May 20', days: 2, gross: 2300, status: 'Completed' },
  { id: 'BK-2273', car: 'Audi R8 V10', guest: 'S. Keller', dates: 'May 12 → May 16', days: 4, gross: 3560, status: 'Completed' },
];

// monthly net payout (CHF) for the earnings chart
export const PARTNER_EARNINGS = [
  { m: 'Dec', v: 18600 },
  { m: 'Jan', v: 14200 },
  { m: 'Feb', v: 21800 },
  { m: 'Mar', v: 26400 },
  { m: 'Apr', v: 31200 },
  { m: 'May', v: 38900 },
];
