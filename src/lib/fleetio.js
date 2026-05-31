// Fleet CSV/XLSX import + export. SheetJS is lazy-loaded so it stays out of the
// main bundle.

const COLS = [
  { key: 'id', header: 'id', example: '' }, // leave blank for new cars; keep to update existing
  { key: 'make', header: 'make', example: 'Porsche' },
  { key: 'model', header: 'model', example: '911 Carrera 4 GTS' },
  { key: 'year', header: 'year', example: 2024 },
  { key: 'category', header: 'category', example: 'Sport' },
  { key: 'city', header: 'city', example: 'Zürich' },
  { key: 'exterior_color', header: 'exterior_color', example: 'GT Silver' },
  { key: 'interior_color', header: 'interior_color', example: 'Black leather' },
  { key: 'price_per_day', header: 'price_per_day', example: 690 },
  { key: 'mileage_per_day', header: 'mileage_per_day', example: 250 },
  { key: 'power', header: 'power', example: 480 },
  { key: 'seats', header: 'seats', example: 4 },
  { key: 'gearbox', header: 'gearbox', example: 'PDK' },
  { key: 'fuel', header: 'fuel', example: 'Petrol' },
  { key: 'status', header: 'status', example: 'Available' },
  { key: 'photo_url', header: 'photo_url', example: '' },
];
const CATS = ['Sport', 'Exotic', 'GT', 'SUV'];
const STATUSES = ['Available', 'Booked', 'Maintenance', 'Draft'];
const norm = (h) => String(h).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

// Download a blank template (one example row) as csv or xlsx.
export async function downloadTemplate(format = 'csv') {
  const XLSX = await import('xlsx');
  const headers = COLS.map((c) => c.header);
  const example = COLS.reduce((o, c) => { o[c.header] = c.example; return o; }, {});
  const ws = XLSX.utils.json_to_sheet([example], { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cars');
  XLSX.writeFile(wb, `airluxo-template.${format}`);
}

// Export current listings to csv or xlsx.
export async function exportFleet(listings, format = 'csv') {
  const XLSX = await import('xlsx');
  const rows = (listings || []).map((l) => ({
    id: l.id,
    make: l.make, model: l.model, year: l.year, category: l.category, city: l.city,
    exterior_color: l.exterior_color, interior_color: l.interior_color,
    price_per_day: l.price_per_day, mileage_per_day: l.mileage_per_day,
    power: l.power, seats: l.seats, gearbox: l.gearbox, fuel: l.fuel, status: l.status,
    photo_url: l.photo_url,
  }));
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Fleet');
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
  XLSX.writeFile(wb, `airluxo-fleet-${stamp}.${format}`);
}

// Parse an uploaded csv/xlsx → [{ row, data, errors[] }]. data is a listing payload.
export async function parseFleetFile(file) {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(await file.arrayBuffer());
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });

  return raw.map((r, i) => {
    const o = {};
    for (const [h, v] of Object.entries(r)) {
      const col = COLS.find((c) => norm(h) === c.key || norm(h) === norm(c.header));
      if (col) o[col.key] = typeof v === 'string' ? v.trim() : v;
    }
    const errors = [];
    if (!o.make) errors.push('make required');
    if (!o.model) errors.push('model required');
    const price = Number(o.price_per_day);
    if (!price || price <= 0) errors.push('valid price_per_day required');

    const data = {
      make: o.make ? String(o.make) : null,
      model: o.model ? String(o.model) : null,
      year: o.year ? parseInt(o.year, 10) : null,
      category: CATS.includes(o.category) ? o.category : 'Sport',
      city: o.city ? String(o.city) : null,
      exterior_color: o.exterior_color ? String(o.exterior_color) : null,
      interior_color: o.interior_color ? String(o.interior_color) : null,
      price_per_day: price || 0,
      mileage_per_day: o.mileage_per_day ? parseInt(o.mileage_per_day, 10) : 250,
      power: o.power ? parseInt(o.power, 10) : null,
      seats: o.seats ? parseInt(o.seats, 10) : null,
      gearbox: o.gearbox ? String(o.gearbox) : null,
      fuel: o.fuel ? String(o.fuel) : null,
      status: STATUSES.includes(o.status) ? o.status : 'Available',
    };
    if (o.id) data.id = String(o.id);          // present → update this listing
    if (o.photo_url) data.photo_url = String(o.photo_url);
    return { row: i + 2, data, errors };
  });
}
